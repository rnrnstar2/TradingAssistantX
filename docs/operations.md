# X システム運用・監視・トラブルシューティング

## 📋 日常運用手順

### システム起動・停止

```bash
# システム起動
pnpm run start:all                 # 全システム起動
pnpm run start:growth-system       # 成長システム
pnpm run start:collector           # 情報収集
pnpm run start:posting             # 投稿システム

# システム停止
pnpm run stop:all                  # 全システム停止
pnpm run stop:growth-system        # 成長システム停止
pnpm run stop:collector            # 情報収集停止
pnpm run stop:posting              # 投稿システム停止
```

### ステータス確認

```bash
# システム全体状態確認
pnpm run status:all

# 出力例
# X System Status Report
# ======================
# ✅ Growth System Manager: Active
# ✅ Autonomous Collector: Running
# ✅ Claude Integration: Connected
# ✅ Posting Manager: Active
# ⚠️  API Rate Limits: 80% used
# 📊 Today's Posts: 12/15
# 📈 Success Rate: 95%

# 個別システム状態確認
pnpm run status:growth-system      # 成長システム
pnpm run status:collector          # 情報収集
pnpm run status:posting            # 投稿システム
pnpm run status:claude             # Claude統合
```

## 🔍 監視ポイント

### 重要指標（投稿頻度: 15回/日）

```yaml
# 監視すべき指標
daily_post_count: 15              # 日次投稿数目標
post_success_rate: 95             # 投稿成功率目標（%）
average_quality_score: 7.5        # 平均品質スコア目標
system_uptime: 99                 # システム稼働率目標（%）
api_response_time: 30             # API応答時間目標（秒）
error_rate: 5                     # エラー率上限（%）
```

### 監視コマンド

```bash
# 重要指標確認
pnpm run check:metrics             # 全指標確認
pnpm run check:post-count          # 投稿数確認
pnpm run check:quality-score       # 品質スコア確認
pnpm run check:api-usage           # API使用量確認
pnpm run check:error-rate          # エラー率確認

# エラー監視
pnpm run check:errors              # エラー状況確認
pnpm run check:logs                # ログ確認
pnpm run check:system-health       # システムヘルス確認
```

## 🔧 メンテナンス手順

### 日次メンテナンス

```bash
# 日次チェックリスト
pnpm run daily:check               # 日次チェック実行
pnpm run daily:report              # 日次レポート生成
pnpm run daily:cleanup             # 日次クリーンアップ

# 手動確認項目
# - [ ] 投稿数確認（15回/日）
# - [ ] 品質スコア確認（7.5以上）
# - [ ] エラー率確認（5%以下）
# - [ ] API使用量確認（90%以下）
```

### 週次メンテナンス

```bash
# 週次チェックリスト
pnpm run weekly:check              # 週次チェック実行
pnpm run weekly:report             # 週次レポート生成
pnpm run weekly:optimization       # 週次最適化実行

# 手動確認項目
# - [ ] 成長目標達成度確認
# - [ ] コンテンツパフォーマンス分析
# - [ ] システムパフォーマンス分析
# - [ ] データ整合性確認
```

### 月次メンテナンス

```bash
# 月次チェックリスト
pnpm run monthly:check             # 月次チェック実行
pnpm run monthly:report            # 月次レポート生成
pnpm run monthly:backup            # 月次バックアップ実行

# 手動確認項目
# - [ ] 目標値調整
# - [ ] システム最適化
# - [ ] 品質基準見直し
# - [ ] コスト分析
```

## 🚨 トラブルシューティング

### API認証エラー

```bash
# Claude Code SDK認証エラー
claude auth status                 # 認証状態確認
claude auth login                  # 再認証実行
pnpm run fix:claude-auth           # 認証修復

# X API認証エラー
echo $X_API_KEY                    # 環境変数確認
echo $X_API_SECRET
pnpm run setup:x-auth              # 認証情報再設定
pnpm run test:x-auth               # 認証テスト

# 環境変数再設定
export ANTHROPIC_API_KEY="your_key_here"
export X_API_KEY="your_x_key_here"
export X_API_SECRET="your_x_secret_here"
```

### 投稿失敗

```bash
# レート制限超過
pnpm run check:api-usage           # API使用量確認
pnpm run wait:rate-limit           # 制限解除待機
pnpm run config:posting-interval --minutes=120  # 投稿間隔調整

# 重複コンテンツ
pnpm run check:duplicate-content   # 重複確認
pnpm run fix:duplicate-content     # 重複解消
pnpm run clean:content-cache       # コンテンツキャッシュクリア

# 品質スコア低下
pnpm run check:quality-score       # 品質スコア確認
pnpm run config:quality-threshold --score=6.5  # 品質閾値調整
pnpm run suggest:quality-improvements  # 品質改善提案
```

