# ActionSpecificCollector アーキテクチャ設計書

## 🎯 概要

ActionSpecificCollectorは、Claude主導の目的特化型・自律的情報収集戦略を実現するコアシステムです。
アクション決定後の特化収集とClaude-Playwright連鎖サイクルによる動的情報充足度保証を提供します。

## 🏗️ アーキテクチャ原則

### 1. 統合性
- 既存の`DecisionEngine`、`ClaudeControlledCollector`、`EnhancedInfoCollector`と自然に統合
- `ActionDecision`型を受け取り、`ActionContext`型を返す一貫性のあるインターフェース
- YAML駆動設定管理との完全互換性

### 2. 自律性
- Claude判断による動的収集戦略調整
- Playwright実行結果の自動評価
- 情報充足度85%以上の自動保証

### 3. 特化性
- アクション型別の最適化された収集戦略
- original_post/quote_tweet/retweet/reply専用ロジック
- コンテキスト特化型情報フィルタリング

## 🔧 クラス設計図

```
┌─────────────────────────────────────────────────────────────┐
│                 ActionSpecificCollector                     │
├─────────────────────────────────────────────────────────────┤
│ Private Fields:                                             │
│ - claudeAgent: ClaudeAgent                                  │
│ - playwrightManager: PlaywrightManager                     │
│ - collectionStrategies: Map&lt;ActionType, CollectionStrategy&gt; │
│ - sufficiencyEvaluator: SufficiencyEvaluator               │
│ - chainManager: ChainManager                               │
├─────────────────────────────────────────────────────────────┤
│ Public Methods:                                             │
│ + collectForAction(decision: ActionDecision): Promise&lt;ActionContext&gt; │
│ + executeCollectionCycle(strategy: CollectionStrategy): Promise&lt;CycleResult&gt; │
│ + evaluateInformationSufficiency(data: CollectedData): Promise&lt;SufficiencyScore&gt; │
├─────────────────────────────────────────────────────────────┤
│ Private Methods:                                            │
│ - determineCollectionStrategy(actionType: ActionType): CollectionStrategy │
│ - executeClaude Phase(prompt: string, timeLimit: number): Promise&lt;ClaudeResult&gt; │
│ - executePlaywrightPhase(instructions: PlaywrightInstructions): Promise&lt;PlaywrightResult&gt; │
│ - shouldContinueChain(currentData: CollectedData): Promise&lt;boolean&gt; │
│ - consolidateActionContext(chainResults: ChainResult[]): ActionContext │
└─────────────────────────────────────────────────────────────┘
            │
            │ depends on
            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CollectionStrategy                        │
├─────────────────────────────────────────────────────────────┤
│ + actionType: ActionType                                    │
│ + phases: CollectionPhase[]                                 │
│ + sufficiencyThreshold: number                              │
│ + maxCycles: number                                         │
│ + timeboxLimits: TimeboxLimits                              │
└─────────────────────────────────────────────────────────────┘
            │
            │ contains
            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CollectionPhase                           │
├─────────────────────────────────────────────────────────────┤
│ + type: 'claude' | 'playwright'                            │
│ + duration: number                                          │
│ + objective: string                                         │
│ + parameters: PhaseParameters                               │
│ + successCriteria: SuccessCriteria                          │
└─────────────────────────────────────────────────────────────┘
```

## 🎭 詳細インターフェース定義

### CoreInterfaces

```typescript
// メインインターフェース
interface ActionSpecificCollector {
  collectForAction(decision: ActionDecision): Promise&lt;ActionContext&gt;;
  executeCollectionCycle(strategy: CollectionStrategy): Promise&lt;CycleResult&gt;;
  evaluateInformationSufficiency(data: CollectedData): Promise&lt;SufficiencyScore&gt;;
}

// 収集戦略定義
interface CollectionStrategy {
  actionType: ActionType;
  phases: CollectionPhase[];
  sufficiencyThreshold: number; // 0.85 = 85%
  maxCycles: number;
  timeboxLimits: {
    claudePhase: number;    // 15秒
    playwrightPhase: number; // 45秒
    evaluationPhase: number; // 20秒
    additionalPhase: number; // 10秒
  };
  dynamicAdjustment: {
    enabled: boolean;
    adaptationRules: AdaptationRule[];
  };
}

// アクションコンテキスト（戻り値）
interface ActionContext {
  actionId: string;
  actionType: ActionType;
  collectedData: CollectedData;
  sufficiencyScore: number;
  insights: ActionInsight[];
  recommendations: ActionRecommendation[];
  executionReadiness: boolean;
  collectionsExecuted: number;
  totalExecutionTime: number;
  metadata: {
    chainsExecuted: number;
    claudeInvocations: number;
    playwrightSessions: number;
    dataPoints: number;
  };
}

// 収集データ構造
interface CollectedData {
  originalPosts?: OriginalPostData;
  quoteTweets?: QuoteTweetData;
  retweets?: RetweetData;
  replies?: ReplyData;
  marketContext?: MarketContextData;
  trends?: TrendData[];
  competitors?: CompetitorData[];
}
```

