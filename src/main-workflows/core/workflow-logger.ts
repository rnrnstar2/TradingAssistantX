import { systemLogger } from '../../shared/logger';

/**
 * WorkflowLogger - 統一ログ出力パターン
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • ワークフローステップの統一ログフォーマット
 * • パフォーマンス測定付きログ出力
 * • 実行フェーズの視覚的表示
 * • エラー・警告・成功の統一表示
 */
export class WorkflowLogger {
  /**
   * 実行ステップログ（統一フォーマット）
   */
  static logStep(stepNumber: number, stepName: string, status: 'start' | 'success' | 'error', details?: any): void {
    const emoji = status === 'start' ? '🔄' : status === 'success' ? '✅' : '❌';
    const statusText = status === 'start' ? '開始' : status === 'success' ? '完了' : 'エラー';
    const message = `${emoji} 【ステップ${stepNumber}】${stepName}${statusText}`;
    
    if (status === 'error') {
      systemLogger.error(message, details);
    } else if (status === 'success') {
      systemLogger.success(message, details);
    } else {
      systemLogger.info(message, details);
    }
  }

  /**
   * パフォーマンス測定付きログ
   */
  static async logTimedOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    systemLogger.info(`⏱️ ${operationName}開始`);
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      systemLogger.success(`✅ ${operationName}完了 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error(`❌ ${operationName}失敗 (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * フェーズ開始の視覚的表示
   */
  static logPhaseStart(phaseName: string, description?: string): void {
    systemLogger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    systemLogger.info(`🚀 ${phaseName}開始`);
    if (description) {
      systemLogger.info(`📝 ${description}`);
    }
    systemLogger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * フェーズ完了の視覚的表示
   */
  static logPhaseComplete(phaseName: string, duration?: number): void {
    const durationText = duration ? ` (${duration}ms)` : '';
    systemLogger.success(`🎉 ${phaseName}完了${durationText}`);
    systemLogger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 警告メッセージの統一表示
   */
  static logWarning(message: string, details?: any): void {
    systemLogger.warn(`⚠️ ${message}`, details);
  }

  /**
   * 情報メッセージの統一表示
   */
  static logInfo(message: string, details?: any): void {
    systemLogger.info(`ℹ️ ${message}`, details);
  }

  /**
   * 成功メッセージの統一表示
   */
  static logSuccess(message: string, details?: any): void {
    systemLogger.success(`✅ ${message}`, details);
  }

  /**
   * エラーメッセージの統一表示
   */
  static logError(message: string, error?: any): void {
    systemLogger.error(`❌ ${message}`, error);
  }

  /**
   * デバッグ情報の条件付きログ
   */
  static logDebug(message: string, data?: any, condition: boolean = false): void {
    if (condition || process.env.NODE_ENV === 'development') {
      systemLogger.info(`🐛 [DEBUG] ${message}`, data);
    }
  }

  /**
   * 統計情報の表示
   */
  static logStats(stats: Record<string, number | string>): void {
    systemLogger.info('📊 実行統計:');
    Object.entries(stats).forEach(([key, value]) => {
      systemLogger.info(`   ${key}: ${value}`);
    });
  }

  /**
   * プログレス表示（パーセンテージ付き）
   */
  static logProgress(current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    systemLogger.info(`🔄 ${operation}: [${progressBar}] ${percentage}% (${current}/${total})`);
  }

  /**
   * コンフィグ情報の表示
   */
  static logConfig(configName: string, config: Record<string, any>): void {
    systemLogger.info(`⚙️ ${configName}設定:`);
    Object.entries(config).forEach(([key, value]) => {
      systemLogger.info(`   ${key}: ${JSON.stringify(value)}`);
    });
  }

  /**
   * API呼び出しログ
   */
  static logApiCall(method: string, endpoint: string, status?: number): void {
    const statusText = status ? ` (${status})` : '';
    systemLogger.info(`🌐 API呼び出し: ${method} ${endpoint}${statusText}`);
  }

  /**
   * データ保存ログ
   */
  static logDataSave(dataType: string, destination: string, size?: number): void {
    const sizeText = size ? ` (${size}bytes)` : '';
    systemLogger.info(`💾 データ保存: ${dataType} → ${destination}${sizeText}`);
  }

  /**
   * リソース監視ログ
   */
  static logResourceUsage(memoryMB: number, cpuPercent?: number): void {
    const cpuText = cpuPercent ? ` CPU: ${cpuPercent}%` : '';
    systemLogger.info(`📈 リソース使用量: メモリ ${memoryMB}MB${cpuText}`);
  }
}