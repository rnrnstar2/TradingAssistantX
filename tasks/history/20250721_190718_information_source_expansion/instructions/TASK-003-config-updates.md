# TASK-003: 設定ファイル更新・新情報源対応

## 🎯 実装目標
新しい多様な情報源に対応するため、設定ファイルシステムを更新し、情報源選択の柔軟性を実現します。

## 📊 現状の問題
- `data/action-collection-strategies.yaml`がX（Twitter）のみ対応
- RSS、API、コミュニティ情報源の設定が未整備
- 情報源選択戦略の設定システムが不在

## 🚀 実装要件

### 1. 既存設定ファイルの拡張

#### 修正対象ファイル
```
data/action-collection-strategies.yaml - メイン設定の拡張
data/autonomous-config.yaml - システム設定の更新（必要に応じて）
```

#### 新規作成ファイル
```
data/multi-source-config.yaml - 多様情報源設定
data/source-credentials.yaml - API認証情報設定（テンプレート）
```

### 2. action-collection-strategies.yaml拡張

現在のX（Twitter）特化設定を多様情報源対応に拡張：

```yaml
version: "1.0.0"
system:
  maxExecutionTime: 90
  sufficiencyThreshold: 85
  qualityMinimum: 75
  
# 既存のX戦略（保持）
strategies:
  original_post:
    priority: 60
    focusAreas:
      - "独自洞察発見"
      - "市場分析情報"
      - "教育的価値"
      - "投稿機会特定"
    sources:
      # X（Twitter）ソース（既存）
      - name: "market_trends"
        url: "https://x.com/search"
        priority: "medium"  # 優先度を medium に調整
        type: "twitter"
        searchPatterns: ["crypto", "trading", "market", "bitcoin", "ethereum"]
      
      # 新規RSS ソース
      - name: "yahoo_finance_rss"
        url: "https://finance.yahoo.com/rss/"
        priority: "high"
        type: "rss"
        categories: ["markets", "crypto", "stocks"]
      
      - name: "reuters_finance"
        url: "https://feeds.reuters.com/reuters/businessNews"
        priority: "high"
        type: "rss"
        categories: ["business", "markets"]
      
      # 新規API ソース
      - name: "alpha_vantage"
        provider: "alphavantage"
        priority: "high"
        type: "api"
        endpoints: ["stock_prices", "forex", "crypto"]
        
      - name: "coingecko"
        provider: "coingecko"
        priority: "high"
        type: "api"
        endpoints: ["prices", "trends", "market_data"]
      
      # コミュニティソース
      - name: "reddit_investing"
        platform: "reddit"
        priority: "medium"
        type: "community"
        subreddits: ["investing", "stocks", "SecurityAnalysis"]
        
    collectMethods:
      - "multi_source_analysis"
      - "cross_source_validation"
      - "trend_analysis"
      - "educational_gap_identification"
    sufficiencyTarget: 90

  quote_tweet:
    priority: 25
    focusAreas:
      - "候補ツイート検索"
      - "付加価値分析"
      - "エンゲージメント評価"
      - "コミュニティ反応分析"  # 新規追加
    sources:
      # X（Twitter）ソース（保持）
      - name: "twitter_trends"
        url: "https://x.com/explore"
        priority: "medium"
        type: "twitter"
        
      # 新規RSS ソース
      - name: "financial_news_rss"
        url: "https://feeds.bloomberg.com/markets/news.rss"
        priority: "high"
        type: "rss"
        
      # コミュニティソース（議論の発見）
      - name: "reddit_discussions"
        platform: "reddit"
        priority: "high"
        type: "community"
        subreddits: ["investing", "StockMarket", "financialindependence"]
        
    sufficiencyTarget: 85

  retweet:
    priority: 10
    focusAreas:
      - "信頼性検証"
      - "価値評価"
      - "リスク分析"
      - "公式情報確認"  # 新規追加
    sources:
      # 高信頼性RSS ソース中心
      - name: "central_bank_feeds"
        url: "https://www.federalreserve.gov/feeds/press_all.xml"
        priority: "highest"
        type: "rss"
        
      - name: "sec_news"
        url: "https://www.sec.gov/news/pressreleases.rss"
        priority: "highest"
        type: "rss"
        
      - name: "reuters_breaking"
        url: "https://feeds.reuters.com/reuters/topNews"
        priority: "high"
        type: "rss"
        
    sufficiencyTarget: 80

  reply:
    priority: 5
    focusAreas:
      - "エンゲージメント機会"
      - "コミュニティ参加"
      - "価値提供"
      - "質問・疑問への回答"  # 新規追加
    sources:
      # コミュニティ中心
      - name: "reddit_questions"
        platform: "reddit"
        priority: "highest"
        type: "community"
        subreddits: ["investing", "personalfinance", "stocks"]
        filters: ["questions", "help", "advice"]
        
      - name: "hackernews_finance"
        platform: "hackernews"
        priority: "medium"
        type: "community"
        topics: ["finance", "investing", "economics"]
        
    sufficiencyTarget: 75

# 新規追加：情報源選択戦略
sourceSelection:
  original_post:
    preferred: ["rss", "api", "community"]
    fallback: ["twitter", "fallback"]
    priority: "diversity"  # quality, speed, diversity
    
  quote_tweet:
    preferred: ["community", "rss"]
    fallback: ["twitter", "fallback"]
    priority: "quality"
    
  retweet:
    preferred: ["rss", "api"]
    fallback: ["twitter", "fallback"]  
    priority: "quality"
    
  reply:
    preferred: ["community"]
    fallback: ["rss", "twitter", "fallback"]
    priority: "speed"

# 新規追加：品質基準
qualityStandards:
  relevanceScore: 80
  credibilityScore: 85
  uniquenessScore: 70
  timelinessScore: 90
  
  # 情報源別品質重み
  sourceWeights:
    rss: 0.9      # 高信頼性
    api: 0.95     # 最高品質
    community: 0.7 # 多様性重視
    twitter: 0.8  # 従来通り
    
  # 情報源別最低基準
  sourceMinimums:
    rss: 85
    api: 90
    community: 70
    twitter: 75
```

