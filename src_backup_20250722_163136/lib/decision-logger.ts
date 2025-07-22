import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';
import { loadYamlArraySafe, writeYamlAsync } from '../utils/yaml-utils';
import { DecisionTracer } from './logging/decision-tracer.js';
import { VisualizationFormatter } from './logging/visualization-formatter.js';
import type {
  DecisionContext,
  DecisionStep,
  Decision,
  ExecutionResult,
  DecisionLog,
  VisualizationData,
  LoggerSession,
  LoggerConfig
} from '../types/decision-logging-types.js';

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
  private sessions: Map<string, LoggerSession> = new Map();
  private config: LoggerConfig;
  
  // Enhanced components
  private decisionTracer: DecisionTracer;
  private visualizationFormatter: VisualizationFormatter;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.logPath = path.join(process.cwd(), 'data', 'decision-logs.yaml');
    
    // Initialize configuration
    this.config = {
      maxSessions: 100,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      outputDirectory: 'tasks/20250722_002415_next_generation_enhancement/outputs/',
      enableVisualization: true,
      ...config
    };
    
    // Initialize enhanced components
    this.decisionTracer = new DecisionTracer();
    this.visualizationFormatter = new VisualizationFormatter();
    
    console.log('🎯 [DecisionLogger] 拡張意思決定ロギングシステム初期化完了');
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

  // ========== ENHANCED METHODS ==========

  /**
   * 意思決定の開始ログ
   */
  async startDecision(context: DecisionContext): Promise<string> {

    const sessionId = this.generateSessionId();
    const session: LoggerSession = {
      sessionId,
      startTime: new Date().toISOString(),
      active: true,
      context,
      steps: [],
      performanceMetrics: [],
      status: 'active'
    };

    this.sessions.set(sessionId, session);


    console.log(`✅ [意思決定開始] セッション開始: ${sessionId}`);
    return sessionId;
  }

  /**
   * 判断プロセスのステップ記録
   */
  async logDecisionStep(
    sessionId: string, 
    stepType: DecisionStep['stepType'], 
    reasoning: string, 
    data: any
  ): Promise<void> {
    console.log(`📝 [ステップ記録] セッション${sessionId}: ${stepType}`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ セッション${sessionId}が見つかりません`);
      return;
    }

    const step: DecisionStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      stepType,
      timestamp: new Date().toISOString(),
      reasoning,
      data,
      confidenceLevel: this.calculateConfidenceLevel(reasoning, data),
      executionTime: Date.now() - new Date(session.startTime).getTime()
    };

    session.steps.push(step);


    console.log(`✅ [ステップ記録完了] ${stepType}: 信頼度${step.confidenceLevel.toFixed(2)}`);
  }

  /**
   * 最終決定の記録
   */
  async completeDecision(
    sessionId: string, 
    finalDecision: Decision, 
    executionResult?: ExecutionResult
  ): Promise<DecisionLog> {

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`セッション${sessionId}が見つかりません`);
    }

    session.endTime = new Date().toISOString();
    session.active = false;
    session.status = executionResult?.success ? 'completed' : 'failed';

    const totalExecutionTime = Date.now() - new Date(session.startTime).getTime();

    // 決定ログの作成
    const decisionLog: DecisionLog = {
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      totalExecutionTime,
      context: session.context,
      steps: session.steps,
      finalDecision,
      executionResult,
      qualityScore: executionResult ? this.decisionTracer.scoreDecisionQuality(finalDecision, executionResult) : undefined
    };


    // ログを保存
    await this.saveDecisionLog(decisionLog);

    // セッションをクリーンアップ
    this.sessions.delete(sessionId);

    console.log(`✅ [意思決定完了] 総実行時間: ${(totalExecutionTime/1000).toFixed(1)}秒`);
    
    return decisionLog;
  }

  /**
   * Claude自律判断の可視化
   */
  async visualizeDecisionFlow(sessionId: string): Promise<VisualizationData> {
    console.log(`🎨 [可視化生成] セッション${sessionId}の可視化データ生成...`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`セッション${sessionId}が見つかりません`);
    }

    // 決定チェーンの構築
    const decisionChain = this.decisionTracer.buildDecisionChain(session.steps);
    
    // 可視化データの生成
    const decisionFlow = this.visualizationFormatter.formatDecisionFlow(decisionChain);
    const performanceDashboard = this.visualizationFormatter.generatePerformanceDashboard(session.performanceMetrics);
    
    // 品質レポート生成（品質スコアがある場合）
    const qualityScores = session.steps
      .map(step => ({
        overallScore: step.confidenceLevel,
        reasoningQuality: step.confidenceLevel,
        executionEfficiency: Math.max(0, 1 - step.executionTime / 10000),
        outcomeAccuracy: 0.8, // デフォルト値
        improvementAreas: [],
        timestamp: step.timestamp
      }));
    
    const qualityReport = this.visualizationFormatter.createQualityReport(qualityScores);
    
    // 最適化提案の生成
    const optimizationSuggestions: any[] = [];
    const optimizationViz = this.visualizationFormatter.visualizeOptimizationSuggestions(optimizationSuggestions);

    const visualizationData: VisualizationData = {
      sessionId,
      decisionFlow,
      performanceDashboard,
      qualityReport,
      optimizationViz,
      timestamp: new Date().toISOString()
    };

    // 可視化データを出力ディレクトリに保存
    await this.saveVisualizationData(visualizationData);

    console.log('✅ [可視化生成完了] 可視化データ生成・保存完了');
    return visualizationData;
  }

  /**
   * アクティブセッション数の取得
   */
  getActiveSessionsCount(): number {
    return Array.from(this.sessions.values()).filter(s => s.active).length;
  }

  /**
   * セッション統計の取得
   */
  getSessionStatistics(): any {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.active);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const failedSessions = sessions.filter(s => s.status === 'failed');

    return {
      total: sessions.length,
      active: activeSessions.length,
      completed: completedSessions.length,
      failed: failedSessions.length,
      averageStepsPerSession: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + s.steps.length, 0) / sessions.length : 0,
      tracingStatistics: this.decisionTracer.getTraceStatistics()
    };
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

  /**
   * 信頼度レベルの計算
   */
  private calculateConfidenceLevel(reasoning: string, data: any): number {
    let confidence = 0.5; // ベース信頼度

    // 推論の詳細度による調整
    if (reasoning.length > 100) confidence += 0.1;
    if (reasoning.length > 300) confidence += 0.1;

    // データの存在による調整
    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 3) confidence += 0.1;
      if (keys.length > 10) confidence += 0.1;
    }

    // キーワードベースの調整
    const positiveKeywords = ['確信', '明確', '根拠', 'データ', '分析', '検証'];
    const negativeKeywords = ['不明', '推測', '可能性', '曖昧'];
    
    positiveKeywords.forEach(keyword => {
      if (reasoning.includes(keyword)) confidence += 0.05;
    });

    negativeKeywords.forEach(keyword => {
      if (reasoning.includes(keyword)) confidence -= 0.05;
    });

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * 決定ログの保存
   */
  private async saveDecisionLog(decisionLog: DecisionLog): Promise<void> {
    try {
      const outputDir = path.join(process.cwd(), this.config.outputDirectory);
      await fs.mkdir(outputDir, { recursive: true });

      const filename = `decision-log-${decisionLog.sessionId}.yaml`;
      const filepath = path.join(outputDir, filename);

      await writeYamlAsync(filepath, decisionLog);
      console.log(`💾 [決定ログ保存] ${filename}を保存しました`);
    } catch (error) {
      console.error('❌ [決定ログ保存エラー]:', error);
    }
  }

  /**
   * 可視化データの保存
   */
  private async saveVisualizationData(visualizationData: VisualizationData): Promise<void> {
    try {
      const outputDir = path.join(process.cwd(), this.config.outputDirectory);
      await fs.mkdir(outputDir, { recursive: true });

      // 各種データファイルの保存
      const baseFilename = `visualization-${visualizationData.sessionId}`;
      
      // 意思決定フロー
      await writeYamlAsync(
        path.join(outputDir, `${baseFilename}-flow.yaml`),
        visualizationData.decisionFlow
      );

      // パフォーマンスダッシュボード
      await writeYamlAsync(
        path.join(outputDir, `${baseFilename}-dashboard.yaml`),
        visualizationData.performanceDashboard
      );

      // 品質レポート
      await writeYamlAsync(
        path.join(outputDir, `${baseFilename}-quality-report.yaml`),
        visualizationData.qualityReport
      );

      // 最適化可視化
      await writeYamlAsync(
        path.join(outputDir, `${baseFilename}-optimization.yaml`),
        visualizationData.optimizationViz
      );

      // 統合データファイル
      await writeYamlAsync(
        path.join(outputDir, `${baseFilename}-complete.yaml`),
        visualizationData
      );

      console.log(`💾 [可視化データ保存] セッション${visualizationData.sessionId}の可視化データを保存しました`);
    } catch (error) {
      console.error('❌ [可視化データ保存エラー]:', error);
    }
  }

  /**
   * セッションのタイムアウトチェック
   */
  private cleanupTimeoutSessions(): void {
    const now = Date.now();
    const timeoutSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      const sessionAge = now - new Date(session.startTime).getTime();
      if (sessionAge > this.config.sessionTimeout) {
        timeoutSessions.push(sessionId);
      }
    });

    timeoutSessions.forEach(sessionId => {
      console.log(`⏰ [セッションタイムアウト] セッション${sessionId}をタイムアウトしました`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'timeout';
        session.active = false;
      }
      this.sessions.delete(sessionId);
    });
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