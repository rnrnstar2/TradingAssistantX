/**
 * Claude エンドポイント用モックデータ生成ユーティリティ
 * REQUIREMENTS.md準拠 - テスト用モックデータファクトリー
 */

import type {
  ClaudeDecision,
  GeneratedContent,
  AnalysisResult,
  SearchQuery,
  DecisionInput,
  ContentInput,
  AnalysisInput,
  SearchInput,
  SystemContext,
  BasicMarketContext,
  ExecutionRecord
} from '../../src/claude/types';

// ============================================================================
// Decision Endpoint モックデータ
// ============================================================================

export function createMockDecisionInput(): DecisionInput {
  return {
    context: createMockSystemContext(),
    currentTime: new Date(),
    constraints: {
      maxPostsPerDay: 5,
      minWaitBetweenPosts: 3600000
    },
    learningData: {
      recentPerformance: {
        posts: 10,
        engagementRate: 0.05
      }
    }
  };
}

export function createMockSystemContext(): SystemContext {
  return {
    account: {
      followerCount: 1000,
      engagementRate: 0.05,
      postsToday: 2
    },
    market: {
      sentiment: 'neutral',
      volatility: 'medium',
      trendingTopics: ['投資', 'NISA', '資産運用']
    },
    system: {
      health: {
        all_systems_operational: true,
        api_status: 'healthy',
        rate_limits_ok: true
      },
      executionCount: { today: 5, total: 100 }
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

export function createMockClaudeDecision(action: string = 'post'): ClaudeDecision {
  return {
    action: action as ClaudeDecision['action'],
    reasoning: `${action}を選択した理由の説明`,
    parameters: {
      topic: action !== 'wait' ? '投資教育' : undefined,
      duration: action === 'wait' ? 1800000 : undefined,
      reason: action === 'wait' ? 'scheduled_wait' : undefined
    },
    confidence: 0.8
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

export function createInvalidDecisionResponse() {
  return {
    action: 'post',
    // Missing required fields: reasoning, confidence, parameters
  };
}

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