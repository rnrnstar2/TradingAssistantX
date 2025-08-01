# TASK-001: ツイートID一括取得エンドポイント実装

## 目的
KaitoAPIにツイートID一括取得機能（`getTweetsByIds`）を実装する。

## 背景
現在、単一のツイートIDでしか取得できない`getTweetById`しか実装されていない。MVPの投稿エンゲージメント分析機能のため、複数のツイートIDを一度に取得できる機能が必要。

## 実装要件

### 1. エンドポイント仕様
- **メソッド名**: `getTweetsByIds`
- **エンドポイント**: `/twitter/tweets`
- **パラメータ**: `tweet_ids` (カンマ区切りの文字列形式: "id1,id2,id3...")
- **最大ID数**: 100個まで
- **認証レベル**: APIキーのみ（読み取り専用）

### 2. 実装場所
**ファイル**: `/src/kaito-api/endpoints/read-only/tweet-search.ts`

### 3. 実装詳細

#### メソッドシグネチャ
```typescript
async getTweetsByIds(tweetIds: string[]): Promise<CompleteTweetBatchResponse>
```

#### レスポンス型定義（追加）
```typescript
interface TweetBatchResponse {
  success: true;
  data: {
    tweets: TweetData[];
    notFound: string[];  // 見つからなかったID
    errors: Array<{id: string; error: string}>;  // 個別エラー
  };
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

interface TweetBatchResponseError {
  success: false;
  error: SimpleTwitterAPIError;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

type CompleteTweetBatchResponse = TweetBatchResponse | TweetBatchResponseError;
```

#### 実装ロジック
1. 入力バリデーション
   - 配列が空でないこと
   - 各IDが数値文字列であること
   - 100個以下であること

2. APIリクエスト
   ```typescript
   const params = {
     tweet_ids: tweetIds.join(',')
   };
   
   const response = await this.httpClient.get<any>(
     '/twitter/tweets',
     params
   );
   ```

3. レスポンス処理
   - 各ツイートの正規化（既存の`normalizeTweetData`使用）
   - 見つからなかったIDの記録
   - エラー処理

#### エンドポイント定数追加
```typescript
private readonly ENDPOINTS = {
  // 既存のエンドポイント...
  getTweetsByIds: '/twitter/tweets'
} as const;
```

#### レート制限追加
```typescript
private readonly RATE_LIMITS = {
  // 既存のレート制限...
  getTweetsByIds: { limit: 300, window: 3600 } // 300/hour
} as const;
```

## 参照ドキュメント
- `docs/kaito-api.md` - KaitoAPI仕様書（ツイートID一括取得の仕様確認）
- `docs/directory-structure.md` - ディレクトリ構造（実装場所の確認）

## 品質要件
- TypeScript strictモード準拠
- 既存のエラーハンドリングパターンに従う
- APIキー認証チェックを含む
- 適切なバリデーションエラーメッセージ

## 注意事項
- 既存の`getTweetById`メソッドとの一貫性を保つ
- 同じ正規化ロジック（`normalizeTweetData`）を使用
- エラーハンドリングは既存パターンに従う
- 新しいモックデータは作成しない（本番API使用前提）

## 完了条件
- `getTweetsByIds`メソッドが実装されている
- 型定義が追加されている
- エンドポイント定数・レート制限が追加されている
- TypeScriptのコンパイルエラーがない