### 3. 新規設定ファイル作成

#### multi-source-config.yaml
```yaml
version: "1.0.0"

rss:
  sources:
    yahoo_finance:
      base_url: "https://finance.yahoo.com/rss/"
      feeds:
        - path: "topstories"
          category: "general"
        - path: "crypto"
          category: "cryptocurrency"
        - path: "stocks"
          category: "stocks"
      refresh_interval: 300  # 5分
      timeout: 10000
      
    reuters:
      base_url: "https://feeds.reuters.com"
      feeds:
        - path: "/reuters/businessNews"
          category: "business"
        - path: "/reuters/technologyNews"  
          category: "technology"
      refresh_interval: 600  # 10分
      timeout: 10000
      
    bloomberg:
      base_url: "https://feeds.bloomberg.com"
      feeds:
        - path: "/markets/news.rss"
          category: "markets"
      refresh_interval: 600
      timeout: 10000

apis:
  alpha_vantage:
    base_url: "https://www.alphavantage.co"
    endpoints:
      stock_quote: "/query?function=GLOBAL_QUOTE"
      forex: "/query?function=FX_DAILY"
      crypto: "/query?function=DIGITAL_CURRENCY_DAILY"
    rate_limit: 5  # requests per minute
    timeout: 15000
    
  coingecko:
    base_url: "https://api.coingecko.com/api/v3"
    endpoints:
      prices: "/simple/price"
      trending: "/search/trending"
      market_data: "/coins/markets"
    rate_limit: 50  # requests per minute
    timeout: 10000
    
  fred:
    base_url: "https://api.stlouisfed.org/fred"
    endpoints:
      series: "/series/observations"
      categories: "/category/series"
    rate_limit: 120  # requests per minute
    timeout: 15000

community:
  reddit:
    base_url: "https://www.reddit.com"
    subreddits:
      investing:
        path: "/r/investing"
        sort: "hot"
        limit: 25
        filters: ["discussion", "dd", "analysis"]
      stocks:
        path: "/r/stocks"
        sort: "hot"
        limit: 20
      personalfinance:
        path: "/r/personalfinance"
        sort: "hot"
        limit: 15
        filters: ["help", "advice"]
    rate_limit: 60  # requests per minute
    timeout: 10000
    
  hackernews:
    base_url: "https://hacker-news.firebaseio.com/v0"
    endpoints:
      topstories: "/topstories.json"
      item: "/item/{id}.json"
    rate_limit: 30
    timeout: 8000

# レート制限・エラーハンドリング
rateLimiting:
  global:
    max_concurrent: 10
    backoff_strategy: "exponential"
    max_retries: 3
    
  per_source:
    rss: 5
    api: 3  
    community: 4

caching:
  enabled: true
  ttl:
    rss: 300      # 5分
    api: 180      # 3分
    community: 600 # 10分
  max_size: 100   # MB
```

