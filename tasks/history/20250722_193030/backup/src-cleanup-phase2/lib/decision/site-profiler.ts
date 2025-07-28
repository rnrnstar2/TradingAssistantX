import axios, { AxiosResponse } from 'axios';
import { CheerioAPI, load } from 'cheerio';
import { 
  SiteProfile, 
  QuickProfile, 
  CollectionMethod, 
  TimeWindow, 
  SiteReliability,
  AccessHistory,
  AvailabilityPrediction 
} from '../../types/decision-types.js';

export class SiteProfiler {
  private siteHistory: Map<string, AccessHistory> = new Map();

  async generateProfile(url: string): Promise<SiteProfile> {
    const quickProfile = await this.quickProfileCheck(url);
    
    if (!quickProfile.isAccessible) {
      return this.createFallbackProfile(url);
    }

    const [contentAnalysis, performanceAnalysis] = await Promise.all([
      this.analyzeContent(url),
      this.analyzePerformance(url)
    ]);

    return {
      requiresJavaScript: quickProfile.hasJavaScript,
      hasAntiBot: await this.detectAntiBot(url),
      loadSpeed: this.categorizeSpeed(quickProfile.responseTime),
      contentStructure: contentAnalysis.structure,
      updateFrequency: await this.estimateUpdateFrequency(url),
      contentQuality: contentAnalysis.quality,
      relevanceScore: contentAnalysis.relevance,
      bestCollectionTime: this.determineBestCollectionTime(url),
      optimalMethod: this.determineOptimalMethod(quickProfile),
      averageResponseTime: quickProfile.responseTime
    };
  }

  async quickProfileCheck(url: string): Promise<QuickProfile> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Compatible Research Bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const responseTime = Date.now() - startTime;
      const $ = load(response.data);
      
      const hasJavaScript = this.detectJavaScriptRequirement($, response.data);
      const probableMethod = this.inferOptimalMethod(response, hasJavaScript);

      this.updateAccessHistory(url, true, responseTime);

