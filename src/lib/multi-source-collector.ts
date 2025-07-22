import { RSSCollector } from './sources/rss-collector.js';
import { APICollector } from './sources/api-collector.js';
import { CommunityCollector } from './sources/community-collector.js';
import { 
  MultiSourceCollector as IMultiSourceCollector,
  MultiSourceConfig,
  MultiSourceResult,
  CollectionResult,
  SourceType,
  CollectionStrategy,
  MultiSourcePerformanceMetrics,
  CacheEntry,
  CollectionError
} from '../types/multi-source.js';

export class MultiSourceCollector implements IMultiSourceCollector {
  private rssCollector: RSSCollector;
  private apiCollector: APICollector;
  private communityCollector: CommunityCollector;
  
  private cache: Map<string, CacheEntry> = new Map();
  private performanceMetrics: MultiSourcePerformanceMetrics;
  private lastCleanup: number = Date.now();

  constructor(private config: MultiSourceConfig) {
    this.rssCollector = new RSSCollector(config.rss);
    this.apiCollector = new APICollector(config.api);
    this.communityCollector = new CommunityCollector(config.community);
    
    this.performanceMetrics = this.initializeMetrics();
    
    // Start periodic cache cleanup
    if (config.cache.enabled) {
      this.startCacheCleanup();
    }
  }

