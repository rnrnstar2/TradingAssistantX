# KaitoTwitterAPI統合 - バランス調整データ管理MVP実装指示書

## 🎯 実装概要

REQUIREMENTS.mdで定義されたバランス調整版データ管理システムでKaitoTwitterAPI統合を実装します。
- **リアルタイムデータ**: KaitoTwitterAPIで取得
- **学習データ**: Claude Code SDK継続性のためローカル保存

## 🏗️ 実装対象システム

### バランス調整版データ構造
```
data/
├── config/      # システム設定
│   └── api-config.yaml           # KaitoTwitterAPI認証情報
├── learning/    # Claude Code SDK学習データ（セッション間共有）
│   ├── decision-patterns.yaml    # 過去の判断パターンと結果
│   ├── success-strategies.yaml   # 成功した戦略の記録
│   └── error-lessons.yaml        # エラーからの教訓
└── context/     # 実行コンテキスト（継続性のため）
    ├── session-memory.yaml       # セッション間引き継ぎデータ
    └── strategy-evolution.yaml   # 戦略進化の記録
```

### ハイブリッドデータ管理システム
- **API取得データ**: アカウント状況・投稿履歴・エンゲージメント・フォロワー情報（リアルタイム）
- **ローカル学習データ**: Claude Code SDK判断履歴・成功パターン・エラー教訓（蓄積・共有）
- **メモリ内処理**: API取得データの高速処理、学習データとの統合分析

## 📋 実装要件

### Phase 1: KaitoTwitterAPI基盤実装

#### 1.1 API認証システム (src/services/kaito-api-manager.ts)
```typescript
export class KaitoAPIManager {
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private readonly RATE_LIMIT = 200; // QPS
  
  // 基本認証機能
  async initialize(): Promise<void>
  async validateAuth(): Promise<boolean>
  
  // リアルタイムデータ取得
  async getCurrentAccountStatus(): Promise<AccountStatus>
  async getRecentPosts(count: number = 50): Promise<Post[]>
  async analyzeEngagement(timeRange: string = "24h"): Promise<EngagementAnalysis>
  async getFollowerInfo(): Promise<FollowerInfo>
  
  // 投稿・アクション実行
  async createPost(content: string): Promise<PostResult>
  async executeRetweet(tweetId: string): Promise<PostResult>
  async executeLike(tweetId: string): Promise<PostResult>
  async executeReply(tweetId: string, content: string): Promise<PostResult>
}
```

#### 1.2 認証設定ファイル (data/config/api-config.yaml)
```yaml
kaito_twitter_api:
  api_key: "${KAITO_API_KEY}"
  base_url: "https://api.twitterapi.io"
  rate_limit: 200
  timeout: 30000
  retry_attempts: 3

claude_sdk:
  model: "claude-3-sonnet"
  max_tokens: 4000
  temperature: 0.7
```

### Phase 2: 学習統合Claude Code SDK

#### 2.1 学習データ統合エージェント (src/core/claude-autonomous-agent.ts)
```typescript
export interface ClaudeDecision {
  action: "collect_data" | "create_post" | "analyze" | "wait";
  reasoning: string;
  parameters: {
    topic?: string;
    content_type?: string;
    priority?: "high" | "medium" | "low";
  };
  confidence: number;
  learning_applied: string[];  // 適用した過去の教訓
}

export class ClaudeAutonomousAgent {
  // 学習データ統合判断
  async requestDecision(): Promise<ClaudeDecision> {
    const liveData = await this.kaitoManager.getCurrentAccountStatus();
    const learningData = await this.loadLearningData();
    return await this.callClaude(this.buildEnhancedPrompt(liveData, learningData));
  }
  
  // 拡張プロンプト構築（リアルタイム+学習データ）
  private buildEnhancedPrompt(liveData: AccountStatus, learningData: LearningData): string
  
  // 結果記録と学習データ更新
  async recordAndLearn(result: ActionResult): Promise<void>
}
```

