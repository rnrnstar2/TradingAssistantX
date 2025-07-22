import 'dotenv/config';
import { ClaudeControlledCollector } from '../lib/claude-controlled-collector.js';
import { GrowthSystemManager } from '../lib/growth-system-manager.js';
import { PostingManager } from '../lib/posting-manager.js';
import { XPerformanceAnalyzer } from '../lib/x-performance-analyzer.js';
import { ExpandedActionExecutor } from '../lib/expanded-action-executor.js';
import { DailyActionPlanner } from '../lib/daily-action-planner.js';
import { SimpleXClient } from '../lib/x-client.js';
import type { Action, Result, Task } from '../types/autonomous-system.js';
import type { ActionDecision, ActionResult } from '../types/action-types';
import * as yaml from 'js-yaml';

export class ParallelManager {
  private collector: ClaudeControlledCollector;
  private growthManager: GrowthSystemManager;
  private postingManager: PostingManager;
  private performanceAnalyzer: XPerformanceAnalyzer;
  private expandedActionExecutor: ExpandedActionExecutor;
  private dailyActionPlanner: DailyActionPlanner;
  private xClient: SimpleXClient;

  constructor(claudeAgent?: any) {
    this.collector = new ClaudeControlledCollector();
    this.growthManager = new GrowthSystemManager();
    
    // Initialize X Client and PostingManager (OAuth 2.0) - using singleton
    this.xClient = SimpleXClient.getInstance();
    this.postingManager = new PostingManager(undefined, undefined, claudeAgent);
    
    // Initialize expanded action components
    this.expandedActionExecutor = new ExpandedActionExecutor(this.xClient, this.postingManager);
    // ✅ ClaudeAutonomousAgentインスタンスを共有
    this.dailyActionPlanner = new DailyActionPlanner(claudeAgent);
    
    this.performanceAnalyzer = new XPerformanceAnalyzer();
  }

