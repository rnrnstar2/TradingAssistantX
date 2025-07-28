# TASK-007: ActionSpecificCollector 実装指示書

## 🎯 タスク概要
**重要・緊急**: REQUIREMENTS.mdで定義された「疎結合設計原則」の核心コンポーネントである`ActionSpecificCollector`を実装する。現在未実装のため、動的データ収集戦略の実現とアーキテクチャ完全性のため優先実装が必要。

## 📋 実装要件

### 1. ファイル作成・配置
**ファイルパス**: `src/collectors/action-specific-collector.ts`

**必須インポート**:
```typescript
import { BaseCollector } from './base-collector';
import { RSSCollector } from './rss-collector';
import { PlaywrightAccountCollector } from './playwright-account';
import { 
  CollectionContext, 
  CollectionResult, 
  CollectorType,
  CollectionStrategy 
} from '../types/collection-types';
import { DecisionEngineTypes } from '../types/decision-types';
import { Logger } from '../logging/logger';
import { YamlManager } from '../utils/yaml-manager';
```

### 2. アーキテクチャ上の役割

REQUIREMENTS.mdに定義されたアーキテクチャにおける位置づけ：
```
データソース層: RSS | API | Community (独立)
     ↓ (統一インターフェース)
収集制御層: ActionSpecificCollector (動的選択) ← ここを実装
     ↓ (構造化データ)
意思決定層: DecisionEngine (条件分岐)
     ↓ (実行指示)
実行層: AutonomousExecutor (統合実行)
```

### 3. 主要機能実装

#### A. 動的コレクター選択機能
**要件**: 実行時コンテキストに基づく最適なコレクターの動的選択

```typescript
interface CollectorSelectionCriteria {
  context: CollectionContext;
  accountStatus: AccountStatus;
  marketCondition: MarketCondition;
  timeContext: TimeContext;
  strategy: CollectionStrategy;
  priority: number;
}

interface SelectedCollectors {
  primary: BaseCollector[];
  fallback: BaseCollector[];
  reasoning: string;
}
```

**実装機能**:
1. **コンテキスト分析**: 現在の状況を多角的に分析
2. **戦略マッピング**: 状況に応じた最適収集戦略の選択
3. **コレクター組み合わせ**: 複数コレクターの効果的な組み合わせ決定
4. **優先順位付け**: リソース効率を考慮した実行順序決定

#### B. Strategy Patternの実装
**要件**: 収集戦略の動的切り替えを可能にする設計パターン

```typescript
interface CollectionStrategyInterface {
  name: string;
  description: string;
  execute(context: CollectionContext): Promise<CollectionResult>;
  isApplicable(criteria: CollectorSelectionCriteria): boolean;
  getPriority(): number;
}

// 戦略実装例
class RSSFocusedStrategy implements CollectionStrategyInterface {
  name = 'rss_focused';
  description = 'RSS収集に特化した高速・安定戦略';
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    // RSS Collectorを中心とした実装
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    // RSS戦略が適用可能な条件判定
  }
}

class MultiSourceStrategy implements CollectionStrategyInterface {
  name = 'multi_source';
  description = '複数ソースからの包括的情報収集戦略';
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    // 複数コレクターの並列実行
  }
}

class AccountAnalysisStrategy implements CollectionStrategyInterface {
  name = 'account_analysis';
  description = '自アカウント分析を優先する戦略';
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    // PlaywrightAccountCollector中心の実装
  }
}
```

#### C. 並列実行・リソース管理
**要件**: 効率的なリソース利用と並列処理の実現

```typescript
interface ResourceManagement {
  maxConcurrentCollectors: number;
  timeoutPerCollector: number;
  memoryLimit: number;
  priorityQueue: CollectorTask[];
}

interface CollectorTask {
  collector: BaseCollector;
  priority: number;
  timeout: number;
  retryCount: number;
}
```

**実装機能**:
1. **並列実行制御**: 同時実行数の動的調整
2. **タイムアウト管理**: コレクター別タイムアウト設定
3. **メモリ監視**: リソース使用量の監視と制限
4. **優先度キュー**: 重要度に基づく実行順序管理

#### D. フォールバック機構
**要件**: 障害時の代替戦略自動切り替え

```typescript
interface FallbackChain {
  primary: CollectionStrategyInterface;
  fallbacks: CollectionStrategyInterface[];
  conditions: FallbackCondition[];
}

interface FallbackCondition {
  errorTypes: string[];
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
}
```

### 4. ActionSpecificCollector クラス実装

