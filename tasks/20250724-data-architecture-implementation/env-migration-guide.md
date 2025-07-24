# 🔧 環境変数移行ガイド - config/context廃止版

## 📋 概要
MVP真の最小構成として、config/およびcontext/ディレクトリを廃止し、全ての設定を環境変数で管理します。

## 🎯 移行対象

### 1. API設定（旧config/api-config.yaml）
```yaml
# 旧：config/api-config.yaml
kaito_api:
  base_url: "https://api.kaito.ai"
  auth:
    bearer_token: "${KAITO_API_TOKEN}"
  rate_limits:
    posts_per_hour: 10
    retweets_per_hour: 20
    likes_per_hour: 50

claude:
  model: "claude-3-sonnet"
  max_tokens: 4000
  temperature: 0.7
```

### 2. 環境変数への移行
```bash
# 新：.env ファイル
# KaitoAPI設定
KAITO_API_TOKEN=your-api-token-here
KAITO_API_BASE_URL=https://api.kaito.ai

# レート制限設定
POSTS_PER_HOUR=10
RETWEETS_PER_HOUR=20
LIKES_PER_HOUR=50

# Claude設定
CLAUDE_MODEL=claude-3-sonnet
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7
```

## 💻 コード変更

### loadConfig()メソッドの変更
```typescript
// src/data/data-manager.ts
async loadConfig(): Promise<ApiConfig> {
  // 環境変数から読み込み
  return {
    kaito_api: {
      base_url: process.env.KAITO_API_BASE_URL || 'https://api.kaito.ai',
      auth: {
        bearer_token: process.env.KAITO_API_TOKEN || ''
      },
      rate_limits: {
        posts_per_hour: parseInt(process.env.POSTS_PER_HOUR || '10'),
        retweets_per_hour: parseInt(process.env.RETWEETS_PER_HOUR || '20'),
        likes_per_hour: parseInt(process.env.LIKES_PER_HOUR || '50')
      }
    },
    claude: {
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet',
      max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')
    }
  };
}
```

### loadCurrentStatus()の簡略化
```typescript
// src/data/data-manager.ts
async loadCurrentStatus(): Promise<CurrentStatus> {
  // デフォルト値を返却（実行時状態はcurrent/で管理）
  return {
    account_status: {
      followers: 0,
      following: 0,
      tweets_today: 0,
      engagement_rate_24h: 0
    },
    system_status: {
      last_execution: '',
      next_execution: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      errors_today: 0,
      success_rate: 1.0
    },
    rate_limits: {
      posts_remaining: parseInt(process.env.POSTS_PER_HOUR || '10'),
      retweets_remaining: parseInt(process.env.RETWEETS_PER_HOUR || '20'),
      likes_remaining: parseInt(process.env.LIKES_PER_HOUR || '50'),
      reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  };
}
```

### loadSessionMemory()の簡略化
```typescript
// src/data/data-manager.ts
async loadSessionMemory(): Promise<SessionMemory> {
  // デフォルト値を返却（セッション情報はcurrent/で管理）
  return {
    current_session: {
      start_time: new Date().toISOString(),
      actions_taken: 0,
      last_action: 'none',
      next_scheduled: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    },
    memory: {
      recent_topics: [],
      successful_hashtags: [],
      follower_growth_trend: 'stable'
    }
  };
}
```

## 🔄 移行手順

1. **環境変数ファイル作成**
   ```bash
   cp .env.example .env
   # .envファイルを編集し、必要な値を設定
   ```

2. **既存ディレクトリのバックアップ**
   ```bash
   # 念のため既存データをバックアップ
   tar -czf data-backup.tar.gz src/data/config src/data/context
   ```

3. **新ディレクトリ構造作成**
   ```bash
   mkdir -p src/data/current
   mkdir -p src/data/history
   ```

4. **既存ディレクトリの削除**（バックアップ確認後）
   ```bash
   rm -rf src/data/config
   rm -rf src/data/context
   rm -rf src/data/learning  # MVPでは不要
   ```

## ✅ 確認事項

1. **環境変数の設定確認**
   ```bash
   # 必須環境変数が設定されているか確認
   node -e "console.log('KAITO_API_TOKEN:', process.env.KAITO_API_TOKEN ? '✓' : '✗')"
   ```

2. **アプリケーション起動確認**
   ```bash
   pnpm dev
   # エラーなく起動することを確認
   ```

3. **データ保存確認**
   ```bash
   # 実行後、current/ディレクトリにデータが保存されているか確認
   ls -la src/data/current/
   ```

## 🎯 メリット

1. **シンプルな構成**
   - ディレクトリ構造が明確（current/history のみ）
   - 設定管理が一元化（.envファイル）

2. **デプロイの簡素化**
   - 環境変数でのみ設定管理
   - YAMLファイルの管理不要

3. **セキュリティ向上**
   - APIトークンがファイルに保存されない
   - .envファイルは.gitignoreで管理

## ⚠️ 注意点

- `.env`ファイルは絶対にGitにコミットしない
- 本番環境では環境変数を直接設定する
- デフォルト値は開発環境用の安全な値を使用