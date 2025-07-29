# TASK-001: TwitterAPI.io 3層認証コア実装

## 🎯 タスク概要

TwitterAPI.ioの3つの認証レベル（APIキー・V1ログイン・V2ログイン）に対応した認証コアシステムを実装します。既存のauth-manager.tsをリファクタリングし、認証レベル別の専用クラスに分離します。

## 📋 実装要件

### 1. 新規認証クラス作成

#### A. APIキー認証専用クラス
**ファイル**: `src/kaito-api/core/api-key-auth.ts`
```typescript
export class APIKeyAuth {
  // APIキー認証のみ（読み取り専用操作）
  // - ヘッダー生成（x-api-key）
  // - 基本バリデーション
  // - 接続テスト機能
}
```

#### B. V1ログイン認証クラス（2段階）
**ファイル**: `src/kaito-api/core/v1-login-auth.ts`
```typescript
export class V1LoginAuth {
  // 2段階認証プロセス（非推奨）
  // Step 1: /twitter/login_by_email_or_username
  // Step 2: /twitter/login_by_2fa
  // - 2FAコード生成（TOTPシークレット使用）
  // - セッション管理（auth_session）
}
```

#### C. V2ログイン認証クラス（1段階）
**ファイル**: `src/kaito-api/core/v2-login-auth.ts`
```typescript
export class V2LoginAuth {
  // 1段階認証プロセス（推奨）
  // /twitter/user_login_v2
  // - ワンステップログイン
  // - セッション管理（login_cookie）
}
```

### 2. 統合認証マネージャー更新

**ファイル**: `src/kaito-api/core/auth-manager.ts`（既存をリファクタリング）
```typescript
export class AuthManager {
  private apiKeyAuth: APIKeyAuth;
  private v1LoginAuth: V1LoginAuth;
  private v2LoginAuth: V2LoginAuth;
  
  // 3層認証の統合管理
  // - 認証レベル自動判定
  // - エンドポイント別認証要件チェック
  // - 認証状態統合管理
}
```

## 🔧 技術仕様

### A. APIキー認証仕様
- **対象**: 読み取り系API（user/info、tweet/search、trends等）
- **認証方式**: x-api-key ヘッダー
- **エラーハンドリング**: 401/403 認証エラー対応
- **環境変数**: `KAITO_API_TOKEN`

### B. V1ログイン認証仕様（非推奨）
- **Step 1**: `/twitter/login_by_email_or_username`
  - 必要: username, password, proxy
  - 取得: login_data
- **Step 2**: `/twitter/login_by_2fa`
  - 必要: login_data, 2fa_code（TOTP生成）, proxy
  - 取得: auth_session
- **環境変数**: `X_USERNAME`, `X_PASSWORD`, `X_2FA_SECRET`, `X_PROXY`

### C. V2ログイン認証仕様（推奨）
- **エンドポイント**: `/twitter/user_login_v2`
- **必要**: username, email, password, totp_secret, proxy
- **取得**: login_cookie
- **環境変数**: `X_USERNAME`, `X_EMAIL`, `X_PASSWORD`, `X_2FA_SECRET`, `X_PROXY`

## 📂 既存コード活用指針

### 再利用対象
1. **auth-manager.ts**: 
   - V2ログイン実装（login()メソッド）→ V2LoginAuthに移行
   - セッション管理機能 → 統合AuthManagerに活用
   - 環境変数検証ロジック → 共通処理として活用

2. **client.ts**:
   - HTTPクライアント → 全認証クラスで共有
   - QPS制御 → 認証レベル問わず共通適用
   - エラーハンドリング → TwitterAPIErrorHandler再利用

3. **session-manager.ts**:
   - セッション永続化 → 認証レベル別セッション管理に拡張

### 新規実装対象
1. **TOTPコード生成機能**（V1/V2共通）
2. **2段階認証フロー**（V1専用）
3. **認証レベル別エンドポイント判定**
4. **認証要件自動判定システム**

## 🚨 重要制約

### MVP制約遵守
- **シンプル実装優先**: 過度な抽象化禁止
- **実用機能のみ**: 統計・分析機能は含めない
- **確実な動作**: 実API通信での動作確認必須

### 後方互換性
- **既存import保持**: main-workflows等の依存関係維持
- **インターフェース維持**: 既存メソッドシグネチャ保持
- **段階的移行**: 新旧システム並行動作

### セキュリティ
- **秘密情報保護**: APIキー・パスワード・2FAシークレット適切管理
- **入力サニタイゼーション**: 全入力値検証・クリーニング
- **エラー情報制限**: 機密情報をログに出力しない

## ✅ 完了基準

### 動作検証
1. **APIキー認証**: ユーザー情報取得・ツイート検索成功
2. **V1ログイン認証**: 2段階認証完了・投稿成功
3. **V2ログイン認証**: 1段階認証完了・投稿成功
4. **統合テスト**: 認証レベル自動切り替え動作

### コード品質
1. **TypeScript strict**: 厳密型チェック通過
2. **エラーハンドリング**: 全認証パターンの例外処理実装
3. **テストカバレッジ**: 各認証クラスの単体テスト作成
4. **ドキュメント**: 使用方法・設定手順の明記

### 統合確認
1. **既存システム動作**: main-workflows変更なしで動作
2. **import互換性**: 既存のimport文が正常動作
3. **パフォーマンス**: 認証オーバーヘッド最小化
4. **メモリ効率**: セッション管理の適切なメモリ使用

## 📋 出力先

- **実装ファイル**: `src/kaito-api/core/` 配下
- **テストファイル**: `tests/kaito-api/core/` 配下
- **報告書**: `tasks/20250728-1911/reports/REPORT-001-auth-core-3layer.md`

## ⚠️ 注意事項

1. **実API使用**: モックではなく実際のTwitterAPI.io使用
2. **認証情報**: 本物の認証情報での動作確認
3. **レート制限**: 200 QPS制限遵守
4. **コスト管理**: $0.15/1k tweets 監視継続

---

**重要**: このタスクは既存システムの根幹に関わる変更です。段階的な実装と十分なテストを行い、既存機能への影響を最小限に抑えてください。