### スケジュール問題

```bash
# スケジュール実行未実行
pnpm run check:schedule-status     # スケジュール状態確認
pnpm run execute:immediate-posts   # 即時投稿手動実行
pnpm run restart:scheduler         # スケジューラー再起動

# 投稿時間のずれ
date                               # システム時刻確認
pnpm run check:system-time         # システム時刻確認
pnpm run check:timezone            # タイムゾーン設定確認
pnpm run sync:time                 # 時刻同期

# スケジュール重複
pnpm run check:schedule-conflicts  # 重複確認
pnpm run fix:schedule-conflicts    # 重複解消
pnpm run rebuild:schedule          # スケジュール再構築
```

### 情報収集エラー

```bash
# Playwright接続エラー
npx playwright --version           # Playwright状態確認
npx playwright install chromium    # ブラウザ再インストール
pnpm run test:playwright-connection # 接続テスト

# 収集データが空
cat data/account-strategy.yaml      # 統合されたシステム設定確認
pnpm run test:collection           # 収集テスト実行
pnpm run config:collection-strategy --strategy=keywords  # 収集戦略変更

# 品質評価失敗
pnpm run test:quality-assessment   # 品質評価テスト
pnpm run config:quality-threshold --threshold=0.5  # 評価閾値調整
pnpm run check:quality-logic       # 評価ロジック確認
```

## 📊 診断・ログ確認

### ログファイル確認

```bash
# 主要ログファイル
tail -f logs/system.log            # システム全般ログ
tail -f logs/posting.log           # 投稿システムログ
tail -f logs/collector.log         # 収集システムログ
tail -f logs/claude.log            # Claude統合ログ

# ログレベル別確認
pnpm run logs:error                # エラーログ表示
pnpm run logs:warning              # 警告ログ表示
pnpm run logs:info                 # 情報ログ表示
```

### システム診断

```bash
# システム診断実行
pnpm run diagnose:system

# 診断結果例
# System Diagnosis Report
# =======================
# ✅ Growth System: Operational
# ❌ Posting System: Rate limited
# ⚠️  Collection System: Slow response
# ✅ Claude Integration: Connected
# 📊 Overall Health: 75%

# 設定確認
pnpm run check:config              # 設定ファイル検証
pnpm run check:env                 # 環境変数確認
pnpm run validate:config           # 設定値検証
```

## 🚨 アラート・エラー対応

### アラート条件

```yaml
# 重要アラート設定
system_down_threshold: 5           # システム停止アラート（分）
post_failure_threshold: 3          # 投稿失敗アラート（連続回数）
quality_low_threshold: 6.0         # 品質低下アラート（スコア）
api_limit_threshold: 90            # API制限アラート（%）
```

### 緊急時対応

```bash
# 緊急復旧手順
pnpm run emergency:stop            # 緊急停止
pnpm run emergency:diagnosis       # 緊急診断
pnpm run emergency:recovery        # 緊急復旧
pnpm run emergency:report          # 緊急レポート

# データ復旧
pnpm run backup:restore            # データ復旧
pnpm run data:verify               # データ検証
pnpm run data:repair               # データ修復
```

## 🔄 データ管理

### バックアップ

```bash
# データバックアップ
pnpm run backup:create             # バックアップ作成
pnpm run backup:verify             # バックアップ検証
pnpm run backup:list               # バックアップ一覧

# 重要データファイル
# - data/account-strategy.yaml （統合版 - systemConfig, contentTemplates含む）
# - logs/system.log
# - data/posts.yaml
```

### データクリーンアップ

```bash
# データクリーンアップ
pnpm run cleanup:logs              # ログクリーンアップ
pnpm run cleanup:cache             # キャッシュクリーンアップ
pnpm run cleanup:temp              # 一時ファイルクリーンアップ
pnpm run cleanup:old-data          # 古いデータクリーンアップ
```

## 🏆 運用のベストプラクティス

### 定期監視

- **日次**: 投稿数・品質スコア・エラー率確認
- **週次**: パフォーマンス分析・最適化実行
- **月次**: 目標調整・システム最適化

### 予防保守

- **プロアクティブ**: 問題発生前の定期チェック
- **データ駆動**: 指標に基づく判断・改善
- **継続改善**: 定期的な最適化・調整

### 品質管理

- **自動チェック**: 品質スコアの自動監視
- **閾値管理**: 品質閾値の適切な設定
- **継続学習**: システムの継続的改善

---

**重要**: 投稿頻度は15回/日で統一し、すべての設定はYAML形式で管理してください。