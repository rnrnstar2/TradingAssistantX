/**
 * Claude Code SDK 検索エンドポイント - TASK-005実装
 * REQUIREMENTS.md準拠版 - 検索クエリ生成機能
 * Claude判断による最適な検索クエリ生成エンドポイント
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { 
  SearchInput, 
  SearchQuery, 
  RetweetSearchInput, 
  LikeSearchInput, 
  QuoteSearchInput,
  BasicMarketContext 
} from '../types';

// ============================================================================
// MAIN ENDPOINT FUNCTIONS - メインエンドポイント関数
// ============================================================================

/**
 * 検索クエリエンドポイント - Claude判断による最適検索クエリ生成
 * 指示書のメインエンドポイント関数
 */
export async function generateSearchQuery(input: SearchInput): Promise<SearchQuery> {
  try {
    console.log('🔍 検索クエリエンドポイント開始:', input.purpose);

    const { purpose, topic, constraints } = input;

    // Claude用プロンプト構築
    const prompt = buildSearchQueryPrompt(purpose, topic, constraints);
    
    // Claude実行
    const claudeResult = await executeClaudeSearchQuery(prompt);
    
    // 結果の最適化
    const optimizedQuery = optimizeSearchQuery(claudeResult, input);

    const result: SearchQuery = {
      query: optimizedQuery.query,
      filters: optimizedQuery.filters,
      priority: optimizedQuery.priority,
      expectedResults: optimizedQuery.expectedResults,
      metadata: {
        purpose: (MIN_ENGAGEMENT_BY_PURPOSE[input.purpose as keyof typeof MIN_ENGAGEMENT_BY_PURPOSE] !== undefined ? input.purpose : 'retweet') as 'retweet' | 'like' | 'trend_analysis' | 'engagement',
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✅ 検索クエリ生成完了:', {
      query: result.query.substring(0, 50) + '...',
      priority: result.priority
    });

    return result;

  } catch (error) {
    console.error('❌ 検索クエリ生成エラー:', error);
    return generateFallbackQuery(input);
  }
}

/**
 * リツイート用検索クエリ生成
 * 投資教育関連の高品質投稿検索に特化
 */
