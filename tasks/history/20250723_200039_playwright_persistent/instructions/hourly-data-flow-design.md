# 1時間ごとのデータ収集フロー詳細設計

## 🕐 時系列データフロー例（24時間）

### 09:00 - 初回収集

```yaml
# 収集データ
アカウント: フォロワー1,234人
ツイート: 最新20件（ID: 101-120）
エンゲージメント: 平均いいね35
```

**保存先:**
```
data/
├── current/
│   ├── account-status.yaml      # 上書き更新
│   └── self-tweets.yaml         # 上書き更新（最新20件）
├── learning/
│   ├── engagement-patterns.yaml # 1行追記
│   └── follower-analytics.yaml  # 1行追記
└── archives/
    ├── posts/2025-07/
    │   ├── 2025-07-24-090000.yaml  # 新規（tweet_101）
    │   ├── 2025-07-24-090001.yaml  # 新規（tweet_102）
    │   └── ...（20ファイル）
    └── account-snapshots/2025-07/
        └── snapshot-2025-07-24-090000.yaml  # 新規（完全記録）
```

### 10:00 - 2回目収集

```yaml
# 収集データ
アカウント: フォロワー1,238人（+4）
ツイート: 最新20件（ID: 103-122）# 新規2件
エンゲージメント: 平均いいね37
```

**更新内容:**
```
current/
├── account-status.yaml      # 上書き（1,238人に更新）
└── self-tweets.yaml         # 上書き（103-122の20件）

learning/
├── engagement-patterns.yaml # 追記（2行目）
│   # 09:00のデータ保持 + 10:00のデータ追加
└── follower-analytics.yaml  # 追記（2行目）
    # growth_timeline に10:00のエントリ追加

archives/
├── posts/2025-07/
│   ├── 2025-07-24-100000.yaml  # 新規（tweet_121）
│   └── 2025-07-24-100001.yaml  # 新規（tweet_122）
└── account-snapshots/2025-07/
    └── snapshot-2025-07-24-100000.yaml  # 新規
```

## 📊 24時間後のデータ状態

### current/（最新のみ）
```yaml
# account-status.yaml
username: "rnrnstar"
followers_count: 1,285  # 最新値
account_details:
  tweet_count: 925     # 最新値
last_updated: "2025-07-25T08:00:00Z"

# self-tweets.yaml
recent_tweets:  # 最新20件のみ
  - id: "tweet_201"
  - id: "tweet_200"
  # ... 最新20件
```

### learning/（24時間分の集約）
```yaml
# engagement-patterns.yaml
patterns:
  detailed_metrics:  # 24エントリ（1時間ごと）
    - timestamp: "2025-07-24T09:00:00Z"
      followers_at_time: 1234
      average_engagement:
        likes: 35.5
    - timestamp: "2025-07-24T10:00:00Z"
      followers_at_time: 1238
      average_engagement:
        likes: 37.0
    # ... 24エントリ

# follower-analytics.yaml
growth_timeline:  # 24エントリ
  - date: "2025-07-24T09:00:00Z"
    count: 1234
    change: 0
  - date: "2025-07-24T10:00:00Z"  
    count: 1238
    change: +4
  # ... 24エントリ
daily_summary:
  total_growth: +51
  growth_rate: 4.13%
```

### archives/（全履歴）
```
posts/2025-07/
├── 2025-07-24-090000.yaml  # tweet_101
├── 2025-07-24-090001.yaml  # tweet_102
├── ...（約100ファイル = 新規ツイート分）

account-snapshots/2025-07/
├── snapshot-2025-07-24-090000.yaml
├── snapshot-2025-07-24-100000.yaml
├── ...（24ファイル = 1時間ごと）
```

## 🔄 データ整形プロセス

### 1. 収集時の処理

