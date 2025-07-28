import type { 
  CollectionResult, 
  EvaluatedInfo, 
  ContentOpportunity 
} from '../types/autonomous-system.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export class InformationEvaluator {
  
  async evaluateCollectedInformation(results: CollectionResult[]): Promise<EvaluatedInfo[]> {
    console.log(`🔍 [情報評価開始] ${results.length}件の収集情報を評価中...`);
    
    if (results.length === 0) {
      console.log('⚠️ [情報評価] 評価対象のデータがありません');
      return [];
    }

    try {
      const claudePrompt = `
Evaluate the following collected information for trading/investment content creation:

${JSON.stringify(results, null, 2)}

For each item, provide:
1. Relevance score (0-1): How relevant this is to investment/trading content
2. Content value (0-1): Educational/informational value for our audience  
3. Actionable insights: Specific insights that can be used for content
4. Recommended usage: How this should be used (original_post, quote_tweet, retweet, ignore)
5. Confidence (0-1): How confident you are in this evaluation

Return as JSON array with this exact structure:
[{
  "id": "eval-{timestamp}-{index}",
  "originalResult": {original CollectionResult object},
  "relevanceScore": 0.0-1.0,
  "contentValue": 0.0-1.0,
  "actionableInsights": ["insight1", "insight2"],
  "recommendedUsage": "original_post|quote_tweet|retweet|ignore",
  "confidence": 0.0-1.0
}]

Focus on investment education, market insights, and actionable information.
Prioritize content that provides value to investors and traders.
`;

      const response = await claude()
        .withModel('sonnet')
        .query(claudePrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const evaluations = JSON.parse(jsonMatch[0]);
        console.log(`✅ [情報評価完了] ${evaluations.length}件の評価を完了`);
        
        // 評価結果の統計を表示
        this.logEvaluationStatistics(evaluations);
        
        return evaluations;
      }

      console.log('⚠️ [情報評価] JSONの解析に失敗しました');
      return [];
    } catch (error) {
      console.error('❌ [情報評価エラー]:', error);
      return this.createFallbackEvaluations(results);
    }
  }

  async identifyContentOpportunities(evaluatedInfo: EvaluatedInfo[]): Promise<ContentOpportunity[]> {
    console.log(`🎯 [機会特定開始] ${evaluatedInfo.length}件の評価情報から投稿機会を特定...`);
    
    if (evaluatedInfo.length === 0) {
      return [];
    }

    try {
      // 高品質な情報のみをフィルタリング
      const highQualityInfo = evaluatedInfo.filter(info => 
        info.relevanceScore >= 0.6 && 
        info.contentValue >= 0.5 && 
        info.confidence >= 0.7
      );

      if (highQualityInfo.length === 0) {
        console.log('⚠️ [機会特定] 高品質な情報が見つかりませんでした');
        return [];
      }

      const opportunitiesPrompt = `
Based on the following high-quality evaluated information, identify specific content opportunities:

${JSON.stringify(highQualityInfo, null, 2)}

For each opportunity, determine:
1. Type of action: original_post, quote_tweet, retweet, or reply
2. Content to create (for original posts)
3. Target tweet ID (for interactions)
4. Priority level: high, medium, low
5. Reasoning for this opportunity
6. Expected engagement score (0-1)

Return as JSON array with this structure:
[{
  "type": "original_post|quote_tweet|retweet|reply",
  "content": "Content to post (for original_post)",
  "targetTweetId": "ID for interactions (if applicable)",
  "priority": "high|medium|low",
  "reasoning": "Why this is a good opportunity",
  "estimatedEngagement": 0.0-1.0
}]

Focus on:
- Educational content that teaches investment concepts
- Timely market insights and analysis
- Engaging discussions about investment strategies
- Content that provides genuine value to followers

Limit to top 10 opportunities.
`;

      const response = await claude()
        .withModel('sonnet')
        .query(opportunitiesPrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const opportunities = JSON.parse(jsonMatch[0]);
        console.log(`🎯 [機会特定完了] ${opportunities.length}件の投稿機会を特定`);
        
        // 機会の統計を表示
        this.logOpportunityStatistics(opportunities);
        
        return opportunities;
      }

      return [];
    } catch (error) {
      console.error('❌ [機会特定エラー]:', error);
      return this.createFallbackOpportunities(evaluatedInfo);
    }
  }

  async prioritizeOpportunities(opportunities: ContentOpportunity[]): Promise<ContentOpportunity[]> {
    console.log(`📊 [優先度調整] ${opportunities.length}件の機会を優先度順に整理...`);
    
    // 優先度とエンゲージメント予測でソート
    const prioritized = opportunities.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const scoreA = priorityWeight[a.priority] + (a.estimatedEngagement * 2);
      const scoreB = priorityWeight[b.priority] + (b.estimatedEngagement * 2);
      return scoreB - scoreA;
    });

    // 上位15件に制限（1日15投稿の上限に合わせる）
    const limitedOpportunities = prioritized.slice(0, 15);

    console.log(`📊 [優先度調整完了] 上位${limitedOpportunities.length}件の機会を選出`);
    
    return limitedOpportunities;
  }

  async analyzeMarketSentiment(results: CollectionResult[]): Promise<{
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    keyTopics: string[];
    sentimentScore: number; // -1 to 1
  }> {
    console.log('📈 [市場センチメント分析] 収集情報から市場感情を分析中...');
    
    try {
      const sentimentPrompt = `
Analyze the market sentiment from the following financial/investment content:

${JSON.stringify(results, null, 2)}

Determine:
1. Overall market sentiment: bullish (positive), bearish (negative), or neutral
2. Confidence level in this assessment (0-1)
3. Key topics driving sentiment
4. Numerical sentiment score (-1 for very bearish, 0 for neutral, 1 for very bullish)

Consider:
- Language used (optimistic vs pessimistic)
- Market direction indicators
- Investor behavior mentions
- Economic news tone
- Volume and engagement of positive vs negative content

Return as JSON:
{
  "overallSentiment": "bullish|bearish|neutral",
  "confidence": 0.0-1.0,
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentimentScore": -1.0 to 1.0
}
`;

      const response = await claude()
        .withModel('sonnet')
        .query(sentimentPrompt)
        .asText();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const sentiment = JSON.parse(jsonMatch[0]);
        console.log(`📈 [センチメント分析完了] ${sentiment.overallSentiment} (信頼度: ${sentiment.confidence})`);
        return sentiment;
      }

      // フォールバック
      return {
        overallSentiment: 'neutral',
        confidence: 0.5,
        keyTopics: ['市場動向', '投資戦略'],
        sentimentScore: 0
      };
    } catch (error) {
      console.error('❌ [センチメント分析エラー]:', error);
      return {
        overallSentiment: 'neutral',
        confidence: 0.3,
        keyTopics: ['分析不可'],
        sentimentScore: 0
      };
    }
  }

  private logEvaluationStatistics(evaluations: EvaluatedInfo[]): void {
    const avgRelevance = evaluations.reduce((sum, e) => sum + e.relevanceScore, 0) / evaluations.length;
    const avgContentValue = evaluations.reduce((sum, e) => sum + e.contentValue, 0) / evaluations.length;
    const avgConfidence = evaluations.reduce((sum, e) => sum + e.confidence, 0) / evaluations.length;
    
    const usageDistribution = evaluations.reduce((acc, e) => {
      acc[e.recommendedUsage] = (acc[e.recommendedUsage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 [評価統計]');
    console.log(`   平均関連性: ${avgRelevance.toFixed(2)}`);
    console.log(`   平均コンテンツ価値: ${avgContentValue.toFixed(2)}`);
    console.log(`   平均信頼度: ${avgConfidence.toFixed(2)}`);
    console.log(`   推奨用途分布:`, usageDistribution);
  }

  private logOpportunityStatistics(opportunities: ContentOpportunity[]): void {
    const typeDistribution = opportunities.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = opportunities.reduce((acc, op) => {
      acc[op.priority] = (acc[op.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgEngagement = opportunities.reduce((sum, op) => sum + op.estimatedEngagement, 0) / opportunities.length;

    console.log('🎯 [機会統計]');
    console.log(`   アクション分布:`, typeDistribution);
    console.log(`   優先度分布:`, priorityDistribution);
    console.log(`   平均エンゲージメント予測: ${avgEngagement.toFixed(2)}`);
  }

  private createFallbackEvaluations(results: CollectionResult[]): EvaluatedInfo[] {
    console.log('🔄 [フォールバック評価] 基本的な評価を実行中...');
    
    return results.slice(0, 10).map((result, index) => ({
      id: `eval-fallback-${Date.now()}-${index}`,
      originalResult: result,
      relevanceScore: Math.max(0.4, result.relevanceScore || 0.5),
      contentValue: 0.6,
      actionableInsights: ['投資情報として参考価値あり'],
      recommendedUsage: 'retweet' as const,
      confidence: 0.5
    }));
  }

  private createFallbackOpportunities(evaluatedInfo: EvaluatedInfo[]): ContentOpportunity[] {
    console.log('🔄 [フォールバック機会] 基本的な投稿機会を生成中...');
    
    const highValueInfo = evaluatedInfo
      .filter(info => info.contentValue >= 0.5)
      .slice(0, 5);

    return highValueInfo.map((info, index) => ({
      type: 'original_post' as const,
      content: `投資に関する重要な情報をシェアします: ${info.originalResult.content.substring(0, 100)}...`,
      priority: 'medium' as const,
      reasoning: '評価された情報に基づく教育的コンテンツ',
      estimatedEngagement: 0.5
    }));
  }
}