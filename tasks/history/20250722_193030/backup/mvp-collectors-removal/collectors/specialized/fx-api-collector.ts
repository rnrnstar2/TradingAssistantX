import axios from 'axios';
import type { CollectionResult } from '../types/autonomous-system';

export interface FXAPIConfig {
  alphaVantageKey?: string;
  finnhubKey?: string;
  fmpKey?: string;
  timeout: number;
  maxRetries: number;
}

export interface ForexRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

export interface EconomicEvent {
  time: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface FXNews {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  source: string;
}

/**
 * FX専門API収集器 - 安定性最優先
 * X依存からの脱却によりデータ品質を大幅改善
 */
export class FXAPICollector {
  private config: FXAPIConfig;

  private static readonly DEFAULT_CONFIG: FXAPIConfig = {
    timeout: 10000,
    maxRetries: 3,
  };

  constructor(config?: Partial<FXAPIConfig>) {
    this.config = { ...FXAPICollector.DEFAULT_CONFIG, ...config };
    this.loadAPIKeysFromEnv();
  }

  private loadAPIKeysFromEnv(): void {
    this.config.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.config.finnhubKey = process.env.FINNHUB_API_KEY; 
    this.config.fmpKey = process.env.FMP_API_KEY;
  }

  /**
   * 並列API収集 - 高速・高信頼性
   */
  async collectAllFXData(): Promise<CollectionResult[]> {
    console.log('📊 [FX API収集] 複数APIからの並列データ取得開始');
    
    const collectionTasks = [
      this.collectAlphaVantageData().catch(error => {
        console.warn('⚠️ [Alpha Vantage失敗]:', error.message);
        return [];
      }),
      this.collectFinnhubData().catch(error => {
        console.warn('⚠️ [Finnhub失敗]:', error.message);
        return [];
      }),
      this.collectFMPData().catch(error => {
        console.warn('⚠️ [FMP失敗]:', error.message);
        return [];
      })
    ];

    const results = await Promise.allSettled(collectionTasks);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<CollectionResult[]> => 
        result.status === 'fulfilled')
      .flatMap(result => result.value);

    console.log(`✅ [FX API収集完了] ${successfulResults.length}件のデータを取得`);
    return successfulResults;
  }

  /**
   * Alpha Vantage: 為替レート + ニュース感情分析
   */
  private async collectAlphaVantageData(): Promise<CollectionResult[]> {
    if (!this.config.alphaVantageKey) {
      throw new Error('Alpha Vantage API keyが未設定');
    }

    console.log('🔗 [Alpha Vantage] データ取得中...');
    const results: CollectionResult[] = [];

    // 1. リアルタイム為替レート取得
    const majorPairs = ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'EUR/USD'];
    
