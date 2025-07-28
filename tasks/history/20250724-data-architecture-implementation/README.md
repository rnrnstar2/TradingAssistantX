# 📋 TradingAssistantX データアーキテクチャ実装タスク

## 🎯 目的
src/dataディレクトリ実装を完璧にし、真のMVP最小構成を実現する

## 🏗️ 実装内容

### 1. MVP真の最小構成
```
src/data/
├── current/     # 現在実行サイクル（30分毎更新）
└── history/     # 過去実行アーカイブ
```

### 2. 除外したディレクトリ
- **config/** → 環境変数で管理（.envファイル）
- **context/** → current/で実行毎に管理
- **learning/** → MVP後の拡張として延期

### 3. 環境変数管理
```bash
# .env ファイル
KAITO_API_TOKEN=your-api-token
POSTS_PER_HOUR=10
RETWEETS_PER_HOUR=20
LIKES_PER_HOUR=50
CLAUDE_MODEL=claude-3-sonnet
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7
```

## 📂 ドキュメント

1. **REQUIREMENTS.md** - 更新済み要件定義
2. **worker-instructions.md** - Worker実装指示書
3. **env-migration-guide.md** - 環境変数移行ガイド

## ✅ 実装チェックリスト

- [x] REQUIREMENTS.md更新（真の最小構成）
- [x] Worker実装指示書作成
- [x] 環境変数移行ガイド作成
- [ ] DataManager実装（current/history対応）
- [ ] 既存ディレクトリ削除（config/context/learning）
- [ ] テスト実施

## 🚀 次のステップ

1. Worker権限で実装実施
2. 環境変数設定（.envファイル作成）
3. 既存データのバックアップ
4. 新ディレクトリ構造での動作確認

## 💡 メリット

- **シンプル**: ディレクトリ2つのみ
- **明確**: 役割が明確（実行中/アーカイブ）
- **軽量**: 設定ファイル管理不要
- **セキュア**: APIトークンは環境変数管理

## ⚠️ 注意事項

- .envファイルはGitにコミットしない
- 既存データは必ずバックアップ
- loadConfig()等のメソッドは環境変数から読み込むよう変更が必要