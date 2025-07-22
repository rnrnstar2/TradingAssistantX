# TASK-001: Directory Structure & File Integration Analysis

**Worker2 - System Architecture Validation**

## 🎯 **Mission Overview**
Manager phase完了システムの全体構造・ファイル整合性を全方位から検証し、統合最適化要件を特定せよ。

**重点対象**: `tasks/20250721_233822_autonomous_fx_collection_mvp/` + 全システム構造

## 📋 **Analysis Scope**

### 1. **Directory Architecture Validation**
**対象ディレクトリ**:
- `src/lib/` - 3エンジン関連コアファイル
- `data/` - YAML設定・データファイル
- `dist/` - ビルド成果物・JS出力
- `docs/` - ドキュメント体系
- `tasks/` - タスク管理・実行履歴
- `tests/` - テストファイル構造

**検証項目**:
```bash
# ディレクトリ構造チェック
find src/ -name "*.ts" | head -20
find data/ -name "*.yaml" -o -name "*.json" | head -15
find dist/ -name "*.js" | head -20
ls -la docs/
ls -la tests/
```

### 2. **Configuration Integration Check**
**設定ファイル整合性確認**:
- `data/account-config.yaml` - 基本設定適正性
- `package.json` + `pnpm-lock.yaml` - 依存関係整合性
- `tsconfig.json` - TypeScript設定適合性
- `vitest.config.ts` - テスト環境統合状況

**チェック方法**:
```bash
# 設定整合性チェック
cat data/account-config.yaml | head -30
cat package.json | jq '.dependencies, .devDependencies'
cat tsconfig.json | jq '.compilerOptions'
```

### 3. **File Cross-Reference Analysis**
**依存関係検証**:
- Import/Export チェーン整合性
- 型定義ファイル相互依存性
- 重複コード・競合リスク特定
- Dead Code・遺棄ファイル検出

**実行方法**:
```bash
# Import/Export 関係チェック
grep -r "import.*from" src/ --include="*.ts" | head -20
grep -r "export" src/ --include="*.ts" | head -20

# 型定義依存関係
grep -r "interface\|type" src/types/ --include="*.ts"
```

### 4. **Build & Runtime Integration**
**実行環境整合性**:
- `pnpm dev` 実行可能性事前チェック
- TypeScript型エラー潜在リスク
- 3エンジン間インターフェース適合性

**検証コマンド**:
```bash
# ビルドチェック (エラーのみ確認)
pnpm run type-check 2>&1 | head -20
pnpm run lint --silent 2>&1 | head -10
```

### 5. **Critical MVP Target Analysis**
**`tasks/20250721_233822_autonomous_fx_collection_mvp/` 深度分析**:

**Phase 1: Structure Analysis**
```bash
find tasks/20250721_233822_autonomous_fx_collection_mvp/ -type f
cat tasks/20250721_233822_autonomous_fx_collection_mvp/reports/REPORT-*.md
```

**Phase 2: Integration Points**
- 他システムとの統合ポイント特定
- 依存関係・必要ファイルマッピング
- 実行フロー整合性チェック

**Phase 3: Quality Assessment**
- 実装完成度評価
- テストカバレッジ状況
- 本番利用可能性判定

## 📊 **Required Output Format**

出力先: `tasks/20250722_001124_directory_integration_analysis/reports/REPORT-001-directory-integration-analysis.md`

**必須出力構造**:
```yaml
worker2_analysis:
  # システム構造状況
  directory_status:
    structure_integrity: "GOOD|ISSUES|CRITICAL"
    config_alignment: "ALIGNED|MINOR_ISSUES|MAJOR_ISSUES" 
    file_dependencies: "CLEAN|WARNINGS|ERRORS"
    build_readiness: "READY|NEEDS_FIX|BROKEN"
    
  # 統合ギャップ分析
  integration_gaps:
    - gap: "具体的な不整合・欠陥"
      impact: "high|medium|low"
      files: ["影響ファイルリスト"]
      recommendation: "解決方法"
      
  # 最適化要件
  optimization_requirements:
    - requirement: "最適化が必要な具体事項"
      priority: "high|medium|low" 
      scope: "影響範囲"
      effort: "小|中|大"
      
  # 推奨アクション
  recommended_actions:
    - action: "具体的アクション"
      urgency: "immediate|planned|future"
      dependencies: ["前提条件・依存事項"]

  # MVP対象分析
  mvp_target_analysis:
    completion_status: "％完成度"
    integration_readiness: "統合準備状況"
    critical_issues: ["重要課題リスト"]
    next_steps: ["次ステップ推奨"]
```

## 🔧 **Implementation Constraints**

### ✅ **Permitted Actions**
- ファイル読み取り・検索・分析
- bash コマンドによる構造チェック
- 設定ファイル内容確認
- 依存関係マッピング

### 🚫 **Prohibited Actions** 
- ファイル編集・作成・削除
- システム設定変更
- 実際のビルド・テスト実行
- ルートディレクトリへの出力

## 📈 **Success Criteria**

1. **完全性**: 全主要ディレクトリ・ファイルの構造把握完了
2. **整合性**: 設定・依存関係の不整合検出・分類完了
3. **実用性**: 具体的改善アクション提案完了
4. **MVP評価**: 対象プロジェクト統合可能性評価完了

## 🚨 **Critical Notes**
- 分析結果は必ず `/tasks/20250722_001124_directory_integration_analysis/reports/` 配下に出力
- ルートディレクトリ汚染は絶対禁止
- 発見した課題は重要度・影響度でランク付け必須
- MVP対象プロジェクトの統合準備状況を重点評価

**Manager期待**: システム全体俯瞰で構造的問題を徹底検出・分類し、次期統合作業への明確な指針を提供せよ。