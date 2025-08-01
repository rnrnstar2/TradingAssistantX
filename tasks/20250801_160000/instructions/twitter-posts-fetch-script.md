# Twitter投稿取得スクリプト実装指示書

## 📋 実装概要

**目的**: 自分のTwitter投稿を全て取得してdata/currentディレクトリにpost.yamlを作成するスクリプト

**実装権限**: Worker権限必須（Manager権限では実装不可）

**出力先**: `data/current/execution-20250801-1616/post.yaml`

## 🚫 Manager権限での制約事項

**現在の状況**:
- ROLE: manager → プロダクションコード（src/）実装・編集禁止
- scriptsディレクトリ作成禁止（docs/directory-structure.mdに未記載）

**解決方法**:
```bash
export ROLE=worker
```

## 📁 実装アーキテクチャ

### 1. scriptsディレクトリ作成

```
TradingAssistantX/
├── scripts/                    # 新規作成
│   └── fetch-my-tweets.ts      # Twitter投稿取得スクリプト
```

### 2. 既存API活用

**活用する既存実装**:
- `src/kaito-api/endpoints/read-only/user-last-tweets.ts` ✅ 実装済み
- `src/shared/data-manager.ts` - データ保存機能
- `src/kaito-api/core/auth-manager.ts` - 認証管理

## 🔧 実装仕様

### ファイル: `scripts/fetch-my-tweets.ts`

```typescript
import { KaitoApiClient } from '../src/kaito-api';
import { DataManager } from '../src/shared/data-manager';

/**
 * 自分のTwitter投稿を全取得してpost.yamlに保存
 */
class TwitterPostsFetcher {
  private kaitoClient: KaitoApiClient;
  private dataManager: DataManager;
  private username: string;

  constructor() {
    // 環境変数X_USERNAMEから取得
    this.username = process.env.X_USERNAME!;
    this.kaitoClient = new KaitoApiClient(/* 設定 */);
    this.dataManager = new DataManager();
  }

  /**
   * 全投稿取得（ページネーション対応）
   */
  async fetchAllTweets(): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.kaitoClient.getUserLastTweets({
        userName: this.username,
        limit: 200, // 最大取得数
        includeReplies: false,
        cursor
      });

      if (response.success && response.tweets) {
        allTweets.push(...response.tweets);
        cursor = response.cursor;
        hasMore = response.has_more || false;
        
        console.log(`取得済み: ${allTweets.length}件`);
        
        // レート制限対策
        await this.sleep(1000);
      } else {
        console.error('取得エラー:', response.error);
        break;
      }
    }

    return allTweets;
  }

  /**
   * post.yaml形式で保存
   */
  async saveToPostYaml(tweets: Tweet[]): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
    const executionDir = `execution-${timestamp}`;
    
    const postData = {
      timestamp: new Date().toISOString(),
      total_posts: tweets.length,
      posts: tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        metrics: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          quotes: tweet.public_metrics.quote_count
        },
        url: `https://x.com/${this.username}/status/${tweet.id}`
      }))
    };

    // data/current/execution-YYYYMMDD-HHMM/post.yaml
    await this.dataManager.saveToCurrentExecution('post.yaml', postData, executionDir);
    
    console.log(`✅ 保存完了: data/current/${executionDir}/post.yaml`);
    console.log(`📊 総投稿数: ${tweets.length}件`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 実行
async function main() {
  const fetcher = new TwitterPostsFetcher();
  
  try {
    console.log('🚀 Twitter投稿取得開始...');
    const tweets = await fetcher.fetchAllTweets();
    await fetcher.saveToPostYaml(tweets);
    console.log('✅ 完了');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## 📖 TwitterAPI.io仕様確認

### エンドポイント詳細

**使用API**: `/twitter/user_last_tweets`
- **URL**: `GET /twitter/user_last_tweets`
- **認証**: X-API-Key ヘッダーのみ（読み取り専用）
- **パラメータ**:
  - `userName`: 対象ユーザー名（必須）
  - `limit`: 取得数（最大200）
  - `includeReplies`: リプライ含む/含まない
  - `cursor`: ページネーション用

### ページネーション実装

```typescript
// has_next_pageとnext_cursorを使用
while (response.has_more) {
  const response = await client.getUserLastTweets({
    userName: username,
    cursor: nextCursor // 前回のレスポンスから取得
  });
}
```

## 🎯 MVP設計原則

### シンプル設計
1. **単一責任**: 投稿取得のみに特化
2. **既存API活用**: 新規API実装不要
3. **エラー処理**: 適切なログ出力とリトライ
4. **データ形式**: YAML形式でdata/current/配下に保存

### タイムスタンプ形式
- **ディレクトリ名**: `execution-20250801-1616`
- **生成ロジック**: `YYYYMMDD-HHMM`形式
- **現在時刻取得**: `new Date()`を使用

## 📋 実装チェックリスト

### 必須実装項目
- [ ] scriptsディレクトリ作成
- [ ] fetch-my-tweets.ts作成
- [ ] 環境変数X_USERNAME使用
- [ ] 既存KaitoApiClient活用
- [ ] ページネーション実装（has_next_page対応）
- [ ] レート制限対策（1秒間隔）
- [ ] post.yaml形式保存
- [ ] タイムスタンプ付きディレクトリ作成
- [ ] エラーハンドリング

### 設定確認項目
- [ ] KAITO_API_TOKEN環境変数設定済み
- [ ] X_USERNAME環境変数設定済み
- [ ] data/current/ディレクトリ存在確認

## 🚀 実行方法

```bash
# 1. Worker権限に変更
export ROLE=worker

# 2. 環境変数確認
echo "X_USERNAME: $X_USERNAME"
echo "KAITO_API_TOKEN: $KAITO_API_TOKEN"

# 3. スクリプト実行
npx tsx scripts/fetch-my-tweets.ts
```

## 📊 期待される出力

### post.yaml構造例
```yaml
timestamp: "2025-08-01T16:16:00.000Z"
total_posts: 150
posts:
  - id: "1950214974585852117"
    text: "FX市場の独自分析..."
    created_at: "2025-08-01T07:00:00.000Z"
    metrics:
      likes: 25
      retweets: 8
      replies: 3
      quotes: 1
    url: "https://x.com/username/status/1950214974585852117"
  # ... 他の投稿
```

## ⚠️ 注意事項

1. **権限必須**: Worker権限でのみ実装可能
2. **レート制限**: TwitterAPI.io制限（200 QPS）考慮
3. **データクリーンアップ**: 既存データの整合性確保
4. **タイムスタンプ精度**: 分単位での正確な記録

## 🔄 完了後の確認

```bash
# ファイル生成確認
ls -la data/current/execution-*/post.yaml

# 内容確認
cat data/current/execution-*/post.yaml | head -20
```

---

**実装完了後**: この指示書に従って実装し、MVPとして余計な機能を追加せず、シンプルで確実な動作を優先してください。