# TASK-002: アービトラージ関連スクリプト削除作業

## 🎯 タスク概要
TradingAssistantXリポジトリをXアカウント自動化システム専用に整理するため、アービトラージ・トレーディング関連の不要スクリプトを削除する。

## 📋 削除対象ファイル
以下の3ファイルを**完全削除**してください：

### scripts/backend/ 配下（2ファイル）
1. `/Users/rnrnstar/github/TradingAssistantX/scripts/backend/sync-amplify-outputs.js`
2. `/Users/rnrnstar/github/TradingAssistantX/scripts/backend/sync-amplify-outputs.sh`

### scripts/ 配下（1ファイル）
3. `/Users/rnrnstar/github/TradingAssistantX/scripts/cleanup-data.sh`

## ⚠️ 削除理由
- **scripts/backend/**: Amplify-based hedge systemの設定同期スクリプト（アービトラージ特化）
- **cleanup-data.sh**: ArbitrageAssistantシステムの残骸（誤ったプロジェクトパス設定）

## 🚨 重要制約・注意事項

### MVP制約遵守
- **単純な削除作業のみ**: 複雑な移行や変換は不要
- **確実性優先**: ファイルの完全削除のみ実行
- **影響範囲最小化**: 他のスクリプトは一切変更しない

### 安全確認手順
1. **削除前確認**: 各ファイルがアービトラージ関連であることを再確認
2. **package.json確認**: これらのスクリプトがpackage.jsonから参照されていないことを確認
3. **実行可能性チェック**: 現在実行中のプロセスがないことを確認

### 実行手順
```bash
# 1. 削除前の状態確認
ls -la /Users/rnrnstar/github/TradingAssistantX/scripts/backend/
ls -la /Users/rnrnstar/github/TradingAssistantX/scripts/cleanup-data.sh

# 2. package.json参照チェック
grep -r "sync-amplify-outputs" /Users/rnrnstar/github/TradingAssistantX/package.json || echo "参照なし"
grep -r "cleanup-data" /Users/rnrnstar/github/TradingAssistantX/package.json || echo "参照なし"

# 3. ファイル削除実行
rm /Users/rnrnstar/github/TradingAssistantX/scripts/backend/sync-amplify-outputs.js
rm /Users/rnrnstar/github/TradingAssistantX/scripts/backend/sync-amplify-outputs.sh
rm /Users/rnrnstar/github/TradingAssistantX/scripts/cleanup-data.sh

# 4. 空ディレクトリ確認・削除（scripts/backendが空になった場合）
ls -la /Users/rnrnstar/github/TradingAssistantX/scripts/backend/
rmdir /Users/rnrnstar/github/TradingAssistantX/scripts/backend/ 2>/dev/null || echo "backend directory not empty"

# 5. 削除後の状態確認
ls -la /Users/rnrnstar/github/TradingAssistantX/scripts/

# 6. git状態確認
git status
```

## 📊 成功基準
- [ ] 3つのファイルが完全に削除されている
- [ ] scripts/backendディレクトリが空の場合は削除されている
- [ ] 他のスクリプトファイルに変更が発生していない
- [ ] git statusで削除ファイルが正しく検出されている
- [ ] エラーやwarningが発生していない

## 📝 報告書作成
作業完了後、以下を報告書に記載：
- 削除されたファイル一覧
- ディレクトリ構造の変更（scripts/backend削除有無）
- package.json参照チェック結果
- git status結果
- 発生した問題（あれば）

## 🔗 他のタスクとの関係
- **並列実行可能**: TASK-001, TASK-003, TASK-004と同時実行可能
- **依存関係なし**: 他のタスクの完了を待つ必要なし