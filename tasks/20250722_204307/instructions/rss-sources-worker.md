# rss-sources.yaml 実装指示書

## 📋 Worker任務概要
data/config/rss-sources.yaml を実装してください。
このファイルはMVPの中心となるRSSデータ収集設定であり、主要金融メディアから投資教育コンテンツの元データを収集するための設定です。

## 🎯 実装対象ファイル
- **作成先**: `data/config/rss-sources.yaml`
- **役割**: RSSフィード収集源の定義
- **参照元**: REQUIREMENTS.md のRSS Collector中心設計

## 📊 必須実装項目

### 1. 基本RSS設定
```yaml
rss_config:
  enabled: true
  collection_interval: 1800   # 30分間隔（秒）
  max_items_per_source: 20    # ソースあたり最大20記事
  timeout: 30000              # タイムアウト30秒（ms）
  retry_attempts: 3           # リトライ回数
  
data_processing:
  duplicate_detection: true
  content_filtering: true
  language_filter: "ja"       # 日本語のみ
  min_content_length: 100     # 最小文字数
```

### 2. 主要金融メディア設定
```yaml
primary_sources:
  nikkei:
    name: "日本経済新聞"
    url: "https://www.nikkei.com/news/feed/"
    priority: 1               # 最高優先度
    category: "economy"
    trust_score: 0.95
    update_frequency: "high"
    content_focus:
      - market_analysis
      - economic_indicators
      - investment_news
    
  reuters_jp:
    name: "ロイター日本"
    url: "https://jp.reuters.com/news/feed"
    priority: 2
    category: "global_market"
    trust_score: 0.9
    update_frequency: "high"
    content_focus:
      - global_economy
      - currency_market
      - commodity_news
      
  toyo_keizai:
    name: "東洋経済オンライン"
    url: "https://toyokeizai.net/rss/economics"
    priority: 3
    category: "analysis"
    trust_score: 0.85
    update_frequency: "medium"
    content_focus:
      - economic_analysis
      - industry_trends
      - investment_strategy
```

### 3. 補完情報源設定
```yaml
secondary_sources:
  diamond:
    name: "ダイヤモンドオンライン"
    url: "https://diamond.jp/rss/economics"
    priority: 4
    category: "business"
    trust_score: 0.8
    update_frequency: "medium"
    content_focus:
      - business_analysis
      - market_trends
      - investment_tips
      
  zai:
    name: "ZAi オンライン"
    url: "https://zai.diamond.jp/rss/"
    priority: 5
    category: "investment"
    trust_score: 0.75
    update_frequency: "medium"
    content_focus:
      - investment_guide
      - stock_analysis
      - personal_finance
      
  kabutan:
    name: "株探"
    url: "https://kabutan.jp/rss/"
    priority: 6
    category: "stock"
    trust_score: 0.8
    update_frequency: "high"
    content_focus:
      - stock_news
      - market_data
      - company_analysis
```

### 4. 専門情報源設定
```yaml
specialized_sources:
  minkabu:
    name: "みんなの株式"
    url: "https://minkabu.jp/rss/news"
    priority: 7
    category: "retail_investment"
    trust_score: 0.7
    update_frequency: "medium"
    content_focus:
      - individual_investor
      - stock_tips
      - market_sentiment
      
  morningstar_jp:
    name: "モーニングスター日本"
    url: "https://www.morningstar.co.jp/rss/msnews_all.rss"
    priority: 8
    category: "fund_analysis"
    trust_score: 0.85
    update_frequency: "low"
    content_focus:
      - fund_analysis
      - investment_theory
      - portfolio_management
```

### 5. フィルタリング設定
```yaml
content_filters:
  keywords_include:
    high_priority:
      - "投資"
      - "株式"
      - "経済"
      - "市場"
      - "資産運用"
      - "FX"
      - "仮想通貨"
    
    medium_priority:
      - "金融"
      - "証券"
      - "銀行"
      - "企業業績"
      - "決算"
  
  keywords_exclude:
    - "広告"
    - "PR"
    - "宣伝"
    - "募集"
    - "セミナー告知"
    
  content_quality:
    min_word_count: 100
    max_word_count: 2000
    require_analysis: true
    exclude_pure_news: false
```

### 6. 疎結合設計対応
```yaml
extensibility:
  future_sources:
    api_ready: true           # API追加準備
    community_ready: true     # コミュニティソース追加準備
    webscraping_ready: true   # Webスクレイピング追加準備
  
  source_management:
    dynamic_enable_disable: true
    priority_adjustment: true
    a_b_testing_support: true
    
integration:
  collector_interface: "base-collector"
  data_format: "CollectionResult"
  error_handling: "graceful_degradation"
```

### 7. 品質管理設定
```yaml
quality_control:
  source_validation:
    check_accessibility: true
    validate_rss_format: true
    monitor_update_frequency: true
    
  content_scoring:
    educational_value: 0.3    # 30%重み
    timeliness: 0.25          # 25%重み
    reliability: 0.25         # 25%重み
    uniqueness: 0.2           # 20%重み
    
  performance_monitoring:
    track_success_rate: true
    monitor_response_time: true
    log_failures: true
```

### 8. データ出力設定
```yaml
output_configuration:
  format: "structured_yaml"
  include_metadata: true
  preserve_source_info: true
  
  data_fields:
    required:
      - title
      - content
      - source
      - timestamp
      - category
    
    optional:
      - author
      - tags
      - image_url
      - external_links
      
archiving:
  enable_archiving: true
  archive_after_days: 7
  archive_location: "data/archives/rss/"
```

## 🚨 実装注意事項

1. **RSS URL の正確性**
   - 実在するRSSフィードURLを使用
   - アクセス可能性を事前確認

2. **疎結合設計準拠**
   - base-collectorインターフェースとの整合性
   - 将来拡張への配慮

3. **品質重視**
   - 信頼性の高いソースを優先
   - フィルタリング機能の充実

4. **パフォーマンス考慮**
   - 適切な収集間隔設定
   - タイムアウト・リトライ設定

5. **実データ使用**
   - モックデータ使用禁止に対応
   - 実RSS環境での動作前提

## ✅ 完了条件
- [ ] data/config/rss-sources.yamlファイルが作成されている
- [ ] 主要金融メディアのRSSソースが設定されている
- [ ] フィルタリング機能が実装されている
- [ ] 疎結合設計に対応した拡張性が確保されている
- [ ] YAML形式が正しく、読み込み可能
- [ ] 品質管理設定が含まれている
- [ ] 実RSSフィードのURLが設定されている

## 🔄 Worker作業完了報告
実装完了時は以下を報告：
1. ファイル作成確認
2. RSSソースの設定状況（数と種類）
3. フィルタリング機能の実装確認
4. 疎結合設計への対応確認
5. 他設定ファイルとの整合性確認