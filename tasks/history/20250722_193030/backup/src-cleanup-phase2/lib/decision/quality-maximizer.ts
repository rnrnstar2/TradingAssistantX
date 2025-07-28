import {
  ExecutionConstraints,
  OptimizationPlan,
  FilteredSources,
  ConditionalSource,
  QualityMetrics,
  ImprovementPlan,
  QualityEnhancement,
  ResourceOptimization,
  MethodUpgrade,
  CollectionMethod,
  ResourceCost,
  CollectionCandidate,
  QualityScore,
  CollectionContext,
  ResourceAllocation,
  QualityTargets,
  FallbackStrategy
} from '../../types/decision-types.js';

// DataSource型定義
interface DataSource {
  url: string;
  qualityHistory: number[];
  reliabilityScore: number;
  lastUpdated: number;
  method: CollectionMethod;
}

export class QualityMaximizer {
  private qualityThresholds = {
    minimum: 60,
    acceptable: 75,
    excellent: 90
  };

  maximizeValueUnderConstraints(constraints: ExecutionConstraints): OptimizationPlan {
    const taskPriorities = this.calculateOptimalPriorities(constraints);
    const resourceAllocation = this.optimizeResourceAllocation(constraints);
    const qualityTargets = this.setQualityTargets(constraints);
    const fallbackStrategies = this.createFallbackStrategies(constraints);

    return {
      taskPriorities,
      resourceAllocation,
      qualityTargets,
      fallbackStrategies
    };
  }

  filterLowQualitySources(sources: DataSource[]): FilteredSources {
    const approved: string[] = [];
    const rejected: string[] = [];
    const conditional: ConditionalSource[] = [];

    for (const source of sources) {
      const qualityScore = this.calculateSourceQualityScore(source);
      
      if (qualityScore >= this.qualityThresholds.excellent) {
        approved.push(source.url);
      } else if (qualityScore < this.qualityThresholds.minimum) {
        rejected.push(source.url);
      } else {
        const conditions = this.generateSourceConditions(source, qualityScore);
        const fallbackMethod = this.suggestFallbackMethod(source);
        
        conditional.push({
          siteUrl: source.url,
          conditions,
          fallbackMethod
        });
      }
    }

    return { approved, rejected, conditional };
  }

  suggestQualityImprovements(currentQuality: QualityMetrics): ImprovementPlan {
    const qualityEnhancements = this.identifyQualityEnhancements(currentQuality);
    const resourceOptimizations = this.identifyResourceOptimizations(currentQuality);
    const methodUpgrades = this.identifyMethodUpgrades(currentQuality);

    return {
      qualityEnhancements,
      resourceOptimizations,
      methodUpgrades
    };
  }

  private calculateOptimalPriorities(constraints: ExecutionConstraints): Map<string, number> {
    const priorities = new Map<string, number>();

    const highValueSites = [
      'minkabu.jp',
      'zai.diamond.jp',
      'traderswebfx.jp'
    ];

    const mediumValueSites = [
      'investing.com',
      'marketwatch.com'
    ];

    highValueSites.forEach((site, index) => {
      const priority = 90 - (index * 5);
      priorities.set(site, Math.max(priority, 75));
    });

    mediumValueSites.forEach((site, index) => {
      const priority = 70 - (index * 5);
      priorities.set(site, Math.max(priority, 60));
    });

    if (constraints.qualityThreshold > 80) {
      priorities.forEach((value, key) => {
        if (value > 80) {
          priorities.set(key, Math.min(100, value + 10));
        }
      });
    }

    return priorities;
  }

  private optimizeResourceAllocation(constraints: ExecutionConstraints): ResourceAllocation {
    const totalTime = constraints.maxTotalTime;
    const totalMemory = constraints.maxMemoryUsage;
    const totalConcurrency = constraints.maxConcurrentRequests;

    const timeDistribution = new Map<string, number>([
      ['high_quality_sources', totalTime * 0.6],
      ['medium_quality_sources', totalTime * 0.25],
      ['experimental_sources', totalTime * 0.15]
    ]);

    const memoryDistribution = new Map<string, number>([
      ['simple_collection', totalMemory * 0.3],
      ['hybrid_collection', totalMemory * 0.4],
      ['advanced_collection', totalMemory * 0.3]
    ]);

    const concurrencyLimits = new Map<string, number>([
      ['simple_http', Math.floor(totalConcurrency * 0.5)],
      ['hybrid', Math.floor(totalConcurrency * 0.3)],
      ['playwright', Math.floor(totalConcurrency * 0.2)]
    ]);

    return {
      timeDistribution,
      memoryDistribution,
      concurrencyLimits
    };
  }

