import type { CollectionResult } from '../types/autonomous-system';

export interface MVPCollectionResult {
  results: CollectionResult[];
  stats: {
    total: number;
    apiResults: number;
    rssResults: number;
    structuredResults: number;
    executionTime: number;
  };
}

/**
 * FX MVP収集器 - 最小限実装
 * 無料API・RSS・構造化サイトからの基本データ収集
 */
export class FXMVPCollector {
  private readonly timeout: number = 30000; // 30秒タイムアウト

  /**
   * 優先度1: 無料API収集 (Alpha Vantage, Finnhub, NewsAPI)
   */
  async collectFromAPIs(): Promise<CollectionResult[]> {
    console.log('📊 [FX MVP] API収集開始');
    
    const results: CollectionResult[] = [];
    const promises = [
      this.collectAlphaVantageDemo().catch(() => []),
      this.collectFinnhubDemo().catch(() => []),
      this.collectNewsAPIDemo().catch(() => [])
    ];

    const apiResults = await Promise.allSettled(promises);
    
    for (const result of apiResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    }

    console.log(`✅ [FX MVP] API収集完了: ${results.length}件`);
    return results;
  }

  /**
   * 優先度2: RSS収集 (Reuters, Bloomberg, Yahoo Finance)
   */
  async collectFromRSS(): Promise<CollectionResult[]> {
    console.log('📰 [FX MVP] RSS収集開始');
    
    const results: CollectionResult[] = [];
    const rssUrls = [
      'https://feeds.finance.yahoo.com/rss/2.0/headline',
      'https://feeds.marketwatch.com/marketwatch/topstories/',
    ];

    for (const url of rssUrls) {
      try {
        const rssResults = await this.fetchRSSFeed(url);
        results.push(...rssResults);
      } catch (error) {
        console.warn(`⚠️ [RSS失敗] ${url}:`, error);
      }
    }

    console.log(`✅ [FX MVP] RSS収集完了: ${results.length}件`);
    return results;
  }

  /**
   * 優先度3: 構造化サイト収集 (みんかぶFX, ZAi FX, トレーダーズウェブ)
   */
  async collectFromStructuredSites(): Promise<CollectionResult[]> {
    console.log('🌐 [FX MVP] 構造化サイト収集開始');
    
    const results: CollectionResult[] = [];
    
    // MVP版では構造化サイトはプレースホルダーとして最小限実装
    const mockData: CollectionResult[] = [
      {
        id: `structured_${Date.now()}_1`,
        type: 'market_analysis',
        content: 'USD/JPY 技術分析: 上昇トレンド継続中',
        source: 'minkabu_fx',
        timestamp: Date.now(),
        relevanceScore: 0.7,
        metadata: {
          dataType: 'structured_site',
          site: 'みんかぶFX'
        }
      }
    ];
    
    results.push(...mockData);
    
    console.log(`✅ [FX MVP] 構造化サイト収集完了: ${results.length}件`);
    return results;
  }

  /**
   * メイン実行フロー - 並列・タイムアウト付き
   */
  async executeMVPCollection(): Promise<MVPCollectionResult> {
    const startTime = Date.now();
    console.log('🚀 [FX MVP] 統合収集開始');

    const stats = {
      total: 0,
      apiResults: 0,
      rssResults: 0,
      structuredResults: 0,
      executionTime: 0
    };

    try {
      // タイムアウト付き並列実行
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('タイムアウト')), this.timeout);
      });

      const collectionPromise = Promise.allSettled([
        this.collectFromAPIs(),
        this.collectFromRSS(),
        this.collectFromStructuredSites()
      ]);

      const [apiResults, rssResults, structuredResults] = await Promise.race([
        collectionPromise,
        timeoutPromise
      ]) as PromiseSettledResult<CollectionResult[]>[];

      // 結果の統合
      const allResults: CollectionResult[] = [];

      if (apiResults.status === 'fulfilled') {
        allResults.push(...apiResults.value);
        stats.apiResults = apiResults.value.length;
      }

      if (rssResults.status === 'fulfilled') {
        allResults.push(...rssResults.value);
        stats.rssResults = rssResults.value.length;
      }

      if (structuredResults.status === 'fulfilled') {
        allResults.push(...structuredResults.value);
        stats.structuredResults = structuredResults.value.length;
      }

      stats.total = allResults.length;
      stats.executionTime = Date.now() - startTime;

      console.log(`✅ [FX MVP] 統合収集完了: ${stats.total}件 (${stats.executionTime}ms)`);

      return {
        results: allResults,
        stats
      };

    } catch (error) {
      console.error('❌ [FX MVP] 収集エラー:', error);
      stats.executionTime = Date.now() - startTime;
      
      return {
        results: [],
        stats
      };
    }
  }

  // API収集のデモ実装
  private async collectAlphaVantageDemo(): Promise<CollectionResult[]> {
    // MVP版では実際のAPI呼び出しは無し - デモデータ
    const mockData: CollectionResult[] = [
      {
        id: `alpha_vantage_${Date.now()}`,
        type: 'forex_rate',
        content: 'USD/JPY: 150.25',
        source: 'alpha_vantage',
        timestamp: Date.now(),
        relevanceScore: 0.9,
        metadata: {
          pair: 'USD/JPY',
          rate: 150.25,
          dataType: 'forex_rate'
        }
      }
    ];
    return mockData;
  }

  private async collectFinnhubDemo(): Promise<CollectionResult[]> {
    const mockData: CollectionResult[] = [
      {
        id: `finnhub_${Date.now()}`,
        type: 'economic_event',
        content: 'US GDP発表: 予想2.1% vs 前回1.9%',
        source: 'finnhub',
        timestamp: Date.now(),
        relevanceScore: 0.8,
        metadata: {
          event: 'GDP',
          country: 'US',
          dataType: 'economic_indicator'
        }
      }
    ];
    return mockData;
  }

  private async collectNewsAPIDemo(): Promise<CollectionResult[]> {
    const mockData: CollectionResult[] = [
      {
        id: `newsapi_${Date.now()}`,
        type: 'fx_news',
        content: 'FRBが金利政策について言及、ドル円に影響',
        source: 'newsapi',
        timestamp: Date.now(),
        relevanceScore: 0.7,
        metadata: {
          title: 'FRB金利政策',
          dataType: 'fx_news'
        }
      }
    ];
    return mockData;
  }

  // 基本RSS解析
  private async fetchRSSFeed(url: string): Promise<CollectionResult[]> {
    // MVP版では簡素化 - 実際のRSS解析は別モジュールに委譲
    const mockData: CollectionResult[] = [
      {
        id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'financial_news',
        content: 'Market Update: 主要通貨ペア分析',
        source: 'rss_feed',
        timestamp: Date.now(),
        relevanceScore: 0.6,
        metadata: {
          url,
          dataType: 'rss_news'
        }
      }
    ];
    return mockData;
  }
}