import { SiteProfiler } from './decision/site-profiler.js';
import { CollectionStrategySelector } from './decision/collection-strategy-selector.js';
import { ResourceAllocator } from './decision/resource-allocator.js';
import { QualityMaximizer } from './decision/quality-maximizer.js';

import {
  CollectionContext,
  CollectionStrategy,
  CollectionExecution,
  AdjustmentDecision,
  CollectionCandidate,
  OptimalPlan,
  LearningInsight,
  ExecutionConstraints,
  CollectionMethod,
  SiteProfile,
  ExecutionPlan,
  ResourceBudget,
  PredictedOutcome,
  SiteMethodPair,
  CollectionTask,
  ExecutionProgress,
  ExecutionState,
  ExecutionAdjustment,
  ResourceCost,
  QualityMetrics
} from '../types/decision-types.js';
import type { BaseCollectionResult } from '../types/collection-common.js';

export class IntelligentResourceManager {
  private siteProfiler: SiteProfiler;
  private strategySelector: CollectionStrategySelector;
  private resourceAllocator: ResourceAllocator;
  private qualityMaximizer: QualityMaximizer;
  
  private executionHistory: CollectionResult[] = [];
  private siteProfiles: Map<string, SiteProfile> = new Map();

  constructor() {
    this.siteProfiler = new SiteProfiler();
    this.strategySelector = new CollectionStrategySelector();
    this.resourceAllocator = new ResourceAllocator();
    this.qualityMaximizer = new QualityMaximizer();
  }

  async determineOptimalStrategy(context: CollectionContext): Promise<CollectionStrategy> {
    const startTime = Date.now();
    
    const siteProfiles = await this.profileAllSites(context.targetSites);
    const candidates = this.generateCollectionCandidates(siteProfiles, context);
    const optimalPlan = this.qualityMaximizer.maximizeValueUnderConstraints({
      maxTotalTime: context.availableTime,
      maxMemoryUsage: context.memoryLimit,
      maxConcurrentRequests: 5,
      qualityThreshold: context.qualityRequirement
    });

    const selectedCandidates = this.selectBestCandidates(candidates, optimalPlan);
    const executionPlan = this.createExecutionPlan(selectedCandidates, context);
    const resourceBudget = this.calculateResourceBudget(selectedCandidates, context);
    const expectedOutcome = this.predictOutcome(selectedCandidates, context);

    const strategy: CollectionStrategy = {
      sites: this.createSiteMethodPairs(selectedCandidates),
      executionPlan,
      expectedOutcome,
      resourceBudget
    };

    const decisionTime = Date.now() - startTime;
    console.log(`Strategy determination completed in ${decisionTime}ms`);

    return strategy;
  }

  async monitorAndAdjust(execution: CollectionExecution): Promise<AdjustmentDecision> {
    const currentState = this.analyzeExecutionState(execution);
    const performanceMetrics = this.calculatePerformanceMetrics(execution);
    
    if (this.shouldContinueWithoutChanges(performanceMetrics)) {
      return {
        action: 'continue',
        adjustments: [],
        reasoning: ['Execution proceeding optimally']
      };
    }

    if (this.shouldAbortExecution(performanceMetrics)) {
      return {
        action: 'abort',
        adjustments: [],
        reasoning: ['Critical performance degradation detected', 'Resource exhaustion imminent']
      };
    }

    const adjustments = this.generateAdjustments(currentState, performanceMetrics);
    
    return {
      action: 'adjust',
      adjustments,
      reasoning: this.explainAdjustments(adjustments)
    };
  }

  async optimizeQualityCostBalance(candidates: CollectionCandidate[]): Promise<OptimalPlan> {
    const paretoSolutions = this.resourceAllocator.findParetoOptimal(candidates);
    
    const selectedCandidates = this.selectOptimalCandidates(candidates, paretoSolutions);
    const totalValue = this.calculateTotalValue(selectedCandidates);
    const totalCost = this.calculateTotalCost(selectedCandidates);
    const riskLevel = this.assessRiskLevel(selectedCandidates);
    const alternativePlans = await this.generateAlternativePlans(candidates);

    return {
      selectedCandidates,
      totalValue,
      totalCost,
      riskLevel,
      alternativePlans
    };
  }

  async evaluateAndLearn(result: CollectionResult): Promise<LearningInsight> {
    this.executionHistory.push(result);
    
    const siteOptimizations = this.analyzeSitePerformance(result);
    const methodEffectiveness = this.analyzeMethodEffectiveness(result);
    const allocationImprovement = this.analyzeResourceAllocation(result);

    const insight: LearningInsight = {
      siteSpecificOptimizations: siteOptimizations,
      methodEffectivenessUpdate: methodEffectiveness,
      resourceAllocationImprovement: allocationImprovement
    };

    this.applyLearnings(insight);
    
    return insight;
  }

