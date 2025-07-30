# 深夜分析システム仕様書

> **📝 実装状況**: このドキュメントは深夜分析機能の完全な仕様書です。現在、実装は保留中であり、関連するコード（analysis-endpoint.ts等）は一時的に削除されています。実装時には本仕様書に基づいて開発を行います。

## 🌙 概要

深夜分析（Deep Night Analysis）は、TradingAssistantXの投稿エンゲージメントを最適化する学習機能です。毎日23:55に実行され、最新50件の投稿のエンゲージメントを分析し、翌日の投稿戦略を自動生成します。

### 目的（MVP版）
- **投稿エンゲージメント分析**: 最新50件の投稿の最新メトリクスを取得・更新
- **高パフォーマンスパターン特定**: エンゲージメントが高い投稿の共通点を分析
- **投稿最適化**: 翌日の最適な投稿時間・形式・トピックを特定
- **継続的改善**: 毎日のエンゲージメントデータから学習し投稿品質を向上

### 位置づけ
通常のワークフローは3ステップ（データ収集→アクション実行→結果保存）ですが、23:55のみ特別に**第4ステップ**として深夜分析が追加実行されます。

## 📅 実行スケジュールと処理時間

| 項目 | 詳細 |
|---|---|
| **実行時刻** | 毎日23:55（固定） |
| **実行頻度** | 1日1回 |
| **処理時間** | 約15-30分 |
| **完了予定** | 翌日00:30頃 |
| **次回適用** | 翌日07:00以降のワークフローから自動適用 |

## 🔄 実行フロー

### Step 1-3: 通常ワークフロー（23:55でも実行）
```
1. データ収集 → 2. アクション実行（通常アクション） → 3. 結果保存
```

### Step 4: 深夜分析（23:55限定）
```
4-1. データ収集フェーズ
 ↓
4-2. Claude SDK分析実行フェーズ（3種類の分析）
 ↓
4-3. 戦略ファイル生成フェーズ
```

## 📊 データ収集フェーズ詳細

### 4-1: 分析データ収集（MVP版）

#### 最新50件の投稿エンゲージメント更新
MVPでは最新50件の投稿のエンゲージメントを毎日更新します。

```typescript
// 最新50件の投稿を取得（新しい順）
const recentPosts = await this.getRecentPosts({ limit: 50 });

// KaitoAPIで一括取得（TwitterAPI get_tweet_by_ids相当）
const postMetrics = await kaitoAPI.getTweetsByIds({
  ids: recentPosts.map(p => p.postId),
  tweet.fields: ['public_metrics', 'created_at', 'id', 'text']
});

// エンゲージメント率を計算して保存
const enrichedMetrics = postMetrics.map(tweet => ({
  postId: tweet.id,
  content: tweet.text,
  createdAt: tweet.created_at,
  metrics: tweet.public_metrics,
  engagementRate: (
    (tweet.public_metrics.like_count + 
     tweet.public_metrics.retweet_count + 
     tweet.public_metrics.reply_count) / 
    tweet.public_metrics.impression_count * 100
  ),
  ageInDays: Math.floor((Date.now() - new Date(tweet.created_at)) / (1000 * 60 * 60 * 24))
}));

await this.savePostMetrics(enrichedMetrics);
```

#### 収集対象のYAMLファイル
```yaml
# 当日の実行データ（全時間帯）
- data/current/execution-*/post.yaml  # 1日分の全実行結果

# 既存の学習データ（累積分析用・MVP版）
- data/learning/engagement-patterns.yaml
- data/learning/successful-topics.yaml
```

### データ集約方法（MVP版）

最新50件の投稿データを**構造化・要約した形式**でClaude Codeに送信します：

