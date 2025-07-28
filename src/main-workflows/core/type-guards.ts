/**
 * TypeGuards - 型安全性パターン統一ユーティリティ
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • null・undefined チェック関数
 * • オブジェクトプロパティ検証
 * • 配列・文字列・数値の型安全チェック
 * • API応答の型検証
 */
export class TypeGuards {
  /**
   * 非null・非undefinedチェック
   */
  static isNonNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * 文字列かつ空でないことの確認
   */
  static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * 配列かつ空でないことの確認
   */
  static isNonEmptyArray<T>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * 数値かつ有効値（NaN・Infinity除外）の確認
   */
  static isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * オブジェクトの必須プロパティチェック
   */
  static hasRequiredProperties<T extends object>(
    obj: unknown,
    requiredKeys: (keyof T)[]
  ): obj is T {
    if (typeof obj !== 'object' || obj === null) return false;
    return requiredKeys.every(key => key in obj);
  }

  /**
   * オブジェクトかつnullでないことの確認
   */
  static isNonNullObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * 日付文字列の有効性チェック
   */
  static isValidDateString(value: unknown): value is string {
    if (!this.isNonEmptyString(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * APIレスポンスの基本構造チェック
   */
  static isValidApiResponse(value: unknown): value is { success: boolean; data?: any; error?: string } {
    return this.isNonNullObject(value) && 
           typeof (value as any).success === 'boolean';
  }

  /**
   * エラーオブジェクトの確認
   */
  static isError(value: unknown): value is Error {
    return value instanceof Error;
  }

  /**
   * プロミスの確認
   */
  static isPromise<T>(value: unknown): value is Promise<T> {
    return typeof value === 'object' && 
           value !== null && 
           typeof (value as any).then === 'function';
  }

  /**
   * 関数の確認
   */
  static isFunction(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function';
  }

  /**
   * 実行時コンテキストの必須フィールドチェック
   */
  static isValidExecutionContext(context: unknown): context is {
    account: { followerCount: number; postsToday: number; engagementRate: number };
    system: object;
    market: object;
  } {
    if (!this.isNonNullObject(context)) return false;
    
    const ctx = context as any;
    return this.isNonNullObject(ctx.account) &&
           this.isValidNumber(ctx.account.followerCount) &&
           this.isValidNumber(ctx.account.postsToday) &&
           this.isValidNumber(ctx.account.engagementRate) &&
           this.isNonNullObject(ctx.system) &&
           this.isNonNullObject(ctx.market);
  }

  /**
   * Claude決定オブジェクトの検証
   */
  static isValidClaudeDecision(decision: unknown): decision is {
    action: string;
    confidence: number;
    reasoning: string;
    parameters: object;
  } {
    if (!this.isNonNullObject(decision)) return false;
    
    const dec = decision as any;
    return this.isNonEmptyString(dec.action) &&
           this.isValidNumber(dec.confidence) &&
           this.isNonEmptyString(dec.reasoning) &&
           this.isNonNullObject(dec.parameters);
  }

  /**
   * アクション結果の検証
   */
  static isValidActionResult(result: unknown): result is {
    success: boolean;
    action: string;
    timestamp: string;
    executionTime: number;
  } {
    if (!this.isNonNullObject(result)) return false;
    
    const res = result as any;
    return typeof res.success === 'boolean' &&
           this.isNonEmptyString(res.action) &&
           this.isValidDateString(res.timestamp) &&
           this.isValidNumber(res.executionTime);
  }
}