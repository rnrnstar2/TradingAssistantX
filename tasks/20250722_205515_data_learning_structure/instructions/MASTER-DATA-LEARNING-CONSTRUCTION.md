# データ学習構造構築マスター指示書

## 🎯 目標
REQUIREMENTS.mdに基づく`data/learning/`ディレクトリ構造の完全構築と学習データ基盤の確立

## 📋 実行フェーズ

### Phase 1: ディレクトリ構造構築
- `data/learning/` ディレクトリ作成
- 必要な3つのYAMLファイル作成:
  - `success-patterns.yaml` - 成功パターン
  - `high-engagement.yaml` - 高エンゲージメント投稿
  - `effective-topics.yaml` - 効果的なトピック

### Phase 2: データスキーマ設計
- 各YAMLファイルの構造定義
- Claude Code SDK最適化を考慮したデータ形式
- 継続的学習に適したスキーマ設計

### Phase 3: 既存データ分析・移行
- `data/archives/`の分析データから有用情報抽出
- 成功投稿パターンの特定
- 高エンゲージメント要素の抽出

### Phase 4: 自動クレンジング機能設計
- 定期的データクレンジングロジック
- 古い・低価値データの自動削除
- 常に最適なデータセット維持

## 🚫 制約事項
- 既存ファイルの削除・変更禁止
- `data/archives/`データの保護
- REQUIREMENTS.md仕様からの逸脱禁止

## ✅ 成功基準
- data/learning/構造の完全構築
- 3つのYAMLファイルの適切な初期化
- 既存データからの学習知見抽出
- 自動クレンジング機能の基盤構築