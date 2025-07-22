import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { DEFAULT_EXPLORATION_CONFIG, CollectionMethod, EXPLORATION_SEEDS } from '../types/exploration-types';
import { LinkEvaluator } from './exploration/link-evaluator';
import { ContentAnalyzer } from './exploration/content-analyzer';
export class AutonomousExplorationEngine {
    linkEvaluator;
    contentAnalyzer;
    config;
    stats;
    startTime;
    visitedUrls;
    errors;
    constructor(config = {}) {
        this.linkEvaluator = new LinkEvaluator();
        this.contentAnalyzer = new ContentAnalyzer();
        this.config = { ...DEFAULT_EXPLORATION_CONFIG, ...config };
        this.stats = this.initializeStats();
        this.startTime = Date.now();
        this.visitedUrls = new Set();
        this.errors = [];
    }
    initializeStats() {
        return {
            totalRequestsMade: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalBytesDownloaded: 0,
            memoryUsage: 0
        };
    }
    async exploreFromSeed(seedUrl, maxDepth = 2) {
        console.log(`Starting exploration from ${seedUrl} with max depth ${maxDepth}`);
        try {
            const contentResults = [];
            let totalLinksDiscovered = 0;
            await this.exploreRecursively({ url: seedUrl, text: 'Seed URL', score: { relevanceScore: 100, noveltyScore: 80, depthValue: 90, urgencyScore: 70 }, priority: 100 }, 0, maxDepth, contentResults);
            const finalStats = this.calculateFinalStats();
            return {
                seedUrl,
                totalLinksDiscovered,
                exploredLinks: this.visitedUrls.size,
                contentResults,
                executionTime: Date.now() - this.startTime,
                explorationStats: finalStats,
                errors: this.errors
            };
        }
        catch (error) {
            this.errors.push(`Exploration failed: ${error}`);
            throw error;
        }
    }
    async exploreRecursively(link, currentDepth, maxDepth, contentResults) {
        if (currentDepth >= maxDepth)
            return;
        if (this.visitedUrls.has(link.url))
            return;
        if (Date.now() - this.startTime > this.config.maxExplorationTime)
            return;
        this.visitedUrls.add(link.url);
        try {
            const pageContent = await this.fetchPageContent(link.url);
            const fxContent = this.contentAnalyzer.extractFXContent(pageContent, link.url);
            if (fxContent.confidence >= this.config.minRelevanceScore) {
                const qualityMetrics = this.contentAnalyzer.evaluateContentQuality(pageContent);
                const postingValue = this.contentAnalyzer.assessPostingValue(fxContent);
                const contentResult = {
                    url: link.url,
                    depth: currentDepth,
                    content: fxContent,
                    collectionMethod: CollectionMethod.SIMPLE_HTTP,
                    explorationPath: this.buildExplorationPath(link.url, currentDepth),
                    qualityMetrics,
                    postingValue
                };
                contentResults.push(contentResult);
                console.log(`✅ Content collected from ${link.url} (confidence: ${fxContent.confidence})`);
            }
            if (currentDepth < maxDepth - 1) {
                const discoveredLinks = await this.discoverLinks(pageContent, link.url);
                const interestingLinks = await this.selectInterestingLinks(discoveredLinks);
                for (const interestingLink of interestingLinks.slice(0, 3)) {
                    await this.delay(this.config.delayBetweenRequests);
                    await this.exploreRecursively(interestingLink, currentDepth + 1, maxDepth, contentResults);
                }
            }
        }
        catch (error) {
            const errorMsg = `Failed to explore ${link.url}: ${error}`;
            this.errors.push(errorMsg);
            console.warn(errorMsg);
        }
    }
    async discoverLinks(pageContent, currentUrl) {
        const $ = cheerio.load(pageContent);
        const links = [];
        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            const title = $(element).attr('title') || '';
            if (href && text && this.isValidLink(href, currentUrl)) {
                const absoluteUrl = this.resolveUrl(href, currentUrl);
                if (absoluteUrl && !this.visitedUrls.has(absoluteUrl)) {
                    links.push({
                        url: absoluteUrl,
                        text,
                        title,
                        description: title
                    });
                }
            }
        });
        const rankedLinks = this.linkEvaluator.rankLinksByPriority(links);
        return rankedLinks.filter(link => link.priority >= 40);
    }
    async selectInterestingLinks(links) {
        const minScore = this.config.minRelevanceScore * 0.6;
        // EvaluatedLinkをRankedLinkに変換
        const rankedLinks = links.map((link, index) => ({
            ...link,
            rank: index + 1
        }));
        const filteredLinks = this.linkEvaluator.filterByMinimumScore(rankedLinks, minScore);
        return this.linkEvaluator.selectTopLinks(filteredLinks, 5);
    }
    async fetchPageContent(url) {
        const requestStart = Date.now();
        try {
            this.stats.totalRequestsMade++;
            const response = await axios.get(url, {
                timeout: this.config.requestTimeout,
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                maxRedirects: 3,
                validateStatus: (status) => status < 400
            });
            const responseTime = Date.now() - requestStart;
            this.updateStats(response, responseTime);
            this.stats.successfulRequests++;
            console.log(`✅ Fetched ${url} (${responseTime}ms, ${response.data.length} bytes)`);
            return response.data;
        }
        catch (error) {
            this.stats.failedRequests++;
            const errorMsg = `Failed to fetch ${url}: ${error}`;
            console.warn(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }
    updateStats(response, responseTime) {
        this.stats.totalBytesDownloaded += response.data.length;
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime) / this.stats.successfulRequests;
        this.stats.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    }
    isValidLink(href, currentUrl) {
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
            return false;
        }
        const excludeExtensions = ['.pdf', '.jpg', '.png', '.gif', '.zip', '.mp4', '.mp3'];
        const hasExcludedExtension = excludeExtensions.some(ext => href.toLowerCase().endsWith(ext));
        if (hasExcludedExtension)
            return false;
        try {
            const absoluteUrl = this.resolveUrl(href, currentUrl);
            if (!absoluteUrl)
                return false;
            const url = new URL(absoluteUrl);
            const allowedDomains = ['minkabu.jp', 'diamond.jp', 'reuters.com', 'nikkei.com'];
            return allowedDomains.some(domain => url.hostname.includes(domain));
        }
        catch (error) {
            return false;
        }
    }
    resolveUrl(href, baseUrl) {
        try {
            if (href.startsWith('http://') || href.startsWith('https://')) {
                return href;
            }
            const base = new URL(baseUrl);
            const resolved = new URL(href, base);
            return resolved.href;
        }
        catch (error) {
            return null;
        }
    }
    buildExplorationPath(url, depth) {
        const path = [`depth-${depth}`];
        try {
            const urlObj = new URL(url);
            path.push(urlObj.hostname);
            path.push(urlObj.pathname.split('/').filter(segment => segment).join('/'));
        }
        catch (error) {
            path.push('unknown');
        }
        return path;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    calculateFinalStats() {
        return {
            ...this.stats,
            averageResponseTime: Math.round(this.stats.averageResponseTime),
            totalBytesDownloaded: Math.round(this.stats.totalBytesDownloaded),
            memoryUsage: Math.round(this.stats.memoryUsage)
        };
    }
    selectOptimalMethod(url) {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('reuters.com')) {
                return CollectionMethod.PLAYWRIGHT_LIGHT;
            }
            if (urlObj.hostname.includes('nikkei.com')) {
                return CollectionMethod.PLAYWRIGHT_LIGHT;
            }
            return CollectionMethod.SIMPLE_HTTP;
        }
        catch (error) {
            return CollectionMethod.SIMPLE_HTTP;
        }
    }
    async exploreFromPredefinedSeed(seedName) {
        const seed = EXPLORATION_SEEDS[seedName];
        if (!seed) {
            throw new Error(`Unknown seed: ${seedName}`);
        }
        console.log(`🚀 Starting exploration from predefined seed: ${seedName}`);
        console.log(`📍 URL: ${seed.url}`);
        console.log(`📊 Max depth: ${seed.depth}`);
        console.log(`🔍 Interest keywords: ${seed.interestKeywords.join(', ')}`);
        return this.exploreFromSeed(seed.url, seed.depth);
    }
    getExplorationStats() {
        return this.calculateFinalStats();
    }
    getVisitedUrls() {
        return Array.from(this.visitedUrls);
    }
    getErrors() {
        return [...this.errors];
    }
    resetExploration() {
        this.stats = this.initializeStats();
        this.startTime = Date.now();
        this.visitedUrls = new Set();
        this.errors = [];
    }
}
