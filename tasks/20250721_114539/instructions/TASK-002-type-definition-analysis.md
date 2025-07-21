# TASK-002: 型定義依存関係分析

## 🎯 目的
YAMLファイル統合において、TypeScript型定義の依存関係を分析し、安全な移行計画を策定する。

## 📋 調査対象
`src/types/`ディレクトリの型定義とYAMLファイルの関係

## 🔍 実行内容

### 1. 型定義ファイル特定
YAMLファイルに関連する型定義を特定：

```bash
# 型定義ファイルの存在確認
find src/types/ -name "*.ts" | xargs grep -l "yaml\|Yaml\|YAML"

# 各種データ型の検索
grep -r "interface.*\(Account\|Content\|Growth\|Performance\|Posting\|Quality\|Strategic\|Collection\)" src/types/ --include="*.ts"
```

### 2. インターフェース依存関係調査
各型定義がどの他の型を参照しているか調査：

```bash
# インポート文の検索
grep -r "import.*from.*types" src/ --include="*.ts" -n

# 型の使用状況検索
grep -r ":\s*\(AccountInfo\|AccountStrategy\|ContentPatterns\)" src/ --include="*.ts" -n
```

### 3. 型定義の複雑度評価
各型定義の複雑度とリファクタリング難易度を評価：

```bash
# ネストした型定義の検索
grep -r "interface.*{" src/types/ --include="*.ts" -A 20 | grep -E "^\s+\w+:\s*{" -c

# 配列・オブジェクト型の検索  
grep -r "\[\]\|Array<\|Record<\|{.*:" src/types/ --include="*.ts"
```

## 📊 作成するレポート

### 型定義マッピング
```yaml
type_definition_analysis:
  existing_types:
    AccountInfo:
      file_path: "src/types/account.ts"
      complexity: "simple"  # simple/medium/complex
      dependencies: []  # 依存する他の型
      used_by: []  # この型を使用するファイル
      
    AccountStrategy:
      file_path: "src/types/strategy.ts"
      complexity: "complex"
      dependencies: ["ContentTemplate", "PostingSchedule"]
      used_by: ["src/lib/strategy.ts", "src/core/engine.ts"]
      
    # ... 全型定義分
```

### リファクタリング影響度
```yaml
refactoring_impact:
  high_impact:  # 変更時に多数のファイルに影響
    - type_name: "AccountStrategy"
      affected_files: 15
      complexity_score: 8
      
  medium_impact:
    - type_name: "ContentPatterns"
      affected_files: 5
      complexity_score: 4
      
  low_impact:
    - type_name: "PerformanceInsights"
      affected_files: 1
      complexity_score: 2
```

### 統合推奨戦略
```yaml
integration_strategy:
  phase1_safe:  # 影響の少ない型から統合
    - "PerformanceInsights"
    - "QualityAssessments"
    
  phase2_medium:  # 中程度の影響
    - "ContentPatterns"
    - "GrowthTargets"
    
  phase3_complex:  # 慎重に進める必要がある
    - "AccountStrategy"
    - "PostingHistory"
```

## 📝 出力ファイル
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-002-type-analysis.yaml`

## 🚫 MVP制約
- 型定義の修正は行わない
- 新しい型の作成はしない
- 分析のみに専念

## ✅ 完了基準
1. 全型定義の依存関係マップ作成
2. 影響度評価完了
3. 段階的統合戦略策定
4. リスク評価レポート作成
5. 詳細分析結果出力完了

## 🔗 依存関係
**前提条件**: TASK-001の完了待ち
**連携**: TASK-001の結果と照合して整合性確認

---
**重要**: 型安全性を保ちながらの統合戦略策定が最重要目標。