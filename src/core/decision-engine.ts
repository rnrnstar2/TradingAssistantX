import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Context, Decision, Need, Action, IntegratedContext, ActionSpecificResult } from '../types/autonomous-system.js';
import type { ActionDecision } from '../types/action-types';
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';
import { loadYamlSafe, loadYamlArraySafe } from '../utils/yaml-utils';
import * as yaml from 'js-yaml';
import { logClaudeDecision, updateClaudeResponse, logClaudeError } from '../lib/decision-logger';

export class DecisionEngine {
  private actionSpecificCollector?: ActionSpecificCollector;

  constructor(actionSpecificCollector?: ActionSpecificCollector) {
    // Claude Code SDK is used directly
    this.actionSpecificCollector = actionSpecificCollector;
  }

  // 新しい統合コンテキスト対応メソッド
  async planActionsWithIntegratedContext(integratedContext: IntegratedContext): Promise<Decision[]> {
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
    } catch (error) {
      console.error('❌ [統合決定エラー]:', error);
      return this.createFallbackDecisions(integratedContext);
    }
  }

  async analyzeAndDecide(context: Context): Promise<Decision[]> {
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
  private async makeIntegratedDecisions(integratedContext: IntegratedContext): Promise<Decision[]> {
    console.log('🧠 [統合意思決定] 統合コンテキストに基づく高度な意思決定を実行中...');
    
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
    const logId = await logClaudeDecision(
      'DecisionEngine',
      'makeIntegratedDecisions',
      'integrated_strategic_decisions',
      claudePrompt,
      {
        accountHealth: integratedContext.account.healthScore,
        marketOpportunities: integratedContext.market.opportunities.length,
        actionSuggestions: integratedContext.actionSuggestions.length
      }
    );

    const startTime = Date.now();

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(claudePrompt)
        .asText();

      const processingTime = Date.now() - startTime;

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0]);
        
        // レスポンス記録
        await updateClaudeResponse(logId, response, processingTime, decisions, 'sonnet');
        
        console.log('🧠 [統合決定完了] 以下の戦略的決定を策定:');
        decisions.forEach((decision: any, index: number) => {
          console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
          console.log(`     💭 戦略理由: ${decision.reasoning}`);
          console.log(`     🎯 期待効果: ${decision.params?.expectedImpact || 'N/A'}`);
          console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
        });
        
        return this.validateAndEnhanceDecisions(decisions, integratedContext);
      }
      
      console.log('⚠️ [統合決定] JSON解析に失敗、フォールバック決定を生成');
      const fallbackDecisions = this.createFallbackDecisions(integratedContext);
      await updateClaudeResponse(logId, response, processingTime, fallbackDecisions, 'sonnet');
      return fallbackDecisions;
    } catch (error) {
      console.error('❌ [統合決定エラー]:', error);
      await logClaudeError(logId, error as Error, true);
      return this.createFallbackDecisions(integratedContext);
    }
  }

  async planActions(needs: Need[]): Promise<Action[]> {
    console.log(`🎯 [Claude計画開始] ${needs.length}件のニーズから実行計画を策定...`);
    
    const decisions = await this.prioritizeNeeds(needs);
    
    console.log(`🔄 [Claude実行計画] ${decisions.length}件の決定を実行可能アクションに変換中...`);
    
    const actions: Action[] = [];
    
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

  private async makeStrategicDecisions(
    context: Context,
    sharedContext: any
  ): Promise<Decision[]> {
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
        .query(prompt)
        .asText();

      const decisions = JSON.parse(response);
      console.log(`🎯 [Claude戦略決定] ${decisions.length}件の戦略的決定を策定`);
      
      return decisions;
    } catch (error) {
      console.log('❌ [Claude戦略エラー] 戦略決定に失敗:', error);
      return [];
    }
  }

  private async prioritizeNeeds(needs: Need[]): Promise<Decision[]> {
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
    const logId = await logClaudeDecision(
      'DecisionEngine',
      'prioritizeNeeds',
      'needs_prioritization',
      prompt,
      {
        needsCount: needs.length,
        needsTypes: needs.map(n => n.type),
        needsPriorities: needs.map(n => n.priority)
      }
    );

    const startTime = Date.now();
    let response = '';

    try {
      response = await claude()
        .withModel('sonnet')
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
      decisions.forEach((decision: any, index: number) => {
        console.log(`  ${index + 1}. 【${decision.type}】(${decision.priority}優先度)`);
        console.log(`     💭 理由: ${decision.reasoning}`);
        console.log(`     ⏱️  所要時間: ${decision.estimatedDuration}分`);
        if (decision.dependencies && decision.dependencies.length > 0) {
          console.log(`     🔗 依存関係: ${decision.dependencies.join(', ')}`);
        }
      });
      
      return decisions;
    } catch (error) {
      console.error('❌ prioritizeNeeds JSON parse error:', error);
      await logClaudeError(logId, error as Error, false);
      return [];
    }
  }

  private async convertDecisionToAction(decision: Decision): Promise<Action | null> {
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

  private mapDecisionToActionType(decision: Decision): string | null {
    const typeMapping: Record<string, string> = {
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

  private async loadSharedContext(): Promise<any> {
    const path = (await import('path')).default;
    
    const insightsPath = path.join(process.cwd(), 'data', 'context', 'shared-insights.yaml');
    
    const result = loadYamlSafe<any>(insightsPath);
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

  private async saveDecisions(decisions: Decision[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
    
    let history = loadYamlArraySafe<any>(decisionsPath);
    
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
  private validateAndEnhanceDecisions(decisions: any[], context: IntegratedContext): Decision[] {
    console.log('✅ [決定検証] 決定の妥当性と戦略的整合性を検証中...');
    
    const validatedDecisions: Decision[] = [];
    
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
  private adjustDecisionForAccountHealth(decision: any, healthScore: number): Decision {
    let adjustedPriority = decision.priority;
    let adjustedParams = { ...decision.params };
    
    if (healthScore < 50) {
      // ヘルス低下時：保守的なアプローチ
      if (decision.priority === 'high') adjustedPriority = 'medium';
      adjustedParams.riskLevel = 'low';
      adjustedParams.contentType = 'educational';
    } else if (healthScore > 80) {
      // ヘルス良好時：積極的なアプローチ
      if (decision.priority === 'medium') adjustedPriority = 'high';
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
  private alignDecisionWithMarketContext(decision: Decision, marketContext: any): Decision {
    const enhancedParams = { ...decision.params };
    
    // 高優先度機会がある場合の調整
    const highPriorityOpportunities = marketContext.opportunities?.filter(
      (op: any) => op.priority === 'high'
    ).length || 0;
    
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
  private createFallbackDecisions(context: IntegratedContext): Decision[] {
    console.log('🔄 [フォールバック決定] 基本的な決定を生成中...');
    
    const fallbackDecisions: Decision[] = [];
    
    // アカウントヘルスに基づく基本決定
    if (context.account.healthScore < 70) {
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-health`,
        type: 'content_generation',
        priority: 'high',
        reasoning: 'アカウントヘルス改善のための教育的コンテンツ生成',
        params: {
          actionType: 'original_post',
          originalContent: '投資の基本原則：リスク管理とポートフォリオ分散の重要性について',
          contentType: 'educational',
          expectedImpact: 0.6
        },
        action: {
          type: 'original_post',
          reasoning: 'アカウントヘルス改善のための教育的コンテンツ',
          priority: 'high',
          expectedImpact: 0.6,
          content: '投資の基本原則：リスク管理とポートフォリオ分散の重要性について'
        },
        dependencies: [],
        estimatedDuration: 30
      });
    }
    
    // 市場機会に基づく決定
    if (context.market.opportunities.length > 0) {
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-opportunity`,
        type: 'content_generation',
        priority: 'medium',
        reasoning: '利用可能な市場機会を活用したオリジナル投稿',
        params: {
          actionType: 'original_post',
          originalContent: '現在の市場動向から学ぶ投資戦略のポイント',
          timing: 'immediate',
          expectedImpact: 0.5
        },
        action: {
          type: 'original_post',
          reasoning: '市場機会を活用したオリジナル投稿',
          priority: 'medium',
          expectedImpact: 0.5,
          content: '現在の市場動向から学ぶ投資戦略のポイント'
        },
        dependencies: [],
        estimatedDuration: 25
      });
    }
    
    // 基本的なコンテンツ生成決定
    fallbackDecisions.push({
      id: `fallback-${Date.now()}-basic`,
      type: 'content_generation',
      priority: 'low',
      reasoning: '基本的な投資教育コンテンツの提供',
      params: {
        actionType: 'original_post',
        originalContent: '長期投資の視点：短期的な変動に惑わされない投資マインドの重要性',
        timing: 'scheduled',
        expectedImpact: 0.4
      },
      action: {
        type: 'original_post',
        reasoning: '基本的な投資教育コンテンツの提供',
        priority: 'low',
        expectedImpact: 0.4,
        content: '長期投資の視点：短期的な変動に惑わされない投資マインドの重要性'
      },
      dependencies: [],
      estimatedDuration: 20
    });
    
    return fallbackDecisions;
  }
  
  // 拡張アクション戦略計画メソッド（投稿専用モード対応）
  async planExpandedActions(integratedContext: IntegratedContext): Promise<ActionDecision[]> {
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
      } catch (error) {
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
    } catch (error) {
      console.error('❌ [拡張アクション計画エラー]:', error);
      return this.createFallbackActionDecisions(integratedContext);
    }
  }

  // 拡張アクション決定の生成（ActionSpecificCollector統合版）
  async makeExpandedActionDecisions(
    context: IntegratedContext,
    needsEvaluation?: any
  ): Promise<Decision[]> {
    console.log('🧠 [拡張アクション決定] ActionSpecificCollector統合による意思決定を開始...');
    
    try {
      // 1. 基本アクション決定（既存ロジック維持）
      const baseDecisions = await this.generateBaseActionDecisions(context, needsEvaluation);
      
      // 2. 新機能: アクション特化型情報収集
      const enhancedDecisions = await this.enhanceDecisionsWithSpecificCollection(
        baseDecisions,
        context
      );
      
      // 3. 最終決定生成（既存ロジック拡張）
      return await this.finalizeExpandedDecisions(enhancedDecisions, context);
      
    } catch (error) {
      console.error('拡張アクション決定エラー:', error);
      // フォールバック: 既存ロジックで継続
      return await this.generateBaseActionDecisions(context, needsEvaluation);
    }
  }

  // 新規メソッド: 基本アクション決定生成
  private async generateBaseActionDecisions(
    context: IntegratedContext,
    needsEvaluation?: any
  ): Promise<Decision[]> {
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
        .query(claudePrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0]);
        console.log(`✅ [基本アクション決定完了] ${decisions.length}件の基本決定を策定`);
        return decisions;
      }
      
      return this.createFallbackDecisions(context);
    } catch (error) {
      console.error('❌ [基本アクション決定エラー]:', error);
      return this.createFallbackDecisions(context);
    }
  }

  // 新規メソッド: アクション特化型情報収集による決定強化
  private async enhanceDecisionsWithSpecificCollection(
    baseDecisions: Decision[],
    context: IntegratedContext
  ): Promise<Decision[]> {
    if (!this.actionSpecificCollector) {
      console.log('⚠️ [ActionSpecific収集] ActionSpecificCollectorが無効、基本決定をそのまま返却');
      return baseDecisions; // コレクターが無い場合は既存決定をそのまま返す
    }

    console.log('🎯 [ActionSpecific収集] アクション特化情報収集による決定強化を開始...');
    const enhancedDecisions: Decision[] = [];

    for (const decision of baseDecisions) {
      if (decision.action?.type) {
        try {
          console.log(`🔍 [特化収集] ${decision.action.type}向け情報収集を実行...`);
          
          // アクション特化情報収集実行
          const specificResults = await this.actionSpecificCollector.collectForAction(
            decision.action.type as any,
            context,
            85 // 85%充足度目標
          );

          // 収集結果を活用した決定強化
          const enhancedDecision = await this.enhanceDecisionWithCollectionResults(
            decision,
            specificResults
          );

          enhancedDecisions.push(enhancedDecision);
          
        } catch (error) {
          console.warn(`⚠️ [特化収集失敗] ${decision.action.type}:`, error);
          enhancedDecisions.push(decision); // エラー時は元の決定を維持
        }
      } else {
        enhancedDecisions.push(decision);
      }
    }

    console.log(`✅ [ActionSpecific収集完了] ${enhancedDecisions.length}件の決定を強化`);
    return enhancedDecisions;
  }

  // 新規メソッド: 収集結果による決定強化
  private async enhanceDecisionWithCollectionResults(
    decision: Decision,
    collectionResults: ActionSpecificResult
  ): Promise<Decision> {
    console.log(`🔧 [決定強化] ${decision.action?.type}の決定を特化収集結果で強化中...`);
    
    const enhancementPrompt = `
決定強化分析：

【元の決定】
アクション: ${decision.action?.type}
理由: ${decision.reasoning}
期待効果: ${decision.expectedImpact}

【特化収集結果】
充足度: ${collectionResults.sufficiencyScore}%
品質スコア: ${collectionResults.qualityMetrics.overallScore}
収集データ数: ${collectionResults.results.length}
実行時間: ${collectionResults.executionTime}秒

【収集データ概要】
${collectionResults.results.slice(0, 3).map(r => 
  `- ${r.type}: ${r.content.substring(0, 100)}... (関連度: ${r.relevanceScore})`
).join('\n')}

この特化収集結果を活用して、元の決定を強化してください：
1. 具体的なコンテンツ案の改善
2. 期待効果の再評価
3. 実行優先度の調整
4. リスク評価の更新

強化された決定をJSONで返してください。
    `;

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(enhancementPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhancedDecisionData = JSON.parse(jsonMatch[0]);
        
        const enhancedDecision = {
          ...decision,
          ...enhancedDecisionData,
          metadata: {
            ...decision.metadata,
            enhancedWithSpecificCollection: true,
            collectionSufficiency: collectionResults.sufficiencyScore,
            collectionQuality: collectionResults.qualityMetrics.overallScore,
            enhancementTimestamp: Date.now()
          }
        };
        
        console.log(`✅ [決定強化完了] ${decision.action?.type}の決定を強化`);
        return enhancedDecision;
      }
      
    } catch (error) {
      console.warn('⚠️ [決定強化エラー]:', error);
    }
    
    // エラー時は元の決定を返す
    return decision;
  }

  // 新規メソッド: 最終決定生成
  private async finalizeExpandedDecisions(
    enhancedDecisions: Decision[],
    context: IntegratedContext
  ): Promise<Decision[]> {
    console.log('🏁 [最終決定] 強化された決定を最終調整中...');
    
    // 既存の検証ロジックを活用
    const finalDecisions = this.validateAndEnhanceDecisions(enhancedDecisions, context);
    
    console.log(`✅ [拡張アクション決定完了] ${finalDecisions.length}件の統合的決定を策定`);
    return finalDecisions;
  }

  // アクション決定の検証
  private validateActionDecisions(decisions: any[]): ActionDecision[] {
    console.log('✅ [アクション決定検証] 決定の妥当性とパラメータを検証中...');
    
    const validatedDecisions: ActionDecision[] = [];
    
    for (const decision of decisions) {
      // 基本的な検証
      if (!decision.id || !decision.type || !decision.priority) {
        console.log(`⚠️ [検証失敗] 不完全なアクション決定をスキップ: ${JSON.stringify(decision)}`);
        continue;
      }
      
      // original_post専用の検証
      if (decision.type === 'original_post') {
        // originalContentの存在確認と自動補完
        if (!decision.params?.originalContent && !decision.content) {
          console.log(`⚠️ [パラメータ修正] originalContentを自動補完: ${decision.id}`);
          decision.params = decision.params || {};
          decision.params.originalContent = decision.content || '投資教育コンテンツ';
          decision.content = decision.params.originalContent;
        }
        
        validatedDecisions.push(decision as ActionDecision);
      } else {
        console.log(`⚠️ [検証失敗] original_post以外のアクションタイプをスキップ: ${decision.type}`);
        continue;
      }
    }
    
    console.log(`✅ [アクション決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
    return validatedDecisions;
  }

  // 新規メソッド: 投稿専用アクション決定の生成
  private async createPostingOnlyActionDecisions(context: IntegratedContext): Promise<ActionDecision[]> {
    console.log('📝 [投稿専用決定] original_postのみの高品質アクション決定を生成中...');
    
    const currentDate = new Date().toISOString().split('T')[0];
    const timeOfDay = new Date().getHours();
    let contentFocus = '';
    
    if (timeOfDay >= 7 && timeOfDay < 12) {
      contentFocus = '朝の市場開始前の戦略';
    } else if (timeOfDay >= 12 && timeOfDay < 17) {
      contentFocus = '日中の市場動向分析';
    } else {
      contentFocus = '市場終了後の振り返り';
    }
    
    // 高品質なoriginal_post決定を1～2件生成
    const postingDecisions: ActionDecision[] = [
      {
        id: `posting-only-${Date.now()}-main`,
        type: 'original_post',
        priority: 'high',
        reasoning: `投稿専用モード: ${contentFocus}に関する価値ある投資情報を提供`,
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
  private createPostingOnlyFallback(context: IntegratedContext): ActionDecision[] {
    console.log('🔄 [投稿専用フォールバック] 基本的なoriginal_post決定を生成中...');
    
    return [{
      id: `posting-fallback-${Date.now()}`,
      type: 'original_post',
      priority: 'high',
      reasoning: '投稿専用モードのフォールバック: 基本的な投資教育コンテンツ',
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
  private createFallbackActionDecisions(context: IntegratedContext): ActionDecision[] {
    console.log('🔄 [フォールバックアクション決定] 基本的なアクション戦略を生成中...');
    
    const fallbackDecisions: ActionDecision[] = [];
    
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
    } else {
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
  private async saveExpandedActionDecisions(decisions: ActionDecision[], context: IntegratedContext): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const decisionsPath = path.join(process.cwd(), 'data', 'current', 'current-decisions.yaml');
      
      let history = loadYamlArraySafe<any>(decisionsPath);
      
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
    } catch (error) {
      console.error('❌ [拡張アクション決定保存エラー]:', error);
    }
  }

  private async updateClaudeSummaryFromDecisions(latestDecision: ActionDecision, context: IntegratedContext): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const claudeSummaryPath = path.join(process.cwd(), 'data', 'claude-summary.yaml');
      
      let claudeSummary: any = {};
      if (await fs.access(claudeSummaryPath).then(() => true).catch(() => false)) {
        const existingData = await fs.readFile(claudeSummaryPath, 'utf8');
        claudeSummary = yaml.load(existingData) as any || {};
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
    } catch (error) {
      console.error('Error updating claude-summary from decisions:', error);
    }
  }
  
  // アクション配分の計算
  private calculateActionBreakdown(decisions: ActionDecision[]): any {
    const breakdown = {
      original_post: 0,
      quote_tweet: 0,
      retweet: 0,
      reply: 0,
      total: decisions.length
    };
    
    decisions.forEach(decision => {
      if (breakdown.hasOwnProperty(decision.type)) {
        (breakdown as any)[decision.type]++;
      }
    });
    
    return breakdown;
  }

  // 統合決定の保存
  private async saveIntegratedDecisions(decisions: Decision[], context: IntegratedContext): Promise<void> {
    try {
      const fs = (await import('fs/promises')).default;
      const path = (await import('path')).default;
      
      const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
      
      let history = loadYamlArraySafe<any>(decisionsPath);
      
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
    } catch (error) {
      console.error('❌ [統合決定保存エラー]:', error);
    }
  }

  // Decision[] から ActionDecision[] への変換
  private convertDecisionsToActionDecisions(decisions: Decision[]): ActionDecision[] {
    console.log('🔄 [型変換] Decision[] を ActionDecision[] に変換中...');
    
    const actionDecisions: ActionDecision[] = [];
    
    for (const decision of decisions) {
      try {
        // Decision.action の type をチェックし、original_postのみ処理
        if (decision.action && decision.action.type === 'original_post') {
          const actionDecision: ActionDecision = {
            id: decision.id,
            type: 'original_post',
            priority: decision.priority,
            reasoning: decision.reasoning || '',
            params: this.convertDecisionParamsToActionParams(decision),
            content: decision.action.content || '',
            estimatedDuration: decision.estimatedDuration || 30
          };
          
          actionDecisions.push(actionDecision);
        } else {
          // decision.actionが無い場合や他のタイプの場合は、original_postとして処理
          const fallbackActionDecision: ActionDecision = {
            id: decision.id,
            type: 'original_post',
            priority: decision.priority,
            reasoning: decision.reasoning || '',
            params: { originalContent: decision.action?.content || '投資教育コンテンツ' },
            content: decision.action?.content || '投資教育コンテンツ',
            estimatedDuration: decision.estimatedDuration || 30
          };
          
          actionDecisions.push(fallbackActionDecision);
        }
      } catch (error) {
        console.error('❌ [型変換エラー]:', error);
        // エラー時はoriginal_postフォールバックを追加
        const errorFallbackDecision: ActionDecision = {
          id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'original_post',
          priority: 'medium',
          reasoning: '変換エラーのためのフォールバック決定',
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
  private convertDecisionParamsToActionParams(decision: Decision): any {
    const params = decision.params || {};
    const action = decision.action;
    
    // original_post専用の変換
    return {
      originalContent: action?.content || params.originalContent || params.targetContent || '投資教育コンテンツ',
      hashtags: params.hashtags || ['#投資', '#資産形成'],
      contentType: params.contentType || 'educational',
      riskLevel: params.riskLevel || 'low',
      timeOfDay: new Date().getHours(),
      dateGenerated: new Date().toISOString().split('T')[0]
    };
  }

  // デバッグ用ヘルパー関数追加
  private getTypeMappingForDebug(): Record<string, string> {
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