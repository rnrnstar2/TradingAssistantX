#!/usr/bin/env tsx

import { ClaudeErrorFixer, ErrorContext } from '../lib/claude-error-fixer.js';
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';

interface TestResult {
  success: boolean;
  errors: Array<{
    source: string;
    message: string;
    count: number;
    timestamp: string;
  }>;
  executionTime: number;
}

class InteractiveErrorFixingSystem {
  private errorFixer: ClaudeErrorFixer;
  private collector: ActionSpecificCollector;

  constructor() {
    this.errorFixer = new ClaudeErrorFixer();
    this.collector = new ActionSpecificCollector();
  }

  async runInteractiveFixingCycle(): Promise<void> {
    console.log('🚀 [対話的修正システム] 完全自動修正サイクルを開始...');
    
    let cycleCount = 0;
    const maxCycles = 3;
    
    while (cycleCount < maxCycles) {
      cycleCount++;
      console.log(`\n🔄 [サイクル ${cycleCount}/${maxCycles}] 実行開始...`);
      
      // 1. リアルテスト実行
      const testResult = await this.runRealTest();
      
      if (testResult.success && testResult.errors.length === 0) {
        console.log('✅ [完了] エラーなし - 修正サイクル完了');
        break;
      }
      
      // 2. エラー検出・分析・修正
      const fixResults = [];
      for (const error of testResult.errors) {
        const errorContext: ErrorContext = {
          sourceName: error.source,
          errorMessage: error.message,
          errorCount: error.count,
          lastOccurred: error.timestamp
        };
        
        // 3. Claude分析＆修正
        const fixResult = await this.errorFixer.fixError(errorContext);
        fixResults.push(fixResult);
        
        // 4. 修正ログ保存
        await this.errorFixer.saveFixLog(fixResult);
      }
      
      // 5. 修正適用状況の確認
      const appliedFixes = fixResults.filter(r => r.success && r.appliedChanges?.length).length;
      console.log(`🔧 [修正適用] ${appliedFixes}/${testResult.errors.length}件の修正を適用`);
      
      if (appliedFixes === 0) {
        console.log('⚠️  [警告] 修正可能なエラーがありません - サイクル終了');
        break;
      }
      
      // 6. 修正効果確認のため次のサイクルへ
      console.log('⏳ [待機] 次のテストサイクルまで3秒待機...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n🎉 [完了] 対話的修正サイクルが完了しました');
  }

  private async runRealTest(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [テスト実行] ActionSpecificCollectorのリアルテスト開始...');
      
      // ダミーコンテキストでテスト実行
      const testContext = {
        account: {
          currentState: {
            timestamp: new Date().toISOString(),
            followers: {
              current: 100,
              change_24h: 5,
              growth_rate: '5%'
            },
            engagement: {
              avg_likes: 10,
              avg_retweets: 3,
              engagement_rate: '3.2%'
            },
            performance: {
              posts_today: 2,
              target_progress: '40%',
              best_posting_time: '10:00'
            },
            health: {
              status: 'healthy' as const,
              api_limits: 'normal' as const,
              quality_score: 85
            },
            recommendations: ['テスト推奨事項'],
            healthScore: 85
          },
          recommendations: ['テスト推奨事項'],
          healthScore: 85
        },
        market: {
          trends: [],
          opportunities: [],
          competitorActivity: []
        },
        actionSuggestions: [],
        timestamp: Date.now()
      };
      
      // 複数のアクションタイプでテスト
      const testActions = ['original_post', 'quote_tweet'] as const;
      const errors: TestResult['errors'] = [];
      
      for (const actionType of testActions) {
        try {
          const result = await this.collector.collectForTopicSpecificAction(
            actionType,
            '投資トレンド',
            testContext,
            80
          );
          
          if (!result.results || result.results.length === 0) {
            errors.push({
              source: actionType,
              message: 'No results returned from collector',
              count: 1,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          errors.push({
            source: actionType,
            message: error instanceof Error ? error.message : String(error),
            count: 1,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: errors.length === 0,
        errors,
        executionTime
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{
          source: 'system',
          message: error instanceof Error ? error.message : String(error),
          count: 1,
          timestamp: new Date().toISOString()
        }],
        executionTime: Date.now() - startTime
      };
    }
  }

  async demonstrateErrorAnalysis(): Promise<void> {
    console.log('\n🎯 [デモンストレーション] エラー分析・修正のデモ実行...');
    
    // テスト用のエラーコンテキスト作成
    const testErrors: ErrorContext[] = [
      {
        sourceName: 'RSS_Feed',
        errorMessage: 'Connection timeout after 30000ms',
        errorCount: 3,
        lastOccurred: new Date().toISOString()
      },
      {
        sourceName: 'X_API',
        errorMessage: 'Authentication failed - 401 Unauthorized',
        errorCount: 5,
        lastOccurred: new Date().toISOString()
      },
      {
        sourceName: 'Community_API',
        errorMessage: 'Rate limit exceeded - 429 Too Many Requests',
        errorCount: 2,
        lastOccurred: new Date().toISOString()
      }
    ];

    for (const errorContext of testErrors) {
      console.log(`\n🔍 [分析] ${errorContext.sourceName}: ${errorContext.errorMessage}`);
      
      const fixResult = await this.errorFixer.fixError(errorContext);
      
      console.log(`📋 [結果] ${fixResult.success ? '成功' : '失敗'}`);
      console.log(`🎯 [戦略] ${fixResult.decision.strategy}`);
      console.log(`⚡ [優先度] ${fixResult.decision.priority}`);
      console.log(`💭 [理由] ${fixResult.decision.reasoning}`);
      
      if (fixResult.appliedChanges?.length) {
        console.log(`🔧 [適用] ${fixResult.appliedChanges.length}件の変更を適用`);
      }
      
      // ログ保存
      await this.errorFixer.saveFixLog(fixResult);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'cycle';
  
  const system = new InteractiveErrorFixingSystem();
  
  switch (command) {
    case 'cycle':
      await system.runInteractiveFixingCycle();
      break;
      
    case 'demo':
      await system.demonstrateErrorAnalysis();
      break;
      
    default:
      console.log('使用方法:');
      console.log('  tsx src/scripts/interactive-error-fixing.ts cycle  # 完全修正サイクル実行');
      console.log('  tsx src/scripts/interactive-error-fixing.ts demo   # エラー分析デモ実行');
      break;
  }
}

// ES Moduleで直接実行される場合の判定
if (process.argv[1] && process.argv[1].endsWith('interactive-error-fixing.ts')) {
  main().catch(console.error);
}

export { InteractiveErrorFixingSystem };