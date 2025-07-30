# Claude Code SDK 仕様書

## 🎯 システムの本質的価値

Claude Code SDKは、TradingAssistantXの**知的中枢**として機能し、投資教育コンテンツの品質とエンゲージメントを最大化します。

### 核心機能
- **AI品質保証**: Claudeによる教育的価値の担保と最適化
- **戦略的コンテンツ生成**: 時間帯・市場状況・学習データに基づく最適コンテンツ
- **知的選択システム**: 膨大なツイート候補から最高品質を自動選択
- **継続学習**: 1日1回分析による戦略最適化

### MVPでの達成価値
- **教育コンテンツ品質**: 投資初心者〜中級者への確実な価値提供
- **エンゲージメント最適化**: AI判断によるいいね・RT・フォロワー増最大化  
- **運用自動化**: 手動判断を排除した24時間体制での品質保証
- **戦略進化**: 深夜分析による翌日戦略の自動最適化

## 🏗️ エンドポイント設計哲学

### 設計原則：明確な責任分離
**「1エンドポイント = 1つの明確な責任」**により、保守性・拡張性・テスト容易性を実現。

| エンドポイント | 知的責任 | 価値提供 |
|---|---|---|
| `generateContent` | 教育的コンテンツ創造 | 時間帯・対象者に最適化された価値あるコンテンツ |
| `selectOptimalTweet` | **知的選択判断** | 膨大な候補から最高品質ツイートの選択 |
| `generateQuoteComment` | 価値追加コメント | 独自視点による教育的価値の付加 |
| `analyzePerformance` | 戦略分析・改善 | 実行結果からの学習と戦略最適化 |

### 設計の競争優位性
- **責任分離**: 各機能が独立し、変更影響を局所化
- **型安全連携**: TypeScript型による確実なデータフロー
- **統一アーキテクチャ**: KaitoAPIと同様の構造で学習コスト削減
- **段階的拡張**: 新機能は新エンドポイント追加のみで実現

## 🌟 selectOptimalTweet：知的選択の核心

**最重要機能**: 複数のツイート候補から投資教育的価値・エンゲージメント・信頼性を総合評価し、最適なツイートを選択。

### AI判断基準の設計

**リツイート・引用ツイート**
- **教育的価値（40%）**: 投資初心者〜中級者への学習効果
- **エンゲージメント予測（30%）**: いいね・RT・リプライ拡散力予測
- **信頼性評価（20%）**: 情報源確実性とアカウント信頼度
- **関連性適合（10%）**: 指定トピックとの精密な適合度

**いいね（関係構築重視）**
- **関係構築可能性（90%）**: そのユーザーが私のアカウント（投資教育）に興味を持ちそうか
- **エンゲージメント予測（10%）**: 限定的な重要度（他人に見られないため）

**フォロー（戦略的ネットワーク構築）**
- **専門性評価（40%）**: 投資教育分野での専門知識・権威性
- **相互関係可能性（30%）**: フォローバック・継続的な関係構築可能性
- **影響力評価（20%）**: フォロワー数・エンゲージメント率
- **コンテンツ親和性（10%）**: 投資教育アカウントとの価値観一致度

### 入力設計（最小必要項目）
```typescript
{
  candidates: TweetCandidate[],           // 最大20件の候補
  selectionType: 'like' | 'retweet' | 'quote_tweet' | 'follow',
  criteria: {
    topic: string,                        // 投資教育トピック
    qualityThreshold: number,             // 品質閾値（0-10）
    engagementWeight: number,             // エンゲージメント重視度
    relevanceWeight: number               // 関連性重視度
  }
}
```

### Claude判断の最適化
- **トークン効率化**: ツイート本文200文字制限による判断精度向上
- **情報選別**: 判断に不要な情報を排除し、核心要素のみ送信
- **判断速度**: 平均3-5秒での高精度選択実現

## 🔄 ワークフロー統合：4ステップの知的実行

