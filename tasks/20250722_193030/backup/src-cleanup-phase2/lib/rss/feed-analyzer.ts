import {
  FeedItem,
  ContentAnalysis,
  RelevanceScore,
  InvestmentValue,
  DeduplicationResult,
  QualityFilterResult,
  ContentClassifier,
  SentimentAnalyzer,
  RelevanceScorer,
  InvestmentImplication,
  RejectedItem,
  DuplicateGroup,
  ScoringContext,
  MarketCondition,
} from '../../types/rss-collection-types';

export class FeedAnalyzer {
  private contentClassifier: ContentClassifier;
  private sentimentAnalyzer: SentimentAnalyzer;
  private relevanceScorer: RelevanceScorer;
  
  private readonly FX_KEYWORDS = new Set([
    'forex', 'fx', 'currency', 'exchange rate', 'usd', 'eur', 'jpy', 'gbp',
    'trading', 'pip', 'spread', 'leverage', 'margin', 'central bank',
    'interest rate', 'monetary policy', 'inflation', 'gdp', 'economic data'
  ]);

  private readonly QUALITY_THRESHOLDS = {
    minLength: 50,
    maxLength: 10000,
    minRelevance: 0.3,
    minSentimentConfidence: 0.5
  };

  constructor() {
    this.contentClassifier = new SimpleContentClassifier();
    this.sentimentAnalyzer = new SimpleSentimentAnalyzer();
    this.relevanceScorer = new SimpleRelevanceScorer();
  }

