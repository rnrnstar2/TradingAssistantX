/**
 * Claude Code SDK 市場コンテキスト分析専門モジュール
 * REQUIREMENTS.md準拠版 - 市場分析機能の疎結合実装
 * decision-engine.tsから分離された市場分析機能
 */

import { SearchEngine } from '../kaito-api/search-engine';
import { KaitoTwitterAPIClient } from '../kaito-api/client';

export interface MarketContext {
  sentiment: 'bearish' | 'neutral' | 'bullish';
  volatility: 'low' | 'medium' | 'high';
  trendingTopics: string[];
  highEngagementOpportunities: any[];
  competitorActivity: any[];
}

export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
    duration?: number;
    reason?: string;
    retry_action?: string;
  };
  confidence: number;
}

/**
 * 市場コンテキスト分析専門クラス
 * 市場センチメント、ボラティリティ、トレンド分析を担当
 */
export class MarketAnalyzer {
  constructor(
    private searchEngine: SearchEngine,
    private kaitoClient: KaitoTwitterAPIClient
  ) {
    console.log('✅ MarketAnalyzer initialized - 市場分析専門モジュール');
  }

  /**
   * 市場コンテキスト総合分析
   * 市場センチメント、高エンゲージメント投稿、トレンド情報を統合分析
   */
  async analyzeMarketContext(): Promise<MarketContext> {
    try {
      console.log('📊 市場コンテキスト分析開始');

      const marketSentiment = await this.searchEngine.analyzeMarketSentiment();
      const highEngagementTweets = await this.searchEngine.findHighEngagementTweets('投資');
      const trendingTopics = await this.searchEngine.searchTrends();
      
      return this.synthesizeMarketContext(marketSentiment, highEngagementTweets, trendingTopics);

    } catch (error) {
      console.error('❌ 市場コンテキスト分析エラー:', error);
      return {
        sentiment: 'neutral',
        volatility: 'medium',
        trendingTopics: [],
        highEngagementOpportunities: [],
        competitorActivity: []
      };
    }
  }

  /**
   * 市場コンテキスト統合処理
   * 各種データソースからの情報を統合してMarketContextを生成
   */
  synthesizeMarketContext(marketSentiment: any, highEngagementTweets: any[], trendingTopics: any[]): MarketContext {
    return {
      sentiment: marketSentiment.overall_sentiment || 'neutral',
      volatility: this.calculateVolatility(marketSentiment),
      trendingTopics: trendingTopics.map(t => t.topic || '').slice(0, 5),
      highEngagementOpportunities: highEngagementTweets.slice(0, 10),
      competitorActivity: []
    };
  }

  /**
   * ボラティリティ計算
   * 市場センチメントスコアからボラティリティレベルを算出
   */
  private calculateVolatility(marketSentiment: any): 'low' | 'medium' | 'high' {
    const score = Math.abs(marketSentiment.sentiment_score || 0);
    if (score > 0.7) return 'high';
    if (score > 0.3) return 'medium';
    return 'low';
  }

  /**
   * 統合プロンプト構築
   * 市場コンテキスト分析結果に基づくClaude判断用プロンプト生成
   */
  buildEnhancedPrompt(accountStatus: any, trendData: any[], marketContext: MarketContext): string {
    return `
市場コンテキスト分析に基づく判断要請:

アカウント状況:
- フォロワー数: ${accountStatus.followersCount}
- 投稿数: ${accountStatus.tweetsCount}

市場データ:
- センチメント: ${marketContext.sentiment}
- ボラティリティ: ${marketContext.volatility}
- トレンドトピック: ${marketContext.trendingTopics.slice(0, 3).join(', ')}
- 高エンゲージメント機会: ${marketContext.highEngagementOpportunities.length}件

最適なアクションと理由を判断してください。
    `;
  }

  /**
   * 統合判断実行
   * 市場コンテキストに基づく高度なClaudeDecision生成
   */
  async executeEnhancedDecision(enhancedPrompt: string, marketContext: MarketContext): Promise<ClaudeDecision> {
    console.log('⚡ 統合判断実行中:', { 
      promptLength: enhancedPrompt.length,
      marketSentiment: marketContext.sentiment 
    });

    // 高度な判断ロジック
    if (marketContext.sentiment === 'bullish' && marketContext.volatility === 'low') {
      return this.createPostDecision(
        'ポジティブな市場環境と低ボラティリティを活用した投稿機会',
        0.85,
        'market_opportunity'
      );
    }

    if (marketContext.trendingTopics.length > 0 && marketContext.highEngagementOpportunities.length > 0) {
      return this.createPostDecision(
        'トレンドトピックと高エンゲージメント機会の統合活用',
        0.78,
        'trend_engagement'
      );
    }

    return this.createWaitDecision(
      '市場コンディション分析により待機が最適',
      0.65,
      1800000
    );
  }

  /**
   * 投稿決定オブジェクト生成ヘルパー
   */
  private createPostDecision(reasoning: string, confidence: number, contentType?: string): ClaudeDecision {
    return {
      action: 'post',
      reasoning,
      parameters: {
        topic: contentType || 'general',
        content: contentType
      },
      confidence
    };
  }

  /**
   * 待機決定オブジェクト生成ヘルパー
   */
  private createWaitDecision(reasoning: string, confidence: number, duration?: number): ClaudeDecision {
    return {
      action: 'wait',
      reasoning,
      parameters: {
        duration: duration || 1800000, // Default 30 minutes
        reason: 'scheduled_wait'
      },
      confidence
    };
  }
}