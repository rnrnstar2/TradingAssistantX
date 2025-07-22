import { FXAPICollector } from './fx-api-collector';
import { FXStructuredSiteCollector } from './fx-structured-site-collector';
import type { CollectionResult } from '../types/autonomous-system';

export interface UnifiedCollectorConfig {
  enableAPI: boolean;
  enableStructuredSites: boolean; 
  enableLegacyX: boolean;
  maxResults: number;
  prioritizeAPIs: boolean;
  timeoutMs: number;
}

export interface CollectionStats {
  totalCollected: number;
  apiResults: number;
  structuredSiteResults: number;
  legacyResults: number;
  successfulSources: string[];
  failedSources: string[];
  executionTimeMs: number;
}

/**
 * FX専門統合収集システム
 * API・構造化サイト・レガシーソースの最適組み合わせ
 */
export class FXUnifiedCollector {
  private config: UnifiedCollectorConfig;
  private apiCollector: FXAPICollector;
  private structuredCollector: FXStructuredSiteCollector;

  private static readonly DEFAULT_CONFIG: UnifiedCollectorConfig = {
    enableAPI: true,
    enableStructuredSites: true,
    enableLegacyX: false, // X依存を段階的に無効化
    maxResults: 100,
    prioritizeAPIs: true,
    timeoutMs: 60000, // 1分タイムアウト
  };

  constructor(config?: Partial<UnifiedCollectorConfig>) {
    this.config = { ...FXUnifiedCollector.DEFAULT_CONFIG, ...config };
    this.apiCollector = new FXAPICollector();
    this.structuredCollector = new FXStructuredSiteCollector({
      headless: process.env.NODE_ENV === 'production'
    });
  }

  /**
   * 統合FXデータ収集 - scraper.tsの置き換え
   */
  async collectAllFXData(): Promise<{ results: CollectionResult[]; stats: CollectionStats }> {
    const startTime = Date.now();
    console.log('🚀 [FX統合収集] 次世代データ収集システム開始');

    const stats: CollectionStats = {
      totalCollected: 0,
      apiResults: 0,
      structuredSiteResults: 0,
      legacyResults: 0,
      successfulSources: [],
      failedSources: [],
      executionTimeMs: 0
    };

    const allResults: CollectionResult[] = [];
    const collectionPromises: Promise<void>[] = [];

    // Phase 1: 高優先度API収集（並列実行）
    if (this.config.enableAPI) {
      const apiPromise = this.collectFromAPIs(stats, allResults)
        .catch(error => {
          console.error('❌ [API収集失敗]:', error);
          stats.failedSources.push('FX_APIs');
        });
      collectionPromises.push(apiPromise);
    }

    // Phase 2: 構造化サイト収集（並列実行）
    if (this.config.enableStructuredSites) {
      const structuredPromise = this.collectFromStructuredSites(stats, allResults)
        .catch(error => {
          console.error('❌ [構造化サイト収集失敗]:', error);
          stats.failedSources.push('Structured_Sites');
        });
      collectionPromises.push(structuredPromise);
    }

    // Phase 3: レガシーX収集（フォールバック）
    if (this.config.enableLegacyX && allResults.length === 0) {
      const legacyPromise = this.collectFromLegacySources(stats, allResults)
        .catch(error => {
          console.error('❌ [レガシー収集失敗]:', error);
          stats.failedSources.push('Legacy_X');
        });
      collectionPromises.push(legacyPromise);
    }

    // タイムアウト付き並列実行
    try {
      await Promise.race([
        Promise.allSettled(collectionPromises),
        this.createTimeoutPromise(this.config.timeoutMs)
      ]);
    } catch (timeoutError) {
      console.warn('⚠️ [収集タイムアウト] 部分的な結果で継続');
    }

    // 結果の最適化とランキング
    const optimizedResults = this.optimizeResults(allResults);
    
    // 統計情報の完成
    stats.totalCollected = optimizedResults.length;
    stats.executionTimeMs = Date.now() - startTime;

    console.log(`✅ [FX統合収集完了] ${stats.totalCollected}件 (API: ${stats.apiResults}, 構造化: ${stats.structuredSiteResults}, レガシー: ${stats.legacyResults})`);
    console.log(`📊 [実行統計] ${stats.executionTimeMs}ms, 成功: [${stats.successfulSources.join(', ')}]`);

    return { 
      results: optimizedResults, 
      stats 
    };
  }

  /**
   * Phase 1: API収集
   */
  private async collectFromAPIs(stats: CollectionStats, allResults: CollectionResult[]): Promise<void> {
    console.log('📊 [Phase 1] API収集開始');
    
    try {
      const apiResults = await this.apiCollector.collectAllFXData();
      allResults.push(...apiResults);
      stats.apiResults = apiResults.length;
      stats.successfulSources.push('FX_APIs');
      
      console.log(`✅ [API収集] ${apiResults.length}件取得`);
    } catch (error) {
      console.error('❌ [API収集エラー]:', error);
      throw error;
    }
  }

  /**
   * Phase 2: 構造化サイト収集
   */
  private async collectFromStructuredSites(stats: CollectionStats, allResults: CollectionResult[]): Promise<void> {
    console.log('🌐 [Phase 2] 構造化サイト収集開始');
    
    try {
      const siteResults = await this.structuredCollector.collectFromAllSites();
      allResults.push(...siteResults);
      stats.structuredSiteResults = siteResults.length;
      stats.successfulSources.push('Structured_Sites');
      
      console.log(`✅ [構造化サイト収集] ${siteResults.length}件取得`);
    } catch (error) {
      console.error('❌ [構造化サイト収集エラー]:', error);
      throw error;
    }
  }