#### 2.2 学習データ管理 (src/utils/learning-data-manager.ts)
```typescript
export interface LearningData {
  decision_patterns: DecisionPattern[];
  success_strategies: SuccessStrategy[];
  error_lessons: ErrorLesson[];
}

export class LearningDataManager {
  // 学習データ読み込み
  async loadLearningData(): Promise<LearningData>
  
  // パターン記録
  async recordDecisionPattern(decision: ClaudeDecision, result: ActionResult): Promise<void>
  
  // 成功戦略更新
  async updateSuccessStrategies(strategy: string, result: ActionResult): Promise<void>
  
  // エラー教訓追加
  async addErrorLesson(error: Error, context: string, solution: string): Promise<void>
}
```

### Phase 3: X投稿システム移行

#### 3.1 既存XPosterのKaitoAPI対応 (src/services/x-poster.ts修正)
```typescript
export class XPoster {
  constructor(private kaitoManager: KaitoAPIManager) {}
  
  // KaitoTwitterAPI経由での投稿
  async post(content: string): Promise<PostResult> {
    return await this.kaitoManager.createPost(content);
  }
  
  // 拡張アクション（KaitoAPI活用）
  async executeRetweet(tweetId: string): Promise<PostResult>
  async executeLike(tweetId: string): Promise<PostResult>
  async executeReply(tweetId: string, content: string): Promise<PostResult>
}
```

### Phase 4: 統合実行システム

#### 4.1 メインループ管理 (src/core/loop-manager.ts)
```typescript
export class LoopManager {
  // 統合実行フロー
  async executeCycle(): Promise<ExecutionResult> {
    // 1. 学習データ読み込み + API状況取得
    const context = await this.prepareExecutionContext();
    
    // 2. Claude Code SDK判断（学習データ活用）
    const decision = await this.claudeAgent.requestDecision();
    
    // 3. アクション実行
    const result = await this.executeAction(decision);
    
    // 4. 結果記録と学習データ更新
    await this.recordAndLearn(decision, result);
    
    return result;
  }
}
```

## 🔧 実装詳細要件

### 学習データファイル初期構造

#### data/learning/decision-patterns.yaml
```yaml
decision_patterns:
  - situation: "朝9時、フォロワー500名、前回投稿から12時間経過"
    action_taken: "create_post"
    parameters:
      topic: "投資基礎"
      content_type: "educational"
    result: "success"
    engagement_rate: 3.2
    follower_growth: 5
    lesson: "朝の投稿は高エンゲージメント"
    timestamp: "2025-01-23T09:00:00Z"
```

#### data/learning/success-strategies.yaml
```yaml
success_strategies:
  - strategy: "投資基礎教育コンテンツ"
    success_rate: 0.85
    average_engagement: 3.2
    best_times: ["09:00", "21:00"]
    effective_topics: ["基本用語解説", "初心者向けヒント"]
    sample_content: "投資の基本：リスクとリターンの関係..."
    
  - strategy: "市場解説コンテンツ"  
    success_rate: 0.72
    average_engagement: 2.8
    best_times: ["21:00"]
    effective_topics: ["市場動向", "経済指標解説"]
```

#### data/learning/error-lessons.yaml
```yaml
error_lessons:
  - error_type: "low_engagement"
    context: "専門用語多用の投稿"
    engagement_rate: 0.8
    solution: "平易な言葉で説明"
    prevention: "専門用語は最小限に抑制"
    examples: ["ROI → 投資効果", "ボラティリティ → 価格変動"]
    
  - error_type: "posting_frequency"
    context: "3時間以内の連続投稿"
    result: "エンゲージメント低下"
    solution: "最低6時間間隔を保持"
    prevention: "前回投稿時刻のチェック強化"
```

#### data/context/session-memory.yaml
```yaml
session_memory:
  last_execution: "2025-01-23T15:30:00Z"
  last_successful_post: "2025-01-23T09:00:00Z"
  current_strategy: "投資基礎教育重点"
  follower_trend: "増加傾向"
  recent_topics: ["複利効果", "リスク分散", "長期投資"]
  next_planned_topic: "投資信託基礎"
```

