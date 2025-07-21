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
exports.PlaywrightAccountCollector = void 0;
const playwright_common_config_1 = require("./playwright-common-config");
class PlaywrightAccountCollector {
    browser = null;
    context = null;
    config = {
        timeout: 30000,
        maxRetries: 3,
        requestDelay: 2000,
        testMode: process.env.X_TEST_MODE === 'true'
    };
    constructor() { }
    async collectAccountInfo(username) {
        console.log('🎭 [Playwright収集開始] アカウント情報を収集中...');
        try {
            await this.initializeBrowser();
            const targetUsername = username || await this.getCurrentUsername();
            const profileUrl = `https://x.com/${targetUsername}`;
            console.log(`🔍 [プロフィールアクセス] ${profileUrl}`);
            const page = await this.context.newPage();
            await page.goto(profileUrl, {
                waitUntil: 'networkidle',
                timeout: this.config.timeout
            });
            // ページの読み込み完了を待機
            await this.waitForPageLoad(page);
            // 基本プロフィール情報を抽出
            const basicInfo = await this.extractBasicInfo(page, targetUsername);
            // フォロワー統計を抽出
            const stats = await this.extractFollowerStats(page);
            // 最近の投稿情報を取得
            const recentPostTime = await this.extractLastTweetTime(page);
            const accountInfo = {
                username: targetUsername,
                user_id: basicInfo.user_id || targetUsername,
                display_name: basicInfo.display_name,
                bio: basicInfo.bio,
                verified: basicInfo.verified,
                followers_count: stats.followers,
                following_count: stats.following,
                tweet_count: stats.tweets,
                listed_count: 0, // X.comでは通常表示されない
                last_updated: Date.now(),
                last_tweet_time: recentPostTime,
            };
            console.log(`📊 [統計抽出] フォロワー: ${stats.followers.toLocaleString()}、フォロー: ${stats.following.toLocaleString()}、ツイート: ${stats.tweets.toLocaleString()}`);
            console.log('✅ [収集完了] アカウント情報を正常に取得');
            await page.close();
            return accountInfo;
        }
        catch (error) {
            console.error('❌ [Playwright収集エラー]:', error);
            throw error;
        }
        finally {
            await this.cleanup();
        }
    }
    async collectRecentPosts(username, limit = 10) {
        console.log(`📝 [投稿収集] 最近の投稿${limit}件を収集中...`);
        try {
            await this.initializeBrowser();
            const targetUsername = username || await this.getCurrentUsername();
            const profileUrl = `https://x.com/${targetUsername}`;
            const page = await this.context.newPage();
            await page.goto(profileUrl, {
                waitUntil: 'networkidle',
                timeout: this.config.timeout
            });
            await this.waitForPageLoad(page);
            // ツイート要素を待機
            await page.waitForSelector('[data-testid="tweet"]', { timeout: this.config.timeout });
            // 投稿要素を取得
            const posts = await this.extractRecentPosts(page, limit);
            console.log(`📝 [投稿収集完了] ${posts.length}件の投稿を収集`);
            await page.close();
            return posts;
        }
        catch (error) {
            console.error('❌ [投稿収集エラー]:', error);
            return [];
        }
        finally {
            await this.cleanup();
        }
    }
    async initializeBrowser() {
        if (this.browser && this.context)
            return;
        const environment = await playwright_common_config_1.PlaywrightCommonSetup.createPlaywrightEnvironment(this.config);
        this.browser = environment.browser;
        this.context = environment.context;
    }
    async waitForPageLoad(page) {
        const selectors = [
            '[data-testid="UserName"]',
            '[data-testid="UserDescription"]',
            '[role="main"]'
        ];
        await playwright_common_config_1.PlaywrightCommonSetup.waitForPageLoad(page, selectors, this.config.timeout);
    }
    async extractBasicInfo(page, username) {
        try {
            // 表示名を取得（複数のセレクターパターンを試行）
            const displayName = await this.tryMultipleSelectors(page, [
                '[data-testid="UserName"] div[dir="ltr"] span',
                '[data-testid="UserName"] span[role="heading"]',
                'h1[role="heading"]',
                'h2[role="heading"]'
            ]) || username;
            // プロフィールバイオを取得
            const bio = await this.tryMultipleSelectors(page, [
                '[data-testid="UserDescription"]',
                '[data-testid="UserBio"]'
            ]) || '';
            // 認証バッジをチェック
            const verifiedBadge = await page.$('[data-testid="verifiedBadge"]');
            const verified = verifiedBadge !== null;
            return {
                user_id: username,
                display_name: displayName,
                bio: bio,
                verified: verified
            };
        }
        catch (error) {
            console.warn('⚠️ [基本情報抽出エラー]:', error);
            return {
                user_id: username,
                display_name: username,
                bio: '',
                verified: false
            };
        }
    }
    async extractFollowerStats(page) {
        try {
            // フォロワー数を取得（複数のセレクターパターンを試行）
            const followersText = await this.tryMultipleSelectors(page, [
                'a[href*="/followers"] span[data-testid="UserName"] span',
                'a[href*="/followers"] span:not([dir])',
                '[data-testid="primaryColumn"] a[href*="/followers"] span'
            ]);
            // フォロー数を取得
            const followingText = await this.tryMultipleSelectors(page, [
                'a[href*="/following"] span[data-testid="UserName"] span',
                'a[href*="/following"] span:not([dir])',
                '[data-testid="primaryColumn"] a[href*="/following"] span'
            ]);
            // より汎用的なアプローチでプロフィール統計を取得
            const statsElements = await page.$$('[role="link"] span');
            let followers = 0, following = 0, tweets = 0;
            for (const element of statsElements) {
                const text = await element.textContent();
                if (text) {
                    // 数値を含むテキストを探す
                    const numberMatch = text.match(/[\d,]+/);
                    if (numberMatch) {
                        const number = this.parseNumber(numberMatch[0]);
                        // 前後のテキストでタイプを判定
                        const parent = await element.evaluateHandle(el => el.parentElement);
                        const parentText = await parent.evaluate(el => el.textContent?.toLowerCase() || '');
                        if (parentText.includes('followers') || parentText.includes('フォロワー')) {
                            followers = number;
                        }
                        else if (parentText.includes('following') || parentText.includes('フォロー')) {
                            following = number;
                        }
                        else if (parentText.includes('posts') || parentText.includes('tweets') || parentText.includes('ツイート')) {
                            tweets = number;
                        }
                    }
                }
            }
            // フォールバック：テキストベースでの抽出
            if (followers === 0 && followersText) {
                followers = this.parseNumber(followersText);
            }
            if (following === 0 && followingText) {
                following = this.parseNumber(followingText);
            }
            return { followers, following, tweets };
        }
        catch (error) {
            console.warn('⚠️ [統計抽出エラー]:', error);
            return { followers: 0, following: 0, tweets: 0 };
        }
    }
    async extractLastTweetTime(page) {
        try {
            // 最初のツイートのタイムスタンプを取得
            const timeElements = await page.$$('[data-testid="tweet"] time');
            if (timeElements.length > 0) {
                const datetime = await timeElements[0].getAttribute('datetime');
                if (datetime) {
                    return new Date(datetime).getTime();
                }
            }
            return Date.now() - (24 * 60 * 60 * 1000); // 24時間前をデフォルト
        }
        catch (error) {
            console.warn('⚠️ [最新投稿時間取得エラー]:', error);
            return Date.now() - (24 * 60 * 60 * 1000);
        }
    }
    async extractRecentPosts(page, limit) {
        try {
            const posts = [];
            const tweetElements = await page.$$('[data-testid="tweet"]');
            for (let i = 0; i < Math.min(tweetElements.length, limit); i++) {
                const tweet = tweetElements[i];
                try {
                    // ツイート内容を取得
                    const contentElement = await tweet.$('[data-testid="tweetText"]');
                    const content = contentElement ? await contentElement.textContent() : '';
                    // タイムスタンプを取得
                    const timeElement = await tweet.$('time');
                    const datetime = timeElement ? await timeElement.getAttribute('datetime') : null;
                    const timestamp = datetime ? new Date(datetime).getTime() : Date.now();
                    // エンゲージメント数を取得（オプション）
                    const likes = await this.extractEngagementCount(tweet, 'like');
                    const retweets = await this.extractEngagementCount(tweet, 'retweet');
                    const replies = await this.extractEngagementCount(tweet, 'reply');
                    if (content && content.trim()) {
                        posts.push({
                            id: `tweet-${timestamp}-${i}`,
                            content: content.trim(),
                            timestamp,
                            likes,
                            retweets,
                            replies
                        });
                    }
                }
                catch (error) {
                    console.warn(`⚠️ [投稿${i}抽出エラー]:`, error);
                }
            }
            return posts;
        }
        catch (error) {
            console.warn('⚠️ [投稿リスト抽出エラー]:', error);
            return [];
        }
    }
    async extractEngagementCount(tweetElement, type) {
        try {
            const testIds = {
                like: 'like',
                retweet: 'retweet',
                reply: 'reply'
            };
            const engagementElement = await tweetElement.$(`[data-testid="${testIds[type]}"] span`);
            if (engagementElement) {
                const text = await engagementElement.textContent();
                return text ? this.parseNumber(text) : 0;
            }
            return 0;
        }
        catch (error) {
            return 0;
        }
    }
    async tryMultipleSelectors(page, selectors) {
        return playwright_common_config_1.PlaywrightCommonSetup.tryMultipleSelectors(page, selectors);
    }
    parseNumber(text) {
        return playwright_common_config_1.PlaywrightCommonSetup.parseNumber(text);
    }
    async getCurrentUsername() {
        try {
            // 1. 設定ファイルから取得を試行
            const fs = (await Promise.resolve().then(() => __importStar(require('fs')))).default;
            const yaml = (await Promise.resolve().then(() => __importStar(require('js-yaml')))).default;
            const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
            const configPath = path.join(process.cwd(), 'data/account-config.yaml');
            if (fs.existsSync(configPath)) {
                const configData = yaml.load(fs.readFileSync(configPath, 'utf8'));
                const username = configData?.account?.username;
                if (username && username !== 'defaultuser') {
                    console.log(`🔧 [ユーザー名取得] 設定ファイルから: ${username}`);
                    return username;
                }
            }
            // 2. 環境変数から取得
            const envUsername = process.env.X_USERNAME;
            if (envUsername && envUsername !== 'defaultuser') {
                console.log(`🔧 [ユーザー名取得] 環境変数から: ${envUsername}`);
                return envUsername;
            }
            // 3. フォールバック：エラーを投げる
            throw new Error('アカウント名が設定されていません。data/account-config.yamlまたは環境変数X_USERNAMEを確認してください。');
        }
        catch (error) {
            console.error('❌ [ユーザー名取得エラー]:', error);
            throw error;
        }
    }
    async cleanup() {
        await playwright_common_config_1.PlaywrightCommonSetup.cleanup(this.browser || undefined, this.context || undefined);
        this.browser = null;
        this.context = null;
    }
}
exports.PlaywrightAccountCollector = PlaywrightAccountCollector;
