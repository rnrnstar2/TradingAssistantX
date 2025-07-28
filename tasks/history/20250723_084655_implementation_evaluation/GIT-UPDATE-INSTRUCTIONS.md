# 🚀 Git更新作業指示書

## 📋 **ミッション**: 大規模リファクタリング後のGit更新実行

**Manager権限発行指示書**  
**対象**: Worker権限実行者  
**作業内容**: 段階的コミット実行による変更記録  

---

## 🔍 **現在の変更状況**

### **📊 変更サマリー**
- **削除ファイル**: 150+ ファイル（旧実装・データファイル）
- **新規ファイル**: 40+ ファイル（新実装・設定・タスク）
- **変更ファイル**: 20+ ファイル（ドキュメント・設定等）
- **ブランチ**: feature/src-optimization-20250722

### **🏗️ 主要変更内容**
1. **src/大規模リファクタリング**
   - 旧lib/core実装を削除
   - 新collectors/services/scripts実装追加
   - utils最適化（config-*ファイル削除）

2. **data/階層構造整理**
   - 旧フラット構造を削除
   - 新3層階層構造（config/current/learning/archives）実装

3. **ドキュメント刷新**
   - docs/配下の全ガイド更新
   - REQUIREMENTS.md追加（要件定義書）

---

## 📝 **段階的コミット戦略**

### **Phase 1: 旧実装クリーンアップ**
```bash
# 削除ファイルのステージング
git add -u src/lib/
git add -u src/core/action-executor.ts src/core/cache-manager.ts src/core/config-manager.ts
git add -u src/core/context-manager.ts src/core/decision-processor.ts
git add -u src/core/parallel-manager.ts src/core/true-autonomous-workflow.ts
git add -u src/scripts/autonomous-runner*.ts src/scripts/test-api-connections.ts
git add -u src/types/action-types.ts src/types/autonomous-system.ts
git add -u src/types/collection-common.ts src/types/convergence-types.ts
git add -u src/types/decision-logging-types.ts src/types/rss-collection-types.ts
git add -u src/utils/config-*.ts src/utils/optimization-metrics.ts src/utils/test-helper.ts
git add -u data/*.yaml data/autonomous-sessions/ data/context/ data/core/
git add -u examples/

# コミット実行
git commit -m "refactor: remove legacy implementation and flatten data structure

- Remove 150+ legacy files from src/lib/
- Remove old core implementation files
- Remove obsolete type definitions
- Remove flat data structure YAML files
- Remove unused utils (config-cache, config-manager, config-validator)
- Clean up examples directory

Part 1/3 of major refactoring

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### **Phase 2: 新実装追加**
```bash
# 新規ファイルのステージング
git add src/collectors/
git add src/services/
git add src/core/loop-manager.ts
git add src/scripts/core-runner.ts src/scripts/dev.ts src/scripts/main.ts
git add src/scripts/init-hierarchical-data.ts
git add src/types/collection-types.ts src/types/content-types.ts
git add src/types/integration-types.ts src/types/system-types.ts
git add src/utils/context-compressor.ts src/utils/yaml-manager.ts
git add src/logging/
git add data/config/ data/current/ data/learning/
git add data/archives/2025-07/ data/archives/posts/
git add data/strategic-decisions.yaml data/data/
git add REQUIREMENTS.md
git add docs/architecture/

# コミット実行
git commit -m "feat: implement MVP architecture with loose coupling design

- Add new collectors (RSS, Playwright) with base abstraction
- Add services layer (content-creator, data-optimizer, x-poster)
- Add loop management and execution scripts
- Implement 3-tier hierarchical data structure
- Add comprehensive type system
- Add utils optimization (context-compressor, yaml-manager)
- Add complete requirements definition (REQUIREMENTS.md)
- Add architecture documentation

Part 2/3 of major refactoring

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### **Phase 3: 更新とタスク記録**
```bash
# 変更ファイルとタスク記録のステージング
git add -u src/core/autonomous-executor.ts src/core/decision-engine.ts
git add -u src/types/decision-types.ts src/types/index.ts
git add -u src/utils/monitoring/health-check.ts
git add -u docs/
git add -u CLAUDE.md memo.md
git add -u package.json pnpm-lock.yaml
git add tasks/20250722*/ tasks/20250723*/
git add tasks/outputs/
git add tests/
git add dist/
git add tsconfig.tsbuildinfo

# 最終コミット
git commit -m "chore: update documentation and finalize MVP implementation

- Update core implementations for MVP
- Update all documentation guides
- Add comprehensive task history
- Add test implementations
- Update package dependencies
- Add implementation evaluation report

Part 3/3 of major refactoring - MVP complete

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🚀 **簡易実行オプション**

### **一括コミット（推奨しない）**
```bash
# すべての変更を一度にコミット（履歴が分かりにくくなる）
git add .
git commit -m "feat: complete MVP implementation with major refactoring

- Remove 150+ legacy files
- Implement new loose-coupling architecture
- Add 3-tier hierarchical data management
- Complete documentation overhaul
- Optimize utils (67% code reduction)
- Add comprehensive test coverage

Major milestone: Enterprise-grade MVP complete

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ **実行前チェックリスト**

### **安全確認**
- [ ] 現在のブランチ確認: `git branch` → feature/src-optimization-20250722
- [ ] リモート最新状態確認: `git fetch origin`
- [ ] コンフリクトなし確認: `git status`

### **コミット前確認**
- [ ] 不要なファイル除外: `node_modules/`変更は含めない
- [ ] センシティブ情報なし: APIキー等が含まれていないか確認
- [ ] ビルド成功確認: 可能であれば実行テスト

---

## 📋 **実行手順**

### **Step 1: 準備**
```bash
# 現在の状態確認
git status
git diff --stat

# 変更ファイル数確認
git status --porcelain | wc -l
```

### **Step 2: 段階的コミット実行**
1. Phase 1実行（削除）
2. Phase 2実行（追加）
3. Phase 3実行（更新）

### **Step 3: 最終確認**
```bash
# コミット履歴確認
git log --oneline -5

# プッシュ準備（必要に応じて）
# git push origin feature/src-optimization-20250722
```

---

## 🎯 **期待される結果**

### **Git履歴の明確化**
- Phase 1: レガシーコード削除の記録
- Phase 2: 新アーキテクチャ実装の記録
- Phase 3: 統合と完成の記録

### **変更の追跡性向上**
- 各フェーズで何が行われたか明確
- 将来の参照時に理解しやすい
- ロールバックが必要な場合の対応容易

---

## 🚨 **注意事項**

### **大規模変更の扱い**
- 200+ファイルの変更は慎重に扱う
- 段階的コミットで履歴を整理
- 各コミットメッセージを明確に

### **ブランチ戦略**
- 現在: feature/src-optimization-20250722
- マージ前にレビュー推奨
- 必要に応じてPR作成

---

## 🏆 **完了基準**

### **✅ Git更新完了条件**
1. すべての変更がコミットされている
2. コミット履歴が明確で追跡可能
3. ビルド・実行に問題なし
4. プッシュ可能な状態

### **📊 最終確認コマンド**
```bash
# クリーンな状態確認
git status
# → "nothing to commit, working tree clean"

# コミット数確認
git log --oneline feature/src-optimization-20250722 ^main | wc -l
# → 3以上（段階的コミット完了）
```

---

**作成日時**: 2025年1月23日  
**作成者**: Manager権限  
**目的**: MVP完成に伴う大規模リファクタリングのGit記録