#### data/context/strategy-evolution.yaml
```yaml
strategy_evolution:
  - date: "2025-01-23"
    strategy: "朝投稿重点"
    trigger: "朝のエンゲージメント率3.2%を記録"
    adjustment: "09:00投稿を優先戦略に設定"
    result: "平均エンゲージメント率15%向上"
    
  - date: "2025-01-22"
    strategy: "専門用語削減"
    trigger: "専門用語使用時の低エンゲージメント検出"
    adjustment: "平易な表現への変更ルール追加"
    result: "理解しやすさ評価向上"
```

### 統合プロンプト例

```typescript
const enhancedPrompt = `
### 現在のリアルタイム状況（KaitoTwitterAPI取得）
- アカウント状況: ${liveData.followers_count}フォロワー
- 今日の投稿数: ${liveData.posts_today}
- 直近エンゲージメント: ${liveData.recent_engagement}%
- 最終投稿: ${liveData.last_post_time}

### 過去の学習データ（ローカル蓄積）
#### 成功パターン:
- 投資基礎テーマは朝9時の投稿で高エンゲージメント（3.2%）
- 市場解説は21時投稿で効果的（フォロワー+15%）

#### 失敗教訓:
- 複雑な専門用語使用時はエンゲージメント低下
- 連続投稿（3回以上）は逆効果

### 戦略進化履歴:
- 朝投稿重点戦略（エンゲージメント率15%向上実績）
- 専門用語削減戦略（理解度向上実績）

この統合情報を活用して次のアクションを決定してください：
{
  "action": "...",
  "reasoning": "...",
  "parameters": {...},
  "confidence": 0.85,
  "learning_applied": ["朝9時効果", "専門用語回避"]
}
`;
```

## 🚀 実装スケジュール

### Week 1: API基盤
- KaitoAPIManager基本実装
- 認証システム構築
- 基本データ取得機能

### Week 2: 学習データシステム
- 学習データ管理システム
- データファイル初期化
- 読み書き機能実装

### Week 3: Claude統合
- 学習統合Claude Agent
- 拡張プロンプト構築
- 判断・記録サイクル

### Week 4: 統合テスト
- エンドツーエンドテスト
- エラーハンドリング検証
- パフォーマンス確認

## 📊 成功指標

### 技術指標
- [ ] KaitoTwitterAPI認証成功率: 99%以上
- [ ] リアルタイムデータ取得レスポンス: 平均700ms以下  
- [ ] 学習データ読み書き: 100ms以下
- [ ] Claude Code SDK統合: JSON返却100%

### 実用指標
- [ ] 継続的投稿: 1日3-5回達成
- [ ] エンゲージメント率: 3.0%以上維持
- [ ] システム稼働率: 95%以上
- [ ] 学習効果: 戦略進化の記録確認

## 🚨 重要な制約事項

### データ管理原則
- **リアルタイムデータ**: 常にKaitoTwitterAPIから取得
- **学習データ**: ローカルファイルで永続化・共有
- **メモリ処理**: セッション内の高速処理
- **実行ログ**: tasks/outputs/のみに出力

### セキュリティ要件
- API認証情報は環境変数参照
- シークレット情報のGit追跡回避
- エラーログでの機密情報マスク

### エラーハンドリング
- KaitoTwitterAPI障害時の適切なフォールバック
- 学習データ破損時の復旧手順
- ネットワーク問題への耐性

## 📋 完了条件

1. ✅ KaitoTwitterAPI統合システムの動作確認
2. ✅ バランス調整データ管理システムの実装完了
3. ✅ Claude Code SDK学習データ連携の動作確認
4. ✅ 全アクション（投稿・RT・いいね・返信）の実行確認
5. ✅ 学習データ蓄積・活用サイクルの確認
6. ✅ エラーハンドリング・復旧機能の動作確認

## 💡 実装完了後の報告

実装完了後、以下の報告書を作成してください：
📋 報告書: `tasks/20250723_225729_final_balanced_implementation/reports/REPORT-001-kaito-api-balanced-implementation.md`

報告書には以下を含めてください：
- KaitoTwitterAPI統合実装の詳細
- バランス調整データ管理システムの動作確認
- Claude Code SDK学習データ連携の効果測定
- パフォーマンス・安定性の評価結果
- 次期改善提案

---

**実装目標**: API取得リアルタイムデータ + Claude Code SDK学習データの最適バランスによる、賢く継続的に成長するX投稿システムの完成