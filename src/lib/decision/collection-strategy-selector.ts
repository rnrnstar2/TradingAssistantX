import {
  CollectionMethod,
  CollectionMethodDecision,
  CollectionContext,
  SiteProfile,
  PriorityPlan,
  CollectionTask,
  ExecutionState,
  StrategyAdjustment,
  ResourceCost,
  QualityScore,
  MethodDecision,
  FallbackPlan,
  MethodComparison,
  ComparisonMetrics,
  ExecutionContext
} from '../../types/decision-types.js';

export class CollectionStrategySelector {
  private methodSelector: MethodSelector;
  private siteProfiles: Map<string, SiteProfile> = new Map();

  constructor() {
    this.methodSelector = new MethodSelector();
  }

  analyzeAndSelectMethod(siteProfile: SiteProfile): CollectionMethodDecision {
    const primaryMethod = this.selectPrimaryMethod(siteProfile);
    const fallbackMethods = this.selectFallbackMethods(siteProfile, primaryMethod);
    const estimatedCost = this.calculateMethodCost(primaryMethod, siteProfile);
    const expectedQuality = this.calculateExpectedQuality(primaryMethod, siteProfile);
    const confidenceLevel = this.calculateConfidence(siteProfile, primaryMethod);

    return {
      primaryMethod,
      fallbackMethods,
      estimatedCost,
      expectedQuality,
      confidenceLevel
    };
  }

  prioritizeCollectionMethods(context: CollectionContext): PriorityPlan {
    const tasks = this.createCollectionTasks(context);
    
    const highPriority: CollectionTask[] = [];
    const mediumPriority: CollectionTask[] = [];
    const lowPriority: CollectionTask[] = [];

    for (const task of tasks) {
      const priority = this.calculateTaskPriority(task, context);
      
      if (priority > 80) {
        highPriority.push(task);
      } else if (priority > 50) {
        mediumPriority.push(task);
      } else {
        lowPriority.push(task);
      }
    }

    const executionOrder = this.determineExecutionOrder([
      ...highPriority,
      ...mediumPriority,
      ...lowPriority
    ], context);

    return {
      highPriority,
      mediumPriority,
      lowPriority,
      executionOrder
    };
  }

  adjustStrategyDynamically(currentState: ExecutionState): StrategyAdjustment {
    const analysis = this.analyzeCurrentPerformance(currentState);
    const adjustmentType = this.determineAdjustmentType(analysis);
    const affectedTasks = this.identifyAffectedTasks(currentState, adjustmentType);
    const newStrategy = this.createAdjustedStrategy(currentState, adjustmentType);
    const expectedImprovement = this.calculateExpectedImprovement(currentState, newStrategy);

    return {
      adjustmentType,
      affectedTasks,
      newStrategy,
      expectedImprovement
    };
  }

  private selectPrimaryMethod(profile: SiteProfile): CollectionMethod {
    const DECISION_CRITERIA = {
      timeConstrained: { quality_weight: 0.6, speed_weight: 0.4, min_quality_threshold: 70 },
      qualityFocused: { quality_weight: 0.8, speed_weight: 0.2, min_quality_threshold: 85 },
      balanced: { quality_weight: 0.7, speed_weight: 0.3, min_quality_threshold: 75 }
    };

    const criteria = DECISION_CRITERIA.balanced;

    if (profile.hasAntiBot) {
      return CollectionMethod.PLAYWRIGHT_STEALTH;
    }

    if (profile.requiresJavaScript && profile.contentStructure === 'dynamic') {
      return CollectionMethod.HYBRID;
    }

    if (profile.contentStructure === 'simple' && profile.loadSpeed === 'fast') {
      return CollectionMethod.SIMPLE_HTTP;
    }

    if (profile.contentQuality > criteria.min_quality_threshold && profile.loadSpeed !== 'slow') {
      return CollectionMethod.HYBRID;
    }

    return CollectionMethod.SIMPLE_HTTP;
  }

  private selectFallbackMethods(profile: SiteProfile, primaryMethod: CollectionMethod): CollectionMethod[] {
    const fallbacks: CollectionMethod[] = [];

    switch (primaryMethod) {
      case CollectionMethod.SIMPLE_HTTP:
        fallbacks.push(CollectionMethod.HYBRID, CollectionMethod.PLAYWRIGHT_STEALTH);
        break;
      case CollectionMethod.HYBRID:
        fallbacks.push(CollectionMethod.PLAYWRIGHT_STEALTH, CollectionMethod.SIMPLE_HTTP);
        break;
      case CollectionMethod.PLAYWRIGHT_STEALTH:
        fallbacks.push(CollectionMethod.HYBRID);
        break;
      case CollectionMethod.API_PREFERRED:
        fallbacks.push(CollectionMethod.SIMPLE_HTTP, CollectionMethod.HYBRID);
        break;
    }

    return fallbacks;
  }

