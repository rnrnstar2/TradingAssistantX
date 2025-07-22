import fetch from 'node-fetch';
export class APICollector {
    config;
    cache = new Map();
    requestCounts = new Map();
    rateLimiters = new Map();
    constructor(config) {
        this.config = config;
        // Initialize rate limiters for each source
        this.config.sources.forEach(source => {
            if (source.rateLimitPerMinute) {
                this.rateLimiters.set(source.name, new RateLimiter(source.rateLimitPerMinute, 60000));
            }
        });
    }
    async collectFromAPIs(sourceNames) {
        const startTime = Date.now();
        const enabledSources = this.config.sources.filter(source => source.enabled && (!sourceNames || sourceNames.includes(source.name)));
        if (enabledSources.length === 0) {
            return this.createEmptyResult('No enabled API sources found', startTime);
        }
        const results = [];
        const errors = [];
        let requestCount = 0;
        let cacheUsed = false;
        // Process sources with respect to rate limits
        for (const source of enabledSources) {
            try {
                const sourceResults = await this.collectFromSource(source);
                results.push(...sourceResults.data);
                requestCount += sourceResults.requestCount;
                if (sourceResults.cacheUsed)
                    cacheUsed = true;
                if (sourceResults.errors)
                    errors.push(...sourceResults.errors);
            }
            catch (error) {
                errors.push(error);
            }
        }
        // Sort by relevance and timestamp
        const sortedResults = results.sort((a, b) => {
            const scoreA = (a.relevanceScore || 0);
            const scoreB = (b.relevanceScore || 0);
            if (scoreA !== scoreB)
                return scoreB - scoreA; // Higher relevance first
            return b.timestamp - a.timestamp; // Then by newest first
        });
        return {
            source: 'api',
            provider: 'multiple',
            data: sortedResults,
            timestamp: Date.now(),
            metadata: {
                requestCount,
                cacheUsed,
                responseTime: Date.now() - startTime,
                errorCount: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        };
    }
    async collectFromSource(source) {
        const cacheKey = `api:${source.name}`;
        const cached = this.cache.get(cacheKey);
        // Check cache first
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout * 1000) {
            return {
                data: cached.data,
                requestCount: 0,
                cacheUsed: true
            };
        }
        const results = [];
        const errors = [];
        let requestCount = 0;
        // Collect from each endpoint
        for (const endpoint of source.endpoints) {
            try {
                const endpointResults = await this.collectFromEndpoint(source, endpoint);
                results.push(...endpointResults.data);
                requestCount += endpointResults.requestCount;
                if (endpointResults.errors)
                    errors.push(...endpointResults.errors);
            }
            catch (error) {
                errors.push(error);
            }
        }
        // Cache the results
        if (results.length > 0) {
            this.cache.set(cacheKey, {
                data: results,
                timestamp: Date.now()
            });
        }
        return {
            data: results,
            requestCount,
            cacheUsed: false,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    async collectFromEndpoint(source, endpoint) {
        // Check rate limit
        const rateLimiter = this.rateLimiters.get(source.name);
        if (rateLimiter && !rateLimiter.tryAcquire()) {
            return {
                data: [],
                requestCount: 0,
                errors: [new Error(`Rate limit exceeded for ${source.name}`)]
            };
        }
        const url = this.buildURL(source.baseUrl, endpoint);
        const headers = this.buildHeaders(source, endpoint);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), source.timeout || this.config.timeout);
            const response = await fetch(url, {
                method: endpoint.method,
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.incrementRequestCount(source.provider);
            const results = this.transformAPIData(source, endpoint, data);
            return {
                data: results,
                requestCount: 1,
            };
        }
        catch (error) {
            console.error(`API Collection error for ${source.name}/${endpoint.name}:`, error);
            return {
                data: [],
                requestCount: 0,
                errors: [error]
            };
        }
    }
    buildURL(baseUrl, endpoint) {
        let url = `${baseUrl.replace(/\/$/, '')}/${endpoint.path.replace(/^\//, '')}`;
        if (endpoint.params) {
            const params = new URLSearchParams();
            Object.entries(endpoint.params).forEach(([key, value]) => {
                params.append(key, String(value));
            });
            url += `?${params.toString()}`;
        }
        return url;
    }
    buildHeaders(source, endpoint) {
        const headers = {
            'User-Agent': 'TradingAssistantX/1.0.0',
            'Accept': 'application/json',
            ...endpoint.headers
        };
        if (source.apiKey) {
            // Different API key formats for different providers
            switch (source.provider) {
                case 'alpha_vantage':
                    // Alpha Vantage uses query parameter, not header
                    break;
                case 'iex_cloud':
                    headers['Authorization'] = `Bearer ${source.apiKey}`;
                    break;
                case 'coingecko':
                    headers['x-cg-demo-api-key'] = source.apiKey;
                    break;
                default:
                    headers['Authorization'] = `Bearer ${source.apiKey}`;
            }
        }
        return headers;
    }
    transformAPIData(source, endpoint, data) {
        const results = [];
        try {
            switch (source.provider) {
                case 'alpha_vantage':
                    results.push(...this.transformAlphaVantageData(source, endpoint, data));
                    break;
                case 'iex_cloud':
                    results.push(...this.transformIEXData(source, endpoint, data));
                    break;
                case 'coingecko':
                    results.push(...this.transformCoinGeckoData(source, endpoint, data));
                    break;
                case 'fred':
                    results.push(...this.transformFREDData(source, endpoint, data));
                    break;
                default:
                    results.push(...this.transformGenericAPIData(source, endpoint, data));
            }
        }
        catch (error) {
            console.error(`Data transformation error for ${source.name}:`, error);
        }
        return results;
    }
    transformAlphaVantageData(source, endpoint, data) {
        const results = [];
        if (data['Error Message'] || data['Note']) {
            throw new Error(data['Error Message'] || data['Note']);
        }
        // Handle different Alpha Vantage endpoints
        if (data['Meta Data'] && data['Time Series (Daily)']) {
            const symbol = data['Meta Data']['2. Symbol'];
            const timeSeries = data['Time Series (Daily)'];
            Object.entries(timeSeries).slice(0, 5).forEach(([date, values]) => {
                results.push({
                    id: `alphavantage_${symbol}_${date}`,
                    title: `${symbol} Stock Data - ${date}`,
                    content: `Open: $${values['1. open']}, High: $${values['2. high']}, Low: $${values['3. low']}, Close: $${values['4. close']}, Volume: ${values['5. volume']}`,
                    url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}`,
                    timestamp: new Date(date).getTime(),
                    source: source.name,
                    provider: source.provider,
                    relevanceScore: 0.8,
                    category: 'stock_data',
                    tags: ['stock', symbol.toLowerCase(), 'price'],
                    metadata: { symbol, date, values }
                });
            });
        }
        return results;
    }
    transformIEXData(source, endpoint, data) {
        const results = [];
        if (Array.isArray(data)) {
            data.slice(0, 10).forEach((item, index) => {
                if (item.symbol) {
                    results.push({
                        id: `iex_${item.symbol}_${Date.now()}_${index}`,
                        title: `${item.symbol} - ${item.companyName || 'Market Data'}`,
                        content: `Price: $${item.latestPrice || 'N/A'}, Change: ${item.change || 'N/A'} (${item.changePercent ? (item.changePercent * 100).toFixed(2) + '%' : 'N/A'})`,
                        url: `https://iexcloud.io/`,
                        timestamp: item.latestUpdate || Date.now(),
                        source: source.name,
                        provider: source.provider,
                        relevanceScore: 0.7,
                        category: 'market_data',
                        tags: ['stock', item.symbol.toLowerCase(), 'iex'],
                        metadata: item
                    });
                }
            });
        }
        return results;
    }
    transformCoinGeckoData(source, endpoint, data) {
        const results = [];
        if (Array.isArray(data)) {
            data.slice(0, 10).forEach((coin, index) => {
                results.push({
                    id: `coingecko_${coin.id}_${Date.now()}_${index}`,
                    title: `${coin.name} (${coin.symbol.toUpperCase()}) Price Update`,
                    content: `Current Price: $${coin.current_price}, 24h Change: ${coin.price_change_percentage_24h?.toFixed(2) || 'N/A'}%, Market Cap: $${coin.market_cap?.toLocaleString() || 'N/A'}`,
                    url: `https://www.coingecko.com/en/coins/${coin.id}`,
                    timestamp: Date.now(),
                    source: source.name,
                    provider: source.provider,
                    relevanceScore: 0.6,
                    category: 'crypto',
                    tags: ['cryptocurrency', coin.symbol.toLowerCase(), coin.id],
                    metadata: coin
                });
            });
        }
        return results;
    }
    transformFREDData(source, endpoint, data) {
        const results = [];
        if (data.observations && Array.isArray(data.observations)) {
            data.observations.slice(-5).forEach((obs, index) => {
                results.push({
                    id: `fred_${data.series_id || 'unknown'}_${obs.date}_${index}`,
                    title: `Economic Indicator: ${data.title || 'FRED Data'} - ${obs.date}`,
                    content: `Value: ${obs.value}, Date: ${obs.date}. Source: Federal Reserve Economic Data`,
                    url: `https://fred.stlouisfed.org/series/${data.series_id || ''}`,
                    timestamp: new Date(obs.date).getTime(),
                    source: source.name,
                    provider: source.provider,
                    relevanceScore: 0.9,
                    category: 'economic_data',
                    tags: ['economics', 'fed', 'indicator'],
                    metadata: { seriesId: data.series_id, observation: obs }
                });
            });
        }
        return results;
    }
    transformGenericAPIData(source, endpoint, data) {
        const results = [];
        // Generic transformation for unknown API formats
        if (Array.isArray(data)) {
            data.slice(0, 10).forEach((item, index) => {
                results.push({
                    id: `${source.name}_${endpoint.name}_${Date.now()}_${index}`,
                    title: item.title || item.name || `Data from ${source.name}`,
                    content: JSON.stringify(item).substring(0, 500),
                    url: item.url || item.link || source.baseUrl,
                    timestamp: Date.now(),
                    source: source.name,
                    provider: source.provider,
                    relevanceScore: 0.5,
                    category: 'api_data',
                    tags: [source.provider],
                    metadata: item
                });
            });
        }
        else if (typeof data === 'object' && data !== null) {
            results.push({
                id: `${source.name}_${endpoint.name}_${Date.now()}`,
                title: data.title || data.name || `Data from ${source.name}`,
                content: JSON.stringify(data).substring(0, 500),
                url: data.url || data.link || source.baseUrl,
                timestamp: Date.now(),
                source: source.name,
                provider: source.provider,
                relevanceScore: 0.5,
                category: 'api_data',
                tags: [source.provider],
                metadata: data
            });
        }
        return results;
    }
    createEmptyResult(message, startTime) {
        return {
            source: 'api',
            provider: 'none',
            data: [],
            timestamp: Date.now(),
            metadata: {
                requestCount: 0,
                cacheUsed: false,
                responseTime: Date.now() - startTime,
                errorCount: 1
            },
            errors: [new Error(message)]
        };
    }
    incrementRequestCount(provider) {
        const current = this.requestCounts.get(provider) || 0;
        const newCount = current + 1;
        this.requestCounts.set(provider, newCount);
        return newCount;
    }
    // Public methods
    getRequestStats() {
        return Object.fromEntries(this.requestCounts);
    }
    clearCache() {
        this.cache.clear();
    }
    // Static method to get default API sources
    static getDefaultSources() {
        return [
            {
                name: 'Alpha Vantage',
                provider: 'alpha_vantage',
                baseUrl: 'https://www.alphavantage.co',
                enabled: false, // Requires API key
                rateLimitPerMinute: 5,
                timeout: 15000,
                endpoints: [
                    {
                        name: 'daily_adjusted',
                        path: '/query',
                        method: 'GET',
                        params: {
                            function: 'TIME_SERIES_DAILY_ADJUSTED',
                            symbol: 'AAPL',
                            apikey: 'demo'
                        }
                    }
                ]
            },
            {
                name: 'CoinGecko',
                provider: 'coingecko',
                baseUrl: 'https://api.coingecko.com/api/v3',
                enabled: true,
                rateLimitPerMinute: 10,
                timeout: 10000,
                endpoints: [
                    {
                        name: 'coins_markets',
                        path: '/coins/markets',
                        method: 'GET',
                        params: {
                            vs_currency: 'usd',
                            order: 'market_cap_desc',
                            per_page: 10,
                            page: 1,
                            sparkline: false
                        }
                    }
                ]
            },
            {
                name: 'FRED',
                provider: 'fred',
                baseUrl: 'https://api.stlouisfed.org/fred',
                enabled: false, // Requires API key
                rateLimitPerMinute: 120,
                timeout: 10000,
                endpoints: [
                    {
                        name: 'gdp',
                        path: '/series/observations',
                        method: 'GET',
                        params: {
                            series_id: 'GDP',
                            api_key: 'your_fred_api_key',
                            file_type: 'json',
                            limit: 10
                        }
                    }
                ]
            }
        ];
    }
}
// Simple rate limiter implementation
class RateLimiter {
    tokens;
    lastRefill;
    maxTokens;
    refillInterval;
    constructor(maxRequests, windowMs) {
        this.maxTokens = maxRequests;
        this.tokens = maxRequests;
        this.refillInterval = windowMs;
        this.lastRefill = Date.now();
    }
    tryAcquire() {
        this.refillTokens();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }
    refillTokens() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        if (timePassed >= this.refillInterval) {
            this.tokens = this.maxTokens;
            this.lastRefill = now;
        }
    }
}
