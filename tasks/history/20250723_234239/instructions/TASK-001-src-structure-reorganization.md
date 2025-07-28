# TASK-001: src構造リオーガナイゼーション - REQUIREMENTS.md準拠構造への完全移行

## 🎯 タスク概要

**目標**: 現在のsrc構造をREQUIREMENTS.mdで定義された機能別分離構造（19ファイル・6ディレクトリ構成）に完全移行させる

**重要度**: CRITICAL - システムの根幹となる構造変更

## 📋 現状分析

### 現在の構造（削除対象）
```
src/
├── core/               # 削除対象
├── scripts/           # 一部保持・移行
├── services/          # 削除対象  
├── types/             # 統合・移行
└── utils/             # 一部移行
```

### 目標構造（REQUIREMENTS.md準拠）
```
src/
├── claude/                    # Claude Code SDK関連 (3ファイル)
│   ├── decision-engine.ts     # アクション決定エンジン
│   ├── content-generator.ts   # 投稿内容生成
│   └── post-analyzer.ts       # 投稿分析・品質評価
│
├── kaito-api/                 # KaitoTwitterAPI関連 (3ファイル)
│   ├── client.ts              # KaitoTwitterAPIクライアント
│   ├── search-engine.ts       # 投稿検索エンジン
│   └── action-executor.ts     # アクション実行統合
│
├── scheduler/                 # スケジュール制御 (2ファイル)
│   ├── core-scheduler.ts      # 30分間隔制御
│   └── main-loop.ts           # メイン実行ループ統合
│
├── data/                      # データ管理統合 (8ファイル)
│   ├── data-manager.ts        # データ管理クラス
│   ├── config/                # システム設定
│   │   └── api-config.yaml   # KaitoTwitterAPI認証設定
│   ├── learning/              # 学習データ（Claude判断材料）
│   │   ├── decision-patterns.yaml    # 過去の判断パターンと結果
│   │   ├── success-strategies.yaml   # 成功戦略の記録
│   │   └── action-results.yaml       # アクション結果履歴
│   └── context/               # 実行コンテキスト
│       ├── session-memory.yaml       # セッション間引き継ぎ
│       └── current-status.yaml       # 現在の実行状況
│
├── shared/                    # 共通機能 (3ファイル)
│   ├── types.ts               # 型定義統合
│   ├── config.ts              # 設定管理
│   └── logger.ts              # ログ管理
│
└── main.ts                    # システム起動スクリプト (1ファイル)
```

## 🚀 実装手順

### Phase 1: 新ディレクトリ構造作成
1. **新ディレクトリ作成**
   ```bash
   mkdir -p src/claude src/kaito-api src/scheduler src/data/config src/data/learning src/data/context src/shared
   ```

### Phase 2: ファイル移行・作成（機能別分類）

#### 2.1 Claude関連ファイル (src/claude/)
**既存ファイルからの移行**:
- `src/core/decision-engine.ts` → `src/claude/decision-engine.ts` (移行・適応)
- `src/services/content-creator.ts` → `src/claude/content-generator.ts` (移行・リネーム)

**新規作成**:
- `src/claude/post-analyzer.ts` (新規作成)

#### 2.2 KaitoAPI関連ファイル (src/kaito-api/)
**既存ファイルからの移行**:
- `src/services/kaito-api-manager.ts` → `src/kaito-api/client.ts` (移行・リネーム)

**新規作成**:
- `src/kaito-api/search-engine.ts` (新規作成)
- `src/kaito-api/action-executor.ts` (新規作成)

#### 2.3 スケジューラー関連ファイル (src/scheduler/)
**既存ファイルからの移行**:
- `src/core/loop-manager.ts` → `src/scheduler/main-loop.ts` (移行・適応)

**新規作成**:
- `src/scheduler/core-scheduler.ts` (新規作成)

#### 2.4 データ管理関連ファイル (src/data/)
**既存ファイルからの移行**:
- `src/utils/learning-data-manager.ts` → `src/data/data-manager.ts` (移行・適応)

**新規作成**:
- `src/data/config/api-config.yaml`
- `src/data/learning/decision-patterns.yaml`
- `src/data/learning/success-strategies.yaml`
- `src/data/learning/action-results.yaml`
- `src/data/context/session-memory.yaml`
- `src/data/context/current-status.yaml`

#### 2.5 共通機能ファイル (src/shared/)
**既存ファイルからの移行・統合**:
- `src/types/*.ts` → `src/shared/types.ts` (統合)
- `src/utils/logger.ts` → `src/shared/logger.ts` (移行)

