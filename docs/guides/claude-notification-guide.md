# Claude Code 通知システムガイド

## 概要

Claude Codeの通知システムは、作業の完了状態をユーザーに音付きで通知します。
途中の作業では通知せず、セッション終了時のみ通知することで、作業中の集中を妨げません。

## 通知タイミング

### 🔔 通知される場合
- Claude Codeを終了する時（`/exit`コマンド実行時）
- セッションが完全に終了する時
- ユーザーが明示的に通知を要求した時

### 🔕 通知されない場合
- ファイルの読み書き操作時
- 品質チェック（lint/typecheck）実行時
- 途中の作業完了時
- git操作時

## 通知音の種類

| 役割 | 通知音 | 用途 |
|------|--------|------|
| Manager | Glass | マネージャーのセッション終了 |
| Worker | Hero | ワーカーのセッション終了 |
| 未設定 | Ping | 一般的な終了通知 |

## 手動通知コマンド

必要に応じて、以下のコマンドで手動通知を送信できます：

```bash
# 基本的な通知（音なし）
osascript -e 'display notification "メッセージ" with title "タイトル"'

# 音付き通知
osascript -e 'display notification "メッセージ" with title "タイトル" sound name "Hero"'

# 利用可能な通知音
# Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink
```

## 設定のカスタマイズ

通知スクリプトは以下の場所にあります：
- `.claude/hooks/notify-on-exit.sh` - 終了時通知
- `.claude/hooks/session-complete-notify.sh` - セッション完了通知（拡張用）

必要に応じて、これらのスクリプトを編集してカスタマイズできます。