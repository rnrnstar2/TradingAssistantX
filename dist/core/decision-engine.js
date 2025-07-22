import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { CollectionMethod } from '../types/decision-types.js';
import { loadYamlSafe, loadYamlArraySafe } from '../utils/yaml-utils';
import * as yaml from 'js-yaml';
import { isDecision } from '../types/decision-types.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
export class SystemDecisionEngine {
    constructor() {
        // Claude Code SDK is used directly
        console.log('🎯 [DecisionEngine] 意思決定エンジン初期化完了');
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
        // 拡張ログセッション開始
        const decisionContext = {
            sessionId: '', // will be set by startDecision
            timestamp: new Date().toISOString(),
            accountHealth: integratedContext.account.healthScore,
            systemStatus: 'active',
            inputData: integratedContext,
            marketContext: integratedContext.market,
            actionSuggestions: integratedContext.actionSuggestions
        };
        const sessionId = await this.enhancedLogger.startDecision(decisionContext);
        // コンテキスト分析ステップ
        await this.enhancedLogger.logDecisionStep(sessionId, 'context_analysis', `統合コンテキスト分析: アカウント健康度${integratedContext.account.healthScore}、市場機会${integratedContext.market.opportunities.length}件`, {
            accountHealth: integratedContext.account.healthScore,
            marketOpportunities: integratedContext.market.opportunities.length,
            actionSuggestions: integratedContext.actionSuggestions.length
        });
        const claudePrompt = `
Based on the integrated analysis context, make strategic decisions for X (Twitter) content focused on original posts:

ACCOUNT STATUS:
${JSON.stringify(integratedContext.account, null, 2)}

MARKET CONTEXT:
${JSON.stringify(integratedContext.market, null, 2)}

ACTION SUGGESTIONS:
${JSON.stringify(integratedContext.actionSuggestions, null, 2)}

Make strategic decisions considering:
1. Account health and growth needs (current score: ${integratedContext.account.healthScore}/100)
2. Market trends and opportunities (${integratedContext.market.opportunities.length} opportunities available)
3. Optimal timing for original post content
4. Focus on original_post only - no other action types
5. Risk management and quality control

Return decisions as JSON array with this exact structure:
[{
  "id": "decision-{timestamp}-{random}",
  "type": "content_generation",
  "priority": "critical|high|medium|low",
  "reasoning": "detailed explanation of strategic reasoning",
  "params": {
    "actionType": "original_post",
    "originalContent": "specific educational content",
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

Limit to 3-5 decisions maximum for original posts only.
`;
        // 意思決定ログ記録開始
        const logId = await logClaudeDecision('DecisionEngine', 'makeIntegratedDecisions', 'integrated_strategic_decisions', claudePrompt, {
            accountHealth: integratedContext.account.healthScore,
            marketOpportunities: integratedContext.market.opportunities.length,
            actionSuggestions: integratedContext.actionSuggestions.length
        });
        // 推論ステップ
        await this.enhancedLogger.logDecisionStep(sessionId, 'reasoning', '戦略的意思決定プロセス開始: Claude APIを使用して最適な投稿戦略を生成', { prompt: claudePrompt.substring(0, 200) + '...' });
        const startTime = Date.now();
        try {
            const response = await claude()
                .withModel('sonnet')
                .withTimeout(8000) // 8秒タイムアウト
                .query(claudePrompt)
                .asText();
            const processingTime = Date.now() - startTime;
            // 決定生成ステップ
            await this.enhancedLogger.logDecisionStep(sessionId, 'decision_generation', `Claude APIレスポンス受信完了、決定を解析中 (${processingTime}ms)`, { responseLength: response.length, processingTime });
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const decisions = JSON.parse(jsonMatch[0]);
                // レスポンス記録（従来のログも維持）
                await updateClaudeResponse(logId, response, processingTime, decisions, 'sonnet');
                // バリデーションステップ
                await this.enhancedLogger.logDecisionStep(sessionId, 'validation', `${decisions.length}件の決定を検証・強化中`, { decisionsCount: decisions.length, rawDecisions: decisions });
                console.log('🧠 [統合決定完了] 以下の戦略的決定を策定:');
                decisions.forEach((decision, index) => {
                    console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
                    console.log(`     💭 戦略理由: ${decision.reasoning}`);
                    console.log(`     🎯 期待効果: ${decision.params?.expectedImpact || 'N/A'}`);
                    console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
                });
                const validatedDecisions = this.validateAndEnhanceDecisions(decisions, integratedContext);
                // 拡張ログセッション完了
                const finalDecision = {
                    id: `integrated-decision-${sessionId}`,
                    type: 'integrated_strategic_decisions',
                    priority: 'high',
                    reasoning: `統合コンテキストに基づく${validatedDecisions.length}件の戦略的決定`,
                    params: { decisionsCount: validatedDecisions.length, integratedContext },
                    dependencies: [],
                    estimatedDuration: validatedDecisions.reduce((sum, d) => sum + (d.estimatedDuration || 0), 0)
                };
                await this.enhancedLogger.completeDecision(sessionId, finalDecision, {
                    success: true,
                    executionTime: processingTime,
                    output: validatedDecisions,
                    metadata: { decisionsGenerated: validatedDecisions.length }
                });
                // 可視化データの生成
                await this.enhancedLogger.visualizeDecisionFlow(sessionId);
                return validatedDecisions;
            }
            console.log('⚠️ [統合決定] JSON解析に失敗、フォールバック決定を生成');
            const fallbackDecisions = this.createFallbackDecisions(integratedContext);
            await updateClaudeResponse(logId, response, processingTime, fallbackDecisions, 'sonnet');
            // フォールバック用ログ完了
            const fallbackDecision = {
                id: `fallback-decision-${sessionId}`,
                type: 'fallback_decisions',
                priority: 'medium',
                reasoning: 'JSON解析失敗によるフォールバック決定',
                params: { reason: 'json_parse_failed', fallbackCount: fallbackDecisions.length },
                dependencies: [],
                estimatedDuration: 30
            };
            await this.enhancedLogger.completeDecision(sessionId, fallbackDecision, {
                success: false,
                executionTime: processingTime,
                output: fallbackDecisions,
                errors: ['JSON parsing failed'],
                metadata: { usedFallback: true }
            });
            return fallbackDecisions;
        }
        catch (error) {
            console.error('❌ [統合決定エラー]:', error);
            await logClaudeError(logId, error, true);
            const errorDecision = {
                id: `error-decision-${sessionId}`,
                type: 'error_fallback',
                priority: 'low',
                reasoning: `エラー発生によるフォールバック: ${error instanceof Error ? error.message : 'Unknown error'}`,
                params: { error: error instanceof Error ? error.message : 'Unknown error' },
                dependencies: [],
                estimatedDuration: 15
            };
            const fallbackDecisions = this.createFallbackDecisions(integratedContext);
            await this.enhancedLogger.completeDecision(sessionId, errorDecision, {
                success: false,
                executionTime: Date.now() - startTime,
                output: fallbackDecisions,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                metadata: { usedFallback: true, errorType: 'api_call_failed' }
            });
            return fallbackDecisions;
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
            const response = await claude()
                .withModel('sonnet')
                .withTimeout(6000) // 6秒タイムアウト
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
        // ニーズ分析ログ記録開始
        const logId = await logClaudeDecision('DecisionEngine', 'prioritizeNeeds', 'needs_prioritization', prompt, {
            needsCount: needs.length,
            needsTypes: needs.map(n => n.type),
            needsPriorities: needs.map(n => n.priority)
        });
        const startTime = Date.now();
        let response = '';
        try {
            response = await claude()
                .withModel('sonnet')
                .withTimeout(6000) // 6秒タイムアウト
                .query(prompt)
                .asText();
            const processingTime = Date.now() - startTime;
            // Extract JSON from markdown code blocks if present
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : response;
            const decisions = JSON.parse(jsonText);
            // レスポンス記録
            await updateClaudeResponse(logId, response, processingTime, decisions, 'sonnet');
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
            await logClaudeError(logId, error, false);
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
        const path = (await import('path')).default;
        const insightsPath = path.join(process.cwd(), 'data', 'context', 'shared-insights.yaml');
        const result = loadYamlSafe(insightsPath);
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
        const fs = (await import('fs/promises')).default;
        const path = (await import('path')).default;
        const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
        let history = loadYamlArraySafe(decisionsPath);
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
            if (isDecision(decision)) {
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
            else {
                console.log(`⚠️ [検証失敗] 無効な決定をスキップ: ${JSON.stringify(decision)}`);
            }
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
                type: 'content_creation',
                priority: 'high',
                reasoning: 'アカウントヘルス改善のための教育的コンテンツ生成',
                confidence: 0.7,
                data: {
                    context: { environment: 'fallback', constraints: ['health_score_low'], objectives: ['improve_engagement'], timeframe: 'immediate' },
                    factors: [{ name: 'account_health', weight: 0.8, value: context.account.healthScore, reasoning: 'ヘルス低下のため教育的コンテンツが必要' }],
                    alternatives: []
                },
                timestamp: new Date().toISOString(),
                status: 'pending',
                params: {
                    actionType: 'original_post',
                    originalContent: '投資の基本原則：リスク管理とポートフォリオ分散の重要性について',
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
                type: 'content_creation',
                priority: 'medium',
                reasoning: '利用可能な市場機会を活用したオリジナル投稿',
                confidence: 0.6,
                data: {
                    context: { environment: 'fallback', constraints: [], objectives: ['market_opportunity'], timeframe: 'immediate' },
                    factors: [{ name: 'market_opportunities', weight: 0.6, value: context.market.opportunities.length, reasoning: '市場機会を活用' }],
                    alternatives: []
                },
                timestamp: new Date().toISOString(),
                status: 'pending',
                params: {
                    actionType: 'original_post',
                    originalContent: '現在の市場動向から学ぶ投資戦略のポイント',
                    timing: 'immediate',
                    expectedImpact: 0.5
                },
                dependencies: [],
                estimatedDuration: 25
            });
        }
        // 基本的なコンテンツ生成決定
        fallbackDecisions.push({
            id: `fallback-${Date.now()}-basic`,
            type: 'content_creation',
            priority: 'low',
            reasoning: '基本的な投資教育コンテンツの提供',
            confidence: 0.5,
            data: {
                context: { environment: 'fallback', constraints: [], objectives: ['basic_education'], timeframe: 'scheduled' },
                factors: [{ name: 'basic_content', weight: 0.4, value: 1, reasoning: '基本的な教育コンテンツ' }],
                alternatives: []
            },
            timestamp: new Date().toISOString(),
            status: 'pending',
            params: {
                actionType: 'original_post',
                originalContent: '長期投資の視点：短期的な変動に惑わされない投資マインドの重要性',
                timing: 'scheduled',
                expectedImpact: 0.4
            },
            dependencies: [],
            estimatedDuration: 20
        });
        return fallbackDecisions;
    }
    // 拡張アクション戦略計画メソッド（投稿専用モード対応）
    async planExpandedActions(integratedContext) {
        // 投稿専用モード判定
        const isPostingOnlyMode = process.env.X_TEST_MODE === 'true';
        if (isPostingOnlyMode) {
            console.log('📝 [投稿専用アクション計画] original_postのみに集中したアクション戦略を策定中...');
            console.log('📊 投稿専用情報:', {
                accountHealth: integratedContext.account.healthScore,
                mode: 'posting_only'
            });
            try {
                const postingOnlyDecisions = await this.createPostingOnlyActionDecisions(integratedContext);
                await this.saveExpandedActionDecisions(postingOnlyDecisions, integratedContext);
                console.log(`✅ [投稿専用アクション計画完了] ${postingOnlyDecisions.length}件の投稿専用戦略を策定`);
                return postingOnlyDecisions;
            }
            catch (error) {
                console.error('❌ [投稿専用アクション計画エラー]:', error);
                return this.createPostingOnlyFallback(integratedContext);
            }
        }
        // 通常モード（複数アクションタイプ）
        console.log('🚀 [拡張アクション計画] 統合コンテキストに基づく多様なアクション戦略を策定中...');
        console.log('📊 統合情報:', {
            accountHealth: integratedContext.account.healthScore,
            trendCount: integratedContext.market.trends.length,
            opportunityCount: integratedContext.market.opportunities.length,
            suggestionCount: integratedContext.actionSuggestions.length
        });
        try {
            const decisions = await this.makeExpandedActionDecisions(integratedContext);
            const actionDecisions = this.convertDecisionsToActionDecisions(decisions);
            await this.saveExpandedActionDecisions(actionDecisions, integratedContext);
            console.log(`✅ [拡張アクション計画完了] ${actionDecisions.length}件の多様なアクション戦略を策定`);
            return actionDecisions;
        }
        catch (error) {
            console.error('❌ [拡張アクション計画エラー]:', error);
            return this.createFallbackActionDecisions(integratedContext);
        }
    }
    // 拡張アクション決定の生成（独立版）
    async makeExpandedActionDecisions(context, needsEvaluation) {
        console.log('🧠 [拡張アクション決定] 独立した意思決定を開始...');
        try {
            // 1. 基本アクション決定（既存ロジック維持）
            const baseDecisions = await this.generateBaseActionDecisions(context, needsEvaluation);
            // 2. 新機能: アクション特化型情報収集
            const enhancedDecisions = await this.enhanceDecisionsWithSpecificCollection(baseDecisions, context);
            // 3. 最終決定生成（既存ロジック拡張）
            return await this.finalizeExpandedDecisions(enhancedDecisions, context);
        }
        catch (error) {
            console.error('拡張アクション決定エラー:', error);
            // フォールバック: 既存ロジックで継続
            return await this.generateBaseActionDecisions(context, needsEvaluation);
        }
    }
    // 新規メソッド: 基本アクション決定生成
    async generateBaseActionDecisions(context, needsEvaluation) {
        console.log('🧠 [基本アクション決定] 基本的なアクション戦略を策定中...');
        const claudePrompt = `
Based on the integrated analysis context, create a strategic action plan for X (Twitter) focused on original posts:

ACCOUNT STATUS:
${JSON.stringify(context.account, null, 2)}

MARKET CONTEXT:
${JSON.stringify(context.market, null, 2)}

ACTION SUGGESTIONS:
${JSON.stringify(context.actionSuggestions, null, 2)}

Create strategic action decisions considering:
1. Focus on original_post content only
2. Account health and growth needs (current score: ${context.account.healthScore}/100)
3. Market trends and opportunities (${context.market.opportunities.length} opportunities available)
4. Quality over quantity approach

Available action type:
- original_post: Create original educational/insight content

Return decisions as JSON array with this exact structure:
[{
  "id": "decision-{timestamp}-{random}",
  "type": "content_generation",
  "priority": "critical|high|medium|low",
  "reasoning": "detailed explanation of strategic reasoning",
  "action": {
    "type": "original_post",
    "content": "specific educational content",
    "reasoning": "action-specific reasoning",
    "priority": "high|medium|low",
    "expectedImpact": 0.0-1.0
  },
  "expectedImpact": "expected outcome description",
  "dependencies": [],
  "estimatedDuration": number_in_minutes
}]

Prioritize based on account health:
- Health < 70: Focus on basic educational content
- Health 70-80: Intermediate educational content
- Health > 80: Advanced educational content

Limit to 3-5 strategic decisions for original posts only.
`;
        try {
            const response = await claude()
                .withModel('sonnet')
                .withTimeout(6000) // 6秒タイムアウト
                .query(claudePrompt)
                .asText();
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const decisions = JSON.parse(jsonMatch[0]);
                console.log(`✅ [基本アクション決定完了] ${decisions.length}件の基本決定を策定`);
                return decisions;
            }
            return this.createFallbackDecisions(context);
        }
        catch (error) {
            console.error('❌ [基本アクション決定エラー]:', error);
            return this.createFallbackDecisions(context);
        }
    }
    // アクション特化型情報収集による決定強化（簡略化版）
    async enhanceDecisionsWithSpecificCollection(baseDecisions, context) {
        console.log('🎯 [決定強化] 基本決定を返却（疎結合設計のため外部収集は使用しない）');
        return baseDecisions;
    }
    // 決定強化（簡略化版）
    enhanceDecisionWithCollectionResults(decision) {
        // 疎結合設計のため、外部収集結果には依存せず基本強化のみ実装
        // Decision型にはmetadataプロパティがないため、paramsに格納
        return {
            ...decision,
            params: {
                ...decision.params,
                enhanced: true,
                enhancementTimestamp: Date.now()
            }
        };
    }
    // 新規メソッド: 最終決定生成
    async finalizeExpandedDecisions(enhancedDecisions, context) {
        console.log('🏁 [最終決定] 強化された決定を最終調整中...');
        // 既存の検証ロジックを活用
        const finalDecisions = this.validateAndEnhanceDecisions(enhancedDecisions, context);
        console.log(`✅ [拡張アクション決定完了] ${finalDecisions.length}件の統合的決定を策定`);
        return finalDecisions;
    }
    // アクション決定の検証
    validateActionDecisions(decisions) {
        console.log('✅ [アクション決定検証] 決定の妥当性とパラメータを検証中...');
        const validatedDecisions = [];
        for (const decision of decisions) {
            if (this.isActionDecisionLike(decision)) {
                // 基本的な検証
                if (!decision.id || !decision.type || !decision.priority) {
                    console.log(`⚠️ [検証失敗] 不完全なアクション決定をスキップ: ${JSON.stringify(decision)}`);
                    continue;
                }
                // 🚨 REMOVED: original_post only constraint - now supports all action types
                // 🧠 NEW: Claude自律的全アクションタイプ検証
                if (['original_post', 'quote_tweet', 'retweet', 'reply'].includes(decision.type)) {
                    // アクションタイプ別パラメータ検証・補完
                    if (decision.type === 'original_post') {
                        if (!decision.params?.originalContent && !decision.content) {
                            console.log(`⚠️ [パラメータ修正] originalContentを自動補完: ${decision.id}`);
                            decision.params = decision.params || {};
                            decision.params.originalContent = decision.content || '投資教育コンテンツ';
                            decision.content = decision.params.originalContent;
                        }
                    }
                    else if (decision.type === 'quote_tweet') {
                        if (!decision.params?.quoteContent) {
                            decision.params = decision.params || {};
                            decision.params.quoteContent = decision.content || 'コメント';
                        }
                    }
                    else if (decision.type === 'reply') {
                        if (!decision.params?.replyContent) {
                            decision.params = decision.params || {};
                            decision.params.replyContent = decision.content || '返信';
                        }
                    }
                    validatedDecisions.push(decision);
                    console.log(`✅ [Claude自律検証] ${decision.type}アクション検証通過: ${decision.id}`);
                }
                else {
                    console.log(`⚠️ [検証失敗] 未対応アクションタイプをスキップ: ${decision.type}`);
                    continue;
                }
            }
            else {
                console.log(`⚠️ [検証失敗] 無効なアクション決定をスキップ: ${JSON.stringify(decision)}`);
            }
        }
        console.log(`✅ [アクション決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
        return validatedDecisions;
    }
    // 新規メソッド: 投稿専用アクション決定の生成
    async createPostingOnlyActionDecisions(context) {
        console.log('📝 [投稿専用決定] original_postのみの高品質アクション決定を生成中...');
        const currentDate = new Date().toISOString().split('T')[0];
        const timeOfDay = new Date().getHours();
        let contentFocus = '';
        if (timeOfDay >= 7 && timeOfDay < 12) {
            contentFocus = '朝の市場開始前の戦略';
        }
        else if (timeOfDay >= 12 && timeOfDay < 17) {
            contentFocus = '日中の市場動向分析';
        }
        else {
            contentFocus = '市場終了後の振り返り';
        }
        // 高品質なoriginal_post決定を1～2件生成
        const postingDecisions = [
            {
                id: `posting-only-${Date.now()}-main`,
                type: 'original_post',
                priority: 'high',
                reasoning: `投稿専用モード: ${contentFocus}に関する価値ある投資情報を提供`,
                description: `投稿専用モード: ${contentFocus}に関する価値ある投資情報を提供`,
                params: {
                    originalContent: `【${currentDate} ${contentFocus}】テクニカル分析とファンダメンタル分析の組み合わせによる投資判断の重要性について。市場の短期的な変動に惑わされることなく、長期的な視点で投資戦略を組み立てることが成功への鍵となります。`,
                    hashtags: ['#投資', '#資産形成', '#長期投資'],
                    contentType: 'educational',
                    timeOfDay,
                    dateGenerated: currentDate
                },
                content: `【${currentDate} ${contentFocus}】テクニカル分析とファンダメンタル分析の組み合わせによる投資判断の重要性について。市場の短期的な変動に惑わされることなく、長期的な視点で投資戦略を組み立てることが成功への鍵となります。`,
                estimatedDuration: 25
            }
        ];
        // アカウントヘルスが高い場合は追加の投稿も提案
        if (context.account.healthScore > 80) {
            postingDecisions.push({
                id: `posting-only-${Date.now()}-secondary`,
                type: 'original_post',
                priority: 'medium',
                reasoning: 'アカウントヘルス良好のため、追加の教育的コンテンツを提供',
                description: 'アカウントヘルス良好のため、追加の教育的コンテンツを提供',
                params: {
                    originalContent: '投資初心者の方からよくある質問：「どの銘柄に投資すれば良いですか？」に対する答えは「まず自分の投資目標とリスク許容度を明確にすること」です。個別株選択よりも、投資の基本を理解することから始めましょう。',
                    hashtags: ['#投資初心者', '#投資の基本'],
                    contentType: 'beginner_friendly',
                    timeOfDay,
                    dateGenerated: currentDate
                },
                content: '投資初心者の方からよくある質問：「どの銘柄に投資すれば良いですか？」に対する答えは「まず自分の投資目標とリスク許容度を明確にすること」です。個別株選択よりも、投資の基本を理解することから始めましょう。',
                estimatedDuration: 20
            });
        }
        console.log(`📝 [投稿専用決定完了] ${postingDecisions.length}件のoriginal_post決定を生成`);
        return postingDecisions;
    }
    // 新規メソッド: 投稿専用フォールバック
    createPostingOnlyFallback(context) {
        console.log('🔄 [投稿専用フォールバック] 基本的なoriginal_post決定を生成中...');
        return [{
                id: `posting-fallback-${Date.now()}`,
                type: 'original_post',
                priority: 'high',
                reasoning: '投稿専用モードのフォールバック: 基本的な投資教育コンテンツ',
                description: '投稿専用モードのフォールバック: 基本的な投資教育コンテンツ',
                params: {
                    originalContent: '投資の基本原則：分散投資によるリスク軽減の重要性について',
                    hashtags: ['#投資基本', '#リスク管理'],
                    contentType: 'educational'
                },
                content: '投資の基本原則：分散投資によるリスク軽減の重要性について',
                estimatedDuration: 30
            }];
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
                description: 'アカウントヘルス改善のための教育的コンテンツ投稿',
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
                description: 'バランス型アプローチでの価値創造投稿',
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
            const fs = (await import('fs/promises')).default;
            const path = (await import('path')).default;
            const decisionsPath = path.join(process.cwd(), 'data', 'current', 'current-decisions.yaml');
            let history = loadYamlArraySafe(decisionsPath);
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
            // 軽量版保存: 最新1エントリのみ保持（30行制限）
            const lightweightRecord = {
                timestamp: decisionRecord.timestamp,
                actionDecisions: decisions.slice(0, 1), // 最新の1つのアクションのみ
                context: decisionRecord.context,
                strategy: decisionRecord.strategy,
                dailyTarget: decisionRecord.dailyTarget,
                actionBreakdown: decisionRecord.actionBreakdown
            };
            await fs.mkdir(path.dirname(decisionsPath), { recursive: true });
            await fs.writeFile(decisionsPath, yaml.dump(lightweightRecord, { indent: 2 }));
            // claude-summary.yamlの自動更新
            await this.updateClaudeSummaryFromDecisions(decisions[0], context);
            console.log('💾 [軽量決定保存] 最新アクション決定を軽量形式で保存しました');
        }
        catch (error) {
            console.error('❌ [拡張アクション決定保存エラー]:', error);
        }
    }
    async updateClaudeSummaryFromDecisions(latestDecision, context) {
        try {
            const fs = (await import('fs/promises')).default;
            const path = (await import('path')).default;
            const claudeSummaryPath = path.join(process.cwd(), 'data', 'claude-summary.yaml');
            let claudeSummary = {};
            if (await fs.access(claudeSummaryPath).then(() => true).catch(() => false)) {
                const existingData = await fs.readFile(claudeSummaryPath, 'utf8');
                claudeSummary = yaml.load(existingData) || {};
            }
            // 最新のアクション実行時にサマリー更新
            claudeSummary.lastUpdated = new Date().toISOString();
            claudeSummary.system = claudeSummary.system || {};
            claudeSummary.system.last_action = new Date().toISOString();
            // 優先事項を更新（最新の決定に基づく）
            if (latestDecision) {
                claudeSummary.priorities = claudeSummary.priorities || { urgent: [] };
                claudeSummary.priorities.urgent = [{
                        type: latestDecision.type || 'content_posting',
                        reason: latestDecision.reasoning || '最新の戦略決定に基づくアクション'
                    }];
            }
            await fs.writeFile(claudeSummaryPath, yaml.dump(claudeSummary, { indent: 2 }));
            console.log('✅ [Claude Summary更新] 決定実行時の自動更新完了');
        }
        catch (error) {
            console.error('Error updating claude-summary from decisions:', error);
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
            const fs = (await import('fs/promises')).default;
            const path = (await import('path')).default;
            const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
            let history = loadYamlArraySafe(decisionsPath);
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
    // SystemDecision[] から ActionDecision[] への変換
    convertDecisionsToActionDecisions(decisions) {
        console.log('🔄 [型変換] SystemDecision[] を ActionDecision[] に変換中...');
        const actionDecisions = [];
        for (const decision of decisions) {
            try {
                // Decision型にはactionプロパティがないため、paramsから情報を取得
                const actionType = decision.params?.actionType || 'original_post';
                const content = decision.params?.originalContent || decision.params?.targetContent || '投資教育コンテンツ';
                if (actionType === 'original_post') {
                    const actionDecision = {
                        id: decision.id,
                        type: 'original_post',
                        priority: decision.priority,
                        reasoning: decision.reasoning || '',
                        description: decision.reasoning || '',
                        params: this.convertDecisionParamsToActionParams(decision),
                        content: content,
                        estimatedDuration: decision.estimatedDuration || 30
                    };
                    actionDecisions.push(actionDecision);
                }
                else {
                    // 他のタイプの場合は、original_postとして処理
                    const fallbackActionDecision = {
                        id: decision.id,
                        type: 'original_post',
                        priority: decision.priority,
                        reasoning: decision.reasoning || '',
                        description: decision.reasoning || '',
                        params: { originalContent: content },
                        content: content,
                        estimatedDuration: decision.estimatedDuration || 30
                    };
                    actionDecisions.push(fallbackActionDecision);
                }
            }
            catch (error) {
                console.error('❌ [型変換エラー]:', error);
                // エラー時はoriginal_postフォールバックを追加
                const errorFallbackDecision = {
                    id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    type: 'original_post',
                    priority: 'medium',
                    reasoning: '変換エラーのためのフォールバック決定',
                    description: '変換エラーのためのフォールバック決定',
                    params: { originalContent: '投資の基本原則について' },
                    content: '投資の基本原則について',
                    estimatedDuration: 30
                };
                actionDecisions.push(errorFallbackDecision);
            }
        }
        console.log(`✅ [型変換完了] ${actionDecisions.length}/${decisions.length}件のActionDecisionに変換`);
        return actionDecisions;
    }
    // Decision.params から ActionParams への変換
    convertDecisionParamsToActionParams(decision) {
        const params = decision.params || {};
        // original_post専用の変換
        return {
            originalContent: params.originalContent || params.targetContent || '投資教育コンテンツ',
            hashtags: params.hashtags || ['#投資', '#資産形成'],
            contentType: params.contentType || 'educational',
            riskLevel: params.riskLevel || 'low',
            timeOfDay: new Date().getHours(),
            dateGenerated: new Date().toISOString().split('T')[0]
        };
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
    // ActionDecision型ガード関数
    isActionDecisionLike(obj) {
        return typeof obj === 'object'
            && obj !== null
            && 'id' in obj
            && 'type' in obj
            && 'priority' in obj;
    }
    /**
     * Decision Integration Methods (統合済み)
     * Collection Strategy Selector, Execution Monitor, Quality Maximizer,
     * Resource Allocator, Site Profiler の統合メソッド
     */
    // Collection Strategy Selector Methods
    async selectCollectionStrategy(context) {
        const strategies = this.getAvailableStrategies();
        const scores = new Map();
        for (const strategy of strategies) {
            const score = this.calculateStrategyScore(strategy, context);
            scores.set(strategy, score);
        }
        const bestStrategy = Array.from(scores.entries())
            .sort(([, a], [, b]) => b - a)[0][0];
        console.log(`✅ [戦略選択] 選択された戦略: ${bestStrategy}`);
        return bestStrategy;
    }
    getAvailableStrategies() {
        return [CollectionMethod.SIMPLE_HTTP, CollectionMethod.API_PREFERRED, CollectionMethod.PLAYWRIGHT_STEALTH, CollectionMethod.HYBRID];
    }
    calculateStrategyScore(strategy, context) {
        let score = 0.5; // Base score
        switch (strategy) {
            case CollectionMethod.SIMPLE_HTTP:
                score += 0.3; // HTTP is MVP priority
                break;
            case CollectionMethod.API_PREFERRED:
                score += 0.2; // API is reliable
                break;
            case CollectionMethod.PLAYWRIGHT_STEALTH:
                score += 0.1; // More resource intensive
                break;
            case CollectionMethod.HYBRID:
                score += 0.15;
                break;
        }
        return Math.min(score, 1.0);
    }
    // Execution Monitor Methods
    async monitorExecution(executionId) {
        const startTime = Date.now();
        const metrics = {
            sessionId: executionId,
            timestamp: new Date().toISOString(),
            decisionTime: Date.now() - startTime,
            cpuUsage: 50,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            networkLatency: 100,
            claudeApiCalls: 1,
            cacheHitRate: 0.8,
            resourceUsage: this.getCurrentResourceUsage()
        };
        console.log(`📊 [実行監視] セッションID: ${metrics.sessionId}, 決定時間: ${metrics.decisionTime}ms`);
        return metrics;
    }
    getCurrentResourceUsage() {
        return {
            timeMs: 100,
            memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuPercent: 50,
            networkRequests: 5
        };
    }
    // Quality Maximizer Methods
    async optimizeForQuality(tasks) {
        const optimizedTasks = tasks.map(task => ({
            ...task,
            qualityTarget: this.calculateQualityTarget(task),
            estimatedCost: this.estimateTaskCost(task)
        }));
        optimizedTasks.sort((a, b) => {
            const ratioA = a.qualityTarget / (a.estimatedCost?.timeMs || 1);
            const ratioB = b.qualityTarget / (b.estimatedCost?.timeMs || 1);
            return ratioB - ratioA;
        });
        console.log(`🎯 [品質最適化] ${optimizedTasks.length}個のタスクを最適化`);
        return optimizedTasks;
    }
    calculateQualityTarget(task) {
        let target = 0.7;
        if (task.priority >= 7)
            target += 0.2; // High priority (7-10)
        if (task.method === CollectionMethod.SIMPLE_HTTP)
            target += 0.1;
        return Math.min(target, 1.0);
    }
    estimateTaskCost(task) {
        const baseCost = {
            timeMs: 5000,
            memoryMb: 10,
            cpuUnits: 1
        };
        switch (task.method) {
            case CollectionMethod.SIMPLE_HTTP:
                return { ...baseCost, timeMs: 3000 };
            case CollectionMethod.API_PREFERRED:
                return { ...baseCost, timeMs: 2000 };
            case CollectionMethod.PLAYWRIGHT_STEALTH:
                return { ...baseCost, timeMs: 8000, memoryMb: 20 };
            default:
                return baseCost;
        }
    }
    // Resource Allocator Methods
    async allocateResources(tasks) {
        const allocation = new Map();
        let totalTime = 0;
        let totalMemory = 0;
        for (const task of tasks) {
            const cost = this.estimateTaskCost(task);
            allocation.set(task.id, cost);
            totalTime += cost.timeMs;
            totalMemory += cost.memoryMb;
        }
        console.log(`💰 [リソース配分] 総時間: ${totalTime}ms, 総メモリ: ${totalMemory}MB`);
        return allocation;
    }
    async reallocateResources(currentAllocation, constraints) {
        const newAllocation = new Map(currentAllocation);
        for (const [taskId, cost] of newAllocation.entries()) {
            if (cost.timeMs > constraints.maxTime) {
                newAllocation.set(taskId, {
                    ...cost,
                    timeMs: Math.min(cost.timeMs, constraints.maxTime)
                });
            }
        }
        console.log(`🔄 [リソース再配分] ${newAllocation.size}個のタスクを再配分`);
        return newAllocation;
    }
    // Site Profiler Methods
    async profileSite(url) {
        const profile = {
            requiresJavaScript: false,
            hasAntiBot: false,
            loadSpeed: 'medium',
            contentStructure: 'simple',
            updateFrequency: 'medium',
            contentQuality: this.estimateContentQuality(url),
            relevanceScore: 0.8,
            bestCollectionTime: { start: 9, end: 17 },
            optimalMethod: CollectionMethod.SIMPLE_HTTP,
            averageResponseTime: await this.measureResponseTime(url)
        };
        console.log(`🔍 [サイト分析] ${url}: 品質${profile.contentQuality}, 応答時間${profile.averageResponseTime}ms`);
        return profile;
    }
    assessSiteReliability(url) {
        const trustedDomains = ['reuters.com', 'bloomberg.com', 'cnbc.com'];
        const domain = new URL(url).hostname.replace('www.', '');
        if (trustedDomains.includes(domain))
            return 0.9;
        if (domain.includes('gov') || domain.includes('org'))
            return 0.8;
        return 0.6;
    }
    async measureResponseTime(url) {
        return Math.random() * 2000 + 500; // 500-2500ms simulation
    }
    estimateContentQuality(url) {
        const domain = new URL(url).hostname;
        if (domain.includes('reuters') || domain.includes('bloomberg'))
            return 0.9;
        if (domain.includes('finance') || domain.includes('market'))
            return 0.8;
        return 0.7;
    }
    estimateUpdateFrequency(url) {
        if (url.includes('news') || url.includes('live'))
            return 'hourly';
        if (url.includes('market') || url.includes('trading'))
            return 'daily';
        return 'weekly';
    }
    detectRateLimit(url) {
        const domain = new URL(url).hostname;
        if (domain.includes('api'))
            return 100;
        if (domain.includes('rss') || domain.includes('feed'))
            return 60;
        return 30;
    }
    /**
     * Content Convergence Engine Methods (統合済み)
     * 大量のFX情報を価値ある1つの投稿に収束させる機能
     */
    async convergeToSinglePost(collectedData) {
        const startTime = Date.now();
        try {
            // 1. 核心インサイトの抽出
            const coreInsights = await this.extractCoreInsights(collectedData);
            // 2. 読者価値の最大化
            const valueOptimized = await this.maximizeReaderValue(coreInsights);
            // 3. 投稿構造の構築
            const structure = this.buildLogicalStructure(coreInsights);
            const narrativeFlow = this.createReadableFlow(structure);
            // 4. 最終コンテンツの生成
            const finalContent = await this.generateFinalContent(valueOptimized, structure, narrativeFlow);
            // 5. 品質評価
            const qualityScore = await this.calculateQualityScore(finalContent, coreInsights);
            const processingTime = Date.now() - startTime;
            const convergedPost = {
                id: `convergence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                content: finalContent,
                metadata: {
                    sourceCount: collectedData.length,
                    processingTime,
                    qualityScore,
                    confidence: this.calculateOverallConfidence(coreInsights)
                },
                insights: coreInsights,
                structure
            };
            console.log(`🧠 [コンテンツ収束] ${collectedData.length}件のデータから高品質投稿を生成`);
            return convergedPost;
        }
        catch (error) {
            console.error(`❌ [収束エラー]:`, error);
            throw new Error(`収束処理に失敗しました: ${error}`);
        }
    }
    async extractCoreInsights(data) {
        if (data.length === 0)
            return [];
        const insights = [];
        // データから重要なインサイトを抽出
        for (const item of data) {
            if (item.importance > 70 || item.relevanceScore > 0.7) {
                insights.push({
                    id: `insight_${item.id || Date.now()}`,
                    category: item.category || 'market_trend',
                    content: item.content || item.text || '',
                    confidence: item.reliability || item.confidence || 70,
                    impact: item.importance > 80 ? 'high' : 'medium',
                    sources: [item.source || 'unknown'],
                    timeRelevance: {
                        urgency: 'daily',
                        peakRelevance: item.importance || 70,
                        timeDecayRate: 0.1
                    },
                    educationalValue: 75,
                    uniqueness: 65
                });
            }
        }
        return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    }
    async maximizeReaderValue(insights) {
        const baseContent = this.generateBaseContent(insights);
        // 教育価値の最大化
        const educationalValue = this.calculateEducationalValue(baseContent);
        // 実用性の強化
        const practicalityScore = this.calculatePracticalityScore(baseContent);
        // 独自性の確保
        const uniquenessScore = 75;
        // タイムリー性の最適化
        const timelinessScore = 80;
        return {
            content: baseContent,
            educationalValue,
            practicalityScore,
            uniquenessScore,
            timelinessScore
        };
    }
    generateBaseContent(insights) {
        if (insights.length === 0)
            return '市場動向の分析';
        const primaryInsight = insights[0];
        let content = primaryInsight.content || '重要な市場情報';
        // 補完的なインサイトを統合
        if (insights.length > 1) {
            content += `\n\n`;
            for (let i = 1; i < Math.min(3, insights.length); i++) {
                content += `${insights[i].content}\n`;
            }
        }
        return content;
    }
    calculateEducationalValue(content) {
        let score = 50;
        // 教育的キーワードの存在
        const educationalKeywords = ['なぜ', 'どのように', '理由', '仕組み', '背景'];
        const keywordCount = educationalKeywords.filter(k => content.includes(k)).length;
        score += keywordCount * 10;
        // 専門用語の適切な使用
        const technicalTerms = ['GDP', 'CPI', 'PMI', 'FOMC', 'レバレッジ'];
        const termCount = technicalTerms.filter(t => content.includes(t)).length;
        score += termCount * 5;
        return Math.min(100, score);
    }
    calculatePracticalityScore(content) {
        let score = 60;
        // 具体的な数値の存在
        const numberPattern = /\d+(\.\d+)?[%円ドルpips]/g;
        const numberMatches = content.match(numberPattern);
        score += (numberMatches?.length || 0) * 5;
        // アクション動詞の存在
        const actionVerbs = ['設定', '確認', '注意', '検討', '実施', '準備'];
        const actionCount = actionVerbs.filter(verb => content.includes(verb)).length;
        score += actionCount * 4;
        return Math.min(100, Math.max(0, score));
    }
    buildLogicalStructure(insights) {
        if (insights.length === 0) {
            return {
                hook: '市場の最新動向について',
                mainPoints: [],
                supporting: [],
                conclusion: '今後の動向に注目が必要です'
            };
        }
        const primaryInsight = insights[0];
        const hook = this.generateHook(primaryInsight);
        const mainPoints = this.buildMainPoints(insights);
        const conclusion = this.generateConclusion(insights);
        return {
            hook,
            mainPoints,
            supporting: [],
            conclusion
        };
    }
    generateHook(insight) {
        const impactLevel = insight.impact || 'medium';
        const hookPatterns = {
            'high': ['市場に大きな変化の兆しが見えています', '重要な動向が明らかになりました'],
            'medium': ['興味深い市場パターンが観察されています', '注目すべき動きがあります'],
            'low': ['最近の市場動向について', '市場で話題になっている動きがあります']
        };
        const patterns = hookPatterns[impactLevel] || hookPatterns.medium;
        return patterns[Math.floor(Math.random() * patterns.length)];
    }
    buildMainPoints(insights) {
        return insights.slice(0, 3).map((insight, i) => ({
            id: `main_point_${i + 1}`,
            content: insight.content || '重要なポイント',
            supportingEvidence: insight.sources || [],
            importance: insight.confidence || 70
        }));
    }
    generateConclusion(insights) {
        const urgentInsights = insights.filter(i => i.timeRelevance?.urgency === 'immediate');
        if (urgentInsights.length > 0) {
            return '短期的な動きに注意が必要な状況です。';
        }
        return '今後の推移を注視していく必要があります。';
    }
    createReadableFlow(structure) {
        const sequence = [];
        const transitions = [];
        sequence.push(structure.hook);
        for (let i = 0; i < structure.mainPoints.length; i++) {
            if (i === 0) {
                transitions.push('具体的には、');
            }
            else {
                transitions.push('また、');
            }
            sequence.push(structure.mainPoints[i].content);
        }
        transitions.push('これらの状況を踏まえると、');
        sequence.push(structure.conclusion);
        return {
            id: `narrative_${Date.now()}`,
            sequence,
            transitions,
            coherenceScore: 80,
            readabilityScore: 85
        };
    }
    async generateFinalContent(valueOptimized, structure, narrativeFlow) {
        let content = valueOptimized.content;
        // ナラティブフローを適用
        if (narrativeFlow.coherenceScore > 75) {
            const flowContent = narrativeFlow.sequence.join(' ');
            content = flowContent.length > content.length ? flowContent : content;
        }
        // 専門用語の説明を追加
        content = this.explainTechnicalTerms(content);
        // エンゲージメント要素の追加
        content = this.addEngagementElements(content);
        return content.substring(0, 280); // Twitter制限考慮
    }
    explainTechnicalTerms(content) {
        const terms = {
            'GDP': 'GDP（国内総生産、国の経済規模を示す指標）',
            'CPI': 'CPI（消費者物価指数、インフレの指標）',
            'FOMC': 'FOMC（米連邦公開市場委員会、米国の金融政策を決定）',
            'PMI': 'PMI（購買担当者景気指数、製造業の景況感を示す）'
        };
        let enhancedContent = content;
        for (const [term, explanation] of Object.entries(terms)) {
            const pattern = new RegExp(`(${term})`, 'g');
            let replaced = false;
            enhancedContent = enhancedContent.replace(pattern, (match, p1) => {
                if (!replaced && enhancedContent.length < 200) {
                    replaced = true;
                    return explanation;
                }
                return p1;
            });
        }
        return enhancedContent;
    }
    addEngagementElements(content) {
        // 簡潔なエンゲージメント要素を追加
        if (content.includes('分析') && content.length < 220) {
            content += '\n\n💡 どう思われますか？';
        }
        return content;
    }
    async calculateQualityScore(content, insights) {
        const metrics = {
            factualAccuracy: insights.reduce((avg, insight) => avg + insight.confidence, 0) / insights.length,
            readability: this.calculateReadabilityScore(content),
            educationalValue: this.calculateEducationalValue(content),
            uniqueness: 75,
            engagement: this.calculateEngagementScore(content),
            timeliness: 80
        };
        const overall = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
        return {
            overall: Math.round(overall),
            breakdown: metrics,
            grade: this.calculateGrade(overall)
        };
    }
    calculateReadabilityScore(content) {
        const sentences = content.split(/[。．.!?！？]/).filter(s => s.length > 0);
        const avgSentenceLength = content.length / sentences.length;
        let score = 100;
        if (avgSentenceLength > 100)
            score -= 20;
        if (avgSentenceLength > 150)
            score -= 20;
        return Math.max(0, score);
    }
    calculateEngagementScore(content) {
        let score = 60;
        const engagementElements = ['？', '！', '💡', '📊', '🎯'];
        const elementCount = engagementElements.filter(e => content.includes(e)).length;
        score += elementCount * 8;
        return Math.min(100, score);
    }
    calculateGrade(overall) {
        if (overall >= 95)
            return 'A+';
        if (overall >= 90)
            return 'A';
        if (overall >= 85)
            return 'B+';
        if (overall >= 80)
            return 'B';
        if (overall >= 75)
            return 'C+';
        if (overall >= 70)
            return 'C';
        if (overall >= 60)
            return 'D';
        return 'F';
    }
    calculateOverallConfidence(insights) {
        if (insights.length === 0)
            return 0;
        const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0);
        const averageConfidence = totalConfidence / insights.length;
        // ソース数による信頼性ボーナス
        const sourceBonus = Math.min(10, insights.length * 2);
        return Math.min(100, averageConfidence + sourceBonus);
    }
    /**
     * Autonomous Exploration Engine Methods (統合済み)
     * Webからの自律的情報探索機能
     */
    async exploreFromSeed(seedUrl, maxDepth = 2) {
        console.log(`🕸️ [自律探索] ${seedUrl}から深度${maxDepth}で探索開始`);
        try {
            const contentResults = [];
            let totalLinksDiscovered = 0;
            const visitedUrls = new Set();
            const startTime = Date.now();
            await this.exploreRecursively({ url: seedUrl, text: 'Seed URL', priority: 100 }, 0, maxDepth, contentResults, visitedUrls);
            console.log(`✅ [探索完了] ${contentResults.length}件のコンテンツを発見`);
            return {
                seedUrl,
                totalLinksDiscovered,
                exploredLinks: visitedUrls.size,
                contentResults,
                executionTime: Date.now() - startTime,
                errors: []
            };
        }
        catch (error) {
            console.error('❌ [探索エラー]:', error);
            throw error;
        }
    }
    async exploreRecursively(link, currentDepth, maxDepth, contentResults, visitedUrls) {
        if (currentDepth >= maxDepth)
            return;
        if (visitedUrls.has(link.url))
            return;
        visitedUrls.add(link.url);
        try {
            const pageContent = await this.fetchPageContent(link.url);
            const fxContent = this.extractFXContent(pageContent, link.url);
            if (fxContent.confidence >= 0.6) {
                const contentResult = {
                    url: link.url,
                    depth: currentDepth,
                    content: fxContent,
                    collectionMethod: 'web_exploration',
                    qualityMetrics: this.evaluateContentQuality(pageContent)
                };
                contentResults.push(contentResult);
                console.log(`✅ コンテンツ収集: ${link.url} (信頼度: ${fxContent.confidence})`);
            }
            // 次の階層の探索は省略（簡略化）
        }
        catch (error) {
            console.warn(`⚠️ 探索エラー ${link.url}:`, error);
        }
    }
    async fetchPageContent(url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'TradingAssistantX/1.0.0'
                },
                maxRedirects: 3
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch ${url}: ${error}`);
        }
    }
    extractFXContent(pageContent, url) {
        const $ = cheerio.load(pageContent);
        const text = $('body').text();
        // FX関連キーワードでコンテンツを評価
        const fxKeywords = [
            'forex', 'fx', 'currency', 'trading', 'usd', 'eur', 'jpy',
            '通貨', 'トレード', '為替', '金利', '経済指標'
        ];
        let relevanceScore = 0;
        const lowerText = text.toLowerCase();
        fxKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                relevanceScore += 0.1;
            }
        });
        const confidence = Math.min(1.0, relevanceScore);
        return {
            text: text.substring(0, 500),
            confidence,
            keywords: fxKeywords.filter(k => lowerText.includes(k)),
            url
        };
    }
    evaluateContentQuality(pageContent) {
        const $ = cheerio.load(pageContent);
        const text = $('body').text();
        return {
            wordCount: text.split(/\s+/).length,
            hasStructure: $('h1, h2, h3').length > 0,
            hasLinks: $('a').length,
            qualityScore: Math.min(1.0, text.length / 1000)
        };
    }
    /**
     * Context Compression System Methods (統合済み)
     * システムパフォーマンス最適化機能
     */
    async executeOptimizedDecision(actionType) {
        const startTime = Date.now();
        try {
            // メモリ健全性チェック
            const memoryStats = process.memoryUsage();
            const memoryHealthy = (memoryStats.heapUsed / 1024 / 1024) < 500; // 500MB未満
            if (!memoryHealthy) {
                console.log('⚠️ [メモリ最適化] メモリ使用量が高いため最適化実行');
                if (global.gc)
                    global.gc();
            }
            // 最小限コンテキスト取得
            const context = await this.getMinimalDecisionContext(actionType);
            // 高速判断実行
            const decision = await this.makeQuickDecision(context);
            const executionTime = Date.now() - startTime;
            console.log(`⚡ [最適化決定] ${decision.action} (${executionTime}ms)`);
            return decision;
        }
        catch (error) {
            console.error('❌ [最適化決定エラー]:', error);
            return {
                action: 'wait',
                reason: 'システムエラー - 待機',
                confidence: 0.3
            };
        }
    }
    async getMinimalDecisionContext(actionType) {
        return {
            timestamp: new Date().toISOString(),
            actionType: actionType || 'general',
            systemLoad: {
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                uptime: Math.round(process.uptime())
            },
            current: {
                todayProgress: 5,
                accountHealth: 80
            }
        };
    }
    async makeQuickDecision(context) {
        // 簡潔な決定ロジック
        if (context.current.todayProgress >= 15) {
            return { action: 'wait', reason: '日次制限到達', confidence: 0.9 };
        }
        if (context.current.accountHealth < 50) {
            return { action: 'wait', reason: 'アカウント健康度低下', confidence: 0.8 };
        }
        if (context.current.todayProgress < 5) {
            return { action: 'post', reason: '活動不足補填', confidence: 0.7 };
        }
        return { action: 'post', reason: '通常投稿', confidence: 0.6 };
    }
    async getSystemStatus() {
        const memoryStats = process.memoryUsage();
        const memoryMB = Math.round(memoryStats.heapUsed / 1024 / 1024);
        const isHealthy = memoryMB < 500;
        return `システム状態: ${isHealthy ? '正常' : '要注意'} | メモリ:${memoryMB}MB | 稼働時間:${Math.round(process.uptime())}秒`;
    }
    async optimizeSystem() {
        const startTime = Date.now();
        // メモリクリーンアップ
        if (global.gc) {
            global.gc();
            console.log('🧹 [システム最適化] ガベージコレクション実行');
        }
        // パフォーマンス測定
        const memoryAfter = process.memoryUsage();
        const optimizationTime = Date.now() - startTime;
        console.log(`✅ [システム最適化完了] ${optimizationTime}ms, メモリ:${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB`);
    }
}
