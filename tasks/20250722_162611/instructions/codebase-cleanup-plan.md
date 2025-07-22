# TradingAssistantX コードベース大規模クリーンアップ計画

## 🎯 **目標**
Claude Code SDK中心の完全自律システムへの集約
- **現状**: 120+ ファイルの複雑なレガシー構造
- **目標**: 30 ファイルの洗練されたクリーンな構造
- **削減率**: 75%のファイル削除による品質向上と保守性改善

## 🚨 **重要：実行前の必須確認**

### **動作確認**
```bash
# 削除前の動作確認（必須）
pnpm dev
# → 正常動作することを確認

# バックアップ作成（推奨）
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)
```

## 📋 **段階的削除計画**

### **Phase 1: 高優先度レガシーファイル削除 (28ファイル)**

**確実に削除可能**：
```bash
# core/ 配下のレガシー
rm src/core/true-autonomous-workflow.ts

# lib/ 配下の重複・未使用ファイル  
rm src/lib/autonomous-exploration-engine.ts
rm src/lib/async-execution-manager.ts
rm src/lib/claude-controlled-collector.ts
rm src/lib/claude-error-fixer.ts
rm src/lib/claude-optimized-provider.ts
rm src/lib/claude-tools.ts
rm src/lib/content-convergence-engine.ts
rm src/lib/context-compression-system.ts
rm src/lib/context-integrator.ts
rm src/lib/context-manager.ts
rm src/lib/data-communication-system.ts
rm src/lib/decision-logger.ts
rm src/lib/execution-orchestrator.ts
rm src/lib/expanded-action-executor.ts
rm src/lib/fx-api-collector.ts
rm src/lib/fx-structured-site-collector.ts
rm src/lib/fx-unified-collector.ts
rm src/lib/growth-system-manager.ts
rm src/lib/information-evaluator.ts
rm src/lib/intelligent-resource-manager.ts
rm src/lib/long-running-task-manager.ts
rm src/lib/memory-optimizer.ts
rm src/lib/minimal-decision-engine.ts
rm src/lib/minimal-logger.ts
rm src/lib/multi-source-collector.ts
rm src/lib/parallel-execution-manager.ts
rm src/lib/playwright-account-collector.ts
rm src/lib/posting-manager.ts
rm src/lib/quality-perfection-system.ts
rm src/lib/realtime-info-collector.ts
rm src/lib/rss-parallel-collection-engine.ts
rm src/lib/x-performance-analyzer.ts
```

### **Phase 2: サブディレクトリ群削除 (40+ファイル)**

**確認後削除**：
```bash
# 大規模サブディレクトリ
rm -rf src/lib/browser/          # 4ファイル - ブラウザ最適化系
rm -rf src/lib/collectors/       # 30+ファイル - 収集システム群
rm -rf src/lib/convergence/      # 3ファイル - 収束システム
rm -rf src/lib/decision/         # 6ファイル - 決定システム群  
rm -rf src/lib/exploration/      # 2ファイル - 探索システム
rm -rf src/lib/logging/          # 2ファイル - ログシステム
rm -rf src/lib/quality/          # 5ファイル - 品質システム群
rm -rf src/lib/rss/              # 5ファイル - RSS関連システム
rm -rf src/lib/sources/          # 3ファイル - ソース収集

# utils/ 配下の開発ツール系
rm src/utils/config-cache.ts
rm src/utils/config-loader.ts
rm src/utils/config-templates.ts
rm src/utils/config-validator.ts
rm src/utils/error-handler.ts
rm src/utils/file-size-monitor.ts
rm src/utils/optimization-metrics.ts
rm src/utils/test-helper.ts
```

### **Phase 3: 開発ツール・テスト関連削除 (低優先度)**

