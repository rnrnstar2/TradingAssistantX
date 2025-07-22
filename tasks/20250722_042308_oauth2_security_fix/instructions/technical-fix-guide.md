# OAuth2 認証修正 技術ガイド

## 🎯 **修正対象ファイル**

### 1. src/lib/x-client.ts
**メソッド**: `loadOAuth2Tokens()` (688-697行)

**現在の実装**:
```typescript
private loadOAuth2Tokens(): void {
  try {
    if (existsSync(this.oauth2TokensFile)) {
      const content = readFileSync(this.oauth2TokensFile, 'utf8');
      this.oauth2Tokens = yaml.load(content) as OAuth2Tokens;
    }
  } catch (error) {
    console.error('Error loading OAuth 2.0 tokens:', error);
  }
}
```

**修正後実装**:
```typescript
private loadOAuth2Tokens(): void {
  try {
    // 優先度1: 環境変数からの読み込み
    const envAccessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
    const envRefreshToken = process.env.X_OAUTH2_REFRESH_TOKEN;
    
    if (envAccessToken) {
      this.oauth2Tokens = {
        access_token: envAccessToken,
        refresh_token: envRefreshToken || '',
        expires_at: parseInt(process.env.X_OAUTH2_EXPIRES_AT || '0') || (Date.now() + (2 * 60 * 60 * 1000)), // デフォルト2時間
        token_type: 'bearer',
        scope: process.env.X_OAUTH2_SCOPES || 'tweet.write users.read offline.access'
      };
      console.log('✅ [Security] OAuth2 tokens loaded from environment variables');
      return;
    }
    
    // 優先度2: YAMLファイル（警告付きフォールバック）
    if (existsSync(this.oauth2TokensFile)) {
      const content = readFileSync(this.oauth2TokensFile, 'utf8');
      this.oauth2Tokens = yaml.load(content) as OAuth2Tokens;
      console.warn('⚠️ [Security Warning] OAuth2 tokens loaded from YAML file');
      console.warn('   Recommendation: Move tokens to environment variables for better security');
    }
  } catch (error) {
    console.error('Error loading OAuth 2.0 tokens:', error);
  }
}
```

### 2. .env ファイル更新

**現在のdata/oauth2-tokens.yaml内容を移行**:
```yaml
access_token: MDhlakZDcUhVbGZBNnExV3NzNVhtNFZLMGdIRnVPZUhiQzVZWFN4bHViaU5NOjE3NTMxNTc1MTM1NDU6MTowOmF0OjE
refresh_token: YWN5eHR1Y0hZRlp2SU55VGY4bnRNQk1DMzFReHMzQzNJY2FfM3BBRkk1bGtTOjE3NTMxNTc1MTM1NDU6MToxOnJ0OjE
expires_at: 1753164713582
```

**.env追加内容**:
```bash
# OAuth 2.0アクセストークン（YAMLから移行）
X_OAUTH2_ACCESS_TOKEN=MDhlakZDcUhVbGZBNnExV3NzNVhtNFZLMGdIRnVPZUhiQzVZWFN4bHViaU5NOjE3NTMxNTc1MTM1NDU6MTowOmF0OjE
X_OAUTH2_REFRESH_TOKEN=YWN5eHR1Y0hZRlp2SU55VGY4bnRNQk1DMzFReHMzQzNJY2FfM3BBRkk1bGtTOjE3NTMxNTc1MTM1NDU6MToxOnJ0OjE
X_OAUTH2_EXPIRES_AT=1753164713582
```

## 🔧 **実装手順**

### Step 1: コード修正
```bash
# ファイル編集
code src/lib/x-client.ts
# 688-697行のloadOAuth2Tokens()メソッドを上記実装に置換
```

### Step 2: 環境変数設定
```bash
# 現在のトークン値を環境変数に移行
echo "X_OAUTH2_ACCESS_TOKEN=MDhlakZDcUhVbGZBNnExV3NzNVhtNFZLMGdIRnVPZUhiQzVZWFN4bHViaU5NOjE3NTMxNTc1MTM1NDU6MTowOmF0OjE" >> .env
echo "X_OAUTH2_REFRESH_TOKEN=YWN5eHR1Y0hZRlp2SU55VGY4bnRNQk1DMzFReHMzQzNJY2FfM3BBRkk1bGtTOjE3NTMxNTc1MTM1NDU6MToxOnJ0OjE" >> .env
echo "X_OAUTH2_EXPIRES_AT=1753164713582" >> .env
```

### Step 3: セキュリティ清算
```bash
# YAMLファイル安全削除
rm data/oauth2-tokens.yaml

# gitignore確認
grep -q ".env" .gitignore && echo "✅ .env properly ignored" || echo "🚨 Add .env to .gitignore"
```

### Step 4: トークン期限確認
```bash
# 期限確認（UNIXタイムスタンプ）
echo "Current time: $(date +%s)000"
echo "Token expires: 1753164713582"

# 期限切れの場合、再認証
if [ 1753164713582 -lt $(date +%s)000 ]; then
  echo "🔄 Token expired, re-authentication needed"
  pnpm tsx src/scripts/oauth2-auth-helper.ts
fi
```

## ✅ **動作テスト**

### テスト1: 環境変数読み込み確認
```bash
pnpm dev
# ログで "✅ [Security] OAuth2 tokens loaded from environment variables" 確認
```

### テスト2: X投稿テスト
```bash
# テストモードOFF
export X_TEST_MODE=false

# 投稿テスト実行
pnpm dev
# 403エラーが解消されることを確認
```

## 🚨 **エラー対処**

### 403エラー継続の場合
1. トークン期限再確認
2. スコープ設定確認
3. OAuth2再認証実行

### 環境変数読み込み失敗の場合
1. .envファイル文法確認
2. dotenvライブラリ動作確認
3. プロセス再起動

## 📊 **完了確認チェックリスト**

- [ ] loadOAuth2Tokens()メソッド修正完了
- [ ] 環境変数設定完了
- [ ] YAMLファイル削除完了
- [ ] 環境変数からの読み込みログ確認
- [ ] 403エラー解消確認
- [ ] X投稿機能正常動作確認

**すべてチェック完了後、Manager権限に報告**