### 統合設計の価値
Claude SDKは独立したツールではなく、KaitoAPIとDataManagerと統合された**知的実行システム**として機能。

### アクション別実行フロー

**投稿アクション**
```
トピック設定（schedule.yaml）→ 教育コンテンツ生成（generateContent）→ 投稿実行
```

**リツイートアクション**  
```
検索クエリ取得（schedule.yaml）→ 候補収集（KaitoAPI）→ AI選択（selectOptimalTweet）→ RT実行
```

**引用リツイートアクション**
```
検索クエリ取得（schedule.yaml）→ 候補収集（KaitoAPI）→ AI選択（selectOptimalTweet）→ 価値追加（generateQuoteComment）→ 引用RT実行
```

**いいねアクション**
```
検索クエリ取得（schedule.yaml）→ 候補収集（KaitoAPI）→ 関係構築評価（selectOptimalTweet）→ いいね実行
```

**フォローアクション**
```
検索クエリ取得（schedule.yaml）→ ユーザー検索（KaitoAPI）→ 戦略的関係構築評価（selectOptimalTweet）→ フォロー実行
```

### ワークフロー統合の効果
- **情報品質向上**: 事前定義クエリ→AI判断→コンテンツ生成の一貫フロー
- **戦略一貫性**: 全アクションで統一された投資教育価値基準
- **学習循環**: 日中実行→深夜分析→翌日戦略最適化の24時間サイクル

## 🌙 深夜分析システム：24時間学習サイクル

### 分析実行スケジュール
- **実行時刻**: 毎日23:55（日次分析の最適化タイミング）
- **実行頻度**: 1日1回（コスト効率化と深い洞察の両立）
- **処理時間**: 約15-30分（翌日戦略生成完了：00:30頃）

### 詳細実行ステップ（23:55実行時の拡張フロー）

**Step 1: データ収集（通常と同じ）**
```
アカウント情報取得 → 直近実行履歴読み込み → 現在時刻コンテキスト取得
```

**Step 2: アクション実行（通常と同じ）**
```
schedule.yamlの23:55定義アクション実行（例：深夜向け投稿）
```

**Step 3: 結果保存（通常と同じ）**
```
実行結果をdata/current/execution-YYYYMMDD-2355/に保存
```

**Step 4: 分析（23:55限定の追加ステップ）**

#### 4-1: 分析データ収集フェーズ
```
収集対象:
- data/current/execution-*/execution-summary.yaml（本日全実行）
- data/current/execution-*/kaito-responses/*.yaml（全API応答）
- data/current/execution-*/posts/*.yaml（全投稿データ）
- data/learning/decision-patterns.yaml（過去の学習パターン）
- data/current/active-session.yaml（現在のアカウント状態）
```

#### 4-2: Claude SDK分析実行フェーズ

**analyzePerformance入力仕様**:
```typescript
{
  // 本日の全実行データ
  todayExecutions: {
    totalActions: number,
    actionBreakdown: {
      post: { count: number, avgEngagement: number },
      retweet: { count: number, successRate: number },
      quote_tweet: { count: number, avgReach: number },
      like: { count: number, relationshipBuilt: number },
      follow: { count: number, followBackRate: number }
    },
    timeSlotPerformance: {
      [timeSlot: string]: {
        actions: string[],
        engagementRate: number,
        followerGrowth: number
      }
    }
  },
  
  // アカウント成長メトリクス
  accountMetrics: {
    startFollowers: number,
    endFollowers: number,
    totalEngagements: number,
    topPerformingPosts: Array<{
      content: string,
      engagement: number,
      time: string
    }>
  },
  
  // 過去7日間のトレンド
  weeklyTrends: {
    averageEngagement: number,
    growthRate: number,
    bestPerformingTopics: string[],
    worstPerformingTopics: string[]
  },
  
  // 分析指示
  analysisPrompt: "1日の実行データから以下を分析してください：
    1. 時間帯別の最適アクション組み合わせ
    2. エンゲージメント向上に効果的だったトピック
    3. フォロワー増加に寄与した要因
    4. 明日実行すべき優先アクション（時刻付き）
    5. 避けるべき時間帯・トピック
    6. 新たに試すべき戦略提案"
}
```

