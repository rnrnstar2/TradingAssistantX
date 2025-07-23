# REPORT-002: 依存関係分析レポート

## 実施日時
2025-07-23

## 分析対象
以下のutilsディレクトリから削除予定のファイルに対する依存関係を分析しました：
- src/utils/error-handler.ts
- src/utils/yaml-manager.ts  
- src/utils/yaml-utils.ts
- src/utils/monitoring/health-check.ts
- src/utils/monitoring/resource-monitor.ts

## 依存関係分析結果

### 1. error-handler.ts

```yaml
dependencies:
  error-handler:
    files:
      - path: "src/services/content-creator.ts"
        line: 17
        usage: "handleError関数をインポート"
      - path: "src/utils/monitoring/health-check.ts"
        line: 7
        usage: "errorHandlerインスタンスをインポート"
      - path: "src/utils/integrity-checker.ts"
        line: 5
        usage: "BasicErrorHandler, handleErrorをインポート"
    total_count: 3
    affected_components:
      - services層（content-creator）
      - utils層（health-check, integrity-checker）
```

### 2. yaml-manager.ts

```yaml
dependencies:
  yaml-manager:
    files:
      - path: "src/services/performance-analyzer.ts"
        line: 8
        usage: "YamlManagerクラスをインポート"
      - path: "src/core/loop-manager.ts"
        line: 12
        usage: "YamlManagerクラスをインポート"
      - path: "src/collectors/action-specific-collector.ts"
        line: 21
        usage: "YamlManagerクラスをインポート（.js拡張子付き）"
      - path: "src/collectors/rss-collector.ts"
        line: 13
        usage: "YamlManagerクラスをインポート（.js拡張子付き）"
      - path: "src/utils/integrity-checker.ts"
        line: 4
        usage: "YamlManagerクラスをインポート"
    total_count: 5
    affected_components:
      - core層（loop-manager）
      - collectors層（action-specific-collector, rss-collector）
      - services層（performance-analyzer）
      - utils層（integrity-checker）
```

### 3. yaml-utils.ts

```yaml
dependencies:
  yaml-utils:
    files:
      - path: "src/services/content-creator.ts"
        line: 16
        usage: "loadYamlSafe関数をインポート"
      - path: "src/services/data-optimizer.ts"
        line: 4
        usage: "loadYamlSafe, writeYamlSafe, loadYamlAsync, writeYamlAsync関数をインポート"
      - path: "src/scripts/init-hierarchical-data.ts"
        line: 9
        usage: "writeYamlSafe関数をインポート"
      - path: "src/utils/yaml-manager.ts"
        line: 1
        usage: "loadYamlArraySafe, loadYamlAsync, writeYamlAsync関数をインポート"
      - path: "src/core/decision-engine.ts"
        line: 4
        usage: "loadYamlSafe, loadYamlArraySafe関数をインポート"
      - path: "src/core/autonomous-executor.ts"
        line: 9
        usage: "loadYamlSafe関数をインポート（.js拡張子付き）"
    total_count: 6
    affected_components:
      - core層（decision-engine, autonomous-executor）
      - services層（content-creator, data-optimizer）
      - scripts層（init-hierarchical-data）
      - utils層（yaml-manager）
```

### 4. health-check.ts

```yaml
dependencies:
  health-check:
    files: []
    total_count: 0
    affected_components: []
    note: "他のファイルからの直接的な依存なし"
```

### 5. resource-monitor.ts

```yaml
dependencies:
  resource-monitor:
    files: []
    total_count: 0
    affected_components: []
    note: "他のファイルからの直接的な依存なし"
```

## 移行計画

### 優先順位1: 低依存度のファイル削除

#### 1. health-check.ts & resource-monitor.ts
- **現状**: 外部からの依存なし
- **対応**: 即座に削除可能
- **作業時間**: 5分

### 優先順位2: yaml関連ユーティリティの統合

#### 2. yaml-utils.ts → js-yaml直接使用への移行
- **現状**: 6箇所で使用（広範囲に影響）
- **移行方法**:
  ```typescript
  // Before:
  import { loadYamlSafe } from '../utils/yaml-utils';
  const data = loadYamlSafe<ConfigType>(filePath);
  
  // After:
  import * as yaml from 'js-yaml';
  import { readFileSync } from 'fs';
  
  try {
    const data = yaml.load(readFileSync(filePath, 'utf8')) as ConfigType;
  } catch (error) {
    console.error(`YAML読み込みエラー: ${filePath}`, error);
    // null or default value
  }
  ```
- **作業時間**: 30分

#### 3. yaml-manager.ts → js-yaml直接使用への移行
- **現状**: 5箇所で使用（yaml-utilsに依存）
- **移行方法**: yaml-utils移行後、YamlManagerのメソッドを直接実装に置換
- **注意点**: integrity-checkerでも使用されているため、先にyaml-utilsの移行が必要
- **作業時間**: 20分

### 優先順位3: エラーハンドリングの簡素化

#### 4. error-handler.ts → 標準try-catchへの移行
- **現状**: 3箇所で使用（health-check含む）
- **移行方法**:
  ```typescript
  // Before:
  import { handleError } from '../utils/error-handler';
  await handleError(error);
  
  // After:
  console.error('エラー:', error.message);
  // 必要に応じてログファイルへの書き込み処理を直接実装
  ```
- **注意点**: health-checkが削除される場合、影響箇所は2箇所に減少
- **作業時間**: 15分

## 作業手順（推奨）

1. **Step 1**: health-check.ts, resource-monitor.tsの削除（5分）
2. **Step 2**: yaml-utils.tsの移行（30分）
3. **Step 3**: yaml-manager.tsの移行（20分）  
4. **Step 4**: error-handler.tsの移行（15分）
5. **Step 5**: 削除予定ファイルの除去とテスト実行（10分）

**総作業時間見積もり**: 約1時間20分

## 疎結合設計の維持

移行作業においても、以下の原則を維持します：
- 各層の独立性を保つ（core/collectors/services）
- 直接的なjs-yaml使用により、中間層の依存を削減
- エラーハンドリングは各モジュールで独立して実装

## リスクと対策

1. **YAML読み込みエラーの統一的なハンドリング喪失**
   - 対策: 各モジュールで適切なエラーハンドリングを実装

2. **ファイル削除によるインポートエラー**
   - 対策: 段階的な移行とテスト実行

3. **型安全性の低下**
   - 対策: js-yamlの戻り値に対して明示的な型アサーションを使用

## 結論

MVP原則に基づき、不要な抽象化層（yaml-manager, yaml-utils, error-handler）を削除し、標準ライブラリとjs-yamlの直接使用に移行することで、コードベースの簡素化が実現できます。health-checkとresource-monitorは依存関係がないため、即座に削除可能です。