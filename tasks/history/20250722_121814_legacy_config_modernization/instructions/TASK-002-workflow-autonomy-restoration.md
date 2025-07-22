# TASK-002: Claude自律システム完全復元 - 制約除去とワークフロー最適化

## 🎯 **タスク概要**
現在のシステムが「Claude Code SDK中心の完全自律システム」から逸脱し、多数の固定制約によりClaudeの自律性が大幅に制限されている問題を解決する。

## 🚨 **Critical Issue: 自律性の重大な制約**

### 現在の問題状況
システムが **Claude支援自動化** として動作しており、本来の **Claude自律システム** から大きく逸脱している。

#### 🔗 主要制約事項
1. **投稿タイプ制約**: 100% original_post 強制、他のアクション禁止
2. **固定目標**: 1日15投稿の強制設定
3. **固定テーマ**: 教育的投資コンテンツのハードコード
4. **固定ワークフロー**: アルゴリズム主導、Claude判断排除

## 🧠 **真の自律性回復要求**

### 1. コンテンツタイプ制約の完全除去

#### 現在の制約コード（削除対象）
```typescript
// daily-action-planner.ts:73-83
const adjusted = {
  original_post: remaining  // ← この100%強制を除去
};

// decision-engine.ts:977-978  
if (decision.type === 'original_post') {
  // ← この制約フィルターを除去
}
```

#### 実装要求
```typescript
// Claudeによる完全自律アクション選択
const actionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'];
const claudeDecision = await this.claudeAgent.determineOptimalActionMix({
  marketCondition,
  accountStatus,
  recentPerformance,
  availableContent
});
```

### 2. 固定目標設定の除去と自律化

#### 削除対象
```typescript
// daily-action-planner.ts:25
private readonly DAILY_TARGET = 15;  // ← 完全削除

// current-decisions.yaml:27
dailyTarget: 15  // ← Claude判断に変更
```

#### 実装要求
```typescript
// Claude自律的頻度決定
const optimalFrequency = await this.claudeAgent.determineOptimalPostingFrequency({
  accountHealth: this.accountAnalyzer.getCurrentHealth(),
  engagement: this.performanceAnalyzer.getEngagementTrends(),
  marketConditions: this.marketAnalyzer.getCurrentConditions(),
  competitorActivity: this.competitorAnalyzer.getActivity()
});
```

### 3. 固定テーマ・コンテンツテンプレートの除去

#### 削除対象（すべてのハードコードコンテンツ）
```typescript
// すべての fallback content examples を削除
'投資の基本原則：リスク管理とポートフォリオ分散の重要性について'
'投資初心者の方からよくある質問...'
'長期投資の視点：短期的な変動に惑わされない投資マインドの重要性'
```

#### 実装要求
```typescript
// Claude完全自律コンテンツ決定
const contentStrategy = await this.claudeAgent.analyzeAndDecideContentStrategy({
  marketAnalysis: currentMarketState,
  trendAnalysis: emergingTrends,
  audienceInsights: audienceData,
  performanceHistory: historicalPerformance
});
```

### 4. ワークフロー自律化の実装

#### 現在の固定フロー（削除対象）
```
AutonomousExecutor → DecisionEngine → ActionSpecificCollector → Fixed Execution
```

#### 新しい自律フロー
```
Claude分析 → Claude戦略決定 → Claude実行計画 → Claude適応的実行 → Claude学習
```

#### 実装要求
```typescript
class TrueAutonomousWorkflow {
  async executeAutonomousSession(): Promise<AutonomousResult> {
    // 1. Claude自律的状況分析
    const marketAnalysis = await this.claudeAgent.analyzeCurrentSituation();
    
    // 2. Claude自律的戦略決定  
    const strategy = await this.claudeAgent.determineOptimalStrategy(marketAnalysis);
    
    // 3. Claude自律的実行計画
    const executionPlan = await this.claudeAgent.createExecutionPlan(strategy);
    
    // 4. Claude適応的実行
    const results = await this.claudeAgent.executeWithContinuousAdaptation(executionPlan);
    
    // 5. Claude自律学習・最適化
    await this.claudeAgent.learnAndOptimize(results);
    
    return results;
  }
}
```