### アクション特化型データ構造

```typescript
// original_post専用データ
interface OriginalPostData {
  marketTrends: TrendAnalysis[];
  competitorInsights: CompetitorAnalysis[];
  uniqueAngles: UniqueAngle[];
  contentOpportunities: ContentOpportunity[];
  riskFactors: RiskFactor[];
}

// quote_tweet専用データ
interface QuoteTweetData {
  candidateTweets: CandidateTweet[];
  valueAdditions: ValueAddition[];
  engagementPotential: EngagementAnalysis[];
  audienceAlignment: AudienceAlignment[];
}

// retweet専用データ
interface RetweetData {
  verifiedCandidates: VerifiedCandidate[];
  credibilityScores: CredibilityScore[];
  valueAssessments: ValueAssessment[];
  riskEvaluations: RiskEvaluation[];
}

// reply専用データ
interface ReplyData {
  targetConversations: TargetConversation[];
  engagementOpportunities: EngagementOpportunity[];
  valueContributions: ValueContribution[];
  relationshipPotential: RelationshipPotential[];
}
```

### 連鎖サイクル管理

```typescript
// サイクル結果
interface CycleResult {
  cycleId: string;
  phaseResults: PhaseResult[];
  sufficiencyAchieved: boolean;
  improvementMade: boolean;
  nextCycleRecommended: boolean;
  executionTime: number;
}

// フェーズ結果
interface PhaseResult {
  phaseType: 'claude' | 'playwright';
  duration: number;
  success: boolean;
  dataCollected: any;
  insights: string[];
  nextPhaseInstructions?: string;
}

// 充足度評価
interface SufficiencyScore {
  overall: number; // 0.0-1.0
  breakdown: {
    dataCompleteness: number;
    dataQuality: number;
    actionRelevance: number;
    uniqueInsights: number;
  };
  gaps: InformationGap[];
  recommendations: ImprovementRecommendation[];
}
```

## 📊 アクション別収集戦略フローチャート

### Original Post Strategy Flow
```
Start
  │
  ▼
[Claude初期判断] (15s)
  │ Market Analysis
  │ Trend Identification  
  │ Unique Angle Discovery
  ▼
[Playwright実行] (45s)
  │ Trend Data Collection
  │ Competitor Analysis
  │ Market Context Gathering
  ▼
[Claude再判断] (20s)
  │ Data Quality Assessment
  │ Content Angle Refinement
  │ Risk Factor Analysis
  ▼
[継続判断]
  ├─ Yes → [追加収集] (10s)
  └─ No → [統合・出力]
```

### Quote Tweet Strategy Flow
```
Start
  │
  ▼
[Claude初期判断] (15s)
  │ Tweet Candidate Search
  │ Value Addition Opportunity
  │ Engagement Potential Analysis
  ▼
[Playwright実行] (45s)
  │ Tweet Content Collection
  │ Engagement Data Analysis
  │ Author Credibility Check
  ▼
[Claude再判断] (20s)
  │ Comment Quality Assessment
  │ Added Value Evaluation
  │ Audience Alignment Check
  ▼
[継続判断]
  ├─ Yes → [深掘り分析] (10s)
  └─ No → [最適選定・出力]
```

### Retweet Strategy Flow
```
Start
  │
  ▼
[Claude初期判断] (15s)
  │ Credibility Screening
  │ Value Assessment
  │ Risk Evaluation
  ▼
[Playwright実行] (45s)
  │ Source Verification
  │ Engagement Metrics
  │ Community Reaction Analysis
  ▼
[Claude再判断] (20s)
  │ Final Credibility Check
  │ Brand Alignment Assessment
  │ Risk-Benefit Analysis
  ▼
[継続判断]
  ├─ Yes → [追加検証] (10s)
  └─ No → [実行判断・出力]
```

