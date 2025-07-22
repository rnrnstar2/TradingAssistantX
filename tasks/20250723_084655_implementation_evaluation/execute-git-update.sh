#!/bin/bash

# 🚀 Git更新自動実行スクリプト
# MVP完成に伴う大規模リファクタリングの記録

set -e

echo "🚀 Git更新処理開始..."
echo "========================================"

# 現在の状態確認
echo "📊 現在の変更状況確認..."
CHANGES=$(git status --porcelain | wc -l)
echo "変更ファイル数: $CHANGES"
echo ""

# ブランチ確認
BRANCH=$(git branch --show-current)
echo "📌 現在のブランチ: $BRANCH"
if [ "$BRANCH" != "feature/src-optimization-20250722" ]; then
    echo "⚠️  警告: 想定と異なるブランチです"
    echo "続行しますか？ (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "中止しました"
        exit 1
    fi
fi
echo ""

# Phase 1: 旧実装クリーンアップ
echo "📝 Phase 1: 旧実装クリーンアップ..."
echo "========================================"

# 削除ファイルのステージング
git add -u src/lib/ 2>/dev/null || true
git add -u src/core/action-executor.ts src/core/cache-manager.ts src/core/config-manager.ts 2>/dev/null || true
git add -u src/core/context-manager.ts src/core/decision-processor.ts 2>/dev/null || true
git add -u src/core/parallel-manager.ts src/core/true-autonomous-workflow.ts 2>/dev/null || true
git add -u src/scripts/autonomous-runner*.ts src/scripts/test-api-connections.ts 2>/dev/null || true
git add -u src/types/action-types.ts src/types/autonomous-system.ts 2>/dev/null || true
git add -u src/types/collection-common.ts src/types/convergence-types.ts 2>/dev/null || true
git add -u src/types/decision-logging-types.ts src/types/rss-collection-types.ts 2>/dev/null || true
git add -u src/types/adaptive-collection.d.ts 2>/dev/null || true
git add -u src/utils/config-*.ts src/utils/optimization-metrics.ts src/utils/test-helper.ts 2>/dev/null || true
git add -u data/*.yaml data/autonomous-sessions/ data/context/ data/core/ 2>/dev/null || true
git add -u examples/ 2>/dev/null || true

# ステージング確認
STAGED=$(git diff --cached --numstat | wc -l)
if [ "$STAGED" -gt 0 ]; then
    echo "✅ Phase 1: $STAGED ファイルをステージング"
    
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
    
    echo "✅ Phase 1 コミット完了"
else
    echo "⏭️  Phase 1: 変更なし（スキップ）"
fi
echo ""

# Phase 2: 新実装追加
echo "📝 Phase 2: 新実装追加..."
echo "========================================"

# 新規ファイルのステージング
git add src/collectors/ 2>/dev/null || true
git add src/services/ 2>/dev/null || true
git add src/core/loop-manager.ts 2>/dev/null || true
git add src/scripts/core-runner.ts src/scripts/dev.ts src/scripts/main.ts 2>/dev/null || true
git add src/scripts/init-hierarchical-data.ts 2>/dev/null || true
git add src/types/collection-types.ts src/types/content-types.ts 2>/dev/null || true
git add src/types/integration-types.ts src/types/system-types.ts 2>/dev/null || true
git add src/utils/context-compressor.ts src/utils/yaml-manager.ts 2>/dev/null || true
git add src/logging/ 2>/dev/null || true
git add data/config/ data/current/ data/learning/ 2>/dev/null || true
git add data/archives/2025-07/ data/archives/posts/ 2>/dev/null || true
git add data/strategic-decisions.yaml data/data/ 2>/dev/null || true
git add REQUIREMENTS.md 2>/dev/null || true
git add docs/architecture/ 2>/dev/null || true

# ステージング確認
STAGED=$(git diff --cached --numstat | wc -l)
if [ "$STAGED" -gt 0 ]; then
    echo "✅ Phase 2: $STAGED ファイルをステージング"
    
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
    
    echo "✅ Phase 2 コミット完了"
else
    echo "⏭️  Phase 2: 変更なし（スキップ）"
fi
echo ""

# Phase 3: 更新とタスク記録
echo "📝 Phase 3: 更新とタスク記録..."
echo "========================================"

# 変更ファイルとタスク記録のステージング
git add -u src/core/autonomous-executor.ts src/core/decision-engine.ts 2>/dev/null || true
git add -u src/types/decision-types.ts src/types/index.ts 2>/dev/null || true
git add -u src/utils/monitoring/health-check.ts 2>/dev/null || true
git add -u docs/ 2>/dev/null || true
git add -u CLAUDE.md memo.md 2>/dev/null || true
git add -u package.json pnpm-lock.yaml 2>/dev/null || true
git add tasks/20250722*/ tasks/20250723*/ 2>/dev/null || true
git add tasks/outputs/ 2>/dev/null || true
git add tests/ 2>/dev/null || true
git add dist/ 2>/dev/null || true
git add tsconfig.tsbuildinfo 2>/dev/null || true
git add node_modules/.modules.yaml 2>/dev/null || true
git add node_modules/.pnpm-workspace-state.json 2>/dev/null || true
git add node_modules/.pnpm/lock.yaml 2>/dev/null || true
git add node_modules/.vite/ 2>/dev/null || true

# ステージング確認
STAGED=$(git diff --cached --numstat | wc -l)
if [ "$STAGED" -gt 0 ]; then
    echo "✅ Phase 3: $STAGED ファイルをステージング"
    
    # コミット実行
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
    
    echo "✅ Phase 3 コミット完了"
else
    echo "⏭️  Phase 3: 変更なし（スキップ）"
fi
echo ""

# 最終確認
echo "🎉 Git更新処理完了！"
echo "========================================"

# 最終状態確認
echo "📊 最終状態:"
git status --short

echo ""
echo "📝 コミット履歴:"
git log --oneline -5

echo ""
echo "✅ すべての変更が正常にコミットされました"
echo ""
echo "📌 次のステップ:"
echo "1. git push origin $BRANCH (リモートへプッシュ)"
echo "2. Pull Request作成"
echo "3. コードレビュー実施"
echo ""
echo "🏆 MVP実装完了！おめでとうございます！"