**新規作成**:
- `src/shared/config.ts`

#### 2.6 メインファイル
**既存ファイルからの移行**:
- `src/scripts/main.ts` → `src/main.ts` (移行・適応)

### Phase 3: 旧構造削除
```bash
rm -rf src/core src/services src/types src/utils src/scripts
```

## 🔧 技術要件

### TypeScript設定
- **strict モード必須**
- **全ファイルで型安全性確保**
- **import/export構造の適正化**

### 機能要件
- **30分間隔実行システム対応**
- **Claude Code SDK統合**
- **KaitoTwitterAPI統合**
- **データドリブン判断システム**

### 品質要件
- **エラーハンドリング実装**
- **適切なログ出力**
- **設定管理の統一**

## 📊 各ファイルの実装詳細

### src/claude/decision-engine.ts
```typescript
// Claude Code SDKによるアクション決定エンジン
interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
  };
  confidence: number;
}
```

### src/claude/content-generator.ts
```typescript
// Claude Code SDKによる投稿内容生成
export class ContentGenerator {
  async generatePost(topic: string, context: any): Promise<string>
  async generateQuoteComment(originalTweet: any): Promise<string>
}
```

### src/claude/post-analyzer.ts
```typescript
// Claude Code SDKによる投稿分析・品質評価
export class PostAnalyzer {
  async analyzeQuality(content: string): Promise<QualityMetrics>
  async evaluateEngagement(tweet: any): Promise<EngagementPrediction>
}
```

### src/kaito-api/client.ts
```typescript
// KaitoTwitterAPIクライアントの実装
export class KaitoApiClient {
  async authenticate(): Promise<void>
  async post(content: string): Promise<any>
  async retweet(tweetId: string): Promise<any>
  async quoteTweet(tweetId: string, comment: string): Promise<any>
  async like(tweetId: string): Promise<any>
}
```

### src/kaito-api/search-engine.ts
```typescript
// 投稿検索エンジンの実装
export class SearchEngine {
  async searchTweets(query: string, filters?: SearchFilters): Promise<Tweet[]>
  async findHighEngagementTweets(topic: string): Promise<Tweet[]>
}
```

### src/kaito-api/action-executor.ts
```typescript
// アクション実行統合クラス
export class ActionExecutor {
  async executeAction(decision: ClaudeDecision): Promise<ExecutionResult>
  private async handlePost(params: any): Promise<any>
  private async handleRetweet(params: any): Promise<any>
  private async handleQuoteTweet(params: any): Promise<any>
  private async handleLike(params: any): Promise<any>
}
```

### src/scheduler/core-scheduler.ts
```typescript
// 30分間隔制御システム
export class CoreScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  
  start(): void
  stop(): void
  private async executeScheduledTask(): Promise<void>
}
```

### src/scheduler/main-loop.ts
```typescript
// メイン実行ループ統合
export class MainLoop {
  async runOnce(): Promise<void>
  private async analyzeCurrentSituation(): Promise<any>
  private async makeDecision(context: any): Promise<ClaudeDecision>
  private async executeDecision(decision: ClaudeDecision): Promise<void>
  private async recordResults(results: any): Promise<void>
}
```

### src/data/data-manager.ts
```typescript
// データ管理クラス
export class DataManager {
  async loadConfig(): Promise<any>
  async loadLearningData(): Promise<any>
  async saveDecisionResult(decision: any, result: any): Promise<void>
  async updateSuccessPatterns(patterns: any): Promise<void>
}
```

### src/shared/types.ts
```typescript
// 全システム共通の型定義
export interface ClaudeDecision { /* ... */ }
export interface Tweet { /* ... */ }
export interface ExecutionResult { /* ... */ }
export interface QualityMetrics { /* ... */ }
// 既存の型定義をここに統合
```

### src/shared/config.ts
```typescript
// 設定管理システム
export class Config {
  static getInstance(): Config
  getKaitoApiConfig(): any
  getSchedulerConfig(): any
  getClaudeConfig(): any
}
```

### src/shared/logger.ts
```typescript
// ログ管理システム（既存から移行・改良）
export class Logger {
  static info(message: string, meta?: any): void
  static error(message: string, error?: any): void
  static debug(message: string, meta?: any): void
}
```

### src/main.ts
```typescript
// システム起動スクリプト
import { CoreScheduler } from './scheduler/core-scheduler';
import { MainLoop } from './scheduler/main-loop';

async function main() {
  const scheduler = new CoreScheduler();
  const mainLoop = new MainLoop();
  
  // 30分間隔実行開始
  scheduler.start();
}

main().catch(console.error);
```

