/**
 * 効率的ブラウザプール管理システム
 * 動的スケーリング・負荷分散により最適リソース利用を実現
 */
export class PoolManager {
    contextPool = new Map();
    activeOperations = new Map();
    poolMetrics;
    demandAnalyzer;
    healthMonitor;
    loadBalancer;
    DEFAULT_CONFIG = {
        minSize: 2,
        maxSize: 20,
        idleTimeout: 5 * 60 * 1000, // 5分
        maxIdleTime: 10 * 60 * 1000, // 10分
        validationInterval: 2 * 60 * 1000, // 2分
        warmupSize: 5,
        strategy: 'adaptive'
    };
    config;
    constructor(inputConfig = {}) {
        this.config = { ...this.DEFAULT_CONFIG, ...inputConfig };
        this.poolMetrics = new PoolMetrics();
        this.demandAnalyzer = new DemandAnalyzer();
        this.healthMonitor = new HealthMonitor();
        this.loadBalancer = new ContextLoadBalancer();
        this.startPeriodicMaintenance();
    }
    /**
     * コンテキストプール効率管理
     * 動的サイズ調整・最適化されたリソース配分
     */
    async manageContextPool(poolConfig) {
        const poolType = 'default';
        const timestamp = Date.now();
        // 設定の更新
        this.config = { ...this.config, ...poolConfig };
        // 現在のプール状態を取得
        const currentPool = this.contextPool.get(poolType) || [];
        const activeContexts = currentPool.filter(item => item.isActive);
        const idleContexts = currentPool.filter(item => !item.isActive);
        // プール効率の測定
        const efficiency = this.calculatePoolEfficiency(currentPool);
        // ヘルススコアの計算
        const healthScore = await this.calculatePoolHealthScore(currentPool);
        // 推奨事項の生成
        const recommendations = this.generatePoolRecommendations(currentPool, efficiency, healthScore);
        // プール最適化の実行
        await this.optimizePool(poolType, currentPool, recommendations);
        // メトリクス更新
        this.poolMetrics.recordPoolStatus(poolType, {
            totalSize: currentPool.length,
            activeSize: activeContexts.length,
            idleSize: idleContexts.length,
            efficiency,
            healthScore
        });
        return {
            totalSize: currentPool.length,
            activeSize: activeContexts.length,
            idleSize: idleContexts.length,
            pendingRequests: this.getPendingRequestCount(poolType),
            efficiency,
            healthScore,
            recommendations
        };
    }
    /**
     * 動的プールサイズ調整
     * リアルタイム需要分析に基づく最適スケーリング
     */
    async adjustPoolSize(demandMetrics) {
        const poolType = 'default';
        const currentPool = this.contextPool.get(poolType) || [];
        const currentSize = currentPool.length;
        // 需要分析に基づく最適サイズ計算
        const optimalSize = this.calculateOptimalPoolSize(demandMetrics, currentSize);
        // 型安全性チェック
        if (!optimalSize || optimalSize < 0) {
            return {
                action: 'maintain',
                newSize: currentSize,
                reasoning: '最適サイズの計算に失敗しました',
                confidence: 0.1,
                expectedImpact: 'none'
            };
        }
        // 調整アクションの決定
        let action;
        let newSize = currentSize;
        let reasoning = '';
        let confidence = 0;
        if (optimalSize > currentSize + 2) {
            // 大幅増加が必要
            action = 'increase';
            newSize = Math.min(optimalSize, this.config.maxSize || 10);
            reasoning = `需要増加(${demandMetrics.requestRate.toFixed(1)} req/s)に対応してプールを拡大`;
            confidence = this.calculateAdjustmentConfidence(demandMetrics, 'increase');
            await this.expandPool(poolType, newSize - currentSize);
        }
        else if (optimalSize < currentSize - 3) {
            // 大幅減少が可能
            action = 'decrease';
            newSize = Math.max(optimalSize, this.config.minSize || 1);
            reasoning = `需要減少により効率改善のためプールを縮小`;
            confidence = this.calculateAdjustmentConfidence(demandMetrics, 'decrease');
            await this.shrinkPool(poolType, currentSize - newSize);
        }
        else {
            // 現状維持
            action = 'maintain';
            newSize = currentSize;
            reasoning = '現在のプールサイズが最適範囲内';
            confidence = 0.95;
        }
        const expectedImpact = this.calculateExpectedImpact(action, currentSize, newSize);
        return {
            action,
            newSize,
            reasoning,
            expectedImpact,
            confidence
        };
    }
    /**
     * コンテキスト再利用最適化
     * 効率的なセッション管理・キャッシュ戦略
     */
    async optimizeContextReuse(operationType) {
        const reuseAnalysis = this.analyzeContextReusePatterns(operationType);
        const sessionAffinityBenefit = this.calculateSessionAffinityBenefit(operationType);
        const cacheStrategy = this.determineCacheStrategy(operationType, reuseAnalysis);
        // コンテキスト最適化の推奨
        const optimizations = this.generateContextOptimizations(operationType, reuseAnalysis, sessionAffinityBenefit);
        return {
            contextReuse: reuseAnalysis.shouldReuse,
            sessionAffinity: sessionAffinityBenefit > 0.3,
            cacheStrategy,
            optimization: optimizations
        };
    }
    /**
     * プール全体のヘルスチェック
     * 包括的な健全性監視・問題検出・修復推奨
     */
    async performPoolHealthCheck() {
        const timestamp = Date.now();
        const allPools = Array.from(this.contextPool.entries());
        const components = [];
        const issues = [];
        const recommendations = [];
        // 各プールの健全性チェック
        for (const [poolType, pool] of allPools) {
            const poolHealth = await this.checkPoolHealth(poolType, pool);
            components.push(poolHealth.component);
            issues.push(...poolHealth.issues);
            recommendations.push(...poolHealth.recommendations);
        }
        // システム全体の健全性チェック
        const systemHealth = await this.checkSystemHealth();
        components.push(systemHealth.component);
        issues.push(...systemHealth.issues);
        recommendations.push(...systemHealth.recommendations);
        // 総合健全性ステータスの決定
        const overallHealth = this.determineOverallHealth(components, issues);
        return {
            overallHealth,
            components,
            issues,
            recommendations,
            lastChecked: timestamp
        };
    }
    /**
     * 負荷分散アルゴリズム
     * 効率的なタスク配分・最適化されたリソース利用
     */
    distributeLoad(operations) {
        const poolType = 'default';
        const currentPool = this.contextPool.get(poolType) || [];
        const activeContexts = currentPool.filter(item => item.isActive);
        // 負荷分散戦略の選択
        const strategy = this.selectLoadDistributionStrategy(operations, activeContexts);
        // 負荷の分散実行
        const distribution = this.loadBalancer.distribute(operations, activeContexts, strategy);
        // 効率性の計算
        const efficiency = this.calculateDistributionEfficiency(distribution);
        // 完了時間の推定
        const estimatedCompletion = this.estimateCompletionTime(operations, distribution);
        return {
            distribution,
            efficiency,
            balancing: strategy,
            estimated_completion: estimatedCompletion
        };
    }
    /**
     * 新しいコンテキストの取得
     */
    async acquireContext(poolType = 'default') {
        let pool = this.contextPool.get(poolType);
        if (!pool) {
            pool = [];
            this.contextPool.set(poolType, pool);
            await this.warmupPool(poolType);
        }
        // アイドルコンテキストを探す
        const idleContext = pool.find(item => !item.isActive && item.isValid());
        if (idleContext) {
            idleContext.isActive = true;
            idleContext.lastUsed = Date.now();
            return idleContext;
        }
        // 新しいコンテキストの作成（プールサイズ制限内）
        if (pool.length < this.config.maxSize) {
            const newContext = await this.createContextItem(poolType);
            pool.push(newContext);
            return newContext;
        }
        // プールが満杯の場合は待機または最古のコンテキストを再利用
        const oldestContext = pool.reduce((oldest, current) => current.lastUsed < oldest.lastUsed ? current : oldest);
        if (oldestContext) {
            oldestContext.isActive = true;
            oldestContext.lastUsed = Date.now();
            return oldestContext;
        }
        throw new Error(`コンテキスト取得失敗: プール ${poolType} でリソース不足`);
    }
    /**
     * コンテキストの解放
     */
    async releaseContext(contextId, poolType = 'default') {
        const pool = this.contextPool.get(poolType);
        if (!pool)
            return;
        const contextItem = pool.find(item => item.id === contextId);
        if (contextItem) {
            contextItem.isActive = false;
            contextItem.lastUsed = Date.now();
            // 使用回数の更新
            contextItem.usageCount++;
            // 過度に使用されたコンテキストの廃棄検討
            if (contextItem.usageCount > 100) {
                await this.retireContext(contextItem, pool);
            }
        }
    }
    // === Private Helper Methods ===
    async createContextItem(poolType) {
        // 実際のBrowserContextの作成は外部から注入される
        // ここでは仮実装
        const contextItem = {
            id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            context: null, // 実装時に適切なBrowserContextを設定
            poolType,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            usageCount: 0,
            isActive: true,
            isValid: () => true, // 実装時に適切な検証ロジックを設定
            errors: []
        };
        return contextItem;
    }
    calculatePoolEfficiency(pool) {
        if (pool.length === 0)
            return 1.0;
        const activeCount = pool.filter(item => item.isActive).length;
        const totalCount = pool.length;
        const utilizationRate = activeCount / totalCount;
        // 理想的な利用率は70-80%
        const idealUtilization = 0.75;
        const efficiency = Math.max(0, 1 - Math.abs(utilizationRate - idealUtilization));
        return efficiency;
    }
    async calculatePoolHealthScore(pool) {
        if (pool.length === 0)
            return 1.0;
        let score = 100;
        const now = Date.now();
        // エラーがあるコンテキストの割合
        const errorCount = pool.filter(item => item.errors.length > 0).length;
        const errorRate = errorCount / pool.length;
        score -= errorRate * 30;
        // 長時間アイドルなコンテキストの割合
        const staleCount = pool.filter(item => !item.isActive && (now - item.lastUsed) > this.config.maxIdleTime).length;
        const staleRate = staleCount / pool.length;
        score -= staleRate * 20;
        // 過度に使用されたコンテキストの割合
        const overusedCount = pool.filter(item => item.usageCount > 50).length;
        const overusedRate = overusedCount / pool.length;
        score -= overusedRate * 15;
        return Math.max(0, score) / 100;
    }
    generatePoolRecommendations(pool, efficiency, healthScore) {
        const recommendations = [];
        if (efficiency < 0.6) {
            recommendations.push({
                type: 'optimize',
                message: 'プール効率が低下しています。アイドルコンテキストの整理を推奨',
                priority: 2,
                autoApply: true
            });
        }
        if (healthScore < 0.7) {
            recommendations.push({
                type: 'cleanup',
                message: 'プール健全性が低下しています。問題コンテキストの修復が必要',
                priority: 1,
                autoApply: false
            });
        }
        if (pool.length < this.config.minSize) {
            recommendations.push({
                type: 'resize',
                message: `プールサイズが最小値(${this.config.minSize})を下回っています`,
                priority: 1,
                autoApply: true
            });
        }
        return recommendations;
    }
    async optimizePool(poolType, pool, recommendations) {
        for (const recommendation of recommendations) {
            if (recommendation.autoApply) {
                switch (recommendation.type) {
                    case 'cleanup':
                        await this.cleanupPool(poolType, pool);
                        break;
                    case 'resize':
                        await this.adjustPoolSizeToMinimum(poolType);
                        break;
                    case 'optimize':
                        await this.optimizeIdleContexts(poolType, pool);
                        break;
                }
            }
        }
    }
    calculateOptimalPoolSize(demandMetrics, currentSize) {
        const requestRate = demandMetrics.requestRate;
        const avgWaitTime = demandMetrics.averageWaitTime;
        const peakConcurrency = demandMetrics.peakConcurrency;
        const utilizationRate = demandMetrics.utilizationRate;
        // 需要ベースの最適サイズ計算
        let optimalSize = currentSize;
        // リクエストレートベースの調整
        if (requestRate > 5 && avgWaitTime > 1000) {
            optimalSize = Math.ceil(requestRate * 1.5);
        }
        // ピーク同時実行数ベースの調整
        if (peakConcurrency > currentSize * 0.8) {
            optimalSize = Math.max(optimalSize, Math.ceil(peakConcurrency * 1.2));
        }
        // 利用率ベースの調整
        if (utilizationRate > 0.9) {
            optimalSize = Math.max(optimalSize, Math.ceil(currentSize * 1.3));
        }
        else if (utilizationRate < 0.3) {
            optimalSize = Math.min(optimalSize, Math.ceil(currentSize * 0.7));
        }
        // 設定制限の適用
        return Math.max(this.config.minSize, Math.min(optimalSize, this.config.maxSize));
    }
    calculateAdjustmentConfidence(demandMetrics, action) {
        let confidence = 0.8; // ベース信頼度
        // トレンドの一貫性
        if (demandMetrics.trendDirection === 'increasing' && action === 'increase') {
            confidence += 0.15;
        }
        else if (demandMetrics.trendDirection === 'decreasing' && action === 'decrease') {
            confidence += 0.15;
        }
        // 利用率の明確性
        if (demandMetrics.utilizationRate > 0.9 || demandMetrics.utilizationRate < 0.3) {
            confidence += 0.1;
        }
        return Math.min(0.99, confidence);
    }
    calculateExpectedImpact(action, currentSize, newSize) {
        const sizeDiff = Math.abs(newSize - currentSize);
        const changePercent = Math.round((sizeDiff / currentSize) * 100);
        switch (action) {
            case 'increase':
                return `プール拡大により${changePercent}%のスループット向上を期待`;
            case 'decrease':
                return `プール縮小により${changePercent}%のリソース効率改善を期待`;
            case 'maintain':
                return '現在の効率を維持';
            default:
                return 'パフォーマンス影響は軽微';
        }
    }
    async expandPool(poolType, expandBy) {
        const pool = this.contextPool.get(poolType) || [];
        for (let i = 0; i < expandBy; i++) {
            try {
                const newContext = await this.createContextItem(poolType);
                pool.push(newContext);
            }
            catch (error) {
                console.warn(`プール拡張エラー: ${poolType}`, error);
                break;
            }
        }
        this.contextPool.set(poolType, pool);
    }
    async shrinkPool(poolType, shrinkBy) {
        const pool = this.contextPool.get(poolType) || [];
        const idleContexts = pool.filter(item => !item.isActive);
        // アイドルコンテキストから優先的に削除
        const toRemove = idleContexts.slice(0, shrinkBy);
        for (const contextItem of toRemove) {
            await this.retireContext(contextItem, pool);
        }
    }
    async retireContext(contextItem, pool) {
        try {
            if (contextItem.context && typeof contextItem.context.close === 'function') {
                await contextItem.context.close();
            }
        }
        catch (error) {
            console.warn(`コンテキスト終了エラー: ${contextItem.id}`, error);
        }
        const index = pool.indexOf(contextItem);
        if (index !== -1) {
            pool.splice(index, 1);
        }
    }
    analyzeContextReusePatterns(operationType) {
        // 操作タイプ別の再利用パターン分析
        const reusePatterns = {
            'data-extraction': { shouldReuse: true, reuseRate: 0.8 },
            'page-navigation': { shouldReuse: true, reuseRate: 0.9 },
            'form-submission': { shouldReuse: false, reuseRate: 0.3 },
            'screenshot': { shouldReuse: true, reuseRate: 0.95 },
            'pdf-generation': { shouldReuse: false, reuseRate: 0.4 }
        };
        return reusePatterns[operationType] || { shouldReuse: true, reuseRate: 0.7 };
    }
    calculateSessionAffinityBenefit(operationType) {
        // セッションアフィニティの効果分析
        const affinityBenefits = {
            'data-extraction': 0.6,
            'page-navigation': 0.4,
            'form-submission': 0.8,
            'screenshot': 0.2,
            'pdf-generation': 0.3
        };
        return affinityBenefits[operationType] || 0.5;
    }
    determineCacheStrategy(operationType, reuseAnalysis) {
        if (reuseAnalysis.reuseRate > 0.8) {
            return 'aggressive-cache';
        }
        else if (reuseAnalysis.reuseRate > 0.5) {
            return 'moderate-cache';
        }
        else {
            return 'minimal-cache';
        }
    }
    generateContextOptimizations(operationType, reuseAnalysis, sessionAffinityBenefit) {
        const optimizations = [];
        if (reuseAnalysis.shouldReuse) {
            optimizations.push({
                type: 'context-pooling',
                description: 'コンテキストプーリングによる再利用最適化',
                benefit: `${(reuseAnalysis.reuseRate * 100).toFixed(0)}%の再利用率改善`,
                cost: '中程度のメモリ使用量増加'
            });
        }
        if (sessionAffinityBenefit > 0.5) {
            optimizations.push({
                type: 'session-affinity',
                description: 'セッションアフィニティによる性能最適化',
                benefit: `${(sessionAffinityBenefit * 100).toFixed(0)}%の処理速度向上`,
                cost: '負荷分散の複雑化'
            });
        }
        return optimizations;
    }
    async checkPoolHealth(poolType, pool) {
        const now = Date.now();
        const issues = [];
        const recommendations = [];
        let healthScore = 100;
        // エラー率チェック
        const errorContexts = pool.filter(item => item.errors.length > 0);
        if (errorContexts.length > pool.length * 0.1) { // 10%超
            issues.push({
                component: poolType,
                severity: 'high',
                description: 'プール内のエラーコンテキスト率が高い',
                impact: 'パフォーマンス低下・不安定性',
                resolution: 'エラーコンテキストの再作成'
            });
            healthScore -= 30;
            recommendations.push('エラーコンテキストの一括修復');
        }
        // アイドル時間チェック
        const staleContexts = pool.filter(item => !item.isActive && (now - item.lastUsed) > this.config.maxIdleTime);
        if (staleContexts.length > pool.length * 0.3) { // 30%超
            issues.push({
                component: poolType,
                severity: 'medium',
                description: '長期間未使用コンテキストが多い',
                impact: 'メモリ効率の低下',
                resolution: 'アイドルコンテキストの整理'
            });
            healthScore -= 15;
            recommendations.push('定期的なアイドルコンテキスト清理');
        }
        const status = healthScore > 80 ? 'excellent' :
            healthScore > 60 ? 'good' :
                healthScore > 40 ? 'warning' : 'critical';
        return {
            component: {
                component: poolType,
                status,
                metrics: {
                    totalSize: pool.length,
                    activeSize: pool.filter(item => item.isActive).length,
                    errorRate: errorContexts.length / Math.max(pool.length, 1),
                    healthScore: healthScore / 100
                },
                uptime: now - (pool[0]?.createdAt || now)
            },
            issues,
            recommendations
        };
    }
    async checkSystemHealth() {
        const systemHealthScore = 90; // システム健全性（簡易実装）
        return {
            component: {
                component: 'pool-manager-system',
                status: 'good',
                metrics: {
                    totalPools: this.contextPool.size,
                    systemLoad: 0.3,
                    memoryUsage: 0.4,
                    healthScore: systemHealthScore / 100
                },
                uptime: Date.now()
            },
            issues: [],
            recommendations: []
        };
    }
    determineOverallHealth(components, issues) {
        const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
        const highIssues = issues.filter(issue => issue.severity === 'high').length;
        const avgHealthScore = components.reduce((sum, comp) => sum + comp.metrics.healthScore, 0) / Math.max(components.length, 1);
        if (criticalIssues > 0 || avgHealthScore < 0.4)
            return 'critical';
        if (highIssues > 0 || avgHealthScore < 0.6)
            return 'warning';
        if (avgHealthScore < 0.8)
            return 'good';
        return 'excellent';
    }
    selectLoadDistributionStrategy(operations, contexts) {
        const operationTypes = new Set(operations.map(op => op.type));
        const contextCount = contexts.length;
        if (operationTypes.size === 1 && contextCount > 5) {
            return 'type-optimized';
        }
        else if (operations.length > contextCount * 3) {
            return 'load-balanced';
        }
        else {
            return 'round-robin';
        }
    }
    calculateDistributionEfficiency(distribution) {
        if (distribution.length === 0)
            return 1.0;
        const utilizationRates = distribution.map(d => d.utilization / 100);
        const avgUtilization = utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length;
        const utilizationVariance = utilizationRates.reduce((sum, rate) => sum + Math.pow(rate - avgUtilization, 2), 0) / utilizationRates.length;
        // 分散が小さいほど効率的
        return Math.max(0, 1 - utilizationVariance);
    }
    estimateCompletionTime(operations, distribution) {
        if (operations.length === 0)
            return 0;
        const avgOperationTime = 3000; // 3秒仮定
        const totalOperations = operations.length;
        const activeContexts = distribution.length;
        return Math.ceil(totalOperations / Math.max(activeContexts, 1)) * avgOperationTime;
    }
    getPendingRequestCount(poolType) {
        const operations = this.activeOperations.get(poolType) || [];
        return operations.filter(op => op.type === 'pending').length;
    }
    async warmupPool(poolType) {
        const warmupSize = Math.min(this.config.warmupSize, this.config.maxSize);
        for (let i = 0; i < warmupSize; i++) {
            try {
                const contextItem = await this.createContextItem(poolType);
                contextItem.isActive = false; // ウォームアップ時は非アクティブ
                let pool = this.contextPool.get(poolType) || [];
                pool.push(contextItem);
                this.contextPool.set(poolType, pool);
            }
            catch (error) {
                console.warn(`プールウォームアップエラー: ${poolType}`, error);
            }
        }
    }
    async cleanupPool(poolType, pool) {
        const now = Date.now();
        const toCleanup = pool.filter(item => !item.isActive &&
            (now - item.lastUsed) > this.config.idleTimeout &&
            item.errors.length > 0);
        for (const contextItem of toCleanup) {
            await this.retireContext(contextItem, pool);
        }
    }
    async adjustPoolSizeToMinimum(poolType) {
        const pool = this.contextPool.get(poolType) || [];
        const deficit = this.config.minSize - pool.length;
        if (deficit > 0) {
            await this.expandPool(poolType, deficit);
        }
    }
    async optimizeIdleContexts(poolType, pool) {
        const now = Date.now();
        const longIdleContexts = pool.filter(item => !item.isActive &&
            (now - item.lastUsed) > this.config.maxIdleTime * 0.8);
        // 長期アイドルコンテキストの一部を削除
        const toRemove = longIdleContexts.slice(0, Math.floor(longIdleContexts.length * 0.3));
        for (const contextItem of toRemove) {
            await this.retireContext(contextItem, pool);
        }
    }
    startPeriodicMaintenance() {
        setInterval(async () => {
            // 定期的なプールメンテナンス
            for (const [poolType, pool] of Array.from(this.contextPool.entries())) {
                await this.cleanupPool(poolType, pool);
                await this.optimizeIdleContexts(poolType, pool);
            }
            // ヘルスチェック実行
            const healthCheck = await this.performPoolHealthCheck();
            if (healthCheck.overallHealth === 'critical') {
                console.warn('🚨 [Pool Manager] Critical health issues detected', {
                    issues: healthCheck.issues.length,
                    recommendations: healthCheck.recommendations.length
                });
            }
        }, this.config.validationInterval);
    }
    /**
     * システム終了時のクリーンアップ
     */
    async shutdown() {
        for (const [poolType, pool] of Array.from(this.contextPool.entries())) {
            for (const contextItem of pool) {
                await this.retireContext(contextItem, pool);
            }
        }
        this.contextPool.clear();
        this.activeOperations.clear();
    }
}
/**
 * プールメトリクス管理
 */
