# ActionSpecificCollector 実装・統合ガイド

## 🎯 実装ロードマップ

### 即座実装可能項目 (Week 1-2)

#### 1. 基本クラス骨格実装
```typescript
// src/lib/action-specific-collector.ts
export class ActionSpecificCollector implements IActionSpecificCollector {
  private strategies: Map<ActionType, CollectionStrategy>;
  private claudeAgent: ClaudeAgent;
  private playwrightManager: PlaywrightManager;
  
  constructor() {
    this.loadStrategies();
    this.initializeAgents();
  }
  
  async collectForAction(decision: ActionDecision): Promise<ActionContext> {
    // Phase 1: 基本実装
    const strategy = this.determineStrategy(decision.type);
    const cycleResult = await this.executeCollectionCycle(strategy);
    return this.consolidateActionContext(cycleResult);
  }
}
```

#### 2. YAML戦略設定ファイル
```yaml
# data/action-collection-strategies.yaml
strategies:
  original_post:
    sufficiencyThreshold: 0.85
    maxCycles: 3
    timeboxLimits:
      claudePhase: 15
      playwrightPhase: 45
      evaluationPhase: 20
      additionalPhase: 10
    phases:
      - type: claude
        objective: "Market trend analysis and unique angle discovery"
        duration: 15
      - type: playwright
        objective: "Real-time market data collection"
        duration: 45
```

#### 3. DecisionEngine統合ポイント
```typescript
// src/core/decision-engine.ts に追加
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';

export class DecisionEngine {
  private actionCollector: ActionSpecificCollector;
  
  async planExpandedActions(context: IntegratedContext): Promise<ActionDecision[]> {
    const decisions = await this.makeExpandedActionDecisions(context);
    
    // 新機能: アクション特化収集
    for (const decision of decisions) {
      const actionContext = await this.actionCollector.collectForAction(decision);
      decision.enrichedContext = actionContext;
    }
    
    return decisions;
  }
}
```

### 段階的拡張項目 (Week 3-4)

#### 4. Claude連鎖サイクル実装
```typescript
async executeCollectionCycle(strategy: CollectionStrategy): Promise<CycleResult> {
  let currentData: CollectedData = {};
  let cycleCount = 0;
  
  while (cycleCount < strategy.maxCycles) {
    // Claude判断フェーズ
    const claudeResult = await this.executeClaudePhase(strategy, currentData);
    
    // Playwright実行フェーズ
    const playwrightResult = await this.executePlaywrightPhase(claudeResult.instructions);
    
    // 充足度評価
    const sufficiency = await this.evaluateInformationSufficiency(playwrightResult.data);
    
    if (sufficiency.overall >= strategy.sufficiencyThreshold) {
      break;
    }
    
    cycleCount++;
    currentData = this.mergeData(currentData, playwrightResult.data);
  }
  
  return this.createCycleResult(currentData, cycleCount);
}
```

#### 5. アクション特化型ロジック
```typescript
// Original Post専用ロジック
private async collectForOriginalPost(decision: ActionDecision): Promise<OriginalPostData> {
  const trendAnalysis = await this.analyzeTrends();
  const competitorInsights = await this.analyzeCompetitors();
  const uniqueAngles = await this.discoverUniqueAngles(trendAnalysis, competitorInsights);
  
  return {
    marketTrends: trendAnalysis,
    competitorInsights,
    uniqueAngles,
    contentOpportunities: await this.identifyContentOpportunities(uniqueAngles),
    riskFactors: await this.assessRisks(decision, uniqueAngles)
  };
}
```

### 高度機能実装 (Week 5-6)

#### 6. 動的戦略調整機能
```typescript
private async adaptStrategy(
  currentStrategy: CollectionStrategy, 
  performance: PerformanceMetrics
): Promise<CollectionStrategy> {
  const adaptationRules = currentStrategy.dynamicAdjustment.adaptationRules;
  
  for (const rule of adaptationRules) {
    if (this.evaluateAdaptationTrigger(rule.trigger, performance)) {
      return this.applyAdaptation(currentStrategy, rule.action);
    }
  }
  
  return currentStrategy;
}
```