### Reply Strategy Flow
```
Start
  │
  ▼
[Claude初期判断] (15s)
  │ Conversation Identification
  │ Engagement Opportunity
  │ Value Contribution Potential
  ▼
[Playwright実行] (45s)
  │ Thread Context Analysis
  │ Participant Profiling
  │ Conversation Quality Check
  ▼
[Claude再判断] (20s)
  │ Response Strategy Planning
  │ Value Addition Assessment
  │ Relationship Building Potential
  ▼
[継続判断]
  ├─ Yes → [深度分析] (10s)
  └─ No → [最適応答・出力]
```

## 🔄 連鎖サイクル状態遷移図

```
[Initial State: Ready]
        │
        ▼
[Claude Phase: Analysis] ────┐
        │                   │
        ▼                   │ 
[Playwright Phase: Execution]│
        │                   │
        ▼                   │
[Evaluation Phase: Assessment]
        │                   │
        ▼                   │
[Decision Point] ───────────┘
    │         │
    │         ▼
    │    [Additional Cycle]
    │         │
    ▼         │
[Output: ActionContext] ◄───┘

State Descriptions:
- Ready: 初期状態、ActionDecisionを受信済み
- Analysis: Claude主導の戦略策定・情報ニーズ特定
- Execution: Playwright自動実行による情報収集
- Assessment: Claude主導の品質評価・充足度判定
- Decision Point: 継続/終了の自律判断
- Additional Cycle: 追加情報収集サイクル
- Output: 最終的なActionContext生成
```

## 🎯 実装手順・優先度

### Phase 1: Core Infrastructure (高優先度)
1. **ActionSpecificCollector基本クラス実装**
   - インターフェース定義
   - 基本メソッドスケルトン
   - 既存システムとの統合ポイント

2. **CollectionStrategy設定システム**
   - YAML駆動設定読み込み
   - アクション別戦略定義
   - 動的戦略調整機能

3. **Claude連携エンジン**
   - Claude SDK統合
   - プロンプト管理システム
   - 結果解析・構造化

### Phase 2: Collection Engine (高優先度)
4. **Playwright実行マネージャー**
   - 自動化スクリプト実行
   - 並列処理管理
   - エラーハンドリング

5. **連鎖サイクルエンジン**
   - フェーズ管理
   - 状態遷移制御
   - 終了条件判定

6. **情報充足度評価**
   - データ品質評価
   - 充足度スコア算出
   - ギャップ分析

### Phase 3: Action-Specific Logic (中優先度)
7. **Original Post収集特化ロジック**
   - 市場分析・トレンド収集
   - 独自視点発見
   - コンテンツ機会評価

8. **Quote Tweet収集特化ロジック**
   - 候補ツイート検索・評価
   - 付加価値分析
   - エンゲージメント予測

9. **Retweet/Reply収集特化ロジック**
   - 信頼性検証
   - 関係性分析
   - リスク評価

### Phase 4: Integration & Optimization (低優先度)
10. **統合テスト・最適化**
    - E2Eテストシナリオ
    - パフォーマンス最適化
    - モニタリング・ロギング

11. **YAML設定充実化**
    - 戦略パラメータ拡張
    - カスタマイゼーション機能
    - 運用設定管理

12. **ドキュメント・運用手順**
    - API リファレンス
    - 運用ガイド
    - トラブルシューティング

## 🔗 既存システム統合ポイント

### DecisionEngine統合
- `planExpandedActions()`メソッドからの呼び出し
- `ActionDecision`型の完全互換性
- 統合コンテキストの活用

### ClaudeControlledCollector統合
- 並列実行機能の継承・拡張
- ブラウザ管理の共有
- Claude SDK統合の最適化

### EnhancedInfoCollector統合
- 基本収集機能の活用
- Mock/Real切り替え機能
- 品質評価ロジックの再利用

## ⚡ 技術仕様詳細

### Claude SDK活用
- Model: Sonnet (高度な判断タスク用)
- Timeout: 各フェーズ時間制限
- Structured Output: JSON強制出力
- Error Handling: フォールバック戦略

### Playwright最適化
- Headless実行（本番）
- 並列コンテキスト管理
- Rate Limiting考慮
- メモリ効率化

### TypeScript厳密モード
- 完全型安全
- Generic活用
- Utility Types利用
- Branded Types導入

### YAML設定駆動
- 実行時設定変更
- 環境別設定
- A/Bテスト対応
- バージョン管理

---

**設計原則**: シンプルさと強力さの両立、既存システムとの自然な統合、Claude主導の自律性確保