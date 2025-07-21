"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XPerformanceAnalyzer = void 0;
const playwright_1 = require("playwright");
class XPerformanceAnalyzer {
    browser = null;
    page = null;
    async initialize() {
        this.browser = await playwright_1.chromium.launch({ headless: true });
        this.page = await this.browser.newPage();
        // Set user agent to avoid detection
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
    }
    async cleanup() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    async analyzeAccountMetrics(username) {
        if (!this.page) {
            throw new Error('Analyzer not initialized. Call initialize() first.');
        }
        try {
            const profileUrl = `https://twitter.com/${username}`;
            await this.page.goto(profileUrl, { waitUntil: 'networkidle' });
            // Wait for profile to load
            await this.page.waitForSelector('[data-testid="UserName"]', { timeout: 10000 });
            // Extract follower count
            const followerCount = await this.extractFollowerCount();
            // Extract following count
            const followingCount = await this.extractFollowingCount();
            // Extract total tweets
            const totalTweets = await this.extractTotalTweets();
            // Check verification status
            const verificationStatus = await this.checkVerificationStatus();
            return {
                followers_count: followerCount,
                following_count: followingCount,
                tweet_count: totalTweets,
                listed_count: 0, // Will implement if needed
                last_updated: Date.now()
            };
        }
        catch (error) {
            console.error('Error analyzing account metrics:', error);
            throw error;
        }
    }
    async analyzeRecentPosts(username, limit = 10) {
        if (!this.page) {
            throw new Error('Analyzer not initialized. Call initialize() first.');
        }
        try {
            const profileUrl = `https://twitter.com/${username}`;
            await this.page.goto(profileUrl, { waitUntil: 'networkidle' });
            // Wait for tweets to load
            await this.page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
            const posts = [];
            const tweetElements = await this.page.$$('[data-testid="tweet"]');
            for (let i = 0; i < Math.min(tweetElements.length, limit); i++) {
                const tweet = tweetElements[i];
                try {
                    const postMetrics = await this.extractPostMetrics(tweet);
                    if (postMetrics) {
                        posts.push(postMetrics);
                    }
                }
                catch (error) {
                    console.warn(`Error extracting metrics for tweet ${i}:`, error);
                }
            }
            return posts;
        }
        catch (error) {
            console.error('Error analyzing recent posts:', error);
            throw error;
        }
    }
    async analyzeFollowerTrends(username) {
        // This would require historical data - for now, return current snapshot
        const accountMetrics = await this.analyzeAccountMetrics(username);
        return {
            currentCount: accountMetrics.followers_count,
            growthRate: 0, // Would need historical data
            growthTrend: 'stable',
            engagementQuality: 0 // Would calculate based on engagement vs follower ratio
        };
    }
    async calculateEngagementRate(posts) {
        if (posts.length === 0) {
            return {
                averageEngagementRate: 0,
                bestPerformingPost: {
                    postId: '',
                    content: '',
                    timestamp: '',
                    likes: 0,
                    retweets: 0,
                    replies: 0,
                    views: 0,
                    engagementRate: 0
                },
                engagementTrend: 'stable',
                optimalPostingTimes: []
            };
        }
        const totalEngagement = posts.reduce((sum, post) => sum + post.engagementRate, 0);
        const averageEngagementRate = totalEngagement / posts.length;
        const bestPerformingPost = posts.reduce((best, current) => current.engagementRate > best.engagementRate ? current : best);
        // Analyze posting times for patterns
        const postingHours = posts.map(post => {
            const date = new Date(post.timestamp);
            return date.getHours();
        });
        const hourCounts = postingHours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const optimalPostingTimes = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => `${hour}:00`);
        // Determine trend (simplified - would need historical data for accurate trend)
        const recentPosts = posts.slice(0, Math.floor(posts.length / 2));
        const olderPosts = posts.slice(Math.floor(posts.length / 2));
        const recentAvg = recentPosts.length > 0 ?
            recentPosts.reduce((sum, post) => sum + post.engagementRate, 0) / recentPosts.length : 0;
        const olderAvg = olderPosts.length > 0 ?
            olderPosts.reduce((sum, post) => sum + post.engagementRate, 0) / olderPosts.length : 0;
        let engagementTrend = 'stable';
        if (recentAvg > olderAvg * 1.1) {
            engagementTrend = 'increasing';
        }
        else if (recentAvg < olderAvg * 0.9) {
            engagementTrend = 'decreasing';
        }
        return {
            averageEngagementRate,
            bestPerformingPost,
            engagementTrend,
            optimalPostingTimes
        };
    }
    async performFullAnalysis(username) {
        await this.initialize();
        try {
            const accountMetrics = await this.analyzeAccountMetrics(username);
            const recentPosts = await this.analyzeRecentPosts(username);
            const engagement = await this.calculateEngagementRate(recentPosts);
            const followerMetrics = await this.analyzeFollowerTrends(username);
            // Generate recommendations based on analysis
            const recommendations = this.generateRecommendations(engagement, followerMetrics, recentPosts);
            return {
                accountMetrics,
                recentPosts,
                engagement,
                followerMetrics,
                analysisTimestamp: new Date().toISOString(),
                recommendations
            };
        }
        finally {
            await this.cleanup();
        }
    }
    async extractFollowerCount() {
        try {
            const followerElement = await this.page?.$('a[href$="/verified_followers"] span, a[href$="/followers"] span');
            if (followerElement) {
                const text = await followerElement.textContent();
                return this.parseCount(text || '0');
            }
            return 0;
        }
        catch {
            return 0;
        }
    }
    async extractFollowingCount() {
        try {
            const followingElement = await this.page?.$('a[href$="/following"] span');
            if (followingElement) {
                const text = await followingElement.textContent();
                return this.parseCount(text || '0');
            }
            return 0;
        }
        catch {
            return 0;
        }
    }
    async extractTotalTweets() {
        try {
            // Look for profile stats that might contain tweet count
            const elements = await this.page?.$$('div[data-testid="UserProfileHeader_Items"] span');
            if (elements) {
                for (const element of elements) {
                    const text = await element.textContent();
                    if (text && /\d/.test(text)) {
                        const count = this.parseCount(text);
                        if (count > 0)
                            return count;
                    }
                }
            }
            return 0;
        }
        catch {
            return 0;
        }
    }
    async checkVerificationStatus() {
        try {
            const verifiedElement = await this.page?.$('[data-testid="icon-verified"]');
            return verifiedElement !== null;
        }
        catch {
            return false;
        }
    }
    async extractPostMetrics(tweetElement) {
        try {
            // Extract post content
            const contentElement = await tweetElement.$('[data-testid="tweetText"]');
            const content = contentElement ? await contentElement.textContent() : '';
            // Extract engagement metrics
            const likes = await this.extractMetricFromTweet(tweetElement, 'like');
            const retweets = await this.extractMetricFromTweet(tweetElement, 'retweet');
            const replies = await this.extractMetricFromTweet(tweetElement, 'reply');
            // Extract timestamp
            const timeElement = await tweetElement.$('time');
            const timestamp = timeElement ? await timeElement.getAttribute('datetime') : new Date().toISOString();
            // Calculate engagement rate (simplified)
            const totalEngagement = likes + retweets + replies;
            const views = Math.max(totalEngagement * 10, 100); // Estimated views
            const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;
            return {
                postId: `tweet_${timestamp}`,
                content: content || '',
                timestamp: timestamp || new Date().toISOString(),
                likes,
                retweets,
                replies,
                views,
                engagementRate
            };
        }
        catch (error) {
            console.warn('Error extracting post metrics:', error);
            return null;
        }
    }
    async extractMetricFromTweet(tweetElement, type) {
        try {
            const selector = `[data-testid="${type}"]`;
            const element = await tweetElement.$(selector);
            if (element) {
                const text = await element.textContent();
                return this.parseCount(text || '0');
            }
            return 0;
        }
        catch {
            return 0;
        }
    }
    parseCount(text) {
        const cleanText = text.replace(/[^\d.KMB]/gi, '');
        const number = parseFloat(cleanText);
        if (text.includes('K'))
            return Math.floor(number * 1000);
        if (text.includes('M'))
            return Math.floor(number * 1000000);
        if (text.includes('B'))
            return Math.floor(number * 1000000000);
        return Math.floor(number) || 0;
    }
    generateRecommendations(engagement, followerMetrics, recentPosts) {
        const recommendations = [];
        // Engagement-based recommendations
        if ((engagement.averageEngagementRate || 0) < 2) {
            recommendations.push('エンゲージメント率が低めです。より魅力的なコンテンツの作成を検討してください。');
        }
        if (engagement.engagementTrend === 'decreasing') {
            recommendations.push('エンゲージメントが減少傾向にあります。コンテンツ戦略の見直しが必要です。');
        }
        // Posting time recommendations
        if ((engagement.optimalPostingTimes?.length || 0) > 0) {
            recommendations.push(`最適な投稿時間: ${engagement.optimalPostingTimes?.join(', ') || 'データなし'}`);
        }
        // Content recommendations based on best performing post
        if ((engagement.bestPerformingPost?.engagementRate || 0) > (engagement.averageEngagementRate || 0) * 1.5) {
            recommendations.push('高パフォーマンス投稿のパターンを分析し、類似コンテンツの作成を検討してください。');
        }
        // General recommendations
        if (recentPosts.length < 5) {
            recommendations.push('投稿頻度を増やすことでエンゲージメント向上が期待できます。');
        }
        return recommendations;
    }
}
exports.XPerformanceAnalyzer = XPerformanceAnalyzer;
