# TASK-003: V1認証関連削除とV2標準化

## 概要
kaito-apiからV1認証関連のコードを削除し、V2認証を標準とする。
仕様書（docs/kaito-api.md）に従い、シンプルな2層構造を実現する。

## 要件定義書参照
- docs/kaito-api.md: 「V2ログイン認証（投稿・エンゲージメント）」セクション
- REQUIREMENTS.md: V2標準化方針

## 前提条件
- TASK-001（エンドポイント再構成）完了
- TASK-002（型定義統合）完了

## 削除対象

### 1. ファイル削除
```
src/kaito-api/
├── core/
│   └── v1-login-auth.ts  # 削除
├── endpoints/
│   └── v1-auth/         # ディレクトリごと削除
│       ├── engagement-v1.ts
│       ├── quote-tweet-v1.ts
│       └── tweet-actions-v1.ts
└── types/v1-auth-types.ts  # TASK-002で対応済み
```

### 2. AuthManagerからV1関連コード削除
`src/kaito-api/core/auth-manager.ts`から以下を削除・簡素化：
- V1LoginAuthのインポートと初期化
- v1SessionValid関連のプロパティ
- loginV1()メソッド
- V1/V2の切り替えロジック（V2固定化）
- preferredAuthMethodプロパティ（不要）
- V1フォールバック処理

### 3. 簡素化後のAuthManager構造
```typescript
export class AuthManager {
  private apiKeyAuth: APIKeyAuth;
  private v2LoginAuth: V2LoginAuth;
  private sessionManager: SessionManager;
  private currentAuthLevel: 'none' | 'api-key' | 'v2-login' = 'none';
  
  // V2のみのシンプルな実装
  async login(): Promise<LoginResult> {
    return await this.v2LoginAuth.login();
  }
  
  // 認証ヘッダー生成（V2優先）
  getAuthHeaders(): Record<string, string> {
    if (this.v2LoginAuth.isSessionValid()) {
      return this.v2LoginAuth.getAuthHeaders();
    }
    return this.apiKeyAuth.getAuthHeaders();
  }
}
```

## 実装手順

### 1. V1関連ファイルの削除
- `rm -rf src/kaito-api/endpoints/v1-auth/`
- `rm src/kaito-api/core/v1-login-auth.ts`

### 2. AuthManager簡素化
1. V1LoginAuthインポート削除
2. V1関連プロパティ・メソッド削除
3. login()メソッドをV2専用に簡素化
4. getAuthStatus()からV1関連情報削除
5. getDebugInfo()からV1関連情報削除

### 3. 影響箇所の確認と修正
- V1認証を参照している箇所を検索
- テストコードでV1を使用している場合は削除/修正
- ドキュメントの更新（必要な場合）

### 4. 動作確認
- TypeScriptコンパイル確認
- AuthManagerの基本動作確認
- V2認証フローの動作確認

## 技術的制約
- 既存のV2認証機能は維持
- APIキー認証（読み取り専用）は維持
- 後方互換性は考慮しない（V1は完全削除）

## 品質基準
- TypeScriptコンパイルエラーなし
- V1関連コードの完全削除
- AuthManagerがよりシンプルで理解しやすいこと
- V2認証が正常に動作すること

## 注意事項
- V1関連のテストコードも削除
- 環境変数でV1を参照している箇所があれば削除
- preferredAuthMethodの概念を完全に削除
- V2をデフォルトかつ唯一の認証方法とする

## 成果物
- V1関連ファイルの削除完了
- AuthManagerの簡素化完了
- 動作確認結果
- 報告書: `tasks/20250729_131524_kaito_api_restructure/reports/REPORT-003-v1-removal.md`