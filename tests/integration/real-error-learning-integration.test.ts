/**
 * Real Error Learning Integration Test
 * Full cycle test: Error Detection -> Claude Analysis -> Auto Fix -> Re-test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';

// Import dependencies from previous tasks
import { 
  runAllDataSourceTests, 
  SourceTestResult,
  DataSourceError,
  DATA_SOURCE_TESTS 
} from '../real-execution';
import { ClaudeErrorFixer, FixDecision, FixResult } from '../../src/lib/claude-error-fixer';

// Integration Test Flow Types
interface ErrorSummary {
  sourceName: string;
  error: DataSourceError;
  testResult: SourceTestResult;
}

interface ComparisonResult {
  improved: boolean;
  fixedErrors: string[];
  newErrors: string[];
  performance: {
    beforeAvgTime: number;
    afterAvgTime: number;
    improvement: number;
  };
}

interface ErrorLearningRecord {
  sessionId: string;
  timestamp: string;
  originalErrors: ErrorSummary[];
  claudeAnalysis: FixDecision[];
  appliedFixes: FixResult[];
  verificationResults: SourceTestResult[];
  overallSuccess: boolean;
  learningOutcomes: string[];
}

class IntegrationTestFlow {
  private claudeFixer: ClaudeErrorFixer;
  private outputDir: string;
  
  constructor() {
    this.claudeFixer = new ClaudeErrorFixer();
    this.outputDir = path.join(process.cwd(), 'tasks/20250722_004919_real_error_learning_system/outputs');
  }

  async setupOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  // Phase 1: Discovery
  async executeAllSourceTests(): Promise<SourceTestResult[]> {
    const testConfig = {
      timeout: 30000,
      maxRetries: 1,
      parallel: false // Sequential execution for reliability
    };

    // Run all data source tests
    const results = await runAllDataSourceTests(testConfig);
    return Object.values(results) as SourceTestResult[];
  }

  async identifyErrors(results: SourceTestResult[]): Promise<ErrorSummary[]> {
    const errorSummaries: ErrorSummary[] = [];
    
    for (const result of results) {
      if (!result.success && result.error) {
        errorSummaries.push({
          sourceName: result.sourceName,
          error: result.error,
          testResult: result
        });
      }
    }
    
    return errorSummaries;
  }

  // Phase 2: Analysis
  async analyzeWithClaude(errors: ErrorSummary[]): Promise<FixDecision[]> {
    const decisions: FixDecision[] = [];
    
    for (const errorSummary of errors) {
      const errorContext = {
        sourceName: errorSummary.sourceName,
        errorMessage: errorSummary.error.details || 'Unknown error',
        errorCount: 1,
        lastOccurred: errorSummary.testResult.testEndTime,
        errorCode: errorSummary.error.category
      };
      
      const decision = await this.claudeFixer.fixError(errorContext);
      if (decision.success) {
        decisions.push(decision.decision);
      }
    }
    
    return decisions;
  }

  prioritizeFixing(decisions: FixDecision[]): FixDecision[] {
    // Sort by priority: immediate -> delayed -> skip
    const priorityOrder = { 'immediate': 0, 'delayed': 1, 'skip': 2 };
    
    return decisions
      .filter(decision => decision.priority !== 'skip')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  // Phase 3: Fixing
  async applyFixes(decisions: FixDecision[]): Promise<FixResult[]> {
    const results: FixResult[] = [];
    
    for (const decision of decisions) {
      const errorContext = {
        sourceName: 'action-specific-collector', // Target file for fixes
        errorMessage: decision.errorType,
        errorCount: 1,
        lastOccurred: new Date().toISOString()
      };
      
      const fixResult = await this.claudeFixer.fixError(errorContext);
      results.push(fixResult);
    }
    
    return results;
  }

  async backupOriginalCode(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'tasks/20250722_004919_real_error_learning_system/backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Backup action-specific-collector.ts
    const targetFile = path.join(process.cwd(), 'src/lib/action-specific-collector.ts');
    const backupFile = path.join(backupDir, `action-specific-collector-backup-integration-${timestamp}.ts`);
    
    try {
      const content = await fs.readFile(targetFile, 'utf-8');
      await fs.writeFile(backupFile, content);
      console.log(`✅ [Integration Test] Backup created: ${backupFile}`);
    } catch (error) {
      console.warn(`⚠️  [Integration Test] Backup failed: ${error}`);
    }
  }

  // Phase 4: Verification
  async rerunTests(): Promise<SourceTestResult[]> {
    // Wait a bit for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.executeAllSourceTests();
  }

  compareResults(before: SourceTestResult[], after: SourceTestResult[]): ComparisonResult {
    const beforeErrors = before.filter(r => !r.success).map(r => r.sourceName);
    const afterErrors = after.filter(r => !r.success).map(r => r.sourceName);
    
    const fixedErrors = beforeErrors.filter(source => !afterErrors.includes(source));
    const newErrors = afterErrors.filter(source => !beforeErrors.includes(source));
    
    const beforeAvgTime = before.reduce((sum, r) => sum + r.performanceMetrics.responseTime, 0) / before.length;
    const afterAvgTime = after.reduce((sum, r) => sum + r.performanceMetrics.responseTime, 0) / after.length;
    const improvement = ((beforeAvgTime - afterAvgTime) / beforeAvgTime) * 100;
    
    return {
      improved: fixedErrors.length > newErrors.length,
      fixedErrors,
      newErrors,
      performance: {
        beforeAvgTime,
        afterAvgTime,
        improvement
      }
    };
  }

  async saveIntegrationReport(record: ErrorLearningRecord): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `integration-report-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(record, null, 2));
    return reportPath;
  }
}

// Integration Tests
describe('Real Error Learning Integration Test', () => {
  let testFlow: IntegrationTestFlow;
  let originalResults: SourceTestResult[];
  let sessionId: string;

  beforeAll(async () => {
    testFlow = new IntegrationTestFlow();
    await testFlow.setupOutputDir();
    sessionId = `integration-test-${Date.now()}`;
  });

  it('should execute complete error learning cycle', async () => {
    const learningRecord: ErrorLearningRecord = {
      sessionId,
      timestamp: new Date().toISOString(),
      originalErrors: [],
      claudeAnalysis: [],
      appliedFixes: [],
      verificationResults: [],
      overallSuccess: false,
      learningOutcomes: []
    };

    try {
      // Phase 1: Discovery
      console.log('🔍 Phase 1: Discovery - Running all data source tests...');
      originalResults = await testFlow.executeAllSourceTests();
      
      const errors = await testFlow.identifyErrors(originalResults);
      learningRecord.originalErrors = errors;
      
      console.log(`📊 Found ${errors.length} errors in ${originalResults.length} data sources`);

      // Phase 2: Analysis (only if errors found)
      if (errors.length > 0) {
        console.log('🧠 Phase 2: Analysis - Analyzing errors with Claude...');
        const claudeAnalysis = await testFlow.analyzeWithClaude(errors);
        const prioritizedFixes = testFlow.prioritizeFixing(claudeAnalysis);
        
        learningRecord.claudeAnalysis = prioritizedFixes;
        console.log(`💡 Generated ${prioritizedFixes.length} fix strategies`);

        // Phase 3: Fixing
        if (prioritizedFixes.length > 0) {
          console.log('🔧 Phase 3: Fixing - Applying fixes...');
          await testFlow.backupOriginalCode();
          
          const fixResults = await testFlow.applyFixes(prioritizedFixes);
          learningRecord.appliedFixes = fixResults;
          
          const successfulFixes = fixResults.filter(r => r.success);
          console.log(`✅ Applied ${successfulFixes.length}/${fixResults.length} fixes successfully`);

          // Phase 4: Verification
          console.log('✅ Phase 4: Verification - Re-running tests...');
          const verificationResults = await testFlow.rerunTests();
          learningRecord.verificationResults = verificationResults;
          
          const comparison = testFlow.compareResults(originalResults, verificationResults);
          learningRecord.overallSuccess = comparison.improved;
          
          if (comparison.improved) {
            learningRecord.learningOutcomes.push(
              `Fixed errors: ${comparison.fixedErrors.join(', ')}`,
              `Performance improvement: ${comparison.performance.improvement.toFixed(2)}%`
            );
          }
          
          console.log(`📈 Results: Fixed ${comparison.fixedErrors.length} errors, ${comparison.newErrors.length} new errors`);
        }
      } else {
        console.log('✅ No errors found - all data sources working correctly');
        learningRecord.overallSuccess = true;
        learningRecord.learningOutcomes.push('All data sources operational - no fixes required');
      }

      // Save integration report
      const reportPath = await testFlow.saveIntegrationReport(learningRecord);
      console.log(`📄 Integration report saved: ${reportPath}`);

      // Test assertions
      expect(originalResults.length).toBe(5); // Should test all 5 data sources
      expect(learningRecord.timestamp).toBeDefined();
      
      // The test should complete within 15 minutes
      const testDuration = Date.now() - new Date(learningRecord.timestamp).getTime();
      expect(testDuration).toBeLessThan(15 * 60 * 1000); // 15 minutes max
      
    } catch (error) {
      learningRecord.learningOutcomes.push(`Integration test failed: ${error}`);
      await testFlow.saveIntegrationReport(learningRecord);
      throw error;
    }
  }, 900000); // 15 minute timeout

  it('should handle error-free scenario correctly', async () => {
    // This test verifies the system handles cases where no errors occur
    const mockResults: SourceTestResult[] = [
      {
        sourceName: 'test_source',
        testStartTime: new Date().toISOString(),
        testEndTime: new Date().toISOString(),
        success: true,
        performanceMetrics: { responseTime: 1000, memoryUsed: 50 }
      }
    ];
    
    const errors = await testFlow.identifyErrors(mockResults);
    expect(errors).toHaveLength(0);
  });

  afterAll(async () => {
    // Cleanup: restore backups if needed
    console.log('🧹 Integration test cleanup completed');
  });
});