  async executeActions(actions: Action[]): Promise<Result[]> {
    console.log(`🚀 [アクション実行開始] ${actions.length}件のアクションを処理開始`);
    actions.forEach((action, index) => {
      console.log(`   ${index + 1}. 【${action.type}】(${action.priority})`);
    });
    
    const tasks = actions.map(action => this.convertActionToTask(action));
    
    const validTasks = tasks.filter((task): task is Task => task !== null);
    const invalidCount = tasks.length - validTasks.length;
    
    if (invalidCount > 0) {
      console.log(`⚠️  [タスク変換] ${invalidCount}件のアクションは未対応のため無視`);
    }
    
    console.log(`✅ [タスク変換完了] ${validTasks.length}件のタスクを並列実行`);
    
    const results = await this.executeInParallel(validTasks);
    
    console.log(`🎯 [実行完了] ${results.length}件の結果を取得`);
    results.forEach((result, index) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.taskId || 'unknown'}`);
    });
    
    return results;
  }

  async executeInParallel(tasks: Task[]): Promise<Result[]> {
    await this.initializeDataSharing(tasks);
    
    const results = await Promise.allSettled(
      tasks.map(task => this.executeWithDataSharing(task))
    );
    
    return this.integrateResults(results, tasks);
  }

  private convertActionToTask(action: Action): Task | null {
    const taskExecutors: Record<string, () => Promise<any>> = {
      'content_collection': () => this.executeContentCollection(action),
      'content_creation': () => this.executeContentCreation(action),
      'post_immediate': () => this.executePostImmediate(action),
      'performance_analysis': () => this.executePerformanceAnalysis(action),
      'engagement_analysis': () => this.executeEngagementAnalysis(action),
      'growth_analysis': () => this.executeGrowthAnalysis(action),
      'timing_optimization': () => this.executeTimingOptimization(action),
      'data_cleanup': () => this.executeDataCleanup(action)
    };
    
    const executor = taskExecutors[action.type];
    if (!executor) return null;
    
    return {
      id: action.id,
      actionId: action.id,
      type: action.type,
      priority: action.priority,
      executor,
      status: 'pending',
      createdAt: action.createdAt
    };
  }

  private async executeContentCollection(_action: Action): Promise<any> {
    console.log('🌐 [情報収集開始] Playwright + Claude自律収集システム起動');
    
    // ClaudeControlledCollector doesn't have parameters - it explores autonomously
    const results = await this.collector.performParallelCollection();
    
    console.log(`📊 [情報収集完了] ${results.length}件のデータを収集`);
    results.forEach((data, index) => {
      console.log(`  ${index + 1}. ${data.content?.substring(0, 50) || 'No content'}...`);
    });
    
    return results;
  }
  
  private async executeContentCreation(_action: Action): Promise<any> {
    console.log('✍️ [コンテンツ生成開始] Claude主導コンテンツ作成');
    
    const prompt = `
Generate a valuable and engaging social media post.
Focus on providing useful insights, educational content, or thought-provoking questions.
Keep it under 280 characters.
Write in Japanese.
Adapt the content style to match the account's theme and target audience.
`;
    
    try {
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      const content = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();
        
      if (content) {
        console.log('📝 [生成完了] コンテンツ:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        return { content, length: content.length };
      }
    } catch (error) {
      console.error('❌ [生成エラー] コンテンツ生成に失敗:', error);
    }
    
    return null;
  }

  private async executePostImmediate(action: Action): Promise<any> {
    console.log('📱 [即座投稿開始] X投稿システム起動');
    
    const params = action.params || {};
    let content = params.content;
    
    if (!content) {
      console.log('📝 [コンテンツ生成] 新規投稿コンテンツを生成中...');
      
      // Generate content using Claude
      const prompt = `
Generate a valuable and engaging social media post.
Focus on providing useful insights, educational content, or thought-provoking questions.
Keep it under 280 characters.
Write in Japanese.
Adapt the content style to match the account's theme and target audience.
`;
      
      try {
        const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
        content = await claude()
          .withModel('sonnet')
          .query(prompt)
          .asText();
          
        if (content) {
          console.log('📝 [生成完了] 投稿内容:', content);
        }
      } catch (error) {
        console.error('❌ [生成エラー]:', error);
        return null;
      }
    } else {
      console.log('📝 [既存コンテンツ] 投稿内容:', content);
    }
    
    if (content) {
      console.log('🚀 [投稿実行中] X APIに送信...');
      const result = await this.postingManager.postNow(content);
      
      if (result) {
        console.log('✅ [投稿完了] 投稿に成功しました');
        console.log(`📊 [投稿詳細] 文字数: ${content.length}, 内容: "${content}"`);
      } else {
        console.log('❌ [投稿失敗] 投稿に失敗しました');
      }
      
      return result;
    }
    
    return null;
  }

  private async executePerformanceAnalysis(action: Action): Promise<any> {
    console.log('📈 [パフォーマンス分析開始] X アカウント詳細分析中...');
    
    const username = action.params?.username || process.env.X_USERNAME || 'default_user';
    
    try {
      const result = await this.performanceAnalyzer.performFullAnalysis(username);
      
      console.log('📊 [分析完了] 包括的パフォーマンス分析を実行');
      console.log(`📋 [フォロワー数] ${result.accountMetrics.followers_count}`);
      console.log(`📋 [エンゲージメント率] ${result.engagement.averageEngagementRate?.toFixed(2) || 'N/A'}%`);
      console.log(`📋 [最近の投稿数] ${result.recentPosts.length}件`);
      
      // Save performance report
      await this.savePerformanceReport(result);
      
      return result;
    } catch (error) {
      console.error('❌ [分析エラー] パフォーマンス分析に失敗:', error);
      return null;
    }
  }

  private async executeEngagementAnalysis(action: Action): Promise<any> {
    console.log('💬 [エンゲージメント分析開始] エンゲージメント詳細分析中...');
    
    const username = action.params?.username || process.env.X_USERNAME || 'default_user';
    
    try {
      const recentPosts = await this.performanceAnalyzer.analyzeRecentPosts(username, 20);
      const engagement = await this.performanceAnalyzer.calculateEngagementRate(recentPosts);
      
      console.log('💬 [エンゲージメント分析完了] 詳細エンゲージメント指標を算出');
      console.log(`📊 [平均エンゲージメント率] ${engagement.averageEngagementRate?.toFixed(2) || 'N/A'}%`);
      console.log(`📈 [トレンド] ${engagement.engagementTrend}`);
      console.log(`⏰ [最適投稿時間] ${engagement.optimalPostingTimes?.join(', ') || 'データなし'}`);
      
      return {
        recentPosts,
        engagement,
        analysisType: 'engagement_analysis',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [エンゲージメント分析エラー]:', error);
      return null;
    }
  }

  private async executeGrowthAnalysis(action: Action): Promise<any> {
    console.log('📊 [成長分析開始] フォロワー成長動向分析中...');
    
    const username = action.params?.username || process.env.X_USERNAME || 'default_user';
    
    try {
      const accountMetrics = await this.performanceAnalyzer.analyzeAccountMetrics(username);
      const followerMetrics = await this.performanceAnalyzer.analyzeFollowerTrends(username);
      
      console.log('📊 [成長分析完了] フォロワー成長指標を算出');
      console.log(`👥 [現在のフォロワー数] ${followerMetrics.currentCount}`);
      console.log(`📈 [成長率] ${followerMetrics.growthRate}%`);
      console.log(`📊 [トレンド] ${followerMetrics.growthTrend}`);
      
      return {
        accountMetrics,
        followerMetrics,
        analysisType: 'growth_analysis',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [成長分析エラー]:', error);
      return null;
    }
  }

  private async executeTimingOptimization(action: Action): Promise<any> {
    console.log('⏰ [タイミング最適化開始] 投稿タイミング戦略を調整中...');
    
    // Use optimizeStrategy which includes timing optimization
    const result = await this.growthManager.optimizeStrategy();
    
    console.log('✅ [最適化完了] 新しい投稿戦略を策定');
    
    return result;
  }

  private async executeDataCleanup(action: Action): Promise<any> {
    console.log('🧹 [データクリーンアップ開始] 古いデータファイルを整理中...');
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const dataDir = path.join(process.cwd(), 'data');
    const maxAge = action.params?.maxAgeHours || 24;
    
    const cleanupTargets = [
      'context/execution-history.yaml',
      'strategic-decisions.yaml',
      'communication/claude-to-claude.json'
    ];
    
    let cleanedCount = 0;
    
    for (const target of cleanupTargets) {
      try {
        const filePath = path.join(dataDir, target);
        const data = await fs.readFile(filePath, 'utf-8');
        // ファイル拡張子に応じてパーサーを選択
        const parsed = target.endsWith('.yaml') || target.endsWith('.yml') 
          ? yaml.load(data) 
          : JSON.parse(data);
        
        if (Array.isArray(parsed)) {
          const originalCount = parsed.length;
          const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);
          const filtered = parsed.filter((item: any) => {
            const timestamp = new Date(item.timestamp || item.createdAt);
            return timestamp > cutoff;
          });
          
          await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
          const removedCount = originalCount - filtered.length;
          
          console.log(`📁 [${target}] ${removedCount}件の古いデータを削除 (${originalCount} → ${filtered.length})`);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`❌ [クリーンアップエラー] ${target}:`, error);
      }
    }
    
    console.log(`✅ [クリーンアップ完了] ${cleanedCount}/${cleanupTargets.length}ファイルを整理`);
    
    return { cleaned: cleanedCount, targets: cleanupTargets.length };
  }

  private async executeWithDataSharing(task: Task): Promise<any> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const statusPath = path.join(process.cwd(), 'data', 'communication', 'execution-status.json');
    
    try {
      const statusData = {
        taskId: task.id,
        type: task.type,
        status: 'running',
        startedAt: new Date().toISOString()
      };
      
      let statuses = [];
      try {
        const existing = await fs.readFile(statusPath, 'utf-8');
        statuses = JSON.parse(existing);
      } catch {
        // File doesn't exist
      }
      
      statuses.push(statusData);
      
      await fs.mkdir(path.dirname(statusPath), { recursive: true });
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      const result = await task.executor();
      
      const completedStatus = {
        ...statusData,
        status: 'completed',
        completedAt: new Date().toISOString(),
        resultSummary: this.summarizeResult(result)
      };
      
      statuses = statuses.map((s: any) => 
        s.taskId === task.id ? completedStatus : s
      );
      
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      return result;
    } catch (error) {
      const errorStatus = {
        taskId: task.id,
        type: task.type,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString()
      };
      
      let statuses = [];
      try {
        const existing = await fs.readFile(statusPath, 'utf-8');
        statuses = JSON.parse(existing);
      } catch {
        // File doesn't exist
      }
      
      statuses = statuses.map((s: any) => 
        s.taskId === task.id ? errorStatus : s
      );
      
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      throw error;
    }
  }

  private integrateResults(
    results: PromiseSettledResult<any>[],
    tasks: Task[]
  ): Result[] {
    return results.map((result, index) => {
      const task = tasks[index];
      
      if (result.status === 'fulfilled') {
        return {
          id: `result-${task.id}`,
          taskId: task.id,
          actionId: task.actionId,
          status: 'success',
          data: result.value,
          completedAt: new Date().toISOString()
        };
      } else {
        return {
          id: `result-${task.id}`,
          taskId: task.id,
          actionId: task.actionId,
          status: 'failed',
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          completedAt: new Date().toISOString()
        };
      }
    });
  }

  private async initializeDataSharing(tasks: Task[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const communicationPath = path.join(process.cwd(), 'data', 'communication', 'claude-to-claude.json');
    
    const initData = {
      sessionId: `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      plannedTasks: tasks.map(t => ({
        id: t.id,
        type: t.type,
        priority: t.priority
      }))
    };
    
