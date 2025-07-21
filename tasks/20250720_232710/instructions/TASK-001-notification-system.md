# TASK-001: osascript通知システム実装

## 📋 タスク概要

Claude Codeのタスク完了時に、osascriptを使用した通知と通知音システムを実装する。

## 🎯 実装要件

### 1. 基本機能
- **通知表示**: macOSのシステム通知でタスク完了を表示
- **通知音**: システム音での音声通知
- **タイミング**: Claude Code終了時のみ（途中作業では通知しない）

### 2. 技術仕様
- **使用技術**: osascript（AppleScript）
- **通知方式**: `display notification` コマンド
- **音声**: システムデフォルト音またはカスタム音
- **実装場所**: scripts/notifications/ ディレクトリ

### 3. 実装対象ファイル
```
scripts/notifications/
├── notify-completion.sh       # メイン通知スクリプト
├── sound-config.json         # 音設定ファイル（シンプル）
└── README.md                # 使用方法
```

## 🚫 MVP制約（重要）

### 禁止事項
- **複雑な設定システム** - 音の種類選択、カスタマイズ機能等
- **統計・履歴機能** - 通知回数、履歴記録等
- **複雑なエラーハンドリング** - リトライ機構、フォールバック等
- **将来の拡張準備** - プラグイン対応、設定可能パラメータ等

### 許可される実装
- **シンプルな通知表示**
- **基本的な音声再生**
- **最小限のエラー処理**（通知失敗時の silent fail程度）

## 🛠️ 実装詳細

### 1. notify-completion.sh
```bash
#!/bin/bash
# Claude Code タスク完了通知

# 基本通知
osascript -e 'display notification "Claude Codeのタスクが完了しました" with title "TradingAssistantX" sound name "Glass"'

# 成功時のみ実行（エラー時は silent fail）
```

### 2. sound-config.json
```json
{
  "enabled": true,
  "sound": "Glass",
  "title": "TradingAssistantX",
  "message": "Claude Codeのタスクが完了しました"
}
```

### 3. README.md
- 基本的な使用方法のみ記載
- 設定変更方法（音の変更程度）
- トラブルシューティング（権限エラー対応）

## 📂 出力管理規則

### 承認された出力先
- **scripts/notifications/** - メインスクリプト配置場所
- **tasks/20250720_232710/outputs/** - 作業用一時ファイル

### 命名規則
- **スクリプト**: notify-completion.sh
- **設定**: sound-config.json
- **ドキュメント**: README.md

### 🚫 禁止事項
- ルートディレクトリへの直接出力
- *-analysis.md, *-report.md のルート配置
- 一時ファイルの放置

## ✅ 品質基準

### 必須チェック
- [ ] osascriptコマンドの動作確認
- [ ] 権限エラーの対処
- [ ] ファイル構造の整理
- [ ] README.mdの動作確認

### TypeScript/Lint不要
- 今回はシェルスクリプトのため、TypeScript型チェック不要
- 基本的なShellCheck程度の確認

## 🔧 テスト方法

### 手動テスト
```bash
# 通知テスト
./scripts/notifications/notify-completion.sh

# 設定ファイル読み込みテスト
cat scripts/notifications/sound-config.json
```

### 動作確認ポイント
- 通知が表示されるか
- 音が鳴るか
- エラーが発生しないか

## 📋 完了報告要件

### 報告書作成先
`tasks/20250720_232710/reports/REPORT-001-notification-system.md`

### 報告内容
- 実装したファイル一覧
- 動作確認結果
- 発生した問題と対処法
- 使用方法の簡単な説明

## 🎯 価値提供

この実装により、Claude Codeユーザーは：
- タスク完了を即座に認識できる
- 他の作業中でも完了通知を受け取れる
- シンプルで信頼性の高い通知システムを利用できる

---

**重要**: MVPの精神に従い、「動作する最小限の機能」を最優先に実装してください。複雑さは価値を減少させます。