class PoolMetrics {
    metrics = new Map();
    MAX_RECORDS = 100;
    recordPoolStatus(poolType, status) {
        if (!this.metrics.has(poolType)) {
            this.metrics.set(poolType, []);
        }
        const records = this.metrics.get(poolType);
        records.push({
            timestamp: Date.now(),
            ...status
        });
        if (records.length > this.MAX_RECORDS) {
            records.shift();
        }
    }
    getAverageEfficiency(poolType) {
        const records = this.metrics.get(poolType) || [];
        if (records.length === 0)
            return 0;
        const sum = records.reduce((acc, record) => acc + record.efficiency, 0);
        return sum / records.length;
    }
}
/**
 * 需要分析エンジン
 */
class DemandAnalyzer {
    demandHistory = [];
    MAX_HISTORY = 50;
    analyzeDemand(currentMetrics) {
        this.demandHistory.push(currentMetrics);
        if (this.demandHistory.length > this.MAX_HISTORY) {
            this.demandHistory.shift();
        }
        return {
            ...currentMetrics,
            trendDirection: this.calculateTrend()
        };
    }
    calculateTrend() {
        if (this.demandHistory.length < 3)
            return 'stable';
        const recent = this.demandHistory.slice(-3);
        const requestRates = recent.map(d => d.requestRate);
        if (requestRates[2] > requestRates[0] * 1.2)
            return 'increasing';
        if (requestRates[2] < requestRates[0] * 0.8)
            return 'decreasing';
        return 'stable';
    }
}
/**
 * ヘルス監視システム
 */
