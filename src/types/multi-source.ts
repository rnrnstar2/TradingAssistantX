// Multi-Source Data Collection Types

export type SourceType = 'rss' | 'api' | 'community';
export type DataProvider = 
  | 'yahoo_finance'
  | 'reuters' 
  | 'bloomberg'
  | 'nikkei'
  | 'alpha_vantage'
  | 'iex_cloud'
  | 'coingecko'
  | 'fred'
  | 'reddit'
  | 'hackernews';

export interface CollectionResult {
  id: string;
  title: string;
  content: string;
  url: string;
  timestamp: number;
  source: string;
  provider: DataProvider;
  relevanceScore?: number;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MultiSourceResult {
  source: SourceType;
  provider: string;
  data: CollectionResult[];
  timestamp: number;
  metadata: {
    requestCount: number;
    rateLimitRemaining?: number;
    cacheUsed: boolean;
    responseTime?: number;
    errorCount?: number;
  };
  errors?: Error[];
}

export interface MultiSourceCollector {
  collectFromRSS(sources: string[]): Promise<MultiSourceResult>;
  collectFromAPIs(config: APIConfig): Promise<MultiSourceResult>;
  collectFromCommunity(platforms: string[]): Promise<MultiSourceResult>;
  executeMultiSourceCollection(): Promise<MultiSourceResult[]>;
}

// RSS Configuration
export interface RSSSource {
  name: string;
  url: string;
  provider: DataProvider;
  enabled: boolean;
  timeout?: number;
  maxItems?: number;
  categories?: string[];
}

export interface RSSConfig {
  sources: RSSSource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
}

// API Configuration
export interface APISource {
  name: string;
  provider: DataProvider;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  rateLimitPerMinute?: number;
  timeout?: number;
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  params?: Record<string, any>;
  headers?: Record<string, string>;
  rateLimit?: number;
}

export interface APIConfig {
  sources: APISource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
  retryAttempts: number;
}

// Community Data Configuration
export interface CommunitySource {
  name: string;
  provider: DataProvider;
  enabled: boolean;
  subreddit?: string;
  category?: string;
  sortBy?: string;
  timeWindow?: string;
  maxPosts?: number;
  minScore?: number;
}

export interface CommunityConfig {
  sources: CommunitySource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
  qualityFilters: QualityFilters;
}

export interface QualityFilters {
  minScore: number;
  minComments: number;
  maxAge: number; // hours
  bannedKeywords: string[];
  requiredKeywords?: string[];
}

// Cache Configuration
export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  source: SourceType;
  provider: string;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxEntries: number;
  cleanupInterval: number;
}

// Error Handling
export interface CollectionError {
  source: SourceType;
  provider: string;
  message: string;
  timestamp: number;
  url?: string;
  statusCode?: number;
  retryable: boolean;
}

// Performance Monitoring
export interface MultiSourceMultiSourcePerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  rateLimitHits: number;
  timestamp: number;
}

// Main Configuration
export interface MultiSourceConfig {
  rss: RSSConfig;
  api: APIConfig;
  community: CommunityConfig;
  cache: CacheConfig;
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
  };
}

// Collection Strategy
export interface CollectionStrategy {
  name: string;
  sources: SourceType[];
  maxConcurrency: number;
  timeout: number;
  failureThreshold: number;
  fallbackSources?: SourceType[];
}