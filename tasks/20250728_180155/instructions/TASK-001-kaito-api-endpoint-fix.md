# TASK-001: KaitoAPI エンドポイント修正

## 🎯 目的
KaitoTwitterAPIClientのハードコーディングされた古いエンドポイントを、config.tsに定義された正しいTwitterAPI.ioエンドポイントに修正する。

## 🚨 問題の概要
1. client.tsでは古い`/v1/`形式のエンドポイントがハードコーディングされている
2. config.tsには正しい`/twitter/`形式のエンドポイントが定義されている
3. getAccountInfoが存在しないエンドポイント`/v1/account/info`を使用して404エラー

## 📋 修正内容

### 1. KaitoTwitterAPIClientクラスのエンドポイント取得方法修正

**対象ファイル**: `src/kaito-api/core/client.ts`

#### A. configからエンドポイントを取得するように修正（line 606-626付近）

現在（削除）:
```typescript
// TwitterAPI.io エンドポイント定義
private readonly endpoints = {
  tweets: {
    create: '/v1/tweets',
    search: '/v1/tweets/search',
    get: '/v1/tweets/:id'
  },
  users: {
    info: '/v1/users/:username',
    search: '/v1/users/search'
  },
  actions: {
    like: '/v1/tweets/:id/like',
    retweet: '/v1/tweets/:id/retweet',
    quote: '/v1/tweets/quote'
  },
  auth: {
    verify: '/v1/auth/verify'
  },
  health: '/health'
};
```

修正後（追加）:
```typescript
// configからエンドポイントを取得
private get endpoints() {
  return this.apiConfig?.endpointConfig || {
    user: { info: '/twitter/user/info' },
    tweet: { create: '/twitter/tweet/create' },
    engagement: { like: '/twitter/action/like' },
    auth: { verify: '/twitter/user/info' },
    health: '/twitter/tweet/advanced_search'
  };
}
```

#### B. getAccountInfo メソッドの修正（line 948付近）

現在:
```typescript
return await this.httpClient!.get<TwitterAPIResponse<AccountInfo>>('/v1/account/info');
```

修正後:
```typescript
return await this.httpClient!.get<TwitterAPIResponse<AccountInfo>>(this.endpoints.user.info);
```

### 2. 他のメソッドでのエンドポイント使用箇所の修正

client.ts内で`this.endpoints`を使用している全ての箇所を確認し、以下のマッピングに従って修正：

- `this.endpoints.tweets.create` → `this.endpoints.tweet.create`
- `this.endpoints.tweets.search` → `this.endpoints.tweet.search`
- `this.endpoints.actions.like` → `this.endpoints.engagement.like`
- `this.endpoints.actions.retweet` → `this.endpoints.tweet.retweet`
- `this.endpoints.auth.verify` → `this.endpoints.auth.verify`（変更なし）

### 3. アカウント情報取得時のパラメータ確認

getAccountInfoメソッドで、必要に応じてuserNameパラメータを追加（TwitterAPI.ioの仕様による）:
```typescript
// 自分のアカウント情報を取得する場合でも、userNameが必要な可能性
const params = { userName: 'current_user' }; // または適切な値
return await this.httpClient!.get<TwitterAPIResponse<AccountInfo>>(
  this.endpoints.user.info,
  params
);
```

## 🔧 実装手順

1. **エンドポイント定義の削除**
   - ハードコーディングされたendpoints定義を削除
   
2. **動的エンドポイント取得の実装**
   - getterメソッドでconfigからエンドポイントを取得
   
3. **全メソッドの修正**
   - エンドポイント参照箇所を新しい構造に合わせて修正

4. **動作確認**
   - pnpm devでgetAccountInfoが正常に動作することを確認

## ✅ 完了条件

1. getAccountInfoの404エラーが解消される
2. 全てのAPIメソッドが正しいエンドポイントを使用する
3. config.tsのエンドポイント定義が正しく適用される

## 📌 注意事項

- エンドポイントの構造が変わるため、全ての参照箇所を慎重に確認すること
- TwitterAPI.ioの実際の仕様に合わせてパラメータも調整すること
- 既存のテストが失敗する可能性があるため、必要に応じて修正すること