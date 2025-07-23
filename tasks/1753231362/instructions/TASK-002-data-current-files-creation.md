# data/current/ 必須ファイル作成指示書

## 🎯 作成目的
**システム起動エラー解決**: data/current/ディレクトリに必須ファイル3つが不足しており、システムが正常に起動できない状況を解決。

## 📂 作成対象ファイル
**不足ファイル**（調査結果により確認済み）：
1. `data/current/account-status.yaml` - アカウント状況
2. `data/current/active-strategy.yaml` - 現在の戦略
3. `data/current/weekly-summary.yaml` - 週次サマリー

**既存ファイル**：
- `data/current/today-posts.yaml` - 本日の投稿記録（作成済み）

## 🔍 必須参照
**REQUIREMENTS.md** を必ず読み込み、以下の要件と整合性を確保すること：
- ホットデータ管理（REQUIREMENTS.md 46行目）
- data/current/ディレクトリ構造（REQUIREMENTS.md 221-225行目）
- 自律実行フローの状況分析（REQUIREMENTS.md 92行目）
- 意思決定エンジンの戦略選択（REQUIREMENTS.md 93行目）

## ⚠️ データ階層制約遵守
**ホットデータ限定**：
- 最大50MBサイズ上限
- 7日間2万ファイル上限  
- 直近の意思決定用データのみ

## 👍 作成詳細

### 1. account-status.yaml
**目的**: アカウントの現在状況を記録し、decision-engine.tsが意思決定に使用

```yaml
# アカウント状況管理ファイル
last_updated: "2025-01-23T10:00:00Z"

account_metrics:
  followers_count: 150  # 現在のフォロワー数
  following_count: 200
  total_tweets: 45
  account_age_days: 30
  
engagement_status:
  recent_engagement_rate: 0.045  # 直近7日の平均エンゲージメント率
  trend: "stable"  # stable | improving | declining
  last_high_engagement_post: "2025-01-22T21:00:00Z"
  
growth_indicators:
  weekly_follower_change: +5
  weekly_engagement_change: +0.002
  content_performance_trend: "educational_strong"  # 最も効果的なコンテンツタイプ
  
current_stage: "集中特化段階"  # REQUIREMENTS.md 72-75行目の成長段階
stage_confidence: 0.85

recent_performance:
  last_7_days:
    posts_count: 15
    total_engagement: 675
    avg_engagement_per_post: 45
    best_posting_time: "21:00"
    
issues_detected:
  - "特になし"  # 現在の問題点を記載
```

### 2. active-strategy.yaml
**目的**: 現在適用中の戦略を記録し、継続性を確保

```yaml
# 現在のアクティブ戦略
last_updated: "2025-01-23T10:00:00Z"
strategy_start_date: "2025-01-20T00:00:00Z"

data_collection_strategy:
  primary: "rss_focused"  # rss_focused | multi_source | account_analysis
  collector_priorities:
    - name: "RSSCollector"
      weight: 0.8
      enabled: true
    - name: "PlaywrightAccountCollector"  
      weight: 0.2
      enabled: true
  collection_frequency: "every_2_hours"
  
content_strategy:
  primary_type: "educational_focused"  # educational_focused | trend_responsive | analytical_focused
  content_mix:
    educational: 0.7  # 70%教育重視
    trend: 0.2       # 20%トレンド対応
    analytical: 0.1  # 10%分析特化
  target_audience: "投資初心者"  # REQUIREMENTS.md brand-strategy.yamlに準拠
  
posting_strategy:
  timing_approach: "scheduled"  # scheduled | opportunity | optimized
  daily_target: 15  # 1日15回
  optimal_times:
    - "07:30"
    - "12:15" 
    - "21:00"
  avoid_times:
    - "02:00-05:00"  # 深夜早朝
    
performance_targets:
  engagement_rate_target: 0.05
  follower_growth_target: 10  # 週当たり
  content_quality_score: 0.8
  
strategy_rationale:
  reason: "現在の集中特化段階に適した教育コンテンツ中心戦略"
  expected_duration: "2-3週間"
  next_evaluation: "2025-01-30T00:00:00Z"
```

### 3. weekly-summary.yaml
**目的**: 週単位の実績サマリーで、中期的なトレンド把握に使用

