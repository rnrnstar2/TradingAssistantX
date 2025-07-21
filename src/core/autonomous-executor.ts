import { DecisionEngine } from './decision-engine.js';
import { ParallelManager } from './parallel-manager.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Need, Action, Context, IntegratedContext } from '../types/autonomous-system.js';
import type { ActionDecision } from '../types/action-types.js';
import { HealthChecker } from '../utils/monitoring/health-check.js';
import { AccountAnalyzer, AccountStatus } from '../lib/account-analyzer.js';
import { SimpleXClient } from '../lib/x-client.js';
import { EnhancedInfoCollector } from '../lib/enhanced-info-collector.js';
import { ContextIntegrator } from '../lib/context-integrator.js';
import { DailyActionPlanner } from '../lib/daily-action-planner.js';

export enum ExecutionMode {
  SCHEDULED_POSTING = 'scheduled_posting',  // 定期投稿モード
  DYNAMIC_ANALYSIS = 'dynamic_analysis'     // 動的判断モード
}

export class AutonomousExecutor {
  private decisionEngine: DecisionEngine;
  private parallelManager: ParallelManager;
  private healthChecker: HealthChecker;
  private accountAnalyzer: AccountAnalyzer;
  private enhancedInfoCollector: EnhancedInfoCollector;
  private contextIntegrator: ContextIntegrator;
  private dailyActionPlanner: DailyActionPlanner;
  private mode: ExecutionMode = ExecutionMode.SCHEDULED_POSTING;

  constructor() {
    this.decisionEngine = new DecisionEngine();
    this.parallelManager = new ParallelManager();
    this.healthChecker = new HealthChecker();
    this.enhancedInfoCollector = new EnhancedInfoCollector();
    this.contextIntegrator = new ContextIntegrator();
    this.dailyActionPlanner = new DailyActionPlanner();
    
    // X Client を初期化してAccountAnalyzerに渡す
    const apiKey = process.env.X_API_KEY || '';
    const xClient = new SimpleXClient(apiKey);
    this.accountAnalyzer = new AccountAnalyzer(xClient);
  }

  async executeAutonomously(): Promise<void> {
    try {
      console.log('🚀 [最適化ワークフロー開始] 統合された自律実行システムを起動...');
      
      // Step 1: システム起動・ヘルスチェック
      console.log('🏥 [Step 1] システム起動・ヘルスチェック');
      const isCritical = await this.healthChecker.isCritical();
      if (isCritical) {
        console.log('⚠️ システムクリティカル状態 - 実行停止');
        return;
      }

      // Step 2: 並列分析・情報収集（重要な改善）
      console.log('🔄 [Step 2] 並列実行開始: アカウント分析 & 情報収集');
      const [accountStatus, collectionResults] = await Promise.all([
        this.accountAnalyzer.analyzeCurrentStatus(),    // 新機能
        this.enhancedInfoCollector.collectInformation() // 序盤移動
      ]);

      // Step 3: 統合コンテキスト生成
      console.log('🧠 [Step 3] 統合分析: コンテキスト生成中...');
      const integratedContext = await this.contextIntegrator.integrateAnalysisResults(
        accountStatus, 
        collectionResults
      );

      // Step 4: 簡素化されたニーズ評価
      console.log('📊 [Step 4] 簡素化評価: 1日15投稿目標ベース判定');
      const simplifiedNeeds = await this.assessSimplifiedNeeds(integratedContext);

      // Step 5: 拡張意思決定
      console.log('🎯 [Step 5] 拡張意思決定: 多様なアクション計画');
      const actionDecisions = await this.decisionEngine.planExpandedActions(integratedContext);

      // Step 6: 1日15回最適配分
      console.log('⚖️ [Step 6] 最適配分: 本日のアクション配分計算');
      const dailyPlan = await this.dailyActionPlanner.planDailyDistribution();
      const optimizedDecisions = this.optimizeDecisionsForDaily(actionDecisions, dailyPlan);

      // Step 7: 拡張アクション実行
      console.log('🚀 [Step 7] 拡張実行: 投稿/引用/RT/リプライ実行');
      const results = await this.parallelManager.executeExpandedActions(optimizedDecisions);

      // Step 8: 結果保存・次回時間決定
      await this.saveExecutionResults(integratedContext, results);
      const nextExecutionTime = await this.determineNextExecutionTime(integratedContext);
      
      console.log(`✅ [完了] 次回実行: ${this.formatNextExecutionTime(nextExecutionTime)}`);
      
    } catch (error) {
      console.error('❌ [実行エラー]', error);
      await this.handleExecutionError(error);
    }
  }

