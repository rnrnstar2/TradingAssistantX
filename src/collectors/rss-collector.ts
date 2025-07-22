import Parser from 'rss-parser';
import { BaseCollector, CollectionResult, CollectionContext } from './base-collector.js';
import { 
  MultiSourceCollectionResult,
  RSSSource,
  RssYamlSettings,
  RssYamlSource,
  createCollectionResult
} from '../types/collection-types.js';
import { YamlManager } from '../utils/yaml-manager.js';

/**
 * RSS Collector - MVP版（疎結合設計準拠）
 * 
 * 主な特徴:
 * - BaseCollector継承による疎結合設計
 * - YAML設定ファイル連携
 * - 実データ収集のみ（モック使用禁止）
 * - データソース独立性確保
 * - MVP制約に合わせた簡素化
 */
export class RSSCollector extends BaseCollector {
  private parser: Parser;
  private yamlManager: YamlManager;
  private cache: Map<string, { data: MultiSourceCollectionResult[]; timestamp: number }> = new Map();
  private rssSettings: RssYamlSettings | null = null;

  constructor(config: any = {}) {
    super({
      enabled: config.enabled ?? true,
      priority: config.priority ?? 5,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      ...config
    });

    this.parser = new Parser({
      timeout: this.getTimeout(),
      headers: {
        'User-Agent': 'TradingAssistantX/1.0.0 RSS Collector'
      }
    });

    this.yamlManager = new YamlManager({
      rootPath: 'data/config',
      enableCache: true,
      cacheMaxAge: 5 * 60 * 1000 // 5分
    });
  }

  // BaseCollector必須実装メソッド

  async collect(context: CollectionContext): Promise<CollectionResult> {
    if (!this.isEnabled()) {
      return this.handleError(new Error('RSS Collector is disabled'), 'rss');
    }

    const startTime = Date.now();

    try {
      // YAML設定ファイル読み込み
      await this.loadRssSettings();

      if (!this.rssSettings) {
        return this.handleError(new Error('RSS settings not loaded'), 'rss');
      }

      // 有効なRSSソースを取得
      const sources = this.getEnabledSources(context);

      if (sources.length === 0) {
        return this.handleError(new Error('No enabled RSS sources found'), 'rss');
      }

      // データ収集実行
      const results = await this.collectFromSources(sources);

      return {
        source: 'rss',
        data: results,
        metadata: this.createMetadata('rss', results.length, Date.now() - startTime),
        success: true
      };

    } catch (error) {
      return this.handleError(error as Error, 'rss');
    }
  }

