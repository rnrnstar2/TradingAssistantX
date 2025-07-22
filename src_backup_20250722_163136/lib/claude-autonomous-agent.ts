import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { IntegratedContext, Decision } from '../types/autonomous-system';
import type { MarketCondition } from '../types/rss-collection-types';
import { SimpleXClient } from './x-client.js';

export interface AutonomousStrategy {
  actionTypes: string[];
  frequency: number;
  contentThemes: string[];
  timing: string[];
  riskLevel: 'low' | 'medium' | 'high';
  adaptationLevel: 'conservative' | 'balanced' | 'aggressive';
}

export interface ExecutionPlan {
  id: string;
  strategy: AutonomousStrategy;
  actions: PlannedAutonomousAction[];
  adaptationPoints: string[];
  fallbackOptions: string[];
}

export interface PlannedAutonomousAction {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timing: string;
  content: string;
  reasoning: string;
  dependencies: string[];
  adaptationTriggers: string[];
}

export interface ExecutionResults {
  planId: string;
  executedActions: number;
  successfulActions: number;
  adaptationsMade: string[];
  learningPoints: string[];
  nextOptimizations: string[];
}

export interface OptimizationPlan {
  areas: string[];
  priorityChanges: Record<string, string>;
  strategyAdjustments: string[];
  newOpportunities: string[];
}

/**
 * Claude SDK中心の完全自律エージェント
 * 
 * このクラスは指示書で要求された「Claude Code SDK中心の完全自律システム」を実現し、
 * すべての固定制約を除去してClaude判断による完全自律動作を可能にします。
 */
export class ClaudeAutonomousAgent {
  private xClient: SimpleXClient;
  
  constructor() {
    console.log('🧠 [Claude自律エージェント] 完全自律システムを初期化中...');
    
    // X クライアント初期化 (シングルトン使用)
    this.xClient = SimpleXClient.getInstance();
    
    console.log('🧠 [ClaudeAutonomousAgent] 固定制約除去、Claude完全自律システム初期化完了');
  }

  /**
   * Claude自律的戦略決定
   * 固定制約なし、完全にClaude判断による戦略策定
   */
  async determineStrategy(context: IntegratedContext): Promise<AutonomousStrategy> {
    console.log('🧠 [Claude戦略決定] 制約なしの完全自律戦略を策定中...');
    
    const strategyPrompt = `
あなたはX（Twitter）投資教育コンテンツの完全自律システムです。
以下のコンテキストを分析し、最適な戦略を自律的に決定してください。

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

AUTONOMOUS DECISION REQUIREMENTS:
1. **アクションタイプ選択**: ['original_post'] のみを使用（現在はoriginal_postのみサポート）
2. **動的頻度決定**: 市場状況とアカウント状況に応じて最適な投稿頻度を決定（制約なし）
3. **適応的テーマ選択**: 市場機会とトレンドに応じて最適なコンテンツテーマを選択
4. **完全自律判断**: 固定ルールなし、すべてClaudeの戦略的判断に委託

返答形式（JSON）:
{
  "actionTypes": ["選択したアクションタイプの配列"],
  "frequency": "最適と判断した1日の投稿回数（数値）",
  "contentThemes": ["選択したテーマの配列"],
  "timing": ["最適と判断した投稿時間の配列"],
  "riskLevel": "low|medium|high",
  "adaptationLevel": "conservative|balanced|aggressive",
  "reasoning": "戦略決定の詳細な理由"
}

制約なし、完全自律判断で最適戦略を決定してください。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(8000)
        .query(strategyPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[0]) as AutonomousStrategy;
        
        console.log('✅ [Claude戦略決定完了] 自律戦略策定:', {
          actionTypes: strategy.actionTypes,
          frequency: strategy.frequency,
          themes: strategy.contentThemes.length,
          riskLevel: strategy.riskLevel
        });
        
        return strategy;
      }
      
      return this.createFallbackStrategy(context);
    } catch (error) {
      console.error('❌ [Claude戦略決定エラー]:', error);
      return this.createFallbackStrategy(context);
    }
  }

  /**
   * Claude自律的実行計画策定
   * 戦略に基づく具体的実行計画の自律生成
   */
  async planExecution(strategy: AutonomousStrategy): Promise<ExecutionPlan> {
    console.log('📋 [Claude実行計画] 自律戦略に基づく実行計画を策定中...');
    
    const planPrompt = `
以下の自律戦略に基づいて、具体的な実行計画を策定してください：

AUTONOMOUS STRATEGY:
${JSON.stringify(strategy, null, 2)}

EXECUTION PLANNING REQUIREMENTS:
1. **具体的アクション計画**: 各アクションタイプの具体的実行内容
2. **適応ポイント設定**: 状況変化時の自動調整ポイント
3. **フォールバック計画**: リスク管理のための代替案
4. **学習メカニズム**: 実行結果からの継続的改善点

返答形式（JSON）:
{
  "id": "plan-{timestamp}",
  "strategy": {戦略データ},
  "actions": [
    {
      "id": "action-{number}",
      "type": "アクションタイプ",
      "priority": "critical|high|medium|low",
      "timing": "実行タイミング",
      "content": "具体的コンテンツ案",
      "reasoning": "実行理由",
      "dependencies": ["依存関係の配列"],
      "adaptationTriggers": ["適応トリガーの配列"]
    }
  ],
  "adaptationPoints": ["適応ポイントの配列"],
  "fallbackOptions": ["フォールバック選択肢の配列"]
}

完全自律的な実行計画を策定してください。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(8000)
        .query(planPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]) as ExecutionPlan;
        
