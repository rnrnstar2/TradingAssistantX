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
exports.GrowthSystemManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const yaml_utils_1 = require("../utils/yaml-utils");
const yaml = __importStar(require("js-yaml"));
class GrowthSystemManager {
    dataDir;
    strategyFile;
    performanceFile;
    targetsFile;
    decisionsFile;
    constructor(dataDir = 'data') {
        this.dataDir = dataDir;
        this.strategyFile = (0, path_1.join)(dataDir, 'account-strategy.yaml');
        this.performanceFile = (0, path_1.join)(dataDir, 'performance-insights.yaml');
        this.targetsFile = (0, path_1.join)(dataDir, 'growth-targets.yaml');
        this.decisionsFile = (0, path_1.join)(dataDir, 'strategic-decisions.yaml');
        this.ensureDataDirectory();
        this.initializeDefaultData();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    initializeDefaultData() {
        if (!(0, fs_1.existsSync)(this.strategyFile)) {
            const defaultStrategy = {
                version: '1.0.0',
                lastUpdated: Date.now(),
                currentPhase: 'growth',
                objectives: {
                    primary: 'トレーディング教育コンテンツで信頼性のあるアカウントを構築',
                    secondary: [
                        'フォロワー数の安定的な増加',
                        'エンゲージメント率の向上',
                        '質の高いコミュニティ形成'
                    ],
                    timeline: '6ヶ月'
                },
                contentStrategy: {
                    themes: ['リスク管理', '市場分析', '投資心理', '基礎知識'],
                    toneOfVoice: '教育的で親しみやすい',
                    postingFrequency: 15,
                    optimalTimes: [
                        '07:00', '07:30', '08:00', '08:30', '12:00',
                        '12:30', '18:00', '18:30', '19:00', '19:30',
                        '21:00', '21:30', '22:00', '22:30', '23:30'
                    ],
                    avoidTopics: ['確実に儲かる話', '投資勧誘', '誇大表現']
                },
                targetAudience: {
                    demographics: ['20-40代', '投資初心者', '兼業トレーダー'],
                    interests: ['投資', 'トレーディング', '資産運用', '副業'],
                    painPoints: ['リスク管理', '情報の信頼性', '継続的な学習'],
                    preferredContentTypes: ['教育コンテンツ', '実例紹介', '分析結果']
                },
                growthTactics: {
                    primary: ['教育的価値の提供', '継続的な情報発信', '信頼性の構築'],
                    testing: ['投稿時間の最適化', 'コンテンツ形式の実験'],
                    deprecated: []
                },
                constraints: {
                    maxPostsPerDay: 15,
                    minQualityScore: 7.0,
                    brandSafety: ['投資勧誘禁止', '誇大表現禁止', '根拠のない情報禁止']
                }
            };
            this.saveFile(this.strategyFile, defaultStrategy);
        }
        if (!(0, fs_1.existsSync)(this.targetsFile)) {
            const defaultTargets = {
                version: '1.0.0',
                lastUpdated: Date.now(),
                targets: {
                    followers: {
                        current: 0,
                        daily: 2,
                        weekly: 14,
                        monthly: 60,
                        quarterly: 180
                    },
                    engagement: {
                        likesPerPost: 5,
                        retweetsPerPost: 1,
                        repliesPerPost: 1,
                        engagementRate: 3.0
                    },
                    reach: {
                        viewsPerPost: 50,
                        impressionsPerDay: 750
                    }
                },
                progress: {
                    followersGrowth: 0,
                    engagementGrowth: 0,
                    reachGrowth: 0,
                    overallScore: 0,
                    trend: 'ontrack'
                }
            };
            this.saveFile(this.targetsFile, defaultTargets);
        }
    }
    loadFile(filePath, defaultValue) {
        if ((0, fs_1.existsSync)(filePath)) {
            const result = (0, yaml_utils_1.loadYamlSafe)(filePath);
            return result !== null ? result : defaultValue;
        }
        return defaultValue;
    }
    saveFile(filePath, data) {
        try {
            (0, fs_1.writeFileSync)(filePath, yaml.dump(data, { indent: 2 }));
        }
        catch (error) {
            console.error(`Error saving ${filePath}:`, error);
        }
    }
    /**
     * 投稿履歴を分析してパフォーマンスを評価
     */
    async analyzePerformance(postHistory) {
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
        const recentPosts = postHistory.filter(p => p.timestamp > oneWeekAgo && p.success);
        const monthlyPosts = postHistory.filter(p => p.timestamp > oneMonthAgo && p.success);
        // 基本的な分析
        const averageLikes = recentPosts.reduce((sum, p) => sum + (p.likes || 0), 0) / recentPosts.length || 0;
        const averageRetweets = recentPosts.reduce((sum, p) => sum + (p.retweets || 0), 0) / recentPosts.length || 0;
        const averageReplies = recentPosts.reduce((sum, p) => sum + (p.replies || 0), 0) / recentPosts.length || 0;
        const averageViews = recentPosts.reduce((sum, p) => sum + (p.views || 0), 0) / recentPosts.length || 0;
        // エンゲージメント率計算
        const totalEngagement = recentPosts.reduce((sum, p) => sum + (p.likes || 0) + (p.retweets || 0) + (p.replies || 0), 0);
        const totalViews = recentPosts.reduce((sum, p) => sum + (p.views || 0), 0);
        const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
        // トップパフォーマンス投稿
        const topPosts = recentPosts
            .sort((a, b) => ((b.likes || 0) + (b.retweets || 0) + (b.replies || 0)) -
            ((a.likes || 0) + (a.retweets || 0) + (a.replies || 0)))
            .slice(0, 5)
            .map(p => ({
            id: p.id,
            content: p.content,
            likes: p.likes || 0,
            retweets: p.retweets || 0,
            replies: p.replies || 0,
            views: p.views || 0,
            timestamp: p.timestamp,
            themes: p.themes || []
        }));
        // 推奨事項の生成
        const recommendations = this.generateRecommendations(recentPosts, averageLikes, engagementRate);
        const insights = {
            version: '1.0.0',
            lastUpdated: now,
            analysisDate: now,
            metrics: {
                followers: {
                    current: 0, // 実際のフォロワー数は外部APIから取得
                    weeklyGrowth: 0,
                    monthlyGrowth: 0,
                    trend: 'stable'
                },
                engagement: {
                    averageLikes,
                    averageRetweets,
                    averageReplies,
                    engagementRate,
                    trend: engagementRate > 3.0 ? 'up' : engagementRate < 2.0 ? 'down' : 'stable'
                },
                reach: {
                    averageViews,
                    impressions: averageViews * recentPosts.length,
                    trend: 'stable'
                }
            },
            topPerformingPosts: topPosts,
            contentAnalysis: {
                bestPerformingThemes: this.extractBestThemes(topPosts),
                bestPerformingTimes: this.extractBestTimes(topPosts),
                bestPerformingFormats: ['教育コンテンツ', '実例紹介'],
                underperformingPatterns: this.identifyUnderperformingPatterns(recentPosts)
            },
            recommendations
        };
        this.saveFile(this.performanceFile, insights);
    }
    /**
     * 戦略を最適化し、更新提案を生成
     */
    async optimizeStrategy() {
        const strategy = this.getCurrentStrategy();
        const performance = this.getPerformanceInsights();
        const targets = this.getGrowthTargets();
        const updates = [];
        // エンゲージメント率が低い場合の戦略調整
        if (performance.metrics.engagement.engagementRate < 2.0) {
            updates.push({
                type: 'content',
                description: 'エンゲージメント率向上のためのコンテンツ戦略調整',
                changes: {
                    themes: [...strategy.contentStrategy.themes, '実践的なアドバイス'],
                    postingFrequency: Math.min(strategy.contentStrategy.postingFrequency + 1, 15)
                },
                confidence: 0.8
            });
        }
        // 成功パターンの分析に基づく最適化
        if (performance.topPerformingPosts.length > 0) {
            const bestThemes = this.extractBestThemes(performance.topPerformingPosts);
            if (bestThemes.length > 0) {
                updates.push({
                    type: 'strategy',
                    description: '成功パターンに基づくテーマ最適化',
                    changes: {
                        primaryThemes: bestThemes,
                        focusAreas: bestThemes.slice(0, 3)
                    },
                    confidence: 0.9
                });
            }
        }
        // 戦略更新の適用
        if (updates.length > 0) {
            await this.applyStrategicUpdates(updates);
        }
        return updates;
    }
    /**
     * 戦略的判断を記録
     */
    recordStrategicDecision(type, description, reasoning, confidence) {
        const decisions = this.loadFile(this.decisionsFile, []);
        const decision = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type,
            description,
            reasoning,
            dataPoints: [], // 実際の実装では分析データを含める
            expectedImpact: this.predictImpact(type, description),
            confidence,
            status: 'active'
        };
        decisions.push(decision);
        // 最新100件のみ保持
        if (decisions.length > 100) {
            decisions.splice(0, decisions.length - 100);
        }
        this.saveFile(this.decisionsFile, decisions);
    }
    /**
     * 現在の戦略を取得
     */
    getCurrentStrategy() {
        return this.loadFile(this.strategyFile, {});
    }
    /**
     * パフォーマンス分析結果を取得
     */
    getPerformanceInsights() {
        return this.loadFile(this.performanceFile, {});
    }
    /**
     * 成長目標を取得
     */
    getGrowthTargets() {
        return this.loadFile(this.targetsFile, {});
    }
    /**
     * 戦略的コンテキストのサマリーを取得
     */
    getContextSummary() {
        const strategy = this.getCurrentStrategy();
        const performance = this.getPerformanceInsights();
        const targets = this.getGrowthTargets();
        return `
現在の戦略フェーズ: ${strategy.currentPhase}
主要目標: ${strategy.objectives.primary}
注力テーマ: ${strategy.contentStrategy.themes.join(', ')}
エンゲージメント率: ${performance.metrics?.engagement?.engagementRate?.toFixed(1) || 'N/A'}%
成長トレンド: ${performance.metrics?.engagement?.trend || 'N/A'}
推奨事項: ${performance.recommendations?.immediate?.join(', ') || 'なし'}
    `.trim();
    }
    generateRecommendations(posts, averageLikes, engagementRate) {
        const immediate = [];
        const shortTerm = [];
        const longTerm = [];
        if (engagementRate < 2.0) {
            immediate.push('エンゲージメント率向上のため、より対話的なコンテンツを検討');
        }
        if (averageLikes < 5) {
            shortTerm.push('投稿内容の教育的価値を高める');
        }
        if (posts.length < 10) {
            longTerm.push('継続的な投稿でアカウントの信頼性を構築');
        }
        return { immediate, shortTerm, longTerm };
    }
    extractBestThemes(posts) {
        const themeCount = {};
        posts.forEach(post => {
            post.themes.forEach(theme => {
                themeCount[theme] = (themeCount[theme] || 0) + 1;
            });
        });
        return Object.entries(themeCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([theme]) => theme);
    }
    extractBestTimes(posts) {
        const timeCount = {};
        posts.forEach(post => {
            const date = new Date(post.timestamp);
            const hour = date.getHours();
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            timeCount[timeSlot] = (timeCount[timeSlot] || 0) + 1;
        });
        return Object.entries(timeCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([time]) => time);
    }
    identifyUnderperformingPatterns(posts) {
        const patterns = [];
        // 低エンゲージメント投稿の特徴を分析
        const lowEngagementPosts = posts.filter(p => (p.likes || 0) + (p.retweets || 0) + (p.replies || 0) < 3);
        if (lowEngagementPosts.length > posts.length * 0.3) {
            patterns.push('30%以上の投稿で低エンゲージメント');
        }
        return patterns;
    }
    predictImpact(type, description) {
        switch (type) {
            case 'content_adjustment':
                return 'エンゲージメント率の向上が期待される';
            case 'timing_change':
                return 'リーチの拡大が期待される';
            case 'strategy_shift':
                return 'フォロワー増加率の向上が期待される';
            default:
                return '測定可能な改善が期待される';
        }
    }
    async applyStrategicUpdates(updates) {
        const strategy = this.getCurrentStrategy();
        updates.forEach(update => {
            if (update.type === 'content') {
                Object.assign(strategy.contentStrategy, update.changes);
            }
            else if (update.type === 'strategy') {
                Object.assign(strategy.growthTactics, update.changes);
            }
        });
        strategy.lastUpdated = Date.now();
        this.saveFile(this.strategyFile, strategy);
        // 戦略更新の記録
        this.recordStrategicDecision('strategy_shift', `${updates.length}件の戦略更新を適用`, `パフォーマンス分析に基づく自動最適化`, updates.reduce((sum, u) => sum + u.confidence, 0) / updates.length);
    }
}
exports.GrowthSystemManager = GrowthSystemManager;
