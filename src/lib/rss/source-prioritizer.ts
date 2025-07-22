import {
  RssSource,
  PriorityWeight,
  PrioritizedSource,
  PriorityAdjustment,
  PerformanceMetrics,
  MarketCondition,
  EmergencyPriorityConfig,
  InformationValue,
  LearningResult,
  Pattern,
  ClaudeSourceAnalyzer,
  SourceAnalysis,
  CollectionResult,
  FeedItem,
} from '../../types/rss-collection-types';

export class SourcePrioritizer {
  private priorityWeights: Map<string, PriorityWeight> = new Map();
  private claudeAnalyzer: ClaudeSourceAnalyzer;
  private learningHistory: Map<string, PerformanceMetrics[]> = new Map();
  private emergencyConfig: EmergencyPriorityConfig | null = null;

  constructor() {
    this.claudeAnalyzer = new ClaudeSourceAnalyzerImpl();
    this.initializeDefaultWeights();
  }

  async claudeDrivenPrioritization(sources: RssSource[]): Promise<PrioritizedSource[]> {
    const analyses = await this.claudeAnalyzer.analyzeSources(sources);
    const prioritizedSources: PrioritizedSource[] = [];
    
    for (const analysis of analyses) {
      const source = sources.find(s => s.id === analysis.sourceId);
      if (!source) continue;

      const priority = this.calculateClaudeAdjustedPriority(analysis, source);
      const urgencyLevel = this.determineUrgencyLevel(analysis);
      
      prioritizedSources.push({
        source,
        priority,
        reasoning: analysis.reasoning,
        expectedValue: this.calculateExpectedValue(analysis),
        urgencyLevel,
        processingOrder: 0 // Will be set after sorting
      });
    }

    // Sort by priority and assign processing order
    prioritizedSources.sort((a, b) => b.priority - a.priority);
    prioritizedSources.forEach((source, index) => {
      source.processingOrder = index + 1;
    });

    return prioritizedSources;
  }

  async adjustPriorityDynamically(
    source: RssSource,
    recentPerformance: PerformanceMetrics
  ): Promise<PriorityAdjustment> {
    const currentWeight = this.priorityWeights.get(source.id);
    const oldPriority = source.priority;
    
    // Calculate adjustment factors
    const performanceFactor = this.calculatePerformanceFactor(recentPerformance);
    const timeFactor = this.calculateTimeFactor(recentPerformance.lastUpdateTime);
    const reliabilityFactor = this.calculateReliabilityFactor(recentPerformance);
    
    const adjustmentFactor = (performanceFactor + timeFactor + reliabilityFactor) / 3;
    const newPriority = Math.max(1, Math.min(10, Math.round(oldPriority * adjustmentFactor)));
    
    // Update source priority
    source.priority = newPriority;
    
    // Update priority weights
    if (currentWeight) {
      this.priorityWeights.set(source.id, {
        ...currentWeight,
        sourceReliability: recentPerformance.successRate,
        timeliness: timeFactor,
        contentQuality: recentPerformance.contentQualityScore
      });
    }

    const reason = this.generateAdjustmentReason(performanceFactor, timeFactor, reliabilityFactor);
    
    return {
      sourceId: source.id,
      oldPriority,
      newPriority,
      reason,
      adjustmentFactor,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
    };
  }

  async setEmergencyPriority(marketCondition: MarketCondition): Promise<EmergencyPriorityConfig> {
    const emergencyConfig: EmergencyPriorityConfig = {
      emergencySources: [],
      normalSources: [],
      emergencyRefreshRate: 30, // 30 seconds for emergency
      emergencyTimeout: 15,     // 15 seconds timeout
      alertThreshold: 0.8       // High threshold for emergency alerts
    };

    // Identify emergency sources based on market conditions
    for (const [sourceId, weight] of this.priorityWeights.entries()) {
      if (this.shouldPrioritizeForEmergency(weight, marketCondition)) {
        emergencyConfig.emergencySources.push(sourceId);
      } else {
        emergencyConfig.normalSources.push(sourceId);
      }
    }

    // Adjust refresh rates based on market volatility
    if (marketCondition.volatility === 'extreme') {
      emergencyConfig.emergencyRefreshRate = 15; // 15 seconds
      emergencyConfig.emergencyTimeout = 10;     // 10 seconds
    } else if (marketCondition.volatility === 'high') {
      emergencyConfig.emergencyRefreshRate = 20; // 20 seconds
      emergencyConfig.emergencyTimeout = 12;     // 12 seconds
    }

    this.emergencyConfig = emergencyConfig;
    return emergencyConfig;
  }

