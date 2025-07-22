export class ExpandedActionExecutor {
    xClient;
    postingManager;
    constructor(xClient, postingManager) {
        this.xClient = xClient;
        this.postingManager = postingManager;
    }
    async executeAction(decision) {
        try {
            switch (decision.type) {
                case 'original_post':
                    return await this.executeOriginalPost(decision);
                default:
                    throw new Error(`Unsupported action type: ${decision.type}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                actionId: decision.id,
                type: decision.type,
                timestamp: Date.now(),
                error: errorMessage
            };
        }
    }
    async executeOriginalPost(decision) {
        const content = decision.params.originalContent || decision.content;
        if (!content) {
            throw new Error('Original post requires content');
        }
        const result = await this.postingManager.postNow(content);
        return {
            success: result.success,
            actionId: decision.id,
            type: 'original_post',
            timestamp: result.timestamp,
            tweetId: result.id,
            content,
            error: result.error
        };
    }
    // バッチ実行機能
    async executeActions(decisions) {
        const results = [];
        for (const decision of decisions) {
            try {
                const result = await this.executeAction(decision);
                results.push(result);
                // API制限を考慮して少し待機
                if (decisions.length > 1) {
                    await this.waitForApiLimit();
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    success: false,
                    actionId: decision.id,
                    type: decision.type,
                    timestamp: Date.now(),
                    error: errorMessage
                });
            }
        }
        return results;
    }
    async waitForApiLimit() {
        // 1秒待機してAPI制限を回避
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // アクション統計情報取得
    getActionStats() {
        return this.postingManager.getPostingStats();
    }
}