## 🔧 **具体的実装要求**

### A. daily-action-planner.ts の完全リファクタリング

#### 削除対象
- `DAILY_TARGET` 定数
- 100% original_post 強制配分
- 固定市場応答ロジック

#### 追加要求
```typescript
class ClaudeAutonomousPlanner {
  async planAutonomously(context: MarketContext): Promise<AutonomousPlan> {
    return await this.claudeAgent.createComprehensivePlan({
      market: context.marketConditions,
      account: context.accountStatus,
      performance: context.recentPerformance,
      goals: context.currentGoals
    });
  }
}
```

### B. decision-engine.ts の自律化強化

#### 削除対象  
- original_post フィルター
- 固定判断ロジック
- ハードコード決定パラメータ

#### 追加要求
```typescript
class ClaudeDecisionEngine {
  async makeAutonomousDecision(context: DecisionContext): Promise<AutonomousDecision> {
    // Claude SDK による完全自律判断
    return await this.claudeAgent.makeStrategicDecision({
      availableActions: ALL_ACTION_TYPES,
      constraints: NONE,  // 制約なし
      optimizationGoal: 'user_value_maximization'
    });
  }
}
```

### C. 新しい Claude SDK 統合レイヤー

#### 実装要求
```typescript
// src/lib/claude-autonomous-agent.ts
export class ClaudeAutonomousAgent {
  async determineStrategy(context: FullContext): Promise<AutonomousStrategy>;
  async planExecution(strategy: AutonomousStrategy): Promise<ExecutionPlan>;
  async executeAdaptively(plan: ExecutionPlan): Promise<ExecutionResults>;
  async learnAndOptimize(results: ExecutionResults): Promise<OptimizationPlan>;
}
```

## 📋 **削除すべき制約ファイル/セクション**

### 設定ファイル修正
1. **current-decisions.yaml**: `dailyTarget: 15` → Claude決定に変更
2. **daily-action-data.yaml**: 固定配分ルール削除
3. **action-collection-strategies.yaml**: 固定戦略から自律戦略へ

### TypeScript ファイル修正
1. **daily-action-planner.ts**: 固定ロジック除去、Claude統合
2. **decision-engine.ts**: 制約フィルター除去、完全自律化
3. **autonomous-executor.ts**: 固定ワークフロー → 自律ワークフロー

## 🎯 **真の自律性検証要求**

### 実行時検証
```bash
# 以下のログが表示されることを確認
✅ [Claude自律] 市場分析に基づく最適アクション決定: quote_tweet (理由: 高いエンゲージメント期待)
✅ [Claude自律] 動的頻度調整: 今日は12投稿が最適 (理由: 市場関心度上昇)
✅ [Claude自律] テーマ決定: 新興暗号通貨動向分析 (理由: トレンド検出)
```

### 自律性確認テスト
1. **アクション多様性**: original_post以外のアクションが自動選択される
2. **動的頻度**: 日によって投稿数が変動する
3. **適応的テーマ**: 市場状況に応じてテーマが変化する
4. **学習効果**: 過去の成果から戦略が改善される

## 📊 **成功指標**

### 自律性回復指標
- ✅ **アクションタイプ自由度**: 全4タイプの自動選択確認
- ✅ **頻度最適化**: Claude判断による動的調整
- ✅ **テーマ多様性**: 市場適応的テーマ生成
- ✅ **学習機能**: 継続的パフォーマンス向上

### システム品質指標
- ✅ **TypeScript strict**: 型安全性100%
- ✅ **Performance**: レスポンス時間改善
- ✅ **Reliability**: エラー率低下

## ⚡ **実装順序（Critical Priority）**

1. **Phase 1 - 制約除去**: 固定制約コードの完全削除
2. **Phase 2 - Claude統合**: Claude SDK による判断層実装
3. **Phase 3 - 自律化**: 完全自律ワークフローの実装
4. **Phase 4 - 学習化**: 継続的最適化システムの実装

---

**🚨 URGENT**: この実装により、システムは真の「Claude Code SDK中心の完全自律システム」となり、CLAUDE.mdで定義された革新的価値創造が実現されます。すべての固定制約を除去し、Claudeの完全な自律性を回復してください。