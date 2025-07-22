import {
  CollectionExecution,
  MonitoringSession,
  DecisionDecisionPerformanceMetrics,
  Alert,
  BottleneckAnalysis,
  Bottleneck,
  ErrorState,
  RecoveryPlan,
  RecoveryAction,
  ExecutionState,
  ResourceUsage
} from '../../types/decision-types.js';

export class ExecutionMonitor {
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private alertThresholds = {
    responseTimeWarning: 5000,
    responseTimeError: 10000,
    successRateWarning: 70,
    successRateError: 50,
    memoryWarning: 80,
    memoryError: 95
  };

  async startMonitoring(execution: CollectionExecution): Promise<MonitoringSession> {
    const session: MonitoringSession = {
      id: `monitor_${execution.id}_${Date.now()}`,
      execution,
      metrics: this.initializeMetrics(),
      alerts: [],
      status: 'active'
    };

    this.activeSessions.set(session.id, session);
    
    this.schedulePeriodicChecks(session);
    
    console.log(`Started monitoring session: ${session.id}`);
    return session;
  }

  async updateMetrics(sessionId: string, newMetrics: Partial<DecisionPerformanceMetrics>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.metrics = { ...session.metrics, ...newMetrics };
    
    const alerts = this.checkAlertConditions(session.metrics);
    session.alerts.push(...alerts);

    if (alerts.some(alert => alert.type === 'error')) {
      session.status = 'paused';
      await this.handleCriticalAlerts(session, alerts);
    }
  }

  detectBottlenecks(performanceData: DecisionPerformanceMetrics): BottleneckAnalysis {
    const bottlenecks: Bottleneck[] = [];
    const recommendations: string[] = [];

    if (performanceData.responseTime > this.alertThresholds.responseTimeWarning) {
      bottlenecks.push({
        taskId: 'network_requests',
        type: 'network',
        severity: this.calculateSeverity(performanceData.responseTime, 1000, 10000),
        impact: 'Slow network responses affecting overall performance'
      });
      recommendations.push('Consider switching to faster collection methods');
    }

    if (performanceData.resourceUsage.memoryMb > this.alertThresholds.memoryWarning) {
      bottlenecks.push({
        taskId: 'memory_usage',
        type: 'memory',
        severity: this.calculateSeverity(performanceData.resourceUsage.memoryMb, 50, 100),
        impact: 'High memory usage may lead to system instability'
      });
      recommendations.push('Optimize data structures and release unused resources');
    }

    if (performanceData.resourceUsage.cpuPercent > 80) {
      bottlenecks.push({
        taskId: 'cpu_usage',
        type: 'cpu',
        severity: this.calculateSeverity(performanceData.resourceUsage.cpuPercent, 50, 90),
        impact: 'High CPU usage affecting system responsiveness'
      });
      recommendations.push('Reduce concurrent operations or optimize algorithms');
    }

    const criticalPath = this.identifyCriticalPath(bottlenecks);

    return {
      bottlenecks,
      criticalPath,
      recommendations
    };
  }

  async emergencyRecovery(errorState: ErrorState): Promise<RecoveryPlan> {
    const actions: RecoveryAction[] = [];
    let estimatedRecoveryTime = 0;

    switch (errorState.severity) {
      case 'critical':
        actions.push({
          type: 'restart',
          target: 'entire_system',
          parameters: { cleanShutdown: true }
        });
        estimatedRecoveryTime = 30000;
        break;

      case 'high':
        actions.push({
          type: 'fallback',
          target: 'failed_tasks',
          parameters: { 
            fallbackMethod: 'simple_http',
            reduceParallelism: true 
          }
        });
        estimatedRecoveryTime = 10000;
        break;

      case 'medium':
        actions.push({
          type: 'retry',
          target: 'failed_tasks',
          parameters: { 
            maxRetries: 2,
            backoffMultiplier: 1.5 
          }
        });
        estimatedRecoveryTime = 5000;
        break;

      case 'low':
        actions.push({
          type: 'skip',
          target: 'problematic_tasks',
          parameters: { logFailure: true }
        });
        estimatedRecoveryTime = 1000;
        break;
    }

    const fallbackExecution = await this.createFallbackStrategy(errorState);

    return {
      actions,
      estimatedRecoveryTime,
      fallbackExecution
    };
  }

