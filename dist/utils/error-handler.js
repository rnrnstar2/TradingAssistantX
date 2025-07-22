import { promises as fs } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
/**
 * 基本的なエラーハンドラー - MVP制約準拠
 * 複雑なリトライ・自動回復は実装しない
 */
export class BasicErrorHandler {
    errorLogPath = 'data/context/error-log.yaml';
    /**
     * エラーをログに記録する（基本機能のみ）
     */
    async logError(error) {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            };
            await this.appendToErrorLog(errorLog);
        }
        catch (logError) {
            // ログ記録に失敗した場合はコンソール出力のみ
            console.error('エラーログ記録失敗:', logError);
            console.error('元のエラー:', error);
        }
    }
    /**
     * エラーログファイルに追記
     */
    async appendToErrorLog(errorLog) {
        const fullPath = join(process.cwd(), this.errorLogPath);
        let existingLogs = [];
        try {
            const existingContent = await fs.readFile(fullPath, 'utf-8');
            if (existingContent.trim()) {
                existingLogs = yaml.load(existingContent) || [];
            }
        }
        catch {
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
    async getRecentErrors(limit = 10) {
        try {
            const fullPath = join(process.cwd(), this.errorLogPath);
            const content = await fs.readFile(fullPath, 'utf-8');
            if (!content.trim()) {
                return [];
            }
            const logs = yaml.load(content) || [];
            return logs.slice(-limit);
        }
        catch {
            return [];
        }
    }
    /**
     * エラーが重要かどうかの基本判定
     */
    isCriticalError(error) {
        const criticalKeywords = [
            'ENOSPC', // ディスク容量不足
            'EMFILE', // ファイルハンドル不足
            'ENOMEM', // メモリ不足
            'MODULE_NOT_FOUND', // モジュール不見
            'Cannot read properties' // 基本的なnullエラー
        ];
        return criticalKeywords.some(keyword => error.message.includes(keyword) ||
            (error.stack && error.stack.includes(keyword)));
    }
}
// シングルトンインスタンス（基本パターン）
export const errorHandler = new BasicErrorHandler();
/**
 * 基本的なエラーハンドリングヘルパー関数
 */
export async function handleError(error) {
    await errorHandler.logError(error);
    if (errorHandler.isCriticalError(error)) {
        console.error('🚨 重要エラー検出:', error.message);
    }
}
/**
 * 非同期関数のエラーハンドリング用ラッパー
 */
export function withErrorHandling(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    };
}