  private calculateMethodCost(method: CollectionMethod, profile: SiteProfile): ResourceCost {
    const baseCosts = {
      [CollectionMethod.SIMPLE_HTTP]: { timeMs: 1000, memoryMb: 10, cpuUnits: 1 },
      [CollectionMethod.HYBRID]: { timeMs: 3000, memoryMb: 50, cpuUnits: 3 },
      [CollectionMethod.PLAYWRIGHT_STEALTH]: { timeMs: 8000, memoryMb: 100, cpuUnits: 5 },
      [CollectionMethod.API_PREFERRED]: { timeMs: 500, memoryMb: 5, cpuUnits: 1 }
    };

    const baseCost = baseCosts[method];
    const speedMultiplier = profile.loadSpeed === 'slow' ? 2 : profile.loadSpeed === 'medium' ? 1.5 : 1;

    return {
      timeMs: Math.round(baseCost.timeMs * speedMultiplier),
      memoryMb: Math.round(baseCost.memoryMb * (profile.contentStructure === 'complex' ? 1.5 : 1)),
      cpuUnits: Math.round(baseCost.cpuUnits * (profile.requiresJavaScript ? 1.5 : 1))
    };
  }

  private calculateExpectedQuality(method: CollectionMethod, profile: SiteProfile): QualityScore {
    const baseQuality = {
      [CollectionMethod.SIMPLE_HTTP]: { accuracy: 70, completeness: 60, timeliness: 90 },
      [CollectionMethod.HYBRID]: { accuracy: 85, completeness: 80, timeliness: 75 },
      [CollectionMethod.PLAYWRIGHT_STEALTH]: { accuracy: 95, completeness: 90, timeliness: 60 },
      [CollectionMethod.API_PREFERRED]: { accuracy: 90, completeness: 95, timeliness: 95 }
    };

    const base = baseQuality[method];
    
    const adjustments = {
      accuracy: profile.contentQuality > 80 ? 5 : profile.contentQuality < 50 ? -10 : 0,
      completeness: profile.contentStructure === 'simple' ? 10 : profile.contentStructure === 'complex' ? -5 : 0,
      timeliness: profile.updateFrequency === 'high' ? 10 : profile.updateFrequency === 'low' ? -5 : 0
    };

    const adjusted = {
      accuracy: Math.max(0, Math.min(100, base.accuracy + adjustments.accuracy)),
      completeness: Math.max(0, Math.min(100, base.completeness + adjustments.completeness)),
      timeliness: Math.max(0, Math.min(100, base.timeliness + adjustments.timeliness))
    };

    const overall = (adjusted.accuracy + adjusted.completeness + adjusted.timeliness) / 3;

    return { ...adjusted, overall };
  }

  private calculateConfidence(profile: SiteProfile, method: CollectionMethod): number {
    let confidence = 70;

    if (profile.relevanceScore > 80) confidence += 20;
    else if (profile.relevanceScore < 50) confidence -= 20;

    if (method === CollectionMethod.SIMPLE_HTTP && !profile.requiresJavaScript) confidence += 15;
    if (method === CollectionMethod.PLAYWRIGHT_STEALTH && profile.hasAntiBot) confidence += 10;
    if (method === profile.optimalMethod) confidence += 15;

    if (profile.loadSpeed === 'fast') confidence += 10;
    else if (profile.loadSpeed === 'slow') confidence -= 10;

    return Math.max(10, Math.min(95, confidence));
  }

  private createCollectionTasks(context: CollectionContext): CollectionTask[] {
    return context.targetSites.map((siteUrl, index) => ({
      id: `task_${index}`,
      siteUrl,
      method: CollectionMethod.SIMPLE_HTTP,
      priority: 50,
      estimatedTime: 3000,
      dependencies: []
    }));
  }

  private calculateTaskPriority(task: CollectionTask, context: CollectionContext): number {
    let priority = 50;

    if (task.siteUrl.includes('minkabu') || task.siteUrl.includes('zai')) {
      priority += 30;
    }

    if (context.urgencyLevel === 'high') {
      priority += 20;
    } else if (context.urgencyLevel === 'low') {
      priority -= 10;
    }

    if (context.qualityRequirement > 80) {
      priority += 15;
    }

    return Math.max(0, Math.min(100, priority));
  }

