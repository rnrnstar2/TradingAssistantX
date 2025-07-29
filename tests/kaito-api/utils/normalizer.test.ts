import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeTweetData,
  normalizeTweetArray,
  normalizeUserData,
  normalizeUserArray,
  normalizeTrendData,
  normalizeTrendArray,
  normalizeTrendLocation,
  normalizeTrendLocationArray,
  normalizeTwitterId,
  normalizeUsername,
  normalizeTimestamp,
  normalizeUrl,
  normalizeNumber,
  normalizeBoolean,
  sanitizeText,
  normalizePublicMetrics,
  normalizeUserPublicMetrics,
  normalizeContextAnnotations,
  normalizeLanguageCode,
  normalizeCountryCode,
  normalizeVerifiedType,
  normalizeTweetVolume,
  normalizeAttachments,
  normalizeGeoData,
  normalizeWithheldInfo,
  maskSensitiveData,
  validateResponseStructure,
  generateNormalizationStats
} from '@/kaito-api/utils/normalizer';

describe('Normalizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeTweetData', () => {
    it('TwitterAPI.ioレスポンスを正規化する', () => {
      const apiTweet = {
        id: '1234567890123456789',
        text: 'Hello World!',
        author_id: '987654321',
        created_at: '2023-01-01T12:00:00Z',
        public_metrics: {
          retweet_count: 10,
          like_count: 25,
          quote_count: 5,
          reply_count: 3,
          impression_count: 1000
        },
        lang: 'en'
      };

      const normalized = normalizeTweetData(apiTweet);

      expect(normalized.id).toBe('1234567890123456789');
      expect(normalized.text).toBe('Hello World!');
      expect(normalized.author_id).toBe('987654321');
      expect(normalized.created_at).toBe('2023-01-01T12:00:00.000Z');
      expect(normalized.public_metrics.retweet_count).toBe(10);
      expect(normalized.public_metrics.like_count).toBe(25);
      expect(normalized.lang).toBe('en');
    });

    it('不完全なデータを適切に処理する', () => {
      const incompleteTweet = {
        id: '123',
        // textがない
        author_id: '456',
        // created_atがない
        // public_metricsがない
      };

      const normalized = normalizeTweetData(incompleteTweet);

      expect(normalized.id).toBe('123');
      expect(normalized.text).toBe(''); // デフォルト値
      expect(normalized.author_id).toBe('456');
      expect(normalized.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // 現在時刻
      expect(normalized.public_metrics.retweet_count).toBe(0);
      expect(normalized.public_metrics.like_count).toBe(0);
    });

    it('異なる形式のタイムスタンプを統一する', () => {
      const testCases = [
        { input: 1640995200, expected: '2022-01-01T00:00:00.000Z' }, // Unix timestamp (秒)
        { input: 1640995200000, expected: '2022-01-01T00:00:00.000Z' }, // Unix timestamp (ミリ秒)
        { input: '2022-01-01T00:00:00Z', expected: '2022-01-01T00:00:00.000Z' }, // ISO string
        { input: '2022-01-01T00:00:00.000Z', expected: '2022-01-01T00:00:00.000Z' } // ISO string with ms
      ];

      testCases.forEach(({ input, expected }) => {
        const tweet = {
          id: '123',
          text: 'test',
          author_id: '456',
          created_at: input
        };

        const normalized = normalizeTweetData(tweet);
        expect(normalized.created_at).toBe(expected);
      });
    });

    it('サニタイゼーションオプションが機能する', () => {
      const tweet = {
        id: '123',
        text: 'Hello <script>alert(1)</script> World\x00\x01',
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z'
      };

      const normalized = normalizeTweetData(tweet, { sanitizeText: true });
      expect(normalized.text).toBe('Hello  World');
      expect(normalized.text).not.toContain('<script>');
      expect(normalized.text).not.toContain('\x00');
    });

    it('コンテキスト注釈を正規化する', () => {
      const tweet = {
        id: '123',
        text: 'test',
        author_id: '456',
        created_at: '2023-01-01T00:00:00Z',
        context_annotations: [
          {
            domain: { name: 'Sports', description: 'Sports content' },
            entity: { name: 'Football', description: 'American Football' }
          }
        ]
      };

      const normalized = normalizeTweetData(tweet);
      expect(normalized.context_annotations).toHaveLength(1);
      expect(normalized.context_annotations![0].domain.name).toBe('Sports');
      expect(normalized.context_annotations![0].entity.name).toBe('Football');
    });
  });

  describe('normalizeTweetArray', () => {
    it('ツイート配列を正規化する', () => {
      const tweets = [
        { id: '1', text: 'First tweet', author_id: '100', created_at: '2023-01-01T00:00:00Z' },
        { id: '2', text: 'Second tweet', author_id: '200', created_at: '2023-01-01T01:00:00Z' }
      ];

      const normalized = normalizeTweetArray(tweets);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].id).toBe('1');
      expect(normalized[1].id).toBe('2');
    });

    it('無効なIDを持つツイートを除外する', () => {
      const tweets = [
        { id: '1', text: 'Valid tweet', author_id: '100' },
        { text: 'No ID tweet', author_id: '200' }, // IDがない
        { id: '', text: 'Empty ID tweet', author_id: '300' } // 空のID
      ];

      const normalized = normalizeTweetArray(tweets);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].id).toBe('1');
    });

    it('非配列入力を空配列として処理する', () => {
      const invalidInputs = [null, undefined, 'string', 123, {}];

      invalidInputs.forEach(input => {
        const normalized = normalizeTweetArray(input as any);
        expect(normalized).toEqual([]);
      });
    });
  });

  describe('normalizeUserData', () => {
    it('ユーザーデータを正規化する', () => {
      const apiUser = {
        id: '123456789',
        username: 'testuser',
        name: 'Test User',
        description: 'A test user account',
        created_at: '2023-01-01T00:00:00Z',
        location: 'Test City',
        url: 'https://example.com',
        verified: true,
        public_metrics: {
          followers_count: 1000,
          following_count: 500,
          tweet_count: 250,
          listed_count: 10
        }
      };

      const normalized = normalizeUserData(apiUser);

      expect(normalized.id).toBe('123456789');
      expect(normalized.username).toBe('testuser');
      expect(normalized.name).toBe('Test User');
      expect(normalized.description).toBe('A test user account');
      expect(normalized.verified).toBe(true);
      expect(normalized.public_metrics?.followers_count).toBe(1000);
    });

    it('URLの検証と正規化を行う', () => {
      const user = {
        id: '123',
        username: 'test',
        name: 'Test',
        created_at: '2023-01-01T00:00:00Z',
        url: 'example.com', // プロトコルなし
        profile_image_url: '//pbs.twimg.com/profile.jpg' // プロトコルなし
      };

      const normalized = normalizeUserData(user, { validateUrls: true });
      expect(normalized.url).toBe('https://example.com');
      expect(normalized.profile_image_url).toBe('https://pbs.twimg.com/profile.jpg');
    });

    it('認証タイプを正規化する', () => {
      const testCases = [
        { input: 'blue', expected: 'blue' },
        { input: 'BUSINESS', expected: 'business' },
        { input: 'government', expected: 'government' },
        { input: 'invalid', expected: 'none' },
        { input: null, expected: 'none' }
      ];

      testCases.forEach(({ input, expected }) => {
        const user = {
          id: '123',
          username: 'test',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z',
          verified_type: input
        };

        const normalized = normalizeUserData(user);
        expect(normalized.verified_type).toBe(expected);
      });
    });
  });

  describe('normalizeTrendData', () => {
    it('トレンドデータを正規化する', () => {
      const apiTrend = {
        name: '#TestTrend',
        query: '#TestTrend',
        tweet_volume: 12345,
        url: 'https://twitter.com/search?q=%23TestTrend'
      };

      const normalized = normalizeTrendData(apiTrend, 0);

      expect(normalized.name).toBe('#TestTrend');
      expect(normalized.query).toBe('#TestTrend');
      expect(normalized.tweetVolume).toBe(12345);
      expect(normalized.rank).toBe(1); // index 0 -> rank 1
    });

    it('ツイート量がnullの場合を処理する', () => {
      const trend = {
        name: 'No Volume Trend',
        tweet_volume: null
      };

      const normalized = normalizeTrendData(trend, 5);
      expect(normalized.tweetVolume).toBeNull();
      expect(normalized.rank).toBe(6);
    });
  });

  describe('normalizeTwitterId', () => {
    it('有効なTwitter IDを正規化する', () => {
      const validIds = ['123456789', '1', '12345678901234567890'];

      validIds.forEach(id => {
        expect(normalizeTwitterId(id)).toBe(id);
      });
    });

    it('無効なTwitter IDを空文字列にする', () => {
      const invalidIds = [null, undefined, '', 'abc123', '123.456', '12345678901234567890123456789'];

      invalidIds.forEach(id => {
        expect(normalizeTwitterId(id)).toBe('');
      });
    });
  });

  describe('normalizeUsername', () => {
    it('有効なユーザー名を正規化する', () => {
      expect(normalizeUsername('@testuser')).toBe('testuser');
      expect(normalizeUsername('TestUser')).toBe('testuser');
      expect(normalizeUsername('user_123')).toBe('user_123');
    });

    it('無効なユーザー名を空文字列にする', () => {
      const invalidUsernames = ['', 'user-name', 'user.name', 'toolongusernamehere'];

      invalidUsernames.forEach(username => {
        expect(normalizeUsername(username)).toBe('');
      });
    });
  });

  describe('normalizeTimestamp', () => {
    it('Unix timestampを変換する', () => {
      // 秒単位のUnix timestamp
      expect(normalizeTimestamp(1640995200)).toBe('2022-01-01T00:00:00.000Z');
      
      // ミリ秒単位のUnix timestamp
      expect(normalizeTimestamp(1640995200000)).toBe('2022-01-01T00:00:00.000Z');
    });

    it('ISO文字列を正規化する', () => {
      expect(normalizeTimestamp('2022-01-01T00:00:00Z')).toBe('2022-01-01T00:00:00.000Z');
      expect(normalizeTimestamp('2022-01-01T00:00:00.000Z')).toBe('2022-01-01T00:00:00.000Z');
    });

    it('無効なタイムスタンプに対して現在時刻を返す', () => {
      const before = Date.now();
      const result = normalizeTimestamp('invalid');
      const after = Date.now();
      
      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before);
      expect(resultTime).toBeLessThanOrEqual(after);
    });

    it('null/undefinedに対して現在時刻を返す', () => {
      const before = Date.now();
      const result1 = normalizeTimestamp(null);
      const result2 = normalizeTimestamp(undefined);
      const after = Date.now();
      
      const time1 = new Date(result1).getTime();
      const time2 = new Date(result2).getTime();
      expect(time1).toBeGreaterThanOrEqual(before);
      expect(time1).toBeLessThanOrEqual(after);
      expect(time2).toBeGreaterThanOrEqual(before);
      expect(time2).toBeLessThanOrEqual(after);
    });
  });

  describe('normalizeUrl', () => {
    it('相対URLを絶対URLに変換する', () => {
      expect(normalizeUrl('//example.com')).toBe('https://example.com/');
      expect(normalizeUrl('example.com')).toBe('https://example.com/');
      expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('不正なURLを空文字列にする', () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>',
        '/relative/path',
        'ftp://example.com',
        'invalid-url',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(normalizeUrl(url)).toBe('');
      });
    });
  });

  describe('normalizeNumber', () => {
    it('有効な数値を正規化する', () => {
      expect(normalizeNumber(42)).toBe(42);
      expect(normalizeNumber(0)).toBe(0);
      expect(normalizeNumber('123')).toBe(123);
      expect(normalizeNumber(3.14)).toBe(3.14);
    });

    it('負の値を0にする', () => {
      expect(normalizeNumber(-5)).toBe(0);
      expect(normalizeNumber('-10')).toBe(0);
    });

    it('無効な値にフォールバック値を使用する', () => {
      expect(normalizeNumber('invalid')).toBe(0);
      expect(normalizeNumber('invalid', 100)).toBe(100);
      expect(normalizeNumber(null)).toBe(0);
      expect(normalizeNumber(undefined)).toBe(0);
      expect(normalizeNumber(NaN)).toBe(0);
    });
  });

  describe('normalizeBoolean', () => {
    it('ブール値をそのまま返す', () => {
      expect(normalizeBoolean(true)).toBe(true);
      expect(normalizeBoolean(false)).toBe(false);
    });

    it('truthy文字列をtrueに変換する', () => {
      expect(normalizeBoolean('true')).toBe(true);
      expect(normalizeBoolean('1')).toBe(true);
      expect(normalizeBoolean(1)).toBe(true);
    });

    it('falsy文字列をfalseに変換する', () => {
      expect(normalizeBoolean('false')).toBe(false);
      expect(normalizeBoolean('0')).toBe(false);
      expect(normalizeBoolean(0)).toBe(false);
    });

    it('その他の値をBooleanで変換する', () => {
      expect(normalizeBoolean('hello')).toBe(true);
      expect(normalizeBoolean('')).toBe(false);
      expect(normalizeBoolean(null)).toBe(false);
      expect(normalizeBoolean(undefined)).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('制御文字を除去する', () => {
      const input = 'Hello\x00World\x01Test\x1F';
      const result = sanitizeText(input);
      expect(result).toBe('HelloWorldTest');
      expect(result).not.toMatch(/[\x00-\x1F]/);
    });

    it('HTMLタグを除去する', () => {
      const input = 'Hello <script>alert(1)</script> <b>World</b>';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<b>');
    });

    it('連続空白を正規化する', () => {
      const input = 'Hello    World\n\n\nTest';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World Test');
    });

    it('空の入力を空文字列として処理する', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('normalizePublicMetrics', () => {
    it('完全なメトリクスを正規化する', () => {
      const metrics = {
        retweet_count: 10,
        like_count: 25,
        quote_count: 5,
        reply_count: 3,
        impression_count: 1000
      };

      const normalized = normalizePublicMetrics(metrics);
      expect(normalized.retweet_count).toBe(10);
      expect(normalized.like_count).toBe(25);
      expect(normalized.quote_count).toBe(5);
      expect(normalized.reply_count).toBe(3);
      expect(normalized.impression_count).toBe(1000);
    });

    it('異なるフィールド名を正規化する', () => {
      const metrics = {
        retweetCount: 15, // 異なる命名
        favoriteCount: 30, // like_countの代替
        viewCount: 2000 // impression_countの代替
      };

      const normalized = normalizePublicMetrics(metrics);
      expect(normalized.retweet_count).toBe(15);
      expect(normalized.like_count).toBe(30);
      expect(normalized.impression_count).toBe(2000);
    });

    it('不完全なメトリクスにデフォルト値を設定する', () => {
      const normalized = normalizePublicMetrics({});
      expect(normalized.retweet_count).toBe(0);
      expect(normalized.like_count).toBe(0);
      expect(normalized.quote_count).toBe(0);
      expect(normalized.reply_count).toBe(0);
      expect(normalized.impression_count).toBe(0);
    });

    it('null/undefinedメトリクスにデフォルト値を設定する', () => {
      const normalized1 = normalizePublicMetrics(null);
      const normalized2 = normalizePublicMetrics(undefined);

      [normalized1, normalized2].forEach(normalized => {
        expect(normalized.retweet_count).toBe(0);
        expect(normalized.like_count).toBe(0);
        expect(normalized.quote_count).toBe(0);
        expect(normalized.reply_count).toBe(0);
        expect(normalized.impression_count).toBe(0);
      });
    });
  });

  describe('normalizeLanguageCode', () => {
    it('有効な言語コードを返す', () => {
      expect(normalizeLanguageCode('en')).toBe('en');
      expect(normalizeLanguageCode('ja')).toBe('ja');
      expect(normalizeLanguageCode('fr')).toBe('fr');
    });

    it('大文字を小文字に変換する', () => {
      expect(normalizeLanguageCode('EN')).toBe('en');
      expect(normalizeLanguageCode('JA')).toBe('ja');
    });

    it('無効な言語コードをundeterminedにする', () => {
      expect(normalizeLanguageCode('invalid')).toBe('und');
      expect(normalizeLanguageCode('123')).toBe('und');
      expect(normalizeLanguageCode('')).toBe('und');
      expect(normalizeLanguageCode(null)).toBe('und');
    });
  });

  describe('maskSensitiveData', () => {
    it('敏感なデータをマスキングする', () => {
      expect(maskSensitiveData('1234567890')).toBe('12****7890');
      expect(maskSensitiveData('abcdefghij')).toBe('ab****ghij');
    });

    it('短いデータはマスキングする', () => {
      expect(maskSensitiveData('abc')).toBe('***');
      expect(maskSensitiveData('ab')).toBe('***');
      expect(maskSensitiveData('a')).toBe('***');
      expect(maskSensitiveData('')).toBe('***');
    });
  });

  describe('validateResponseStructure', () => {
    it('期待される構造を検証する', () => {
      const response = {
        data: {
          id: '123',
          user: {
            name: 'Test'
          }
        },
        meta: {
          count: 1
        }
      };

      const expectedStructure = ['data', 'data.id', 'data.user.name', 'meta.count'];
      expect(validateResponseStructure(response, expectedStructure)).toBe(true);
    });

    it('不完全な構造を拒否する', () => {
      const response = {
        data: {
          id: '123'
          // user フィールドがない
        }
      };

      const expectedStructure = ['data.id', 'data.user.name'];
      expect(validateResponseStructure(response, expectedStructure)).toBe(false);
    });

    it('非オブジェクトを拒否する', () => {
      expect(validateResponseStructure(null, ['data'])).toBe(false);
      expect(validateResponseStructure('string', ['data'])).toBe(false);
      expect(validateResponseStructure(123, ['data'])).toBe(false);
    });
  });

  describe('generateNormalizationStats', () => {
    it('正規化統計を生成する', () => {
      const originalData = {
        id: '123',
        name: 'Original Name',
        description: 'Original desc',
        invalidField: 'will be removed'
      };

      const normalizedData = {
        id: '123',
        name: 'Normalized Name', // 変更された
        description: '', // 空になった
        newField: 'added' // 追加された
      };

      const stats = generateNormalizationStats(originalData, normalizedData);

      expect(stats.originalFields).toBe(4);
      expect(stats.normalizedFields).toBe(4);
      expect(stats.emptyFields).toBe(1); // description
      expect(stats.modifiedFields).toBe(3); // name, description, newField
    });

    it('null/undefinedデータを処理する', () => {
      const stats1 = generateNormalizationStats(null, {});
      expect(stats1.originalFields).toBe(0);
      expect(stats1.normalizedFields).toBe(0);

      const stats2 = generateNormalizationStats({}, null);
      expect(stats2.originalFields).toBe(1);
      expect(stats2.normalizedFields).toBe(0);
    });
  });
});