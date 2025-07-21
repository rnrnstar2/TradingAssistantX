import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';
import { loadYamlArraySafe } from '../utils/yaml-utils';

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  decisionType: string;
  methodName: string;
  className: string;
  prompt: {
    full: string;
    summary: string;
    variables: Record<string, any>;
  };
  response: {
    full: string;
    parsed?: any;
    processingTime: number;
  };
  context: {
    systemStatus?: string;
    healthScore?: number;
    inputData?: any;
  };
  result: {
    success: boolean;
    error?: string;
    decisionsCount?: number;
    actionType?: string;
  };
  metadata: {
    modelUsed: string;
    sdkVersion: string;
    sessionId?: string;
  };
}

export interface DecisionLogQuery {
  timeRange?: {
    start: Date;
    end: Date;
  };
  decisionType?: string;
  methodName?: string;
  className?: string;
  success?: boolean;
  limit?: number;
}

export class DecisionLogger {
  private logPath: string;
  private maxLogEntries: number = 1000;
  
  constructor() {
    this.logPath = path.join(process.cwd(), 'data', 'decision-logs.yaml');
  }

  /**
   * 意思決定の詳細ログを記録
   */
  async logDecision(entry: Omit<DecisionLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: DecisionLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    try {
      await this.appendToLog(logEntry);
      console.log(`📝 [決定ログ] ${entry.className}.${entry.methodName} - ${entry.decisionType}`);
      return logEntry.id;
    } catch (error) {
      console.error('❌ [ログ記録エラー]:', error);
      return '';
    }
  }

  /**
   * Claude APIコール前の情報記録
   */
  async logPromptDetails(
    className: string,
    methodName: string,
    decisionType: string,
    prompt: string,
    context: any = {}
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const logEntry: DecisionLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      decisionType,
      methodName,
      className,
      prompt: {
        full: prompt,
        summary: this.summarizePrompt(prompt),
        variables: this.extractPromptVariables(prompt, context)
      },
      response: {
        full: '',
        processingTime: 0
      },
      context,
      result: {
        success: false
      },
      metadata: {
        modelUsed: 'pending',
        sdkVersion: 'claude-code-sdk',
        sessionId
      }
    };

