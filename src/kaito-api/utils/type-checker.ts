/**
 * TwitterAPI.io型安全性チェッカー
 * 実行時型検証とデバッグ支援
 */

import { 
  TweetData, 
  UserData, 
  TwitterAPIError, 
  TwitterAPIBaseResponse,
  isTweetData, 
  isUserData, 
  isTwitterAPIError,
  isTwitterAPIBaseResponse
} from './types';
import { ValidationError } from './errors';

export class TwitterAPITypeChecker {
  /**
   * ツイートデータの型検証
   * types.tsの型ガードを使用
   */
  static validateTweetData(data: unknown): data is TweetData {
    return isTweetData(data);
  }

  /**
   * ユーザーデータの型検証
   * types.tsの型ガードを使用
   */
  static validateUserData(data: unknown): data is UserData {
    return isUserData(data);
  }

  /**
   * TwitterAPI.ioエラーの型検証
   * types.tsの型ガードを使用
   */
  static validateTwitterAPIError(data: unknown): data is TwitterAPIError {
    return isTwitterAPIError(data);
  }

  /**
   * TwitterAPIベースレスポンスの型検証
   * types.tsの型ガードを使用
   */
  static validateTwitterAPIBaseResponse<T>(data: unknown): data is TwitterAPIBaseResponse<T> {
    return isTwitterAPIBaseResponse<T>(data);
  }

  /**
   * レスポンス型の実行時検証
   */
  static validateResponse<T>(
    data: unknown,
    validator: (item: unknown) => item is T
  ): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const response = data as any;
    if (Array.isArray(response.data)) {
      return response.data.every(validator);
    } else {
      return validator(response.data);
    }
  }

  /**
   * 型安全なデータ検証（エラー投げる版）
   * @param data - 検証対象データ
   * @param validator - 型ガード関数
   * @param errorMessage - エラーメッセージ
   * @throws ValidationError - 検証失敗時
   */
  static validateOrThrow<T>(
    data: unknown,
    validator: (item: unknown) => item is T,
    errorMessage: string
  ): asserts data is T {
    if (!validator(data)) {
      throw new ValidationError(errorMessage);
    }
  }

  /**
   * ツイートデータの厳密な検証
   * @param data - 検証対象データ
   * @throws ValidationError - 検証失敗時
   */
  static validateTweetDataStrict(data: unknown): asserts data is TweetData {
    this.validateOrThrow(data, isTweetData, 'Invalid tweet data structure');
  }

  /**
   * ユーザーデータの厳密な検証
   * @param data - 検証対象データ
   * @throws ValidationError - 検証失敗時
   */
  static validateUserDataStrict(data: unknown): asserts data is UserData {
    this.validateOrThrow(data, isUserData, 'Invalid user data structure');
  }

  /**
   * Twitter APIエラーの厳密な検証
   * @param data - 検証対象データ
   * @throws ValidationError - 検証失敗時
   */
  static validateTwitterAPIErrorStrict(data: unknown): asserts data is TwitterAPIError {
    this.validateOrThrow(data, isTwitterAPIError, 'Invalid Twitter API error structure');
  }

  /**
   * デバッグ用: データ構造の詳細情報を取得
   * @param data - 解析対象データ
   * @returns データ構造情報
   */
  static analyzeDataStructure(data: unknown): {
    type: string;
    properties: string[];
    isTweetData: boolean;
    isUserData: boolean;
    isTwitterAPIError: boolean;
    isTwitterAPIBaseResponse: boolean;
  } {
    const type = typeof data;
    const properties = data && typeof data === 'object' ? Object.keys(data as object) : [];
    
    return {
      type,
      properties,
      isTweetData: isTweetData(data),
      isUserData: isUserData(data),
      isTwitterAPIError: isTwitterAPIError(data),
      isTwitterAPIBaseResponse: isTwitterAPIBaseResponse(data)
    };
  }
}

// types.tsの型ガードを再エクスポート（後方互換性のため）
export {
  isTweetData,
  isUserData,
  isTwitterAPIError,
  isTwitterAPIBaseResponse
} from './types';

// エイリアス関数（旧メソッド名との互換性のため）
/** @deprecated Use isTweetData from types.ts instead */
export const validateTweetData = isTweetData;

/** @deprecated Use isUserData from types.ts instead */
export const validateUserData = isUserData;

/** @deprecated Use isTwitterAPIError from types.ts instead */
export const validateTwitterAPIError = isTwitterAPIError;