  async analyzeFeedContent(feedItems: FeedItem[]): Promise<ContentAnalysis[]> {
    const analyses: ContentAnalysis[] = [];
    
    for (const item of feedItems) {
      try {
        const analysis = await this.analyzeItem(item);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze item ${item.id}:`, error);
      }
    }

    return analyses.sort((a, b) => b.fxRelevanceScore - a.fxRelevanceScore);
  }

  async scoreFxRelevance(content: string): Promise<RelevanceScore> {
    const context: ScoringContext = {
      keywords: Array.from(this.FX_KEYWORDS),
      categories: ['forex', 'finance', 'trading'],
      timeframe: 'realtime',
      marketConditions: this.getCurrentMarketConditions()
    };

    return this.relevanceScorer.score(content, context);
  }

  async evaluateInvestmentValue(feedItem: FeedItem): Promise<InvestmentValue> {
    const relevanceScore = await this.scoreFxRelevance(
      `${feedItem.title} ${feedItem.description || ''}`
    );
    
    const sentiment = await this.sentimentAnalyzer.analyze(feedItem.description || '');
    const classification = await this.contentClassifier.classify(feedItem.description || '');

    const actionability = this.calculateActionability(feedItem, relevanceScore);
    const impactPotential = this.calculateImpactPotential(feedItem, sentiment, classification);
    
    const score = Math.round(
      (relevanceScore.score * 0.4) + 
      (actionability * 0.3) + 
      (impactPotential * 0.3)
    );

    return {
      score,
      actionability,
      impactPotential,
      confidenceLevel: Math.min(relevanceScore.factors.contextualRelevance, sentiment.confidence),
      recommendedAction: this.getRecommendedAction(score, sentiment, classification),
      riskLevel: this.assessRiskLevel(impactPotential, sentiment.magnitude)
    };
  }

  async deduplicateSimilarContent(items: FeedItem[]): Promise<DeduplicationResult> {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    const uniqueItems: FeedItem[] = [];

    for (const item of items) {
      if (processed.has(item.id)) continue;

      const similar = items.filter(other => 
        other.id !== item.id && 
        !processed.has(other.id) && 
        this.calculateSimilarity(item, other) > 0.8
      );

      if (similar.length > 0) {
        duplicateGroups.push({
          representative: item,
          duplicates: similar,
          similarity: Math.max(...similar.map(s => this.calculateSimilarity(item, s)))
        });

        similar.forEach(s => processed.add(s.id));
        processed.add(item.id);
        uniqueItems.push(item);
      } else if (!processed.has(item.id)) {
        uniqueItems.push(item);
        processed.add(item.id);
      }
    }

    return {
      originalCount: items.length,
      duplicatesRemoved: items.length - uniqueItems.length,
      uniqueItems,
      duplicateGroups
    };
  }

  async filterHighQualityContent(items: FeedItem[]): Promise<QualityFilterResult> {
    const highQualityItems: FeedItem[] = [];
    const rejectedItems: RejectedItem[] = [];

    for (const item of items) {
      const qualityScore = await this.calculateQualityScore(item);
      
      if (qualityScore >= 0.6) {
        highQualityItems.push(item);
      } else {
        rejectedItems.push({
          item,
          reason: this.getQualityRejectReason(qualityScore, item),
          qualityScore
        });
      }
    }

    return {
      originalCount: items.length,
      filteredCount: highQualityItems.length,
      highQualityItems: highQualityItems.sort((a, b) => {
        return this.calculateQualityScore(b).then(scoreB => 
          this.calculateQualityScore(a).then(scoreA => scoreB - scoreA)
        ) as any;
      }),
      rejectedItems
    };
  }

  private async analyzeItem(item: FeedItem): Promise<ContentAnalysis> {
    const content = `${item.title} ${item.description || ''}`;
    
    const [relevanceScore, sentiment, classification] = await Promise.all([
      this.scoreFxRelevance(content),
      this.sentimentAnalyzer.analyze(content),
      this.contentClassifier.classify(content)
    ]);

    const urgencyLevel = this.calculateUrgencyLevel(item, classification);
    const investmentImplication = this.deriveInvestmentImplication(sentiment, classification, relevanceScore);
    const keyInsights = this.extractKeyInsights(content, classification);

    return {
      feedItem: item,
      fxRelevanceScore: relevanceScore.score,
      sentimentScore: sentiment.score,
      urgencyLevel,
      investmentImplication,
      keyInsights,
      confidenceLevel: Math.min(relevanceScore.factors.contextualRelevance, sentiment.confidence)
    };
  }

  private calculateSimilarity(item1: FeedItem, item2: FeedItem): number {
    const title1 = item1.title.toLowerCase();
    const title2 = item2.title.toLowerCase();
    
    // Simple Jaccard similarity for now
    const words1 = new Set(title1.split(/\s+/));
    const words2 = new Set(title2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async calculateQualityScore(item: FeedItem): Promise<number> {
    const content = `${item.title} ${item.description || ''}`;
    
    let score = 0.5; // base score
    
    // Length check
    if (content.length >= this.QUALITY_THRESHOLDS.minLength && 
        content.length <= this.QUALITY_THRESHOLDS.maxLength) {
      score += 0.2;
    }
    
    // Has meaningful content
    if (item.description && item.description.length > 20) {
      score += 0.15;
    }
    
    // Recent content
    if (item.publishedAt && 
        Date.now() - item.publishedAt.getTime() < 24 * 60 * 60 * 1000) {
      score += 0.1;
    }
    
    // Has author
    if (item.author) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  private getQualityRejectReason(qualityScore: number, item: FeedItem): string {
    const content = `${item.title} ${item.description || ''}`;
    
    if (content.length < this.QUALITY_THRESHOLDS.minLength) {
      return 'Content too short';
    }
    if (content.length > this.QUALITY_THRESHOLDS.maxLength) {
      return 'Content too long';
    }
    if (!item.description || item.description.length < 20) {
      return 'Insufficient description';
    }
    if (qualityScore < 0.4) {
      return 'Low overall quality';
    }
    
    return 'Below quality threshold';
  }

  private calculateActionability(item: FeedItem, relevanceScore: RelevanceScore): number {
    let actionability = 0.5;
    
    // Time sensitivity
    if (item.publishedAt && 
        Date.now() - item.publishedAt.getTime() < 60 * 60 * 1000) { // 1 hour
      actionability += 0.3;
    }
    
    // Specific trading signals
    const content = `${item.title} ${item.description || ''}`.toLowerCase();
    if (content.includes('buy') || content.includes('sell') || 
        content.includes('target') || content.includes('stop')) {
      actionability += 0.2;
    }
    
    return Math.min(actionability, 1.0);
  }

  private calculateImpactPotential(item: FeedItem, sentiment: any, classification: any): number {
    let impact = 0.5;
    
    // High magnitude sentiment
    if (sentiment.magnitude > 0.7) {
      impact += 0.2;
    }
    
    // Major news categories
    if (classification.category === 'breaking' || 
        classification.tags.includes('central-bank')) {
      impact += 0.3;
    }
    
    return Math.min(impact, 1.0);
  }

  private getRecommendedAction(score: number, sentiment: any, classification: any): string {
    if (score >= 80) {
      return sentiment.score > 0 ? 'Strong Buy Signal' : 'Strong Sell Signal';
    } else if (score >= 60) {
      return 'Monitor Closely';
    } else if (score >= 40) {
      return 'Keep on Watchlist';
    } else {
      return 'Low Priority';
    }
  }

  private assessRiskLevel(impactPotential: number, sentimentMagnitude: number): 'low' | 'medium' | 'high' {
    const combinedScore = (impactPotential + sentimentMagnitude) / 2;
    
    if (combinedScore >= 0.8) return 'high';
    if (combinedScore >= 0.5) return 'medium';
    return 'low';
  }

  private calculateUrgencyLevel(item: FeedItem, classification: any): number {
    let urgency = 0.5;
    
    // Recent content
    if (item.publishedAt && 
        Date.now() - item.publishedAt.getTime() < 30 * 60 * 1000) { // 30 minutes
      urgency += 0.3;
    }
    
    // Breaking news
    if (classification.tags.includes('breaking') || 
        classification.category === 'urgent') {
      urgency += 0.2;
    }
    
    return Math.min(urgency, 1.0);
  }

  private deriveInvestmentImplication(sentiment: any, classification: any, relevanceScore: RelevanceScore): InvestmentImplication {
    const direction = sentiment.score > 0.1 ? 'bullish' : 
                     sentiment.score < -0.1 ? 'bearish' : 'neutral';
    
    const strength = Math.round(Math.abs(sentiment.score) * 100);
    
    const timeframe = this.inferTimeframe(classification);
    const affectedInstruments = this.identifyInstruments(`${classification.topics.join(' ')}`);
    
    return {
      direction,
      strength,
      timeframe,
      affectedInstruments,
      reasoning: `Based on ${sentiment.label} sentiment (${sentiment.score.toFixed(2)}) and ${relevanceScore.score}% relevance`
    };
  }

  private extractKeyInsights(content: string, classification: any): string[] {
    const insights: string[] = [];
    
    // Extract key topics
    classification.topics.forEach((topic: string) => {
      if (this.FX_KEYWORDS.has(topic.toLowerCase())) {
        insights.push(`Key topic: ${topic}`);
      }
    });
    
    // Extract numerical values (rates, percentages)
    const numbers = content.match(/\d+\.?\d*%?/g);
    if (numbers && numbers.length > 0) {
      insights.push(`Key figures: ${numbers.slice(0, 3).join(', ')}`);
    }
    
    return insights.slice(0, 5);
  }

  private inferTimeframe(classification: any): 'short' | 'medium' | 'long' {
    const tags = classification.tags.join(' ').toLowerCase();
    
    if (tags.includes('intraday') || tags.includes('scalping')) return 'short';
    if (tags.includes('swing') || tags.includes('weekly')) return 'medium';
    if (tags.includes('position') || tags.includes('monthly')) return 'long';
    
    return 'short'; // default to short-term
  }

  private identifyInstruments(content: string): string[] {
    const instruments: string[] = [];
    const text = content.toLowerCase();
    
    const pairs = ['eurusd', 'gbpusd', 'usdjpy', 'usdchf', 'audusd', 'usdcad', 'nzdusd'];
    pairs.forEach(pair => {
      if (text.includes(pair)) {
        instruments.push(pair.toUpperCase());
      }
    });
    
    const currencies = ['eur', 'usd', 'gbp', 'jpy', 'chf', 'aud', 'cad', 'nzd'];
    currencies.forEach(currency => {
      if (text.includes(currency) && !instruments.some(i => i.includes(currency.toUpperCase()))) {
        instruments.push(currency.toUpperCase());
      }
    });
    
    return instruments.slice(0, 3);
  }

  private getCurrentMarketConditions(): MarketCondition {
    // Simplified market condition assessment
    const hour = new Date().getHours();
    
    let sessionTime: 'tokyo' | 'london' | 'newyork' | 'overlap' | 'quiet';
    if (hour >= 0 && hour < 9) sessionTime = 'tokyo';
    else if (hour >= 8 && hour < 17) sessionTime = 'london';
    else if (hour >= 13 && hour < 22) sessionTime = 'newyork';
    else if ((hour >= 8 && hour < 10) || (hour >= 13 && hour < 17)) sessionTime = 'overlap';
    else sessionTime = 'quiet';

    return {
      volatility: 'medium',
      trendDirection: 'sideways',
      newsIntensity: 'medium',
      sessionTime,
      majorEventScheduled: false
    };
  }
}

// Simple implementations for the interfaces
class SimpleContentClassifier implements ContentClassifier {
  async classify(content: string): Promise<any> {
    const text = content.toLowerCase();
    
    let category = 'general';
    if (text.includes('forex') || text.includes('currency')) category = 'forex';
    else if (text.includes('crypto') || text.includes('bitcoin')) category = 'crypto';
    else if (text.includes('stock') || text.includes('equity')) category = 'stocks';
    
    const tags = [];
    if (text.includes('breaking') || text.includes('urgent')) tags.push('breaking');
    if (text.includes('central bank') || text.includes('fed')) tags.push('central-bank');
    if (text.includes('rate') || text.includes('interest')) tags.push('rates');
    
    return {
      category,
      confidence: 0.8,
      tags,
      sentiment: text.includes('positive') || text.includes('good') ? 'positive' :
                 text.includes('negative') || text.includes('bad') ? 'negative' : 'neutral',
      topics: this.extractTopics(content)
    };
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const text = content.toLowerCase();
    
    const keyTopics = ['inflation', 'gdp', 'employment', 'rates', 'policy', 'trade', 'economic'];
    keyTopics.forEach(topic => {
      if (text.includes(topic)) topics.push(topic);
    });
    
    return topics.slice(0, 5);
  }
}

class SimpleSentimentAnalyzer implements SentimentAnalyzer {
  async analyze(content: string): Promise<any> {
    const text = content.toLowerCase();
    
    const positiveWords = ['good', 'positive', 'strong', 'gain', 'rise', 'bull', 'optimistic'];
    const negativeWords = ['bad', 'negative', 'weak', 'loss', 'fall', 'bear', 'pessimistic'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    const score = total > 0 ? (positiveCount - negativeCount) / total : 0;
    
    return {
      score,
      magnitude: Math.abs(score),
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      confidence: total > 0 ? Math.min(total / 10, 1) : 0.5,
      emotions: []
    };
  }
}

class SimpleRelevanceScorer implements RelevanceScorer {
  async score(content: string, context: ScoringContext): Promise<RelevanceScore> {
    const text = content.toLowerCase();
    
    let keywordMatch = 0;
    context.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatch += 1 / context.keywords.length;
      }
    });
    
    let contextualRelevance = 0.5;
    if (context.categories.some(cat => text.includes(cat))) {
      contextualRelevance += 0.3;
    }
    
    const sourceCredibility = 0.8; // Assume good credibility
    const timeliness = context.timeframe === 'realtime' ? 0.9 : 0.7;
    
    const score = Math.round(
      (keywordMatch * 40) + 
      (contextualRelevance * 30) + 
      (sourceCredibility * 20) + 
      (timeliness * 10)
    );

    return {
      score,
      factors: {
        keywordMatch: keywordMatch * 100,
        contextualRelevance: contextualRelevance * 100,
        sourceCredibility: sourceCredibility * 100,
        timeliness: timeliness * 100
      },
      explanation: `Score based on ${Math.round(keywordMatch * 100)}% keyword match and ${Math.round(contextualRelevance * 100)}% contextual relevance`
    };
  }
}