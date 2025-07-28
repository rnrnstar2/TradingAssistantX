import { Tweet } from './index';

export type ActionType = 
  | 'original_post'
  | 'content_creation'    // 追加
  | 'post_creation'       // 追加  
  | 'immediate_post'      // 追加
  | 'urgent_post'         // 追加
  | 'analysis'            // 追加
  | 'performance_analysis'// 追加
  | 'reply'
  | 'retweet'
  | 'quote_tweet';

// アクション分類別の型定義
export type ContentActionType = 'original_post' | 'content_creation' | 'post_creation';
export type UrgentActionType = 'immediate_post' | 'urgent_post';  
export type AnalysisActionType = 'analysis' | 'performance_analysis';

export interface ActionDecision {
  id: string;
  type: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  description: string;        // 必須プロパティ追加 - TS2339エラー解決のため
  params: ActionParams;
  targetTweet?: Tweet;  // 引用・RT・リプライ対象
  content?: string;     // オリジナル投稿・引用コメント用
  estimatedDuration: number;
  timestamp?: string;         // オプション追加
  metadata?: ActionMetadata;  // オプション追加
}

// ActionDecision用のメタデータインターフェース
export interface ActionMetadata {
  category: string;
  tags: string[];
  enhancedWithSpecificCollection?: boolean;
  collectionSufficiency?: number;
  collectionQuality?: number;
  enhancementTimestamp?: number;
  [key: string]: any;
}

export interface ActionParams {
  // オリジナル投稿用
  originalContent: string;  // Required to fix undefined errors
  hashtags?: string[];
  contentType?: string;  // 投稿のコンテンツタイプ（例：educational, engaging, beginner_friendly）
  
  // 引用ツイート用
  quoteContent?: string;    // 引用ツイート時のコメント内容
  
  // リプライ用
  replyContent?: string;    // リプライ時の返信内容
  
  // 共通フィールド
  riskLevel?: string;       // リスクレベル（low, medium, high）
  timeOfDay?: number;       // 投稿時刻（時間）
  dateGenerated?: string;   // 生成日
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  type: ActionType;
  timestamp: number;
  content?: string;  // 投稿内容（オプショナル）
  error?: string;
}

export interface PostResult extends ActionResult {
  type: 'original_post';
  tweetId?: string;
  content?: string;
}


export interface ActionDistribution {
  remaining: number;
  optimal_distribution: {
    original_post: number;
    quote_tweet?: number;
    retweet?: number;
    reply?: number;
  };
  timing_recommendations: TimingRecommendation[];
}

export interface TimingRecommendation {
  time: string;
  actionType: ActionType;
  priority: number;
  reasoning: string;
}

export interface DailyActionLog {
  date: string;
  totalActions: number;
  actionBreakdown: {
    original_post: number;
  };
  executedActions: ActionResult[];
  targetReached: boolean;
}