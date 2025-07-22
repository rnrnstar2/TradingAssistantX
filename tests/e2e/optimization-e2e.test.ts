import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';
import { OptimizationValidator } from '../../src/utils/optimization-metrics.js';
import fs from 'fs';
import path from 'path';

describe('Dynamic Scheduling System Operation', () => {
  let metricsCollector: OptimizationValidator;
  let outputDir: string;

  beforeAll(() => {
    metricsCollector = new OptimizationValidator();
    outputDir = 'tasks/20250721_194158_system_optimization/outputs';
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup temporary files if needed
  });

  it('should simulate dynamic scheduling with optimizations', async () => {
    console.log('🚀 Starting dynamic scheduling simulation...');
    
    const simulationResults: any[] = [];
    const startSimulation = Date.now();
    
    // Simulate 15 executions throughout the day with dynamic scheduling intervals
    const totalIterations = 15;
    const executionInterval = 100; // Shortened interval for testing (production uses dynamic scheduling)
    
    for (let i = 0; i < totalIterations; i++) {
      const iterationStart = Date.now();
      console.log(`📊 Running simulation iteration ${i + 1}/${totalIterations}...`);
      
      try {
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        
        const executionTime = Date.now() - iterationStart;
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        const decisionQuality = await metricsCollector.evaluateDecision(decision);
        
        const iterationResult = {
          iteration: i + 1,
          timestamp: new Date().toISOString(),
          executionTime,
          memoryUsage,
          decisionQuality,
          decision: {
            action: decision.action,
            reasoningLength: decision.reasoning?.length || 0,
            hasContent: Boolean(decision.content),
            hasTiming: Boolean(decision.timing)
          },
          systemHealth: {
            cpuUsage: await getCpuUsageSnapshot(),
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal
          }
        };
        
        simulationResults.push(iterationResult);
        
        console.log(`✅ Iteration ${i + 1}: ${executionTime}ms, ${memoryUsage.toFixed(1)}MB, Quality: ${decisionQuality}`);
        
      } catch (error) {
        console.error(`❌ Iteration ${i + 1} failed:`, error);
        
        // Record the failure but continue simulation
        simulationResults.push({
          iteration: i + 1,
          timestamp: new Date().toISOString(),
          executionTime: -1,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          decisionQuality: 0,
          error: (error as Error).message,
          systemHealth: {
            cpuUsage: await getCpuUsageSnapshot(),
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal
          }
        });
      }
      
      // Wait between iterations (shortened for testing)
      if (i < totalIterations - 1) {
        await new Promise(resolve => setTimeout(resolve, executionInterval));
      }
      
      // Force garbage collection periodically if available
      if ((i + 1) % 5 === 0 && global.gc) {
        global.gc();
      }
    }
    
    const totalSimulationTime = Date.now() - startSimulation;
    console.log(`🏁 Dynamic scheduling simulation completed in ${(totalSimulationTime / 1000).toFixed(1)}s`);
    
    // Analyze results
    const analysisResults = analyzeSimulationResults(simulationResults);
    
    // Save results
    saveSimulationResults(simulationResults, analysisResults);
    
    // Perform assertions
    performSimulationAssertions(simulationResults, analysisResults);
    
  }, 300000); // 5 minute timeout

  it('should demonstrate stable performance over extended operation', async () => {
    console.log('🔍 Testing extended operation stability...');
    
    const stabilityResults: any[] = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      try {
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        
        const endTime = Date.now();
        const finalMemory = process.memoryUsage().heapUsed;
        
        stabilityResults.push({
          iteration: i + 1,
          executionTime: endTime - startTime,
          memoryDelta: (finalMemory - initialMemory) / 1024 / 1024,
          totalMemory: finalMemory / 1024 / 1024,
          success: true,
          decisionValid: Boolean(decision.action && decision.reasoning)
        });
        
      } catch (error) {
        stabilityResults.push({
          iteration: i + 1,
          executionTime: -1,
          memoryDelta: 0,
          totalMemory: process.memoryUsage().heapUsed / 1024 / 1024,
          success: false,
          error: (error as Error).message
        });
      }
      
      // Short pause between iterations
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Analyze stability
    const successfulIterations = stabilityResults.filter(r => r.success);
    const avgExecutionTime = successfulIterations.reduce((sum, r) => sum + r.executionTime, 0) / successfulIterations.length;
    const maxMemoryDelta = Math.max(...successfulIterations.map(r => r.memoryDelta));
    const successRate = successfulIterations.length / stabilityResults.length;
    
    // Assertions
    expect(successRate).toBeGreaterThanOrEqual(0.9); // 90% success rate
    expect(avgExecutionTime).toBeLessThan(35000); // Average under 35 seconds
    expect(maxMemoryDelta).toBeLessThan(20); // Max 20MB increase per iteration
    
    console.log(`Stability results: ${successRate * 100}% success, ${avgExecutionTime.toFixed(0)}ms avg, ${maxMemoryDelta.toFixed(1)}MB max delta`);
    
  }, 150000);

  it('should handle resource constraints gracefully', async () => {
    console.log('🧪 Testing resource constraint handling...');
    
    // Simulate resource pressure by running multiple concurrent operations
    const concurrentOperations = 3;
    const results: any[] = [];
    
    const promises = Array(concurrentOperations).fill(null).map(async (_, index) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        return {
          operation: index + 1,
          success: true,
          executionTime: endTime - startTime,
          memoryUsed: (endMemory - startMemory) / 1024 / 1024,
          decisionValid: Boolean(decision.action && decision.reasoning)
        };
        
      } catch (error) {
        return {
          operation: index + 1,
          success: false,
          executionTime: Date.now() - startTime,
          error: (error as Error).message
        };
      }
    });
    
    const concurrentResults = await Promise.all(promises);
    
    // Analyze concurrent execution
    const successfulOps = concurrentResults.filter(r => r.success);
    const avgExecutionTime = successfulOps.reduce((sum, r) => sum + r.executionTime, 0) / successfulOps.length;
    const totalMemoryUsed = successfulOps.reduce((sum, r) => sum + (r.memoryUsed || 0), 0);
    
    // Should handle concurrent operations reasonably well
    expect(successfulOps.length).toBeGreaterThanOrEqual(1); // At least one should succeed
    expect(avgExecutionTime).toBeLessThan(60000); // Under 1 minute per operation
    expect(totalMemoryUsed).toBeLessThan(150); // Total under 150MB
    
    console.log(`Concurrent execution: ${successfulOps.length}/${concurrentOperations} succeeded`);
    console.log(`Average time: ${avgExecutionTime.toFixed(0)}ms, Total memory: ${totalMemoryUsed.toFixed(1)}MB`);
    
  }, 120000);
});

