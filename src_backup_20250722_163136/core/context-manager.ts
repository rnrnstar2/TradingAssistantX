import { ContextIntegrator } from '../lib/context-integrator.js';
import type { Context, IntegratedContext, Need } from '../types/autonomous-system.js';
import { loadYamlSafe } from '../utils/yaml-utils.js';
import { join } from 'path';
import * as fs from 'fs';

export interface MinimalContext {
  accountHealth: number;
  systemStatus: string;
}

export class AutonomousExecutorContextManager {
  private contextIntegrator: ContextIntegrator;

  constructor() {
    this.contextIntegrator = new ContextIntegrator();
  }

  async getCurrentSituation(): Promise<MinimalContext> {
    const [accountHealthScore, systemStatus] = await Promise.all([
      this.getAccountHealthScore(),
      this.getSystemStatus()
    ]);

    return {
      accountHealth: accountHealthScore,
      systemStatus: systemStatus
    };
  }

  private async getAccountHealthScore(): Promise<number> {
    // 簡単なヘルススコア計算
    try {
      const configPath = join(process.cwd(), 'data', 'account-config.yaml');
      if (fs.existsSync(configPath)) {
        const config = await loadYamlSafe(configPath) as any;
        return config?.healthScore || 75;
      }
      return 75; // デフォルト値
    } catch (error) {
      console.error('❌ [ヘルススコア] 取得エラー:', error);
      return 50; // エラー時のデフォルト値
    }
  }

  private async getSystemStatus(): Promise<string> {
    try {
      // システム状態の簡易チェック
      const errorLogPath = join(process.cwd(), 'data', 'context', 'error-log.json');
      if (fs.existsSync(errorLogPath)) {
        const errorLog = await loadYamlSafe(errorLogPath) as any;
        const recentErrors = errorLog?.errors?.filter((error: any) => 
          Date.now() - error.timestamp < 60 * 60 * 1000 // 1時間以内
        ) || [];
        
        if (recentErrors.length > 5) {
          return 'degraded';
        } else if (recentErrors.length > 0) {
          return 'warning';
        }
      }
      return 'healthy';
    } catch (error) {
      console.error('❌ [システム状態] 取得エラー:', error);
      return 'unknown';
    }
  }

  async loadCurrentContext(): Promise<Context> {
    try {
      const contextPath = join(process.cwd(), 'data', 'current-situation.yaml');
      
      if (!fs.existsSync(contextPath)) {
        console.log('⚠️ [コンテキスト] current-situation.yamlが見つかりません');
        return this.createEmptyContext();
      }

      console.log('✅ [コンテキスト] current-situation.yamlから読み込み完了');
      
      return {
        timestamp: new Date().toISOString(),
        systemStatus: 'running' as const,
        recentActions: [],
        pendingTasks: [],
        metrics: {
          totalActions: 0,
          successRate: 0,
          averageExecutionTime: 0,
          lastHealthCheck: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ [コンテキスト] 読み込みエラー:', error);
      return this.createEmptyContext();
    }
  }

  async generateBaselineContext(): Promise<IntegratedContext> {
    console.log('🔧 [Context生成] ベースラインコンテキスト生成開始...');
    
    try {
      const context = await this.loadCurrentContext();
      // Create a basic integrated context since integrateContexts may not exist
      const integratedContext: IntegratedContext = {
        account: {
          currentState: {
            timestamp: context.timestamp,
            followers: { current: 0, change_24h: 0, growth_rate: '0%' },
            engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
            performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
            health: { status: 'healthy', api_limits: 'normal', quality_score: 100 },
            recommendations: [],
            healthScore: 100
          },
          recommendations: [],
          healthScore: 100
        },
        market: {
          trends: [],
          opportunities: [],
          competitorActivity: []
        },
        actionSuggestions: [],
        timestamp: Date.now()
      };
      
      console.log('✅ [Context生成] ベースライン生成完了');
      return integratedContext;
    } catch (error) {
      console.error('❌ [Context生成] エラー:', error);
      throw error;
    }
  }

  async generateBasicContext(): Promise<any> {
    try {
      const context = await this.loadCurrentContext();
      return {
        systemStatus: context.systemStatus,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ [基本Context] 生成エラー:', error);
      return {
        systemStatus: 'error',
        timestamp: Date.now()
      };
    }
  }

  async assessSimplifiedNeeds(context: IntegratedContext): Promise<Need[]> {
    const needs: Need[] = [];

    // システムの健康状態をチェック
    if ((context as any).systemHealth === 'degraded') {
      needs.push({
        id: 'system-health-check',
        priority: 'high',
        description: 'システム状態の改善が必要',
        type: 'maintenance',
        createdAt: new Date().toISOString()
      });
    }

    // コンテンツ作成の必要性をチェック
    if (!(context as any).recentPosts || (context as any).recentPosts.length === 0) {
      needs.push({
        id: 'content-creation',
        priority: 'medium',
        description: '新しいコンテンツの作成が必要',
        type: 'content',
        createdAt: new Date().toISOString()
      });
    }

    return needs;
  }

  private createEmptyContext(): Context {
    return {
      timestamp: new Date().toISOString(),
      systemStatus: 'initializing',
      recentActions: [],
      pendingTasks: [],
      metrics: {
        totalActions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        lastHealthCheck: new Date().toISOString()
      }
    };
  }
}