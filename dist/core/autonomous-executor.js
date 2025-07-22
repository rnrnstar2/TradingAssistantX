import { DecisionEngine } from './decision-engine.js';
import { ParallelManager } from './parallel-manager.js';
import { PerformanceMonitor } from '../lib/logging/performance-monitor.js';
import { HealthChecker } from '../utils/monitoring/health-check.js';
import { AccountAnalyzer } from '../lib/account-analyzer.js';
import { SimpleXClient } from '../lib/x-client.js';
import { EnhancedInfoCollector } from '../lib/enhanced-info-collector.js';
import { DailyActionPlanner } from '../lib/daily-action-planner.js';
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';
// 🧠 NEW: True Autonomous Workflow Integration
import { TrueAutonomousWorkflow } from './true-autonomous-workflow.js';
// Import the new modular components
import { AutonomousExecutorCacheManager } from './cache-manager.js';
import { AutonomousExecutorContextManager } from './context-manager.js';
import { AutonomousExecutorDecisionProcessor } from './decision-processor.js';
import { AutonomousExecutorActionExecutor } from './action-executor.js';
import { AutonomousExecutorConfigManager } from './config-manager.js';
import { ConfigManager } from '../utils/config-manager.js';
import { join } from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
export var ExecutionMode;
(function (ExecutionMode) {
    ExecutionMode["SCHEDULED_POSTING"] = "scheduled_posting";
    ExecutionMode["DYNAMIC_ANALYSIS"] = "dynamic_analysis";
    ExecutionMode["TRUE_AUTONOMOUS"] = "true_autonomous"; // 🧠 NEW: Claude完全自律モード
})(ExecutionMode || (ExecutionMode = {}));
export class AutonomousExecutor {
    decisionEngine;
    parallelManager;
    healthChecker;
    enhancedInfoCollector;
    // Enhanced performance monitoring
    performanceMonitor;
    // Modular components
    cacheManager;
    contextManager;
    decisionProcessor;
    actionExecutor;
    configManager;
    eventConfigManager;
    // 🧠 NEW: True Autonomous Workflow
    trueAutonomousWorkflow;
    mode = ExecutionMode.TRUE_AUTONOMOUS; // 🚨 CHANGED: Default to true autonomous mode
    // 実行状態管理
    isExecutionActive = false;
    executionStartTime = 0;
    MAX_EXECUTION_TIME = 15 * 60 * 1000; // 15分
    constructor() {
        // Initialize configManager FIRST (required for getConfigPath())
        this.configManager = new AutonomousExecutorConfigManager();
        // Initialize core components (now getConfigPath() is available)
        const actionSpecificCollector = new ActionSpecificCollector(this.getConfigPath());
        this.decisionEngine = new DecisionEngine(actionSpecificCollector);
        this.parallelManager = new ParallelManager();
        this.healthChecker = new HealthChecker();
        this.enhancedInfoCollector = new EnhancedInfoCollector();
        // Initialize enhanced performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        // Initialize event-capable config manager and connect cache events
        this.eventConfigManager = new ConfigManager();
        this.connectCacheEvents();
        const dailyActionPlanner = new DailyActionPlanner();
        // Initialize X Client and AccountAnalyzer (OAuth 2.0)
        const xClient = new SimpleXClient();
        const accountAnalyzer = new AccountAnalyzer(xClient);
        // Initialize other modular components
        this.cacheManager = new AutonomousExecutorCacheManager(accountAnalyzer);
        this.contextManager = new AutonomousExecutorContextManager();
        this.decisionProcessor = new AutonomousExecutorDecisionProcessor(actionSpecificCollector, this.contextManager);
        this.actionExecutor = new AutonomousExecutorActionExecutor(this.contextManager, dailyActionPlanner);
        // 🧠 NEW: Initialize True Autonomous Workflow
        this.trueAutonomousWorkflow = new TrueAutonomousWorkflow(this.decisionEngine);
        console.log('🧠 [AutonomousExecutor] True Autonomous Workflow システム初期化完了');
        console.log('🎯 [自律モード] 制約なしのClaude完全自律システム準備完了');
    }
    /**
     * Connect ConfigManager cache events to PerformanceMonitor
     */
    connectCacheEvents() {
        this.eventConfigManager.on('config:cache-hit', () => {
            const sessionId = `cache-session-${Date.now()}`;
            this.performanceMonitor.recordCacheHit(sessionId, true);
        });
        this.eventConfigManager.on('config:not-found', () => {
            const sessionId = `cache-session-${Date.now()}`;
            this.performanceMonitor.recordCacheHit(sessionId, false);
        });
        console.log('✅ [キャッシュイベント] ConfigManagerとPerformanceMonitorを接続完了');
    }
    getConfigPath() {
        // configManagerがundefinedでないことを確認
        if (!this.configManager) {
            throw new Error('ConfigManager is not initialized');
        }
        return this.configManager.loadActionCollectionConfigPath();
    }
    async executeClaudeAutonomous() {
        console.log('🤖 [Claude自律実行] 現在状況の分析と最適アクション判断...');
        // 実行状態管理
        if (this.isExecutionActive) {
            console.log('⚠️ [実行管理] 実行中のためスキップ');
            throw new Error('既に実行中です');
        }
        this.isExecutionActive = true;
        this.executionStartTime = Date.now();
        // パフォーマンス監視セッション開始
        const sessionId = `autonomous-execution-${Date.now()}`;
        this.performanceMonitor.startSession(sessionId, {
            operation: 'autonomous_execution',
            startTime: this.executionStartTime
        });
        try {
            // 実行時間制限チェック
            if (Date.now() - this.executionStartTime > this.MAX_EXECUTION_TIME) {
                throw new Error('実行時間制限に達しました');
            }
            // リソース使用量を追跡
            const preExecutionUsage = this.performanceMonitor.trackResourceUsage('pre_execution');
            console.log(`📊 [実行前リソース] メモリ: ${preExecutionUsage.memoryMB}MB, CPU: ${preExecutionUsage.cpuPercent}%`);
            // Delegate to the decision processor
            const decision = await this.decisionProcessor.performAutonomousExecution();
            // 実行後のリソース使用量
            const postExecutionUsage = this.performanceMonitor.trackResourceUsage('post_execution');
            console.log(`📊 [実行後リソース] メモリ: ${postExecutionUsage.memoryMB}MB, CPU: ${postExecutionUsage.cpuPercent}%`);
            return decision;
        }
        catch (error) {
            console.error('❌ [Claude自律実行] エラー:', error);
            await this.handleExecutionError(error);
            throw error;
        }
        finally {
            this.isExecutionActive = false;
            const duration = Date.now() - this.executionStartTime;
            // パフォーマンス監視セッション終了
            const performanceMetrics = this.performanceMonitor.endSession(sessionId);
            if (performanceMetrics) {
                console.log(`📈 [パフォーマンス統計] 決定時間: ${performanceMetrics.decisionTime}ms, メモリ使用量: ${performanceMetrics.memoryUsage}MB`);
                // 最適化提案をチェック
                const optimizationSuggestions = this.performanceMonitor.identifyOptimizationOpportunities();
                if (optimizationSuggestions.length > 0) {
                    console.log(`💡 [最適化提案] ${optimizationSuggestions.length}件の改善提案があります`);
                    optimizationSuggestions.slice(0, 2).forEach(suggestion => {
                        console.log(`   - ${suggestion.description}`);
                    });
                }
            }
            console.log(`⏱️ [実行完了] 実行時間: ${duration}ms`);
        }
    }
    // 🧠 NEW: True Autonomous Execution using the new workflow
    async executeTrueAutonomous(context) {
        console.log('🚀 [True Autonomous] Claude完全自律システム実行開始...');
        console.log('🎯 [自律性] 制約なし、Claude完全判断委託モード');
        // 実行状態管理
        if (this.isExecutionActive) {
            console.log('⚠️ [実行管理] 実行中のためスキップ');
            throw new Error('既に実行中です');
        }
        this.isExecutionActive = true;
        this.executionStartTime = Date.now();
        // パフォーマンス監視セッション開始
        const sessionId = `true-autonomous-${Date.now()}`;
        this.performanceMonitor.startSession(sessionId, {
            operation: 'true_autonomous_execution',
            startTime: this.executionStartTime
        });
        try {
            // リソース使用量を追跡
            const preExecutionUsage = this.performanceMonitor.trackResourceUsage('pre_execution');
            console.log(`📊 [実行前リソース] メモリ: ${preExecutionUsage.memoryMB}MB, CPU: ${preExecutionUsage.cpuPercent}%`);
            // 🧠 Execute True Autonomous Workflow
            const autonomousResult = await this.trueAutonomousWorkflow.executeAutonomousSession(context);
            // 実行後のリソース使用量
            const postExecutionUsage = this.performanceMonitor.trackResourceUsage('post_execution');
            console.log(`📊 [実行後リソース] メモリ: ${postExecutionUsage.memoryMB}MB, CPU: ${postExecutionUsage.cpuPercent}%`);
            console.log('🎉 [True Autonomous完了] Claude完全自律実行完了');
            console.log(`🎯 [自律性スコア] ${autonomousResult.autonomyScore}%`);
            console.log(`📈 [パフォーマンス] 戦略柔軟性: ${autonomousResult.performanceMetrics.strategicFlexibility}%`);
            console.log(`🔄 [適応性] 適応率: ${autonomousResult.performanceMetrics.adaptationRate}%`);
            console.log(`🧠 [学習効果] ${autonomousResult.performanceMetrics.learningEffectiveness}%`);
            return autonomousResult;
        }
        catch (error) {
            console.error('❌ [True Autonomous実行] エラー:', error);
            await this.handleExecutionError(error);
            throw error;
        }
        finally {
            this.isExecutionActive = false;
            const duration = Date.now() - this.executionStartTime;
            // パフォーマンス監視セッション終了
            const performanceMetrics = this.performanceMonitor.endSession(sessionId);
            if (performanceMetrics) {
                console.log(`📈 [パフォーマンス統計] 決定時間: ${performanceMetrics.decisionTime}ms, メモリ使用量: ${performanceMetrics.memoryUsage}MB`);
            }
            console.log(`⏱️ [True Autonomous完了] 実行時間: ${duration}ms`);
        }
    }
    async executeAutonomously() {
        console.log('🚀 [自律実行] 自律的アクション実行を開始...');
        // 🧠 Switch to True Autonomous mode if enabled
        if (this.mode === ExecutionMode.TRUE_AUTONOMOUS) {
            console.log('🧠 [モード切替] True Autonomous Workflowで実行');
            const autonomousResult = await this.executeTrueAutonomous();
            console.log(`✅ [True Autonomous結果] セッション${autonomousResult.sessionId}完了`);
            return;
        }
        // Legacy execution for backward compatibility
        try {
            const decision = await this.executeClaudeAutonomous();
            await this.actionExecutor.executeDecision({
                action: decision.type || 'original_post',
                reasoning: decision.reasoning || 'No reasoning provided',
                confidence: decision.metadata?.confidence || 0.5
            });
        }
        catch (error) {
            console.error('❌ [自律実行] エラー:', error);
            throw error;
        }
    }
    // Legacy methods that delegate to modules
    async assessSimplifiedNeeds(context) {
        return this.contextManager.assessSimplifiedNeeds(context);
    }
    async assessMaintenanceNeeds(context) {
        const needs = [];
        if (context.systemHealth === 'degraded') {
            needs.push({
                id: 'system-maintenance',
                priority: 'high',
                description: 'システムメンテナンスが必要',
                type: 'maintenance',
                createdAt: new Date().toISOString()
            });
        }
        return needs;
    }
    async assessCurrentNeeds(context) {
        const needs = [];
        // コンテンツ作成の必要性
        needs.push({
            id: 'content-creation',
            priority: 'medium',
            description: '定期的なコンテンツ作成',
            type: 'content',
            createdAt: new Date().toISOString()
        });
        return needs;
    }
    async executeExpandedActions(actionDecisions, integratedContext) {
        await this.actionExecutor.executeExpandedActions(actionDecisions, integratedContext);
    }
    async loadCurrentContext() {
        return this.contextManager.loadCurrentContext();
    }
    async saveExecutionResults(integratedContext, results) {
        const outputDir = join(process.cwd(), 'tasks', 'outputs');
        await fs.promises.mkdir(outputDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `execution-results-${timestamp}.yaml`;
        const filePath = join(outputDir, filename);
        const outputData = {
            execution: {
                timestamp: Date.now(),
                resultCount: results.length
            },
            context: {
                systemHealth: integratedContext.account.healthScore,
                timestamp: integratedContext.timestamp
            },
            results: results,
            metadata: {
                savedAt: new Date().toISOString(),
                executionType: 'expanded_actions'
            }
        };
        await fs.promises.writeFile(filePath, yaml.dump(outputData));
        console.log(`💾 [実行結果] 結果を保存: ${filename}`);
    }
    async saveExecutionResultsLegacy(actions) {
        const outputDir = join(process.cwd(), 'tasks', 'outputs');
        await fs.promises.mkdir(outputDir, { recursive: true });
        const filename = `legacy-actions-${Date.now()}.yaml`;
        const filePath = join(outputDir, filename);
        const outputData = {
            actions: actions,
            metadata: {
                savedAt: new Date().toISOString(),
                type: 'legacy_actions',
                count: actions.length
            }
        };
        await fs.promises.writeFile(filePath, yaml.dump(outputData));
        console.log(`💾 [レガシー結果] アクションを保存: ${filename}`);
    }
    async handleExecutionError(error) {
        console.error('🚨 [エラーハンドリング] 実行エラーの処理開始...');
        const errorInfo = {
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            executionDuration: Date.now() - this.executionStartTime,
            systemHealth: 'error'
        };
        // エラーログを保存
        try {
            const outputDir = join(process.cwd(), 'tasks', 'outputs');
            await fs.promises.mkdir(outputDir, { recursive: true });
            const filename = `error-log-${Date.now()}.yaml`;
            const filePath = join(outputDir, filename);
            await fs.promises.writeFile(filePath, yaml.dump(errorInfo));
            console.log(`📝 [エラーログ] エラー情報を保存: ${filename}`);
        }
        catch (saveError) {
            console.error('❌ [エラーログ保存] エラー:', saveError);
        }
        // キャッシュをクリア（次回実行時の問題を防ぐ）
        this.cacheManager.clearCache();
        console.log('✅ [エラーハンドリング] エラー処理完了');
    }
    // Parallel analysis methods (simplified versions)
    async step2_executeParallelAnalysis() {
        try {
            console.log('🔄 [並列分析] 並列分析を実行中...');
            const accountResult = await this.cacheManager.getCachedAccountStatus();
            const infoResult = await this.enhancedInfoCollector.collectInformation();
            return {
                account: accountResult,
                information: infoResult,
                timestamp: Date.now()
            };
        }
        catch (error) {
            console.error('❌ [並列分析] エラー:', error);
            return this.executeTestModeFallback('parallel-analysis');
        }
    }
    async executeTestModeFallback(sessionId) {
        console.log(`🔧 [テストモード] フォールバック実行: ${sessionId}`);
        return {
            account: {
                timestamp: new Date().toISOString(),
                followers: { current: 0, change_24h: 0, growth_rate: '0%' },
                engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
                performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
                health: { status: 'healthy', api_limits: 'normal', quality_score: 100 },
                recommendations: [],
                healthScore: 100
            },
            information: {
                executionTime: 0,
                status: 'fallback',
                error: 'Test mode fallback'
            },
            timestamp: Date.now()
        };
    }
    async generateBaselineContext() {
        return this.contextManager.generateBaselineContext();
    }
    async preloadActionSpecificInformation() {
        return this.preloadActionSpecificInformationWithContext({});
    }
    async preloadActionSpecificInformationWithContext(context) {
        console.log('📋 [Action特化情報] コンテキスト付き情報収集開始...');
        try {
            const collectionConfig = this.configManager.loadActionCollectionConfig();
            return {
                status: 'success',
                executionTime: Date.now(),
                original_post: {
                    actionType: 'original_post',
                    results: this.configManager.convertActionSpecificToCollectionResults({
                        status: 'success',
                        executionTime: Date.now()
                    }),
                    sufficiencyScore: 0.8,
                    executionTime: Date.now(),
                    strategyUsed: {
                        actionType: 'original_post',
                        targets: [],
                        priority: 2,
                        expectedDuration: 300,
                        searchTerms: [],
                        sources: [],
                        topic: 'original_post',
                        keywords: []
                    },
                    qualityMetrics: {
                        relevanceScore: 0.8,
                        credibilityScore: 0.8,
                        uniquenessScore: 0.7,
                        timelinessScore: 0.9,
                        overallScore: 0.8,
                        feedback: {
                            strengths: ['高い関連性', '信頼性のあるソース'],
                            improvements: ['より具体的な例が必要'],
                            confidence: 0.8
                        }
                    }
                }
            };
        }
        catch (error) {
            console.error('❌ [Action特化情報] エラー:', error);
            return {
                status: 'fallback',
                executionTime: Date.now()
            };
        }
    }
}
