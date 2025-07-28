# X API v2 Phase 2 データ収集機能実装指示書

## 実装者向け指示
Phase 1完了後、この指示書に従ってX API v2のデータ収集機能を実装してください。

## 実装内容

### 1. X データコレクター実装（x-data-collector.ts）

```typescript
// src/collectors/x-data-collector.ts
import { BaseCollector } from './base-collector';
import { XAuthManager } from '../services/x-auth-manager';
import { XTweetV2, XUserV2 } from '../types/x-api-types';

export class XDataCollector extends BaseCollector {
  constructor(private authManager: XAuthManager) {
    super('x-api-v2');
  }

  // タイムライン取得
  async collectTimeline(userId?: string): Promise<XTweetV2[]>
  
  // 検索機能（Proプラン以上）
  async searchTweets(query: string, options?: SearchOptions): Promise<XTweetV2[]>
  
  // メンション取得
  async getMentions(userId: string): Promise<XTweetV2[]>
  
  // トレンド取得
  async getTrends(location?: string): Promise<Trend[]>
  
  // フォロワー分析
  async analyzeFollowers(userId: string): Promise<FollowerAnalysis>
}
```

### 2. データキャッシュ実装（x-timeline-cache.yaml）

```yaml
# data/current/x-timeline-cache.yaml
cache_metadata:
  last_updated: "2025-01-23T10:00:00Z"
  cache_duration_minutes: 15
  
timeline_data:
  - tweet_id: "1234567890"
    text: "投資の基礎知識..."
    created_at: "2025-01-23T09:30:00Z"
    metrics:
      likes: 45
      retweets: 12
      replies: 3
    
search_cache:
  "投資 初心者":
    cached_at: "2025-01-23T09:45:00Z"
    results: [...]
```

### 3. エンゲージメント分析データ（x-engagement-data.yaml）

```yaml
# data/learning/x-engagement-data.yaml
engagement_summary:
  period: "2025-01"
  total_impressions: 125000
  total_engagements: 3500
  engagement_rate: 2.8%

top_performing_posts:
  - post_id: "1234567890"
    engagement_rate: 5.2%
    topic: "投資初心者向けガイド"
    
posting_time_analysis:
  best_times:
    - hour: 9
      engagement_rate: 3.5%
    - hour: 21
      engagement_rate: 3.2%
```

### 4. action-specific-collectorの拡張

```typescript
// src/collectors/action-specific-collector.ts
// 既存のRSSコレクターに加えてX APIコレクターを追加

async selectCollector(action: string): Promise<BaseCollector> {
  switch (action) {
    case 'collect_rss':
      return new RSSCollector();
    case 'collect_x_timeline':
      return new XDataCollector(this.authManager);
    case 'collect_x_search':
      return new XDataCollector(this.authManager);
    // ...
  }
}
```

## 実装の詳細仕様

### タイムライン収集
- 最新100件のツイートを取得
- 15分ごとにキャッシュ更新
- フィルタリング機能（リツイート除外など）

### 検索機能（Proプラン以上）
- キーワード検索
- ハッシュタグ検索
- 言語フィルター
- 期間指定検索

### データ保存戦略
- タイムラインデータ: `data/current/`に一時保存
- エンゲージメント分析: `data/learning/`に蓄積
- 投稿履歴: `data/archives/posts/`に永続保存

### レート制限対策
```typescript
class RateLimiter {
  // APIティアに応じた制限管理
  checkLimit(endpoint: string): boolean
  
  // 待機時間計算
  getWaitTime(): number
  
  // リセット時刻取得
  getResetTime(): Date
}
```

## 統合ポイント

### Claude Autonomous Agentとの連携
```typescript
// データ収集アクションの追加
actions: {
  'collect_x_timeline': {
    description: 'X（Twitter）のタイムラインからデータ収集',
    requiredParams: ['count', 'filters']
  },
  'analyze_x_engagement': {
    description: 'X投稿のエンゲージメント分析',
    requiredParams: ['period']
  }
}
```

### 決定エンジンの拡張
- X APIデータを考慮した投稿戦略
- トレンドに基づくトピック選択
- エンゲージメント最適化

## エラーハンドリング

### APIエラー処理
- 429 (Rate Limit): 自動待機とリトライ
- 401 (Unauthorized): 認証情報の再確認
- 503 (Service Unavailable): 指数バックオフ

### データ整合性
- 不完全なデータの検出
- 重複データの除去
- キャッシュ有効性の確認

## テスト要件

### 機能テスト
- 各エンドポイントの動作確認
- レート制限の境界値テスト
- エラーケースの網羅的テスト

### 性能テスト
- 大量データ処理の性能測定
- キャッシュ効率の検証
- メモリ使用量の監視

## 完了条件
1. タイムライン収集が正常動作すること
2. 検索機能が実装されていること（Proプラン）
3. エンゲージメント分析が機能すること
4. レート制限対策が適切に動作すること
5. データがYAMLファイルに正しく保存されること

## Phase 3への準備
- リアルタイムストリーミング（Enterprise）
- 高度な分析機能
- 機械学習モデルとの統合