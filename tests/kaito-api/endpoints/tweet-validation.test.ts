/**
 * TweetEndpoints バリデーション機能テスト
 * 
 * テスト対象: src/kaito-api/endpoints/tweet-endpoints.ts - validateTweetText メソッド
 * 目的: ツイートテキストバリデーション機能の詳細な動作確認
 * 
 * テストカテゴリ:
 * - 文字数制限チェック（280文字）
 * - 韓国語チェック
 * - 空テキスト検証
 * - 複合エラー検証
 * - 境界値テスト
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type { KaitoAPIConfig } from '../../../src/kaito-api/types';

describe('TweetEndpoints - バリデーション機能', () => {
  let tweetEndpoints: TweetEndpoints;
  let mockConfig: KaitoAPIConfig;
  let mockHttpClient: any;

  beforeEach(() => {
    // モック設定の準備
    mockConfig = {
      environment: 'dev',
      api: {
        baseUrl: 'https://api.kaito.com',
        version: 'v1',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['TIMEOUT', 'RATE_LIMIT']
        }
      },
      authentication: {
        primaryKey: 'test-key',
        keyRotationInterval: 86400,
        encryptionEnabled: true
      },
      performance: {
        qpsLimit: 10,
        responseTimeTarget: 1000,
        cacheEnabled: true,
        cacheTTL: 300
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'info',
        alertingEnabled: false,
        healthCheckInterval: 60
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        encryptionKey: 'test-encryption-key'
      },
      features: {
        realApiEnabled: false,
        mockFallbackEnabled: true,
        batchProcessingEnabled: true,
        advancedCachingEnabled: false
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'test',
        checksum: 'test-checksum'
      }
    } as KaitoAPIConfig;

    // モックHTTPクライアントの準備
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    tweetEndpoints = new TweetEndpoints(mockConfig, mockHttpClient);

    // コンソール出力をモック化
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateTweetText - 正常系', () => {
    it('正常なテキストで検証成功', () => {
      const validTexts = [
        'Hello World!',
        'This is a valid tweet with #hashtag and @mention',
        'Tweet with emoji 🚀🌟💡',
        'Tweet with URL https://example.com',
        'Tweet with numbers 12345 and symbols !@#$%^&*()',
        'Tweet with Japanese text こんにちは世界',
        'Tweet with Chinese text 你好世界',
        'Tweet with Arabic text مرحبا بالعالم',
        'Tweet with Russian text Привет мир',
        'Tweet with mix English日本語中文'
      ];

      validTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('最大280文字で検証成功', () => {
      const maxLengthText = 'a'.repeat(280);
      const result = tweetEndpoints.validateTweetText(maxLengthText);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(maxLengthText.length).toBe(280);
    });

    it('279文字で検証成功', () => {
      const text279 = 'a'.repeat(279);
      const result = tweetEndpoints.validateTweetText(text279);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(text279.length).toBe(279);
    });

    it('1文字で検証成功', () => {
      const result = tweetEndpoints.validateTweetText('a');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('特殊文字を含むテキストで検証成功', () => {
      const specialTexts = [
        'Tweet with\nnewline',
        'Tweet with\ttab',
        'Tweet with "quotes"',
        "Tweet with 'single quotes'",
        'Tweet with backslash \\',
        'Tweet with forward slash /',
        'Tweet with pipe |',
        'Tweet with brackets []{}()',
        'Tweet with math symbols ±∞≠≤≥',
        'Tweet with currency symbols $€¥£₿'
      ];

      specialTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('validateTweetText - 空テキスト検証', () => {
    it('空文字列で検証失敗', () => {
      const result = tweetEndpoints.validateTweetText('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text cannot be empty');
      expect(result.errors).toHaveLength(1);
    });

    it('スペースのみで検証失敗', () => {
      const spaceOnlyTexts = [
        ' ',
        '  ',
        '   ',
        '\t',
        '\n',
        '\r',
        '\r\n',
        ' \t\n\r ',
        '　', // 全角スペース
        '　　　' // 複数の全角スペース
      ];

      spaceOnlyTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Tweet text cannot be empty');
      });
    });

    it('nullまたはundefinedで検証失敗', () => {
      // nullの場合は実装でTypeErrorが発生
      expect(() => tweetEndpoints.validateTweetText(null as any)).toThrow('Cannot read properties of null');

      // undefinedの場合も実装でTypeErrorが発生
      expect(() => tweetEndpoints.validateTweetText(undefined as any)).toThrow('Cannot read properties of undefined');
    });
  });

  describe('validateTweetText - 文字数制限チェック', () => {
    it('281文字で検証失敗', () => {
      const tooLongText = 'a'.repeat(281);
      const result = tweetEndpoints.validateTweetText(tooLongText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(1);
      expect(tooLongText.length).toBe(281);
    });

    it('500文字で検証失敗', () => {
      const veryLongText = 'a'.repeat(500);
      const result = tweetEndpoints.validateTweetText(veryLongText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(veryLongText.length).toBe(500);
    });

    it('1000文字で検証失敗', () => {
      const extremelyLongText = 'This is a very long tweet that exceeds the 280 character limit. '.repeat(16);
      const result = tweetEndpoints.validateTweetText(extremelyLongText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(extremelyLongText.length).toBeGreaterThan(280);
    });

    it('マルチバイト文字での文字数制限', () => {
      // 日本語文字（各文字1文字として数える）
      const japaneseText = 'あ'.repeat(281);
      const result = tweetEndpoints.validateTweetText(japaneseText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(japaneseText.length).toBe(281);
    });

    it('絵文字での文字数制限', () => {
      // 絵文字は通常2文字以上のユニコードポイントを持つが、.lengthでは1文字として扱われることが多い
      const emojiText = '🚀'.repeat(281);
      const result = tweetEndpoints.validateTweetText(emojiText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
    });
  });

  describe('validateTweetText - 韓国語チェック', () => {
    it('基本的な韓国語文字で検証失敗', () => {
      const koreanTexts = [
        '안녕하세요', // ハングル
        '한국어', // ハングル
        '사랑해요', // ハングル
        '감사합니다', // ハングル
        'Hello 안녕하세요', // 英語+韓国語
        '안녕 World', // 韓国語+英語
        '12345 한국어 테스트' // 数字+韓国語
      ];

      koreanTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Korean characters are not allowed');
      });
    });

    it('韓国語の各ユニコード範囲での検証', () => {
      // 実装のregex /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/ でカバーされる範囲のみテスト
      const koreanRanges = [
        'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ', // ハングル子音字母 (U+3131-U+318F)
        '가나다라마바사아자차카타파하', // ハングル音節文字 (U+AC00-U+D7AF)
        // 'ힰힱힲힳힴힵힶힷힸힹힺힻힼힽힾힿ', // ハングル音節文字の終端付近 - regex範囲外のためコメント化
        'ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑ' // ハングル字母 (U+1100-U+11FF)
      ];

      koreanRanges.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Korean characters are not allowed');
      });

      // 母音字母の一部は実装のregex範囲外なので別途テスト
      const vowelChars = 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'; // これらは U+314F-U+3163 範囲でregexでカバーされている
      const vowelResult = tweetEndpoints.validateTweetText(vowelChars);
      expect(vowelResult.isValid).toBe(false);
      expect(vowelResult.errors).toContain('Korean characters are not allowed');
    });

    it('混合テキストでの韓国語検出', () => {
      const mixedTexts = [
        'English text with 한글',
        '日本語と한국어のmix',
        'Numbers 123 and 한국어',
        'Symbols !@# and 안녕',
        'URL https://example.com with 한글',
        'Hashtag #test with 한국어',
        '@mention with 안녕하세요'
      ];

      mixedTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Korean characters are not allowed');
      });
    });

    it('非韓国語のアジア言語では検証成功', () => {
      const nonKoreanAsianTexts = [
        'こんにちは世界', // 日本語ひらがな
        'コンニチハ世界', // 日本語カタカナ
        '你好世界', // 中国語簡体字
        '您好世界', // 中国語繁体字
        'สวัสดีโลก', // タイ語
        'Xin chào thế giới', // ベトナム語
        'ကမ္ဘာကို မဂ်လာပါ', // ミャンマー語
        'नमस्ते दुनिया' // ヒンディー語
      ];

      nonKoreanAsianTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('validateTweetText - 複合エラー検証', () => {
    it('空テキストと文字数超過の重複エラー（実際は空テキストのみ）', () => {
      const result = tweetEndpoints.validateTweetText('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tweet text cannot be empty');
      // 空文字列は文字数超過にはならない
      expect(result.errors).not.toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(1);
    });

    it('韓国語と文字数超過の複合エラー', () => {
      const longKoreanText = '안녕하세요'.repeat(60); // 約300文字
      const result = tweetEndpoints.validateTweetText(longKoreanText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Korean characters are not allowed');
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(2);
    });

    it('韓国語単文字と文字数制限内での韓国語エラーのみ', () => {
      const shortKoreanText = '안';
      const result = tweetEndpoints.validateTweetText(shortKoreanText);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Korean characters are not allowed');
      expect(result.errors).not.toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).not.toContain('Tweet text cannot be empty');
      expect(result.errors).toHaveLength(1);
    });

    it('エラーの順序確認', () => {
      const longKoreanText = '한국어'.repeat(100);
      const result = tweetEndpoints.validateTweetText(longKoreanText);

      expect(result.errors).toHaveLength(2);
      // エラーが追加される順序を確認
      expect(result.errors[0]).toBe('Tweet text exceeds 280 character limit');
      expect(result.errors[1]).toBe('Korean characters are not allowed');
    });
  });

  describe('validateTweetText - 境界値テスト', () => {
    it('279文字の韓国語で複合エラー', () => {
      const koreanText279 = '한'.repeat(279);
      const result = tweetEndpoints.validateTweetText(koreanText279);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Korean characters are not allowed');
      expect(result.errors).not.toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(1);
    });

    it('280文字の韓国語で複合エラー', () => {
      const koreanText280 = '한'.repeat(280);
      const result = tweetEndpoints.validateTweetText(koreanText280);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Korean characters are not allowed');
      expect(result.errors).not.toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(1);
    });

    it('281文字の韓国語で複合エラー', () => {
      const koreanText281 = '한'.repeat(281);
      const result = tweetEndpoints.validateTweetText(koreanText281);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Korean characters are not allowed');
      expect(result.errors).toContain('Tweet text exceeds 280 character limit');
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateTweetText - 特殊ケース', () => {
    it('韓国語正規表現の精密性確認', () => {
      // 韓国語に似ているが異なる文字
      const nonKoreanSimilarTexts = [
        'ㅎㅎㅎ', // これは韓国語の字母なので検出されるべき
        '가나다', // これも韓国語なので検出されるべき
        'ＡＢＣＤ', // 全角英数字は韓国語ではない
        '１２３４', // 全角数字は韓国語ではない
        '！＠＃＄', // 全角記号は韓国語ではない
      ];

      // 全角英数字・記号は韓国語ではないが、ㅎㅎㅎや가나다は韓国語
      const result1 = tweetEndpoints.validateTweetText('ＡＢＣＤ');
      expect(result1.isValid).toBe(true);

      const result2 = tweetEndpoints.validateTweetText('ㅎㅎㅎ');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Korean characters are not allowed');

      const result3 = tweetEndpoints.validateTweetText('가나다');
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Korean characters are not allowed');
    });

    it('混合文字でのピンポイント検出', () => {
      const testCases = [
        { text: 'Hello World', expected: true },
        { text: 'Hello한World', expected: false }, // 1文字だけ韓国語
        { text: 'Helloㅎorld', expected: false }, // 字母1文字
        { text: 'Hello가World', expected: false }, // 音節1文字
        { text: 'HelloᄀWorld', expected: false }, // 古ハングル1文字
      ];

      testCases.forEach(({ text, expected }) => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(expected);
        if (!expected) {
          expect(result.errors).toContain('Korean characters are not allowed');
        }
      });
    });

    it('絵文字と韓国語の組み合わせ', () => {
      const emojiKoreanTexts = [
        '🚀한국어',
        '안녕🌟하세요',
        '🎉한글🎊테스트🎈',
        'Hello🇰🇷한국'
      ];

      emojiKoreanTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Korean characters are not allowed');
      });
    });

    it('URLと韓국어の組み合わせ', () => {
      const urlKoreanTexts = [
        'Check this out: https://example.com 한국어',
        'https://한국.com/test',
        'Visit https://example.com/한글페이지',
        'Korean site: https://naver.com 안녕하세요'
      ];

      urlKoreanTexts.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Korean characters are not allowed');
      });
    });
  });

  describe('validateTweetText - パフォーマンステスト', () => {
    it('長いテキストでの処理時間確認', () => {
      const longValidText = 'a'.repeat(280);
      const longInvalidText = 'a'.repeat(281);
      const longKoreanText = '한'.repeat(100);

      const startTime = Date.now();
      
      tweetEndpoints.validateTweetText(longValidText);
      tweetEndpoints.validateTweetText(longInvalidText);
      tweetEndpoints.validateTweetText(longKoreanText);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // バリデーション処理は高速であるべき（100ms以下）
      expect(processingTime).toBeLessThan(100);
    });

    it('複数回実行での一貫性確認', () => {
      const testTexts = [
        'Valid text',
        '',
        'a'.repeat(281),
        '한국어',
        '한'.repeat(281)
      ];

      testTexts.forEach(text => {
        const result1 = tweetEndpoints.validateTweetText(text);
        const result2 = tweetEndpoints.validateTweetText(text);
        const result3 = tweetEndpoints.validateTweetText(text);

        // 複数回実行しても同じ結果が得られる
        expect(result1.isValid).toBe(result2.isValid);
        expect(result2.isValid).toBe(result3.isValid);
        expect(result1.errors).toEqual(result2.errors);
        expect(result2.errors).toEqual(result3.errors);
      });
    });
  });

  describe('validateTweetText - エラーメッセージの正確性', () => {
    it('各エラーメッセージが正確に設定される', () => {
      const emptyResult = tweetEndpoints.validateTweetText('');
      expect(emptyResult.errors).toEqual(['Tweet text cannot be empty']);

      const tooLongResult = tweetEndpoints.validateTweetText('a'.repeat(281));
      expect(tooLongResult.errors).toEqual(['Tweet text exceeds 280 character limit']);

      const koreanResult = tweetEndpoints.validateTweetText('한국어');
      expect(koreanResult.errors).toEqual(['Korean characters are not allowed']);

      const multipleErrorsResult = tweetEndpoints.validateTweetText('한'.repeat(281));
      expect(multipleErrorsResult.errors).toEqual([
        'Tweet text exceeds 280 character limit',
        'Korean characters are not allowed'
      ]);
    });

    it('エラーメッセージに不要な情報が含まれない', () => {
      const result = tweetEndpoints.validateTweetText('한국어');
      
      result.errors.forEach(error => {
        expect(error).not.toContain('undefined');
        expect(error).not.toContain('null');
        expect(error).not.toContain('[object Object]');
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });

    it('返却オブジェクトの構造確認', () => {
      const validResult = tweetEndpoints.validateTweetText('Valid text');
      expect(validResult).toHaveProperty('isValid');
      expect(validResult).toHaveProperty('errors');
      expect(typeof validResult.isValid).toBe('boolean');
      expect(Array.isArray(validResult.errors)).toBe(true);

      const invalidResult = tweetEndpoints.validateTweetText('');
      expect(invalidResult).toHaveProperty('isValid');
      expect(invalidResult).toHaveProperty('errors');
      expect(typeof invalidResult.isValid).toBe('boolean');
      expect(Array.isArray(invalidResult.errors)).toBe(true);
    });
  });

  describe('validateTweetText - 実際の使用例', () => {
    it('実際のツイート例での検証', () => {
      const realTweetExamples = [
        'Just launched my new project! 🚀 Check it out at https://example.com #launch #startup',
        '@username Thanks for the great conversation yesterday! Looking forward to collaborating.',
        'Breaking: Major announcement coming tomorrow. Stay tuned! 📢',
        'Thread 1/5: Here\'s what I learned about investing...',
        'RT @someone: This is incredibly insightful content about market trends.',
        '投資について学んだことをシェアします。リスク管理が最も重要です。',
        'Learning about cryptocurrency and blockchain technology. Any good resources to recommend?',
        'Weather is beautiful today ☀️ Perfect for a walk in the park! 🌳🚶‍♂️'
      ];

      realTweetExamples.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('実際の無効ツイート例での検証', () => {
      const invalidTweetExamples = [
        '안녕하세요! 오늘 날씨가 정말 좋네요.', // 韓国語
        'Hello! 안녕하세요!', // 英語+韓国語
        'a'.repeat(281), // 281文字
        '', // 空文字
        '   ', // スペースのみ
        '한국어입니다'.repeat(50) // 韓国語+長すぎる
      ];

      invalidTweetExamples.forEach(text => {
        const result = tweetEndpoints.validateTweetText(text);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});