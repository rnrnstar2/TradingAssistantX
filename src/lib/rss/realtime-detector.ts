import {
  FeedItem,
  MarketMovement,
  EmergencyClassification,
  EmergencyInformation,
  ResponseAction,
  TrendChange,
  HistoricalData,
  Alert,
  Detection,
  AlertThresholds,
  IndicatorConfig,
  DataPoint,
} from '../../types/rss-collection-types';

export class RealtimeDetector {
  private emergencyKeywords: Set<string> = new Set();
  private marketIndicators: Map<string, IndicatorConfig> = new Map();
  private alertThresholds: AlertThresholds;
  private detectionHistory: Detection[] = [];
  private trendAnalysisCache: Map<string, TrendAnalysis> = new Map();

  constructor() {
    this.initializeEmergencyKeywords();
    this.initializeMarketIndicators();
    this.alertThresholds = {
      emergency: 0.9,
      high: 0.75,
      medium: 0.6,
      low: 0.4
    };
  }

  async detectMarketMovements(feedItems: FeedItem[]): Promise<MarketMovement[]> {
    const movements: MarketMovement[] = [];
    
    for (const item of feedItems) {
      const movement = await this.analyzeItemForMovement(item);
      if (movement) {
        movements.push(movement);
      }
    }

    // Sort by severity and detected time
    return movements.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return severityDiff !== 0 ? severityDiff : b.detectedAt.getTime() - a.detectedAt.getTime();
    });
  }

  async identifyEmergencyInformation(content: string): Promise<EmergencyClassification> {
    const detectionStart = Date.now();
    
    // Check for emergency keywords
    const keywordMatches = this.findEmergencyKeywords(content.toLowerCase());
    
    // Analyze urgency indicators
    const urgencyScore = this.calculateUrgencyScore(content);
    
    // Detect impact indicators
    const impactScore = this.assessPotentialImpact(content);
    
    // Calculate overall emergency score
    const emergencyScore = this.calculateEmergencyScore(keywordMatches, urgencyScore, impactScore);
    
    const isEmergency = emergencyScore >= this.alertThresholds.medium;
    const urgencyLevel = this.classifyUrgencyLevel(emergencyScore);
    
    return {
      isEmergency,
      urgencyLevel,
      category: this.categorizeEmergency(content, keywordMatches),
      confidence: this.calculateConfidence(keywordMatches.length, urgencyScore, impactScore),
      triggers: keywordMatches,
      estimatedImpact: Math.round(impactScore * 100)
    };
  }

  async rapidResponseSystem(emergencyInfo: EmergencyInformation): Promise<ResponseAction> {
    const responseStart = Date.now();
    const maxResponseTime = 30000; // 30 seconds maximum
    
    try {
      // Quick classification of response type needed
      const responseType = this.determineResponseType(emergencyInfo);
      
      // Generate immediate actions
      const actions = await this.generateImmediateActions(emergencyInfo, responseType);
      
      const responseTime = Date.now() - responseStart;
      
      return {
        id: `response_${Date.now()}`,
        type: responseType,
        description: `Rapid response to ${emergencyInfo.classification.category} emergency`,
        executionTime: Math.min(responseTime, maxResponseTime),
        parameters: {
          emergencyId: emergencyInfo.id,
          urgencyLevel: emergencyInfo.classification.urgencyLevel,
          actions: actions,
          maxExecutionTime: maxResponseTime
        },
        status: responseTime <= maxResponseTime ? 'completed' : 'executing',
        result: {
          responded: true,
          responseTime,
          actionsTriggered: actions.length,
          withinTimeLimit: responseTime <= maxResponseTime
        }
      };
    } catch (error) {
      return {
        id: `response_error_${Date.now()}`,
        type: 'error_response',
        description: 'Failed to generate rapid response',
        executionTime: Date.now() - responseStart,
        parameters: { error: error instanceof Error ? error.message : 'Unknown error' },
        status: 'failed',
        result: { error: true }
      };
    }
  }

  async detectTrendChanges(historicalData: HistoricalData): Promise<TrendChange[]> {
    const changes: TrendChange[] = [];
    
    if (!historicalData.data || historicalData.data.length < 10) {
      return changes; // Need sufficient data for trend analysis
    }

    const analysis = this.analyzeTrendData(historicalData.data);
    
    // Detect significant trend changes
    if (analysis.significantChange) {
      changes.push({
        type: analysis.changeType,
        direction: analysis.direction,
        confidence: analysis.confidence,
        affectedPairs: this.extractAffectedPairs(historicalData.metadata),
        timeframe: historicalData.timeframe,
        significance: analysis.significance
      });
    }

    // Check for breakout patterns
    const breakoutDetection = this.detectBreakoutPatterns(historicalData.data);
    if (breakoutDetection.detected) {
      changes.push({
        type: 'breakout',
        direction: breakoutDetection.direction,
        confidence: breakoutDetection.confidence,
        affectedPairs: this.extractAffectedPairs(historicalData.metadata),
        timeframe: historicalData.timeframe,
        significance: breakoutDetection.strength
      });
    }

    return changes;
  }

  async generateRealTimeAlerts(detections: Detection[]): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    for (const detection of detections) {
      const severity = this.mapConfidenceToSeverity(detection.confidence);
      const actionRequired = severity === 'critical' || severity === 'error';
      
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: detection.type,
        severity,
        message: this.generateAlertMessage(detection),
        timestamp: detection.timestamp,
        sourceId: detection.sourceId,
        actionRequired,
        acknowledged: false
      };
      
      alerts.push(alert);
    }

    // Sort alerts by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'error': 3, 'warning': 2, 'info': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return severityDiff !== 0 ? severityDiff : b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  private initializeEmergencyKeywords(): void {
    const keywords = [
      // Market Crisis Keywords
      'crash', 'collapse', 'plunge', 'surge', 'spike', 'volatility',
      'emergency', 'crisis', 'panic', 'selloff', 'rally',
      
      // Central Bank Keywords
      'fed', 'ecb', 'boj', 'boe', 'rba', 'snb', 'boc',
      'interest rate', 'rate cut', 'rate hike', 'monetary policy',
      'quantitative easing', 'qe', 'tapering',
      
      // Economic Indicators
      'gdp', 'inflation', 'cpi', 'ppi', 'unemployment', 'nonfarm',
      'retail sales', 'manufacturing', 'pmi', 'ism',
      
      // Geopolitical Keywords
      'sanctions', 'trade war', 'conflict', 'election', 'referendum',
      'brexit', 'intervention', 'default', 'bailout',
      
      // Technical Keywords
      'breakout', 'breakdown', 'support', 'resistance',
      'trend reversal', 'momentum', 'oversold', 'overbought'
    ];

    keywords.forEach(keyword => this.emergencyKeywords.add(keyword.toLowerCase()));
  }

  private initializeMarketIndicators(): void {
    const indicators = [
      { type: 'volatility', source: 'vix', threshold: 25, weight: 0.8 },
      { type: 'currency_strength', source: 'dxy', threshold: 95, weight: 0.7 },
      { type: 'yield_curve', source: '10y2y', threshold: 0.5, weight: 0.6 },
      { type: 'risk_sentiment', source: 'gold', threshold: 1800, weight: 0.5 },
      { type: 'liquidity', source: 'libor', threshold: 2.0, weight: 0.4 }
    ];

    indicators.forEach(indicator => {
      this.marketIndicators.set(indicator.source, {
        type: indicator.type,
        source: indicator.source,
        threshold: indicator.threshold,
        weight: indicator.weight,
        active: true
      });
    });
  }

  private async analyzeItemForMovement(item: FeedItem): Promise<MarketMovement | null> {
    const content = `${item.title} ${item.description || ''}`.toLowerCase();
    
    // Detect movement type
    const movementType = this.identifyMovementType(content);
    if (!movementType) return null;
    
    // Assess severity
    const severity = this.assessMovementSeverity(content, item);
    
    // Identify affected pairs
    const affectedPairs = this.identifyAffectedCurrencyPairs(content);
    
    // Calculate response time (time since publication)
    const responseTime = Date.now() - item.publishedAt.getTime();
    
    // Generate recommended actions
    const recommendedActions = await this.generateRecommendedActions(movementType, severity);

    return {
      type: movementType,
      severity,
      affectedPairs,
      detectedAt: new Date(),
      responseTime,
      recommendedActions
    };
  }

  private identifyMovementType(content: string): MarketMovement['type'] | null {
    if (content.includes('surge') || content.includes('spike') || content.includes('soar')) {
      return 'price_surge';
    }
    if (content.includes('volume') && (content.includes('increase') || content.includes('spike'))) {
      return 'volume_spike';
    }
    if (content.includes('news') || content.includes('announcement') || content.includes('report')) {
      return 'news_impact';
    }
    if (content.includes('sentiment') || content.includes('mood') || content.includes('risk')) {
      return 'sentiment_shift';
    }
    
    return null;
  }

  private assessMovementSeverity(content: string, item: FeedItem): MarketMovement['severity'] {
    let score = 0;
    
    // High impact words
    const highImpactWords = ['crash', 'collapse', 'emergency', 'crisis', 'breaking'];
    highImpactWords.forEach(word => {
      if (content.includes(word)) score += 3;
    });
    
    // Medium impact words
    const mediumImpactWords = ['significant', 'major', 'important', 'unexpected'];
    mediumImpactWords.forEach(word => {
      if (content.includes(word)) score += 2;
    });
    
    // Source credibility boost
    if (this.isHighCredibilitySource(item.sourceId)) {
      score += 1;
    }
    
    // Recency boost
    const ageMinutes = (Date.now() - item.publishedAt.getTime()) / (1000 * 60);
    if (ageMinutes < 15) score += 2; // Very recent
    else if (ageMinutes < 60) score += 1; // Recent
    
    // Map score to severity
    if (score >= 6) return 'critical';
    if (score >= 4) return 'major';
    if (score >= 2) return 'moderate';
    return 'minor';
  }

  private identifyAffectedCurrencyPairs(content: string): string[] {
    const pairs: string[] = [];
    const majorPairs = [
      'eurusd', 'gbpusd', 'usdjpy', 'usdchf',
      'audusd', 'usdcad', 'nzdusd'
    ];
    
    majorPairs.forEach(pair => {
      if (content.includes(pair) || content.includes(pair.replace('usd', '/usd'))) {
        pairs.push(pair.toUpperCase());
      }
    });
    
    // Check for individual currencies
    const currencies = ['eur', 'gbp', 'jpy', 'chf', 'aud', 'cad', 'nzd', 'usd'];
    currencies.forEach(currency => {
      if (content.includes(currency) && pairs.length < 3) {
        const pairWithUsd = currency === 'usd' ? null : 
          currency < 'usd' ? `${currency.toUpperCase()}USD` : `USD${currency.toUpperCase()}`;
        if (pairWithUsd && !pairs.includes(pairWithUsd)) {
          pairs.push(pairWithUsd);
        }
      }
    });
    
    return pairs.slice(0, 5); // Limit to 5 pairs
  }

  private async generateRecommendedActions(
    movementType: MarketMovement['type'], 
    severity: MarketMovement['severity']
  ): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];
    
    const baseAction = {
      id: `action_${Date.now()}`,
      type: '',
      description: '',
      executionTime: 0,
      parameters: {},
      status: 'pending' as const
    };
    
    switch (movementType) {
      case 'price_surge':
        actions.push({
          ...baseAction,
          id: `${baseAction.id}_monitor`,
          type: 'monitor_closely',
          description: 'Monitor price levels and volume for continuation or reversal',
          executionTime: 300, // 5 minutes
          parameters: { watchLevel: 'high', alerts: true }
        });
        break;
        
      case 'news_impact':
        actions.push({
          ...baseAction,
          id: `${baseAction.id}_analyze`,
          type: 'news_analysis',
          description: 'Analyze news impact and market reaction',
          executionTime: 600, // 10 minutes
          parameters: { depth: severity === 'critical' ? 'full' : 'quick' }
        });
        break;
        
      case 'sentiment_shift':
        actions.push({
          ...baseAction,
          id: `${baseAction.id}_sentiment`,
          type: 'sentiment_tracking',
          description: 'Track sentiment indicators and risk assets',
          executionTime: 900, // 15 minutes
          parameters: { indicators: ['vix', 'gold', 'bonds'] }
        });
        break;
    }
    
    // Add severity-based actions
    if (severity === 'critical') {
      actions.push({
        ...baseAction,
        id: `${baseAction.id}_emergency`,
        type: 'emergency_protocol',
        description: 'Activate emergency trading protocols',
        executionTime: 30, // 30 seconds
        parameters: { protocol: 'high_impact_news', level: 'critical' }
      });
    }
    
    return actions;
  }

  private findEmergencyKeywords(content: string): string[] {
    const matches = [];
    
    for (const keyword of this.emergencyKeywords) {
      if (content.includes(keyword)) {
        matches.push(keyword);
      }
    }
    
    return matches;
  }

  private calculateUrgencyScore(content: string): number {
    let score = 0;
    
    // Time-sensitive words
    const urgentWords = ['now', 'immediate', 'urgent', 'breaking', 'just in', 'alert'];
    urgentWords.forEach(word => {
      if (content.toLowerCase().includes(word)) score += 0.2;
    });
    
    // Punctuation indicating urgency
    const exclamationCount = (content.match(/!/g) || []).length;
    score += Math.min(exclamationCount * 0.1, 0.3);
    
    // Capital letters (shouting)
    const capitalRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capitalRatio > 0.3) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private assessPotentialImpact(content: string): number {
    let score = 0;
    
    // Economic impact indicators
    const impactWords = [
      'trillion', 'billion', 'million',
      'global', 'worldwide', 'international',
      'market', 'economy', 'financial',
      'central bank', 'government', 'federal'
    ];
    
    impactWords.forEach(word => {
      if (content.toLowerCase().includes(word)) score += 0.15;
    });
    
    // Scale indicators
    const scaleWords = ['massive', 'huge', 'enormous', 'unprecedented', 'historic'];
    scaleWords.forEach(word => {
      if (content.toLowerCase().includes(word)) score += 0.2;
    });
    
    return Math.min(score, 1.0);
  }

  private calculateEmergencyScore(keywords: string[], urgency: number, impact: number): number {
    const keywordScore = Math.min(keywords.length * 0.1, 0.4);
    return (keywordScore * 0.4) + (urgency * 0.3) + (impact * 0.3);
  }

  private classifyUrgencyLevel(score: number): EmergencyClassification['urgencyLevel'] {
    if (score >= this.alertThresholds.emergency) return 'critical';
    if (score >= this.alertThresholds.high) return 'high';
    if (score >= this.alertThresholds.medium) return 'medium';
    return 'low';
  }

  private categorizeEmergency(content: string, keywords: string[]): string {
    const text = content.toLowerCase();
    
    if (keywords.some(k => ['fed', 'ecb', 'boj', 'rate'].includes(k))) return 'monetary_policy';
    if (keywords.some(k => ['gdp', 'inflation', 'unemployment'].includes(k))) return 'economic_data';
    if (keywords.some(k => ['crisis', 'crash', 'collapse'].includes(k))) return 'market_crisis';
    if (keywords.some(k => ['sanctions', 'war', 'conflict'].includes(k))) return 'geopolitical';
    if (keywords.some(k => ['breakout', 'breakdown', 'technical'].includes(k))) return 'technical';
    
    return 'general';
  }

  private calculateConfidence(keywordCount: number, urgency: number, impact: number): number {
    const keywordConfidence = Math.min(keywordCount / 5, 1.0);
    return (keywordConfidence * 0.4) + (urgency * 0.3) + (impact * 0.3);
  }

  private determineResponseType(emergencyInfo: EmergencyInformation): string {
    switch (emergencyInfo.classification.category) {
      case 'monetary_policy': return 'policy_response';
      case 'market_crisis': return 'crisis_response';
      case 'economic_data': return 'data_response';
      case 'geopolitical': return 'geopolitical_response';
      case 'technical': return 'technical_response';
      default: return 'general_response';
    }
  }

  private async generateImmediateActions(
    emergencyInfo: EmergencyInformation, 
    responseType: string
  ): Promise<string[]> {
    const actions = [];
    
    switch (responseType) {
      case 'policy_response':
        actions.push('Monitor central bank communications');
        actions.push('Track yield curve movements');
        actions.push('Analyze currency impact');
        break;
        
      case 'crisis_response':
        actions.push('Activate risk management protocols');
        actions.push('Monitor safe haven assets');
        actions.push('Assess market liquidity');
        break;
        
      case 'data_response':
        actions.push('Compare with consensus forecasts');
        actions.push('Monitor market reaction');
        actions.push('Update economic outlook');
        break;
        
      default:
        actions.push('Monitor developments');
        actions.push('Assess market impact');
        actions.push('Prepare response strategy');
    }
    
    return actions;
  }

  private analyzeTrendData(data: DataPoint[]): TrendAnalysis {
    if (data.length < 5) {
      return { significantChange: false, confidence: 0, significance: 0 };
    }
    
    // Simple trend analysis using last 10 points vs previous 10
    const recentData = data.slice(-10);
    const previousData = data.slice(-20, -10);
    
    const recentAvg = recentData.reduce((sum, point) => sum + point.value, 0) / recentData.length;
    const previousAvg = previousData.length > 0 
      ? previousData.reduce((sum, point) => sum + point.value, 0) / previousData.length
      : recentAvg;
    
    const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;
    const significantChange = Math.abs(percentChange) > 2; // 2% threshold
    
    return {
      significantChange,
      changeType: Math.abs(percentChange) > 5 ? 'trend_reversal' : 'trend_acceleration',
      direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'sideways',
      confidence: Math.min(Math.abs(percentChange) / 10, 1),
      significance: Math.min(Math.abs(percentChange) / 5, 1)
    };
  }

  private detectBreakoutPatterns(data: DataPoint[]): BreakoutDetection {
    if (data.length < 20) {
      return { detected: false, confidence: 0, strength: 0 };
    }
    
    const recent = data.slice(-5);
    const baseline = data.slice(-20, -5);
    
    const recentMax = Math.max(...recent.map(d => d.value));
    const recentMin = Math.min(...recent.map(d => d.value));
    const baselineMax = Math.max(...baseline.map(d => d.value));
    const baselineMin = Math.min(...baseline.map(d => d.value));
    
    const upBreakout = recentMax > baselineMax * 1.02; // 2% breakout
    const downBreakout = recentMin < baselineMin * 0.98; // 2% breakdown
    
    if (upBreakout || downBreakout) {
      return {
        detected: true,
        direction: upBreakout ? 'up' : 'down',
        confidence: 0.7,
        strength: upBreakout 
          ? (recentMax - baselineMax) / baselineMax
          : (baselineMin - recentMin) / baselineMin
      };
    }
    
    return { detected: false, confidence: 0, strength: 0 };
  }

  private extractAffectedPairs(metadata: Record<string, any>): string[] {
    return metadata?.pairs || ['EURUSD', 'GBPUSD', 'USDJPY']; // Default pairs
  }

  private mapConfidenceToSeverity(confidence: number): Alert['severity'] {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'error';
    if (confidence >= 0.5) return 'warning';
    return 'info';
  }

  private generateAlertMessage(detection: Detection): string {
    return `${detection.type} detected with ${Math.round(detection.confidence * 100)}% confidence from ${detection.sourceId}`;
  }

  private isHighCredibilitySource(sourceId: string): boolean {
    const highCredibilitySources = ['reuters', 'bloomberg', 'fed', 'ecb', 'bis'];
    return highCredibilitySources.some(source => sourceId.toLowerCase().includes(source));
  }
}

// Helper interfaces for internal use
interface TrendAnalysis {
  significantChange: boolean;
  changeType?: string;
  direction?: 'up' | 'down' | 'sideways';
  confidence: number;
  significance: number;
}

interface BreakoutDetection {
  detected: boolean;
  direction?: 'up' | 'down';
  confidence: number;
  strength: number;
}