#### 7. 品質保証システム
```typescript
async evaluateInformationSufficiency(data: CollectedData): Promise<SufficiencyScore> {
  const dataCompleteness = this.assessDataCompleteness(data);
  const dataQuality = await this.assessDataQuality(data);
  const actionRelevance = this.assessActionRelevance(data);
  const uniqueInsights = this.assessUniqueInsights(data);
  
  const overall = (dataCompleteness + dataQuality + actionRelevance + uniqueInsights) / 4;
  
  return {
    overall,
    breakdown: { dataCompleteness, dataQuality, actionRelevance, uniqueInsights },
    gaps: this.identifyGaps(data, overall),
    recommendations: await this.generateRecommendations(data, overall)
  };
}
```

## 🔗 既存システム統合戦略

### 1. DecisionEngine統合
```typescript
// 段階的統合アプローチ
class DecisionEngine {
  // Phase 1: Optional Integration
  async planExpandedActions(context: IntegratedContext): Promise<ActionDecision[]> {
    const decisions = await this.makeExpandedActionDecisions(context);
    
    // 新機能が利用可能な場合のみ実行
    if (this.isActionCollectorAvailable()) {
      try {
        decisions = await this.enrichWithActionSpecificCollection(decisions);
      } catch (error) {
        console.log('⚠️ ActionSpecificCollector unavailable, continuing with standard flow');
      }
    }
    
    return decisions;
  }
}
```

### 2. ClaudeControlledCollector継承
```typescript
export class ActionSpecificCollector extends ClaudeControlledCollector {
  // 既存機能を継承・拡張
  async performParallelCollection(): Promise<CollectionResult[]> {
    // 親クラスの並列収集機能を活用
    const baseResults = await super.performParallelCollection();
    
    // アクション特化型拡張
    return this.enhanceWithActionSpecificLogic(baseResults);
  }
}
```

### 3. 設定ファイル統合
```yaml
# data/autonomous-config.yaml に追加
action_specific_collection:
  enabled: true
  fallback_to_standard: true
  performance_monitoring: true
  strategies_file: "action-collection-strategies.yaml"
  
# 既存設定との整合性確保
claude_integration:
  sdk_enabled: true
  action_specific_enabled: true  # 新フラグ
  max_context_size: 32000
```

## ⚡ パフォーマンス最適化

### 1. メモリ効率化
```typescript
class ActionSpecificCollector {
  private dataCache = new Map<string, CachedData>();
  private readonly maxCacheSize = 100;
  
  private cacheData(key: string, data: CollectedData): void {
    if (this.dataCache.size >= this.maxCacheSize) {
      const oldestKey = this.dataCache.keys().next().value;
      this.dataCache.delete(oldestKey);
    }
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }
}
```

### 2. 並列処理最適化
```typescript
async executeCollectionCycle(strategy: CollectionStrategy): Promise<CycleResult> {
  const phases = strategy.phases;
  const claudePhases = phases.filter(p => p.type === 'claude');
  const playwrightPhases = phases.filter(p => p.type === 'playwright');
  
  // Claude判断とPlaywright準備を並列実行
  const [claudeResults, playwrightPrep] = await Promise.all([
    this.executeClaudePhases(claudePhases),
    this.preparePlaywrightExecution(playwrightPhases)
  ]);
  
  return this.executePlaywrightWithResults(claudeResults, playwrightPrep);
}
```

### 3. エラーハンドリング強化
```typescript
async collectForAction(decision: ActionDecision): Promise<ActionContext> {
  const circuit = new CircuitBreaker(this.executeCollection.bind(this), {
    threshold: 3,
    timeout: 120000,
    resetTimeout: 60000
  });
  
  try {
    return await circuit.call(decision);
  } catch (error) {
    return this.createFallbackActionContext(decision, error);
  }
}
```

## 🧪 テスト戦略

