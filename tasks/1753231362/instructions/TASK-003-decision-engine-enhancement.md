# decision-engine.ts 3次元判断マトリクス実装指示書

## 🎯 実装目的
**意思決定機能の完成**: decision-engine.tsに、REQUIREMENTS.mdで定義された3次元判断マトリクスを実装し、意思決定機能を完成させる。

## 📂 実装対象
**ファイルパス**: `src/core/decision-engine.ts`
**現状**: 基本的な戦略選択機能は実装済み、、3次元判断マトリクスが未実装

## 🔍 必須参照
**REQUIREMENTS.md** を必ず読み込み、以下の要件と整合性を確保すること：
- **3次元判断マトリクス**（REQUIREMENTS.md 76-88行目）
- **優先順位原則**: 外部環境 > エンゲージメント状態 > 成長段階（REQUIREMENTS.md 77行目）
- **緑急対応ロジック**（REQUIREMENTS.md 80行目）
- **アカウント成長段階**（REQUIREMENTS.md 71-75行目）

## ⚠️ 既存機能保護
**重要**: 既存の基本機能を破壊しないよう注意
- analyzeCurrentSituation()メソッド: 保持
- selectStrategy()メソッド: 保持
- 基本的な戦略選択ロジック: 保持

## 🚀 追加実装機能

### 1. 3次元判断マトリクスシステム

```typescript
interface ThreeDimensionalMatrix {
  analyzeExternalEnvironment(): ExternalEnvironmentState;
  assessEngagementState(): EngagementState;
  determineGrowthStage(): GrowthStage;
  applyPriorityMatrix(): DecisionResult;
}

enum ExternalEnvironmentState {
  EMERGENCY = "emergency",      // 緑急対応必要
  NORMAL = "normal",            // 通常環境
  FAVORABLE = "favorable"       // 好機会
}

enum EngagementState {
  LOW = "low",                  // 低エンゲージメント
  STABLE = "stable",            // 安定エンゲージメント
  HIGH = "high"                 // 高エンゲージメント
}

enum GrowthStage {
  FOCUSED = "focused",          // 集中特化段階
  EXPANDING = "expanding",      // 段階的拡張段階
  DIVERSIFIED = "diversified"   // 多様化展開段階
}
```

### 2. 外部環境分析機能

```typescript
private analyzeExternalEnvironment(): ExternalEnvironmentState {
  // 重要ニュース、市場大変動、緊急事態の検出
  const indicators = {
    marketVolatility: this.checkMarketVolatility(),
    breakingNews: this.detectBreakingNews(),
    urgentEvents: this.identifyUrgentEvents()
  };
  
  if (indicators.urgentEvents || indicators.breakingNews) {
    return ExternalEnvironmentState.EMERGENCY;
  }
  
  if (indicators.marketVolatility > 0.3) {
    return ExternalEnvironmentState.FAVORABLE; // 市場動向で投稿機会
  }
  
  return ExternalEnvironmentState.NORMAL;
}
```

**実装内容**:
- RSSデータから緊急キーワード検出（「破綻」「急上昇」「急落」等）
- 市場ボラティリティ指標の監視
- 結果をdata/current/external-environment.yamlに記録

### 3. エンゲージメント状態評価機能

```typescript
private assessEngagementState(): EngagementState {
  const recentEngagement = this.getRecentEngagementRate();
  const trend = this.getEngagementTrend();
  
  // エンゲージメント率による3段階判定
  if (recentEngagement < 0.03 || trend === 'declining') {
    return EngagementState.LOW;
  }
  
  if (recentEngagement > 0.08 && trend === 'improving') {
    return EngagementState.HIGH;
  }
  
  return EngagementState.STABLE;
}
```

**実装内容**:
- 直近7日間のエンゲージメント率平均値算出
- エンゲージメントトレンド判定（改善/安定/悪化）
- account-status.yamlからデータ取得

### 4. 成長段階判定機能

```typescript
private determineGrowthStage(): GrowthStage {
  const metrics = this.getAccountMetrics();
  const performance = this.getPerformanceHistory();
  
  // REQUIREMENTS.md 72-75行目の成長段階判定ロジック
  if (metrics.engagement < 0.05 || performance.themeScatter) {
    return GrowthStage.FOCUSED; // 集中特化段階
  }
  
  if (metrics.engagement >= 0.05 && performance.stableResults) {
    return GrowthStage.EXPANDING; // 段階的拡張段階
  }
  
  if (metrics.engagement > 0.08 && performance.multipleSuccesses) {
    return GrowthStage.DIVERSIFIED; // 多様化展開段階
  }
  
  return GrowthStage.FOCUSED; // デフォルト
}
```

**実装内容**:
- フォロワー数、エンゲージメント率、テーマ分散度の評価
- 過去パフォーマンスの安定性判定
- 複数成功事例の有無確認

### 5. 優先順位マトリクス適用

