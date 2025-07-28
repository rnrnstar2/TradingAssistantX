# TASK-004: モジュール整合性緊急修正タスク

## 🚨 緊急度: CRITICAL

**目的**: 不在kaito-apiモジュールの作成・修正により、システム起動不可問題を解決

**優先度**: 最重要 - システム動作確保の前提条件

## 📋 作業前必須確認

### 権限・環境チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**⚠️ ROLE=worker 必須、権限確認完了まで作業開始禁止**

### 要件定義書確認
```bash
cat REQUIREMENTS.md | head -30
```

## 🎯 緊急修正要件

### 現在の致命的問題
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/rnrnstar/github/TradingAssistantX/src/kaito-api/search-engine'
```

**不在モジュール一覧**:
- ❌ `src/kaito-api/search-engine.ts` - 完全不在
- ❌ `src/kaito-api/action-executor.ts` - 完全不在  
- ⚠️ `src/kaito-api/client.ts` - 存在するが型不整合

### 緊急作成必要ファイル

#### 1. search-engine.ts の作成
```typescript
// src/kaito-api/search-engine.ts
export interface TrendData {
  topic: string;
  volume: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface SearchResult {
  id: string;
  content: string;
  author: string;
  engagement: number;
  timestamp: string;
}

export class SearchEngine {
  constructor() {}

  async searchTrends(): Promise<TrendData[]> {
    // MVP基本実装
    return [
      { topic: 'Bitcoin', volume: 1000, sentiment: 'positive' },
      { topic: 'NISA', volume: 800, sentiment: 'neutral' },
      { topic: '投資', volume: 600, sentiment: 'positive' }
    ];
  }

  async searchTweets(query: string): Promise<SearchResult[]> {
    // MVP基本実装
    return [
      {
        id: 'mock_1',
        content: `${query}に関する投資教育コンテンツ`,
        author: 'mock_user',
        engagement: 100,
        timestamp: new Date().toISOString()
      }
    ];
  }

  async analyzeMarketSentiment(): Promise<{
    overall_sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  }> {
    return {
      overall_sentiment: 'neutral',
      confidence: 0.7
    };
  }

  async getCapabilities(): Promise<{
    searchEnabled: boolean;
    trendAnalysis: boolean;
    sentimentAnalysis: boolean;
  }> {
    return {
      searchEnabled: true,
      trendAnalysis: true,
      sentimentAnalysis: true
    };
  }
}
```

#### 2. action-executor.ts の作成
```typescript
// src/kaito-api/action-executor.ts
export interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
  timestamp: string;
}

export interface ExecutionMetrics {
  totalActions: number;
  successRate: number;
  lastAction: string;
}

export class ActionExecutor {
  private metrics: ExecutionMetrics = {
    totalActions: 0,
    successRate: 1.0,
    lastAction: ''
  };

  constructor() {}