  /**
   * Phase 3: レガシーソース収集（フォールバック）
   */
  private async collectFromLegacySources(stats: CollectionStats, allResults: CollectionResult[]): Promise<void> {
    console.log('🔄 [Phase 3] レガシーソース収集開始（フォールバック）');
    
    try {
      // 既存のClaudeControlledCollectorをフォールバックとして使用
      const { ClaudeControlledCollector } = await import('./claude-controlled-collector');
      const legacyCollector = new ClaudeControlledCollector();
      const legacyResults = await legacyCollector.performParallelCollection();
      
      // レガシーソースからの結果を変換
      const convertedResults: CollectionResult[] = legacyResults.map((result, index) => ({
        id: `legacy_${Date.now()}_${index}`,
        type: 'legacy_social',
        content: result.content,
        source: `legacy_${result.source || 'x.com'}`,
        timestamp: result.timestamp,
        relevanceScore: (result.relevanceScore || 0.5) * 0.6, // レガシー結果の重要度を下げる
        metadata: {
          ...result.metadata,
          dataType: 'legacy_social_media',
          isLegacy: true
        }
      }));

      allResults.push(...convertedResults);
      stats.legacyResults = convertedResults.length;
      stats.successfulSources.push('Legacy_X');
      
      console.log(`✅ [レガシー収集] ${convertedResults.length}件取得`);
    } catch (error) {
      console.error('❌ [レガシー収集エラー]:', error);
      // フォールバックなのでエラーでも継続
    }
  }

  /**
   * 結果最適化・ランキング・重複除去
   */
  private optimizeResults(results: CollectionResult[]): CollectionResult[] {
    console.log('🔧 [結果最適化] ランキング・重複除去処理');

    // 1. 重複除去（内容の類似性ベース）
    const uniqueResults = this.removeDuplicatesByContent(results);

    // 2. API優先のスコアリング調整
    if (this.config.prioritizeAPIs) {
      uniqueResults.forEach(result => {
        if (result.source.includes('alpha_vantage') || 
            result.source.includes('finnhub') || 
            result.source.includes('fmp')) {
          result.relevanceScore += 0.1; // API結果のスコアブースト
        }
      });
    }

    // 3. 関連性スコアでソート
    uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 4. 結果数制限
    const finalResults = uniqueResults.slice(0, this.config.maxResults);

    console.log(`🔧 [最適化完了] ${results.length} → ${uniqueResults.length} → ${finalResults.length}件`);
    return finalResults;
  }

  /**
   * 内容ベースの重複除去
   */
  private removeDuplicatesByContent(results: CollectionResult[]): CollectionResult[] {
    const seen = new Set<string>();
    const unique: CollectionResult[] = [];

    for (const result of results) {
      const contentHash = this.generateContentHash(result.content);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(result);
      } else {
        // 重複の場合、より高いスコアの方を保持
        const existingIndex = unique.findIndex(r => 
          this.generateContentHash(r.content) === contentHash);
        if (existingIndex !== -1 && result.relevanceScore > unique[existingIndex].relevanceScore) {
          unique[existingIndex] = result;
        }
      }
    }

    return unique;
  }

  /**
   * コンテンツハッシュ生成（重複検出用）
   */
  private generateContentHash(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150); // 最初の150文字をハッシュとして使用
  }

  /**
   * タイムアウトPromise生成
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`収集タイムアウト: ${timeoutMs}ms経過`));
      }, timeoutMs);
    });
  }

  /**
   * 収集統計の取得（外部監視用）
   */
  async getCollectionHealth(): Promise<{
    apiStatus: 'healthy' | 'degraded' | 'failed';
    structuredSiteStatus: 'healthy' | 'degraded' | 'failed';
    recommendedConfig: Partial<UnifiedCollectorConfig>;
  }> {
    // 簡易ヘルスチェック
    let apiStatus: 'healthy' | 'degraded' | 'failed' = 'healthy';
    let structuredSiteStatus: 'healthy' | 'degraded' | 'failed' = 'healthy';

    try {
      // API接続テスト（軽量）
      if (this.config.enableAPI) {
        // Alpha VantageのAPI Keyチェック
        const hasApiKeys = !!(
          process.env.ALPHA_VANTAGE_API_KEY ||
          process.env.FINNHUB_API_KEY ||
          process.env.FMP_API_KEY
        );
        if (!hasApiKeys) {
          apiStatus = 'degraded';
        }
      }
    } catch (error) {
      apiStatus = 'failed';
    }

    // パフォーマンス基準の推奨設定
    const recommendedConfig: Partial<UnifiedCollectorConfig> = {};
    
    if (apiStatus === 'failed') {
      recommendedConfig.enableAPI = false;
      recommendedConfig.enableStructuredSites = true;
    }

    return {
      apiStatus,
      structuredSiteStatus,
      recommendedConfig
    };
  }

  /**
   * 手動クリーンアップ
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [統合コレクター] クリーンアップ開始');
    try {
      await this.structuredCollector.forceCleanup();
      console.log('✅ [クリーンアップ完了]');
    } catch (error) {
      console.warn('⚠️ [クリーンアップ警告]:', error);
    }
  }
}