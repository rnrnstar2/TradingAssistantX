import type { 
  AccountStatus, 
  CollectionResult, 
  IntegratedContext, 
  ActionSuggestion,
  ContentOpportunity 
} from '../types/autonomous-system.js';
import { InformationEvaluator } from './information-evaluator.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export class ContextIntegrator {
  private informationEvaluator: InformationEvaluator;

  constructor() {
    this.informationEvaluator = new InformationEvaluator();
  }

  async integrateAnalysisResults(
    accountStatus: AccountStatus,
    collectionResults: CollectionResult[]
  ): Promise<IntegratedContext> {
    console.log('🔄 [コンテキスト統合開始] アカウント分析と情報収集結果を統合中...');
    console.log(`📊 入力データ: アカウント分析結果、収集情報${collectionResults.length}件`);

    try {
      // 1. 情報収集結果の評価
      console.log('🔍 [情報評価] 収集情報を評価中...');
      const evaluatedInfo = await this.informationEvaluator.evaluateCollectedInformation(collectionResults);
      
      // 2. コンテンツ機会の特定
      console.log('🎯 [機会特定] 投稿機会を特定中...');
      const contentOpportunities = await this.informationEvaluator.identifyContentOpportunities(evaluatedInfo);
      
      // 3. 市場センチメント分析
      console.log('📈 [センチメント分析] 市場感情を分析中...');
      const marketSentiment = await this.informationEvaluator.analyzeMarketSentiment(collectionResults);
      
      // 4. トレンド情報の抽出
      const trends = this.extractTrends(collectionResults);
      
      // 5. 競合活動の分析
      const competitorActivity = this.analyzeCompetitors(collectionResults);
      
      // 6. アクション提案の生成
      console.log('💡 [提案生成] 統合アクション提案を生成中...');
      const actionSuggestions = await this.generateActionSuggestions(accountStatus, contentOpportunities, marketSentiment);

      const integratedContext: IntegratedContext = {
        account: {
          currentState: accountStatus,
          recommendations: accountStatus.recommendations,
          healthScore: accountStatus.healthScore
        },
        market: {
          trends: trends,
          opportunities: contentOpportunities,
          competitorActivity: competitorActivity
        },
        actionSuggestions: actionSuggestions,
        timestamp: Date.now()
      };

      console.log('✅ [コンテキスト統合完了] 統合コンテキストを生成しました');
      this.logIntegrationSummary(integratedContext);

      return integratedContext;
    } catch (error) {
      console.error('❌ [コンテキスト統合エラー]:', error);
      return this.createFallbackContext(accountStatus, collectionResults);
    }
  }

  private extractTrends(collectionResults: CollectionResult[]): CollectionResult[] {
    console.log('📊 [トレンド抽出] トレンド情報を抽出中...');
    
    // トレンドタイプの情報を抽出し、関連性スコアでソート
    const trendResults = collectionResults
      .filter(result => 
        result.type === 'trend' || 
        result.content.includes('トレンド') ||
        result.content.includes('話題') ||
        result.metadata?.hashtags?.some(tag => tag.includes('トレンド'))
      )
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10); // 上位10件のトレンド

    console.log(`📊 [トレンド抽出完了] ${trendResults.length}件のトレンド情報を抽出`);
    return trendResults;
  }

  private analyzeCompetitors(collectionResults: CollectionResult[]): CollectionResult[] {
    console.log('👥 [競合分析] 競合アカウント活動を分析中...');
    
    // 競合タイプの情報を抽出し、エンゲージメントでソート
    const competitorResults = collectionResults
      .filter(result => 
        result.type === 'competitor' ||
        result.metadata?.author ||
        result.metadata?.engagement
      )
      .sort((a, b) => (b.metadata?.engagement || 0) - (a.metadata?.engagement || 0))
      .slice(0, 15); // 上位15件の競合情報

    console.log(`👥 [競合分析完了] ${competitorResults.length}件の競合情報を分析`);
    return competitorResults;
  }

  private async generateActionSuggestions(
    accountStatus: AccountStatus,
    opportunities: ContentOpportunity[],
    marketSentiment: any
  ): Promise<ActionSuggestion[]> {
    console.log('💡 [アクション提案生成] 統合的なアクション提案を生成中...');

    try {
      const suggestionPrompt = `
Based on the following integrated context, generate actionable suggestions for X (Twitter) content strategy:

ACCOUNT STATUS:
${JSON.stringify(accountStatus, null, 2)}

CONTENT OPPORTUNITIES:
${JSON.stringify(opportunities, null, 2)}

MARKET SENTIMENT:
${JSON.stringify(marketSentiment, null, 2)}

Generate 10-15 specific action suggestions that consider:
1. Account health and growth needs
2. Market timing and sentiment
3. Available content opportunities
4. Optimal posting strategy for 15 daily posts

For each suggestion, provide:
- Type: original_post, quote_tweet, retweet, or reply
- Content: Specific content to create (for original posts)
- Reasoning: Why this action is recommended
- Priority: high, medium, or low
- Expected impact: Numerical score (0-1)
- Metadata: Additional context or targeting info

Return as JSON array:
[{
  "type": "original_post|quote_tweet|retweet|reply",
  "content": "Specific content (for original posts)",
  "reasoning": "Strategic reasoning for this action",
  "priority": "high|medium|low",
  "expectedImpact": 0.0-1.0,
  "metadata": {
    "targetAudience": "description",
    "bestPostingTime": "HH:MM",
    "relatedTopics": ["topic1", "topic2"]
  }
}]

Focus on value creation, education, and authentic engagement.
`;

      const response = await claude()
        .withModel('sonnet')
        .query(suggestionPrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        console.log(`💡 [アクション提案完了] ${suggestions.length}件の提案を生成`);
        return suggestions;
      }

      return this.createFallbackSuggestions(accountStatus, opportunities);
    } catch (error) {
      console.error('❌ [アクション提案エラー]:', error);
      return this.createFallbackSuggestions(accountStatus, opportunities);
    }
  }

  private createFallbackSuggestions(
    accountStatus: AccountStatus, 
    opportunities: ContentOpportunity[]
  ): ActionSuggestion[] {
    console.log('🔄 [フォールバック提案] 基本的なアクション提案を生成中...');

    const suggestions: ActionSuggestion[] = [];

    // アカウントヘルスに基づく提案
    if (accountStatus.healthScore < 70) {
      suggestions.push({
        type: 'original_post',
        content: '投資の基本について、フォロワーの皆さんと共有したいと思います。資産運用の第一歩は...',
        reasoning: 'アカウントヘルス改善のため、教育的コンテンツを提供',
        priority: 'high',
        expectedImpact: 0.7,
        metadata: {
          targetAudience: '投資初心者',
          bestPostingTime: '09:00',
          relatedTopics: ['投資教育', '資産運用']
        }
      });
    }

    // エンゲージメント向上提案
    if (accountStatus.engagement.engagement_rate < '2.0%') {
      suggestions.push({
        type: 'original_post',
        content: '今日の市場について、皆さんはどう思われますか？ぜひコメントで教えてください。',
        reasoning: 'エンゲージメント率向上のため、インタラクティブな投稿',
        priority: 'medium',
        expectedImpact: 0.6,
        metadata: {
          targetAudience: 'アクティブフォロワー',
          bestPostingTime: '12:00',
          relatedTopics: ['市場動向', 'コミュニティ']
        }
      });
    }

    // 機会ベースの提案
    opportunities.slice(0, 5).forEach((opportunity, index) => {
      suggestions.push({
        type: opportunity.type,
        content: opportunity.content,
        reasoning: `特定された機会: ${opportunity.reasoning}`,
        priority: opportunity.priority,
        expectedImpact: opportunity.estimatedEngagement,
        metadata: {
          targetAudience: '投資関心層',
          bestPostingTime: '15:00',
          relatedTopics: ['投資情報']
        }
      });
    });

    return suggestions.slice(0, 12); // 最大12件の提案
  }

  private createFallbackContext(
    accountStatus: AccountStatus, 
    collectionResults: CollectionResult[]
  ): IntegratedContext {
    console.log('🔄 [フォールバックコンテキスト] 基本的な統合コンテキストを生成中...');

    return {
      account: {
        currentState: accountStatus,
        recommendations: accountStatus.recommendations || ['アカウント分析を継続'],
        healthScore: accountStatus.healthScore || 50
      },
      market: {
        trends: collectionResults.slice(0, 5),
        opportunities: [],
        competitorActivity: []
      },
      actionSuggestions: [{
        type: 'original_post',
        content: '投資に関する有益な情報をお届けします。',
        reasoning: 'フォールバック投稿として基本的なコンテンツを提供',
        priority: 'medium',
        expectedImpact: 0.5,
        metadata: {}
      }],
      timestamp: Date.now()
    };
  }

  private logIntegrationSummary(context: IntegratedContext): void {
    console.log('📋 [統合サマリー]');
    console.log(`   アカウントヘルス: ${context.account.healthScore}`);
    console.log(`   トレンド数: ${context.market.trends.length}`);
    console.log(`   投稿機会: ${context.market.opportunities.length}`);
    console.log(`   競合活動: ${context.market.competitorActivity.length}`);
    console.log(`   アクション提案: ${context.actionSuggestions.length}`);
    
    const priorityDistribution = context.actionSuggestions.reduce((acc, suggestion) => {
      acc[suggestion.priority] = (acc[suggestion.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   提案優先度分布:`, priorityDistribution);
  }

  // 統合品質評価メソッド
  async evaluateIntegrationQuality(context: IntegratedContext): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
  }> {
    let score = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];

    // アカウント分析の品質
    if (context.account.healthScore > 70) {
      score += 25;
      strengths.push('アカウントヘルス良好');
    } else {
      improvements.push('アカウントヘルス改善が必要');
    }

    // 市場情報の豊富さ
    if (context.market.trends.length >= 5) {
      score += 25;
      strengths.push('充分なトレンド情報');
    } else {
      improvements.push('トレンド情報の収集強化');
    }

    // 投稿機会の多様性
    if (context.market.opportunities.length >= 5) {
      score += 25;
      strengths.push('多様な投稿機会');
    } else {
      improvements.push('投稿機会の拡充');
    }

    // アクション提案の質
    if (context.actionSuggestions.length >= 10) {
      score += 25;
      strengths.push('豊富なアクション提案');
    } else {
      improvements.push('アクション提案の増強');
    }

    return { score, strengths, improvements };
  }
}