  private setQualityTargets(constraints: ExecutionConstraints): QualityTargets {
    const baseMinimum = constraints.qualityThreshold;
    const target = Math.min(95, baseMinimum + 20);
    const maximum = 95;

    return {
      minimum: baseMinimum,
      target,
      maximum
    };
  }

  private createFallbackStrategies(constraints: ExecutionConstraints): FallbackStrategy[] {
    const strategies: FallbackStrategy[] = [];

    if (constraints.qualityThreshold > 70) {
      strategies.push({
        trigger: 'quality_degradation',
        action: 'upgrade_collection_method',
        alternativeMethod: CollectionMethod.HYBRID,
        resourceAdjustment: { timeMs: 2000, memoryMb: 30, cpuUnits: 2 }
      });
    }

    strategies.push({
      trigger: 'resource_exhaustion',
      action: 'prioritize_critical_sources',
      alternativeMethod: CollectionMethod.SIMPLE_HTTP,
      resourceAdjustment: { timeMs: -1000, memoryMb: -20, cpuUnits: -1 }
    });

    strategies.push({
      trigger: 'time_pressure',
      action: 'focus_on_proven_sources',
      alternativeMethod: CollectionMethod.API_PREFERRED,
      resourceAdjustment: { timeMs: -2000, memoryMb: -10, cpuUnits: 0 }
    });

    return strategies;
  }

  private calculateSourceQualityScore(source: DataSource): number {
    if (source.qualityHistory.length === 0) {
      return this.estimateQualityFromUrl(source.url);
    }

    const recentQuality = source.qualityHistory.slice(-5);
    const averageQuality = recentQuality.reduce((sum, q) => sum + q, 0) / recentQuality.length;
    
    const reliabilityBonus = source.reliabilityScore > 80 ? 10 : 0;
    const recencyBonus = this.calculateRecencyBonus(source.lastUpdated);
    
    return Math.min(100, averageQuality + reliabilityBonus + recencyBonus);
  }

  private estimateQualityFromUrl(url: string): number {
    const highQualityIndicators = [
      'minkabu.jp',
      'zai.diamond.jp',
      'traderswebfx.jp'
    ];

    const mediumQualityIndicators = [
      'investing.com',
      'marketwatch.com',
      'bloomberg.com'
    ];

    if (highQualityIndicators.some(indicator => url.includes(indicator))) {
      return 85;
    }

    if (mediumQualityIndicators.some(indicator => url.includes(indicator))) {
      return 70;
    }

    if (url.includes('news') || url.includes('market')) {
      return 65;
    }

    return 50;
  }