  calculateInformationValue(feedItem: FeedItem): InformationValue {
    const now = new Date();
    const publishTime = feedItem.publishedAt;
    
    // Calculate timeliness (fresher content = higher value)
    const ageMinutes = (now.getTime() - publishTime.getTime()) / (1000 * 60);
    const timeliness = Math.max(0, 1 - (ageMinutes / 60)); // Decreases over 1 hour
    
    // Calculate relevance based on content keywords
    const relevance = this.calculateContentRelevance(feedItem);
    
    // Calculate uniqueness (rough estimate based on title uniqueness)
    const uniqueness = this.estimateUniqueness(feedItem);
    
    // Calculate actionability (presence of actionable information)
    const actionability = this.assessActionability(feedItem);
    
    // Calculate credibility based on source
    const credibility = this.assessSourceCredibility(feedItem.sourceId);
    
    const factors = {
      timeliness: Math.round(timeliness * 100),
      relevance: Math.round(relevance * 100),
      uniqueness: Math.round(uniqueness * 100),
      actionability: Math.round(actionability * 100),
      credibility: Math.round(credibility * 100)
    };
    
    // Weighted average
    const score = Math.round(
      (timeliness * 0.25) +
      (relevance * 0.30) +
      (uniqueness * 0.15) +
      (actionability * 0.20) +
      (credibility * 0.10)
    ) * 100;

    return {
      score: Math.min(100, Math.max(0, score)),
      factors,
      explanation: `Score: ${score}/100. High relevance (${factors.relevance}%) and ${timeliness > 0.8 ? 'very recent' : 'recent'} content from ${credibility > 0.7 ? 'credible' : 'standard'} source.`
    };
  }

  async learnFromFeedbackResults(results: CollectionResult[]): Promise<LearningResult> {
    const adjustedSources: PriorityAdjustment[] = [];
    const newPatterns: Pattern[] = [];
    const improvementSuggestions: string[] = [];
    
    // Analyze results to learn patterns
    for (const result of results) {
      const metrics = this.calculateMetricsFromResult(result);
      
      // Update learning history
      const history = this.learningHistory.get(result.sourceId) || [];
      history.push(metrics);
      if (history.length > 50) history.shift(); // Keep last 50 records
      this.learningHistory.set(result.sourceId, history);
      
      // Check if priority adjustment is needed
      const source = await this.getSourceById(result.sourceId);
      if (source && this.shouldAdjustPriority(metrics, source)) {
        const adjustment = await this.adjustPriorityDynamically(source, metrics);
        adjustedSources.push(adjustment);
      }
    }

    // Identify patterns
    const patterns = this.identifyPerformancePatterns(results);
    newPatterns.push(...patterns);
    
    // Generate improvement suggestions
    const suggestions = this.generateImprovementSuggestions(results);
    improvementSuggestions.push(...suggestions);

    const confidenceLevel = this.calculateLearningConfidence(results.length);

    return {
      adjustedSources,
      newPatterns,
      improvementSuggestions,
      confidenceLevel
    };
  }

  private initializeDefaultWeights(): void {
    // Initialize with default weights that can be adjusted
    const defaultWeight: PriorityWeight = {
      relevanceScore: 0.8,
      timeliness: 0.9,
      sourceReliability: 0.7,
      contentQuality: 0.75,
      marketImpact: 0.6
    };

    // These would typically be loaded from configuration or database
    const defaultSources = ['reuters', 'bloomberg', 'forex-factory', 'investing-com'];
    defaultSources.forEach(sourceId => {
      this.priorityWeights.set(sourceId, { ...defaultWeight });
    });
  }