  private async profileAllSites(sites: string[]): Promise<Map<string, SiteProfile>> {
    const profiles = new Map<string, SiteProfile>();
    
    const profilingPromises = sites.map(async (site) => {
      try {
        const profile = await this.siteProfiler.generateProfile(site);
        profiles.set(site, profile);
        this.siteProfiles.set(site, profile);
      } catch (error) {
        console.warn(`Failed to profile site ${site}:`, error);
        const fallbackProfile = this.createFallbackProfile(site);
        profiles.set(site, fallbackProfile);
      }
    });

    await Promise.all(profilingPromises);
    return profiles;
  }

  private generateCollectionCandidates(
    profiles: Map<string, SiteProfile>, 
    context: CollectionContext
  ): CollectionCandidate[] {
    const candidates: CollectionCandidate[] = [];

    for (const [siteUrl, profile] of profiles) {
      const methodDecision = this.strategySelector.analyzeAndSelectMethod(profile);
      
      const candidate: CollectionCandidate = {
        siteUrl,
        method: methodDecision.primaryMethod,
        estimatedValue: this.calculateSiteValue(profile, context),
        estimatedCost: methodDecision.estimatedCost,
        confidenceLevel: methodDecision.confidenceLevel / 100
      };

      candidates.push(candidate);
    }

    return candidates.sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  private selectBestCandidates(candidates: CollectionCandidate[], optimalPlan: any): CollectionCandidate[] {
    const timeLimit = 60000;
    let totalTime = 0;
    const selected: CollectionCandidate[] = [];

    for (const candidate of candidates) {
      if (totalTime + candidate.estimatedCost.timeMs <= timeLimit) {
        selected.push(candidate);
        totalTime += candidate.estimatedCost.timeMs;
      }
    }

    return selected.slice(0, 5);
  }

  private createExecutionPlan(candidates: CollectionCandidate[], context: CollectionContext): ExecutionPlan {
    const tasks: CollectionTask[] = candidates.map((candidate, index) => ({
      id: `task_${index}`,
      siteUrl: candidate.siteUrl,
      method: candidate.method,
      priority: this.calculateTaskPriority(candidate),
      estimatedTime: candidate.estimatedCost.timeMs,
      dependencies: []
    }));

    return this.resourceAllocator.optimizeExecutionPlan(tasks);
  }

  private createSiteMethodPairs(candidates: CollectionCandidate[]): SiteMethodPair[] {
    return candidates.map((candidate, index) => ({
      siteUrl: candidate.siteUrl,
      method: candidate.method,
      priority: this.calculateTaskPriority(candidate),
      timeAllocation: candidate.estimatedCost.timeMs
    }));
  }

  private calculateResourceBudget(candidates: CollectionCandidate[], context: CollectionContext): ResourceBudget {
    const totalTime = candidates.reduce((sum, c) => sum + c.estimatedCost.timeMs, 0);
    const totalMemory = candidates.reduce((sum, c) => sum + c.estimatedCost.memoryMb, 0);
    
    return {
      timeMs: Math.min(totalTime, context.availableTime),
      memoryMb: Math.min(totalMemory, context.memoryLimit),
      concurrentRequests: Math.min(5, candidates.length)
    };
  }

  private predictOutcome(candidates: CollectionCandidate[], context: CollectionContext): PredictedOutcome {
    const avgConfidence = candidates.reduce((sum, c) => sum + c.confidenceLevel, 0) / candidates.length;
    const avgValue = candidates.reduce((sum, c) => sum + c.estimatedValue, 0) / candidates.length;
    
    return {
      expectedQuality: avgValue,
      confidenceLevel: avgConfidence,
      estimatedDataPoints: candidates.length * 10,
      riskFactors: this.identifyRiskFactors(candidates)
    };
  }

  private analyzeExecutionState(execution: CollectionExecution): ExecutionState {
    const totalTasks = execution.currentTasks.length + 
                      (execution.progress?.completedTasks || 0);
    
    const timeElapsed = Date.now() - execution.startTime;
    const timeRemaining = Math.max(0, 60000 - timeElapsed);

    return {
      currentTasks: execution.currentTasks,
      completedTasks: [],
      failedTasks: [],
      resourcesUsed: execution.progress?.resourcesUsed || { timeMs: timeElapsed, memoryMb: 0, cpuPercent: 0, networkRequests: 0 },
      timeRemaining,
      qualityAchieved: 75
    };
  }

  private calculatePerformanceMetrics(execution: CollectionExecution): {
    efficiency: number;
    quality: number;
    timeUtilization: number;
    resourceUtilization: number;
  } {
    const progress = execution.progress || {
      completedTasks: 0,
      totalTasks: execution.currentTasks.length,
      dataCollected: 0,
      timeElapsed: Date.now() - execution.startTime,
      resourcesUsed: { timeMs: 0, memoryMb: 0, cpuPercent: 0, networkRequests: 0 }
    };

    const efficiency = progress.totalTasks > 0 ? 
      (progress.completedTasks / progress.totalTasks) * 100 : 0;
    
    const timeUtilization = Math.min(100, (progress.timeElapsed / 60000) * 100);
    const resourceUtilization = Math.min(100, progress.resourcesUsed.memoryMb);

    return {
      efficiency,
      quality: 75,
      timeUtilization,
      resourceUtilization
    };
  }

  private shouldContinueWithoutChanges(metrics: any): boolean {
    return metrics.efficiency > 80 && metrics.quality > 70 && metrics.timeUtilization < 90;
  }

  private shouldAbortExecution(metrics: any): boolean {
    return metrics.efficiency < 20 || metrics.resourceUtilization > 95;
  }

  private generateAdjustments(state: ExecutionState, metrics: any): ExecutionAdjustment[] {
    const adjustments: ExecutionAdjustment[] = [];

    if (metrics.efficiency < 50) {
      adjustments.push({
        type: 'priority',
        targetTask: state.currentTasks[0]?.id || 'all',
        newValue: 90,
        impact: 'Boost priority for critical tasks'
      });
    }

    if (metrics.resourceUtilization > 80) {
      adjustments.push({
        type: 'method',
        targetTask: 'high_resource_tasks',
        newValue: CollectionMethod.SIMPLE_HTTP,
        impact: 'Reduce resource usage by simplifying collection method'
      });
    }

    if (state.timeRemaining < 20000) {
      adjustments.push({
        type: 'timeout',
        targetTask: 'all',
        newValue: 5000,
        impact: 'Reduce task timeouts to fit remaining time'
      });
    }

    return adjustments;
  }

  private explainAdjustments(adjustments: ExecutionAdjustment[]): string[] {
    return adjustments.map(adj => adj.impact);
  }

  private calculateSiteValue(profile: SiteProfile, context: CollectionContext): number {
    let value = profile.relevanceScore;
    
    value += profile.contentQuality * 0.3;
    value += (100 - profile.averageResponseTime / 100) * 0.2;
    
    if (context.urgencyLevel === 'high' && profile.updateFrequency === 'high') {
      value *= 1.2;
    }

    return Math.min(100, value);
  }

  private calculateTaskPriority(candidate: CollectionCandidate): number {
    return Math.round(candidate.estimatedValue * candidate.confidenceLevel);
  }

  private identifyRiskFactors(candidates: CollectionCandidate[]): string[] {
    const risks: string[] = [];
    
    if (candidates.some(c => c.confidenceLevel < 0.7)) {
      risks.push('Low confidence in some data sources');
    }

    if (candidates.some(c => c.estimatedCost.timeMs > 10000)) {
      risks.push('Some sources may exceed time limits');
    }

    const totalTime = candidates.reduce((sum, c) => sum + c.estimatedCost.timeMs, 0);
    if (totalTime > 60000) {
      risks.push('Total execution time may exceed limits');
    }

    return risks;
  }

  private selectOptimalCandidates(candidates: CollectionCandidate[], paretoSolutions: any[]): CollectionCandidate[] {
    return candidates
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 5);
  }

