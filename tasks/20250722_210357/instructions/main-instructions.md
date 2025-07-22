# dataディレクトリ リファクタリング指示書

## 🎯 ミッション概要
REQUIREMENTS.mdの理想的なdataディレクトリ構造を実現し、Claude Code SDKによる完全自律システムの基盤を構築する。

## 📋 現在の課題
- ファイルがルートレベルに散在
- 複雑すぎる subdirectory 構造
- REQUIREMENTS.mdの理想構造との乖離
- 月別アーカイブ構造の未実装

## 🏗️ 目標構造（REQUIREMENTS.mdより）
```
data/
├── config/                 # システム設定
│   ├── autonomous-config.yaml    # 自律実行設定
│   ├── posting-times.yaml       # 投稿時間設定
│   └── rss-sources.yaml         # RSSフィード設定
├── current/                # 現在の状態（常に最新・最小限）
│   ├── account-status.yaml      # アカウント状態
│   ├── active-strategy.yaml     # アクティブな戦略
│   └── today-posts.yaml         # 本日の投稿記録
├── learning/               # 学習データ（定期的にクレンジング）
│   ├── success-patterns.yaml    # 成功パターン
│   ├── high-engagement.yaml     # 高エンゲージメント投稿
│   └── effective-topics.yaml    # 効果的なトピック
└── archives/               # アーカイブ（古いデータは自動移動）
    └── 2024-01/                # 月別アーカイブ
```

## 🚀 実行戦略
**5つの並列タスク**で効率的にリファクタリングを実施

### タスク分割
1. **Worker 1**: config/ ディレクトリ最適化
2. **Worker 2**: current/ ディレクトリ正規化
3. **Worker 3**: learning/ ディレクトリ整理
4. **Worker 4**: archives/ 月別構造変換
5. **Worker 5**: ルートファイル整理・統合

## ⚠️ 重要な制約
- **データ損失厳禁**: すべてのデータは適切に保存・移動
- **構造統一**: REQUIREMENTS.mdの構造に完全準拠
- **最小限の原則**: current/は最小限のデータのみ
- **月別アーカイブ**: 古いデータは2025-07形式で整理

## 📊 成功指標
- [ ] REQUIREMENTS.md準拠の完璧な構造
- [ ] 不要ファイル・ディレクトリの削除
- [ ] データの適切な分類と配置
- [ ] 月別アーカイブの実装
- [ ] ファイルサイズ・数の最適化

## 🔄 実行順序
1. **Phase 1**: 並列タスク実行（Worker 1-5）
2. **Phase 2**: 統合確認・検証
3. **Phase 3**: 最終調整・クリーンアップ

---
**Manager**: データディレクトリ担当
**作成日時**: 2025-07-22 21:03:57