```typescript
public applyThreeDimensionalMatrix(): DecisionResult {
  const external = this.analyzeExternalEnvironment();
  const engagement = this.assessEngagementState();
  const growth = this.determineGrowthStage();
  
  // REQUIREMENTS.md 76-88行目の優先順位: 外部環境 > エンゲージメント状態 > 成長段階
  
  // 最優先: 外部環境判定
  if (external === ExternalEnvironmentState.EMERGENCY) {
    return {
      dataCollectionStrategy: 'analytical_focused',
      contentStrategy: 'analytical_specialized',
      postingStrategy: 'opportunity_based',
      reason: '緊急対応: 分析特化型 + 機会的投稿'
    };
  }
  
  // 第2優先: エンゲージメント状態判定
  if (engagement === EngagementState.LOW) {
    return {
      dataCollectionStrategy: 'rss_focused',
      contentStrategy: 'educational_focused',
      postingStrategy: 'trend_responsive_enhanced',
      reason: '低エンゲージメント対応: 集中特化段階強制 + トレンド対応強化'
    };
  }
  
  if (engagement === EngagementState.HIGH) {
    return {
      dataCollectionStrategy: this.getCurrentStrategy().dataCollection,
      contentStrategy: 'quality_enhancement',
      postingStrategy: 'maintain_current',
      reason: '高エンゲージメント: 現在戦略維持 + 質的向上集中'
    };
  }
  
  // 第3優先: 成長段階適用
  return this.applyGrowthStageStrategy(growth);
}
```

### 6. 成長段階別戦略適用

```typescript
private applyGrowthStageStrategy(stage: GrowthStage): DecisionResult {
  switch (stage) {
    case GrowthStage.FOCUSED:
      return {
        dataCollectionStrategy: 'rss_focused',
        contentStrategy: 'educational_focused',
        postingStrategy: 'scheduled_consistent',
        reason: '集中特化段階: RSS集中 + 教育重視 + 定時投稿'
      };
      
    case GrowthStage.EXPANDING:
      return {
        dataCollectionStrategy: 'multi_source',
        contentStrategy: 'balanced_mix', // 核テーマ60% + 関連テーマ40%
        postingStrategy: 'optimized_timing',
        reason: '段階的拡張段階: 複合収集 + バランス型 + 最適化投稿'
      };
      
    case GrowthStage.DIVERSIFIED:
      return {
        dataCollectionStrategy: 'strategic_adaptive',
        contentStrategy: 'analytical_specialized',
        postingStrategy: 'opportunity_adaptive',
        reason: '多様化展開段階: 戦略的収集 + 分析特化 + 機会的投稿'
      };
      
    default:
      return this.getDefaultStrategy();
  }
}
```

## 🔗 既存システムとの統合

### selectStrategy()メソッドの拡張
```typescript
public async selectStrategy(context: DecisionContext): Promise<SelectedStrategy> {
  // 既存の基本分析を保持
  const basicAnalysis = await this.analyzeCurrentSituation(context);
  
  // 3次元マトリクスを適用
  const matrixResult = this.applyThreeDimensionalMatrix();
  
  // 結果を統合して最終戦略を決定
  const finalStrategy = this.integrateStrategies(basicAnalysis, matrixResult);
  
  // 戦略決定理由をログ出力
  this.logStrategyDecision(finalStrategy, matrixResult.reason);
  
  return finalStrategy;
}
```

### autonomous-executor.ts との連携
- Phase2（意思決定）での呼び出し対応
- 3次元マトリクス結果のexecutionコンテキストへの反映

## 📊 データ出力例

### data/current/decision-matrix-result.yaml
```yaml
decision_result:
  timestamp: "2025-01-23T10:00:00Z"
  
  analysis_dimensions:
    external_environment: "normal"  # emergency | normal | favorable
    engagement_state: "stable"      # low | stable | high  
    growth_stage: "focused"         # focused | expanding | diversified
    
  priority_application:
    primary_factor: "engagement_state"  # エンゲージメント状態が決定因子
    applied_rule: "安定エンゲージメント → 成長段階適用"
    
  selected_strategy:
    data_collection: "rss_focused"
    content_strategy: "educational_focused"
    posting_strategy: "scheduled_consistent"
    
  decision_confidence: 0.89
  estimated_effectiveness: 0.75
  
  next_evaluation: "2025-01-24T10:00:00Z"
```

## 🧪 テスト・検証

### 単体テスト
- 各次元分析メソッドの正確性
- 優先順位マトリクスのロジック検証
- 緊急対応シナリオテスト

### 統合テスト
- autonomous-executor.tsとの連携テスト
- 既存selectStrategy()メソッドの互換性確認
- データファイル読み書きテスト

## ⚡ パフォーマンス要件
- 3次元分析処理時間: 5秒以内
- メモリ使用量増加: 最大10MB
- 既存処理性能への影響最小化

## 🔐 セキュリティ・制約
- **コード品質維持**: 既存コードの品質を损なわない
- **後方互換性**: 既存APIを破壊しない
- **データ整合性**: 既存データ構造との一貫性保持

## 📝 実装完了条件
1. 3次元判断マトリクスの完全実装
2. 緊急対応ロジックの実装
3. 既存機能との統合テスト済み
4. REQUIREMENTS.mdとの完全整合性確認
5. TypeScript strict modeでの型安全性確保
6. パフォーマンス要件の満足
7. ログ出力とデバッグ機能の実装

## 🚨 注意事項
- **Worker権限での実装**: Manager権限での編集禁止
- **既存機能保護**: 既存のメソッド・APIを破壊しない
- **逆互換性確保**: 既存システムが継続動作すること
- **コード品質維持**: 既存コードと同等の品質を維持
- **実データ使用**: モックデータ・テストモードは使用しない

## ✅ 完了報告
実装完了後、以下の報告書を作成すること：
**報告書**: `tasks/outputs/decision-engine-enhancement-report.md`

**報告内容**:
- 3次元マトリクスの実装詳細
- 既存機能との統合テスト結果
- 性能インパクト評価
- REQUIREMENTS.md遵守確認結果
- 今後の改善提案