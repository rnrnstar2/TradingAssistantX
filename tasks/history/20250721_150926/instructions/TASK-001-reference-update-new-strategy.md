# TASK-001: reference.md新戦略対応更新

## 🎯 実装目標

既存の `/Users/rnrnstar/github/TradingAssistantX/docs/reference.md` を新戦略に対応させ、以下の新しいデータ構造、設定ファイル、API仕様を追加する。

## 📋 実装要件

### 1. 新データ構造追加（データ構造セクション拡張）

既存の「## 📊 データ構造」セクションに以下の型定義を追加：

#### ActionSpecificData型
```typescript
interface ActionSpecificData {
  actionType: 'collection' | 'analysis' | 'posting' | 'engagement';
  targetMetrics: {
    quality_threshold: number;
    relevance_score: number;
    engagement_potential: number;
  };
  collectionCriteria: {
    keywords: string[];
    timeRange: string;
    sources: string[];
    excludePatterns: string[];
  };
  processingConfig: {
    maxItems: number;
    filterDuplicates: boolean;
    qualityCheckEnabled: boolean;
  };
}
```

#### ChainDecisionResult型
```typescript
interface ChainDecisionResult {
  currentAction: string;
  nextAction: string | null;
  confidence: number;
  reasoning: string;
  context: {
    previousActions: string[];
    currentMetrics: Record<string, number>;
    timeElapsed: number;
  };
  recommendations: {
    immediate: string[];
    strategic: string[];
    optimization: string[];
  };
}
```

#### CollectionCycleMetrics型
```typescript
interface CollectionCycleMetrics {
  cycleId: string;
  startTime: number;
  endTime: number;
  phases: {
    collection: {
      duration: number;
      itemsProcessed: number;
      qualityScore: number;
    };
    analysis: {
      duration: number;
      trendsIdentified: number;
      actionableInsights: number;
    };
    decision: {
      duration: number;
      confidenceScore: number;
      actionSelected: string;
    };
  };
  performance: {
    totalDuration: number;
    efficiency: number;
    resourceUsage: number;
  };
  outcomes: {
    contentGenerated: number;
    postsScheduled: number;
    engagementPredicted: number;
  };
}
```

### 2. 新設定ファイル構造追加（設定ファイルセクション拡張）

既存の「## 📁 設定ファイル」セクションに以下のファイルを追加：

#### 設定ファイル構造の更新
```
x/
└── data/                            # データファイル（統合版）
    ├── account-strategy.yaml        # 成長戦略
    ├── performance-insights.yaml    # パフォーマンス分析
    ├── growth-targets.yaml          # 成長目標
    ├── posting-history.yaml         # 投稿履歴
    ├── generated-post.yaml          # 生成投稿
    ├── action-specific-strategy.yaml # 【新規】アクション別戦略設定
    ├── chain-decision-config.yaml   # 【新規】連鎖判断設定
    └── collection-cycle-settings.yaml # 【新規】収集サイクル設定
```

#### action-specific-strategy.yaml
```yaml
version: "2.0.0"
strategies:
  collection:
    trending_topics:
      priority: high
      frequency: "every_2_hours"
      quality_threshold: 0.8
      max_items: 50
    keyword_monitoring:
      priority: medium
      frequency: "every_4_hours"
      quality_threshold: 0.7
      keywords:
        - "トレーディング"
        - "投資戦略"
        - "リスク管理"
        - "市場分析"
  
  analysis:
    content_analysis:
      priority: high
      depth: "comprehensive"
      sentiment_enabled: true
      trend_detection: true
    
  posting:
    optimal_timing:
      priority: high
      adaptive_scheduling: true
      engagement_prediction: true
    
  engagement:
    response_monitoring:
      priority: medium
      auto_response_enabled: false
      sentiment_tracking: true
```

