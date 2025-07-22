import { IntelligentResourceManager } from '../intelligent-resource-manager.js';
import { ExecutionMonitor } from './execution-monitor.js';
import { CollectionMethod } from '../../types/decision-types.js';
export class SystemIntegrationTester {
    resourceManager;
    executionMonitor;
    constructor() {
        this.resourceManager = new IntelligentResourceManager();
        this.executionMonitor = new ExecutionMonitor();
    }
    async runComprehensiveTest() {
        console.log('Starting comprehensive system integration test...');
        const testResults = [];
        try {
            testResults.push(await this.testStrategyDetermination());
            testResults.push(await this.testResourceAllocation());
            testResults.push(await this.testQualityOptimization());
            testResults.push(await this.testMonitoringSystem());
            testResults.push(await this.testAdaptiveManagement());
            const overallSuccess = testResults.every(result => result.success);
            const recommendations = this.generateRecommendations(testResults);
            return {
                success: overallSuccess,
                results: testResults,
                recommendations
            };
        }
        catch (error) {
            console.error('Integration test failed:', error);
            return {
                success: false,
                results: testResults,
                recommendations: ['System requires debugging before deployment']
            };
        }
    }
    async testStrategyDetermination() {
        const context = {
            availableTime: 60000,
            memoryLimit: 100,
            qualityRequirement: 75,
            urgencyLevel: 'medium',
            targetSites: [
                'https://fx.minkabu.jp/news',
                'https://zai.diamond.jp/fx/news',
                'https://www.traderswebfx.jp/news'
            ]
        };
        const startTime = Date.now();
        const strategy = await this.resourceManager.determineOptimalStrategy(context);
        const executionTime = Date.now() - startTime;
        const success = this.validateStrategy(strategy, context, executionTime);
        return {
            testName: 'Strategy Determination',
            success,
            executionTime,
            details: {
                strategySites: strategy.sites.length,
                estimatedTime: strategy.executionPlan.totalEstimatedTime,
                resourceBudget: strategy.resourceBudget,
                expectedQuality: strategy.expectedOutcome.expectedQuality
            },
            issues: success ? [] : ['Strategy determination failed validation']
        };
    }
    async testResourceAllocation() {
        const testCandidates = [
            {
                siteUrl: 'https://fx.minkabu.jp/news',
                method: CollectionMethod.SIMPLE_HTTP,
                estimatedValue: 85,
                estimatedCost: { timeMs: 3000, memoryMb: 20, cpuUnits: 2 },
                confidenceLevel: 0.9
            },
            {
                siteUrl: 'https://zai.diamond.jp/fx/news',
                method: CollectionMethod.HYBRID,
                estimatedValue: 80,
                estimatedCost: { timeMs: 5000, memoryMb: 40, cpuUnits: 3 },
                confidenceLevel: 0.8
            }
        ];
        const startTime = Date.now();
        const optimalPlan = await this.resourceManager.optimizeQualityCostBalance(testCandidates);
        const executionTime = Date.now() - startTime;
        const success = this.validateResourceAllocation(optimalPlan);
        return {
            testName: 'Resource Allocation',
            success,
            executionTime,
            details: {
                selectedCandidates: optimalPlan.selectedCandidates.length,
                totalValue: optimalPlan.totalValue,
                totalCost: optimalPlan.totalCost,
                riskLevel: optimalPlan.riskLevel
            },
            issues: success ? [] : ['Resource allocation optimization failed']
        };
    }
    async testQualityOptimization() {
        const mockContext = {
            availableTime: 45000,
            memoryLimit: 80,
            qualityRequirement: 80,
            urgencyLevel: 'high',
            targetSites: ['https://fx.minkabu.jp/news']
        };
        const startTime = Date.now();
        const strategy = await this.resourceManager.determineOptimalStrategy(mockContext);
        const executionTime = Date.now() - startTime;
        const qualityMeetsRequirement = strategy.expectedOutcome.expectedQuality >= mockContext.qualityRequirement;
        const resourcesWithinLimits = strategy.resourceBudget.timeMs <= mockContext.availableTime;
        const success = qualityMeetsRequirement && resourcesWithinLimits;
        return {
            testName: 'Quality Optimization',
            success,
            executionTime,
            details: {
                expectedQuality: strategy.expectedOutcome.expectedQuality,
                qualityRequirement: mockContext.qualityRequirement,
                resourceBudget: strategy.resourceBudget.timeMs,
                timeLimit: mockContext.availableTime
            },
            issues: success ? [] : [
                !qualityMeetsRequirement ? 'Quality requirement not met' : '',
                !resourcesWithinLimits ? 'Resource limits exceeded' : ''
            ].filter(Boolean)
        };
    }
    async testMonitoringSystem() {
        const mockExecution = {
            id: 'test_execution_' + Date.now(),
            strategy: {
                sites: [],
                executionPlan: { parallelTasks: [], sequentialTasks: [], criticalPath: [], totalEstimatedTime: 30000 },
                expectedOutcome: { expectedQuality: 75, confidenceLevel: 0.8, estimatedDataPoints: 50, riskFactors: [] },
                resourceBudget: { timeMs: 30000, memoryMb: 60, concurrentRequests: 3 }
            },
            status: 'running',
            progress: {
                completedTasks: 2,
                totalTasks: 5,
                dataCollected: 20,
                timeElapsed: 15000,
                resourcesUsed: { timeMs: 15000, memoryMb: 40, cpuPercent: 60, networkRequests: 8 }
            },
            currentTasks: [],
            startTime: Date.now() - 15000
        };
        const startTime = Date.now();
        const monitoringSession = await this.executionMonitor.startMonitoring(mockExecution);
        await this.executionMonitor.updateMetrics(monitoringSession.id, {
            responseTime: 2500,
            successRate: 85,
            dataQuality: 78,
            resourceUsage: { timeMs: 15000, memoryMb: 45, cpuPercent: 65, networkRequests: 10 },
            throughput: 1.5
        });
        const metrics = this.executionMonitor.getSessionMetrics(monitoringSession.id);
        const alerts = this.executionMonitor.getAllAlerts(monitoringSession.id);
        await this.executionMonitor.stopMonitoring(monitoringSession.id);
        const executionTime = Date.now() - startTime;
        const success = metrics !== null && metrics.responseTime > 0;
        return {
            testName: 'Monitoring System',
            success,
            executionTime,
            details: {
                sessionId: monitoringSession.id,
                metricsUpdated: metrics !== null,
                alertsGenerated: alerts.length,
                responseTime: metrics?.responseTime || 0,
                successRate: metrics?.successRate || 0
            },
            issues: success ? [] : ['Monitoring system failed to track metrics properly']
        };
    }
    async testAdaptiveManagement() {
        const mockResult = {
            executionId: 'test_adaptive_' + Date.now(),
            success: true,
            dataCollected: [
                { site: 'minkabu', quality: 85, responseTime: 2800 },
                { site: 'zai', quality: 80, responseTime: 3200 }
            ],
            qualityAchieved: 82,
            resourcesUsed: { timeMs: 28000, memoryMb: 55, cpuPercent: 70, networkRequests: 12 },
            timeElapsed: 28000,
            errors: []
        };
        const startTime = Date.now();
        const learningInsight = await this.resourceManager.evaluateAndLearn(mockResult);
        const executionTime = Date.now() - startTime;
        const success = this.validateLearningInsight(learningInsight);
        return {
            testName: 'Adaptive Management',
            success,
            executionTime,
            details: {
                siteOptimizations: learningInsight.siteSpecificOptimizations.length,
                methodEffectivenessUpdated: learningInsight.methodEffectivenessUpdate !== null,
                allocationImprovements: learningInsight.resourceAllocationImprovement !== null
            },
            issues: success ? [] : ['Adaptive learning system failed to generate insights']
        };
    }
    validateStrategy(strategy, context, executionTime) {
        return (strategy.sites.length > 0 &&
            strategy.sites.length <= context.targetSites.length &&
            strategy.resourceBudget.timeMs <= context.availableTime &&
            strategy.resourceBudget.memoryMb <= context.memoryLimit &&
            strategy.expectedOutcome.expectedQuality >= context.qualityRequirement - 10 &&
            executionTime < 5000);
    }
    validateResourceAllocation(optimalPlan) {
        return (optimalPlan.selectedCandidates.length > 0 &&
            optimalPlan.totalValue > 0 &&
            optimalPlan.totalCost.timeMs > 0 &&
            optimalPlan.riskLevel >= 0 &&
            optimalPlan.riskLevel <= 100);
    }
    validateLearningInsight(insight) {
        return (insight !== null &&
            insight.siteSpecificOptimizations !== undefined &&
            insight.methodEffectivenessUpdate !== undefined &&
            insight.resourceAllocationImprovement !== undefined);
    }
    generateRecommendations(results) {
        const recommendations = [];
        const failedTests = results.filter(r => !r.success);
        if (failedTests.length === 0) {
            recommendations.push('All tests passed - system is ready for deployment');
            recommendations.push('Consider implementing additional monitoring in production');
        }
        else {
            recommendations.push(`${failedTests.length} tests failed - review before deployment`);
            failedTests.forEach(test => {
                recommendations.push(`Fix issues in ${test.testName}: ${test.issues.join(', ')}`);
            });
        }
        const slowTests = results.filter(r => r.executionTime > 3000);
        if (slowTests.length > 0) {
            recommendations.push('Some components are slow - consider performance optimization');
        }
        return recommendations;
    }
    async runPerformanceTest() {
        const iterations = 5;
        const times = [];
        const context = {
            availableTime: 60000,
            memoryLimit: 100,
            qualityRequirement: 75,
            urgencyLevel: 'medium',
            targetSites: [
                'https://fx.minkabu.jp/news',
                'https://zai.diamond.jp/fx/news',
                'https://www.traderswebfx.jp/news'
            ]
        };
        const startMemory = process.memoryUsage().heapUsed;
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await this.resourceManager.determineOptimalStrategy(context);
            times.push(Date.now() - startTime);
        }
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        const throughput = 1000 / averageTime; // decisions per second
        const recommendations = [];
        if (averageTime > 3000) {
            recommendations.push('Strategy determination is slow - optimize profiling and decision logic');
        }
        if (memoryUsage > 50) {
            recommendations.push('High memory usage detected - review data structures and cleanup');
        }
        if (throughput < 0.2) {
            recommendations.push('Low throughput - consider caching and parallel processing');
        }
        return {
            averageStrategyTime: averageTime,
            memoryUsage,
            throughput,
            recommendations
        };
    }
}
export async function runSystemTests() {
    const tester = new SystemIntegrationTester();
    console.log('🧪 Running system integration tests...\n');
    const integrationResults = await tester.runComprehensiveTest();
    console.log('📊 Integration Test Results:');
    console.log(`Overall Success: ${integrationResults.success ? '✅' : '❌'}`);
    for (const result of integrationResults.results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.executionTime}ms`);
        if (result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`);
        }
    }
    console.log('\n📋 Recommendations:');
    integrationResults.recommendations.forEach(rec => console.log(`- ${rec}`));
    console.log('\n⚡ Running performance tests...');
    const performanceResults = await tester.runPerformanceTest();
    console.log('📈 Performance Results:');
    console.log(`Average Strategy Time: ${performanceResults.averageStrategyTime}ms`);
    console.log(`Memory Usage: ${performanceResults.memoryUsage.toFixed(2)}MB`);
    console.log(`Throughput: ${performanceResults.throughput.toFixed(2)} decisions/sec`);
    if (performanceResults.recommendations.length > 0) {
        console.log('\n⚠️ Performance Recommendations:');
        performanceResults.recommendations.forEach(rec => console.log(`- ${rec}`));
    }
    console.log('\n✨ Testing completed!');
}
