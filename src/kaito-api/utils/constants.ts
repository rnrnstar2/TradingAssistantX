// ============================================================================
// KaitoTwitterAPI 定数定義
// ============================================================================

// API URLs
export const KAITO_API_BASE_URL = 'https://api.twitterapi.io';

export const API_ENDPOINTS = {
  // Read-only endpoints
  userInfo: '/twitter/user/info',
  tweetSearch: '/twitter/tweet/advanced_search',
  trends: '/twitter/trends',
  followerInfo: '/twitter/user/followers',
  
  // Authenticated endpoints (V2)
  createTweet: '/twitter/create_tweet_v2',
  deleteTweet: '/twitter/delete_tweet',
  likeTweet: '/twitter/like_tweet',
  unlikeTweet: '/twitter/unlike_tweet',
  retweet: '/twitter/retweet_tweet',
  unretweet: '/twitter/unretweet_tweet',
  followUser: '/twitter/follow_user',
  unfollowUser: '/twitter/unfollow_user',
  
  // Auth endpoints
  userLoginV2: '/twitter/user_login_v2'
} as const;

// Rate limits
export const RATE_LIMITS = {
  general: { limit: 900, window: 3600 },    // 900/hour
  posting: { limit: 300, window: 3600 },    // 300/hour
  search: { limit: 500, window: 3600 },     // 500/hour
  engagement: { limit: 500, window: 3600 }  // 500/hour
} as const;

// Cost tracking
export const COST_PER_REQUEST = {
  tweet: 0.00015,  // $0.15/1k tweets
  search: 0.00015,
  user: 0.00015,
  engagement: 0.00015
} as const;

export const COST_ALERT_THRESHOLD = 8.0; // $8 alert threshold

// Timeouts and retries
export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

// Validation limits
export const TWEET_MAX_LENGTH = 280;
export const SEARCH_MAX_RESULTS = 100;