// Helper functions
async function getCpuUsageSnapshot(): Promise<number> {
  return new Promise((resolve) => {
    const usage = process.cpuUsage();
    setTimeout(() => {
      const newUsage = process.cpuUsage(usage);
      const cpuPercent = ((newUsage.user + newUsage.system) / 1000000) * 100;
      resolve(Math.min(100, cpuPercent));
    }, 50);
  });
}

function analyzeSimulationResults(results: any[]): any {
  const successfulResults = results.filter(r => r.executionTime > 0);
  const failedResults = results.filter(r => r.executionTime <= 0);
  
  if (successfulResults.length === 0) {
    return {
      successRate: 0,
      avgExecutionTime: 0,
      maxMemoryUsage: 0,
      avgDecisionQuality: 0,
      recommendations: ['All iterations failed - system needs investigation']
    };
  }
  
  const avgExecutionTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length;
  const maxMemoryUsage = Math.max(...results.map(r => r.memoryUsage));
  const avgDecisionQuality = successfulResults.reduce((sum, r) => sum + r.decisionQuality, 0) / successfulResults.length;
  const successRate = successfulResults.length / results.length;
  
  // Performance trend analysis
  const firstHalf = successfulResults.slice(0, Math.floor(successfulResults.length / 2));
  const secondHalf = successfulResults.slice(Math.floor(successfulResults.length / 2));
  
  const firstHalfAvgTime = firstHalf.reduce((sum, r) => sum + r.executionTime, 0) / firstHalf.length;
  const secondHalfAvgTime = secondHalf.reduce((sum, r) => sum + r.executionTime, 0) / secondHalf.length;
  
  const performanceTrend = secondHalfAvgTime - firstHalfAvgTime;
  
  const recommendations = [];
  if (successRate < 0.9) recommendations.push('Success rate below 90% - investigate failures');
  if (avgExecutionTime > 30000) recommendations.push('Average execution time exceeds 30s - optimize performance');
  if (maxMemoryUsage > 100) recommendations.push('Memory usage exceeds 100MB - implement memory optimization');
  if (avgDecisionQuality < 80) recommendations.push('Decision quality below 80 - improve decision engine');
  if (performanceTrend > 5000) recommendations.push('Performance degrading over time - investigate memory leaks');
  
  return {
    totalIterations: results.length,
    successfulIterations: successfulResults.length,
    failedIterations: failedResults.length,
    successRate,
    avgExecutionTime,
    maxMemoryUsage,
    avgDecisionQuality,
    performanceTrend,
    recommendations,
    detailedStats: {
      executionTimes: {
        min: Math.min(...successfulResults.map(r => r.executionTime)),
        max: Math.max(...successfulResults.map(r => r.executionTime)),
        avg: avgExecutionTime,
        stdDev: calculateStandardDeviation(successfulResults.map(r => r.executionTime))
      },
      memoryUsage: {
        min: Math.min(...results.map(r => r.memoryUsage)),
        max: maxMemoryUsage,
        avg: results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length
      },
      qualityScores: {
        min: Math.min(...successfulResults.map(r => r.decisionQuality)),
        max: Math.max(...successfulResults.map(r => r.decisionQuality)),
        avg: avgDecisionQuality
      }
    }
  };
}

