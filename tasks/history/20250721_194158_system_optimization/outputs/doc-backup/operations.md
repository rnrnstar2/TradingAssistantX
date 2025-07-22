# X システム運用・監視・トラブルシューティング

## 📋 日常運用手順

### システム起動・停止

```bash
# システム起動
pnpm run start:all                 # 全システム起動
pnpm run start:growth-system       # 成長システム
pnpm run start:collector           # 情報収集
pnpm run start:posting             # 投稿システム
pnpm run start:action-collector    # アクション特化収集システム
pnpm run start:chain-manager       # Claude-Playwright連鎖管理

# システム停止
pnpm run stop:all                  # 全システム停止
pnpm run stop:growth-system        # 成長システム停止
pnpm run stop:collector            # 情報収集停止
pnpm run stop:posting              # 投稿システム停止
pnpm run stop:action-collector     # アクション特化収集システム停止
pnpm run stop:chain-manager        # Claude-Playwright連鎖管理停止
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
# ✅ Action-Specific Collector: Active
# ✅ Chain Decision Manager: Connected
# ✅ Claude Integration: Connected
# ✅ Posting Manager: Active
# ⚠️  API Rate Limits: 80% used
# 📊 Today's Posts: 12/15
# 📈 Success Rate: 95%
# 🔗 Chain Cycle Efficiency: 87%
# 🎯 Action-Specific Quality: 91%

# 個別システム状態確認
pnpm run status:growth-system      # 成長システム
pnpm run status:collector          # 情報収集
pnpm run status:action-collector   # アクション特化収集
pnpm run status:chain-manager      # 連鎖管理システム
pnpm run status:posting            # 投稿システム
pnpm run status:claude             # Claude統合
```

## 🔍 監視ポイント

