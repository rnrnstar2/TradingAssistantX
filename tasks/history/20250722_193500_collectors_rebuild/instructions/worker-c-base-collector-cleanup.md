# ワーカーC指示書: Base Collector作成 + 不要ディレクトリ削除

## 🎯 **ミッション**
疎結合設計基底クラスbase-collector.ts作成 + 不要ディレクトリ削除

## 📋 **作業内容**

### 1. Base Collector作成
```
作成先: src/collectors/base-collector.ts
```

#### 疎結合設計基底クラス
```typescript
// 統一インターフェース定義
abstract class BaseCollector {
  abstract collect(config: any): Promise<CollectionResult>;
  
  // 共通メソッド
  protected validateConfig(config: any): boolean;
  protected handleError(error: Error): CollectionResult;
  protected createMetadata(): CollectionMetadata;
}

// 統一結果型
interface CollectionResult {
  source: string;
  data: any[];
  metadata: CollectionMetadata;
  success: boolean;
  error?: string;
}
```

### 2. 不要ディレクトリ削除
```bash
# 削除対象確認
ls -la src/collectors/

# base/ディレクトリ削除（rss-collector.ts移動後）
rm -rf src/collectors/base/
```

## 🔧 **技術要件**

### 疎結合設計原則実装
```typescript
// データソース独立性
abstract class BaseCollector {
  // 各コレクターは独立動作
  abstract getSourceType(): string;
  abstract isAvailable(): Promise<boolean>;
}

// 意思決定分岐容易性
interface DecisionBranching {
  // 条件に応じた簡単分岐
  shouldCollect(context: any): boolean;
  getPriority(): number;
}

// 設定駆動制御
interface CollectorConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
}
```

### 実装アーキテクチャ準拠
```
データソース層: BaseCollector継承クラス
     ↓ (統一インターフェース)
収集制御層: ActionSpecificCollector
     ↓ (構造化データ)  
意思決定層: DecisionEngine
     ↓ (実行指示)
実行層: AutonomousExecutor
```

## 📊 **品質基準**
1. ✅ 疎結合設計完全準拠
2. ✅ 統一インターフェース提供
3. ✅ データソース独立性確保
4. ✅ 意思決定分岐容易性実現
5. ✅ 設定駆動制御サポート

## 🧹 **清掃作業**
### 削除対象
- `src/collectors/base/` ディレクトリ全体
- 他の不要なcollectors配下ファイル（存在しない場合はスキップ）

### 確認事項
```bash
# 最終構成確認
ls -la src/collectors/
# 期待結果:
# - base-collector.ts
# - rss-collector.ts  
# - playwright-account.ts
```

## ✅ **完了条件**
- src/collectors/base-collector.ts として基底クラス配置
- 疎結合設計完全準拠
- 不要ディレクトリ削除完了
- 最終構成3ファイルのみ確認