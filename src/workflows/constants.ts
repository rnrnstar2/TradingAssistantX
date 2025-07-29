/**
 * Workflow Constants - Simplified version for MVP
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • API制限・タイムアウト値
 * • エラーメッセージ統一
 * • 最小限の設定値のみ
 */
export const WORKFLOW_CONSTANTS = {
  // ===================================================================
  // API制限・レート制限関連
  // ===================================================================
  RATE_LIMITS: {
    API_RATE_LIMIT_INTERVAL: 700,
    REQUEST_TIMEOUT: 30000, // 30秒
    MAX_CONCURRENT_REQUESTS: 3,
    CACHE_TTL: 300000 // 5分
  },

  // ===================================================================
  // タイムアウト設定
  // ===================================================================
  TIMEOUTS: {
    OPERATION_TIMEOUT: 120000, // 2分
    MAX_RETRY_DELAY: 30000,
    BASE_DELAY: 1000,
    MAX_RETRIES: 3
  },

  // ===================================================================
  // エラーメッセージ統一
  // ===================================================================
  ERROR_MESSAGES: {
    // 一般的なエラー
    UNKNOWN_ERROR: 'Unknown error',
    OPERATION_TIMEOUT: 'Operation timeout',
    INVALID_CONFIG: 'Invalid configuration',

    // データエラー
    DATA_LOAD_FAILED: 'Failed to load data',
    DATA_SAVE_FAILED: 'Failed to save data',

    // API エラー
    API_CONNECTION_FAILED: 'API connection failed',
    API_AUTHENTICATION_FAILED: 'API authentication failed',
    API_QUOTA_EXCEEDED: 'API quota exceeded',

    // Claude エラー
    CLAUDE_DECISION_FAILED: 'Claude decision process failed',
    CLAUDE_CONTENT_GENERATION_FAILED: 'Claude content generation failed'
  },

  // ===================================================================
  // アクション種別定義
  // ===================================================================
  ACTIONS: {
    POST: 'post',
    RETWEET: 'retweet',
    LIKE: 'like',
    QUOTE_TWEET: 'quote_tweet',
    WAIT: 'wait'
  } as const
} as const;

// ===================================================================
// 型定義のエクスポート
// ===================================================================
export type ActionType = typeof WORKFLOW_CONSTANTS.ACTIONS[keyof typeof WORKFLOW_CONSTANTS.ACTIONS];