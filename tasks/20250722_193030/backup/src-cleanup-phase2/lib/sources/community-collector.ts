import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { BaseCollectionResult, MultiSourceCollectionResult } from '../../types/collection-common.js';
import { 
  CommunityConfig, 
  CommunitySource, 
  QualityFilters,
  MultiSourceResult, 
  DataProvider 
} from '../../types/multi-source.js';

export class CommunityCollector {
  private cache: Map<string, { data: MultiSourceCollectionResult[]; timestamp: number }> = new Map();
  private requestCounts: Map<string, number> = new Map();

  constructor(private config: CommunityConfig) {}

  async collectFromCommunity(platforms?: string[]): Promise<MultiSourceResult> {
    const startTime = Date.now();
    const enabledSources = this.config.sources.filter(source => 
      source.enabled && (!platforms || platforms.includes(source.name))
    );

    if (enabledSources.length === 0) {
      return this.createEmptyResult('No enabled community sources found', startTime);
    }

    const results: MultiSourceCollectionResult[] = [];
    const errors: Error[] = [];
    let requestCount = 0;
    let cacheUsed = false;

    // Process each source
    for (const source of enabledSources) {
      try {
        const sourceResults = await this.collectFromSource(source);
        results.push(...sourceResults.data);
        requestCount += sourceResults.requestCount;
        if (sourceResults.cacheUsed) cacheUsed = true;
        if (sourceResults.errors) errors.push(...sourceResults.errors);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Filter and sort results
    const filteredResults = this.applyQualityFilters(results, this.config.qualityFilters);
    const sortedResults = filteredResults.sort((a, b) => {
      // Sort by relevance score first, then by timestamp
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.timestamp - a.timestamp;
    });

    return {
      source: 'community',
      provider: 'multiple',
      data: sortedResults.slice(0, 50), // Limit to top 50 results
      timestamp: Date.now(),
      metadata: {
        requestCount,
        cacheUsed,
        responseTime: Date.now() - startTime,
        errorCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async collectFromSource(source: CommunitySource): Promise<{
    data: MultiSourceCollectionResult[];
    requestCount: number;
    cacheUsed: boolean;
    errors?: Error[];
  }> {
    const cacheKey = `community:${source.name}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout * 1000) {
      return {
        data: cached.data,
        requestCount: 0,
        cacheUsed: true
      };
    }

    try {
      let results: MultiSourceCollectionResult[] = [];

      switch (source.provider) {
        case 'reddit':
          results = await this.collectFromReddit(source);
          break;
        case 'hackernews':
          results = await this.collectFromHackerNews(source);
          break;
        default:
          throw new Error(`Unsupported community provider: ${source.provider}`);
      }

      // Cache the results
      if (results.length > 0) {
        this.cache.set(cacheKey, {
          data: results,
          timestamp: Date.now()
        });
      }

      this.incrementRequestCount(source.provider);

      return {
        data: results,
        requestCount: 1,
        cacheUsed: false
      };

    } catch (error) {
      console.error(`Community Collection error for ${source.name}:`, error);
      return {
        data: [],
        requestCount: 0,
        cacheUsed: false,
        errors: [error as Error]
      };
    }
  }

  private async collectFromReddit(source: CommunitySource): Promise<MultiSourceCollectionResult[]> {
    const subreddit = source.subreddit || 'investing';
    const sortBy = source.sortBy || 'hot';
    const timeWindow = source.timeWindow || 'day';
    
    let url = `https://www.reddit.com/r/${subreddit}/${sortBy}.json`;
    if (sortBy === 'top') {
      url += `?t=${timeWindow}`;
    }
    url += `${sortBy === 'top' ? '&' : '?'}limit=${source.maxPosts || 25}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradingAssistantX/1.0.0 (by /u/bot)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const posts = data.data?.children || [];

    const results: MultiSourceCollectionResult[] = posts
      .map((post: any) => post.data)
      .filter((post: any) => {
        // Basic filtering
        return post.score >= (source.minScore || 10) && 
               !post.stickied && 
               !post.over_18 &&
               this.isFinanciallyRelevant(post.title + ' ' + (post.selftext || ''));
      })
      .map((post: any) => ({
        id: `reddit_${post.id}`,
        title: post.title,
        content: this.cleanContent(post.selftext || post.title),
        url: `https://www.reddit.com${post.permalink}`,
        timestamp: post.created_utc * 1000,
        source: source.name,
        provider: source.provider,
        relevanceScore: this.calculateRedditRelevanceScore(post),
        category: 'community_discussion',
        tags: this.extractRedditTags(post),
        metadata: {
          subreddit: post.subreddit,
          score: post.score,
          comments: post.num_comments,
          author: post.author,
          upvoteRatio: post.upvote_ratio,
          flair: post.link_flair_text
        }
      }));

    return results;
  }

  private async collectFromHackerNews(source: CommunitySource): Promise<MultiSourceCollectionResult[]> {
    // Get top stories from Hacker News
    const storiesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), this.config.timeout);
    
    const storiesResponse = await fetch(storiesUrl, {
      signal: controller1.signal
    });
    
    clearTimeout(timeoutId1);

    if (!storiesResponse.ok) {
      throw new Error(`HackerNews API error: ${storiesResponse.status}`);
    }

    const storyIds = await storiesResponse.json() as number[];
    const maxStories = Math.min(source.maxPosts || 20, 50); // Limit to avoid too many requests
    
    const results: MultiSourceCollectionResult[] = [];
    const promises = storyIds.slice(0, maxStories).map(async (storyId) => {
      try {
        const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const itemResponse = await fetch(itemUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!itemResponse.ok) return null;

        const item = await itemResponse.json() as any;
        
        // Filter for financially relevant content
        if (!item.title || !this.isFinanciallyRelevant(item.title + ' ' + (item.text || ''))) {
          return null;
        }

        // Check age constraint
        const ageHours = (Date.now() / 1000 - item.time) / 3600;
        if (ageHours > 48) return null; // Only recent posts

        return {
          id: `hackernews_${item.id}`,
          title: item.title,
          content: this.cleanContent(item.text || item.title),
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          timestamp: item.time * 1000,
          source: source.name,
          provider: source.provider,
          relevanceScore: this.calculateHackerNewsRelevanceScore(item),
          category: 'tech_news',
          tags: this.extractHackerNewsTags(item),
          metadata: {
            score: item.score,
            comments: item.descendants || 0,
            author: item.by,
            type: item.type
          }
        };
      } catch (error) {
        console.error(`Error fetching HN story ${storyId}:`, error);
        return null;
      }
    });

    const storyResults = await Promise.all(promises);
    results.push(...storyResults.filter(Boolean) as MultiSourceCollectionResult[]);

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  private isFinanciallyRelevant(content: string): boolean {
    const financialKeywords = [
      // Core financial terms
      'stock', 'stocks', 'market', 'trading', 'investment', 'invest', 'finance', 'financial',
      'portfolio', 'dividend', 'earnings', 'revenue', 'profit', 'loss', 'valuation',
      
      // Economic terms
      'economic', 'economy', 'inflation', 'recession', 'gdp', 'fed', 'federal reserve',
      'interest rate', 'monetary policy', 'fiscal', 'central bank',
      
      // Crypto terms
      'bitcoin', 'ethereum', 'crypto', 'cryptocurrency', 'blockchain', 'defi', 'nft',
      
      // Company/business terms
      'ipo', 'merger', 'acquisition', 'startup', 'unicorn', 'funding', 'venture',
      'corporate', 'business', 'enterprise', 'ceo', 'cfo',
      
      // Market terms
      'bull market', 'bear market', 'volatility', 'hedge fund', 'etf', 'mutual fund',
      'options', 'futures', 'forex', 'commodity', 'real estate', 'reit'
    ];

    const lowerContent = content.toLowerCase();
    return financialKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private calculateRedditRelevanceScore(post: any): number {
    let score = 0.3; // Base score

    // Score bonus
    const scoreBonus = Math.min((post.score || 0) / 1000, 0.3);
    score += scoreBonus;

    // Comment engagement
    const commentBonus = Math.min((post.num_comments || 0) / 100, 0.2);
    score += commentBonus;

    // Upvote ratio
    const ratioBonus = (post.upvote_ratio || 0.5) * 0.2;
    score += ratioBonus;

    // Financial keyword density
    const content = post.title + ' ' + (post.selftext || '');
    const keywordScore = this.calculateKeywordScore(content) * 0.3;
    score += keywordScore;

    return Math.min(score, 1.0);
  }

  private calculateHackerNewsRelevanceScore(item: any): number {
    let score = 0.4; // Base score (HN tends to have higher quality)

    // Score bonus
    const scoreBonus = Math.min((item.score || 0) / 500, 0.3);
    score += scoreBonus;

    // Comment engagement
    const commentBonus = Math.min((item.descendants || 0) / 50, 0.2);
    score += commentBonus;

    // Financial keyword density
    const content = item.title + ' ' + (item.text || '');
    const keywordScore = this.calculateKeywordScore(content) * 0.1;
    score += keywordScore;

    return Math.min(score, 1.0);
  }

  private calculateKeywordScore(content: string): number {
    const financialKeywords = ['trading', 'investment', 'stock', 'market', 'crypto', 'bitcoin', 'finance'];
    const lowerContent = content.toLowerCase();
    const matches = financialKeywords.filter(keyword => lowerContent.includes(keyword)).length;
    return Math.min(matches / financialKeywords.length, 1.0);
  }

  private extractRedditTags(post: any): string[] {
    const tags = ['reddit', post.subreddit.toLowerCase()];
    
    if (post.link_flair_text) {
      tags.push(post.link_flair_text.toLowerCase().replace(/\s+/g, '_'));
    }

    // Extract hashtags from title and content
    const content = post.title + ' ' + (post.selftext || '');
    const hashtags = content.match(/#\w+/g) || [];
    tags.push(...hashtags.map((tag: string) => tag.toLowerCase()));

    return [...new Set(tags)];
  }

  private extractHackerNewsTags(item: any): string[] {
    const tags = ['hackernews', 'hn'];
    
    // Extract from title
    const title = item.title.toLowerCase();
    if (title.includes('startup')) tags.push('startup');
    if (title.includes('ai') || title.includes('machine learning')) tags.push('ai');
    if (title.includes('crypto') || title.includes('bitcoin')) tags.push('crypto');
    if (title.includes('tech') || title.includes('technology')) tags.push('technology');

    return [...new Set(tags)];
  }

  private applyQualityFilters(results: MultiSourceCollectionResult[], filters: QualityFilters): MultiSourceCollectionResult[] {
    return results.filter(result => {
      // Age filter
      const ageHours = (Date.now() - result.timestamp) / (1000 * 60 * 60);
      if (ageHours > filters.maxAge) return false;

      // Relevance score filter (using as proxy for score)
      const score = result.metadata?.score || 0;
      if (score < filters.minScore) return false;

      // Comment count filter (using as proxy)
      const comments = result.metadata?.comments || result.metadata?.descendants || 0;
      if (comments < filters.minComments) return false;

      // Keyword filters
      const content = result.title + ' ' + result.content;
      const lowerContent = content.toLowerCase();

      // Check banned keywords
      if (filters.bannedKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
        return false;
      }

      // Check required keywords
      if (filters.requiredKeywords && filters.requiredKeywords.length > 0) {
        if (!filters.requiredKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Limit content length
  }

  private createEmptyResult(message: string, startTime: number): MultiSourceResult {
    return {
      source: 'community',
      provider: 'none',
      data: [],
      timestamp: Date.now(),
      metadata: {
        requestCount: 0,
        cacheUsed: false,
        responseTime: Date.now() - startTime,
        errorCount: 1
      },
      errors: [new Error(message)]
    };
  }

  private incrementRequestCount(provider: DataProvider): number {
    const current = this.requestCounts.get(provider) || 0;
    const newCount = current + 1;
    this.requestCounts.set(provider, newCount);
    return newCount;
  }

  // Public methods
  public getRequestStats(): Record<string, number> {
    return Object.fromEntries(this.requestCounts);
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // Static method to get default community sources
  public static getDefaultSources(): CommunitySource[] {
    return [
      {
        name: 'Reddit Investing',
        provider: 'reddit',
        enabled: true,
        subreddit: 'investing',
        sortBy: 'hot',
        timeWindow: 'day',
        maxPosts: 25,
        minScore: 10
      },
      {
        name: 'Reddit Stocks',
        provider: 'reddit',
        enabled: true,
        subreddit: 'stocks',
        sortBy: 'hot',
        timeWindow: 'day',
        maxPosts: 20,
        minScore: 15
      },
      {
        name: 'Reddit Security Analysis',
        provider: 'reddit',
        enabled: true,
        subreddit: 'SecurityAnalysis',
        sortBy: 'top',
        timeWindow: 'week',
        maxPosts: 15,
        minScore: 20
      },
      {
        name: 'Reddit Cryptocurrency',
        provider: 'reddit',
        enabled: true,
        subreddit: 'CryptoCurrency',
        sortBy: 'hot',
        timeWindow: 'day',
        maxPosts: 20,
        minScore: 50
      },
      {
        name: 'Hacker News',
        provider: 'hackernews',
        enabled: true,
        maxPosts: 30,
        minScore: 10
      }
    ];
  }
}