# X API OAuth2 セキュリティ修正指示書

## 🚨 **緊急度: 高**

**Manager権限からWorkerへの作業指示**

## 📋 **問題分析完了**

### 確認された問題
1. **403エラー原因**: OAuth2トークンの期限切れまたは無効化
2. **セキュリティリスク**: 機密トークンがYAMLファイル平文保存
3. **設定不整合**: 環境変数優先設定がない

### 影響範囲
- X投稿機能完全停止（original_post/reply/quote_tweet全て失敗）
- セキュリティ上の機密情報露出リスク

## ⚡ **Worker実行タスク**

### Phase 1: 環境変数優先読み込み実装
**目標**: src/lib/x-client.ts修正

```typescript
// loadOAuth2Tokens()メソッド修正
private loadOAuth2Tokens(): void {
  try {
    // 1. 環境変数優先チェック
    if (process.env.X_OAUTH2_ACCESS_TOKEN && process.env.X_OAUTH2_REFRESH_TOKEN) {
      this.oauth2Tokens = {
        access_token: process.env.X_OAUTH2_ACCESS_TOKEN,
        refresh_token: process.env.X_OAUTH2_REFRESH_TOKEN,
        expires_at: parseInt(process.env.X_OAUTH2_EXPIRES_AT || '0'),
        token_type: 'bearer',
        scope: process.env.X_OAUTH2_SCOPES || 'tweet.write users.read offline.access'
      };
      console.log('✅ OAuth2 tokens loaded from environment variables');
      return;
    }
    
    // 2. フォールバック: YAMLファイル（警告付き）
    if (existsSync(this.oauth2TokensFile)) {
      const content = readFileSync(this.oauth2TokensFile, 'utf8');
      this.oauth2Tokens = yaml.load(content) as OAuth2Tokens;
      console.warn('⚠️ OAuth2 tokens loaded from YAML file - consider migrating to environment variables');
    }
  } catch (error) {
    console.error('Error loading OAuth 2.0 tokens:', error);
  }
}
```

### Phase 2: .env設定更新
**目標**: 現在のYAMLトークンを環境変数に移行

1. `data/oauth2-tokens.yaml`から現在のトークン値を読み取り
2. `.env`ファイルに追加:
```bash
# OAuth 2.0アクセストークン
X_OAUTH2_ACCESS_TOKEN=（YAMLから移行）
X_OAUTH2_REFRESH_TOKEN=（YAMLから移行）
X_OAUTH2_EXPIRES_AT=（YAMLから移行）
```

### Phase 3: セキュリティ強化
**目標**: YAMLファイル削除とgitignore追加

1. `data/oauth2-tokens.yaml`の安全な削除
2. `.gitignore`確認（.envファイルが除外されているか）
3. 環境変数設定確認スクリプト作成

### Phase 4: トークン再認証（必要に応じて）
**目標**: 期限切れトークンの再取得

期限切れの場合：
```bash
# 認証ヘルパー実行
pnpm tsx src/scripts/oauth2-auth-helper.ts
```

## 🔒 **セキュリティ要件**

1. **機密情報保護**: トークンは環境変数のみ
2. **ファイル削除**: YAMLトークンファイル完全削除
3. **検証確認**: 修正後403エラー解消確認

## ✅ **完了基準**

1. X投稿機能が正常動作（403エラー解消）
2. トークンが環境変数から読み込み
3. YAMLファイル削除済み
4. セキュリティテスト通過

## 📞 **報告要求**

各Phase完了時にManager権限に報告：
- 修正内容詳細
- テスト結果
- セキュリティ確認状況

**緊急度高 - 即座に実行開始してください**