# TASK-003: システム内参照確認

## 🎯 目的
YAMLファイル統合前に、システム全体でのファイル参照状況を調査し、見落としを防ぐ。

## 📋 調査対象
プロジェクト全体でのYAMLファイル参照（設定、スクリプト、ドキュメント含む）

## 🔍 実行内容

### 1. 設定ファイル内参照調査
package.json、tsconfig.json等での参照確認：

```bash
# 設定ファイル内でのYAML参照
grep -r "\.yaml\|\.yml" package.json tsconfig.json *.json 2>/dev/null || true

# スクリプト内でのファイル参照
grep -r "data/.*\.yaml" scripts/ --include="*.js" --include="*.ts" --include="*.sh" 2>/dev/null || true
```

### 2. ドキュメント内参照調査
ドキュメントファイルでのYAMLファイル言及確認：

```bash
# Markdownファイル内での参照
grep -r "\.yaml\|\.yml" docs/ --include="*.md" 2>/dev/null || true
grep -r "account-info\|account-strategy\|collection-results\|content-patterns\|growth-targets\|performance-insights\|posting-history\|quality-assessments\|strategic-decisions" docs/ --include="*.md" 2>/dev/null || true

# READMEファイル内確認
grep -r "\.yaml\|\.yml" README.md CLAUDE.md 2>/dev/null || true
```

### 3. 動的ファイル参照調査
文字列結合等で動的に参照される可能性を調査：

```bash
# 動的パス構築の検索
grep -r "data.*+\|data.*\${" src/ --include="*.ts" --include="*.js" 2>/dev/null || true
grep -r "path\.join.*data\|path\.resolve.*data" src/ --include="*.ts" --include="*.js" 2>/dev/null || true

# 設定から読み込むパスパターン
grep -r "config.*path\|config.*file" src/ --include="*.ts" --include="*.js" -A 2 -B 2 2>/dev/null || true
```

### 4. テストファイル内参照
テストコード内でのYAMLファイル使用確認：

```bash
# テストファイル内検索
find . -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" | xargs grep -l "\.yaml\|\.yml" 2>/dev/null || true

# テスト用データファイル確認
find . -path "*/test/*" -name "*.yaml" -o -path "*/tests/*" -name "*.yaml" 2>/dev/null || true
```

### 5. CI/CD・自動化スクリプト確認
GitHub Actions、npm scripts等での参照：

```bash
# GitHub Actions確認
grep -r "\.yaml\|\.yml" .github/ 2>/dev/null || true

# npm scripts確認
grep -r "data.*yaml" package.json 2>/dev/null || true
```

## 📊 作成するレポート

### システム参照マップ
```yaml
system_reference_analysis:
  direct_references:
    config_files:
      - file: "package.json"
        references: []
      - file: "tsconfig.json"  
        references: []
        
    script_files:
      - file: "scripts/setup.js"
        references: ["data/account-strategy.yaml"]
        
    documentation:
      - file: "docs/setup.md"
        references: ["data/growth-targets.yaml"]
        
  dynamic_references:
    path_construction:
      - pattern: "data/${filename}.yaml"
        locations: ["src/lib/config.ts:45"]
        
    config_driven:
      - pattern: "config.dataPath + filename"
        locations: ["src/core/loader.ts:23"]
        
  potential_references:
    test_files: []
    ci_cd_files: []
    other_scripts: []
```

### リスク評価
```yaml
reference_risks:
  breaking_changes:  # 変更時に壊れる可能性
    high:
      - reference: "scripts/deploy.sh -> data/account-strategy.yaml"
        impact: "デプロイプロセス停止"
        
    medium:
      - reference: "docs/setup.md -> growth-targets.yaml"
        impact: "ドキュメント整合性"
        
    low:
      - reference: "test fixture reference"
        impact: "テスト失敗"
        
  hidden_dependencies:  # 見落としやすい依存関係
    - location: "動的パス構築"
      risk_level: "high"
    - location: "設定ファイル経由"
      risk_level: "medium"
```

## 📝 出力ファイル
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-003-system-reference-analysis.yaml`

## 🚫 MVP制約
- ファイル修正は一切行わない
- 包括的な調査のみ実行
- 自動化ツールは使用しない

## ✅ 完了基準
1. 全参照パターンの調査完了
2. 動的参照の特定
3. 隠れた依存関係の発見
4. リスク評価の完了
5. 包括的レポート作成完了

## 🔗 依存関係
**前提条件**: なし（並列実行可能）
**連携**: TASK-001, TASK-002の結果と統合予定

---
**重要**: 見落としがちな参照パターンの発見が最重要目標。