**慎重に確認後削除**：
```bash
# scripts/ 配下の開発ツール
rm src/scripts/baseline-measurement.ts
rm src/scripts/oauth1-diagnostics.ts
rm src/scripts/oauth1-setup-helper.ts
rm src/scripts/oauth1-test-connection.ts

# types/ 配下の未使用型定義
rm src/types/browser-optimization-types.ts
rm src/types/claude-tools.ts
rm src/types/collection-common.ts
rm src/types/content-strategy.ts
rm src/types/convergence-types.ts
rm src/types/decision-logging-types.ts
rm src/types/decision-types.ts
rm src/types/exploration-types.ts
rm src/types/multi-source.ts
rm src/types/posting-data.ts
rm src/types/quality-perfection-types.ts
rm src/types/rss-collection-types.ts
rm src/types/workflow-types.ts
```

## ✅ **残すべき核心ファイル（30ファイル）**

### **エントリーポイント（2ファイル）**
- `src/scripts/autonomous-runner-single.ts`
- `src/scripts/autonomous-runner.ts`

### **核心システム（8ファイル）**
- `src/core/autonomous-executor.ts`
- `src/core/decision-engine.ts`
- `src/core/parallel-manager.ts`
- `src/core/cache-manager.ts`
- `src/core/context-manager.ts`
- `src/core/decision-processor.ts`
- `src/core/action-executor.ts`
- `src/core/config-manager.ts`

### **重要ライブラリ（10ファイル）**
- `src/lib/x-client.ts`
- `src/lib/oauth1-client.ts`
- `src/lib/account-analyzer.ts`
- `src/lib/claude-autonomous-agent.ts`
- `src/lib/enhanced-info-collector.ts`
- `src/lib/daily-action-planner.ts`
- `src/lib/action-specific-collector.ts`
- `src/lib/playwright-browser-manager.ts`
- `src/lib/playwright-common-config.ts`

### **型定義（3ファイル）**
- `src/types/autonomous-system.ts`
- `src/types/action-types.ts`
- `src/types/index.ts`

### **ユーティリティ（3ファイル）**
- `src/utils/yaml-utils.ts`
- `src/utils/config-manager.ts`
- `src/utils/monitoring/health-check.ts`

### **アカウント設定（1ファイル）**
- `src/types/account-config.ts`

## 🔍 **削除後の検証手順**

### **必須検証**
```bash
# 1. TypeScriptコンパイル確認
pnpm build

# 2. 基本動作確認  
pnpm dev

# 3. 定期実行確認
pnpm start

# 4. エラーログ確認
# ログにimportエラーがないことを確認
```

### **動作しない場合の対処**
```bash
# 必要ファイルが削除された場合の復旧
cp -r src_backup_*/[必要ファイル] src/

# 段階的に戻して問題特定
git stash
git checkout HEAD~1
```

## 🎯 **期待される効果**

### **品質向上**
- **コードベース簡素化**: 120+ → 30ファイル
- **保守性大幅向上**: 核心機能への集中
- **開発効率向上**: 迷いのないクリアな構造

### **パフォーマンス向上**
- **ビルド時間短縮**: 不要ファイルコンパイル除去
- **メモリ使用量削減**: 未使用モジュールの除去
- **起動時間短縮**: 依存関係の簡素化

### **システム信頼性向上**  
- **Claude Code SDK中心**: 一貫したAI制御システム
- **疎結合設計維持**: 核心アーキテクチャの保持
- **エラー可能性削減**: 複雑性の大幅軽減

## ⚠️ **注意事項**

1. **必ず段階的に実行**：一度に全削除せず、Phase毎に動作確認
2. **バックアップ必須**：削除前に必ずsrcディレクトリの完全バックアップ
3. **動作確認徹底**：各Phase後に`pnpm dev`での動作確認
4. **依存関係注意**：予期しないimportエラーが発生する可能性

## 📊 **成果指標**

- ✅ ファイル数：120+ → 30 (75%削減)
- ✅ ビルド時間：測定して改善確認
- ✅ 起動時間：測定して改善確認  
- ✅ コード品質：ESLintエラー0維持
- ✅ 機能完全性：全機能正常動作確認

この計画により、TradingAssistantXは真にClaude Code SDK中心の洗練されたシステムに生まれ変わります。