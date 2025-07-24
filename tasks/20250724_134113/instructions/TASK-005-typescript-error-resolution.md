# TASK-005: TypeScript型エラー全件修正タスク

## 🎯 タスク概要

**目的**: 100件以上のTypeScript型エラーを全件修正し、MVP品質基準を達成

**優先度**: 高重要 - システム品質確保

**実行順序**: 🔄 **直列実行** - Worker4 (TASK-004) 完了後に開始

## 📋 作業前必須確認

### 権限・環境チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**⚠️ ROLE=worker 必須、権限確認完了まで作業開始禁止**

### 依存関係確認
```bash
# Worker4の作業完了を確認
ls tasks/20250724_134113/reports/REPORT-004-module-integrity-repair.md
```
**⚠️ Worker4の報告書確認必須 - 完了していない場合は待機**

### 要件定義書確認
```bash
cat REQUIREMENTS.md | head -30
```

## 🎯 型エラー修正要件

### 現在の型エラー分析

#### カテゴリ別エラー分類
1. **モジュール不在エラー** (Worker4で解決済み): 30件
2. **型定義不整合エラー**: 40件
3. **any型・暗黙的型エラー**: 20件
4. **重複定義エラー**: 10件
5. **設定・コンパイルエラー**: 5件

### 修正対象ファイル優先順位