class HealthMonitor {
    healthHistory = new Map();
    recordHealth(component, score) {
        if (!this.healthHistory.has(component)) {
            this.healthHistory.set(component, []);
        }
        const scores = this.healthHistory.get(component);
        scores.push(score);
        if (scores.length > 20) {
            scores.shift();
        }
    }
    getHealthTrend(component) {
        const scores = this.healthHistory.get(component) || [];
        if (scores.length < 3)
            return 'stable';
        const recent = scores.slice(-3);
        const improvement = recent[2] - recent[0];
        if (improvement > 0.1)
            return 'improving';
        if (improvement < -0.1)
            return 'degrading';
        return 'stable';
    }
}
/**
 * コンテキスト負荷分散
 */
class ContextLoadBalancer {
    distribute(operations, contexts, strategy) {
        const distribution = [];
        switch (strategy) {
            case 'round-robin':
                return this.roundRobinDistribute(operations, contexts);
            case 'load-balanced':
                return this.loadBalancedDistribute(operations, contexts);
            case 'type-optimized':
                return this.typeOptimizedDistribute(operations, contexts);
            default:
                return this.roundRobinDistribute(operations, contexts);
        }
    }
    roundRobinDistribute(operations, contexts) {
        if (contexts.length === 0)
            return [];
        const opsPerContext = Math.ceil(operations.length / contexts.length);
        return contexts.map((context, index) => ({
            node: context.id,
            allocation: opsPerContext,
            capacity: 100,
            utilization: Math.min(100, (opsPerContext / 10) * 100) // 10操作で100%と仮定
        }));
    }
    loadBalancedDistribute(operations, contexts) {
        if (contexts.length === 0)
            return [];
        // 使用回数の少ないコンテキストに優先的に配分
        const sortedContexts = contexts.slice().sort((a, b) => a.usageCount - b.usageCount);
        const opsPerContext = Math.ceil(operations.length / contexts.length);
        return sortedContexts.map(context => ({
            node: context.id,
            allocation: opsPerContext,
            capacity: 100,
            utilization: Math.min(100, (opsPerContext / 8) * 100) // より効率的と仮定
        }));
    }
    typeOptimizedDistribute(operations, contexts) {
        if (contexts.length === 0)
            return [];
        // 操作タイプに基づいて最適化
        const opsPerContext = Math.ceil(operations.length / contexts.length);
        return contexts.map(context => ({
            node: context.id,
            allocation: opsPerContext,
            capacity: 100,
            utilization: Math.min(100, (opsPerContext / 12) * 100) // 特化により効率向上
        }));
    }
}
