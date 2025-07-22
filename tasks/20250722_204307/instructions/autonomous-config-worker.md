# autonomous-config.yaml 実装指示書

## 📋 Worker任務概要
data/config/autonomous-config.yaml を実装してください。
このファイルは自律実行システムの中枢設定であり、Claude Code SDKが意思決定に使用する重要な設定です。

## 🎯 実装対象ファイル
- **作成先**: `data/config/autonomous-config.yaml`
- **役割**: 自律実行エンジンの動作設定
- **参照元**: REQUIREMENTS.md の意思決定カタログ

## 📊 必須実装項目

### 1. 基本実行設定
```yaml
execution:
  mode: "autonomous"           # 自律モード
  loop_interval: 3600         # 1時間間隔（秒）
  daily_posts_target: 15      # 1日15投稿目標
  max_retries: 3              # 失敗時リトライ回数
  timeout: 300000             # タイムアウト5分（ms）
```

### 2. 意思決定設定
```yaml
decision_engine:
  primary_factors:
    - follower_count
    - engagement_rate
    - market_conditions
    - trending_topics
  
  strategy_thresholds:
    growth_phase:
      follower_threshold: 1000
      engagement_threshold: 0.03
    
    established_phase:
      follower_threshold: 5000
      engagement_threshold: 0.05
```

### 3. データソース優先度
```yaml
data_sources:
  rss:
    enabled: true
    priority: 1               # MVP段階は最優先
    config_file: "rss-sources.yaml"
  
  account_analysis:
    enabled: true
    priority: 2
    method: "playwright"
    frequency: "every_execution"
```

### 4. コンテンツ戦略設定
```yaml
content_strategies:
  educational_focused:
    conditions:
      - follower_count < 1000
      - target_audience == "beginners"
    priority: 1
    
  trend_responsive:
    conditions:
      - engagement_rate < 0.03
      - breaking_news_detected
    priority: 2
    
  analysis_specialized:
    conditions:
      - market_volatility > 0.5
      - expert_audience_ratio > 0.6
    priority: 3
```

### 5. 品質管理設定
```yaml
quality_control:
  min_content_length: 100     # 最小文字数
  max_content_length: 280     # X制限
  required_elements:
    - educational_value
    - actionable_insight
    - clear_language
  
  approval_threshold: 0.8     # 品質スコア閾値
```

### 6. 学習・最適化設定
```yaml
learning:
  success_tracking:
    metrics:
      - engagement_rate
      - follower_growth
      - retweet_count
      - educational_impact
  
  optimization:
    enabled: true
    update_frequency: "daily"
    archive_old_data: true
    retention_days: 30
```

## 🚨 実装注意事項

1. **ファイル構造確認**
   - data/configディレクトリが存在しない場合は作成
   - YAMLフォーマットの正確性を確保

2. **REQUIREMENTS.md準拠**
   - 意思決定フローチャートに対応した設定
   - 疎結合設計原則を反映
   - MVPでのRSS中心設計を重視

3. **拡張性考慮**
   - 将来のデータソース追加に対応
   - 戦略パターンの追加容易性

4. **実データ重視**
   - モックデータ使用禁止に対応
   - 実データ収集前提の設定

## ✅ 完了条件
- [ ] data/config/autonomous-config.yamlファイルが作成されている
- [ ] 上記必須項目がすべて実装されている
- [ ] YAML形式が正しく、読み込み可能
- [ ] REQUIREMENTS.mdの要件を満たしている
- [ ] 他の設定ファイル（posting-times.yaml, rss-sources.yaml）との整合性が取れている

## 🔄 Worker作業完了報告
実装完了時は以下を報告：
1. ファイル作成確認
2. 設定項目の実装状況
3. 他設定ファイルとの連携確認
4. 品質確認結果