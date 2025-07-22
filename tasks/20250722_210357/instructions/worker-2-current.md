# Worker 2: current/ ディレクトリ正規化タスク

## 🎯 担当領域
`data/current/` ディレクトリの正規化と最小限データ原則の実装

## 📋 目標構造
```
data/current/
├── account-status.yaml      # アカウント状態
├── active-strategy.yaml     # アクティブな戦略
└── today-posts.yaml         # 本日の投稿記録
```

## 🚀 実行タスク

### Phase 1: 現在のcurrent/確認
1. 既存の`current/`ディレクトリ内容を分析
2. 各ファイルの役割と必要性を評価
3. REQUIREMENTS.mdの要求との適合性をチェック

### Phase 2: ファイル統合・正規化
1. **account-status.yaml**:
   - フォロワー数、エンゲージメント率など最新状態
   - Playwright分析結果の統合
   
2. **active-strategy.yaml**:
   - 現在アクティブな戦略設定
   - 意思決定エンジンが参照する戦略情報
   
3. **today-posts.yaml**:
   - 本日の投稿履歴（24時間で自動リセット）
   - 投稿時間、内容サマリー、エンゲージメント

### Phase 3: ルートレベルファイルの統合検討
以下ファイルを適切にcurrent/に統合：
- `current-situation.yaml`
- `account-strategy.yaml`
- `daily-action-data.yaml`
- `posting-data.yaml`

### Phase 4: 最小限データ原則の実装
- 不要な履歴データをarchives/に移動
- 常に最新の必要最小限データのみ保持
- ファイルサイズの最適化

## ✅ 完了条件
- [ ] 必要な3ファイルが正確に配置
- [ ] 各ファイルが最新・最小限の情報のみ含有
- [ ] ルートレベル関連ファイルの適切な統合
- [ ] 古いデータのarchives/への移動

## ⚠️ 注意事項
- **最小限の原則**: current/は常に軽量に保つ
- 24時間以上古いデータは自動的にアーカイブ対象
- アクティブな戦略情報は意思決定に直結するため慎重に扱う