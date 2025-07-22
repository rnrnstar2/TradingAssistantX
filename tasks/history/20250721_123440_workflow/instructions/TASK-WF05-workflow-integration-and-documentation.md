# TASK-WF05: ワークフロー統合・文書更新

## 🎯 目的
TASK-WF01〜WF04の改善を統合し、新しい最適化ワークフローを完成させ、文書を更新する。

## 📋 前提条件
**必須**: TASK-WF01, TASK-WF02, TASK-WF03, TASK-WF04の完了

## 🔍 入力ファイル
全ての実装結果を統合：
- `tasks/20250721_123440_workflow/outputs/TASK-WF01-optimized-workflow-design.yaml`
- `tasks/20250721_123440_workflow/outputs/TASK-WF02-account-analyzer-report.yaml`
- `tasks/20250721_123440_workflow/outputs/TASK-WF03-enhanced-collection-report.yaml`
- `tasks/20250721_123440_workflow/outputs/TASK-WF04-expanded-actions-report.yaml`

## 🏗️ 統合・文書化内容

### 1. AutonomousExecutor最終統合

#### 完全な新ワークフロー実装
**ファイル更新**: `src/core/autonomous-executor.ts`

```typescript
class AutonomousExecutor {
  async executeAutonomously(): Promise<void> {
    try {
      // Step 1: ヘルスチェック
      const isCritical = await this.healthChecker.isCritical();
      if (isCritical) {
        console.log('⚠️ システムクリティカル状態 - 実行停止');
        return;
      }

      // Step 2: 並列分析・情報収集（重要な改善）
      console.log('🔄 [並列実行開始] アカウント分析 & 情報収集');
      const [accountStatus, collectionResults] = await Promise.all([
        this.accountAnalyzer.analyzeCurrentStatus(),    // 新機能
        this.enhancedInfoCollector.collectInformation() // 序盤移動
      ]);

      // Step 3: 統合コンテキスト生成
      console.log('🧠 [統合分析] コンテキスト生成中...');
      const integratedContext = this.contextIntegrator.integrateAnalysisResults(
        accountStatus, 
        collectionResults
      );

      // Step 4: 簡素化されたニーズ評価
      console.log('📊 [簡素化評価] 1日15投稿目標ベース判定');
      const simplifiedNeeds = await this.assessSimplifiedNeeds(integratedContext);

      // Step 5: 拡張意思決定
      console.log('🎯 [拡張意思決定] 多様なアクション計画');
      const actionDecisions = await this.decisionEngine.planExpandedActions(integratedContext);

      // Step 6: 1日15回最適配分
      console.log('⚖️ [最適配分] 本日のアクション配分計算');
      const dailyPlan = await this.dailyActionPlanner.planDailyDistribution();
      const optimizedDecisions = this.optimizeDecisionsForDaily(actionDecisions, dailyPlan);

      // Step 7: 拡張アクション実行
      console.log('🚀 [拡張実行] 投稿/引用/RT/リプライ実行');
      const results = await this.parallelManager.executeExpandedActions(optimizedDecisions);

      // Step 8: 結果保存・次回時間決定
      await this.saveExecutionResults(integratedContext, results);
      const nextExecutionTime = await this.determineNextExecutionTime(integratedContext);
      
      console.log(`✅ [完了] 次回実行: ${this.formatNextExecutionTime(nextExecutionTime)}`);
      
    } catch (error) {
      console.error('❌ [実行エラー]', error);
      await this.handleExecutionError(error);
    }
  }

  // 簡素化されたニーズ評価（複雑性削除）
  private async assessSimplifiedNeeds(context: IntegratedContext): Promise<Need[]> {
    const needs: Need[] = [];
    
    // シンプルな時間ベース判定（96分間隔計算を削除）
    const timeSinceLastPost = Date.now() - context.account.currentState.currentMetrics.lastTweetTime;
    const shouldPost = timeSinceLastPost > (60 * 60 * 1000); // 1時間以上経過
    
    if (shouldPost) {
      needs.push({
        id: `need-${Date.now()}-action`,
        type: 'action',
        priority: 'high',
        description: 'Ready for next daily action',
        context: { timeSinceLastPost, dailyProgress: context.account.dailyProgress },
        createdAt: new Date().toISOString()
      });
    }
    
    return needs;
  }
}
```

### 2. 新ワークフロー文書作成

#### 完全に更新されたワークフロー文書
**ファイル更新**: `docs/guides/autonomous-system-workflow.md`

新しい文書構造：
```markdown
# 🔄 TradingAssistantX 最適化自律システムワークフロー

## 📋 概要
Claude Code主導による完全自律的な投稿・エンゲージメントシステム。
1日15回の多様なアクション（投稿/引用/RT/リプライ）を最適配分で実行。

## 🚀 最適化されたシステム実行フロー

### Step 1: システム起動・ヘルスチェック
### Step 2: 並列分析・情報収集 ⭐ 改善ポイント
### Step 3: 統合コンテキスト生成 ⭐ 新機能
### Step 4: 簡素化ニーズ評価 ⭐ 複雑性削除
### Step 5: 拡張意思決定 ⭐ 新機能
### Step 6: 1日15回最適配分 ⭐ 新機能
### Step 7: 拡張アクション実行 ⭐ 改善ポイント
### Step 8: 結果保存・次回決定

## 🎯 主要改善点

### 1. 実行順序の最適化
- 自分のアカウント分析を序盤で並列実行
- 情報収集を意思決定前に完了
- 統合コンテキストによる高品質な判断

### 2. ニーズ分析の簡素化
- 複雑な96分間隔計算を削除
- シンプルな時間ベース判定
- 1日15投稿目標に最適化

### 3. 出口戦略の拡張
- オリジナル投稿: 60%
- 引用ツイート: 25%
- リツイート: 10%
- リプライ: 5%

### 4. 自律性の向上
- リアルタイム市場情報活用
- アカウント状況に基づく動的判断
- Claude主導の戦略的意思決定
```

