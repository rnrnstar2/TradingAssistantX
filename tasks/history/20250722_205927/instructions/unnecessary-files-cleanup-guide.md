# 不要ディレクトリ・ファイル整理指示書

**作成日時**: 2025-07-22 20:59:27  
**作成者**: Manager  
**対象**: Worker チーム  
**緊急度**: Medium Priority  

## 🎯 整理目標

要件定義（REQUIREMENTS.md）に準拠したシンプルな構造に戻すため、約38個の余分なファイルを整理・削除し、MVP原則に準拠したsrcディレクトリを実現する。

## 📊 削除対象の全体像

### 削除予定ファイル数
- **余分なディレクトリ**: 8ディレクトリ
- **余分なファイル**: 約38ファイル
- **最終的な削減率**: 約75%のファイル削減

## 📋 Phase 1: 要件違反ディレクトリの完全削除

### A. src/decision/ (完全削除)

**削除対象**:
```
src/decision/
├── collection-strategy-selector.ts
├── execution-monitor.ts
├── quality-maximizer.ts
├── resource-allocator.ts
└── site-profiler.ts
```

**削除指示**:
1. ディレクトリ全体を削除: `rm -rf src/decision/`
2. **事前統合作業**: 各ファイルの機能を統合先に移動後削除
   - collection-strategy-selector → `core/decision-engine.ts`
   - execution-monitor → `core/autonomous-executor.ts`
   - quality-maximizer → `services/content-creator.ts`
   - resource-allocator → `utils/yaml-manager.ts`
   - site-profiler → `collectors/base-collector.ts`

### B. src/engines/ (完全削除)

**削除対象**:
```
src/engines/
├── autonomous-exploration-engine.ts
├── content-convergence-engine.ts
├── context-compression-system.ts
├── lightweight-decision-engine.ts
└── convergence/
    ├── insight-synthesizer.ts
    ├── narrative-builder.ts
    └── value-maximizer.ts
```