```typescript
{
  // 投稿エンゲージメント分析（最新50件）
  postEngagementAnalysis: {
    analyzedPosts: 50,
    dateRange: {
      oldest: "2025-07-15T12:00:00Z",  // 最古投稿
      newest: "2025-07-30T20:30:00Z"   // 最新投稿
    },
    posts: [
      {
        postId: "abc123",
        content: "投資の基本を解説...",
        postedAt: "2025-07-29T07:15:00Z",
        ageInDays: 1,
        metrics: {
          likes: 45,
          retweets: 18,
          replies: 12,
          impressions: 2100,
          engagementRate: 3.57  // (likes + retweets + replies) / impressions * 100
        },
        performanceLevel: "high"  // high(≥ 3.0) / medium(1.5-3.0) / low(< 1.5)
      }
      // ... 他の49件
    ],
    performanceByTimeSlot: {
      "07:00-10:00": {
        postCount: 12,
        avgEngagementRate: 4.2,
        topPost: {
          content: "NISA活用法...",
          engagementRate: 5.1
        }
      },
      "12:00-14:00": {
        postCount: 8,
        avgEngagementRate: 2.3
      },
      "20:00-22:00": {
        postCount: 15,
        avgEngagementRate: 3.8
      }
    },
    performanceByFormat: {
      "numbered_list": {
        count: 18,
        avgEngagementRate: 4.3
      },
      "question": {
        count: 12,
        avgEngagementRate: 3.6
      },
      "standard": {
        count: 20,
        avgEngagementRate: 2.1
      }
    },
    topPerformingPosts: [
      {
        content: "投資初心者向け：つみたてNISA 3つのポイント...",
        engagementRate: 5.2,
        format: "numbered_list",
        timeSlot: "07:15",
        ageInDays: 3
      }
      // ... top 5件
    ],
    insights: {
      bestTimeSlot: "07:00-10:00",
      bestFormat: "numbered_list",
      avgEngagementByAge: {
        "0-1days": 3.8,   // 新しい投稿
        "2-7days": 3.2,   // 1週間以内
        "8-30days": 2.5   // 1ヶ月以内
      }
    }
  },
  
  // シンプルなサマリ
  summary: {
    avgEngagementRate: 3.2,
    highPerformancePosts: 15,  // 3.0%以上
    mediumPerformancePosts: 20,
    lowPerformancePosts: 15
  }
}
```

## 🤖 Claude SDK分析実行フェーズ

### 4-2: 3種類の分析タイプ（投稿エンゲージメント重視）

深夜分析では、投稿エンゲージメントを中心に**3回**Claude APIを呼び出します：

#### 1. パフォーマンス分析（performance）- 投稿エンゲージメント特化
```typescript
const performanceAnalysis = await executeClaudeDeepAnalysis(postData, 'performance');
```

**分析内容**：
- 最新50件の投稿のエンゲージメントパターン分析
- 時間帯別・形式別・トピック別のパフォーマンス評価
- 高エンゲージメント投稿の共通要素特定
- 投稿の鮮度（日数経過）とエンゲージメントの相関

**プロンプト焦点**：
- 番号付きリスト vs 質問形式 vs 通常形式の効果比較
- 朝（07:00-10:00）・昼（12:00-14:00）・夜（20:00-22:00）の最適コンテンツ
- 投稿後1-7日のエンゲージメント推移パターン

#### 2. 市場分析（market）
```typescript
const marketAnalysis = await executeClaudeDeepAnalysis(dailyData, 'market');
```

**分析内容**：
- 投資教育需要の時系列変化
- 競合アカウント動向分析
- 市場センチメント変化の影響度
- 新興トピック機会発見

**プロンプト焦点**：
- 市場状況と教育コンテンツ需要の相関分析
- NISA制度変更、暗号資産規制等の教育機会
- 初心者向け解説の市場ギャップ

#### 3. 戦略分析（strategy）
```typescript
const strategyAnalysis = await executeClaudeDeepAnalysis(dailyData, 'strategy');
```

**分析内容**：
- 翌日の最適アクション組み合わせ生成
- 時間帯別コンテンツ戦略調整
- リスク要因の事前特定と回避策
- 成長機会の優先順位付け

