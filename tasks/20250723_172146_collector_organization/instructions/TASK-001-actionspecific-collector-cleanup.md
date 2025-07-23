# TASK-001: ActionSpecificCollector中心整理とレガシー依存除去

## 🎯 作業目標
ActionSpecificCollectorを中心とした collector 整理において、レガシー依存関係を除去し、RSSCollectorとPlaywrightAccountCollectorのみを維持する疎結合設計を完成させる。

## 📋 要件定義確認事項
- **REQUIREMENTS.md準拠**: ActionSpecificCollectorが疎結合設計の核心コンポーネントであること
- **疎結合設計**: 各コレクターは完全独立動作、統一インターフェースでの抽象化
- **MVP制約**: 過剰実装を避け、必要最小限の機能のみ実装

## 🔍 現状分析結果
### 対象ファイル
- `src/collectors/action-specific-collector.ts` (主要対象)
- `src/collectors/base-collector.ts` (基底クラス - 変更不要)
- `src/collectors/rss-collector.ts` (維持対象)
- `src/collectors/playwright-account.ts` (維持対象)

### 検出された問題点
1. **レガシーインポート**: `YamlManager`の不適切な使用
2. **型インポート複雑化**: 不要な型インポートが散在
3. **Strategy Pattern実装**: 既存実装は良好だが依存関係に問題
4. **設定管理**: YAMLファイル依存が強すぎる可能性

## 🛠️ 実装タスク

### Phase 1: インポート整理とレガシー除去
1. **`action-specific-collector.ts`のインポート分析**
   ```typescript
   // 問題のあるインポート
   import { YamlManager } from '../utils/yaml-manager.js';
   ```
   - YamlManagerは削除予定のレガシーコンポーネント
   - 代替手段での設定読み込みに変更

2. **設定管理の簡素化**
   - `data/config/collection-strategies.yaml`への直接依存を除去
   - デフォルト設定によるフォールバック実装

### Phase 2: Strategy Pattern最適化
1. **Strategy実装の確認と整理**
   - `RSSFocusedStrategy`: MVP版メイン戦略（維持）
   - `MultiSourceStrategy`: 将来拡張用（簡素化）
   - `AccountAnalysisStrategy`: 自己分析専用（維持）

2. **不要な複雑性の除去**
   - 過剰な設定項目の削除
   - シンプルな戦略選択ロジックに変更

### Phase 3: 疎結合設計の強化
1. **Collector登録の簡素化**
   ```typescript
   private initializeCollectors(): void {
     this.collectors = new Map([
       [CollectorType.RSS, new RSSCollector()],
       [CollectorType.PLAYWRIGHT_ACCOUNT, new PlaywrightAccountCollector(config)],
       // 削除: その他のコレクター
     ]);
   }
   ```

2. **依存関係の明確化**
   - BaseCollectorインターフェースのみに依存
   - 各Collectorの独立性を保証

## 🔧 具体的変更指示

### 1. YamlManager依存の除去
```typescript
// BEFORE (削除対象)
private yamlManager: YamlManager;
private config: any;

private async loadConfiguration(): Promise<void> {
  const result = await this.yamlManager.loadConfig('collection-strategies.yaml');
  this.config = result.data;
}

// AFTER (実装対象)
private config: CollectionStrategyConfig = {
  strategies: {
    rss_focused: { enabled: true, priority: 1 },
    multi_source: { enabled: true, priority: 2 },
    account_analysis: { enabled: true, priority: 3 }
  }
};

private loadConfiguration(): void {
  // Static configuration - no external dependencies
  console.log('Using default collection strategy configuration');
}
```

### 2. コンストラクタの簡素化
```typescript
// BEFORE (複雑)
private constructor() {
  this.yamlManager = new YamlManager({...});
  this.initializeCollectors();
  this.initializeStrategies();
  this.loadConfiguration(); // async call
}

// AFTER (シンプル)
private constructor() {
  this.loadConfiguration(); // sync call
  this.initializeCollectors();
  this.initializeStrategies();
}
```

### 3. 型インポートの整理
```typescript
// 不要なインポートを削除
import type { 
  CollectionResult, 
  MarketCondition,
  LegacyCollectionResult // 必要最小限のみ
} from '../types/data-types';
```

## ✅ 品質要件
1. **TypeScript Strict Mode**: 全てのコードがstrict準拠
2. **エラーハンドリング**: 適切な例外処理とフォールバック
3. **テスト要件**: 既存機能の互換性維持
4. **パフォーマンス**: 設定読み込みの高速化

## 🚫 MVP制約・禁止事項
1. **新機能追加禁止**: 既存機能の整理のみ
2. **統計機能禁止**: メトリクス収集・分析機能の追加禁止
3. **過剰最適化禁止**: シンプルさを優先

## 📝 完了条件
1. YamlManager依存の完全除去
2. TypeScriptコンパイルエラーゼロ
3. 既存テストの全通過
4. RSSCollectorとPlaywrightAccountCollectorの正常動作確認

## 📤 成果物
1. **修正済みソースコード**: `src/collectors/action-specific-collector.ts`
2. **変更差分レポート**: 修正内容の詳細説明
3. **動作確認結果**: 単体テスト実行結果

## 🎛️ 実行環境設定
- **Node.js**: 最新LTS版
- **TypeScript**: Strict Mode有効
- **作業ブランチ**: `feature/src-optimization-20250722`

---

**重要**: この作業は疎結合設計の核心部分です。既存の動作を維持しながら、レガシー依存を確実に除去してください。