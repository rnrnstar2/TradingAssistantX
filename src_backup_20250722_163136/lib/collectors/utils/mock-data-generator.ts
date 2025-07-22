/**
 * Mock Data Generator
 * テストモード用のモックデータ生成機能
 */

import type { 
  CollectionResult, 
  ActionSpecificResult,
  QualityEvaluation,
  SufficiencyEvaluation
} from '../../types/autonomous-system.js';

export class MockDataGenerator {
  
  /**
   * アクション特化型モック結果生成
   */
  static generateMockActionResult(actionType: string): ActionSpecificResult {
    const results = this.generateMockCollectionResults(actionType);
    const qualityEvaluation = this.generateMockQualityEvaluation();
    
    return {
      actionType,
      results,
      qualityEvaluation,
      collectionStats: {
        totalResults: results.length,
        uniqueResults: results.length,
        processingTimeMs: Math.floor(Math.random() * 5000) + 2000, // 2-7秒
        sourcesUsed: ['yahoo_finance', 'bloomberg', 'reddit']
      },
      sufficiencyEvaluation: this.generateMockSufficiencyEvaluation(90)
    };
  }

  /**
   * モック収集結果生成
   */
  static generateMockCollectionResults(actionType: string, count: number = 8): CollectionResult[] {
    const results: CollectionResult[] = [];
    
    const mockData = this.getMockDataByActionType(actionType);
    
    for (let i = 0; i < count; i++) {
      const data = mockData[i % mockData.length];
      results.push({
        id: `mock-${actionType}-${i + 1}-${Date.now()}`,
        type: data.type,
        content: data.content,
        relevanceScore: 0.7 + (Math.random() * 0.25), // 0.7-0.95
        timestamp: Date.now() - (Math.random() * 86400000), // 過去24時間内
        title: data.title,
        url: data.url
      });
    }
    
    return results;
  }

  /**
   * アクションタイプ別モックデータ
   */
  private static getMockDataByActionType(actionType: string): Array<{
    type: string;
    title: string;
    content: string;
    url: string;
  }> {
    const mockDataSets = {
      original_post: [
        {
          type: 'insight',
          title: '米国金利動向とFX市場への影響分析',
          content: 'FRBの金利政策決定がドル円相場に与える影響を詳細に分析。今後の投資戦略について教育的な視点から解説します。',
          url: 'https://example.com/fed-analysis'
        },
        {
          type: 'analysis',
          title: '新興国通貨の投資機会と リスク管理',
          content: '新興国通貨への投資における機会とリスクを包括的に分析。分散投資の重要性と具体的な手法を解説。',
          url: 'https://example.com/emerging-currencies'
        },
        {
          type: 'education',
          title: 'テクニカル分析入門：移動平均線の活用法',
          content: '移動平均線を使ったトレンド分析の基本から応用まで。初心者向けの実践的な教育コンテンツ。',
          url: 'https://example.com/technical-analysis'
        }
      ],
      quote_tweet: [
        {
          type: 'news',
          title: 'ECB政策会合の結果速報',
          content: '欧州中央銀行の最新政策決定について、市場への即座の影響と今後の展望を分析。',
          url: 'https://example.com/ecb-news'
        },
        {
          type: 'market_update',
          title: 'アジア市場オープン時の注目ポイント',
          content: 'アジア市場の開始前に確認すべき重要な経済指標と市場動向をまとめて解説。',
          url: 'https://example.com/asia-markets'
        }
      ],
      retweet: [
        {
          type: 'news',
          title: 'IMF世界経済見通し最新版発表',
          content: '国際通貨基金による世界経済成長率予測の最新データと地域別分析結果。',
          url: 'https://example.com/imf-outlook'
        },
        {
          type: 'analysis',
          title: '仮想通貨規制動向と市場への影響',
          content: '各国の仮想通貨規制動向が市場に与える影響について、専門家の見解をまとめて紹介。',
          url: 'https://example.com/crypto-regulation'
        }
      ],
      reply: [
        {
          type: 'discussion',
          title: 'リスク管理手法について',
          content: 'コミュニティでの議論：効果的なリスク管理手法と実践的なアドバイス交換。',
          url: 'https://example.com/risk-discussion'
        },
        {
          type: 'q_and_a',
          title: '初心者からの質問：ポートフォリオ構築',
          content: '投資初心者からのポートフォリオ構築に関する質問への詳細な回答と解説。',
          url: 'https://example.com/portfolio-qa'
        }
      ]
    };

    return mockDataSets[actionType as keyof typeof mockDataSets] || mockDataSets.original_post;
  }

