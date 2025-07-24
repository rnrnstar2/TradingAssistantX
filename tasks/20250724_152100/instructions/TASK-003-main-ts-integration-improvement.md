# TASK-003: main.ts統合改善・エンドポイント別設計対応

## 🎯 タスク概要

TASK-001完了後、新しいエンドポイント別Claude SDK設計に対応したmain.ts統合とデータフロー最適化を実施します。

## 📋 前提条件

### 必須完了タスク
- **TASK-001**: Claude SDK API的統合リファクタリング **完了必須**
- **TASK-002**: KaitoAPI MVP最適化（並列実行、完了推奨）

### 新しいClaude SDK構造（TASK-001完了後）
```
src/claude/
├── endpoints/
│   ├── decision-endpoint.ts    # makeDecision() → ClaudeDecision
│   ├── content-endpoint.ts     # generateContent() → GeneratedContent
│   ├── analysis-endpoint.ts    # analyzePerformance() → AnalysisResult
│   └── search-endpoint.ts      # generateSearchQuery() → SearchQuery
├── types.ts                    # 統一型定義
└── index.ts                    # 統一エクスポート・CloudeSDK
```

## 🏗️ 実装要件

### 目標：エンドポイント別使用パターンの実装

REQUIREMENTS.mdで示された理想的な使用パターンを実現：

```typescript
// main.ts - エンドポイント別設計
import { makeDecision, generateContent, analyzePerformance, generateSearchQuery } from './claude';
import { kaitoAPI } from './kaito-api';
import { dataManager } from './data/data-manager';
import type { ClaudeDecision, GeneratedContent, AnalysisResult } from './claude/types';

// メインワークフロー - エンドポイント別使用
async function executeWorkflow() {
  // 1. Kaito APIでデータ取得
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. 判断エンドポイント使用
  const decision: ClaudeDecision = await makeDecision({
    twitterData,
    learningData,
    currentTime: new Date()
  });
  
  // 3. 固定型に基づく分岐処理 - 各エンドポイント使用
  switch (decision.action) {
    case 'post':
      const content: GeneratedContent = await generateContent({
        topic: decision.parameters.topic,
        style: 'educational',
        targetAudience: 'investors'
      });
      await kaitoAPI.createPost(content.text);
      break;
      
    case 'retweet':
      const searchQuery = await generateSearchQuery({
        topic: decision.parameters.topic,
        intent: 'find_educational_content'
      });
      const candidates = await kaitoAPI.searchTweets(searchQuery.query);
      await kaitoAPI.retweet(candidates[0].id);
      break;
      
    case 'like':
      await kaitoAPI.likeTweet(decision.parameters.targetTweetId);
      break;
  }
  
  // 4. 分析エンドポイント使用
  const analysis: AnalysisResult = await analyzePerformance({
    decision,
    result,
    context: twitterData
  });
  
  await dataManager.saveResult({ decision, result, analysis });
}
```

## 📝 詳細実装指示

### 1. データフロー統合の最適化

**目的**: REQUIREMENTS.mdの「明確なデータフロー」実現

**現在の問題点**:
- 複雑なワークフロークラス分離
- エンドポイント別設計に未対応
- データフローが不明確

**改善内容**:

#### ExecutionFlow の改善
```typescript
// src/main-workflows/execution-flow.ts の修正

import { makeDecision, generateContent, analyzePerformance, generateSearchQuery } from '../claude';
import type { ClaudeDecision, GeneratedContent, AnalysisResult, SearchQuery } from '../claude/types';

export class ExecutionFlow {
  async executeMainLoop(): Promise<void> {
    try {
      // 1. データ取得フェーズ - 明確化
      const context = await this.gatherExecutionContext();
      
      // 2. Claude判断フェーズ - エンドポイント使用
      const decision: ClaudeDecision = await makeDecision({
        twitterData: context.twitterData,
        learningData: context.learningData,
        currentTime: new Date()
      });
      
      // 3. アクション実行フェーズ - エンドポイント別分岐
      const result = await this.executeDecisionAction(decision);
      
      // 4. 結果分析・保存フェーズ - 分析エンドポイント使用
      await this.analyzeAndSaveResult(decision, result, context);
      
    } catch (error) {
      // エラーハンドリング
    }
  }

  private async executeDecisionAction(decision: ClaudeDecision): Promise<any> {
    switch (decision.action) {
      case 'post':
        return await this.executePostAction(decision);
      case 'retweet':
        return await this.executeRetweetAction(decision);
      case 'quote_tweet':
        return await this.executeQuoteTweetAction(decision);
      case 'like':
        return await this.executeLikeAction(decision);
      case 'wait':
        return await this.executeWaitAction(decision);
    }
  }

  private async executePostAction(decision: ClaudeDecision): Promise<any> {
    // コンテンツ生成エンドポイント使用
    const content: GeneratedContent = await generateContent({
      topic: decision.parameters.topic,
      contentType: 'educational',
      targetAudience: 'beginner'
    });
    
    // KaitoAPI呼び出し
    return await this.container.kaitoClient.post(content.content);
  }

  private async executeRetweetAction(decision: ClaudeDecision): Promise<any> {
    // 検索クエリ生成エンドポイント使用
    const searchQuery: SearchQuery = await generateSearchQuery({
      purpose: 'retweet',
      topic: decision.parameters.topic
    });
    
    // 検索実行とリツイート
    const tweets = await this.container.kaitoClient.searchTweets(searchQuery.query);
    if (tweets.length > 0) {
      return await this.container.kaitoClient.retweet(tweets[0].id);
    }
  }

  // 他のアクションメソッド...
}
```

### 2. main.ts の簡素化

**目的**: エンドポイント別設計に最適化されたメインクラス

**改善内容**:

```typescript
// src/main.ts の修正

#!/usr/bin/env node
/**
 * システム起動スクリプト（エンドポイント別設計対応版）
 * REQUIREMENTS.md準拠版 - エンドポイント別Claude SDK統合
 */

import 'dotenv/config';
import { getConfig } from './shared/config';
import { systemLogger } from './shared/logger';
import { ComponentContainer } from './shared/component-container';

// エンドポイント別Claude SDK
import { makeDecision, generateContent, analyzePerformance } from './claude';
import type { ClaudeDecision, GeneratedContent, AnalysisResult } from './claude/types';

// ワークフロー専用クラス群（簡素化版）
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { SchedulerManager } from './main-workflows/scheduler-manager';
import { ExecutionFlow } from './main-workflows/execution-flow';

/**
 * TradingAssistantX メインアプリケーションクラス（エンドポイント別設計版）
 */
class TradingAssistantX {
  private container: ComponentContainer;
  private systemLifecycle: SystemLifecycle;
  private schedulerManager: SchedulerManager;
  private executionFlow: ExecutionFlow;

  constructor() {
    const config = getConfig();
    
    // コンポーネント初期化（簡素化）
    this.container = new ComponentContainer();
    this.systemLifecycle = new SystemLifecycle(this.container);
    this.container = this.systemLifecycle.initializeComponents(config);
    
    // ワークフロー初期化
    this.schedulerManager = new SchedulerManager(this.container);
    this.executionFlow = new ExecutionFlow(this.container);
    
    systemLogger.info('TradingAssistantX initialized - エンドポイント別設計版');
  }

  async start(): Promise<void> {
    await this.systemLifecycle.startSystem();
    this.schedulerManager.startScheduler(() => this.executionFlow.executeMainLoop());
  }

  async stop(): Promise<void> {
    this.schedulerManager.stopScheduler();
    await this.systemLifecycle.stopSystem();
  }

  // 手動実行（テスト用）
  async executeOnce(): Promise<void> {
    await this.executionFlow.executeMainLoop();
  }

  // システム状態確認
  getSystemStatus(): Record<string, unknown> {
    return {
      isRunning: this.schedulerManager.isRunning(),
      lastExecution: this.executionFlow.getLastExecutionTime(),
      systemHealth: this.systemLifecycle.getHealthStatus()
    };
  }
}

async function main(): Promise<void> {
  const app = new TradingAssistantX();
  await app.start();
}

// ESM対応の起動判定
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
}

export { TradingAssistantX };
```

### 3. ComponentContainer の改善

**目的**: エンドポイント別設計に対応したコンポーネント管理

**改善内容**:

```typescript
// src/shared/component-container.ts の修正

import { KaitoTwitterAPIClient } from '../kaito-api/core/client';
import { DataManager } from '../data/data-manager';
// エンドポイント別Claude SDK（TASK-001完了後）
import { ClaudeSDK } from '../claude';

export class ComponentContainer {
  public kaitoClient: KaitoTwitterAPIClient;
  public dataManager: DataManager;
  public claudeSDK: ClaudeSDK;  // 統一SDK追加

  constructor() {
    // 初期化は SystemLifecycle で実行
  }

  // エンドポイント別アクセス用ヘルパー
  async makeDecision(context: any) {
    return await this.claudeSDK.makeDecision(context);
  }

  async generateContent(request: any) {
    return await this.claudeSDK.generateContent(request);
  }

  async analyzePerformance(data: any) {
    return await this.claudeSDK.analyzePerformance(data);
  }
}
```

### 4. 型定義の統合・整理

**目的**: エンドポイント別設計に対応した型管理

**改善内容**:

```typescript
// src/shared/types.ts の更新

// Claude SDK型定義を統合インポート
export type { 
  ClaudeDecision, 
  GeneratedContent, 
  AnalysisResult, 
  SearchQuery 
} from '../claude/types';

// KaitoAPI型定義
export type {
  PostResult,
  RetweetResult,
  LikeResult,
  AccountInfo
} from '../kaito-api/core/client';

// メインワークフロー型定義
export interface ExecutionContext {
  twitterData: any;
  learningData: any;
  timestamp: string;
}

export interface ExecutionResult {
  decision: ClaudeDecision;
  actionResult: any;
  analysis: AnalysisResult;
  timestamp: string;
}
```

## 🔧 技術要件

### 依存関係の確認
- **TASK-001完了**: Claude SDKエンドポイント別実装
- **統一インポート**: `import { makeDecision, generateContent } from './claude'`
- **型安全性**: 全ての戻り値に適切な型注釈

### エラーハンドリング改善
- **エンドポイント別エラー**: 各エンドポイントの個別エラー処理
- **統一ログ**: エンドポイント使用状況のログ出力
- **フォールバック**: Claude呼び出し失敗時の代替処理

### パフォーマンス最適化
- **並列処理**: 可能な部分でのエンドポイント並列呼び出し
- **キャッシュ**: 適切なレスポンスキャッシュ
- **タイムアウト**: 各エンドポイント呼び出しのタイムアウト設定

## 📊 品質チェック項目

### 機能確認
- [ ] エンドポイント別Claude SDK呼び出し動作
- [ ] 型安全性の確保（TypeScript strict通過）
- [ ] 30分間隔スケジューラー動作
- [ ] 各アクション（post/retweet/like/wait）の実行

### 統合確認
- [ ] main.ts → ExecutionFlow → Claude エンドポイント連携
- [ ] KaitoAPI → Claude SDK → 分岐処理フロー
- [ ] データ管理（読み込み・保存）動作
- [ ] エラー処理・ログ出力

### コード品質
- [ ] ESLint警告なし
- [ ] TypeScript strict mode通過
- [ ] 適切なJSDoc記載
- [ ] REQUIREMENTS.md準拠確認

## 🚨 注意事項

### TASK-001完了必須
- このタスクはTASK-001（Claude SDK統合）完了後に実施
- 新しいエンドポイント別構造に依存
- 統一インポート形式の確認必須

### MVP制約遵守
- **過剰複雑化禁止**: シンプルな統合に留める
- **実用性重視**: 動作確実性を最優先
- **必要最小限**: MVP要件のみ実装

### 既存機能保持
- **30分間隔実行**: 基本スケジューラー機能維持
- **基本ワークフロー**: 4ステップ実行フロー維持
- **エラーハンドリング**: 基本エラー処理維持

## 📁 出力管理

### ファイル出力先
- **修正ファイル**: `src/main.ts`, `src/main-workflows/`, `src/shared/` で直接修正
- **テスト実行**: 修正後の動作確認
- **ログ出力**: `tasks/20250724_152100/logs/main-integration.log`

### 完了報告
**報告書作成先**: `tasks/20250724_152100/reports/REPORT-003-main-ts-integration-improvement.md`

**報告内容**:
- エンドポイント別設計への対応状況
- データフロー最適化結果
- main.ts簡素化効果
- 統合テスト実行結果
- パフォーマンス改善効果
- 発見した問題点と解決方法

## ⏰ 実行順序: 直列実行（TASK-001完了後）

**前提条件**: TASK-001（Claude SDK統合）完了必須
**推奨条件**: TASK-002（KaitoAPI最適化）完了推奨

このタスクは他のタスクの完了を待ってから実行する直列タスクです。