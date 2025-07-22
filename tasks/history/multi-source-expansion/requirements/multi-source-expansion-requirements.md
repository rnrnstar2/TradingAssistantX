# 多様情報源拡張要件定義書

**Manager**: Claude Code Manager  
**Project**: TradingAssistantX 多様情報源対応  
**Version**: v1.0  
**Date**: 2025-01-21  

## 🎯 **プロジェクト目標**

Xプラットフォームのログイン制限により情報収集が困難な問題を解決するため、多様な情報源に対応したシステムへの拡張を実施する。

## 📊 **現状の課題**

### 主要問題
1. **X依存度100%**: 情報収集がXのみに依存
2. **ログイン障壁**: X情報収集にログインが必要
3. **情報多様性の欠如**: 単一プラットフォームによる情報偏向
4. **システム脆弱性**: X APIの制限や変更により全システムが影響

### 技術的制約
- Playwright設定がX専用
- 情報収集ロジックがX構造に特化
- データ構造がX投稿フォーマット前提

## 🚀 **拡張対象情報源**

### 1. **RSS フィード** (優先度: 高)
```yaml
sources:
  financial_news:
    - Bloomberg RSS
    - Reuters Finance
    - Nikkei RSS
    - MarketWatch
  trading_education:
    - Investopedia RSS
    - TradingView Ideas
    - FX専門サイト
  crypto_news:
    - CoinDesk RSS
    - Cointelegraph
    - CryptoNews
```

**実装要件**:
- RSS パーサー統合
- 自動更新機能（30分間隔）
- 品質フィルタリング
- 重複除去システム

### 2. **公開API** (優先度: 高)
```yaml
apis:
  news_apis:
    - NewsAPI (news aggregation)
    - Alpha Vantage (financial news)
    - Polygon.io (market news)
  financial_data:
    - Yahoo Finance API
    - IEX Cloud API
    - CoinGecko API
  social_sentiment:
    - Reddit API (r/investing, r/stocks)
    - Discord public channels
    - Telegram public channels
```

**実装要件**:
- API キー管理システム
- レート制限対応
- データ正規化機能
- エラーハンドリング強化

### 3. **Webスクレイピング** (優先度: 中)
```yaml
websites:
  financial_sites:
    - Yahoo Finance
    - Google Finance
    - MarketWatch
    - TradingView
  educational_content:
    - Investopedia articles
    - Financial blogs
    - YouTube transcripts
  market_data:
    - Economic calendars
    - Earnings reports
    - Market indicators
```

**実装要件**:
- 複数サイト対応Playwright設定
- 動的コンテンツ対応
- robots.txt 遵守システム
- IPローテーション機能

### 4. **ソーシャルメディア (X以外)** (優先度: 低)
```yaml
platforms:
  text_based:
    - Reddit (公開投稿)
    - LinkedIn (投資関連投稿)
    - Telegram (公開チャンネル)
  video_based:
    - YouTube (トランスクリプト)
    - TikTok (投資教育動画)
  professional:
    - StockTwits
    - TradingView Social
    - Seeking Alpha comments
```

**実装要件**:
- プラットフォーム別API統合
- コンテンツ品質評価
- 多言語対応
- 著作権遵守システム

## 🏗️ **技術アーキテクチャ要件**

### 1. **情報収集システム拡張**
```typescript
interface MultiSourceCollector {
  // RSS フィード収集
  collectRSS(sources: RSSSource[]): Promise<CollectedData[]>;
  
  // API データ収集
  collectFromAPI(apiConfig: APIConfig): Promise<CollectedData[]>;
  
  // Web スクレイピング
  collectFromWeb(targets: WebTarget[]): Promise<CollectedData[]>;
  
  // ソーシャルメディア収集
  collectFromSocial(platforms: SocialConfig[]): Promise<CollectedData[]>;
}
```

### 2. **データ正規化システム**
```typescript
interface DataNormalizer {
  // 異なるフォーマットを統一形式に変換
  normalizeData(rawData: RawData, source: DataSource): NormalizedData;
  
  // 品質スコア計算
  calculateQuality(data: NormalizedData): QualityScore;
  
  // 重複検出・除去
  deduplicateData(dataList: NormalizedData[]): NormalizedData[];
}
```