```typescript
export class ActionSpecificCollector {
  private static instance: ActionSpecificCollector;
  private collectors: Map<CollectorType, BaseCollector>;
  private strategies: Map<string, CollectionStrategyInterface>;
  private logger: Logger;
  private yamlManager: YamlManager;

  private constructor() {
    this.logger = Logger.getInstance();
    this.yamlManager = YamlManager.getInstance();
    this.initializeCollectors();
    this.initializeStrategies();
  }

  public static getInstance(): ActionSpecificCollector {
    if (!ActionSpecificCollector.instance) {
      ActionSpecificCollector.instance = new ActionSpecificCollector();
    }
    return ActionSpecificCollector.instance;
  }

  // コレクター初期化
  private initializeCollectors(): void {
    this.collectors = new Map([
      [CollectorType.RSS, new RSSCollector()],
      [CollectorType.PLAYWRIGHT_ACCOUNT, new PlaywrightAccountCollector()],
      // 将来の拡張用プレースホルダー
      // [CollectorType.API, new APICollector()],
      // [CollectorType.COMMUNITY, new CommunityCollector()],
    ]);
  }

  // 戦略初期化
  private initializeStrategies(): void {
    this.strategies = new Map([
      ['rss_focused', new RSSFocusedStrategy()],
      ['multi_source', new MultiSourceStrategy()],
      ['account_analysis', new AccountAnalysisStrategy()],
    ]);
  }

  // 動的コレクター選択
  public async selectCollectors(
    criteria: CollectorSelectionCriteria
  ): Promise<SelectedCollectors>

  // 戦略実行
  public async executeStrategy(
    strategyName: string,
    context: CollectionContext
  ): Promise<CollectionResult>

  // 並列収集実行
  private async executeParallel(
    collectors: BaseCollector[],
    context: CollectionContext
  ): Promise<CollectionResult[]>

  // リソース管理
  private async manageResources(
    tasks: CollectorTask[]
  ): Promise<void>

  // フォールバック処理
  private async handleFallback(
    error: Error,
    chain: FallbackChain,
    context: CollectionContext
  ): Promise<CollectionResult>
}
```

### 5. DecisionEngineとの統合

**統合ポイント**: `src/core/decision-engine.ts`

```typescript
// DecisionEngine内での使用例
const actionCollector = ActionSpecificCollector.getInstance();

// 戦略選択
const criteria: CollectorSelectionCriteria = {
  context: this.currentContext,
  accountStatus: this.accountStatus,
  marketCondition: this.marketCondition,
  timeContext: this.timeContext,
  strategy: selectedStrategy,
  priority: this.calculatePriority()
};

// 動的実行
const selectedCollectors = await actionCollector.selectCollectors(criteria);
const result = await actionCollector.executeStrategy(
  selectedStrategy.collectionStrategy,
  this.currentContext
);
```

### 6. YAML設定との連携

**設定ファイル拡張**: `data/config/collection-strategies.yaml`

```yaml
strategies:
  rss_focused:
    enabled: true
    priority: 1
    conditions:
      - engagement: low
      - theme_consistency: < 0.8
    collectors:
      - type: rss
        weight: 0.9
      - type: account
        weight: 0.1
    
  multi_source:
    enabled: true
    priority: 2
    conditions:
      - engagement: medium
      - follower_count: > 1000
    collectors:
      - type: rss
        weight: 0.6
      - type: account
        weight: 0.4
    
  account_analysis:
    enabled: true
    priority: 3
    conditions:
      - last_analysis: > 24h
      - significant_change: true
    collectors:
      - type: account
        weight: 1.0

resource_limits:
  max_concurrent: 3
  timeout_seconds: 30
  memory_limit_mb: 512
```

### 7. パフォーマンス最適化

**実装要件**:
1. **キャッシュ機構**: 頻繁に使用される戦略結果のキャッシュ
2. **遅延初期化**: 必要時のみコレクターインスタンス生成
3. **リソースプール**: コレクターインスタンスの再利用
4. **非同期最適化**: Promise.allSettled()による確実な並列処理

## 🎯 実装品質基準

### 必須要件
- ✅ TypeScript strictモード準拠
- ✅ 疎結合設計の完全遵守
- ✅ 既存コレクターとの後方互換性
- ✅ エラーハンドリングとログ記録
- ✅ 単体テスト可能な設計

### 拡張性要件
- 新規コレクター追加時の変更最小化
- 新規戦略追加の容易性
- 設定ファイルによる動的制御

### パフォーマンス要件
- 戦略選択: 100ms以内
- 並列実行効率: 80%以上
- メモリ使用量: 設定値以内

## 🚨 実装上の注意事項

### MVP制約遵守
- 現在はRSSとPlaywrightAccountのみ対応
- 将来拡張を考慮するが過度な実装は避ける
- シンプルで理解しやすい設計

### 疎結合設計の維持
- コレクター間の直接依存を作らない
- インターフェース経由の通信のみ
- 戦略とコレクターの分離

### エラー処理
- 個別コレクターの失敗がシステム全体に影響しない
- 適切なフォールバック実行
- 詳細なエラー情報の記録

## 📁 出力管理

### 実装ファイル
- ✅ **作成**: `src/collectors/action-specific-collector.ts`
- ✅ **作成**: `data/config/collection-strategies.yaml`
- ✅ **更新**: 既存ファイルへの統合は最小限

### テストファイル
- ✅ **作成**: `tests/collectors/action-specific-collector.test.ts`

### 型定義更新
- ✅ **更新**: `src/types/collection-types.ts` (必要に応じて)

### 報告書
- ✅ **作成**: `tasks/20250723_013109/reports/REPORT-007-action-specific-collector.md`

## 🎯 成功基準

1. **動的戦略切替の実現**
   - 条件に応じた自動戦略選択
   - スムーズな切り替え動作

2. **パフォーマンス向上**
   - 並列実行による収集時間短縮
   - リソース効率の改善

3. **疎結合設計の完成**
   - アーキテクチャ図との100%整合
   - 拡張容易性の確保

4. **既存システムとの統合**
   - DecisionEngineからの呼び出し成功
   - エラーなしの動作確認

この指示書に従い、TradingAssistantXの疎結合設計を完成させる重要なコンポーネントであるActionSpecificCollectorを実装し、システムの柔軟性と拡張性を大幅に向上させてください。