  private calculateClaudeAdjustedPriority(analysis: SourceAnalysis, source: RssSource): number {
    // Combine Claude analysis with current source priority
    const claudeScore = (
      analysis.qualityScore * 0.3 +
      analysis.relevanceScore * 0.4 +
      analysis.reliabilityScore * 0.3
    ) / 10; // Normalize to 0-1

    const currentPriorityNormalized = source.priority / 10;
    
    // Weighted combination (70% Claude, 30% current)
    const adjustedPriority = (claudeScore * 0.7) + (currentPriorityNormalized * 0.3);
    
    return Math.round(adjustedPriority * 10);
  }

  private determineUrgencyLevel(analysis: SourceAnalysis): 'low' | 'medium' | 'high' | 'emergency' {
    const averageScore = (analysis.qualityScore + analysis.relevanceScore + analysis.reliabilityScore) / 3;
    
    if (averageScore >= 9) return 'emergency';
    if (averageScore >= 7) return 'high';
    if (averageScore >= 5) return 'medium';
    return 'low';
  }

  private calculateExpectedValue(analysis: SourceAnalysis): number {
    // Expected value based on all metrics
    return Math.round(
      (analysis.qualityScore * 0.25) +
      (analysis.relevanceScore * 0.35) +
      (analysis.reliabilityScore * 0.25) +
      (analysis.recommendedPriority * 0.15)
    );
  }

  private calculatePerformanceFactor(metrics: PerformanceMetrics): number {
    // Factor based on recent performance (success rate and response time)
    const successFactor = metrics.successRate;
    const speedFactor = Math.max(0, 1 - (metrics.averageResponseTime / 10000)); // Penalize slow sources
    const qualityFactor = metrics.contentQualityScore;
    
    return (successFactor * 0.5) + (speedFactor * 0.3) + (qualityFactor * 0.2);
  }

  private calculateTimeFactor(lastUpdateTime: Date): number {
    const ageMinutes = (Date.now() - lastUpdateTime.getTime()) / (1000 * 60);
    
    // More recent updates get higher priority
    if (ageMinutes < 30) return 1.2;      // 20% boost for very recent
    if (ageMinutes < 60) return 1.1;      // 10% boost for recent
    if (ageMinutes < 120) return 1.0;     // Normal priority
    if (ageMinutes < 360) return 0.9;     // 10% penalty for old
    return 0.8;                           // 20% penalty for very old
  }

  private calculateReliabilityFactor(metrics: PerformanceMetrics): number {
    const errorRate = metrics.errorHistory.length / 100; // Assume last 100 attempts
    return Math.max(0.5, 1 - errorRate);
  }

  private generateAdjustmentReason(
    performanceFactor: number,
    timeFactor: number,
    reliabilityFactor: number
  ): string {
    const reasons = [];
    
    if (performanceFactor > 1.1) reasons.push('excellent recent performance');
    else if (performanceFactor < 0.9) reasons.push('poor recent performance');
    
    if (timeFactor > 1.1) reasons.push('very recent updates');
    else if (timeFactor < 0.9) reasons.push('outdated information');
    
    if (reliabilityFactor > 0.9) reasons.push('high reliability');
    else if (reliabilityFactor < 0.8) reasons.push('reliability concerns');
    
    return reasons.length > 0 
      ? `Adjusted due to: ${reasons.join(', ')}`
      : 'Standard adjustment based on metrics';
  }

  private shouldPrioritizeForEmergency(weight: PriorityWeight, condition: MarketCondition): boolean {
    // Prioritize sources with high market impact during volatile conditions
    if (condition.volatility === 'extreme' || condition.volatility === 'high') {
      return weight.marketImpact > 0.7 && weight.timeliness > 0.8;
    }
    
    // During breaking news
    if (condition.newsIntensity === 'breaking') {
      return weight.timeliness > 0.9 && weight.relevanceScore > 0.8;
    }
    
    return false;
  }

