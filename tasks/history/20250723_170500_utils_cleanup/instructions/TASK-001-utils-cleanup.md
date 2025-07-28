# TASK-001: Utilsディレクトリクリーンアップ

## 目的
REQUIREMENTS.mdのMVP原則に基づき、不要なユーティリティファイルを削除し、ディレクトリを整理する

## 前提条件
- Worker 1による依存関係分析（TASK-002）が完了していること
- REPORT-002-dependency-analysis.mdを確認済みであること

## 作業内容

### 1. 削除対象ファイルの確認
以下のファイルが削除対象です：
```
src/utils/error-handler.ts
src/utils/yaml-manager.ts
src/utils/yaml-utils.ts
src/utils/monitoring/health-check.ts
src/utils/monitoring/resource-monitor.ts
```

### 2. バックアップの作成
削除前に、念のためバックアップを作成してください：
```bash
# バックアップディレクトリを作成
mkdir -p tasks/20250723_170500_utils_cleanup/backup

# 削除対象ファイルをバックアップ
cp src/utils/error-handler.ts tasks/20250723_170500_utils_cleanup/backup/ 2>/dev/null || true
cp src/utils/yaml-manager.ts tasks/20250723_170500_utils_cleanup/backup/ 2>/dev/null || true
cp src/utils/yaml-utils.ts tasks/20250723_170500_utils_cleanup/backup/ 2>/dev/null || true
cp src/utils/monitoring/health-check.ts tasks/20250723_170500_utils_cleanup/backup/ 2>/dev/null || true
cp src/utils/monitoring/resource-monitor.ts tasks/20250723_170500_utils_cleanup/backup/ 2>/dev/null || true
```

### 3. ファイルの削除
以下のコマンドで不要ファイルを削除してください：
```bash
# ファイルを削除
rm -f src/utils/error-handler.ts
rm -f src/utils/yaml-manager.ts
rm -f src/utils/yaml-utils.ts
rm -f src/utils/monitoring/health-check.ts
rm -f src/utils/monitoring/resource-monitor.ts

# 空のmonitoringディレクトリを削除
rmdir src/utils/monitoring 2>/dev/null || true
```

### 4. 削除後の確認
削除が正しく行われたことを確認してください：
```bash
# utils/ディレクトリの現在の状態を確認
ls -la src/utils/

# 残るべきファイルのみが存在することを確認
# - logger.ts
# - integrity-checker.ts
# - file-size-monitor.ts
# - context-compressor.ts
# - type-guards.ts
# - maintenance/ディレクトリ（必要に応じて）
```

### 5. 報告書の作成
作業完了後、以下の内容を含む報告書を作成してください：
- 削除したファイルのリスト
- バックアップの保存場所
- utils/ディレクトリの最終状態
- 次のステップへの準備状況

報告書は `tasks/20250723_170500_utils_cleanup/reports/REPORT-001-utils-cleanup.md` に保存してください。

## 注意事項
- 削除前に必ずバックアップを取ること
- REQUIREMENTS.mdに記載されている必須ファイルは絶対に削除しないこと
- 削除後、依存関係のあるファイルでビルドエラーが発生することが予想されます（TASK-003で対応）