## 📝 YAMLファイル構造

### src/data/config/api-config.yaml
```yaml
kaito_api:
  base_url: "https://api.kaito.ai"
  auth:
    bearer_token: "${KAITO_API_TOKEN}"
  rate_limits:
    posts_per_hour: 10
    retweets_per_hour: 20
    likes_per_hour: 50

claude:
  model: "claude-3-sonnet"
  max_tokens: 4000
  temperature: 0.7
```

### src/data/learning/decision-patterns.yaml
```yaml
patterns:
  - timestamp: "2024-01-20T10:00:00Z"
    context:
      followers: 1250
      last_post_hours_ago: 4
      market_trend: "bullish"
    decision:
      action: "post"
      reasoning: "Good engagement time, bullish market"
      confidence: 0.85
    result:
      engagement_rate: 3.2
      new_followers: 5
      success: true
```

### src/data/learning/success-strategies.yaml
```yaml
strategies:
  high_engagement:
    - post_times: ["09:00", "12:00", "18:00"]
    - topics: ["market_analysis", "educational_content"]
    - hashtags: ["#投資", "#資産形成"]
  content_types:
    educational:
      success_rate: 0.78
      avg_engagement: 2.8
    market_commentary:
      success_rate: 0.65
      avg_engagement: 2.1
```

### src/data/learning/action-results.yaml
```yaml
results:
  - timestamp: "2024-01-20T10:30:00Z"
    action: "post"
    content: "投資の基本原則について..."
    metrics:
      likes: 15
      retweets: 3
      replies: 2
      engagement_rate: 2.8
    success: true
```

### src/data/context/session-memory.yaml
```yaml
current_session:
  start_time: "2024-01-20T09:00:00Z"
  actions_taken: 3
  last_action: "quote_tweet"
  next_scheduled: "2024-01-20T10:30:00Z"

memory:
  recent_topics: ["市場分析", "投資戦略", "リスク管理"]
  successful_hashtags: ["#投資", "#資産形成", "#投資教育"]
  follower_growth_trend: "positive"
```

### src/data/context/current-status.yaml
```yaml
account_status:
  followers: 1267
  following: 450
  tweets_today: 2
  engagement_rate_24h: 2.3

system_status:
  last_execution: "2024-01-20T10:00:00Z"
  next_execution: "2024-01-20T10:30:00Z"
  errors_today: 0
  success_rate: 0.95

rate_limits:
  posts_remaining: 8
  retweets_remaining: 18
  likes_remaining: 47
  reset_time: "2024-01-20T11:00:00Z"
```

## 🚫 MVP制約・禁止事項

### 実装禁止機能
- **複雑な統計・分析機能**: MVP段階では基本動作を最優先
- **過度な最適化**: まず動作するシステムを構築
- **不要なデザインパターン**: シンプルさを重視

### 必須機能のみ実装
- **30分間隔実行**: システムの根幹機能
- **4種類のアクション**: 投稿・RT・引用RT・いいね
- **データドリブン判断**: 学習データの活用
- **エラーハンドリング**: 安定動作のための必須機能

## 📋 完了条件

### 構造チェック
- [ ] REQUIREMENTS.mdで定義された6ディレクトリが存在する
- [ ] 19ファイルが正確に配置されている
- [ ] 旧構造が完全に削除されている

### 機能チェック
- [ ] 全ファイルがTypeScript strictモードで型安全
- [ ] import/export関係が正常に解決される
- [ ] npm run build が成功する
- [ ] npm run lint が成功する
- [ ] npm run type-check が成功する

### 統合チェック
- [ ] src/main.ts からシステム全体が起動可能
- [ ] 30分間隔実行システムが動作する
- [ ] データ管理システムが正常に機能する

## 📤 出力先指定

**報告書出力先**: `tasks/20250723_234239/reports/REPORT-001-src-structure-reorganization.md`

**出力内容**:
- 実装完了したファイル一覧
- 移行したファイルの対応表
- テスト結果（build, lint, type-check）
- 発見した問題点と解決方法
- 次のタスクへの提案

## ⚠️ 重要注意事項

1. **完全性優先**: 全ての機能を適切に実装する
2. **型安全性**: TypeScript strictモードでの完全な型定義
3. **エラーハンドリング**: 本番運用を想定した堅牢な実装
4. **ログ出力**: デバッグ・監視に必要な適切なログ
5. **設定管理**: YAML設定による柔軟な管理

**品質妥協禁止**: 制限なく、最高品質の実装を追求してください。