### 3. 設定ファイル更新

#### content-strategy.yaml拡張
**ファイル更新**: `data/content-strategy.yaml`

```yaml
# 拡張アクション戦略追加
expanded_action_strategy:
  daily_target: 15
  optimal_distribution:
    original_post: 9      # 60%
    quote_tweet: 4        # 25% 
    retweet: 1           # 10%
    reply: 1             # 5%
    
  action_timing:
    morning_focus: ["original_post", "quote_tweet"]
    afternoon_focus: ["retweet", "reply"] 
    evening_focus: ["original_post", "quote_tweet"]
    
  quality_standards:
    quote_tweet:
      min_comment_length: 20
      max_comment_length: 100
      required_value_add: true
    retweet:
      relevance_threshold: 0.8
      engagement_threshold: 10
    reply:
      constructive_only: true
      max_reply_depth: 2
```

### 4. TypeScript型定義統合

#### 統合型定義ファイル
**新ファイル**: `src/types/workflow-types.ts`

```typescript
// 全ての新しい型定義を統合
export interface IntegratedContext {
  account: {
    currentState: AccountStatus;
    recommendations: string[];
    healthScore: number;
    dailyProgress: DailyProgress;
  };
  market: {
    trends: TrendInfo[];
    opportunities: ContentOpportunity[];
    competitorActivity: CompetitorActivity[];
  };
  actionSuggestions: ActionSuggestion[];
  timestamp: number;
}

export interface DailyProgress {
  actionsCompleted: number;
  actionsRemaining: number;
  typeDistribution: {
    original_post: number;
    quote_tweet: number;
    retweet: number;
    reply: number;
  };
  nextOptimalAction: ActionType;
}

export interface OptimizedWorkflowResult {
  executionTime: number;
  actionsExecuted: ActionResult[];
  contextUsed: IntegratedContext;
  nextExecutionTime: number;
  improvementMetrics: {
    decisionQuality: number;
    executionEfficiency: number;
    engagementPotential: number;
  };
}
```

### 5. パフォーマンステスト・検証

#### 統合テストスイート
```typescript
// 新ワークフローの総合テスト
describe('OptimizedWorkflow Integration Tests', () => {
  test('並列分析・収集の実行時間', async () => {
    const startTime = Date.now();
    const [accountStatus, collectionResults] = await Promise.all([
      accountAnalyzer.analyzeCurrentStatus(),
      enhancedInfoCollector.collectInformation()
    ]);
    const executionTime = Date.now() - startTime;
    
    expect(executionTime).toBeLessThan(30000); // 30秒以内
    expect(accountStatus).toBeDefined();
    expect(collectionResults.length).toBeGreaterThan(0);
  });
  
  test('拡張アクション実行', async () => {
    const decisions = [
      { type: 'original_post', content: 'Test post' },
      { type: 'quote_tweet', quotedTweetId: '123', comment: 'Great insight!' }
    ];
    
    const results = await expandedActionExecutor.executeActions(decisions);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### 6. 運用ガイド作成

#### 新運用ガイド
**新ファイル**: `docs/guides/optimized-workflow-operations.md`

```markdown
# 最適化ワークフロー運用ガイド

## 🎯 日常運用

### システム起動
```bash
pnpm dev  # 最適化ワークフロー開始
```

### 監視ポイント
1. 並列実行の成功率
2. 1日15回アクションの配分状況
3. 各アクション型の品質
4. エンゲージメント改善状況

### トラブルシューティング
- 並列実行失敗時の対処
- API制限対応
- 品質低下時の調整方法
```

## 📊 出力ファイル

### 最終統合レポート
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF05-final-integration-report.yaml`

### 新ワークフロー文書
**場所**: `docs/guides/`
**ファイル名**: `autonomous-system-workflow.md`（更新）

### 運用ガイド
**場所**: `docs/guides/`
**ファイル名**: `optimized-workflow-operations.md`（新規）

## ✅ 完了基準
1. AutonomousExecutor最終統合完了
2. 新ワークフロー文書更新完了
3. 設定ファイル拡張完了
4. TypeScript型定義統合完了
5. パフォーマンステスト実行・通過
6. 運用ガイド作成完了
7. 全機能の統合テスト通過
8. 最終文書化完了

## 🔗 依存関係
**前提条件**: TASK-WF01, TASK-WF02, TASK-WF03, TASK-WF04完了必須
**完了後**: 最適化ワークフロー本格運用開始

---
**重要**: 全ての改善を統合し、Claude Code自律システムの真の価値を実現することが最重要目標。