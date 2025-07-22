export class MetricsCollector {
    metricsHistory = new Map();
    async collectAccountMetrics(username, metrics) {
        const timestamp = new Date().toISOString();
        const dataPoint = {
            ...metrics,
            timestamp,
            username
        };
        const key = `account_${username}`;
        if (!this.metricsHistory.has(key)) {
            this.metricsHistory.set(key, []);
        }
        this.metricsHistory.get(key).push(dataPoint);
        await this.persistMetrics(key, dataPoint);
    }
    async collectPostMetrics(username, posts) {
        const timestamp = new Date().toISOString();
        const dataPoint = {
            posts,
            timestamp,
            username,
            totalPosts: posts.length,
            averageEngagement: posts.reduce((sum, post) => sum + post.engagementRate, 0) / posts.length
        };
        const key = `posts_${username}`;
        if (!this.metricsHistory.has(key)) {
            this.metricsHistory.set(key, []);
        }
        this.metricsHistory.get(key).push(dataPoint);
        await this.persistMetrics(key, dataPoint);
    }
    async collectFollowerMetrics(username, metrics) {
        const timestamp = new Date().toISOString();
        const dataPoint = {
            ...metrics,
            timestamp,
            username
        };
        const key = `followers_${username}`;
        if (!this.metricsHistory.has(key)) {
            this.metricsHistory.set(key, []);
        }
        this.metricsHistory.get(key).push(dataPoint);
        await this.persistMetrics(key, dataPoint);
    }
    async getMetricsHistory(username, type, days = 30) {
        const key = `${type}_${username}`;
        // Try to load from persistent storage first
        await this.loadMetricsFromStorage(key);
        const history = this.metricsHistory.get(key) || [];
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return history.filter(item => new Date(item.timestamp) > cutoffDate);
    }
    async calculateGrowthRate(username, metric, days = 7) {
        const accountHistory = await this.getMetricsHistory(username, 'account', days);
        if (accountHistory.length < 2)
            return 0;
        const latest = accountHistory[accountHistory.length - 1];
        const oldest = accountHistory[0];
        const latestValue = latest[metric] || 0;
        const oldestValue = oldest[metric] || 0;
        if (oldestValue === 0)
            return 0;
        return ((latestValue - oldestValue) / oldestValue) * 100;
    }
    async calculateEngagementTrend(username, days = 14) {
        const postsHistory = await this.getMetricsHistory(username, 'posts', days);
        if (postsHistory.length < 2)
            return 'stable';
        const midpoint = Math.floor(postsHistory.length / 2);
        const recentPeriod = postsHistory.slice(midpoint);
        const olderPeriod = postsHistory.slice(0, midpoint);
        const recentAvg = recentPeriod.reduce((sum, item) => sum + item.averageEngagement, 0) / recentPeriod.length;
        const olderAvg = olderPeriod.reduce((sum, item) => sum + item.averageEngagement, 0) / olderPeriod.length;
        const threshold = 0.1; // 10% threshold for trend detection
        if (recentAvg > olderAvg * (1 + threshold))
            return 'increasing';
        if (recentAvg < olderAvg * (1 - threshold))
            return 'decreasing';
        return 'stable';
    }
    async getBestPerformingTimeSlots(username, days = 30) {
        const postsHistory = await this.getMetricsHistory(username, 'posts', days);
        const timeSlotPerformance = new Map();
        postsHistory.forEach(session => {
            session.posts.forEach((post) => {
                const hour = new Date(post.timestamp).getHours();
                const timeSlot = `${hour}:00-${hour + 1}:00`;
                const current = timeSlotPerformance.get(timeSlot) || { total: 0, count: 0 };
                timeSlotPerformance.set(timeSlot, {
                    total: current.total + post.engagementRate,
                    count: current.count + 1
                });
            });
        });
        const averages = Array.from(timeSlotPerformance.entries())
            .map(([timeSlot, data]) => ({
            timeSlot,
            average: data.total / data.count
        }))
            .sort((a, b) => b.average - a.average);
        return averages.slice(0, 3).map(item => item.timeSlot);
    }
    async generateOptimizationInsights(username) {
        const insights = [];
        try {
            // Growth rate analysis
            const followerGrowthRate = await this.calculateGrowthRate(username, 'followers_count', 7);
            if (followerGrowthRate < 0) {
                insights.push('フォロワー数が減少傾向にあります。コンテンツ戦略の見直しを検討してください。');
            }
            else if (followerGrowthRate > 5) {
                insights.push('フォロワー成長が好調です。現在の戦略を継続してください。');
            }
            // Engagement trend analysis
            const engagementTrend = await this.calculateEngagementTrend(username, 14);
            if (engagementTrend === 'decreasing') {
                insights.push('エンゲージメント率が低下しています。より魅力的なコンテンツの作成を心がけてください。');
            }
            else if (engagementTrend === 'increasing') {
                insights.push('エンゲージメント率が向上しています。現在のコンテンツ方向性が効果的です。');
            }
            // Optimal posting times
            const bestTimes = await this.getBestPerformingTimeSlots(username, 30);
            if (bestTimes.length > 0) {
                insights.push(`最適な投稿時間帯は ${bestTimes.join(', ')} です。`);
            }
            // Posting frequency analysis
            const recentPosts = await this.getMetricsHistory(username, 'posts', 7);
            if (recentPosts.length < 3) {
                insights.push('投稿頻度を増やすことで、より多くのエンゲージメントが期待できます。');
            }
        }
        catch (error) {
            console.warn('最適化インサイトの生成中にエラーが発生:', error);
        }
        return insights;
    }
    async persistMetrics(key, dataPoint) {
        const fs = (await import('fs/promises')).default;
        const path = (await import('path')).default;
        try {
            const metricsDir = path.join(process.cwd(), 'data', 'metrics-history');
            const filePath = path.join(metricsDir, `${key}.json`);
            let history = [];
            try {
                const existingData = await fs.readFile(filePath, 'utf-8');
                history = JSON.parse(existingData);
            }
            catch {
                // File doesn't exist, start with empty array
            }
            history.push(dataPoint);
            // Keep only last 1000 data points to manage file size
            if (history.length > 1000) {
                history = history.slice(-1000);
            }
            await fs.mkdir(metricsDir, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(history, null, 2));
        }
        catch (error) {
            console.error(`メトリクス保存エラー (${key}):`, error);
        }
    }
    async loadMetricsFromStorage(key) {
        const fs = (await import('fs/promises')).default;
        const path = (await import('path')).default;
        try {
            const metricsDir = path.join(process.cwd(), 'data', 'metrics-history');
            const filePath = path.join(metricsDir, `${key}.json`);
            const data = await fs.readFile(filePath, 'utf-8');
            const history = JSON.parse(data);
            this.metricsHistory.set(key, history);
        }
        catch (error) {
            // File doesn't exist or is corrupted, keep empty array
            if (!this.metricsHistory.has(key)) {
                this.metricsHistory.set(key, []);
            }
        }
    }
    async cleanup(olderThanDays = 90) {
        const fs = (await import('fs/promises')).default;
        const path = (await import('path')).default;
        let cleanedCount = 0;
        try {
            const metricsDir = path.join(process.cwd(), 'data', 'metrics-history');
            const files = await fs.readdir(metricsDir);
            const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                const filePath = path.join(metricsDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                const history = JSON.parse(data);
                const filteredHistory = history.filter((item) => new Date(item.timestamp) > cutoffDate);
                if (filteredHistory.length !== history.length) {
                    await fs.writeFile(filePath, JSON.stringify(filteredHistory, null, 2));
                    cleanedCount++;
                }
            }
        }
        catch (error) {
            console.error('メトリクス履歴のクリーンアップエラー:', error);
        }
        return cleanedCount;
    }
    getCollectedMetricsCount() {
        const counts = {};
        this.metricsHistory.forEach((history, key) => {
            counts[key] = history.length;
        });
        return counts;
    }
}
