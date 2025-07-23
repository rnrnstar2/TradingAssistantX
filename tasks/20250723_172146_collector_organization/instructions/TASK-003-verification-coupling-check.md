# TASK-003: 疎結合設計検証とコレクター統合確認

## 🎯 作業目標
TASK-001とTASK-002の完了後、ActionSpecificCollectorを中心とした疎結合設計が正しく実装され、RSSCollectorとPlaywrightAccountCollectorのみが適切に統合されていることを検証する。

## 📋 要件定義確認事項
- **REQUIREMENTS.md準拠**: データソース独立性と意思決定分岐容易性の確保
- **疎結合設計**: 各コレクターの完全独立動作
- **統一インターフェース**: BaseCollectorを通じたデータ統合
- **設定駆動制御**: YAML設定による動的コレクター制御

## 🔍 検証対象

### 依存タスク
- **TASK-001完了**: ActionSpecificCollectorのレガシー依存除去
- **TASK-002完了**: 型システムの整理とレガシーインターフェース除去

### 検証対象ファイル
- `src/collectors/action-specific-collector.ts` (中心コンポーネント)
- `src/collectors/base-collector.ts` (基底インターフェース)
- `src/collectors/rss-collector.ts` (RSS収集)
- `src/collectors/playwright-account.ts` (アカウント分析)
- `src/types/data-types.ts` (型システム)

## 🛠️ 検証タスク

### Phase 1: 疎結合設計検証

#### 1. データソース独立性の確認
**検証項目**:
```typescript
// 各コレクターが独立して動作することを確認
class IndependenceTest {
  async testRSSCollectorIndependence() {
    const rssCollector = new RSSCollector();
    const result = await rssCollector.collect(testContext);
    
    // ✅ 他のコレクターに依存せず動作
    // ✅ BaseCollectorインターフェースに準拠
    // ✅ CollectionResultを正しく返す
  }
  
  async testPlaywrightAccountCollectorIndependence() {
    const accountCollector = new PlaywrightAccountCollector(config);
    const result = await accountCollector.collect();
    
    // ✅ 他のコレクターに依存せず動作  
    // ✅ BaseCollectorインターフェースに準拠
    // ✅ CollectionResultを正しく返す
  }
}
```

#### 2. 統一インターフェース確認
**検証項目**:
```typescript
// BaseCollectorインターフェースの完全実装確認
interface BaseCollectorCompliance {
  // 必須メソッドの実装確認
  collect(config: any): Promise<CollectionResult>;
  getSourceType(): string;
  isAvailable(): Promise<boolean>;
  shouldCollect(context: any): boolean;
  getPriority(): number;
}

// ActionSpecificCollectorでの統一的な扱い確認
class UnifiedInterfaceTest {
  testUnifiedCollectorHandling() {
    const collectors = [
      new RSSCollector(),
      new PlaywrightAccountCollector(config)
    ];
    
    collectors.forEach(collector => {
      // ✅ 同一インターフェースで扱える
      // ✅ 型安全性が保たれている
      // ✅ ポリモーフィズムが正しく動作
    });
  }
}
```

### Phase 2: ActionSpecificCollector中心設計確認

#### 1. Strategy Pattern実装確認
**検証項目**:
```typescript
class StrategyPatternTest {
  testRSSFocusedStrategy() {
    const strategy = new RSSFocusedStrategy();
    // ✅ RSSCollectorを主に使用
    // ✅ PlaywrightAccountCollectorを補助的に使用
    // ✅ レガシーコレクターを使用していない
  }
  
  testMultiSourceStrategy() {
    const strategy = new MultiSourceStrategy();
    // ✅ RSSCollectorとPlaywrightAccountCollectorのみ使用
    // ✅ バランスの取れた使用比率
    // ✅ レガシーコレクター参照なし
  }
  
  testAccountAnalysisStrategy() {
    const strategy = new AccountAnalysisStrategy();
    // ✅ PlaywrightAccountCollectorに特化
    // ✅ 必要最小限の実装
    // ✅ レガシー機能なし
  }
}
```

#### 2. 動的戦略選択機能確認
**検証項目**:
```typescript
class DynamicStrategyTest {
  async testStrategySelection() {
    const actionSpecific = ActionSpecificCollector.getInstance();
    
    // テストケース1: 低エンゲージメント → RSS集中戦略
    const criteria1 = createCriteria({ engagement: 'low' });
    const selected1 = await actionSpecific.selectCollectors(criteria1);
    // ✅ RSSFocusedStrategyが選択される
    
    // テストケース2: 高市場変動 → 複数ソース戦略  
    const criteria2 = createCriteria({ marketVolatility: 'high' });
    const selected2 = await actionSpecific.selectCollectors(criteria2);
    // ✅ MultiSourceStrategyが選択される
    
    // テストケース3: アカウント変化 → アカウント分析戦略
    const criteria3 = createCriteria({ accountChange: true });
    const selected3 = await actionSpecific.selectCollectors(criteria3);
    // ✅ AccountAnalysisStrategyが選択される
  }
}
```

