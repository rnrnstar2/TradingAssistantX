# TASK-001: アービトラージ関連ドキュメント削除作業

## 🎯 タスク概要
TradingAssistantXリポジトリをXアカウント自動化システム専用に整理するため、アービトラージ・トレーディング関連の不要ドキュメントを削除する。

## 📋 削除対象ファイル
以下の6ファイルを**完全削除**してください：

### docs/requirements/ 配下（4ファイル）
1. `/Users/rnrnstar/github/TradingAssistantX/docs/requirements/position-action-execution.md`
2. `/Users/rnrnstar/github/TradingAssistantX/docs/requirements/realtime-architecture.md`
3. `/Users/rnrnstar/github/TradingAssistantX/docs/requirements/functional-requirements.md`
4. `/Users/rnrnstar/github/TradingAssistantX/docs/requirements/system-overview.md`

### docs/common/ 配下（2ファイル）
5. `/Users/rnrnstar/github/TradingAssistantX/docs/common/system-constants.md`
6. `/Users/rnrnstar/github/TradingAssistantX/docs/common/performance-standards.md`

## ⚠️ 削除理由
これらのファイルは全てアービトラージ取引システムに特化した設計書・仕様書であり、Xアカウント自動化システムには不要。

## 🚨 重要制約・注意事項

### MVP制約遵守
- **単純な削除作業のみ**: 複雑な移行や変換は不要
- **確実性優先**: ファイルの完全削除のみ実行
- **影響範囲最小化**: 他のファイルは一切変更しない

### 安全確認手順
1. **削除前確認**: 各ファイルが確実にアービトラージ関連であることを再確認
2. **依存関係チェック**: 他のファイルからimport/includeされていないことを確認
3. **バックアップ不要**: git管理下なので復元可能

### 実行手順
```bash
# 1. 削除前の状態確認
ls -la /Users/rnrnstar/github/TradingAssistantX/docs/requirements/
ls -la /Users/rnrnstar/github/TradingAssistantX/docs/common/

# 2. ファイル削除実行
rm /Users/rnrnstar/github/TradingAssistantX/docs/requirements/position-action-execution.md
rm /Users/rnrnstar/github/TradingAssistantX/docs/requirements/realtime-architecture.md
rm /Users/rnrnstar/github/TradingAssistantX/docs/requirements/functional-requirements.md
rm /Users/rnrnstar/github/TradingAssistantX/docs/requirements/system-overview.md
rm /Users/rnrnstar/github/TradingAssistantX/docs/common/system-constants.md
rm /Users/rnrnstar/github/TradingAssistantX/docs/common/performance-standards.md

# 3. 削除後の状態確認
ls -la /Users/rnrnstar/github/TradingAssistantX/docs/requirements/
ls -la /Users/rnrnstar/github/TradingAssistantX/docs/common/

# 4. git状態確認
git status
```

## 📊 成功基準
- [ ] 6つのファイルが完全に削除されている
- [ ] 他のファイルに変更が発生していない
- [ ] git statusで削除ファイルが正しく検出されている
- [ ] エラーやwarningが発生していない

## 📝 報告書作成
作業完了後、以下を報告書に記載：
- 削除されたファイル一覧
- 削除前後のディレクトリ状態
- git status結果
- 発生した問題（あれば）

## 🔗 他のタスクとの関係
- **並列実行可能**: TASK-002, TASK-003, TASK-004と同時実行可能
- **依存関係なし**: 他のタスクの完了を待つ必要なし