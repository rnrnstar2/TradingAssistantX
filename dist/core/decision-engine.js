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
exports.DecisionEngine = void 0;
const claude_code_sdk_ts_1 = require("@instantlyeasy/claude-code-sdk-ts");
const yaml_utils_1 = require("../utils/yaml-utils");
const yaml = __importStar(require("js-yaml"));
class DecisionEngine {
    constructor() {
        // Claude Code SDK is used directly
    }
    // 新しい統合コンテキスト対応メソッド
    async planActionsWithIntegratedContext(integratedContext) {
        console.log('🧠 [統合コンテキスト決定] IntegratedContextを活用した意思決定を開始...');
        console.log('📊 統合情報:', {
            accountHealth: integratedContext.account.healthScore,
            trendCount: integratedContext.market.trends.length,
            opportunityCount: integratedContext.market.opportunities.length,
            suggestionCount: integratedContext.actionSuggestions.length
        });
        try {
            const decisions = await this.makeIntegratedDecisions(integratedContext);
            await this.saveIntegratedDecisions(decisions, integratedContext);
            console.log(`✅ [統合決定完了] ${decisions.length}件の統合的決定を策定`);
            return decisions;
        }
        catch (error) {
            console.error('❌ [統合決定エラー]:', error);
            return this.createFallbackDecisions(integratedContext);
        }
    }
    async analyzeAndDecide(context) {
        console.log('🧠 [Claude分析開始] コンテキスト分析中...');
        console.log('📊 現在の状況:', {
            timestamp: context.timestamp,
            systemStatus: context.systemStatus,
            hasMetrics: !!context.metrics,
            recentActionsCount: context.recentActions?.length || 0
        });
        const sharedContext = await this.loadSharedContext();
        const decisions = await this.makeStrategicDecisions(context, sharedContext);
        await this.saveDecisions(decisions);
        return decisions;
    }
    // 統合意思決定メソッド（新しいメイン処理）
    async makeIntegratedDecisions(integratedContext) {
        console.log('🧠 [統合意思決定] 統合コンテキストに基づく高度な意思決定を実行中...');
        const claudePrompt = `
Based on the integrated analysis context, make strategic decisions for X (Twitter) content and engagement:

ACCOUNT STATUS:
${JSON.stringify(integratedContext.account, null, 2)}

MARKET CONTEXT:
${JSON.stringify(integratedContext.market, null, 2)}

ACTION SUGGESTIONS:
${JSON.stringify(integratedContext.actionSuggestions, null, 2)}

Make strategic decisions considering:
1. Account health and growth needs (current score: ${integratedContext.account.healthScore}/100)
2. Market trends and opportunities (${integratedContext.market.opportunities.length} opportunities available)
3. Optimal timing for 15 daily posts
4. Action type diversity: original_post, quote_tweet, retweet, reply
5. Risk management and quality control

Return decisions as JSON array with this exact structure:
[{
  "id": "decision-{timestamp}-{random}",
  "type": "content_generation|immediate_post|quote_tweet|retweet|engagement_boost|strategy_shift",
  "priority": "critical|high|medium|low",
  "reasoning": "detailed explanation of strategic reasoning",
  "params": {
    "actionType": "original_post|quote_tweet|retweet|reply",
    "targetContent": "specific content or target",
    "timing": "immediate|scheduled|optimal",
    "expectedImpact": 0.0-1.0
  },
  "dependencies": [],
  "estimatedDuration": number_in_minutes
}]

Prioritize:
- High-impact, low-risk actions for accounts with health score < 70
- Opportunity-driven content for healthy accounts (score > 80)
- Balanced approach for medium health accounts (70-80)
- Quality over quantity always

Limit to 8-12 decisions maximum.
`;
        try {
            const response = await (0, claude_code_sdk_ts_1.claude)()
                .withModel('sonnet')
                .query(claudePrompt)
                .asText();
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const decisions = JSON.parse(jsonMatch[0]);
                console.log('🧠 [統合決定完了] 以下の戦略的決定を策定:');
                decisions.forEach((decision, index) => {
                    console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
                    console.log(`     💭 戦略理由: ${decision.reasoning}`);
                    console.log(`     🎯 期待効果: ${decision.params?.expectedImpact || 'N/A'}`);
                    console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
                });
                return this.validateAndEnhanceDecisions(decisions, integratedContext);
            }
            console.log('⚠️ [統合決定] JSON解析に失敗、フォールバック決定を生成');
            return this.createFallbackDecisions(integratedContext);
        }
        catch (error) {
            console.error('❌ [統合決定エラー]:', error);
            return this.createFallbackDecisions(integratedContext);
        }
    }
    async planActions(needs) {
        console.log(`🎯 [Claude計画開始] ${needs.length}件のニーズから実行計画を策定...`);
        const decisions = await this.prioritizeNeeds(needs);
        console.log(`🔄 [Claude実行計画] ${decisions.length}件の決定を実行可能アクションに変換中...`);
        const actions = [];
        for (const decision of decisions) {
            const action = await this.convertDecisionToAction(decision);
            if (action) {
                actions.push(action);
            }
        }
        console.log(`✅ [Claude計画完了] ${actions.length}件のアクション生成完了`);
        actions.forEach((action, index) => {
            console.log(`   ${index + 1}. 【${action.type}】(${action.priority})`);
        });
        return actions;
    }
    async makeStrategicDecisions(context, sharedContext) {
        console.log('🧠 [Claude戦略思考] 戦略的決定を検討中...');
        console.log('📈 考慮要素:');
        console.log('   1. コンテンツ収集戦略');
        console.log('   2. 投稿タイミングと頻度');
        console.log('   3. リソース配分');
        console.log('   4. システム最適化ニーズ');
        const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Shared insights:
${JSON.stringify(sharedContext, null, 2)}

Make strategic decisions for the autonomous system.
Consider:
1. Content collection strategy
2. Posting timing and frequency
3. Resource allocation
4. System optimization needs

Return as JSON array of decisions with priority levels.
`;
        try {
            const response = await (0, claude_code_sdk_ts_1.claude)()
                .withModel('sonnet')
                .query(prompt)
                .asText();
            const decisions = JSON.parse(response);
            console.log(`🎯 [Claude戦略決定] ${decisions.length}件の戦略的決定を策定`);
            return decisions;
        }
        catch (error) {
            console.log('❌ [Claude戦略エラー] 戦略決定に失敗:', error);
            return [];
        }
    }
    async prioritizeNeeds(needs) {
        console.log('🧠 [Claude思考開始] ニーズ分析中...');
        console.log('📊 現在のニーズ:', needs.map(n => `${n.type}(${n.priority})`).join(', '));
        const prompt = `
Current needs:
${JSON.stringify(needs, null, 2)}

Convert these needs to actionable decisions with the following EXACT JSON structure.
Each decision MUST include all required fields:

REQUIRED DECISION FORMAT:
{
  "id": "decision-[timestamp]-[random]",
  "type": "[one of: collect_content, immediate_post, analyze_performance, optimize_timing, clean_data, strategy_shift, content_generation, posting_schedule]",
  "priority": "[one of: critical, high, medium, low]",
  "reasoning": "explanation of why this decision was made",
  "params": {},
  "dependencies": [],
  "estimatedDuration": [number in minutes]
}

Return ONLY a JSON array of decision objects. No markdown, no explanation.
Example: [{"id":"decision-123-abc","type":"content_generation","priority":"high","reasoning":"Need fresh content","params":{},"dependencies":[],"estimatedDuration":30}]
`;
        let response = '';
        try {
            response = await (0, claude_code_sdk_ts_1.claude)()
                .withModel('sonnet')
                .query(prompt)
                .asText();
            // Extract JSON from markdown code blocks if present
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : response;
            const decisions = JSON.parse(jsonText);
            console.log('🧠 [Claude判断完了] 以下の決定を下しました:');
            decisions.forEach((decision, index) => {
                console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
                console.log(`     💭 理由: ${decision.reasoning}`);
                console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
                if (decision.dependencies && decision.dependencies.length > 0) {
                    console.log(`     🔗 依存関係: ${decision.dependencies.join(', ')}`);
                }
            });
            return decisions;
        }
        catch (error) {
            console.error('❌ prioritizeNeeds JSON parse error:', error);
            return [];
        }
    }
    async convertDecisionToAction(decision) {
        console.log(`🔄 [Claude変換中] 決定「${decision.type}」をアクションに変換...`);
        const actionType = this.mapDecisionToActionType(decision);
        if (!actionType) {
            console.log(`❌ [Claude判断エラー] 未知の決定タイプ: "${decision.type}"`);
            console.log(`   利用可能なタイプ:`, Object.keys(this.getTypeMappingForDebug()));
            return null;
        }
        console.log(`✅ [Claude変換完了] "${decision.type}" → "${actionType}"`);
        console.log(`   💭 実行理由: ${decision.reasoning}`);
        return {
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: actionType,
            priority: decision.priority,
            params: decision.params || {},
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }
    mapDecisionToActionType(decision) {
        const typeMapping = {
            'collect_content': 'content_collection',
            'immediate_post': 'post_immediate',
            'analyze_performance': 'performance_analysis',
            'check_engagement': 'engagement_analysis',
            'review_growth': 'growth_analysis',
            'optimize_timing': 'timing_optimization',
            'clean_data': 'data_cleanup',
            'strategy_shift': 'strategy_optimization',
            'content_generation': 'content_creation',
            'posting_schedule': 'schedule_optimization'
        };
        return typeMapping[decision.type] || null;
    }
    async loadSharedContext() {
        const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
        const insightsPath = path.join(process.cwd(), 'data', 'context', 'shared-insights.yaml');
        const result = (0, yaml_utils_1.loadYamlSafe)(insightsPath);
        if (result !== null) {
            return result;
        }
        return {
            lastUpdated: new Date().toISOString(),
            insights: [],
            patterns: {},
            recommendations: []
        };
    }
    async saveDecisions(decisions) {
        const fs = (await Promise.resolve().then(() => __importStar(require('fs/promises')))).default;
        const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
        const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
        let history = (0, yaml_utils_1.loadYamlArraySafe)(decisionsPath);
        history.push({
            timestamp: new Date().toISOString(),
            decisions: decisions
        });
        // Keep only last 50 decision sets
        if (history.length > 50) {
            history = history.slice(-50);
        }
        await fs.mkdir(path.dirname(decisionsPath), { recursive: true });
        await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
    }
    // 決定の検証と強化
    validateAndEnhanceDecisions(decisions, context) {
        console.log('✅ [決定検証] 決定の妥当性と戦略的整合性を検証中...');
        const validatedDecisions = [];
        for (const decision of decisions) {
            // 基本的な検証
            if (!decision.id || !decision.type || !decision.priority) {
                console.log(`⚠️ [検証失敗] 不完全な決定をスキップ: ${JSON.stringify(decision)}`);
                continue;
            }
            // アカウントヘルスに基づく調整
            const adjustedDecision = this.adjustDecisionForAccountHealth(decision, context.account.healthScore);
            // 市場機会との整合性チェック
            const contextualDecision = this.alignDecisionWithMarketContext(adjustedDecision, context.market);
            validatedDecisions.push(contextualDecision);
        }
        console.log(`✅ [決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
        return validatedDecisions;
    }
    // アカウントヘルスに基づく決定調整
    adjustDecisionForAccountHealth(decision, healthScore) {
        let adjustedPriority = decision.priority;
        let adjustedParams = { ...decision.params };
        if (healthScore < 50) {
            // ヘルス低下時：保守的なアプローチ
            if (decision.priority === 'high')
                adjustedPriority = 'medium';
            adjustedParams.riskLevel = 'low';
            adjustedParams.contentType = 'educational';
        }
        else if (healthScore > 80) {
            // ヘルス良好時：積極的なアプローチ
            if (decision.priority === 'medium')
                adjustedPriority = 'high';
            adjustedParams.riskLevel = 'medium';
            adjustedParams.contentType = 'engaging';
        }
        return {
            ...decision,
            priority: adjustedPriority,
            params: adjustedParams,
            reasoning: decision.reasoning + ` (健康度${healthScore}に基づく調整)`
        };
    }
    // 市場コンテキストとの整合性確保
    alignDecisionWithMarketContext(decision, marketContext) {
        const enhancedParams = { ...decision.params };
        // 高優先度機会がある場合の調整
        const highPriorityOpportunities = marketContext.opportunities?.filter((op) => op.priority === 'high').length || 0;
        if (highPriorityOpportunities > 2) {
            enhancedParams.urgency = 'high';
            enhancedParams.opportunityAlignment = 'strong';
        }
        // トレンド情報の豊富さに基づく調整
        const trendCount = marketContext.trends?.length || 0;
        if (trendCount > 5) {
            enhancedParams.trendAwareness = 'high';
            enhancedParams.contentRelevance = 'trending';
        }
        return {
            ...decision,
            params: enhancedParams
        };
    }
    // フォールバック決定の生成
    createFallbackDecisions(context) {
        console.log('🔄 [フォールバック決定] 基本的な決定を生成中...');
        const fallbackDecisions = [];
        // アカウントヘルスに基づく基本決定
        if (context.account.healthScore < 70) {
            fallbackDecisions.push({
                id: `fallback-${Date.now()}-health`,
                type: 'content_generation',
                priority: 'high',
                reasoning: 'アカウントヘルス改善のための教育的コンテンツ生成',
                params: {
                    actionType: 'original_post',
                    contentType: 'educational',
                    expectedImpact: 0.6
                },
                dependencies: [],
                estimatedDuration: 30
            });
        }
        // 市場機会に基づく決定
        if (context.market.opportunities.length > 0) {
            fallbackDecisions.push({
                id: `fallback-${Date.now()}-opportunity`,
                type: 'immediate_post',
                priority: 'medium',
                reasoning: '利用可能な市場機会を活用した投稿',
                params: {
                    actionType: 'retweet',
                    timing: 'immediate',
                    expectedImpact: 0.5
                },
                dependencies: [],
                estimatedDuration: 15
            });
        }
        // 基本的なエンゲージメント向上決定
        fallbackDecisions.push({
            id: `fallback-${Date.now()}-engagement`,
            type: 'engagement_boost',
            priority: 'low',
            reasoning: '基本的なエンゲージメント向上活動',
            params: {
                actionType: 'reply',
                timing: 'scheduled',
                expectedImpact: 0.4
            },
            dependencies: [],
            estimatedDuration: 20
        });
        return fallbackDecisions;
    }
    // 拡張アクション戦略計画メソッド
    async planExpandedActions(integratedContext) {
        console.log('🚀 [拡張アクション計画] 統合コンテキストに基づく多様なアクション戦略を策定中...');
        console.log('📊 統合情報:', {
            accountHealth: integratedContext.account.healthScore,
            trendCount: integratedContext.market.trends.length,
            opportunityCount: integratedContext.market.opportunities.length,
            suggestionCount: integratedContext.actionSuggestions.length
        });
        try {
            const actionDecisions = await this.makeExpandedActionDecisions(integratedContext);
            await this.saveExpandedActionDecisions(actionDecisions, integratedContext);
            console.log(`✅ [拡張アクション計画完了] ${actionDecisions.length}件の多様なアクション戦略を策定`);
            return actionDecisions;
        }
        catch (error) {
            console.error('❌ [拡張アクション計画エラー]:', error);
            return this.createFallbackActionDecisions(integratedContext);
        }
    }
    // 拡張アクション決定の生成
    async makeExpandedActionDecisions(integratedContext) {
        console.log('🧠 [拡張アクション決定] 多様なアクション戦略を策定中...');
        const claudePrompt = `
Based on the integrated analysis context, create a strategic action plan for X (Twitter) with diverse action types:

ACCOUNT STATUS:
${JSON.stringify(integratedContext.account, null, 2)}

MARKET CONTEXT:
${JSON.stringify(integratedContext.market, null, 2)}

ACTION SUGGESTIONS:
${JSON.stringify(integratedContext.actionSuggestions, null, 2)}

Create ONE strategic action decision for this single execution considering:
1. Daily target: 15 actions total (this is just 1 of 15 for today)
2. Current session focus: Choose the most impactful single action
3. Account health and growth needs (current score: ${integratedContext.account.healthScore}/100)
4. Market trends and opportunities (${integratedContext.market.opportunities.length} opportunities available)
5. Quality over quantity approach - focus on ONE high-impact action

Available action types:
- original_post: Create original educational/insight content
- quote_tweet: Quote valuable content with commentary
- retweet: Share relevant content efficiently
- reply: Engage with community discussions

Return ONE action decision as JSON array with this exact structure:
[{
  "id": "action-{timestamp}-{random}",
  "type": "original_post|quote_tweet|retweet|reply",
  "priority": "critical|high|medium|low",
  "reasoning": "detailed explanation of why this action is strategic",
  "params": {
    "originalContent": "content for original posts",
    "quotedTweetId": "tweet id for quotes",
    "quoteComment": "comment for quote tweets",
    "retweetId": "tweet id for retweets",
    "addComment": boolean for retweets,
    "replyToTweetId": "tweet id for replies",
    "replyContent": "content for replies"
  },
  "targetTweet": { /* tweet object if applicable */ },
  "content": "main content if applicable",
  "estimatedDuration": number_in_minutes
}]

Prioritize based on account health:
- Health < 70: Focus on educational original posts
- Health 70-80: Balanced approach, consider quote tweets for engagement
- Health > 80: Aggressive engagement focus

Return exactly ONE action decision that will have the highest impact for this execution.
`;
        try {
            const response = await (0, claude_code_sdk_ts_1.claude)()
                .withModel('sonnet')
                .query(claudePrompt)
                .asText();
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const actionDecisions = JSON.parse(jsonMatch[0]);
                console.log('🧠 [拡張アクション決定完了] 以下の多様なアクション戦略を策定:');
                actionDecisions.forEach((decision, index) => {
                    console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
                    console.log(`     💭 戦略理由: ${decision.reasoning}`);
                    console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
                });
                return this.validateActionDecisions(actionDecisions);
            }
            console.log('⚠️ [拡張アクション決定] JSON解析に失敗、フォールバック決定を生成');
            return this.createFallbackActionDecisions(integratedContext);
        }
        catch (error) {
            console.error('❌ [拡張アクション決定エラー]:', error);
            return this.createFallbackActionDecisions(integratedContext);
        }
    }
    // アクション決定の検証
    validateActionDecisions(decisions) {
        console.log('✅ [アクション決定検証] 決定の妥当性とパラメータを検証中...');
        const validatedDecisions = [];
        for (const decision of decisions) {
            // 基本的な検証
            if (!decision.id || !decision.type || !decision.priority) {
                console.log(`⚠️ [検証失敗] 不完全なアクション決定をスキップ: ${JSON.stringify(decision)}`);
                continue;
            }
            // アクション固有のパラメータ検証
            if (decision.type === 'quote_tweet' && !decision.params?.quotedTweetId) {
                console.log(`⚠️ [検証失敗] 引用ツイートにquotedTweetIdが不足: ${decision.id}`);
                continue;
            }
            if (decision.type === 'retweet' && !decision.params?.retweetId) {
                console.log(`⚠️ [検証失敗] リツイートにretweetIdが不足: ${decision.id}`);
                continue;
            }
            if (decision.type === 'reply' && (!decision.params?.replyToTweetId || !decision.params?.replyContent)) {
                console.log(`⚠️ [検証失敗] リプライに必要パラメータが不足: ${decision.id}`);
                continue;
            }
            if (decision.type === 'original_post' && !decision.params?.originalContent && !decision.content) {
                console.log(`⚠️ [検証失敗] オリジナル投稿にコンテンツが不足: ${decision.id}`);
                continue;
            }
            validatedDecisions.push(decision);
        }
        console.log(`✅ [アクション決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
        return validatedDecisions;
    }
    // フォールバックアクション決定の生成
    createFallbackActionDecisions(context) {
        console.log('🔄 [フォールバックアクション決定] 基本的なアクション戦略を生成中...');
        const fallbackDecisions = [];
        // アカウントヘルスに基づく基本戦略
        if (context.account.healthScore < 70) {
            // 教育的オリジナル投稿重視
            fallbackDecisions.push({
                id: `fallback-${Date.now()}-original`,
                type: 'original_post',
                priority: 'high',
                reasoning: 'アカウントヘルス改善のための教育的コンテンツ投稿',
                params: {
                    originalContent: '投資の基本：リスク管理の重要性について',
                },
                content: '投資の基本：リスク管理の重要性について',
                estimatedDuration: 30
            });
        }
        else {
            // バランス型戦略
            fallbackDecisions.push({
                id: `fallback-${Date.now()}-mixed`,
                type: 'original_post',
                priority: 'medium',
                reasoning: 'バランス型アプローチでの価値創造投稿',
                params: {
                    originalContent: '市場分析：今日の注目ポイント',
                },
                content: '市場分析：今日の注目ポイント',
                estimatedDuration: 25
            });
        }
        return fallbackDecisions;
    }
    // 拡張アクション決定の保存
    async saveExpandedActionDecisions(decisions, context) {
        try {
            const fs = (await Promise.resolve().then(() => __importStar(require('fs/promises')))).default;
            const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
            const decisionsPath = path.join(process.cwd(), 'data', 'expanded-action-decisions.yaml');
            let history = (0, yaml_utils_1.loadYamlArraySafe)(decisionsPath);
            const decisionRecord = {
                timestamp: new Date().toISOString(),
                actionDecisions: decisions,
                context: {
                    accountHealth: context.account.healthScore,
                    marketOpportunities: context.market.opportunities.length,
                    actionSuggestions: context.actionSuggestions.length
                },
                strategy: 'expanded_action_strategies',
                dailyTarget: 15,
                actionBreakdown: this.calculateActionBreakdown(decisions)
            };
            history.push(decisionRecord);
            // Keep only last 20 decision sets
            if (history.length > 20) {
                history = history.slice(-20);
            }
            await fs.mkdir(path.dirname(decisionsPath), { recursive: true });
            await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
            console.log('💾 [拡張アクション決定保存] アクション戦略履歴を保存しました');
        }
        catch (error) {
            console.error('❌ [拡張アクション決定保存エラー]:', error);
        }
    }
    // アクション配分の計算
    calculateActionBreakdown(decisions) {
        const breakdown = {
            original_post: 0,
            quote_tweet: 0,
            retweet: 0,
            reply: 0,
            total: decisions.length
        };
        decisions.forEach(decision => {
            if (breakdown.hasOwnProperty(decision.type)) {
                breakdown[decision.type]++;
            }
        });
        return breakdown;
    }
    // 統合決定の保存
    async saveIntegratedDecisions(decisions, context) {
        try {
            const fs = (await Promise.resolve().then(() => __importStar(require('fs/promises')))).default;
            const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
            const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
            let history = (0, yaml_utils_1.loadYamlArraySafe)(decisionsPath);
            const decisionRecord = {
                timestamp: new Date().toISOString(),
                decisions: decisions,
                context: {
                    accountHealth: context.account.healthScore,
                    marketOpportunities: context.market.opportunities.length,
                    actionSuggestions: context.actionSuggestions.length
                },
                integration: 'enhanced_workflow_v2'
            };
            history.push(decisionRecord);
            // Keep only last 30 decision sets
            if (history.length > 30) {
                history = history.slice(-30);
            }
            await fs.mkdir(path.dirname(decisionsPath), { recursive: true });
            await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
            console.log('💾 [統合決定保存] 決定履歴を保存しました');
        }
        catch (error) {
            console.error('❌ [統合決定保存エラー]:', error);
        }
    }
    // デバッグ用ヘルパー関数追加
    getTypeMappingForDebug() {
        return {
            'collect_content': 'content_collection',
            'immediate_post': 'post_immediate',
            'analyze_performance': 'performance_analysis',
            'check_engagement': 'engagement_analysis',
            'review_growth': 'growth_analysis',
            'optimize_timing': 'timing_optimization',
            'clean_data': 'data_cleanup',
            'strategy_shift': 'strategy_optimization',
            'content_generation': 'content_creation',
            'posting_schedule': 'schedule_optimization'
        };
    }
}
exports.DecisionEngine = DecisionEngine;
