import Parser from 'rss-parser';
export class RSSCollector {
    config;
    parser;
    cache = new Map();
    requestCounts = new Map();
    constructor(config) {
        this.config = config;
        this.parser = new Parser({
            timeout: config.timeout,
            headers: {
                'User-Agent': 'TradingAssistantX/1.0.0'
            }
        });
    }
    async collectFromRSS(sources) {
        const startTime = Date.now();
        const enabledSources = this.config.sources.filter(source => source.enabled && (!sources || sources.includes(source.name)));
        if (enabledSources.length === 0) {
            return this.createEmptyResult('No enabled RSS sources found', startTime);
        }
        const results = [];
        const errors = [];
        let requestCount = 0;
        let cacheUsed = false;
        // Limit concurrent requests
        const semaphore = new Semaphore(this.config.maxConcurrency);
        const promises = enabledSources.map(async (source) => {
            await semaphore.acquire();
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
            finally {
                semaphore.release();
            }
        });
        await Promise.all(promises);
        // Sort by timestamp (newest first) and remove duplicates
        const uniqueResults = this.removeDuplicates(results.sort((a, b) => b.timestamp - a.timestamp));
        return {
            source: 'rss',
            provider: 'multiple',
            data: uniqueResults,
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
        const cacheKey = `rss:${source.name}`;
        const cached = this.cache.get(cacheKey);
        // Check cache first
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout * 1000) {
            return {
                data: cached.data.slice(0, source.maxItems || 20),
                requestCount: 0,
                cacheUsed: true
            };
        }
        try {
            const feed = await this.parser.parseURL(source.url);
            const requestCount = this.incrementRequestCount(source.provider);
            const items = (feed.items || [])
                .slice(0, source.maxItems || 20)
                .map((item, index) => ({
                id: item.guid || `${source.name}_${index}_${Date.now()}`,
                title: item.title || 'No title',
                content: this.cleanContent(item.contentSnippet || item.content || item.title || ''),
                url: item.link || source.url,
                timestamp: new Date(item.pubDate || Date.now()).getTime(),
                source: source.name,
                provider: source.provider,
                relevanceScore: this.calculateRelevanceScore(item, source.categories),
                category: this.extractCategory(item, source.categories),
                tags: this.extractTags(item),
                metadata: {
                    author: item.creator || item.author,
                    pubDate: item.pubDate,
                    categories: item.categories
                }
            }));
            // Cache the results
            this.cache.set(cacheKey, {
                data: items,
                timestamp: Date.now()
            });
            return {
                data: items,
                requestCount: 1,
                cacheUsed: false
            };
        }
        catch (error) {
            console.error(`RSS Collection error for ${source.name}:`, error);
            return {
                data: [],
                requestCount: 0,
                cacheUsed: false,
                errors: [error]
            };
        }
    }
    createEmptyResult(message, startTime) {
        return {
            source: 'rss',
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
    cleanContent(content) {
        // Remove HTML tags and excessive whitespace
        return content
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 2000); // Limit content length
    }
    calculateRelevanceScore(item, categories) {
        let score = 0.5; // Base score
        // Financial keywords increase relevance
        const financialKeywords = [
            'stock', 'market', 'trading', 'investment', 'finance', 'economic',
            'bitcoin', 'crypto', 'currency', 'fed', 'central bank', 'inflation',
            'gdp', 'earnings', 'ipo', 'merger', 'acquisition'
        ];
        const content = (item.title + ' ' + (item.contentSnippet || '')).toLowerCase();
        const matches = financialKeywords.filter(keyword => content.includes(keyword)).length;
        score += Math.min(matches * 0.1, 0.4); // Max 0.4 bonus from keywords
        // Category relevance
        if (categories && item.categories) {
            const categoryMatches = categories.some(cat => item.categories.some((itemCat) => itemCat.toLowerCase().includes(cat.toLowerCase())));
            if (categoryMatches)
                score += 0.1;
        }
        return Math.min(score, 1.0);
    }
    extractCategory(item, sourceCategories) {
        if (item.categories && item.categories.length > 0) {
            return item.categories[0];
        }
        if (sourceCategories && sourceCategories.length > 0) {
            return sourceCategories[0];
        }
        return 'general';
    }
    extractTags(item) {
        const tags = [];
        if (item.categories) {
            tags.push(...item.categories.map((cat) => cat.toLowerCase()));
        }
        // Extract hashtags from content
        const content = item.title + ' ' + (item.contentSnippet || '');
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            tags.push(...hashtags.map(tag => tag.toLowerCase()));
        }
        return [...new Set(tags)]; // Remove duplicates
    }
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(item => {
            const key = `${item.title}_${item.url}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    incrementRequestCount(provider) {
        const current = this.requestCounts.get(provider) || 0;
        const newCount = current + 1;
        this.requestCounts.set(provider, newCount);
        return newCount;
    }
    // Public method to get request statistics
    getRequestStats() {
        return Object.fromEntries(this.requestCounts);
    }
    // Public method to clear cache
    clearCache() {
        this.cache.clear();
    }
    // Public method to get default RSS sources configuration
    static getDefaultSources() {
        return [
            {
                name: 'Yahoo Finance',
                url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
                provider: 'yahoo_finance',
                enabled: true,
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'stocks', 'markets']
            },
            {
                name: 'Reuters Business',
                url: 'https://feeds.reuters.com/reuters/businessNews',
                provider: 'reuters',
                enabled: false, // 無効化: アクセス不可によるエラー回避
                timeout: 10000,
                maxItems: 20,
                categories: ['business', 'finance', 'markets']
            },
            {
                name: 'Reuters Technology',
                url: 'https://feeds.reuters.com/reuters/technologyNews',
                provider: 'reuters',
                enabled: false, // 無効化: アクセス不可によるエラー回避
                timeout: 10000,
                maxItems: 15,
                categories: ['technology', 'crypto']
            },
            {
                name: 'MarketWatch',
                url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
                provider: 'yahoo_finance',
                enabled: true,
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'stocks', 'investing']
            }
        ];
    }
}
// Simple semaphore implementation for concurrent request limiting
class Semaphore {
    tokens;
    waitingQueue = [];
    constructor(count) {
        this.tokens = count;
    }
    async acquire() {
        if (this.tokens > 0) {
            this.tokens--;
            return;
        }
        return new Promise((resolve) => {
            this.waitingQueue.push(resolve);
        });
    }
    release() {
        this.tokens++;
        if (this.waitingQueue.length > 0) {
            this.tokens--;
            const resolve = this.waitingQueue.shift();
            if (resolve)
                resolve();
        }
    }
}
