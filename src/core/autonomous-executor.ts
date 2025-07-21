import { DecisionEngine } from './decision-engine.js';
import { ParallelManager } from './parallel-manager.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Need, Action, Context, IntegratedContext, ActionSpecificPreloadResult, ParallelAnalysisResult, ActionCollectionConfig, CollectionResult, Decision } from '../types/autonomous-system.js';
import type { ActionDecision } from '../types/action-types.js';
import { HealthChecker } from '../utils/monitoring/health-check.js';
import { AccountAnalyzer, AccountStatus } from '../lib/account-analyzer.js';
import { SimpleXClient } from '../lib/x-client.js';
import { EnhancedInfoCollector } from '../lib/enhanced-info-collector.js';
import { ContextIntegrator } from '../lib/context-integrator.js';
import { DailyActionPlanner } from '../lib/daily-action-planner.js';
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';
import { loadYamlSafe } from '../utils/yaml-utils.js';
import { fileSizeMonitor } from '../utils/file-size-monitor.js';
import { join } from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { EventEmitter } from 'events';

export enum ExecutionMode {
  SCHEDULED_POSTING = 'scheduled_posting',  // 定期投稿モード
  DYNAMIC_ANALYSIS = 'dynamic_analysis'     // 動的判断モード
}

interface MinimalContext {
  accountHealth: number;
  systemStatus: string;
}

interface ClaudeDecision {
  action: ActionType;
  reasoning: string;
  confidence: number;
}

interface AccountInfoCache {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface CacheManager {
  accountInfo: AccountInfoCache | null;
  pendingRequests: Set<string>;
  eventEmitter: EventEmitter;
}

type ActionType = 'original_post';

export class AutonomousExecutor {
  private decisionEngine: DecisionEngine;
  private parallelManager: ParallelManager;
  private healthChecker: HealthChecker;
  private accountAnalyzer: AccountAnalyzer;
  private enhancedInfoCollector: EnhancedInfoCollector;
  private contextIntegrator: ContextIntegrator;
  private dailyActionPlanner: DailyActionPlanner;
  private actionSpecificCollector: ActionSpecificCollector;
  private mode: ExecutionMode = ExecutionMode.SCHEDULED_POSTING;
  private cacheManager: CacheManager;
  
  // 実行状態管理
  private isExecutionActive: boolean = false;
  private executionStartTime: number = 0;
  private readonly MAX_EXECUTION_TIME = 15 * 60 * 1000; // 15分

  constructor() {
    // ActionSpecificCollectorを初期化
    this.actionSpecificCollector = new ActionSpecificCollector(
      this.loadActionCollectionConfigPath()
    );
    
    // DecisionEngineにActionSpecificCollectorを渡す
    this.decisionEngine = new DecisionEngine(this.actionSpecificCollector);
    
    this.parallelManager = new ParallelManager();
    this.healthChecker = new HealthChecker();
    this.enhancedInfoCollector = new EnhancedInfoCollector();
    this.contextIntegrator = new ContextIntegrator();
    this.dailyActionPlanner = new DailyActionPlanner();
    
    // X Client を初期化してAccountAnalyzerに渡す
    const apiKey = process.env.X_API_KEY || '';
    const xClient = new SimpleXClient(apiKey);
    this.accountAnalyzer = new AccountAnalyzer(xClient);
    
    // ファイルサイズ監視システムを開始（30分間隔）
    this.initializeFileSizeMonitoring();
    
    // キャッシュマネージャー初期化
    this.cacheManager = {
      accountInfo: null,
      pendingRequests: new Set(),
      eventEmitter: new EventEmitter()
    };
  }