    await fs.mkdir(path.dirname(communicationPath), { recursive: true });
    await fs.writeFile(communicationPath, JSON.stringify(initData, null, 2));
  }

  private summarizeResult(result: any): any {
    if (!result) return null;
    
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      if (keys.length > 5) {
        return {
          _summary: 'large_object',
          keyCount: keys.length,
          sampleKeys: keys.slice(0, 5)
        };
      }
      return result;
    }
    
    if (typeof result === 'string' && result.length > 200) {
      return {
        _summary: 'long_string',
        length: result.length,
        preview: result.substring(0, 100) + '...'
      };
    }
    
    return result;
  }

  private async savePerformanceReport(result: any): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), 'data', 'performance-reports', `performance-${timestamp}.md`);
    
    const reportContent = `# X アカウント パフォーマンス分析報告書

## 📊 基本指標
- フォロワー数: ${result.accountMetrics.followers_count}
- フォロー数: ${result.accountMetrics.following_count}
- 投稿総数: ${result.accountMetrics.tweet_count}
- エンゲージメント率: ${result.engagement.averageEngagementRate.toFixed(2)}%
- 分析時刻: ${result.analysisTimestamp}

## 📈 パフォーマンス分析
- 最高パフォーマンス投稿: "${result.engagement.bestPerformingPost.content.substring(0, 50)}..."
- エンゲージメント率: ${result.engagement.bestPerformingPost.engagementRate.toFixed(2)}%
- トレンド: ${result.engagement.engagementTrend}
- 最適投稿時間: ${result.engagement.optimalPostingTimes.join(', ')}

## 📋 最近の投稿データ (${result.recentPosts.length}件)
${result.recentPosts.slice(0, 5).map((post: any, index: number) => `
${index + 1}. "${post.content.substring(0, 80)}..."
   - いいね: ${post.likes}, RT: ${post.retweets}, 返信: ${post.replies}
   - エンゲージメント率: ${post.engagementRate.toFixed(2)}%`).join('')}

## 🎯 推奨改善点
${result.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## 📊 フォロワー動向
- 現在のフォロワー数: ${result.followerMetrics.currentCount}
- 成長率: ${result.followerMetrics.growthRate}%
- 成長トレンド: ${result.followerMetrics.growthTrend}
- エンゲージメント品質: ${result.followerMetrics.engagementQuality}

---
*このレポートは Claude Code 自律実行システムにより自動生成されました*
`;

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, reportContent);
    
    console.log(`📄 [レポート保存] ${reportPath} に保存完了`);
  }

  // 拡張アクション実行システム
  async executeExpandedActions(decisions: ActionDecision[]): Promise<ActionResult[]> {
    console.log(`🚀 [拡張アクション実行開始] ${decisions.length}件の多様なアクションを並列処理`);
    
    // 日次配分プランの確認
    const distribution = await this.dailyActionPlanner.planDailyDistribution();
    console.log(`📋 [固定15回システム] スケジュール実行時必須投稿`);
    
    // 🚨 削除: 投稿停止チェックを削除（スケジュール時は必ず実行）
    
    // 実行可能な決定を選択（残り回数を考慮）
    const executableDecisions = decisions.slice(0, distribution.remaining);
    console.log(`🎯 [実行対象] ${executableDecisions.length}件のアクションを実行予定`);
    
    const actionTasks = executableDecisions.map(decision => ({
      id: decision.id,
      task: this.createActionTask(decision)
    }));
    
    // API制限を考慮した並列実行
    const batchSize = 3; // 同時実行数制限
    const results: ActionResult[] = [];
    
    for (let i = 0; i < actionTasks.length; i += batchSize) {
      const batch = actionTasks.slice(i, i + batchSize);
      console.log(`📦 [バッチ実行] ${i + 1}-${i + batch.length}/${actionTasks.length} (${batch.length}件同時実行)`);
      
      const batchPromises = batch.map(actionTask => this.executeActionTask(actionTask));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 結果の処理
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const originalDecision = executableDecisions[i + j];
        
        if (result.status === 'fulfilled') {
          const actionResult = result.value;
          results.push(actionResult);
          
          // 実行記録をDailyActionPlannerに保存
          await this.dailyActionPlanner.recordAction(actionResult);
          
          console.log(`✅ [アクション完了] ${actionResult.type} - ${actionResult.success ? '成功' : '失敗'}`);
        } else {
          const errorResult: ActionResult = {
            success: false,
            actionId: originalDecision.id,
            type: originalDecision.type,
            timestamp: Date.now(),
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          };
          results.push(errorResult);
          
          console.log(`❌ [アクション失敗] ${originalDecision.type} - ${errorResult.error}`);
        }
      }
      
      // バッチ間の待機（API制限対応）
      if (i + batchSize < actionTasks.length) {
        console.log('⏰ [API制限対応] 3秒待機中...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 実行結果のサマリー
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`🎯 [拡張アクション実行完了] ${successCount}成功, ${failureCount}失敗 (計${results.length}件)`);
    
    // アクション型別の実行結果表示
    const breakdown = this.calculateActionBreakdown(results);
    console.log('📊 [実行配分]', breakdown);
    
    // 今日の進捗確認
    const todayProgress = await this.dailyActionPlanner.getTodayProgress();
    console.log(`📈 [日次進捗] ${todayProgress.completed}/${todayProgress.target}回 (${todayProgress.progress}%)`);
    
    return results;
  }

  // アクションタスクの作成
  private createActionTask(decision: ActionDecision): () => Promise<ActionResult> {
    return async () => {
      console.log(`🔄 [アクションタスク実行] ${decision.type} - ${decision.reasoning}`);
      
      try {
        switch (decision.type) {
          case 'original_post':
            return await this.executeExpandedPost(decision);
          default:
            throw new Error(`Unknown action type: ${decision.type}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [アクションタスクエラー] ${decision.type}:`, errorMessage);
        
        return {
          success: false,
          actionId: decision.id,
          type: decision.type,
          timestamp: Date.now(),
          error: errorMessage
        };
      }
    };
  }

  // アクションタスクの実行
  private async executeActionTask(actionTask: { id: string; task: () => Promise<ActionResult> }): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      const result = await actionTask.task();
      
      // タスク完了ログを削除
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ [タスク失敗] ${actionTask.id} - ${duration}ms - ${errorMessage}`);
      throw error;
    }
  }

  // 拡張オリジナル投稿実行
  private async executeExpandedPost(decision: ActionDecision): Promise<ActionResult> {
    console.log('📝 [拡張投稿実行] オリジナルコンテンツ投稿を実行中...');
    
    return await this.expandedActionExecutor.executeAction(decision);
  }


  // アクション配分の計算
  private calculateActionBreakdown(results: ActionResult[]): any {
    const breakdown = {
      original_post: { success: 0, failure: 0 }
    };
    
    results.forEach(result => {
      if (breakdown.hasOwnProperty(result.type)) {
        const category = result.success ? 'success' : 'failure';
        (breakdown as any)[result.type][category]++;
      }
    });
    
    return breakdown;
  }

  // 拡張アクション統計の取得
  async getExpandedActionStats(days: number = 7): Promise<any> {
    console.log(`📊 [拡張アクション統計] 過去${days}日間の拡張アクション統計を取得中...`);
    
    const stats = await this.dailyActionPlanner.getActionStats(days);
    const todayProgress = await this.dailyActionPlanner.getTodayProgress();
    
    return {
      ...stats,
      todayProgress,
      dailyTarget: 15,
      systemVersion: 'expanded_actions_v1.0'
    };
  }
}