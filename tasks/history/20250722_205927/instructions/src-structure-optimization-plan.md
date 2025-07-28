# src/ディレクトリ構造最適化指示書

**作成日時**: 2025-07-22 20:59:27  
**作成者**: Manager  
**対象**: Worker チーム  
**緊急度**: High Priority  

## 🎯 実行目標

REQUIREMENTS.mdで定義された**疎結合設計原則**に基づき、現在の複雑化したsrc/構造を理想的なMVP構造に最適化する。

### 現状問題
- 要件定義比で約**3倍のファイル数**（38ファイル過剰）
- **疎結合設計原則からの逸脱**
- **MVP（RSS Collector中心）からの乖離**

## 📋 Phase 1: 緊急構造整理（High Priority）

### A. RSS関連ファイルの統合

**問題**: RSS機能が分散している
```
現状:
├── collectors/rss-collector.ts (本体)
└── rss/ (5ファイル - 分散により複雑化)
    ├── emergency-handler.ts
    ├── feed-analyzer.ts
    ├── parallel-processor.ts
    ├── realtime-detector.ts
    └── source-prioritizer.ts
```

**指示**:
1. `src/rss/`内の全ファイルを`collectors/rss-collector.ts`に統合
2. 統合時の注意点:
   - base-collector.tsの継承関係を維持
   - CollectionResult型インターフェースを保持
   - RSS特有の機能は全てrss-collector.ts内のクラスメソッドとして実装
3. 統合後、`src/rss/`ディレクトリ削除

### B. 意思決定ロジックの集約

**問題**: 意思決定が複数ファイルに分散
```
現状:
├── core/decision-engine.ts (本体)
└── decision/ (5ファイル - 分散により複雑化)
    ├── collection-strategy-selector.ts
    ├── execution-monitor.ts
    ├── quality-maximizer.ts
    ├── resource-allocator.ts
    └── site-profiler.ts
```

**指示**:
1. `src/decision/`内の全ロジックを`core/decision-engine.ts`に統合
2. 統合方針:
   - SystemDecisionEngineクラスのメソッドとして実装
   - YAML駆動の条件分岐ロジックを強化
   - 「DecisionEngineで条件に応じた簡単な分岐実装」を実現
3. 統合後、`src/decision/`ディレクトリ削除

### C. 余分なスクリプトファイル削除

**問題**: 要件定義にないスクリプトファイル
```
削除対象:
├── scripts/autonomous-runner-single.ts (要件違反)
└── scripts/autonomous-runner.ts (要件違反)
```

**指示**:
1. `autonomous-runner-single.ts`と`autonomous-runner.ts`削除
2. 必要機能は`core-runner.ts`、`main.ts`、`dev.ts`で対応
3. DRY原則維持のため共通ロジックは`core-runner.ts`に集約

## 📋 Phase 2: 中規模構造整理（Medium Priority）

### A. エンジンシステムの整理

**問題**: 複数エンジンによる複雑化
```
現状:
└── engines/ (4ファイル + convergence/サブディレクトリ)
    ├── autonomous-exploration-engine.ts
    ├── content-convergence-engine.ts
    ├── context-compression-system.ts
    ├── lightweight-decision-engine.ts
    └── convergence/ (3ファイル)
```

**指示**:
1. 必要機能のみ`core/`ディレクトリに統合
2. 統合方針:
   - autonomous-exploration-engine → autonomous-executor.ts
   - lightweight-decision-engine → decision-engine.ts
   - context-compression-system → utils/context-compressor.ts
3. convergence/サブディレクトリは`services/content-creator.ts`に統合
4. 統合後、`src/engines/`ディレクトリ削除

### B. 管理機能の統合

**問題**: 管理機能が過度に分散
```
現状:
└── managers/ (3ファイル + 2サブディレクトリ)
    ├── daily-action-planner.ts
    ├── posting-manager.ts
    ├── browser/ (5ファイル)
    └── resource/ (2ファイル)
```

**指示**:
1. browser関連は`utils/`に統合（playwright-browser-manager.tsとして）
2. resource関連は`services/data-optimizer.ts`に統合
3. daily-action-planner → `core/loop-manager.ts`に統合
4. posting-manager → `services/x-poster.ts`に統合
5. 統合後、`src/managers/`ディレクトリ削除

### C. core-runner.tsのフロー単純化

**問題**: 要件定義の「アカウント分析→投稿作成」から複雑化

**指示**:
1. 現在の複雑フローを単純化:
   ```
   複雑化フロー:
   ベースライン生成 → 並列分析 → コンテキスト統合 → 
   戦略策定 → 意思決定エンジン → 自律実行
   
   理想フロー:
   アカウント分析 → 投稿作成
   ```
