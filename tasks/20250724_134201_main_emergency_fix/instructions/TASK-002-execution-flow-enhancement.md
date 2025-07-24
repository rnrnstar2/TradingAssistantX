# TASK-002: ExecutionFlow詳細ワークフロー実装

## 🎯 タスク概要
**責務**: ExecutionFlowクラスに30分毎4ステップワークフローの詳細実装を追加  
**対象**: `src/main-workflows/execution-flow.ts`  
**依存**: TASK-001（main.ts簡素化）と並列実行可能

## 📄 必須事前確認
1. **REQUIREMENTS.md読み込み**: 30分毎4ステップワークフローの詳細理解
2. **現状把握**: 現在のExecutionFlowクラスの基本実装確認

## 📂 実装対象
**編集ファイル**: `src/main-workflows/execution-flow.ts`

## 🔧 実装内容

### 1. 詳細ワークフロー実装追加
```typescript
import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../core/component-container';
import { DataManager } from '../data/data-manager';
import { DecisionEngine } from '../claude/decision-engine';
import { ActionExecutor } from '../kaito-api/action-executor';
import { SearchEngine } from '../kaito-api/search-engine';
import { KaitoApiClient } from '../kaito-api/client';

interface ExecutionResult {
  success: boolean;
  action: string;
  duration: number;
  error?: string;
  metadata: {
    confidence?: number;
    timestamp: string;
  };
}

interface SystemContext {
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
    decisionPatterns: any[];
    successStrategies: any[];
    errorLessons: any[];
  };
}

export class ExecutionFlow {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * 30分毎メインループ実行ワークフロー（詳細実装版）
   * REQUIREMENTS.md準拠の4ステップワークフロー実行
   */
  async executeMainLoop(): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      systemLogger.info('🔄 メインループ実行開始');
      
      // ===================================================================
      // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
      // ===================================================================
      
      // 1. 【データ読み込み】
      systemLogger.info('📋 【ステップ1】データ読み込み開始');
      const context = await this.loadSystemContext();
      systemLogger.success('✅ 【ステップ1】データ読み込み完了');

      // 2. 【Claude判断】
      systemLogger.info('🤖 【ステップ2】Claude判断開始');  
      const decision = await this.makeClaudeDecision(context);
      systemLogger.success('✅ 【ステップ2】Claude判断完了');
      
      // 3. 【アクション実行】
      systemLogger.info('⚡【ステップ3】アクション実行開始');
      const actionResult = await this.executeAction(decision);
      systemLogger.success('✅ 【ステップ3】アクション実行完了');
      
      // 4. 【結果記録】
      systemLogger.info('💾 【ステップ4】結果記録開始');
      await this.recordResults(actionResult, context);
      systemLogger.success('✅ 【ステップ4】結果記録完了');

      const duration = Date.now() - startTime;
      return {
        success: true,
        action: decision.action,
        duration,
        metadata: {
          confidence: decision.confidence,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error('❌ メインループ実行エラー:', error);
      
      return { 
        success: false, 
        action: 'error',
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private async loadSystemContext(): Promise<SystemContext> {
    const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
    const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
    const searchEngine = this.container.get<SearchEngine>(COMPONENT_KEYS.SEARCH_ENGINE);

    // 基本実装（MVP準拠）
    const learningData = await dataManager.loadLearningData();
    const accountInfo = await kaitoClient.getAccountInfo();
    const trendData = await searchEngine.searchTrends();

    return {
      timestamp: new Date().toISOString(),
      account: {
        followerCount: accountInfo.followersCount || 0,
        lastPostTime: accountInfo.lastPostTime,
        postsToday: accountInfo.postsToday || 0,
        engagementRate: accountInfo.engagementRate || 0
      },
      system: {
        executionCount: {
          today: learningData.executionCount?.today || 0,
          total: learningData.executionCount?.total || 0
        },
        health: { all_systems_operational: true }
      },
      market: {
        trendingTopics: trendData.map(trend => trend.topic) || ['Bitcoin', 'NISA', '投資'],
        volatility: 'medium',
        sentiment: 'neutral'
      },
      learningData: {
        decisionPatterns: learningData.decisionPatterns || [],
        successStrategies: learningData.successStrategies || [],
        errorLessons: learningData.errorLessons || []
      }
    };
  }

  private async makeClaudeDecision(context: SystemContext): Promise<any> {
    const decisionEngine = this.container.get<DecisionEngine>(COMPONENT_KEYS.DECISION_ENGINE);
    return await decisionEngine.makeDecision(context);
  }

  private async executeAction(decision: any): Promise<any> {
    const actionExecutor = this.container.get<ActionExecutor>(COMPONENT_KEYS.ACTION_EXECUTOR);
    
    switch (decision.action) {
      case 'post':
        return await actionExecutor.post(decision.parameters.content || '');
      case 'retweet':
        return await actionExecutor.retweet(decision.parameters.targetTweetId);
      case 'like':
        return await actionExecutor.like(decision.parameters.targetTweetId);
      case 'wait':
        return { success: true, action: 'wait', timestamp: new Date().toISOString() };
      default:
        throw new Error(`Unknown action: ${decision.action}`);
    }
  }

  private async recordResults(result: any, context: SystemContext): Promise<void> {
    const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
    
    const learningEntry = {
      timestamp: new Date().toISOString(),
      context: { followers: context.account.followerCount },
      decision: { action: result.action, success: result.success },
      result: { success: result.success }
    };

    await dataManager.addLearningEntry(learningEntry);
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **基本実装**: 複雑な分析機能は含めない
- ✅ **確実な動作**: エラーハンドリングは基本レベル
- 🚫 **過剰な最適化禁止**: シンプルな実装を維持
- 🚫 **統計・分析機能禁止**: MVP範囲内の機能のみ

## ✅ 完了条件
1. `src/main-workflows/execution-flow.ts` の詳細実装完了
2. 4ステップワークフローの明確実装
3. TypeScript エラーなし
4. main.tsからの適切な委譲確認

## 📄 出力管理
**報告書出力先**: `tasks/20250724_134201_main_emergency_fix/reports/REPORT-002-execution-flow-enhancement.md`