        console.log('✅ [Claude実行計画完了] 自律実行計画策定:', {
          planId: plan.id,
          actionsCount: plan.actions.length,
          adaptationPoints: plan.adaptationPoints.length
        });
        
        return plan;
      }
      
      return this.createFallbackPlan(strategy);
    } catch (error) {
      console.error('❌ [Claude実行計画エラー]:', error);
      return this.createFallbackPlan(strategy);
    }
  }

  /**
   * Claude適応的実行
   * 実行中の継続的判断と適応
   */
  async executeAdaptively(plan: ExecutionPlan): Promise<ExecutionResults> {
    console.log('⚡ [Claude適応実行] 適応的実行を開始...');
    
    const results: ExecutionResults = {
      planId: plan.id,
      executedActions: 0,
      successfulActions: 0,
      adaptationsMade: [],
      learningPoints: [],
      nextOptimizations: []
    };

    for (const action of plan.actions) {
      try {
        console.log(`🎯 [Claude実行] ${action.type}アクションを適応的実行中...`);
        
        // 実行前適応判断
        const shouldAdapt = await this.shouldAdaptBeforeExecution(action, results);
        if (shouldAdapt.adapt) {
          console.log(`🔄 [Claude適応] 実行前適応: ${shouldAdapt.reason}`);
          results.adaptationsMade.push(shouldAdapt.reason);
          // 適応ロジックの実装（実際の投稿システムと連携）
        }
        
        // アクション実行（実際の投稿システムと連携）
        const actionSuccess = await this.executeAction(action);
        
        results.executedActions++;
        if (actionSuccess) {
          results.successfulActions++;
        }
        
        // 実行後学習
        const learningPoint = await this.learnFromExecution(action, actionSuccess);
        if (learningPoint) {
          results.learningPoints.push(learningPoint);
        }
        
      } catch (error) {
        console.error(`❌ [Claude実行エラー] ${action.type}:`, error);
        results.learningPoints.push(`実行エラーから学習: ${error}`);
      }
    }

    console.log('✅ [Claude適応実行完了]:', {
      executed: results.executedActions,
      successful: results.successfulActions,
      adaptations: results.adaptationsMade.length,
      learnings: results.learningPoints.length
    });

    return results;
  }

  /**
   * Claude自律学習・最適化
   * 実行結果からの継続的学習と戦略最適化
   */
  async learnAndOptimize(results: ExecutionResults): Promise<OptimizationPlan> {
    console.log('🧠 [Claude学習最適化] 実行結果から学習・最適化中...');
    
    const optimizationPrompt = `
実行結果を分析し、継続的改善のための最適化計画を策定してください：

EXECUTION RESULTS:
${JSON.stringify(results, null, 2)}

LEARNING & OPTIMIZATION REQUIREMENTS:
1. **成功パターン分析**: 成功したアクションの共通要因
2. **失敗パターン回避**: 失敗要因の特定と対策
3. **新機会発見**: 実行中に発見された新しい機会
4. **戦略進化**: より効果的な戦略への進化提案

返答形式（JSON）:
{
  "areas": ["改善対象領域の配列"],
  "priorityChanges": {
    "領域": "新しい優先度設定"
  },
  "strategyAdjustments": ["戦略調整の配列"],
  "newOpportunities": ["発見した新機会の配列"],
  "learningInsights": "学習から得た洞察",
  "nextCycleRecommendations": "次回実行への推奨事項"
}

完全自律的な学習・最適化を実行してください。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(8000)
        .query(optimizationPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const optimization = JSON.parse(jsonMatch[0]) as OptimizationPlan;
        
        console.log('✅ [Claude学習最適化完了]:', {
          improvementAreas: optimization.areas.length,
          strategyAdjustments: optimization.strategyAdjustments.length,
          newOpportunities: optimization.newOpportunities.length
        });
        
        return optimization;
      }
      
      return this.createFallbackOptimization();
    } catch (error) {
      console.error('❌ [Claude学習最適化エラー]:', error);
      return this.createFallbackOptimization();
    }
  }

  /**
   * Claude最適頻度決定
   * 固定制約なし、市場状況に応じた動的頻度決定
   */
  async determineOptimalPostingFrequency(analysisData: {
    accountHealth: number;
    engagement: any;
    marketConditions: MarketCondition;
    competitorActivity: any;
  }): Promise<number> {
    console.log('📊 [Claude頻度決定] 動的投稿頻度を決定中...');
    
    const frequencyPrompt = `
以下の分析データに基づいて、最適な1日の投稿頻度を自律的に決定してください：

ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

FREQUENCY OPTIMIZATION FACTORS:
1. **アカウント健康度**: 現在の状態に応じた最適頻度
2. **エンゲージメント動向**: フォロワーの反応パターン
3. **市場状況**: ボラティリティと情報需要
4. **競合活動**: 市場での情報供給状況

固定制約なし。1〜50回/日の範囲で最適な頻度を決定してください。

返答形式（数値のみ）: 最適と判断した1日の投稿回数
理由: 決定理由の説明
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(6000)
        .query(frequencyPrompt)
        .asText();

      const frequencyMatch = response.match(/\d+/);
      if (frequencyMatch) {
        const frequency = parseInt(frequencyMatch[0]);
        
        console.log(`✅ [Claude頻度決定完了] 最適頻度: ${frequency}回/日`);
        return Math.max(1, Math.min(50, frequency)); // 1-50の範囲で制限
      }
      
      return this.calculateFallbackFrequency(analysisData);
    } catch (error) {
      console.error('❌ [Claude頻度決定エラー]:', error);
      return this.calculateFallbackFrequency(analysisData);
    }
  }

  /**
   * Claude完全自律コンテンツ決定
   * ハードコードされたテンプレートなし、市場分析に基づく動的コンテンツ生成
   */
  async analyzeAndDecideContentStrategy(analysisData: {
    marketAnalysis: any;
    trendAnalysis: any;
    audienceInsights: any;
    performanceHistory: any;
  }): Promise<{ theme: string; content: string; actionType: string }> {
    console.log('📝 [Claude内容決定] 完全自律コンテンツ戦略を決定中...');
    
    const contentPrompt = `
以下の分析データに基づいて、最適なコンテンツ戦略を自律的に決定してください：

ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

AUTONOMOUS CONTENT STRATEGY REQUIREMENTS:
1. **完全自律テーマ選択**: 固定テーマなし、市場機会に基づく動的選択
2. **オリジナルコンテンツ生成**: テンプレートなし、分析に基づく独自コンテンツ
3. **最適アクションタイプ**: 市場状況に応じた最適なアクション選択
4. **価値創造重視**: フォロワーに真の価値を提供するコンテンツ

返答形式（JSON）:
{
  "theme": "選択したテーマ",
  "content": "具体的なコンテンツ（完全オリジナル）",
  "actionType": "original_post|quote_tweet|retweet|reply",
  "reasoning": "選択理由の詳細説明",
  "expectedImpact": "期待される効果"
}

ハードコードされたテンプレートは使用せず、完全にオリジナルなコンテンツを生成してください。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(8000)
        .query(contentPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[0]);
        
        console.log('✅ [Claude内容決定完了]:', {
          theme: strategy.theme,
          actionType: strategy.actionType,
          contentLength: strategy.content.length
        });
        
        return strategy;
      }
      
      return this.createFallbackContent();
    } catch (error) {
      console.error('❌ [Claude内容決定エラー]:', error);
      return this.createFallbackContent();
    }
  }

  // プライベートヘルパーメソッド
  private async shouldAdaptBeforeExecution(action: PlannedAutonomousAction, currentResults: ExecutionResults): Promise<{ adapt: boolean; reason: string }> {
    // 実行前適応判断ロジック
    const successRate = currentResults.executedActions > 0 ? currentResults.successfulActions / currentResults.executedActions : 1;
    
    if (successRate < 0.5 && currentResults.executedActions > 2) {
      return { adapt: true, reason: '成功率低下による戦略適応' };
    }
    
    return { adapt: false, reason: '適応不要' };
  }

  private async executeAction(action: PlannedAutonomousAction): Promise<boolean> {
    console.log(`🎯 [実行] ${action.type}: ${action.content.substring(0, 100)}...`);
    
    try {
      let result;
      
      switch (action.type) {
        case 'original_post':
          result = await this.xClient.post(action.content);
          break;
          
        // 以下の機能は現在未実装のためコメントアウト
        /*
        case 'reply':
          // リプライ対象を解析（実際の実装では対象ツイートIDが必要）
          console.log('🔄 [Reply] リプライ機能は対象ツイートID特定の実装が必要');
          result = { success: false, error: 'Reply target not specified' };
          break;
          
        case 'quote_tweet':
          // 引用ツイート対象を解析（実際の実装では対象ツイートIDが必要）
          console.log('🔄 [Quote] 引用ツイート機能は対象ツイートID特定の実装が必要');
          result = { success: false, error: 'Quote target not specified' };
          break;
          
        case 'retweet':
          // リツイート対象を解析（実際の実装では対象ツイートIDが必要）
          console.log('🔄 [Retweet] リツイート機能は対象ツイートID特定の実装が必要');
          result = { success: false, error: 'Retweet target not specified' };
          break;
        */
          
        default:
          console.log(`⚠️ [Unknown Action] 未知のアクションタイプ: ${action.type}`);
          result = { success: false, error: `Unknown action type: ${action.type}` };
      }
      
      if (result.success) {
        console.log(`✅ [投稿成功] ${action.type}: ${result.id || 'success'}`);
        return true;
      } else {
        console.log(`❌ [投稿失敗] ${action.type}: ${result.error}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ [投稿エラー] ${action.type}:`, error);
      return false;
    }
  }

  private async learnFromExecution(action: PlannedAutonomousAction, success: boolean): Promise<string | null> {
    // 実行結果からの学習
    if (success) {
      return `成功パターン学習: ${action.type}の${action.timing}実行が効果的`;
    } else {
      return `改善ポイント: ${action.type}の実行方法を見直し`;
    }
  }

  // フォールバックメソッド
  private createFallbackStrategy(context: IntegratedContext): AutonomousStrategy {
    return {
      actionTypes: ['original_post'],
      frequency: Math.max(5, Math.min(20, context.account.healthScore / 5)),
      contentThemes: ['market_analysis', 'investment_education'],
      timing: ['09:00', '14:00', '19:00'],
      riskLevel: context.account.healthScore > 70 ? 'medium' : 'low',
      adaptationLevel: 'balanced'
    };
  }

  private createFallbackPlan(strategy: AutonomousStrategy): ExecutionPlan {
    return {
      id: `fallback-plan-${Date.now()}`,
      strategy,
      actions: [{
        id: `action-${Date.now()}`,
        type: 'original_post',
        priority: 'medium',
        timing: 'immediate',
        content: '投資教育コンテンツ',
        reasoning: 'フォールバック実行',
        dependencies: [],
        adaptationTriggers: []
      }],
      adaptationPoints: [],
      fallbackOptions: []
    };
  }

  private createFallbackOptimization(): OptimizationPlan {
    return {
      areas: ['content_quality', 'timing_optimization'],
      priorityChanges: { 'original_post': 'high' },
      strategyAdjustments: ['品質重視アプローチ'],
      newOpportunities: ['教育コンテンツ強化']
    };
  }

  private calculateFallbackFrequency(analysisData: any): number {
    // 基本的な頻度計算ロジック
    const baseFrequency = 8;
    const healthMultiplier = (analysisData.accountHealth || 50) / 100;
    return Math.round(baseFrequency * healthMultiplier);
  }

  private createFallbackContent(): { theme: string; content: string; actionType: string } {
    return {
      theme: 'investment_education',
      content: '投資の基本：リスク管理と長期視点の重要性について',
      actionType: 'original_post'
    };
  }

  /**
   * Claude自律的アクションミックス決定
   * 各アクションタイプの最適配分を自律的に決定
   */
  async determineOptimalActionMix(params: {
    remaining: number;
    accountHealth: number;
    marketConditions: any;
    availableActionTypes: string[];
  }): Promise<Record<string, number>> {
    console.log('🧠 [Claude最適配分] 全アクションタイプでの最適配分を決定中...');
    
    const mixPrompt = `
あなたはX（Twitter）投資教育コンテンツの完全自律システムです。
以下のパラメータに基づいて、最適なアクション配分を自律的に決定してください。

PARAMETERS:
- 残り実行回数: ${params.remaining}回
- アカウント健康度: ${params.accountHealth}/100
- 市場状況: ${JSON.stringify(params.marketConditions)}
- 利用可能アクションタイプ: ${params.availableActionTypes.join(', ')}

AUTONOMOUS ACTION MIX REQUIREMENTS:
1. **制約なし**: 固定ルール一切なし、完全にClaude判断で配分
2. **価値最大化**: フォロワーへの価値提供を最優先
3. **戦略的バランス**: アカウント状況と市場状況に最適化
4. **リスク管理**: アカウント健康度に応じたリスク調整

返答形式（JSON）:
{
  "original_post": "配分回数",
  "quote_tweet": "配分回数", 
  "retweet": "配分回数",
  "reply": "配分回数",
  "reasoning": "配分決定の詳細理由",
  "strategy": "採用した戦略の説明"
}

全${params.remaining}回を最適に配分してください（合計が${params.remaining}回になるように）。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(6000)
        .query(mixPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const mix = JSON.parse(jsonMatch[0]);
        
        // 合計が remaining と一致するように調整
        const total = (mix.original_post || 0) + (mix.quote_tweet || 0) + (mix.retweet || 0) + (mix.reply || 0);
        if (total !== params.remaining && total > 0) {
          const ratio = params.remaining / total;
          mix.original_post = Math.round((mix.original_post || 0) * ratio);
          mix.quote_tweet = Math.round((mix.quote_tweet || 0) * ratio);
          mix.retweet = Math.round((mix.retweet || 0) * ratio);
          mix.reply = Math.round((mix.reply || 0) * ratio);
        }
        
        console.log('✅ [Claude最適配分完了]:', {
          total: params.remaining,
          distribution: {
            original_post: mix.original_post || 0,
            quote_tweet: mix.quote_tweet || 0,
            retweet: mix.retweet || 0,
            reply: mix.reply || 0
          },
          strategy: mix.strategy
        });
        
        return {
          original_post: mix.original_post || 0,
          quote_tweet: mix.quote_tweet || 0,
          retweet: mix.retweet || 0,
          reply: mix.reply || 0
        };
      }
      
      return this.createFallbackActionMix(params.remaining);
    } catch (error) {
      console.error('❌ [Claude最適配分エラー]:', error);
      return this.createFallbackActionMix(params.remaining);
    }
  }

  /**
   * Claude自律的タイミング決定
   * 最適な投稿タイミングを自律的に決定
   */
  async determineOptimalTiming(params: {
    remaining: number;
    marketConditions: any;
    accountHealth: number;
    availableHours: string[];
  }): Promise<any[]> {
    console.log('🧠 [Claude最適タイミング] 自律的タイミング決定を実行中...');
    
    const timingPrompt = `
以下のパラメータに基づいて、最適な投稿タイミングを自律的に決定してください：

PARAMETERS:
- 投稿回数: ${params.remaining}回
- アカウント健康度: ${params.accountHealth}/100
- 市場状況: ${JSON.stringify(params.marketConditions)}
- 利用可能時間: ${params.availableHours.slice(0, 10).join(', ')}... (${params.availableHours.length}時間帯)

OPTIMAL TIMING REQUIREMENTS:
1. **制約なし**: 固定スケジュールなし、市場状況に完全適応
2. **エンゲージメント最大化**: フォロワーの活動時間に最適化
3. **市場機会活用**: ボラティリティと情報需要に対応
4. **競合差別化**: 他アカウントとの差別化タイミング

返答形式（JSON配列）:
[
  {
    "time": "HH:MM",
    "actionType": "original_post|quote_tweet|retweet|reply",
    "priority": 1-10,
    "reasoning": "このタイミングを選んだ理由"
  }
]

${params.remaining}件のタイミング推奨を生成してください。
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(6000)
        .query(timingPrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const timings = JSON.parse(jsonMatch[0]);
        
        console.log('✅ [Claude最適タイミング完了]:', {
          count: timings.length,
          timeRange: timings.length > 0 ? `${timings[0].time} - ${timings[timings.length-1]?.time}` : 'none'
        });
        
        return timings;
      }
      
      return this.createFallbackTiming(params.remaining);
    } catch (error) {
      console.error('❌ [Claude最適タイミングエラー]:', error);
      return this.createFallbackTiming(params.remaining);
    }
  }

  // フォールバックメソッド
  private createFallbackActionMix(remaining: number): Record<string, number> {
    // original_postのみに特化（現在はoriginal_postのみサポート）
    return { 
      original_post: remaining, 
      quote_tweet: 0, 
      retweet: 0, 
      reply: 0 
    };
  }

  private createFallbackTiming(remaining: number): any[] {
    const baseTimes = ['09:00', '14:00', '19:00'];
    const timings = [];
    
    for (let i = 0; i < remaining; i++) {
      const time = baseTimes[i % baseTimes.length];
      timings.push({
        time,
        actionType: 'original_post',
        priority: 5,
        reasoning: 'フォールバックタイミング'
      });
    }
    
    return timings;
  }
}