  private calculateContentRelevance(feedItem: FeedItem): number {
    const content = `${feedItem.title} ${feedItem.description || ''}`.toLowerCase();
    
    const fxKeywords = [
      'forex', 'fx', 'currency', 'exchange rate', 'trading', 'usd', 'eur', 'jpy',
      'central bank', 'fed', 'ecb', 'boj', 'interest rate', 'monetary policy'
    ];
    
    let matches = 0;
    fxKeywords.forEach(keyword => {
      if (content.includes(keyword)) matches++;
    });
    
    return Math.min(1, matches / 10); // Normalize to 0-1
  }

  private estimateUniqueness(feedItem: FeedItem): number {
    // Simple uniqueness estimate - would be improved with similarity checking
    const titleWords = feedItem.title.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(titleWords).size;
    
    return Math.min(1, uniqueWords / titleWords.length);
  }

  private assessActionability(feedItem: FeedItem): number {
    const content = `${feedItem.title} ${feedItem.description || ''}`.toLowerCase();
    
    const actionWords = [
      'buy', 'sell', 'target', 'resistance', 'support', 'breakout',
      'signal', 'recommendation', 'forecast', 'prediction'
    ];
    
    let actionScore = 0;
    actionWords.forEach(word => {
      if (content.includes(word)) actionScore += 0.1;
    });
    
    return Math.min(1, actionScore);
  }

  private assessSourceCredibility(sourceId: string): number {
    const weights = this.priorityWeights.get(sourceId);
    return weights?.sourceReliability || 0.7; // Default credibility
  }

  private calculateMetricsFromResult(result: CollectionResult): PerformanceMetrics {
    return {
      averageResponseTime: result.processingTime,
      successRate: result.status === 'success' ? 1.0 : 0.0,
      contentQualityScore: result.metadata.qualityScore,
      relevanceScore: 0.8, // Would be calculated from content analysis
      lastUpdateTime: result.timestamp,
      errorHistory: result.status === 'failure' ? [new Error(result.errorMessage || 'Unknown error')] : []
    };
  }

  private async getSourceById(sourceId: string): Promise<RssSource | null> {
    // This would typically fetch from database or configuration
    // For now, return null
    return null;
  }

  private shouldAdjustPriority(metrics: PerformanceMetrics, source: RssSource): boolean {
    // Adjust if significant performance change
    return metrics.successRate < 0.7 || 
           metrics.averageResponseTime > 10000 || 
           metrics.contentQualityScore < 0.5;
  }

  private identifyPerformancePatterns(results: CollectionResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Identify time-based patterns
    const hourlyPerformance = new Map<number, number>();
    results.forEach(result => {
      const hour = result.timestamp.getHours();
      const current = hourlyPerformance.get(hour) || 0;
      hourlyPerformance.set(hour, current + (result.status === 'success' ? 1 : 0));
    });
    
    // Find peak performance hours
    const peakHours = Array.from(hourlyPerformance.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
    
    if (peakHours.length > 0) {
      patterns.push({
        type: 'time_based_performance',
        description: `Higher success rates during hours: ${peakHours.join(', ')}`,
        frequency: 0.8,
        reliability: 0.7,
        applicableConditions: [`hour:${peakHours.join('|')}`]
      });
    }
    
    return patterns;
  }

  private generateImprovementSuggestions(results: CollectionResult[]): string[] {
    const suggestions: string[] = [];
    
    const failedSources = results.filter(r => r.status === 'failure');
    if (failedSources.length > results.length * 0.2) {
      suggestions.push('Consider implementing more robust error handling and retry mechanisms');
    }
    
    const slowSources = results.filter(r => r.processingTime > 10000);
    if (slowSources.length > 0) {
      suggestions.push('Optimize timeout settings and consider parallel processing for slow sources');
    }
    
    const lowQualitySources = results.filter(r => r.metadata.qualityScore < 0.6);
    if (lowQualitySources.length > 0) {
      suggestions.push('Improve content filtering to enhance overall quality scores');
    }
    
    return suggestions;
  }

  private calculateLearningConfidence(sampleSize: number): number {
    // Confidence increases with more data points
    if (sampleSize >= 100) return 0.95;
    if (sampleSize >= 50) return 0.85;
    if (sampleSize >= 20) return 0.75;
    if (sampleSize >= 10) return 0.65;
    return 0.5;
  }
}

// Implementation of ClaudeSourceAnalyzer
class ClaudeSourceAnalyzerImpl implements ClaudeSourceAnalyzer {
  async analyzeSources(sources: RssSource[]): Promise<SourceAnalysis[]> {
    const analyses: SourceAnalysis[] = [];
    
    for (const source of sources) {
      const analysis = await this.analyzeSource(source);
      analyses.push(analysis);
    }
    
    return analyses;
  }

