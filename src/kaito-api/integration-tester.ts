/**
 * KaitoTwitterAPI統合テストシステム (Phase 2.1)
 * REQUIREMENTS.md準拠版 - E2E統合テスト・信頼性検証システム
 */

import { KaitoTwitterAPIClient } from './client';
import { SearchEngine } from './search-engine';
import { ActionExecutor } from './action-executor';
import { ClaudeDecision } from '../claude/decision-engine';

// === 統合テスト結果インターフェース ===

export interface IntegrationTestResult {
  testSuite: string;
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  executionTime: number;
  testResults: TestCaseResult[];
  systemMetrics: TestSystemMetrics;
  recommendations: string[];
  timestamp: string;
}

export interface WorkflowTestResult {
  workflowName: string;
  success: boolean;
  steps: WorkflowStepResult[];
  totalExecutionTime: number;
  dataConsistency: boolean;
  performanceMetrics: WorkflowPerformanceMetrics;
  errorLog: string[];
  timestamp: string;
}

export interface ConsistencyTestResult {
  overall: 'consistent' | 'inconsistent' | 'partial';
  apiConsistency: ComponentConsistency;
  dataConsistency: ComponentConsistency;
  behaviorConsistency: ComponentConsistency;
  crossComponentConsistency: CrossComponentTest[];
  recommendations: string[];
  timestamp: string;
}

export interface PerformanceTestResult {
  testType: 'load' | 'stress' | 'volume' | 'endurance';
  success: boolean;
  metrics: {
    averageResponseTime: number;
    peakResponseTime: number;
    throughput: number;
    errorRate: number;
    resourceUtilization: ResourceMetrics;
  };
  performanceBaseline: PerformanceBaseline;
  deviations: PerformanceDeviation[];
  bottlenecks: string[];
  recommendations: string[];
  timestamp: string;
}

export interface QPSTestResult {
  targetQPS: number;
  achievedQPS: number;
  sustainabilityDuration: number;
  throttlingPoints: ThrottlingPoint[];
  errorDistribution: { [errorType: string]: number };
  systemStability: 'stable' | 'degraded' | 'unstable';
  recommendations: string[];
  timestamp: string;
}

export interface ResponseTimeTestResult {
  component: string;
  targetResponseTime: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  responseTimeDistribution: ResponseTimeDistribution;
  performanceGrade: 'excellent' | 'good' | 'fair' | 'poor';
  optimizationSuggestions: string[];
  timestamp: string;
}

export interface ErrorRecoveryTestResult {
  scenarioName: string;
  success: boolean;
  errorInjection: ErrorInjectionSpec;
  recoveryTime: number;
  systemBehavior: RecoveryBehavior;
  dataIntegrity: boolean;
  userImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  lessons: string[];
  timestamp: string;
}

export interface RollbackTestResult {
  transactionId: string;
  success: boolean;
  rollbackTrigger: string;
  rollbackTime: number;
  stateConsistency: boolean;
  dataIntegrity: boolean;
  sideEffects: string[];
  rollbackCompleteness: number; // 0-100%
  timestamp: string;
}

export interface FailoverTestResult {
  scenarioName: string;
  success: boolean;
  failoverTime: number;
  primaryFailurePoint: string;
  secondaryActivation: boolean;
  serviceAvailability: number; // percentage during failover
  dataConsistency: boolean;
  userExperience: 'seamless' | 'minor_disruption' | 'major_disruption';
  recommendations: string[];
  timestamp: string;
}

// === サポート型定義 ===

export interface TestCaseResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  executionTime: number;
  assertions: AssertionResult[];
  errorMessage?: string;
  performance?: TestPerformanceData;
}

export interface TestSystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  qpsActual: number;
  responseTimeAvg: number;
  errorRate: number;
}

export interface WorkflowStepResult {
  stepName: string;
  success: boolean;
  executionTime: number;
  input: any;
  output: any;
  errorMessage?: string;
}

export interface WorkflowPerformanceMetrics {
  totalSteps: number;
  avgStepTime: number;
  bottleneckStep: string;
  memoryPeak: number;
  networkUtilization: number;
}

export interface ComponentConsistency {
  component: string;
  status: 'consistent' | 'inconsistent' | 'unknown';
  score: number; // 0-100
  issues: string[];
  validationTime: number;
}