**プロンプト焦点**：
- 朝: 前向きな投資教育で1日をスタート
- 昼: 実践的ノウハウで即座に活用可能な価値提供
- 夜: 1日の振り返りと明日への投資戦略準備


### Claude API応答形式

各分析タイプは専用のJSON形式で応答を返します：

**パフォーマンス分析応答（投稿エンゲージメント重視）**：
```json
{
  "postPerformanceInsights": [
    "朝の時間帯(07:00-10:00)の投稿が最高エンゲージメント率4.2%を記録",
    "投資基礎解説の投稿が平均より50%高いエンゲージメント",
    "番号付きリスト形式の投稿が高パフォーマンス"
  ],
  "engagementPatterns": {
    "highPerformancePosts": [
      {
        "topic": "NISA活用法",
        "avgEngagementRate": 4.5,
        "bestTimeSlot": "07:15"
      }
    ],
    "lowPerformancePosts": [
      {
        "topic": "複雑な金融理論",
        "avgEngagementRate": 1.2,
        "reason": "初心者には難解すぎる内容"
      }
    ]
  },
  "recommendations": [
    "朝7時台の投資教育コンテンツを週3回以上投稿",
    "番号付きリストや質問形式でエンゲージメント促進"
  ],
  "confidence": 0.85
}
```

**市場分析応答**：
```json
{
  "opportunities": [
    {
      "topic": "NISA活用法",
      "relevance": 0.85,
      "reasoning": "制度改正により関心が高まっている"
    }
  ],
  "trends": ["投資教育需要の安定的成長"],
  "confidence": 0.80
}
```

**戦略分析応答（投稿最適化含む）**：
```json
{
  "priorityActions": [
    {
      "timeSlot": "07:00-10:00",
      "action": "post",
      "topic": "朝の投資情報",
      "format": "numbered_list",
      "expectedEngagementRate": 4.2,
      "reasoning": "過去データから朝の教育コンテンツが高エンゲージメント"
    }
  ],
  "postOptimization": {
    "recommendedFormats": ["numbered_list", "question_answer"],
    "optimalLength": "150-200文字",
    "callToAction": "質問や感想を促す締めくくり"
  },
  "avoidanceRules": [
    {
      "condition": "市場大幅下落時",
      "action": "投資推奨を控える",
      "reason": "不適切なタイミングでの推奨回避"
    }
  ],
  "expectedImpact": {
    "avgEngagementRate": 3.5,
    "followerGrowth": 5,
    "riskLevel": "low"
  }
}
```

## 📁 戦略ファイル生成フェーズ

### 生成される分析結果

#### 1. 日次戦略分析（data/current/strategy-analysis.yaml）
```yaml
date: "2025-07-30"
performancePatterns:
  - timeSlot: "07:00-10:00"
    successRate: 0.85
    optimalTopics: ["朝の投資情報", "市場開始前準備"]
  - timeSlot: "20:00-22:00"
    successRate: 0.92
    optimalTopics: ["今日の振り返り", "明日の戦略"]

marketOpportunities:
  - topic: "NISA制度改正"
    relevance: 0.9
    recommendedAction: "educational_post"
    expectedEngagement: 4.2

optimizationInsights:
  - pattern: "quote_tweet_evening_high_success"
    implementation: "夕方の引用ツイートを30%増加"
    expectedImpact: "+15% engagement"

generatedAt: "2025-07-30T00:25:00Z"
analysisVersion: "v1.0"
```