  getSessionMetrics(sessionId: string): DecisionPerformanceMetrics | null {
    const session = this.activeSessions.get(sessionId);
    return session ? session.metrics : null;
  }

  getAllAlerts(sessionId: string): Alert[] {
    const session = this.activeSessions.get(sessionId);
    return session ? session.alerts : [];
  }

  async stopMonitoring(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      this.activeSessions.delete(sessionId);
      console.log(`Stopped monitoring session: ${sessionId}`);
    }
  }

  private initializeMetrics(): DecisionPerformanceMetrics {
    return {
      responseTime: 0,
      successRate: 100,
      dataQuality: 0,
      resourceUsage: {
        timeMs: 0,
        memoryMb: 0,
        cpuPercent: 0,
        networkRequests: 0
      },
      throughput: 0
    };
  }

  private schedulePeriodicChecks(session: MonitoringSession): void {
    const checkInterval = 5000;
    
    const interval = setInterval(() => {
      if (session.status !== 'active') {
        clearInterval(interval);
        return;
      }

      this.performPeriodicCheck(session);
    }, checkInterval);
  }

  private performPeriodicCheck(session: MonitoringSession): void {
    const alerts = this.checkAlertConditions(session.metrics);
    session.alerts.push(...alerts);

    const recentAlerts = alerts.filter(alert => 
      Date.now() - alert.timestamp < 30000
    );

    if (recentAlerts.length > 5) {
      session.status = 'paused';
      console.warn(`Session ${session.id} paused due to excessive alerts`);
    }
  }

  private checkAlertConditions(metrics: DecisionPerformanceMetrics): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    if (metrics.responseTime > this.alertThresholds.responseTimeError) {
      alerts.push({
        type: 'error',
        message: `Critical response time: ${metrics.responseTime}ms`,
        timestamp: now,
        severity: 90
      });
    } else if (metrics.responseTime > this.alertThresholds.responseTimeWarning) {
      alerts.push({
        type: 'warning',
        message: `High response time: ${metrics.responseTime}ms`,
        timestamp: now,
        severity: 60
      });
    }

    if (metrics.successRate < this.alertThresholds.successRateError) {
      alerts.push({
        type: 'error',
        message: `Critical success rate: ${metrics.successRate}%`,
        timestamp: now,
        severity: 95
      });
    } else if (metrics.successRate < this.alertThresholds.successRateWarning) {
      alerts.push({
        type: 'warning',
        message: `Low success rate: ${metrics.successRate}%`,
        timestamp: now,
        severity: 70
      });
    }

    if (metrics.resourceUsage.memoryMb > this.alertThresholds.memoryError) {
      alerts.push({
        type: 'error',
        message: `Critical memory usage: ${metrics.resourceUsage.memoryMb}MB`,
        timestamp: now,
        severity: 85
      });
    } else if (metrics.resourceUsage.memoryMb > this.alertThresholds.memoryWarning) {
      alerts.push({
        type: 'warning',
        message: `High memory usage: ${metrics.resourceUsage.memoryMb}MB`,
        timestamp: now,
        severity: 65
      });
    }

    return alerts;
  }

  private async handleCriticalAlerts(session: MonitoringSession, alerts: Alert[]): Promise<void> {
    const criticalAlerts = alerts.filter(alert => alert.severity > 80);
    
    if (criticalAlerts.length > 0) {
      console.error(`Critical alerts in session ${session.id}:`, criticalAlerts);
      
      const errorState: ErrorState = {
        errorType: 'performance_degradation',
        affectedTasks: [session.execution.id],
        severity: 'high',
        timestamp: Date.now()
      };

      const recoveryPlan = await this.emergencyRecovery(errorState);
      console.log('Emergency recovery plan created:', recoveryPlan);
    }
  }

  private calculateSeverity(value: number, warningThreshold: number, errorThreshold: number): number {
    if (value >= errorThreshold) return 90;
    if (value >= warningThreshold) {
      const ratio = (value - warningThreshold) / (errorThreshold - warningThreshold);
      return 50 + (ratio * 40);
    }
    return 10;
  }

  private identifyCriticalPath(bottlenecks: Bottleneck[]): string[] {
    return bottlenecks
      .filter(bottleneck => bottleneck.severity > 70)
      .sort((a, b) => b.severity - a.severity)
      .map(bottleneck => bottleneck.taskId);
  }

  private async createFallbackStrategy(errorState: ErrorState): Promise<any> {
    return {
      simplified: true,
      reducedParallelism: true,
      conservativeTimeouts: true,
      onlyEssentialTasks: true
    };
  }
}

