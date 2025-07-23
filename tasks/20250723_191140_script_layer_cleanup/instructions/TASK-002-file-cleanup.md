# TASK-002: スクリプトファイルクリーンアップ

## 🎯 実装目標
scripts/ディレクトリから不要なバックアップファイルと初期化スクリプトを削除し、構造を簡素化

## 📋 削除対象ファイル

### 1. バックアップファイル（必須削除）
```
src/scripts/core-runner.ts.backup
```
**削除理由**: レガシーバックアップファイル、現在使用されていない

### 2. 初期化スクリプト（不要機能）
```
src/scripts/init-hierarchical-data.ts
```
**削除理由**: 
- MVP要件にない初期化機能（167行の過剰実装）
- 階層型データ管理は手動で十分
- REQUIREMENTS.mdに記載のない独自拡張

## 🚫 MVP制約遵守（過剰実装防止）
REQUIREMENTS.md記載の禁止事項：
- **自動ファイル管理機能**: 初期化スクリプトは過剰機能
- **構造検証機能**: データ制限検証などの複雑機能
- **要件定義外の機能**: リソース制限、自動管理機能

## ✅ 最終的なscripts/ディレクトリ構成
```
src/scripts/
├── dev.ts       # 単一実行用（保持）
└── main.ts      # ループ実行用（TASK-001で簡素化済み）
```

## 🔧 実装手順

### 1. ファイル存在確認
```bash
ls -la src/scripts/
```

### 2. バックアップファイル削除
```bash
rm src/scripts/core-runner.ts.backup
```

### 3. 初期化スクリプト削除
```bash
rm src/scripts/init-hierarchical-data.ts
```

### 4. 最終構造確認
```bash
ls -la src/scripts/
# 期待結果: dev.ts と main.ts のみ
```

### 5. 依存関係チェック
以下のファイルでinit-hierarchical-data.tsへの参照がないことを確認：
- package.json
- tsconfig.json
- 他のTypeScriptファイル

## 📝 出力管理
- **レポート出力先**: `tasks/20250723_191140_script_layer_cleanup/reports/REPORT-002-file-cleanup.md`
- **変更内容**: ファイル削除のみ、コード修正なし

## ⚠️ 制約・注意事項
1. **削除のみ実行**: 新ファイル作成や既存ファイル修正は禁止
2. **git追跡**: 削除されたファイルがgit管理下の場合、git statusで確認
3. **依存関係**: 削除ファイルが他から参照されていないことを必ず確認
4. **REQUIREMENTS.md遵守**: 要件定義にないファイルの削除は適切

## 🎯 完了基準
- [x] core-runner.ts.backupの完全削除
- [x] init-hierarchical-data.tsの完全削除
- [x] scripts/ディレクトリにdev.tsとmain.tsのみ残存
- [x] 依存関係チェック完了（他ファイルからの参照なし）
- [x] git statusで削除確認
- [x] レポート作成完了

## 🚨 緊急時対応
削除後に問題が発生した場合：
1. git logで削除前の状態を確認
2. git checkoutで必要に応じてファイル復元
3. ただし、要件定義外のファイルは復元不要