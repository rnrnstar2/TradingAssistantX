# TASK-004: Utilsディレクトリ補完

## 概要
kaito-api/utils/ディレクトリに仕様書（docs/kaito-api.md）で指定されている不足ファイルを追加する。
constants.tsとerrors.tsを実装し、既存のvalidation.tsをvalidator.tsとして調整する。

## 要件定義書参照
- docs/kaito-api.md: utilsディレクトリ仕様
- docs/directory-structure.md: kaito-api/utils/構造

## 現状と目標

### 現状
```
src/kaito-api/utils/
├── normalizer.ts       # 既存
├── response-handler.ts # 既存
├── type-checker.ts     # 既存
└── validation.ts       # 既存（validator.tsとして機能）
```

### 目標
```
src/kaito-api/utils/
├── types.ts            # TASK-002で作成
├── constants.ts        # 新規作成
├── errors.ts           # 新規作成
├── response-handler.ts # 既存
├── validator.ts        # validation.tsをリネーム
├── normalizer.ts       # 既存
├── type-checker.ts     # 既存
└── index.ts           # エクスポート統合
```

## 実装内容

### 1. constants.ts（API定数定義）
```typescript
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
```

### 2. errors.ts（Twitter API特有のエラークラス）
```typescript
// ============================================================================
// KaitoTwitterAPI エラークラス定義
// ============================================================================

// Base error class
export class KaitoAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'KaitoAPIError';
  }
}

// Authentication errors
export class AuthenticationError extends KaitoAPIError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Session has expired, please login again');
    this.name = 'SessionExpiredError';
  }
}

// Rate limit errors
export class RateLimitError extends KaitoAPIError {
  constructor(
    public endpoint: string,
    public resetTime: number,
    public limit: number
  ) {
    super(
      `Rate limit exceeded for ${endpoint}. Reset at ${new Date(resetTime).toISOString()}`,
      'RATE_LIMIT',
      429
    );
    this.name = 'RateLimitError';
  }
}

// Validation errors
export class ValidationError extends KaitoAPIError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// API response errors
export class APIResponseError extends KaitoAPIError {
  constructor(
    message: string,
    statusCode: number,
    public response?: any
  ) {
    super(message, 'API_ERROR', statusCode, response);
    this.name = 'APIResponseError';
  }
}

// Network errors
export class NetworkError extends KaitoAPIError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// Cost limit errors
export class CostLimitError extends KaitoAPIError {
  constructor(public currentCost: number, public threshold: number) {
    super(
      `Cost limit exceeded: $${currentCost.toFixed(2)} > $${threshold}`,
      'COST_LIMIT',
      402
    );
    this.name = 'CostLimitError';
  }
}
```

### 3. validation.ts → validator.tsリネーム
- ファイル名を`validator.ts`に変更
- 必要に応じて内容を調整（TwitterAPI仕様に合わせる）
- constants.tsの定数を使用するよう更新

### 4. index.ts更新
```typescript
// ============================================================================
// Utils exports
// ============================================================================

export * from './types';
export * from './constants';
export * from './errors';
export * from './response-handler';
export * from './validator';
export * from './normalizer';
export * from './type-checker';
```

## 実装手順
1. constants.ts作成
2. errors.ts作成
3. validation.ts → validator.tsリネーム
4. 各ファイルでconstants/errorsを使用するよう更新
5. index.ts作成/更新

## 技術的制約
- TypeScript strict mode準拠
- 定数はすべて`as const`で定義
- エラークラスは適切な継承構造
- 既存コードとの互換性維持

## 品質基準
- TypeScriptコンパイルエラーなし
- 定数の一元管理実現
- エラーハンドリングの統一
- 適切なエクスポート構造

## 注意事項
- MVPに必要な定数・エラーのみ定義
- 過度に複雑な構造は避ける
- 仕様書の内容を優先
- 既存コードへの影響を最小限に

## 成果物
- constants.ts: API定数定義ファイル
- errors.ts: エラークラス定義ファイル
- validator.ts: リネームされた検証ファイル
- index.ts: 統合エクスポートファイル
- 報告書: `tasks/20250729_131524_kaito_api_restructure/reports/REPORT-004-utils-completion.md`