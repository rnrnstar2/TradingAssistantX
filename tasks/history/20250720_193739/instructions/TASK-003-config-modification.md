# TASK-003: 設定ファイル修正（プロジェクト名・不要設定削除）

## 🎯 タスク概要
TradingAssistantXリポジトリをXアカウント自動化システム専用に最適化するため、プロジェクト名変更と不要設定の削除を行う。

## 📋 修正対象ファイル

### 1. package.json
**修正内容**: プロジェクト名をXアカウント自動化システム専用に変更

**変更前**:
```json
{
  "name": "trading-assistant-x",
```

**変更後**:
```json
{
  "name": "x-account-automation-system",
```

### 2. turbo.json
**修正内容**: MetaTrader5関連の不要タスクを削除

**削除対象**:
```json
"dev:mt5": {
  "cache": false,
  "persistent": true,
  "dependsOn": ["^build"]
}
```

## 🚨 重要制約・注意事項

### MVP制約遵守
- **最小限の変更**: プロジェクト名変更と不要設定削除のみ
- **確実性優先**: 他の設定項目は一切変更しない
- **シンプル実装**: 複雑な検証や変換は不要

### 安全確認手順
1. **編集前バックアップ**: Readツールで現在の内容を確認
2. **TypeScript確認**: 変更後にTypeScriptエラーが発生しないか確認
3. **依存関係チェック**: 削除するdev:mt5タスクが他から参照されていないか確認

### 実行手順

#### Phase 1: package.json修正
```bash
# 1. 編集前確認
cat /Users/rnrnstar/github/TradingAssistantX/package.json | head -10

# 2. EditツールまたはMultiEditツールで名前変更実行
# "trading-assistant-x" → "x-account-automation-system"

# 3. 変更確認
cat /Users/rnrnstar/github/TradingAssistantX/package.json | head -10
```

#### Phase 2: turbo.json修正
```bash
# 1. 編集前確認
cat /Users/rnrnstar/github/TradingAssistantX/turbo.json

# 2. dev:mt5タスク削除
# EditツールでJSON形式を保ちながら削除

# 3. 変更確認
cat /Users/rnrnstar/github/TradingAssistantX/turbo.json

# 4. JSON構文確認
node -e "console.log('Valid JSON:', JSON.parse(require('fs').readFileSync('/Users/rnrnstar/github/TradingAssistantX/turbo.json', 'utf8')))"
```

#### Phase 3: 動作確認
```bash
# TypeScript確認
npm run check-types

# 設定ファイル確認
npm list --depth=0
```

## 📊 成功基準
- [ ] package.jsonのプロジェクト名が正しく変更されている
- [ ] turbo.jsonからdev:mt5タスクが削除されている
- [ ] JSON構文エラーが発生していない
- [ ] TypeScriptエラーが発生していない
- [ ] 他の設定項目に意図しない変更が発生していない

## 🔧 トラブルシューティング

### JSON構文エラーが発生した場合
```bash
# JSONの構文チェック
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('turbo.json', 'utf8'))"
```

### TypeScriptエラーが発生した場合
```bash
# 詳細エラー確認
npx tsc --noEmit --pretty
```

## 📝 報告書作成
作業完了後、以下を報告書に記載：
- 変更されたファイル一覧と変更内容
- 変更前後の設定値比較
- 動作確認結果（TypeScript, JSON構文チェック）
- 発生した問題とその解決方法（あれば）

## 🔗 他のタスクとの関係
- **並列実行可能**: TASK-001, TASK-002, TASK-004と同時実行可能
- **依存関係なし**: 他のタスクの完了を待つ必要なし

## 💡 追加最適化（時間に余裕がある場合のみ）
以下は必須ではないが、可能であれば実施：
- README.mdのプロジェクト名参照更新（存在する場合）
- CLAUDE.mdのプロジェクト名整合性確認