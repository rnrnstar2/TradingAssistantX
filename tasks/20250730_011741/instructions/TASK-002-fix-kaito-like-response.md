# TASK-002: KaitoAPI likeメソッドのレスポンスハンドリング修正

## 📋 タスク概要
`src/kaito-api/core/client.ts`の`executeRealLike`メソッドでレスポンスハンドリングエラーが発生。TwitterAPIのレスポンス形式に合わせた修正が必要

## 🎯 現状の問題
- **エラー箇所**: `client.ts:1651` - `response.data.liked`へのアクセス
- **エラー内容**: `TypeError: Cannot read properties of undefined (reading 'liked')`
- **原因**: TwitterAPIのlikeエンドポイントのレスポンスに`liked`プロパティが存在しない

## 📐 実装要件

### 1. executeRealLikeメソッドの修正（client.ts:1626-1653行目）

**修正内容**:
- レスポンスの`liked`プロパティへの直接アクセスを削除
- HTTPステータスコードで成功判定を行う
- エラーハンドリングの追加

### 2. 実装詳細

```typescript
private async executeRealLike(tweetId: string): Promise<LikeResult> {
  // Get login cookie from V2 authentication
  const loginCookie = await this.getOrCreateSession();
  
  // Get current proxy from AuthManager
  const currentProxy = this.authManager.getCurrentProxy();
  if (!currentProxy) {
    throw new Error('No available proxy for like');
  }
  
  const endpoint = String(this.endpoints.engagement.like);
  const postData = {
    tweet_id: tweetId,
    cookie: loginCookie,
    proxy: currentProxy
  };
  
  try {
    const response = await this.httpClient!.post<TwitterAPIResponse<any>>(
      endpoint, 
      postData
    );
    
    // TwitterAPIのいいねエンドポイントは成功時に200を返すが、
    // レスポンスボディの構造は変動する可能性がある
    // ステータスコードで成功判定を行う
    const success = response.status === 200 || response.status === 201;
    
    // レスポンスデータの存在確認
    if (!success && response.data) {
      console.warn('⚠️ いいね失敗:', response.data);
    }
    
    return {
      tweetId,
      timestamp: new Date().toISOString(),
      success: success,
    };
  } catch (error: any) {
    // HTTPエラーレスポンスのハンドリング
    if (error.response) {
      // 既にいいね済みの場合は成功として扱う
      if (error.response.status === 409 || 
          (error.response.data && error.response.data.message && 
           error.response.data.message.includes('already liked'))) {
        return {
          tweetId,
          timestamp: new Date().toISOString(),
          success: true,
        };
      }
    }
    throw error;
  }
}
```

### 3. 関連箇所の確認

`like`メソッド（943行目周辺）のエラーハンドリングも確認し、必要に応じて調整:

```typescript
async like(tweetId: string): Promise<LikeResult> {
  try {
    await this.ensureAuthenticated();
    await this.qpsController.enforceQPS();
    await this.enforceRateLimit("general");
    
    console.log(`❤️ いいね実行中...`, { tweetId });
    
    return await retryWithExponentialBackoff(
      async () => await this.executeRealLike(tweetId),
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        shouldRetry: (error: any) => {
          // 既にいいね済みエラーはリトライしない
          if (error.response?.status === 409) {
            return false;
          }
          return this.shouldRetryError(error);
        }
      }
    );
  } catch (error: any) {
    console.error(`❌ likeでエラー:`, error);
    throw this.handleApiError(error, "like");
  }
}
```

## ⚠️ 制約事項

### MVP制約
- **シンプル実装**: ステータスコードベースの成功判定
- **エラーハンドリング**: 基本的なtry-catch実装
- **ログ出力**: デバッグ用の最小限のログのみ

### 技術制約
- TypeScript strictモード準拠
- 既存のhttpClientインターフェース使用
- 既存のエラーハンドリングパターンに従う

## ✅ 完了条件
1. `pnpm dev:like`が正常に実行される
2. いいねが実際にTwitterに反映される
3. TypeScriptエラーがない
4. 「Cannot read properties of undefined」エラーが解消される

## 📝 報告書作成時の確認事項
- 修正前後のエラーメッセージの変化
- いいね実行の成功確認（TwitterAPIのレスポンス）
- HTTPステータスコードの確認
- 実装したコードの行数と変更内容