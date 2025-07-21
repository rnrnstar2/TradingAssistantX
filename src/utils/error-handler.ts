import { promises as fs } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

interface BasicErrorLog {
  timestamp: string;
  error: string;
  stack?: string;
}

/**
 * 基本的なエラーハンドラー - MVP制約準拠
 * 複雑なリトライ・自動回復は実装しない
 */
export class BasicErrorHandler {
  private readonly errorLogPath = 'data/context/error-log.yaml';

  /**
   * エラーをログに記録する（基本機能のみ）
   */
  async logError(error: Error): Promise<void> {
    try {
      const errorLog: BasicErrorLog = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      };

      await this.appendToErrorLog(errorLog);
    } catch (logError) {
      // ログ記録に失敗した場合はコンソール出力のみ
      console.error('エラーログ記録失敗:', logError);
      console.error('元のエラー:', error);
    }
  }

  /**
   * エラーログファイルに追記
   */
  private async appendToErrorLog(errorLog: BasicErrorLog): Promise<void> {
    const fullPath = join(process.cwd(), this.errorLogPath);
    
    let existingLogs: BasicErrorLog[] = [];
    
    try {
      const existingContent = await fs.readFile(fullPath, 'utf-8');
      if (existingContent.trim()) {
        existingLogs = yaml.load(existingContent) as BasicErrorLog[] || [];
      }
    } catch {
      // ファイルが存在しない場合は新規作成
      existingLogs = [];
    }

    existingLogs.push(errorLog);
    
    const yamlContent = yaml.dump(existingLogs, { 
      flowLevel: -1,
      lineWidth: -1
    });
    
    await fs.writeFile(fullPath, yamlContent);
  }

  /**
   * 最近のエラーログを取得（基本的な読み取り機能のみ）
   */
  async getRecentErrors(limit: number = 10): Promise<BasicErrorLog[]> {
    try {
      const fullPath = join(process.cwd(), this.errorLogPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      if (!content.trim()) {
        return [];
      }

      const logs = yaml.load(content) as BasicErrorLog[] || [];
      return logs.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * エラーが重要かどうかの基本判定
   */
  isCriticalError(error: Error): boolean {
    const criticalKeywords = [
      'ENOSPC', // ディスク容量不足
      'EMFILE', // ファイルハンドル不足
      'ENOMEM', // メモリ不足
      'MODULE_NOT_FOUND', // モジュール不見
      'Cannot read properties'  // 基本的なnullエラー
    ];

    return criticalKeywords.some(keyword => 
      error.message.includes(keyword) || 
      (error.stack && error.stack.includes(keyword))
    );
  }
}

// シングルトンインスタンス（基本パターン）
export const errorHandler = new BasicErrorHandler();

/**
 * 基本的なエラーハンドリングヘルパー関数
 */
export async function handleError(error: Error): Promise<void> {
  await errorHandler.logError(error);
  
  if (errorHandler.isCriticalError(error)) {
    console.error('🚨 重要エラー検出:', error.message);
  }
}

/**
 * 非同期関数のエラーハンドリング用ラッパー
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  };
}