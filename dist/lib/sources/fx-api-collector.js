import axios from 'axios';
/**
 * FX専門API収集器 - MVP実装
 * Alpha Vantage, Finnhub, NewsAPI統合
 */
export class FXAPICollector {
    timeout = 10000;
    maxRetries = 2;
    // API Keys from environment
    alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    finnhubKey = process.env.FINNHUB_API_KEY;
    newsAPIKey = process.env.NEWSAPI_KEY;
    /**
     * 統合API収集実行
     */
    async collectAllFXData() {
        console.log('🔗 [FX API] API統合収集開始');
        const stats = {
            forexRates: 0,
            economicEvents: 0,
            newsItems: 0,
            totalAPICalls: 0,
            errors: []
        };
        const results = [];
        // 並列API収集
        const promises = [
            this.collectForexRates().catch(error => {
                stats.errors.push(`Forex Rates: ${error.message}`);
                return [];
            }),
            this.collectEconomicData().catch(error => {
                stats.errors.push(`Economic Data: ${error.message}`);
                return [];
            }),
            this.collectFXNews().catch(error => {
                stats.errors.push(`FX News: ${error.message}`);
                return [];
            })
        ];
        const apiResults = await Promise.allSettled(promises);
        for (const result of apiResults) {
            if (result.status === 'fulfilled') {
                results.push(...result.value);
            }
        }
        // 統計更新
        stats.forexRates = results.filter(r => r.type === 'forex_rate').length;
        stats.economicEvents = results.filter(r => r.type === 'economic_event').length;
        stats.newsItems = results.filter(r => r.type === 'api_news').length;
        console.log(`✅ [FX API] API収集完了: ${results.length}件`);
        return { results, stats };
    }
    /**
     * Alpha Vantage: 為替レート取得
     */
    async getForexRates(pairs = ['USD/JPY', 'EUR/JPY', 'GBP/JPY']) {
        if (!this.alphaVantageKey) {
            console.warn('⚠️ [FX API] Alpha Vantage API Key未設定');
            return [];
        }
        const forexData = [];
        for (const pair of pairs) {
            try {
                const [from, to] = pair.split('/');
                const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.alphaVantageKey}`;
                const response = await this.makeRequest(url);
                const data = response?.data?.['Realtime Currency Exchange Rate'];
                if (data) {
                    forexData.push({
                        pair,
                        rate: parseFloat(data['5. Exchange Rate']),
                        timestamp: new Date(data['6. Last Refreshed']).getTime()
                    });
                }
            }
            catch (error) {
                console.warn(`⚠️ [FX API] ${pair} 取得失敗:`, error);
            }
        }
        return forexData;
    }
    /**
     * Alpha Vantage: 経済指標取得
     */
    async getEconomicIndicators() {
        // MVP版では簡素化 - 実際のAPI実装は最小限
        return [];
    }
    /**
     * Finnhub: 経済カレンダー取得
     */
    async getEconomicCalendar() {
        if (!this.finnhubKey) {
            console.warn('⚠️ [FX API] Finnhub API Key未設定');
            return [];
        }
        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const from = today.toISOString().split('T')[0];
            const to = tomorrow.toISOString().split('T')[0];
            const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${this.finnhubKey}`;
            const response = await this.makeRequest(url);
            const events = response?.data?.economicCalendar || [];
            return events.slice(0, 10).map((event) => ({
                time: event.time,
                country: event.country,
                event: event.event,
                impact: event.impact?.toLowerCase() || 'low',
                actual: event.actual,
                forecast: event.estimate,
                previous: event.prev
            }));
        }
        catch (error) {
            console.error('❌ [FX API] Finnhub経済カレンダー取得失敗:', error);
            return [];
        }
    }
    /**
     * Finnhub: 市場ニュース取得
     */
    async getMarketNews() {
        // MVP版では簡素化
        return [];
    }
    /**
     * NewsAPI: FX関連ニュース取得
     */
    async getFXRelatedNews() {
        if (!this.newsAPIKey) {
            console.warn('⚠️ [FX API] NewsAPI Key未設定');
            return [];
        }
        try {
            const keywords = 'forex OR "foreign exchange" OR "currency" OR "central bank" OR FOMC';
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=10&apiKey=${this.newsAPIKey}`;
            const response = await this.makeRequest(url);
            const articles = response?.data?.articles || [];
            return articles.map((article) => ({
                title: article.title,
                summary: article.description || article.title,
                url: article.url,
                publishedAt: article.publishedAt,
                source: article.source?.name || 'NewsAPI'
            }));
        }
        catch (error) {
            console.error('❌ [FX API] NewsAPI取得失敗:', error);
            return [];
        }
    }
    /**
     * 為替レート収集 (内部用)
     */
    async collectForexRates() {
        console.log('📈 [FX API] 為替レート収集');
        const forexData = await this.getForexRates();
        return forexData.map(data => ({
            id: `forex_rate_${data.pair.replace('/', '')}_${Date.now()}`,
            type: 'forex_rate',
            content: `${data.pair}: ${data.rate}`,
            source: 'alpha_vantage',
            timestamp: data.timestamp,
            relevanceScore: 0.9,
            metadata: {
                pair: data.pair,
                rate: data.rate,
                dataType: 'forex_rate'
            }
        }));
    }
    /**
     * 経済データ収集 (内部用)
     */
    async collectEconomicData() {
        console.log('📊 [FX API] 経済データ収集');
        const events = await this.getEconomicCalendar();
        return events.map((event, index) => ({
            id: `economic_event_${Date.now()}_${index}`,
            type: 'economic_event',
            content: `${event.country} ${event.event}: 予想${event.forecast || 'N/A'} 前回${event.previous || 'N/A'}`,
            source: 'finnhub',
            timestamp: new Date(event.time).getTime(),
            relevanceScore: event.impact === 'high' ? 0.9 : event.impact === 'medium' ? 0.7 : 0.5,
            metadata: {
                country: event.country,
                impact: event.impact,
                actual: event.actual,
                forecast: event.forecast,
                previous: event.previous,
                dataType: 'economic_indicator'
            }
        }));
    }
    /**
     * FXニュース収集 (内部用)
     */
    async collectFXNews() {
        console.log('📰 [FX API] FXニュース収集');
        const news = await this.getFXRelatedNews();
        return news.map((article, index) => ({
            id: `fx_news_${Date.now()}_${index}`,
            type: 'api_news',
            content: `${article.title}\n\n${article.summary}`,
            source: 'newsapi',
            timestamp: new Date(article.publishedAt).getTime(),
            relevanceScore: 0.7,
            metadata: {
                title: article.title,
                url: article.url,
                source: article.source,
                dataType: 'fx_news'
            }
        }));
    }
    /**
     * HTTP リクエスト実行 (リトライ付き)
     */
    async makeRequest(url) {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await axios.get(url, { timeout: this.timeout });
            }
            catch (error) {
                lastError = error;
                if (attempt < this.maxRetries) {
                    const delay = attempt * 1000;
                    console.warn(`⚠️ [FX API] リトライ ${attempt}/${this.maxRetries}, ${delay}ms後再試行`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
}
