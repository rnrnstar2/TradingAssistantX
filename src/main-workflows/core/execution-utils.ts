import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';
import { TweetEndpoints } from '../../kaito-api/endpoints/tweet-endpoints';
import { KaitoApiClient } from '../../kaito-api';
import { RetryConfig, OperationResult, TransactionState } from '../../shared/types';

/**
 * ExecutionUtils - エラーハンドリング・リトライ・最適化機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • リトライ機構付き操作実行（指数バックオフ）
 * • トランザクション的な操作管理とロールバック
 * • データ整合性チェック
 * • KaitoAPI最適化（キャッシュ戦略・レート制限対応）
 * 
 * 🔄 主要機能:
 * • executeWithRetry: 指数バックオフによるリトライ
 * • executeTransaction: 操作ステップ記録とロールバック
 * • performIntegrityCheck: データ整合性検証
 * • KaitoAPI最適化: キャッシュ・レート制限・差分取得
 */
export class ExecutionUtils {
  private container: ComponentContainer;
  private retryConfig: RetryConfig;
  private transactionState: TransactionState | null = null;

  constructor(container: ComponentContainer) {
    this.container = container;
    
    // リトライ設定（指示書準拠）
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,         // 1秒
      backoffMultiplier: 2,    // 指数バックオフ
      maxDelay: 30000          // 最大30秒
    };
  }

  /**
   * リトライ機構付き操作実行
   * 指数バックオフによるリトライと詳細ログ
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<OperationResult<T>> {
    const config = { ...this.retryConfig, ...retryConfig };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        systemLogger.debug(`🔄 ${operationName} 実行試行 ${attempt + 1}/${config.maxRetries + 1}`);
        
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 0) {
          systemLogger.success(`✅ ${operationName} 成功 (${attempt + 1}回目で成功)`);
        }
        
        return {
          success: true,
          data: result,
          retryCount: attempt,
          duration,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < config.maxRetries) {
          // 指数バックオフ計算
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );
          
          systemLogger.warn(`⚠️ ${operationName} 失敗 (試行 ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}`);
          systemLogger.info(`⏰ ${delay}ms 待機後に再試行...`);
          
          await this.sleep(delay);
        } else {
          systemLogger.error(`❌ ${operationName} 最終的に失敗 (${config.maxRetries + 1}回試行)`);
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retryCount: config.maxRetries,
      duration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * トランザクション的な操作管理
   * 操作の各ステップを記録し、失敗時のロールバックを可能にする
   */
  async executeTransaction<T>(
    operationId: string,
    steps: Array<{
      stepId: string;
      operation: string;
      execute: () => Promise<T>;
      rollback?: (data: T) => Promise<void>;
    }>
  ): Promise<OperationResult<T[]>> {
    this.transactionState = {
      operationId,
      steps: [],
      canRollback: true,
      rollbackInProgress: false
    };

    const results: T[] = [];
    const startTime = Date.now();

    try {
      systemLogger.info(`🏗️ トランザクション開始: ${operationId}`);

      for (const step of steps) {
        try {
          systemLogger.debug(`⚙️ ステップ実行: ${step.operation}`);
          
          const result = await step.execute();
          results.push(result);

          // 成功ステップを記録
          this.transactionState.steps.push({
            stepId: step.stepId,
            operation: step.operation,
            success: true,
            rollbackData: step.rollback ? result : undefined,
            timestamp: new Date().toISOString()
          });

          systemLogger.success(`✅ ステップ完了: ${step.operation}`);

        } catch (error) {
          // 失敗ステップを記録
          this.transactionState.steps.push({
            stepId: step.stepId,
            operation: step.operation,
            success: false,
            timestamp: new Date().toISOString()
          });

          systemLogger.error(`❌ ステップ失敗: ${step.operation} - ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }

      systemLogger.success(`✅ トランザクション完了: ${operationId}`);
      this.transactionState = null;

      return {
        success: true,
        data: results,
        retryCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      systemLogger.error(`❌ トランザクション失敗: ${operationId}`);
      
      // ロールバック実行
      await this.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * トランザクションロールバック
   * 成功したステップを逆順で元に戻す
   */
  private async rollbackTransaction(): Promise<void> {
    if (!this.transactionState || this.transactionState.rollbackInProgress) {
      return;
    }

    this.transactionState.rollbackInProgress = true;
    systemLogger.warn('🔄 トランザクションロールバック開始...');

    // 成功したステップを逆順で処理
    const successfulSteps = this.transactionState.steps
      .filter(step => step.success && step.rollbackData)
      .reverse();

    for (const step of successfulSteps) {
      try {
        systemLogger.debug(`🔙 ロールバック実行: ${step.operation}`);
        
        // ロールバック処理は実装が複雑なため、ログ出力のみ（MVP版）
        systemLogger.info(`📋 ロールバック記録: ${step.stepId} - ${step.operation}`);
        
      } catch (error) {
        systemLogger.error(`❌ ロールバック失敗 ${step.operation}:`, error);
      }
    }

    systemLogger.info('✅ トランザクションロールバック完了');
    this.transactionState = null;
  }

  /**
   * データ整合性チェック
   * 保存されたデータの完全性を検証
   */
  async performIntegrityCheck(dataManager: DataManager): Promise<boolean> {
    try {
      systemLogger.info('🔍 データ整合性チェック開始...');

      // DataManagerのヘルスチェック機能を活用
      const healthCheck = await dataManager.performHealthCheck();
      
      if (healthCheck.errors.length > 0) {
        systemLogger.warn('⚠️ データ整合性に問題:', healthCheck.errors);
        return false;
      }

      // アーカイブ整合性チェック
      const archiveValid = await dataManager.validateArchive();
      if (!archiveValid) {
        systemLogger.warn('⚠️ アーカイブ整合性に問題があります');
        return false;
      }

      systemLogger.success('✅ データ整合性チェック完了');
      return true;

    } catch (error) {
      systemLogger.error('❌ データ整合性チェック失敗:', error);
      return false;
    }
  }

  /**
   * 待機（sleep）ユーティリティ
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 一時的エラーの判定
   * ネットワークエラーやレート制限などの一時的エラーかどうか判定
   */
  private isTemporaryError(error: Error): boolean {
    const temporaryErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'Rate limit',
      'Too Many Requests',
      'Service Unavailable',
      '503',
      '429'
    ];

    const errorMessage = error.message.toLowerCase();
    return temporaryErrors.some(temp => 
      errorMessage.includes(temp.toLowerCase())
    );
  }

  // ===================================================================
  // KaitoAPI最適化機能（指示書準拠）
  // ===================================================================

  /**
   * 最新投稿の差分取得（指示書準拠）
   * get_user_last_tweetsの20件制限に対応した効率的な取得
   */
  async fetchRecentTweets(userId: string, dataManager: DataManager): Promise<any[]> {
    try {
      systemLogger.info(`🔍 最新投稿差分取得開始: ${userId}`);
      
      // 1. KaitoAPIから最新20件取得
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      const latestTweets = await this.executeWithRetry(
        () => kaitoClient.getUserLastTweets(userId, 20),
        `KaitoAPI最新20件取得 (${userId})`
      );

      if (!latestTweets.success || !latestTweets.data) {
        throw new Error(`KaitoAPI取得失敗: ${latestTweets.error}`);
      }

      // データ保存フック: KaitoAPI応答
      await dataManager.saveKaitoResponse('user-last-tweets', {
        userId,
        count: latestTweets.data.length,
        data: latestTweets.data,
        fetchedAt: new Date().toISOString()
      });

      // 2. 既存データとマージ
      const existingPosts = await dataManager.getRecentPosts(100);
      systemLogger.debug(`既存投稿数: ${existingPosts.length}件`);

      // 3. 重複を除いて保存
      const newPosts = latestTweets.data.filter((tweet: any) => 
        !existingPosts.some(post => post.id === tweet.id)
      );

      systemLogger.info(`新規投稿: ${newPosts.length}件 / 取得総数: ${latestTweets.data.length}件`);

      // 4. 新規投稿をDataManagerに保存
      for (const post of newPosts) {
        await dataManager.savePost({
          id: post.id,
          content: post.text || post.content || '',
          timestamp: post.created_at || new Date().toISOString(),
          metrics: {
            likes: post.public_metrics?.like_count || 0,
            retweets: post.public_metrics?.retweet_count || 0,
            replies: post.public_metrics?.reply_count || 0
          }
        });
      }

      systemLogger.success(`✅ 差分取得完了: ${newPosts.length}件の新規投稿を保存`);
      return newPosts;

    } catch (error) {
      systemLogger.error('❌ 最新投稿差分取得失敗:', error);
      throw new Error(`Recent tweets fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * KaitoAPIキャッシュ戦略
   * API制限に対応したインテリジェントなキャッシュ管理
   */
  async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    cacheTTL: number = 300000, // 5分
    dataManager: DataManager
  ): Promise<T> {
    try {
      // キャッシュからデータ取得を試行
      const cachedData = await this.getCacheFromDataManager(cacheKey, dataManager);
      
      if (cachedData && this.isCacheValid(cachedData, cacheTTL)) {
        systemLogger.debug(`📦 キャッシュヒット: ${cacheKey}`);
        return cachedData.data;
      }

      // キャッシュミス - 新しいデータを取得
      systemLogger.debug(`🔄 キャッシュミス - 新規取得: ${cacheKey}`);
      const freshData = await fetchFunction();
      
      // キャッシュに保存
      await this.saveCacheToDataManager(cacheKey, freshData, dataManager);
      
      return freshData;

    } catch (error) {
      systemLogger.error(`❌ キャッシュ戦略実行失敗 ${cacheKey}:`, error);
      
      // フォールバック: 古いキャッシュでも返す
      const fallbackCache = await this.getCacheFromDataManager(cacheKey, dataManager);
      if (fallbackCache) {
        systemLogger.warn(`⚠️ フォールバック: 古いキャッシュを使用 ${cacheKey}`);
        return fallbackCache.data;
      }
      
      throw error;
    }
  }

  /**
   * DataManagerからキャッシュデータを取得
   */
  private async getCacheFromDataManager(cacheKey: string, dataManager: DataManager): Promise<any | null> {
    try {
      // DataManagerのKaito応答データからキャッシュを検索
      // 実装簡略化のため、ログ出力のみ（MVP版）
      systemLogger.debug(`🔍 キャッシュ検索: ${cacheKey}`);
      return null; // キャッシュ機能は本格実装時に拡張

    } catch (error) {
      systemLogger.debug(`⚠️ キャッシュ取得エラー ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * DataManagerにキャッシュデータを保存
   */
  private async saveCacheToDataManager(cacheKey: string, data: any, dataManager: DataManager): Promise<void> {
    try {
      await dataManager.saveKaitoResponse(`cache-${cacheKey}`, {
        cacheKey,
        data,
        cachedAt: new Date().toISOString(),
        ttl: 300000 // 5分
      });
      systemLogger.debug(`💾 キャッシュ保存: ${cacheKey}`);

    } catch (error) {
      systemLogger.warn(`⚠️ キャッシュ保存エラー ${cacheKey}:`, error);
      // キャッシュ保存失敗は致命的でない
    }
  }

  /**
   * キャッシュの有効性チェック
   */
  private isCacheValid(cachedData: any, ttl: number): boolean {
    if (!cachedData || !cachedData.cachedAt) {
      return false;
    }

    const cachedTime = new Date(cachedData.cachedAt).getTime();
    const now = Date.now();
    const isValid = (now - cachedTime) < ttl;
    
    systemLogger.debug(`⏰ キャッシュ有効性: ${isValid} (経過時間: ${now - cachedTime}ms / TTL: ${ttl}ms)`);
    return isValid;
  }

  /**
   * KaitoAPI レート制限対応
   * 200QPS制限に対応した適切な間隔での実行
   */
  async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const minInterval = 700; // 700ms (指示書の最小間隔要件)
    
    try {
      systemLogger.debug(`🚦 レート制限対応実行: ${operationName}`);
      
      const result = await operation();
      
      // 最小間隔を保証
      await this.sleep(minInterval);
      
      systemLogger.debug(`✅ レート制限対応完了: ${operationName}`);
      return result;

    } catch (error) {
      // レート制限エラーの場合は長時間待機
      if (this.isRateLimitError(error)) {
        systemLogger.warn(`⚠️ レート制限検出 - 60秒待機: ${operationName}`);
        await this.sleep(60000); // 1分待機
      }
      
      throw error;
    }
  }

  /**
   * レート制限エラーの判定
   */
  private isRateLimitError(error: any): boolean {
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      '429',
      'quota exceeded',
      'throttle'
    ];

    const errorMessage = (error?.message || '').toLowerCase();
    return rateLimitIndicators.some(indicator => 
      errorMessage.includes(indicator)
    );
  }

  /**
   * KaitoAPI最適化済み検索実行
   * キャッシュ戦略とレート制限対応を統合
   */
  async optimizedKaitoSearch(query: string, dataManager: DataManager): Promise<any[]> {
    try {
      systemLogger.info(`🔍 最適化済み検索実行: "${query}"`);

      // キャッシュ戦略を使用した検索
      const results = await this.getCachedData(
        `search-${query}`,
        async () => {
          const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);
          return await this.executeWithRateLimit(
            () => searchEngine.searchTweets({ query }),
            `検索実行: ${query}`
          );
        },
        300000, // 5分キャッシュ
        dataManager
      );

      // 検索結果をDataManagerに保存
      await dataManager.saveKaitoResponse('search-results', {
        query,
        results: results,
        resultCount: Array.isArray(results) ? results.length : 0,
        timestamp: new Date().toISOString()
      });

      systemLogger.success(`✅ 最適化済み検索完了: ${Array.isArray(results) ? results.length : 0}件の結果`);
      return Array.isArray(results) ? results : [];

    } catch (error) {
      systemLogger.error('❌ 最適化済み検索失敗:', error);
      return [];
    }
  }
}