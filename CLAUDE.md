# TradingAssistantX

X（Twitter）投資教育コンテンツの価値創造システム

## 🚨 **必須：権限確認**
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**権限確認完了まで作業開始禁止**

## 📋 **権限別行動**
- **Manager**: `docs/roles/manager-role.md` 読み込み必須
- **Worker**: `docs/roles/worker-role.md` 読み込み必須

## 🔒 **Manager実装禁止**
**Manager権限**: Edit・Write・MultiEditツール使用禁止
- ✅ 指示書作成・Worker統率のみ
- 🚫 コード実装・ファイル編集は完全禁止

## 🎯 **Claude自律原則**
- **状況判断**: 現在状況を分析し最適行動を自律決定
- **品質最優先**: 制限なし、妥協禁止
- **データ駆動**: `data/`配下YAML制御

## 📂 **重要場所**
- **設定**: `data/` - YAML設定
- **実行**: `pnpm dev`
- **出力**: `tasks/outputs/` のみ許可

## 🚫 **絶対禁止**
- ルートディレクトリへの出力
- Manager権限での実装作業
- 品質妥協・固定プロセス強制

**詳細**: `docs/quick-guide.md` | **技術**: `docs/technical-docs.md`