### 1. 単体テスト
```typescript
// tests/unit/action-specific-collector.test.ts
describe('ActionSpecificCollector', () => {
  it('should collect action-specific data for original posts', async () => {
    const collector = new ActionSpecificCollector();
    const decision: ActionDecision = createMockOriginalPostDecision();
    
    const context = await collector.collectForAction(decision);
    
    expect(context.actionType).toBe('original_post');
    expect(context.sufficiencyScore).toBeGreaterThanOrEqual(0.85);
    expect(context.collectedData.originalPosts).toBeDefined();
  });
});
```

### 2. 統合テスト
```typescript
// tests/integration/action-workflow.test.ts
describe('Action-Specific Collection Workflow', () => {
  it('should integrate with DecisionEngine seamlessly', async () => {
    const engine = new DecisionEngine();
    const context = createMockIntegratedContext();
    
    const decisions = await engine.planExpandedActions(context);
    
    expect(decisions.every(d => d.enrichedContext)).toBe(true);
  });
});
```

### 3. Mock データ戦略
```typescript
// Mock実装でテスト環境最適化
class MockActionSpecificCollector implements ActionSpecificCollector {
  async collectForAction(decision: ActionDecision): Promise<ActionContext> {
    return createMockActionContext(decision.type);
  }
}
```

## 📊 監視・運用

### 1. パフォーマンスメトリクス
```typescript
interface CollectionMetrics {
  executionTime: number;
  sufficiencyAchievement: number;
  errorRate: number;
  cacheHitRate: number;
  claudeTokenUsage: number;
  playwrightResourceUsage: PlaywrightMetrics;
}
```

### 2. ロギング戦略
```typescript
class ActionSpecificCollector {
  private logger = new StructuredLogger('ActionSpecificCollector');
  
  async collectForAction(decision: ActionDecision): Promise<ActionContext> {
    const startTime = Date.now();
    this.logger.info('Collection started', { actionId: decision.id, type: decision.type });
    
    try {
      const result = await this.executeCollection(decision);
      this.logger.info('Collection completed', {
        actionId: decision.id,
        duration: Date.now() - startTime,
        sufficiency: result.sufficiencyScore
      });
      return result;
    } catch (error) {
      this.logger.error('Collection failed', { actionId: decision.id, error });
      throw error;
    }
  }
}
```

### 3. 自動調整システム
```typescript
class PerformanceMonitor {
  private performanceHistory: PerformanceRecord[] = [];
  
  async analyzeAndAdjust(collector: ActionSpecificCollector): Promise<void> {
    const recentPerformance = this.getRecentPerformance();
    
    if (recentPerformance.avgSufficiency < 0.8) {
      await collector.adjustStrategies('increase_thoroughness');
    }
    
    if (recentPerformance.avgExecutionTime > 120) {
      await collector.adjustStrategies('optimize_speed');
    }
  }
}
```

## 🚀 段階的デプロイメント

### Phase 1: Shadow Mode (Week 1)
- ActionSpecificCollectorを実装するが、結果は使用せずログのみ
- 既存システムと並行実行して性能比較
- バグやパフォーマンス問題の早期発見

### Phase 2: Canary Release (Week 2)
- 10%のリクエストでActionSpecificCollectorを使用
- A/Bテストで品質改善を測定
- 段階的にトラフィック増加

### Phase 3: Full Release (Week 3)
- 100%のリクエストで新システム使用
- 既存システムをフォールバックとして保持
- 継続的な品質監視

### Phase 4: Optimization (Week 4+)
- パフォーマンスデータに基づく最適化
- 新機能追加と拡張
- レガシーシステムの段階的削除

## 📋 成功指標

### 定量的指標
- **充足度スコア**: 平均85%以上維持
- **実行時間**: 90秒以内95%達成
- **エラー率**: 5%未満
- **品質向上**: 既存システム比20%改善

### 定性的指標
- **Claude判断品質**: より戦略的で洞察に富んだ決定
- **コンテンツ関連性**: アクション目的との高い整合性
- **運用効率**: 手動調整の必要性削減
- **システム安定性**: 障害発生率の低減

---

**実装成功の鍵**: 段階的アプローチ、既存システムとの協調、継続的な品質監視、Claude主導の自律性確保