```typescript
class DataProcessor {
  async processHourlyCollection(rawData: CollectedData) {
    // Step 1: 現在データの更新
    await this.updateCurrentData(rawData);
    
    // Step 2: 差分計算と学習データ追記
    const diffs = await this.calculateDifferences(rawData);
    await this.appendLearningData(diffs);
    
    // Step 3: 新規データのアーカイブ
    await this.archiveNewData(rawData);
    
    // Step 4: データ整合性チェック
    await this.validateDataIntegrity();
  }
  
  private async calculateDifferences(data: CollectedData) {
    // 前回データとの比較
    const lastSnapshot = await this.getLastSnapshot();
    
    return {
      followerChange: data.followers - lastSnapshot.followers,
      newTweets: data.tweets.filter(t => 
        !lastSnapshot.tweetIds.includes(t.id)
      ),
      engagementDelta: this.calculateEngagementChange(data, lastSnapshot)
    };
  }
}
```

### 2. 日次集約処理

```typescript
class DailyAggregator {
  async aggregateDailyData() {
    // 24時間分のlearningデータを集約
    const hourlyData = await this.loadHourlyData();
    
    const dailySummary = {
      date: new Date().toISOString().split('T')[0],
      metrics: {
        totalFollowerGrowth: this.sumGrowth(hourlyData),
        averageEngagement: this.averageEngagement(hourlyData),
        bestPerformingHour: this.findBestHour(hourlyData),
        totalNewTweets: this.countNewTweets(hourlyData)
      }
    };
    
    // 日次サマリーを保存
    await this.saveDailySummary(dailySummary);
    
    // 古いエントリをクリーンアップ
    await this.cleanupOldEntries();
  }
}
```

## 📈 データ利用パターン

### 1. リアルタイム参照（current/）
```typescript
// 最新のアカウント状態を即座に取得
const currentStatus = await loadYaml('data/current/account-status.yaml');
console.log(`現在のフォロワー: ${currentStatus.followers_count}`);
```

### 2. トレンド分析（learning/）
```typescript
// 24時間の成長トレンドを分析
const analytics = await loadYaml('data/learning/follower-analytics.yaml');
const growthRate = calculateGrowthRate(analytics.growth_timeline);
console.log(`24時間の成長率: ${growthRate}%`);
```

### 3. 詳細調査（archives/）
```typescript
// 特定時点の完全な状態を復元
const snapshot = await loadYaml(
  'data/archives/account-snapshots/2025-07/snapshot-2025-07-24-150000.yaml'
);
console.log(`15時時点の詳細: ${JSON.stringify(snapshot)}`);
```

## 🧹 データクリーンアップ戦略

### 自動クリーンアップ規則

1. **current/**: クリーンアップ不要（常に最新のみ）

2. **learning/**: 
   - 90日以上前のエントリを削除
   - 日次集約後、時間単位データを圧縮

3. **archives/**:
   - 3ヶ月以上前: tar.gz圧縮
   - 1年以上前: 外部ストレージへ移動オプション

### クリーンアップ実装例

```typescript
class DataCleaner {
  async performDailyCleanup() {
    // learning/の古いエントリ削除
    await this.cleanLearningData(90); // 90日
    
    // archives/の圧縮
    await this.compressOldArchives(90); // 3ヶ月
    
    // ディスク容量チェック
    const usage = await this.checkDiskUsage();
    if (usage > 0.8) {
      await this.emergencyCleanup();
    }
  }
}
```

## 📊 実際のデータサイズ予測

### 1時間あたり
- current/: ~5KB（上書きのため増加なし）
- learning/: +1KB（追記分）
- archives/: +50KB（ツイート20件 + スナップショット）

### 1日あたり
- current/: 5KB（変わらず）
- learning/: +24KB
- archives/: +1.2MB

### 1ヶ月あたり
- current/: 5KB
- learning/: ~720KB
- archives/: ~36MB（圧縮前）

## 🎯 整形データの活用例

### エンゲージメント最適化
```yaml
# learning/engagement-patterns.yaml から
best_posting_times:
  - hour: 19
    average_likes: 52.3
    average_retweets: 14.7
  - hour: 12
    average_likes: 48.1
    average_retweets: 12.3
```

### フォロワー成長予測
```yaml
# learning/follower-analytics.yaml から
growth_prediction:
  current_rate: 4.2% # 日次
  projected_30days: 1,857 # 予測フォロワー数
  milestone_1500: "2025-08-05" # 予測到達日
```

---

この設計により、1時間ごとの収集データが効率的に蓄積・整形され、各用途に応じて最適な形で利用できます。