#### source-credentials.yaml.template
```yaml
# API認証情報テンプレート
# 実際の認証情報は環境変数で管理

alpha_vantage:
  api_key: "${ALPHA_VANTAGE_API_KEY}"
  
fred:
  api_key: "${FRED_API_KEY}"

reddit:
  # OAuth不要のpublic API使用
  user_agent: "TradingAssistantX/1.0"

# 使用方法：
# 1. このファイルを source-credentials.yaml にコピー
# 2. 環境変数を設定
# 3. .gitignore に source-credentials.yaml を追加
```

### 4. 環境変数設定ドキュメント

`.env.example`の更新内容を指定：

```bash
# 既存の設定
ANTHROPIC_API_KEY=your_api_key
X_API_KEY=your_x_api_key
X_TEST_MODE=false

# 新規追加：多様情報源
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FRED_API_KEY=your_fred_api_key

# 情報源有効化設定
ENABLE_RSS_SOURCES=true
ENABLE_API_SOURCES=true  
ENABLE_COMMUNITY_SOURCES=true
ENABLE_X_SOURCE=true

# レート制限設定（オプション）
RSS_RATE_LIMIT=10
API_RATE_LIMIT=5
COMMUNITY_RATE_LIMIT=8
```

## 📋 実装手順

### Phase 1: 既存設定拡張
1. `action-collection-strategies.yaml`の拡張
2. 新情報源の設定追加
3. 情報源選択戦略の設定

### Phase 2: 新規設定作成
1. `multi-source-config.yaml`の作成
2. `source-credentials.yaml.template`の作成
3. 環境変数設定の整備

### Phase 3: 統合検証
1. 設定ファイルの構文チェック
2. TASK-001、TASK-002との連携確認
3. エラーハンドリングの検証

## ⚠️ 制約・注意事項

### セキュリティ要件
- API認証情報の適切な管理
- 環境変数による認証情報の分離
- .gitignoreによる秘密情報の除外

### 互換性要件
- 既存のX（Twitter）設定の保持
- 段階的な移行への対応
- 後方互換性の確保

## ✅ 完了基準

1. **設定完了**
   - 全新規情報源の設定が適切に定義
   - 認証情報管理システムの整備完了
   - 環境変数設定の文書化完了

2. **検証完了**
   - YAML構文の正確性確認
   - 他タスクとの連携動作確認
   - セキュリティ要件の満足確認

3. **文書化完了**
   - 設定方法の明確な文書化
   - トラブルシューティング情報の整備
   - 運用ガイドラインの策定

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_190718_information_source_expansion/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-003-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- 新規設定ファイルの詳細
- 既存設定との互換性確認結果
- セキュリティ対策の実装状況
- 運用時の注意事項

---

**設定品質**: システム全体の柔軟性と拡張性を支える重要な基盤となります。精密で保守しやすい設定システムを構築してください。