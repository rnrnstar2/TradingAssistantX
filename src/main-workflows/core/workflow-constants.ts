/**
 * WorkflowConstants - 重複定数・設定値の統一
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • スケジューラー関連定数の統一管理
 * • API制限・タイムアウト値の一元化
 * • ログメッセージ・エラーメッセージの統一
 * • 実行制御パラメータの集約
 */
export const WORKFLOW_CONSTANTS = {
  // ===================================================================
  // スケジューラー関連
  // ===================================================================
  SCHEDULER: {
    DEFAULT_INTERVAL_MINUTES: 30,
    MAX_DAILY_EXECUTIONS: 48,
    EXECUTION_WINDOW: { 
      start: '07:00', 
      end: '23:00' 
    },
    TIMEZONE: 'Asia/Tokyo',
    GRACEFUL_SHUTDOWN_ENABLED: true
  },

  // ===================================================================
  // リトライ・エラーハンドリング関連
  // ===================================================================
  RETRY: {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
    MAX_DELAY: 30000,
    TIMEOUT_OPERATIONS: 120000 // 2分
  },

  // ===================================================================
  // KaitoAPI・レート制限関連
  // ===================================================================
  API: {
    RATE_LIMIT_INTERVAL: 700,
    CACHE_TTL: 300000, // 5分
    REQUEST_TIMEOUT: 30000, // 30秒
    MAX_CONCURRENT_REQUESTS: 3,
    DEFAULT_USER_AGENT: 'TradingAssistantX/1.0'
  },

  // ===================================================================
  // データ管理関連
  // ===================================================================
  DATA: {
    MAX_CURRENT_FILES: 20,
    MAX_CURRENT_SIZE_MB: 1,
    MAX_LEARNING_SIZE_MB: 10,
    ARCHIVE_THRESHOLD_DAYS: 7,
    CLEANUP_INTERVAL_HOURS: 24
  },

  // ===================================================================
  // パフォーマンス・メトリクス関連
  // ===================================================================
  PERFORMANCE: {
    SLOW_OPERATION_THRESHOLD_MS: 5000,
    MEMORY_WARNING_THRESHOLD_MB: 512,
    CPU_WARNING_THRESHOLD_PERCENT: 80,
    DISK_WARNING_THRESHOLD_PERCENT: 90
  },

  // ===================================================================
  // ワークフローステップ定義
  // ===================================================================
  WORKFLOW_STEPS: {
    DATA_LOAD: {
      number: 1,
      name: 'データ読み込み',
      description: 'システムコンテキスト・学習データの収集'
    },
    CLAUDE_DECISION: {
      number: 2,
      name: 'Claude判断',
      description: '現在状況に基づく最適アクション決定'
    },
    ACTION_EXECUTION: {
      number: 3,
      name: 'アクション実行',
      description: '判断結果に基づく具体的な行動実行'
    },
    RESULT_RECORDING: {
      number: 4,
      name: '結果記録',
      description: 'パフォーマンス分析・学習データ更新'
    }
  },

  // ===================================================================
  // ログメッセージ統一
  // ===================================================================
  LOG_MESSAGES: {
    // システム起動・停止
    SYSTEM_STARTUP: 'システム起動開始',
    SYSTEM_READY: 'システム準備完了',
    SYSTEM_SHUTDOWN: 'システムシャットダウン開始',
    SYSTEM_STOPPED: 'システム停止完了',

    // スケジューラー
    SCHEDULER_START: 'スケジューラー開始',
    SCHEDULER_STOP: 'スケジューラー停止',
    SCHEDULER_PAUSED: 'スケジューラー一時停止',
    SCHEDULER_RESUMED: 'スケジューラー再開',

    // ワークフロー実行
    WORKFLOW_START: 'メインループ実行開始',
    WORKFLOW_COMPLETE: 'メインループ実行完了',
    WORKFLOW_ERROR: 'メインループ実行エラー',

    // データ処理
    DATA_LOAD_START: 'データ読み込み開始',
    DATA_LOAD_COMPLETE: 'データ読み込み完了',
    DATA_SAVE_START: 'データ保存開始',
    DATA_SAVE_COMPLETE: 'データ保存完了',

    // API呼び出し
    API_CALL_START: 'API呼び出し開始',
    API_CALL_SUCCESS: 'API呼び出し成功',
    API_CALL_ERROR: 'API呼び出しエラー',
    API_RATE_LIMITED: 'レート制限によりAPI呼び出し制限'
  },

  // ===================================================================
  // エラーメッセージ統一
  // ===================================================================
  ERROR_MESSAGES: {
    // 一般的なエラー
    UNKNOWN_ERROR: 'Unknown error',
    OPERATION_TIMEOUT: 'Operation timeout',
    INVALID_CONFIG: 'Invalid configuration',
    MISSING_DEPENDENCY: 'Missing required dependency',

    // スケジューラーエラー
    SCHEDULER_ALREADY_RUNNING: 'Scheduler is already running',
    SCHEDULER_NOT_RUNNING: 'Scheduler is not running',
    EXECUTION_CALLBACK_MISSING: 'Execution callback is required',

    // データエラー
    DATA_LOAD_FAILED: 'Failed to load data',
    DATA_SAVE_FAILED: 'Failed to save data',
    DATA_VALIDATION_FAILED: 'Data validation failed',

    // API エラー
    API_CONNECTION_FAILED: 'API connection failed',
    API_AUTHENTICATION_FAILED: 'API authentication failed',
    API_QUOTA_EXCEEDED: 'API quota exceeded',

    // Claude エラー
    CLAUDE_DECISION_FAILED: 'Claude decision process failed',
    CLAUDE_CONTENT_GENERATION_FAILED: 'Claude content generation failed',
    CLAUDE_ANALYSIS_FAILED: 'Claude analysis failed'
  },

  // ===================================================================
  // アクション種別定義
  // ===================================================================
  ACTIONS: {
    POST: 'post',
    RETWEET: 'retweet',
    QUOTE_TWEET: 'quote_tweet',
    LIKE: 'like',
    WAIT: 'wait',
    ERROR: 'error'
  },

  // ===================================================================
  // 設定デフォルト値
  // ===================================================================
  DEFAULTS: {
    CONTENT_TYPE: 'educational',
    TARGET_AUDIENCE: 'beginner',
    SEARCH_LIMIT: 10,
    ENGAGEMENT_THRESHOLD: 0.05,
    CONFIDENCE_THRESHOLD: 0.7
  },

  // ===================================================================
  // ファイルパス・ディレクトリ関連
  // ===================================================================
  PATHS: {
    DATA_CURRENT: 'data/current',
    DATA_LEARNING: 'data/learning',
    DATA_ARCHIVES: 'data/archives',
    LOGS: 'logs',
    CONFIG: 'data/config'
  },

  // ===================================================================
  // バリデーション制約
  // ===================================================================
  VALIDATION: {
    MIN_CONFIDENCE: 0.0,
    MAX_CONFIDENCE: 1.0,
    MIN_FOLLOWER_COUNT: 0,
    MAX_TWEET_LENGTH: 280,
    MIN_ENGAGEMENT_RATE: 0.0,
    MAX_ENGAGEMENT_RATE: 1.0
  }
} as const;

// ===================================================================
// 型定義のエクスポート
// ===================================================================
export type WorkflowStep = keyof typeof WORKFLOW_CONSTANTS.WORKFLOW_STEPS;
export type ActionType = typeof WORKFLOW_CONSTANTS.ACTIONS[keyof typeof WORKFLOW_CONSTANTS.ACTIONS];
export type LogMessage = typeof WORKFLOW_CONSTANTS.LOG_MESSAGES[keyof typeof WORKFLOW_CONSTANTS.LOG_MESSAGES];
export type ErrorMessage = typeof WORKFLOW_CONSTANTS.ERROR_MESSAGES[keyof typeof WORKFLOW_CONSTANTS.ERROR_MESSAGES];