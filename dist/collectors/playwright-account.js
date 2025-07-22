/**
 * Playwright Account Analyzer - 自アカウント分析専用コレクター
 * 疎結合設計完全準拠・実データ収集専用
 */
import { BaseCollector } from './base-collector.js';
// Minimal PlaywrightBrowserManager replacement
class PlaywrightBrowserManager {
    async getContext() {
        console.log('🚫 [Playwright] ブラウザー機能は無効化されています');
        return null;
    }
    async cleanup() {
        // No-op cleanup
    }
}
// Minimal SimpleXClient replacement
class SimpleXClient {
    static getInstance() {
        return new SimpleXClient();
    }
    async getAccountInfo() {
        console.log('🚫 [Xアカウント] アカウント情報取得は無効化されています');
        return null;
    }
}
/**
 * PlaywrightAccountCollector
 * 自アカウント分析専用のPlaywrightベースデータ収集器
 */
export class PlaywrightAccountCollector extends BaseCollector {
    SOURCE_TYPE = 'playwright-account';
    playwrightManager;
    xClient;
    accountConfig;
    constructor(config) {
        super(config);
        this.accountConfig = config;
        this.playwrightManager = PlaywrightBrowserManager.getInstance();
        this.xClient = SimpleXClient.getInstance();
        // 設定検証
        if (!this.validateAccountConfig(config)) {
            throw new Error('Invalid PlaywrightAccountConfig provided');
        }
    }
    // === BaseCollector必須実装メソッド ===
    /**
     * メインの収集メソッド - 統一インターフェース
     */
    async collect(config) {
        if (!this.isEnabled()) {
            return this.createDisabledResult();
        }
        const startTime = Date.now();
        try {
            return await this.executeWithTimeout(async () => {
                return await this.executeWithRetry(async () => {
                    const analysisData = [];
                    // 各分析メトリクスを実行
                    if (this.accountConfig.metrics.includes('posts')) {
                        const postsData = await this.analyzeOwnPosts();
                        analysisData.push(...postsData);
                    }
                    if (this.accountConfig.metrics.includes('engagement')) {
                        const engagementData = await this.analyzeEngagement();
                        analysisData.push(...engagementData);
                    }
                    if (this.accountConfig.metrics.includes('followers')) {
                        const followerData = await this.analyzeFollowerTrends();
                        analysisData.push(...followerData);
                    }
                    if (this.accountConfig.metrics.includes('timing')) {
                        const timingData = await this.analyzeOptimalTiming();
                        analysisData.push(...timingData);
                    }
                    const processingTime = Date.now() - startTime;
                    const quality = this.calculateAnalysisQuality(analysisData);
                    return {
                        source: this.SOURCE_TYPE,
                        data: analysisData,
                        metadata: {
                            ...this.createMetadata(this.SOURCE_TYPE, analysisData.length, processingTime),
                            quality,
                            accountId: this.accountConfig.username || 'self',
                            analysisDepth: this.accountConfig.analysisDepth
                        },
                        success: true
                    };
                });
            });
        }
        catch (error) {
            console.error('[PlaywrightAccount] Analysis failed:', error);
            return this.handleError(error, this.SOURCE_TYPE);
        }
    }
    /**
     * データソース種別
     */
    getSourceType() {
        return this.SOURCE_TYPE;
    }
    /**
     * データソース独立性 - 可用性確認
     */
    async isAvailable() {
        try {
            // Playwrightブラウザマネージャーの可用性確認
            const browserStats = this.playwrightManager.getSessionStats();
            // X APIクライアントの認証確認
            const accountInfo = await this.xClient.getMyAccountInfo();
            return !!(browserStats && accountInfo);
        }
        catch (error) {
            console.warn('[PlaywrightAccount] Availability check failed:', error);
            return false;
        }
    }
    /**
     * 意思決定分岐容易性 - 収集判定
     */
    shouldCollect(context) {
        if (!this.isEnabled())
            return false;
        // 自アカウント分析は常時有効（ただしレート制限考慮）
        const lastAnalysis = context?.lastAccountAnalysis || 0;
        const minInterval = 60 * 60 * 1000; // 1時間間隔
        return (Date.now() - lastAnalysis) > minInterval;
    }
    /**
     * 意思決定分岐容易性 - 優先度
     */
    getPriority() {
        return this.accountConfig.priority || 7; // 中程度の優先度
    }
    // === 自アカウント分析機能実装 ===
    /**
     * 自アカウント投稿履歴分析
     */
    async analyzeOwnPosts() {
        const sessionId = `account-posts-${Date.now()}`;
        let context = null;
        try {
            // X APIから最近の投稿を取得
            const recentTweets = await this.xClient.getMyRecentTweets(this.accountConfig.analysisDepth);
            if (recentTweets.length === 0) {
                return [{
                        type: 'post_history',
                        accountId: this.accountConfig.username || 'self',
                        data: { message: 'No recent posts found', posts: [] },
                        analysisTime: new Date().toISOString(),
                        quality: 0.3
                    }];
            }
            // Playwright使用時のみブラウザセッション使用
            context = await this.playwrightManager.acquireContext(sessionId);
            const analyzedPosts = await this.processPostsWithPlaywright(context, recentTweets);
            return [{
                    type: 'post_history',
                    accountId: this.accountConfig.username || 'self',
                    data: {
                        totalPosts: recentTweets.length,
                        analyzedPosts,
                        analysisDepth: this.accountConfig.analysisDepth
                    },
                    analysisTime: new Date().toISOString(),
                    quality: this.calculatePostAnalysisQuality(analyzedPosts)
                }];
        }
        catch (error) {
            console.error('[PlaywrightAccount] Post analysis failed:', error);
            return [{
                    type: 'post_history',
                    accountId: this.accountConfig.username || 'self',
                    data: { error: error instanceof Error ? error.message : 'Unknown error' },
                    analysisTime: new Date().toISOString(),
                    quality: 0.1
                }];
        }
        finally {
            if (context) {
                await this.playwrightManager.releaseContext(sessionId);
            }
        }
    }
    /**
     * エンゲージメント分析
     */
    async analyzeEngagement() {
        try {
            const recentTweets = await this.xClient.getMyRecentTweets(Math.min(this.accountConfig.analysisDepth, 10));
            if (recentTweets.length === 0) {
                return [{
                        type: 'engagement',
                        accountId: this.accountConfig.username || 'self',
                        data: { message: 'No tweets for engagement analysis' },
                        analysisTime: new Date().toISOString(),
                        quality: 0.2
                    }];
            }
            const tweetIds = recentTweets.map(tweet => tweet.id);
            const engagementMetrics = await this.xClient.getEngagementMetrics(tweetIds);
            const analysis = this.analyzeEngagementPatterns(engagementMetrics);
            return [{
                    type: 'engagement',
                    accountId: this.accountConfig.username || 'self',
                    data: {
                        totalTweetsAnalyzed: tweetIds.length,
                        metrics: engagementMetrics,
                        patterns: analysis,
                        averageEngagementRate: this.calculateAverageEngagementRate(engagementMetrics)
                    },
                    analysisTime: new Date().toISOString(),
                    quality: this.calculateEngagementQuality(engagementMetrics)
                }];
        }
        catch (error) {
            console.error('[PlaywrightAccount] Engagement analysis failed:', error);
            return [{
                    type: 'engagement',
                    accountId: this.accountConfig.username || 'self',
                    data: { error: error instanceof Error ? error.message : 'Unknown error' },
                    analysisTime: new Date().toISOString(),
                    quality: 0.1
                }];
        }
    }
    /**
     * フォロワー動向分析
     */
    async analyzeFollowerTrends() {
        try {
            const accountInfo = await this.xClient.getMyAccountInfo();
            // 簡易的なフォロワー分析（実データベース）
            const followerTrends = {
                currentFollowers: accountInfo.followers_count,
                followingCount: accountInfo.following_count,
                tweetCount: accountInfo.tweet_count,
                ratio: accountInfo.followers_count / Math.max(accountInfo.following_count, 1),
                lastUpdated: new Date(accountInfo.last_updated).toISOString()
            };
            return [{
                    type: 'follower_trends',
                    accountId: this.accountConfig.username || accountInfo.username,
                    data: {
                        accountMetrics: accountInfo,
                        trends: followerTrends,
                        analysis: this.analyzeFollowerGrowthPattern(followerTrends)
                    },
                    analysisTime: new Date().toISOString(),
                    quality: 0.8 // リアルタイムデータのため高品質
                }];
        }
        catch (error) {
            console.error('[PlaywrightAccount] Follower analysis failed:', error);
            return [{
                    type: 'follower_trends',
                    accountId: this.accountConfig.username || 'self',
                    data: { error: error instanceof Error ? error.message : 'Unknown error' },
                    analysisTime: new Date().toISOString(),
                    quality: 0.1
                }];
        }
    }
    /**
     * 最適投稿時間分析
     */
    async analyzeOptimalTiming() {
        try {
            const recentTweets = await this.xClient.getMyRecentTweets(this.accountConfig.analysisDepth);
            const tweetIds = recentTweets.map(tweet => tweet.id);
            const engagementMetrics = await this.xClient.getEngagementMetrics(tweetIds);
            const timingAnalysis = this.analyzePostingTiming(recentTweets, engagementMetrics);
            return [{
                    type: 'optimal_timing',
                    accountId: this.accountConfig.username || 'self',
                    data: {
                        totalTweetsAnalyzed: recentTweets.length,
                        timingPatterns: timingAnalysis.patterns,
                        optimalTimes: timingAnalysis.optimalTimes,
                        recommendations: timingAnalysis.recommendations
                    },
                    analysisTime: new Date().toISOString(),
                    quality: this.calculateTimingAnalysisQuality(timingAnalysis)
                }];
        }
        catch (error) {
            console.error('[PlaywrightAccount] Timing analysis failed:', error);
            return [{
                    type: 'optimal_timing',
                    accountId: this.accountConfig.username || 'self',
                    data: { error: error instanceof Error ? error.message : 'Unknown error' },
                    analysisTime: new Date().toISOString(),
                    quality: 0.1
                }];
        }
    }
    // === 分析サポートメソッド ===
    /**
     * Playwrightでの投稿内容処理
     */
    async processPostsWithPlaywright(context, tweets) {
        // Playwrightを使用した拡張分析（実装簡易版）
        return tweets.map(tweet => ({
            id: tweet.id,
            text: tweet.text,
            created_at: tweet.created_at,
            public_metrics: tweet.public_metrics,
            analysis: {
                textLength: tweet.text.length,
                hasHashtags: tweet.text.includes('#'),
                hasUrls: tweet.text.includes('http'),
                sentiment: this.analyzeSentiment(tweet.text)
            }
        }));
    }
    /**
     * エンゲージメントパターン分析
     */
    analyzeEngagementPatterns(metrics) {
        if (metrics.length === 0)
            return { message: 'No metrics to analyze' };
        const totalEngagement = metrics.reduce((sum, m) => sum + (m.likes || 0) + (m.retweets || 0) + (m.replies || 0), 0);
        return {
            totalEngagement,
            averageLikes: this.calculateAverage(metrics, 'likes'),
            averageRetweets: this.calculateAverage(metrics, 'retweets'),
            averageReplies: this.calculateAverage(metrics, 'replies'),
            bestPerformingTweet: this.findBestPerformingTweet(metrics)
        };
    }
    /**
     * フォロワー成長パターン分析
     */
    analyzeFollowerGrowthPattern(trends) {
        return {
            followerToFollowingRatio: trends.ratio,
            ratioCategory: trends.ratio > 10 ? 'high_influence' :
                trends.ratio > 1 ? 'balanced' : 'building_audience',
            tweetsPerFollower: trends.tweetCount / Math.max(trends.currentFollowers, 1),
            accountActivity: trends.tweetCount > 1000 ? 'very_active' :
                trends.tweetCount > 100 ? 'active' : 'growing'
        };
    }
    /**
     * 投稿タイミング分析
     */
    analyzePostingTiming(tweets, metrics) {
        const tweetTimes = tweets.map(tweet => {
            const date = new Date(tweet.created_at || '');
            return {
                hour: date.getHours(),
                dayOfWeek: date.getDay(),
                engagement: metrics.find(m => m.tweetId === tweet.id)?.engagementRate || 0
            };
        });
        const hourlyEngagement = this.groupByHour(tweetTimes);
        const optimalHours = this.findOptimalHours(hourlyEngagement);
        return {
            patterns: hourlyEngagement,
            optimalTimes: optimalHours,
            recommendations: this.generateTimingRecommendations(optimalHours)
        };
    }
    // === ユーティリティメソッド ===
    validateAccountConfig(config) {
        return !!(config &&
            Array.isArray(config.metrics) &&
            config.metrics.length > 0 &&
            typeof config.analysisDepth === 'number' &&
            config.analysisDepth > 0);
    }
    createDisabledResult() {
        return {
            source: this.SOURCE_TYPE,
            data: [],
            metadata: this.createMetadata(this.SOURCE_TYPE, 0),
            success: false,
            error: 'Collector is disabled'
        };
    }
    calculateAnalysisQuality(data) {
        if (data.length === 0)
            return 0;
        const avgQuality = data.reduce((sum, item) => sum + item.quality, 0) / data.length;
        return Math.round(avgQuality * 100) / 100;
    }
    calculatePostAnalysisQuality(posts) {
        if (posts.length === 0)
            return 0.1;
        const hasMetrics = posts.some(p => p.public_metrics);
        const hasAnalysis = posts.some(p => p.analysis);
        return (hasMetrics ? 0.5 : 0.2) + (hasAnalysis ? 0.3 : 0.1);
    }
    calculateEngagementQuality(metrics) {
        if (metrics.length === 0)
            return 0.1;
        const validMetrics = metrics.filter(m => m.engagementRate !== undefined && m.engagementRate > 0);
        return Math.min(validMetrics.length / metrics.length, 1.0);
    }
    calculateTimingAnalysisQuality(analysis) {
        return analysis.optimalTimes && analysis.optimalTimes.length > 0 ? 0.8 : 0.3;
    }
    calculateAverageEngagementRate(metrics) {
        if (metrics.length === 0)
            return 0;
        const rates = metrics.map(m => m.engagementRate || 0);
        return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    }
    calculateAverage(metrics, field) {
        if (metrics.length === 0)
            return 0;
        const values = metrics.map(m => m[field] || 0);
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    findBestPerformingTweet(metrics) {
        if (metrics.length === 0)
            return null;
        return metrics.reduce((best, current) => (current.engagementRate || 0) > (best.engagementRate || 0) ? current : best);
    }
    analyzeSentiment(text) {
        // 簡易センチメント分析
        const positiveWords = ['良い', '素晴らしい', '最高', '成功', '利益', '上昇'];
        const negativeWords = ['悪い', '最悪', '失敗', '損失', '下落', '危険'];
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;
        if (positiveCount > negativeCount)
            return 'positive';
        if (negativeCount > positiveCount)
            return 'negative';
        return 'neutral';
    }
    groupByHour(tweetTimes) {
        const hourlyData = {};
        tweetTimes.forEach(tweet => {
            if (!hourlyData[tweet.hour]) {
                hourlyData[tweet.hour] = { count: 0, totalEngagement: 0 };
            }
            hourlyData[tweet.hour].count++;
            hourlyData[tweet.hour].totalEngagement += tweet.engagement;
        });
        return hourlyData;
    }
    findOptimalHours(hourlyEngagement) {
        const hours = Object.keys(hourlyEngagement).map(Number);
        const avgEngagements = hours.map(hour => ({
            hour,
            avgEngagement: hourlyEngagement[hour].totalEngagement / hourlyEngagement[hour].count
        }));
        return avgEngagements
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 3)
            .map(item => item.hour);
    }
    generateTimingRecommendations(optimalHours) {
        if (optimalHours.length === 0)
            return ['データが不足しています'];
        return [
            `最適投稿時間: ${optimalHours.map(h => `${h}:00`).join(', ')}`,
            `エンゲージメントが高い時間帯を狙いましょう`,
            `継続的な分析でパターンを最適化してください`
        ];
    }
}
