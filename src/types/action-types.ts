import { Tweet } from './index';

export type ActionType = 
  | 'original_post'      // オリジナル投稿
  | 'quote_tweet'        // 引用ツイート
  | 'retweet'           // リツイート
  | 'reply'             // リプライ
  | 'thread_post';      // スレッド投稿

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
  originalContent?: string;
  hashtags?: string[];
  
  // 引用ツイート用
  quotedTweetId?: string;
  quoteComment?: string;
  
  // リツイート用
  retweetId?: string;
  addComment?: boolean;
  
  // リプライ用
  replyToTweetId?: string;
  replyContent?: string;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  type: ActionType;
  timestamp: number;
  error?: string;
}

export interface PostResult extends ActionResult {
  type: 'original_post';
  tweetId?: string;
  content?: string;
}

export interface QuoteResult extends ActionResult {
  type: 'quote_tweet';
  tweetId?: string;
  originalTweetId: string;
  comment: string;
}

export interface RetweetResult extends ActionResult {
  type: 'retweet';
  originalTweetId: string;
}

export interface ReplyResult extends ActionResult {
  type: 'reply';
  tweetId?: string;
  originalTweetId: string;
  content: string;
}

export interface ActionDistribution {
  remaining: number;
  optimal_distribution: {
    original_post: number;
    quote_tweet: number;
    retweet: number;
    reply: number;
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
    quote_tweet: number;
    retweet: number;
    reply: number;
  };
  executedActions: ActionResult[];
  targetReached: boolean;
}