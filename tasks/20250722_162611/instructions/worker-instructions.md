# Worker実行指示書

## 🎯 ミッション
TradingAssistantXコードベースを120+ → 30ファイルに大幅クリーンアップし、Claude Code SDK中心の洗練システムに変革する

## ⚡ 簡単実行方法

```bash
# 1. 権限設定して実行準備
chmod +x tasks/20250722_162611/instructions/cleanup-execution-script.sh

# 2. 自動クリーンアップ実行
./tasks/20250722_162611/instructions/cleanup-execution-script.sh
```

## 📋 実行内容
- **Phase 1**: 高優先度レガシー28ファイル削除
- **Phase 2**: 未使用サブディレクトリ群40+ファイル削除  
- **Phase 3**: 開発ツール・テスト関連ファイル削除
- **自動検証**: 各段階でシステム動作確認

## 🛡️ 安全対策
- ✅ 削除前の自動バックアップ
- ✅ 段階的実行で安全確認
- ✅ エラー時の自動停止
- ✅ TypeScript/動作検証

## 📊 期待効果
- **コードベース**: 75%削減による保守性向上
- **品質**: Claude Code SDK中心のクリーンシステム
- **性能**: ビルド時間・起動時間短縮

詳細計画: `codebase-cleanup-plan.md` 参照