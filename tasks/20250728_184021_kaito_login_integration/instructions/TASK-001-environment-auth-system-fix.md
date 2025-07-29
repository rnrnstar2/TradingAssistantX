# TASK-001: 環境変数設定・認証システム修正

## 🎯 タスク概要
- **担当**: Worker1 
- **フェーズ**: Phase 1（並列実行）
- **優先度**: CRITICAL
- **期限**: 即座に実行

## 🚨 問題状況
現在、X投稿が一切実行されていない根本原因は：
1. **必須環境変数未設定**: X_USERNAME, X_PASSWORD, X_EMAIL, X_PROXY
2. **認証システムの仕様不一致**: 現在のauth-manager.tsが古いAPI仕様使用

## 🔧 実装要件

### Phase 1-A: 環境変数設定システム
```bash
# 必須環境変数（ユーザー提供済み）
export X_USERNAME=rnrnstar
export X_PASSWORD=Rinstar_520
export X_EMAIL=suzumura@rnrnstar.com
export X_PROXY=http://etilmzge:ina8vl2juf1w@23.95.150.145:6114
```

#### 環境変数管理要件
1. **設定方法確認**: .env ファイルまたはsystem environmentでの設定
2. **検証システム**: 起動時の環境変数存在確認
3. **エラーハンドリング**: 未設定時の明確なエラーメッセージ

### Phase 1-B: auth-manager.ts修正

#### 現在の問題点
```typescript
// ❌ 現在の実装 (src/kaito-api/core/auth-manager.ts:92)
async login(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await fetch('https://api.twitterapi.io/v1/user/login', {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify({
      username: credentials.user_name,  // ❌ 環境変数未使用
      email: credentials.email,         // ❌ 環境変数未使用
      password: credentials.password,   // ❌ 環境変数未使用
      totp_code: credentials.totp_secret,
      proxy: credentials.proxy          // ❌ 環境変数未使用
    })
  });
}
```

#### 必要な修正
```typescript
// ✅ 修正必要 - 環境変数統合
async login(): Promise<LoginResult> {
  // 環境変数から直接取得
  const credentials = {
    username: process.env.X_USERNAME,
    email: process.env.X_EMAIL,
    password: process.env.X_PASSWORD,
    proxy: process.env.X_PROXY
  };
  
  // 環境変数検証
  if (!credentials.username || !credentials.email || !credentials.password || !credentials.proxy) {
    throw new Error('必須環境変数未設定: X_USERNAME, X_EMAIL, X_PASSWORD, X_PROXY');
  }
  
  // API呼び出し実装...
}
```

### Phase 1-C: 認証ヘッダー修正

#### ヘッダー仕様確認
```typescript
// ❌ 現在 (auth-manager.ts:42)
getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${this.apiKey}`,  // ❌ Bearer Token形式
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// ✅ 修正候補 - docs/kaito-api.mdに従って
getAuthHeaders(): Record<string, string> {
  return {
    'x-api-key': this.apiKey,  // TwitterAPI.io形式
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}
```

## 📋 実装ステップ

### Step 1: 環境変数検証システム
1. `src/kaito-api/core/config.ts`での環境変数検証関数実装
2. 起動時検証システムの追加
3. エラーハンドリングの強化

### Step 2: auth-manager.ts リファクタリング
1. `login()`メソッドを環境変数直接使用に変更
2. 認証ヘッダー形式をTwitterAPI.io仕様に修正
3. エラーメッセージの改善

### Step 3: 型定義更新
1. `LoginCredentials`型の更新（環境変数対応）
2. `AuthStatus`型の拡張（環境変数検証ステータス）

## ✅ 完了条件
- [ ] 4つの環境変数がすべて設定され、検証される
- [ ] auth-manager.tsが環境変数を直接使用する
- [ ] 認証ヘッダーがTwitterAPI.io仕様に準拠
- [ ] エラーハンドリングが適切に実装される
- [ ] TypeScript コンパイルエラーなし
- [ ] npm run lint 通過

## 🚫 制約・注意事項
- **MVP制約遵守**: 最小限の実装のみ
- **過剰実装禁止**: 複雑な設定システムは実装しない
- **セキュリティ**: 環境変数の平文ログ出力禁止
- **テスト**: モック環境変数でのテスト実装

## ⚠️ 重要な依存関係
- **KAITO_API_TOKEN**: 既存環境変数、引き続き必要
- **後続タスク**: TASK-002（新API仕様対応）との連携必須

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- 実装した環境変数検証システムの詳細
- auth-manager.tsの変更内容
- 動作確認結果とテスト結果
- 次フェーズへの引き継ぎ事項

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-001-environment-auth-system-fix.md`
- 実装ログ: `tasks/20250728_184021_kaito_login_integration/outputs/`配下