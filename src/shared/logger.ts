/**
 * ログ管理システム
 * REQUIREMENTS.md準拠版 - 統合ログ管理クラス
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  data?: any;
  timestamp: string;
}

export interface LoggerConfig {
  enableColors: boolean;
  enableTimestamp: boolean;
  enableContext: boolean;
  minLogLevel: LogLevel;
  maxLogEntries: number;
}

/**
 * ログ管理システムクラス
 * 構造化ログ出力と履歴管理を提供
 */
export class Logger {
  private readonly context: string;
  private static config: LoggerConfig = {
    enableColors: true,
    enableTimestamp: true,
    enableContext: true,
    minLogLevel: 'debug',
    maxLogEntries: 1000
  };
  
  private static logHistory: LogEntry[] = [];
  
  // ANSI色コード
  private static readonly colors = {
    info: '\x1b[36m',    // シアン
    warn: '\x1b[33m',    // 黄色
    error: '\x1b[31m',   // 赤
    success: '\x1b[32m', // 緑
    debug: '\x1b[90m',   // グレー
    reset: '\x1b[0m'     // リセット
  };

  private static readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    success: 4
  };

  constructor(context: string) {
    this.context = context;
  }

  /**
   * 情報レベルのログ
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * 警告レベルのログ
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * エラーレベルのログ
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * 成功レベルのログ
   */
  success(message: string, data?: any): void {
    this.log('success', message, data);
  }

  /**
   * デバッグレベルのログ
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * 汎用ログメソッド
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // ログレベルフィルタリング
    if (Logger.levelPriority[level] < Logger.levelPriority[Logger.config.minLogLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      context: this.context,
      data,
      timestamp
    };

    // ログ履歴に追加
    Logger.logHistory.push(logEntry);
    
    // 履歴サイズ制限
    if (Logger.logHistory.length > Logger.config.maxLogEntries) {
      Logger.logHistory.shift();
    }

    // コンソール出力
    this.outputToConsole(logEntry);
  }

  /**
   * コンソールへの出力
   */
  private outputToConsole(entry: LogEntry): void {
    const { level, message, context, data, timestamp } = entry;
    
    let output = '';

    // タイムスタンプ
    if (Logger.config.enableTimestamp) {
      const timeStr = new Date(timestamp).toLocaleTimeString('ja-JP');
      output += `[${timeStr}] `;
    }

    // コンテキスト
    if (Logger.config.enableContext) {
      output += `[${context}] `;
    }

    // レベル指示子
    const levelIndicator = this.getLevelIndicator(level);
    
    // 色付きメッセージ
    if (Logger.config.enableColors) {
      const color = Logger.colors[level];
      const reset = Logger.colors.reset;
      output += `${color}${levelIndicator} ${message}${reset}`;
    } else {
      output += `${levelIndicator} ${message}`;
    }

    // データオブジェクト
    if (data !== undefined) {
      if (typeof data === 'object') {
        output += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        output += ` ${data}`;
      }
    }

    // 出力先選択
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * レベル指示子の取得
   */
  private getLevelIndicator(level: LogLevel): string {
    const indicators = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      debug: '🔧'
    };
    
    return indicators[level] || '📝';
  }

  // ============================================================================
  // STATIC METHODS - グローバル設定とユーティリティ
  // ============================================================================

  /**
   * ロガー設定の更新
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * 現在の設定取得
   */
  static getConfig(): LoggerConfig {
    return { ...Logger.config };
  }

  /**
   * ログ履歴の取得
   */
  static getHistory(level?: LogLevel, limit?: number): LogEntry[] {
    let history = Logger.logHistory;
    
    // レベルフィルタリング
    if (level) {
      history = history.filter(entry => entry.level === level);
    }
    
    // 件数制限
    if (limit && history.length > limit) {
      history = history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * ログ履歴のクリア
   */
  static clearHistory(): void {
    Logger.logHistory = [];
  }

  /**
   * ログ統計の取得
   */
  static getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const stats = {
      total: Logger.logHistory.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        success: 0
      } as Record<LogLevel, number>,
      oldestEntry: undefined as string | undefined,
      newestEntry: undefined as string | undefined
    };

    Logger.logHistory.forEach(entry => {
      stats.byLevel[entry.level]++;
    });

    if (Logger.logHistory.length > 0) {
      stats.oldestEntry = Logger.logHistory[0].timestamp;
      stats.newestEntry = Logger.logHistory[Logger.logHistory.length - 1].timestamp;
    }

    return stats;
  }

  /**
   * 構造化ログの一括出力
   */
  static dump(includeData: boolean = false): string {
    const entries = Logger.logHistory.map(entry => {
      const formatted = {
        timestamp: entry.timestamp,
        level: entry.level,
        context: entry.context,
        message: entry.message
      };

      if (includeData && entry.data) {
        (formatted as any).data = entry.data;
      }

      return formatted;
    });

    return JSON.stringify(entries, null, 2);
  }

  /**
   * 重要ログ（warn以上）の取得
   */
  static getImportantLogs(): LogEntry[] {
    return Logger.logHistory.filter(entry => 
      ['warn', 'error'].includes(entry.level)
    );
  }

  /**
   * パフォーマンス測定用ログ
   */
  static time(label: string): void {
    console.time(label);
  }

  static timeEnd(label: string): void {
    console.timeEnd(label);
  }

  /**
   * グループログ（デバッグ用）
   */
  static group(label: string): void {
    console.group(label);
  }

  static groupEnd(): void {
    console.groupEnd();
  }

  /**
   * テーブル形式ログ（デバッグ用）
   */
  static table(data: any): void {
    console.table(data);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - 簡易使用用
// ============================================================================

// グローバルロガーインスタンス
const globalLogger = new Logger('Global');

export const logger = {
  info: (message: string, data?: any) => globalLogger.info(message, data),
  warn: (message: string, data?: any) => globalLogger.warn(message, data),
  error: (message: string, data?: any) => globalLogger.error(message, data),
  success: (message: string, data?: any) => globalLogger.success(message, data),
  debug: (message: string, data?: any) => globalLogger.debug(message, data)
};

// ファクトリー関数
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// 特殊用途ロガー
export const systemLogger = new Logger('System');
export const apiLogger = new Logger('API');
export const schedulerLogger = new Logger('Scheduler');
export const dataLogger = new Logger('Data');
export const claudeLogger = new Logger('Claude');