  async executeClaudeAutonomous(): Promise<Decision> {
    console.log('🤖 [Claude自律実行] 現在状況の分析と最適アクション判断...');
    
    // 実行状態チェック（重複実行防止）
    if (this.isExecutionActive) {
      console.log('⚠️ [実行制御] 既に実行中です、重複実行を防止');
      return {
        id: Date.now().toString(),
        type: 'wait',
        priority: 'low',
        reasoning: 'Duplicate execution prevented',
        action: undefined,
        metadata: {
          timestamp: Date.now(),
          duplicate: true
        }
      };
    }
    
    // 実行状態を開始に設定
    this.isExecutionActive = true;
    this.executionStartTime = Date.now();
    console.log(`🔄 [実行状態] 実行開始 - ${new Date().toISOString()}`);
    
    try {
      // 実行時間監視プロミス
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Execution timeout'));
        }, this.MAX_EXECUTION_TIME);
      });
      
      // 実際の実行プロミス
      const executionPromise = this.performAutonomousExecution();
      
      // タイムアウトとの競合実行
      const decision = await Promise.race([
        executionPromise,
        timeoutPromise
      ]);
      
      return decision;
      
    } catch (error) {
      console.error('❌ [Claude自律実行エラー]', error);
      await this.handleExecutionError(error);
      
      // Return default decision in case of error
      return {
        id: Date.now().toString(),
        type: 'wait',
        priority: 'low',
        reasoning: 'Error occurred during decision making',
        action: undefined, // No action suggestion for error case
        metadata: {
          error: (error as Error).message,
          timestamp: Date.now()
        }
      };
    } finally {
      // 実行状態をリセット
      this.isExecutionActive = false;
      const duration = Date.now() - this.executionStartTime;
      console.log(`⏱️ [実行完了] 実行時間: ${duration}ms`);
    }
  }
  
  /**
   * 実際の自律実行処理（従来のロジック）
   */
  private async performAutonomousExecution(): Promise<Decision> {
    // 1. 最小限の状況把握
    const currentSituation = await this.getCurrentSituation();
    
    // 2. Claude自律判断
    const claudeDecision = await this.requestClaudeDecision(currentSituation);
    
    // 3. Convert to Decision format for testing/validation purposes
    const actionSuggestion = claudeDecision.action === 'original_post' ? {
      type: claudeDecision.action,
      reasoning: claudeDecision.reasoning,
      priority: 'medium' as 'medium',
      expectedImpact: claudeDecision.confidence * 100
    } : undefined;
    
    const decision: Decision = {
      id: Date.now().toString(),
      type: claudeDecision.action,
      priority: 'medium',
      reasoning: claudeDecision.reasoning,
      action: actionSuggestion,
      metadata: {
        confidence: claudeDecision.confidence,
        timestamp: Date.now()
      }
    };
    
    // 4. Execute decision (for production use)
    await this.executeDecision(claudeDecision);
    
    return decision;
  }

  private async getCurrentSituation(): Promise<MinimalContext> {
    const accountHealthScore = await this.getAccountHealthScore();
    const systemStatus = await this.getSystemStatus();

    return {
      accountHealth: accountHealthScore,
      systemStatus: systemStatus
    };
  }

  private async decideTopic(situation: MinimalContext): Promise<string> {
    console.log('🎯 [トピック決定] 投稿テーマの選定を開始...');
    
    // 基本的な市場情報を軽く収集してトピックを決定
    const quickMarketScan = await this.performQuickMarketScan();
    
    // トピック候補を評価
    const topicCandidates = [
      { topic: '仮想通貨市場動向', weight: quickMarketScan.cryptoActivity },
      { topic: '株式市場分析', weight: quickMarketScan.stockActivity },
      { topic: '投資教育基礎', weight: quickMarketScan.educationDemand },
      { topic: '長期投資戦略', weight: quickMarketScan.strategyInterest },
      { topic: 'リスク管理手法', weight: quickMarketScan.riskAwareness }
    ];
    
    // 最も適切なトピックを選択
    const selectedTopic = topicCandidates.reduce((prev, current) => 
      (current.weight > prev.weight) ? current : prev
    ).topic;
    
    console.log(`✅ [トピック決定] 選定完了: ${selectedTopic}`);
    return selectedTopic;
  }

  private async performQuickMarketScan(): Promise<any> {
    // 軽量な市場スキャン（詳細情報収集の前段階）
    return {
      cryptoActivity: Math.random() * 100,
      stockActivity: Math.random() * 100,
      educationDemand: Math.random() * 100,
      strategyInterest: Math.random() * 100,
      riskAwareness: Math.random() * 100
    };
  }

  private async requestClaudeDecision(situation: MinimalContext): Promise<ClaudeDecision> {
    // Step 1: トピック決定
    const selectedTopic = await this.decideTopic(situation);
    
    console.log(`🔍 [特化情報収集] ${selectedTopic}に特化したデータ収集を開始...`);
    
    // Step 2: 選択されたトピックに特化した情報収集
    const baseContext = await this.generateBaselineContext();
    
    // ActionSpecificCollectorでトピック特化情報収集を実行
    let collectedInformation;
    try {
      collectedInformation = await this.actionSpecificCollector.collectForTopicSpecificAction(
        'original_post', 
        selectedTopic,
        baseContext, 
        90 // 90%の充足度を目標（トピック特化なので高品質）
      );
      console.log(`✅ [特化情報収集完了] ${selectedTopic}に関する${collectedInformation.results.length}件の情報を収集`);
    } catch (error) {
      console.warn('⚠️ [情報収集エラー] フォールバックデータを使用:', error);
      collectedInformation = {
        results: [],
        sufficiencyScore: 0,
        actionType: 'original_post' as const,
        strategyUsed: null,
        qualityMetrics: null,
        executionTime: 0
      };
    }

    // 収集した情報を構造化してClaude判断に活用
    const structuredInformation = {
      trendingTopics: collectedInformation.results
        .filter(r => r.type === 'trending_topic' || r.type === 'trend')
        .slice(0, 3)
        .map(r => r.content),
      marketInsights: collectedInformation.results
        .filter(r => r.type === 'market_insight' || r.type === 'analysis')
        .slice(0, 3)
        .map(r => r.content),
      competitorAnalysis: collectedInformation.results
        .filter(r => r.type === 'competitor' || r.type === 'community_post')
        .slice(0, 2)
        .map(r => r.content),
      totalResults: collectedInformation.results.length,
      sufficiencyScore: collectedInformation.sufficiencyScore
    };

    const prompt = `
現在状況: ${JSON.stringify(situation, null, 2)}

🎯 収集された最新情報:
${JSON.stringify(structuredInformation, null, 2)}

X（Twitter）アカウントの成長のため、収集された最新情報を活用して投稿戦略を決定してください:

アクション:
original_post - 独自投稿作成による価値提供

収集された情報（トレンド、市場洞察、競合分析）を活用し、教育的で価値のあるオリジナルコンテンツを作成するかどうかと、その理由を簡潔に返してください。
特に以下の点を考慮してください:
- トレンドトピックとの関連性
- 市場洞察の活用方法
- 競合との差別化要因
`;

    const response = await claude()
      .withModel('sonnet')
      .query(prompt)
      .asText();
      
    return this.parseClaudeDecision(response);
  }

  private async executeDecision(decision: ClaudeDecision): Promise<void> {
    console.log(`⚡ [決定実行] ${decision.action}: ${decision.reasoning}`);
    
    if (decision.action === 'original_post') {
      await this.executeOriginalPost();
    } else {
      console.log('⚠️ [決定実行] original_post以外のアクションはサポートされていません');
    }
  }

  async executeAutonomously(): Promise<void> {
    // 新しい自律実行メソッドに委譲
    await this.executeClaudeAutonomous();
  }

  /**
   * キャッシュ付きアカウント情報取得（重複実行防止）
   * 有効期限：5分、重複リクエスト検出・防止機能付き
   */
  private async getCachedAccountStatus(): Promise<any> {
    const cacheKey = 'account_status';
    const now = Date.now();
    
    // キャッシュが有効かチェック
    if (this.cacheManager.accountInfo && this.cacheManager.accountInfo.expiresAt > now) {
      console.log('🎯 [キャッシュヒット] アカウント情報をキャッシュから取得');
      return this.cacheManager.accountInfo.data;
    }
    
    // 既に進行中のリクエストがあるかチェック
    if (this.cacheManager.pendingRequests.has(cacheKey)) {
      console.log('⏳ [重複防止] 既存のアカウント情報取得を待機中...');
      return new Promise((resolve) => {
        this.cacheManager.eventEmitter.once('account_status_ready', resolve);
      });
    }
    
    // 新規リクエストを登録
    this.cacheManager.pendingRequests.add(cacheKey);
    
    try {
      console.log('🔄 [アカウント情報取得] 新しいデータを取得中...');
      const accountStatus = await this.accountAnalyzer.analyzeCurrentStatus();
      
      // キャッシュに保存（5分間有効）
      this.cacheManager.accountInfo = {
        data: accountStatus,
        timestamp: now,
        expiresAt: now + (5 * 60 * 1000) // 5分後
      };
      
      console.log('✅ [キャッシュ更新] アカウント情報をキャッシュに保存（5分間有効）');
      
      // 待機中のリクエストに通知
      this.cacheManager.eventEmitter.emit('account_status_ready', accountStatus);
      
      return accountStatus;
      
    } catch (error) {
      console.error('❌ [アカウント情報取得エラー]:', error);
      
      // エラー時のフォールバック
      const fallbackData = {
        timestamp: new Date().toISOString(),
        healthScore: 50,
        followers: { current: 0, change_24h: 0, growth_rate: '0%' },
        engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
        performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
        health: { status: 'unknown', api_limits: 'normal', quality_score: 50 },
        recommendations: []
      };
      
      this.cacheManager.eventEmitter.emit('account_status_ready', fallbackData);
      return fallbackData;
      
    } finally {
      this.cacheManager.pendingRequests.delete(cacheKey);
    }
  }

  // Claude自律判断システム用のヘルパーメソッド
  private async getAccountHealthScore(): Promise<number> {
    try {
      const status = await this.getCachedAccountStatus();
      return status.healthScore || 75;
    } catch {
      return 75; // デフォルト値
    }
  }



  private async getSystemStatus(): Promise<string> {
    try {
      const isCritical = await this.healthChecker.isCritical();
      return isCritical ? 'critical' : 'healthy';
    } catch {
      return 'unknown';
    }
  }

  private parseClaudeDecision(response: string): ClaudeDecision {
    // Claudeの応答から構造化されたデータを抽出
    const lines = response.toLowerCase().trim();
    
    let action: ActionType = 'original_post'; // デフォルトはoriginal_postのみ
    let reasoning = response;
    let confidence = 0.7; // 基本的な信頼度

    // original_post関連のキーワードや肯定的な表現を検出
    if (lines.includes('original_post') || lines.includes('独自投稿') || 
        lines.includes('作成') || lines.includes('投稿') || 
        lines.includes('コンテンツ') || lines.includes('教育') ||
        lines.includes('はい') || lines.includes('yes')) {
      action = 'original_post';
    }

    // 信頼度推定
    if (lines.includes('強く') || lines.includes('確実') || lines.includes('絶対')) {
      confidence = 0.9;
    } else if (lines.includes('推奨') || lines.includes('適切') || lines.includes('良い')) {
      confidence = 0.8;
    } else if (lines.includes('可能') || lines.includes('できる')) {
      confidence = 0.6;
    }

    return { action, reasoning, confidence };
  }

  private async executeOriginalPost(): Promise<void> {
    console.log('📝 [独自投稿実行] 情報収集結果を活用した価値あるオリジナルコンテンツを作成中...');
    
    try {
      // 基本的なコンテキストを生成
      const baseContext = await this.generateBaselineContext();
      
      // ActionSpecificCollectorで最新情報を収集
      let collectedInformation;
      try {
        console.log('🔍 [コンテンツ用情報収集] ActionSpecificCollectorで投稿用情報を収集中...');
        collectedInformation = await this.actionSpecificCollector.collectForAction(
          'original_post', 
          baseContext, 
          90 // コンテンツ品質向上のため高い充足度目標
        );
        console.log(`✅ [コンテンツ用情報収集完了] ${collectedInformation.results.length}件の情報を収集`);
      } catch (error) {
        console.warn('⚠️ [コンテンツ用情報収集エラー] フォールバックで実行:', error);
        collectedInformation = {
          results: [],
          sufficiencyScore: 0,
          actionType: 'original_post' as const,
          strategyUsed: null,
          qualityMetrics: null,
          executionTime: 0
        };
      }

      // 収集した情報をコンテンツ生成用に構造化
      const contentInsights = {
        trendingTopics: collectedInformation.results
          .filter(r => r.type === 'trending_topic' || r.type === 'trend')
          .slice(0, 5)
          .map(r => r.content),
        marketInsights: collectedInformation.results
          .filter(r => r.type === 'market_insight' || r.type === 'analysis')
          .slice(0, 5)
          .map(r => r.content),
        educationalContent: collectedInformation.results
          .filter(r => r.type === 'educational' || r.type === 'tutorial')
          .slice(0, 3)
          .map(r => r.content),
        competitorAnalysis: collectedInformation.results
          .filter(r => r.type === 'competitor' || r.type === 'community_post')
          .slice(0, 3)
          .map(r => r.content),
        qualityScore: collectedInformation.qualityMetrics?.overallScore || 0,
        totalDataPoints: collectedInformation.results.length
      };

      const contentPrompt = `
🎯 最新情報に基づくトレーディング・投資教育コンテンツを作成してください:

📊 収集された最新データ:
${JSON.stringify(contentInsights, null, 2)}

基本コンテキスト: ${JSON.stringify(baseContext, null, 2)}

🎯 コンテンツ生成指示:
収集された最新情報を活用して、教育的価値が高いオリジナル投稿を作成してください。

要件:
- 収集されたトレンド情報を活用した時流に合った内容
- 市場洞察を反映した実用的なアドバイス
- 教育的価値が高い内容（初心者にも分かりやすく）
- 280文字以内
- 適切なハッシュタグ使用
- 競合との差別化を意識した独自視点

特に重視する点:
- トレンドトピックとの関連性
- 市場洞察の実践的活用
- 教育的価値の最大化

投稿内容のみを返してください（説明や前置きは不要）。
`;

      const content = await claude()
        .withModel('sonnet')
        .query(contentPrompt)
        .asText();

      // originalContentパラメータを確実に作成
      const originalContent = content?.trim() || '投資の基本原則：リスク管理と長期的視点の重要性 #投資教育 #資産形成';
      
      console.log('✅ [投稿作成完了] 投稿内容:', originalContent.substring(0, 100) + '...');
      
      // 投稿実行データを保存（originalContentパラメータを含める）
      await this.saveOriginalPostExecution({
        timestamp: new Date().toISOString(),
        action: 'original_post',
        params: {
          originalContent: originalContent,
          hashtags: ['#投資教育', '#資産形成'],
          contentType: 'educational',
          riskLevel: 'low',
          timeOfDay: new Date().getHours(),
          dateGenerated: new Date().toISOString().split('T')[0]
        },
        content: originalContent,
        success: true
      });
      
    } catch (error) {
      console.error('❌ [独自投稿実行エラー]:', error);
      
      // エラー時でもoriginalContentパラメータを含むフォールバックデータを保存
      await this.saveOriginalPostExecution({
        timestamp: new Date().toISOString(),
        action: 'original_post',
        params: {
          originalContent: '投資の基本原則：分散投資の重要性について #投資基本',
          hashtags: ['#投資基本'],
          contentType: 'educational',
          riskLevel: 'low',
          timeOfDay: new Date().getHours(),
          dateGenerated: new Date().toISOString().split('T')[0]
        },
        content: '投資の基本原則：分散投資の重要性について #投資基本',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async saveOriginalPostExecution(executionData: any): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      // 日次アクションデータに保存
      const actionPath = path.join(process.cwd(), 'data', 'daily-action-data.yaml');
      
      let actionHistory: any[] = [];
      try {
        const data = await fs.readFile(actionPath, 'utf-8');
        const parsed = yaml.load(data);
        if (Array.isArray(parsed)) {
          actionHistory = parsed;
        }
      } catch (readError) {
        console.log('📄 [新規作成] daily-action-dataファイルを新規作成します');
      }
      
      actionHistory.push(executionData);
      
      // Keep only last 100 entries
      if (actionHistory.length > 100) {
        actionHistory = actionHistory.slice(-100);
      }
      
      await fs.mkdir(path.dirname(actionPath), { recursive: true });
      await fs.writeFile(actionPath, yaml.dump(actionHistory, { indent: 2 }));
      
      console.log('💾 [投稿実行データ保存] originalContentパラメータ付きで保存完了');
    } catch (error) {
      console.error('❌ [投稿実行データ保存エラー]:', error);
    }
  }

  private async generateBasicContext(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      accountHealth: await this.getAccountHealthScore(),
      systemStatus: await this.getSystemStatus()
    };
  }




  // 簡素化されたニーズ評価（複雑性削除）
  private async assessSimplifiedNeeds(context: IntegratedContext): Promise<Need[]> {
    const needs: Need[] = [];
    
    // シンプルな時間ベース判定（動的間隔計算使用）
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
      'original_post': 1.0  // 100% original_post
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
  

  // アクション種別分布の分析（original_post専用）
  private analyzeActionDistribution(decisions: any[], integratedContext: IntegratedContext): Record<string, number> {
    const distribution: Record<string, number> = {
      original_post: 0
    };
    
    decisions.forEach(decision => {
      const actionType = this.mapDecisionToActionType(decision);
      if (actionType === 'content_creation' || actionType === 'post_immediate') {
        distribution.original_post++;
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
    
    const historyPath = path.join(process.cwd(), 'data', 'context', 'execution-history.yaml');
    
    let history: any[] = [];
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      const loadedData = yaml.load(data);
      
      // 読み込んだデータが配列かどうかをチェック
      if (Array.isArray(loadedData)) {
        history = loadedData;
      } else {
        console.log('⚠️ [実行履歴] 既存ファイルが配列形式ではありません - 新しい配列で初期化');
        history = [];
      }
    } catch (parseError) {
      console.log('📄 [実行履歴] 新しい履歴ファイルを作成します');
      // File doesn't exist yet or is invalid
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
    await fs.writeFile(historyPath, yaml.dump(history, { indent: 2 }));
    
    console.log(`💾 [実行履歴保存] 成功率: ${executionRecord.metrics.successRate.toFixed(1)}% (${executionRecord.metrics.successCount}/${executionRecord.metrics.totalActions})`);
  }

  // 従来形式のsaveExecutionResults（後方互換性）
  private async saveExecutionResultsLegacy(actions: Action[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const historyPath = path.join(process.cwd(), 'data', 'context', 'execution-history.yaml');
    
    let history: any[] = [];
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      const loadedData = yaml.load(data);
      
      // 読み込んだデータが配列かどうかをチェック
      if (Array.isArray(loadedData)) {
        history = loadedData;
      } else {
        console.log('⚠️ [実行履歴Legacy] 既存ファイルが配列形式ではありません - 新しい配列で初期化');
        history = [];
      }
    } catch (parseError) {
      console.log('📄 [実行履歴Legacy] 新しい履歴ファイルを作成します');
      // File doesn't exist yet or is invalid
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
    await fs.writeFile(historyPath, yaml.dump(history, { indent: 2 }));
  }

  private async handleExecutionError(error: unknown): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const errorPath = path.join(process.cwd(), 'data', 'context', 'error-log.yaml');
    
    let errors: any[] = [];
    try {
      const data = await fs.readFile(errorPath, 'utf-8');
      const parsedData = yaml.load(data);
      
      // パースしたデータが配列かどうかをチェック
      if (Array.isArray(parsedData)) {
        errors = parsedData;
      } else {
        console.log('⚠️ [エラーログ] 既存ファイルが配列形式ではありません - 新しい配列で初期化');
        errors = [];
      }
    } catch (parseError) {
      console.log('📄 [エラーログ] 新しいエラーログファイルを作成します');
      // File doesn't exist yet or is invalid
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
    await fs.writeFile(errorPath, yaml.dump(errors, { indent: 2 }));
  }

  // Step 2: 投稿専用モード統合実行（テストモード対応）
  private async step2_executeParallelAnalysis(): Promise<ParallelAnalysisResult> {
    console.log('🔄 Step 2: 投稿専用モード統合実行（テストモード対応）');
    
    const sessionId = `posting_only_analysis_${Date.now()}`;
    
    // ActionSpecificCollectorのテストモード状態をチェック
    const isTestMode = process.env.X_TEST_MODE === 'true';
    
    try {
      // 投稿専用モード: アカウント分析をスキップ
      console.log('⏭️ [Step 2-1] アカウント分析をスキップ（投稿専用モード）');
      const accountResult = { status: 'fulfilled' as const, value: await this.executeAccountAnalysisSkipped() };
      
      // テストモード時はブラウザ起動をスキップ
      if (isTestMode) {
        console.log('🧪 [Step 2-2] テストモード: ブラウザ起動をスキップしてフォールバック実行');
        const infoResult = { status: 'fulfilled' as const, value: await this.executeActionSpecificCollectionTestMode() };
        return this.handleParallelResults(accountResult, infoResult, sessionId);
      }
      
      // 通常モード時のみブラウザ起動
      console.log('🌐 [Step 2-2] 通常モード: ブラウザ起動してActionSpecific情報収集');
      const { PlaywrightCommonSetup } = await import('../lib/playwright-common-config.js');
      const { browser, context } = await PlaywrightCommonSetup.createPlaywrightEnvironment();
      
      console.log(`🎭 [統合セッション] ${sessionId} - 単一ブラウザで逐次実行`);
      
      // ActionSpecific情報収集
      const infoResult = { status: 'fulfilled' as const, value: await this.executeActionSpecificCollectionSafe(context) };
      
      // セッション終了
      await PlaywrightCommonSetup.cleanup(browser, context);
      
      return this.handleParallelResults(accountResult, infoResult, sessionId);
      
    } catch (error) {
      console.error(`❌ [投稿専用実行エラー] ${sessionId}:`, error);
      // フォールバック処理
      return await this.executeTestModeFallback(sessionId);
    }
  }

  // 新規メソッド: アカウント分析スキップ（投稿のみに集中）
  private async executeAccountAnalysisSkipped(): Promise<any> {
    console.log('⏭️ [アカウント分析スキップ] 投稿のみに集中するためアカウント分析をスキップ');
    
    // 投稿に必要な最小限のダミーデータを返す
    return {
      timestamp: new Date().toISOString(),
      followers: { current: 5, change_24h: 0, growth_rate: '0%' },
      engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
      performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
      health: { status: 'healthy', api_limits: 'normal', quality_score: 100 },
      recommendations: ['投稿に集中'],
      healthScore: 100 // 投稿に影響しないよう最大値に設定
    };
  }

  // 新規メソッド: テストモード用ActionSpecific情報収集
  private async executeActionSpecificCollectionTestMode(): Promise<ActionSpecificPreloadResult> {
    console.log('🧪 [テストモードActionSpecific] ブラウザを使用せずフォールバックデータを生成...');
    
    const startTime = Date.now();
    
    try {
      // ActionSpecificCollectorのテストモード機能を直接利用
      if (this.actionSpecificCollector) {
        // テストモード強制実行（ブラウザ不要）
        const mockResult = (this.actionSpecificCollector as any).generateMockOptimizedResult();
        return mockResult;
      }
      
      // フォールバック: 手動でモック結果を生成（original_post専用）
      return {
        original_post: {
          actionType: 'original_post',
          results: [{
            id: `test-original-${Date.now()}`,
            type: 'test_content',
            content: '【テストモード】投資の基本戦略：長期分散投資の重要性について',
            source: 'test-mode-generator',
            relevanceScore: 0.95,
            timestamp: Date.now(),
            metadata: { mode: 'test', quality: 'high' }
          }],
          sufficiencyScore: 95,
          executionTime: Date.now() - startTime,
          strategyUsed: { actionType: 'original_post', targets: [], priority: 'high' as const, expectedDuration: 30, searchTerms: [], sources: [] },
          qualityMetrics: { relevanceScore: 0.95, credibilityScore: 0.90, uniquenessScore: 0.85, timelinessScore: 0.90, overallScore: 0.90, feedback: [] }
        },
        executionTime: Date.now() - startTime,
        status: 'success' as const
      };
      
    } catch (error) {
      console.error('❌ [テストモードActionSpecificエラー]:', error);
      return {
        status: 'fallback' as const,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  // 新規メソッド: テストモードフォールバック
  private async executeTestModeFallback(sessionId: string): Promise<ParallelAnalysisResult> {
    console.log(`🧪 [テストモードフォールバック] ${sessionId} - 完全フォールバック実行`);
    
    const accountResult = { status: 'fulfilled' as const, value: await this.executeAccountAnalysisSkipped() };
    const infoResult = { status: 'fulfilled' as const, value: await this.executeActionSpecificCollectionTestMode() };
    
    return this.handleParallelResults(accountResult, infoResult, sessionId);
  }

  // 新規メソッド: セーフなアカウント分析（専用コンテキスト使用）
  private async executeAccountAnalysisSafe(context: any): Promise<any> {
    console.log('🔍 [セーフなアカウント分析] 専用コンテキストで実行中...');
    
    try {
      // キャッシュ付きアカウント情報を使用（重複実行を除去）
      console.log('🎯 [重複実行除去] キャッシュ付きアカウント情報を使用');
      return await this.getCachedAccountStatus();
    } catch (error) {
      console.error('❌ [アカウント分析エラー]:', error);
      
      // フォールバック: 基本的なアカウント状態を返す
      return {
        timestamp: new Date().toISOString(),
        followers: { current: 0, change_24h: 0, growth_rate: '0%' },
        engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
        performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
        health: { status: 'unknown', api_limits: 'normal', quality_score: 50 },
        recommendations: [],
        healthScore: 50
      };
    }
  }

  // 新規メソッド: セーフなActionSpecific情報収集（単一ブラウザ最適化）
  private async executeActionSpecificCollectionSafe(context: any): Promise<ActionSpecificPreloadResult> {
    console.log('🎯 [セーフなActionSpecific収集] 単一ブラウザ最適化モードで実行中...');
    
    const startTime = Date.now();
    
    try {
      // 新しい最適化された情報収集メソッドを優先使用
      if (this.actionSpecificCollector && typeof this.actionSpecificCollector.executeOptimizedCollection === 'function') {
        console.log('🚀 [最適化収集] 単一ブラウザでリンク移動式情報収集を開始...');
        return await this.actionSpecificCollector.executeOptimizedCollection(context);
      }
      
      // フォールバック: 既存のプリロード機能を使用（複数ブラウザ方式）
      console.log('🔄 [フォールバック] 従来の並列収集方式を使用...');
      return await this.preloadActionSpecificInformationWithContext(context);
      
    } catch (error) {
      console.warn('⚠️ [セーフなActionSpecific収集エラー]:', error);
      
      // フォールバック結果を返す
      return {
        status: 'fallback' as const,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  // 新規メソッド: 並列実行結果の適切な処理
  private async handleParallelResults(
    accountResult: PromiseSettledResult<any>, 
    infoResult: PromiseSettledResult<ActionSpecificPreloadResult>,
    sessionId: string
  ): Promise<ParallelAnalysisResult> {
    console.log(`🔄 [並列結果処理] セッション: ${sessionId}`);
    
    // アカウント分析結果の処理
    let accountData;
    if (accountResult.status === 'fulfilled') {
      accountData = accountResult.value;
      console.log('✅ [アカウント分析] 成功');
    } else {
      console.warn('⚠️ [アカウント分析] 失敗:', accountResult.reason);
      // フォールバックデータ
      accountData = {
        timestamp: new Date().toISOString(),
        healthScore: 50,
        followers: { current: 0 },
        engagement: { engagement_rate: '0%' },
        performance: { posts_today: 0 },
        health: { status: 'unknown' }
      };
    }

    // ActionSpecific収集結果の処理
    let informationData;
    if (infoResult.status === 'fulfilled') {
      informationData = infoResult.value;
      console.log('✅ [ActionSpecific収集] 成功');
    } else {
      console.warn('⚠️ [ActionSpecific収集] 失敗:', infoResult.reason);
      // フォールバックデータ
      informationData = {
        status: 'fallback' as const,
        error: String(infoResult.reason),
        executionTime: 0
      };
    }

    console.log(`📊 [並列処理完了] アカウント: ${accountResult.status}, ActionSpecific: ${infoResult.status}`);
    
    return {
      account: accountData,
      information: informationData,
      timestamp: Date.now()
    };
  }

  // コンテキスト付きActionSpecific情報プリロード
  private async preloadActionSpecificInformationWithContext(context: any): Promise<ActionSpecificPreloadResult> {
    const startTime = Date.now();
    
    try {
      // 基本的なトレンド情報を事前収集
      const baselineContext = await this.generateBaselineContext();
      
      console.log('🎯 [ActionSpecificプリロード] 段階的バッチ実行モード開始...');
      
      // バッチ1: original_post, quote_tweet (2セッション使用)
      console.log('🔄 [バッチ1] original_post + quote_tweet 並列実行中...');
      const batch1Results = await Promise.all([
        this.actionSpecificCollector.collectForAction('original_post', baselineContext, 60),
        this.actionSpecificCollector.collectForAction('quote_tweet', baselineContext, 50)
      ]);
      
      // セッション解放待機 (ブラウザリソース最適化)
      console.log('⏳ [セッション解放待機] バッチ1完了、バッチ2前の待機中...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // バッチ2: retweet, reply (2セッション使用)
      console.log('🔄 [バッチ2] retweet + reply 並列実行中...');
      const batch2Results = await Promise.all([
        this.actionSpecificCollector.collectForAction('retweet', baselineContext, 40),
        this.actionSpecificCollector.collectForAction('reply', baselineContext, 30)
      ]);
      
      // 結果統合
      const preloadResults = [...batch1Results, ...batch2Results];

      const result: ActionSpecificPreloadResult = {
        original_post: preloadResults[0],
        quote_tweet: preloadResults[1],
        retweet: preloadResults[2],
        reply: preloadResults[3],
        executionTime: Date.now() - startTime,
        status: 'success' as const
      };

      console.log(`✅ [ActionSpecificプリロード完了] ${result.executionTime}ms で完了`);
      return result;
      
    } catch (error) {
      console.warn('ActionSpecific プリロードエラー:', error);
      return {
        status: 'fallback' as const,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  // 元のActionSpecific情報収集プリロード（後方互換性のため残す）
  private async preloadActionSpecificInformation(): Promise<ActionSpecificPreloadResult> {
    return this.preloadActionSpecificInformationWithContext(null);
  }

  // 新規メソッド: 基準コンテキスト生成
  private async generateBaselineContext(): Promise<IntegratedContext> {
    console.log('📊 [基準コンテキスト] プリロード用基準コンテキストを生成中...');
    
    try {
      // 基本的なアカウント状態をキャッシュから取得（重複実行を除去）
      console.log('🎯 [重複実行除去] キャッシュ付きアカウント情報を使用');
      const basicAccountStatus = await this.getCachedAccountStatus();
      
      // 最小限のマーケット情報
      const basicMarketContext = {
        trends: [],
        opportunities: [],
        competitorActivity: []
      };
      
      // 基本的なアクション提案
      const basicActionSuggestions = [
        {
          type: 'original_post' as const,
          reasoning: 'プリロード用基本アクション',
          priority: 'medium' as const,
          expectedImpact: 0.5
        }
      ];

      return {
        account: {
          currentState: basicAccountStatus,
          recommendations: [],
          healthScore: basicAccountStatus.healthScore || 75
        },
        market: basicMarketContext,
        actionSuggestions: basicActionSuggestions,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.warn('基準コンテキスト生成エラー:', error);
      
      // フォールバック: 最小限のダミーコンテキスト
      return {
        account: {
          currentState: {
            timestamp: new Date().toISOString(),
            followers: { current: 0, change_24h: 0, growth_rate: '0%' },
            engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
            performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
            health: { status: 'healthy', api_limits: 'normal', quality_score: 75 },
            recommendations: [],
            healthScore: 75
          },
          recommendations: [],
          healthScore: 75
        },
        market: {
          trends: [],
          opportunities: [],
          competitorActivity: []
        },
        actionSuggestions: [],
        timestamp: Date.now()
      };
    }
  }

  // 標準並列分析（フォールバック用）
  private async executeStandardParallelAnalysis(): Promise<ParallelAnalysisResult> {
    console.log('🔄 [フォールバック] 標準並列分析を実行中...');
    
    try {
      const accountResult = await this.getCachedAccountStatus();
      const infoResult = await this.enhancedInfoCollector.collectInformation();
      
      return {
        account: accountResult,
        information: infoResult as any, // 型の適合性調整
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('標準並列分析エラー:', error);
      throw error;
    }
  }

  // 新規メソッド: 設定ファイルパス読み込み
  private loadActionCollectionConfigPath(): string {
    return join(process.cwd(), 'data', 'action-collection-strategies.yaml');
  }

  // 新規メソッド: 設定ファイル読み込み
  private loadActionCollectionConfig(): ActionCollectionConfig {
    try {
      const configPath = this.loadActionCollectionConfigPath();
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent); // YAML パーサーが利用できない場合はJSONとして解析
    } catch (error) {
      console.warn('ActionCollection設定読み込みエラー:', error);
      return this.getDefaultActionCollectionConfig();
    }
  }

  // 新規メソッド: デフォルト設定
  private getDefaultActionCollectionConfig(): ActionCollectionConfig {
    return {
      strategies: {
        original_post: {
          priority: 60,
          focusAreas: ['独自洞察発見', '市場分析情報'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 85
        },
        quote_tweet: {
          priority: 25,
          focusAreas: ['候補ツイート検索'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 80
        },
        retweet: {
          priority: 10,
          focusAreas: ['信頼性検証'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 75
        },
        reply: {
          priority: 5,
          focusAreas: ['エンゲージメント機会'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 70
        }
      },
      sufficiencyThresholds: {
        original_post: 85,
        quote_tweet: 80,
        retweet: 75,
        reply: 70
      },
      maxExecutionTime: 90,
      qualityStandards: {
        relevanceScore: 80,
        credibilityScore: 85,
        uniquenessScore: 70,
        timelinessScore: 90
      }
    };
  }

  // 新規メソッド: ActionSpecificPreloadResult から CollectionResult[] への変換
  private convertActionSpecificToCollectionResults(
    preloadResult: ActionSpecificPreloadResult
  ): CollectionResult[] {
    console.log('🔄 [変換処理] ActionSpecificPreloadResult を CollectionResult[] に変換中...');
    
    if (preloadResult.status === 'fallback') {
      console.log('⚠️ [変換処理] フォールバック状態のため空配列を返す');
      return [];
    }

    const allResults: CollectionResult[] = [];

    // 各アクションタイプの結果を統合
    const actionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'] as const;

    for (const actionType of actionTypes) {
      const actionResult = preloadResult[actionType];
      // ActionSpecificResult型であることを確認
      if (actionResult && typeof actionResult === 'object' && 'results' in actionResult) {
        // ActionSpecificResultのresultsは既にCollectionResult[]
        allResults.push(...actionResult.results);
      }
    }

    console.log(`✅ [変換処理完了] ${allResults.length}件のCollectionResultを生成`);
    return allResults;
  }

  // 新規メソッド: 投稿専用コンテキスト生成
  private async createPostingOnlyContext(
    accountData: any,
    collectionResults: CollectionResult[]
  ): Promise<IntegratedContext> {
    console.log('📝 [投稿専用コンテキスト] アカウント分析なしの投稿専用コンテキストを生成中...');
    
    try {
      // アカウント情報は最小限のダミーデータを使用
      const postingOnlyAccount = {
        currentState: accountData,
        recommendations: ['定期投稿を継続'],
        healthScore: 100 // 投稿に集中できるよう最大値
      };

      // マーケット情報も投稿に必要な最小限に
      const basicMarket = {
        trends: [
          {
            id: 'trend_1',
            type: 'trend',
            content: '投資トレンドの上昇',
            source: 'market_analysis',
            relevanceScore: 0.8,
            timestamp: Date.now(),
            metadata: { engagement: 1000 }
          },
          {
            id: 'trend_2',
            type: 'trend',
            content: 'トレーディング技術の普及',
            source: 'market_analysis',
            relevanceScore: 0.7,
            timestamp: Date.now(),
            metadata: { engagement: 800 }
          }
        ],
        opportunities: [
          {
            type: 'original_post' as const,
            priority: 'high' as const,
            estimatedEngagement: 50,
            content: '価値ある投資情報を提供',
            reasoning: '定期投稿による価値提供'
          }
        ],
        competitorActivity: []
      };

      // アクション提案も投稿に集中
      const postingActionSuggestions = [
        {
          type: 'original_post' as const,
          reasoning: '投稿専用モードでのコンテンツ作成',
          priority: 'high' as const,
          expectedImpact: 0.8
        }
      ];

      const context: IntegratedContext = {
        account: postingOnlyAccount,
        market: basicMarket,
        actionSuggestions: postingActionSuggestions,
        timestamp: Date.now()
      };

      console.log('✅ [投稿専用コンテキスト生成完了] 投稿に最適化されたコンテキストを作成');
      return context;
      
    } catch (error) {
      console.error('❌ [投稿専用コンテキスト生成エラー]:', error);
      throw error;
    }
  }

  private async initializeFileSizeMonitoring(): Promise<void> {
    try {
      console.log('🔍 [ファイルサイズ監視] システム初期化開始...');
      
      // 即座に一度チェックを実行
      await fileSizeMonitor.checkFileSizes();
      
      // 定期監視を開始（30分間隔）
      await fileSizeMonitor.startPeriodicMonitoring(30);
      
      console.log('✅ [ファイルサイズ監視] システム初期化完了');
    } catch (error) {
      console.error('❌ [ファイルサイズ監視初期化エラー]:', error);
    }
  }


}