  /**
   * モック品質評価生成
   */
  static generateMockQualityEvaluation(): QualityEvaluation {
    return {
      overallScore: 78 + Math.floor(Math.random() * 15), // 78-92
      relevanceScore: 80 + Math.floor(Math.random() * 15), // 80-94
      credibilityScore: 85 + Math.floor(Math.random() * 10), // 85-94
      uniquenessScore: 70 + Math.floor(Math.random() * 20), // 70-89
      timelinessScore: 88 + Math.floor(Math.random() * 10), // 88-97
      feedback: '良好な品質の情報が収集されました（テストモード）',
      suggestions: [
        'より多様な情報源を活用してください',
        'キーワードの最適化を検討してください',
        '収集頻度の調整が効果的です'
      ]
    };
  }

  /**
   * モック十分性評価生成
   */
  static generateMockSufficiencyEvaluation(targetSufficiency: number): SufficiencyEvaluation {
    const currentSufficiency = Math.max(60, targetSufficiency - Math.floor(Math.random() * 20));
    
    return {
      currentSufficiency,
      targetSufficiency,
      recommendation: currentSufficiency >= targetSufficiency ? 'sufficient' : 'needs_more',
      details: {
        informationQuality: currentSufficiency > 80 ? 'high' : 'medium',
        sourcesDiversity: Math.random() > 0.5 ? 'adequate' : 'needs_improvement',
        contentFreshness: 'recent',
        actionRelevance: currentSufficiency > 75 ? 'high' : 'medium'
      }
    };
  }

  /**
   * フォールバック結果生成
   */
  static generateFallbackResults(actionType: string): CollectionResult[] {
    const fallbackContent = {
      original_post: '市場の基本的な動向分析と投資教育的な視点を提供',
      quote_tweet: '既存の有益なツイートに対する付加価値のある解説を検討', 
      retweet: '信頼性の高い投資情報源からの価値あるコンテンツを選定',
      reply: 'コミュニティとの建設的な対話機会を創出'
    };

    const content = fallbackContent[actionType as keyof typeof fallbackContent] || 
                   '投資分野での価値創造に向けた基本的な情報収集';

    return [{
      id: `fallback-${actionType}-${Date.now()}`,
      type: 'insight',
      content,
      relevanceScore: 0.6,
      timestamp: Date.now(),
      title: `${actionType}向けフォールバック情報`,
      url: 'fallback://generated'
    }];
  }

  /**
   * ランダムな遅延生成（リアルな処理時間のシミュレーション）
   */
  static async simulateProcessingDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * エラーシミュレーション（テスト用）
   */
  static simulateRandomError(probability: number = 0.1): void {
    if (Math.random() < probability) {
      throw new Error('Simulated collection error for testing');
    }
  }

  /**
   * パフォーマンスメトリクス生成
   */
  static generateMockPerformanceMetrics() {
    return {
      totalExecutionTime: 2000 + Math.random() * 3000, // 2-5秒
      successRate: 0.85 + Math.random() * 0.13, // 85-98%
      averageRelevanceScore: 0.75 + Math.random() * 0.2, // 75-95%
      sourcesAccessible: Math.floor(Math.random() * 3) + 6, // 6-8個
      cacheHitRate: 0.3 + Math.random() * 0.4 // 30-70%
    };
  }
}