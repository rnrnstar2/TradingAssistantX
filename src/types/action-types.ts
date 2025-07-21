import { Tweet } from './index';

export type ActionType = 'original_post';

export interface ActionDecision {
  id: string;
  type: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  params: ActionParams;
  targetTweet?: Tweet;  // 引用・RT・リプライ対象
  content?: string;     // オリジナル投稿・引用コメント用
  estimatedDuration: number;
}

export interface ActionParams {
  // オリジナル投稿用
  originalContent: string;  // Required to fix undefined errors
  hashtags?: string[];
  contentType?: string;  // 投稿のコンテンツタイプ（例：educational, engaging, beginner_friendly）
  
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