2. runSingle()メソッドの単純化
3. 複雑な統合処理・並列処理は削除

## 📋 Phase 3: 最終整理（Low Priority）

### A. タイプ定義の分散統合

**問題**: 専用types/ディレクトリによる過度の抽象化
```
現状:
└── types/ (6ファイル)
    ├── collection-types.ts
    ├── content-types.ts
    ├── decision-types.ts
    ├── index.ts
    ├── integration-types.ts
    └── system-types.ts
```

**指示**:
1. 各型定義を使用する実装ファイルに移動
2. collection-types → collectors/base-collector.ts
3. content-types → services/content-creator.ts
4. decision-types → core/decision-engine.ts
5. integration-types、system-types → core/autonomous-executor.ts
6. 統合後、`src/types/`ディレクトリ削除

### B. ユーティリティの最小化

**問題**: utils/内の過剰なファイル
```
現状:
└── utils/ (7ファイル + monitoring/サブディレクトリ)
    ├── yaml-manager.ts ✅ (要件準拠)
    ├── context-compressor.ts ✅ (要件準拠)
    ├── config-cache.ts (要件違反)
    ├── config-manager.ts (要件違反)
    ├── config-validator.ts (要件違反)
    ├── error-handler.ts (要件違反)
    ├── file-size-monitor.ts (要件違反)
    ├── yaml-utils.ts (要件違反)
    └── monitoring/ (1ファイル - 要件違反)
```

**指示**:
1. 要件準拠の2ファイルのみ保持:
   - `yaml-manager.ts`
   - `context-compressor.ts`
2. その他ファイルは削除または統合:
   - config関連 → yaml-manager.tsに統合
   - error-handler → 各実装ファイルに分散
   - monitoring関連 → 削除（MVPでは不要）

### C. その他余分なディレクトリの削除

**削除対象**:
- `src/exploration/` → collectors/に統合
- `src/logging/` → utils/に統合または削除
- `src/providers/` → services/に統合

## 🏗️ 最終理想構造

```
src/
├── core/                   # コアシステム（要件準拠）
│   ├── autonomous-executor.ts      # 自律実行エンジン
│   ├── decision-engine.ts         # 意思決定エンジン（統合後）
│   └── loop-manager.ts           # ループ実行管理（統合後）
├── collectors/             # データ収集（疎結合設計）
│   ├── rss-collector.ts          # RSS収集（統合後）
│   ├── playwright-account.ts     # アカウント分析専用
│   └── base-collector.ts         # 基底クラス
├── services/               # ビジネスロジック（要件準拠）
│   ├── content-creator.ts        # 投稿コンテンツ生成（統合後）
│   ├── data-optimizer.ts         # データ最適化（統合後）
│   └── x-poster.ts              # X API投稿（統合後）
├── utils/                  # ユーティリティ（最小限）
│   ├── yaml-manager.ts          # YAML読み書き
│   └── context-compressor.ts    # コンテキスト圧縮
└── scripts/                # 実行スクリプト（要件準拠）
    ├── main.ts                  # ループ実行
    ├── dev.ts                   # 単一実行
    └── core-runner.ts           # 共通実行ロジック（単純化）
```

## ⚠️ 重要な実装原則

### 疎結合設計の維持
1. **データソース独立性**: 各Collectorは完全独立動作
2. **統一インターフェース**: CollectionResult型による抽象化
3. **動的戦略切替**: YAML設定による制御（実装に非固定化）

### MVP原則の徹底
1. **RSS Collector中心**: 他データソースは将来段階的追加
2. **機能最小化**: 投資教育コンテンツ生成に必要最小限の機能のみ
3. **拡張容易性**: 新機能追加時の既存影響を最小化

### 品質保証
1. **テスト維持**: 統合時にテストケースを維持
2. **設定移行**: YAMLファイルによる動的制御を強化
3. **ドキュメント更新**: 実装変更時の関連文書更新

## 🎯 成功指標

### 定量的指標
- ファイル数: 約38ファイル削減（要件定義準拠の約10ファイルに）
- ディレクトリ数: 約8ディレクトリ削減（要件の4ディレクトリに）
- 複雑度: 大幅削減（core-runner.tsの単純化）

### 定性的指標
- 疎結合設計原則への準拠
- MVP要件（RSS Collector中心）への回帰
- 将来拡張性の確保

**この構造最適化により、要件定義に完全準拠したシンプルで拡張可能なシステムを実現する。**