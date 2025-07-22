import Parser from 'rss-parser';
import type { CollectionResult } from '../../types/autonomous-system';

export interface FXRSSSource {
  name: string;
  url: string;
  enabled: boolean;
  maxItems: number;
}

export interface FXRSSCollectionResult {
  results: CollectionResult[];
  stats: {
    totalFeeds: number;
    successfulFeeds: number;
    totalItems: number;
    cacheHits: number;
    errors: string[];
  };
}

interface CacheEntry {
  data: CollectionResult[];
  timestamp: number;
}

/**
 * FX専門RSS収集器 - MVP実装
 * 主要FXニュースフィード特化
 */
export class FXRSSCollector {
  private parser: Parser;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeout: number = 5 * 60 * 1000; // 5分TTL

  private readonly fxSources: FXRSSSource[] = [
    {
      name: 'Yahoo Finance',
      url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
      enabled: true,
      maxItems: 10
    },
    {
      name: 'MarketWatch',
      url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
      enabled: true,
      maxItems: 10
    },
    {
      name: 'Reuters Business',
      url: 'https://feeds.reuters.com/reuters/JPbusinessNews',
      enabled: false, // 無効化: アクセス制限のため
      maxItems: 10
    },
    {
      name: 'Bloomberg Markets',
      url: 'https://feeds.bloomberg.com/markets/news.rss',
      enabled: false, // 無効化: アクセス制限のため
      maxItems: 10
    }
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'TradingAssistantX-FX-RSS/1.0.0'
      }
    });
  }

  /**
   * FX専門RSS収集実行
   */
  async collectFromRSS(): Promise<FXRSSCollectionResult> {
    console.log('📰 [FX RSS] RSS収集開始');

    const stats = {
      totalFeeds: 0,
      successfulFeeds: 0,
      totalItems: 0,
      cacheHits: 0,
      errors: [] as string[]
    };

    const results: CollectionResult[] = [];
    const enabledSources = this.fxSources.filter(source => source.enabled);
    
    stats.totalFeeds = enabledSources.length;

    // 各RSSソースから並列収集
    const promises = enabledSources.map(source => 
      this.collectFromSingleSource(source, stats).catch(error => {
        stats.errors.push(`${source.name}: ${error.message}`);
        return [];
      })
    );

    const feedResults = await Promise.allSettled(promises);
    
    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
        if (result.value.length > 0) {
          stats.successfulFeeds++;
        }
      }
    }

    stats.totalItems = results.length;

    console.log(`✅ [FX RSS] RSS収集完了: ${stats.totalItems}件 (成功: ${stats.successfulFeeds}/${stats.totalFeeds})`);

    return {
      results: this.sortByRelevance(results),
      stats
    };
  }

  /**
   * 単一RSSソースからの収集
   */
  private async collectFromSingleSource(source: FXRSSSource, stats: any): Promise<CollectionResult[]> {
    const cacheKey = `fx_rss_${source.name}`;
    
    // キャッシュチェック (5分TTL)
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      stats.cacheHits++;
      console.log(`📋 [FX RSS] キャッシュヒット: ${source.name}`);
      return cached.data.slice(0, source.maxItems);
    }

    try {
      console.log(`🔗 [FX RSS] フィード取得: ${source.name}`);
      const feed = await this.parser.parseURL(source.url);
      
      const items: CollectionResult[] = (feed.items || [])
        .slice(0, source.maxItems)
        .map((item, index) => ({
          id: `fx_rss_${source.name}_${index}_${Date.now()}`,
          type: 'financial_news',
          content: this.cleanContent(item.title || '', item.contentSnippet || ''),
          source: `rss_${source.name.toLowerCase().replace(/\s+/g, '_')}`,
          timestamp: new Date(item.pubDate || Date.now()).getTime(),
          relevanceScore: this.calculateFXRelevance(item.title || '', item.contentSnippet || ''),
          metadata: {
            title: item.title || '',
            url: item.link || source.url,
            pubDate: item.pubDate,
            author: item.creator || item.author,
            dataType: 'fx_rss_news',
            feedSource: source.name
          }
        }));

      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: items,
        timestamp: Date.now()
      });

      console.log(`✅ [FX RSS] ${source.name}: ${items.length}件取得`);
      return items;

    } catch (error) {
      console.error(`❌ [FX RSS] ${source.name}失敗:`, error);
      throw error;
    }
  }

  /**
   * FX関連性スコア計算
   */
  private calculateFXRelevance(title: string, content: string): number {
    const text = (title + ' ' + content).toLowerCase();
    
    const fxKeywords = [
      'forex', 'fx', 'currency', '通貨', '為替',
      'usd', 'eur', 'jpy', 'gbp', 'aud', 'cad', 'chf',
      'dollar', 'yen', 'euro', 'pound',
      'fed', 'boj', 'ecb', 'boe',
      'central bank', '中央銀行', '金利', 'interest rate',
      'fomc', 'gdp', 'inflation', 'インフレ',
      'trade', '貿易', 'economic', '経済'
    ];

    let score = 0.3; // ベーススコア
    let matches = 0;

    for (const keyword of fxKeywords) {
      if (text.includes(keyword)) {
        matches++;
      }
    }

    // マッチ数に応じてスコア調整
    score += Math.min(matches * 0.1, 0.6);

    // 通貨ペア表記がある場合はさらに高スコア
    if (/[a-z]{3}\/[a-z]{3}/i.test(text) || /[a-z]{6}/i.test(text)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * コンテンツクリーニング
   */
  private cleanContent(title: string, snippet: string): string {
    const content = title + (snippet ? '\n\n' + snippet : '');
    
    return content
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/\s+/g, ' ')    // 連続空白を単一空白に
      .replace(/&amp;/g, '&')  // HTML実体参照を戻す
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .substring(0, 500);      // MVP版では500文字制限
  }

  /**
   * 関連性によるソート
   */
  private sortByRelevance(results: CollectionResult[]): CollectionResult[] {
    return results.sort((a, b) => {
      // 関連性スコア優先
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // 新しい記事優先
      return b.timestamp - a.timestamp;
    });
  }

  /**
   * キャッシュクリア (手動清掃用)
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [FX RSS] キャッシュクリア完了');
  }

  /**
   * キャッシュ統計取得
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * 有効ソース一覧取得
   */
  public getEnabledSources(): FXRSSSource[] {
    return this.fxSources.filter(source => source.enabled);
  }
}