  async executeMultiSourceCollection(strategy?: CollectionStrategy): Promise<MultiSourceResult[]> {
    const startTime = Date.now();
    const defaultStrategy: CollectionStrategy = {
      name: 'default',
      sources: ['rss', 'api', 'community'],
      maxConcurrency: 3,
      timeout: 90000,
      failureThreshold: 0.5, // Allow up to 50% failures
      fallbackSources: ['rss'] // Fallback to RSS if others fail
    };

    const activeStrategy = strategy || defaultStrategy;
    const results: MultiSourceResult[] = [];
    const errors: Error[] = [];

    try {
      // Execute sources based on strategy
      const promises = activeStrategy.sources.map(async (sourceType) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), activeStrategy.timeout);

          let result: MultiSourceResult;
          switch (sourceType) {
            case 'rss':
              result = await this.collectFromRSS();
              break;
            case 'api':
              result = await this.collectFromAPIs();
              break;
            case 'community':
              result = await this.collectFromCommunity();
              break;
            default:
              throw new Error(`Unknown source type: ${sourceType}`);
          }

          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          console.error(`Error collecting from ${sourceType}:`, error);
          throw error;
        }
      });

      // Wait for all sources with proper error handling
      const settledPromises = await Promise.allSettled(promises);
      
      settledPromises.forEach((promise, index) => {
        if (promise.status === 'fulfilled') {
          results.push(promise.value);
          this.updateMultiSourcePerformanceMetrics(true, Date.now() - startTime);
        } else {
          errors.push(promise.reason);
          this.updateMultiSourcePerformanceMetrics(false, Date.now() - startTime);
        }
      });

      // Check failure threshold
      const successRate = results.length / activeStrategy.sources.length;
      if (successRate < (1 - activeStrategy.failureThreshold)) {
        console.warn(`Low success rate (${(successRate * 100).toFixed(1)}%), attempting fallback...`);
        
        // Try fallback sources
        if (activeStrategy.fallbackSources) {
          for (const fallbackSource of activeStrategy.fallbackSources) {
            if (!activeStrategy.sources.includes(fallbackSource)) {
              try {
                const fallbackResult = await this.collectFromSource(fallbackSource);
                results.push(fallbackResult);
                break; // Only need one successful fallback
              } catch (error) {
                console.error(`Fallback source ${fallbackSource} also failed:`, error);
              }
            }
          }
        }
      }

      // Merge and deduplicate results
      const mergedResults = this.mergeAndDeduplicateResults(results);
      
      return mergedResults;

    } catch (error) {
      console.error('Multi-source collection failed:', error);
      throw error;
    }
  }

  async collectFromRSS(sources?: string[]): Promise<MultiSourceResult> {
    const cacheKey = `rss:${sources?.join(',') || 'all'}`;
    
    if (this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.createCachedResult('rss', cached);
      }
    }

    try {
      const result = await this.rssCollector.collectFromRSS(sources);
      
      if (this.config.cache.enabled && result.data.length > 0) {
        this.storeInCache(cacheKey, result, 'rss');
      }

      return result;
    } catch (error) {
      console.error('RSS collection failed:', error);
      throw new Error(`RSS collection failed: ${error}`);
    }
  }

  async collectFromAPIs(config?: any): Promise<MultiSourceResult> {
    const cacheKey = `api:${JSON.stringify(config) || 'default'}`;
    
    if (this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.createCachedResult('api', cached);
      }
    }

    try {
      const result = await this.apiCollector.collectFromAPIs(config);
      
      if (this.config.cache.enabled && result.data.length > 0) {
        this.storeInCache(cacheKey, result, 'api');
      }

      return result;
    } catch (error) {
      console.error('API collection failed:', error);
      throw new Error(`API collection failed: ${error}`);
    }
  }

  async collectFromCommunity(platforms?: string[]): Promise<MultiSourceResult> {
    const cacheKey = `community:${platforms?.join(',') || 'all'}`;
    
    if (this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.createCachedResult('community', cached);
      }
    }

    try {
      const result = await this.communityCollector.collectFromCommunity(platforms);
      
      if (this.config.cache.enabled && result.data.length > 0) {
        this.storeInCache(cacheKey, result, 'community');
      }

      return result;
    } catch (error) {
      console.error('Community collection failed:', error);
      throw new Error(`Community collection failed: ${error}`);
    }
  }

  private async collectFromSource(sourceType: SourceType): Promise<MultiSourceResult> {
    switch (sourceType) {
      case 'rss':
        return await this.collectFromRSS();
      case 'api':
        return await this.collectFromAPIs();
      case 'community':
        return await this.collectFromCommunity();
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  private mergeAndDeduplicateResults(results: MultiSourceResult[]): MultiSourceResult[] {
    if (results.length === 0) return [];

    // Collect all unique results
    const allResults: CollectionResult[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    results.forEach(result => {
      result.data.forEach(item => {
        // Check for duplicates by ID first, then by title similarity
        if (seenIds.has(item.id)) return;
        
        const normalizedTitle = item.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) return;
        
        // Check for similar titles (simple similarity check)
        const isSimilar = Array.from(seenTitles).some(existingTitle => {
          const similarity = this.calculateStringSimilarity(normalizedTitle, existingTitle);
          return similarity > 0.8; // 80% similarity threshold
        });
        
        if (!isSimilar) {
          seenIds.add(item.id);
          seenTitles.add(normalizedTitle);
          allResults.push(item);
        }
      });
    });

    // Sort by relevance score and timestamp
    const sortedResults = allResults.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.timestamp - a.timestamp;
    });

    // Group results by source type
    const groupedResults: MultiSourceResult[] = [];
    const sourceGroups = new Map<SourceType, CollectionResult[]>();

    sortedResults.forEach(item => {
      // Determine source type based on the collector
      let sourceType: SourceType;
      if (item.provider === 'reddit' || item.provider === 'hackernews') {
        sourceType = 'community';
      } else if (['yahoo_finance', 'bloomberg', 'nikkei'].includes(item.provider)) {
        sourceType = 'rss';
      } else {
        sourceType = 'api';
      }

      if (!sourceGroups.has(sourceType)) {
        sourceGroups.set(sourceType, []);
      }
      sourceGroups.get(sourceType)!.push(item);
    });

    // Create consolidated results per source type
    sourceGroups.forEach((items, sourceType) => {
      groupedResults.push({
        source: sourceType,
        provider: 'consolidated',
        data: items,
        timestamp: Date.now(),
        metadata: {
          requestCount: items.length,
          cacheUsed: false,
          responseTime: 0
        }
      });
    });

    return groupedResults;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for title comparison
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Cache Management
  private getFromCache(key: string): CollectionResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.performanceMetrics.cacheHitRate = 
      (this.performanceMetrics.cacheHitRate * 0.9) + (1 * 0.1);

    return entry.data as CollectionResult[];
  }

  private storeInCache(key: string, result: MultiSourceResult, sourceType: SourceType): void {
    if (this.cache.size >= this.config.cache.maxEntries) {
      this.cleanupCache();
    }

    const entry: CacheEntry = {
      key,
      data: result.data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (this.config.cache.ttl * 1000),
      source: sourceType,
      provider: result.provider
    };

    this.cache.set(key, entry);
  }

  private createCachedResult(sourceType: SourceType, data: CollectionResult[]): MultiSourceResult {
    return {
      source: sourceType,
      provider: 'cached',
      data,
      timestamp: Date.now(),
      metadata: {
        requestCount: 0,
        cacheUsed: true,
        responseTime: 0
      }
    };
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still over limit, remove oldest entries
    if (this.cache.size >= this.config.cache.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.config.cache.maxEntries + 10);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, this.config.cache.cleanupInterval * 1000);
  }

  // Performance Metrics
  private initializeMetrics(): MultiSourcePerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      timestamp: Date.now()
    };
  }

  private updateMultiSourcePerformanceMetrics(success: boolean, responseTime: number): void {
    this.performanceMetrics.totalRequests++;
    
    if (success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }

    // Update average response time using exponential moving average
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * 0.8) + (responseTime * 0.2);
  }

  // Public Methods
  public getMultiSourcePerformanceMetrics(): MultiSourcePerformanceMetrics {
    return { ...this.performanceMetrics, timestamp: Date.now() };
  }

  public clearAllCaches(): void {
    this.cache.clear();
    this.rssCollector.clearCache();
    this.apiCollector.clearCache();
    this.communityCollector.clearCache();
  }

  public getRequestStats(): Record<string, any> {
    return {
      rss: this.rssCollector.getRequestStats(),
      api: this.apiCollector.getRequestStats(),
      community: this.communityCollector.getRequestStats(),
      cache: {
        size: this.cache.size,
        hitRate: this.performanceMetrics.cacheHitRate
      }
    };
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    sources: Record<SourceType, 'available' | 'unavailable'>;
    cache: { enabled: boolean; size: number };
    performance: MultiSourcePerformanceMetrics;
  }> {
    const sourceStatus: Record<SourceType, 'available' | 'unavailable'> = {
      rss: 'unavailable',
      api: 'unavailable',
      community: 'unavailable'
    };

    // Quick health check for each source
    try {
      const testResults = await Promise.allSettled([
        this.collectFromRSS([]).then(() => 'available').catch(() => 'unavailable'),
        this.collectFromAPIs().then(() => 'available').catch(() => 'unavailable'),
        this.collectFromCommunity([]).then(() => 'available').catch(() => 'unavailable')
      ]);

      sourceStatus.rss = testResults[0].status === 'fulfilled' ? testResults[0].value as any : 'unavailable';
      sourceStatus.api = testResults[1].status === 'fulfilled' ? testResults[1].value as any : 'unavailable';
      sourceStatus.community = testResults[2].status === 'fulfilled' ? testResults[2].value as any : 'unavailable';
    } catch (error) {
      console.error('Health check failed:', error);
    }

    const availableCount = Object.values(sourceStatus).filter(s => s === 'available').length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (availableCount === 3) status = 'healthy';
    else if (availableCount >= 1) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      sources: sourceStatus,
      cache: {
        enabled: this.config.cache.enabled,
        size: this.cache.size
      },
      performance: this.getMultiSourcePerformanceMetrics()
    };
  }

  // Static factory method
  public static createWithDefaultConfig(): MultiSourceCollector {
    const defaultConfig: MultiSourceConfig = {
      rss: {
        sources: RSSCollector.getDefaultSources(),
        timeout: 10000,
        maxConcurrency: 5,
        cacheTimeout: 300 // 5 minutes
      },
      api: {
        sources: APICollector.getDefaultSources(),
        timeout: 15000,
        maxConcurrency: 3,
        cacheTimeout: 600, // 10 minutes
        retryAttempts: 2
      },
      community: {
        sources: CommunityCollector.getDefaultSources(),
        timeout: 20000,
        maxConcurrency: 2,
        cacheTimeout: 300, // 5 minutes
        qualityFilters: {
          minScore: 10,
          minComments: 5,
          maxAge: 24, // 24 hours
          bannedKeywords: ['spam', 'scam', 'pump and dump'],
          requiredKeywords: []
        }
      },
      cache: {
        enabled: true,
        ttl: 300, // 5 minutes
        maxEntries: 1000,
        cleanupInterval: 300 // 5 minutes
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 60 // 1 minute
      }
    };

    return new MultiSourceCollector(defaultConfig);
  }
}