    for (const pair of majorPairs) {
      try {
        const rateData = await this.fetchAlphaVantageRate(pair);
        if (rateData) {
          results.push({
            id: `fx_rate_${pair.replace('/', '')}_${Date.now()}`,
            type: 'market_data',
            content: `${pair}: ${rateData.bid} / ${rateData.ask}`,
            source: 'alpha_vantage',
            timestamp: rateData.timestamp,
            relevanceScore: 0.9,
            metadata: {
              symbol: rateData.symbol,
              bid: rateData.bid,
              ask: rateData.ask,
              dataType: 'forex_rate'
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ [Alpha Vantage率取得失敗] ${pair}:`, error);
      }
    }

    // 2. FXニュース + 感情分析
    try {
      const newsData = await this.fetchAlphaVantageNews();
      for (const news of newsData) {
        results.push({
          id: `fx_news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'news',
          content: `${news.title}\n\n${news.summary}`,
          source: 'alpha_vantage_news',
          timestamp: new Date(news.publishedAt).getTime(),
          relevanceScore: news.sentiment === 'positive' ? 0.8 : news.sentiment === 'negative' ? 0.7 : 0.6,
          metadata: {
            title: news.title,
            url: news.url,
            sentiment: news.sentiment,
            dataType: 'news_with_sentiment'
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ [Alpha Vantageニュース失敗]:', error);
    }

    return results;
  }

  /**
   * Finnhub: 経済指標カレンダー
   */
  private async collectFinnhubData(): Promise<CollectionResult[]> {
    if (!this.config.finnhubKey) {
      throw new Error('Finnhub API keyが未設定');
    }

    console.log('📅 [Finnhub] 経済指標カレンダー取得中...');
    
    try {
      const events = await this.fetchFinnhubEconomicCalendar();
      const results: CollectionResult[] = [];

      for (const event of events) {
        const impactScore = event.impact === 'high' ? 0.9 : event.impact === 'medium' ? 0.7 : 0.5;
        
        results.push({
          id: `economic_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'economic_indicator',
          content: `${event.country} ${event.event}: 予想${event.forecast || 'N/A'} 前回${event.previous || 'N/A'}`,
          source: 'finnhub_calendar',
          timestamp: new Date(event.time).getTime(),
          relevanceScore: impactScore,
          metadata: {
            country: event.country,
            impact: event.impact,
            actual: event.actual,
            forecast: event.forecast,
            previous: event.previous,
            dataType: 'economic_indicator'
          }
        });
      }

      return results;
    } catch (error) {
      console.error('❌ [Finnhub取得エラー]:', error);
      return [];
    }
  }

  /**
   * Financial Modeling Prep: FXニュース
   */
  private async collectFMPData(): Promise<CollectionResult[]> {
    if (!this.config.fmpKey) {
      throw new Error('FMP API keyが未設定');
    }

    console.log('📰 [FMP] FXニュース取得中...');
    
    try {
      const news = await this.fetchFMPForexNews();
      const results: CollectionResult[] = [];

      for (const article of news) {
        results.push({
          id: `fmp_news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'news',
          content: `${article.title}\n\n${article.summary}`,
          source: 'fmp_news',
          timestamp: new Date(article.publishedAt).getTime(),
          relevanceScore: 0.75,
          metadata: {
            title: article.title,
            url: article.url,
            source: article.source,
            dataType: 'forex_news'
          }
        });
      }

      return results;
    } catch (error) {
      console.error('❌ [FMP取得エラー]:', error);
      return [];
    }
  }

  // Alpha Vantage API implementations
  private async fetchAlphaVantageRate(pair: string): Promise<ForexRate | null> {
    const [from, to] = pair.split('/');
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.config.alphaVantageKey}`;
    
    const response = await this.retryRequest(() => axios.get(url, { timeout: this.config.timeout }));
    const data = response.data['Realtime Currency Exchange Rate'];
    
    if (!data) return null;

    return {
      symbol: pair,
      bid: parseFloat(data['4. Bid Price']),
      ask: parseFloat(data['5. Ask Price']),
      timestamp: new Date(data['6. Last Refreshed']).getTime()
    };
  }

  private async fetchAlphaVantageNews(): Promise<FXNews[]> {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=forex&apikey=${this.config.alphaVantageKey}&limit=10`;
    
    const response = await this.retryRequest(() => axios.get(url, { timeout: this.config.timeout }));
    const articles = response.data.feed || [];

    return articles.map((article: any): FXNews => ({
      title: article.title,
      summary: article.summary,
      url: article.url,
      publishedAt: article.time_published,
      sentiment: this.interpretSentiment(article.overall_sentiment_score),
      source: article.source
    }));
  }

  // Finnhub API implementations  
  private async fetchFinnhubEconomicCalendar(): Promise<EconomicEvent[]> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const from = today.toISOString().split('T')[0];
    const to = tomorrow.toISOString().split('T')[0];
    
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${this.config.finnhubKey}`;
    
    const response = await this.retryRequest(() => axios.get(url, { timeout: this.config.timeout }));
    const events = response.data.economicCalendar || [];

    return events.map((event: any): EconomicEvent => ({
      time: event.time,
      country: event.country,
      impact: event.impact?.toLowerCase() || 'low',
      event: event.event,
      actual: event.actual,
      forecast: event.estimate,
      previous: event.prev
    }));
  }

  // FMP API implementations
  private async fetchFMPForexNews(): Promise<FXNews[]> {
    const url = `https://financialmodelingprep.com/api/v4/forex_news?page=0&size=20&apikey=${this.config.fmpKey}`;
    
    const response = await this.retryRequest(() => axios.get(url, { timeout: this.config.timeout }));
    const articles = response.data || [];

    return articles.map((article: any): FXNews => ({
      title: article.title,
      summary: article.text?.substring(0, 300) || article.title,
      url: article.url,
      publishedAt: article.publishedDate,
      source: article.site
    }));
  }

  // Utility methods
  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s delays
          console.warn(`⚠️ [API請求失敗] 試行${attempt}/${this.config.maxRetries}, ${delay}ms後再試行`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private interpretSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }
}