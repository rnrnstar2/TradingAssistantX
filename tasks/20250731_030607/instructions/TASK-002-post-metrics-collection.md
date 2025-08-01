# TASK-002: 投稿メトリクス取得機能実装

## 🎯 タスク概要

深夜分析用の投稿エンゲージメントメトリクス一括取得機能実装。KaitoAPIの`/twitter/tweets`エンドポイントを使用し、最新50件の自分の投稿のエンゲージメント率を計算・分析データとして構造化します。

## 📋 MVP制約確認

**✅ MVP適合性**:
- 深夜分析の核心データ収集機能
- 最新50件のみ（過剰な履歴取得なし）
- KaitoAPI既存エンドポイント活用
- エンゲージメント率計算の単純実装

**🚫 実装禁止項目**:
- 詳細な統計分析機能
- リアルタイム監視機能
- 複雑な機械学習モデル
- 過去全履歴の分析

## 🔧 実装仕様

### ファイル位置
`src/shared/post-metrics-collector.ts` (新規作成)

### MVP機能要件

#### 1. 最新投稿ID取得
- 自分の最新50件の投稿IDを取得
- KaitoAPI既存メソッド活用
- 投稿日時順にソート

#### 2. メトリクス一括取得
- `/twitter/tweets?tweet_ids=id1,id2,id3...`エンドポイント使用
- 最大100個まで一度に処理可能（50件なので制限内）
- APIキーのみで実行可能（認証レベル: 読み取り専用）

#### 3. エンゲージメント率計算
```typescript
エンゲージメント率 = (いいね数 + RT数 + リプライ数) ÷ インプレッション数 × 100
```

### 型定義

#### PostMetricsData型
```typescript
export interface PostMetricsData {
  posts: PostMetric[];
  summary: {
    totalPosts: number;
    avgEngagementRate: number;
    timeframe: string;
    generatedAt: string;
  };
}

export interface PostMetric {
  id: string;
  text: string;
  timestamp: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
  engagementRate: number;
  performanceLevel: 'high' | 'medium' | 'low'; // 3.0%以上、1.5-3.0%、1.5%未満
}
```

### 実装メソッド

#### 1. メインメソッド
```typescript
export async function collectPostMetrics(
  kaitoClient: KaitoTwitterAPIClient
): Promise<PostMetricsData>
```

#### 2. 内部メソッド
```typescript
// 最新投稿ID取得
async function getLatestPostIds(kaitoClient: KaitoTwitterAPIClient, limit: number = 50): Promise<string[]>

// メトリクス一括取得
async function fetchMetricsBatch(kaitoClient: KaitoTwitterAPIClient, tweetIds: string[]): Promise<any[]>

// エンゲージメント率計算
function calculateEngagementRate(metrics: any): number

// パフォーマンスレベル判定
function determinePerformanceLevel(engagementRate: number): 'high' | 'medium' | 'low'
```

### KaitoAPI実装詳細

#### `/twitter/tweets`エンドポイント仕様
- **URL**: `GET /twitter/tweets?tweet_ids=id1,id2,id3...`
- **認証**: APIキーのみ（`X-API-Key`ヘッダー）
- **制限**: 最大100個のTweet IDまで一度に処理可能
- **レスポンス**: ツイート詳細配列（メトリクス含む）

#### 実装例
```typescript
const response = await fetch(`${baseURL}/twitter/tweets?tweet_ids=${tweetIds.join(',')}`, {
  method: 'GET',
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  }
});
```

### エラーハンドリング

#### API制限対応
- レート制限エラー時のリトライロジック
- タイムアウト設定（30秒）
- 部分的失敗時の継続処理

#### データ品質確保
```typescript
// ゼロ除算回避
if (metrics.impressions === 0) {
  engagementRate = 0;
} else {
  engagementRate = ((metrics.likes + metrics.retweets + metrics.replies) / metrics.impressions) * 100;
}
```

#### フォールバック処理
- メトリクス取得失敗時のデフォルト値設定
- 部分的データでの継続実行
- エラー詳細ログ出力

## 🧪 品質要件

### TypeScript Strict準拠
- 全メトリクス型の明示的定義
- null/undefined安全チェック
- 数値型の厳密な型チェック

### パフォーマンス要件
- 50件処理を30秒以内で完了
- メモリ効率的な一括処理
- 不要なAPIコール削減

### ログ出力
```typescript
console.log(`📊 投稿メトリクス収集開始: ${tweetIds.length}件`);
console.log(`✅ メトリクス取得完了: 平均エンゲージメント率 ${avgRate.toFixed(2)}%`);
console.error(`❌ メトリクス取得エラー: ${error.message}`);
```

## 🔗 依存関係

### 必須インポート
- `../kaito-api` (KaitoTwitterAPIClient)
- `./types` (共通型定義)

### 実行順序制約
**並列実行可能** - analysis-endpoint実装と独立

## 📋 参考資料

### KaitoAPI公式ドキュメント
- **ツイートID一括取得**: [📖 Docs](https://twitterapi.io/api-reference/endpoint/get-tweets-by-ids)
- **パラメータリファレンス**: `tweet_ids`, `expansions`, `tweet.fields`
- **レスポンス形式**: Tweet Object配列

### 既存実装参照
- `src/kaito-api/core/client.ts` - HTTPクライアント基本構造
- `src/shared/data-manager.ts` - データ保存パターン

## ✅ 完成基準

1. **機能動作**: 最新50件投稿のメトリクス正常取得
2. **型安全性**: TypeScript strict通過
3. **エラーハンドリング**: API失敗時の適切な処理
4. **パフォーマンス**: 30秒以内での処理完了
5. **データ品質**: エンゲージメント率計算の正確性

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-002-post-metrics-collection.md`に記載：

1. **実装サマリー**: メトリクス収集機能の概要
2. **KaitoAPI統合**: エンドポイント使用詳細
3. **データ構造**: PostMetricsData型の実装詳細
4. **品質チェック**: エンゲージメント率計算の検証結果
5. **パフォーマンス**: 50件処理時間の測定結果
6. **エラーテスト**: API失敗時の動作確認

## 🚨 注意事項

- **API制限遵守**: 200 QPS制限内での実行
- **データ精度**: エンゲージメント率計算の正確性確保
- **メモリ効率**: 50件データの効率的処理
- **統合準備**: TASK-003での使用を考慮した設計