function saveSimulationResults(results: any[], analysis: any): void {
  const outputDir = 'tasks/20250721_194158_system_optimization/outputs';
  
  // Save raw results
  fs.writeFileSync(
    path.join(outputDir, 'TASK-004-24hour-simulation-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Save analysis
  fs.writeFileSync(
    path.join(outputDir, 'TASK-004-24hour-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  // Save human-readable report
  const report = generateSimulationReport(results, analysis);
  fs.writeFileSync(
    path.join(outputDir, 'TASK-004-24hour-simulation-report.md'),
    report
  );
}

function generateSimulationReport(results: any[], analysis: any): string {
  return `# Dynamic Scheduling System Simulation Report

## 📊 Executive Summary
- **Total Operations**: ${analysis.totalIterations}
- **Success Rate**: ${(analysis.successRate * 100).toFixed(1)}%
- **Average Execution Time**: ${analysis.avgExecutionTime.toFixed(0)}ms
- **Peak Memory Usage**: ${analysis.maxMemoryUsage.toFixed(1)}MB
- **Average Decision Quality**: ${analysis.avgDecisionQuality.toFixed(1)}/100

## 🎯 Performance Targets vs Results

| Metric | Target | Result | Status |
|--------|--------|--------|---------|
| Execution Time | <30s | ${(analysis.avgExecutionTime/1000).toFixed(1)}s | ${analysis.avgExecutionTime < 30000 ? '✅ PASS' : '❌ FAIL'} |
| Memory Usage | <100MB | ${analysis.maxMemoryUsage.toFixed(1)}MB | ${analysis.maxMemoryUsage < 100 ? '✅ PASS' : '❌ FAIL'} |
| Success Rate | >90% | ${(analysis.successRate * 100).toFixed(1)}% | ${analysis.successRate > 0.9 ? '✅ PASS' : '❌ FAIL'} |
| Decision Quality | >80 | ${analysis.avgDecisionQuality.toFixed(1)} | ${analysis.avgDecisionQuality > 80 ? '✅ PASS' : '❌ FAIL'} |

## 📈 Detailed Statistics

### Execution Time Distribution
- **Minimum**: ${analysis.detailedStats.executionTimes.min}ms
- **Maximum**: ${analysis.detailedStats.executionTimes.max}ms
- **Average**: ${analysis.detailedStats.executionTimes.avg.toFixed(0)}ms
- **Standard Deviation**: ${analysis.detailedStats.executionTimes.stdDev.toFixed(0)}ms

### Memory Usage Pattern
- **Minimum**: ${analysis.detailedStats.memoryUsage.min.toFixed(1)}MB
- **Maximum**: ${analysis.detailedStats.memoryUsage.max.toFixed(1)}MB
- **Average**: ${analysis.detailedStats.memoryUsage.avg.toFixed(1)}MB

### Decision Quality Distribution
- **Minimum**: ${analysis.detailedStats.qualityScores.min}
- **Maximum**: ${analysis.detailedStats.qualityScores.max}
- **Average**: ${analysis.detailedStats.qualityScores.avg.toFixed(1)}

## 🔍 Performance Trend Analysis
- **Performance Change**: ${analysis.performanceTrend > 0 ? 'DEGRADED' : 'IMPROVED'} by ${Math.abs(analysis.performanceTrend).toFixed(0)}ms
- **System Stability**: ${analysis.successRate > 0.95 ? 'EXCELLENT' : analysis.successRate > 0.9 ? 'GOOD' : 'NEEDS IMPROVEMENT'}

## 📋 Recommendations
${analysis.recommendations.length > 0 ? analysis.recommendations.map(r => `- ${r}`).join('\n') : '- No specific recommendations - system performing within targets'}

## 📊 Individual Operation Results

| Iteration | Time (ms) | Memory (MB) | Quality | Status |
|-----------|-----------|-------------|---------|---------|
${results.map((r, i) => 
  `| ${r.iteration} | ${r.executionTime > 0 ? r.executionTime : 'FAILED'} | ${r.memoryUsage.toFixed(1)} | ${r.decisionQuality || 'N/A'} | ${r.executionTime > 0 ? '✅' : '❌'} |`
).join('\n')}

---
**Generated**: ${new Date().toISOString()}
**Test Duration**: ${results.length} iterations with dynamic scheduling simulation
`;
}

function performSimulationAssertions(results: any[], analysis: any): void {
  // Core performance assertions
  expect(analysis.avgExecutionTime).toBeLessThan(30000); // Average under 30 seconds
  expect(analysis.maxMemoryUsage).toBeLessThan(100); // Max 100MB
  expect(analysis.successRate).toBeGreaterThanOrEqual(0.9); // 90% success rate
  expect(analysis.avgDecisionQuality).toBeGreaterThanOrEqual(80); // 80+ quality
  
  // System stability assertions
  expect(analysis.successfulIterations).toBeGreaterThanOrEqual(10); // At least 10 successful iterations
  expect(analysis.failedIterations).toBeLessThan(3); // Less than 3 failures
  
  // Performance consistency assertions
  const executionTimes = results.filter(r => r.executionTime > 0).map(r => r.executionTime);
  const timeVariability = analysis.detailedStats.executionTimes.stdDev / analysis.detailedStats.executionTimes.avg;
  expect(timeVariability).toBeLessThan(0.5); // Coefficient of variation under 50%
  
  console.log('✅ All simulation assertions passed');
}

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}