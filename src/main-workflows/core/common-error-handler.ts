import { systemLogger } from '../../shared/logger';

/**
 * CommonErrorHandler - 統一エラーハンドリングパターン
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 非同期操作の統一エラーハンドリング
 * • フォールバック値対応
 * • TypeScript型安全なエラーメッセージ抽出
 * • 統一ログフォーマットでのエラー処理
 */
export class CommonErrorHandler {
  /**
   * 統一エラーハンドリング - systemLogger使用
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<T | null> {
    try {
      const result = await operation();
      systemLogger.success(`✅ ${operationName}完了`);
      return result;
    } catch (error) {
      systemLogger.error(`❌ ${operationName}エラー:`, error);
      if (fallbackValue !== undefined) {
        systemLogger.info(`🔄 ${operationName}フォールバック値使用`);
        return fallbackValue;
      }
      return null;
    }
  }

  /**
   * 同期操作の統一エラーハンドリング
   */
  static handleSyncOperation<T>(
    operation: () => T,
    operationName: string,
    fallbackValue?: T
  ): T | null {
    try {
      const result = operation();
      systemLogger.success(`✅ ${operationName}完了`);
      return result;
    } catch (error) {
      systemLogger.error(`❌ ${operationName}エラー:`, error);
      if (fallbackValue !== undefined) {
        systemLogger.info(`🔄 ${operationName}フォールバック値使用`);
        return fallbackValue;
      }
      return null;
    }
  }

  /**
   * TypeScript型安全なエラーメッセージ抽出
   */
  static extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * エラーと実行時間をまとめて処理
   */
  static async handleTimedOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<{ result: T | null; duration: number }> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      systemLogger.success(`✅ ${operationName}完了 (${duration}ms)`);
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error(`❌ ${operationName}失敗 (${duration}ms):`, error);
      
      const result = fallbackValue !== undefined ? fallbackValue : null;
      if (fallbackValue !== undefined) {
        systemLogger.info(`🔄 ${operationName}フォールバック値使用`);
      }
      
      return { result, duration };
    }
  }

  /**
   * エラーハンドリング付きリトライ機能
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    fallbackValue?: T
  ): Promise<T | null> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          systemLogger.success(`✅ ${operationName}完了 (試行${attempt}回目)`);
        } else {
          systemLogger.success(`✅ ${operationName}完了`);
        }
        return result;
      } catch (error) {
        lastError = error;
        systemLogger.warn(`⚠️ ${operationName}失敗 (試行${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          systemLogger.info(`🔄 ${delay}ms後にリトライします`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    systemLogger.error(`❌ ${operationName}最終失敗 (${maxRetries}回試行):`, lastError);
    
    if (fallbackValue !== undefined) {
      systemLogger.info(`🔄 ${operationName}フォールバック値使用`);
      return fallbackValue;
    }
    
    return null;
  }
}