import { describe, it, expect } from 'vitest';
import {
  validateTwitterUserId,
  validateTwitterUsername,
  validateTwitterTweetId,
  validateMediaId,
  validateTweetText,
  validateSearchQuery,
  validateUrl,
  performSecurityCheck,
  detectMaliciousPatterns,
  detectSQLInjection,
  detectXSSAttempt,
  detectScriptInjection,
  containsProhibitedContent,
  detectSpamPatterns,
  containsInappropriateCharacters,
  validateNumberRange,
  validateStringLength,
  validateWOEID,
  validateTwitterLimits,
  mergeValidationResults,
  formatValidationErrors
} from '@/kaito-api/utils/validator';

describe('Validator', () => {
  describe('validateTwitterUserId', () => {
    it('有効なユーザーIDを受け入れる', () => {
      const validIds = [
        '123456789',
        '1',
        '12345678901234567890' // 20桁
      ];

      validIds.forEach(id => {
        const result = validateTwitterUserId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なユーザーIDを拒否する', () => {
      const invalidIds = [
        '', // 空文字
        '   ', // 空白のみ
        'abc123', // 文字が含まれる
        '123abc', // 文字が含まれる
        '123456789012345678901', // 21桁（長すぎる）
        '12.34', // 小数点
        '-123', // 負の値
        '+123', // プラス記号
        '0', // 0は有効だが、実際のTwitterでは使われない
        null as any,
        undefined as any
      ];

      invalidIds.forEach(id => {
        const result = validateTwitterUserId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('空の入力に対してエラーメッセージを返す', () => {
      const result = validateTwitterUserId('');
      expect(result.errors).toContain('User ID is required');
    });

    it('無効な形式に対してエラーメッセージを返す', () => {
      const result = validateTwitterUserId('invalid123abc');
      expect(result.errors).toContain('Invalid Twitter user ID format');
    });
  });

  describe('validateTwitterUsername', () => {
    it('有効なユーザー名を受け入れる', () => {
      const validUsernames = [
        'twitter',
        'user123',
        'test_user',
        'a', // 1文字
        'abcdefghijklmno', // 15文字
        '@username', // @マーク付き（除去される）
        'USER123' // 大文字（小文字に変換される）
      ];

      validUsernames.forEach(username => {
        const result = validateTwitterUsername(username);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なユーザー名を拒否する', () => {
      const invalidUsernames = [
        '', // 空文字
        '   ', // 空白のみ
        'user-name', // ハイフン
        'user.name', // ドット
        'user name', // スペース
        'abcdefghijklmnop', // 16文字（長すぎる）
        '123@456', // @マークが中間にある
        'user@domain.com', // メール形式
        null as any,
        undefined as any
      ];

      invalidUsernames.forEach(username => {
        const result = validateTwitterUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTwitterTweetId', () => {
    it('有効なツイートIDを受け入れる', () => {
      const validIds = [
        '1234567890123456789', // 19桁
        '123456789012345678', // 18桁
        '1' // 1桁
      ];

      validIds.forEach(id => {
        const result = validateTwitterTweetId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なツイートIDを拒否する', () => {
      const invalidIds = [
        '', // 空文字
        '12345678901234567890', // 20桁（長すぎる）
        'abc123', // 文字が含まれる
        '123.456', // 小数点
        null as any,
        undefined as any
      ];

      invalidIds.forEach(id => {
        const result = validateTwitterTweetId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateMediaId', () => {
    it('有効なメディアIDを受け入れる', () => {
      const validIds = [
        'media_1234567890',
        '1234567890_1234567890',
        'media_123'
      ];

      validIds.forEach(id => {
        const result = validateMediaId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なメディアIDを拒否する', () => {
      const invalidIds = [
        '', // 空文字
        'invalid_format',
        'media',
        '1234567890',
        'abc_def',
        null as any,
        undefined as any
      ];

      invalidIds.forEach(id => {
        const result = validateMediaId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTweetText', () => {
    it('有効なツイートテキストを受け入れる', () => {
      const validTexts = [
        'Hello world!',
        'A', // 1文字
        'x'.repeat(280), // 280文字（制限内）
        'テスト投稿です', // 日本語
        '🎉 Celebration!', // 絵文字
      ];

      validTexts.forEach(text => {
        const result = validateTweetText(text);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なツイートテキストを拒否する', () => {
      const invalidTexts = [
        '', // 空文字
        '   ', // 空白のみ
        'x'.repeat(281), // 281文字（制限超過）
        null as any,
        undefined as any
      ];

      invalidTexts.forEach(text => {
        const result = validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateSearchQuery', () => {
    it('有効な検索クエリを受け入れる', () => {
      const validQueries = [
        'twitter',
        'hello world',
        '#hashtag',
        '@username',
        'from:user',
        'x'.repeat(500) // デフォルト最大長
      ];

      validQueries.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効な検索クエリを拒否する', () => {
      const result1 = validateSearchQuery('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Search query is required');

      const result2 = validateSearchQuery('x'.repeat(501));
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Query too long (max 500 characters)');
    });

    it('カスタムの長さ制限を適用する', () => {
      const result1 = validateSearchQuery('ab', 3, 10);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Query too short (min 3 characters)');

      const result2 = validateSearchQuery('x'.repeat(11), 1, 10);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Query too long (max 10 characters)');
    });
  });

  describe('validateUrl', () => {
    it('有効なURLを受け入れる', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://subdomain.example.com/path?query=value',
        'http://localhost:3000'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なURLを拒否する', () => {
      const invalidUrls = [
        '', // 空文字
        'invalid-url',
        'ftp://example.com', // 非対応プロトコル
        'javascript:alert(1)', // 危険なプロトコル
        'data:text/html,<script>alert(1)</script>',
        null as any,
        undefined as any
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('performSecurityCheck', () => {
    it('安全な入力を通す', () => {
      const safeInputs = [
        'Hello world',
        'This is a normal tweet',
        'プログラミングについて学んでいます',
        'Check out this link: https://example.com'
      ];

      safeInputs.forEach(input => {
        const result = performSecurityCheck(input);
        expect(result.isSafe).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
    });

    it('SQLインジェクションを検出する', () => {
      const sqlInjections = [
        "' OR '1'='1",
        'DROP TABLE users',
        'INSERT INTO users VALUES',
        'DELETE FROM users WHERE',
        'UPDATE users SET password'
      ];

      sqlInjections.forEach(input => {
        const result = performSecurityCheck(input);
        expect(result.isSafe).toBe(false);
        expect(result.issues).toContain('Potential SQL injection detected');
      });
    });

    it('XSS攻撃を検出する', () => {
      const xssAttempts = [
        '<script>alert(1)</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        'onload="alert(1)"'
      ];

      xssAttempts.forEach(input => {
        const result = performSecurityCheck(input);
        expect(result.isSafe).toBe(false);
        expect(result.issues).toContain('Potential XSS attempt detected');
      });
    });

    it('スクリプトインジェクションを検出する', () => {
      const scriptInjections = [
        'eval("malicious code")',
        'Function("return process")()',
        'setTimeout("alert(1)", 1000)',
        'setInterval("malicious()", 1000)'
      ];

      scriptInjections.forEach(input => {
        const result = performSecurityCheck(input);
        expect(result.isSafe).toBe(false);
        expect(result.issues).toContain('Potential script injection detected');
      });
    });

    it('韓国語コンテンツを検出する', () => {
      const koreanTexts = [
        '안녕하세요',
        'This contains 한국어 text',
        '테스트'
      ];

      koreanTexts.forEach(input => {
        const result = containsProhibitedContent(input);
        expect(result).toBe(true);
      });
    });
  });

  describe('detectSpamPatterns', () => {
    it('過度な繰り返し文字を検出する', () => {
      expect(detectSpamPatterns('aaaaaaaaaaaa')).toBe(true);
      expect(detectSpamPatterns('normal text')).toBe(false);
    });

    it('過度な大文字を検出する', () => {
      expect(detectSpamPatterns('THIS IS ALL CAPS TEXT!!!')).toBe(true);
      expect(detectSpamPatterns('This is Normal Text')).toBe(false);
    });

    it('過度な絵文字を検出する', () => {
      expect(detectSpamPatterns('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉')).toBe(true);
      expect(detectSpamPatterns('Hello 🎉 World')).toBe(false);
    });

    it('過度な数字・記号を検出する', () => {
      expect(detectSpamPatterns('123456789012345678901234567890!!!')).toBe(true);
      expect(detectSpamPatterns('Call me at 123-456-7890')).toBe(false);
    });
  });

  describe('containsInappropriateCharacters', () => {
    it('制御文字を検出する', () => {
      expect(containsInappropriateCharacters('text\x00with\x01control')).toBe(true);
      expect(containsInappropriateCharacters('normal text')).toBe(false);
    });

    it('通常の文字は通す', () => {
      const normalTexts = [
        'Hello world!',
        'プログラミング',
        '123 ABC',
        'Special chars: @#$%^&*()'
      ];

      normalTexts.forEach(text => {
        expect(containsInappropriateCharacters(text)).toBe(false);
      });
    });
  });

  describe('validateNumberRange', () => {
    it('範囲内の数値を受け入れる', () => {
      const result = validateNumberRange(50, 0, 100, 'test_value');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('範囲外の数値を拒否する', () => {
      const result1 = validateNumberRange(-1, 0, 100, 'test_value');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('test_value must be at least 0');

      const result2 = validateNumberRange(101, 0, 100, 'test_value');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('test_value must be at most 100');
    });

    it('無効な数値を拒否する', () => {
      const result = validateNumberRange(NaN, 0, 100, 'test_value');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('test_value must be a valid number');
    });
  });

  describe('validateStringLength', () => {
    it('適切な長さの文字列を受け入れる', () => {
      const result = validateStringLength('hello', 1, 10, 'test_field');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('長すぎる/短すぎる文字列を拒否する', () => {
      const result1 = validateStringLength('', 1, 10, 'test_field');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('test_field must be at least 1 characters');

      const result2 = validateStringLength('this is too long', 1, 10, 'test_field');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('test_field must be at most 10 characters');
    });

    it('非文字列を拒否する', () => {
      const result = validateStringLength(123 as any, 1, 10, 'test_field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('test_field must be a string');
    });
  });

  describe('validateWOEID', () => {
    it('有効なWOEIDを受け入れる', () => {
      const validWoeids = [1, 12345, 99999999];

      validWoeids.forEach(woeid => {
        const result = validateWOEID(woeid);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効なWOEIDを拒否する', () => {
      const invalidWoeids = [0, -1, 100000000, 1.5, NaN];

      invalidWoeids.forEach(woeid => {
        const result = validateWOEID(woeid);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateTwitterLimits', () => {
    it('各制限値を正しく検証する', () => {
      const validCases = [
        { type: 'max_results', value: 50 },
        { type: 'tweet_length', value: 200 },
        { type: 'media_count', value: 2 },
        { type: 'poll_options', value: 3 },
        { type: 'poll_duration', value: 1440 } // 24時間
      ];

      validCases.forEach(({ type, value }) => {
        const result = validateTwitterLimits(type, value);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('制限超過を検出する', () => {
      const invalidCases = [
        { type: 'max_results', value: 5 }, // 最小値未満
        { type: 'tweet_length', value: 281 }, // 最大値超過
        { type: 'media_count', value: 5 }, // 最大値超過
        { type: 'poll_options', value: 1 }, // 最小値未満
        { type: 'poll_duration', value: 20000 } // 最大値超過
      ];

      invalidCases.forEach(({ type, value }) => {
        const result = validateTwitterLimits(type, value);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('不明な制限タイプを拒否する', () => {
      const result = validateTwitterLimits('unknown_type', 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown limit type: unknown_type');
    });
  });

  describe('mergeValidationResults', () => {
    it('複数の成功結果をマージする', () => {
      const results = [
        { isValid: true, errors: [] },
        { isValid: true, errors: [] },
        { isValid: true, errors: [] }
      ];

      const merged = mergeValidationResults(results);
      expect(merged.isValid).toBe(true);
      expect(merged.errors).toHaveLength(0);
    });

    it('失敗を含む結果をマージする', () => {
      const results = [
        { isValid: true, errors: [] },
        { isValid: false, errors: ['Error 1'] },
        { isValid: false, errors: ['Error 2', 'Error 3'] }
      ];

      const merged = mergeValidationResults(results);
      expect(merged.isValid).toBe(false);
      expect(merged.errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    it('空の結果配列を処理する', () => {
      const merged = mergeValidationResults([]);
      expect(merged.isValid).toBe(true);
      expect(merged.errors).toHaveLength(0);
    });
  });

  describe('formatValidationErrors', () => {
    it('成功結果に対して空文字列を返す', () => {
      const result = { isValid: true, errors: [] };
      expect(formatValidationErrors(result)).toBe('');
    });

    it('エラーメッセージを整形する', () => {
      const result = { 
        isValid: false, 
        errors: ['Error 1', 'Error 2', 'Error 3'] 
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toBe('Validation failed: Error 1, Error 2, Error 3');
    });

    it('単一エラーを整形する', () => {
      const result = { 
        isValid: false, 
        errors: ['Single error'] 
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toBe('Validation failed: Single error');
    });
  });
});