export class AdaptiveManager {
  private successPatterns: Map<string, any> = new Map();
  private failureAnalysis: Map<string, any> = new Map();

  learnFromSuccess(execution: any): any {
    const pattern = this.extractSuccessPattern(execution);
    const existingPattern = this.successPatterns.get(pattern.signature);
    
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.averageQuality = 
        (existingPattern.averageQuality + pattern.quality) / 2;
    } else {
      this.successPatterns.set(pattern.signature, {
        ...pattern,
        frequency: 1,
        firstObserved: Date.now()
      });
    }

    return {
      newInsights: [`Success pattern identified: ${pattern.signature}`],
      updatedStrategies: [],
      confidenceChanges: new Map([[pattern.signature, 0.1]])
    };
  }

  analyzeFailures(failures: any[]): any {
    const commonPatterns = this.identifyFailurePatterns(failures);
    const preventionStrategies = this.developPreventionStrategies(commonPatterns);
    const recoveryMethods = this.identifyRecoveryMethods(failures);

    return {
      commonFailures: commonPatterns,
      preventionStrategies,
      recoveryMethods
    };
  }

  evolveBestPractices(history: any): any {
    const currentPractices = this.getCurrentBestPractices();
    const newPractices = this.identifyNewBestPractices(history);
    const deprecatedPractices = this.identifyDeprecatedPractices(history);

    return {
      practices: [...currentPractices, ...newPractices],
      deprecatedPractices,
      newRecommendations: this.generateRecommendations(newPractices)
    };
  }

  private extractSuccessPattern(execution: any): any {
    return {
      signature: `${execution.method}_${execution.siteType}_${execution.timeRange}`,
      quality: execution.qualityAchieved || 75,
      efficiency: execution.efficiency || 80,
      factors: this.identifySuccessFactors(execution)
    };
  }

  private identifySuccessFactors(execution: any): string[] {
    const factors: string[] = [];
    
    if (execution.responseTime < 3000) factors.push('fast_response');
    if (execution.qualityAchieved > 80) factors.push('high_quality');
    if (execution.resourceEfficiency > 85) factors.push('efficient_resource_use');
    
    return factors;
  }

  private identifyFailurePatterns(failures: any[]): string[] {
    const patterns = new Map<string, number>();
    
    for (const failure of failures) {
      const pattern = failure.errorType || 'unknown_error';
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    return Array.from(patterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private developPreventionStrategies(patterns: string[]): string[] {
    const strategies: string[] = [];
    
    for (const pattern of patterns) {
      switch (pattern) {
        case 'timeout_error':
          strategies.push('Implement adaptive timeout based on site performance');
          break;
        case 'memory_error':
          strategies.push('Add memory monitoring and cleanup routines');
          break;
        case 'network_error':
          strategies.push('Implement retry with exponential backoff');
          break;
        default:
          strategies.push(`Investigate and mitigate ${pattern} occurrences`);
      }
    }
    
    return strategies;
  }

  private identifyRecoveryMethods(failures: any[]): string[] {
    return [
      'Automatic fallback to simpler collection methods',
      'Dynamic resource reallocation',
      'Graceful degradation with partial results',
      'Emergency shutdown with state preservation'
    ];
  }

  private getCurrentBestPractices(): any[] {
    return [
      {
        practice: 'Profile sites before collection',
        applicableScenarios: ['new_sites', 'quality_issues'],
        expectedBenefit: 'Improved success rate and resource efficiency',
        implementation: 'Use SiteProfiler before collection attempts'
      }
    ];
  }

  private identifyNewBestPractices(history: any): any[] {
    return [];
  }

  private identifyDeprecatedPractices(history: any): string[] {
    return [];
  }

  private generateRecommendations(practices: any[]): string[] {
    return practices.map(practice => 
      `Consider implementing: ${practice.practice}`
    );
  }
}