import type { 
  SystemContext, 
  ClaudeDecision, 
  ClaudeActionType
} from '../types/core-types';

/**
 * Claude Autonomous Agent - MVP版
 * 
 * シンプルな4つのアクションの判定のみを行う
 * 複雑な履歴管理・学習機能は削除
 */
export class ClaudeAutonomousAgent {
  private systemPrompt: string;
  
  constructor() {
    this.systemPrompt = this.buildSimpleSystemPrompt();
  }

  /**
   * MVPの4アクションのみを判定する簡単なメソッド
   */
  async decideMVPAction(context: SystemContext): Promise<ClaudeDecision> {
    // シンプルな条件分岐による判定
    
    // 1. 基本的なシステムヘルス確認
    if (!context.system.health.all_systems_operational) {
      return {
        action: 'wait',
        reasoning: 'システムが不安定のため待機',
        parameters: { duration: 300000, reason: 'System health check failed' },
        confidence: 0.9
      };
    }

    // 2. 投稿頻度制限チェック
    if (context.system.executionCount.today >= 15) {
      return {
        action: 'wait',
        reasoning: '1日の投稿上限に達したため待機',
        parameters: { duration: 600000, reason: 'Daily limit reached' },
        confidence: 1.0
      };
    }

    // 3. 最後の投稿からの経過時間チェック
    const lastPostTime = context.account.lastPostTime;
    if (lastPostTime) {
      const timeSinceLastPost = Date.now() - new Date(lastPostTime).getTime();
      const minInterval = 60 * 60 * 1000; // 1時間
      
      if (timeSinceLastPost < minInterval) {
        return {
          action: 'wait',
          reasoning: '前回投稿から時間が短いため待機',
          parameters: { duration: minInterval - timeSinceLastPost, reason: 'Post interval too short' },
          confidence: 0.8
        };
      }
    }

    // 4. フォロワー数に基づく基本判定
    const followerCount = context.account.followerCount;
    
    // フォロワー数が少ない場合：データ収集→投稿のサイクル
    if (followerCount < 100) {
      // RSS データの確認（簡易版）
      const hasRecentData = context.market.trendingTopics.length > 0;
      
      if (!hasRecentData) {
        return {
          action: 'collect_data',
          reasoning: 'フォロワー数が少ないため新鮮なデータを収集',
          parameters: { collectorType: 'rss', theme: 'investment_basics' },
          confidence: 0.7
        };
      } else {
        return {
          action: 'create_post',
          reasoning: '初心者向けの投稿でフォロワー獲得を狙う',
          parameters: { 
            theme: 'investment_basics',
            style: 'educational',
            targetAudience: 'beginners'
          },
          confidence: 0.8
        };
      }
    }
    
    // フォロワー数が中程度の場合：定期分析
    if (followerCount < 1000) {
      // 5回に1回は分析
      if (context.system.executionCount.today % 5 === 0) {
        return {
          action: 'analyze',
          reasoning: 'アカウント成長の分析を実行',
          parameters: { 
            target: 'followers',
            metrics: ['growth_rate', 'engagement'],
            period: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() }
          },
          confidence: 0.6
        };
      }
      
      return {
        action: 'create_post',
        reasoning: '中級者向けの投稿でエンゲージメント向上',
        parameters: { 
          theme: 'market_analysis',
          style: 'analytical',
          targetAudience: 'intermediate'
        },
        confidence: 0.7
      };
    }
    
    // フォロワー数が多い場合：安定した投稿
    return {
      action: 'create_post',
      reasoning: '上級者向けの専門的な投稿で権威性を構築',
      parameters: { 
        theme: 'advanced_trading',
        style: 'analytical',
        targetAudience: 'advanced'
      },
      confidence: 0.8
    };
  }

  /**
   * シンプルなシステムプロンプト作成
   */
  private buildSimpleSystemPrompt(): string {
    return `
あなたはTradingAssistantXのMVP投稿システムです。

目的: 継続的で質の高い投稿による着実なアカウント構築

利用可能なアクション:
1. collect_data - RSS等からデータ収集
2. create_post - 投稿作成と実行
3. analyze - アカウント状況分析（フォロワー数のみ）
4. wait - 戦略的待機

判断基準:
- フォロワー数に基づく投稿頻度調整
- 前回投稿からの経過時間
- 1日15回の投稿制限遵守
- システムヘルス確認

すべての決定はシンプルな条件分岐で行い、複雑な学習や履歴管理は使用しません。
`;
  }
}