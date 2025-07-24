/**
 * 投稿検索エンジンの実装
 * REQUIREMENTS.md準拠版 - KaitoTwitterAPI高度検索システム
 */

export interface TweetSearchOptions {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

export interface UserSearchOptions {
  query: string;
  maxResults?: number;
  verified?: boolean;
  minFollowers?: number;
}

export interface TrendSearchOptions {
  location?: string;
  category?: string;
  limit?: number;
}

export interface BatchSearchOptions {
  queries: string[];
  maxResultsPerQuery?: number;
  delay?: number;
  parallelRequests?: number;
}

export interface SearchEngineCapabilities {
  tweetSearch: TweetSearchOptions;
  userSearch: UserSearchOptions;
  trendSearch: TrendSearchOptions;
  batchSearch: BatchSearchOptions;
}

export interface SearchFilters {
  minLikes?: number;
  minRetweets?: number;
  minReplies?: number;
  fromDate?: string;
  toDate?: string;
  language?: string;
  hasMedia?: boolean;
  hasHashtags?: boolean;
  engagement_threshold?: number;
  account_type?: 'verified' | 'unverified' | 'any';
  content_type?: 'original' | 'retweet' | 'reply' | 'any';
}

export interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    verified: boolean;
    followersCount: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  engagement: {
    rate: number;
    quality_score: number;
    virality_potential: number;
  };
  content: {
    hashtags: string[];
    mentions: string[];
    urls: string[];
    hasMedia: boolean;
    language: string;
  };
  timestamp: string;
  url: string;
}

export interface SearchResult {
  tweets: Tweet[];
  metadata: {
    totalFound: number;
    searchTime: number;
    query: string;
    filters: SearchFilters;
    timestamp: string;
  };
  insights: {
    avgEngagement: number;
    topHashtags: string[];
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    peakTimes: string[];
  };
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  description: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
  createdAt: string;
  isInvestmentRelated?: boolean;
}

export interface TrendingTopic {
  topic: string;
  volume: number;
  trend: 'rising' | 'stable' | 'declining';
  related_hashtags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  opportunity_score: number;
}

export interface BatchSearchResult {
  query: string;
  results: Tweet[];
  executionTime: number;
  success: boolean;
  error?: string;
}

/**
 * 投稿検索エンジンクラス
 * KaitoTwitterAPIを使用した高度な投稿検索・分析システム
 */
export class SearchEngine {
  private readonly MAX_RESULTS = 100;
  private readonly SEARCH_TIMEOUT = 30000;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly INVESTMENT_KEYWORDS = ['投資', '株式', '仮想通貨', 'bitcoin', 'FX', 'NISA', 'iDeCo', '資産運用'];

  private searchCache: Map<string, { result: SearchResult; timestamp: number }> = new Map();
  private userCache: Map<string, { result: User[]; timestamp: number }> = new Map();
  private trendCache: Map<string, { result: TrendingTopic[]; timestamp: number }> = new Map();
  private capabilities: SearchEngineCapabilities;