  private async executeScheduledPosting(): Promise<void> {
    // 直接投稿実行（ニーズ分析スキップ）
    const postingAction = this.createDirectPostingAction();
    
    // メンテナンス系ニーズのみ分析
    const context = await this.loadCurrentContext();
    const maintenanceNeeds = await this.assessMaintenanceNeeds(context);
    const maintenanceActions = await this.decisionEngine.planActions(maintenanceNeeds);
    
    // 並列実行: 投稿 + メンテナンス
    const allActions = [postingAction, ...maintenanceActions];
    await this.parallelManager.executeActions(allActions);
    
    await this.saveExecutionResultsLegacy(allActions);
  }

  private async executeDynamicAnalysis(): Promise<void> {
    const context = await this.loadCurrentContext();
    const needs = await this.assessCurrentNeeds(context);
    const actions = await this.decisionEngine.planActions(needs);
    await this.parallelManager.executeActions(actions);
    await this.saveExecutionResultsLegacy(actions);
  }

  private createDirectPostingAction(): Action {
    return {
      id: `action-${Date.now()}-posting`,
      type: 'content_creation_and_post',
      priority: 'high',
      params: {
        mode: 'scheduled',
        skipDuplicateCheck: false,
        enforcePostingLimits: true
      },
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // 簡素化されたニーズ評価（複雑性削除）
  private async assessSimplifiedNeeds(context: IntegratedContext): Promise<Need[]> {
    const needs: Need[] = [];
    
    // シンプルな時間ベース判定（96分間隔計算を削除）
    const currentTime = Date.now();
    const lastActionTime = (context.account.currentState as any)?.currentMetrics?.lastTweetTime || 0;
    const timeSinceLastPost = currentTime - lastActionTime;
    const shouldPost = timeSinceLastPost > (60 * 60 * 1000); // 1時間以上経過
    
    if (shouldPost) {
      needs.push({
        id: `need-${Date.now()}-action`,
        type: 'content',
        priority: 'high',
        description: 'Ready for next daily action',
        context: { 
          timeSinceLastPost, 
          dailyProgress: (context.account as any).dailyProgress 
        },
        createdAt: new Date().toISOString()
      });
    }
    
    // 追加的なメンテナンスニーズ評価
    if (context.market.opportunities.length > 5) {
      needs.push({
        id: `need-${Date.now()}-opportunity`,
        type: 'optimization',
        priority: 'medium',
        description: 'High number of market opportunities available',
        context: { 
          opportunityCount: context.market.opportunities.length 
        },
        createdAt: new Date().toISOString()
      });
    }
    
    return needs;
  }

  private async assessMaintenanceNeeds(context: Context): Promise<Need[]> {
    const prompt = `
Current system context:
${JSON.stringify(context, null, 2)}

Analyze ONLY maintenance, optimization and information collection needs.
IGNORE content posting needs (handled separately in scheduled mode).

REQUIRED NEED TYPES (choose one):
- "maintenance": Data cleanup, file management, system health
- "optimization": Performance improvements, efficiency gains  
- "information_collection": Trend analysis, market data gathering

Return ONLY a JSON array of need objects with exact structure:
[{"id":"need-timestamp-random","type":"maintenance|optimization|information_collection","priority":"high|medium|low","description":"detailed description","context":{},"createdAt":"ISO timestamp"}]
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonText);
    } catch {
      return [];
    }
  }

  private async assessCurrentNeeds(context: Context): Promise<Need[]> {
    const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Analyze and identify what needs to be done with the following EXACT JSON structure.
Each need MUST include all required fields:

REQUIRED NEED FORMAT:
{
  "id": "need-[timestamp]-[random]",
  "type": "[one of: content, immediate, maintenance, optimization]",
  "priority": "[one of: high, medium, low]",
  "description": "detailed description of what needs to be done",
  "context": {},
  "createdAt": "[ISO timestamp]"
}

Return ONLY a JSON array of need objects. No markdown, no explanation.
Example: [{"id":"need-123-abc","type":"content","priority":"high","description":"Collect trending content","context":{},"createdAt":"2025-07-20T15:10:00.000Z"}]
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonText);
    } catch {
      return [];
    }
  }

  // 1日15回最適配分との調整
  private optimizeDecisionsForDaily(actionDecisions: ActionDecision[], dailyPlan: any): ActionDecision[] {
    console.log('⚖️ [配分最適化] 日次計画に基づく決定調整中...');
    
    if (dailyPlan.remaining <= 0) {
      console.log('✅ [配分完了] 本日の目標達成済み、実行をスキップ');
      return [];
    }
    
    // 残り回数に基づいて決定を制限
    const optimizedDecisions = actionDecisions.slice(0, dailyPlan.remaining);
    
    // 最適配分に基づいて優先度調整
    const typeWeights = {
      'original_post': 0.6,
      'quote_tweet': 0.25,
      'retweet': 0.10,
      'reply': 0.05
    };
    
    optimizedDecisions.forEach(decision => {
      const weight = (typeWeights as any)[decision.type] || 0.1;
      decision.priority = this.adjustPriorityByWeight(decision.priority, weight) as any;
    });
    
    console.log(`📊 [配分調整完了] ${optimizedDecisions.length}/${actionDecisions.length}件の決定を選択`);
    
    return optimizedDecisions;
  }
  
  // 優先度の重み調整
  private adjustPriorityByWeight(priority: string, weight: number): string {
    if (weight >= 0.5) return 'high';
    if (weight >= 0.2) return priority === 'low' ? 'medium' : priority;
    return priority;
  }

  // 次回実行時間の決定
  private async determineNextExecutionTime(integratedContext: IntegratedContext): Promise<number> {
    console.log('⏰ [次回実行時間決定] 統合コンテキストに基づく動的間隔計算...');
    
    const baseInterval = 96; // 分 (1日15投稿の基準間隔)
    let adjustedInterval = baseInterval;
    
    // アカウントヘルスに基づく調整
    if (integratedContext.account.healthScore < 50) {
      adjustedInterval *= 1.5; // ヘルス低下時は間隔を延ばす
    } else if (integratedContext.account.healthScore > 80) {
      adjustedInterval *= 0.8; // ヘルス良好時は間隔を短縮
    }
    
    // 市場機会に基づく調整
    const highPriorityOpportunities = integratedContext.market.opportunities
      .filter(op => op.priority === 'high').length;
    
    if (highPriorityOpportunities > 3) {
      adjustedInterval *= 0.7; // 機会多数時は間隔短縮
    }
    
    const nextExecutionTime = Date.now() + (adjustedInterval * 60 * 1000);
    
    console.log(`⏰ [次回実行時間決定完了] ${adjustedInterval}分後に実行予定`);
    
    return nextExecutionTime;
  }
  
  // 次回実行時間のフォーマット
  private formatNextExecutionTime(nextExecutionTime: number): string {
    const nextDate = new Date(nextExecutionTime);
    const now = new Date();
    const diffMinutes = Math.round((nextExecutionTime - now.getTime()) / (60 * 1000));
    
    return `${nextDate.toLocaleString('ja-JP')} (${diffMinutes}分後)`;
  }

  // 拡張アクション実行（多様な出口戦略）
  private async executeExpandedActions(
    decisions: any[], 
    integratedContext: IntegratedContext
  ): Promise<void> {
    console.log('🎯 [拡張アクション] 多様な出口戦略を実行中...');
    
    try {
      // アクション種別の分布を分析
      const actionDistribution = this.analyzeActionDistribution(decisions, integratedContext);
      console.log('📊 [アクション分布]:', actionDistribution);
      
      // 優先度順でアクションを実行
      const prioritizedActions = this.prioritizeActions(decisions);
      
      for (const action of prioritizedActions) {
        try {
          await this.executeSpecificAction(action, integratedContext);
          // アクション間に適切な間隔を設ける
          await this.waitBetweenActions(action);
        } catch (actionError) {
          console.error(`❌ [アクション実行エラー] ${action.type}:`, actionError);
          // 個別のアクション失敗は全体を停止させない
        }
      }
      
      console.log('✅ [拡張アクション完了] 全アクションの実行を完了');
    } catch (error) {
      console.error('❌ [拡張アクション総合エラー]:', error);
    }
  }
  
  // 次回実行スケジュール決定
  private async scheduleNextExecution(integratedContext: IntegratedContext): Promise<void> {
    console.log('⏰ [スケジュール決定] 次回実行時間を決定中...');
    
    try {
      // アカウント状況と市場状況に基づく動的間隔決定
      const baseInterval = 96; // 分 (1日15投稿の基準間隔)
      
      let adjustedInterval = baseInterval;
      
      // アカウントヘルスに基づく調整
      if (integratedContext.account.healthScore < 50) {
        adjustedInterval *= 1.5; // ヘルス低下時は間隔を延ばす
      } else if (integratedContext.account.healthScore > 80) {
        adjustedInterval *= 0.8; // ヘルス良好時は間隔を短縮
      }
      
      // 市場機会に基づく調整
      const highPriorityOpportunities = integratedContext.market.opportunities
        .filter(op => op.priority === 'high').length;
      
      if (highPriorityOpportunities > 3) {
        adjustedInterval *= 0.7; // 機会多数時は間隔短縮
      }
      
      const nextExecutionTime = Date.now() + (adjustedInterval * 60 * 1000);
      
      console.log(`⏰ [スケジュール決定完了] 次回実行: ${adjustedInterval}分後`);
      console.log(`   基準間隔: ${baseInterval}分 → 調整後: ${adjustedInterval}分`);
      
      // スケジュール情報を保存
      await this.saveExecutionSchedule({
        nextExecutionTime,
        adjustedInterval,
        reasoning: this.buildScheduleReasoning(integratedContext, adjustedInterval, baseInterval)
      });
      
    } catch (error) {
      console.error('❌ [スケジュール決定エラー]:', error);
    }
  }

  // アクション種別分布の分析
  private analyzeActionDistribution(decisions: any[], integratedContext: IntegratedContext): Record<string, number> {
    const distribution: Record<string, number> = {
      original_post: 0,
      quote_tweet: 0,
      retweet: 0,
      reply: 0
    };
    
    decisions.forEach(decision => {
      const actionType = this.mapDecisionToActionType(decision);
      if (actionType && distribution.hasOwnProperty(actionType)) {
        distribution[actionType]++;
      }
    });
    
    return distribution;
  }
  
  // アクションの優先度付け
  private prioritizeActions(decisions: any[]): any[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return decisions.sort((a, b) => {
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      return priorityB - priorityA;
    });
  }
  
  // 具体的なアクション実行
  private async executeSpecificAction(action: any, context: IntegratedContext): Promise<void> {
    console.log(`⚡ [アクション実行] ${action.type} (${action.priority}優先度)`);
    
    try {
      switch (action.type) {
        case 'content_creation':
          await this.executeContentCreation(action, context);
          break;
        case 'post_immediate':
          await this.executeImmediatePost(action, context);
          break;
        case 'performance_analysis':
          await this.executePerformanceAnalysis(action, context);
          break;
        default:
          console.log(`⚠️ [アクション] 未知のアクションタイプ: ${action.type}`);
      }
    } catch (error) {
      console.error(`❌ [個別アクションエラー] ${action.type}:`, error);
    }
  }
  
  // アクション間の待機時間
  private async waitBetweenActions(action: any): Promise<void> {
    const waitTime = action.priority === 'critical' ? 1000 : 3000; // ms
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // 決定をアクションタイプにマッピング
  private mapDecisionToActionType(decision: any): string | null {
    const typeMapping: Record<string, string> = {
      'collect_content': 'content_collection',
      'immediate_post': 'post_immediate', 
      'analyze_performance': 'performance_analysis',
      'content_generation': 'content_creation',
      'posting_schedule': 'schedule_optimization'
    };
    
    return typeMapping[decision.type] || null;
  }
  
  // スケジュール理由の構築
  private buildScheduleReasoning(
    context: IntegratedContext, 
    adjustedInterval: number, 
    baseInterval: number
  ): string {
    const adjustmentRatio = adjustedInterval / baseInterval;
    
    if (adjustmentRatio > 1.2) {
      return 'アカウントヘルス改善のため実行間隔を延長';
    } else if (adjustmentRatio < 0.8) {
      return '市場機会活用のため実行間隔を短縮';
    } else {
      return '標準的な実行間隔を維持';
    }
  }
  
  // 実行スケジュールの保存
  private async saveExecutionSchedule(schedule: any): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const schedulePath = path.join(process.cwd(), 'data', 'context', 'execution-schedule.json');
      
      await fs.mkdir(path.dirname(schedulePath), { recursive: true });
      await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2));
      
    } catch (error) {
      console.error('❌ [スケジュール保存エラー]:', error);
    }
  }

  // コンテンツ作成実行
  private async executeContentCreation(action: any, context: IntegratedContext): Promise<void> {
    console.log('✍️ [コンテンツ作成] 統合コンテキストに基づくコンテンツ生成中...');
    
    try {
      // 統合コンテキストを活用したコンテンツ生成
      const contentPrompt = `
Based on the integrated context, create valuable investment/trading content:

Account Status: ${JSON.stringify(context.account, null, 2)}
Market Opportunities: ${JSON.stringify(context.market.opportunities.slice(0, 3), null, 2)}
Action Suggestions: ${JSON.stringify(context.actionSuggestions.slice(0, 2), null, 2)}

Create educational, engaging content that provides real value to investors.
Content should be:
- Educational and informative
- Based on current market context
- Appropriate for the account's health level
- Engaging and actionable

Return only the content text (280 characters max for X/Twitter).
`;
      
      const content = await claude()
        .withModel('sonnet')
        .query(contentPrompt)
        .asText();
      
      console.log('✅ [コンテンツ作成完了] 統合コンテキストベースコンテンツを生成');
      
      // 生成されたコンテンツを保存
      await this.saveGeneratedContent(content, context);
      
    } catch (error) {
      console.error('❌ [コンテンツ作成エラー]:', error);
    }
  }
  
  // 即座投稿実行
  private async executeImmediatePost(action: any, context: IntegratedContext): Promise<void> {
    console.log('📮 [即座投稿] 高優先度コンテンツを投稿中...');
    
    try {
      // 最も優先度の高い投稿機会を特定
      const topOpportunity = context.market.opportunities
        .filter(op => op.priority === 'high')
        .sort((a, b) => b.estimatedEngagement - a.estimatedEngagement)[0];
      
      if (topOpportunity && topOpportunity.content) {
        console.log('📤 [投稿実行] 機会ベースの投稿を実行');
        // 実際の投稿処理をここに実装
        console.log('投稿内容:', topOpportunity.content.substring(0, 100) + '...');
      } else {
        console.log('⚠️ [投稿スキップ] 適切な投稿機会が見つかりません');
      }
      
    } catch (error) {
      console.error('❌ [即座投稿エラー]:', error);
    }
  }
  
  // パフォーマンス分析実行
  private async executePerformanceAnalysis(action: any, context: IntegratedContext): Promise<void> {
    console.log('📊 [パフォーマンス分析] アカウント実績を分析中...');
    
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        accountHealth: context.account.healthScore,
        marketOpportunities: context.market.opportunities.length,
        actionSuggestions: context.actionSuggestions.length,
        performanceInsights: [
          `ヘルススコア: ${context.account.healthScore}/100`,
          `利用可能な機会: ${context.market.opportunities.length}件`,
          `推奨アクション: ${context.actionSuggestions.length}件`
        ]
      };
      
      console.log('📊 [分析結果]:', analysis.performanceInsights);
      
      // 分析結果を保存
      await this.savePerformanceAnalysis(analysis);
      
    } catch (error) {
      console.error('❌ [パフォーマンス分析エラー]:', error);
    }
  }
  
  // 生成コンテンツの保存
  private async saveGeneratedContent(content: string, context: IntegratedContext): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const contentPath = path.join(process.cwd(), 'data', 'context', 'generated-content.json');
      
      const contentRecord = {
        timestamp: new Date().toISOString(),
        content: content,
        context: {
          accountHealth: context.account.healthScore,
          opportunitiesCount: context.market.opportunities.length
        }
      };
      
      await fs.mkdir(path.dirname(contentPath), { recursive: true });
      await fs.writeFile(contentPath, JSON.stringify(contentRecord, null, 2));
      
    } catch (error) {
      console.error('❌ [コンテンツ保存エラー]:', error);
    }
  }
  
  // パフォーマンス分析の保存
  private async savePerformanceAnalysis(analysis: any): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const analysisPath = path.join(process.cwd(), 'data', 'context', 'performance-analysis.json');
      
      await fs.mkdir(path.dirname(analysisPath), { recursive: true });
      await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
      
    } catch (error) {
      console.error('❌ [分析保存エラー]:', error);
    }
  }

  setExecutionMode(mode: ExecutionMode): void {
    this.mode = mode;
  }

  getExecutionMode(): ExecutionMode {
    return this.mode;
  }

  private async loadCurrentContext(): Promise<Context> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const contextPath = path.join(process.cwd(), 'data', 'context', 'current-situation.json');
    
    try {
      const data = await fs.readFile(contextPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        timestamp: new Date().toISOString(),
        systemStatus: 'initializing',
        recentActions: [],
        pendingTasks: []
      };
    }
  }

  // 統合実行結果の保存（拡張版）
  private async saveExecutionResults(integratedContext: IntegratedContext, results: any[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const historyPath = path.join(process.cwd(), 'data', 'context', 'execution-history.json');
    
    let history = [];
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    const executionRecord = {
      timestamp: new Date().toISOString(),
      workflow: 'optimized_integrated_v2',
      context: {
        accountHealth: integratedContext.account.healthScore,
        marketOpportunities: integratedContext.market.opportunities.length,
        actionSuggestions: integratedContext.actionSuggestions.length
      },
      results: results.map(r => ({
        type: r.type,
        success: r.success,
        timestamp: r.timestamp,
        error: r.error
      })),
      metrics: {
        totalActions: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        successRate: results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0
      }
    };
    
    history.push(executionRecord);
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    
    console.log(`💾 [実行履歴保存] 成功率: ${executionRecord.metrics.successRate.toFixed(1)}% (${executionRecord.metrics.successCount}/${executionRecord.metrics.totalActions})`);
  }

  // 従来形式のsaveExecutionResults（後方互換性）
  private async saveExecutionResultsLegacy(actions: Action[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const historyPath = path.join(process.cwd(), 'data', 'context', 'execution-history.json');
    
    let history = [];
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      actions: actions.map(a => ({
        type: a.type,
        status: a.status,
        result: a.result
      }))
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  }

  private async handleExecutionError(error: unknown): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const errorPath = path.join(process.cwd(), 'data', 'context', 'error-log.json');
    
    let errors = [];
    try {
      const data = await fs.readFile(errorPath, 'utf-8');
      errors = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    errors.push({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors = errors.slice(-50);
    }
    
    await fs.mkdir(path.dirname(errorPath), { recursive: true });
    await fs.writeFile(errorPath, JSON.stringify(errors, null, 2));
  }

}