# Task: 未使用ファイルの削除とバックアップ作成

## 概要
srcディレクトリから未使用のファイルを削除し、削除前にバックアップを作成します。

## 削除対象ファイル

### 1. 未使用ファイル（完全削除）
- `/src/utils/optimization-metrics.ts` - 他のソースコードからimportされていない測定専用ユーティリティ
- `/src/scripts/test-api-connections.ts` - 開発時のAPIテスト用ツール、プロダクションコードで未使用

### 2. 統合予定ファイル（バックアップ後削除）
- `/src/utils/config-loader.ts` - core/app-config-manager.tsに統合予定

## 実装手順

### Step 1: バックアップディレクトリの作成
```bash
mkdir -p tasks/20250722_193030/backup/src-cleanup-phase1
```

### Step 2: 削除対象ファイルのバックアップ
以下のファイルをバックアップディレクトリにコピー：
- `optimization-metrics.ts`
- `test-api-connections.ts`
- `config-loader.ts`

### Step 3: ファイルの削除
1. 各ファイルを削除
2. gitステータスを確認して削除が反映されていることを確認

### Step 4: 削除確認レポートの作成
削除したファイルのリストと、各ファイルのサイズ情報を含むレポートを作成

## 品質基準
- バックアップが正しく作成されていること
- 削除後にビルドエラーが発生しないこと（pnpm run typecheck実行）
- git statusで削除が正しく反映されていること

## 出力
- バックアップファイル: `tasks/20250722_193030/backup/src-cleanup-phase1/`配下
- 削除確認レポート: `tasks/20250722_193030/outputs/phase1-deletion-report.md`

## 注意事項
- 削除前に必ずバックアップを作成すること
- 削除後はtypecheckを実行して、参照エラーがないことを確認すること
- 万が一、削除したファイルが必要だった場合はバックアップから復元可能