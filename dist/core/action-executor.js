import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { isExecutionData } from '../types/decision-types.js';
import { SimpleXClient } from '../lib/x-client.js';
import { join } from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
export class AutonomousExecutorActionExecutor {
    contextManager;
    dailyActionPlanner;
    xClient;
    constructor(contextManager, dailyActionPlanner) {
        this.contextManager = contextManager;
        this.dailyActionPlanner = dailyActionPlanner;
        // X API クライアントを初期化 (OAuth 2.0)
        this.xClient = new SimpleXClient();
    }
    async executeDecision(decision) {
        console.log(`🚀 [判断実行] アクション実行開始: ${decision.action}`);
        try {
            switch (decision.action) {
                case 'original_post':
                    await this.executeOriginalPost();
                    break;
                default:
                    console.log(`⚠️ [判断実行] 未知のアクション: ${decision.action}`);
            }
            console.log('✅ [判断実行] アクション実行完了');
        }
        catch (error) {
            console.error('❌ [判断実行] エラー:', error);
            throw error;
        }
    }
    async executeExpandedActions(actionDecisions, integratedContext, dailyPlan) {
        if (!actionDecisions || actionDecisions.length === 0) {
            console.log('📝 [拡張実行] 実行するアクションがありません');
            return;
        }
        console.log(`🚀 [拡張実行] ${actionDecisions.length}個のアクションを実行開始`);
        // デイリープランがある場合は優先度を調整
        let optimizedDecisions = actionDecisions;
        if (dailyPlan) {
            optimizedDecisions = this.optimizeDecisionsForDaily(actionDecisions, dailyPlan);
        }
        // アクション分布を分析
        const actionDistribution = this.analyzeActionDistribution(optimizedDecisions, integratedContext);
        console.log('📊 [拡張実行] アクション分布:', actionDistribution);
        // 優先度でソート
        const prioritizedActions = this.prioritizeActions(optimizedDecisions);
        // 各アクションを順次実行
        for (const action of prioritizedActions) {
            try {
                await this.executeSpecificAction(action, integratedContext);
                await this.waitBetweenActions(action);
            }
            catch (error) {
                console.error(`❌ [拡張実行] アクション実行エラー (${action.id}):`, error);
                // 個別のアクションエラーは全体の実行を止めない
            }
        }
        console.log('✅ [拡張実行] 全アクション実行完了');
    }
    async executeOriginalPost() {
        console.log('📝 [投稿作成] 独自コンテンツ作成を開始...');
        try {
            // 基本的なコンテキストを取得
            const basicContext = await this.contextManager.generateBasicContext();
            // Claude に投稿内容を生成してもらう
            const prompt = `投資教育に関する価値ある X（Twitter）投稿を作成してください。

現在のコンテキスト:
- 市場状況: ${basicContext.marketCondition}
- システム健康: ${basicContext.systemHealth}

要求:
- 280文字以内
- 投資教育に特化
- エンゲージメントを促す
- 専門的だが理解しやすい内容

直接投稿内容のみを返答してください。`;
            const generatedContent = await claude()
                .withModel('sonnet')
                .withTimeout(15000)
                .query(prompt)
                .asText();
            // .asText()は文字列を返すが、空や無効な場合はフォールバック
            let contentText = generatedContent?.trim() || '';
            if (contentText.length < 10 || contentText.includes('生成中です') || contentText.includes('準備中です')) {
                console.warn('⚠️ [コンテンツ生成] 無効な応答、フォールバック生成を実行');
                contentText = this.generateFallbackContent(basicContext);
            }
            console.log('📄 [生成内容]:', contentText);
            // X（Twitter）に実際に投稿を実行
            console.log('📝 [投稿実行] X投稿を開始...');
            try {
                const postResult = await this.xClient.post(contentText.trim());
                if (postResult.success) {
                    console.log('✅ [投稿完了] 投稿が成功しました');
                }
                else {
                    console.log('❌ [投稿失敗] 投稿に失敗しました');
                }
                console.log('🔗 [投稿結果]:', postResult);
                // 投稿成功時のデータを保存
                await this.saveOriginalPostExecution({
                    actionType: 'original_post',
                    content: contentText.trim(),
                    timing: {
                        executedTime: new Date().toISOString()
                    },
                    metadata: {
                        ...basicContext,
                        postResult: postResult,
                        status: postResult.success ? 'posted_successfully' : 'posting_failed'
                    }
                });
            }
            catch (postError) {
                console.error('❌ [投稿エラー] X投稿に失敗:', postError);
                // 投稿失敗時も内容を保存（デバッグ用）
                await this.saveOriginalPostExecution({
                    actionType: 'original_post',
                    content: contentText.trim(),
                    timing: {
                        executedTime: new Date().toISOString()
                    },
                    metadata: {
                        ...basicContext,
                        error: postError instanceof Error ? postError.message : String(postError),
                        status: 'post_failed'
                    }
                });
                throw postError;
            }
        }
        catch (error) {
            console.error('❌ [投稿作成] エラー:', error);
            throw error;
        }
    }
    async executeSpecificAction(action, context) {
        const actionType = this.mapDecisionToActionType(action);
        console.log(`🔄 [個別実行] アクション開始: ${actionType} (優先度: ${action.priority})`);
        switch (actionType) {
            case 'content_creation':
                await this.executeContentCreation(action, context);
                break;
            case 'immediate_post':
                await this.executeImmediatePost(action, context);
                break;
            case 'performance_analysis':
                await this.executePerformanceAnalysis(action, context);
                break;
            default:
                console.log(`⚠️ [個別実行] サポートされていないアクション: ${actionType}`);
        }
        console.log(`✅ [個別実行] アクション完了: ${actionType}`);
    }
    async executeContentCreation(action, context) {
        console.log('📝 [コンテンツ作成] 開始...');
        const prompt = `投資教育コンテンツを作成してください。

要求された内容: ${action.content || action.description || '一般的な投資教育'}
コンテキスト: 
- 市場状況: ${context.market?.trend || 'データなし'}
- システム状況: ${context.system?.health || 'データなし'}
- 投稿履歴: ${context.historical?.recentPosts?.length || 0}件

280文字以内で、教育的で価値のある内容を作成してください。`;
        try {
            const content = await claude()
                .withModel('sonnet')
                .withTimeout(15000)
                .query(prompt)
                .asText();
            const contentText = typeof content === 'string' ? content : '投資教育コンテンツを準備中です。';
            await this.saveGeneratedContent(contentText, context);
            console.log('✅ [コンテンツ作成] 完了');
        }
        catch (error) {
            console.error('❌ [コンテンツ作成] エラー:', error);
            throw error;
        }
    }
    async executeImmediatePost(action, context) {
        console.log('🚀 [即時投稿] 開始...');
        // コンテンツ作成と同じ処理だが、より緊急性の高い内容
        const prompt = `緊急投稿コンテンツを作成してください。

要求: ${action.content || action.description || '市場の重要な動向'}
優先度: ${action.priority}

280文字以内で、タイムリーで価値のある内容を作成してください。`;
        try {
            const content = await claude()
                .withModel('sonnet')
                .withTimeout(15000)
                .query(prompt)
                .asText();
            const contentText = typeof content === 'string' ? content : '緊急投資情報をお届け予定です。';
            await this.saveGeneratedContent(contentText, context);
            console.log('✅ [即時投稿] 完了');
        }
        catch (error) {
            console.error('❌ [即時投稿] エラー:', error);
            throw error;
        }
    }
    async executePerformanceAnalysis(action, context) {
        console.log('📊 [パフォーマンス分析] 開始...');
        // 簡易的な分析レポートを生成
        const analysis = {
            timestamp: Date.now(),
            contextHealth: context.account.healthScore,
            actionType: action.type,
            analysis: 'パフォーマンス分析が完了しました',
            recommendations: ['今後のコンテンツ改善提案1', '今後のコンテンツ改善提案2']
        };
        await this.savePerformanceAnalysis(analysis);
        console.log('✅ [パフォーマンス分析] 完了');
    }
    optimizeDecisionsForDaily(actionDecisions, dailyPlan) {
        return actionDecisions.map(decision => {
            // デイリープランに基づいて優先度を調整
            const highPriorityTopics = dailyPlan?.highPriorityTopics
                ? dailyPlan.highPriorityTopics.slice(0, 3)
                : [];
            const isHighPriority = highPriorityTopics.some(topicPriority => topicPriority.topic === decision.content ||
                decision.content?.includes(topicPriority.topic));
            if (isHighPriority) {
                return {
                    ...decision,
                    priority: this.adjustPriorityByWeight(decision.priority, 1.5)
                };
            }
            return decision;
        });
    }
    adjustPriorityByWeight(priority, weight) {
        const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 };
        const reverseMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
        const currentLevel = priorityMap[priority] || 2;
        const newLevel = Math.min(4, Math.max(1, Math.round(currentLevel * weight)));
        return reverseMap[newLevel] || 'medium';
    }
    analyzeActionDistribution(decisions, integratedContext) {
        const distribution = {};
        decisions.forEach(decision => {
            const actionType = this.mapDecisionToActionType(decision);
            if (actionType !== null) {
                distribution[actionType] = (distribution[actionType] || 0) + 1;
            }
        });
        return distribution;
    }
    prioritizeActions(decisions) {
        return decisions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        });
    }
    async waitBetweenActions(action) {
        const waitTime = action.priority === 'high' ? 1000 : 2000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    mapDecisionToActionType(decision) {
        if (!decision)
            return null;
        // decision.typeを基準にマッピング
        switch (decision.type) {
            case 'content_creation':
            case 'post_creation':
            case 'original_post':
                return 'content_creation';
            case 'immediate_post':
            case 'urgent_post':
                return 'immediate_post';
            case 'analysis':
            case 'performance_analysis':
                return 'performance_analysis';
            default:
                return decision.type || 'content_creation';
        }
    }
    async saveGeneratedContent(content, context) {
        const outputDir = join(process.cwd(), 'tasks', 'outputs');
        await fs.promises.mkdir(outputDir, { recursive: true });
        const filename = `generated-content-${Date.now()}.yaml`;
        const filePath = join(outputDir, filename);
        const outputData = {
            content: content.trim(),
            context: {
                timestamp: Date.now(),
                systemHealth: context.systemHealth || 'unknown'
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                type: 'generated_content'
            }
        };
        await fs.promises.writeFile(filePath, yaml.dump(outputData));
        console.log(`📄 [保存] コンテンツを保存: ${filename}`);
    }
    async saveOriginalPostExecution(executionData) {
        const outputDir = join(process.cwd(), 'tasks', 'outputs');
        await fs.promises.mkdir(outputDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `original-post-${timestamp}.yaml`;
        const filePath = join(outputDir, filename);
        if (isExecutionData(executionData)) {
            const data = executionData; // ExecutionData型として安全
            const outputData = {
                execution: {
                    type: data.actionType, // 型安全
                    timestamp: data.timing?.executedTime || new Date().toISOString(),
                    content: data.content // 型安全
                },
                context: data.metadata,
                metadata: {
                    executedAt: new Date().toISOString(),
                    executionType: 'autonomous'
                }
            };
            await fs.promises.writeFile(filePath, yaml.dump(outputData));
            console.log(`📄 [投稿実行] 実行結果を保存: ${filename}`);
        }
        else {
            throw new Error('Invalid execution data format');
        }
    }
    async savePerformanceAnalysis(analysis) {
        const outputDir = join(process.cwd(), 'tasks', 'outputs');
        await fs.promises.mkdir(outputDir, { recursive: true });
        const filename = `performance-analysis-${Date.now()}.yaml`;
        const filePath = join(outputDir, filename);
        await fs.promises.writeFile(filePath, yaml.dump(analysis));
        console.log(`📊 [分析] 分析結果を保存: ${filename}`);
    }
    generateFallbackContent(basicContext) {
        const contentTemplates = [
            '📊 投資の基本原則：リスクとリターンは比例します。\n\n高いリターンを求めるなら、相応のリスクを受け入れる覚悟が必要です。自分のリスク許容度を正しく理解することが、成功への第一歩です。\n\n#投資教育 #リスク管理',
            '💡 分散投資の重要性：\n\n「すべての卵を一つのかごに入れるな」という格言があります。\n\n投資でも同様に、複数の銘柄や資産クラスに分散することで、リスクを軽減できます。\n\n#分散投資 #投資戦略',
            '⏰ 時間の力：複利効果について\n\n少額でも長期間投資を続けることで、複利効果により資産は大きく成長します。\n\n投資において最も大切なのは「時間」です。早く始めることが成功への鍵です。\n\n#複利効果 #長期投資',
            '📈 市場の変動について：\n\n短期的な価格の上下に一喜一憂せず、長期的な視点を持つことが重要です。\n\n感情的な判断ではなく、データに基づいた冷静な投資判断を心がけましょう。\n\n#投資心理 #市場分析'
        ];
        // 現在時刻に基づいてランダムに選択
        const index = Math.floor(Date.now() / 1000) % contentTemplates.length;
        const selectedTemplate = contentTemplates[index];
        console.log(`🔄 [フォールバック] テンプレート ${index + 1} を使用`);
        return selectedTemplate;
    }
}