**analyzePerformance返却仕様**:
```typescript
{
  dailyInsights: {
    performancePatterns: Array<{
      timeSlot: string,
      successRate: number,
      optimalTopics: string[],
      recommendedActions: string[]
    }>,
    
    topicAnalysis: {
      highPerformance: Array<{
        topic: string,
        avgEngagement: number,
        bestTimeSlots: string[]
      }>,
      lowPerformance: Array<{
        topic: string,
        reason: string,
        improvement: string
      }>
    },
    
    followerGrowthFactors: Array<{
      factor: string,
      impact: number,
      recommendation: string
    }>
  },
  
  tomorrowStrategy: {
    prioritySchedule: Array<{
      time: string,
      action: string,
      topic?: string,
      targetQuery?: string,
      reasoning: string
    }>,
    
    avoidanceList: Array<{
      timeSlot?: string,
      topic?: string,
      reason: string
    }>,
    
    experimentalStrategies: Array<{
      strategy: string,
      expectedOutcome: string,
      riskLevel: 'low' | 'medium' | 'high'
    }>
  }
}
```

#### 4-3: 戦略ファイル生成フェーズ
```
生成ファイル:
1. data/learning/daily-insights-YYYYMMDD.yaml（日次分析結果）
2. data/current/tomorrow-strategy.yaml（翌日自動適用戦略）
3. data/learning/performance-summary-YYYYMMDD.yaml（パフォーマンス集計）
```

### 学習データ構造の進化

**従来の課題**: `decision-patterns.yaml`
```yaml
# 意味のない反復データ
followers: 0
engagement_rate: 0
market_trend: neutral
```

**新構造**: 意味のある学習データ
```yaml
# data/learning/daily-insights-YYYYMMDD.yaml
performance_patterns:
  - time_slot: "07:00-10:00"
    success_rate: 0.85
    optimal_topics: ["朝の投資情報", "市場開始前準備"]
  - time_slot: "20:00-22:00" 
    success_rate: 0.92
    optimal_topics: ["今日の振り返り", "明日の戦略"]

market_opportunities:
  - topic: "NISA制度改正"
    relevance: 0.9
    recommended_action: "educational_post"
    expected_engagement: 4.2

optimization_insights:
  - pattern: "quote_tweet_evening_high_success"
    implementation: "夕方の引用ツイートを30%増加"
    expected_impact: "+15% engagement"
```

### 翌日戦略自動生成

**戦略配信**: `data/current/tomorrow-strategy.yaml`
- 優先アクション順序
- 時間帯別最適コンテンツ
- 回避すべきトピック・時間帯
- 期待成果指標

**自動適用**: 翌日の実行ワークフローが戦略を自動読み込み・適用

## 📊 プロンプト変数システム：コンテクスト最適化

### 変数体系の設計思想
各変数は投資教育コンテンツの品質最大化のために厳選された要素。

| 変数分類 | 核心変数 | 最適化効果 |
|---|---|---|
| **時間戦略** | `dayOfWeek`, `timeContext`, `hour` | 時間帯別エンゲージメント最大化 |
| **アカウント戦略** | `followerCount`, `engagementRate`, `postsToday` | フォロワー特性に応じた内容調整 |
| **学習戦略** | `recentTopics`, `avgEngagement`, `successPatterns` | 過去実績に基づく戦略最適化 |
| **市場戦略** | `sentiment`, `volatility`, `trendingTopics` | リアルタイム市場連動コンテンツ |

### 時間戦略の設計
- **朝（7-10時）**: 1日のスタートに役立つ投資情報・前向きなメッセージ
- **昼（12-14時）**: サクッと読める実践的な投資テクニック
- **夜（20-22時）**: 1日の振り返り・明日への投資戦略準備
- **週末**: じっくり学習できる投資理論・来週の注目ポイント

