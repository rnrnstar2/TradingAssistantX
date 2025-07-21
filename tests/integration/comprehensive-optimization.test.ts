import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OptimizationValidator, type OptimizationMetrics } from '../../src/utils/optimization-metrics.js';
import { BaselineMeasurementSystem } from '../../src/scripts/baseline-measurement.js';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';
import fs from 'fs';
import path from 'path';

describe('Comprehensive Optimization Validation', () => {
  let baseline: OptimizationMetrics | undefined;
  let optimized: OptimizationMetrics;
  let validator: OptimizationValidator;
  let outputDir: string;

  beforeAll(async () => {
    validator = new OptimizationValidator();
    outputDir = 'tasks/20250721_194158_system_optimization/outputs';
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Try to load existing baseline or create one
    try {
      const baselineFile = path.join(outputDir, 'TASK-004-baseline-metrics.json');
      if (fs.existsSync(baselineFile)) {
        baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
        console.log('📊 Loaded existing baseline metrics');
      } else {
        console.log('📊 Creating new baseline measurement...');
        const baselineSystem = new BaselineMeasurementSystem();
        await baselineSystem.runBaselineMeasurement();
        
        // Load the newly created baseline
        if (fs.existsSync(baselineFile)) {
          baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load baseline metrics, will use default comparison');
    }
    
    // Set baseline in validator if available
    if (baseline) {
      validator.setBaselineMetrics(baseline);
    }
    
    // Measure current optimized performance
    console.log('📊 Measuring optimized system performance...');
    optimized = await validator.measureOptimizationEffect();
    
  }, 120000); // 2 minute timeout for setup

  afterAll(() => {
    // Save final results
    saveComprehensiveResults(baseline, optimized);
  });

  describe('Target Optimization Goals Achievement', () => {
    it('should achieve context reduction goal of 30% or more', async () => {
      expect(optimized.contextUsage.reduction).toBeGreaterThanOrEqual(30);
      
      console.log(`Context reduction: ${optimized.contextUsage.reduction.toFixed(1)}%`);
      console.log(`Before: ${optimized.contextUsage.before} bytes, After: ${optimized.contextUsage.after} bytes`);
      
      // Bonus points for exceptional reduction
      if (optimized.contextUsage.reduction >= 50) {
        console.log('🏆 Exceptional context reduction achieved (50%+)');
      }
    }, 30000);

    it('should achieve execution time improvement goal of 20% or more', async () => {
      expect(optimized.executionTime.improvement).toBeGreaterThanOrEqual(20);
      
      console.log(`Execution time improvement: ${optimized.executionTime.improvement.toFixed(1)}%`);
      console.log(`Current execution time: ${optimized.executionTime.totalTime}ms`);
      
      if (optimized.executionTime.improvement >= 40) {
        console.log('🏆 Exceptional execution time improvement achieved (40%+)');
      }
    }, 45000);

    it('should maintain memory usage under 100MB', async () => {
      expect(optimized.systemHealth.memoryUsage).toBeLessThan(100);
      
      console.log(`Memory usage: ${optimized.systemHealth.memoryUsage.toFixed(1)}MB`);
      
      if (optimized.systemHealth.memoryUsage < 50) {
        console.log('🏆 Excellent memory efficiency achieved (<50MB)');
      }
    }, 20000);

    it('should maintain decision accuracy at 85 points or higher', async () => {
      expect(optimized.qualityMetrics.decisionAccuracy).toBeGreaterThanOrEqual(85);
      
      console.log(`Decision accuracy: ${optimized.qualityMetrics.decisionAccuracy} points`);
      
      if (optimized.qualityMetrics.decisionAccuracy >= 95) {
        console.log('🏆 Exceptional decision accuracy achieved (95+)');
      }
    }, 30000);
  });

  describe('System Stability and Reliability', () => {
    it('should maintain system stability at 95% or higher', () => {
      expect(optimized.systemHealth.stability).toBeGreaterThanOrEqual(95);
      
      console.log(`System stability: ${optimized.systemHealth.stability}%`);
    });

    it('should demonstrate consistent performance across multiple runs', async () => {
      const performanceRuns: OptimizationMetrics[] = [];
      
      // Run optimization measurement multiple times
      for (let i = 0; i < 3; i++) {
        console.log(`Running consistency test ${i + 1}/3...`);
        const metrics = await validator.measureOptimizationEffect();
        performanceRuns.push(metrics);
        
        // Short delay between runs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Analyze consistency
      const executionTimes = performanceRuns.map(m => m.executionTime.totalTime);
      const memoryUsages = performanceRuns.map(m => m.systemHealth.memoryUsage);
      const qualityScores = performanceRuns.map(m => m.qualityMetrics.decisionAccuracy);
      
      // Calculate coefficients of variation (std dev / mean)
      const timeCV = calculateCV(executionTimes);
      const memoryCV = calculateCV(memoryUsages);
      const qualityCV = calculateCV(qualityScores);
      
      // All should have reasonable consistency (CV < 30%)
      expect(timeCV).toBeLessThan(0.3);
      expect(memoryCV).toBeLessThan(0.3);
      expect(qualityCV).toBeLessThan(0.2); // Quality should be more consistent
      
      console.log(`Consistency analysis:`);
      console.log(`  Execution time CV: ${(timeCV * 100).toFixed(1)}%`);
      console.log(`  Memory usage CV: ${(memoryCV * 100).toFixed(1)}%`);
      console.log(`  Quality score CV: ${(qualityCV * 100).toFixed(1)}%`);
      
    }, 180000); // 3 minute timeout

    it('should handle edge cases and error conditions gracefully', async () => {
      // Test various edge cases
      const edgeCaseResults: any[] = [];
      
      // Test 1: Multiple rapid executions
      try {
        const promises = Array(3).fill(null).map(() => new AutonomousExecutor().executeClaudeAutonomous());
        const results = await Promise.all(promises);
        
        edgeCaseResults.push({
          test: 'concurrent_execution',
          success: true,
          validDecisions: results.filter(r => r.action && r.reasoning).length
        });
      } catch (error) {
        edgeCaseResults.push({
          test: 'concurrent_execution',
          success: false,
          error: (error as Error).message
        });
      }
      
      // Test 2: Memory pressure simulation
      try {
        const largeArrays: any[] = [];
        // Create some memory pressure
        for (let i = 0; i < 10; i++) {
          largeArrays.push(new Array(100000).fill(i));
        }
        
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        
        edgeCaseResults.push({
          test: 'memory_pressure',
          success: Boolean(decision.action && decision.reasoning),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
        });
        
        // Cleanup
        largeArrays.length = 0;
        
      } catch (error) {
        edgeCaseResults.push({
          test: 'memory_pressure',
          success: false,
          error: (error as Error).message
        });
      }
      
      // Analyze edge case handling
      const successfulTests = edgeCaseResults.filter(r => r.success);
      expect(successfulTests.length).toBeGreaterThanOrEqual(1); // At least one should pass
      
      console.log(`Edge case test results:`);
      edgeCaseResults.forEach(result => {
        console.log(`  ${result.test}: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      });
      
    }, 120000);
  });

  describe('Quality and User Value Improvement', () => {
    it('should improve overall user value compared to baseline', () => {
      if (baseline) {
        expect(optimized.qualityMetrics.userValue).toBeGreaterThan(baseline.qualityMetrics.userValue);
        
        const improvement = optimized.qualityMetrics.userValue - baseline.qualityMetrics.userValue;
        console.log(`User value improvement: +${improvement.toFixed(1)} points`);
      } else {
        // Without baseline, ensure absolute quality
        expect(optimized.qualityMetrics.userValue).toBeGreaterThan(70);
        console.log(`User value (no baseline): ${optimized.qualityMetrics.userValue} points`);
      }
    });

    it('should maintain high content quality standards', () => {
      expect(optimized.qualityMetrics.contentQuality).toBeGreaterThanOrEqual(80);
      
      console.log(`Content quality: ${optimized.qualityMetrics.contentQuality} points`);
    });

    it('should demonstrate measurable optimization benefits', async () => {
      // Calculate overall optimization score
      const optimizationScore = calculateOptimizationScore(baseline, optimized);
      
      expect(optimizationScore).toBeGreaterThanOrEqual(75); // 75+ overall optimization score
      
      console.log(`Overall optimization score: ${optimizationScore.toFixed(1)}/100`);
      
      if (optimizationScore >= 90) {
        console.log('🏆 Exceptional optimization achieved (90+)');
      } else if (optimizationScore >= 80) {
        console.log('🎯 Excellent optimization achieved (80+)');
      }
    });
  });

  describe('Resource Efficiency and Scalability', () => {
    it('should demonstrate improved resource utilization', () => {
      // CPU usage should be reasonable
      expect(optimized.systemHealth.cpuUsage).toBeLessThan(80);
      
      // Memory efficiency should be good
      expect(optimized.systemHealth.memoryUsage).toBeLessThan(100);
      
      console.log(`Resource utilization:`);
      console.log(`  CPU: ${optimized.systemHealth.cpuUsage.toFixed(1)}%`);
      console.log(`  Memory: ${optimized.systemHealth.memoryUsage.toFixed(1)}MB`);
    });

    it('should scale efficiently with increased load', async () => {
      const scalabilityResults: any[] = [];
      
      // Test different load levels
      for (let load = 1; load <= 3; load++) {
        console.log(`Testing scalability at load level ${load}...`);
        
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        // Simulate increased load by running multiple operations
        const operations = Array(load).fill(null).map(async () => {
          const executor = new AutonomousExecutor();
          return await executor.executeClaudeAutonomous();
        });
        
        try {
          const results = await Promise.all(operations);
          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          
          scalabilityResults.push({
            load,
            success: true,
            executionTime: endTime - startTime,
            memoryIncrease: (endMemory - startMemory) / 1024 / 1024,
            successfulOperations: results.filter(r => r.action && r.reasoning).length
          });
          
        } catch (error) {
          scalabilityResults.push({
            load,
            success: false,
            error: (error as Error).message
          });
        }
        
        // Wait between load tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Analyze scalability
      const successfulTests = scalabilityResults.filter(r => r.success);
      expect(successfulTests.length).toBeGreaterThanOrEqual(2); // Most should succeed
      
      // Performance should not degrade linearly with load
      if (successfulTests.length >= 2) {
        const timePerOp = successfulTests.map(r => r.executionTime / r.load);
        const avgTimePerOp = timePerOp.reduce((sum, t) => sum + t, 0) / timePerOp.length;
        
        expect(avgTimePerOp).toBeLessThan(40000); // Average 40s per operation
      }
      
      console.log(`Scalability test results:`);
      scalabilityResults.forEach(result => {
        if (result.success) {
          console.log(`  Load ${result.load}: ${result.executionTime}ms total, ${result.successfulOperations} successful ops`);
        } else {
          console.log(`  Load ${result.load}: FAILED - ${result.error}`);
        }
      });
      
    }, 240000); // 4 minute timeout
  });

  describe('Integration and End-to-End Validation', () => {
    it('should successfully complete a full optimization workflow', async () => {
      console.log('🔄 Running complete optimization workflow...');
      
      const workflowStart = Date.now();
      
      // Step 1: Context optimization
      const contextMetrics = await validator.measureContextUsage();
      expect(contextMetrics.reduction).toBeGreaterThan(0);
      
      // Step 2: Decision generation
      const executor = new AutonomousExecutor();
      const decision = await executor.executeClaudeAutonomous();
      expect(decision.action).toBeDefined();
      expect(decision.reasoning).toBeDefined();
      
      // Step 3: Quality assessment
      const quality = await validator.evaluateDecision(decision);
      expect(quality).toBeGreaterThanOrEqual(70);
      
      // Step 4: Resource monitoring
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      expect(finalMemory).toBeLessThan(150); // Reasonable memory usage
      
      const workflowTime = Date.now() - workflowStart;
      expect(workflowTime).toBeLessThan(60000); // Complete workflow under 1 minute
      
      console.log(`✅ Complete workflow: ${workflowTime}ms, Quality: ${quality}, Memory: ${finalMemory.toFixed(1)}MB`);
      
    }, 90000);

    it('should maintain optimization benefits over extended usage', async () => {
      console.log('⏳ Testing optimization persistence over extended usage...');
      
      const extendedResults: any[] = [];
      
      // Run multiple cycles to test persistence
      for (let cycle = 1; cycle <= 5; cycle++) {
        const cycleStart = Date.now();
        
        const metrics = await validator.measureOptimizationEffect();
        const cycleTime = Date.now() - cycleStart;
        
        extendedResults.push({
          cycle,
          contextReduction: metrics.contextUsage.reduction,
          executionTime: cycleTime,
          memoryUsage: metrics.systemHealth.memoryUsage,
          decisionAccuracy: metrics.qualityMetrics.decisionAccuracy
        });
        
        // Short pause between cycles
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Analyze persistence
      const avgContextReduction = extendedResults.reduce((sum, r) => sum + r.contextReduction, 0) / extendedResults.length;
      const avgAccuracy = extendedResults.reduce((sum, r) => sum + r.decisionAccuracy, 0) / extendedResults.length;
      
      // Benefits should persist
      expect(avgContextReduction).toBeGreaterThanOrEqual(25); // Sustained 25%+ reduction
      expect(avgAccuracy).toBeGreaterThanOrEqual(80); // Sustained 80+ accuracy
      
      // Performance should not degrade significantly
      const firstCycleTime = extendedResults[0].executionTime;
      const lastCycleTime = extendedResults[extendedResults.length - 1].executionTime;
      const performanceDegradation = (lastCycleTime - firstCycleTime) / firstCycleTime;
      
      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation
      
      console.log(`Extended usage results over ${extendedResults.length} cycles:`);
      console.log(`  Average context reduction: ${avgContextReduction.toFixed(1)}%`);
      console.log(`  Average accuracy: ${avgAccuracy.toFixed(1)}`);
      console.log(`  Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`);
      
    }, 180000); // 3 minute timeout
  });
});

// Helper functions
function calculateCV(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

function calculateOptimizationScore(baseline: OptimizationMetrics | undefined, optimized: OptimizationMetrics): number {
  let score = 0;
  
  // Context efficiency (25 points)
  if (optimized.contextUsage.reduction >= 30) score += 25;
  else if (optimized.contextUsage.reduction >= 20) score += 20;
  else if (optimized.contextUsage.reduction >= 10) score += 15;
  else score += 10;
  
  // Execution time (25 points)
  if (optimized.executionTime.improvement >= 20) score += 25;
  else if (optimized.executionTime.improvement >= 10) score += 20;
  else if (optimized.executionTime.improvement >= 5) score += 15;
  else score += 10;
  
  // System health (25 points)
  if (optimized.systemHealth.memoryUsage < 50) score += 25;
  else if (optimized.systemHealth.memoryUsage < 75) score += 20;
  else if (optimized.systemHealth.memoryUsage < 100) score += 15;
  else score += 10;
  
  // Quality metrics (25 points)
  if (optimized.qualityMetrics.decisionAccuracy >= 90) score += 25;
  else if (optimized.qualityMetrics.decisionAccuracy >= 85) score += 20;
  else if (optimized.qualityMetrics.decisionAccuracy >= 80) score += 15;
  else score += 10;
  
  return score;
}

function saveComprehensiveResults(baseline: OptimizationMetrics | undefined, optimized: OptimizationMetrics): void {
  const outputDir = 'tasks/20250721_194158_system_optimization/outputs';
  
  const comprehensiveResults = {
    timestamp: new Date().toISOString(),
    baseline,
    optimized,
    comparison: baseline ? {
      contextReductionImprovement: optimized.contextUsage.reduction - (baseline.contextUsage?.reduction || 0),
      executionTimeImprovement: optimized.executionTime.improvement - (baseline.executionTime?.improvement || 0),
      memoryUsageChange: optimized.systemHealth.memoryUsage - (baseline.systemHealth?.memoryUsage || 0),
      qualityImprovement: optimized.qualityMetrics.decisionAccuracy - (baseline.qualityMetrics?.decisionAccuracy || 0)
    } : null,
    optimizationScore: calculateOptimizationScore(baseline, optimized),
    targetAchievement: {
      contextReduction: optimized.contextUsage.reduction >= 30,
      executionImprovement: optimized.executionTime.improvement >= 20,
      memoryTarget: optimized.systemHealth.memoryUsage < 100,
      qualityTarget: optimized.qualityMetrics.decisionAccuracy >= 85,
      stabilityTarget: optimized.systemHealth.stability >= 95
    }
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'TASK-004-comprehensive-optimization-results.json'),
    JSON.stringify(comprehensiveResults, null, 2)
  );
  
  console.log(`📊 Comprehensive optimization results saved to: ${path.join(outputDir, 'TASK-004-comprehensive-optimization-results.json')}`);
}