  private calculateRecencyBonus(lastUpdated: number): number {
    const now = Date.now();
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 1) return 15;
    if (hoursSinceUpdate < 6) return 10;
    if (hoursSinceUpdate < 24) return 5;
    return 0;
  }

  private generateSourceConditions(source: DataSource, qualityScore: number): string[] {
    const conditions: string[] = [];

    if (qualityScore < this.qualityThresholds.acceptable) {
      conditions.push('quality_monitoring_required');
    }

    if (source.reliabilityScore < 70) {
      conditions.push('reliability_check_required');
    }

    if (source.method === CollectionMethod.SIMPLE_HTTP && source.qualityHistory.some(q => q < 60)) {
      conditions.push('method_upgrade_recommended');
    }

    if (source.lastUpdated < Date.now() - (24 * 60 * 60 * 1000)) {
      conditions.push('freshness_verification_needed');
    }

    return conditions;
  }

  private suggestFallbackMethod(source: DataSource): CollectionMethod {
    if (source.method === CollectionMethod.SIMPLE_HTTP) {
      return CollectionMethod.HYBRID;
    }

    if (source.method === CollectionMethod.HYBRID) {
      return CollectionMethod.PLAYWRIGHT_STEALTH;
    }

    return CollectionMethod.SIMPLE_HTTP;
  }

  private identifyQualityEnhancements(currentQuality: QualityMetrics): QualityEnhancement[] {
    const enhancements: QualityEnhancement[] = [];

    if (currentQuality.accuracy < 80) {
      enhancements.push({
        target: 'accuracy',
        improvement: 'Implement data validation and cross-referencing',
        estimatedGain: 15,
        cost: { timeMs: 2000, memoryMb: 20, cpuUnits: 2 }
      });
    }

    if (currentQuality.completeness < 75) {
      enhancements.push({
        target: 'completeness',
        improvement: 'Add multiple source aggregation',
        estimatedGain: 20,
        cost: { timeMs: 3000, memoryMb: 30, cpuUnits: 3 }
      });
    }

    if (currentQuality.timeliness < 85) {
      enhancements.push({
        target: 'timeliness',
        improvement: 'Prioritize real-time sources and reduce delays',
        estimatedGain: 10,
        cost: { timeMs: 1000, memoryMb: 10, cpuUnits: 1 }
      });
    }

    if (currentQuality.consistency < 70) {
      enhancements.push({
        target: 'consistency',
        improvement: 'Standardize data formats and validation rules',
        estimatedGain: 25,
        cost: { timeMs: 4000, memoryMb: 25, cpuUnits: 2 }
      });
    }

    return enhancements;
  }

  private identifyResourceOptimizations(currentQuality: QualityMetrics): ResourceOptimization[] {
    const optimizations: ResourceOptimization[] = [];

    // overall プロパティの代わりに各メトリクスの平均を計算
    const overallQuality = (currentQuality.accuracy + currentQuality.completeness + 
                           currentQuality.timeliness + currentQuality.consistency + 
                           currentQuality.reliability) / 5;
    
    if (overallQuality < 70) {
      optimizations.push({
        resourceType: 'time',
        optimization: 'Eliminate low-value data collection tasks',
        estimatedSaving: 20
      });

      optimizations.push({
        resourceType: 'memory',
        optimization: 'Optimize data structures and caching strategies',
        estimatedSaving: 15
      });
    }

    if (currentQuality.reliability < 80) {
      optimizations.push({
        resourceType: 'cpu',
        optimization: 'Reduce retry attempts for unreliable sources',
        estimatedSaving: 10
      });
    }

    return optimizations;
  }

  private identifyMethodUpgrades(currentQuality: QualityMetrics): MethodUpgrade[] {
    const upgrades: MethodUpgrade[] = [];

    if (currentQuality.accuracy < 75) {
      upgrades.push({
        currentMethod: CollectionMethod.SIMPLE_HTTP,
        upgradedMethod: CollectionMethod.HYBRID,
        benefits: ['Better data extraction', 'Improved accuracy', 'JavaScript support'],
        migrationCost: { timeMs: 2000, memoryMb: 40, cpuUnits: 3 }
      });
    }

    if (currentQuality.completeness < 70) {
      upgrades.push({
        currentMethod: CollectionMethod.HYBRID,
        upgradedMethod: CollectionMethod.PLAYWRIGHT_STEALTH,
        benefits: ['Full page rendering', 'Complete data access', 'Anti-bot bypass'],
        migrationCost: { timeMs: 5000, memoryMb: 80, cpuUnits: 5 }
      });
    }

    return upgrades;
  }

  public assessCollectionQuality(
    candidates: CollectionCandidate[], 
    context: CollectionContext
  ): { 
    qualityScore: number, 
    recommendations: string[] 
  } {
    let totalQualityScore = 0;
    const recommendations: string[] = [];

    for (const candidate of candidates) {
      const siteQuality = this.estimateQualityFromUrl(candidate.siteUrl);
      const methodQuality = this.getMethodQualityMultiplier(candidate.method);
      const candidateScore = siteQuality * methodQuality * candidate.confidenceLevel;
      
      totalQualityScore += candidateScore;
    }

    const averageQuality = candidates.length > 0 ? totalQualityScore / candidates.length : 0;

    if (averageQuality < context.qualityRequirement) {
      recommendations.push('Consider upgrading collection methods for better quality');
      recommendations.push('Focus on high-quality sources first');
    }

    if (candidates.some(c => c.confidenceLevel < 0.7)) {
      recommendations.push('Some sources have low confidence - consider validation');
    }

    return {
      qualityScore: averageQuality,
      recommendations
    };
  }

  private getMethodQualityMultiplier(method: CollectionMethod): number {
    const multipliers = {
      [CollectionMethod.SIMPLE_HTTP]: 0.8,
      [CollectionMethod.HYBRID]: 0.9,
      [CollectionMethod.PLAYWRIGHT_STEALTH]: 1.0,
      [CollectionMethod.API_PREFERRED]: 1.1
    };

    return multipliers[method] || 0.8;
  }
}