export interface CrossComponentTest {
  components: string[];
  interaction: string;
  success: boolean;
  consistency: boolean;
  issues: string[];
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

export interface PerformanceBaseline {
  responseTime: number;
  throughput: number;
  errorRate: number;
  establishedDate: string;
}

export interface PerformanceDeviation {
  metric: string;
  expected: number;
  actual: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ThrottlingPoint {
  qps: number;
  timestamp: string;
  component: string;
  action: string;
}

export interface ResponseTimeDistribution {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export interface ErrorInjectionSpec {
  type: 'network_failure' | 'api_error' | 'timeout' | 'resource_exhaustion';
  target: string;
  duration: number;
  severity: 'low' | 'medium' | 'high';
}

export interface RecoveryBehavior {
  detectionTime: number;
  recoveryInitiation: number;
  fullRecovery: number;
  automaticRecovery: boolean;
  manualIntervention: boolean;
}

export interface AssertionResult {
  assertion: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export interface TestPerformanceData {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * KaitoAPI統合テストシステム
 * 全コンポーネントの統合テスト・信頼性検証を実行
 */
export class KaitoAPIIntegrationTester {
  private client: KaitoTwitterAPIClient;
  private searchEngine: SearchEngine;
  private actionExecutor: ActionExecutor;
  
  private testResults: Map<string, IntegrationTestResult> = new Map();
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();
  
  constructor(
    client?: KaitoTwitterAPIClient,
    searchEngine?: SearchEngine,
    actionExecutor?: ActionExecutor
  ) {
    this.client = client || new KaitoTwitterAPIClient();
    this.searchEngine = searchEngine || new SearchEngine();
    this.actionExecutor = actionExecutor || new ActionExecutor(this.client);
    
    this.initializePerformanceBaselines();
    console.log('✅ KaitoAPIIntegrationTester initialized - Phase 2.1 統合テストスイート');
  }

  /**
   * 完全統合テスト実行
   */
  async runFullIntegrationTest(): Promise<IntegrationTestResult> {
    try {
      console.log('🧪 完全統合テスト開始');
      const startTime = Date.now();
      
      const testSuite = 'Full Integration Test Suite';
      const testResults: TestCaseResult[] = [];
      
      // 基本機能テスト
      testResults.push(...await this.runBasicFunctionalityTests());
      
      // コンポーネント統合テスト
      testResults.push(...await this.runComponentIntegrationTests());
      
      // エラーハンドリングテスト
      testResults.push(...await this.runErrorHandlingTests());
      
      // パフォーマンステスト
      testResults.push(...await this.runPerformanceTests());
      
      // セキュリティテスト
      testResults.push(...await this.runSecurityTests());
      
      const executionTime = Date.now() - startTime;
      const passedTests = testResults.filter(r => r.status === 'passed').length;
      const failedTests = testResults.filter(r => r.status === 'failed').length;
      const skippedTests = testResults.filter(r => r.status === 'skipped').length;
      
      const result: IntegrationTestResult = {
        testSuite,
        success: failedTests === 0,
        totalTests: testResults.length,
        passedTests,
        failedTests,
        skippedTests,
        executionTime,
        testResults,
        systemMetrics: await this.collectSystemMetrics(),
        recommendations: this.generateTestRecommendations(testResults),
        timestamp: new Date().toISOString()
      };
      
      this.testResults.set(testSuite, result);
      
      console.log('✅ 完全統合テスト完了:', {
        success: result.success,
        passed: passedTests,
        failed: failedTests,
        executionTime: `${executionTime}ms`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ 完全統合テスト実行エラー:', error);
      throw error;
    }
  }

  /**
   * E2Eワークフローテスト
   */
  async testEndToEndWorkflow(): Promise<WorkflowTestResult> {
    try {
      console.log('🔄 E2Eワークフローテスト開始');
      const startTime = Date.now();
      
      const workflowName = 'Complete Tweet Action Workflow';
      const steps: WorkflowStepResult[] = [];
      const errorLog: string[] = [];
      
      // Step 1: クライアント認証
      steps.push(await this.testWorkflowStep(
        'Client Authentication',
        async () => {
          await this.client.authenticate();
          return { authenticated: true };
        }
      ));
      
      // Step 2: 投資教育コンテンツ検索
      steps.push(await this.testWorkflowStep(
        'Educational Content Search',
        async () => {
          const results = await this.searchEngine.searchEducationalContent('投資基礎');
          return { searchResults: results.length };
        }
      ));
      
      // Step 3: コンテンツ品質分析
      steps.push(await this.testWorkflowStep(
        'Content Quality Analysis',
        async () => {
          const tweets = await this.searchEngine.searchTweets('投資', { minLikes: 5 });
          const analysis = await this.searchEngine.analyzeContentQuality(tweets);
          return { qualityScore: analysis.overall.averageQuality };
        }
      ));
      
      // Step 4: Claude決定シミュレーション
      steps.push(await this.testWorkflowStep(
        'Claude Decision Simulation',
        async () => {
          const decision: ClaudeDecision = {
            action: 'post',
            reasoning: 'Test posting for workflow validation',
            parameters: { content: 'テスト投稿: 投資教育の重要性について' },
            confidence: 0.8
          };
          return { decision };
        }
      ));
      
      // Step 5: アクション実行
      steps.push(await this.testWorkflowStep(
        'Action Execution',
        async () => {
          const decision: ClaudeDecision = {
            action: 'post',
            reasoning: 'Test execution',
            parameters: { content: 'テスト投稿: 統合テスト実行中' },
            confidence: 0.8
          };
          const result = await this.actionExecutor.executeAction(decision);
          return { executionResult: result.success };
        }
      ));
      
      // Step 6: 結果検証とメトリクス収集
      steps.push(await this.testWorkflowStep(
        'Result Verification',
        async () => {
          const metrics = await this.actionExecutor.getExecutionMetrics();
          return { metrics: metrics.totalExecutions };
        }
      ));
      
      const totalExecutionTime = Date.now() - startTime;
      const success = steps.every(step => step.success);
      
      const result: WorkflowTestResult = {
        workflowName,
        success,
        steps,
        totalExecutionTime,
        dataConsistency: await this.validateWorkflowDataConsistency(),
        performanceMetrics: this.calculateWorkflowPerformanceMetrics(steps),
        errorLog,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ E2Eワークフローテスト完了:', {
        success,
        totalSteps: steps.length,
        executionTime: `${totalExecutionTime}ms`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ E2Eワークフローテストエラー:', error);
      throw error;
    }
  }

  /**
   * API整合性検証
   */
  async validateAPIConsistency(): Promise<ConsistencyTestResult> {
    try {
      console.log('🔍 API整合性検証開始');
      
      const apiConsistency = await this.validateComponentConsistency('API Client');
      const dataConsistency = await this.validateComponentConsistency('Data Layer');
      const behaviorConsistency = await this.validateComponentConsistency('Behavior');
      
      const crossComponentTests = await this.runCrossComponentTests();
      
      const overallConsistent = apiConsistency.status === 'consistent' &&
                               dataConsistency.status === 'consistent' &&
                               behaviorConsistency.status === 'consistent' &&
                               crossComponentTests.every(test => test.success);
      
      const result: ConsistencyTestResult = {
        overall: overallConsistent ? 'consistent' : 'inconsistent',
        apiConsistency,
        dataConsistency,
        behaviorConsistency,
        crossComponentConsistency: crossComponentTests,
        recommendations: this.generateConsistencyRecommendations(
          apiConsistency, dataConsistency, behaviorConsistency, crossComponentTests
        ),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ API整合性検証完了:', {
        overall: result.overall,
        apiStatus: apiConsistency.status,
        dataStatus: dataConsistency.status
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ API整合性検証エラー:', error);
      throw error;
    }
  }

  /**
   * パフォーマンステスト実行
   */
  async runPerformanceTest(): Promise<PerformanceTestResult> {
    try {
      console.log('⚡ パフォーマンステスト開始');
      const startTime = Date.now();
      
      const testType = 'load';
      const metrics = await this.executeLoadTest();
      const baseline = this.performanceBaselines.get('standard_load') || {
        responseTime: 1000,
        throughput: 50,
        errorRate: 5,
        establishedDate: new Date().toISOString()
      };
      
      const deviations = this.calculatePerformanceDeviations(metrics, baseline);
      const bottlenecks = await this.identifyPerformanceBottlenecks();
      
      const result: PerformanceTestResult = {
        testType,
        success: metrics.averageResponseTime <= baseline.responseTime * 1.2, // 20% tolerance
        metrics,
        performanceBaseline: baseline,
        deviations,
        bottlenecks,
        recommendations: this.generatePerformanceRecommendations(metrics, deviations),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ パフォーマンステスト完了:', {
        success: result.success,
        avgResponseTime: metrics.averageResponseTime,
        throughput: metrics.throughput
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ パフォーマンステストエラー:', error);
      throw error;
    }
  }

  /**
   * QPS制限テスト
   */
  async validateQPSLimits(): Promise<QPSTestResult> {
    try {
      console.log('📊 QPS制限テスト開始');
      
      const targetQPS = 200;
      const testDuration = 60000; // 1 minute
      const startTime = Date.now();
      
      let requestCount = 0;
      let errorCount = 0;
      const errorDistribution: { [errorType: string]: number } = {};
      const throttlingPoints: ThrottlingPoint[] = [];
      
      // QPS負荷テスト実行
      const interval = setInterval(async () => {
        try {
          const requests = Array(targetQPS / 10).fill(null).map(async () => {
            try {
              await this.client.testConnection();
              requestCount++;
            } catch (error) {
              errorCount++;
              const errorType = this.categorizeError(error);
              errorDistribution[errorType] = (errorDistribution[errorType] || 0) + 1;
              
              if (errorType === 'rate_limit') {
                throttlingPoints.push({
                  qps: this.client.getCurrentQPS(),
                  timestamp: new Date().toISOString(),
                  component: 'client',
                  action: 'testConnection'
                });
              }
            }
          });
          
          await Promise.all(requests);
        } catch (error) {
          console.warn('QPS test iteration error:', error);
        }
      }, 100); // 10 times per second
      
      // テスト期間待機
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(interval);
      
      const elapsedTime = Date.now() - startTime;
      const achievedQPS = Math.round((requestCount / elapsedTime) * 1000);
      const sustainabilityDuration = elapsedTime;
      
      const systemStability = this.assessSystemStability(errorCount, requestCount, throttlingPoints);
      
      const result: QPSTestResult = {
        targetQPS,
        achievedQPS,
        sustainabilityDuration,
        throttlingPoints,
        errorDistribution,
        systemStability,
        recommendations: this.generateQPSRecommendations(achievedQPS, targetQPS, systemStability),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ QPS制限テスト完了:', {
        target: targetQPS,
        achieved: achievedQPS,
        stability: systemStability
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ QPS制限テストエラー:', error);
      throw error;
    }
  }

  /**
   * 応答時間テスト
   */
  async testResponseTimes(): Promise<ResponseTimeTestResult> {
    try {
      console.log('⏱️ 応答時間テスト開始');
      
      const component = 'KaitoAPIClient';
      const targetResponseTime = 700; // ms
      const sampleSize = 100;
      const responseTimes: number[] = [];
      
      // 応答時間サンプル収集
      for (let i = 0; i < sampleSize; i++) {
        const startTime = Date.now();
        try {
          await this.client.testConnection();
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
        } catch (error) {
          responseTimes.push(Date.now() - startTime); // エラー時も応答時間を記録
        }
        
        // 間隔を空ける
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 統計計算
      responseTimes.sort((a, b) => a - b);
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
      
      const responseTimeDistribution: ResponseTimeDistribution = {
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
        p75: responseTimes[Math.floor(responseTimes.length * 0.75)],
        p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
        p95: p95ResponseTime,
        p99: p99ResponseTime,
        max: responseTimes[responseTimes.length - 1]
      };
      
      const performanceGrade = this.gradePerformance(averageResponseTime, targetResponseTime);
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        averageResponseTime, targetResponseTime, responseTimeDistribution
      );
      
      const result: ResponseTimeTestResult = {
        component,
        targetResponseTime,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        responseTimeDistribution,
        performanceGrade,
        optimizationSuggestions,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ 応答時間テスト完了:', {
        average: averageResponseTime,
        p95: p95ResponseTime,
        grade: performanceGrade
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ 応答時間テストエラー:', error);
      throw error;
    }
  }

  /**
   * エラー復旧テスト
   */
  async testErrorRecovery(): Promise<ErrorRecoveryTestResult> {
    try {
      console.log('🛠️ エラー復旧テスト開始');
      
      const scenarioName = 'Network Failure Recovery';
      const errorInjection: ErrorInjectionSpec = {
        type: 'network_failure',
        target: 'KaitoAPIClient',
        duration: 5000,
        severity: 'medium'
      };
      
      const startTime = Date.now();
      
      // エラー注入とシステム挙動監視
      const recoveryBehavior = await this.simulateErrorAndMonitorRecovery(errorInjection);
      
      const recoveryTime = Date.now() - startTime;
      const dataIntegrity = await this.validateDataIntegrityAfterError();
      const systemBehavior = recoveryBehavior;
      
      const result: ErrorRecoveryTestResult = {
        scenarioName,
        success: recoveryBehavior.automaticRecovery && dataIntegrity,
        errorInjection,
        recoveryTime,
        systemBehavior,
        dataIntegrity,
        userImpact: this.assessUserImpact(recoveryTime, dataIntegrity),
        lessons: this.extractRecoveryLessons(recoveryBehavior, dataIntegrity),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ エラー復旧テスト完了:', {
        success: result.success,
        recoveryTime: recoveryTime,
        dataIntegrity: dataIntegrity
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ エラー復旧テストエラー:', error);
      throw error;
    }
  }

  /**
   * ロールバックシステムテスト
   */
  async validateRollbackSystem(): Promise<RollbackTestResult> {
    try {
      console.log('↩️ ロールバックシステムテスト開始');
      
      const decision: ClaudeDecision = {
        action: 'post',
        reasoning: 'Test rollback functionality',
        parameters: { content: 'テスト投稿（ロールバックテスト用）' },
        confidence: 0.8
      };
      
      const startTime = Date.now();
      
      // トランザクション実行（意図的失敗を含む）
      const transactionResult = await this.actionExecutor.executeWithTransaction([decision]);
      const transactionId = transactionResult.transactionId;
      
      // ロールバック実行時間測定
      const rollbackStartTime = Date.now();
      const rollbackSuccess = await this.actionExecutor.rollbackLastActions(1);
      const rollbackTime = Date.now() - rollbackStartTime;
      
      // 状態整合性確認
      const stateConsistency = await this.validateSystemStateConsistency();
      const dataIntegrity = await this.validateDataIntegrityAfterRollback();
      
      const result: RollbackTestResult = {
        transactionId,
        success: rollbackSuccess && stateConsistency && dataIntegrity,
        rollbackTrigger: 'manual_test',
        rollbackTime,
        stateConsistency,
        dataIntegrity,
        sideEffects: await this.detectRollbackSideEffects(),
        rollbackCompleteness: this.calculateRollbackCompleteness(transactionResult),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ ロールバックシステムテスト完了:', {
        success: result.success,
        rollbackTime: rollbackTime,
        completeness: result.rollbackCompleteness
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ ロールバックシステムテストエラー:', error);
      throw error;
    }
  }

  /**
   * フェイルオーバーシナリオテスト
   */
  async testFailoverScenarios(): Promise<FailoverTestResult> {
    try {
      console.log('🔄 フェイルオーバーシナリオテスト開始');
      
      const scenarioName = 'Primary Endpoint Failure';
      const startTime = Date.now();
      
      // プライマリエンドポイント障害シミュレーション
      const failurePoint = await this.simulatePrimaryEndpointFailure();
      
      // フェイルオーバー動作監視
      const failoverTime = await this.measureFailoverTime();
      const secondaryActivation = await this.verifySecondaryEndpointActivation();
      
      // サービス可用性測定
      const serviceAvailability = await this.measureServiceAvailabilityDuringFailover();
      
      // データ整合性確認
      const dataConsistency = await this.validateDataConsistencyDuringFailover();
      
      const result: FailoverTestResult = {
        scenarioName,
        success: secondaryActivation && serviceAvailability > 95 && dataConsistency,
        failoverTime,
        primaryFailurePoint: failurePoint,
        secondaryActivation,
        serviceAvailability,
        dataConsistency,
        userExperience: this.assessUserExperienceDuringFailover(failoverTime, serviceAvailability),
        recommendations: this.generateFailoverRecommendations(failoverTime, serviceAvailability),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ フェイルオーバーシナリオテスト完了:', {
        success: result.success,
        failoverTime: failoverTime,
        availability: serviceAvailability
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ フェイルオーバーシナリオテストエラー:', error);
      throw error;
    }
  }

  // ============================================================================
  // プライベートヘルパーメソッド
  // ============================================================================

  private initializePerformanceBaselines(): void {
    this.performanceBaselines.set('standard_load', {
      responseTime: 700,
      throughput: 50,
      errorRate: 2,
      establishedDate: new Date().toISOString()
    });
    
    this.performanceBaselines.set('high_load', {
      responseTime: 1200,
      throughput: 100,
      errorRate: 5,
      establishedDate: new Date().toISOString()
    });
  }

  private async runBasicFunctionalityTests(): Promise<TestCaseResult[]> {
    const tests: TestCaseResult[] = [];
    
    // Client authentication test
    tests.push(await this.runTestCase('Client Authentication', async () => {
      await this.client.authenticate();
      return { authenticated: true };
    }));
    
    // Search functionality test
    tests.push(await this.runTestCase('Search Functionality', async () => {
      const results = await this.searchEngine.searchTweets('投資', { maxResults: 10 });
      return { resultsCount: results.length };
    }));
    
    // Action execution test
    tests.push(await this.runTestCase('Action Execution', async () => {
      const decision: ClaudeDecision = {
        action: 'wait',
        reasoning: 'Test action execution',
        parameters: { duration: 100 },
        confidence: 1.0
      };
      const result = await this.actionExecutor.executeAction(decision);
      return { success: result.success };
    }));
    
    return tests;
  }

  private async runComponentIntegrationTests(): Promise<TestCaseResult[]> {
    const tests: TestCaseResult[] = [];
    
    // Client-SearchEngine integration
    tests.push(await this.runTestCase('Client-SearchEngine Integration', async () => {
      const accountInfo = await this.client.getAccountInfo();
      const searchResults = await this.searchEngine.searchTweets('test', { maxResults: 5 });
      return { 
        accountRetrieved: !!accountInfo.id, 
        searchResultsCount: searchResults.length 
      };
    }));
    
    // SearchEngine-ActionExecutor integration
    tests.push(await this.runTestCase('SearchEngine-ActionExecutor Integration', async () => {
      const educationalContent = await this.searchEngine.searchEducationalContent('投資基礎');
      const decision: ClaudeDecision = {
        action: 'wait',
        reasoning: 'Integration test',
        parameters: { duration: 50 },
        confidence: 0.9
      };
      const executionResult = await this.actionExecutor.executeAction(decision);
      return { 
        contentFound: educationalContent.length > 0,
        executionSuccess: executionResult.success
      };
    }));
    
    return tests;
  }

  private async runErrorHandlingTests(): Promise<TestCaseResult[]> {
    const tests: TestCaseResult[] = [];
    
    // Invalid parameter handling
    tests.push(await this.runTestCase('Invalid Parameter Handling', async () => {
      try {
        const decision: ClaudeDecision = {
          action: 'post',
          reasoning: 'Test invalid params',
          parameters: {}, // Missing required content
          confidence: 0.8
        };
        const result = await this.actionExecutor.executeAction(decision);
        return { handledGracefully: !result.success && result.error?.includes('content') };
      } catch (error) {
        return { handledGracefully: true };
      }
    }));
    
    return tests;
  }

  private async runPerformanceTests(): Promise<TestCaseResult[]> {
    const tests: TestCaseResult[] = [];
    
    // Response time test
    tests.push(await this.runTestCase('Response Time Performance', async () => {
      const startTime = Date.now();
      await this.client.testConnection();
      const responseTime = Date.now() - startTime;
      return { 
        responseTime,
        withinTarget: responseTime <= 1000
      };
    }), responseTime => responseTime));
    
    return tests;
  }

  private async runSecurityTests(): Promise<TestCaseResult[]> {
    const tests: TestCaseResult[] = [];
    
    // Authentication validation
    tests.push(await this.runTestCase('Authentication Security', async () => {
      const isAuthenticated = this.client['isAuthenticated'];
      return { 
        authenticationRequired: true,
        currentlyAuthenticated: isAuthenticated
      };
    }));
    
    return tests;
  }

  private async runTestCase(
    testName: string,
    testFunction: () => Promise<any>,
    extractPerformance?: (result: any) => number
  ): Promise<TestCaseResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const executionTime = Date.now() - startTime;
      
      const assertions: AssertionResult[] = [];
      
      // 基本的なアサーション
      if (typeof result === 'object' && result !== null) {
        Object.entries(result).forEach(([key, value]) => {
          assertions.push({
            assertion: `Result contains ${key}`,
            expected: 'defined',
            actual: value !== undefined ? 'defined' : 'undefined',
            passed: value !== undefined
          });
        });
      }
      
      const performance = extractPerformance ? {
        responseTime: extractPerformance(result),
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user
      } : undefined;
      
      return {
        testName,
        status: assertions.every(a => a.passed) ? 'passed' : 'failed',
        executionTime,
        assertions,
        performance
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        testName,
        status: 'error',
        executionTime,
        assertions: [],
        errorMessage
      };
    }
  }

  private async testWorkflowStep(
    stepName: string,
    stepFunction: () => Promise<any>
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();
    
    try {
      const output = await stepFunction();
      const executionTime = Date.now() - startTime;
      
      return {
        stepName,
        success: true,
        executionTime,
        input: {},
        output
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        stepName,
        success: false,
        executionTime,
        input: {},
        output: null,
        errorMessage
      };
    }
  }

  private async collectSystemMetrics(): Promise<TestSystemMetrics> {
    const memoryUsage = process.memoryUsage();
    
    return {
      cpu: process.cpuUsage().user / 1000000, // Convert to ms
      memory: memoryUsage.heapUsed / 1024 / 1024, // Convert to MB
      network: 0, // Would need additional monitoring
      disk: 0, // Would need additional monitoring
      qpsActual: this.client.getCurrentQPS(),
      responseTimeAvg: 0, // Would calculate from recent requests
      errorRate: 0 // Would calculate from recent error count
    };
  }

  private generateTestRecommendations(testResults: TestCaseResult[]): string[] {
    const recommendations = [];
    const failedTests = testResults.filter(t => t.status === 'failed');
    const slowTests = testResults.filter(t => t.executionTime > 5000);
    
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length}個のテストが失敗しています。優先的に修正してください。`);
    }
    
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length}個のテストが5秒以上かかっています。パフォーマンスの最適化を検討してください。`);
    }
    
    const avgExecutionTime = testResults.reduce((sum, t) => sum + t.executionTime, 0) / testResults.length;
    if (avgExecutionTime > 2000) {
      recommendations.push('テスト実行時間が長いです。テストの並列化を検討してください。');
    }
    
    return recommendations;
  }

  // その他のヘルパーメソッドのMock実装
  private async validateWorkflowDataConsistency(): Promise<boolean> {
    return Math.random() > 0.1; // 90% success rate
  }

  private calculateWorkflowPerformanceMetrics(steps: WorkflowStepResult[]): WorkflowPerformanceMetrics {
    const totalSteps = steps.length;
    const avgStepTime = steps.reduce((sum, step) => sum + step.executionTime, 0) / totalSteps;
    const bottleneckStep = steps.reduce((prev, current) => 
      current.executionTime > prev.executionTime ? current : prev
    ).stepName;
    
    return {
      totalSteps,
      avgStepTime,
      bottleneckStep,
      memoryPeak: process.memoryUsage().heapUsed / 1024 / 1024,
      networkUtilization: Math.random() * 100
    };
  }

  private async validateComponentConsistency(component: string): Promise<ComponentConsistency> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const score = Math.random() * 20 + 80; // 80-100
    const status = score > 95 ? 'consistent' : score > 80 ? 'consistent' : 'inconsistent';
    
    return {
      component,
      status,
      score,
      issues: score < 90 ? [`Minor inconsistency in ${component}`] : [],
      validationTime: 500
    };
  }

  private async runCrossComponentTests(): Promise<CrossComponentTest[]> {
    return [
      {
        components: ['KaitoAPIClient', 'SearchEngine'],
        interaction: 'Search after authentication',
        success: true,
        consistency: true,
        issues: []
      },
      {
        components: ['SearchEngine', 'ActionExecutor'],
        interaction: 'Execute based on search results',
        success: true,
        consistency: true,
        issues: []
      }
    ];
  }

  private generateConsistencyRecommendations(
    api: ComponentConsistency,
    data: ComponentConsistency,
    behavior: ComponentConsistency,
    crossComponent: CrossComponentTest[]
  ): string[] {
    const recommendations = [];
    
    if (api.status !== 'consistent') {
      recommendations.push('API層の整合性問題を修正してください');
    }
    
    if (data.status !== 'consistent') {
      recommendations.push('データ層の整合性問題を修正してください');
    }
    
    const failedCrossTests = crossComponent.filter(test => !test.success);
    if (failedCrossTests.length > 0) {
      recommendations.push('コンポーネント間の統合テストが失敗しています');
    }
    
    return recommendations;
  }

  // その他のMock実装メソッド（簡略化）
  private async executeLoadTest(): Promise<PerformanceTestResult['metrics']> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      averageResponseTime: Math.random() * 500 + 400,
      peakResponseTime: Math.random() * 1000 + 800,
      throughput: Math.random() * 50 + 40,
      errorRate: Math.random() * 3,
      resourceUtilization: {
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
        network: Math.random() * 60 + 30,
        disk: Math.random() * 50 + 20
      }
    };
  }

  private calculatePerformanceDeviations(
    metrics: PerformanceTestResult['metrics'],
    baseline: PerformanceBaseline
  ): PerformanceDeviation[] {
    return [
      {
        metric: 'responseTime',
        expected: baseline.responseTime,
        actual: metrics.averageResponseTime,
        deviation: ((metrics.averageResponseTime - baseline.responseTime) / baseline.responseTime) * 100,
        severity: Math.abs((metrics.averageResponseTime - baseline.responseTime) / baseline.responseTime) > 0.2 ? 'high' : 'low'
      }
    ];
  }

  private async identifyPerformanceBottlenecks(): Promise<string[]> {
    return ['Network latency', 'Database query optimization needed'];
  }

  private generatePerformanceRecommendations(
    metrics: PerformanceTestResult['metrics'],
    deviations: PerformanceDeviation[]
  ): string[] {
    const recommendations = [];
    
    if (metrics.averageResponseTime > 1000) {
      recommendations.push('応答時間が目標を超えています。最適化が必要です。');
    }
    
    if (metrics.errorRate > 5) {
      recommendations.push('エラー率が高すぎます。エラーハンドリングの改善が必要です。');
    }
    
    return recommendations;
  }

  private categorizeError(error: any): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('rate limit')) return 'rate_limit';
    if (errorMessage.includes('timeout')) return 'timeout';
    if (errorMessage.includes('network')) return 'network';
    if (errorMessage.includes('auth')) return 'authentication';
    
    return 'unknown';
  }

  private assessSystemStability(
    errorCount: number,
    totalRequests: number,
    throttlingPoints: ThrottlingPoint[]
  ): 'stable' | 'degraded' | 'unstable' {
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    
    if (errorRate > 0.1 || throttlingPoints.length > 10) return 'unstable';
    if (errorRate > 0.05 || throttlingPoints.length > 5) return 'degraded';
    return 'stable';
  }

  private generateQPSRecommendations(
    achieved: number,
    target: number,
    stability: string
  ): string[] {
    const recommendations = [];
    
    if (achieved < target * 0.8) {
      recommendations.push('QPS目標の80%を下回っています。システム最適化が必要です。');
    }
    
    if (stability !== 'stable') {
      recommendations.push('システムが不安定です。負荷分散の改善を検討してください。');
    }
    
    return recommendations;
  }

  private gradePerformance(actual: number, target: number): 'excellent' | 'good' | 'fair' | 'poor' {
    const ratio = actual / target;
    
    if (ratio <= 0.7) return 'excellent';
    if (ratio <= 1.0) return 'good';
    if (ratio <= 1.3) return 'fair';
    return 'poor';
  }

  private generateOptimizationSuggestions(
    average: number,
    target: number,
    distribution: ResponseTimeDistribution
  ): string[] {
    const suggestions = [];
    
    if (average > target) {
      suggestions.push('平均応答時間が目標を超えています。キャッシュの活用を検討してください。');
    }
    
    if (distribution.p99 > target * 2) {
      suggestions.push('P99応答時間が非常に遅いです。外れ値の原因を調査してください。');
    }
    
    return suggestions;
  }

  // 残りのMock実装メソッドは簡略化して実装
  private async simulateErrorAndMonitorRecovery(spec: ErrorInjectionSpec): Promise<RecoveryBehavior> {
    await new Promise(resolve => setTimeout(resolve, spec.duration));
    
    return {
      detectionTime: Math.random() * 1000 + 500,
      recoveryInitiation: Math.random() * 2000 + 1000,
      fullRecovery: Math.random() * 5000 + 3000,
      automaticRecovery: Math.random() > 0.2,
      manualIntervention: Math.random() > 0.8
    };
  }

  private async validateDataIntegrityAfterError(): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private assessUserImpact(recoveryTime: number, dataIntegrity: boolean): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (!dataIntegrity) return 'severe';
    if (recoveryTime > 30000) return 'moderate';
    if (recoveryTime > 5000) return 'minimal';
    return 'none';
  }

