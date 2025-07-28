# TASK-001: src/kaito-api/core/auth-manager.ts 実装

## 🎯 **タスク概要**

**対象ファイル**: 新規作成 `src/kaito-api/core/auth-manager.ts`
**出力先**: `src/kaito-api/core/`
**優先度**: 最高（他のタスクの前提条件）

KaitoAPI の2層認証システムを管理する AuthManager クラスを実装する。

## 📋 **実装要件**

### 🔐 **2層認証システム実装**

#### Layer 1: API Key Authentication
- **管理対象**: `X-API-Key` ヘッダー
- **適用範囲**: 全エンドポイント
- **設定ソース**: 環境変数 `KAITO_API_TOKEN`

#### Layer 2: User Session Authentication  
- **管理対象**: `auth_session` パラメータ
- **適用範囲**: ユーザーアクション系のみ
- **取得方法**: `user_login_v2` エンドポイント経由

### 🏗️ **クラス設計**

```typescript
export class AuthManager {
  // 基本認証情報管理
  private apiKey: string;
  private userSession: string | null = null;
  private sessionExpiry: number | null = null;
  
  // ログイン管理
  async login(credentials: LoginCredentials): Promise<LoginResult>
  async refreshSession(): Promise<boolean>
  async logout(): Promise<void>
  
  // 認証状態確認
  isApiKeyValid(): boolean
  isUserSessionValid(): boolean
  getAuthHeaders(): Record<string, string>
  getAuthParameters(): Record<string, any>
  
  // エンドポイント別認証チェック
  requiresUserSession(endpoint: string): boolean
  canAccessEndpoint(endpoint: string): boolean
}
```

### 📊 **型定義**

```typescript
interface LoginCredentials {
  user_name: string;
  email: string;
  password: string;
  totp_secret: string;
  proxy: string;
}

interface LoginResult {
  success: boolean;
  login_cookie?: string;
  session_expires?: number;
  error?: string;
}

interface AuthStatus {
  apiKeyValid: boolean;
  userSessionValid: boolean;
  sessionExpiry: number | null;
  canPerformUserActions: boolean;
}
```

## 🔧 **実装仕様**

### Phase 1: 基本認証管理
```typescript
export class AuthManager {
  private apiKey: string;
  private userSession: string | null = null;
  private sessionExpiry: number | null = null;
  
  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey || process.env.KAITO_API_TOKEN || '';
    if (!this.apiKey) {
      throw new Error('KAITO_API_TOKEN is required');
    }
  }
  
  // API Key認証ヘッダー生成
  getAuthHeaders(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }
  
  // User Session認証パラメータ生成
  getAuthParameters(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.userSession) {
      params.auth_session = this.userSession;
    }
    return params;
  }
}
```

### Phase 2: ユーザーセッション管理
```typescript
// ログイン実行
async login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const response = await fetch('https://api.twitterapi.io/user_login_v2', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials)
    });
    
    const result = await response.json();
    
    if (result.status === 'success' && result.login_cookie) {
      this.userSession = result.login_cookie;
      this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24時間
      
      return {
        success: true,
        login_cookie: result.login_cookie,
        session_expires: this.sessionExpiry
      };
    }
    
    return {
      success: false,
      error: result.msg || 'Login failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login error'
    };
  }
}

// セッション有効性確認
isUserSessionValid(): boolean {
  return this.userSession !== null && 
         this.sessionExpiry !== null && 
         Date.now() < this.sessionExpiry;
}
```

### Phase 3: エンドポイント別認証判定
```typescript
// エンドポイント別認証要件判定
requiresUserSession(endpoint: string): boolean {
  const userActionEndpoints = [
    '/tweets',           // 投稿作成
    '/like_tweet',       // いいね
    '/retweet',          // リツイート
    '/follow_user',      // フォロー
    '/unfollow_user',    // アンフォロー
    '/delete_tweet'      // ツイート削除
  ];
  
  return userActionEndpoints.some(action => endpoint.includes(action));
}

// エンドポイントアクセス可能性確認
canAccessEndpoint(endpoint: string): boolean {
  // API Key は常に必要
  if (!this.isApiKeyValid()) {
    return false;
  }
  
  // ユーザーアクション系の場合、User Session も必要
  if (this.requiresUserSession(endpoint)) {
    return this.isUserSessionValid();
  }
  
  return true;
}

// 統合認証状態取得
getAuthStatus(): AuthStatus {
  return {
    apiKeyValid: this.isApiKeyValid(),
    userSessionValid: this.isUserSessionValid(),
    sessionExpiry: this.sessionExpiry,
    canPerformUserActions: this.isApiKeyValid() && this.isUserSessionValid()
  };
}
```

## ⚠️ **重要な制約**

### MVP制約遵守
- **シンプル実装**: 複雑な認証フローは避ける
- **基本機能のみ**: 高度な認証機能（リフレッシュ等）は最小限
- **エラーハンドリング**: 基本的なtry-catch実装

### セキュリティ考慮
- **API Key保護**: 環境変数からの読み込み
- **セッション管理**: 適切な有効期限管理
- **ログ保護**: 認証情報をログに出力しない

### 統合要件
- **client.ts連携**: HttpClient での使用を想定
- **endpoints連携**: 各エンドポイントクラスでの使用
- **型安全性**: TypeScript strict mode 完全対応

## 📝 **実装ファイル**

### 必須ファイル
1. `src/kaito-api/core/auth-manager.ts` - メインクラス実装

### 型定義追加
2. `src/kaito-api/types.ts` への型定義追加:
   - `LoginCredentials`
   - `LoginResult` 
   - `AuthStatus`

### index.ts エクスポート追加
3. `src/kaito-api/index.ts` への export 追加

## 🎯 **完了判定基準**

- [ ] AuthManager クラスが完全に実装されている
- [ ] 2層認証（API Key + User Session）が正しく管理されている
- [ ] エンドポイント別認証要件判定が正確に動作する
- [ ] ログイン・ログアウト機能が実装されている
- [ ] 認証状態確認機能が実装されている
- [ ] TypeScript strict mode でコンパイルエラーなし
- [ ] 型定義が types.ts に適切に追加されている
- [ ] index.ts でエクスポートされている

**完了時は `tasks/20250724_213715_kaito_api_unittest/reports/REPORT-001-auth-manager-implementation.md` に報告書を作成してください。**