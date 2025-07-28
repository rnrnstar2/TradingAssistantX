// ============================================================================
// KAITO API UNIFIED EXPORTS
// ============================================================================

// Core exports
export { KaitoApiClient, KaitoTwitterAPIClient } from './core/client';
export { KaitoAPIConfigManager } from './core/config';
export { AuthManager } from './core/auth-manager';

// Type exports
export type {
  AccountInfo,
  PostResult,
  CoreRetweetResult,
  QuoteTweetResult,
  LikeResult,
  KaitoClientConfig,
  KaitoAPIConfig,
  RateLimitStatus,
  RateLimitInfo,
  CostTrackingInfo,
  LoginCredentials,
  LoginResult,
  AuthStatus
} from './types';

// Endpoint exports
export { ActionEndpoints } from './endpoints/action-endpoints';
export { TweetEndpoints } from './endpoints/tweet-endpoints';
export { UserEndpoints } from './endpoints/user-endpoints';
export { TrendEndpoints } from './endpoints/trend-endpoints';
// Removed MVP non-compliant endpoints:
// export { CommunityEndpoints } from './endpoints/community-endpoints';
// export { ListEndpoints } from './endpoints/list-endpoints';
// export { LoginEndpoints } from './endpoints/login-endpoints';
// export { WebhookEndpoints } from './endpoints/webhook-endpoints';

// Utility exports
export { ResponseHandler } from './utils/response-handler';