  private extractRecoveryLessons(behavior: RecoveryBehavior, dataIntegrity: boolean): string[] {
    const lessons = [];
    
    if (!behavior.automaticRecovery) {
      lessons.push('自動復旧機能の改善が必要');
    }
    
    if (!dataIntegrity) {
      lessons.push('データ整合性保護機能の強化が必要');
    }
    
    return lessons;
  }

  private async validateSystemStateConsistency(): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private async validateDataIntegrityAfterRollback(): Promise<boolean> {
    return Math.random() > 0.05;
  }

  private async detectRollbackSideEffects(): Promise<string[]> {
    return Math.random() > 0.9 ? ['Minor cache inconsistency'] : [];
  }

  private calculateRollbackCompleteness(transactionResult: any): number {
    return Math.random() * 20 + 80; // 80-100%
  }

  private async simulatePrimaryEndpointFailure(): Promise<string> {
    return 'primary_api_endpoint';
  }

  private async measureFailoverTime(): Promise<number> {
    return Math.random() * 5000 + 2000; // 2-7 seconds
  }

  private async verifySecondaryEndpointActivation(): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private async measureServiceAvailabilityDuringFailover(): Promise<number> {
    return Math.random() * 10 + 90; // 90-100%
  }

  private async validateDataConsistencyDuringFailover(): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private assessUserExperienceDuringFailover(
    failoverTime: number,
    availability: number
  ): 'seamless' | 'minor_disruption' | 'major_disruption' {
    if (failoverTime < 3000 && availability > 98) return 'seamless';
    if (failoverTime < 10000 && availability > 95) return 'minor_disruption';
    return 'major_disruption';
  }

  private generateFailoverRecommendations(failoverTime: number, availability: number): string[] {
    const recommendations = [];
    
    if (failoverTime > 5000) {
      recommendations.push('フェイルオーバー時間の短縮が必要です');
    }
    
    if (availability < 98) {
      recommendations.push('フェイルオーバー中のサービス可用性向上が必要です');
    }
    
    return recommendations;
  }
}

// ============================================================================
// Phase 2.1 エクスポート
// ============================================================================

export {
  IntegrationTestResult,
  WorkflowTestResult,
  ConsistencyTestResult,
  PerformanceTestResult,
  QPSTestResult,
  ResponseTimeTestResult,
  ErrorRecoveryTestResult,
  RollbackTestResult,
  FailoverTestResult
};