#### chain-decision-config.yaml
```yaml
version: "2.0.0"
decision_chains:
  content_creation_flow:
    steps:
      - name: "trend_collection"
        type: "collection"
        triggers:
          - "time_based"
          - "trend_threshold"
        conditions:
          min_confidence: 0.7
          max_retry: 3
      
      - name: "content_analysis"
        type: "analysis"
        depends_on: ["trend_collection"]
        conditions:
          min_data_points: 10
          quality_threshold: 0.8
      
      - name: "content_generation"
        type: "posting"
        depends_on: ["content_analysis"]
        conditions:
          insight_confidence: 0.8
          topic_relevance: 0.9

  engagement_optimization_flow:
    steps:
      - name: "engagement_collection"
        type: "collection"
        focus: "user_interactions"
      
      - name: "sentiment_analysis"
        type: "analysis"
        depends_on: ["engagement_collection"]
      
      - name: "response_strategy"
        type: "engagement"
        depends_on: ["sentiment_analysis"]

confidence_thresholds:
  high_confidence: 0.9
  medium_confidence: 0.7
  low_confidence: 0.5
  
fallback_strategies:
  insufficient_data: "collect_more"
  low_confidence: "use_default_strategy"
  timeout: "proceed_with_best_available"
```

#### collection-cycle-settings.yaml
```yaml
version: "2.0.0"
cycle_configuration:
  default_cycle:
    duration: "4_hours"
    phases:
      collection:
        max_duration: "30_minutes"
        parallel_tasks: 3
        timeout_per_task: "5_minutes"
      
      analysis:
        max_duration: "20_minutes"
        processing_threads: 2
        cache_results: true
      
      decision:
        max_duration: "10_minutes"
        confidence_required: 0.7
        fallback_enabled: true

  rapid_cycle:
    duration: "1_hour"
    phases:
      collection:
        max_duration: "10_minutes"
        parallel_tasks: 2
        focus: "trending_only"
      
      analysis:
        max_duration: "5_minutes"
        quick_analysis: true
      
      decision:
        max_duration: "5_minutes"
        confidence_required: 0.6

performance_optimization:
  memory_management:
    max_cache_size: "100MB"
    cleanup_interval: "1_hour"
  
  resource_limits:
    max_concurrent_collections: 5
    max_analysis_queue: 10
    timeout_global: "2_hours"

monitoring:
  metrics_collection: true
  performance_tracking: true
  error_reporting: true
  cycle_completion_alerts: true
```

### 3. 新API仕様追加（新セクション作成）

「## 🔌 API仕様」セクションを新規作成し、以下のインターフェースを追加：

#### ActionSpecificCollector interface
```typescript
interface ActionSpecificCollector {
  // アクション別データ収集
  collectByAction(action: ActionSpecificData): Promise<CollectionResult>;
  
  // 品質フィルタリング
  applyQualityFilter(
    data: any[], 
    criteria: ActionSpecificData['targetMetrics']
  ): Promise<any[]>;
  
  // 重複除去
  removeDuplicates(data: any[], strategy: 'hash' | 'content' | 'metadata'): any[];
  
  // 収集状況監視
  getCollectionStatus(): Promise<{
    activeCollections: number;
    queuedItems: number;
    completedToday: number;
    errorRate: number;
  }>;
  
  // 収集履歴
  getCollectionHistory(timeRange: string): Promise<CollectionResult[]>;
}
```

#### ChainDecisionEngine interface
```typescript
interface ChainDecisionEngine {
  // 次アクション決定
  decideNextAction(
    currentContext: any, 
    availableActions: string[]
  ): Promise<ChainDecisionResult>;
  
  // 連鎖実行
  executeChain(
    chainName: string, 
    initialContext: any
  ): Promise<ChainDecisionResult[]>;
  
  // 判断履歴記録
  recordDecision(decision: ChainDecisionResult): Promise<void>;
  
  // 判断パフォーマンス分析
  analyzeDecisionQuality(timeRange: string): Promise<{
    accuracyRate: number;
    averageConfidence: number;
    successfulChains: number;
    failedChains: number;
  }>;
  
  // 設定更新
  updateDecisionConfig(config: any): Promise<void>;
}
```

#### CycleMetricsReporter interface
```typescript
interface CycleMetricsReporter {
  // サイクル開始記録
  startCycle(cycleId: string): Promise<void>;
  
  // フェーズ完了記録
  completePhase(
    cycleId: string, 
    phase: 'collection' | 'analysis' | 'decision',
    metrics: any
  ): Promise<void>;
  
  // サイクル完了記録
  completeCycle(cycleId: string, outcomes: any): Promise<CollectionCycleMetrics>;
  
  // パフォーマンス集計
  aggregateMetrics(timeRange: string): Promise<{
    averageCycleDuration: number;
    successRate: number;
    resourceEfficiency: number;
    qualityScore: number;
  }>;
  
  // レポート生成
  generateReport(
    type: 'daily' | 'weekly' | 'monthly',
    format: 'json' | 'yaml' | 'csv'
  ): Promise<string>;
  
  // アラート設定
  setPerformanceAlerts(thresholds: {
    maxCycleDuration: number;
    minSuccessRate: number;
    maxErrorRate: number;
  }): Promise<void>;
}
```