**毎日上書き更新される今日の分析結果**
```yaml
targetDate: "2025-07-31"
priorityActions:
  - timeSlot: "07:00-10:00"
    action: "post"
    topic: "朝の投資情報"
    contentStrategy:
      format: "numbered_list"  # 高エンゲージメント形式
      targetEngagementRate: 4.2  # 目標エンゲージメント率
    reasoning: "過去7日間のデータから朝の教育コンテンツが平均4.2%のエンゲージメント率"
    priority: "high"

  - timeSlot: "12:00-13:00"
    action: "retweet"
    topic: "投資ニュース解説"
    targetQuery: "投資 初心者 lang:ja -filter:replies"
    expectedEngagement: 2.8
    reasoning: "昼休み時間帯の情報拡散効果"
    priority: "medium"

  - timeSlot: "20:00-22:00"
    action: "post"
    topic: "1日の振り返り"
    contentStrategy:
      format: "question"  # 質問形式でエンゲージメント促進
      targetEngagementRate: 3.8
    reasoning: "夜の時間帯は振り返りコンテンツが平均3.8%のエンゲージメント"
    priority: "high"

avoidanceRules:
  - condition: "市場が大幅下落（-3%以上）"
    action: "投資推奨コンテンツの投稿を控える"
    reason: "ネガティブな市場環境での不適切な推奨を回避"

postOptimization:
  recommendedTopics:
    - topic: "NISA活用法"
      avgEngagementRate: 4.5
      bestTimeSlot: "07:00-08:00"
    - topic: "投資信託入門"
      avgEngagementRate: 3.8
      bestTimeSlot: "20:00-21:00"
  
  avoidTopics:
    - topic: "複雑な金融理論"
      avgEngagementRate: 1.2
      reason: "初心者には難解でエンゲージメント低下"

expectedMetrics:
  targetEngagementRate: 3.5  # 全投稿の平均目標
  targetFollowerGrowth: 5
  riskLevel: "low"

generatedAt: "2025-07-30T00:30:00Z"
validUntil: "2025-08-01T00:00:00Z"
```

#### 2. 学習データ累積更新（data/learning/）

**過去7-30日分のstrategy-analysis.yamlを分析し、以下の学習ファイルを累積更新**

##### engagement-patterns.yaml
```yaml
lastUpdated: "2025-07-30T00:30:00Z"
analysisWindow: 30  # 過去30日分を分析

timeSlotPatterns:
  "07:00-10:00":
    avgEngagementRate: 4.2
    sampleSize: 60
    bestPerformingFormats: ["numbered_list", "question"]
    optimalTopics: ["朝の投資情報", "市場開始前準備"]
  "20:00-22:00":
    avgEngagementRate: 3.8
    sampleSize: 58
    bestPerformingFormats: ["story", "reflection"]
    optimalTopics: ["今日の振り返り", "明日の戦略"]

engagementTrends:
  improving: ["educational_content", "beginner_tips"]
  declining: ["advanced_theory", "complex_analysis"]
```

##### successful-topics.yaml  
```yaml
lastUpdated: "2025-07-30T00:30:00Z"
analysisWindow: 30

topicPerformance:
  - topic: "つみたてNISA"
    avgEngagementRate: 4.5
    postCount: 15
    trend: "stable"
    bestTimeSlots: ["07:00-08:00", "20:00-21:00"]
  - topic: "投資信託入門"
    avgEngagementRate: 3.8
    postCount: 20
    trend: "improving"
    bestTimeSlots: ["20:00-21:00"]

avoidTopics:
  - topic: "複雑な金融理論"
    avgEngagementRate: 1.2
    reason: "初心者には難解でエンゲージメント低下"
```

**注**: 時間帯パフォーマンスは`engagement-patterns.yaml`の`timeSlotPatterns`に統合されています。MVP版では2ファイルのみの構成でシンプルに運用します。

## 🔧 実装統合

### ワークフロー統合（main-workflow.ts）

```typescript
// 23:55の判定
const isDeepNightAnalysisTime = timeString === '23:55';

if (isDeepNightAnalysisTime) {
  console.log('🌙 Step 4: 深夜分析開始');
  const analysisResult = await this.executeDeepNightAnalysis(executionId);
  // ... 結果保存処理
}
```

### アクション定義（constants.ts）

