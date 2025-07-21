"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostingManager = void 0;
const x_client_1 = require("./x-client");
const fs_1 = require("fs");
// 即時投稿機能のみ - スケジュール実行対応
class PostingManager {
    xClient;
    config;
    // 即時投稿機能のみ - スケジュール実行で直接投稿
    dataDir = 'data';
    constructor(apiKey, config, xClientConfig) {
        this.xClient = new x_client_1.SimpleXClient(apiKey, xClientConfig);
        this.config = {
            minIntervalMinutes: 30, // 30分間隔（ゴールデンタイム集中投稿対応）
            maxPostsPerHour: 2, // 1時間に2回まで（30分間隔対応）
            maxPostsPerDay: 15, // 1日15回
            duplicateCheckHours: 24,
            ...config
        };
        this.ensureDataDirectory();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    // 即時投稿関連メソッドのみ - スケジュール実行対応
    canPostNow() {
        const now = Date.now();
        const history = this.xClient.getPostHistory();
        // 最後の投稿からの間隔チェック
        const lastPost = history.filter(p => p.success).sort((a, b) => b.timestamp - a.timestamp)[0];
        if (lastPost) {
            const timeSinceLastPost = now - lastPost.timestamp;
            const minInterval = this.config.minIntervalMinutes * 60 * 1000;
            if (timeSinceLastPost < minInterval) {
                const remainingMinutes = Math.ceil((minInterval - timeSinceLastPost) / 60000);
                return {
                    allowed: false,
                    reason: `最後の投稿から${this.config.minIntervalMinutes}分経過していません。あと${remainingMinutes}分待つ必要があります。`
                };
            }
        }
        // 1時間以内の投稿数チェック
        const lastHour = now - (60 * 60 * 1000);
        const postsInLastHour = history.filter(p => p.timestamp > lastHour && p.success).length;
        if (postsInLastHour >= this.config.maxPostsPerHour) {
            return {
                allowed: false,
                reason: `1時間以内の投稿数が上限(${this.config.maxPostsPerHour})に達しています。`
            };
        }
        // 24時間以内の投稿数チェック
        const lastDay = now - (24 * 60 * 60 * 1000);
        const postsInLastDay = history.filter(p => p.timestamp > lastDay && p.success).length;
        if (postsInLastDay >= this.config.maxPostsPerDay) {
            return {
                allowed: false,
                reason: `24時間以内の投稿数が上限(${this.config.maxPostsPerDay})に達しています。`
            };
        }
        return { allowed: true };
    }
    isDuplicateContent(content) {
        const history = this.xClient.getPostHistory();
        const checkPeriod = Date.now() - (this.config.duplicateCheckHours * 60 * 60 * 1000);
        const recentPosts = history.filter(p => p.timestamp > checkPeriod && p.success);
        return recentPosts.some(post => {
            const similarity = this.calculateSimilarity(content, post.content);
            return similarity > 0.8; // 80%以上の類似度で重複と判定
        });
    }
    calculateSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    async postNow(content) {
        // 投稿可能かチェック
        const canPost = this.canPostNow();
        if (!canPost.allowed) {
            return {
                success: false,
                error: canPost.reason,
                timestamp: Date.now()
            };
        }
        // 重複チェック
        if (this.isDuplicateContent(content)) {
            return {
                success: false,
                error: '類似した内容が最近投稿されています',
                timestamp: Date.now()
            };
        }
        // 投稿実行
        return await this.xClient.post(content);
    }
    // 即時投稿メソッドのみ - スケジュール実行で直接postNow()を使用
    getPostingStats() {
        const history = this.xClient.getPostHistory();
        const now = Date.now();
        const totalPosts = history.length;
        const successfulPosts = history.filter(p => p.success).length;
        const failedPosts = totalPosts - successfulPosts;
        const successRate = totalPosts > 0 ? (successfulPosts / totalPosts) * 100 : 0;
        const today = now - (24 * 60 * 60 * 1000);
        const thisHour = now - (60 * 60 * 1000);
        const postsToday = history.filter(p => p.timestamp > today && p.success).length;
        const postsThisHour = history.filter(p => p.timestamp > thisHour && p.success).length;
        const canPostCheck = this.canPostNow();
        // 次に投稿可能な時刻を計算
        let nextAllowedTime;
        if (!canPostCheck.allowed) {
            const lastPost = history.filter(p => p.success).sort((a, b) => b.timestamp - a.timestamp)[0];
            if (lastPost) {
                nextAllowedTime = lastPost.timestamp + (this.config.minIntervalMinutes * 60 * 1000);
            }
        }
        return {
            totalPosts,
            successfulPosts,
            failedPosts,
            successRate,
            postsToday,
            postsThisHour,
            canPostNow: canPostCheck.allowed,
            nextAllowedTime
        };
    }
    // 設定の更新
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    // 履歴のクリア
    clearHistory() {
        this.xClient.clearHistory();
    }
    // 自律収集結果からの投稿
    async postFromAutonomousResult(result) {
        try {
            const content = result.content || result.text;
            if (!content) {
                console.error('投稿内容が見つかりません');
                return false;
            }
            // 文字数チェック
            if (content.length > 280) {
                console.warn('投稿が280文字を超えています。切り詰めます。');
                const truncated = content.slice(0, 277) + '...';
                const postResult = await this.postNow(truncated);
                return postResult.success;
            }
            const postResult = await this.postNow(content);
            return postResult.success;
        }
        catch (error) {
            console.error('自律投稿エラー:', error);
            return false;
        }
    }
}
exports.PostingManager = PostingManager;