export async function generateRetweetQuery(input: RetweetSearchInput): Promise<SearchQuery> {
  try {
    console.log('🔄 リツイート用検索クエリ生成開始:', input.topic);

    const { topic, marketContext, targetAudience, constraints } = input;

    // リツイート特化プロンプト
    const prompt = buildRetweetQueryPrompt(topic, marketContext, targetAudience, constraints);
    
    // Claude実行
    const claudeResult = await executeClaudeSearchQuery(prompt);
    
    // リツイート用最適化
    const optimizedQuery = optimizeRetweetQuery(claudeResult, input);

    const result: SearchQuery = {
      query: optimizedQuery.query,
      filters: {
        ...optimizedQuery.filters,
        verified: false,
        language: 'ja'
      },
      priority: optimizedQuery.priority,
      expectedResults: constraints?.maxResults || 20,
      metadata: {
        purpose: 'retweet',
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✅ リツイート用クエリ生成完了');
    return result;

  } catch (error) {
    console.error('❌ リツイート用クエリ生成エラー:', error);
    return generateRetweetFallback(input);
  }
}

/**
 * いいね用検索クエリ生成
 * エンゲージメント対象の投稿検索に特化
 */
export async function generateLikeQuery(input: LikeSearchInput): Promise<SearchQuery> {
  try {
    console.log('👍 いいね用検索クエリ生成開始:', input.topic);

    const { topic, marketContext, targetAudience, constraints } = input;

    // いいね特化プロンプト
    const prompt = buildLikeQueryPrompt(topic, marketContext, targetAudience, constraints);
    
    // Claude実行
    const claudeResult = await executeClaudeSearchQuery(prompt);
    
    // いいね用最適化
    const optimizedQuery = optimizeLikeQuery(claudeResult, input);

    const result: SearchQuery = {
      query: optimizedQuery.query,
      filters: {
        ...optimizedQuery.filters,
        language: 'ja'
      },
      priority: optimizedQuery.priority,
      expectedResults: constraints?.maxResults || 30,
      metadata: {
        purpose: 'like',
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✅ いいね用クエリ生成完了');
    return result;

  } catch (error) {
    console.error('❌ いいね用クエリ生成エラー:', error);
    return generateLikeFallback(input);
  }
}

/**
 * 引用ツイート用検索クエリ生成
 * 価値追加可能な投稿検索に特化
 */
export async function generateQuoteQuery(input: QuoteSearchInput): Promise<SearchQuery> {
  try {
    console.log('💬 引用ツイート用検索クエリ生成開始:', input.topic);

    const { topic, marketContext, targetAudience, constraints } = input;

    // 引用ツイート特化プロンプト
    const prompt = buildQuoteQueryPrompt(topic, marketContext, targetAudience, constraints);
    
    // Claude実行
    const claudeResult = await executeClaudeSearchQuery(prompt);
    
    // 引用ツイート用最適化
    const optimizedQuery = optimizeQuoteQuery(claudeResult, input);

    const result: SearchQuery = {
      query: optimizedQuery.query,
      filters: {
        ...optimizedQuery.filters,
        language: 'ja'
      },
      priority: optimizedQuery.priority,
      expectedResults: constraints?.maxResults || 15,
      metadata: {
        purpose: 'engagement',
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✅ 引用ツイート用クエリ生成完了');
    return result;

  } catch (error) {
    console.error('❌ 引用ツイート用クエリ生成エラー:', error);
    return generateQuoteFallback(input);
  }
}

// ============================================================================
// CLAUDE INTEGRATION - Claude統合機能
// ============================================================================

/**
 * Claude検索クエリ実行
 */
async function executeClaudeSearchQuery(prompt: string): Promise<any> {
  try {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();

    return parseClaudeResponse(response);
  } catch (error) {
    console.error('Claude検索クエリ実行失敗:', error);
    throw error;
  }
}

/**
 * Claude応答解析
 */
function parseClaudeResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        query: parsed.query || '',
        exclude: parsed.exclude || [],
        engagement_min: parsed.engagement_min || 5,
        time_range: parsed.time_range || '24h',
        reasoning: parsed.reasoning || '',
        priority: Math.min(Math.max(parsed.priority || 0.5, 0), 1),
        expectedResults: parsed.expectedResults || 20
      };
    }
  } catch (error) {
    console.error('Claude応答解析失敗:', error);
  }
  
  throw new Error('Claude応答の解析に失敗しました');
}

// ============================================================================
// PROMPT BUILDERS - プロンプト構築機能
// ============================================================================

/**
 * 基本検索クエリプロンプト構築
 */
function buildSearchQueryPrompt(purpose: string, topic: string, constraints?: any): string {
  const purposeDescriptions: { [key: string]: string } = {
    retweet: 'リツイートに適した高品質な投資教育コンテンツを発見する',
    like: 'いいねに適した有益で共感性の高い投資関連コンテンツを発見する',
    trend_analysis: 'トレンド分析のための市場関連情報を収集する',
    engagement: 'エンゲージメント機会を見つけるためのアクティブなコミュニティを発見する'
  };

  const purposeDesc = purposeDescriptions[purpose] || '投資教育に関連する情報を検索する';

  return `投資教育X自動化システムの検索クエリを生成してください。

目的: ${purposeDesc}
市場状況: 投資教育コンテンツの需要が高まっている
対象読者: 投資初心者から中級者

以下の要件で最適な検索クエリを生成してください:
- 投資教育の観点で価値が高いコンテンツを発見
- 信頼性とエンゲージメントのバランス
- 対象読者に適した内容レベル
- 現在の市場状況に関連性の高いトピック: ${topic}

JSON形式で回答してください:
{
  "query": "検索クエリ",
  "exclude": ["除外キーワード"],
  "engagement_min": 10,
  "time_range": "24h",
  "reasoning": "選定理由"
}`;
}

/**
 * リツイート用プロンプト構築
 */
function buildRetweetQueryPrompt(
  topic: string, 
  marketContext?: BasicMarketContext, 
  targetAudience?: string,
  constraints?: any
): string {
  const audienceDesc = targetAudience === 'beginner' ? '投資初心者' : 
                      targetAudience === 'advanced' ? '投資上級者' : '投資中級者';

  return `投資教育X自動化システム - リツイート用検索クエリ生成

目的: リツイートに適した高品質な投資教育コンテンツを発見
トピック: ${topic}
対象読者: ${audienceDesc}
市場状況: ${marketContext ? JSON.stringify(marketContext) : '通常'}

リツイート戦略:
- 幅広い教育価値のあるコンテンツ
- 信頼性が高く誤解を招かない内容
- エンゲージメントが期待できる投稿
- 投機的・リスク過大な内容は除外

以下の要件で最適な検索クエリを生成してください:
- 投資教育に関連性が高い内容
- ${audienceDesc}に適した内容レベル
- 品質とエンゲージメントのバランス
- 日本語コンテンツを重視

JSON形式で回答してください:
{
  "query": "検索クエリ",
  "exclude": ["除外キーワード"],
  "engagement_min": 10,
  "time_range": "24h",
  "reasoning": "選定理由"
}`;
}

/**
 * いいね用プロンプト構築
 */
function buildLikeQueryPrompt(
  topic: string, 
  marketContext?: BasicMarketContext, 
  targetAudience?: string,
  constraints?: any
): string {
  const audienceDesc = targetAudience === 'beginner' ? '投資初心者' : 
                      targetAudience === 'advanced' ? '投資上級者' : '投資中級者';

  return `投資教育X自動化システム - いいね用検索クエリ生成

目的: いいねに適した良質で支持できる投資関連コンテンツを発見
トピック: ${topic}
対象読者: ${audienceDesc}
市場状況: ${marketContext ? JSON.stringify(marketContext) : '通常'}

いいね戦略:
- 良質で共感性の高いコンテンツ
- 支持できる投資教育内容
- ポジティブな投資体験を共有する投稿
- コミュニティ形成に役立つ内容

以下の要件で最適な検索クエリを生成してください:
- 投資教育に関連性が高い内容
- ${audienceDesc}に適した内容レベル
- エンゲージメント価値が高い投稿
- ポジティブで建設的な内容

JSON形式で回答してください:
{
  "query": "検索クエリ",
  "exclude": ["除外キーワード"],
  "engagement_min": 5,
  "time_range": "12h",
  "reasoning": "選定理由"
}`;
}

/**
 * 引用ツイート用プロンプト構築
 */
function buildQuoteQueryPrompt(
  topic: string, 
  marketContext?: BasicMarketContext, 
  targetAudience?: string,
  constraints?: any
): string {
  const audienceDesc = targetAudience === 'beginner' ? '投資初心者' : 
                      targetAudience === 'advanced' ? '投資上級者' : '投資中級者';

  return `投資教育X自動化システム - 引用ツイート用検索クエリ生成

目的: 引用ツイートで追加価値を提供できる投資関連コンテンツを発見
トピック: ${topic}
対象読者: ${audienceDesc}
市場状況: ${marketContext ? JSON.stringify(marketContext) : '通常'}

引用ツイート戦略:
- 追加価値を提供できるコンテンツ
- 教育的観点から補足説明可能な投稿
- 議論を促進する建設的な内容
- 投資教育の観点から価値を追加できる投稿

以下の要件で最適な検索クエリを生成してください:
- 投資教育に関連性が高い内容
- ${audienceDesc}に適した内容レベル
- 追加価値提供の余地がある投稿
- 建設的な議論を促進する内容

JSON形式で回答してください:
{
  "query": "検索クエリ",
  "exclude": ["除外キーワード"],
  "engagement_min": 15,
  "time_range": "24h",
  "reasoning": "選定理由"
}`;
}

// ============================================================================
// OPTIMIZATION FUNCTIONS - 最適化機能
// ============================================================================

// purpose別の最小エンゲージメント基準を明確化
const MIN_ENGAGEMENT_BY_PURPOSE = {
  retweet: 10,
  like: 5, 
  trend_analysis: 3,
  engagement: 15  // 'engagement' = quote_tweet用
} as const;

/**
 * 基本検索クエリ最適化
 */
function optimizeSearchQuery(claudeResult: any, input: SearchInput): any {
  // topicが含まれているかチェックし、含まれていない場合は追加
  const baseQuery = claudeResult.query || input.topic;
  const finalQuery = baseQuery.includes(input.topic) ? 
    baseQuery.substring(0, 200) :
    `${input.topic} ${baseQuery}`.substring(0, 200);

  // 無効なpurposeの場合はデフォルトを使用
  const validPurpose = MIN_ENGAGEMENT_BY_PURPOSE[input.purpose as keyof typeof MIN_ENGAGEMENT_BY_PURPOSE] !== undefined ? input.purpose : 'retweet';
  
  // 入力制約を優先適用しつつ、purpose別最低基準を維持
  const purposeMinEngagement = MIN_ENGAGEMENT_BY_PURPOSE[validPurpose as keyof typeof MIN_ENGAGEMENT_BY_PURPOSE] || claudeResult.engagement_min;
  // purpose別最低基準よりも高い制約のみ適用
  const finalMinEngagement = Math.max(
    purposeMinEngagement,
    claudeResult.engagement_min,
    input.constraints?.minEngagement || 0
  );
  
  return {
    query: finalQuery,
    filters: {
      language: 'ja',
      minEngagement: finalMinEngagement,
      maxAge: input.constraints?.timeframe || claudeResult.time_range,
      // 入力制約からminEngagementを除外して追加（既にfinalMinEngagementで処理済み）
      ...Object.fromEntries(
        Object.entries(input.constraints || {}).filter(([key]) => key !== 'minEngagement')
      )
    },
    priority: claudeResult.priority,
    expectedResults: claudeResult.expectedResults
  };
}

/**
 * リツイート用クエリ最適化
 */
function optimizeRetweetQuery(claudeResult: any, input: RetweetSearchInput): any {
  const qualityBoost = input.constraints?.qualityThreshold ? 0.2 : 0;
  
  // topicが含まれているかチェックし、含まれていない場合は追加
  const baseQuery = claudeResult.query || input.topic;
  const finalQuery = baseQuery.includes(input.topic) ? 
    baseQuery.substring(0, 200) :
    `${input.topic} ${baseQuery}`.substring(0, 200);
  
  return {
    query: finalQuery,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        10
      ),
      maxAge: input.constraints?.timeframe || claudeResult.time_range,
      verified: false,
      exclude_keywords: [...(claudeResult.exclude || []), 'spam', '詐欺', '投機']
    },
    priority: Math.min(claudeResult.priority + qualityBoost, 1.0),
    expectedResults: claudeResult.expectedResults
  };
}

