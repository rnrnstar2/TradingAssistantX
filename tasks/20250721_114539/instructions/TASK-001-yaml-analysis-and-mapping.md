# TASK-001: YAMLファイル使用状況調査

## 🎯 目的
既存YAMLファイルの実際の使用状況を調査し、安全な統合のための詳細マッピングを作成する。

## 📋 調査対象
dataディレクトリの全YAMLファイル（9個）の使用状況

## 🔍 実行内容

### 1. ファイル使用状況調査
各YAMLファイルがどこで読み込まれ、使用されているかを調査：

```bash
# 各ファイル名でグローバル検索
grep -r "account-info.yaml" src/ --include="*.ts" --include="*.js"
grep -r "account-strategy.yaml" src/ --include="*.ts" --include="*.js"
grep -r "collection-results.yaml" src/ --include="*.ts" --include="*.js"
grep -r "content-patterns.yaml" src/ --include="*.ts" --include="*.js"
grep -r "growth-targets.yaml" src/ --include="*.ts" --include="*.js"
grep -r "performance-insights.yaml" src/ --include="*.ts" --include="*.js"
grep -r "posting-history.yaml" src/ --include="*.ts" --include="*.js"
grep -r "quality-assessments.yaml" src/ --include="*.ts" --include="*.js"
grep -r "strategic-decisions.yaml" src/ --include="*.ts" --include="*.js"
```

### 2. インポート・型定義調査
各ファイルに対応する型定義の存在確認：

```bash
# 型定義検索
grep -r "AccountInfo\|AccountStrategy\|CollectionResults\|ContentPatterns\|GrowthTargets\|PerformanceInsights\|PostingHistory\|QualityAssessments\|StrategicDecisions" src/types/ --include="*.ts"
```

### 3. 実行時読み込み調査
ファイルパスで実際に読み込まれている箇所を特定：

```bash
# データ読み込み関数の検索
grep -r "readFile\|readFileSync\|loadYaml\|readYaml" src/ --include="*.ts" --include="*.js" -A 3 -B 3
```

## 📊 作成するレポート

### ファイル使用状況マトリックス
各ファイルごとに以下を記録：

```yaml
file_usage_analysis:
  account-info.yaml:
    used_in_files: []  # 使用しているファイルのリスト
    type_definitions: []  # 対応する型定義
    read_frequency: 0  # 読み込み箇所数
    safety_level: "safe"  # safe/caution/critical
    
  account-strategy.yaml:
    used_in_files: []
    type_definitions: []
    read_frequency: 0
    safety_level: "safe"
    
  # ... 全ファイル分
```

### 依存関係マップ
```yaml
dependency_map:
  high_risk:  # 多数の箇所で使用
    - file_name
    - impact_score
    
  medium_risk:  # 複数箇所で使用
    - file_name
    - impact_score
    
  low_risk:  # 使用箇所少ない/未使用
    - file_name
    - impact_score
```

## 📝 出力ファイル
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-001-yaml-usage-analysis.yaml`

## 🚫 MVP制約
- コード修正は一切行わない
- 調査のみに専念
- 分析・統計機能は追加しない

## ✅ 完了基準
1. 全9ファイルの使用状況調査完了
2. 型定義との対応関係特定
3. 依存関係マップ作成
4. 安全性レベル評価完了
5. 詳細レポート出力完了

---
**重要**: 調査結果は後続Workerの設計作業で使用されるため、正確性を最優先とする。