      return {
        isAccessible: true,
        responseTime,
        hasJavaScript,
        probableMethod
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateAccessHistory(url, false, responseTime, error);
      
      return {
        isAccessible: false,
        responseTime,
        hasJavaScript: true,
        probableMethod: CollectionMethod.PLAYWRIGHT_STEALTH
      };
    }
  }

  private async analyzeContent(url: string): Promise<{
    structure: 'simple' | 'complex' | 'dynamic';
    quality: number;
    relevance: number;
  }> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Compatible Research Bot)' }
      });

      const $ = load(response.data);
      
      const structure = this.categorizeStructure($);
      const quality = this.assessContentQuality($, response.data);
      const relevance = this.calculateRelevanceScore($, url);

      return { structure, quality, relevance };
    } catch (error) {
      return { structure: 'complex', quality: 30, relevance: 50 };
    }
  }

  private async analyzePerformance(url: string): Promise<{
    loadTime: number;
    stability: number;
  }> {
    const attempts = 3;
    const loadTimes: number[] = [];
    let successCount = 0;

    for (let i = 0; i < attempts; i++) {
      const startTime = Date.now();
      try {
        await axios.get(url, { timeout: 10000 });
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);
        successCount++;
      } catch {
        loadTimes.push(10000);
      }
      await this.delay(1000);
    }

    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const stability = successCount / attempts * 100;

    return { loadTime: avgLoadTime, stability };
  }

  private detectJavaScriptRequirement($: CheerioAPI, html: string): boolean {
    const jsIndicators = [
      $('script').length > 5,
      html.includes('document.createElement'),
      html.includes('window.onload'),
      $('[data-react-root]').length > 0,
      $('[id*="app"]').length > 0,
      html.includes('__NEXT_DATA__'),
      $('.js-required').length > 0
    ];

    return jsIndicators.filter(Boolean).length >= 2;
  }

  private async detectAntiBot(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'SimpleBot/1.0' }
      });

      const indicators = [
        response.status === 403,
        response.data.includes('cloudflare'),
        response.data.includes('captcha'),
        response.data.includes('bot detection'),
        response.headers['cf-ray'] !== undefined
      ];

      return indicators.some(Boolean);
    } catch (error: any) {
      return error.response?.status === 403;
    }
  }

  private categorizeSpeed(responseTime: number): 'fast' | 'medium' | 'slow' {
    if (responseTime < 1000) return 'fast';
    if (responseTime < 3000) return 'medium';
    return 'slow';
  }

  private async estimateUpdateFrequency(url: string): Promise<'high' | 'medium' | 'low'> {
    const history = this.siteHistory.get(url);
    if (!history || history.attempts < 3) {
      return this.inferUpdateFrequencyFromDomain(url);
    }

    const avgResponseTime = history.averageResponseTime;
    
    if (url.includes('news') || url.includes('breaking')) return 'high';
    if (url.includes('analysis') || url.includes('market')) return 'medium';
    return 'low';
  }

  private inferUpdateFrequencyFromDomain(url: string): 'high' | 'medium' | 'low' {
    if (url.includes('minkabu') || url.includes('zai')) return 'high';
    if (url.includes('traderswebfx')) return 'medium';
    return 'medium';
  }

  private categorizeStructure($: CheerioAPI): 'simple' | 'complex' | 'dynamic' {
    const complexity = [
      $('table').length > 5,
      $('script').length > 10,
      $('.dynamic').length > 0,
      $('[data-*]').length > 20,
      $('iframe').length > 2
    ].filter(Boolean).length;

    if (complexity >= 3) return 'dynamic';
    if (complexity >= 2) return 'complex';
    return 'simple';
  }

  private assessContentQuality($: CheerioAPI, html: string): number {
    let score = 50;

    score += $('article').length * 10;
    score += $('h1, h2, h3').length * 5;
    score += Math.min($('p').length * 2, 20);
    
    score -= $('script').length > 20 ? 20 : 0;
    score -= $('iframe').length * 5;
    
    const textLength = $('body').text().length;
    if (textLength > 5000) score += 15;
    else if (textLength > 1000) score += 10;

    if (html.includes('date') || html.includes('time')) score += 10;
    if (html.includes('author')) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateRelevanceScore($: CheerioAPI, url: string): number {
    let score = 50;

    const fxKeywords = ['fx', 'forex', 'currency', '通貨', 'dollar', 'yen', '為替'];
    const financeKeywords = ['market', 'trading', 'investment', 'economic', '経済', '投資'];
    
    const text = $('body').text().toLowerCase();
    
    fxKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) score += 8;
    });
    
    financeKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) score += 5;
    });

    if (url.includes('fx') || url.includes('forex')) score += 15;
    if (url.includes('news') || url.includes('market')) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private determineBestCollectionTime(url: string): TimeWindow {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (url.includes('minkabu') || url.includes('zai')) {
      return { start: 9, end: 15 };
    }
    
    return { start: 6, end: 22 };
  }

  private determineOptimalMethod(profile: QuickProfile): CollectionMethod {
    if (!profile.isAccessible) return CollectionMethod.PLAYWRIGHT_STEALTH;
    if (profile.hasJavaScript) return CollectionMethod.HYBRID;
    if (profile.responseTime > 3000) return CollectionMethod.SIMPLE_HTTP;
    
    return CollectionMethod.SIMPLE_HTTP;
  }

  private inferOptimalMethod(response: AxiosResponse, hasJavaScript: boolean): CollectionMethod {
    if (response.headers['cf-ray']) return CollectionMethod.PLAYWRIGHT_STEALTH;
    if (hasJavaScript) return CollectionMethod.HYBRID;
    return CollectionMethod.SIMPLE_HTTP;
  }

  private createFallbackProfile(url: string): SiteProfile {
    return {
      requiresJavaScript: true,
      hasAntiBot: true,
      loadSpeed: 'slow',
      contentStructure: 'complex',
      updateFrequency: 'medium',
      contentQuality: 40,
      relevanceScore: 60,
      bestCollectionTime: { start: 9, end: 18 },
      optimalMethod: CollectionMethod.PLAYWRIGHT_STEALTH,
      averageResponseTime: 5000
    };
  }

  private updateAccessHistory(url: string, success: boolean, responseTime: number, error?: any): void {
    const history = this.siteHistory.get(url) || {
      attempts: 0,
      successes: 0,
      failures: [],
      averageResponseTime: 0,
      lastAccessed: 0
    };

    history.attempts++;
    if (success) {
      history.successes++;
    } else {
      history.failures.push(error?.message || 'Unknown error');
    }

    history.averageResponseTime = 
      (history.averageResponseTime * (history.attempts - 1) + responseTime) / history.attempts;
    history.lastAccessed = Date.now();

    this.siteHistory.set(url, history);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ReliabilityCalculator {
  calculateReliabilityScore(site: string, history: AccessHistory): number {
    const uptime = history.successes / history.attempts * 100;
    const responseStability = this.calculateResponseStability(history);
    const contentConsistency = this.estimateContentConsistency(site);
    const botFriendliness = this.assessBotFriendliness(history);

    const weights = { uptime: 0.3, responseStability: 0.3, contentConsistency: 0.2, botFriendliness: 0.2 };
    
    return (
      uptime * weights.uptime +
      responseStability * weights.responseStability +
      contentConsistency * weights.contentConsistency +
      botFriendliness * weights.botFriendliness
    );
  }

  predictServiceAvailability(site: string): AvailabilityPrediction {
    const now = new Date();
    const hour = now.getHours();
    
    let probability = 0.9;
    let confidence = 0.8;
    const factors: string[] = [];

    if (site.includes('minkabu') && (hour >= 9 && hour <= 15)) {
      probability = 0.95;
      confidence = 0.9;
      factors.push('Market hours - high availability');
    }

    if (hour >= 2 && hour <= 6) {
      probability *= 0.8;
      factors.push('Maintenance window - reduced availability');
    }

    return {
      probability,
      timeWindow: { start: hour, end: hour + 1 },
      confidence,
      factors
    };
  }

  private calculateResponseStability(history: AccessHistory): number {
    if (history.attempts < 3) return 50;
    
    const failureRate = history.failures.length / history.attempts;
    return Math.max(0, 100 - (failureRate * 100));
  }

  private estimateContentConsistency(site: string): number {
    const knownGoodSites = ['minkabu.jp', 'zai.diamond.jp', 'traderswebfx.jp'];
    
    if (knownGoodSites.some(goodSite => site.includes(goodSite))) {
      return 85;
    }
    
    return 70;
  }

  private assessBotFriendliness(history: AccessHistory): number {
    const botErrors = history.failures.filter(error => 
      error.includes('403') || 
      error.includes('bot') || 
      error.includes('blocked')
    ).length;

    if (botErrors === 0) return 90;
    if (botErrors / history.attempts < 0.2) return 70;
    return 30;
  }
}