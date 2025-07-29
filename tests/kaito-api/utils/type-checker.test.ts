import { describe, it, expect } from 'vitest';
import { TwitterAPITypeChecker } from '@/kaito-api/utils/type-checker';
import { TweetData, UserData, TwitterAPIError } from '@/kaito-api/utils/types';

describe('TwitterAPITypeChecker', () => {
  describe('validateTweetData', () => {
    it('有効なツイートデータを検証する', () => {
      const validTweet: TweetData = {
        id: '1234567890123456789',
        text: 'Hello World!',
        author_id: '987654321',
        created_at: '2023-01-01T12:00:00.000Z',
        public_metrics: {
          retweet_count: 10,
          like_count: 25,
          quote_count: 5,
          reply_count: 3,
          impression_count: 1000
        },
        lang: 'en'
      };

      expect(TwitterAPITypeChecker.validateTweetData(validTweet)).toBe(true);
    });

    it('不完全なデータを拒否する', () => {
      const incompleteTweets = [
        // IDがない
        {
          text: 'Hello',
          author_id: '123',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // textがない
        {
          id: '123',
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // author_idがない
        {
          id: '123',
          text: 'Hello',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // created_atがない
        {
          id: '123',
          text: 'Hello',
          author_id: '456',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // public_metricsがない
        {
          id: '123',
          text: 'Hello',
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z'
        },
        // public_metricsの必須フィールドがない
        {
          id: '123',
          text: 'Hello',
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: {
            retweet_count: 0
            // like_countがない
          }
        }
      ];

      incompleteTweets.forEach(tweet => {
        expect(TwitterAPITypeChecker.validateTweetData(tweet)).toBe(false);
      });
    });

    it('型が正しくないデータを拒否する', () => {
      const invalidTypeTweets = [
        // null
        null,
        // undefined
        undefined,
        // string
        'invalid',
        // number
        123,
        // array
        [],
        // IDが数値でない
        {
          id: 123, // 数値
          text: 'Hello',
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // textが文字列でない
        {
          id: '123',
          text: 123, // 数値
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: { retweet_count: 0, like_count: 0 }
        },
        // public_metricsが数値でない
        {
          id: '123',
          text: 'Hello',
          author_id: '456',
          created_at: '2023-01-01T00:00:00Z',
          public_metrics: {
            retweet_count: '0', // 文字列
            like_count: 0
          }
        }
      ];

      invalidTypeTweets.forEach(tweet => {
        expect(TwitterAPITypeChecker.validateTweetData(tweet)).toBe(false);
      });
    });

    it('オプショナルフィールドの有無を適切に処理する', () => {
      const tweetWithOptionals: TweetData = {
        id: '123',
        text: 'Hello',
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z',
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        },
        lang: 'en',
        in_reply_to_user_id: '789',
        conversation_id: '999',
        context_annotations: [
          {
            domain: { name: 'Test', description: 'Test domain' },
            entity: { name: 'Entity', description: 'Test entity' }
          }
        ]
      };

      expect(TwitterAPITypeChecker.validateTweetData(tweetWithOptionals)).toBe(true);

      const tweetWithoutOptionals = {
        id: '123',
        text: 'Hello',
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z',
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        }
      };

      expect(TwitterAPITypeChecker.validateTweetData(tweetWithoutOptionals)).toBe(true);
    });
  });

  describe('validateUserData', () => {
    it('有効なユーザーデータを検証する', () => {
      const validUser: UserData = {
        id: '123456789',
        username: 'testuser',
        name: 'Test User',
        created_at: '2023-01-01T00:00:00.000Z',
        description: 'Test account',
        location: 'Test City',
        verified: false,
        verified_type: 'none',
        public_metrics: {
          followers_count: 100,
          following_count: 50,
          tweet_count: 25,
          listed_count: 5
        }
      };

      expect(TwitterAPITypeChecker.validateUserData(validUser)).toBe(true);
    });

    it('不完全なデータを拒否する', () => {
      const incompleteUsers = [
        // IDがない
        {
          username: 'test',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z'
        },
        // usernameがない
        {
          id: '123',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z'
        },
        // nameがない
        {
          id: '123',
          username: 'test',
          created_at: '2023-01-01T00:00:00Z'
        },
        // created_atがない
        {
          id: '123',
          username: 'test',
          name: 'Test'
        }
      ];

      incompleteUsers.forEach(user => {
        expect(TwitterAPITypeChecker.validateUserData(user)).toBe(false);
      });
    });

    it('型が正しくないデータを拒否する', () => {
      const invalidTypeUsers = [
        null,
        undefined,
        'invalid',
        123,
        [],
        // IDが数値でない
        {
          id: 123,
          username: 'test',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z'
        },
        // usernameが文字列でない
        {
          id: '123',
          username: 123,
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      invalidTypeUsers.forEach(user => {
        expect(TwitterAPITypeChecker.validateUserData(user)).toBe(false);
      });
    });

    it('最小限の有効なユーザーデータを受け入れる', () => {
      const minimalUser = {
        id: '123',
        username: 'test',
        name: 'Test',
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(TwitterAPITypeChecker.validateUserData(minimalUser)).toBe(true);
    });
  });

  describe('validateTwitterAPIError', () => {
    it('有効なTwitterAPIErrorを検証する', () => {
      const validError: TwitterAPIError = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          type: 'rate_limit',
          details: {
            timestamp: '2023-01-01T00:00:00Z',
            request_id: 'req_123',
            reset_time: '2023-01-01T01:00:00Z',
            limit: 100,
            remaining: 0
          }
        }
      };

      expect(TwitterAPITypeChecker.validateTwitterAPIError(validError)).toBe(true);
    });

    it('不完全なエラーデータを拒否する', () => {
      const incompleteErrors = [
        // errorがない
        {},
        // error.codeがない
        {
          error: {
            message: 'Error message',
            type: 'validation'
          }
        },
        // error.messageがない
        {
          error: {
            code: 'ERROR_CODE',
            type: 'validation'
          }
        },
        // error.typeがない
        {
          error: {
            code: 'ERROR_CODE',
            message: 'Error message'
          }
        }
      ];

      incompleteErrors.forEach(error => {
        expect(TwitterAPITypeChecker.validateTwitterAPIError(error)).toBe(false);
      });
    });

    it('型が正しくないエラーデータを拒否する', () => {
      const invalidTypeErrors = [
        null,
        undefined,
        'invalid',
        123,
        [],
        // errorがオブジェクトでない
        {
          error: 'string'
        },
        // error.codeが文字列でない
        {
          error: {
            code: 123,
            message: 'Error message',
            type: 'validation'
          }
        },
        // error.messageが文字列でない
        {
          error: {
            code: 'ERROR_CODE',
            message: 123,
            type: 'validation'
          }
        },
        // error.typeが文字列でない
        {
          error: {
            code: 'ERROR_CODE',
            message: 'Error message',
            type: 123
          }
        }
      ];

      invalidTypeErrors.forEach(error => {
        expect(TwitterAPITypeChecker.validateTwitterAPIError(error)).toBe(false);
      });
    });

    it('詳細情報を含むエラーを検証する', () => {
      const errorWithDetails = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          type: 'validation',
          details: {
            field_errors: [
              {
                field: 'username',
                message: 'Username is required',
                code: 'REQUIRED'
              }
            ]
          }
        }
      };

      expect(TwitterAPITypeChecker.validateTwitterAPIError(errorWithDetails)).toBe(true);
    });
  });

  describe('validateResponse', () => {
    it('配列レスポンスを検証する', () => {
      const arrayResponse = {
        data: [
          {
            id: '1',
            text: 'Tweet 1',
            author_id: '100',
            created_at: '2023-01-01T00:00:00Z',
            public_metrics: { retweet_count: 0, like_count: 0 }
          },
          {
            id: '2',
            text: 'Tweet 2',
            author_id: '200',
            created_at: '2023-01-01T01:00:00Z',
            public_metrics: { retweet_count: 1, like_count: 2 }
          }
        ]
      };

      const isValid = TwitterAPITypeChecker.validateResponse(
        arrayResponse,
        TwitterAPITypeChecker.validateTweetData
      );

      expect(isValid).toBe(true);
    });

    it('単一レスポンスを検証する', () => {
      const singleResponse = {
        data: {
          id: '123',
          username: 'test',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00Z'
        }
      };

      const isValid = TwitterAPITypeChecker.validateResponse(
        singleResponse,
        TwitterAPITypeChecker.validateUserData
      );

      expect(isValid).toBe(true);
    });

    it('無効な配列レスポンスを拒否する', () => {
      const invalidArrayResponse = {
        data: [
          {
            id: '1',
            text: 'Valid tweet',
            author_id: '100',
            created_at: '2023-01-01T00:00:00Z',
            public_metrics: { retweet_count: 0, like_count: 0 }
          },
          {
            // 無効なツイート（textがない）
            id: '2',
            author_id: '200',
            created_at: '2023-01-01T01:00:00Z',
            public_metrics: { retweet_count: 1, like_count: 2 }
          }
        ]
      };

      const isValid = TwitterAPITypeChecker.validateResponse(
        invalidArrayResponse,
        TwitterAPITypeChecker.validateTweetData
      );

      expect(isValid).toBe(false);
    });

    it('無効な単一レスポンスを拒否する', () => {
      const invalidSingleResponse = {
        data: {
          id: '123',
          // usernameがない
          name: 'Test User',
          created_at: '2023-01-01T00:00:00Z'
        }
      };

      const isValid = TwitterAPITypeChecker.validateResponse(
        invalidSingleResponse,
        TwitterAPITypeChecker.validateUserData
      );

      expect(isValid).toBe(false);
    });

    it('データがない場合を拒否する', () => {
      const noDataResponse = {};

      const isValid = TwitterAPITypeChecker.validateResponse(
        noDataResponse,
        TwitterAPITypeChecker.validateTweetData
      );

      expect(isValid).toBe(false);
    });

    it('null/undefinedレスポンスを拒否する', () => {
      expect(TwitterAPITypeChecker.validateResponse(
        null,
        TwitterAPITypeChecker.validateTweetData
      )).toBe(false);

      expect(TwitterAPITypeChecker.validateResponse(
        undefined,
        TwitterAPITypeChecker.validateTweetData
      )).toBe(false);
    });

    it('非オブジェクトレスポンスを拒否する', () => {
      const invalidResponses = ['string', 123, true, []];

      invalidResponses.forEach(response => {
        expect(TwitterAPITypeChecker.validateResponse(
          response,
          TwitterAPITypeChecker.validateTweetData
        )).toBe(false);
      });
    });

    it('空の配列を有効として扱う', () => {
      const emptyArrayResponse = {
        data: []
      };

      const isValid = TwitterAPITypeChecker.validateResponse(
        emptyArrayResponse,
        TwitterAPITypeChecker.validateTweetData
      );

      expect(isValid).toBe(true);
    });
  });

  describe('カスタムバリデーター', () => {
    it('カスタムバリデーターが機能する', () => {
      const customValidator = (item: any): item is { id: string; name: string } => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.name === 'string'
        );
      };

      const validResponse = {
        data: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' }
        ]
      };

      const invalidResponse = {
        data: [
          { id: '1', name: 'Item 1' },
          { id: 2, name: 'Item 2' } // IDが数値
        ]
      };

      expect(TwitterAPITypeChecker.validateResponse(
        validResponse,
        customValidator
      )).toBe(true);

      expect(TwitterAPITypeChecker.validateResponse(
        invalidResponse,
        customValidator
      )).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('循環参照を含むオブジェクトを処理する', () => {
      const circularObj: any = {
        id: '123',
        text: 'Test',
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z',
        public_metrics: { retweet_count: 0, like_count: 0 }
      };
      circularObj.self = circularObj; // 循環参照

      // 循環参照があってもTypeCheckerは基本的なフィールドをチェックするのみ
      expect(TwitterAPITypeChecker.validateTweetData(circularObj)).toBe(true);
    });

    it('非常に大きなオブジェクトを処理する', () => {
      const largeObj = {
        id: '123',
        text: 'x'.repeat(10000), // 大きなテキスト
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z',
        public_metrics: { retweet_count: 0, like_count: 0 },
        additionalData: new Array(1000).fill('data') // 大きな配列
      };

      expect(TwitterAPITypeChecker.validateTweetData(largeObj)).toBe(true);
    });

    it('プロトタイプチェーンのプロパティを考慮する', () => {
      const baseObj = {
        id: '123',
        text: 'Test',
        author_id: '456'
      };

      const extendedObj = Object.create(baseObj);
      extendedObj.created_at = '2023-01-01T00:00:00Z';
      extendedObj.public_metrics = { retweet_count: 0, like_count: 0 };

      // プロトタイプチェーンのプロパティも含めて検証される
      expect(TwitterAPITypeChecker.validateTweetData(extendedObj)).toBe(true);
    });
  });
});