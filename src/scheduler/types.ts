// ============================================================================
// SCHEDULER TYPE DEFINITIONS
// ============================================================================

/**
 * スケジュールアイテム - 個別の実行タスク定義
 */
export interface ScheduleItem {
  time: string;           // "HH:MM" 形式（例: "09:00", "15:30"）
  action: ActionType;     // 実行するアクション種別
  topic?: string;         // postアクション用のトピック
  target_query?: string;  // retweet/quote_tweet用の検索クエリ
}

/**
 * スケジュール設定 - 日次スケジュール全体の定義
 */
export interface ScheduleConfig {
  daily_schedule: ScheduleItem[];
}

/**
 * アクション種別 - 実行可能なアクション定義
 */
export enum ActionType {
  POST = 'post',
  RETWEET = 'retweet',
  QUOTE_TWEET = 'quote_tweet',
  LIKE = 'like',
  FOLLOW = 'follow',
  ANALYZE = 'analyze'
}

/**
 * 実行統計 - スケジューラーのパフォーマンス統計
 */
export interface ExecutionStats {
  totalExecutions: number;        // 総実行回数
  successCount: number;           // 成功回数
  errorCount: number;             // エラー回数
  averageExecutionTime: number;   // 平均実行時間（ミリ秒）
  lastExecutionTime?: Date;       // 最終実行時刻
  errorHistory: ErrorRecord[];    // エラー履歴（最大10件まで）
}

/**
 * 拡張された実行統計
 * TODO: 深夜大規模分析統計 - 実装待ち
 */
export interface ExtendedExecutionStats extends ExecutionStats {
  // TODO: deepNightAnalysis - 実装待ち
}

/**
 * エラー記録 - 個別エラーの詳細情報
 */
export interface ErrorRecord {
  timestamp: Date;        // エラー発生時刻
  errorType: string;      // エラー種別
  message: string;        // エラーメッセージ
  action?: string;        // 実行中だったアクション
  recoveryAction?: string; // 復旧対応
  stackTrace?: string;    // スタックトレース（デバッグ用）
}

/**
 * スケジューラー設定 - 動的設定管理用
 */
export interface SchedulerConfig {
  configReloadInterval: number;   // 設定再読み込み間隔（ミリ秒）
  executionInterval: number;      // 実行チェック間隔（ミリ秒）
  maxErrorHistory: number;        // エラー履歴の最大保持数
  enableDetailedLogging: boolean; // 詳細ログの有効/無効
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * スケジュール読み込みエラー - YAML読み込み・解析エラー用
 */
export class ScheduleLoadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ScheduleLoadError';
  }
}

/**
 * スケジュール実行エラー - タスク実行時のエラー用
 */
export class ScheduleExecutionError extends Error {
  constructor(
    message: string, 
    public action: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ScheduleExecutionError';
  }
}

/**
 * 設定検証エラー - 設定ファイルの妥当性チェックエラー用
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

// ============================================================================
// TYPE GUARDS AND VALIDATORS
// ============================================================================

/**
 * ScheduleItem型の検証
 * @param item 検証対象オブジェクト
 * @returns ScheduleItemとして有効かどうか
 */
export function isValidScheduleItem(item: any): item is ScheduleItem {
  if (!item || typeof item !== 'object') return false;
  
  // 必須フィールドの検証
  if (typeof item.time !== 'string' || !isValidTimeFormat(item.time)) {
    return false;
  }
  
  if (typeof item.action !== 'string' || !isValidActionType(item.action)) {
    return false;
  }
  
  // オプションフィールドの検証
  if (item.topic !== undefined && typeof item.topic !== 'string') {
    return false;
  }
  
  if (item.target_query !== undefined && typeof item.target_query !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * 時刻フォーマットの検証（HH:MM形式）
 * @param time 検証対象の時刻文字列
 * @returns HH:MM形式として有効かどうか
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * アクション種別の検証
 * @param action 検証対象のアクション文字列
 * @returns 有効なActionTypeかどうか
 */
export function isValidActionType(action: string): action is ActionType {
  return Object.values(ActionType).includes(action as ActionType);
}

/**
 * ScheduleConfig型の検証
 * @param config 検証対象オブジェクト
 * @returns ScheduleConfigとして有効かどうか
 */
export function isValidScheduleConfig(config: any): config is ScheduleConfig {
  if (!config || typeof config !== 'object') return false;
  
  if (!Array.isArray(config.daily_schedule)) return false;
  
  return config.daily_schedule.every((item: any) => isValidScheduleItem(item));
}