import path from 'path';
import { yamlUtils } from './yaml-utils.js';
/**
 * Real-time performance monitoring and metrics collection system
 * Implements Task C1: Real-time metrics collection with the specified interface
 */
export class PerformanceMonitor {
    currentSession = {};
    sessionStartTime = 0;
    metricsHistory = [];
    metricsFilePath;
    maxHistorySize = 1000;
    constructor() {
        this.metricsFilePath = path.join(process.cwd(), 'data', 'metrics-history.yaml');
    }
    /**
     * Start a new performance monitoring session
     */
    startSession() {
        this.sessionStartTime = Date.now();
        this.currentSession = {
            execution: {
                totalTime: 0,
                infoCollectionTime: 0,
                contentGenerationTime: 0,
                memoryUsage: 0
            },
            quality: {
                contentScore: 0,
                informationRelevance: 0,
                generationSuccess: false
            },
            resources: {
                browserCount: 0,
                activeContexts: 0,
                networkRequests: 0
            }
        };
    }
    /**
     * Record information collection time
     */
    recordInfoCollectionTime(startTime, endTime) {
        if (!this.currentSession.execution)
            return;
        this.currentSession.execution.infoCollectionTime = endTime - startTime;
    }
    /**
     * Record content generation time
     */
    recordContentGenerationTime(startTime, endTime) {
        if (!this.currentSession.execution)
            return;
        this.currentSession.execution.contentGenerationTime = endTime - startTime;
    }
    /**
     * Record memory usage
     */
    recordMemoryUsage() {
        if (!this.currentSession.execution)
            return;
        const memoryUsage = process.memoryUsage();
        this.currentSession.execution.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // MB
    }
    /**
     * Record quality metrics
     */
    recordQualityMetrics(contentScore, informationRelevance, generationSuccess) {
        if (!this.currentSession.quality)
            return;
        this.currentSession.quality = {
            contentScore,
            informationRelevance,
            generationSuccess
        };
    }
    /**
     * Record resource usage
     */
    recordResourceUsage(browserCount, activeContexts, networkRequests) {
        if (!this.currentSession.resources)
            return;
        this.currentSession.resources = {
            browserCount,
            activeContexts,
            networkRequests
        };
    }
    /**
     * End the current session and save metrics
     */
    async endSession() {
        const totalTime = Date.now() - this.sessionStartTime;
        if (this.currentSession.execution) {
            this.currentSession.execution.totalTime = totalTime;
        }
        // Record final memory usage if not already recorded
        if (this.currentSession.execution && this.currentSession.execution.memoryUsage === 0) {
            this.recordMemoryUsage();
        }
        const finalMetrics = this.currentSession;
        await this.saveMetrics(finalMetrics);
        return finalMetrics;
    }
    /**
     * Save metrics to persistent storage
     */
    async saveMetrics(metrics) {
        try {
            // Load existing metrics
            await this.loadMetricsHistory();
            // Add timestamp and append new metrics
            const timestampedMetrics = {
                timestamp: new Date().toISOString(),
                ...metrics
            };
            this.metricsHistory.push(metrics);
            // Keep only the most recent entries
            if (this.metricsHistory.length > this.maxHistorySize) {
                this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
            }
            // Save to YAML file
            const yamlData = {
                version: "1.0.0",
                metadata: {
                    name: "Performance Metrics History",
                    description: "リアルタイム・パフォーマンスメトリクス履歴",
                    lastUpdated: new Date().toISOString(),
                    totalEntries: this.metricsHistory.length
                },
                performanceHistory: this.metricsHistory.map((m, index) => ({
                    sessionId: index + 1,
                    timestamp: new Date().toISOString(),
                    ...m
                }))
            };
            await yamlUtils.writeYaml(this.metricsFilePath, yamlData);
        }
        catch (error) {
            console.warn('パフォーマンス・メトリクス保存エラー:', error);
        }
    }
    /**
     * Load metrics history from storage
     */
    async loadMetricsHistory() {
        try {
            const data = await yamlUtils.readYaml(this.metricsFilePath);
            if (data && data.performanceHistory && Array.isArray(data.performanceHistory)) {
                this.metricsHistory = data.performanceHistory.map((entry) => ({
                    execution: entry.execution || {
                        totalTime: 0,
                        infoCollectionTime: 0,
                        contentGenerationTime: 0,
                        memoryUsage: 0
                    },
                    quality: entry.quality || {
                        contentScore: 0,
                        informationRelevance: 0,
                        generationSuccess: false
                    },
                    resources: entry.resources || {
                        browserCount: 0,
                        activeContexts: 0,
                        networkRequests: 0
                    }
                }));
            }
            else {
                this.metricsHistory = [];
            }
        }
        catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.metricsHistory = [];
        }
    }
    /**
     * Get recent metrics for analysis
     */
    async getRecentMetrics(count = 10) {
        await this.loadMetricsHistory();
        return this.metricsHistory.slice(-count);
    }
    /**
     * Task C2: Generate automatic optimization recommendations
     */
    async generateOptimizationRecommendations() {
        await this.loadMetricsHistory();
        const recommendations = [];
        if (this.metricsHistory.length < 3) {
            return [{
                    category: 'execution',
                    priority: 'low',
                    title: 'データ不足',
                    description: '最適化推奨には更多くのパフォーマンス・データが必要です',
                    expectedImprovement: 'データ蓄積後に分析可能',
                    implementation: '継続的なシステム実行'
                }];
        }
        const recentMetrics = this.metricsHistory.slice(-10);
        const avgExecutionTime = recentMetrics.reduce((sum, m) => sum + m.execution.totalTime, 0) / recentMetrics.length;
        const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.execution.memoryUsage, 0) / recentMetrics.length;
        const avgContentScore = recentMetrics.reduce((sum, m) => sum + m.quality.contentScore, 0) / recentMetrics.length;
        const avgBrowserCount = recentMetrics.reduce((sum, m) => sum + m.resources.browserCount, 0) / recentMetrics.length;
        // Execution time optimization
        if (avgExecutionTime > 30000) { // > 30 seconds
            recommendations.push({
                category: 'execution',
                priority: 'high',
                title: '実行時間最適化',
                description: `平均実行時間が${(avgExecutionTime / 1000).toFixed(1)}秒と長すぎます`,
                expectedImprovement: '実行時間を30-50%短縮可能',
                implementation: '並列処理の導入、不要な処理の削除、キャッシング最適化'
            });
        }
        // Memory usage optimization
        if (avgMemoryUsage > 200) { // > 200MB
            recommendations.push({
                category: 'memory',
                priority: 'medium',
                title: 'メモリ使用量最適化',
                description: `平均メモリ使用量が${avgMemoryUsage.toFixed(1)}MBと高いです`,
                expectedImprovement: 'メモリ使用量を20-40%削減可能',
                implementation: 'データ構造最適化、不要なオブジェクト解放、メモリリーク調査'
            });
        }
        // Content quality improvement
        if (avgContentScore < 7) {
            recommendations.push({
                category: 'quality',
                priority: 'high',
                title: 'コンテンツ品質向上',
                description: `平均コンテンツスコアが${avgContentScore.toFixed(1)}/10と低いです`,
                expectedImprovement: 'コンテンツ品質を15-30%向上可能',
                implementation: '情報収集方法の改善、Claude提示の最適化、品質評価基準の見直し'
            });
        }
        // Browser resource optimization
        if (avgBrowserCount > 3) {
            recommendations.push({
                category: 'network',
                priority: 'medium',
                title: 'ブラウザリソース最適化',
                description: `平均ブラウザ数が${avgBrowserCount.toFixed(1)}と多すぎます`,
                expectedImprovement: 'リソース消費を25-40%削減可能',
                implementation: 'ブラウザプール管理、セッション再利用、リソース制限実装'
            });
        }
        return recommendations;
    }
    /**
     * Task C3: Detect performance anomalies
     */
    async detectAnomalies() {
        await this.loadMetricsHistory();
        const anomalies = [];
        if (this.metricsHistory.length < 5)
            return anomalies;
        const recentMetrics = this.metricsHistory.slice(-5);
        const baseline = this.metricsHistory.slice(-20, -5);
        if (baseline.length < 3)
            return anomalies;
        // Calculate baselines
        const baselineExecutionTime = baseline.reduce((sum, m) => sum + m.execution.totalTime, 0) / baseline.length;
        const baselineMemoryUsage = baseline.reduce((sum, m) => sum + m.execution.memoryUsage, 0) / baseline.length;
        const baselineContentScore = baseline.reduce((sum, m) => sum + m.quality.contentScore, 0) / baseline.length;
        const currentExecutionTime = recentMetrics[recentMetrics.length - 1].execution.totalTime;
        const currentMemoryUsage = recentMetrics[recentMetrics.length - 1].execution.memoryUsage;
        const currentContentScore = recentMetrics[recentMetrics.length - 1].quality.contentScore;
        // Execution time anomaly
        if (currentExecutionTime > baselineExecutionTime * 1.5) {
            anomalies.push({
                type: 'execution_time',
                severity: currentExecutionTime > baselineExecutionTime * 2 ? 'critical' : 'high',
                description: '実行時間が基準値を大幅に超過',
                value: currentExecutionTime,
                threshold: baselineExecutionTime * 1.5,
                timestamp: new Date().toISOString()
            });
        }
        // Memory usage anomaly
        if (currentMemoryUsage > baselineMemoryUsage * 1.8) {
            anomalies.push({
                type: 'memory_usage',
                severity: currentMemoryUsage > baselineMemoryUsage * 2.5 ? 'critical' : 'high',
                description: 'メモリ使用量が異常に増加',
                value: currentMemoryUsage,
                threshold: baselineMemoryUsage * 1.8,
                timestamp: new Date().toISOString()
            });
        }
        // Quality drop anomaly
        if (currentContentScore < baselineContentScore * 0.7) {
            anomalies.push({
                type: 'quality_drop',
                severity: currentContentScore < baselineContentScore * 0.5 ? 'critical' : 'medium',
                description: 'コンテンツ品質が大幅に低下',
                value: currentContentScore,
                threshold: baselineContentScore * 0.7,
                timestamp: new Date().toISOString()
            });
        }
        return anomalies;
    }
    /**
     * Task C3: Analyze performance trends
     */
    async analyzePerformanceTrends() {
        await this.loadMetricsHistory();
        const trends = [];
        if (this.metricsHistory.length < 10)
            return trends;
        const recentPeriod = this.metricsHistory.slice(-5);
        const previousPeriod = this.metricsHistory.slice(-10, -5);
        const metrics = [
            { key: 'totalTime', category: 'execution' },
            { key: 'memoryUsage', category: 'execution' },
            { key: 'contentScore', category: 'quality' },
            { key: 'informationRelevance', category: 'quality' },
            { key: 'browserCount', category: 'resources' },
            { key: 'networkRequests', category: 'resources' }
        ];
        for (const { key, category } of metrics) {
            const recentAvg = recentPeriod.reduce((sum, m) => {
                const value = m[category][key];
                return sum + (typeof value === 'number' ? value : 0);
            }, 0) / recentPeriod.length;
            const previousAvg = previousPeriod.reduce((sum, m) => {
                const value = m[category][key];
                return sum + (typeof value === 'number' ? value : 0);
            }, 0) / previousPeriod.length;
            const changePercent = previousAvg === 0 ? 0 : ((recentAvg - previousAvg) / previousAvg) * 100;
            let trend = 'stable';
            if (Math.abs(changePercent) > 10) {
                if (key === 'totalTime' || key === 'memoryUsage' || key === 'browserCount' || key === 'networkRequests') {
                    // For these metrics, lower is better
                    trend = changePercent > 0 ? 'degrading' : 'improving';
                }
                else {
                    // For quality metrics, higher is better
                    trend = changePercent > 0 ? 'improving' : 'degrading';
                }
            }
            trends.push({
                metric: key,
                trend,
                changePercent,
                period: '最近5セッション vs 前5セッション'
            });
        }
        return trends;
    }
    /**
     * Get current session metrics (for real-time monitoring)
     */
    getCurrentSessionMetrics() {
        return { ...this.currentSession };
    }
    /**
     * Generate performance summary for dashboard
     */
    async generatePerformanceSummary() {
        const [recommendations, anomalies, trends] = await Promise.all([
            this.generateOptimizationRecommendations(),
            this.detectAnomalies(),
            this.analyzePerformanceTrends()
        ]);
        // Calculate health score
        let healthScore = 100;
        anomalies.forEach(anomaly => {
            switch (anomaly.severity) {
                case 'critical':
                    healthScore -= 25;
                    break;
                case 'high':
                    healthScore -= 15;
                    break;
                case 'medium':
                    healthScore -= 10;
                    break;
                case 'low':
                    healthScore -= 5;
                    break;
            }
        });
        const degradingTrends = trends.filter(t => t.trend === 'degrading').length;
        healthScore -= degradingTrends * 5;
        healthScore = Math.max(0, healthScore);
        return {
            currentMetrics: this.getCurrentSessionMetrics(),
            recommendations,
            anomalies,
            trends,
            healthScore
        };
    }
}