詳細なシステム構成については [アーキテクチャドキュメント](architecture.md#システム構成) を参照してください。

### 重要指標（投稿頻度: 15回/日）

詳細な品質管理指標については [アーキテクチャドキュメント](architecture.md#品質管理) を参照してください。

**監視必須項目**:
- 投稿数: 15回/日
- 品質スコア: 7.5以上
- システム稼働率: 99%以上
- 連鎖サイクル効率: 85%以上
- アクション特化データ品質: 90%以上

### 監視コマンド

```bash
# 重要指標確認
pnpm run check:metrics             # 全指標確認
pnpm run check:post-count          # 投稿数確認
pnpm run check:quality-score       # 品質スコア確認
pnpm run check:api-usage           # API使用量確認
pnpm run check:error-rate          # エラー率確認

# 新戦略固有指標確認
pnpm run check:chain-efficiency    # 連鎖サイクル効率確認
pnpm run check:action-quality      # アクション特化データ品質確認
pnpm run check:collector-performance # アクション特化収集パフォーマンス確認
pnpm run check:decision-accuracy   # 連鎖決定精度確認
pnpm run check:data-freshness      # データ新鮮度確認

# エラー監視
pnpm run check:errors              # エラー状況確認
pnpm run check:logs                # ログ確認
pnpm run check:system-health       # システムヘルス確認
pnpm run check:chain-errors        # 連鎖サイクルエラー確認
pnpm run check:action-collector-status # アクション特化収集状態確認
```

## 🔧 メンテナンス手順

### 日次メンテナンス

```bash
# 日次チェックリスト
pnpm run daily:check               # 日次チェック実行
pnpm run daily:report              # 日次レポート生成
pnpm run daily:cleanup             # 日次クリーンアップ

# 新戦略固有日次メンテナンス
pnpm run daily:chain-optimization  # 連鎖サイクル最適化
pnpm run daily:action-data-refresh # アクション特化データ更新
pnpm run daily:decision-history-cleanup # 決定履歴クリーンアップ

# 手動確認項目
# - [ ] 投稿数確認（15回/日）
# - [ ] 品質スコア確認（7.5以上）
# - [ ] エラー率確認（5%以下）
# - [ ] API使用量確認（90%以下）
# - [ ] 連鎖サイクル効率確認（85%以上）
# - [ ] アクション特化データ品質確認（90%以上）
# - [ ] 決定履歴サイズ確認（1000件以下）
```

### 週次メンテナンス

```bash
# 週次チェックリスト
pnpm run weekly:check              # 週次チェック実行
pnpm run weekly:report             # 週次レポート生成
pnpm run weekly:optimization       # 週次最適化実行

# 新戦略固有週次メンテナンス
pnpm run weekly:action-data-analysis # アクション特化データ分析
pnpm run weekly:chain-efficiency-review # 連鎖効率レビュー
pnpm run weekly:decision-pattern-analysis # 決定パターン分析

# 手動確認項目
# - [ ] 成長目標達成度確認
# - [ ] コンテンツパフォーマンス分析
# - [ ] システムパフォーマンス分析
# - [ ] データ整合性確認
# - [ ] 連鎖サイクルパフォーマンス分析
# - [ ] アクション特化収集戦略評価
# - [ ] 決定履歴パターン分析
```

### 月次メンテナンス

```bash
# 月次チェックリスト
pnpm run monthly:check             # 月次チェック実行
pnpm run monthly:report            # 月次レポート生成
pnpm run monthly:backup            # 月次バックアップ実行

# 新戦略固有月次メンテナンス
pnpm run monthly:action-data-archive # アクション特化データアーカイブ
pnpm run monthly:chain-history-optimization # 連鎖履歴最適化
pnpm run monthly:collector-strategy-review # 収集戦略レビュー

# 手動確認項目
# - [ ] 目標値調整
# - [ ] システム最適化
# - [ ] 品質基準見直し
# - [ ] コスト分析
# - [ ] 連鎖サイクル効率基準見直し
# - [ ] アクション特化データ品質基準調整
# - [ ] 決定履歴アーカイブポリシー見直し
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

### ActionSpecificCollectorエラー

```bash
# アクション特化収集システムエラー
pnpm run diagnose:action-collector  # 収集システム診断
pnpm run restart:action-collector   # 収集システム再起動
pnpm run check:action-data-quality  # データ品質確認

# 収集戦略失敗
pnpm run check:collection-strategy  # 収集戦略確認
pnpm run switch:collection-strategy --strategy=fallback  # フォールバック戦略切替
pnpm run test:action-collection     # 収集テスト実行

# データ更新停止
pnpm run force:data-refresh         # 強制データ更新
pnpm run validate:action-data       # データ検証
```

### Claude-Playwright連鎖サイクルエラー

```bash
# 連鎖サイクル中断
pnpm run diagnose:chain-cycle       # 連鎖サイクル診断
pnpm run check:playwright-connection # Playwright接続確認
pnpm run restart:chain-manager      # 連鎖管理再起動

# Claude応答遅延
pnpm run check:claude-api-status    # Claude API状態確認
pnpm run config:response-timeout --seconds=60  # 応答タイムアウト調整
pnpm run test:claude-response       # Claude応答テスト

# 決定履歴破損
pnpm run backup:restore --file=chain-decision-history  # 履歴復旧
pnpm run rebuild:decision-chain     # 決定チェーン再構築

# 連鎖効率低下
pnpm run analyze:chain-efficiency   # 効率分析
pnpm run optimize:chain-parameters  # チェーンパラメータ最適化
pnpm run reset:chain-cycle --safe   # 安全な連鎖リセット
```

## 📊 診断・ログ確認

### ログファイル確認

```bash
# 主要ログファイル
tail -f logs/system.log            # システム全般ログ
tail -f logs/posting.log           # 投稿システムログ
tail -f logs/collector.log         # 収集システムログ
tail -f logs/claude.log            # Claude統合ログ

# 新戦略固有ログファイル
tail -f logs/action-collector.log  # アクション特化収集ログ
tail -f logs/chain-manager.log     # 連鎖管理ログ
tail -f logs/decision-history.log  # 決定履歴ログ
tail -f logs/chain-cycle.log       # 連鎖サイクルログ

# ログレベル別確認
pnpm run logs:error                # エラーログ表示
pnpm run logs:warning              # 警告ログ表示
pnpm run logs:info                 # 情報ログ表示

# 新戦略固有ログ確認
pnpm run logs:action-errors        # アクション収集エラーログ
pnpm run logs:chain-performance    # 連鎖パフォーマンスログ
pnpm run logs:decision-audit       # 決定監査ログ
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
# ✅ Action-Specific Collector: Operational
# ⚠️  Chain Decision Manager: Performance degraded
# ✅ Claude Integration: Connected
# 🔗 Chain Cycle Efficiency: 72% (Target: 85%)
# 🎯 Action Data Quality: 94% (Target: 90%)
# 📊 Overall Health: 78%

# 設定確認
pnpm run check:config              # 設定ファイル検証
pnpm run check:env                 # 環境変数確認
pnpm run validate:config           # 設定値検証

# 新戦略固有設定確認
pnpm run validate:action-data      # アクション特化データ検証
pnpm run check:chain-config        # 連鎖設定確認
pnpm run validate:decision-history # 決定履歴整合性確認
```

## 🚨 アラート・エラー対応

### アラート条件

詳細なアラート設定については [アーキテクチャドキュメント](architecture.md#監視ログ) を参照してください。

**重要アラート基準**:
- システム停止: 5分以上
- 投稿失敗: 連続3回
- 品質低下: スコア6.0未満
- 連鎖効率低下: 75%未満

### 緊急時対応

```bash
# 緊急復旧手順
pnpm run emergency:stop            # 緊急停止
pnpm run emergency:diagnosis       # 緊急診断
pnpm run emergency:recovery        # 緊急復旧
pnpm run emergency:report          # 緊急レポート

# 新戦略固有緊急対応
pnpm run emergency:chain-stop      # 連鎖サイクル緊急停止
pnpm run emergency:action-collector-reset # アクション収集リセット
pnpm run emergency:decision-history-backup # 決定履歴緊急バックアップ

# データ復旧
pnpm run backup:restore            # データ復旧
pnpm run data:verify               # データ検証
pnpm run data:repair               # データ修復

# 新戦略固有データ復旧
pnpm run restore:action-data       # アクション特化データ復旧
pnpm run restore:chain-history     # 連鎖履歴復旧
pnpm run verify:decision-integrity # 決定整合性検証
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
# - logs/action-collector.log （新戦略：アクション収集ログ）
# - logs/chain-manager.log （新戦略：連鎖管理ログ）
# - data/posts.yaml
```

### データクリーンアップ

```bash
# データクリーンアップ
pnpm run cleanup:logs              # ログクリーンアップ
pnpm run cleanup:cache             # キャッシュクリーンアップ
pnpm run cleanup:temp              # 一時ファイルクリーンアップ
pnpm run cleanup:old-data          # 古いデータクリーンアップ

# 新戦略固有クリーンアップ
pnpm run cleanup:action-data       # アクション特化データクリーンアップ
pnpm run cleanup:decision-history  # 決定履歴クリーンアップ
pnpm run cleanup:chain-logs        # 連鎖ログクリーンアップ
pnpm run cleanup:stale-decisions   # 古い決定データクリーンアップ
```

## 🏆 運用のベストプラクティス

### 定期監視

- **日次**: 投稿数・品質スコア・エラー率確認
- **週次**: パフォーマンス分析・最適化実行
- **月次**: 目標調整・システム最適化

**新戦略固有監視**:
- **連鎖サイクル効率**: 日次85%以上の維持
- **アクション特化データ品質**: 週次90%以上の確保
- **決定履歴の健全性**: 月次整合性確認

### 予防保守

- **プロアクティブ**: 問題発生前の定期チェック
- **データ駆動**: 指標に基づく判断・改善
- **継続改善**: 定期的な最適化・調整

**新戦略固有予防保守**:
- **連鎖パラメータ調整**: 効率低下前の事前最適化
- **アクション収集戦略見直し**: 定期的な戦略評価
- **決定履歴アーカイブ**: サイズ制限による性能維持

### 品質管理

- **自動チェック**: 品質スコアの自動監視
- **閾値管理**: 品質閾値の適切な設定
- **継続学習**: システムの継続的改善

**新戦略固有品質管理**:
- **連鎖決定精度**: 88%以上の決定精度維持
- **データ新鮮度管理**: 24時間以内のデータ更新保証
- **収集品質保証**: アクション特化データの品質基準遵守

---

**重要**: 投稿頻度は15回/日で統一し、すべての設定はYAML形式で管理してください。