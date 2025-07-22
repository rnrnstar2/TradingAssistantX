# TASK-005: account-config.yaml実装

## 🎯 目的
調査・設計結果を基に、新しい`account-config.yaml`ファイルを実装する。

## 📋 前提条件
**必須**: TASK-004の完了

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_114539/outputs/TASK-004-new-structure-design.yaml`
- `tasks/20250721_114539/outputs/TASK-004-implementation-guide.md`

## 🏗️ 実装内容

### 1. バックアップ作成
既存ファイルの安全なバックアップ：

```bash
# バックアップディレクトリ作成
mkdir -p tasks/20250721_114539/outputs/backup

# 関連ファイルのバックアップ
cp data/account-info.yaml tasks/20250721_114539/outputs/backup/
cp data/growth-targets.yaml tasks/20250721_114539/outputs/backup/
```

### 2. account-config.yaml作成
設計書の仕様に従って新ファイル作成：

#### 基本構造
```yaml
# Account Configuration
# 統合: account-info.yaml + growth-targets.yaml
version: "1.0.0"
lastUpdated: [timestamp]

account:
  # account-info.yamlから移行
  username: "rnrnstar"
  user_id: ""
  display_name: ""
  verified: false

current_metrics:
  # account-info.yamlから移行
  followers_count: 0
  following_count: 0
  tweet_count: 0
  listed_count: 0
  last_updated: 0

growth_targets:
  # growth-targets.yamlから移行
  followers:
    current: 0
    daily: 2
    weekly: 14
    monthly: 60
    quarterly: 180
  engagement:
    likesPerPost: 5
    retweetsPerPost: 1
    repliesPerPost: 1
    engagementRate: 3
  reach:
    viewsPerPost: 50
    impressionsPerDay: 750

progress:
  # growth-targets.yamlから移行
  followersGrowth: 0
  engagementGrowth: 0
  reachGrowth: 0
  overallScore: 0
  trend: ontrack

history:
  # account-info.yamlから移行・改善
  metrics_history: []  # 過去のメトリクス履歴（直近10件）
```

### 3. データ値の正確な移行
既存ファイルから正確に値を移行：

- `data/account-info.yaml`の全フィールド
- `data/growth-targets.yaml`の全フィールド  
- タイムスタンプの適切な更新
- コメントの適切な移行

### 4. 型定義対応確認
新ファイルがTypeScript型定義と整合するか確認：

```bash
# 型チェック実行
npm run type-check 2>&1 | grep -i "account" || echo "型エラーなし"
```

## 📝 実装制約

### MVP原則遵守
- 現在使用されている機能のみ統合
- 新機能の追加は一切禁止
- シンプルな構造を維持

### データ整合性
- 既存データの完全保護
- タイムスタンプの適切な管理
- デフォルト値の一貫性

### ファイル品質
- 100行以下を目標
- 明確なコメント
- 論理的なセクション分け

## 📊 出力ファイル

### メインファイル
**場所**: `data/account-config.yaml`

### 実装レポート
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-005-account-config-report.yaml`

レポート内容：
```yaml
implementation_report:
  created_file: "data/account-config.yaml"
  source_files:
    - "data/account-info.yaml"
    - "data/growth-targets.yaml"
  migration_status:
    account_section: "completed"
    metrics_section: "completed"
    targets_section: "completed"
    history_section: "completed"
  file_size: "[行数]"
  validation:
    yaml_syntax: "valid"
    type_compatibility: "checked"
    data_integrity: "verified"
```

## ✅ 完了基準
1. account-config.yaml作成完了
2. 既存データの完全移行確認
3. YAML構文エラーなし
4. 型定義との整合性確認
5. バックアップ作成完了
6. 実装レポート作成完了

## 🔗 依存関係
**前提条件**: TASK-004完了必須
**並列実行**: TASK-006, TASK-007と同時実行可能
**後続**: TASK-008の入力データとして使用

---
**重要**: データ損失ゼロでの安全な統合が最優先目標。