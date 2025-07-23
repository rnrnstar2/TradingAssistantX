/**
 * Logger - シンプルなロギングユーティリティ
 * 
 * 責務:
 * - コンソールへの構造化されたログ出力
 * - ログレベル別の色付き出力
 * - モジュール名を含むコンテキスト情報
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

/**
 * ロガークラス
 */
export class Logger {
  private readonly context: string;
  
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
    if (process.env.DEBUG) {
      this.log('debug', message, data);
    }
  }
  
  /**
   * ログ出力の実装
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);
    const color = this.getColor(level);
    
    // 基本メッセージ
    const logMessage = `${color}${prefix} [${this.context}] ${message}\x1b[0m`;
    console.log(`[${timestamp}] ${logMessage}`);
    
    // 追加データがある場合
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data);
      }
    }
  }
  
  /**
   * ログレベルに応じたプレフィックス取得
   */
  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'info':
        return 'ℹ️ ';
      case 'warn':
        return '⚠️ ';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  }
  
  /**
   * ログレベルに応じた色取得
   */
  private getColor(level: LogLevel): string {
    switch (level) {
      case 'info':
        return '\x1b[36m'; // Cyan
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'error':
        return '\x1b[31m'; // Red
      case 'success':
        return '\x1b[32m'; // Green
      case 'debug':
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m';  // Reset
    }
  }
}