### 4. 設定例とベストプラクティス追加（新セクション作成）

「## 🏆 ベストプラクティス」セクションを新規作成：

#### アクション別収集設定例
```yaml
# 高頻度トレンド収集設定
trending_collection_best_practice:
  strategy: trending_topics
  frequency: "every_hour"
  quality_threshold: 0.9
  max_items: 30
  keywords:
    primary: ["トレーディング", "投資"]
    secondary: ["市場分析", "リスク管理"]
  
  performance_optimization:
    parallel_requests: 3
    timeout: "2_minutes"
    cache_duration: "30_minutes"
```

#### 連鎖判断設定例
```yaml
# 効率的な意思決定チェーン
optimal_decision_chain:
  name: "content_optimization_flow"
  confidence_threshold: 0.8
  max_steps: 5
  
  fallback_strategies:
    low_confidence: "gather_more_data"
    timeout: "use_cached_decision"
    error: "revert_to_default"
  
  performance_metrics:
    track_decision_time: true
    measure_accuracy: true
    monitor_resource_usage: true
```

#### パフォーマンス最適化設定
```yaml
# システム最適化設定
performance_optimization_config:
  memory_management:
    max_cache_size: "200MB"
    cleanup_interval: "2_hours"
    garbage_collection: "aggressive"
  
  resource_allocation:
    max_concurrent_tasks: 8
    priority_queue_enabled: true
    load_balancing: "round_robin"
  
  monitoring:
    real_time_metrics: true
    performance_alerts: true
    bottleneck_detection: true
```

## 🔧 実装指針

### 技術制約
- **TypeScript strict mode**: 全ての型定義は厳密型チェックを通すこと
- **YAML形式遵守**: 設定例は有効なYAML構文であること
- **既存構造保持**: 既存のreference.md構造を変更しないこと
- **一貫性保持**: 既存の命名規則・フォーマットと一致させること

### 品質基準
- **完全性**: 全ての要求項目を網羅すること
- **実用性**: 実際に使用可能な設定例であること
- **明確性**: 各セクションに適切な説明コメントを含めること
- **保守性**: 将来の拡張に対応できる構造であること

### ファイル操作
- **ファイル読み込み**: まず必ず既存ファイルをReadツールで読み込むこと
- **段階的更新**: 一度に全体を更新せず、セクション毎に更新すること
- **バックアップ意識**: 既存内容を完全に保持したまま追加すること

## 📂 出力管理

### 出力先
- **更新対象**: `/Users/rnrnstar/github/TradingAssistantX/docs/reference.md`
- **作業記録**: `tasks/20250721_150926/outputs/TASK-001-reference-update-log.md`

### 命名規則
- **ログファイル**: `TASK-001-reference-update-log.md`
- **バックアップ**: `reference.md.backup.20250721_150926`（必要に応じて）

## ✅ 完了条件

1. **新データ構造**: 3つの型定義が適切に追加されている
2. **新設定ファイル**: 3つの設定ファイル仕様が追加されている
3. **新API仕様**: 3つのインターフェースが追加されている
4. **ベストプラクティス**: 設定例とパフォーマンス最適化設定が追加されている
5. **既存構造**: 既存のreference.md内容が保持されている
6. **型安全性**: TypeScript型定義が厳密型チェックを通す
7. **YAML有効性**: 設定例が有効なYAML構文である

## 🚨 重要注意事項

### 出力管理規則遵守
- **ルートディレクトリ汚染防止**: 作業ファイルは絶対に `/Users/rnrnstar/github/TradingAssistantX/` 直下に作成しない
- **承認された場所のみ**: `tasks/20250721_150926/outputs/` ディレクトリのみ使用
- **命名規則厳守**: `TASK-001-{name}-{type}.{ext}` 形式を使用

### 実装作業規則
- **段階的実装**: 一度に全体を変更せず、セクション毎に確認しながら実装
- **既存保持**: 既存のreference.md内容を一切削除・変更しない
- **品質優先**: 時間制限なし、完全性と品質を最優先
- **TypeScript準拠**: 全ての型定義は実際に使用可能であること