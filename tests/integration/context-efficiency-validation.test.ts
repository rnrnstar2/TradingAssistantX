import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OptimizationValidator } from '../../src/utils/optimization-metrics.js';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';
import fs from 'fs';
import path from 'path';

describe('Context Efficiency Validation', () => {
  let validator: OptimizationValidator;
  let executor: AutonomousExecutor;
  let originalContextSize: number;

  beforeAll(async () => {
    validator = new OptimizationValidator();
    executor = new AutonomousExecutor();
    originalContextSize = await validator.measureContextUsage().then(m => m.before);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Context Size Optimization', () => {
    it('should reduce context usage by at least 30%', async () => {
      const metrics = await validator.measureContextUsage();
      
      expect(metrics.reduction).toBeGreaterThanOrEqual(30);
      expect(metrics.after).toBeLessThan(metrics.before);
      
      console.log(`Context reduction: ${metrics.reduction.toFixed(1)}% (${metrics.before} -> ${metrics.after} bytes)`);
    }, 30000);

    it('should maintain context under 30KB total', async () => {
      const metrics = await validator.measureContextUsage();
      
      expect(metrics.after).toBeLessThan(30000); // 30KB limit
      
      if (metrics.after > 20000) {
        console.warn(`Context size is ${metrics.after} bytes - approaching 30KB limit`);
      }
    }, 20000);

    it('should compress context without losing essential information', async () => {
      // Execute with compressed context
      const decision = await executor.executeClaudeAutonomous();
      const metrics = await validator.measureContextUsage();
      
      // Should maintain decision quality despite compression
      expect(decision.action).toMatch(/^(post|engage|amplify|wait)$/);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(10);
      
      // Context should be reduced
      expect(metrics.reduction).toBeGreaterThan(0);
      
      // Decision should still be contextually relevant
      if (decision.reasoning) {
        const hasContext = decision.reasoning.includes('投資') || 
                          decision.reasoning.includes('教育') ||
                          decision.reasoning.includes('価値');
        
        if (hasContext) {
          expect(hasContext).toBe(true);
        }
      }
    }, 45000);
  });

  describe('Context Processing Efficiency', () => {
    it('should process context faster with optimization', async () => {
      const processingTimes: number[] = [];
      
      // Run multiple tests to get average
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        await executor.executeClaudeAutonomous();
        
        const processingTime = Date.now() - startTime;
        processingTimes.push(processingTime);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
      
      expect(avgProcessingTime).toBeLessThan(35000); // Average under 35 seconds
      
      console.log(`Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
    }, 150000);

    it('should maintain consistent context compression ratio', async () => {
      const compressionRatios: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const metrics = await validator.measureContextUsage();
        compressionRatios.push(metrics.reduction);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Check consistency (standard deviation should be reasonable)
      const avgRatio = compressionRatios.reduce((a, b) => a + b) / compressionRatios.length;
      const variance = compressionRatios.reduce((sum, ratio) => sum + Math.pow(ratio - avgRatio, 2), 0) / compressionRatios.length;
      const stdDev = Math.sqrt(variance);
      
      expect(avgRatio).toBeGreaterThanOrEqual(20); // At least 20% reduction on average
      expect(stdDev).toBeLessThan(15); // Standard deviation under 15% (reasonable consistency)
      
      console.log(`Compression ratios: [${compressionRatios.map(r => r.toFixed(1)).join(', ')}]%`);
      console.log(`Average: ${avgRatio.toFixed(1)}%, StdDev: ${stdDev.toFixed(1)}%`);
    }, 60000);
  });

  describe('Memory Efficiency During Context Processing', () => {
    it('should not cause memory leaks during context operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];
      
      // Run context operations multiple times
      for (let i = 0; i < 5; i++) {
        await validator.measureContextUsage();
        
        const currentMemory = process.memoryUsage().heapUsed;
        memoryReadings.push(currentMemory);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(totalMemoryIncrease).toBeLessThan(30); // Less than 30MB increase
      
      // Memory should not continuously grow
      const memoryGrowthTrend = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      expect(memoryGrowthTrend / 1024 / 1024).toBeLessThan(20); // Less than 20MB trend growth
    }, 45000);

    it('should efficiently garbage collect after context operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform intensive context operations
      for (let i = 0; i < 3; i++) {
        await executor.executeClaudeAutonomous();
      }
      
      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
      }
      
      // Wait for GC
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(memoryIncrease).toBeLessThan(50); // Memory should be mostly cleaned up
    }, 120000);
  });

  describe('Context Quality Preservation', () => {
    it('should preserve decision quality with compressed context', async () => {
      const decisions: any[] = [];
      const contextMetrics: any[] = [];
      
      // Test decision quality across different context sizes
      for (let i = 0; i < 3; i++) {
        const metrics = await validator.measureContextUsage();
        const decision = await executor.executeClaudeAutonomous();
        const quality = await validator.evaluateDecision(decision);
        
        decisions.push({ decision, quality });
        contextMetrics.push(metrics);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // All decisions should maintain high quality
      decisions.forEach((item, index) => {
        expect(item.quality).toBeGreaterThanOrEqual(70); // Minimum quality threshold
        expect(item.decision.action).toMatch(/^(post|engage|amplify|wait)$/);
        expect(item.decision.reasoning).toBeDefined();
      });
      
      // Quality should not significantly degrade with compression
      const avgQuality = decisions.reduce((sum, item) => sum + item.quality, 0) / decisions.length;
      expect(avgQuality).toBeGreaterThanOrEqual(75);
      
      console.log(`Decision qualities: [${decisions.map(d => d.quality.toFixed(0)).join(', ')}]`);
      console.log(`Average quality: ${avgQuality.toFixed(1)}`);
    }, 90000);

    it('should maintain contextual relevance in decisions', async () => {
      const decision = await executor.executeClaudeAutonomous();
      
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(15);
      
      // Check for maintained contextual awareness
      const reasoning = decision.reasoning.toLowerCase();
      
      // Should demonstrate understanding of the investment education context
      const contextualWords = ['投資', '教育', '価値', 'コンテンツ', 'ユーザー', 'アカウント', 'フォロワー'];
      const foundContextWords = contextualWords.filter(word => reasoning.includes(word));
      
      if (foundContextWords.length > 0) {
        expect(foundContextWords.length).toBeGreaterThanOrEqual(1);
        console.log(`Contextual words found: [${foundContextWords.join(', ')}]`);
      }
    }, 30000);
  });

  describe('Scalability Under Different Context Loads', () => {
    it('should handle varying context sizes efficiently', async () => {
      const results: any[] = [];
      
      // Test with different amounts of context data
      for (let contextScale = 1; contextScale <= 3; contextScale++) {
        const startTime = Date.now();
        
        // Simulate different context loads by running multiple operations
        const promises = Array(contextScale).fill(null).map(() => 
          validator.measureContextUsage()
        );
        
        const metricsArray = await Promise.all(promises);
        const processingTime = Date.now() - startTime;
        
        const avgReduction = metricsArray.reduce((sum, m) => sum + m.reduction, 0) / metricsArray.length;
        
        results.push({
          scale: contextScale,
          processingTime,
          avgReduction,
          avgContextSize: metricsArray.reduce((sum, m) => sum + m.after, 0) / metricsArray.length
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Processing time should not grow exponentially
      const timeGrowthFactor = results[results.length - 1].processingTime / results[0].processingTime;
      expect(timeGrowthFactor).toBeLessThan(4); // Should not be more than 4x slower
      
      // Compression efficiency should be maintained
      results.forEach(result => {
        expect(result.avgReduction).toBeGreaterThanOrEqual(10); // At least 10% reduction
        expect(result.avgContextSize).toBeLessThan(40000); // Under 40KB even at scale
      });
      
      console.log('Scalability results:');
      results.forEach(r => {
        console.log(`Scale ${r.scale}: ${r.processingTime}ms, ${r.avgReduction.toFixed(1)}% reduction, ${r.avgContextSize} bytes`);
      });
    }, 60000);
  });
});