### 3. **設定管理拡張**
```yaml
# data/multi-source-config.yaml
version: "2.0.0"
dataSources:
  rss:
    enabled: true
    updateInterval: 30  # minutes
    sources:
      - name: "bloomberg-finance"
        url: "https://feeds.bloomberg.com/markets/news.rss"
        category: "financial_news"
        priority: "high"
        qualityThreshold: 0.8
  
  apis:
    enabled: true
    rateLimitPolicy: "adaptive"
    sources:
      - name: "newsapi"
        endpoint: "https://newsapi.org/v2/everything"
        category: "general_news"
        apiKeyEnv: "NEWSAPI_KEY"
        requestLimit: 100  # per hour
  
  webScraping:
    enabled: true
    respectRobots: true
    sources:
      - name: "yahoo-finance"
        baseUrl: "https://finance.yahoo.com"
        selectors:
          title: "h1"
          content: ".caas-body"
        updateInterval: 60  # minutes
```

## 📈 **段階的実装計画**

### Phase 1: RSS統合 (1週間)
- [ ] RSS パーサー実装
- [ ] 基本的な品質フィルタリング
- [ ] 既存システムとの統合
- [ ] テスト・検証

### Phase 2: 公開API統合 (1週間)
- [ ] NewsAPI統合
- [ ] Yahoo Finance API統合
- [ ] レート制限管理システム
- [ ] エラーハンドリング

### Phase 3: Webスクレイピング拡張 (1週間)
- [ ] 複数サイト対応Playwright設定
- [ ] データ抽出ロジック実装
- [ ] robots.txt遵守システム
- [ ] 品質評価システム

### Phase 4: システム統合・最適化 (1週間)
- [ ] 全情報源の統合テスト
- [ ] パフォーマンス最適化
- [ ] 監視・メトリクス追加
- [ ] ドキュメント更新

## 🔧 **技術要件詳細**

### 新規依存関係
```json
{
  "dependencies": {
    "rss-parser": "^3.13.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "node-cron": "^3.0.3",
    "rate-limiter-flexible": "^3.0.8",
    "robotstxt": "^1.0.0"
  }
}
```

### 環境変数追加
```bash
# API Keys for external services
NEWSAPI_KEY="your_newsapi_key"
ALPHA_VANTAGE_KEY="your_alphavantage_key"
POLYGON_API_KEY="your_polygon_key"
REDDIT_CLIENT_ID="your_reddit_client_id"
REDDIT_CLIENT_SECRET="your_reddit_secret"

# Rate limiting settings
MAX_RSS_CONCURRENT=5
MAX_API_REQUESTS_PER_HOUR=1000
MAX_SCRAPING_CONCURRENT=3

# Quality thresholds
MIN_CONTENT_LENGTH=100
MIN_QUALITY_SCORE=0.7
DUPLICATE_THRESHOLD=0.85
```

## 📊 **品質管理要件**

### 情報品質評価基準
```typescript
interface QualityMetrics {
  contentRelevance: number;    // トレーディング関連度 (0-1)
  sourceCredibility: number;   // 情報源信頼度 (0-1)
  timelinessScore: number;     // 情報の新鮮さ (0-1)
  uniquenessScore: number;     // 独自性スコア (0-1)
  readabilityScore: number;    // 読みやすさ (0-1)
}
```

### データ品質基準
- **最低品質スコア**: 0.7以上
- **最大データ年齢**: 24時間以内
- **重複判定閾値**: 85%以上の類似度
- **最低コンテンツ長**: 100文字以上

## 🚨 **リスク管理**

### 技術リスク
1. **API制限**: 各サービスのレート制限による情報収集停止
2. **スクレイピング制約**: robots.txtや利用規約違反リスク
3. **データ品質**: 低品質情報の混入可能性
4. **システム負荷**: 複数情報源による処理負荷増加

### 対策
- フォールバック機能の実装
- 段階的ロールアウト
- 品質監視システム
- パフォーマンス監視

## 📝 **成功指標 (KPI)**

### 定量指標
- **情報源多様性**: 最低5つの異なる情報源から収集
- **データ品質**: 平均品質スコア0.8以上維持
- **更新頻度**: 30分以内の最新情報取得
- **システム可用性**: 99%以上の稼働率

### 定性指標
- X依存からの脱却達成
- 投稿コンテンツの多様性向上
- 情報の信頼性・教育価値向上
- システムの安定性・堅牢性向上

## 💼 **ワーカー配分計画**

### Worker A: RSS & API統合担当
- RSS パーサー実装
- NewsAPI、Yahoo Finance API統合
- データ正規化システム

### Worker B: Webスクレイピング担当  
- 複数サイト対応Playwright拡張
- robots.txt遵守システム
- 品質評価ロジック

### Worker C: システム統合・テスト担当
- 既存システムとの統合
- パフォーマンス最適化
- テスト・検証・ドキュメント

---

**承認**: Manager  
**Next**: アーキテクチャ設計書作成 → ワーカータスク配分