# TASK-002: Claude Code専用サマリーファイル作成

## 🎯 **実装目標**

Claude Code自律システムが最小コンテキストで最大効率の意思決定を行うため、システム全体の重要情報を30行以内に集約した専用サマリーファイルを作成

## 📋 **実装対象**

### **新規作成ファイル**
1. **data/claude-summary.yaml** (30行以内) - 🎯 **PRIMARY TARGET**
2. **data/core/system-state.yaml** (15行以内) - システム状態専用
3. **data/core/decision-context.yaml** (20行以内) - 意思決定コンテキスト

## ✅ **設計戦略**

### **claude-summary.yaml 設計仕様**
```yaml
# Claude Code最優先読み込み用 - 30行厳格制限
version: "1.0.0"
lastUpdated: "2025-07-21T19:52:00Z"

# システム基本状態（5行）
system:
  mode: autonomous_posting
  status: operational
  daily_target: 15
  current_health: 80
  last_action: "2025-07-21T19:20:00Z"

# アカウント現状（5行）
account:
  username: rnrnstar
  followers: 5
  posts_today: 0
  engagement_rate: 19.2
  target_progress: "0%"

# 即座実行が必要な優先タスク（8行）
priorities:
  urgent:
    - type: content_posting
      reason: "20分以上投稿なし"
      priority: high
  medium:
    - type: engagement_monitoring
      reason: "エンゲージメント改善要"
      priority: medium

# 制約・制限事項（4行）
constraints:
  daily_limit: 15
  quality_threshold: 0.8
  posting_interval: 96  # minutes
  api_status: normal

# 重要設定（3行）
settings:
  auto_execution: true
  claude_autonomous: true
  real_time_focus: true
```

### **system-state.yaml 設計仕様**
```yaml
# システム状態専用ファイル - 15行制限
status: operational
mode: autonomous_posting
uptime: "2025-07-21T16:45:00Z"
last_error: null
performance:
  health_score: 80
  success_rate: 100
  avg_response_time: 1.2
current_load:
  pending_tasks: 1
  active_operations: 0
alerts:
  level: none
  last_alert: null
maintenance:
  scheduled: false
  last_maintenance: "2025-07-21T00:00:00Z"
```

### **decision-context.yaml 設計仕様**
```yaml
# Claude意思決定専用コンテキスト - 20行制限
current_situation:
  time_since_last_post: 32  # minutes
  engagement_trend: stable
  follower_growth: static
  content_urgency: high

available_actions:
  - original_post: enabled
  - quote_tweet: enabled  
  - reply: enabled
  - retweet: enabled

content_themes:
  primary: ["リスク管理", "市場分析", "投資心理"]
  current_focus: "基礎知識"
  avoid_topics: []

optimization_targets:
  engagement: improve
  growth: maintain
  quality: maximize
  frequency: 15_per_day
```

## 🔧 **実装手順**

### **Phase 1: 現在データ分析・抽出**

#### **Step 1: 重要データ特定**
```bash
# 以下ファイルから最重要データのみ抽出:
# - data/autonomous-config.yaml → 基本設定
# - data/account-config.yaml → アカウント現状
# - data/current-situation.yaml → システム状態
# - data/content-strategy.yaml → コンテンツルール
# - data/daily-action-data.yaml → 今日の実績
```

#### **Step 2: データ統合・最小化**
```bash
# 各ソースから最小限データを選択:
system_mode = autonomous-config.yaml → execution.mode
account_status = account-config.yaml → current_metrics (最新のみ)
current_health = account-config.yaml → current_analysis.health_score
daily_progress = daily-action-data.yaml → totalActions
content_focus = content-strategy.yaml → content_themes.primary
```

### **Phase 2: サマリーファイル作成**

#### **claude-summary.yaml 作成**
```bash
# 30行厳格制限での統合サマリー作成
# - システム状態: 5行
# - アカウント情報: 5行  
# - 優先タスク: 8行
# - 制約事項: 4行
# - 重要設定: 3行
# - コメント・空行: 5行
```

#### **core/ディレクトリ作成・配置**
```bash
mkdir -p data/core/
# system-state.yaml作成 (15行)
# decision-context.yaml作成 (20行)
```

### **Phase 3: Claude Code連携最適化**

#### **読み込み優先度設定**
```yaml
# Claude Code読み込み推奨順序:
1. data/claude-summary.yaml (最優先 - 30行)
2. data/core/system-state.yaml (システム詳細 - 15行)  
3. data/core/decision-context.yaml (意思決定時 - 20行)

合計コンテキスト使用量: 65行 (従来2,044行から▲96.8%削減)
```

#### **自動更新メカニズム設計**
```yaml
# 自動更新対象フィールド:
lastUpdated: 毎分更新
current_health: 分析時更新
posts_today: 投稿成功時更新
last_action: アクション実行時更新
time_since_last_post: リアルタイム計算

# 静的フィールド（手動更新のみ）:
daily_target, constraints, content_themes
```

### **Phase 4: 検証・テスト**

#### **コンテキスト効率検証**
```bash
# ファイルサイズ確認
wc -l data/claude-summary.yaml  # <=30行
wc -l data/core/system-state.yaml  # <=15行
wc -l data/core/decision-context.yaml  # <=20行

# 合計行数確認 (目標: 65行以内)
```

#### **データ整合性確認**
```bash
# 元データとの整合性確認
# 重要情報の欠落なし確認
# Claude Code読み込みテスト
```

## 🚨 **制約・注意事項**

### **行数制限厳守**
- **claude-summary.yaml**: 30行絶対制限
- **system-state.yaml**: 15行絶対制限  
- **decision-context.yaml**: 20行絶対制限
- **コメント含む**: 空行・コメントも行数に含める

### **情報優先度**
```yaml
最高優先: current_health, posts_today, time_since_last_post
高優先: daily_target, constraints, system_status
中優先: content_themes, available_actions
低優先: metadata, timestamps（最新のみ）
```

### **更新頻度最適化**  
- **リアルタイム更新**: 5つのフィールドのみ
- **日次更新**: 設定関連フィールド  
- **手動更新**: 戦略・ルール変更時のみ

### **出力管理規則**
- **承認された出力場所**: `tasks/20250721_195256_data_optimization/reports/`
- **報告書ファイル名**: `REPORT-002-claude-summary-creation.md`

## ✅ **完了基準**

1. **ファイル作成完了**: 3つのサマリーファイルが指定行数で作成済み
2. **データ整合性**: 元データの重要情報が全て反映済み
3. **コンテキスト効率**: 65行以内での完全な意思決定情報提供
4. **自動更新対応**: 重要フィールドの自動更新メカニズム実装
5. **Claude Code最適化**: 読み込み効率96%以上改善

## 📊 **期待効果**

### **Claude Code判断精度向上**
- **コンテキスト集中**: 重要情報のみでの高精度判断
- **即座意思決定**: 30行読み込みでの即座判断可能
- **情報過負荷解消**: 不要履歴データ除外による集中力向上

### **システム応答性改善**
- **読み込み時間**: 99%短縮（2,044行→65行）
- **メモリ効率**: 大幅改善
- **リアルタイム性**: 最新状態での即座対応

## 🎯 **実装優先度**

**最高**: claude-summary.yaml（30行サマリー）
**高**: system-state.yaml（システム状態）
**中**: decision-context.yaml（意思決定コンテキスト）

**成功指標**: Claude Code読み取りデータ96%削減で判断精度維持・向上

---

**重要**: この専用サマリーにより、Claude Code は最小コンテキストで最適な自律判断を実現し、真の意味でのスマート自動運用システムに進化します。