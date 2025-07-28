# Task: srcディレクトリ構造の再編成

## 概要
libディレクトリを廃止し、機能別に整理された新しいディレクトリ構造に再編成します。

## 前提条件
- Phase 1（TASK-001）が完了していること
- 削除対象ファイルが既に削除されていること

## 新ディレクトリ構造の作成

### Step 1: 新規ディレクトリの作成
```bash
mkdir -p src/collectors/base
mkdir -p src/collectors/specialized
mkdir -p src/collectors/integrated
mkdir -p src/collectors/engines
mkdir -p src/providers
mkdir -p src/engines/convergence
mkdir -p src/managers/browser
mkdir -p src/managers/resource
mkdir -p src/services
mkdir -p src/decision
mkdir -p src/logging
mkdir -p src/exploration
mkdir -p src/rss
```

## ファイル移動マッピング

### collectors/base/ (旧sources/)
- `src/lib/sources/rss-collector.ts` → `src/collectors/base/rss-collector.ts`
- `src/lib/sources/api-collector.ts` → `src/collectors/base/api-collector.ts`
- `src/lib/sources/community-collector.ts` → `src/collectors/base/community-collector.ts`

### collectors/specialized/
- `src/lib/fx-api-collector.ts` → `src/collectors/specialized/fx-api-collector.ts`
- `src/lib/playwright-account-collector.ts` → `src/collectors/specialized/playwright-account-collector.ts`
- `src/lib/realtime-info-collector.ts` → `src/collectors/specialized/realtime-info-collector.ts`

### collectors/integrated/
- `src/lib/multi-source-collector.ts` → `src/collectors/integrated/multi-source-collector.ts`
- `src/lib/enhanced-info-collector.ts` → `src/collectors/integrated/enhanced-info-collector.ts`
- `src/lib/adaptive-collector.ts` → `src/collectors/integrated/adaptive-collector.ts`
- `src/lib/action-specific-collector.ts` → `src/collectors/integrated/action-specific-collector.ts`

### collectors/engines/
- `src/lib/rss-parallel-collection-engine.ts` → `src/collectors/engines/rss-parallel-collection-engine.ts`

### providers/
- `src/lib/claude-autonomous-agent.ts` → `src/providers/claude-autonomous-agent.ts`
- `src/lib/claude-optimized-provider.ts` → `src/providers/claude-optimized-provider.ts`
- `src/lib/claude-tools.ts` → `src/providers/claude-tools.ts`
- `src/lib/x-client.ts` → `src/providers/x-client.ts`

### engines/
- `src/lib/content-convergence-engine.ts` → `src/engines/content-convergence-engine.ts`
- `src/lib/autonomous-exploration-engine.ts` → `src/engines/autonomous-exploration-engine.ts`
- `src/lib/context-compression-system.ts` → `src/engines/context-compression-system.ts`
- `src/lib/minimal-decision-engine.ts` → `src/engines/lightweight-decision-engine.ts` （リネーム）

### engines/convergence/
- `src/lib/convergence/insight-synthesizer.ts` → `src/engines/convergence/insight-synthesizer.ts`
- `src/lib/convergence/narrative-builder.ts` → `src/engines/convergence/narrative-builder.ts`
- `src/lib/convergence/value-maximizer.ts` → `src/engines/convergence/value-maximizer.ts`

### managers/
- `src/lib/posting-manager.ts` → `src/managers/posting-manager.ts`
- `src/lib/daily-action-planner.ts` → `src/managers/daily-action-planner.ts`

### managers/browser/
- `src/lib/browser/pool-manager.ts` → `src/managers/browser/pool-manager.ts`
- `src/lib/browser/performance-tuner.ts` → `src/managers/browser/performance-tuner.ts`
- `src/lib/browser/memory-leak-prevention.ts` → `src/managers/browser/memory-leak-prevention.ts`
- `src/lib/browser/resource-optimizer.ts` → `src/managers/browser/resource-optimizer.ts`
- `src/lib/playwright-browser-manager.ts` → `src/managers/browser/playwright-browser-manager.ts`