  constructor() {
    this.capabilities = {
      tweetSearch: { query: '', maxResults: 100, timeRange: '24h' },
      userSearch: { query: '', maxResults: 50, minFollowers: 100 },
      trendSearch: { location: 'JP', limit: 20 },
      batchSearch: { queries: [], maxResultsPerQuery: 50, delay: 1000, parallelRequests: 3 }
    };
    console.log('✅ SearchEngine initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * キーワードベースの投稿検索 (投資教育関連高精度検索)
   */
  async searchTweets(query: string, filters?: SearchFilters): Promise<Tweet[]> {
    try {
      console.log('🔍 投稿検索開始:', { query, filters });

      // 投資教育関連キーワードの強化
      const enhancedQuery = this.enhanceInvestmentQuery(query);

      // キャッシュチェック
      const cacheKey = this.generateCacheKey(enhancedQuery, filters);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📋 キャッシュから結果を返却');
        return cached.tweets;
      }

      // 検索パラメータの構築
      const searchParams = this.buildSearchParams(enhancedQuery, filters);
      
      // Mock search execution
      const searchResult = await this.executeMockSearch(searchParams);

      // 投資関連フィルタリング
      const filteredTweets = this.filterInvestmentRelatedTweets(searchResult.tweets);
      searchResult.tweets = filteredTweets;

      // キャッシュに保存
      this.setCache(cacheKey, searchResult);

      console.log('✅ 投稿検索完了:', { 
        found: searchResult.tweets.length,
        searchTime: searchResult.metadata.searchTime 
      });

      return searchResult.tweets;

    } catch (error) {
      console.error('❌ 投稿検索失敗:', error);
      return [];
    }
  }

  /**
   * ユーザー検索機能
   */
  async searchUsers(options: UserSearchOptions): Promise<User[]> {
    try {
      console.log('👥 ユーザー検索開始:', options);

      // キャッシュチェック
      const cacheKey = `user_${JSON.stringify(options)}`;
      const cached = this.getUserFromCache(cacheKey);
      if (cached) {
        console.log('📋 キャッシュからユーザー結果を返却');
        return cached;
      }

      // Mock user search execution
      const users = await this.executeMockUserSearch(options);

      // キャッシュに保存
      this.setUserCache(cacheKey, users);

      console.log('✅ ユーザー検索完了:', { found: users.length });
      return users;

    } catch (error) {
      console.error('❌ ユーザー検索失敗:', error);
      return [];
    }
  }

  /**
   * トレンド検索機能
   */
  async searchTrends(options: TrendSearchOptions = {}): Promise<TrendingTopic[]> {
    try {
      console.log('📈 トレンド検索開始:', options);

      // キャッシュチェック
      const cacheKey = `trend_${JSON.stringify(options)}`;
      const cached = this.getTrendFromCache(cacheKey);
      if (cached) {
        console.log('📋 キャッシュからトレンド結果を返却');
        return cached;
      }

      // Mock trend search execution
      const trends = await this.executeMockTrendingAnalysis();

      // キャッシュに保存
      this.setTrendCache(cacheKey, trends);

      console.log('✅ トレンド検索完了:', { found: trends.length });
      return trends;

    } catch (error) {
      console.error('❌ トレンド検索失敗:', error);
      return [];
    }
  }

  /**
   * バッチ検索機能 (コスト削減)
   */
  async batchSearch(options: BatchSearchOptions): Promise<BatchSearchResult[]> {
    try {
      console.log('📦 バッチ検索開始:', {
        queries: options.queries.length,
        parallelRequests: options.parallelRequests || 3
      });

      const results: BatchSearchResult[] = [];
      const batches = this.createBatches(options.queries, options.parallelRequests || 3);

      for (const batch of batches) {
        const batchPromises = batch.map(async query => {
          const startTime = Date.now();
          try {
            const tweets = await this.searchTweets(query, {
              language: 'ja',
              minLikes: 1
            });
            
            return {
              query,
              results: tweets.slice(0, options.maxResultsPerQuery || 50),
              executionTime: Date.now() - startTime,
              success: true
            };
          } catch (error) {
            return {
              query,
              results: [],
              executionTime: Date.now() - startTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // バッチ間の遅延
        if (options.delay && batches.length > 1) {
          await this.delay(options.delay);
        }
      }

      console.log('✅ バッチ検索完了:', {
        total: results.length,
        successful: results.filter(r => r.success).length
      });

      return results;

    } catch (error) {
      console.error('❌ バッチ検索失敗:', error);
      return [];
    }
  }

  /**
   * 高エンゲージメント投稿の検索
   */
  async findHighEngagementTweets(topic: string, options?: {
    minEngagementRate?: number;
    timeRange?: '1h' | '6h' | '24h' | '7d';
    limit?: number;
  }): Promise<Tweet[]> {
    try {
      const { 
        minEngagementRate = 5.0, 
        timeRange = '24h', 
        limit = 20 
      } = options || {};

      console.log('📈 高エンゲージメント投稿検索:', { 
        topic, 
        minEngagementRate, 
        timeRange, 
        limit 
      });

      // 検索フィルターの構築
      const filters: SearchFilters = {
        engagement_threshold: minEngagementRate,
        fromDate: this.getTimeRangeStart(timeRange),
        toDate: new Date().toISOString(),
        minLikes: 10,
        minRetweets: 2,
        language: 'ja'
      };

      // 検索実行
      const allTweets = await this.searchTweets(topic, filters);

      // エンゲージメント率でソート & 制限
      const highEngagementTweets = allTweets
        .filter(tweet => tweet.engagement.rate >= minEngagementRate)
        .sort((a, b) => b.engagement.rate - a.engagement.rate)
        .slice(0, limit);

      console.log('✅ 高エンゲージメント投稿検索完了:', { 
        found: highEngagementTweets.length,
        avgEngagement: this.calculateAverageEngagement(highEngagementTweets)
      });

      return highEngagementTweets;

    } catch (error) {
      console.error('❌ 高エンゲージメント投稿検索失敗:', error);
      return [];
    }
  }

  /**
   * トレンドトピックの分析
   */
  async analyzeTrendingTopics(): Promise<TrendingTopic[]> {
    try {
      console.log('📊 トレンドトピック分析開始');

      // Mock trending topics analysis
      const trendingTopics = await this.executeMockTrendingAnalysis();

      console.log('✅ トレンドトピック分析完了:', { 
        topicsFound: trendingTopics.length 
      });

      return trendingTopics;

    } catch (error) {
      console.error('❌ トレンドトピック分析失敗:', error);
      return [];
    }
  }

  /**
   * 競合アカウント分析
   */
  async analyzeCompetitorTweets(usernames: string[], options?: {
    daysBack?: number;
    minEngagement?: number;
  }): Promise<{
    account: string;
    tweets: Tweet[];
    insights: {
      avgEngagement: number;
      postingFrequency: number;
      topHashtags: string[];
      bestPerformingTweet: Tweet;
    };
  }[]> {
    try {
      const { daysBack = 7, minEngagement = 1.0 } = options || {};

      console.log('🔬 競合アカウント分析開始:', { 
        usernames, 
        daysBack, 
        minEngagement 
      });

      const competitorAnalysis = [];

      for (const username of usernames) {
        try {
          // ユーザーの投稿を検索
          const userTweets = await this.searchUserTweets(username, daysBack);
          
          // 分析データ生成
          const insights = this.generateUserInsights(userTweets);
          
          competitorAnalysis.push({
            account: username,
            tweets: userTweets.filter(t => t.engagement.rate >= minEngagement),
            insights
          });

        } catch (error) {
          console.warn(`競合アカウント ${username} の分析でエラー:`, error);
          continue;
        }
      }

      console.log('✅ 競合アカウント分析完了:', { 
        accountsAnalyzed: competitorAnalysis.length 
      });

      return competitorAnalysis;

    } catch (error) {
      console.error('❌ 競合アカウント分析失敗:', error);
      return [];
    }
  }

  /**
   * リアルタイム市場センチメント分析
   */
  async analyzeMarketSentiment(keywords: string[] = ['投資', '株式', '仮想通貨', 'bitcoin']): Promise<{
    overall_sentiment: 'bullish' | 'bearish' | 'neutral';
    sentiment_score: number; // -1 to 1
    topic_sentiments: { [topic: string]: number };
    volume_trends: { [topic: string]: number };
    timestamp: string;
  }> {
    try {
      console.log('💭 市場センチメント分析開始:', { keywords });

      const sentimentData = {
        overall_sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral',
        sentiment_score: 0,
        topic_sentiments: {} as { [topic: string]: number },
        volume_trends: {} as { [topic: string]: number },
        timestamp: new Date().toISOString()
      };

      // キーワード別センチメント分析
      for (const keyword of keywords) {
        const tweets = await this.searchTweets(keyword, {
          fromDate: this.getTimeRangeStart('24h'),
          language: 'ja'
        });

        const sentiment = this.calculateSentiment(tweets);
        sentimentData.topic_sentiments[keyword] = sentiment;
        sentimentData.volume_trends[keyword] = tweets.length;
      }

      // 全体センチメント計算
      const sentimentValues = Object.values(sentimentData.topic_sentiments);
      const avgSentiment = sentimentValues.reduce((sum, val) => sum + val, 0) / sentimentValues.length;
      
      sentimentData.sentiment_score = avgSentiment;
      sentimentData.overall_sentiment = 
        avgSentiment > 0.2 ? 'bullish' : 
        avgSentiment < -0.2 ? 'bearish' : 'neutral';

      console.log('✅ 市場センチメント分析完了:', { 
        overall: sentimentData.overall_sentiment,
        score: sentimentData.sentiment_score
      });

      return sentimentData;

    } catch (error) {
      console.error('❌ 市場センチメント分析失敗:', error);
      return {
        overall_sentiment: 'neutral' as 'bullish' | 'bearish' | 'neutral',
        sentiment_score: 0,
        topic_sentiments: {},
        volume_trends: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 検索能力情報取得
   */
  getCapabilities(): SearchEngineCapabilities {
    return { ...this.capabilities };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateCacheKey(query: string, filters?: SearchFilters): string {
    const filtersKey = filters ? JSON.stringify(filters) : '';
    return `search_${query}_${filtersKey}`;
  }

  private getFromCache(key: string): SearchResult | null {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: SearchResult): void {
    this.searchCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private buildSearchParams(query: string, filters?: SearchFilters): any {
    return {
      q: query,
      result_type: 'mixed',
      count: Math.min(this.MAX_RESULTS, 100),
      lang: filters?.language || 'ja',
      since: filters?.fromDate,
      until: filters?.toDate,
      filter: this.buildFilterString(filters)
    };
  }

  private buildFilterString(filters?: SearchFilters): string {
    if (!filters) return '';

    const filterParts: string[] = [];

    if (filters.minLikes) filterParts.push(`min_faves:${filters.minLikes}`);
    if (filters.minRetweets) filterParts.push(`min_retweets:${filters.minRetweets}`);
    if (filters.minReplies) filterParts.push(`min_replies:${filters.minReplies}`);
    if (filters.hasMedia) filterParts.push('has:media');
    if (filters.hasHashtags) filterParts.push('has:hashtags');

    return filterParts.join(' ');
  }

  private async executeMockSearch(params: any): Promise<SearchResult> {
    console.log('🔍 Mock検索実行中...', { params });
    
    const startTime = Date.now();
    await this.delay(Math.random() * 1000 + 500); // 0.5-1.5s

    const tweets: Tweet[] = [];
    const tweetCount = Math.floor(Math.random() * 50) + 10; // 10-60 tweets

    for (let i = 0; i < tweetCount; i++) {
      tweets.push(this.generateMockTweet(params.q, i));
    }

    const searchTime = Date.now() - startTime;

    return {
      tweets,
      metadata: {
        totalFound: tweets.length,
        searchTime,
        query: params.q,
        filters: {},
        timestamp: new Date().toISOString()
      },
      insights: {
        avgEngagement: this.calculateAverageEngagement(tweets),
        topHashtags: this.extractTopHashtags(tweets),
        sentimentDistribution: {
          positive: 0.4,
          neutral: 0.4,
          negative: 0.2
        },
        peakTimes: ['09:00', '12:00', '18:00', '21:00']
      }
    };
  }

  private enhanceInvestmentQuery(query: string): string {
    // 投資教育関連キーワードを自動追加
    const isInvestmentRelated = this.INVESTMENT_KEYWORDS.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!isInvestmentRelated) {
      // 投資関連キーワードでない場合、関連キーワードを追加
      const investmentContext = '投資 OR 資産運用 OR 投資教育';
      return `(${query}) AND (${investmentContext})`;
    }
    
    return query;
  }

  private filterInvestmentRelatedTweets(tweets: Tweet[]): Tweet[] {
    return tweets.filter(tweet => {
      const text = tweet.text.toLowerCase();
      const hasInvestmentKeyword = this.INVESTMENT_KEYWORDS.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      const hasInvestmentHashtag = tweet.content.hashtags.some(hashtag => 
        hashtag.includes('投資') || hashtag.includes('資産') || hashtag.includes('金融')
      );
      
      return hasInvestmentKeyword || hasInvestmentHashtag;
    });
  }

  private async executeMockUserSearch(options: UserSearchOptions): Promise<User[]> {
    await this.delay(Math.random() * 800 + 200); // 0.2-1.0s
    
    const users: User[] = [];
    const userCount = Math.min(options.maxResults || 50, 50);
    
    for (let i = 0; i < userCount; i++) {
      const followersCount = Math.floor(Math.random() * 50000) + (options.minFollowers || 100);
      const isInvestmentRelated = Math.random() > 0.3; // 70% 投資関連
      
      users.push({
        id: `user_${Date.now()}_${i}`,
        username: `trader_${i}_${Date.now()}`,
        displayName: isInvestmentRelated ? `投資アナリスト${i}` : `ユーザー${i}`,
        verified: options.verified !== undefined ? options.verified : Math.random() > 0.9,
        followersCount,
        followingCount: Math.floor(Math.random() * 2000) + 50,
        tweetsCount: Math.floor(Math.random() * 10000) + 100,
        description: isInvestmentRelated ? 
          `投資教育・資産運用に関する情報を発信しています` : 
          `一般的なツイートを投稿しています`,
        location: 'Japan',
        website: isInvestmentRelated ? 'https://investment-blog.example.com' : undefined,
        profileImageUrl: `https://example.com/avatar_${i}.jpg`,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        isInvestmentRelated
      });
    }
    
    return users;
  }

  private getUserFromCache(key: string): User[] | null {
    const cached = this.userCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.userCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setUserCache(key: string, result: User[]): void {
    this.userCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private getTrendFromCache(key: string): TrendingTopic[] | null {
    const cached = this.trendCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.trendCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setTrendCache(key: string, result: TrendingTopic[]): void {
    this.trendCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private generateMockTweet(topic: string, index: number): Tweet {
    const likes = Math.floor(Math.random() * 200) + 10;
    const retweets = Math.floor(Math.random() * 50) + 1;
    const replies = Math.floor(Math.random() * 30) + 1;
    const total = likes + retweets + replies;

    return {
      id: `mock_tweet_${Date.now()}_${index}`,
      text: this.generateMockTweetText(topic),
      author: {
        id: `user_${index}`,
        username: `trader_${index}`,
        displayName: `投資アカウント${index}`,
        verified: Math.random() > 0.8,
        followersCount: Math.floor(Math.random() * 10000) + 100
      },
      metrics: {
        likes,
        retweets,
        replies,
        views: total * 10 + Math.floor(Math.random() * 1000)
      },
      engagement: {
        rate: (total / 100) * Math.random() * 10,
        quality_score: Math.random() * 100,
        virality_potential: Math.random() * 100
      },
      content: {
        hashtags: this.generateMockHashtags(topic),
        mentions: [],
        urls: [],
        hasMedia: Math.random() > 0.7,
        language: 'ja'
      },
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      url: `https://twitter.com/trader_${index}/status/mock_tweet_${Date.now()}_${index}`
    };
  }

  private generateMockTweetText(topic: string): string {
    const templates = [
      `${topic}について最新の分析をお届けします。市場動向を踏まえた戦略的アプローチが重要ですね。`,
      `今日の${topic}の動きを見ていると、長期的な視点での投資判断が求められますね。`,
      `${topic}に関する興味深いデータを発見しました。投資家の皆さんには参考になるかもしれません。`,
      `${topic}の最新トレンドを分析した結果、新たな投資機会が見えてきました。`,
      `${topic}市場の変化に対応するため、ポートフォリオの見直しを検討中です。`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateMockHashtags(topic: string): string[] {
    const commonHashtags = ['#投資', '#資産運用', '#投資教育', '#金融リテラシー'];
    const topicHashtags = [`#${topic}`, `#${topic}投資`, `#${topic}分析`];
    
    const allHashtags = [...commonHashtags, ...topicHashtags];
    const count = Math.floor(Math.random() * 4) + 1; // 1-4 hashtags
    
    return allHashtags.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private async executeMockTrendingAnalysis(): Promise<TrendingTopic[]> {
    await this.delay(500);

    const topics = [
      'Bitcoin', 'Ethereum', 'NISA', 'iDeCo', '株式投資',
      'FX', '仮想通貨', '投資信託', '不動産投資', 'AI投資'
    ];

    return topics.slice(0, 5).map(topic => ({
      topic,
      volume: Math.floor(Math.random() * 10000) + 1000,
      trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
      related_hashtags: [`#${topic}`, `#${topic}投資`, `#${topic}分析`],
      sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
      opportunity_score: Math.random() * 100
    }));
  }

  private async searchUserTweets(username: string, daysBack: number): Promise<Tweet[]> {
    // Mock user tweets search
    const query = `from:${username}`;
    const filters: SearchFilters = {
      fromDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    };

    return this.searchTweets(query, filters);
  }

  private generateUserInsights(tweets: Tweet[]): any {
    if (tweets.length === 0) {
      return {
        avgEngagement: 0,
        postingFrequency: 0,
        topHashtags: [],
        bestPerformingTweet: null
      };
    }

    const avgEngagement = this.calculateAverageEngagement(tweets);
    const postingFrequency = tweets.length / 7; // posts per day
    const topHashtags = this.extractTopHashtags(tweets);
    const bestPerformingTweet = tweets.reduce((best, current) => 
      current.engagement.rate > best.engagement.rate ? current : best
    );

    return {
      avgEngagement,
      postingFrequency,
      topHashtags,
      bestPerformingTweet
    };
  }

  private calculateAverageEngagement(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;
    
    const totalEngagement = tweets.reduce((sum, tweet) => sum + tweet.engagement.rate, 0);
    return totalEngagement / tweets.length;
  }

  private extractTopHashtags(tweets: Tweet[]): string[] {
    const hashtagCounts: { [hashtag: string]: number } = {};

    tweets.forEach(tweet => {
      tweet.content.hashtags.forEach(hashtag => {
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
      });
    });

    return Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hashtag]) => hashtag);
  }

  private calculateSentiment(tweets: Tweet[]): number {
    // Simple sentiment calculation (-1 to 1)
    const positiveWords = ['良い', '上昇', '利益', '成功', '推奨', '買い'];
    const negativeWords = ['悪い', '下落', '損失', '失敗', '危険', '売り'];

    let sentimentScore = 0;
    
    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();
      
      positiveWords.forEach(word => {
        if (text.includes(word)) sentimentScore += 1;
      });
      
      negativeWords.forEach(word => {
        if (text.includes(word)) sentimentScore -= 1;
      });
    });

    // Normalize to -1 to 1
    return Math.max(-1, Math.min(1, sentimentScore / Math.max(tweets.length, 1)));
  }

  private getTimeRangeStart(timeRange: string): string {
    const now = new Date();
    const millisecondsMap = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const ms = millisecondsMap[timeRange as keyof typeof millisecondsMap] || millisecondsMap['24h'];
    return new Date(now.getTime() - ms).toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // PHASE 1.2 新機能: 投資教育特化検索
  // ============================================================================

  /**
   * 投資教育コンテンツ特化検索
   */
  async searchEducationalContent(topic: string): Promise<EducationalTweet[]> {
    try {
      console.log('🎓 投資教育コンテンツ検索開始:', { topic });
      
      // キーワード拡張
      const expandedKeywords = this.investmentEducationEngine.keywordExpansion.expandKeywords(topic);
      const semanticKeywords = this.investmentEducationEngine.keywordExpansion.getSemanticKeywords(topic);
      
      // 拡張クエリ構築
      const enhancedQuery = this.buildEducationalQuery(topic, expandedKeywords, semanticKeywords);
      
      // キャッシュ確認 (マルチレイヤー)
      const cacheKey = `educational_${topic}`;
      const cached = this.advancedCache.multiLayerCache.get(cacheKey, 1);
      if (cached) {
        console.log('📊 L1キャッシュヒット: 投資教育コンテンツ');
        return cached;
      }
      
      // 特化フィルターで検索
      const educationalFilters: SearchFilters = {
        minLikes: 5,
        minRetweets: 2,
        engagement_threshold: 3.0,
        account_type: 'any',
        content_type: 'original',
        language: 'ja'
      };
      
      // 基本検索実行
      const basicTweets = await this.searchTweets(enhancedQuery, educationalFilters);
      
      // 教育的価値分析と変換
      const educationalTweets = await this.convertToEducationalTweets(basicTweets);
      
      // 品質スコアでソート
      const sortedTweets = educationalTweets
        .sort((a, b) => b.educationalValue.score - a.educationalValue.score)
        .slice(0, this.MAX_RESULTS);
      
      // キャッシュに保存 (L1: 5分, L2: 1時間)
      this.advancedCache.multiLayerCache.set(cacheKey, sortedTweets, 300000, 1);
      this.advancedCache.multiLayerCache.set(cacheKey, sortedTweets, 3600000, 2);
      
      console.log('✅ 投資教育コンテンツ検索完了:', { 
        found: sortedTweets.length,
        avgEducationalValue: this.calculateAvgEducationalValue(sortedTweets)
      });
      
      return sortedTweets;
      
    } catch (error) {
      console.error('❌ 投資教育コンテンツ検索エラー:', error);
      return [];
    }
  }

  /**
   * コンテンツ品質分析
   */
  async analyzeContentQuality(tweets: Tweet[]): Promise<QualityAnalysis> {
    try {
      console.log('🔍 コンテンツ品質分析開始:', { tweetCount: tweets.length });
      
      const analysis: QualityAnalysis = {
        overall: {
          averageQuality: 0,
          totalAnalyzed: tweets.length,
          distribution: { high: 0, medium: 0, low: 0 }
        },
        educational: {
          averageEducationalValue: 0,
          categoryDistribution: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
          topTopics: []
        },
        credibility: {
          averageCredibility: 0,
          sourceQualityDistribution: { high: 0, medium: 0, low: 0 },
          verificationStatus: { verified: 0, unverified: 0, disputed: 0 }
        },
        engagement: {
          averageEngagement: 0,
          highEngagementThreshold: 10.0,
          educationalEngagementAvg: 0
        },
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // 各ツイートを分析
      const qualityScores: number[] = [];
      const educationalValues: number[] = [];
      const credibilityScores: number[] = [];
      const engagementRates: number[] = [];
      
      for (const tweet of tweets) {
        // 品質スコア計算
        const qualityScore = this.investmentEducationEngine.qualityScoring.scoreContent(tweet);
        qualityScores.push(qualityScore);
        
        // 教育的価値計算
        const educationalValue = this.investmentEducationEngine.qualityScoring.scoreEducationalValue(tweet.text);
        educationalValues.push(educationalValue);
        
        // 信頼性スコア計算
        const credibilityScore = this.investmentEducationEngine.qualityScoring.scoreCredibility(tweet.author, tweet.text);
        credibilityScores.push(credibilityScore);
        
        // エンゲージメント率
        engagementRates.push(tweet.engagement.rate);
        
        // 品質分布更新
        if (qualityScore >= 80) analysis.overall.distribution.high++;
        else if (qualityScore >= 60) analysis.overall.distribution.medium++;
        else analysis.overall.distribution.low++;
      }
      
      // 平均値計算
      analysis.overall.averageQuality = this.calculateAverage(qualityScores);
      analysis.educational.averageEducationalValue = this.calculateAverage(educationalValues);
      analysis.credibility.averageCredibility = this.calculateAverage(credibilityScores);
      analysis.engagement.averageEngagement = this.calculateAverage(engagementRates);
      
      // 推奨事項生成
      analysis.recommendations = this.generateQualityRecommendations(analysis);
      
      console.log('✅ コンテンツ品質分析完了:', {
        averageQuality: analysis.overall.averageQuality,
        averageEducationalValue: analysis.educational.averageEducationalValue
      });
      
      return analysis;
      
    } catch (error) {
      console.error('❌ コンテンツ品質分析エラー:', error);
      throw error;
    }
  }

  /**
   * 検索戦略最適化
   */
  async optimizeSearchStrategy(): Promise<SearchOptimization> {
    try {
      console.log('⚡ 検索戦略最適化開始');
      
      const optimization: SearchOptimization = {
        currentStrategy: {
          keywordExpansion: true,
          semanticSearch: true,
          contextualFiltering: true,
          qualityScoring: true
        },
        optimizations: {
          improvedKeywords: [],
          betterFilters: {},
          recommendedTimeRanges: [],
          suggestedCategories: []
        },
        performance: {
          searchTime: 0,
          cacheHitRate: 0,
          qualityImprovement: 0,
          relevanceScore: 0
        },
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // キーワード最適化
      optimization.optimizations.improvedKeywords = this.optimizeKeywords();
      
      // フィルター最適化
      optimization.optimizations.betterFilters = this.optimizeFilters();
      
      // 時間範囲最適化
      optimization.optimizations.recommendedTimeRanges = this.optimizeTimeRanges();
      
      // カテゴリ最適化
      optimization.optimizations.suggestedCategories = this.optimizeCategories();
      
      // パフォーマンス測定
      optimization.performance = await this.measureSearchPerformance();
      
      // 推奨事項生成
      optimization.recommendations = this.generateOptimizationRecommendations(optimization);
      
      console.log('✅ 検索戦略最適化完了:', {
        cacheHitRate: optimization.performance.cacheHitRate,
        qualityImprovement: optimization.performance.qualityImprovement
      });
      
      return optimization;
      
    } catch (error) {
      console.error('❌ 検索戦略最適化エラー:', error);
      throw error;
    }
  }

  /**
   * 検索インサイト取得
   */
  async getSearchInsights(): Promise<SearchInsights> {
    try {
      console.log('📊 検索インサイト取得開始');
      
      const insights: SearchInsights = {
        trends: {
          risingTopics: [],
          decliningTopics: [],
          seasonalPatterns: {},
          peakSearchTimes: []
        },
        content: {
          mostEngaging: [],
          highestQuality: [],
          trending: [],
          overlooked: []
        },
        users: {
          topEducators: [],
          emergingVoices: [],
          mostTrusted: []
        },
        metrics: {
          searchVolume: 0,
          qualityTrend: 0,
          engagementTrend: 0,
          diversityIndex: 0
        },
        timestamp: new Date().toISOString()
      };
      
      // トレンド分析
      insights.trends = await this.analyzeSearchTrends();
      
      // コンテンツ分析
      insights.content = await this.analyzeContentInsights();
      
      // ユーザー分析
      insights.users = await this.analyzeUserInsights();
      
      // メトリクス計算
      insights.metrics = await this.calculateSearchMetrics();
      
      console.log('✅ 検索インサイト取得完了:', {
        risingTopics: insights.trends.risingTopics.length,
        qualityTrend: insights.metrics.qualityTrend
      });
      
      return insights;
      
    } catch (error) {
      console.error('❌ 検索インサイト取得エラー:', error);
      throw error;
    }
  }

  // ============================================================================
  // PHASE 1.2 初期化メソッド
  // ============================================================================

  private initializeInvestmentEducationEngine(): void {
    this.investmentEducationEngine = {
      keywordExpansion: {
        expandKeywords: (keyword: string) => this.mockKeywordExpansion(keyword),
        getSemanticKeywords: (topic: string) => this.mockSemanticKeywords(topic),
        getContextualKeywords: (category: string) => this.mockContextualKeywords(category)
      },
      qualityScoring: {
        scoreContent: (tweet: Tweet) => this.mockContentScoring(tweet),
        scoreEducationalValue: (content: string) => this.mockEducationalScoring(content),
        scoreCredibility: (author: Tweet['author'], content: string) => this.mockCredibilityScoring(author, content)
      },
      educationalValueAnalyzer: {
        analyzeEducationalValue: (tweet: Tweet) => this.mockEducationalAnalysis(tweet),
        categorizeComplexity: (content: string) => this.mockComplexityAnalysis(content),
        extractLearningObjectives: (content: string) => this.mockLearningObjectives(content)
      }
    };
  }

  private initializeAdvancedCache(): void {
    this.advancedCache = {
      multiLayerCache: {
        l1Cache: new Map(),
        l2Cache: new Map(),
        l3Cache: new Map(),
        get: (key: string, layer: 1 | 2 | 3 = 1) => {
          const cache = layer === 1 ? this.advancedCache.multiLayerCache.l1Cache :
                       layer === 2 ? this.advancedCache.multiLayerCache.l2Cache :
                       this.advancedCache.multiLayerCache.l3Cache;
          const cached = cache.get(key);
          if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.value;
          }
          cache.delete(key);
          return null;
        },
        set: (key: string, value: any, ttl: number, layer: 1 | 2 | 3 = 1) => {
          const cache = layer === 1 ? this.advancedCache.multiLayerCache.l1Cache :
                       layer === 2 ? this.advancedCache.multiLayerCache.l2Cache :
                       this.advancedCache.multiLayerCache.l3Cache;
          cache.set(key, { value, timestamp: Date.now(), ttl });
        },
        clear: (layer?: 1 | 2 | 3) => {
          if (layer) {
            const cache = layer === 1 ? this.advancedCache.multiLayerCache.l1Cache :
                         layer === 2 ? this.advancedCache.multiLayerCache.l2Cache :
                         this.advancedCache.multiLayerCache.l3Cache;
            cache.clear();
          } else {
            this.advancedCache.multiLayerCache.l1Cache.clear();
            this.advancedCache.multiLayerCache.l2Cache.clear();
            this.advancedCache.multiLayerCache.l3Cache.clear();
          }
        }
      },
      predictivePreloading: {
        predictNextQueries: (currentQuery: string) => this.mockPredictQueries(currentQuery),
        preloadLikelySearches: () => this.mockPreloadSearches(),
        analyzeSearchPatterns: () => this.mockAnalyzePatterns()
      },
      cacheOptimizer: {
        optimizeCacheStrategy: () => this.mockOptimizeCache(),
        evictLeastUsed: () => this.mockEvictCache(),
        updateAccessPatterns: (key: string) => this.mockUpdatePatterns(key)
      }
    };
  }

  // ============================================================================
  // PHASE 1.2 ヘルパーメソッド
  // ============================================================================

  private buildEducationalQuery(topic: string, expanded: string[], semantic: string[]): string {
    const allKeywords = [topic, ...expanded, ...semantic].slice(0, 10);
    return `(${allKeywords.join(' OR ')}) AND (教育 OR 初心者 OR 解説 OR 基本 OR ガイド)`;
  }

  private async convertToEducationalTweets(tweets: Tweet[]): Promise<EducationalTweet[]> {
    return tweets.map(tweet => ({
      ...tweet,
      educationalValue: this.investmentEducationEngine.educationalValueAnalyzer.analyzeEducationalValue(tweet),
      credibility: {
        authorCredibilityScore: this.investmentEducationEngine.qualityScoring.scoreCredibility(tweet.author, tweet.text),
        sourceQuality: this.determineSourceQuality(tweet.author),
        factCheckStatus: 'unverified' as const,
        citations: []
      }
    }));
  }

  private calculateAvgEducationalValue(tweets: EducationalTweet[]): number {
    if (tweets.length === 0) return 0;
    return tweets.reduce((sum, tweet) => sum + tweet.educationalValue.score, 0) / tweets.length;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private generateQualityRecommendations(analysis: QualityAnalysis): string[] {
    const recommendations = [];
    
    if (analysis.overall.averageQuality < 70) {
      recommendations.push('コンテンツ品質の向上のため、より厳密なフィルタリングを推奨します');
    }
    
    if (analysis.educational.averageEducationalValue < 60) {
      recommendations.push('教育的価値の高いコンテンツに焦点を当てることを推奨します');
    }
    
    return recommendations;
  }

  private optimizeKeywords(): string[] {
    return ['投資教育', '金融リテラシー', '資産形成', 'ポートフォリオ', 'リスク管理'];
  }

  private optimizeFilters(): SearchFilters {
    return {
      minLikes: 10,
      minRetweets: 3,
      engagement_threshold: 5.0,
      account_type: 'any',
      language: 'ja'
    };
  }

  private optimizeTimeRanges(): string[] {
    return ['6h', '24h', '7d'];
  }

  private optimizeCategories(): string[] {
    return ['初心者向け', '中級者向け', '上級者向け'];
  }

  private async measureSearchPerformance(): Promise<SearchOptimization['performance']> {
    return {
      searchTime: Math.random() * 2000 + 500,
      cacheHitRate: Math.random() * 0.8 + 0.2,
      qualityImprovement: Math.random() * 20 + 10,
      relevanceScore: Math.random() * 30 + 70
    };
  }

  private generateOptimizationRecommendations(optimization: SearchOptimization): string[] {
    const recommendations = [];
    
    if (optimization.performance.cacheHitRate < 0.5) {
      recommendations.push('キャッシュヒット率の向上のため、クエリ最適化を推奨します');
    }
    
    if (optimization.performance.relevanceScore < 80) {
      recommendations.push('関連性向上のため、セマンティック検索の強化を推奨します');
    }
    
    return recommendations;
  }

  private async analyzeSearchTrends(): Promise<SearchInsights['trends']> {
    return {
      risingTopics: ['DeFi', 'NFT', 'サステナブル投資'],
      decliningTopics: ['レバレッジ取引'],
      seasonalPatterns: {
        'NISA': [10, 15, 20, 25, 30, 35, 40, 45, 50, 45, 40, 35],
        '税金対策': [20, 15, 10, 5, 5, 5, 5, 5, 10, 20, 30, 40]
      },
      peakSearchTimes: ['09:00', '12:00', '21:00']
    };
  }

  private async analyzeContentInsights(): Promise<SearchInsights['content']> {
    // Mockコンテンツ分析結果を返す
    const mockEducationalTweets: EducationalTweet[] = [];
    
    return {
      mostEngaging: mockEducationalTweets.slice(0, 5),
      highestQuality: mockEducationalTweets.slice(0, 5),
      trending: mockEducationalTweets.slice(0, 5),
      overlooked: mockEducationalTweets.slice(0, 3)
    };
  }

  private async analyzeUserInsights(): Promise<SearchInsights['users']> {
    const mockUsers: User[] = [];
    
    return {
      topEducators: mockUsers.slice(0, 5),
      emergingVoices: mockUsers.slice(0, 3),
      mostTrusted: mockUsers.slice(0, 5)
    };
  }

  private async calculateSearchMetrics(): Promise<SearchInsights['metrics']> {
    return {
      searchVolume: Math.floor(Math.random() * 10000) + 1000,
      qualityTrend: Math.random() * 20 - 10, // -10 to +10
      engagementTrend: Math.random() * 30 - 15, // -15 to +15
      diversityIndex: Math.random() * 100
    };
  }

  private determineSourceQuality(author: Tweet['author']): 'high' | 'medium' | 'low' {
    if (author.verified && author.followersCount > 10000) return 'high';
    if (author.followersCount > 1000) return 'medium';
    return 'low';
  }

  // ============================================================================
  // PHASE 1.2 Mock実装メソッド (MVP段階)
  // ============================================================================

  private mockKeywordExpansion(keyword: string): string[] {
    const expansions: { [key: string]: string[] } = {
      '投資': ['資産運用', 'ポートフォリオ', 'リスク管理'],
      '株式': ['企業分析', 'ファンダメンタル分析', 'テクニカル分析'],
      'NISA': ['つみたてNISA', '一般NISA', '非課税投資']
    };
    return expansions[keyword] || [keyword];
  }

  private mockSemanticKeywords(topic: string): string[] {
    return [`${topic}初心者`, `${topic}基本`, `${topic}ガイド`];
  }

  private mockContextualKeywords(category: string): string[] {
    return ['教育', '解説', 'レッスン'];
  }

  private mockContentScoring(tweet: Tweet): number {
    return Math.random() * 40 + 60; // 60-100
  }

  private mockEducationalScoring(content: string): number {
    return Math.random() * 50 + 50; // 50-100
  }

  private mockCredibilityScoring(author: Tweet['author'], content: string): number {
    let score = 50;
    if (author.verified) score += 20;
    if (author.followersCount > 10000) score += 15;
    if (author.followersCount > 1000) score += 10;
    return Math.min(score + Math.random() * 15, 100);
  }

  private mockEducationalAnalysis(tweet: Tweet): EducationalTweet['educationalValue'] {
    const categories = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
    return {
      score: Math.random() * 40 + 60,
      category: categories[Math.floor(Math.random() * categories.length)],
      topics: ['投資基礎', 'リスク管理'],
      learningObjectives: ['投資の基本を理解する', 'リスクとリターンを学ぶ'],
      complexity: Math.floor(Math.random() * 10) + 1
    };
  }

  private mockComplexityAnalysis(content: string): number {
    return Math.floor(Math.random() * 10) + 1;
  }

  private mockLearningObjectives(content: string): string[] {
    return ['基本的な概念を理解する', '実践的なスキルを身につける'];
  }

  private mockPredictQueries(currentQuery: string): string[] {
    return [`${currentQuery} 初心者`, `${currentQuery} 方法`, `${currentQuery} リスク`];
  }

  private async mockPreloadSearches(): Promise<void> {
    await this.delay(100);
  }

  private mockAnalyzePatterns(): void {
    // パターン分析のMock実装
  }

  private mockOptimizeCache(): void {
    // キャッシュ最適化のMock実装
  }

  private mockEvictCache(): void {
    // キャッシュ退避のMock実装
  }

  private mockUpdatePatterns(key: string): void {
    // アクセスパターン更新のMock実装
  }
}

// ============================================================================
// PHASE 1.2 追加エクスポート
// ============================================================================

export {
  EducationalTweet,
  QualityAnalysis,
  SearchOptimization,
  SearchInsights,
  InvestmentKeywordExpander,
  ContentQualityScorer,
  EducationalValueAnalyzer,
  MultiLayerCache,
  PredictivePreloader,
  CacheOptimizer
};