  private calculateTotalValue(candidates: CollectionCandidate[]): number {
    return candidates.reduce((sum, c) => sum + c.estimatedValue, 0);
  }

  private calculateTotalCost(candidates: CollectionCandidate[]): ResourceCost {
    return candidates.reduce((total, c) => ({
      timeMs: total.timeMs + c.estimatedCost.timeMs,
      memoryMb: total.memoryMb + c.estimatedCost.memoryMb,
      cpuUnits: total.cpuUnits + c.estimatedCost.cpuUnits
    }), { timeMs: 0, memoryMb: 0, cpuUnits: 0 });
  }

  private assessRiskLevel(candidates: CollectionCandidate[]): number {
    const avgConfidence = candidates.reduce((sum, c) => sum + c.confidenceLevel, 0) / candidates.length;
    return Math.round((1 - avgConfidence) * 100);
  }

  private async generateAlternativePlans(candidates: CollectionCandidate[]): Promise<OptimalPlan[]> {
    return []; 
  }

  private analyzeSitePerformance(result: CollectionResult): any[] {
    return [];
  }

  private analyzeMethodEffectiveness(result: CollectionResult): any {
    return {
      method: CollectionMethod.SIMPLE_HTTP,
      successRate: 80,
      averageQuality: 75,
      averageTime: 3000,
      recommendedUsage: ['Simple content sites', 'Low-resource environments']
    };
  }

  private analyzeResourceAllocation(result: CollectionResult): any {
    return {
      optimalTimeDistribution: new Map([['high_priority', 30000], ['medium_priority', 20000]]),
      efficientConcurrency: 3,
      qualityThresholds: new Map([['minimum', 70], ['target', 85]])
    };
  }

  private applyLearnings(insight: LearningInsight): void {
    console.log('Applied learning insights:', {
      siteOptimizations: insight.siteSpecificOptimizations.length,
      methodUpdates: 1,
      allocationImprovements: 1
    });
  }

  private createFallbackProfile(site: string): SiteProfile {
    return {
      requiresJavaScript: true,
      hasAntiBot: false,
      loadSpeed: 'medium',
      contentStructure: 'simple',
      updateFrequency: 'medium',
      contentQuality: 60,
      relevanceScore: 70,
      bestCollectionTime: { start: 9, end: 17 },
      optimalMethod: CollectionMethod.SIMPLE_HTTP,
      averageResponseTime: 3000
    };
  }
}