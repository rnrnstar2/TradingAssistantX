/**
 * Claude判断特化最適情報プロバイダー
 * コンテキスト圧迫抑制・最小情報システム用
 */
import { RealtimeInfoCollector } from './realtime-info-collector';
import { logger } from './minimal-logger';
export class ClaudeOptimizedProvider {
    infoCollector;
    constructor() {
        this.infoCollector = new RealtimeInfoCollector();
    }
    /**
     * Claude判断に特化した最小限コンテキスト
     */
    async getDecisionContext(actionType) {
        const startTime = Date.now();
        try {
            const essentialContext = await this.infoCollector.getEssentialContext();
            const context = {
                current: {
                    time: this.getCurrentTime(),
                    accountHealth: essentialContext.account.healthScore,
                    todayProgress: essentialContext.account.todayActions
                },
                immediate: {
                    bestOpportunity: this.getBestOpportunity(essentialContext, actionType),
                    constraints: this.getActiveConstraints(essentialContext)
                },
                context: this.getMinimalContext(200)
            };
            logger.performance('DecisionContext取得', startTime);
            return context;
        }
        catch (error) {
            logger.error('DecisionContext取得エラー', error);
            throw error;
        }
    }
    /**
     * 現在時刻の簡潔な表現
     */
    getCurrentTime() {
        return new Date().toISOString().slice(11, 19); // HH:mm:ss
    }
    /**
     * 最適機会の特定
     */
    getBestOpportunity(context, actionType) {
        const opportunities = context.opportunities;
        if (opportunities.length === 0) {
            return 'wait - 最適タイミング待機';
        }
        const best = opportunities[0];
        return `${best.type} - ${best.reason}`;
    }
    /**
     * アクティブな制約の取得
     */
    getActiveConstraints(context) {
        const constraints = [];
        // 日次制限チェック
        if (context.account.todayActions >= 15) {
            constraints.push('日次制限到達');
        }
        // アカウント健康度チェック
        if (context.account.healthScore < 50) {
            constraints.push('アカウント健康度低下');
        }
        // 市場活動レベル
        if (context.market.activity === 'low') {
            constraints.push('市場活動低調');
        }
        return constraints;
    }
    /**
     * 最大200文字に制限された最小コンテキスト
     */
    getMinimalContext(maxChars) {
        const context = '投資教育コンテンツでの信頼性構築、価値提供重視。トレーディング技術と市場洞察を通じた実用的な知識共有。';
        return context.slice(0, maxChars);
    }
    /**
     * 高速判断用の最小限プロンプト生成
     */
    async buildMinimalPrompt(context) {
        if (!context) {
            context = await this.getDecisionContext();
        }
        const prompt = `
状況: アカウント健康度${context.current.accountHealth}%, 今日${context.current.todayProgress}/15回実行済み
制約: ${context.immediate.constraints.join(', ') || 'なし'}
機会: ${context.immediate.bestOpportunity}

X（Twitter）での価値創造のため最適なアクション1つを選択:
1. post - 独自投稿 (市場洞察・教育コンテンツ)
2. engage - エンゲージメント (リプライ・引用)  
3. amplify - 価値拡散 (リツイート)
4. wait - 最適タイミング待機

選択理由も含め簡潔に回答してください。
`.trim();
        return prompt;
    }
    /**
     * リアルタイム状態の簡潔な文字列表現
     */
    async getStatusSummary() {
        const context = await this.getDecisionContext();
        return `[${context.current.time}] 健康度:${context.current.accountHealth}% 進捗:${context.current.todayProgress}/15 機会:${context.immediate.bestOpportunity.split(' - ')[0]}`;
    }
    /**
     * 判断履歴の最小化
     */
    logDecision(decision, reason, confidence) {
        // 簡潔な判断ログのみ
        logger.decision(decision, reason);
        // 信頼度が低い場合のみ警告
        if (confidence < 0.7) {
            logger.warn(`判断信頼度低: ${confidence}`);
        }
    }
    /**
     * パフォーマンス監視
     */
    async monitorPerformance() {
        const startTime = Date.now();
        // コンテキスト取得速度測定
        await this.getDecisionContext();
        const contextTime = Date.now() - startTime;
        if (contextTime > 3000) { // 3秒以上
            logger.warn(`Context取得遅延: ${contextTime}ms`);
        }
        // メモリ使用量チェック
        logger.memoryUsage();
    }
}
