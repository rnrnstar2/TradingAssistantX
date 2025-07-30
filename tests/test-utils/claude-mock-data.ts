/**
 * Claude エンドポイント用モックデータ生成ユーティリティ
 * REQUIREMENTS.md準拠 - テスト用モックデータファクトリー
 * 新構造対応: 学習データ統合、WorkflowContext、PostData対応
 */

import type {
  GeneratedContent,
  AnalysisResult,
  SearchQuery,
  ContentInput,
  AnalysisInput,
  SearchInput,
  SystemContext,
  BasicMarketContext,
  ExecutionRecord
} from '../../src/claude/types';
import type { 
  PostData,
  LearningData 
} from '../../src/shared/data-manager';
import { createMockLearningData } from './learning-data-mock';

// ============================================================================
// System Context モックデータ
// ============================================================================

export function createMockSystemContext(): SystemContext {
  return {
    account: {
      followerCount: 100,
      lastPostTime: '2024-01-01T00:00:00Z',
      postsToday: 0,
      engagementRate: 2.5
    },
    system: {
      health: {
        all_systems_operational: true,
        api_status: 'healthy' as const,
        rate_limits_ok: true
      },
      executionCount: { today: 0, total: 0 }
    },
    market: {
      trendingTopics: ['投資', '資産形成', '仮想通貨'],
      volatility: 'medium' as const,
      sentiment: 'neutral' as const
    }
  };
}


export function createMockSystemContextUnhealthy(): SystemContext {
  return {
    ...createMockSystemContext(),
    system: {
      health: {
        all_systems_operational: false,
        api_status: 'error',
        rate_limits_ok: false
      }
    }
  };
}

export function createMockSystemContextLimitReached(): SystemContext {
  return {
    ...createMockSystemContext(),
    account: {
      ...createMockSystemContext().account,
      postsToday: 5 // Reached daily limit
    }
  };
}


// ============================================================================
// Content Endpoint モックデータ
// ============================================================================

export function createMockContentInput(): ContentInput {
  return {
    request: createMockContentRequest(),
    context: {
      market: { sentiment: 'neutral', trending: ['NISA', '投資信託'] },
      account: { followerCount: 1000, engagementRate: 0.05 }
    },
    qualityThreshold: 70
  };
}

export function createMockContentRequest() {
  return {
    topic: '投資教育',
    contentType: 'educational' as const,
    targetAudience: 'beginner' as const,
    tone: 'professional' as const,
    constraints: {
      maxLength: 280,
      includeHashtags: true,
      avoidTopics: []
    }
  };
}

export function createMockContentInputLowQuality(): ContentInput {
  return {
    ...createMockContentInput(),
    qualityThreshold: 95 // Very high threshold
  };
}

export function createMockGeneratedContent(): GeneratedContent {
  return {
    content: '投資信託は初心者にもおすすめの資産運用方法です。分散投資によりリスクを軽減できます。',
    hashtags: ['#投資教育', '#資産運用', '#投資初心者'],
    qualityScore: 85,
    metadata: {
      wordCount: 280,
      contentType: 'educational',
      generatedAt: new Date().toISOString()
    }
  };
}

// ============================================================================
// Analysis Endpoint モックデータ
// ============================================================================

export function createMockAnalysisInput(analysisType: string = 'performance'): AnalysisInput {
  return {
    analysisType: analysisType as AnalysisInput['analysisType'],
    data: {
      executions: [],
      metrics: { total: 10, successful: 8 }
    },
    timeframe: '24h',
    context: createMockBasicMarketContext()
  };
}

export function createMockBasicMarketContext(): BasicMarketContext {
  return {
    sentiment: 'neutral',
    volatility: 'medium',
    trendingTopics: ['投資', 'NISA'],
    timestamp: new Date().toISOString()
  };
}

export function createMockAnalysisResult(analysisType: string = 'performance'): AnalysisResult {
  return {
    analysisType: analysisType as AnalysisResult['analysisType'],
    insights: ['洞察1', '洞察2', '洞察3'],
    recommendations: ['推奨事項1', '推奨事項2'],
    confidence: 0.85,
    metadata: {
      dataPoints: 100,
      timeframe: '24h',
      generatedAt: new Date().toISOString()
    }
  };
}

