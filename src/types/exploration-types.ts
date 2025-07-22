export enum CollectionMethod {
  SIMPLE_HTTP = 'simple_http',
  PLAYWRIGHT_LIGHT = 'playwright',
  API_DIRECT = 'api_direct'
}

export interface ExplorationScore {
  relevanceScore: number;
  noveltyScore: number;
  depthValue: number;
  urgencyScore: number;
}

export interface ParsedLink {
  url: string;
  text: string;
  title?: string;
  description?: string;
}

export interface EvaluatedLink extends ParsedLink {
  score: ExplorationScore;
  priority: number;
}

export interface RankedLink extends EvaluatedLink {
  rank: number;
}

export interface MarketDataPoint {
  symbol: string;
  value: number;
  change?: number;
  timestamp: Date;
}

export interface EconomicEvent {
  name: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
  forecast?: string;
  actual?: string;
  previous?: string;
  timestamp: Date;
}

export interface ExpertComment {
  author: string;
  role?: string;
  comment: string;
  timestamp: Date;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface FXContentResult {
  title: string;
  summary: string;
  keyPoints: string[];
  marketData?: MarketDataPoint[];
  economicIndicators?: EconomicEvent[];
  expertOpinions?: ExpertComment[];
  publishedAt?: Date;
  confidence: number;
}

export interface QualityMetrics {
  readability: number;
  informativeness: number;
  recency: number;
  authorCredibility: number;
  sourceReliability: number;
  overallScore: number;
}

export interface PostingValueScore {
  engagementPotential: number;
  educationalValue: number;
  timelinessScore: number;
  uniquenessScore: number;
  overallValue: number;
}

export interface ContentResult {
  url: string;
  depth: number;
  content: FXContentResult;
  collectionMethod: CollectionMethod;
  explorationPath: string[];
  qualityMetrics: QualityMetrics;
  postingValue: PostingValueScore;
}

export interface ExplorationStats {
  totalRequestsMade: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalBytesDownloaded: number;
  memoryUsage: number;
}

export interface ExplorationResult {
  seedUrl: string;
  totalLinksDiscovered: number;
  exploredLinks: number;
  contentResults: ContentResult[];
  executionTime: number;
  explorationStats: ExplorationStats;
  errors: string[];
}

export interface ExplorationConfig {
  maxRetries: number;
  requestTimeout: number;
  respectRobotsTxt: boolean;
  delayBetweenRequests: number;
  maxConcurrentRequests: number;
  userAgent: string;
  maxDepth: number;
  maxExplorationTime: number;
  minContentResults: number;
  minRelevanceScore: number;
}

export interface ExplorationSeed {
  url: string;
  depth: number;
  interestKeywords: string[];
}

export interface SiteProfile {
  usesDynamicContent: boolean;
  hasApiAccess: boolean;
  rateLimitStrict: boolean;
  requiresJavaScript: boolean;
  robotsTxtUrl?: string;
}

export interface LinkInterestPatterns {
  highValue: RegExp[];
  continueExploration: RegExp[];
  exclude: RegExp[];
}

export const DEFAULT_EXPLORATION_CONFIG: ExplorationConfig = {
  maxRetries: 3,
  requestTimeout: 10000,
  respectRobotsTxt: true,
  delayBetweenRequests: 2000,
  maxConcurrentRequests: 3,
  userAgent: 'TradingAssistantX/1.0 FX Information Collector',
  maxDepth: 3,
  maxExplorationTime: 30000,
  minContentResults: 5,
  minRelevanceScore: 70
};

export const EXPLORATION_SEEDS: Record<string, ExplorationSeed> = {
  minkabu: {
    url: 'https://fx.minkabu.jp/news',
    depth: 3,
    interestKeywords: ['市場分析', '経済指標', '中央銀行', '要人発言']
  },
  zai: {
    url: 'https://zai.diamond.jp/fx/news',
    depth: 2,
    interestKeywords: ['今日の為替', '市況レポート', '専門家コメント']
  },
  reuters: {
    url: 'https://jp.reuters.com/news/archive/jp-markets-news',
    depth: 2,
    interestKeywords: ['為替', '日銀', 'FRB', 'ECB', '市場見通し']
  }
};

export const LINK_INTEREST_PATTERNS: LinkInterestPatterns = {
  highValue: [
    /今日の.*為替/,
    /市場.*見通し/,
    /経済指標.*結果/,
    /中央銀行.*発表/,
    /ドル円.*分析/,
    /FOMC.*決定/
  ],
  continueExploration: [
    /詳細.*記事/,
    /続き.*読む/,
    /分析.*レポート/,
    /専門家.*コメント/
  ],
  exclude: [
    /広告/,
    /PR記事/,
    /口座開設/,
    /キャンペーン/
  ]
};