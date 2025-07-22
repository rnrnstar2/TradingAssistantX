# Worker 3: learning/ ディレクトリ整理タスク

## 🎯 担当領域
`data/learning/` ディレクトリの学習データ最適化と品質向上

## 📋 目標構造
```
data/learning/
├── success-patterns.yaml    # 成功パターン
├── high-engagement.yaml     # 高エンゲージメント投稿
└── effective-topics.yaml    # 効果的なトピック
```

## 🚀 実行タスク

### Phase 1: 既存learning/の分析
1. 現在の`learning/`ディレクトリの確認
2. データ品質と関連性の評価
3. Claude Code SDK自律学習に最適なデータ形式の検証

### Phase 2: ファイル統合・データクレンジング
1. **success-patterns.yaml**:
   - 高パフォーマンス投稿のパターン分析
   - 投稿時間、内容タイプ、エンゲージメント相関
   - 戦略的成功要因の体系化

2. **high-engagement.yaml**:
   - エンゲージメント率3%以上の投稿データ
   - ユーザー反応の良いコンテンツ特徴
   - リプライ・リツイート・いいねの分析

3. **effective-topics.yaml**:
   - 投資教育で反響の大きいトピック
   - 季節性・市場状況との相関
   - 初心者向け vs 中級者向けトピックの効果比較

### Phase 3: データクレンジング
- 古い・低品質なデータの除去（定期的クレンジング）
- 重複データの統合
- Claude Code SDKの意思決定に不要なデータの削除

### Phase 4: ルートレベルファイルの統合
以下ファイルを適切にlearning/に統合：
- `metrics-history.yaml`
- `posting-history.yaml`
- `growth-targets.yaml`
- `content-strategy.yaml`

## ✅ 完了条件
- [ ] 必要な3ファイルが高品質データで構成
- [ ] 古い・不要なデータのクレンジング完了
- [ ] Claude Code SDK学習に最適化されたデータ形式
- [ ] ルートレベル学習関連ファイルの統合

## ⚠️ 注意事項
- **品質重視**: 量より質、Claude学習に最適なデータのみ保持
- **継続学習**: 新しいパターンを容易に追加できる構造
- **データ鮮度**: 3ヶ月以上古いデータは効果検証後archives/に移動検討