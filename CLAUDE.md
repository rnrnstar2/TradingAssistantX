# TradingAssistantX

X（Twitter）投資教育コンテンツの価値創造システム

## 💡 **システムの本質**
**Claude Code SDK中心の完全自律システム**
- 🎯 **自律的テーマ決定**: Claudeが市場分析して最適テーマを決定
- 📊 **自律的データ収集**: 必要データを自動収集・分析
- ✍️ **自律的投稿作成**: Claude Code SDKが全意思決定を担当し最適投稿を生成
- 🔄 **継続的最適化**: 実行結果から学習し品質向上

**革新的中心技術**: Claude Code SDKによる意思決定の完全委託

## 🚨 **必須：権限確認**
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**権限確認完了まで作業開始禁止**

## 📋 **権限別行動**
- **Manager**: `docs/roles/manager-role.md` 読み込み必須
- **Worker**: `docs/roles/worker-role.md` 読み込み必須

## 🔒 **Manager権限制限**
**Manager権限**: プロダクションコード実装禁止・指示書作成例外
- ✅ 指示書作成・Worker統率（Writeツール例外許可）
- 🚫 プロダクションコード実装・編集は完全禁止
- 📋 **例外**: `tasks/{TIMESTAMP}/instructions/`配下の指示書作成のみWrite許可

## 🎯 **Claude自律原則**
- **状況判断**: 現在状況を分析し最適行動を自律決定
- **品質最優先**: 制限なし、妥協禁止
- **データ駆動**: `data/`配下YAML制御

## 🏗️ **疎結合設計原則 (重要)**
**データソース独立性と意思決定分岐の容易性確保**
- 🔗 **データソース疎結合**: 各収集源（RSS/API/Community）は完全独立動作
- 🧠 **意思決定分岐容易**: DecisionEngineで条件に応じた簡単な分岐実装
- 📊 **統一インターフェース**: CollectionResult型でデータ統合、ソース固有性保持
- ⚡ **動的戦略切替**: ActionSpecificCollectorによる動的データ収集戦略
- 🎛️ **設定駆動制御**: YAML設定によるソース選択・優先度制御

**実装アーキテクチャ**:
```
データソース層: RSS | API | Community (独立)
     ↓ (統一インターフェース)
収集制御層: ActionSpecificCollector (動的選択)
     ↓ (構造化データ)
意思決定層: DecisionEngine (条件分岐)
     ↓ (実行指示)
実行層: AutonomousExecutor (統合実行)
```

## 📂 **重要場所**
- **設定**: `data/` - YAML設定
- **実行**: `pnpm dev`
- **出力**: `tasks/outputs/` のみ許可

## 🚫 **絶対禁止**
- ルートディレクトリへの出力
- Manager権限での実装作業
- 品質妥協・固定プロセス強制

**詳細**: `docs/quick-guide.md` | **技術**: `docs/technical-docs.md`