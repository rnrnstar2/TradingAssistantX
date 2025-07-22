import fs from 'fs';
import { AutonomousExecutor } from '../core/autonomous-executor.js';
export class OptimizationValidator {
    baselineMetrics;
    async measureOptimizationEffect() {
        const startTime = Date.now();
        const contextMetrics = await this.measureContextUsage();
        const decisionMetrics = await this.measureDecisionPerformance();
        const systemMetrics = await this.measureSystemEfficiency();
        const qualityMetrics = await this.measureQualityMetrics();
        const totalTime = Date.now() - startTime;
        return {
            contextUsage: contextMetrics,
            executionTime: {
                decisionTime: decisionMetrics.decisionTime,
                totalTime,
                improvement: this.calculateImprovement(totalTime)
            },
            systemHealth: systemMetrics,
            qualityMetrics
        };
    }
    async measureContextUsage() {
        const beforeSize = await this.getCurrentContextSize();
        const executor = new AutonomousExecutor();
        await executor.executeClaudeAutonomous();
        const afterSize = await this.getCurrentContextSize();
        const reduction = ((beforeSize - afterSize) / beforeSize) * 100;
        return {
            before: beforeSize,
            after: afterSize,
            reduction: Math.max(0, reduction)
        };
    }
    async measureDecisionPerformance() {
        const startTime = Date.now();
        const executor = new AutonomousExecutor();
        await executor.executeClaudeAutonomous();
        const decisionTime = Date.now() - startTime;
        return { decisionTime };
    }
    async measureSystemEfficiency() {
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
        const cpuUsage = await this.getCpuUsage();
        const stability = await this.calculateStabilityScore();
        return {
            memoryUsage: memoryUsageMB,
            cpuUsage,
            stability
        };
    }
    async measureQualityMetrics() {
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        const decisionAccuracy = await this.evaluateDecisionAccuracy(decision);
        const contentQuality = await this.evaluateContentQuality(decision);
        const userValue = await this.evaluateUserValue(decision);
        return {
            decisionAccuracy,
            contentQuality,
            userValue
        };
    }
    async evaluateDecision(decision) {
        let score = 0;
        if (decision.action?.type && ['original_post', 'quote_tweet', 'retweet', 'reply'].includes(decision.action.type)) {
            score += 25;
        }
        else if (decision.type && ['original_post', 'quote_tweet', 'retweet', 'reply', 'wait', 'analyze_only'].includes(decision.type)) {
            score += 20;
        }
        if (decision.reasoning && decision.reasoning.length > 10) {
            score += 25;
        }
        if (decision.action?.expectedImpact && decision.action.expectedImpact > 0) {
            score += 25;
        }
        if (decision.metadata && typeof decision.metadata === 'object') {
            score += 25;
        }
        return score;
    }
    async getCurrentContextSize() {
        try {
            const contextFiles = [
                'data/current-situation.yaml',
                'data/account-config.yaml',
                'data/daily-action-data.yaml'
            ];
            let totalSize = 0;
            for (const file of contextFiles) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    totalSize += Buffer.byteLength(content, 'utf8');
                }
                catch {
                    // File might not exist, skip
                }
            }
            return totalSize;
        }
        catch {
            return 10000; // Default estimate
        }
    }
    calculateImprovement(currentTime) {
        const baselineTime = this.baselineMetrics?.executionTime.totalTime || 60000;
        return Math.max(0, ((baselineTime - currentTime) / baselineTime) * 100);
    }
    async getCpuUsage() {
        return new Promise((resolve) => {
            const usage = process.cpuUsage();
            setTimeout(() => {
                const newUsage = process.cpuUsage(usage);
                const cpuPercent = ((newUsage.user + newUsage.system) / 1000000) * 100;
                resolve(Math.min(100, cpuPercent));
            }, 100);
        });
    }
    async calculateStabilityScore() {
        let score = 100;
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        if (memoryUsage > 100)
            score -= 20;
        if (memoryUsage > 200)
            score -= 30;
        const cpuUsage = await this.getCpuUsage();
        if (cpuUsage > 80)
            score -= 20;
        if (cpuUsage > 90)
            score -= 30;
        return Math.max(0, score);
    }
    async evaluateDecisionAccuracy(decision) {
        let accuracy = 50;
        if (decision.action?.type && ['original_post', 'quote_tweet', 'retweet', 'reply'].includes(decision.action.type)) {
            accuracy += 20;
        }
        else if (decision.type && ['original_post', 'quote_tweet', 'retweet', 'reply', 'wait', 'analyze_only'].includes(decision.type)) {
            accuracy += 15;
        }
        if (decision.reasoning && decision.reasoning.length >= 20) {
            accuracy += 15;
        }
        if (decision.action?.expectedImpact && decision.action.expectedImpact > 0) {
            accuracy += 15;
        }
        return Math.min(100, accuracy);
    }
    async evaluateContentQuality(decision) {
        let quality = 50;
        if (decision.reasoning && decision.reasoning.includes('投資教育')) {
            quality += 20;
        }
        if (decision.reasoning && decision.reasoning.length > 50) {
            quality += 15;
        }
        if (decision.action?.type === 'original_post' || decision.type === 'original_post') {
            quality += 15;
        }
        return Math.min(100, quality);
    }
    async evaluateUserValue(decision) {
        let value = 50;
        if (decision.action?.type || (decision.type && decision.type !== 'wait' && decision.type !== 'analyze_only')) {
            value += 20;
        }
        if (decision.reasoning && decision.reasoning.includes('価値')) {
            value += 15;
        }
        if (decision.action?.expectedImpact && decision.action.expectedImpact > 0 && decision.action.expectedImpact < 100) {
            value += 15;
        }
        return Math.min(100, value);
    }
    setBaselineMetrics(metrics) {
        this.baselineMetrics = metrics;
    }
    getBaselineMetrics() {
        return this.baselineMetrics;
    }
}