  private async analyzeSource(source: RssSource): Promise<SourceAnalysis> {
    // Simulate Claude analysis - in real implementation, this would call Claude API
    const qualityScore = this.assessQuality(source);
    const relevanceScore = this.assessRelevance(source);
    const reliabilityScore = this.assessReliability(source);
    
    const recommendedPriority = Math.round((qualityScore + relevanceScore + reliabilityScore) / 3);
    
    return {
      sourceId: source.id,
      qualityScore,
      relevanceScore,
      reliabilityScore,
      recommendedPriority,
      reasoning: this.generateReasoning(source, qualityScore, relevanceScore, reliabilityScore),
      strengths: this.identifyStrengths(source),
      weaknesses: this.identifyWeaknesses(source)
    };
  }

  private assessQuality(source: RssSource): number {
    let score = 5; // Base score
    
    // Adjust based on success rate
    if (source.successRate > 0.9) score += 2;
    else if (source.successRate > 0.8) score += 1;
    else if (source.successRate < 0.6) score -= 2;
    
    // Adjust based on error count
    if (source.errorCount < 5) score += 1;
    else if (source.errorCount > 20) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  private assessRelevance(source: RssSource): number {
    let score = 5; // Base score
    
    // Adjust based on category
    if (source.category === 'forex') score += 3;
    else if (source.category === 'finance') score += 2;
    else if (source.category === 'crypto') score += 1;
    
    // Adjust based on refresh rate (more frequent = potentially more relevant)
    if (source.refreshRate <= 15) score += 1;
    else if (source.refreshRate >= 60) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  private assessReliability(source: RssSource): number {
    let score = 5; // Base score
    
    // Known reliable sources
    const reliableSources = ['reuters', 'bloomberg', 'forexfactory'];
    if (reliableSources.some(rs => source.url.includes(rs))) {
      score += 3;
    }
    
    // Adjust based on success rate
    score += (source.successRate - 0.5) * 8; // Scale success rate impact
    
    return Math.max(1, Math.min(10, score));
  }

  private generateReasoning(source: RssSource, quality: number, relevance: number, reliability: number): string {
    const reasons = [];
    
    if (quality >= 8) reasons.push('high content quality');
    else if (quality <= 4) reasons.push('quality concerns');
    
    if (relevance >= 8) reasons.push('highly relevant to FX trading');
    else if (relevance <= 4) reasons.push('limited FX relevance');
    
    if (reliability >= 8) reasons.push('excellent reliability record');
    else if (reliability <= 4) reasons.push('reliability issues');
    
    if (source.category === 'forex') reasons.push('specialized FX content');
    
    return reasons.length > 0 
      ? `Source prioritized due to: ${reasons.join(', ')}`
      : 'Standard priority based on basic metrics';
  }

  private identifyStrengths(source: RssSource): string[] {
    const strengths = [];
    
    if (source.successRate > 0.9) strengths.push('High reliability');
    if (source.category === 'forex') strengths.push('FX specialized content');
    if (source.refreshRate <= 30) strengths.push('Frequent updates');
    if (source.priority >= 8) strengths.push('High priority classification');
    
    return strengths;
  }

  private identifyWeaknesses(source: RssSource): string[] {
    const weaknesses = [];
    
    if (source.successRate < 0.7) weaknesses.push('Reliability concerns');
    if (source.errorCount > 10) weaknesses.push('Frequent errors');
    if (source.refreshRate > 120) weaknesses.push('Infrequent updates');
    if (!source.active) weaknesses.push('Currently inactive');
    
    return weaknesses;
  }
}