  getSourceType(): string {
    return 'rss';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadRssSettings();
      return this.rssSettings !== null && this.isEnabled();
    } catch {
      return false;
    }
  }

  shouldCollect(context: CollectionContext): boolean {
    // テーマや投稿内容に関連する場合は収集する
    const financialThemes = ['market', 'investment', 'economic', 'trading', 'finance'];
    const action = context.action?.toLowerCase() || '';
    const theme = context.theme?.toLowerCase() || '';

    return this.isEnabled() && (
      financialThemes.some(keyword => 
        action.includes(keyword) || theme.includes(keyword)
      )
    );
  }

  getPriority(): number {
    return this.config.priority;
  }

  // プライベートメソッド

  private async loadRssSettings(): Promise<void> {
    if (this.rssSettings) {
      return; // 既に読み込み済み
    }

    try {
      const result = await this.yamlManager.loadConfig<RssYamlSettings>(
        'rss-sources.yaml'
      );

      if (result.success && result.data) {
        this.rssSettings = result.data;
        const totalSources = Object.values(this.rssSettings.sources).reduce((sum, sources) => sum + sources.length, 0);
        console.log(`RSS settings loaded: ${totalSources} sources across ${Object.keys(this.rssSettings.sources).length} categories`);
      } else {
        console.error('Failed to load RSS settings:', result.error);
      }
    } catch (error) {
      console.error('Error loading RSS settings:', error);
    }
  }

  private getEnabledSources(context: CollectionContext): RSSSource[] {
    if (!this.rssSettings) {
      return [];
    }

    const sources: RSSSource[] = [];
    
    // 全カテゴリのソースを収集
    Object.entries(this.rssSettings.sources).forEach(([categoryKey, categorySources]) => {
      categorySources.forEach((yamlSource, index) => {
        // URLの決定：queryがある場合は動的URL生成、そうでなければ固定URL
        let url: string;
        if (yamlSource.query) {
          url = this.generateGoogleNewsSearchURL(yamlSource.query);
        } else if (yamlSource.url) {
          url = yamlSource.url;
        } else {
          console.warn(`Source ${yamlSource.name} has neither url nor query. Skipping.`);
          return;
        }

        const source: RSSSource = {
          id: `${categoryKey}_${index}`,
          name: yamlSource.name,
          url: url,
          provider: this.getProviderFromCategory(categoryKey),
          enabled: yamlSource.enabled,
          timeout: this.rssSettings!.collection_settings.timeout_seconds * 1000, // ミリ秒に変換
          maxItems: this.rssSettings!.collection_settings.max_items_per_source,
          categories: [yamlSource.category],
          priority: yamlSource.priority,
          successRate: 0.9, // デフォルト成功率
          errorCount: 0
        };
        sources.push(source);
      });
    });

    // 優先度でソート（低い順 = 高い優先度）
    return sources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  private getProviderFromCategory(category: string): any {
    const categoryProviderMap: Record<string, string> = {
      'financial_major': 'bloomberg',
      'educational': 'motley_fool',
      'market_analysis': 'reuters',
      'investment_guide': 'yahoo_finance'
    };
    return categoryProviderMap[category] || 'unknown';
  }

  /**
   * Google News検索URLを生成
   */
  private generateGoogleNewsSearchURL(query: string): string {
    const encodedQuery = encodeURIComponent(query);
    return `https://news.google.com/rss/search?q=${encodedQuery}&hl=ja&gl=JP&ceid=JP:ja`;
  }

  private async collectFromSources(sources: RSSSource[]): Promise<MultiSourceCollectionResult[]> {
    const allResults: MultiSourceCollectionResult[] = [];
    const maxConcurrency = 3; // 同時接続数制限

    // バッチ処理で同時接続数を制限
    for (let i = 0; i < sources.length; i += maxConcurrency) {
      const batch = sources.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(source => this.collectFromSource(source));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allResults.push(...result.value);
          } else if (result.status === 'rejected') {
            console.warn(`RSS collection failed for ${batch[index].name}:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Batch RSS collection error:', error);
      }
    }

    // 重複除去・時間順ソート
    const uniqueResults = this.removeDuplicates(allResults);
    return uniqueResults
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // 最大50件に制限
  }

  private async collectFromSource(source: RSSSource): Promise<MultiSourceCollectionResult[]> {
    const cacheKey = `rss:${source.id}`;
    const cached = this.cache.get(cacheKey);
    
    // キャッシュチェック (15分)
    if (cached && (Date.now() - cached.timestamp) < 15 * 60 * 1000) {
      return cached.data;
    }

    try {
      const feed = await this.executeWithTimeout(
        () => this.parser.parseURL(source.url),
        source.timeout
      );

      const items: MultiSourceCollectionResult[] = (feed.items || [])
        .slice(0, source.maxItems || 20)
        .map((item, index) => {
          const timestamp = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
          
          return {
            id: item.guid || `${source.id}-${timestamp}-${index}`,
            content: this.cleanContent(item.contentSnippet || item.content || item.title || ''),
            source: source.name,
            timestamp,
            metadata: {
              source: source.name,
              category: source.categories?.[0] || 'general',
              author: item.creator || item.author || 'Unknown',
              pubDate: item.pubDate
            },
            title: item.title || 'No title',
            url: item.link || '',
            provider: source.provider,
            relevanceScore: this.calculateRelevanceScore(item),
            category: source.categories?.[0] || 'general',
            tags: this.extractTags(item, source.categories)
          };
        });

      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: items,
        timestamp: Date.now()
      });

      return items;

    } catch (error) {
      console.error(`RSS collection error for ${source.name}:`, error);
      return [];
    }
  }

  private cleanContent(content: string): string {
    if (!content) return '';
    
    return content
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/\s+/g, ' ')    // 連続空白を1つに
      .trim()
      .substring(0, 1000);     // 最大1000文字に制限
  }

  private calculateRelevanceScore(item: any): number {
    let score = 0.5; // ベーススコア

    const content = (item.title + ' ' + (item.contentSnippet || '')).toLowerCase();
    
    // 投資関連キーワードでスコアアップ
    const financialKeywords = [
      '投資', '株式', '市場', '経済', 'fx', '仮想通貨', '資産運用',
      'investment', 'market', 'trading', 'finance', 'economic',
      'stock', 'crypto', 'currency', 'portfolio'
    ];

    const matches = financialKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;

    score += Math.min(matches * 0.1, 0.4); // 最大0.4のボーナス

    return Math.min(score, 1.0);
  }

  private extractTags(item: any, categories?: string[]): string[] {
    const tags: string[] = [];
    
    if (categories) {
      tags.push(...categories);
    }

    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories.map((cat: string) => cat.toLowerCase()));
    }

    // ハッシュタグ抽出
    const content = item.title + ' ' + (item.contentSnippet || '');
    const hashtags = content.match(/#\w+/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.toLowerCase()));
    }

    return [...new Set(tags)]; // 重複除去
  }

  private removeDuplicates(results: MultiSourceCollectionResult[]): MultiSourceCollectionResult[] {
    const seen = new Set<string>();
    return results.filter(item => {
      const key = `${item.title}_${item.url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // パブリックメソッド

  /**
   * キャッシュクリア
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * RSS設定の再読み込み
   */
  public async reloadSettings(): Promise<void> {
    this.rssSettings = null;
    await this.loadRssSettings();
  }

  /**
   * 利用可能なソース一覧を取得
   */
  public async getAvailableSources(): Promise<string[]> {
    await this.loadRssSettings();
    if (!this.rssSettings) {
      return [];
    }

    const sourceNames: string[] = [];
    Object.values(this.rssSettings.sources).forEach(categorySources => {
      categorySources.forEach(source => {
        sourceNames.push(source.name);
      });
    });

    return sourceNames;
  }

  /**
   * RSS収集統計情報を取得
   */
  public getStats() {
    return {
      cacheSize: this.cache.size,
      settingsLoaded: this.rssSettings !== null,
      isEnabled: this.isEnabled(),
      priority: this.getPriority(),
      sourceType: this.getSourceType()
    };
  }
}