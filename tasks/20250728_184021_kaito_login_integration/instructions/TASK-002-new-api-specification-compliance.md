# TASK-002: 新API仕様対応（user_login_v2, create_tweet_v2）

## 🎯 タスク概要
- **担当**: Worker2
- **フェーズ**: Phase 1（並列実行 - Worker1と同時実行）
- **優先度**: CRITICAL
- **期限**: 即座に実行

## 🚨 API仕様不一致問題
現在の実装と必要な仕様の不一致：

### 現在の実装（❌ 古い仕様）
```typescript
// src/kaito-api/core/auth-manager.ts:92
endpoint: 'https://api.twitterapi.io/v1/user/login'

// src/kaito-api/endpoints/action-endpoints.ts:39
createTweet: '/twitter/tweet/create'
```

### 必要な仕様（✅ 新仕様）
```
ログイン: POST /twitter/user_login_v2
投稿: POST /twitter/create_tweet_v2
```

## 📚 参考資料
- **ログインAPI**: https://docs.twitterapi.io/api-reference/endpoint/user_login_v2
- **投稿API**: https://docs.twitterapi.io/api-reference/endpoint/create_tweet_v2
- **要件書**: REQUIREMENTS.md

## 🔧 実装要件

### Phase 2-A: ログインエンドポイント更新

#### 現在のauth-manager.ts修正
```typescript
// ❌ 修正前
async login(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await fetch('https://api.twitterapi.io/v1/user/login', {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify({
      username: credentials.user_name,
      email: credentials.email,
      password: credentials.password,
      totp_code: credentials.totp_secret,
      proxy: credentials.proxy
    })
  });
}

// ✅ 修正後 - user_login_v2対応
async login(): Promise<LoginResult> {
  const response = await fetch('https://api.twitterapi.io/twitter/user_login_v2', {
    method: 'POST',
    headers: {
      'x-api-key': this.apiKey,  // ヘッダー修正も含む
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: process.env.X_USERNAME,
      email: process.env.X_EMAIL,
      password: process.env.X_PASSWORD,
      proxy: process.env.X_PROXY
    })
  });
  
  const result = await response.json();
  
  // login_cookie取得・保存
  if (result.success && result.login_cookie) {
    this.userSession = result.login_cookie;
    return {
      success: true,
      login_cookie: result.login_cookie,
      session_expires: Date.now() + (24 * 60 * 60 * 1000)
    };
  }
  
  throw new Error(`Login failed: ${result.error}`);
}
```

### Phase 2-B: 投稿エンドポイント更新

#### action-endpoints.ts修正
```typescript
// ❌ 修正前
private readonly ENDPOINTS = {
  createTweet: '/twitter/tweet/create',  // 古い仕様
  // ...
} as const;

// ✅ 修正後
private readonly ENDPOINTS = {
  createTweet: '/twitter/create_tweet_v2',  // 新仕様
  // ...
} as const;

// ✅ 投稿時のlogin_cookie使用
async createPost(request: PostRequest): Promise<PostResponse> {
  const response = await this.httpClient.post<TwitterAPITweetResponse>(
    this.ENDPOINTS.createTweet,
    {
      text: sanitizedContent,
      login_cookie: this.authManager.getUserSession(),  // 追加
      ...(request.mediaIds && { media_ids: request.mediaIds })
    }
  );
}
```

### Phase 2-C: レスポンス形式対応

#### 新API仕様のレスポンス処理
```typescript
// create_tweet_v2のレスポンス処理
interface CreateTweetV2Response {
  success: boolean;
  data?: {
    id: string;
    text: string;
    created_at: string;
  };
  error?: string;
}

// user_login_v2のレスポンス処理
interface UserLoginV2Response {
  success: boolean;
  login_cookie?: string;
  error?: string;
  user_info?: {
    id: string;
    username: string;
  };
}
```

## 📋 実装ステップ

### Step 1: auth-manager.ts API更新
1. エンドポイントを`/twitter/user_login_v2`に変更
2. レスポンス形式を新仕様に対応
3. `login_cookie`の適切な保存・管理

### Step 2: action-endpoints.ts API更新
1. エンドポイントを`/twitter/create_tweet_v2`に変更
2. 投稿時の`login_cookie`パラメータ追加
3. 新仕様レスポンス形式への対応

### Step 3: 型定義更新
1. `LoginResult`型に`login_cookie`追加
2. `PostRequest`型に`login_cookie`オプション追加
3. 新API仕様に合わせた型定義追加

### Step 4: エラーハンドリング強化
1. 新API仕様のエラーレスポンス対応
2. 認証失敗時の適切なエラーメッセージ
3. `login_cookie`期限切れ対応

## ✅ 完了条件
- [ ] auth-manager.tsが`user_login_v2`を使用
- [ ] action-endpoints.tsが`create_tweet_v2`を使用
- [ ] `login_cookie`が適切に管理される
- [ ] 新API仕様のレスポンス形式に対応
- [ ] TypeScriptコンパイルエラーなし
- [ ] npm run lint 通過

## 🚫 制約・注意事項
- **API仕様準拠**: 公式ドキュメントの仕様に厳密に従う
- **下位互換性**: 既存のテストが動作するよう配慮
- **セキュリティ**: `login_cookie`の適切な管理
- **MVP制約**: 最小限の実装のみ

## ⚠️ 重要な依存関係
- **TASK-001**: 環境変数設定完了後に連携テスト
- **後続フェーズ**: メインワークフローへの統合で使用

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- 変更したAPI仕様の詳細
- `login_cookie`管理システムの実装内容
- 新旧API仕様の比較表
- 動作確認結果

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-002-new-api-specification-compliance.md`
- 実装ログ: `tasks/20250728_184021_kaito_login_integration/outputs/`配下

## 🔄 並列実行の調整
- **Worker1 (TASK-001)**: 環境変数・認証システム基盤
- **Worker2 (TASK-002)**: API仕様・エンドポイント更新
- **統合ポイント**: Phase 2でlogin_cookieを使用した統合テスト