```typescript
ACTIONS: {
  POST: 'post',
  RETWEET: 'retweet',
  LIKE: 'like',
  QUOTE_TWEET: 'quote_tweet',
  FOLLOW: 'follow',
  ANALYZE: 'analyze',  // 深夜分析アクション
  WAIT: 'wait'
}
```

### 実行メソッド（main-workflow.ts）

- `executeAnalyzeAction()`: 通常のアクションとして実行
- `executeDeepNightAnalysis()`: Step 4として追加実行
- `updatePostEngagementMetrics()`: 投稿エンゲージメント更新処理（MVP版）

**実行フロー（MVP版）**:
1. 23:55に通常のワークフロー実行
2. Step 4として`executeDeepNightAnalysis()`を呼び出し
3. `updatePostEngagementMetrics()`で最新50件の投稿メトリクスを更新
   - KaitoAPIの`getTweetsByIds`で一括取得（TwitterAPIの`get_tweet_by_ids`相当）
   - エンゲージメント率を計算して保存
4. 3種類の分析（performance, market, strategy）を実行
   - **performance分析**: 50件の投稿エンゲージメントパターンを分析
   - **market分析**: 高エンゲージメントトピックを特定
   - **strategy分析**: 翌日の投稿時間・形式・トピックを最適化
5. 結果をYAMLファイルに保存

## ⚠️ エラーハンドリング

### 原則：分析エラーでもワークフロー継続

```typescript
try {
  const analysisResult = await executeDeepNightAnalysis();
  // 成功処理
} catch (analysisError) {
  console.warn('⚠️ 深夜分析エラーが発生しましたが、ワークフローは継続します');
  // エラー情報を記録し、デフォルト戦略で継続
}
```

### タイムアウト設定

- 通常のClaude API呼び出し: 15秒
- 深夜分析のClaude API呼び出し: **60秒**（長時間処理対応）

### フォールバック戦略

分析が失敗した場合でも、最低限の戦略で翌日のワークフローが実行可能：

```yaml
# デフォルト戦略
priorityActions:
  - timeSlot: "09:00-12:00"
    action: "post"
    topic: "投資教育基礎"
    reasoning: "デフォルト戦略：朝の投資教育コンテンツ"
```

## 📈 期待される成果

### 短期的効果（1週間以内）
- **実行精度向上**: 時間帯別成功率の可視化と最適化
- **エンゲージメント改善**: 高成功率パターンの再現性向上
- **リスク回避**: 不適切なタイミングでのアクション防止

### 中期的効果（1ヶ月以内）
- **フォロワー成長加速**: データドリブンな戦略による着実な成長
- **コンテンツ品質向上**: 反応の良いトピックへの集中
- **運用効率化**: 自動最適化による手動調整の削減

### 長期的効果（3ヶ月以降）
- **ブランド確立**: 一貫した高品質コンテンツによる信頼構築
- **コミュニティ形成**: エンゲージメント最適化による活発な交流
- **継続的改善**: 学習データ蓄積による精度の累積的向上

## 🔍 監視とデバッグ

### ログ出力

```
🌙 深夜分析開始: 2025-07-30
📊 日中実行データ収集完了: 24件
⏰ 時間帯別パフォーマンス分析完了: 6時間帯
📈 市場トレンド包括評価完了: 5機会
🚀 戦略最適化完了: 3戦略
📅 翌日戦略生成完了
✅ 深夜分析完全完了 (892341ms) - 翌日戦略準備完了
```

### 生成ファイル確認

```bash
# 分析結果確認
cat data/current/strategy-analysis.yaml
ls -la data/learning/  # 累積学習データファイル一覧

# 学習データ詳細確認（MVP版・2ファイルのみ）
cat data/learning/engagement-patterns.yaml  # 時間帯・形式・パターン統合
cat data/learning/successful-topics.yaml    # 投資教育特化トピック

# 実行ログ確認  
cat data/current/execution-*-2355/post.yaml
```

## 🚀 MVP実装計画

