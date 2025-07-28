/**
 * TwitterAPI.io型安全性チェッカー
 * 実行時型検証とデバッグ支援
 */

import { TweetData, UserData, TwitterAPIError } from '../types';

export class TwitterAPITypeChecker {
  /**
   * ツイートデータの型検証
   */
  static validateTweetData(data: any): data is TweetData {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.text === 'string' &&
      typeof data.author_id === 'string' &&
      typeof data.created_at === 'string' &&
      typeof data.public_metrics === 'object' &&
      typeof data.public_metrics.retweet_count === 'number' &&
      typeof data.public_metrics.like_count === 'number'
    );
  }

  /**
   * ユーザーデータの型検証
   */
  static validateUserData(data: any): data is UserData {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.username === 'string' &&
      typeof data.name === 'string' &&
      typeof data.created_at === 'string'
    );
  }

  /**
   * TwitterAPI.ioエラーの型検証
   */
  static validateTwitterAPIError(data: any): data is TwitterAPIError {
    return (
      typeof data === 'object' &&
      typeof data.error === 'object' &&
      typeof data.error.code === 'string' &&
      typeof data.error.message === 'string' &&
      typeof data.error.type === 'string'
    );
  }

  /**
   * レスポンス型の実行時検証
   */
  static validateResponse<T>(
    data: any,
    validator: (item: any) => item is T
  ): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (Array.isArray(data.data)) {
      return data.data.every(validator);
    } else {
      return validator(data.data);
    }
  }
}