  async post(content: string): Promise<ActionResult> {
    this.metrics.totalActions++;
    this.metrics.lastAction = 'post';
    
    // MVP基本実装（Mock）
    return {
      success: true,
      id: `post_${Date.now()}`,
      url: `https://x.com/mock/status/${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  async retweet(tweetId: string): Promise<ActionResult> {
    this.metrics.totalActions++;
    this.metrics.lastAction = 'retweet';
    
    return {
      success: true,
      id: `rt_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  async like(tweetId: string): Promise<ActionResult> {
    this.metrics.totalActions++;
    this.metrics.lastAction = 'like';
    
    return {
      success: true,
      id: `like_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  async executeAction(decision: any): Promise<ActionResult> {
    switch (decision.action) {
      case 'post':
        return await this.post(decision.parameters?.content || '');
      case 'retweet':
        return await this.retweet(decision.parameters?.targetTweetId);
      case 'like':
        return await this.like(decision.parameters?.targetTweetId);
      default:
        return {
          success: false,
          error: `Unknown action: ${decision.action}`,
          timestamp: new Date().toISOString()
        };
    }
  }

  async getExecutionMetrics(): Promise<ExecutionMetrics> {
    return { ...this.metrics };
  }
}
```

## 🔧 具体的修正タスク

### Phase 1: 不在モジュール作成

#### Step 1: search-engine.ts 作成
```bash
# ファイル作成場所確認
ls -la src/kaito-api/
```

#### Step 2: action-executor.ts 作成
**MVP準拠の基本機能実装**:
- post, retweet, like の基本アクション
- Mock実装による動作確保
- 基本的なメトリクス機能

#### Step 3: 既存client.ts整合性確認
```typescript
// src/kaito-api/client.ts で以下のメソッドが必要
export class KaitoApiClient {
  async getAccountInfo(): Promise<{
    followersCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
  }>
  
  async testConnection(): Promise<boolean>
}
```

### Phase 2: コンポーネント統合修正

#### ComponentContainer統合
```typescript
// src/core/component-container.ts 更新必要
export const COMPONENT_KEYS = {
  // 既存...
  SEARCH_ENGINE: 'searchEngine',
  ACTION_EXECUTOR: 'actionExecutor',
  KAITO_CLIENT: 'kaitoClient', // 名前統一
} as const;
```

#### SystemInitializer統合
```typescript
// src/core/system-initializer.ts 修正
import { SearchEngine } from '../kaito-api/search-engine';
import { ActionExecutor } from '../kaito-api/action-executor';

// initializeComponents内で適切に初期化
```

### Phase 3: 型整合性確保

#### shared/types.ts 更新
```typescript
// 必要な型定義を統合
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
```

## 🚫 修正制約・禁止事項

### MVP制約遵守
- **Mock実装許可**: 動作確保優先、実際のAPI接続は後回し
- **基本機能のみ**: 複雑な機能は実装しない
- **エラー許容**: 一部エラーは残存可、動作不可エラーのみ修正

### ファイル構造制約
- **作成対象**: `src/kaito-api/search-engine.ts`, `src/kaito-api/action-executor.ts`
- **修正対象**: `src/core/system-initializer.ts`, `src/core/component-container.ts`
- **型定義**: `src/shared/types.ts` 必要に応じて更新

## 🧪 動作確認要件

### 必須確認項目
1. **システム起動**: `pnpm run dev` がエラーなしで起動
2. **モジュール読み込み**: ERR_MODULE_NOT_FOUND エラーの解消  
3. **基本動作**: ワークフローが1回実行される

### テストコマンド
```bash
# 動作確認（最重要）
pnpm run dev

# モジュール存在確認
ls src/kaito-api/search-engine.ts
ls src/kaito-api/action-executor.ts
```

## 📝 成果物・出力先

### 必須出力
- **新規作成**: `src/kaito-api/search-engine.ts`
- **新規作成**: `src/kaito-api/action-executor.ts`  
- **修正**: `src/core/system-initializer.ts`
- **修正**: `src/core/component-container.ts`
- **更新**: `src/shared/types.ts` (必要に応じて)

### 報告書作成
```
tasks/20250724_134113/reports/REPORT-004-module-integrity-repair.md
```

**報告書内容**:
- 作成・修正したファイル一覧
- システム起動確認結果  
- 残存する問題（Worker5への引き継ぎ）
- 動作確認結果

## ⚠️ 重要注意事項

### 動作確保最優先
- **完璧さより動作**: Mock実装でも動作することが最重要
- **エラー選別**: 致命的エラーのみ修正、警告は許容
- **品質後回し**: TypeScript型エラーはWorker5が担当

### 依存関係管理
- **Worker5準備**: このタスク完了後、Worker5が型エラー修正を実行
- **引き継ぎ情報**: 残存問題を明確に報告書に記載

### MVP制約
- **シンプル実装**: 複雑な機能は実装しない
- **基本動作確保**: 30分毎ワークフローが実行できることが目標

---

**🎯 成功基準**: `pnpm run dev` が正常に起動し、ERR_MODULE_NOT_FOUND エラーが解消されること