**削除指示**:
1. **統合先別の移動**:
   - autonomous-exploration-engine → `core/autonomous-executor.ts`
   - content-convergence-engine → `services/content-creator.ts`
   - context-compression-system → `utils/context-compressor.ts`
   - lightweight-decision-engine → `core/decision-engine.ts`
   - convergence/*全ファイル → `services/content-creator.ts`
2. 統合完了後、ディレクトリ削除: `rm -rf src/engines/`

### C. src/exploration/ (完全削除)

**削除対象**:
```
src/exploration/
├── content-analyzer.ts
└── link-evaluator.ts
```

**削除指示**:
1. **統合先**:
   - content-analyzer → `collectors/rss-collector.ts`
   - link-evaluator → `collectors/rss-collector.ts`
2. 統合完了後削除: `rm -rf src/exploration/`

### D. src/logging/ (完全削除)

**削除対象**:
```
src/logging/
├── decision-logger.ts
├── decision-tracer.ts
├── minimal-logger.ts
└── visualization-formatter.ts
```

**削除指示**:
1. **MVP原則**: ログ機能は過度な複雑化を招くため削除
2. 必要最小限のログは各実装ファイル内で`console.log`で対応
3. ディレクトリ削除: `rm -rf src/logging/`

### E. src/providers/ (完全削除)

**削除対象**:
```
src/providers/
├── claude-autonomous-agent.ts
├── claude-optimized-provider.ts
├── claude-tools.ts
└── x-client.ts
```

**削除指示**:
1. **統合先**:
   - claude関連 → `core/autonomous-executor.ts`
   - x-client → `services/x-poster.ts`
2. 統合完了後削除: `rm -rf src/providers/`

### F. src/rss/ (完全削除)

**削除対象**:
```
src/rss/
├── emergency-handler.ts
├── feed-analyzer.ts
├── parallel-processor.ts
├── realtime-detector.ts
└── source-prioritizer.ts
```

**削除指示**:
1. **重要**: RSS機能の分散により疎結合設計が破綻
2. **統合先**: 全て`collectors/rss-collector.ts`に統合
3. RSS Collectorクラス内のメソッドとして実装
4. 統合完了後削除: `rm -rf src/rss/`

### G. src/types/ (完全削除)

**削除対象**:
```
src/types/
├── collection-types.ts
├── content-types.ts
├── decision-types.ts
├── index.ts
├── integration-types.ts
└── system-types.ts
```

**削除指示**:
1. **統合先別の移動**:
   - collection-types → `collectors/base-collector.ts`
   - content-types → `services/content-creator.ts`
   - decision-types → `core/decision-engine.ts`
   - integration-types → `core/autonomous-executor.ts`
   - system-types → `core/autonomous-executor.ts`
2. index.tsは削除（不要）
3. 統合完了後削除: `rm -rf src/types/`

## 📋 Phase 2: サブディレクトリの削除・統合

### A. src/managers/browser/ (統合後削除)

**削除対象**:
```
src/managers/browser/
├── memory-leak-prevention.ts
├── performance-tuner.ts
├── playwright-browser-manager.ts
├── pool-manager.ts
└── resource-optimizer.ts
```

**統合指示**:
1. 全機能を`utils/playwright-browser-manager.ts`に統合
2. PlaywrightBrowserManagerクラス内のメソッドとして実装
3. 統合完了後削除: `rm -rf src/managers/browser/`

### B. src/managers/resource/ (統合後削除)

**削除対象**:
```
src/managers/resource/
├── intelligent-resource-manager.ts
└── memory-optimizer.ts
```

**統合指示**:
1. 機能を`services/data-optimizer.ts`に統合
2. DataOptimizerクラス内のメソッドとして実装
3. 統合完了後削除: `rm -rf src/managers/resource/`

### C. src/utils/monitoring/ (完全削除)

**削除対象**:
```
src/utils/monitoring/
└── health-check.ts
```

**削除指示**:
1. MVP段階では監視機能は不要（過度な複雑化）
2. 直接削除: `rm -rf src/utils/monitoring/`

## 📋 Phase 3: 個別ファイルの整理

### A. src/managers/ (統合後削除)

**削除対象**:
```
src/managers/
├── daily-action-planner.ts
└── posting-manager.ts
```

**統合指示**:
1. daily-action-planner → `core/loop-manager.ts`
2. posting-manager → `services/x-poster.ts`
3. 統合完了後、`src/managers/`ディレクトリ削除

### B. src/scripts/ (不要ファイル削除)

**削除対象**:
```
src/scripts/
├── autonomous-runner-single.ts (削除)
└── autonomous-runner.ts (削除)
```

**削除指示**:
1. 要件定義にない余分なスクリプト
2. 機能は`dev.ts`、`main.ts`、`core-runner.ts`で充分
3. 直接削除: `rm src/scripts/autonomous-runner*.ts`

### C. src/utils/ (要件違反ファイル削除)

**削除対象**:
```
src/utils/
├── config-cache.ts (削除)
├── config-manager.ts (削除)
├── config-validator.ts (削除)
├── error-handler.ts (削除)
├── file-size-monitor.ts (削除)
└── yaml-utils.ts (削除)
```

**処理指示**:
1. **保持するファイル**（要件準拠）:
   - `yaml-manager.ts` ✅
   - `context-compressor.ts` ✅
2. **統合処理**:
   - config関連 → `yaml-manager.ts`に統合
   - error-handler → 各実装ファイルに分散
3. **削除**: 統合後に余分ファイル削除

## 📋 Phase 4: 削除実行手順

### 段階的削除の実行順序

**Step 1: 統合作業**
```bash
# 事前統合（機能を保護しながら移動）
# Worker による統合作業実行
```

**Step 2: ディレクトリ削除実行**
```bash
# 統合完了確認後、一括削除
rm -rf src/decision/
rm -rf src/engines/
rm -rf src/exploration/
rm -rf src/logging/
rm -rf src/providers/
rm -rf src/rss/
rm -rf src/types/
rm -rf src/managers/
rm -rf src/utils/monitoring/
```

**Step 3: 個別ファイル削除**
```bash
rm src/scripts/autonomous-runner-single.ts
rm src/scripts/autonomous-runner.ts
rm src/utils/config-cache.ts
rm src/utils/config-manager.ts
rm src/utils/config-validator.ts
rm src/utils/error-handler.ts
rm src/utils/file-size-monitor.ts
rm src/utils/yaml-utils.ts
```

**Step 4: 動作確認**
```bash
# 削除後の動作テスト
pnpm dev  # 単一実行テスト
# エラーがないことを確認
```

## 🏆 削除後の理想構造

```
src/
├── core/                   # コアシステム（要件準拠）
│   ├── autonomous-executor.ts      # 自律実行エンジン（統合済み）
│   ├── decision-engine.ts         # 意思決定エンジン（統合済み）
│   └── loop-manager.ts           # ループ実行管理（統合済み）
├── collectors/             # データ収集（疎結合設計）
│   ├── rss-collector.ts          # RSS収集（統合済み）
│   ├── playwright-account.ts     # アカウント分析専用
│   └── base-collector.ts         # 基底クラス（統合済み）
├── services/               # ビジネスロジック（要件準拠）
│   ├── content-creator.ts        # 投稿コンテンツ生成（統合済み）
│   ├── data-optimizer.ts         # データ最適化（統合済み）
│   └── x-poster.ts              # X API投稿（統合済み）
├── utils/                  # ユーティリティ（最小限）
│   ├── yaml-manager.ts          # YAML読み書き（統合済み）
│   ├── context-compressor.ts    # コンテキスト圧縮（統合済み）
│   └── playwright-browser-manager.ts # Playwright管理（統合済み）
└── scripts/                # 実行スクリプト（要件準拠）
    ├── main.ts                  # ループ実行
    ├── dev.ts                   # 単一実行
    └── core-runner.ts           # 共通実行ロジック
```

## ⚠️ 重要な注意点

### 統合作業時の注意
1. **機能保持**: 統合時に既存機能が失われないよう注意
2. **インポート修正**: 統合後のインポートパス変更
3. **型定義**: 型定義の移動に伴うTypeScriptエラー解消
4. **テスト更新**: 統合に伴うテストケースの更新

### 削除前の確認事項
1. **依存関係確認**: 他ファイルからの参照がないことを確認
2. **バックアップ**: 重要な機能がある場合は事前バックアップ
3. **段階的実行**: 一度にすべて削除せず、段階的に実行
4. **動作確認**: 各段階で動作確認を実施

**この整理により、要件定義に完全準拠したシンプルで保守性の高いsrc/ディレクトリ構造を実現する。ファイル数の大幅削減により、開発・保守効率が格段に向上する。**