import { AutonomousExecutor } from '../core/autonomous-executor.js';
import { LoopManager } from '../core/loop-manager.js';
import { SystemDecisionEngine } from '../core/decision-engine.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
export class CoreRunner {
    options;
    autonomousExecutor;
    loopManager;
    decisionEngine;
    metrics;
    constructor(options = { mode: 'single' }) {
        this.options = options;
        this.autonomousExecutor = new AutonomousExecutor();
        this.loopManager = new LoopManager();
        this.decisionEngine = new SystemDecisionEngine();
        this.metrics = this.initializeMetrics();
        console.log('🎯 [CoreRunner] 共通実行ロジック初期化完了');
        console.log(`🔧 [実行モード] ${this.options.mode === 'single' ? '単一実行' : 'ループ実行'}`);
    }
    async runSingle() {
        console.log('🚀 [CoreRunner] 単一実行フロー開始...');
        console.log('📋 実行プロセス: アカウント分析 → 投稿作成のワークフロー');
        this.metrics = this.initializeMetrics();
        this.metrics.startTime = Date.now();
        try {
            console.log('🔍 [Phase 1] アカウント分析フェーズ開始...');
            const analysisResult = await this.executeAccountAnalysis();
            console.log('✅ [Phase 1] アカウント分析完了');
            console.log('📝 [Phase 2] 投稿作成フェーズ開始...');
            await this.executeContentCreation(analysisResult);
            console.log('✅ [Phase 2] 投稿作成完了');
            this.metrics.success = true;
            this.metrics.endTime = Date.now();
            this.metrics.executionDuration = this.metrics.endTime - this.metrics.startTime;
            console.log(`🎉 [CoreRunner] 単一実行フロー完了 (${this.metrics.executionDuration}ms)`);
            if (this.options.enableMetrics) {
                await this.saveExecutionMetrics();
            }
        }
        catch (error) {
            console.error('❌ [CoreRunner] 単一実行エラー:', error);
            this.metrics.success = false;
            this.metrics.errorCount++;
            this.metrics.endTime = Date.now();
            this.metrics.executionDuration = this.metrics.endTime - this.metrics.startTime;
            await this.handleExecutionError(error);
            throw error;
        }
    }
    async runLoop() {
        console.log('🔄 [CoreRunner] ループ実行フロー開始...');
        console.log('📋 実行プロセス: 1日15回の定時実行システム');
        try {
            console.log('⏰ [LoopManager] 定時実行スケジュール開始...');
            await this.loopManager.scheduleAutonomousLoop();
            console.log('📊 [監視システム] 実行状態監視を開始...');
            this.startExecutionMonitoring();
            console.log('✅ [CoreRunner] ループ実行フロー開始完了');
            console.log('💡 プロセスは継続実行中です。停止するにはCtrl+Cを押してください。');
        }
        catch (error) {
            console.error('❌ [CoreRunner] ループ実行エラー:', error);
            await this.handleExecutionError(error);
            throw error;
        }
    }
    async executeAccountAnalysis() {
        console.log('📊 [アカウント分析] 現在のアカウント状況を分析中...');
        try {
            const baselineContext = await this.autonomousExecutor.generateBaselineContext();
            console.log('✅ [ベースライン] 基本コンテキスト取得完了');
            const parallelAnalysis = await this.autonomousExecutor.step2_executeParallelAnalysis();
            console.log('✅ [並列分析] 並列データ分析完了');
            const integratedContext = {
                ...baselineContext,
                account: {
                    currentState: parallelAnalysis.account,
                    recommendations: [],
                    healthScore: parallelAnalysis.account.healthScore || 75
                },
                market: baselineContext.market || {
                    trends: [],
                    opportunities: [],
                    competitorActivity: []
                },
                actionSuggestions: baselineContext.actionSuggestions || []
            };
            console.log('📈 [分析結果]:', {
                アカウント健康度: `${integratedContext.account.healthScore}/100`,
                フォロワー数: integratedContext.account.currentState?.followers?.current || 0,
                エンゲージメント率: integratedContext.account.currentState?.engagement?.engagement_rate || '0%',
                推奨アクション数: integratedContext.actionSuggestions.length
            });
            return integratedContext;
        }
        catch (error) {
            console.error('❌ [アカウント分析] エラー:', error);
            const fallbackContext = {
                timestamp: Date.now(),
                account: {
                    currentState: {
                        timestamp: new Date().toISOString(),
                        followers: { current: 0, change_24h: 0, growth_rate: '0%' },
                        engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
                        performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
                        health: { status: 'healthy', api_limits: 'normal', quality_score: 50 },
                        recommendations: [],
                        healthScore: 50
                    },
                    recommendations: [],
                    healthScore: 50
                },
                market: { trends: [], opportunities: [], competitorActivity: [] },
                actionSuggestions: []
            };
            console.log('🔄 [フォールバック] 基本的なコンテキストで継続');
            return fallbackContext;
        }
    }
    async executeContentCreation(context) {
        console.log('✍️ [投稿作成] コンテンツ作成プロセス開始...');
        try {
            console.log('🧠 [戦略策定] 統合コンテキストに基づく意思決定...');
            const strategicDecisions = await this.decisionEngine.planActionsWithIntegratedContext(context);
            if (strategicDecisions.length === 0) {
                console.log('⚠️ [戦略策定] 決定が生成されませんでした、フォールバック実行');
                await this.executeBasicPosting();
                return;
            }
            console.log(`📋 [戦略決定] ${strategicDecisions.length}件の戦略的決定を策定`);
            strategicDecisions.forEach((decision, index) => {
                console.log(`  ${index + 1}. ${decision.type} (${decision.priority})`);
            });
            console.log('🎯 [実行フェーズ] 自律実行システム起動...');
            await this.autonomousExecutor.executeAutonomously();
            this.metrics.actionCount = strategicDecisions.length;
            console.log('✅ [投稿作成] コンテンツ作成プロセス完了');
        }
        catch (error) {
            console.error('❌ [投稿作成] エラー:', error);
            this.metrics.errorCount++;
            console.log('🔄 [フォールバック] 基本投稿実行');
            await this.executeBasicPosting();
        }
    }
    async executeBasicPosting() {
        console.log('📝 [基本投稿] フォールバック投稿実行中...');
        try {
            await this.autonomousExecutor.executeAutonomously();
            console.log('✅ [基本投稿] フォールバック投稿完了');
        }
        catch (error) {
            console.error('❌ [基本投稿] フォールバックも失敗:', error);
            throw error;
        }
    }
    startExecutionMonitoring() {
        console.log('📊 [監視システム] 実行監視開始...');
        const monitoringInterval = setInterval(() => {
            try {
                const status = this.loopManager.monitorExecutionStatus();
                if (this.options.enableLogging) {
                    console.log('📈 [監視レポート]:', {
                        実行中: status.isRunning ? 'はい' : 'いいえ',
                        実行回数: `${status.executionCount}回`,
                        エラー数: `${status.errors}件`,
                        最新実行: status.lastExecution,
                        次回予定: status.nextExecution
                    });
                }
            }
            catch (error) {
                console.error('❌ [監視エラー]:', error);
            }
        }, 5 * 60 * 1000); // 5分間隔で監視
        process.on('SIGINT', () => {
            console.log('\n🛑 [停止要求] 実行システム停止中...');
            clearInterval(monitoringInterval);
            this.shutdown();
        });
    }
    async shutdown() {
        console.log('🛑 [CoreRunner] システム停止処理開始...');
        try {
            if (this.options.mode === 'loop') {
                await this.loopManager.stopScheduledExecution();
            }
            if (this.options.enableMetrics) {
                await this.saveShutdownMetrics();
            }
            console.log('✅ [CoreRunner] システム停止完了');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ [停止エラー]:', error);
            process.exit(1);
        }
    }
    async handleExecutionError(error) {
        console.error('🚨 [CoreRunner] エラー処理開始...');
        const errorInfo = {
            timestamp: new Date().toISOString(),
            mode: this.options.mode,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            metrics: this.metrics
        };
        try {
            const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
            await fs.mkdir(outputDir, { recursive: true });
            const filename = `core-runner-error-${Date.now()}.yaml`;
            const filePath = path.join(outputDir, filename);
            await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
            console.log(`📝 [エラーログ] エラー情報を保存: ${filename}`);
        }
        catch (saveError) {
            console.error('❌ [エラーログ保存] エラー:', saveError);
        }
        console.log('✅ [CoreRunner] エラー処理完了');
    }
    async saveExecutionMetrics() {
        try {
            const metricsPath = path.join(process.cwd(), 'data', 'metrics', 'core-runner-metrics.yaml');
            const metricsData = {
                ...this.metrics,
                timestamp: new Date().toISOString(),
                mode: this.options.mode,
                performanceScore: this.calculatePerformanceScore()
            };
            await fs.mkdir(path.dirname(metricsPath), { recursive: true });
            let metricsHistory = [];
            try {
                const existingData = await fs.readFile(metricsPath, 'utf8');
                metricsHistory = yaml.load(existingData) || [];
            }
            catch {
                // ファイルが存在しない場合は空配列から開始
            }
            metricsHistory.push(metricsData);
            if (metricsHistory.length > 100) {
                metricsHistory = metricsHistory.slice(-100);
            }
            await fs.writeFile(metricsPath, yaml.dump(metricsHistory, { indent: 2 }));
            console.log('📊 [メトリクス] 実行メトリクスを保存しました');
        }
        catch (error) {
            console.error('❌ [メトリクス保存] エラー:', error);
        }
    }
    async saveShutdownMetrics() {
        const shutdownMetrics = {
            timestamp: new Date().toISOString(),
            shutdownReason: 'manual',
            finalMetrics: this.metrics,
            mode: this.options.mode
        };
        try {
            const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
            await fs.mkdir(outputDir, { recursive: true });
            const filename = `core-runner-shutdown-${Date.now()}.yaml`;
            const filePath = path.join(outputDir, filename);
            await fs.writeFile(filePath, yaml.dump(shutdownMetrics, { indent: 2 }));
            console.log(`📊 [停止メトリクス] 停止時メトリクスを保存: ${filename}`);
        }
        catch (error) {
            console.error('❌ [停止メトリクス保存] エラー:', error);
        }
    }
    calculatePerformanceScore() {
        if (this.metrics.executionDuration === 0)
            return 0;
        const baseScore = this.metrics.success ? 100 : 0;
        const durationPenalty = Math.min(this.metrics.executionDuration / 60000, 10) * 5;
        const errorPenalty = this.metrics.errorCount * 10;
        return Math.max(0, baseScore - durationPenalty - errorPenalty);
    }
    initializeMetrics() {
        return {
            startTime: 0,
            endTime: 0,
            executionDuration: 0,
            success: false,
            errorCount: 0,
            actionCount: 0
        };
    }
}