### Phase 1: MVP（1週間以内）- 投稿エンゲージメント分析
- ✅ 基本的な3種類の分析実行
- ⏳ 投稿エンゲージメント更新メカニズム
- ⏳ 投稿パフォーマンスの時系列集計
- ⏳ 高パフォーマンス投稿パターンの特定

### Phase 2: 拡張機能（1ヶ月以内）
- 他のアクション（RT、いいね等）のパフォーマンス分析
- より詳細な時間軸分析（1時間、6時間、24時間）
- A/Bテスト機能

### Phase 3: 高度な分析（3ヶ月以降）
- 機械学習による予測モデル
- リアルタイム市場連動
- マルチモーダルコンテンツ戦略

## 💡 MVP実装のポイント

### 投稿エンゲージメント更新の実装
```typescript
// 投稿メトリクス更新（MVP版）
const updatePostEngagementMetrics = async () => {
  // 最新50件の投稿を取得（新しい順）
  const recentPosts = await this.getRecentPosts({ limit: 50 });
  
  // KaitoAPIで一括取得（TwitterAPI get_tweet_by_ids相当）
  const postIds = recentPosts.map(p => p.postId);
  const tweets = await kaitoAPI.getTweetsByIds({
    ids: postIds,
    'tweet.fields': 'public_metrics,created_at,id,text'
  });
  
  // エンゲージメント率を計算して保存
  const enrichedMetrics = tweets.data.map(tweet => ({
    postId: tweet.id,
    content: tweet.text,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics.like_count,
    retweets: tweet.public_metrics.retweet_count,
    replies: tweet.public_metrics.reply_count,
    impressions: tweet.public_metrics.impression_count,
    engagementRate: (
      (tweet.public_metrics.like_count + 
       tweet.public_metrics.retweet_count + 
       tweet.public_metrics.reply_count) / 
      tweet.public_metrics.impression_count * 100
    ).toFixed(2),
    ageInDays: Math.floor((Date.now() - new Date(tweet.created_at)) / (1000 * 60 * 60 * 24))
  }));
  
  await this.savePostMetrics(enrichedMetrics);
};
```

### 分析への反映
```typescript
// パフォーマンス分析で投稿エンゲージメントを重視
const performancePrompt = `
以下の最新50件の投稿データからパフォーマンスパターンを分析してください：

1. 高エンゲージメント投稿（率 >= 3.0%）の共通点
   - 投稿時間帯の傾向
   - コンテンツ形式（番号付きリスト、質問形式等）
   - トピックの特徴

2. 投稿の鮮度とパフォーマンス
   - 0-1日目 vs 2-7日目 vs 8日以降のエンゲージメント率

3. 明日の投稿最適化提案
   - 推奨投稿時間（3つ）
   - 推奨コンテンツ形式
   - 避けるべきパターン
`;
```

---

## 📝 MVP実装チェックリスト

### 必須実装項目
- [ ] 最新50件の投稿メトリクス更新機能（`updatePostEngagementMetrics`）
- [ ] KaitoAPIの`getTweetsByIds`エンドポイント実装（TwitterAPIラップ）
- [ ] エンゲージメント率計算ロジック
- [ ] `latest-50-metrics.yaml`ファイルの保存処理
- [ ] 投稿パフォーマンス分析プロンプトの調整
- [ ] パフォーマンスサマリーYAMLの投稿セクション追加

### 実装の簡略化
- 最新50件の投稿エンゲージメント分析に特化
- 他のアクション（RT、いいね等）の分析は後回し
- 競合分析は後回し（Phase 2以降）
- 予測モデルや時系列分析は後回し

**参照元**: このドキュメントは深夜分析機能の完全な仕様書です。実装の詳細は以下を参照：
- 実装コード: `src/claude/endpoints/analysis-endpoint.ts`
- ワークフロー統合: `src/workflows/main-workflow.ts`
- データ管理: `src/shared/data-manager.ts`