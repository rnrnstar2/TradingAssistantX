# コマンドリファレンス

## 🚀 起動・停止コマンド

### システム全体
```bash
# 全システム起動
pnpm run start:all

# 全システム停止
pnpm run stop:all

# 緊急停止
pnpm run emergency:stop
```

### 個別コンポーネント
```bash
# 成長システム
pnpm run start:growth-system
pnpm run stop:growth-system

# 情報収集システム
pnpm run start:collector
pnpm run stop:collector

# 投稿システム
pnpm run start:posting
pnpm run stop:posting

# Claude統合
pnpm run start:claude
pnpm run stop:claude
```

## 📊 監視・確認コマンド

### ステータス確認
```bash
# 全体状態
pnpm run status
pnpm run status:detailed

# 個別確認
pnpm run status:growth
pnpm run status:collector
pnpm run status:posting
pnpm run status:claude
```

### パフォーマンス監視
```bash
# 主要指標確認
pnpm run metrics:key-indicators

# パフォーマンスダッシュボード
pnpm run dashboard:performance
```

## 🔧 メンテナンスコマンド

### 定期メンテナンス
```bash
# 日次メンテナンス
pnpm run maintenance:daily

# 週次メンテナンス
pnpm run maintenance:weekly

# 月次メンテナンス
pnpm run maintenance:monthly
```

### データ管理
```bash
# バックアップ
pnpm run backup:daily
pnpm run backup:manual

# クリーンアップ
pnpm run cleanup:old-data
pnpm run cleanup:logs
```

## 🐛 トラブルシューティング

### 診断コマンド
```bash
# システム診断
pnpm run diagnose:system
pnpm run diagnose:detailed

# エラー確認
pnpm run check:errors
pnpm run analyze:error-trends
```

### 修復コマンド
```bash
# 自動修復
pnpm run fix:common-errors
pnpm run fix:auth-errors
pnpm run fix:posting-errors

# 設定リセット
pnpm run reset:config
pnpm run restore:default-config
```

## 📈 最適化コマンド

### 自動最適化
```bash
# 全体最適化
pnpm run optimize:auto

# 個別最適化
pnpm run optimize:posting-times
pnpm run optimize:content-strategy
pnpm run optimize:system-config
```

## 📝 レポート生成

### 定期レポート
```bash
# 日次レポート
pnpm run report:daily

# 週次レポート
pnpm run report:weekly

# 月次レポート
pnpm run report:monthly
```

---

**注意**: 各コマンドの詳細なオプションについては、`--help`フラグを使用してください。