/**
 * いいね用クエリ最適化
 */
function optimizeLikeQuery(claudeResult: any, input: LikeSearchInput): any {
  const sentimentBoost = input.constraints?.sentimentFilter === 'positive' ? 0.1 : 0;
  
  // topicが含まれているかチェックし、含まれていない場合は追加
  const baseQuery = claudeResult.query || input.topic;
  const finalQuery = baseQuery.includes(input.topic) ? 
    baseQuery.substring(0, 200) :
    `${input.topic} ${baseQuery}`.substring(0, 200);
  
  return {
    query: finalQuery,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        5
      ),
      maxAge: input.constraints?.timeframe || claudeResult.time_range || '12h',
      sentiment: input.constraints?.sentimentFilter || 'positive',
      exclude_keywords: [...(claudeResult.exclude || []), 'spam', '詐欺']
    },
    priority: Math.min(claudeResult.priority + sentimentBoost, 1.0),
    expectedResults: claudeResult.expectedResults
  };
}

/**
 * 引用ツイート用クエリ最適化
 */
function optimizeQuoteQuery(claudeResult: any, input: QuoteSearchInput): any {
  const valueAddBoost = input.constraints?.valueAddPotential === 'high' ? 0.3 : 0.1;
  
  // topicが含まれているかチェックし、含まれていない場合は追加
  const baseQuery = claudeResult.query || input.topic;
  const finalQuery = baseQuery.includes(input.topic) ? 
    baseQuery.substring(0, 200) :
    `${input.topic} ${baseQuery}`.substring(0, 200);
  
  return {
    query: finalQuery,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        15
      ),
      maxAge: input.constraints?.timeframe || claudeResult.time_range,
      has_discussion_potential: true,
      exclude_keywords: [...(claudeResult.exclude || []), 'spam', '詐欺', 'FUD']
    },
    priority: Math.min(claudeResult.priority + valueAddBoost, 1.0),
    expectedResults: claudeResult.expectedResults
  };
}

