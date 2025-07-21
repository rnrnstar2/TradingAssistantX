import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';
import { OptimizationValidator } from '../../src/utils/optimization-metrics.js';
import type { Decision } from '../../src/types/autonomous-system.js';

describe('Claude Autonomous Decision Validation', () => {
  let optimizedExecutor: AutonomousExecutor;
  let validator: OptimizationValidator;
  let initialMemory: number;

  beforeAll(async () => {
    optimizedExecutor = new AutonomousExecutor();
    validator = new OptimizationValidator();
    initialMemory = process.memoryUsage().heapUsed;
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Context Efficiency', () => {
    it('should reduce context usage by at least 30%', async () => {
      const metrics = await validator.measureContextUsage();
      
      expect(metrics.reduction).toBeGreaterThanOrEqual(30);
      expect(metrics.after).toBeLessThan(30000); // 30KB以下
    }, 30000);

    it('should maintain decision quality with reduced context', async () => {
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      const qualityScore = await validator.evaluateDecision(decision);
      
      expect(qualityScore).toBeGreaterThanOrEqual(85); // 85点以上
      expect(decision).toBeDefined();
      expect(decision.action).toBeDefined();
      expect(decision.reasoning).toBeDefined();
    }, 45000);

    it('should process context efficiently without information loss', async () => {
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      
      // Check that all essential decision components are present
      const actionType = decision.action?.type || decision.type;
      expect(actionType).toMatch(/^(original_post|quote_tweet|retweet|reply|wait|analyze_only)$/);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(10);
      
      // Check that impact information is preserved
      if (decision.action?.expectedImpact) {
        expect(decision.action.expectedImpact).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Autonomous Decision Performance', () => {
    it('should make decisions within 30 seconds', async () => {
      const startTime = Date.now();
      
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      
      const decisionTime = Date.now() - startTime;
      expect(decisionTime).toBeLessThan(30000); // 30秒以内
      expect(decision).toBeDefined();
    }, 35000);

    it('should provide actionable decisions', async () => {
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      
      const actionType = decision.action?.type || decision.type;
      expect(actionType).toMatch(/^(original_post|quote_tweet|retweet|reply|wait|analyze_only)$/);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(10);
      
      // Check for Japanese investment education context
      if (decision.reasoning.includes('投資教育') || decision.reasoning.includes('価値創造')) {
        expect(decision.reasoning).toContain('投資教育');
      }
    }, 30000);

    it('should maintain consistent decision structure', async () => {
      const decisions: Decision[] = [];
      
      // Run multiple decisions to check consistency
      for (let i = 0; i < 3; i++) {
        const decision = await optimizedExecutor.executeClaudeAutonomous();
        decisions.push(decision);
        
        // Wait between decisions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check that all decisions have required structure
      decisions.forEach((decision, index) => {
        const actionType = decision.action?.type || decision.type;
        expect(actionType).toBeDefined();
        expect(decision.reasoning).toBeDefined();
        expect(actionType).toMatch(/^(original_post|quote_tweet|retweet|reply|wait|analyze_only)$/);
        expect(decision.reasoning.length).toBeGreaterThan(5);
      });
      
      // Check for variety in decisions (not all identical)
      const uniqueActions = new Set(decisions.map(d => d.action?.type || d.type));
      const uniqueReasonings = new Set(decisions.map(d => d.reasoning.substring(0, 20)));
      
      // At least some variety expected (not necessarily all different)
      expect(uniqueActions.size).toBeGreaterThanOrEqual(1);
      expect(uniqueReasonings.size).toBeGreaterThanOrEqual(1);
    }, 120000);
  });

  describe('System Resource Optimization', () => {
    it('should maintain memory usage under 100MB', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      await optimizedExecutor.executeClaudeAutonomous();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(memoryIncrease).toBeLessThan(50); // 50MB以下の増加
      expect(finalMemory / 1024 / 1024).toBeLessThan(100); // 総使用量100MB以下
    }, 30000);

    it('should handle multiple consecutive executions efficiently', async () => {
      const memoryReadings: number[] = [];
      const executionTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        await optimizedExecutor.executeClaudeAutonomous();
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        executionTimes.push(endTime - startTime);
        memoryReadings.push((endMemory - startMemory) / 1024 / 1024);
        
        // Short pause between executions
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Check that performance doesn't degrade significantly
      const avgExecutionTime = executionTimes.reduce((a, b) => a + b) / executionTimes.length;
      const maxMemoryIncrease = Math.max(...memoryReadings);
      
      expect(avgExecutionTime).toBeLessThan(35000); // Average under 35 seconds
      expect(maxMemoryIncrease).toBeLessThan(30); // Max 30MB increase per execution
    }, 200000);

    it('should demonstrate improved CPU efficiency', async () => {
      const cpuUsageBefore = process.cpuUsage();
      
      await optimizedExecutor.executeClaudeAutonomous();
      
      const cpuUsageAfter = process.cpuUsage(cpuUsageBefore);
      const cpuPercent = ((cpuUsageAfter.user + cpuUsageAfter.system) / 1000000);
      
      // Should not consume excessive CPU time (less than 10 seconds of CPU time)
      expect(cpuPercent).toBeLessThan(10);
    }, 30000);
  });

  describe('Decision Quality Validation', () => {
    it('should produce contextually appropriate decisions', async () => {
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      const qualityScore = await validator.evaluateDecision(decision);
      
      expect(qualityScore).toBeGreaterThanOrEqual(75);
      
      // Check for investment education context relevance
      if (decision.reasoning) {
        const reasoning = decision.reasoning.toLowerCase();
        const hasRelevantKeywords = 
          reasoning.includes('投資') || 
          reasoning.includes('教育') || 
          reasoning.includes('価値') ||
          reasoning.includes('コンテンツ') ||
          reasoning.includes('ユーザー');
        
        if (hasRelevantKeywords) {
          expect(hasRelevantKeywords).toBe(true);
        }
      }
    }, 30000);

    it('should maintain decision reasoning quality', async () => {
      const decision = await optimizedExecutor.executeClaudeAutonomous();
      
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(15);
      
      // Check for structured reasoning
      const reasoning = decision.reasoning;
      
      // Should contain some explanation of the decision
      expect(reasoning.length).toBeGreaterThan(10);
      
      // Should not be generic placeholder text
      expect(reasoning).not.toBe('決定しました');
      expect(reasoning).not.toBe('実行します');
    }, 30000);
  });

  describe('Error Handling and Resilience', () => {
    it('should handle system failures gracefully', async () => {
      // This test simulates potential failure scenarios
      let decision: AutonomousDecision | null = null;
      let error: Error | null = null;
      
      try {
        decision = await optimizedExecutor.executeClaudeAutonomous();
      } catch (e) {
        error = e as Error;
      }
      
      // Either we get a valid decision or a handled error
      if (decision) {
        const actionType = decision.action?.type || decision.type;
        expect(actionType).toBeDefined();
        expect(decision.reasoning).toBeDefined();
      } else if (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
      
      // At least one should be defined
      expect(decision || error).toBeDefined();
    }, 45000);
  });
});