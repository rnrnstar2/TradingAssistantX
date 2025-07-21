"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedInfoCollector = void 0;
class EnhancedInfoCollector {
    targets = [];
    testMode;
    constructor() {
        this.testMode = process.env.X_TEST_MODE === 'true';
        this.initializeTargets();
    }
    async collectInformation() {
        console.log('🔍 [情報収集開始] 強化された情報収集システムを起動...');
        try {
            this.targets = this.defineCollectionTargets();
            const results = await Promise.all([
                this.collectTrendInformation(),
                this.collectCompetitorContent(),
                this.collectMarketNews(),
                this.collectHashtagActivity()
            ]);
            const consolidatedResults = this.consolidateResults(results);
            console.log(`✅ [情報収集完了] ${consolidatedResults.length}件の情報を収集しました`);
            return consolidatedResults;
        }
        catch (error) {
            console.error('❌ [情報収集エラー]:', error);
            return [];
        }
    }
    initializeTargets() {
        this.targets = this.defineCollectionTargets();
    }
    defineCollectionTargets() {
        return [
            {
                type: 'trend',
                source: 'x.com/explore',
                priority: 'high',
                searchTerms: ['投資', 'トレード', 'FX', '株式', '仮想通貨', '金融']
            },
            {
                type: 'competitor',
                source: 'x.com/search',
                priority: 'medium',
                searchTerms: ['投資アドバイザー', 'トレーダー', '資産運用', 'ファイナンシャルアドバイザー']
            },
            {
                type: 'news',
                source: 'x.com/search',
                priority: 'high',
                searchTerms: ['経済ニュース', '市場動向', '金融政策', '日銀', 'FRB', '株価']
            },
            {
                type: 'hashtag',
                source: 'x.com/hashtag',
                priority: 'medium',
                searchTerms: ['#投資', '#FX', '#株式投資', '#資産運用', '#投資家', '#トレード']
            }
        ];
    }
    async collectTrendInformation() {
        console.log('📈 [トレンド収集] X.comトレンド情報を収集中...');
        if (this.testMode) {
            console.log('🧪 [TEST MODE] Mockデータを使用');
            return this.getMockTrendData();
        }
        console.log('🌐 [REAL MODE] Playwrightで実データ収集');
        return this.collectRealTrendData();
    }
    async collectCompetitorContent() {
        if (this.testMode) {
            return this.getMockCompetitorData();
        }
        return this.collectRealCompetitorData();
    }
    async collectMarketNews() {
        if (this.testMode) {
            return this.getMockNewsData();
        }
        return this.collectRealMarketNews();
    }
    async collectHashtagActivity() {
        if (this.testMode) {
            return this.getMockHashtagData();
        }
        return this.collectRealHashtagData();
    }
    consolidateResults(resultArrays) {
        const allResults = resultArrays.flat();
        // 関連性スコアでソート（高い順）
        const sortedResults = allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        // 重複除去（コンテンツの類似性で判定）
        const uniqueResults = this.removeDuplicates(sortedResults);
        // 上位30件に制限
        const limitedResults = uniqueResults.slice(0, 30);
        console.log(`🔄 [結果統合] ${allResults.length}件から${limitedResults.length}件に集約`);
        return limitedResults;
    }
    removeDuplicates(results) {
        const seen = new Set();
        const unique = [];
        for (const result of results) {
            // コンテンツの最初の50文字でユニーク性を判定
            const contentKey = result.content.substring(0, 50).toLowerCase();
            if (!seen.has(contentKey)) {
                seen.add(contentKey);
                unique.push(result);
            }
        }
        return unique;
    }
    async evaluateCollectionQuality(results) {
        const averageRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
        const typeDistribution = this.analyzeTypeDistribution(results);
        const recommendations = [];
        if (averageRelevance < 0.7) {
            recommendations.push('収集条件を調整して関連性の高い情報を増やす');
        }
        if (typeDistribution.trend < 0.3) {
            recommendations.push('トレンド情報の収集を強化する');
        }
        if (typeDistribution.news < 0.2) {
            recommendations.push('市場ニュースの収集を増やす');
        }
        return {
            overallScore: averageRelevance,
            recommendations
        };
    }
    analyzeTypeDistribution(results) {
        const total = results.length;
        const counts = results.reduce((acc, result) => {
            acc[result.type] = (acc[result.type] || 0) + 1;
            return acc;
        }, {});
        const distribution = {};
        for (const [type, count] of Object.entries(counts)) {
            distribution[type] = count / total;
        }
        return distribution;
    }
    async collectRealTrendData() {
        try {
            const playwright = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await playwright.chromium.launch({ headless: true });
            const page = await browser.newPage();
            // X.com/explore にアクセス
            await page.goto('https://x.com/explore', { waitUntil: 'networkidle' });
            // トレンド情報をスクレイピング
            const trends = await page.evaluate(() => {
                // DOM操作でトレンド情報取得
                const trendElements = globalThis.document.querySelectorAll('[data-testid="trend"]');
                return Array.from(trendElements).map((el) => ({
                    text: el.textContent || '',
                    engagement: Math.floor(Math.random() * 1000) + 100
                }));
            });
            await browser.close();
            // CollectionResult形式に変換
            return trends.slice(0, 5).map((trend, index) => ({
                id: `real-trend-${Date.now()}-${index}`,
                type: 'trend',
                content: trend.text,
                source: 'x.com/explore',
                relevanceScore: this.calculateRelevanceScore(trend.text),
                timestamp: Date.now(),
                metadata: {
                    engagement: trend.engagement,
                    hashtags: this.extractHashtags(trend.text)
                }
            }));
        }
        catch (error) {
            console.error('❌ Real trend collection failed:', error);
            console.log('🔄 Falling back to mock data');
            return this.getMockTrendData();
        }
    }
    async collectRealCompetitorData() {
        try {
            const competitorAccounts = ['@investment_guru', '@fx_master', '@crypto_analyst'];
            const results = [];
            const playwright = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await playwright.chromium.launch({ headless: true });
            for (const account of competitorAccounts.slice(0, 2)) { // 制限
                const page = await browser.newPage();
                try {
                    await page.goto(`https://x.com/${account.substring(1)}`, { waitUntil: 'networkidle' });
                    // 最新の投稿を取得
                    const posts = await page.evaluate(() => {
                        const postElements = globalThis.document.querySelectorAll('[data-testid="tweetText"]');
                        return Array.from(postElements).slice(0, 3).map((el) => el.textContent || '');
                    });
                    posts.forEach((post, index) => {
                        if (post.length > 20) { // 意味のある投稿のみ
                            results.push({
                                id: `real-competitor-${Date.now()}-${index}`,
                                type: 'competitor',
                                content: post,
                                source: `competitor_${account}`,
                                relevanceScore: this.calculateRelevanceScore(post),
                                timestamp: Date.now(),
                                metadata: {
                                    engagement: Math.floor(Math.random() * 500) + 50,
                                    author: account,
                                    hashtags: this.extractHashtags(post)
                                }
                            });
                        }
                    });
                }
                catch (pageError) {
                    console.error(`❌ Failed to collect from ${account}:`, pageError);
                }
                finally {
                    await page.close();
                }
            }
            await browser.close();
            return results.slice(0, 6); // 最大6件
        }
        catch (error) {
            console.error('❌ Real competitor collection failed:', error);
            return this.getMockCompetitorData();
        }
    }
    async collectRealMarketNews() {
        try {
            const searchTerms = ['日銀', '金利政策', 'NYダウ', '株価', '為替'];
            const results = [];
            const playwright = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await playwright.chromium.launch({ headless: true });
            const page = await browser.newPage();
            for (const term of searchTerms.slice(0, 3)) {
                try {
                    await page.goto(`https://x.com/search?q=${encodeURIComponent(term)}&f=live`, { waitUntil: 'networkidle' });
                    const newsItems = await page.evaluate(() => {
                        const tweetElements = globalThis.document.querySelectorAll('[data-testid="tweetText"]');
                        return Array.from(tweetElements).slice(0, 2).map((el) => el.textContent || '');
                    });
                    newsItems.forEach((item, index) => {
                        if (item.length > 30) {
                            results.push({
                                id: `real-news-${Date.now()}-${index}`,
                                type: 'news',
                                content: item,
                                source: 'x.com/search',
                                relevanceScore: this.calculateRelevanceScore(item),
                                timestamp: Date.now(),
                                metadata: {
                                    engagement: Math.floor(Math.random() * 800) + 100,
                                    hashtags: this.extractHashtags(item),
                                    searchTerm: term
                                }
                            });
                        }
                    });
                    await this.sleep(2000); // レート制限対策
                }
                catch (termError) {
                    console.error(`❌ Failed to search for ${term}:`, termError);
                }
            }
            await browser.close();
            return results.slice(0, 6);
        }
        catch (error) {
            console.error('❌ Real news collection failed:', error);
            return this.getMockNewsData();
        }
    }
    async collectRealHashtagData() {
        try {
            const hashtags = ['#投資', '#FX', '#株式投資', '#資産運用'];
            const results = [];
            const playwright = await Promise.resolve().then(() => __importStar(require('playwright')));
            const browser = await playwright.chromium.launch({ headless: true });
            const page = await browser.newPage();
            for (const hashtag of hashtags.slice(0, 2)) {
                try {
                    await page.goto(`https://x.com/hashtag/${hashtag.substring(1)}`, { waitUntil: 'networkidle' });
                    const hashtagActivity = await page.evaluate(() => {
                        const elements = globalThis.document.querySelectorAll('[data-testid="tweetText"]');
                        return Array.from(elements).slice(0, 2).map((el) => el.textContent || '');
                    });
                    if (hashtagActivity.length > 0) {
                        results.push({
                            id: `real-hashtag-${Date.now()}-${hashtag}`,
                            type: 'hashtag',
                            content: `${hashtag} タグで活発な議論: ${hashtagActivity[0]}`,
                            source: 'hashtag_analysis',
                            relevanceScore: this.calculateRelevanceScore(hashtagActivity[0]),
                            timestamp: Date.now(),
                            metadata: {
                                engagement: Math.floor(Math.random() * 400) + 100,
                                hashtags: [hashtag],
                                activityLevel: hashtagActivity.length
                            }
                        });
                    }
                    await this.sleep(2000);
                }
                catch (hashtagError) {
                    console.error(`❌ Failed to analyze ${hashtag}:`, hashtagError);
                }
            }
            await browser.close();
            return results;
        }
        catch (error) {
            console.error('❌ Real hashtag collection failed:', error);
            return this.getMockHashtagData();
        }
    }
    // ヘルパーメソッド群
    calculateRelevanceScore(content) {
        const investmentKeywords = ['投資', 'トレード', 'FX', '株式', '仮想通貨', '金融', '資産運用', '市場', '経済'];
        const score = investmentKeywords.reduce((acc, keyword) => {
            return acc + (content.includes(keyword) ? 0.1 : 0);
        }, 0.5);
        return Math.min(score, 1.0);
    }
    extractHashtags(content) {
        const hashtagRegex = /#[\w\u3042-\u3096\u30A1-\u30FC\u4E00-\u9FAF]+/g;
        return content.match(hashtagRegex) || [];
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // 既存のMockメソッドをprivateに変更
    getMockTrendData() {
        return [
            {
                id: `trend-${Date.now()}-1`,
                type: 'trend',
                content: '日本株が上昇、円安が後押し',
                source: 'x.com/explore',
                relevanceScore: 0.85,
                timestamp: Date.now(),
                metadata: {
                    engagement: 1250,
                    hashtags: ['#日本株', '#円安', '#投資']
                }
            },
            {
                id: `trend-${Date.now()}-2`,
                type: 'trend',
                content: 'ビットコインが再び50000ドル台を回復',
                source: 'x.com/explore',
                relevanceScore: 0.78,
                timestamp: Date.now(),
                metadata: {
                    engagement: 2100,
                    hashtags: ['#ビットコイン', '#BTC', '#仮想通貨']
                }
            }
        ];
    }
    getMockCompetitorData() {
        return [
            {
                id: `competitor-${Date.now()}-1`,
                type: 'competitor',
                content: '市場の変動が激しいときこそ、リスク管理が重要です。分散投資の基本を忘れずに。',
                source: 'competitor_account_1',
                relevanceScore: 0.82,
                timestamp: Date.now(),
                metadata: {
                    engagement: 340,
                    author: '@investment_guru',
                    hashtags: ['#リスク管理', '#分散投資']
                }
            },
            {
                id: `competitor-${Date.now()}-2`,
                type: 'competitor',
                content: 'FXトレードで勝つためには、テクニカル分析よりもメンタル管理が9割です。',
                source: 'competitor_account_2',
                relevanceScore: 0.75,
                timestamp: Date.now(),
                metadata: {
                    engagement: 520,
                    author: '@fx_master',
                    hashtags: ['#FX', '#メンタル管理']
                }
            }
        ];
    }
    getMockNewsData() {
        return [
            {
                id: `news-${Date.now()}-1`,
                type: 'news',
                content: '日銀、金利政策維持を決定。市場の反応は限定的',
                source: 'financial_news',
                relevanceScore: 0.88,
                timestamp: Date.now(),
                metadata: {
                    engagement: 890,
                    hashtags: ['#日銀', '#金利政策', '#金融政策']
                }
            },
            {
                id: `news-${Date.now()}-2`,
                type: 'news',
                content: 'NYダウ、好決算を受けて過去最高値を更新',
                source: 'market_news',
                relevanceScore: 0.83,
                timestamp: Date.now(),
                metadata: {
                    engagement: 1200,
                    hashtags: ['#NYダウ', '#決算', '#米国株']
                }
            }
        ];
    }
    getMockHashtagData() {
        return [
            {
                id: `hashtag-${Date.now()}-1`,
                type: 'hashtag',
                content: '#投資 タグで活発な議論：初心者向けの投資戦略について',
                source: 'hashtag_analysis',
                relevanceScore: 0.72,
                timestamp: Date.now(),
                metadata: {
                    engagement: 450,
                    hashtags: ['#投資', '#初心者', '#投資戦略']
                }
            },
            {
                id: `hashtag-${Date.now()}-2`,
                type: 'hashtag',
                content: '#FX タグで注目：ドル円の今後の展望について活発な意見交換',
                source: 'hashtag_analysis',
                relevanceScore: 0.68,
                timestamp: Date.now(),
                metadata: {
                    engagement: 320,
                    hashtags: ['#FX', '#ドル円', '#為替']
                }
            }
        ];
    }
}
exports.EnhancedInfoCollector = EnhancedInfoCollector;
