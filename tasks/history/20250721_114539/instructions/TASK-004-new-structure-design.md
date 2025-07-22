# TASK-004: 新YAML構造設計

## 🎯 目的
Phase 1の調査結果を基に、最適化された新しいYAMLファイル構造を設計する。

## 📋 前提条件
**必須**: TASK-001, TASK-002, TASK-003の完了

## 🔍 入力ファイル
以下の調査結果を必ず読み込んで設計に反映：

1. `tasks/20250721_114539/outputs/TASK-001-yaml-usage-analysis.yaml`
2. `tasks/20250721_114539/outputs/TASK-002-type-analysis.yaml` 
3. `tasks/20250721_114539/outputs/TASK-003-system-reference-analysis.yaml`

## 📐 設計原則

### MVP制約適用
- 今すぐ必要な機能のみ
- ファイル数最小化（3-4ファイル）
- 明確な責任分離
- 重複完全排除

### 統合安全性
- 型安全性の保持
- 既存参照の保護
- 段階的移行の実現

## 🏗️ 設計内容

### 1. ファイル統合マトリックス作成
調査結果を基に最適な統合パターンを決定：

```yaml
integration_matrix:
  safe_merges:  # 安全に統合可能
    target_file: "account-config.yaml"
    source_files:
      - "account-info.yaml"
      - "growth-targets.yaml"
    risk_level: "low"
    dependencies: []
    
  complex_merges:  # 慎重な統合が必要
    target_file: "content-strategy.yaml"
    source_files:
      - "account-strategy.yaml" # 一部のみ
      - "content-patterns.yaml"
    risk_level: "high"
    dependencies: ["TypeScript型定義更新必須"]
```

### 2. 新ファイル構造定義
各新ファイルの責任範囲と構造：

```yaml
new_file_structure:
  account-config.yaml:
    responsibility: "アカウント基本設定とメトリクス"
    sections:
      - account_info
      - current_metrics
      - growth_targets
      - history
    estimated_size: "40行"
    
  content-strategy.yaml:
    responsibility: "コンテンツ戦略と投稿設定"
    sections:
      - content_themes
      - posting_schedule  
      - templates
      - engagement_tactics
    estimated_size: "80行"
    
  posting-data.yaml:
    responsibility: "実行データと履歴"
    sections:
      - posting_history
      - execution_results
    estimated_size: "20行"
    
  system-config.yaml:  # 必要時のみ
    responsibility: "システム設定"
    sections:
      - claude_integration
      - system_config
    estimated_size: "30行"
```

### 3. 移行計画策定
依存関係を考慮した段階的移行計画：

```yaml
migration_plan:
  phase1_preparation:
    - バックアップ作成
    - 新ファイル骨格作成
    - 型定義準備
    
  phase2_safe_migration:
    order: 1
    files: ["account-config.yaml", "posting-data.yaml"]
    parallel_execution: true
    
  phase3_complex_migration:
    order: 2
    files: ["content-strategy.yaml"]
    parallel_execution: false
    dependencies: ["phase2完了", "型定義更新"]
    
  phase4_cleanup:
    order: 3
    actions: ["旧ファイル削除", "参照更新", "最終確認"]
```

### 4. 型定義マッピング
新構造に対応した型定義変更計画：

```yaml
type_definition_changes:
  new_interfaces:
    AccountConfig:
      properties: ["accountInfo", "currentMetrics", "growthTargets"]
      file: "src/types/account-config.ts"
      
    ContentStrategy:
      properties: ["themes", "schedule", "templates"]  
      file: "src/types/content-strategy.ts"
      
  deprecated_interfaces:
    - "AccountInfo" # -> AccountConfig.accountInfo
    - "GrowthTargets" # -> AccountConfig.growthTargets
    - "ContentPatterns" # -> ContentStrategy.themes
    
  migration_mapping:
    AccountInfo: "AccountConfig['accountInfo']"
    GrowthTargets: "AccountConfig['growthTargets']"
```

## 📊 出力ファイル

### メイン設計書
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-004-new-structure-design.yaml`

### 実装ガイド
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-004-implementation-guide.md`

## 🎯 設計品質基準

### ファイル設計品質
- 各ファイル100行以下
- 明確な責任分離
- 論理的なデータグループ化

### 移行安全性
- 既存機能の完全保護
- 段階的移行の実現
- ロールバック可能性

### 型安全性
- TypeScriptエラーゼロ
- 既存コードとの互換性
- 将来の保守性

## ✅ 完了基準
1. 統合マトリックス作成完了
2. 新ファイル構造定義完了
3. 段階的移行計画策定完了
4. 型定義変更計画完了
5. 実装ガイド作成完了

## 🔗 依存関係
**前提条件**: TASK-001, TASK-002, TASK-003完了必須
**後続**: Phase 2実装Workerの指示書作成

---
**重要**: 調査結果の完全な反映と、実装Workerが迷わない明確な設計が目標。