```yaml
# 週次サマリーレポート
week_period: "2025-01-20 to 2025-01-26"
last_updated: "2025-01-23T10:00:00Z"
week_number: 4  # 2025年第4週

weekly_performance:
  posts_published: 45  # 週内投稿数（目標105本）
  total_engagement: 2025
  avg_engagement_per_post: 45
  follower_growth: +12
  
top_performing_content:
  - date: "2025-01-22"
    content_type: "educational_basic"
    engagement_count: 120
    engagement_rate: 0.08
    topic: "投資信託の基本"
    
  - date: "2025-01-21"
    content_type: "educational_basic"
    engagement_count: 95
    engagement_rate: 0.063
    topic: "リスク分散の重要性"
    
weekly_insights:
  best_posting_days: ["Monday", "Wednesday", "Friday"]
  best_posting_times: ["07:30", "21:00"]
  most_effective_topics:
    - "投資基本用語"
    - "リスク管理"
    - "長期投資"
  content_strategy_effectiveness:
    educational: 0.85  # 教育コンテンツの効果度
    trend: 0.45
    analytical: 0.60
    
weekly_challenges:
  - "トレンドコンテンツのエンゲージメント低下"
  - "平日昼間の投稿反応低調"
  
next_week_recommendations:
  - "教育コンテンツの継続強化"
  - "朝晕07:30と夜21:00の投稿時間固定"
  - "トレンドコンテンツの改善検討"
  
strategy_continuity:
  continue_current_strategy: true
  strategy_adjustment_needed: false
  next_strategy_review: "2025-01-30T00:00:00Z"
```

## 🔗 システム連携

### autonomous-executor.ts との連携
- Phase1（状況分析）でaccount-status.yaml読み込み
- Phase1でactive-strategy.yamlとweekly-summary.yamlを参照

### decision-engine.ts との連携
- アカウント状況判定のanalyzeCurrentSituationで使用
- 戦略選択のselectStrategyでactive-strategy.yaml参照
- 週次トレンド判定でweekly-summary.yaml使用

### data-hierarchy-manager.ts との連携
- 7日経過データの自動アーカイブ対象
- ファイルサイズ監視対象

## ⚡ 性能・品質要件
- **YAMLフォーマット**: 正しいシンタックスで作成
- **データ整合性**: 既存データとの一貫性確保
- **初期値設定**: 実際のアカウント状況を反映した適切な値
- **更新性**: last_updatedフィールドの適切な設定

## 🔐 セキュリティ・制約
- **書き込み許可**: data/current/ディレクトリのみ
- **サイズ制限**: 各ファイル100KB以下を目標
- **機密情報**: アクセストークン等の記載禁止
- **バックアップ**: 既存ファイルのバックアップ作成

## 🧪 テスト・検証

### 作成後検証
1. **YAMLシンタックス検証**: js-yamlでパーステスト
2. **ファイルサイズ確認**: 100KB以下であること
3. **システム連携テスト**: autonomous-executor.tsが正常に読み込めること
4. **データ整合性**: 既存ファイルとの一貫性

### 機能テスト
- YamlManagerでの読み込みテスト
- データ検証テスト
- エラーハンドリングテスト

## 📝 作成完了条件
1. 3つの必須YAMLファイルの作成
2. 正しいYAMLシンタックスでの作成
3. REQUIREMENTS.mdとの構造的整合性
4. サイズ制限遵守（各100KB以下）
5. 既存システムでの読み込みテスト
6. データ整合性確認
7. ファイル権限の適切な設定

## 🚨 注意事項
- **Worker権限での作成**: Manager権限での編集禁止
- **実データ使用**: モックデータ・テストモードは使用しない
- **既存ファイル保護**: today-posts.yamlを上書きしない
- **バックアップ作成**: 作業前に既存データのバックアップ
- **整合性優先**: 既存システムとの連携を最優先

## ✅ 完了報告
作成完了後、以下の報告書を作成すること：
**報告書**: `tasks/outputs/data-current-files-creation-report.md`

**報告内容**:
- 作成したファイルの詳細
- ファイルサイズと構造情報
- システム連携テスト結果
- データ整合性検証結果
- 今後のメンテナンス推奨事項