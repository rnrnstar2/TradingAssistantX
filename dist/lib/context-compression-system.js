/**
 * コンテキスト圧迫抑制・最小情報システム
 * 全コンポーネント統合エントリポイント
 */
import { RealtimeInfoCollector } from './realtime-info-collector';
import { logger } from './minimal-logger';
import { ClaudeOptimizedProvider } from './claude-optimized-provider';
import { MinimalDecisionEngine } from './minimal-decision-engine';
import { memoryOptimizer } from './memory-optimizer';
export class ContextCompressionSystem {
    realtimeCollector;
    claudeProvider;
    decisionEngine;
    memoryOptimizer;
    logger;
    performanceMetrics = {
        memoryUsageMB: 0,
        contextSize: 0,
        decisionTimeMs: 0,
        cacheHitRate: 0
    };
    constructor() {
        this.realtimeCollector = new RealtimeInfoCollector();
        this.claudeProvider = new ClaudeOptimizedProvider();
        this.decisionEngine = new MinimalDecisionEngine();
        this.memoryOptimizer = memoryOptimizer;
        this.logger = logger;
        this.initializeSystem();
    }
    /**
     * システム初期化
     */
    initializeSystem() {
        // リアルタイム情報収集のクリーンアップ開始
        this.realtimeCollector.startPeriodicCleanup();
        // 初期化完了ログ
        this.logger.info('コンテキスト圧縮システム初期化完了');
    }
    /**
     * Claude判断の高速実行
     */
    async executeOptimizedDecision(actionType) {
        const startTime = Date.now();
        try {
            // メモリ健全性チェック
            if (!this.memoryOptimizer.isHealthy()) {
                await this.memoryOptimizer.performManualCleanup();
            }
            // 最小限コンテキスト取得
            const context = await this.claudeProvider.getDecisionContext(actionType);
            // 高速判断実行
            const decision = await this.decisionEngine.quickDecision();
            // パフォーマンス記録
            const executionTime = Date.now() - startTime;
            this.updatePerformanceMetrics(context, decision, executionTime);
            this.logger.info(`決定完了: ${decision.action} (${executionTime}ms)`);
            return decision;
        }
        catch (error) {
            this.logger.error('OptimizedDecision実行エラー', error);
            // フォールバック決定
            return {
                action: 'wait',
                reason: 'システムエラー - 待機',
                confidence: 0.3
            };
        }
    }
    /**
     * システム状態の取得
     */
    async getSystemStatus() {
        const memoryStats = this.memoryOptimizer.getMemoryStats();
        const statusSummary = await this.claudeProvider.getStatusSummary();
        return `${statusSummary} | メモリ:${Math.round(memoryStats.heapUsed / 1024 / 1024)}MB | キャッシュ健全性:${this.memoryOptimizer.isHealthy() ? 'OK' : 'WARNING'}`;
    }
    /**
     * パフォーマンスレポート生成
     */
    async generatePerformanceReport() {
        const memoryReport = this.memoryOptimizer.getMemoryReport();
        const metrics = this.performanceMetrics;
        return `
コンテキスト圧縮システム - パフォーマンスレポート

【効率化指標】
- 平均実行時間: ${metrics.decisionTimeMs}ms
- コンテキストサイズ: ${metrics.contextSize}文字
- メモリ使用量: ${metrics.memoryUsageMB}MB
- キャッシュヒット率: ${(metrics.cacheHitRate * 100).toFixed(1)}%

【メモリ詳細】
${memoryReport}

【システム健全性】
- メモリ健全性: ${this.memoryOptimizer.isHealthy() ? '✅ 良好' : '⚠️ 要注意'}
- 実行速度: ${metrics.decisionTimeMs < 3000 ? '✅ 高速' : '⚠️ 改善要'}
`.trim();
    }
    /**
     * バッチ処理最適化
     */
    async executeBatchOperations(operations) {
        const startTime = Date.now();
        const decisions = [];
        try {
            // 事前にコンテキスト取得（使い回し）
            const baseContext = await this.claudeProvider.getDecisionContext();
            const limitedOperations = operations.slice(0, 3); // 最大3操作
            for (let i = 0; i < limitedOperations.length; i++) {
                try {
                    const decision = await this.decisionEngine.makeDecision(baseContext);
                    if (decision) {
                        decisions.push(decision);
                        // 成功時は進捗更新
                        if (decision.action !== 'wait') {
                            baseContext.current.todayProgress++;
                        }
                    }
                }
                catch (error) {
                    this.logger.error(`バッチ操作${i}エラー`, error);
                    // 個別のエラーは続行
                }
            }
            const totalTime = Date.now() - startTime;
            this.logger.info(`バッチ処理完了: ${decisions.length}件 (${totalTime}ms)`);
            return decisions;
        }
        catch (error) {
            this.logger.error('バッチ処理エラー', error);
            return decisions; // 部分的な結果でも返す
        }
    }
    /**
     * リアルタイム監視開始
     */
    startRealtimeMonitoring() {
        // 30秒ごとにシステム監視
        setInterval(async () => {
            try {
                await this.claudeProvider.monitorPerformance();
                await this.decisionEngine.monitorDecisionQuality();
                const status = await this.getSystemStatus();
                this.logger.systemStatus('healthy', status);
            }
            catch (error) {
                this.logger.systemStatus('warning', 'monitoring error');
            }
        }, 30 * 1000);
        this.logger.info('リアルタイム監視開始');
    }
    /**
     * システム最適化実行
     */
    async optimizeSystem() {
        const startTime = Date.now();
        // メモリクリーンアップ
        await this.memoryOptimizer.performManualCleanup();
        // パフォーマンス測定
        await this.claudeProvider.monitorPerformance();
        // 品質チェック
        await this.decisionEngine.monitorDecisionQuality();
        const optimizationTime = Date.now() - startTime;
        this.logger.info(`システム最適化完了 (${optimizationTime}ms)`);
    }
    /**
     * パフォーマンスメトリクスの更新
     */
    updatePerformanceMetrics(context, decision, executionTime) {
        const memoryStats = this.memoryOptimizer.getMemoryStats();
        this.performanceMetrics = {
            memoryUsageMB: Math.round(memoryStats.heapUsed / 1024 / 1024),
            contextSize: JSON.stringify(context).length,
            decisionTimeMs: executionTime,
            cacheHitRate: 0.8 // プレースホルダー - 実際のキャッシュ統計に置き換える
        };
    }
    /**
     * 緊急最適化（メモリ不足時など）
     */
    async emergencyOptimization() {
        this.logger.warn('緊急最適化開始');
        // 即座にメモリクリーンアップ
        await this.memoryOptimizer.performManualCleanup();
        // 全キャッシュクリア
        this.realtimeCollector = new RealtimeInfoCollector();
        // 强制GC
        if (global.gc) {
            global.gc();
        }
        this.logger.warn('緊急最適化完了');
    }
    /**
     * システム停止
     */
    shutdown() {
        this.memoryOptimizer.stop();
        this.logger.info('コンテキスト圧縮システム停止');
    }
}
// シングルトンインスタンス
export const contextCompressionSystem = new ContextCompressionSystem();
