import { SimpleXClient } from './x-client';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { DailyActionPlanner } from './daily-action-planner';
import * as yaml from 'js-yaml';
// 即時投稿機能のみ - スケジュール実行対応
export class PostingManager {
    xClient;
    config;
    dailyActionPlanner;
    // 即時投稿機能のみ - スケジュール実行で直接投稿
    dataDir = 'data';
    historyFile = 'data/posting-history.yaml';
    constructor(config, xClientConfig) {
        this.xClient = new SimpleXClient(xClientConfig);
        this.dailyActionPlanner = new DailyActionPlanner();
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
        if (!existsSync(this.dataDir)) {
            mkdirSync(this.dataDir, { recursive: true });
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
            const result = {
                success: false,
                error: canPost.reason,
                timestamp: Date.now()
            };
            // 失敗もDailyActionPlannerに記録
            await this.recordToAllSystems(result, content, 'original_post');
            return result;
        }
        // 重複チェック
        if (this.isDuplicateContent(content)) {
            const result = {
                success: false,
                error: '類似した内容が最近投稿されています',
                timestamp: Date.now()
            };
            // 失敗もDailyActionPlannerに記録
            await this.recordToAllSystems(result, content, 'original_post');
            return result;
        }
        // 投稿実行
        const result = await this.xClient.post(content);
        // 成功/失敗に関わらずDailyActionPlannerにも記録
        await this.recordToAllSystems(result, content, 'original_post');
        return result;
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
    // データ同期システム - 両ファイルへの統合記録
    async recordToAllSystems(result, content, actionType) {
        try {
            const actionResult = {
                success: result.success,
                actionId: `posting-${Date.now()}-${actionType}`,
                type: actionType,
                timestamp: result.timestamp,
                content,
                error: result.error
            };
            // DailyActionPlannerにも記録（xClientの記録と並行）
            await this.dailyActionPlanner.recordAction(actionResult);
            console.log(`🔄 [データ同期] ${actionType}アクションを両システムに記録完了`);
        }
        catch (error) {
            console.error('❌ [データ同期エラー]:', error);
        }
    }
    // データファイル間の整合性チェック
    async syncDataFiles() {
        console.log('🔍 [データ同期] 両ファイル間の整合性をチェック中...');
        try {
            const inconsistencies = [];
            // posting-history.yamlの読み込み
            const historyData = this.loadPostingHistory();
            const today = new Date().toISOString().split('T')[0];
            const todayHistory = historyData.filter(entry => {
                const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
                return entryDate === today;
            });
            // daily-action-data.yamlの読み込み
            const dailyActions = await this.dailyActionPlanner.getTodaysActions();
            console.log(`📊 [整合性チェック] posting-history: ${todayHistory.length}件, daily-action-data: ${dailyActions.length}件`);
            // 成功アクション数の不整合チェック
            const historySuccessCount = todayHistory.filter(h => h.success).length;
            const dailySuccessCount = dailyActions.filter(a => a.success).length;
            if (historySuccessCount !== dailySuccessCount) {
                inconsistencies.push(`成功アクション数不整合: posting-history=${historySuccessCount}, daily-action-data=${dailySuccessCount}`);
            }
            // 全アクション数の不整合チェック（daily-action-dataは全て失敗の場合の問題）
            if (dailyActions.length > 0 && dailyActions.every(a => !a.success) && historySuccessCount > 0) {
                inconsistencies.push(`daily-action-data.yamlに成功アクションが記録されていないが、posting-history.yamlには成功アクションが存在`);
            }
            console.log(`✅ [整合性チェック完了] 不整合: ${inconsistencies.length}件`);
            return {
                success: inconsistencies.length === 0,
                inconsistencies,
                repaired: false
            };
        }
        catch (error) {
            console.error('❌ [整合性チェックエラー]:', error);
            return {
                success: false,
                inconsistencies: [`チェック実行エラー: ${error}`],
                repaired: false
            };
        }
    }
    // 不整合データの修復
    async repairDataInconsistency() {
        console.log('🔧 [データ修復] 不整合データの修復を開始...');
        const repairedItems = [];
        try {
            // 現在の不整合状況を確認
            const syncResult = await this.syncDataFiles();
            if (syncResult.success) {
                console.log('✅ [データ修復] 修復が必要な不整合は見つかりませんでした');
                return { success: true, repairedItems };
            }
            // daily-action-data.yamlの不正なカウントを修復
            const dailyActions = await this.dailyActionPlanner.getTodaysActions();
            const successfulActions = dailyActions.filter(a => a.success);
            // totalActionsを成功アクション数に修正（指示書の要件）
            if (dailyActions.length > 0 && successfulActions.length === 0 && dailyActions.every(a => !a.success)) {
                console.log('🔧 [修復実行] daily-action-data.yamlのtotalActionsを0に修正中...');
                // daily-action-data.yamlの直接修正
                await this.repairDailyActionData();
                repairedItems.push('daily-action-data.yamlのtotalActionsを成功アクション数(0)に修正');
            }
            console.log(`✅ [データ修復完了] ${repairedItems.length}件の項目を修復しました`);
            return { success: true, repairedItems };
        }
        catch (error) {
            console.error('❌ [データ修復エラー]:', error);
            return { success: false, repairedItems };
        }
    }
    // posting-history.yamlの読み込み
    loadPostingHistory() {
        try {
            if (!existsSync(this.historyFile)) {
                return [];
            }
            const rawData = readFileSync(this.historyFile, 'utf8');
            const parsed = yaml.load(rawData);
            if (parsed && parsed.recent && Array.isArray(parsed.recent)) {
                // recent形式の場合
                return parsed.recent.map((item) => ({
                    timestamp: new Date(item.time).getTime(),
                    success: item.success,
                    type: item.type
                }));
            }
            else if (Array.isArray(parsed)) {
                // 配列形式の場合
                return parsed;
            }
            return [];
        }
        catch (error) {
            console.error('⚠️ [履歴読み込みエラー]:', error);
            return [];
        }
    }
    // daily-action-data.yamlの修復
    async repairDailyActionData() {
        const dailyFile = 'data/daily-action-data.yaml';
        try {
            if (!existsSync(dailyFile)) {
                console.log('⚠️ daily-action-data.yamlが存在しません');
                return;
            }
            const rawData = readFileSync(dailyFile, 'utf8');
            const data = yaml.load(rawData);
            if (Array.isArray(data) && data.length > 0) {
                const todayEntry = data[0]; // 最新エントリを修正
                if (todayEntry && todayEntry.executedActions) {
                    const successfulActions = todayEntry.executedActions.filter((a) => a.success);
                    // totalActionsを成功アクション数に修正
                    todayEntry.totalActions = successfulActions.length;
                    // targetReachedを正しい値に修正
                    todayEntry.targetReached = successfulActions.length >= 15;
                    // ファイル保存
                    writeFileSync(dailyFile, yaml.dump(data, { indent: 2 }));
                    console.log(`✅ [修復完了] totalActions: ${todayEntry.totalActions}, targetReached: ${todayEntry.targetReached}`);
                }
            }
        }
        catch (error) {
            console.error('❌ [daily-action-data修復エラー]:', error);
        }
    }
}
