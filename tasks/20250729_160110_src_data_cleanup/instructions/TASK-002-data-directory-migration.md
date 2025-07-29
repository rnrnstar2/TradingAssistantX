# TASK-002: src/dataディレクトリのデータ移動とクリーンアップ

## 🎯 タスク概要

`src/data/`配下のデータディレクトリ（context/, current/, history/, learning/）をルートレベル`/data/`に移動し、重複データを統合・整理する。

## 📋 事前確認必須

### REQUIREMENTS.md必読
```bash
cat REQUIREMENTS.md
```
**注意**: REQUIREMENTS.mdの内容を完全に理解してから作業開始すること

### 権限確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**Worker権限であることを確認後、作業開始許可**

## 🔧 実装手順

### 1. 現状把握・バックアップ作成

```bash
# 現在の構造確認
ls -la src/data/
ls -la data/

# バックアップ作成
cp -r src/data/ tasks/20250729_160110_src_data_cleanup/outputs/src-data-backup/
cp -r data/ tasks/20250729_160110_src_data_cleanup/outputs/root-data-backup/
```

### 2. データディレクトリの統合移動

#### 2.1 context/ディレクトリの処理

```bash
# src/data/context/ → data/context/ への統合
# 既存のdata/context/がある場合は内容を比較して統合
if [ -d "data/context" ]; then
  # 重複確認して統合
  cp -n src/data/context/* data/context/ 2>/dev/null || true
else
  # 新規移動
  mv src/data/context/ data/
fi
```

#### 2.2 current/ディレクトリの処理

```bash
# src/data/current/ → data/current/ への統合
# 実行履歴データの重複排除と統合
if [ -d "data/current" ]; then
  # 重複する実行ディレクトリがないかチェックして統合
  for dir in src/data/current/*/; do
    dirname=$(basename "$dir")
    if [ ! -d "data/current/$dirname" ]; then
      mv "$dir" data/current/
    fi
  done
  # active-session.yamlの統合（新しい方を採用）
  if [ -f "src/data/current/active-session.yaml" ]; then
    mv src/data/current/active-session.yaml data/current/
  fi
else
  # 新規移動
  mv src/data/current/ data/
fi
```

#### 2.3 history/ディレクトリの処理

```bash
# src/data/history/ → data/history/ への統合
if [ -d "data/history" ]; then
  # 月別フォルダを統合
  for monthdir in src/data/history/*/; do
    monthname=$(basename "$monthdir")
    if [ -d "data/history/$monthname" ]; then
      # 日時別フォルダを統合
      for daydir in "$monthdir"*/; do
        dayname=$(basename "$daydir")
        if [ ! -d "data/history/$monthname/$dayname" ]; then
          mv "$daydir" "data/history/$monthname/"
        fi
      done
    else
      mv "$monthdir" data/history/
    fi
  done
else
  # 新規移動
  mv src/data/history/ data/
fi
```

#### 2.4 learning/ディレクトリの処理

```bash
# src/data/learning/ → data/learning/ への統合
if [ -d "data/learning" ]; then
  # 学習データファイルの統合（新しい方を採用）
  cp src/data/learning/* data/learning/ 2>/dev/null || true
else
  # 新規移動
  mv src/data/learning/ data/
fi
```

### 3. src/dataディレクトリのクリーンアップ

```bash
# data-manager.tsが移動済みであることを確認
if [ ! -f "src/data/data-manager.ts" ]; then
  # src/dataディレクトリが空の場合は削除
  if [ -d "src/data" ] && [ -z "$(ls -A src/data)" ]; then
    rmdir src/data/
  fi
fi
```

### 4. データ整合性確認

```bash
# 移動後のデータ構造確認
echo "=== Root /data/ structure ==="
tree data/ || ls -la data/

# サイズ制限チェック
du -sh data/current/  # 1MB制限確認
du -sh data/learning/ # 10MB制限確認

# 必須ファイルの存在確認
ls -la data/config/system.yaml
ls -la data/config/schedule.yaml
ls -la data/current/active-session.yaml
```

### 5. アクセス権限確認

```bash
# data-manager.tsがルートレベル/data/にアクセスできることを確認
# （TASK-001完了後に実施）
```

## 🚫 制約事項

### MVP制約遵守
- データの統合のみ実施、新機能追加禁止
- 既存データの内容変更禁止
- シンプルな移動・統合のみ

### データ保護
- 重要なデータの損失防止
- バックアップ必須
- 重複データの適切な処理

### 品質基準
- データ整合性維持
- ファイル構造の一貫性
- アクセス権限の適切性

## 📊 完了基準

- [ ] src/data/配下の全データディレクトリ移動完了
- [ ] ルートレベル/data/での統合完了
- [ ] 重複データの適切な処理完了
- [ ] src/dataディレクトリのクリーンアップ完了
- [ ] データ整合性確認完了
- [ ] サイズ制限遵守確認完了

## 🚨 出力管理厳守

### 📂 出力先指定
- **報告書**: `tasks/20250729_160110_src_data_cleanup/reports/REPORT-002-data-directory-migration.md`
- **バックアップ**: `tasks/20250729_160110_src_data_cleanup/outputs/`配下
- **一時ファイル**: `tasks/20250729_160110_src_data_cleanup/outputs/`配下のみ
- **🚫 ルートディレクトリ直接出力禁止**

### 📋 報告書必須項目
1. 移動したデータディレクトリの完全リスト
2. 統合処理の詳細（重複データの処理方法含む）
3. データ整合性確認結果
4. サイズ制限チェック結果
5. 発生した問題と解決方法
6. 移動前後のディレクトリ構造比較

## ⚠️ 注意事項

### データ損失防止
- 必ずバックアップを作成してから作業開始
- 重複データがある場合は新しい方を優先
- 不明なデータがある場合は作業を停止して確認

### 実行順序
- このタスクはTASK-001と並列実行可能
- data-manager.tsの移動とは独立している

### エラー時対応
- データ損失が発生した場合は即座にバックアップから復旧
- 問題が発生した場合は作業を停止して報告

---

**重要**: このタスクは並列実行可能です。TASK-001と同時に作業できますが、データの安全性を最優先してください。