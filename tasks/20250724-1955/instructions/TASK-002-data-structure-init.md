# Worker指示書: データ層構造初期化とサンプルデータ作成

## 🎯 実装目的
REQUIREMENTS.mdに基づいてcurrent/historyディレクトリ構造を初期化し、システムが正常動作するための初期データを配置する。

## 📋 実装要件

### 1. ディレクトリ構造の作成

以下のディレクトリ構造を`src/data/`配下に作成：

```
src/data/
├── current/                  # 現在実行サイクル（新規作成）
│   └── .gitkeep             # Git追跡用
├── history/                  # 過去実行アーカイブ（新規作成）
│   └── .gitkeep             # Git追跡用
├── config/                   # 既存
├── context/                  # 既存
└── learning/                 # 既存
```

### 2. 初期設定ファイルの確認と調整

#### api-config.yaml（既存ファイルの確認）
`src/data/config/api-config.yaml`が以下の構造を持つことを確認：

```yaml
kaito_api:
  base_url: "https://api.kaito.ai"
  auth:
    bearer_token: "${KAITO_API_TOKEN}"  # 環境変数から取得
  rate_limits:
    posts_per_hour: 10
    retweets_per_hour: 20
    likes_per_hour: 50

claude:
  model: "claude-3-sonnet"
  max_tokens: 4000
  temperature: 0.7
```

※ 存在しない場合は上記内容で作成

### 3. 学習データ初期化（既存ファイルの確認）

以下のファイルが存在し、適切な構造を持つことを確認：

#### decision-patterns.yaml
```yaml
patterns: []  # 初期は空配列
```

#### success-strategies.yaml
```yaml
strategies:
  high_engagement:
    post_times: ["09:00", "12:00", "18:00"]
    topics: ["market_analysis", "educational_content", "investment_tips"]
    hashtags: ["#投資", "#資産形成", "#投資教育"]
  content_types:
    educational:
      success_rate: 0.78
      avg_engagement: 2.8
    market_commentary:
      success_rate: 0.65
      avg_engagement: 2.1
```

#### action-results.yaml
```yaml
results: []  # 初期は空配列
```

### 4. コンテキストデータ初期化（既存ファイルの確認）

#### current-status.yaml
```yaml
account_status:
  followers: 100
  following: 50
  tweets_today: 0
  engagement_rate_24h: 2.5

system_status:
  last_execution: ""
  next_execution: ""  # DataManagerが自動設定
  errors_today: 0
  success_rate: 1.0

rate_limits:
  posts_remaining: 10
  retweets_remaining: 20
  likes_remaining: 50
  reset_time: ""  # DataManagerが自動設定
```

#### session-memory.yaml
```yaml
current_session:
  start_time: ""  # DataManagerが自動設定
  actions_taken: 0
  last_action: "none"
  next_scheduled: ""  # DataManagerが自動設定

memory:
  recent_topics:
    - "市場分析"
    - "投資戦略"
    - "リスク管理"
  successful_hashtags:
    - "#投資"
    - "#資産形成"
    - "#投資教育"
  follower_growth_trend: "stable"
```

### 5. サンプル実行データの作成（デモ用）

`src/data/history/2025-07/24-1000/`に以下のサンプルデータを作成：

#### execution-summary.yaml
```yaml
executionId: "execution-20250724-1000"
startTime: "2025-07-24T10:00:00Z"
endTime: "2025-07-24T10:05:00Z"
decision:
  action: "post"
  reasoning: "市場が安定しており、教育的コンテンツの投稿に適したタイミング"
  parameters:
    topic: "investment_basics"
  confidence: 0.85
actions:
  - type: "post"
    timestamp: "2025-07-24T10:02:00Z"
    success: true
    result:
      id: "sample-tweet-001"
      url: "https://x.com/user/status/sample-tweet-001"
metrics:
  totalActions: 1
  successCount: 1
  errorCount: 0
```

#### claude-outputs/decision.yaml
```yaml
action: "post"
reasoning: "フォロワーのアクティブ時間帯であり、投資教育コンテンツへの関心が高い時間"
parameters:
  topic: "investment_basics"
  style: "educational"
confidence: 0.85
timestamp: "2025-07-24T10:00:30Z"
```

### 6. 実装時の注意事項

1. **既存ファイルの保護**
   - 既存ファイルは内容を確認のみ、破壊的変更は禁止
   - 存在しないファイルのみ新規作成

2. **パーミッション設定**
   - すべてのディレクトリに適切な読み書き権限
   - .gitkeepファイルで空ディレクトリのGit追跡を保証

3. **YAMLフォーマット**
   - 正しいインデント（2スペース）
   - 日本語文字列は適切にクォート

4. **環境変数の扱い**
   - ${KAITO_API_TOKEN}等はそのまま記載（実行時に解決）

## ✅ 完了条件

1. current/historyディレクトリが作成されている
2. 必要な初期設定ファイルがすべて存在する
3. YAMLファイルの構文エラーがない
4. サンプルデータが正しく配置されている

## 🚫 禁止事項

- 既存ファイルの削除や大幅な変更
- 実際のAPIトークンの記載
- REQUIREMENTS.md記載以外のディレクトリ作成
- 本番データの使用（サンプルデータのみ）

## 📝 作業手順

1. current/historyディレクトリ作成
2. 既存設定ファイルの確認
3. 不足ファイルの作成
4. サンプルデータの配置
5. 全体の整合性確認