# TASK-WF01: ワークフロー問題分析と新設計

## 🎯 目的
現在のワークフローの問題を詳細分析し、Claude Code自律システムの最適化設計を策定する。

## 📋 分析対象
`docs/guides/autonomous-system-workflow.md`の全プロセス

## 🔍 実行内容

### 1. 現在ワークフローの問題特定

#### 1-1. ニーズ分析プロセスの問題分析
```bash
# Step 3のニーズ分析処理を詳細確認
grep -A 20 -B 5 "最後の投稿からの経過時間" docs/guides/autonomous-system-workflow.md
grep -A 20 -B 5 "96分間隔" docs/guides/autonomous-system-workflow.md
```

**特定すべき問題**:
- 不要な複雑性（経過時間計算、間隔比較等）
- 1日15投稿目標に対する過剰な処理
- シンプル化可能な判定ロジック

#### 1-2. 実行順序の問題分析
現在のStep順序の問題点：
```yaml
current_execution_order:
  step2: "現在状況コンテキスト読み込み"
  step3: "ニーズ分析（複雑な時間計算）"
  step4: "決定エンジン"
  step5: "並列実行（コンテンツ生成→投稿）"
  step6: "情報収集システム" # ← 遅すぎる
  # 自分のアカウント分析が皆無
```

#### 1-3. 自律性の不足分析
```yaml
missing_autonomous_features:
  account_status_check: "自分のアカウント分析が全くない"
  real_time_info: "情報収集が意思決定後で活用不可"
  context_awareness: "定期実行時の状況把握不十分"
```

#### 1-4. 出口戦略の限定性分析
```bash
# 現在の出口戦略確認
grep -A 10 -B 5 "post_immediate\|投稿" docs/guides/autonomous-system-workflow.md
```

### 2. 最適化された新ワークフロー設計

#### 2-1. 新実行順序設計
```yaml
optimized_execution_order:
  step1: "システム起動・ヘルスチェック"
  step2: "【並列】自分のアカウント状況分析"
  step3: "【並列】Playwright情報収集"
  step4: "統合状況評価（簡素化）"
  step5: "Claude主導意思決定"
  step6: "【拡張】多様な出口実行（投稿/引用/RT）"
  step7: "次回実行時間決定"
```

#### 2-2. 簡素化されたニーズ分析設計
```yaml
simplified_needs_analysis:
  core_logic: "1日15投稿目標ベースの単純判定"
  removed_complexity:
    - "96分間隔計算"
    - "複雑な経過時間分析"
    - "過度な状況判定"
  new_approach:
    - "前回投稿からの単純時間チェック"
    - "1日投稿数カウント"
    - "システム状態確認"
```

#### 2-3. 自律アカウント分析機能設計
```yaml
autonomous_account_analysis:
  execution_timing: "毎回実行開始時（並列）"
  analysis_scope:
    - "フォロワー数変化"
    - "最近の投稿パフォーマンス"
    - "エンゲージメント状況"
    - "アカウント健康度"
  output_format: "account_status.json"
  integration: "意思決定エンジンに直接反映"
```

#### 2-4. 情報収集システム改善設計
```yaml
enhanced_info_collection:
  execution_timing: "実行開始時（アカウント分析と並列）"
  collection_targets:
    - "X.comトレンド情報"
    - "競合アカウント投稿"
    - "関連ハッシュタグ動向"
    - "市場関連ニュース"
  integration: "意思決定前に完了、判断材料として活用"
```

#### 2-5. 拡張出口戦略設計
```yaml
expanded_exit_strategies:
  available_actions:
    original_post: "オリジナル投稿"
    quote_tweet: "引用リツイート"
    retweet: "リツイート"
    reply: "リプライ"
  decision_logic:
    - "収集情報の価値判定"
    - "自分のアカウント状況考慮"
    - "最適なアクション選択"
  action_distribution: "1日15回の最適配分"
```

### 3. 技術実装要件定義

#### 3-1. 新しいコンポーネント設計
```typescript
// 新規実装が必要なコンポーネント
interface AccountAnalyzer {
  analyzeCurrentStatus(): Promise<AccountStatus>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
}

interface EnhancedDecisionEngine {
  evaluateWithContext(
    accountStatus: AccountStatus,
    collectedInfo: CollectionResult[]
  ): Promise<ActionDecision[]>;
}

interface ExpandedActionExecutor {
  executePost(content: string): Promise<PostResult>;
  executeQuoteTweet(originalTweet: Tweet, comment: string): Promise<QuoteResult>;
  executeRetweet(tweetId: string): Promise<RetweetResult>;
}
```

#### 3-2. データフロー設計
```yaml
data_flow:
  input_sources:
    - "account_status.json"
    - "collection_results.yaml"
    - "current_context.json"
  processing:
    - "統合状況評価"
    - "Claude主導意思決定"
  output_actions:
    - "投稿実行"
    - "引用実行"
    - "リツイート実行"
```

## 📊 出力ファイル

### 問題分析レポート
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF01-problem-analysis.yaml`

### 新設計仕様書
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF01-optimized-workflow-design.yaml`

### 実装計画書
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF01-implementation-roadmap.md`

## 🚫 MVP制約
- 過度な分析・統計機能は追加しない
- 既存の基本機能は保護する
- シンプルで効果的な改善に集中

## ✅ 完了基準
1. 現在ワークフローの全問題特定完了
2. 最適化された新設計完成
3. 技術実装要件明確化
4. 段階的実装計画策定
5. 詳細設計文書作成完了

---
**重要**: 現在の複雑性を削減し、真に価値ある自律性を実現する設計が目標。