## 🎨 プロンプトテンプレート管理：DRY原則による効率化

### 設計哲学
プロンプトの重複を完全排除し、一貫性のある高品質コンテンツ生成を実現。

### アーキテクチャ構造
```
src/claude/prompts/
├── templates/     # 投資教育特化テンプレート
├── builders/      # コンテクスト統合ビルダー
└── index.ts       # 統一エクスポート
```

### BaseBuilderの価値
- **共通ロジック統合**: 時間帯判定・アカウント分析・市場状況処理を一元化
- **品質一貫性**: 全エンドポイントで統一された投資教育価値基準
- **保守効率**: プロンプト変更が全システムに自動反映

## 🔐 認証・SDK設定：技術基盤

### Claude Code SDK設定
- **SDK**: `@instantlyeasy/claude-code-sdk-ts`（Claude Code Max Plan最大活用）
- **認証**: `claude login`ローカル認証（環境変数設定不要）
- **推奨モデル**: `sonnet`（教育コンテンツ生成に最適化）
- **必須設定**: `.skipPermissions()`使用

### エラーハンドリング戦略
```typescript
try {
  const response = await claude()
    .withModel('sonnet')
    .withTimeout(30000)
    .skipPermissions()
    .query(prompt)
    .asText();
} catch (error) {
  // 詳細ログ + 適切なエラー再スロー
}
```

### セッション永続化
- Twitterログインセッション自動保存（`data/current/twitter-session.yaml`）
- アプリ再起動後の認証スキップによる運用効率化

## 🧪 品質保証：テスト戦略

### エンドポイント別テスト設計
| エンドポイント | 品質検証項目 | 成功基準 |
|---|---|---|
| content-endpoint | 教育的価値・文体制御・文字数制限 | 投資初心者理解度90%以上 |
| analysis-endpoint | メトリクス精度・トレンド分析 | 予測精度85%以上 |
| search-endpoint | クエリ品質・フィルター精度 | 関連度90%以上のツイート発見 |
| selection-endpoint | 選択精度・基準適用・リスク評価 | 選択品質スコア8.0以上 |

### 品質保証体制
- **フレームワーク**: Jest + TypeScript厳格モード
- **カバレッジ要件**: 各エンドポイント90%以上
- **モッキング戦略**: Claude API完全モック化による高速テスト
- **統合テスト**: エンドポイント間連携の確実性検証

## 🎯 制約事項・設計ガイドライン

### 設計制限の理由
- **責任明確化**: 1エンドポイント=1責任により、変更影響の局所化
- **過剰設計回避**: MVPで実際に使用する機能のみ実装し、複雑性を排除
- **型安全優先**: コンパイル時エラー検出による実行時安定性確保
- **実用性重視**: 投資教育コンテンツの価値最大化を最優先

### 成功への指針
- コード例より概念理解を重視
- 他ドキュメントとの重複完全回避
- 投資教育価値の継続的向上
- システム全体の統合効果最大化

## 📈 期待される成果

### 投資教育価値の実現
- **教育効果**: フォロワーの投資知識向上による長期的関係構築
- **エンゲージメント**: AI最適化による自然なコミュニティ形成
- **信頼構築**: 一貫した高品質コンテンツによる専門性の確立
- **成長循環**: 学習データ蓄積による継続的品質向上

### システム価値の実現
- **運用自動化**: 24時間体制での高品質コンテンツ提供
- **戦略進化**: 深夜分析による適応的改善
- **技術基盤**: 拡張可能なアーキテクチャによる将来機能追加容易性
- **運用効率**: エラー最小化による安定運用の実現

Claude Code SDKは、単なるAPI呼び出しツールではなく、投資教育コンテンツの**知的品質保証システム**として、TradingAssistantXの核心価値を実現する統合プラットフォームです。