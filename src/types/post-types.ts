/**
 * MVP Post Types - Data Structure Simplification
 * 
 * Essential post-related types for TradingAssistantX MVP functionality
 * Simplified to basic posting requirements only
 */

// ============================================================================
// MVP POST TYPES
// ============================================================================

/**
 * Basic post data structure for MVP (with backward compatibility)
 */
export interface PostData {
  content: string;
  timestamp: Date | string;
  followerCount: number;
  
  // Backward compatibility properties
  id?: string;
  success?: boolean;
  createdAt?: string;
  successRate?: number;
  success_rate?: number;
  engagementRate?: number;
  engagement_rate?: number;
  effectiveness?: number;
  effectiveness_score?: number;
  seasonal?: boolean;
  is_seasonal?: boolean;
  executionTime?: number;
  
  // Engagement metrics
  engagementMetrics?: {
    likes: number;
    retweets: number;
    replies: number;
    engagement_rate: number;
  };
  engagement?: {
    likes: number;
    retweets: number;
    replies: number;
  };
  
  // Metadata
  metadata?: {
    topic?: string;
    category?: string;
    quality_score?: number;
    source?: string;
    hashtags?: string[];
  };
}

// ============================================================================
// ESSENTIAL SUPPORT TYPES
// ============================================================================

/**
 * Simple engagement metrics
 */
export interface EngagementData {
  post_id: string;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: string;
}

/**
 * Basic topic tracking
 */
export interface TopicData {
  topic: string;
  count: number;
  engagement_rate: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPostData(obj: any): obj is PostData {
  return obj && 
         typeof obj.content === 'string' &&
         obj.timestamp instanceof Date &&
         typeof obj.followerCount === 'number';
}

export function isEngagementData(obj: any): obj is EngagementData {
  return obj && 
         typeof obj.post_id === 'string' &&
         typeof obj.likes === 'number' &&
         typeof obj.retweets === 'number' &&
         typeof obj.replies === 'number' &&
         typeof obj.timestamp === 'string';
}