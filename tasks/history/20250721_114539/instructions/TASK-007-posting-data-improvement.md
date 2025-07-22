# TASK-007: posting-data.yaml改善

## 🎯 目的
既存の`posting-history.yaml`を改善し、実用的な`posting-data.yaml`として再構築する。

## 📋 前提条件
**必須**: TASK-004の完了

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_114539/outputs/TASK-004-new-structure-design.yaml`
- `tasks/20250721_114539/outputs/TASK-004-implementation-guide.md`

## 🏗️ 実装内容

### 1. 現状確認とバックアップ
既存ファイルの状況確認：

```bash
# 現在の投稿履歴確認
cat data/posting-history.yaml

# バックアップ作成
cp data/posting-history.yaml tasks/20250721_114539/outputs/backup/
```

### 2. posting-data.yaml作成
設計書の仕様に従って新ファイル作成：

#### 基本構造
```yaml
# Posting Data Management
# 改善: posting-history.yaml → posting-data.yaml
version: "1.0.0"
lastUpdated: [timestamp]

posting_history:
  # 既存データの移行（構造改善）
  - id: "1753065937936"
    content: "..."
    timestamp: 1753065937936
    success: false
    error: "X API error: 403 - Authenticating with OAuth 2.0..."
    
execution_summary:
  # 実行サマリー（MVPレベル）
  total_posts: 1
  successful_posts: 0
  failed_posts: 1
  last_execution: 1753065937936
  
current_status:
  # 現在の状態
  is_running: false
  last_error: "OAuth 2.0 Authentication required"
  next_scheduled: null
  
# 注意: 統計・分析機能は追加しない（MVP制約）
```

### 3. データ構造改善
既存の投稿履歴データを改善された構造に移行：

#### 改善点
- **明確なセクション分離**: 履歴、サマリー、状態を分離
- **エラー情報の構造化**: エラーの詳細を適切に格納
- **タイムスタンプの一貫性**: 全て同じ形式で管理
- **必要最小限のフィールド**: 使用しないフィールドは削除

#### データ移行ルール
```yaml
migration_rules:
  posting_history:
    - 既存データの完全保護
    - エラー情報の適切な構造化
    - 不要フィールドの削除
    
  execution_summary:
    - 基本的な集計のみ（統計機能禁止）
    - 現在の状況把握に必要な最小限の情報
    
  current_status:
    - システムの現在状態
    - 次回実行予定（単純な情報のみ）
```

### 4. MVP制約の厳格適用
以下の機能は絶対に追加しない：

```yaml
prohibited_features:
  statistics:
    - 成功率計算
    - パフォーマンス分析
    - 時系列分析
    
  analytics:
    - エンゲージメント分析
    - トレンド分析
    - 効果測定
    
  complex_features:
    - 自動リトライ管理
    - 高度なエラーハンドリング
    - 予測機能
```

### 5. ファイル品質確認
```bash
# YAML構文チェック
python -c "import yaml; yaml.safe_load(open('data/posting-data.yaml'))" || echo "YAML構文エラー"

# ファイルサイズ確認
wc -l data/posting-data.yaml
```

## 📝 実装制約

### MVP原則遵守
- 現在必要な機能のみ実装
- 分析・統計機能は一切追加しない
- シンプルな構造を維持

### データ整合性
- 既存投稿データの完全保護
- タイムスタンプの一貫性
- エラー情報の適切な管理

### ファイル品質
- 50行以下を目標
- 明確なコメント
- 論理的なセクション分け

## 📊 出力ファイル

### メインファイル
**場所**: `data/posting-data.yaml`

### 実装レポート
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-007-posting-data-report.yaml`

レポート内容：
```yaml
implementation_report:
  created_file: "data/posting-data.yaml"
  source_files:
    - "data/posting-history.yaml"
  improvements:
    structure: "セクション分離による明確化"
    error_handling: "エラー情報の構造化"
    data_consistency: "タイムスタンプ形式統一"
  data_migration:
    preserved_records: "[既存レコード数]"
    data_loss: "none"
    format_improvements: "implemented"
  file_size: "[行数]"
  validation:
    yaml_syntax: "valid"
    mvp_compliance: "verified"
    data_integrity: "verified"
```

## ✅ 完了基準
1. posting-data.yaml作成完了
2. 既存データの完全移行確認
3. 構造改善の実装完了
4. 50行以下の達成
5. YAML構文エラーなし
6. MVP制約の遵守確認
7. 実装レポート作成完了

## 🔗 依存関係
**前提条件**: TASK-004完了必須
**並列実行**: TASK-005, TASK-006と同時実行可能
**後続**: TASK-008の入力データとして使用

---
**重要**: 既存データの完全保護と構造の明確化が最重要目標。