"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyActionPlanner = void 0;
const fs_1 = require("fs");
const yaml_utils_1 = require("../utils/yaml-utils");
class DailyActionPlanner {
    DAILY_TARGET = 15;
    logFile = 'data/daily-action-log.json';
    strategyFile = 'data/content-strategy.yaml';
    constructor() {
        this.ensureDataDirectory();
    }
    ensureDataDirectory() {
        const fs = require('fs');
        if (!fs.existsSync('data')) {
            fs.mkdirSync('data', { recursive: true });
        }
    }
    // 1日の配分計画を策定
    async planDailyDistribution() {
        console.log('📋 [日次配分計画] 1日15回の最適配分を策定中...');
        const currentActions = await this.getTodaysActions();
        const remaining = this.DAILY_TARGET - currentActions.length;
        console.log(`📊 [配分状況] 本日実行済み: ${currentActions.length}/15, 残り: ${remaining}`);
        if (remaining <= 0) {
            console.log('✅ [配分完了] 本日の目標回数に到達済み');
            return this.createCompletedDistribution();
        }
        const distribution = {
            remaining,
            optimal_distribution: this.calculateOptimalDistribution(remaining),
            timing_recommendations: await this.getTimingRecommendations(remaining)
        };
        console.log('📋 [配分計画完了]', {
            remaining: distribution.remaining,
            distribution: distribution.optimal_distribution,
            timingSlots: distribution.timing_recommendations.length
        });
        return distribution;
    }
    // 最適配分の計算
    calculateOptimalDistribution(remaining) {
        console.log(`🧮 [配分計算] 残り${remaining}回の最適配分を計算中...`);
        if (remaining <= 0) {
            return { original_post: 0, quote_tweet: 0, retweet: 0, reply: 0 };
        }
        // 基本配分比率: 40% original, 30% quote, 20% retweet, 10% reply
        const base = {
            original_post: Math.ceil(remaining * 0.4), // 40%
            quote_tweet: Math.ceil(remaining * 0.3), // 30%
            retweet: Math.ceil(remaining * 0.2), // 20%
            reply: Math.ceil(remaining * 0.1) // 10%
        };
        // 合計が残り回数と一致するよう調整
        const adjusted = this.adjustToTarget(base, remaining);
        console.log('🧮 [配分計算完了]', {
            target: remaining,
            calculated: adjusted,
            total: Object.values(adjusted).reduce((sum, count) => sum + count, 0)
        });
        return adjusted;
    }
    // 配分調整（合計を目標値に合わせる）
    adjustToTarget(base, target) {
        const currentTotal = Object.values(base).reduce((sum, count) => sum + count, 0);
        const difference = target - currentTotal;
        if (difference === 0)
            return base;
        const adjusted = { ...base };
        if (difference > 0) {
            // 不足分をoriginal_postに追加
            adjusted.original_post += difference;
        }
        else {
            // 超過分を削減（original_post優先で調整）
            const excess = Math.abs(difference);
            if (adjusted.original_post >= excess) {
                adjusted.original_post -= excess;
            }
            else {
                // original_postで足りない場合は他からも削減
                let remaining = excess - adjusted.original_post;
                adjusted.original_post = 0;
                if (remaining > 0 && adjusted.quote_tweet >= remaining) {
                    adjusted.quote_tweet -= remaining;
                }
                else if (remaining > 0) {
                    const quoteTweetReduction = Math.min(adjusted.quote_tweet, remaining);
                    adjusted.quote_tweet -= quoteTweetReduction;
                    remaining -= quoteTweetReduction;
                    if (remaining > 0) {
                        adjusted.retweet = Math.max(0, adjusted.retweet - remaining);
                    }
                }
            }
        }
        return adjusted;
    }
    // タイミング推奨の取得
    async getTimingRecommendations(remaining) {
        console.log(`⏰ [タイミング推奨] 残り${remaining}回のタイミングを推奨中...`);
        const strategy = await this.loadContentStrategy();
        const optimalTimes = strategy?.optimal_times || this.getDefaultOptimalTimes();
        // 既に使用された時間帯を除外
        const usedTimes = await this.getUsedTimesToday();
        const availableSlots = optimalTimes.filter((time) => !this.isTimeSlotUsed(time, usedTimes));
        console.log(`⏰ [利用可能スロット] ${availableSlots.length}/${optimalTimes.length}スロット利用可能`);
        return this.distributeActionsAcrossSlots(availableSlots, remaining);
    }
    // コンテンツ戦略の読み込み
    async loadContentStrategy() {
        try {
            const strategy = (0, yaml_utils_1.loadYamlSafe)(this.strategyFile);
            return strategy || this.getDefaultStrategy();
        }
        catch (error) {
            console.warn('⚠️ [戦略読み込み] content-strategy.yamlの読み込みに失敗、デフォルト戦略を使用');
            return this.getDefaultStrategy();
        }
    }
    // デフォルト戦略の取得
    getDefaultStrategy() {
        return {
            optimal_times: this.getDefaultOptimalTimes(),
            posting_frequency: 15,
            content_themes: ['investment', 'market_analysis', 'education']
        };
    }
    // デフォルト最適時間の取得
    getDefaultOptimalTimes() {
        return [
            '07:00', '08:30', '10:00', '11:30', '13:00',
            '14:30', '16:00', '17:30', '19:00', '20:30',
            '22:00', '09:00', '15:00', '18:00', '21:00'
        ];
    }
    // 今日使用された時間帯の取得
    async getUsedTimesToday() {
        const todaysActions = await this.getTodaysActions();
        return todaysActions.map(action => {
            const date = new Date(action.timestamp);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
    }
    // 時間帯使用チェック
    isTimeSlotUsed(targetTime, usedTimes) {
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);
        return usedTimes.some(usedTime => {
            const [usedHour, usedMinute] = usedTime.split(':').map(Number);
            // 30分以内は同じスロットとみなす
            const timeDifference = Math.abs((targetHour * 60 + targetMinute) - (usedHour * 60 + usedMinute));
            return timeDifference < 30;
        });
    }
    // アクションを時間帯に配分
    distributeActionsAcrossSlots(availableSlots, remaining) {
        const recommendations = [];
        const actionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'];
        // 使用可能スロットが少ない場合は調整
        const slotsToUse = Math.min(availableSlots.length, remaining);
        const selectedSlots = availableSlots.slice(0, slotsToUse);
        for (let i = 0; i < slotsToUse; i++) {
            const slot = selectedSlots[i];
            const actionType = actionTypes[i % actionTypes.length];
            const priority = this.calculateSlotPriority(slot, actionType);
            recommendations.push({
                time: slot,
                actionType,
                priority,
                reasoning: this.generateTimingReasoning(slot, actionType)
            });
        }
        // 優先度順にソート
        recommendations.sort((a, b) => b.priority - a.priority);
        console.log(`⏰ [タイミング推奨完了] ${recommendations.length}件の推奨タイミングを生成`);
        return recommendations;
    }
    // スロット優先度の計算
    calculateSlotPriority(time, actionType) {
        const [hour] = time.split(':').map(Number);
        // 時間帯による基本優先度
        let basePriority = 5;
        if (hour >= 7 && hour <= 9)
            basePriority = 8; // 朝の活動時間
        if (hour >= 19 && hour <= 21)
            basePriority = 9; // 夕方のゴールデンタイム
        if (hour >= 12 && hour <= 14)
            basePriority = 7; // 昼休み時間
        // アクション型による調整
        const actionModifier = {
            'original_post': 1.2,
            'quote_tweet': 1.1,
            'retweet': 1.0,
            'reply': 0.9,
            'thread_post': 1.3
        };
        return Math.round(basePriority * (actionModifier[actionType] || 1.0));
    }
    // タイミング推奨理由の生成
    generateTimingReasoning(time, actionType) {
        const [hour] = time.split(':').map(Number);
        const timeReasons = {
            morning: 'フォロワーの活動開始時間に合わせた効果的な投稿タイミング',
            lunch: '昼休み時間でエンゲージメントが期待できる時間帯',
            evening: 'ゴールデンタイムでの最大リーチを狙う戦略的タイミング',
            night: '一日の振り返りや情報収集時間に適した投稿タイミング'
        };
        let timeCategory = 'night';
        if (hour >= 7 && hour <= 10)
            timeCategory = 'morning';
        if (hour >= 12 && hour <= 14)
            timeCategory = 'lunch';
        if (hour >= 17 && hour <= 21)
            timeCategory = 'evening';
        const actionTypeReasons = {
            'original_post': '独自コンテンツでの価値提供',
            'quote_tweet': '有益な情報への付加価値コメント',
            'retweet': '関連情報の効率的なシェア',
            'reply': 'コミュニティエンゲージメント強化',
            'thread_post': 'スレッド形式での詳細解説'
        };
        const timeReason = timeReasons[timeCategory] || timeReasons.night;
        const actionReason = actionTypeReasons[actionType] || '価値創造アクション';
        return `${timeReason} - ${actionReason}`;
    }
    // 今日のアクション取得
    async getTodaysActions() {
        try {
            if (!(0, fs_1.existsSync)(this.logFile)) {
                return [];
            }
            const logData = JSON.parse((0, fs_1.readFileSync)(this.logFile, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            const todaysLog = logData.find((log) => log.date === today);
            return todaysLog?.executedActions || [];
        }
        catch (error) {
            console.error('❌ [ログ読み込みエラー]:', error);
            return [];
        }
    }
    // アクション実行の記録
    async recordAction(actionResult) {
        console.log(`📝 [アクション記録] ${actionResult.type}アクションを記録中...`);
        try {
            const today = new Date().toISOString().split('T')[0];
            let logData = [];
            if ((0, fs_1.existsSync)(this.logFile)) {
                logData = JSON.parse((0, fs_1.readFileSync)(this.logFile, 'utf8'));
            }
            // 今日のログを取得または作成
            let todaysLog = logData.find(log => log.date === today);
            if (!todaysLog) {
                todaysLog = {
                    date: today,
                    totalActions: 0,
                    actionBreakdown: {
                        original_post: 0,
                        quote_tweet: 0,
                        retweet: 0,
                        reply: 0
                    },
                    executedActions: [],
                    targetReached: false
                };
                logData.push(todaysLog);
            }
            // アクションを記録
            todaysLog.executedActions.push(actionResult);
            todaysLog.totalActions = todaysLog.executedActions.length;
            // 配分カウンターを更新（対応するアクション型のみ）
            const validActionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'];
            if (validActionTypes.includes(actionResult.type)) {
                todaysLog.actionBreakdown[actionResult.type]++;
            }
            // 目標達成チェック
            todaysLog.targetReached = todaysLog.totalActions >= this.DAILY_TARGET;
            // 最新30日分のみ保持
            logData = logData.slice(-30);
            (0, fs_1.writeFileSync)(this.logFile, JSON.stringify(logData, null, 2));
            console.log(`✅ [アクション記録完了] ${actionResult.type} - 本日${todaysLog.totalActions}/${this.DAILY_TARGET}回`);
            if (todaysLog.targetReached) {
                console.log('🎯 [目標達成] 本日の投稿目標15回に到達しました！');
            }
        }
        catch (error) {
            console.error('❌ [アクション記録エラー]:', error);
        }
    }
    // 完了配分の作成
    createCompletedDistribution() {
        return {
            remaining: 0,
            optimal_distribution: {
                original_post: 0,
                quote_tweet: 0,
                retweet: 0,
                reply: 0
            },
            timing_recommendations: []
        };
    }
    // 統計情報の取得
    async getActionStats(days = 7) {
        console.log(`📊 [統計取得] 過去${days}日間のアクション統計を生成中...`);
        try {
            if (!(0, fs_1.existsSync)(this.logFile)) {
                return this.getEmptyStats();
            }
            const logData = JSON.parse((0, fs_1.readFileSync)(this.logFile, 'utf8'));
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const recentLogs = logData.filter(log => new Date(log.date) >= cutoffDate);
            const stats = {
                period: `${days}日間`,
                totalDays: recentLogs.length,
                totalActions: recentLogs.reduce((sum, log) => sum + log.totalActions, 0),
                averageActionsPerDay: 0,
                targetAchievementRate: 0,
                actionBreakdown: {
                    original_post: 0,
                    quote_tweet: 0,
                    retweet: 0,
                    reply: 0
                },
                dailyDetails: recentLogs
            };
            if (stats.totalDays > 0) {
                stats.averageActionsPerDay = stats.totalActions / stats.totalDays;
                const achievedDays = recentLogs.filter(log => log.targetReached).length;
                stats.targetAchievementRate = (achievedDays / stats.totalDays) * 100;
                // 配分統計の計算
                recentLogs.forEach(log => {
                    Object.keys(stats.actionBreakdown).forEach(key => {
                        stats.actionBreakdown[key] += log.actionBreakdown[key] || 0;
                    });
                });
            }
            console.log('📊 [統計取得完了]', {
                period: stats.period,
                avgActions: Math.round(stats.averageActionsPerDay * 10) / 10,
                achievementRate: Math.round(stats.targetAchievementRate * 10) / 10 + '%'
            });
            return stats;
        }
        catch (error) {
            console.error('❌ [統計取得エラー]:', error);
            return this.getEmptyStats();
        }
    }
    // 空の統計情報
    getEmptyStats() {
        return {
            period: '0日間',
            totalDays: 0,
            totalActions: 0,
            averageActionsPerDay: 0,
            targetAchievementRate: 0,
            actionBreakdown: {
                original_post: 0,
                quote_tweet: 0,
                retweet: 0,
                reply: 0
            },
            dailyDetails: []
        };
    }
    // 今日の進捗確認
    async getTodayProgress() {
        const todaysActions = await this.getTodaysActions();
        const distribution = await this.planDailyDistribution();
        return {
            completed: todaysActions.length,
            target: this.DAILY_TARGET,
            remaining: distribution.remaining,
            progress: Math.round((todaysActions.length / this.DAILY_TARGET) * 100),
            nextRecommendation: distribution.timing_recommendations[0] || null,
            isComplete: todaysActions.length >= this.DAILY_TARGET
        };
    }
}
exports.DailyActionPlanner = DailyActionPlanner;
