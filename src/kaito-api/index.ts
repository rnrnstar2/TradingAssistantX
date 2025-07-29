// ============================================================================
// KAITO API UNIFIED EXPORTS - V2 Standard Architecture
// ============================================================================

// Core exports
export { 
  KaitoApiClient, 
  KaitoTwitterAPIClient 
} from './core/client';
export { KaitoAPIConfigManager } from './core/config';
export { AuthManager } from './core/auth-manager';

// Type exports (from utils)
export type {
  // Common types
  HttpClient,
  RateLimitInfo,
  CostTrackingInfo,
  KaitoClientConfig,
  KaitoAPIConfig,
  
  // Auth types
  LoginCredentials,
  LoginResult,
  AuthStatus,
  
  // Read-only types
  UserInfoRequest,
  UserInfoResponse,
  SearchRequest,
  SearchResponse,
  TrendsResponse,
  FollowerInfoResponse,
  
  // Authenticated types
  PostRequest,
  PostResponse,
  EngagementRequest,
  EngagementResponse,
  FollowRequest,
  FollowResponse,
  
  // Response types
  TwitterAPIResponse,
  ErrorResponse
} from './utils/types';

// Endpoint exports (structured)
export * as readOnly from './endpoints/read-only';
export * as authenticated from './endpoints/authenticated';

// Utility exports
export { ResponseHandler } from './utils/response-handler';
export * as constants from './utils/constants';
export * as errors from './utils/errors';

// Re-export for backward compatibility (optional)
export { 
  KAITO_API_BASE_URL,
  API_ENDPOINTS,
  RATE_LIMITS 
} from './utils/constants';