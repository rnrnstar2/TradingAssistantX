# セットアップガイド

## 概要

X システムは、X プラットフォーム上でトレーディング教育コンテンツを自動投稿する統合システムです。このガイドでは、新戦略（アクション別戦略・Claude-Playwright連鎖決定システム）を含むシステムの初期セットアップから基本的な設定までを説明します。

## 🆕 新戦略システム概要

詳細なシステム概要については [アーキテクチャドキュメント](architecture.md#システム概要) を参照してください。

**セットアップ必須項目**:
- アクション別戦略配分設定
- Claude-Playwright連鎖決定システム設定
- 品質基準・学習機能の有効化

## 🚀 クイックスタート

### 1. 環境変数設定

必要な環境変数を設定します：

```bash
# API認証（必須）
export ANTHROPIC_API_KEY="your_anthropic_api_key"
export X_API_KEY="your_x_api_key"
export X_API_SECRET="your_x_api_secret"

# 実行環境設定
export NODE_ENV="production"
export X_TEST_MODE="false"  # 本番環境は false、テスト環境は true

# 新戦略システム設定（必須）
export ACTION_SPECIFIC_ENABLED="true"
export CHAIN_DECISION_MODE="adaptive"
export COLLECTION_CYCLE_TIMEOUT="90"

# 多様情報源対応設定（v2.0新機能）
export MULTI_SOURCE_ENABLED="true"
export RSS_ENABLED="true"
export API_COLLECTION_ENABLED="true"
export WEB_SCRAPING_ENABLED="true"

# 外部API認証キー
export NEWSAPI_KEY="your_newsapi_key"
export ALPHA_VANTAGE_KEY="your_alphavantage_key"
export POLYGON_API_KEY="your_polygon_key"
export REDDIT_CLIENT_ID="your_reddit_client_id"
export REDDIT_CLIENT_SECRET="your_reddit_secret"

# 収集制限設定
export MAX_RSS_CONCURRENT="5"
export MAX_API_REQUESTS_PER_HOUR="1000"
export MAX_SCRAPING_CONCURRENT="3"
export MIN_CONTENT_LENGTH="100"
export MIN_QUALITY_SCORE="0.7"
export DUPLICATE_THRESHOLD="0.85"

# オプション設定
export TZ="Asia/Tokyo"
export DEBUG="collector:*,multi-source:*"
```

### 2. 基本セットアップ

```bash
# xディレクトリに移動
cd x

# 依存関係インストール
pnpm install

# 必要なディレクトリを作成
mkdir -p data logs

# 初期設定実行
pnpm run setup
```

## 📝 設定ファイル（YAML）

### 1. アクション別戦略設定（新戦略）

詳細なYAML構造については [アーキテクチャドキュメント](architecture.md#データ構造) を参照してください。

**設定ファイル作成**:
- アクション別戦略配分 (original_post: 60%, quote_tweet: 25%, retweet: 10%, reply: 5%)
- 品質基準設定 (minQuality: 7.0-8.5)
- テンプレート定義

### 2. Claude-Playwright連鎖決定設定

詳細な連鎖判断アーキテクチャについては [アーキテクチャドキュメント](architecture.md#連鎖判断アーキテクチャ詳細) を参照してください。

**設定ファイル作成**:
- mode: "adaptive"
- timeout: 90秒
- maxCycles: 3
- 品質ゲート設定 (minContentQuality: 7.0)

### 3. アカウント戦略設定

詳細な成長戦略構造については [アーキテクチャドキュメント](architecture.md#成長戦略連鎖判断機能統合) を参照してください。

**設定ファイル作成**:
`data/account-strategy.yaml` を作成し、以下の必須項目を設定：
- currentPhase: growth
- postingFrequency: 15
- minQualityScore: 7.0
- ブランドセーフティ制約

### 2. 投稿テンプレート設定

詳細なテンプレート構造については [アーキテクチャドキュメント](architecture.md#データ構造) を参照してください。

**テンプレート設定**:
`data/account-strategy.yaml` の `contentTemplates` セクションで以下のカテゴリを設定：
- リスク管理、市場分析、基礎知識、投資心理
- maxLength: 280文字
- 適切なハッシュタグ設定

### 3. システム運用設定

詳細なシステム設定については [アーキテクチャドキュメント](architecture.md#技術スタック) を参照してください。

**運用設定**:
`data/account-strategy.yaml` の `systemConfig` セクションで設定：
- 品質閾値: 0.7以上
- 収集間隔: 1時間
- 避けるキーワード設定

## 🌐 **多様情報源設定（v2.0新機能）**

### 1. 多様情報源統合設定

`data/multi-source-config.yaml` を作成：

```yaml
version: "2.0.0"
lastUpdated: "2025-01-21T10:00:00Z"

# 全般設定
global:
  enabled: true
  fallbackToLegacy: true  # X システムをフォールバックとして使用
  maxConcurrentSources: 5
  collectionTimeout: 300  # 5分でタイムアウト
  qualityThreshold: 0.7

# RSS フィード設定
rss:
  enabled: true
  updateInterval: 30  # 30分間隔
  maxFeedsPerCycle: 10
  sources:
    - name: "bloomberg-markets"
      url: "https://feeds.bloomberg.com/markets/news.rss"
      category: "financial_news"
      priority: "high"
      qualityThreshold: 0.8
      tags: ["bloomberg", "markets", "news"]
      
    - name: "reuters-finance"
      url: "https://feeds.reuters.com/news/wealth"
      category: "financial_news"
      priority: "high"
      qualityThreshold: 0.8
      tags: ["reuters", "finance", "wealth"]

# API 設定
apis:
  enabled: true
  rateLimitStrategy: "adaptive"
  maxRequestsPerHour: 1000
  sources:
    - name: "newsapi"
      type: "news_aggregator"
      endpoint: "https://newsapi.org/v2/everything"
      apiKeyEnv: "NEWSAPI_KEY"
      category: "general_news"
      priority: "high"
      requestLimit: 100  # per hour

# Web スクレイピング設定
webScraping:
  enabled: true
  respectRobots: true
  maxConcurrent: 3
  defaultTimeout: 30
  sources:
    - name: "yahoo-finance"
      baseUrl: "https://finance.yahoo.com"
      category: "financial_news"
      priority: "high"
      selectors:
        title: "h1[data-module=ArticleHeader]"
        content: ".caas-body"
        date: ".caas-attr-meta-time"
      updateInterval: 60

# レガシーX システム設定（フォールバック）
legacy_x:
  enabled: true  # フォールバックとして継続使用
  priority: "medium"
  useAsBackup: true
  testMode: true
```

### 2. 品質評価基準設定

`data/quality-standards.yaml` を作成：

```yaml
version: "1.0.0"
qualityMetrics:
  contentRelevance:
    weight: 0.3
    keywords: ["trading", "investment", "finance", "market", "stock", "crypto"]
    minScore: 0.7
  
  sourceCredibility:
    weight: 0.25
    trustedDomains: ["bloomberg.com", "reuters.com", "investopedia.com"]
    minScore: 0.8
  
  timelinessScore:
    weight: 0.2
    maxAgeHours: 24
    preferredAgeHours: 6
  
  uniquenessScore:
    weight: 0.15
    duplicateThreshold: 0.85
  
  readabilityScore:
    weight: 0.1
    minLength: 100
    maxLength: 2000
```

### 3. API統合設定

外部APIの設定詳細：

#### NewsAPI設定
```bash
# NewsAPIキーの取得
# 1. https://newsapi.org でアカウント作成
# 2. APIキーを取得
# 3. 環境変数に設定
export NEWSAPI_KEY="your_newsapi_key_here"
```

#### Alpha Vantage設定
```bash
# Alpha Vantageキーの取得
# 1. https://www.alphavantage.co でアカウント作成
# 2. 無料APIキーを取得（1日25リクエスト制限）
# 3. 環境変数に設定
export ALPHA_VANTAGE_KEY="your_alpha_vantage_key_here"
```

### 4. 成長目標設定

`data/growth-targets.yaml` を作成：

```yaml
version: "1.0.0"
lastUpdated: "2024-01-15T10:00:00Z"

followers:
  daily: 2      # 1日2人の新規フォロワー
  weekly: 14    # 週14人
  monthly: 60   # 月60人
  quarterly: 180 # 四半期180人

engagement:
  likesPerPost: 5       # 投稿あたり平均いいね数
  retweetsPerPost: 1    # 投稿あたり平均リツイート数
  repliesPerPost: 1     # 投稿あたり平均リプライ数
  engagementRate: 3.0   # エンゲージメント率（%）

posting:
  successRate: 95.0     # 投稿成功率（%）
  averageQuality: 7.5   # 平均品質スコア
  dailyPostCount: 15    # 1日の投稿数

monitoring:
  systemUptime: 99.0    # システム稼働率（%）
  apiResponseTime: 30   # API応答時間（秒）
  errorRate: 5.0        # エラー率（%）
```

## 🔐 認証設定

### 1. Claude Code SDK認証

Claude Code SDK を使用する場合：

```bash
# Claude Code にログイン
claude auth login

# 認証状態確認
claude auth status

# APIキー設定確認
claude config get api-key
```

### 2. X API認証

X API の認証設定：

1. X Developer Portal でアプリケーションを作成
2. API Key と API Secret を取得
3. 環境変数に設定：

```bash
export X_API_KEY="your_api_key"
export X_API_SECRET="your_api_secret"
```

### 3. Anthropic API認証

Anthropic API の認証設定：

1. Anthropic Console でAPIキーを作成
2. 環境変数に設定：

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

## 🛠️ 初期セットアップ手順

### 1. システム初期化

```bash
# 1. プロジェクトディレクトリに移動
cd x

# 2. 必要なディレクトリを作成
mkdir -p data config logs

# 3. 依存関係をインストール
pnpm install

# 4. 設定ファイルを作成（上記のYAML設定を参考に）
# data/account-strategy.yaml （統合版 - systemConfig, contentTemplates含む）
# data/growth-targets.yaml

# 5. 環境変数を設定
# .env ファイルを作成するか、直接export
```

### 2. 設定の検証

```bash
# 設定ファイルの構文チェック
pnpm run verify:config

# 設定内容の検証
pnpm run validate:config

# 認証設定の確認
pnpm run check:auth
```

### 3. テスト実行

```bash
# テストモードで実行
export X_TEST_MODE="true"

# システムの動作確認
pnpm run test:system

# 個別コンポーネントのテスト
pnpm run test:collector
pnpm run test:posting
pnpm run test:claude

# 新戦略システムのテスト
pnpm run test:action-specific-collector
pnpm run test:chain-decision-system
pnpm run test:strategy-weights

# 多様情報源システムのテスト（v2.0新機能）
pnpm run test:multi-source-collector
pnpm run test:rss-collection
pnpm run test:api-integration
pnpm run test:web-scraping
pnpm run test:data-normalization
pnpm run test:quality-assessment
pnpm run test:duplicate-detection
```

## 📊 設定確認

### 1. 必須設定チェックリスト

#### 基本システム設定
- [ ] 環境変数設定完了（新戦略環境変数含む）
- [ ] `data/account-strategy.yaml` 作成
- [ ] `data/account-strategy.yaml` にcontentTemplates設定追加
- [ ] `data/account-strategy.yaml` にsystemConfig設定追加
- [ ] `data/growth-targets.yaml` 作成
- [ ] Claude Code SDK認証完了
- [ ] X API認証完了
- [ ] Anthropic API認証完了

#### 多様情報源設定（v2.0新機能）
- [ ] `data/multi-source-config.yaml` 作成
- [ ] `data/quality-standards.yaml` 作成
- [ ] NewsAPI キー設定完了
- [ ] Alpha Vantage キー設定完了
- [ ] RSS フィード接続テスト完了
- [ ] Web スクレイピングrobots.txt確認完了
- [ ] 多様情報源統合テスト完了

### 2. 設定値の確認

```bash
# 現在の設定を確認
pnpm run config:show

# 投稿頻度の確認（15回/日であることを確認）
pnpm run config:check-posting-frequency

# 品質基準の確認
pnpm run config:check-quality-settings

# 新戦略設定の確認
pnpm run config:check-action-strategy
pnpm run config:check-chain-decision
pnpm run config:validate-strategy-weights

# 多様情報源設定の確認（v2.0新機能）
pnpm run config:check-multi-source
pnpm run config:validate-rss-feeds
pnpm run config:test-api-connections
pnpm run config:verify-scraping-permissions
pnpm run config:check-quality-standards
pnpm run config:validate-all-sources
```

## 🚀 システム起動

### 1. 全システム起動

```bash
# 全コンポーネントを起動
pnpm run start:all

# 起動状態の確認
pnpm run status
```

### 2. 個別システム起動

```bash
# 成長システム
pnpm run start:growth-system

# 情報収集システム
pnpm run start:collector

# 投稿システム
pnpm run start:posting

# Claude統合
pnpm run start:claude
```

### 3. 動作確認

```bash
# システム全体の状態確認
pnpm run status:detailed

# 主要指標の確認
pnpm run metrics:key-indicators

# 最初のテスト投稿実行
pnpm run test:first-post

# 新戦略システムの動作確認
pnpm run test:action-specific-cycle
pnpm run test:claude-playwright-chain
pnpm run verify:strategy-distribution
```

## ⚠️ 重要な注意事項

### 1. 設定値の統一

- **投稿頻度**: 必ず15回/日に設定
- **データ形式**: 全設定ファイルはYAML形式で統一
- **品質基準**: 最低品質スコア7.0以上
- **新戦略配分**: original_post(60%), quote_tweet(25%), retweet(10%), reply(5%)
- **連鎖決定タイムアウト**: 90秒以内で設定

### 1.5. 新戦略システム設定（重要）

- **ACTION_SPECIFIC_ENABLED**: 必ずtrueに設定
- **CHAIN_DECISION_MODE**: adaptiveモード推奨
- **アクション戦略重み**: 合計100%になるよう調整
- **連鎖サイクル**: 最大3回までに制限

### 2. セキュリティ

- APIキーは環境変数で管理
- 設定ファイルにAPIキーを直接記載しない
- テストモードと本番モードを適切に切り替え

### 3. 監視

- システム起動後は定期的な状態確認を実施
- エラーログの監視を行う
- パフォーマンス指標の定期チェック

## 📈 次のステップ

セットアップ完了後：

1. **運用開始**: `pnpm run start:all` でシステムを起動
2. **新戦略検証**: アクション別戦略の動作確認とパフォーマンス測定
3. **監視設定**: 定期的な状態確認とメンテナンス
4. **戦略調整**: パフォーマンスデータに基づく重み配分の最適化
5. **連鎖システム調整**: Claude-Playwright連鎖サイクルの最適化

セットアップに問題が発生した場合は、`pnpm run diagnose:system` コマンドで詳細診断を実行してください。

---

**注意**: このガイドは基本的なセットアップ手順を示しています。より詳細な設定や高度な機能については、各コンポーネントの個別ドキュメントを参照してください。