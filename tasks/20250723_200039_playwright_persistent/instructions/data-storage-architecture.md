# データ保存アーキテクチャ設計

## 🎯 データ保存の基本方針

既存のdata構造を尊重し、データの性質に応じて適切な場所に保存する

## 📂 推奨データ保存構造

### 1. **current/** - リアルタイム状態（既存ファイル更新）

#### account-status.yaml（拡張版）
```yaml
# 基本情報（既存）
username: "rnrnstar"
followers_count: 1234
last_updated: "2025-07-23T20:00:00Z"
is_active: true

# 詳細情報（追加）
account_details:
  display_name: "rnrnstar"
  bio: "投資教育コンテンツ..."
  following_count: 567
  tweet_count: 890
  verified: false
  profile_image_url: "https://..."
  
# 収集メタデータ
collection:
  method: "playwright-authenticated"
  collector: "x-data-collector"
  session_active: true
```

#### self-tweets.yaml（新規）
```yaml
# 自分の最新ツイート（最新20件程度）
recent_tweets:
  - id: "tweet_123"
    text: "本日の市場分析..."
    created_at: "2025-07-23T19:00:00Z"
    metrics:
      likes: 45
      retweets: 12
      replies: 8
      impressions: 1250  # 認証時のみ
    language: "ja"
    
last_updated: "2025-07-23T20:00:00Z"
total_collected: 20
```

### 2. **learning/** - 分析・パターンデータ（既存ファイル拡張）

#### engagement-patterns.yaml（拡張版）
```yaml
patterns:
  # 既存のパターン
  high_performing:
    times: ["9:00", "19:00"]
    formats: ["standard", "thread"]
    
  # 詳細メトリクス（追加）
  detailed_metrics:
    - timestamp: "2025-07-23T20:00:00Z"
      followers_at_time: 1234
      average_engagement:
        likes: 35.5
        retweets: 8.2
        replies: 4.1
      best_tweet:
        id: "tweet_456"
        engagement_rate: 0.045
      worst_tweet:
        id: "tweet_789"
        engagement_rate: 0.008
        
updated_at: "2025-07-23T20:00:00Z"
```

#### follower-analytics.yaml（新規）
```yaml
# フォロワー分析データ
growth_timeline:
  - date: "2025-07-23"
    count: 1234
    change: +12
    growth_rate: 0.98%
    
  - date: "2025-07-22"
    count: 1222
    change: +8
    growth_rate: 0.66%

milestones:
  - count: 1000
    reached_at: "2025-07-15T14:30:00Z"
  - count: 500
    reached_at: "2025-06-01T10:00:00Z"
    
follower_quality:
  verified_ratio: 0.02
  active_ratio: 0.85
  engagement_ratio: 0.12

last_updated: "2025-07-23T20:00:00Z"
```

### 3. **archives/** - 履歴データ（時系列保存）

#### posts/YYYY-MM/（既存構造維持）
```yaml
# 2025-07-23-200000.yaml
post:
  id: "tweet_123"
  text: "本日の市場分析..."
  posted_at: "2025-07-23T19:00:00Z"
  
# 収集時点のメトリクス
metrics_at_collection:
  likes: 45
  retweets: 12
  replies: 8
  impressions: 1250
  
# アカウント状態スナップショット
account_snapshot:
  followers: 1234
  following: 567
  
collected_at: "2025-07-23T20:00:00Z"
collector: "x-data-collector"
```

#### account-snapshots/YYYY-MM/（新規）
```yaml
# account-snapshot-2025-07-23-200000.yaml
snapshot:
  timestamp: "2025-07-23T20:00:00Z"
  
  profile:
    username: "rnrnstar"
    display_name: "rnrnstar"
    bio: "..."
    followers: 1234
    following: 567
    tweets: 890
    
  recent_performance:
    last_7_days:
      tweets_posted: 35
      total_likes: 420
      total_retweets: 98
      average_engagement_rate: 0.034
      
  top_tweets:
    - id: "tweet_best"
      text: "..."
      engagement_rate: 0.085
      
collector: "x-data-collector"
authentication: "logged_in"
```

## 🔄 データライフサイクル

### 1. リアルタイムデータ（current/）
- **保存期間**: 最新状態のみ
- **更新頻度**: 1時間ごと
- **ファイル数**: 固定（既存 + 2-3ファイル）

### 2. 分析データ（learning/）
- **保存期間**: 90日分の時系列
- **更新頻度**: 収集時に追記
- **サイズ制限**: 10MB以内

### 3. アーカイブ（archives/）
- **保存期間**: 永続
- **構造**: YYYY-MM/ファイル名-タイムスタンプ.yaml
- **圧縮**: 3ヶ月以上前のデータ

## 📋 実装優先順位

### Phase 1: 基本データ更新
1. `current/account-status.yaml` の拡張
2. `current/self-tweets.yaml` の新規作成
3. `learning/engagement-patterns.yaml` への追記

### Phase 2: 詳細分析データ
1. `learning/follower-analytics.yaml` の新規作成
2. `archives/account-snapshots/` の実装

### Phase 3: 高度な統合
1. 既存システムとの連携最適化
2. データ圧縮・クリーンアップ機能

## 🎯 データ保存のベストプラクティス

### 1. 一貫性
- 既存のYAML構造を踏襲
- タイムスタンプフォーマット統一（ISO 8601）
- キー名の命名規則統一（snake_case）

### 2. 効率性
- current/は最新情報のみ（履歴なし）
- learning/は集約データ（個別詳細なし）
- archives/は完全な履歴（圧縮可）

### 3. 可読性
- 明確なコメント
- 論理的なグルーピング
- 適切なインデント

## 💡 実装例

```typescript
// data-writer.ts の実装
export class DataStorageManager {
  async saveAccountUpdate(data: AccountData): Promise<void> {
    // 1. current/account-status.yaml を更新
    await this.updateCurrentAccountStatus(data);
    
    // 2. learning/follower-analytics.yaml に成長記録
    await this.appendFollowerGrowth(data);
    
    // 3. archives/account-snapshots/ に完全スナップショット
    await this.archiveAccountSnapshot(data);
  }
  
  async saveTweetData(tweets: Tweet[]): Promise<void> {
    // 1. current/self-tweets.yaml を最新20件で更新
    await this.updateRecentTweets(tweets.slice(0, 20));
    
    // 2. learning/engagement-patterns.yaml にメトリクス追記
    await this.updateEngagementMetrics(tweets);
    
    // 3. archives/posts/ に個別保存
    await this.archiveIndividualTweets(tweets);
  }
}
```

---

この構造により、既存システムとの完全な互換性を保ちながら、認証済みデータを綺麗に保存できます。