// ============================================================================
// FALLBACK FUNCTIONS - フォールバック機能
// ============================================================================

/**
 * 基本フォールバッククエリ生成
 */
function generateFallbackQuery(input: SearchInput): SearchQuery {
  const fallbackQueries: { [key: string]: string } = {
    retweet: `${input.topic} 投資 教育 -spam -詐欺`,
    like: `${input.topic} 投資 初心者 -spam`,
    trend_analysis: `${input.topic} 市場 分析 -spam`,
    engagement: `${input.topic} 投資 コミュニティ -spam`
  };

  // 無効なpurposeの場合はデフォルトを使用
  const validPurpose = fallbackQueries[input.purpose] ? input.purpose : 'retweet';
  
  // purpose別の最小エンゲージメント基準を適用
  const purposeMinEngagement = MIN_ENGAGEMENT_BY_PURPOSE[validPurpose as keyof typeof MIN_ENGAGEMENT_BY_PURPOSE] || 3;
  const finalMinEngagement = Math.max(
    input.constraints?.minEngagement || 0,
    purposeMinEngagement
  );

  return {
    query: fallbackQueries[input.purpose] || `${input.topic} 投資 -spam`,
    filters: {
      language: 'ja',
      minEngagement: finalMinEngagement,
      maxAge: input.constraints?.timeframe || '24h'
    },
    priority: 0.5,
    expectedResults: 20,
    metadata: {
      purpose: validPurpose as 'retweet' | 'like' | 'trend_analysis' | 'engagement',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * リツイート用フォールバック
 */
function generateRetweetFallback(input: RetweetSearchInput): SearchQuery {
  return {
    query: `${input.topic} 投資 教育 初心者 -spam -詐欺 -投機`,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        10
      ),
      maxAge: input.constraints?.timeframe || '24h',
      verified: false
    },
    priority: 0.6,
    expectedResults: 20,
    metadata: {
      purpose: 'retweet',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * いいね用フォールバック
 */
function generateLikeFallback(input: LikeSearchInput): SearchQuery {
  return {
    query: `${input.topic} 投資 初心者 体験 -spam`,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        5
      ),
      maxAge: input.constraints?.timeframe || '12h'
    },
    priority: 0.4,
    expectedResults: 30,
    metadata: {
      purpose: 'like',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * 引用ツイート用フォールバック
 */
function generateQuoteFallback(input: QuoteSearchInput): SearchQuery {
  return {
    query: `${input.topic} 投資 議論 質問 -spam -詐欺`,
    filters: {
      language: 'ja',
      minEngagement: Math.max(
        input.constraints?.minEngagement || 0,
        15
      ),
      maxAge: input.constraints?.timeframe || '24h'
    },
    priority: 0.7,
    expectedResults: 15,
    metadata: {
      purpose: 'engagement',
      generatedAt: new Date().toISOString()
    }
  };
}