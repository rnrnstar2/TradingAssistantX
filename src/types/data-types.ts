// MVP Data Types - Minimal definitions for runtime compatibility

export interface BaseMetadata {
  timestamp: string;
  source: string;
  category?: string;
  priority?: number;
  tags?: string[];
  count?: number;
  error?: string;
  processingTime?: number;
  sourceType?: string;
  config?: any;
}

export interface CollectionResult {
  id: string;
  content: any;
  source: string;
  timestamp: number;
  success: boolean;
  message: string;
  metadata: BaseMetadata;
  data?: any;
}

export interface BaseCollectionResult {
  id: string;
  content: any;
  source: string;
  timestamp: number;
  success: boolean;
  data: any[];
  metadata: BaseMetadata;
}

export interface DataItem {
  id: string;
  content: string;
  timestamp: string;
  source: string;
}

export interface PostData {
  content: string;
  timestamp: string;
  followerCount: number;
}

export interface EngagementMetrics {
  likes: number;
  retweets: number;
  replies: number;
  tweetId?: string;
  engagementRate?: number;
}

export interface MarketCondition {
  trend: string;
  volatility: number;
  sentiment: string;
}

export interface LegacyCollectionResult extends CollectionResult {
  type: string;
  data: any;
  error?: string;
}

export function createCollectionResult(
  success: boolean, 
  message: string, 
  metadata: BaseMetadata,
  id?: string,
  content?: any,
  source?: string,
  timestamp?: number
): CollectionResult {
  return { 
    id: id || Date.now().toString(),
    content: content || {},
    source: source || metadata.source,
    timestamp: timestamp || Date.now(),
    success, 
    message, 
    metadata 
  };
}

export function toLegacyResult(result: CollectionResult): LegacyCollectionResult {
  return {
    ...result,
    type: 'legacy',
    data: result.content
  };
}