  private determineExecutionOrder(tasks: CollectionTask[], context: CollectionContext): string[] {
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.estimatedTime - b.estimatedTime;
    });

    return sortedTasks.map(task => task.id);
  }

  private analyzeCurrentPerformance(state: ExecutionState): {
    overallPerformance: number;
    resourceEfficiency: number;
    qualityTrend: number;
    timeUtilization: number;
  } {
    const totalTasks = state.currentTasks.length + state.completedTasks.length + state.failedTasks.length;
    const completionRate = totalTasks > 0 ? state.completedTasks.length / totalTasks : 0;
    
    return {
      overallPerformance: completionRate * 100,
      resourceEfficiency: state.resourcesUsed.memoryMb < 100 ? 90 : 60,
      qualityTrend: state.qualityAchieved,
      timeUtilization: state.timeRemaining > 0 ? 80 : 50
    };
  }

  private determineAdjustmentType(analysis: any): 'method' | 'priority' | 'resource' | 'timing' {
    if (analysis.overallPerformance < 50) return 'method';
    if (analysis.resourceEfficiency < 60) return 'resource';
    if (analysis.timeUtilization < 60) return 'timing';
    return 'priority';
  }

  private identifyAffectedTasks(state: ExecutionState, adjustmentType: string): string[] {
    switch (adjustmentType) {
      case 'method':
        return state.failedTasks.map(task => task.id);
      case 'resource':
        return state.currentTasks.filter(task => task.estimatedTime > 5000).map(task => task.id);
      default:
        return state.currentTasks.slice(0, 2).map(task => task.id);
    }
  }

  private createAdjustedStrategy(state: ExecutionState, adjustmentType: string): any {
    return {
      adjustmentType,
      timestamp: Date.now(),
      reason: `Performance optimization: ${adjustmentType}`
    };
  }

  private calculateExpectedImprovement(state: ExecutionState, newStrategy: any): number {
    return Math.min(30, Math.max(5, 20 - (state.qualityAchieved / 10)));
  }
}

export class MethodSelector {
  selectMethod(site: SiteProfile, context: ExecutionContext): MethodDecision {
    const candidates = [
      CollectionMethod.SIMPLE_HTTP,
      CollectionMethod.HYBRID,
      CollectionMethod.PLAYWRIGHT_STEALTH
    ];

    let bestMethod = CollectionMethod.SIMPLE_HTTP;
    let maxScore = 0;
    const reasoning: string[] = [];

    for (const method of candidates) {
      const score = this.scoreMethod(method, site, context);
      if (score > maxScore) {
        maxScore = score;
        bestMethod = method;
      }
    }

    reasoning.push(`Selected ${bestMethod} with score ${maxScore}`);
    
    const fallbacks = candidates.filter(m => m !== bestMethod);
    const confidence = Math.min(95, Math.max(60, maxScore));

    return {
      selectedMethod: bestMethod,
      reasoning,
      confidence,
      fallbacks
    };
  }

  getFallbackStrategy(failedMethod: CollectionMethod): FallbackPlan {
    const fallbackMap = {
      [CollectionMethod.SIMPLE_HTTP]: [CollectionMethod.HYBRID, CollectionMethod.PLAYWRIGHT_STEALTH],
      [CollectionMethod.HYBRID]: [CollectionMethod.PLAYWRIGHT_STEALTH, CollectionMethod.SIMPLE_HTTP],
      [CollectionMethod.PLAYWRIGHT_STEALTH]: [CollectionMethod.HYBRID],
      [CollectionMethod.API_PREFERRED]: [CollectionMethod.SIMPLE_HTTP, CollectionMethod.HYBRID]
    };

    const fallbacks = fallbackMap[failedMethod] || [CollectionMethod.SIMPLE_HTTP];

    return {
      primaryFallback: fallbacks[0],
      secondaryFallbacks: fallbacks.slice(1),
      escalationThreshold: 3
    };
  }

  async compareMethodEffectiveness(siteUrl: string): Promise<MethodComparison> {
    const method1 = CollectionMethod.SIMPLE_HTTP;
    const method2 = CollectionMethod.HYBRID;

    const metrics: ComparisonMetrics = {
      qualityDifference: 15,
      speedDifference: -3000,
      reliabilityDifference: 10,
      overall: 12
    };

    const winner = metrics.overall > 0 ? method2 : method1;

    return {
      method1,
      method2,
      winner,
      metrics
    };
  }

  private scoreMethod(method: CollectionMethod, site: SiteProfile, context: ExecutionContext): number {
    let score = 50;

    switch (method) {
      case CollectionMethod.SIMPLE_HTTP:
        score += site.requiresJavaScript ? -20 : 15;
        score += site.hasAntiBot ? -30 : 10;
        score += site.loadSpeed === 'fast' ? 20 : site.loadSpeed === 'slow' ? -10 : 5;
        break;

      case CollectionMethod.HYBRID:
        score += site.requiresJavaScript ? 15 : -5;
        score += site.contentStructure === 'complex' ? 15 : 0;
        score += (context.qualityRequirements.accuracy + context.qualityRequirements.completeness + context.qualityRequirements.timeliness) / 3 > 80 ? 20 : 0;
        break;

      case CollectionMethod.PLAYWRIGHT_STEALTH:
        score += site.hasAntiBot ? 25 : -10;
        score += site.requiresJavaScript ? 20 : 0;
        score += context.timeConstraints.maxTotalTime < 10000 ? -20 : 10;
        break;
    }

    score += site.contentQuality > 80 ? 10 : site.contentQuality < 50 ? -10 : 0;
    score += site.relevanceScore > 80 ? 15 : site.relevanceScore < 50 ? -15 : 0;

    return Math.max(0, Math.min(100, score));
  }
}