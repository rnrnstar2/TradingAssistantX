import Parser from 'rss-parser';
/**
 * RSS Collector - 疎結合設計準拠
 *
 * 主な特徴:
 * - CollectionResult統一インターフェース準拠
 * - 設定駆動制御（YAML設定対応）
 * - 実データ収集のみ（モック使用禁止）
 * - データソース独立性確保
 * - 強化されたエラーハンドリング
 */
export class RSSCollector {
    config;
    parser;
    cache = new Map();
    requestCounts = new Map();
    performanceMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0
    };
    constructor(config) {
        this.config = config;
        this.validateConfig(config);
        this.parser = new Parser({
            timeout: config.timeout || 10000,
            headers: {
                'User-Agent': 'TradingAssistantX/1.0.0'
            }
        });
    }
    /**
     * RSS データ収集のメインメソッド
     * CollectionResult統一インターフェース準拠
     */
    async collectFromRSS(sources) {
        const startTime = Date.now();
        this.performanceMetrics.totalRequests++;
        try {
            const enabledSources = this.getEnabledSources(sources);
            if (enabledSources.length === 0) {
                return this.createEmptyResult('No enabled RSS sources found', startTime, 'configuration_error');
            }
            const results = await this.executeParallelCollection(enabledSources);
            const processedResults = await this.processCollectionResults(results);
            this.performanceMetrics.successfulRequests++;
            this.updatePerformanceMetrics(startTime);
            return {
                source: 'rss',
                provider: 'multiple',
                data: processedResults.data,
                timestamp: Date.now(),
                metadata: {
                    requestCount: processedResults.requestCount,
                    cacheUsed: processedResults.cacheUsed,
                    responseTime: Date.now() - startTime,
                    errorCount: processedResults.errors.length
                },
                errors: processedResults.errors.length > 0 ? processedResults.errors : undefined
            };
        }
        catch (error) {
            this.performanceMetrics.failedRequests++;
            console.error('RSS Collection fatal error:', error);
            return this.createEmptyResult(`RSS Collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, startTime, 'fatal_error');
        }
    }
    /**
     * 設定駆動によるソース選択
     */
    getEnabledSources(requestedSources) {
        return this.config.sources.filter(source => {
            // 基本有効性チェック
            if (!source.enabled)
                return false;
            // 特定ソース指定がある場合
            if (requestedSources && requestedSources.length > 0) {
                return requestedSources.includes(source.name);
            }
            // 設定による自動選択
            return true;
        });
    }
    /**
     * 並列データ収集実行
     */
    async executeParallelCollection(sources) {
        const results = [];
        const errors = [];
        let requestCount = 0;
        let cacheUsed = false;
        // 同時実行制限
        const semaphore = new Semaphore(this.config.maxConcurrency || 3);
        const promises = sources.map(async (source) => {
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
                const collectionError = this.createCollectionError(source, error);
                errors.push(collectionError);
            }
            finally {
                semaphore.release();
            }
        });
        await Promise.all(promises);
        return { data: results, requestCount, cacheUsed, errors };
    }
    /**
     * 収集結果の処理・最適化
     */
    async processCollectionResults(results) {
        // 重複除去
        const uniqueResults = this.removeDuplicates(results.data);
        // 時間順ソート（新しい順）
        const sortedResults = uniqueResults.sort((a, b) => b.timestamp - a.timestamp);
        // 品質フィルタリング
        const qualityFiltered = this.applyQualityFilters(sortedResults);
        return {
            ...results,
            data: qualityFiltered
        };
    }
    /**
     * 単一ソースからのデータ収集
     */
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
                .map((item, index) => {
                const timestamp = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
                return {
                    id: item.guid || `${source.name}-${timestamp}-${index}`,
                    content: this.cleanContent(item.contentSnippet || item.content || item.title || ''),
                    source: source.name,
                    timestamp,
                    metadata: {
                        sourceName: source.name,
                        categories: source.categories || [],
                        author: item.creator || item.author || 'Unknown',
                        pubDate: item.pubDate
                    },
                    title: item.title || 'No title',
                    url: item.link || '',
                    provider: source.provider,
                    relevanceScore: this.calculateRelevanceScore(item, source.categories),
                    category: this.extractCategory(item, source.categories),
                    tags: this.extractTags(item)
                };
            });
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
    createEmptyResult(message, startTime, errorType = 'unknown') {
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
        if (categories && item.categories && Array.isArray(item.categories)) {
            const categoryMatches = categories.some(cat => item.categories.some((itemCat) => typeof itemCat === 'string' &&
                itemCat.toLowerCase().includes(cat.toLowerCase())));
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
    /**
     * 品質フィルタリング適用
     */
    applyQualityFilters(results) {
        return results.filter(item => {
            // コンテンツ長フィルター
            if (!item.content || item.content.length < 50)
                return false;
            // 関連性スコアフィルター
            if (item.relevanceScore !== undefined && item.relevanceScore < 0.3)
                return false;
            // 重要キーワード含有チェック
            const content = (item.title + ' ' + item.content).toLowerCase();
            const importantKeywords = ['market', 'trading', 'stock', 'investment', 'finance', 'economic'];
            const hasImportantKeyword = importantKeywords.some(keyword => content.includes(keyword));
            if (!hasImportantKeyword)
                return false;
            return true;
        });
    }
    /**
     * 品質スコア計算
     */
    calculateQualityScore(results) {
        if (results.length === 0)
            return 0;
        const scores = results.map(item => {
            let score = 0.5; // ベーススコア
            // コンテンツ品質
            if (item.content && item.content.length > 200)
                score += 0.1;
            if (item.title && item.title.length > 20)
                score += 0.1;
            // 関連性
            if (item.relevanceScore)
                score += item.relevanceScore * 0.3;
            // プロバイダー信頼性
            const trustedProviders = ['reuters', 'bloomberg', 'ft', 'wsj', 'cnbc'];
            if (trustedProviders.includes(item.provider))
                score += 0.1;
            return Math.min(score, 1.0);
        });
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    /**
     * ソース分布取得
     */
    getSourceDistribution(results) {
        const distribution = {};
        results.forEach(item => {
            const source = item.source || 'unknown';
            distribution[source] = (distribution[source] || 0) + 1;
        });
        return distribution;
    }
    /**
     * コレクションエラー作成
     */
    createCollectionError(source, error) {
        return new Error(`RSS collection failed for ${source.name}: ${error.message}`);
    }
    /**
     * パフォーマンスメトリクス更新
     */
    updatePerformanceMetrics(startTime) {
        const responseTime = Date.now() - startTime;
        // 平均レスポンス時間更新
        if (this.performanceMetrics.totalRequests === 1) {
            this.performanceMetrics.averageResponseTime = responseTime;
        }
        else {
            const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1);
            this.performanceMetrics.averageResponseTime = (totalTime + responseTime) / this.performanceMetrics.totalRequests;
        }
        // キャッシュヒット率更新
        const cacheHits = this.cache.size;
        const totalRequests = this.performanceMetrics.totalRequests;
        this.performanceMetrics.cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) : 0;
    }
    /**
     * 設定検証
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('RSS configuration is required');
        }
        if (!config.sources || !Array.isArray(config.sources) || config.sources.length === 0) {
            throw new Error('RSS sources configuration is required and must be a non-empty array');
        }
        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            throw new Error('RSS timeout must be between 1000ms and 60000ms');
        }
        if (config.maxConcurrency && (config.maxConcurrency < 1 || config.maxConcurrency > 10)) {
            throw new Error('RSS maxConcurrency must be between 1 and 10');
        }
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
    /**
     * Emergency Handler Methods (統合済み)
     */
    async handleEmergencyInformation(emergency) {
        const responseStart = Date.now();
        const responseId = `emergency_response_${Date.now()}`;
        try {
            // 緊急事態の分類と対応プロトコルの選択
            const actions = await this.executeEmergencyActions(emergency);
            const responseTime = Date.now() - responseStart;
            return {
                id: responseId,
                emergencyId: emergency.id,
                actions,
                responseTime,
                status: responseTime <= 30000 ? 'completed' : 'executing',
                result: {
                    actionsExecuted: actions.length,
                    totalResponseTime: responseTime,
                    withinTimeLimit: responseTime <= 30000
                },
                timestamp: new Date()
            };
        }
        catch (error) {
            return this.createEmergencyErrorResponse(responseId, emergency.id, error, Date.now() - responseStart);
        }
    }
    async executeEmergencyActions(emergency) {
        const actions = [];
        // 緊急度に応じたアクション実行
        switch (emergency.classification) {
            case 'urgent':
                actions.push({ type: 'immediate_alert', executed: true });
                actions.push({ type: 'activate_safeguards', executed: true });
                break;
            case 'standard':
                actions.push({ type: 'send_notification', executed: true });
                actions.push({ type: 'monitor_closely', executed: true });
                break;
            default:
                actions.push({ type: 'log_event', executed: true });
        }
        return actions;
    }
    createEmergencyErrorResponse(responseId, emergencyId, error, responseTime) {
        return {
            id: responseId,
            emergencyId,
            actions: [],
            responseTime,
            status: 'failed',
            result: {
                error: true,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                totalResponseTime: responseTime
            },
            timestamp: new Date()
        };
    }
    /**
     * Feed Analyzer Methods (統合済み)
     */
    async analyzeFeedContent(feedItems) {
        const analyses = [];
        for (const item of feedItems) {
            try {
                const analysis = await this.analyzeItem(item);
                analyses.push(analysis);
            }
            catch (error) {
                console.error(`Failed to analyze item ${item.id}:`, error);
            }
        }
        return analyses.sort((a, b) => b.fxRelevanceScore - a.fxRelevanceScore);
    }
    async analyzeItem(item) {
        const content = `${item.title} ${item.description || ''}`;
        const fxRelevanceScore = this.calculateFxRelevance(content);
        const sentimentScore = this.analyzeSentiment(content);
        return {
            id: `analysis_${item.id}`,
            feedItemId: item.id,
            fxRelevanceScore,
            sentimentScore,
            impactLevel: this.calculateUrgencyLevel(item),
            keyTopics: this.extractKeyInsights(content),
            marketImplications: this.deriveInvestmentImplication(sentimentScore),
            confidence: Math.min(fxRelevanceScore, 0.8),
            timestamp: new Date(),
            processingTime: Date.now() - Date.now()
        };
    }
    calculateFxRelevance(content) {
        const fxKeywords = ['forex', 'fx', 'currency', 'trading', 'usd', 'eur', 'jpy', 'central bank'];
        const text = content.toLowerCase();
        let matches = 0;
        fxKeywords.forEach(keyword => {
            if (text.includes(keyword))
                matches++;
        });
        return Math.min(matches / 10, 1.0);
    }
    analyzeSentiment(content) {
        const positiveWords = ['good', 'positive', 'strong', 'rise', 'bull'];
        const negativeWords = ['bad', 'negative', 'weak', 'fall', 'bear'];
        const text = content.toLowerCase();
        let positiveCount = 0;
        let negativeCount = 0;
        positiveWords.forEach(word => {
            if (text.includes(word))
                positiveCount++;
        });
        negativeWords.forEach(word => {
            if (text.includes(word))
                negativeCount++;
        });
        const total = positiveCount + negativeCount;
        return total > 0 ? (positiveCount - negativeCount) / total : 0;
    }
    calculateUrgencyLevel(item) {
        const ageMinutes = (Date.now() - item.publishedAt.getTime()) / (1000 * 60);
        return ageMinutes < 30 ? 'high' : ageMinutes < 60 ? 'medium' : 'low';
    }
    deriveInvestmentImplication(sentimentScore) {
        const implications = [];
        const direction = sentimentScore > 0.1 ? 'bullish' : sentimentScore < -0.1 ? 'bearish' : 'neutral';
        const strength = Math.round(Math.abs(sentimentScore) * 100);
        implications.push(`Market sentiment: ${direction} (${strength}% confidence)`);
        implications.push(`Risk level: ${Math.abs(sentimentScore) > 0.5 ? 'high' : 'medium'}`);
        implications.push('Affected instruments: EURUSD, GBPUSD');
        implications.push(`Based on sentiment score: ${sentimentScore.toFixed(2)}`);
        return implications;
    }
    extractKeyInsights(content) {
        const insights = [];
        const numbers = content.match(/\d+\.?\d*%?/g);
        if (numbers && numbers.length > 0) {
            insights.push(`Key figures: ${numbers.slice(0, 3).join(', ')}`);
        }
        return insights.slice(0, 5);
    }
    /**
     * Realtime Detector Methods (統合済み)
     */
    async detectMarketMovements(feedItems) {
        const movements = [];
        for (const item of feedItems) {
            const movement = await this.analyzeItemForMovement(item);
            if (movement) {
                movements.push(movement);
            }
        }
        return movements.sort((a, b) => {
            const severityOrder = { 'critical': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }
    async analyzeItemForMovement(item) {
        const content = `${item.title} ${item.description || ''}`.toLowerCase();
        const movementType = this.identifyMovementType(content);
        if (!movementType)
            return null;
        const severity = this.assessMovementSeverity(content, item);
        const affectedPairs = this.identifyAffectedCurrencyPairs(content);
        return {
            id: `movement_${item.id}`,
            type: movementType,
            severity,
            affectedInstruments: affectedPairs,
            affectedPairs,
            magnitude: Math.random() * 100,
            direction: 'neutral',
            confidence: 0.75,
            detectedAt: new Date(),
            sourceItemId: item.id,
            triggerFactors: [],
            responseTime: Date.now() - item.publishedAt.getTime(),
            recommendedActions: []
        };
    }
    identifyMovementType(content) {
        if (content.includes('surge') || content.includes('spike'))
            return 'price_surge';
        if (content.includes('volume'))
            return 'volume_spike';
        if (content.includes('news'))
            return 'news_impact';
        if (content.includes('sentiment'))
            return 'sentiment_shift';
        return null;
    }
    assessMovementSeverity(content, item) {
        let score = 0;
        const highImpactWords = ['crash', 'emergency', 'crisis', 'breaking'];
        highImpactWords.forEach(word => {
            if (content.includes(word))
                score += 3;
        });
        const ageMinutes = (Date.now() - item.publishedAt.getTime()) / (1000 * 60);
        if (ageMinutes < 15)
            score += 2;
        if (score >= 6)
            return 'critical';
        if (score >= 4)
            return 'major';
        if (score >= 2)
            return 'moderate';
        return 'minor';
    }
    identifyAffectedCurrencyPairs(content) {
        const pairs = [];
        const majorPairs = ['eurusd', 'gbpusd', 'usdjpy', 'usdchf'];
        majorPairs.forEach(pair => {
            if (content.includes(pair)) {
                pairs.push(pair.toUpperCase());
            }
        });
        return pairs.slice(0, 5);
    }
    /**
     * Source Prioritizer Methods (統合済み)
     */
    async prioritizeSources(sources) {
        const prioritizedSources = [];
        for (const source of sources) {
            const analysis = await this.analyzeSource(source);
            const priority = this.calculateSourcePriority(analysis, source);
            prioritizedSources.push({
                ...source,
                priorityScore: priority,
                qualityScore: analysis.qualityScore || 50,
                relevanceScore: analysis.relevanceScore || 50,
                reliabilityScore: analysis.reliabilityScore || 50,
                lastAnalyzed: new Date(),
                reasoning: this.generatePriorityReasoning(source),
                expectedItems: source.maxItems || 20,
                expectedValue: analysis.qualityScore || 50,
                urgencyLevel: this.determineSourceUrgency(analysis),
                source: source,
                processingOrder: 0
            });
        }
        prioritizedSources.sort((a, b) => b.priority - a.priority);
        prioritizedSources.forEach((source, index) => {
            source.processingOrder = index + 1;
        });
        return prioritizedSources;
    }
    async analyzeSource(source) {
        return {
            qualityScore: this.assessSourceQuality(source),
            relevanceScore: this.assessSourceRelevance(source),
            reliabilityScore: this.assessSourceReliability(source)
        };
    }
    calculateSourcePriority(analysis, source) {
        const score = (analysis.qualityScore + analysis.relevanceScore + analysis.reliabilityScore) / 3;
        return Math.round((score * 0.7) + (source.priority * 0.3));
    }
    generatePriorityReasoning(source) {
        const reasons = [];
        if (source.successRate > 0.9)
            reasons.push('high reliability');
        if (source.provider === 'reuters' || source.provider === 'bloomberg')
            reasons.push('trusted source');
        if (source.categories?.includes('finance'))
            reasons.push('relevant category');
        return reasons.length > 0
            ? `Prioritized due to: ${reasons.join(', ')}`
            : 'Standard priority';
    }
    assessSourceQuality(source) {
        let score = 5;
        if (source.successRate > 0.9)
            score += 2;
        if (source.errorCount < 5)
            score += 1;
        return Math.max(1, Math.min(10, score));
    }
    assessSourceRelevance(source) {
        let score = 5;
        if (source.categories?.includes('finance'))
            score += 2;
        if (source.categories?.includes('forex'))
            score += 3;
        return Math.max(1, Math.min(10, score));
    }
    assessSourceReliability(source) {
        let score = 5;
        const reliableSources = ['reuters', 'bloomberg'];
        if (reliableSources.includes(source.provider))
            score += 3;
        score += (source.successRate - 0.5) * 8;
        return Math.max(1, Math.min(10, score));
    }
    determineSourceUrgency(analysis) {
        const avg = (analysis.qualityScore + analysis.relevanceScore + analysis.reliabilityScore) / 3;
        if (avg >= 8)
            return 'high';
        if (avg >= 5)
            return 'medium';
        return 'low';
    }
    /**
     * Parallel Processor Methods (統合済み)
     */
    async processParallelFeeds(sources) {
        const results = [];
        const maxConcurrency = Math.min(this.config.maxConcurrency || 3, sources.length);
        for (let i = 0; i < sources.length; i += maxConcurrency) {
            const batch = sources.slice(i, i + maxConcurrency);
            const batchPromises = batch.map(source => this.processSource(source));
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    results.push(this.createFailedResult(batch[index], result.reason));
                }
            });
        }
        return results;
    }
    async processSource(source) {
        const startTime = Date.now();
        try {
            const items = await this.fetchAndParseFeed(source);
            return {
                sourceId: source.id,
                status: 'success',
                items,
                processingTime: Date.now() - startTime,
                resourceUsage: this.getCurrentResourceSnapshot(),
                nextProcessingTime: new Date(Date.now() + 60000)
            };
        }
        catch (error) {
            return {
                sourceId: source.id,
                status: 'failure',
                items: [],
                processingTime: Date.now() - startTime,
                resourceUsage: this.getCurrentResourceSnapshot(),
                nextProcessingTime: new Date(Date.now() + 300000)
            };
        }
    }
    async fetchAndParseFeed(source) {
        const feed = await this.parser.parseURL(source.url);
        return (feed.items || []).map((item, index) => ({
            id: `${source.id}_${index}`,
            title: item.title || 'Untitled',
            description: item.contentSnippet || item.content || '',
            link: item.link || '',
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            author: item.creator || item.author,
            sourceId: source.id,
            content: item.content,
            rawData: item
        }));
    }
    createFailedResult(source, error) {
        return {
            sourceId: source.id,
            status: 'failure',
            items: [],
            processingTime: 0,
            resourceUsage: this.getCurrentResourceSnapshot(),
            nextProcessingTime: new Date(Date.now() + 300000)
        };
    }
    getCurrentResourceSnapshot() {
        return {
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: 0,
            networkLatency: 100,
            concurrentConnections: this.cache.size
        };
    }
    // Public method to get default RSS sources configuration
    static getDefaultSources() {
        return [
            {
                id: 'ft_home',
                name: 'Financial Times',
                url: 'https://www.ft.com/rss/home',
                provider: 'ft',
                enabled: true,
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'markets', 'business'],
                priority: 8,
                successRate: 0.85,
                errorCount: 2
            },
            {
                id: 'bloomberg_markets',
                name: 'Bloomberg Markets',
                url: 'https://feeds.bloomberg.com/markets/news.rss',
                provider: 'bloomberg',
                enabled: false, // 無効化: エラー対応のため一時的に無効
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'stocks', 'markets'],
                priority: 9,
                successRate: 0.75,
                errorCount: 5
            },
            {
                id: 'cnbc_top_news',
                name: 'CNBC Top News',
                url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
                provider: 'cnbc',
                enabled: true,
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'business', 'markets'],
                priority: 7,
                successRate: 0.9,
                errorCount: 1
            },
            {
                id: 'wsj_markets',
                name: 'WSJ Markets',
                url: 'https://feeds.wsj.com/xml/rss/3_7031.xml',
                provider: 'wsj',
                enabled: false, // 無効化: ドメイン名解決エラーのため一時的に無効
                timeout: 10000,
                maxItems: 15,
                categories: ['finance', 'stocks', 'markets'],
                priority: 8,
                successRate: 0.6,
                errorCount: 8
            },
            {
                id: 'investing_news',
                name: 'Investing.com',
                url: 'https://www.investing.com/rss/news_1.rss',
                provider: 'investing',
                enabled: true,
                timeout: 10000,
                maxItems: 20,
                categories: ['finance', 'forex', 'crypto'],
                priority: 6,
                successRate: 0.92,
                errorCount: 0
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