#### 最優先修正 (システム中核)
1. **src/shared/types.ts** - 全体で使用される型定義
2. **src/main-workflows/*.ts** - ワークフロー中核クラス群
3. **src/core/component-container.ts** - DI管理

#### 高優先修正 (機能実装)
4. **src/kaito-api/core/client.ts** - API接続中核
5. **src/kaito-api/core/config.ts** - 設定管理
6. **src/claude/decision-engine.ts** - Claude判断中核

#### 標準修正 (周辺機能)
7. **src/data/data-manager.ts** - データ管理
8. **src/scheduler/main-loop.ts** - スケジューラー
9. **src/shared/config.ts** - 共通設定

## 🔧 具体的修正タスク

### Phase 1: 重要型定義の統合・修正

#### shared/types.ts の全面見直し
```typescript
// src/shared/types.ts - 統合型定義
export interface ExecutionResult {
  success: boolean;
  action: string;
  executionTime: number;
  result?: {
    id: string;
    url?: string;
    content?: string;
  };
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    rateLimitHit: boolean;
    timestamp: string;
  };
}

export interface SystemContext {
  timestamp: string;
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
  };
  system: {
    executionCount: { today: number; total: number };
    health: { all_systems_operational: boolean };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  learningData: {
    decisionPatterns: DecisionPattern[];
    successStrategies: SuccessStrategy[];
    errorLessons: ErrorLesson[];
  };
}

// 学習データ型定義
export interface DecisionPattern {
  id: string;
  context: Partial<SystemContext>;
  decision: ClaudeDecision;
  result: ExecutionResult;
  timestamp: string;
}

export interface SuccessStrategy {
  id: string;
  strategy: string;
  successRate: number;
  conditions: string[];
  examples: DecisionPattern[];
}

export interface ErrorLesson {
  id: string;
  error: string;
  context: string;
  lesson: string;
  prevention: string;
  timestamp: string;
}

export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    content?: string;
    topic?: string;
    searchQuery?: string;
    targetTweetId?: string;
  };
  confidence: number;
}
```

### Phase 2: ワークフロークラス群の型修正

#### main-workflows/execution-flow.ts 修正
```typescript
// 型エラー修正例
- const trendData = await searchEngine.searchTrends();
+ const trendData: TrendData[] = await searchEngine.searchTrends();

- trendingTopics: trendData.map(trend => trend.topic) || ['Bitcoin', 'NISA', '投資'],
+ trendingTopics: trendData.map((trend: TrendData) => trend.topic) || ['Bitcoin', 'NISA', '投資'],

// 型ガード追加
if (learningData && typeof learningData === 'object') {
  // 安全な型アクセス
}
```

#### main-workflows/status-controller.ts 修正
```typescript
// unknown型の適切な型変換
- const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
+ const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);

// Record<string, unknown> 対応
export interface SystemStatusReport {
  [key: string]: unknown;
  timestamp: string;
  system: SystemHealth;
  scheduler: SchedulerStatus;
}
```

### Phase 3: kaito-api の型整合性修正

#### kaito-api/core/config.ts の重複定義解決
```typescript
// 重複定義を削除・統合
export interface KaitoAPIConfig {
  baseUrl: string;
  timeout: number;
  rateLimits: RateLimitConfig;
  retry: RetryConfig;
}

// 重複するexport文を削除
// export { KaitoAPIConfig }; <- 削除
```

#### kaito-api/endpoints/tweet-endpoints.ts の型修正
```typescript
// 暗黙的any型の修正
- parameter 'tweetData' implicitly has an 'any' type.
+ async createTweet(tweetData: TweetData): Promise<TweetResult>

// 型引数の修正
- this.makeRequest<TweetResult>
+ await this.makeRequest<TweetResult>
```

### Phase 4: 設定・コンパイル問題修正

#### tsconfig.json 確認・修正
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "node",
    "allowImportingTsExtensions": false,
    "strict": true,
    "skipLibCheck": true
  }
}
```

#### import.meta 問題修正
```typescript
// src/main.ts - ES module対応
- if (import.meta.url === `file://${process.argv[1]}`) {
+ if (typeof import.meta !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
```

### Phase 5: エラーハンドリング型修正

#### unknown型エラーの修正
```typescript
// catch句のerror型修正
} catch (error) {
- systemLogger.error('Error:', error);
+ systemLogger.error('Error:', error instanceof Error ? error.message : String(error));
```

## 🚫 修正制約・禁止事項

### MVP制約遵守
- **動作確保優先**: 型安全性より動作継続を優先
- **部分修正許可**: 全て完璧でなくても動作することが重要
- **複雑型回避**: 複雑な型定義は避け、シンプルな型を使用

### 修正方針
- **any型最小限**: 必要最小限のany型使用は許可
- **型アサーション活用**: 複雑な型推論が困難な場合は型アサーション使用
- **段階的修正**: 一度に全修正せず、段階的に実行

### ファイル構造制約
- **型定義統合**: src/shared/types.ts を中心とした型管理
- **新規ファイル禁止**: 新しいファイルは作成しない
- **既存構造維持**: 既存のファイル構造を維持

## 🧪 動作確認要件

### 必須確認項目
1. **型チェック通過**: `npx tsc --noEmit` がエラー0件
2. **システム起動**: `pnpm run dev` が正常起動
3. **ワークフロー実行**: 基本ワークフローが実行される

### テストコマンド
```bash
# TypeScript型チェック（最重要）
npx tsc --noEmit

# 動作確認
pnpm run dev

# エラー数確認
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

### 品質基準
- **TypeScriptエラー**: 0件（警告は許容）
- **システム起動**: 正常起動
- **基本動作**: エラーなしで1回実行完了

## 📝 成果物・出力先

### 必須出力
- **型定義統合**: `src/shared/types.ts` 全面更新
- **ワークフロー修正**: `src/main-workflows/*.ts` 型修正
- **kaito-api修正**: `src/kaito-api/core/*.ts` 型修正
- **設定修正**: 必要に応じて `tsconfig.json` 更新

### 報告書作成
```
tasks/20250724_134113/reports/REPORT-005-typescript-error-resolution.md
```

**報告書内容**:
- 修正した型エラー件数・詳細
- ファイル別修正内容
- 型チェック結果（エラー0件確認）
- 動作確認結果
- Worker6への引き継ぎ事項

## ⚠️ 重要注意事項

### 品質最優先
- **型安全性確保**: TypeScript strict mode での動作を確保
- **段階的修正**: 重要ファイルから優先的に修正
- **動作継続**: 修正過程でシステムが動作不可にならないよう注意

### 依存関係管理
- **Worker4依存**: モジュール整合性修正完了を前提とする
- **Worker6準備**: 統合テスト用の品質レベルを確保

### MVP制約
- **完璧主義禁止**: 100%完璧でなくても動作すれば成功
- **実用性重視**: 型安全性と実用性のバランス重視

---

**🎯 成功基準**: TypeScript型エラーが0件になり、`pnpm run dev` が型エラーなしで正常起動すること