### Phase 3: 統合動作確認

#### 1. エンドツーエンド動作テスト
```typescript
class IntegrationTest {
  async testCompleteCollectionFlow() {
    // 1. ActionSpecificCollectorによる戦略選択
    const actionSpecific = ActionSpecificCollector.getInstance();
    const criteria = createRealisticCriteria();
    const selectedCollectors = await actionSpecific.selectCollectors(criteria);
    
    // 2. 選択された戦略の実行
    const strategyName = selectedCollectors.primary[0].constructor.name;
    const result = await actionSpecific.executeStrategy(strategyName, context);
    
    // 3. 結果の検証
    // ✅ CollectionResultが正しく返される
    // ✅ エラーハンドリングが適切
    // ✅ フォールバック機能が動作
    // ✅ メタデータが適切に付与
  }
}
```

#### 2. エラーハンドリング・フォールバック確認
```typescript
class ErrorHandlingTest {
  async testFallbackMechanism() {
    // RSSCollectorが失敗した場合のフォールバック
    const mockFailingRSS = createFailingRSSCollector();
    // ✅ PlaywrightAccountCollectorにフォールバック
    // ✅ エラー情報が適切に記録
    // ✅ システム全体が停止しない
  }
  
  async testNetworkErrorRecovery() {
    // ネットワークエラー時の復旧機能
    // ✅ リトライ機能が動作
    // ✅ タイムアウト処理が適切
    // ✅ 最終的にフォールバック結果を返す
  }
}
```

## 🔧 検証実装指示

### 1. テストコード作成
```typescript
// tests/collectors/integration-test.ts
import { ActionSpecificCollector } from '../../src/collectors/action-specific-collector';
import { RSSCollector } from '../../src/collectors/rss-collector';
import { PlaywrightAccountCollector } from '../../src/collectors/playwright-account';

describe('Collector Organization Verification', () => {
  describe('Loose Coupling Design', () => {
    it('should maintain data source independence', async () => {
      // 独立性テスト実装
    });
    
    it('should use unified interface consistently', async () => {
      // 統一インターフェーステスト実装  
    });
  });
  
  describe('ActionSpecificCollector Central Design', () => {
    it('should organize around RSS and Account collectors only', async () => {
      // 中心設計テスト実装
    });
    
    it('should select strategies dynamically', async () => {
      // 動的戦略選択テスト実装
    });
  });
});
```

### 2. 設定ファイル動作確認
```yaml
# data/config/collection-strategies.yaml の動作確認
strategies:
  rss_focused:
    enabled: true
    priority: 1
  multi_source:
    enabled: true  
    priority: 2
  account_analysis:
    enabled: true
    priority: 3

# ✅ ActionSpecificCollectorが設定を正しく読み込む
# ✅ 戦略の有効/無効が正しく反映される
# ✅ 優先度に基づく選択が動作する
```

### 3. パフォーマンス確認
```typescript
class PerformanceTest {
  async testCollectionPerformance() {
    const startTime = Date.now();
    const actionSpecific = ActionSpecificCollector.getInstance();
    const result = await actionSpecific.executeStrategy('rss_focused', context);
    const endTime = Date.now();
    
    // ✅ レスポンス時間が許容範囲内（60秒以内）
    // ✅ メモリ使用量が適切
    // ✅ CPU負荷が適切
  }
}
```

## ✅ 検証成功条件
1. **独立性確認**: 各コレクターが他に依存せず動作
2. **統一性確認**: BaseCollectorインターフェースの完全準拠
3. **中心性確認**: ActionSpecificCollectorが適切に2つのコレクターを制御
4. **動的性確認**: 状況に応じた戦略選択が正常動作
5. **堅牢性確認**: エラーハンドリングとフォールバックが適切

## 🚫 検証失敗条件（要修正）
1. レガシーコレクターへの参照が残存
2. 型エラーやコンパイルエラーの存在
3. 動的戦略選択の不正動作
4. エラーハンドリングの不備
5. パフォーマンス基準の未達

## 📝 完了条件
1. **全テストパス**: 作成したテストケースの全通過
2. **動作確認レポート**: 実動作での動作確認結果
3. **パフォーマンス測定**: レスポンス時間・リソース使用量測定
4. **設定ファイル確認**: YAML設定との連携確認

## 📤 成果物
1. **統合テストコード**: 疎結合設計の検証テスト
2. **動作確認レポート**: 実環境での動作確認結果
3. **パフォーマンスレポート**: 処理時間・リソース使用量分析
4. **改善提案**: 発見された課題と改善案

---

**重要**: この検証により、ActionSpecificCollectorを中心とした疎結合設計が要件通り実装されていることを確認してください。問題発見時は即座にTASK-001、TASK-002への修正指示を行ってください。