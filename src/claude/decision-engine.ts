/**
 * Claude Code SDK 高度判断・状況分析エンジン
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 状況分析に基づく適切なアクション決定
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { SearchEngine } from '../kaito-api/search-engine';
import { KaitoTwitterAPIClient } from '../kaito-api/core/client';

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

interface SystemContext {
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
  };
  system: {
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
    executionCount: { today: number; total: number };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
}

/**
 * Claude Code SDK高度判断エンジン
 * 状況分析に基づく適切なアクション決定
 * Claude強み活用MVP設計
 */
export class ClaudeDecisionEngine {
  private readonly MAX_POSTS_PER_DAY = 5;
  private readonly MIN_WAIT_BETWEEN_POSTS = 3600000; // 1 hour
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor(
    private searchEngine?: SearchEngine,
    private kaitoClient?: KaitoTwitterAPIClient
  ) {
    console.log('✅ ClaudeDecisionEngine initialized - Claude強み活用版');
  }

  /**
   * Claude強み活用判断
   * 状況分析に基づく高度なアクション決定
   */
  async makeEnhancedDecision(): Promise<ClaudeDecision> {
    try {
      console.log('🧠 Claude高度判断開始');

      // 1. 基本状況収集
      const context = await this.gatherBasicContext();
      
      // 2. Claude判断プロンプト構築
      const prompt = this.buildDecisionPrompt(context);
      
      // 3. Claude判断実行
      const decision = await this.executeClaudeDecision(prompt, context);
      
      console.log('✅ Claude判断完了:', { action: decision.action, confidence: decision.confidence });
      return decision;

    } catch (error) {
      console.error('❌ Claude判断エラー:', error);
      // 品質確保のため、失敗時は素直に待機
      return this.createWaitDecision('Claude判断失敗のため待機', 0.5);
    }
  }

  /**
   * 基本判断メソッド（システムコンテキスト使用）
   * 品質確保優先ロジック - 失敗時は素直に待機
   */
  async makeDecision(context: SystemContext): Promise<ClaudeDecision> {
    try {
      const { account, system } = context;

      // 1. 基本制約チェック
      if (account.postsToday >= this.MAX_POSTS_PER_DAY) {
        return this.createWaitDecision('Daily post limit reached', 0.9);
      }

      if (!system.health.all_systems_operational) {
        return this.createWaitDecision('System health issues detected', 0.7);
      }

      // 2. Claude判断実行
      const prompt = this.buildContextPrompt(context);
      const decision = await this.executeClaudeDecision(prompt, context);
      
      return this.validateDecision(decision) ? decision : this.createWaitDecision('Invalid decision', 0.6);

    } catch (error) {
      console.error('Decision error:', error);
      return this.createWaitDecision('判断エラーのため待機', 0.5); // 品質確保のため待機
    }
  }

  /**
   * 基本状況収集
   */
  private async gatherBasicContext(): Promise<any> {
    try {
      const context: any = { timestamp: new Date().toISOString() };
      
      if (this.kaitoClient) {
        context.account = await this.kaitoClient.getAccountInfo();
      }
      
      if (this.searchEngine) {
        context.trends = await this.searchEngine.searchTrends();
      }
      
      return context;
    } catch (error) {
      console.warn('Context gathering failed, using fallback');
      return { timestamp: new Date().toISOString(), fallback: true };
    }
  }

  /**
   * 決定プロンプト構築
   */
  private buildDecisionPrompt(context: any): string {
    return `投資教育X自動化システムのアクション判断を行ってください。

現在状況:
- 時刻: ${context.timestamp}
- アカウント情報: ${JSON.stringify(context.account || {}, null, 2)}
- トレンド: ${JSON.stringify(context.trends || [], null, 2)}

以下から最適なアクションを選択し、理由を含めて回答してください:
1. post - 投稿作成
2. retweet - リツイート
3. quote_tweet - 引用ツイート
4. like - いいね
5. wait - 待機

JSON形式で回答してください:
{
  "action": "選択したアクション",
  "reasoning": "判断理由",
  "confidence": 0.8,
  "parameters": { "topic": "投稿トピック" }
}`;
  }

  /**
   * コンテキストプロンプト構築
   */
  private buildContextPrompt(context: SystemContext): string {
    return `状況分析に基づくアクション判断:

アカウント状況:
- フォロワー数: ${context.account.followerCount}
- 今日の投稿数: ${context.account.postsToday}
- エンゲージメント率: ${context.account.engagementRate}%

市場状況:
- センチメント: ${context.market.sentiment}
- ボラティリティ: ${context.market.volatility}
- トレンド: ${context.market.trendingTopics.join(', ')}

最適なアクションを判断してください。`;
  }

  /**
   * Claude判断実行
   */
  private async executeClaudeDecision(prompt: string, context: any): Promise<ClaudeDecision> {
    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(prompt)
        .asText();

      return this.parseClaudeResponse(response);
    } catch (error) {
      console.error('Claude decision failed:', error);
      return this.createWaitDecision('Claude実行失敗のため待機', 0.5);
    }
  }

  /**
   * Claude応答解析
   */
  private parseClaudeResponse(response: string): ClaudeDecision {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || 'wait',
          reasoning: parsed.reasoning || 'Claude判断結果',
          parameters: parsed.parameters || {},
          confidence: parsed.confidence || 0.7
        };
      }
    } catch (error) {
      console.error('Response parsing failed:', error);
    }
    
    return this.createWaitDecision('Response parsing failed', 0.5);
  }

  /**
   * 決定検証
   */
  validateDecision(decision: ClaudeDecision): boolean {
    const validActions = ['post', 'retweet', 'quote_tweet', 'like', 'wait'];
    return !!(decision.action && decision.reasoning && 
             validActions.includes(decision.action) &&
             decision.confidence >= 0 && decision.confidence <= 1);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

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

  private createWaitDecision(reasoning: string, confidence: number): ClaudeDecision {
    return {
      action: 'wait',
      reasoning,
      parameters: {
        duration: 1800000, // 30 minutes
        reason: 'scheduled_wait'
      },
      confidence
    };
  }
}

// Export alias for compatibility
export { ClaudeDecisionEngine as DecisionEngine };