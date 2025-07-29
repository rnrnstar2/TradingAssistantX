# TASK-002: KaitoAPI Utils テストカバレッジとドキュメント充実

## 概要
src/kaito-api/utils/の各ユーティリティに対する包括的なテストを実装し、ドキュメントを最新化する。

## 背景
現在のutilsディレクトリは機能的には完成しているが、以下の点で改善が必要：
- テストカバレッジが不十分な可能性
- エッジケースのテストが不足
- JSDOCコメントの充実化が必要

## 実装対象

### 1. テストファイルの作成
以下のテストファイルを`/tests/kaito-api/utils/`に作成：
- `response-handler.test.ts`
- `validator.test.ts`
- `normalizer.test.ts`
- `type-checker.test.ts`

### 2. response-handler.test.ts の実装
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ResponseHandler, createEducationalResponseHandler } from '@/kaito-api/utils/response-handler';
import { RateLimitError, NetworkError } from '@/kaito-api/utils/errors';

describe('ResponseHandler', () => {
  describe('handleResponse', () => {
    it('成功レスポンスを正しく処理する', async () => {
      // テスト実装
    });
    
    it('レート制限エラーを適切に処理する', async () => {
      // 429エラーのテスト
    });
    
    it('ネットワークエラーをリトライする', async () => {
      // リトライロジックのテスト
    });
    
    it('教育システム向け安全チェックが機能する', async () => {
      // 禁止コンテンツの検出テスト
    });
  });
  
  describe('executeWithRetry', () => {
    it('指定回数リトライする', async () => {
      // リトライ回数のテスト
    });
    
    it('バックオフが正しく動作する', async () => {
      // 待機時間の増加テスト
    });
  });
  
  describe('respectRateLimit', () => {
    it('レート制限に従って待機する', async () => {
      // 待機動作のテスト
    });
  });
});
```

### 3. validator.test.ts の実装
```typescript
describe('Validator', () => {
  describe('validateTwitterUserId', () => {
    it('有効なユーザーIDを受け入れる', () => {
      // 1-20桁の数値文字列
    });
    
    it('無効なユーザーIDを拒否する', () => {
      // 文字を含む、長すぎる等
    });
  });
  
  describe('performSecurityCheck', () => {
    it('SQLインジェクションを検出する', () => {
      // SQLパターンのテスト
    });
    
    it('XSS攻撃を検出する', () => {
      // スクリプトタグ等のテスト
    });
    
    it('韓国語コンテンツを検出する', () => {
      // 禁止コンテンツのテスト
    });
  });
  
  describe('validateTwitterLimits', () => {
    it('各制限値を正しく検証する', () => {
      // tweet_length, max_results等のテスト
    });
  });
});
```

### 4. normalizer.test.ts の実装
```typescript
describe('Normalizer', () => {
  describe('normalizeTweetData', () => {
    it('TwitterAPI.ioレスポンスを正規化する', () => {
      // 実際のAPIレスポンス形式でテスト
    });
    
    it('不完全なデータを適切に処理する', () => {
      // 欠損フィールドのテスト
    });
    
    it('異なる形式のタイムスタンプを統一する', () => {
      // Unix timestamp, ISO 8601等
    });
  });
  
  describe('normalizeUrl', () => {
    it('相対URLを絶対URLに変換する', () => {
      // //example.com, /path等のテスト
    });
    
    it('不正なURLを空文字列にする', () => {
      // javascript:, data:等のテスト
    });
  });
  
  describe('sanitizeText', () => {
    it('制御文字を除去する', () => {
      // \x00-\x1F等のテスト
    });
    
    it('HTMLタグを除去する', () => {
      // <script>等のテスト
    });
  });
});
```

### 5. type-checker.test.ts の実装
```typescript
describe('TwitterAPITypeChecker', () => {
  describe('validateTweetData', () => {
    it('有効なツイートデータを検証する', () => {
      // 完全なTweetDataオブジェクトのテスト
    });
    
    it('不完全なデータを拒否する', () => {
      // 必須フィールド欠損のテスト
    });
  });
  
  describe('validateResponse', () => {
    it('配列レスポンスを検証する', () => {
      // data: TweetData[]形式のテスト
    });
    
    it('単一レスポンスを検証する', () => {
      // data: TweetData形式のテスト
    });
  });
});
```

### 6. ドキュメント更新
各ファイルのJSDOCコメントを充実させる：

```typescript
/**
 * TwitterAPI.io レスポンス処理ハンドラー
 * 
 * @description
 * TwitterAPI.ioからのレスポンスを安全に処理し、エラーハンドリング、
 * リトライ、レート制限遵守を提供します。
 * 
 * @example
 * ```typescript
 * const handler = new ResponseHandler();
 * const response = await handler.handleResponse(
 *   apiCall(),
 *   { endpoint: '/twitter/user/info', method: 'GET' }
 * );
 * ```
 * 
 * @see {@link https://docs.twitterapi.io} TwitterAPI.io公式ドキュメント
 */
```

## テスト要件
- カバレッジ90%以上を目指す
- エッジケースを網羅
- エラーケースを重点的にテスト
- 非同期処理のテストを適切に実装

## ドキュメント要件
- すべての公開関数にJSDOCコメント
- @param, @returns, @throws を明記
- 使用例（@example）を含める
- 関連リンク（@see）を追加

## 完了条件
- [ ] 4つのテストファイルの作成
- [ ] 各ファイル90%以上のカバレッジ
- [ ] エッジケースのテスト実装
- [ ] JSDOCコメントの充実
- [ ] すべてのテストがパス
- [ ] テストの実行時間が適切（各ファイル5秒以内）

## 参考資料
- `/tests/test-utils/` - テストユーティリティ
- `/vitest.config.ts` - Vitest設定
- TwitterAPI.io実際のレスポンス例