### managers/resource/
- `src/lib/intelligent-resource-manager.ts` → `src/managers/resource/intelligent-resource-manager.ts`
- `src/lib/memory-optimizer.ts` → `src/managers/resource/memory-optimizer.ts`

### services/
- `src/lib/information-evaluator.ts` → `src/services/information-evaluator.ts`
- `src/lib/context-integrator.ts` → `src/services/context-integrator.ts`
- `src/lib/oauth1-client.ts` → `src/services/oauth1-client.ts`
- `src/lib/expanded-action-executor.ts` → `src/services/expanded-action-executor.ts`
- `src/lib/data-communication-system.ts` → `src/services/data-communication-system.ts`
- `src/lib/playwright-common-config.ts` → `src/services/playwright-common-config.ts`

### decision/
- `src/lib/decision/collection-strategy-selector.ts` → `src/decision/collection-strategy-selector.ts`
- `src/lib/decision/execution-monitor.ts` → `src/decision/execution-monitor.ts`
- `src/lib/decision/quality-maximizer.ts` → `src/decision/quality-maximizer.ts`
- `src/lib/decision/resource-allocator.ts` → `src/decision/resource-allocator.ts`
- `src/lib/decision/site-profiler.ts` → `src/decision/site-profiler.ts`

### logging/
- `src/lib/decision-logger.ts` → `src/logging/decision-logger.ts`
- `src/lib/logging/decision-tracer.ts` → `src/logging/decision-tracer.ts`
- `src/lib/logging/visualization-formatter.ts` → `src/logging/visualization-formatter.ts`
- `src/lib/minimal-logger.ts` → `src/logging/minimal-logger.ts`

### exploration/
- `src/lib/exploration/content-analyzer.ts` → `src/exploration/content-analyzer.ts`
- `src/lib/exploration/link-evaluator.ts` → `src/exploration/link-evaluator.ts`

### rss/
- `src/lib/rss/emergency-handler.ts` → `src/rss/emergency-handler.ts`
- `src/lib/rss/feed-analyzer.ts` → `src/rss/feed-analyzer.ts`
- `src/lib/rss/parallel-processor.ts` → `src/rss/parallel-processor.ts`
- `src/lib/rss/realtime-detector.ts` → `src/rss/realtime-detector.ts`
- `src/lib/rss/source-prioritizer.ts` → `src/rss/source-prioritizer.ts`

### core/の更新
- `src/core/config-manager.ts` → `src/core/app-config-manager.ts` （リネーム）

## 実装手順

### Step 1: バックアップ作成
```bash
mkdir -p tasks/20250722_193030/backup/src-cleanup-phase2
cp -r src/lib tasks/20250722_193030/backup/src-cleanup-phase2/
```

### Step 2: ファイル移動の実行
1. 上記のマッピングに従って各ファイルを移動
2. mvコマンドを使用して移動（例: `mv src/lib/sources/rss-collector.ts src/collectors/base/rss-collector.ts`）
3. 移動後、元のディレクトリが空になったら削除

### Step 3: libディレクトリの削除
すべてのファイル移動が完了したら：
```bash
rm -rf src/lib
```

### Step 4: 移動確認レポートの作成
- 移動前後のファイルパスのマッピング表
- 移動したファイル数の統計
- 新しいディレクトリ構造の確認

## 品質基準
- すべてのファイルが正しく移動されていること
- 元のlibディレクトリが完全に削除されていること
- ディレクトリ構造が指定通りに作成されていること

## 出力
- バックアップ: `tasks/20250722_193030/backup/src-cleanup-phase2/lib/`
- 移動確認レポート: `tasks/20250722_193030/outputs/phase2-reorganization-report.md`

## 注意事項
- ファイル移動時は必ずmvコマンドを使用（コピー＆削除ではなく）
- 移動前に必ずバックアップを作成
- この段階ではimport文の更新は行わない（Phase 3で実施）