export function createMockExecutionRecord(success: boolean = true): ExecutionRecord {
  return {
    id: `exec_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'post',
    success,
    confidence: 0.8,
    reasoning: 'テスト実行の理由',
    result: {
      engagement: success ? 10 : 0,
      reach: success ? 100 : 0,
      errors: success ? [] : ['エラーが発生しました']
    }
  };
}

export function createMockPerformanceMetrics() {
  return {
    total_executions: 10,
    success_rate: 0.8,
    action_breakdown: {
      post: { count: 5, success_rate: 0.8 },
      retweet: { count: 3, success_rate: 0.67 },
      like: { count: 2, success_rate: 1.0 }
    }
  };
}

// ============================================================================
// Search Endpoint モックデータ
// ============================================================================

export function createMockSearchInput(purpose: string = 'retweet'): SearchInput {
  return {
    purpose: purpose as SearchInput['purpose'],
    topic: '投資教育',
    constraints: {
      maxResults: 20,
      minEngagement: 10,
      timeframe: '24h'
    }
  };
}

export function createMockSearchQuery(purpose: string = 'retweet'): SearchQuery {
  return {
    query: '投資教育 -spam -広告',
    filters: {
      language: 'ja',
      minEngagement: 10,
      maxAge: '24h',
      verified: false,
      exclude_keywords: ['spam', '広告']
    },
    priority: 0.8,
    expectedResults: 20,
    metadata: {
      purpose: purpose as SearchQuery['metadata']['purpose'],
      generatedAt: new Date().toISOString()
    }
  };
}

export function createMockRetweetSearchInput() {
  return {
    topic: '投資教育',
    marketContext: createMockBasicMarketContext(),
    targetAudience: 'beginner' as const,
    constraints: {
      maxResults: 20,
      minEngagement: 10
    }
  };
}

export function createMockLikeSearchInput() {
  return {
    topic: '投資初心者',
    targetAudience: 'beginner' as const,
    constraints: {
      maxResults: 30,
      minEngagement: 5,
      sentimentFilter: 'positive' as const
    }
  };
}

export function createMockQuoteSearchInput() {
  return {
    topic: '投資戦略',
    constraints: {
      maxResults: 15,
      minEngagement: 15,
      valueAddPotential: 'high' as const
    }
  };
}

// ============================================================================
// Invalid/Error モックデータ
// ============================================================================


export function createInvalidContentResponse() {
  return {
    content: 'テスト',
    // Missing required fields: hashtags, qualityScore, metadata
  };
}

export function createInvalidAnalysisResponse() {
  return {
    analysisType: 'performance',
    // Missing required fields: insights, recommendations, confidence, metadata
  };
}

// ============================================================================
// NEW STRUCTURE: 新構造対応モックデータ
// ============================================================================

/**
 * 学習データ統合SystemContext作成（新構造対応）
 */
export function createMockSystemContextWithLearningData(learningData?: LearningData): SystemContext & { learningData?: any } {
  const baseContext = createMockSystemContext();
  const mockLearningData = learningData || createMockLearningData();
  
  return {
    ...baseContext,
    timestamp: new Date().toISOString(),
    learningData: {
      recentTopics: mockLearningData.successfulTopics.topics.slice(0, 3).map(t => t.topic),
      optimalTimeSlot: '07:00-10:00',
      avgEngagement: 4.2
    }
  };
}

/**
 * PostData型のモックデータ作成（新構造savePost対応）
 */
export function createMockPostData(overrides?: Partial<PostData>): PostData {
  return {
    executionId: 'execution-20250129-1200',
    actionType: 'post',
    timestamp: new Date().toISOString(),
    content: '投資信託は初心者にもおすすめの資産運用方法です。分散投資によりリスクを軽減できます。',
    result: {
      success: true,
      message: '投稿が正常に完了しました',
      data: { tweetId: 'tweet_123456', url: 'https://twitter.com/user/status/123456' }
    },
    engagement: {
      likes: 5,
      retweets: 2,
      replies: 1
    },
    claudeSelection: {
      score: 8.5,
      reasoning: '高い教育価値があり、初心者向けの内容として最適',
      expectedImpact: 'high'
    },
    ...overrides
  };
}

/**
 * リツイート用PostDataモック
 */
export function createMockRetweetPostData(): PostData {
  return createMockPostData({
    actionType: 'retweet',
    content: undefined,
    targetTweetId: 'target_tweet_789',
    claudeSelection: {
      score: 7.8,
      reasoning: '良質な投資教育コンテンツでフォロワーに価値を提供',
      expectedImpact: 'medium'
    }
  });
}

/**
 * いいね用PostDataモック
 */
export function createMockLikePostData(): PostData {
  return createMockPostData({
    actionType: 'like',
    content: undefined,
    targetTweetId: 'target_tweet_456',
    engagement: {
      likes: 0, // いいね自体にはエンゲージメントデータなし
      retweets: 0,
      replies: 0
    },
    claudeSelection: {
      score: 6.5,
      reasoning: '関係構築に有効なユーザーとの相互作用機会',
      expectedImpact: 'low'
    }
  });
}

/**
 * 引用ツイート用PostDataモック
 */
export function createMockQuoteTweetPostData(): PostData {
  return createMockPostData({
    actionType: 'quote_tweet',
    content: 'この投資戦略は非常に参考になります。特にリスク分散の考え方が重要ですね。',
    targetTweetId: 'quoted_tweet_321',
    claudeSelection: {
      score: 9.0,
      reasoning: '元ツイートに価値ある解説を追加し、教育的価値を向上',
      expectedImpact: 'high'
    }
  });
}

/**
 * フォロー用PostDataモック
 */
export function createMockFollowPostData(): PostData {
  return createMockPostData({
    actionType: 'follow',
    content: undefined,
    targetTweetId: undefined,
    result: {
      success: true,
      message: 'ユーザーのフォローが完了しました',
      data: { userId: 'user_654321', username: 'investment_expert' }
    },
    engagement: {
      likes: 0,
      retweets: 0,  
      replies: 0
    },
    claudeSelection: {
      score: 7.2,
      reasoning: '投資教育分野の専門家で相互フォローが期待される',
      expectedImpact: 'medium'
    }
  });
}

/**
 * ワークフロー決定データのモック
 */
export function createMockWorkflowDecision(action: string = 'post') {
  return {
    action,
    parameters: {
      topic: action === 'post' ? 'investment' : undefined,
      query: action !== 'post' ? '投資教育 OR 資産形成' : undefined
    },
    confidence: 0.85,
    reasoning: `${action}アクションが現在の状況に最適と判断されました`
  };
}

/**
 * ワークフロー実行結果のモック
 */
export function createMockWorkflowResult(success: boolean = true, action: string = 'post') {
  const decision = createMockWorkflowDecision(action);
  
  return {
    success,
    executionId: 'execution-20250129-1200',
    decision,
    actionResult: {
      success,
      action,
      content: action === 'post' ? '投資信託は分散投資の基本です。' : undefined,
      targetTweetId: action !== 'post' ? 'target_tweet_123' : undefined,
      targetTweetText: action !== 'post' ? '投資について学びたい初心者です...' : undefined,
      result: {
        success,
        message: success ? `${action}が正常に完了しました` : `${action}実行中にエラーが発生しました`,
        data: success ? { id: 'result_123' } : { error: 'API_ERROR' }
      },
      claudeSelection: success ? {
        score: 8.2,
        reasoning: 'テスト用の高品質コンテンツ',
        expectedImpact: 'high'
      } : undefined,
      timestamp: new Date().toISOString()
    },
    executionTime: 2500
  };
}

/**
 * エラー時のWorkflowResultモック
 */
export function createMockWorkflowErrorResult(errorMessage: string = 'テスト用エラー') {
  return {
    success: false,
    executionId: 'execution-20250129-1200',
    decision: null,
    error: errorMessage,
    executionTime: 1200
  };
}

// ============================================================================
// 新構造テスト用ヘルパー関数
// ============================================================================

/**
 * 特定のアクションタイプに最適化されたPostDataを作成
 */
export function createOptimizedPostDataForAction(
  actionType: PostData['actionType'],
  successRate: number = 0.9
): PostData {
  const baseData = createMockPostData({ actionType });
  
  // 成功率に基づいてスコアを調整
  const score = Math.round(successRate * 10);
  const expectedImpact = score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low';
  
  return {
    ...baseData,
    claudeSelection: {
      ...baseData.claudeSelection!,
      score,
      expectedImpact
    }
  };
}

/**
 * 破損したPostDataモック（エラーハンドリングテスト用）
 */
export function createCorruptedPostData(): any {
  return {
    executionId: null,
    actionType: 'invalid_action',
    timestamp: 'invalid_timestamp',
    content: 12345, // should be string
    result: null,
    engagement: 'invalid_engagement', // should be object
    claudeSelection: {
      score: 'invalid_score', // should be number
      reasoning: null,
      expectedImpact: 'invalid_impact'
    }
  };
}