    await this.appendToLog(logEntry);
    console.log(`🔍 [プロンプト記録] ${className}.${methodName} - セッション: ${sessionId}`);
    return logEntry.id;
  }

  /**
   * Claude APIレスポンス後の情報更新
   */
  async updateWithResponse(
    logId: string,
    response: string,
    processingTime: number,
    result: any,
    modelUsed: string = 'sonnet'
  ): Promise<void> {
    try {
      const logs = await this.loadLogs();
      const logIndex = logs.findIndex(log => log.id === logId);
      
      if (logIndex === -1) {
        console.warn(`⚠️ [ログ更新] ログID ${logId} が見つかりません`);
        return;
      }

      logs[logIndex].response = {
        full: response,
        parsed: result,
        processingTime
      };
      
      logs[logIndex].result = {
        success: true,
        decisionsCount: Array.isArray(result) ? result.length : 1,
        actionType: result?.type || 'unknown'
      };
      
      logs[logIndex].metadata.modelUsed = modelUsed;

      await this.saveLogs(logs);
      console.log(`✅ [レスポンス更新] ${logId} - 処理時間: ${processingTime}ms`);
    } catch (error) {
      console.error('❌ [レスポンス更新エラー]:', error);
    }
  }

  /**
   * エラー情報の記録
   */
  async logError(
    logId: string,
    error: Error,
    fallbackUsed: boolean = false
  ): Promise<void> {
    try {
      const logs = await this.loadLogs();
      const logIndex = logs.findIndex(log => log.id === logId);
      
      if (logIndex !== -1) {
        logs[logIndex].result = {
          success: false,
          error: error.message
        };
        
        if (fallbackUsed) {
          logs[logIndex].metadata.sdkVersion += '-fallback';
        }

        await this.saveLogs(logs);
        console.log(`❌ [エラー記録] ${logId} - ${error.message}`);
      }
    } catch (saveError) {
      console.error('❌ [エラー記録失敗]:', saveError);
    }
  }

  /**
   * ログ検索・フィルタリング
   */
  async queryLogs(query: DecisionLogQuery = {}): Promise<DecisionLogEntry[]> {
    try {
      const logs = await this.loadLogs();
      let filteredLogs = logs;

      // 時間範囲フィルタ
      if (query.timeRange) {
        filteredLogs = filteredLogs.filter(log => {
          const logTime = new Date(log.timestamp);
          return logTime >= query.timeRange!.start && logTime <= query.timeRange!.end;
        });
      }

      // 意思決定タイプフィルタ
      if (query.decisionType) {
        filteredLogs = filteredLogs.filter(log => 
          log.decisionType === query.decisionType
        );
      }

      // メソッド名フィルタ
      if (query.methodName) {
        filteredLogs = filteredLogs.filter(log => 
          log.methodName === query.methodName
        );
      }

      // クラス名フィルタ
      if (query.className) {
        filteredLogs = filteredLogs.filter(log => 
          log.className === query.className
        );
      }

      // 成功/失敗フィルタ
      if (query.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => 
          log.result.success === query.success
        );
      }

      // 最新順でソート
      filteredLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 件数制限
      if (query.limit) {
        filteredLogs = filteredLogs.slice(0, query.limit);
      }

      return filteredLogs;
    } catch (error) {
      console.error('❌ [ログ検索エラー]:', error);
      return [];
    }
  }

  /**
   * 統計情報の取得
   */
  async getStatistics(timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const logs = await this.queryLogs({ timeRange });
      
      const stats = {
        total: logs.length,
        successful: logs.filter(log => log.result.success).length,
        failed: logs.filter(log => !log.result.success).length,
        byDecisionType: {} as Record<string, number>,
        byMethod: {} as Record<string, number>,
        byModel: {} as Record<string, number>,
        averageProcessingTime: 0,
        totalDecisionsMade: 0
      };

      logs.forEach(log => {
        // 意思決定タイプ別統計
        stats.byDecisionType[log.decisionType] = 
          (stats.byDecisionType[log.decisionType] || 0) + 1;
        
        // メソッド別統計
        const methodKey = `${log.className}.${log.methodName}`;
        stats.byMethod[methodKey] = (stats.byMethod[methodKey] || 0) + 1;
        
        // モデル別統計
        stats.byModel[log.metadata.modelUsed] = 
          (stats.byModel[log.metadata.modelUsed] || 0) + 1;
        
        // 処理時間統計
        if (log.response.processingTime > 0) {
          stats.averageProcessingTime += log.response.processingTime;
        }
        
        // 総決定数
        stats.totalDecisionsMade += log.result.decisionsCount || 0;
      });

      if (logs.length > 0) {
        stats.averageProcessingTime = Math.round(stats.averageProcessingTime / logs.length);
      }

      return stats;
    } catch (error) {
      console.error('❌ [統計取得エラー]:', error);
      return null;
    }
  }

  // プライベートメソッド
  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private summarizePrompt(prompt: string): string {
    // プロンプトの最初の200文字を要約として使用
    const cleaned = prompt.replace(/\s+/g, ' ').trim();
    return cleaned.length > 200 ? cleaned.substring(0, 197) + '...' : cleaned;
  }

  private extractPromptVariables(prompt: string, context: any): Record<string, any> {
    const variables: Record<string, any> = {};
    
    // ${...} パターンの変数を抽出
    const variableMatches = prompt.match(/\$\{([^}]+)\}/g);
    if (variableMatches) {
      variableMatches.forEach(match => {
        const varName = match.slice(2, -1);
        variables[varName] = context[varName] || 'undefined';
      });
    }
    
    // JSON.stringify(...) パターンの変数を抽出
    const jsonMatches = prompt.match(/JSON\.stringify\(([^)]+)\)/g);
    if (jsonMatches) {
      jsonMatches.forEach((match, index) => {
        variables[`jsonVar${index}`] = match;
      });
    }

    return variables;
  }

  private async loadLogs(): Promise<DecisionLogEntry[]> {
    try {
      return loadYamlArraySafe<DecisionLogEntry>(this.logPath);
    } catch (error) {
      console.warn('⚠️ [ログ読み込み] 新しいログファイルを作成します');
      return [];
    }
  }

  private async appendToLog(entry: DecisionLogEntry): Promise<void> {
    const logs = await this.loadLogs();
    logs.push(entry);
    
    // 最大エントリ数を超えた場合、古いログを削除
    if (logs.length > this.maxLogEntries) {
      logs.splice(0, logs.length - this.maxLogEntries);
    }
    
    await this.saveLogs(logs);
  }

  private async saveLogs(logs: DecisionLogEntry[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.writeFile(this.logPath, yaml.dump(logs, { indent: 2 }));
    } catch (error) {
      console.error('❌ [ログ保存エラー]:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const decisionLogger = new DecisionLogger();

// ヘルパー関数
export async function logClaudeDecision(
  className: string,
  methodName: string,
  decisionType: string,
  prompt: string,
  context: any = {}
): Promise<string> {
  return decisionLogger.logPromptDetails(className, methodName, decisionType, prompt, context);
}

export async function updateClaudeResponse(
  logId: string,
  response: string,
  processingTime: number,
  result: any,
  modelUsed: string = 'sonnet'
): Promise<void> {
  return decisionLogger.updateWithResponse(logId, response, processingTime, result, modelUsed);
}

export async function logClaudeError(
  logId: string,
  error: Error,
  fallbackUsed: boolean = false
): Promise<void> {
  return decisionLogger.logError(logId, error, fallbackUsed);
}