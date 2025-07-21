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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleXClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = require("fs");
const yaml_utils_1 = require("../utils/yaml-utils");
const yaml = __importStar(require("js-yaml"));
const crypto_1 = __importDefault(require("crypto"));
class SimpleXClient {
    apiKey;
    baseUrl = 'https://api.twitter.com/2';
    testMode;
    rateLimitDelay;
    maxRetries;
    postHistory = [];
    historyFile = 'data/posting-history.yaml';
    constructor(apiKey, config) {
        this.apiKey = apiKey;
        this.testMode = process.env.X_TEST_MODE === 'true';
        this.rateLimitDelay = config?.rateLimitDelay || 1000;
        this.maxRetries = config?.maxRetries || 3;
        this.loadPostHistory();
    }
    loadPostHistory() {
        if ((0, fs_1.existsSync)(this.historyFile)) {
            this.postHistory = (0, yaml_utils_1.loadYamlArraySafe)(this.historyFile);
        }
    }
    savePostHistory() {
        try {
            (0, fs_1.writeFileSync)(this.historyFile, yaml.dump(this.postHistory, { indent: 2 }));
        }
        catch (error) {
            console.error('Error saving post history:', error);
        }
    }
    addToHistory(content, success, error) {
        const historyEntry = {
            id: Date.now().toString(),
            content: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
            timestamp: Date.now(),
            success,
            error
        };
        this.postHistory.push(historyEntry);
        // 最新100件のみ保持
        if (this.postHistory.length > 100) {
            this.postHistory = this.postHistory.slice(-100);
        }
        this.savePostHistory();
    }
    isDuplicatePost(text) {
        const recentPosts = this.postHistory.filter(post => post.timestamp > Date.now() - (24 * 60 * 60 * 1000) // 24時間以内
        );
        return recentPosts.some(post => post.content.includes(text.slice(0, 50)) && post.success);
    }
    async waitForRateLimit() {
        if (this.rateLimitDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
    }
    async post(text) {
        const timestamp = Date.now();
        // 重複チェック
        if (this.isDuplicatePost(text)) {
            const error = 'Duplicate post detected within 24 hours';
            this.addToHistory(text, false, error);
            return { success: false, error, timestamp };
        }
        // テストモードの場合、コンソール出力のみ
        if (this.testMode) {
            console.log('\n📱 [TEST MODE] X投稿シミュレーション:');
            console.log('================================');
            console.log(text);
            console.log('================================');
            console.log(`文字数: ${text.length}/280`);
            console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
            this.addToHistory(text, true);
            return { success: true, id: 'test-' + timestamp, timestamp };
        }
        // 本番モード
        if (!this.apiKey) {
            const error = 'X API key not provided';
            console.error(error);
            this.addToHistory(text, false, error);
            return { success: false, error, timestamp };
        }
        await this.waitForRateLimit();
        try {
            const url = `${this.baseUrl}/tweets`;
            const authHeader = this.generateOAuthHeaders('POST', url);
            const response = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text.slice(0, 280)
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
                this.addToHistory(text, false, error);
                return { success: false, error, timestamp };
            }
            const result = await response.json();
            console.log('Posted to X successfully:', result);
            this.addToHistory(text, true);
            return { success: true, id: result.data?.id || 'unknown', timestamp };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error posting to X:', errorMessage);
            this.addToHistory(text, false, errorMessage);
            return { success: false, error: errorMessage, timestamp };
        }
    }
    // 投稿履歴を取得
    getPostHistory() {
        return [...this.postHistory];
    }
    // 最近の投稿成功率を取得
    getSuccessRate(hours = 24) {
        const since = Date.now() - (hours * 60 * 60 * 1000);
        const recentPosts = this.postHistory.filter(post => post.timestamp > since);
        if (recentPosts.length === 0)
            return 0;
        const successful = recentPosts.filter(post => post.success).length;
        return (successful / recentPosts.length) * 100;
    }
    // 投稿履歴をクリア
    clearHistory() {
        this.postHistory = [];
        this.savePostHistory();
    }
    // ユーザー名からアカウント情報取得
    async getUserByUsername(username) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/users/by/username/${username}?user.fields=public_metrics`, {
                headers: {
                    'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error(`X API error: ${response.status} - ${response.statusText}`);
            }
            const result = await response.json();
            const accountData = {
                username: result.data.username,
                user_id: result.data.id,
                display_name: result.data.name,
                verified: result.data.verified,
                followers_count: result.data.public_metrics.followers_count,
                following_count: result.data.public_metrics.following_count,
                tweet_count: result.data.public_metrics.tweet_count,
                listed_count: result.data.public_metrics.listed_count,
                last_updated: Date.now()
            };
            this.saveAccountInfo(accountData);
            return accountData;
        }
        catch (error) {
            console.error('Error fetching user by username:', error);
            throw error;
        }
    }
    // 自分のアカウント情報取得
    async getMyAccountInfo() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/users/me?user.fields=public_metrics`, {
                headers: {
                    'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error(`X API error: ${response.status} - ${response.statusText}`);
            }
            const result = await response.json();
            const accountData = {
                username: result.data.username,
                user_id: result.data.id,
                display_name: result.data.name,
                verified: result.data.verified,
                followers_count: result.data.public_metrics.followers_count,
                following_count: result.data.public_metrics.following_count,
                tweet_count: result.data.public_metrics.tweet_count,
                listed_count: result.data.public_metrics.listed_count,
                last_updated: Date.now()
            };
            this.saveAccountInfo(accountData);
            return accountData;
        }
        catch (error) {
            console.error('Error fetching my account info:', error);
            throw error;
        }
    }
    // 自分のアカウント詳細情報取得（拡張版）
    async getMyAccountDetails() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/users/me?user.fields=public_metrics,description,location,created_at,verified,profile_image_url`, {
                headers: {
                    'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error(`X API error: ${response.status} - ${response.statusText}`);
            }
            const result = await response.json();
            return result;
        }
        catch (error) {
            console.error('Error fetching my account details:', error);
            throw error;
        }
    }
    // 自分の最近のツイート分析
    async getMyRecentTweets(count = 10) {
        try {
            // まず自分のユーザーIDを取得
            const userDetails = await this.getMyAccountDetails();
            const userId = userDetails.data.id;
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/users/${userId}/tweets?max_results=${Math.min(count, 100)}&tweet.fields=public_metrics,created_at,context_annotations&expansions=author_id`, {
                headers: {
                    'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error(`X API error: ${response.status} - ${response.statusText}`);
            }
            const result = await response.json();
            // Tweet形式に変換
            const tweets = (result.data || []).map((tweet) => ({
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                public_metrics: tweet.public_metrics,
                author_id: tweet.author_id
            }));
            return tweets;
        }
        catch (error) {
            console.error('Error fetching my recent tweets:', error);
            return []; // エラー時は空配列を返す
        }
    }
    // エンゲージメント詳細分析
    async getEngagementMetrics(tweetIds) {
        try {
            const engagementMetrics = [];
            // 各ツイートのエンゲージメント情報を取得
            for (const tweetId of tweetIds.slice(0, 10)) { // 最大10件まで
                try {
                    const response = await (0, node_fetch_1.default)(`${this.baseUrl}/tweets/${tweetId}?tweet.fields=public_metrics,created_at`, {
                        headers: {
                            'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                            'Content-Type': 'application/json',
                        }
                    });
                    if (response.ok) {
                        const result = await response.json();
                        const tweet = result.data;
                        const metrics = {
                            tweetId: tweet.id,
                            likes: tweet.public_metrics?.like_count || 0,
                            retweets: tweet.public_metrics?.retweet_count || 0,
                            replies: tweet.public_metrics?.reply_count || 0,
                            quotes: tweet.public_metrics?.quote_count || 0,
                            impressions: tweet.public_metrics?.impression_count || 0,
                            engagementRate: this.calculateEngagementRate(tweet.public_metrics),
                            timestamp: tweet.created_at
                        };
                        engagementMetrics.push(metrics);
                    }
                }
                catch (error) {
                    console.error(`Error fetching metrics for tweet ${tweetId}:`, error);
                    // 個別のエラーは無視して継続
                }
                // Rate limit対応
                await this.waitForRateLimit();
            }
            return engagementMetrics;
        }
        catch (error) {
            console.error('Error getting engagement metrics:', error);
            return [];
        }
    }
    // エンゲージメント率計算
    calculateEngagementRate(publicMetrics) {
        if (!publicMetrics || !publicMetrics.impression_count)
            return 0;
        const totalEngagements = (publicMetrics.like_count || 0) +
            (publicMetrics.retweet_count || 0) +
            (publicMetrics.reply_count || 0) +
            (publicMetrics.quote_count || 0);
        return (totalEngagements / publicMetrics.impression_count) * 100;
    }
    // 引用ツイート機能
    async quoteTweet(originalTweetId, comment) {
        const timestamp = Date.now();
        // テストモードの場合
        if (this.testMode) {
            console.log('\n📱 [TEST MODE] 引用ツイートシミュレーション:');
            console.log('================================');
            console.log(`引用対象: ${originalTweetId}`);
            console.log(`コメント: ${comment}`);
            console.log('================================');
            console.log(`文字数: ${comment.length}/280`);
            console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
            this.addToHistory(`Quote: ${comment}`, true);
            return {
                success: true,
                tweetId: 'test-quote-' + timestamp,
                originalTweetId,
                comment,
                timestamp
            };
        }
        // 本番モード
        if (!this.apiKey) {
            const error = 'X API key not provided';
            this.addToHistory(`Quote: ${comment}`, false, error);
            return { success: false, error, timestamp };
        }
        await this.waitForRateLimit();
        try {
            const url = `${this.baseUrl}/tweets`;
            const authHeader = this.generateOAuthHeaders('POST', url);
            const response = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: comment.slice(0, 280),
                    quote_tweet_id: originalTweetId
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
                this.addToHistory(`Quote: ${comment}`, false, error);
                return { success: false, error, timestamp };
            }
            const result = await response.json();
            console.log('Quote tweet posted successfully:', result);
            this.addToHistory(`Quote: ${comment}`, true);
            return {
                success: true,
                tweetId: result.data?.id || 'unknown',
                originalTweetId,
                comment,
                timestamp
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error posting quote tweet:', errorMessage);
            this.addToHistory(`Quote: ${comment}`, false, errorMessage);
            return { success: false, error: errorMessage, timestamp };
        }
    }
    // リツイート機能
    async retweet(tweetId) {
        const timestamp = Date.now();
        // テストモードの場合
        if (this.testMode) {
            console.log('\n📱 [TEST MODE] リツイートシミュレーション:');
            console.log('================================');
            console.log(`リツイート対象: ${tweetId}`);
            console.log('================================');
            console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
            this.addToHistory(`Retweet: ${tweetId}`, true);
            return {
                success: true,
                originalTweetId: tweetId,
                timestamp
            };
        }
        // 本番モード
        if (!this.apiKey) {
            const error = 'X API key not provided';
            this.addToHistory(`Retweet: ${tweetId}`, false, error);
            return { success: false, error, timestamp };
        }
        await this.waitForRateLimit();
        try {
            // まず自分のユーザーIDを取得
            const userDetails = await this.getMyAccountDetails();
            const userId = userDetails.data.id;
            const url = `${this.baseUrl}/users/${userId}/retweets`;
            const authHeader = this.generateOAuthHeaders('POST', url);
            const response = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tweet_id: tweetId
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
                this.addToHistory(`Retweet: ${tweetId}`, false, error);
                return { success: false, error, timestamp };
            }
            const result = await response.json();
            console.log('Retweet posted successfully:', result);
            this.addToHistory(`Retweet: ${tweetId}`, true);
            return {
                success: true,
                originalTweetId: tweetId,
                timestamp
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error retweeting:', errorMessage);
            this.addToHistory(`Retweet: ${tweetId}`, false, errorMessage);
            return { success: false, error: errorMessage, timestamp };
        }
    }
    // リプライ機能
    async reply(tweetId, content) {
        const timestamp = Date.now();
        // 重複チェック
        if (this.isDuplicatePost(content)) {
            const error = 'Duplicate reply detected within 24 hours';
            this.addToHistory(`Reply: ${content}`, false, error);
            return { success: false, error, timestamp };
        }
        // テストモードの場合
        if (this.testMode) {
            console.log('\n📱 [TEST MODE] リプライシミュレーション:');
            console.log('================================');
            console.log(`リプライ対象: ${tweetId}`);
            console.log(`内容: ${content}`);
            console.log('================================');
            console.log(`文字数: ${content.length}/280`);
            console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
            this.addToHistory(`Reply: ${content}`, true);
            return {
                success: true,
                tweetId: 'test-reply-' + timestamp,
                originalTweetId: tweetId,
                content,
                timestamp
            };
        }
        // 本番モード
        if (!this.apiKey) {
            const error = 'X API key not provided';
            this.addToHistory(`Reply: ${content}`, false, error);
            return { success: false, error, timestamp };
        }
        await this.waitForRateLimit();
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/tweets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content.slice(0, 280),
                    reply: {
                        in_reply_to_tweet_id: tweetId
                    }
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
                this.addToHistory(`Reply: ${content}`, false, error);
                return { success: false, error, timestamp };
            }
            const result = await response.json();
            console.log('Reply posted successfully:', result);
            this.addToHistory(`Reply: ${content}`, true);
            return {
                success: true,
                tweetId: result.data?.id || 'unknown',
                originalTweetId: tweetId,
                content,
                timestamp
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error posting reply:', errorMessage);
            this.addToHistory(`Reply: ${content}`, false, errorMessage);
            return { success: false, error: errorMessage, timestamp };
        }
    }
    // アカウント情報をファイルに保存
    saveAccountInfo(accountData) {
        try {
            const accountFile = 'data/account-info.yaml';
            // 既存データの読み込み
            let existingData = {};
            if ((0, fs_1.existsSync)(accountFile)) {
                const existingContent = require('fs').readFileSync(accountFile, 'utf8');
                existingData = yaml.load(existingContent) || {};
            }
            // 履歴データの保持
            const history = existingData.history || [];
            // 新しい履歴エントリを追加
            history.push({
                timestamp: accountData.last_updated,
                followers_count: accountData.followers_count
            });
            // 直近10件のみ保持
            const limitedHistory = history.slice(-10);
            // 更新されたデータ構造
            const updatedData = {
                account: {
                    username: accountData.username,
                    user_id: accountData.user_id,
                    display_name: accountData.display_name,
                    verified: accountData.verified
                },
                current_metrics: {
                    followers_count: accountData.followers_count,
                    following_count: accountData.following_count,
                    tweet_count: accountData.tweet_count,
                    listed_count: accountData.listed_count,
                    last_updated: accountData.last_updated
                },
                history: limitedHistory
            };
            (0, fs_1.writeFileSync)(accountFile, yaml.dump(updatedData, { indent: 2 }));
        }
        catch (error) {
            console.error('Error saving account info:', error);
        }
    }
    // OAuth 1.0a認証ヘルパーメソッド
    generateOAuthHeaders(method, url, params = {}) {
        const consumerKey = process.env.X_API_KEY || '';
        const consumerSecret = process.env.X_API_SECRET || '';
        const accessToken = process.env.X_ACCESS_TOKEN || '';
        const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET || '';
        const oauthParams = {
            oauth_consumer_key: consumerKey,
            oauth_token: accessToken,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: crypto_1.default.randomBytes(16).toString('hex'),
            oauth_version: '1.0'
        };
        // パラメータをマージ
        const allParams = { ...params, ...oauthParams };
        // パラメータを文字列としてソート
        const paramString = Object.keys(allParams)
            .sort()
            .map(key => {
            const value = allParams[key];
            return `${this.encodeRFC3986(key)}=${this.encodeRFC3986(value || '')}`;
        })
            .join('&');
        // 署名ベース文字列を作成
        const signatureBaseString = [
            method.toUpperCase(),
            this.encodeRFC3986(url),
            this.encodeRFC3986(paramString)
        ].join('&');
        // 署名キーを作成
        const signingKey = `${this.encodeRFC3986(consumerSecret)}&${this.encodeRFC3986(accessTokenSecret)}`;
        // 署名を生成
        const signature = crypto_1.default
            .createHmac('sha1', signingKey)
            .update(signatureBaseString)
            .digest('base64');
        // OAuth署名を追加
        oauthParams.oauth_signature = signature;
        // Authorization ヘッダーを生成
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .sort()
            .map(key => {
            const value = oauthParams[key];
            return `${this.encodeRFC3986(key)}="${this.encodeRFC3986(value || '')}"`;
        })
            .join(', ');
        return authHeader;
    }
    encodeRFC3986(str) {
        return encodeURIComponent(str)
            .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    }
}
exports.SimpleXClient = SimpleXClient;
