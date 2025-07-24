/**
 * Claude Code SDK 基本的市場コンテキスト分析モジュール
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 簡潔な市場情報収集・分析機能
 */

import { SearchEngine } from '../kaito-api/search-engine';
import { KaitoTwitterAPIClient } from '../kaito-api/core/client';

export interface BasicMarketContext {
  sentiment: 'bearish' | 'neutral' | 'bullish';
  volatility: 'low' | 'medium' | 'high';
  trendingTopics: string[];
  timestamp: string;
}

export interface MarketOpportunity {
  topic: string;
  relevance: number;
  suggested_action: 'post' | 'engage' | 'monitor';
  reasoning: string;
}

/**
 * 基本的市場コンテキスト分析クラス
 * 過剰でない範囲での市場情報収集・分析
 */
export class MarketAnalyzer {
  constructor(
    private searchEngine?: SearchEngine,
    private kaitoClient?: KaitoTwitterAPIClient
  ) {
    console.log('✅ MarketAnalyzer initialized - MVP基本分析版');
  }

  /**
   * 基本市場コンテキスト分析
   * 必要最小限の市場情報を収集・分析
   */
  async analyzeBasicMarketContext(): Promise<BasicMarketContext> {
    try {
      console.log('📊 基本市場コンテキスト分析開始');

      // 基本情報収集
      const [trendData, sentimentInfo] = await Promise.allSettled([
        this.searchEngine?.searchTrends() || [],
        this.estimateBasicSentiment()
      ]);

      const trends = trendData.status === 'fulfilled' ? trendData.value : [];
      const sentiment = sentimentInfo.status === 'fulfilled' ? sentimentInfo.value : 'neutral';

      const context: BasicMarketContext = {
        sentiment,
        volatility: this.estimateVolatility(trends),
        trendingTopics: this.extractRelevantTopics(trends),
        timestamp: new Date().toISOString()
      };

      console.log('✅ 基本市場コンテキスト分析完了:', {
        sentiment: context.sentiment,
        topics: context.trendingTopics.length
      });

      return context;

    } catch (error) {
      console.error('❌ 市場コンテキスト分析エラー:', error);
      throw error; // 品質確保のため、失敗時は素直にエラーを投げる
    }
  }

  /**
   * 市場機会分析
   * 基本的な投稿機会の識別
   */
  analyzeMarketOpportunities(context: BasicMarketContext): MarketOpportunity[] {
    try {
      const opportunities: MarketOpportunity[] = [];

      // トレンドトピック分析
      context.trendingTopics.forEach(topic => {
        const relevance = this.calculateTopicRelevance(topic);
        if (relevance > 0.6) {
          opportunities.push({
            topic,
            relevance,
            suggested_action: this.suggestActionForTopic(topic, context),
            reasoning: `投資教育との関連度: ${Math.round(relevance * 100)}%`
          });
        }
      });

      // センチメントベース機会
      if (context.sentiment === 'bullish' && context.volatility === 'low') {
        opportunities.push({
          topic: '市場教育コンテンツ',
          relevance: 0.8,
          suggested_action: 'post',
          reasoning: 'ポジティブな市場環境で教育コンテンツに最適'
        });
      }

      return opportunities.slice(0, 3); // 最大3つの機会
    } catch (error) {
      console.error('市場機会分析エラー:', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * 基本センチメント推定
   */
  private async estimateBasicSentiment(): Promise<'bearish' | 'neutral' | 'bullish'> {
    try {
      if (!this.searchEngine) {
        return 'neutral';
      }

      // 簡単なセンチメント分析
      const sentimentData = await this.searchEngine.analyzeMarketSentiment();
      return sentimentData?.overall_sentiment || 'neutral';
    } catch (error) {
      console.warn('センチメント推定失敗、中立を返す');
      return 'neutral';
    }
  }

  /**
   * ボラティリティ推定
   */
  private estimateVolatility(trends: any[]): 'low' | 'medium' | 'high' {
    // トレンド数とキーワードからボラティリティを推定
    const trendCount = trends.length;
    const volatileKeywords = ['急騰', '暴落', '急落', '高騰'];
    const hasVolatileKeywords = trends.some(trend => 
      volatileKeywords.some(keyword => 
        (trend.topic || trend.name || '').includes(keyword)
      )
    );

    if (hasVolatileKeywords || trendCount > 10) return 'high';
    if (trendCount > 5) return 'medium';
    return 'low';
  }

  /**
   * 関連トピック抽出
   */
  private extractRelevantTopics(trends: any[]): string[] {
    const investmentKeywords = ['投資', '資産', '株', '債券', 'NISA', 'iDeCo', '金融', '経済'];
    
    return trends
      .filter(trend => {
        const topicText = trend.topic || trend.name || '';
        return investmentKeywords.some(keyword => topicText.includes(keyword));
      })
      .map(trend => trend.topic || trend.name)
      .slice(0, 5);
  }

  /**
   * トピック関連度計算
   */
  private calculateTopicRelevance(topic: string): number {
    let relevance = 0.3; // ベース関連度

    const highRelevanceKeywords = ['投資', '資産運用', 'NISA'];
    const mediumRelevanceKeywords = ['株式', '債券', '金融', '経済'];

    if (highRelevanceKeywords.some(keyword => topic.includes(keyword))) {
      relevance += 0.4;
    } else if (mediumRelevanceKeywords.some(keyword => topic.includes(keyword))) {
      relevance += 0.2;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * トピック別アクション提案
   */
  private suggestActionForTopic(topic: string, context: BasicMarketContext): 'post' | 'engage' | 'monitor' {
    const relevance = this.calculateTopicRelevance(topic);
    
    if (relevance > 0.8 && context.sentiment !== 'bearish') {
      return 'post';
    } else if (relevance > 0.6) {
      return 'engage';
    } else {
      return 'monitor';
    }
  }

}