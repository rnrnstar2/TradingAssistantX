# posting-times.yaml 実装指示書

## 📋 Worker任務概要
data/config/posting-times.yaml を実装してください。
このファイルは1日15回の最適投稿時間を定義し、エンゲージメント最大化を図るための時間管理設定です。

## 🎯 実装対象ファイル
- **作成先**: `data/config/posting-times.yaml`
- **役割**: 投稿時間の最適化設定
- **参照元**: REQUIREMENTS.md の自律ループシステム

## ⏰ 必須実装項目

### 1. 基本投稿時間設定
```yaml
daily_posting:
  target_count: 15            # 1日15投稿
  timezone: "Asia/Tokyo"      # JST設定
  distribution_strategy: "engagement_optimized"
  
base_schedule:
  morning_peak:
    start_time: "07:00"
    end_time: "08:00"
    post_count: 4             # 朝の4投稿
    
  lunch_peak:
    start_time: "12:00" 
    end_time: "12:30"
    post_count: 3             # 昼の3投稿
    
  evening_peak:
    start_time: "18:00"
    end_time: "19:00"
    post_count: 4             # 夕方の4投稿
    
  night_peak:
    start_time: "21:00"
    end_time: "23:00"
    post_count: 4             # 夜の4投稿
```

### 2. 詳細投稿スケジュール
```yaml
optimal_times:
  # 朝の時間帯（07:00-08:00）
  - time: "07:00"
    priority: "high"
    target_audience: "早起き投資家"
    content_type: "market_overview"
    
  - time: "07:20"
    priority: "high"
    target_audience: "通勤者"
    content_type: "daily_tip"
    
  - time: "07:40"
    priority: "medium"
    target_audience: "朝活組"
    content_type: "educational"
    
  - time: "08:00"
    priority: "medium"
    target_audience: "始業前確認"
    content_type: "news_analysis"

  # 昼の時間帯（12:00-12:30）
  - time: "12:00"
    priority: "high"
    target_audience: "昼休み"
    content_type: "market_update"
    
  - time: "12:15"
    priority: "medium"
    target_audience: "ランチブレイク"
    content_type: "quick_insight"
    
  - time: "12:30"
    priority: "medium"
    target_audience: "午後準備"
    content_type: "trend_analysis"

  # 夕方の時間帯（18:00-19:00）
  - time: "18:00"
    priority: "high"
    target_audience: "退勤時間"
    content_type: "day_summary"
    
  - time: "18:20"
    priority: "high"
    target_audience: "帰宅中"
    content_type: "tomorrow_prep"
    
  - time: "18:40"
    priority: "medium"
    target_audience: "夕食前"
    content_type: "educational"
    
  - time: "19:00"
    priority: "medium"
    target_audience: "夜準備"
    content_type: "strategy_tip"

  # 夜の時間帯（21:00-23:00）  
  - time: "21:00"
    priority: "high"
    target_audience: "夜の学習時間"
    content_type: "deep_analysis"
    
  - time: "21:30"
    priority: "high"
    target_audience: "リラックス時間"
    content_type: "beginner_friendly"
    
  - time: "22:00"
    priority: "medium"
    target_audience: "夜の復習"
    content_type: "summary"
    
  - time: "22:30"
    priority: "medium"
    target_audience: "就寝前"
    content_type: "motivation"
```

### 3. 動的調整設定
```yaml
adaptive_scheduling:
  enabled: true
  adjustment_frequency: "weekly"
  
  performance_tracking:
    metrics:
      - engagement_rate_by_time
      - follower_activity_patterns
      - retweet_patterns
      - comment_engagement
  
  auto_optimization:
    min_sample_size: 30       # 最小データ数
    adjustment_threshold: 0.15 # 15%差で調整
    max_time_shift: 30        # 最大30分調整
```

### 4. 特別時間設定
```yaml
special_schedules:
  market_hours:
    weekdays:
      pre_market: "08:30"     # 前場前
      market_open: "09:00"    # 場開き
      lunch_break: "11:30"    # 昼休み前
      afternoon_open: "12:30" # 後場開始
      market_close: "15:00"   # 場終わり
    
  emergency_posting:
    enabled: true
    conditions:
      - "market_crash"
      - "major_news_break"
      - "high_volatility"
    max_emergency_posts: 3
```

### 5. フィルタリング設定
```yaml
time_filters:
  avoid_times:
    - "00:00-06:00"           # 深夜早朝
    - "14:00-17:00"           # 午後の低活動時間
  
  weekend_adjustment:
    enabled: true
    reduced_frequency: 0.6    # 平日の60%
    peak_times:
      - "10:00"
      - "14:00" 
      - "20:00"
```

### 6. 統合設定
```yaml
integration:
  autonomous_config: "autonomous-config.yaml"
  decision_engine_sync: true
  real_time_adjustment: true
  
monitoring:
  log_posting_times: true
  track_performance: true
  generate_reports: "daily"
```

## 🚨 実装注意事項

1. **時間管理精度**
   - JST（Asia/Tokyo）での正確な時刻設定
   - 秒単位の精度は不要、分単位で十分

2. **エンゲージメント最適化**
   - REQUIREMENTS.mdの最適時間帯を基準
   - 日本の生活パターンを考慮

3. **柔軟性確保**
   - 緊急時の追加投稿対応
   - 学習結果による動的調整

4. **他システム連携**
   - autonomous-config.yamlとの整合性
   - 意思決定エンジンとの協調

## ✅ 完了条件
- [ ] data/config/posting-times.yamlファイルが作成されている
- [ ] 1日15投稿の最適時間が設定されている
- [ ] 動的調整機能が実装されている
- [ ] YAML形式が正しく、読み込み可能
- [ ] 日本時間（JST）で設定されている
- [ ] 緊急投稿機能が含まれている

## 🔄 Worker作業完了報告
実装完了時は以下を報告：
1. ファイル作成確認
2. 15投稿時間の設定状況
3. 動的調整機能の実装確認
4. 他設定ファイルとの整合性確認