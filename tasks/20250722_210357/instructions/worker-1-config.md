# Worker 1: config/ ディレクトリ最適化タスク

## 🎯 担当領域
`data/config/` ディレクトリの完全最適化とREQUIREMENTS.md準拠

## 📋 現在の状況
```
data/config/
├── autonomous-config.yaml    # 既存
├── posting-times.yaml       # 既存
└── rss-sources.yaml         # 既存
```

## 🚀 実行タスク

### Phase 1: 既存config/の確認・検証
1. 既存3ファイルの内容を確認
2. REQUIREMENTS.mdの要求との適合性をチェック
3. 不足している設定項目を特定

### Phase 2: 統合・最適化
1. **autonomous-config.yaml**: 
   - 1日15回実行設定の確認
   - 意思決定エンジン設定の検証
2. **posting-times.yaml**: 
   - 最適投稿時間の設定確認
   - 朝7-8時、昼12時、夕方18-19時、夜21-23時設定
3. **rss-sources.yaml**: 
   - 主要金融メディアRSSフィード設定
   - MVP用RSS Collector設定最適化

### Phase 3: ルートレベル設定ファイル統合
以下のルートレベルファイルをconfig/に統合検討：
- `autonomous-config.yaml` (重複チェック)
- `mvp-config.yaml`
- `multi-source-config.yaml`
- `account-config.yaml`

## ✅ 完了条件
- [ ] 必要な3ファイルが正確に配置
- [ ] REQUIREMENTS.md完全準拠の設定内容
- [ ] ルートレベル設定ファイルの適切な統合
- [ ] 重複ファイルの削除

## ⚠️ 注意事項
- データ損失を避けるため、統合前にバックアップ確認
- 既存機能に影響しない設定変更
- MVP要件（RSS Collector中心）の維持