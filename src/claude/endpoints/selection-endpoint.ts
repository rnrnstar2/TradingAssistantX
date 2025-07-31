/**
 * ツイート選択エンドポイント - Claude最適選択機能
 * REQUIREMENTS.md準拠版 - エンドポイント別設計（関数ベース実装）
 * いいね・リツイート・引用リツイート共通の選択ロジック
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { 
  TweetSelectionParams, 
  SelectedTweet, 
  TweetCandidate, 
  CompactTweetCandidate,
  PromptLogData
} from '../types';
import { SelectionBuilder } from '../prompts/builders/selection-builder';
import { ClaudePromptLogger } from '../utils/prompt-logger';

// ============================================================================
// TYPE CONVERSION FUNCTIONS - 型変換関数
// ============================================================================

/**
 * KaitoAPI TweetData から TweetCandidate への変換
 * 既にnormalizeTweetData()で正規化されたデータを前提
 */
export function convertTweetDataToCandidate(tweetData: any): TweetCandidate {
  return {
    id: tweetData.id,
    text: tweetData.text,
    author_id: tweetData.author_id,
    public_metrics: {
      like_count: tweetData.public_metrics?.like_count || 0,
      retweet_count: tweetData.public_metrics?.retweet_count || 0,
      reply_count: tweetData.public_metrics?.reply_count || 0,
      quote_count: tweetData.public_metrics?.quote_count || 0,
      impression_count: tweetData.public_metrics?.impression_count || 0
    },
    created_at: tweetData.created_at,
    lang: tweetData.lang,
    in_reply_to_user_id: tweetData.in_reply_to_user_id,
    conversation_id: tweetData.conversation_id
  };
}

// ============================================================================
// CONSTANTS - 定数定義
// ============================================================================

const MAX_CANDIDATES = 20;
const CLAUDE_TIMEOUT = 15000;
const MIN_QUALITY_SCORE = 3;
const MAX_TEXT_LENGTH = 200; // プロンプト内でのツイート本文最大長

// ============================================================================
// MAIN ENDPOINT FUNCTION - メインエンドポイント関数
// ============================================================================

/**
 * 最適ツイート選択エンドポイント - Claude AI を使用した高品質選択
 * 
 * @description 複数のツイート候補から、指定した基準に基づいて最適なツイートを選択します
 * プロンプト最適化により効率的なトークン使用を実現し、いいね・リツイート・引用リツイートで共通使用
 * 
 * @param params - 選択パラメータ（候補、選択タイプ、基準、コンテキスト）
 * @returns 選択されたツイート情報とスコア・理由
 * 
 * @throws {Error} 候補数制限違反エラー
 * @throws {Error} Claude API認証エラー
 * @throws {Error} 選択基準バリデーションエラー
 * 
 * @example
 * ```typescript
 * const selectedTweet = await selectOptimalTweet({
 *   candidates: searchResults.tweets,
 *   selectionType: 'like',
 *   criteria: {
 *     topic: '投資教育',
 *     qualityThreshold: 8,
 *     engagementWeight: 0.3,
 *     relevanceWeight: 0.7
 *   },
 *   context: {
 *     userProfile: accountInfo,
 *     learningData: learningHistory
 *   }
 * });
 * ```
 * 
 * @since 2025-07-30
 */
export async function selectOptimalTweet(params: TweetSelectionParams): Promise<SelectedTweet> {
  try {
    // 入力検証
    validateSelectionParams(params);

    console.log(`🎯 ツイート選択開始: ${params.selectionType} for "${params.criteria.topic}"`);
    console.log(`📊 候補数: ${params.candidates.length}件`);

    // 候補数制限チェック
    if (params.candidates.length === 0) {
      throw new Error('ツイート候補が見つかりませんでした');
    }

    if (params.candidates.length > MAX_CANDIDATES) {
      console.warn(`⚠️ 候補数が上限を超えています (${params.candidates.length}>${MAX_CANDIDATES}), 上位${MAX_CANDIDATES}件に制限`);
      params.candidates = params.candidates.slice(0, MAX_CANDIDATES);
    }

    // ツイートリストをプロンプト用に整形（Token節約）
    const compactCandidates = formatTweetsForPrompt(params.candidates);

    // Claude選択プロンプト構築
    const prompt = buildSelectionPrompt(params, compactCandidates);

    // プロンプトログデータ準備
    const promptLogData: PromptLogData = {
      prompt_metadata: {
        endpoint: 'selectOptimalTweet',
        timestamp: new Date().toISOString(),
        execution_id: params.context?.executionId || 'selection-' + new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-').substring(0, 13),
        model: 'sonnet',
        timeout: CLAUDE_TIMEOUT
      },
      input_context: {
        selection_type: params.selectionType,
        candidates_count: params.candidates.length,
        topic: params.criteria.topic,
        quality_threshold: params.criteria.qualityThreshold
      },
      system_context: {
        timestamp: new Date().toISOString(),
        account: {
          followerCount: params.context.userProfile.followerCount,
          postsToday: params.context.userProfile.postsToday,
          engagementRate: params.context.userProfile.engagementRate,
          lastPostTime: params.context.userProfile.lastPostTime
        },
        system: {
          health: {
            all_systems_operational: true,
            api_status: 'healthy',
            rate_limits_ok: true
          },
          executionCount: { today: 0, total: 0 }
        },
        market: {
          trendingTopics: [],
          volatility: 'medium',
          sentiment: 'neutral'
        },
        learningData: params.context.learningData
      },
      full_prompt: prompt
    };

    // Claude APIを使用して選択実行
    const startTime = Date.now();
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(CLAUDE_TIMEOUT)
      .skipPermissions()
      .query(prompt)
      .asText();
    const endTime = Date.now();

    // レスポンス解析
    const selectionResult = parseClaudeResponse(response, params.candidates);

    // レスポンスメタデータを追加
    promptLogData.response_metadata = {
      content_length: response.length,
      quality_score: selectionResult.score,
      generation_time_ms: endTime - startTime
    };

    // プロンプトログ保存
    await ClaudePromptLogger.logPrompt(promptLogData).catch(error => {
      console.error('プロンプトログ保存エラー:', error);
      // エラーでもワークフローを停止させない
    });

    console.log(`✅ ツイート選択完了: ID=${selectionResult.tweetId}, スコア=${selectionResult.score}/10`);
    console.log(`💡 選択理由: ${selectionResult.reasoning}`);

    return selectionResult;

  } catch (error: any) {
    console.error('❌ ツイート選択エラー:', error);
    
    if (error?.message?.includes('login') || error?.message?.includes('authentication')) {
      throw new Error('Claude CLI認証エラー: "claude login"を実行してください');
    }
    
    // フォールバック: 最初のツイートを返す（緊急時のみ）
    if (params.candidates.length > 0) {
      console.warn('⚠️ Claude選択に失敗、フォールバックで最初の候補を使用');
      const fallbackTweet = params.candidates[0];
      return {
        tweetId: fallbackTweet.id,
        authorId: fallbackTweet.author_id,
        score: MIN_QUALITY_SCORE,
        reasoning: 'Claude選択エラーによるフォールバック選択',
        expectedImpact: 'low'
      };
    }
    
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS - ユーティリティ関数
// ============================================================================

/**
 * 選択パラメータの検証
 */
function validateSelectionParams(params: TweetSelectionParams): void {
  const errors: string[] = [];

  if (!params.candidates || !Array.isArray(params.candidates)) {
    errors.push('candidates配列が必要です');
  }

  if (!['like', 'retweet', 'quote_tweet', 'follow'].includes(params.selectionType)) {
    errors.push('selectionTypeは like, retweet, quote_tweet, follow のいずれかである必要があります');
  }

  if (!params.criteria.topic || typeof params.criteria.topic !== 'string') {
    errors.push('criteria.topicが必要です');
  }

  if (params.criteria.qualityThreshold !== undefined && 
      (params.criteria.qualityThreshold < 0 || params.criteria.qualityThreshold > 10)) {
    errors.push('qualityThresholdは0-10の範囲で指定してください');
  }

  if (errors.length > 0) {
    throw new Error(`パラメータバリデーションエラー: ${errors.join(', ')}`);
  }
}

/**
 * ツイートリスト整形（Token節約機能）
 * プロンプトに含めるツイート情報を最適化して、Claudeへの送信コストを削減
 */
function formatTweetsForPrompt(tweets: TweetCandidate[]): CompactTweetCandidate[] {
  return tweets.map((tweet, index) => {
    // 本文を200文字に制限
    const truncatedText = tweet.text.length > MAX_TEXT_LENGTH 
      ? tweet.text.substring(0, MAX_TEXT_LENGTH) + '...' 
      : tweet.text;

    // 作者名取得ロジックをtweet-search.tsと統一
    const authorName = extractAuthorName(tweet.author_id);

    // 事前に関連性スコアを計算（簡易版）
    const relevanceScore = calculateSimpleRelevanceScore(tweet.text);

    return {
      id: tweet.id,
      text: truncatedText,
      author: authorName,
      metrics: {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count
      },
      relevanceScore
    };
  });
}

/**
 * extractAuthorName - author_id取得ロジック統一
 * tweet-search.tsのロジックと整合性を保つ
 */
function extractAuthorName(authorId: string): string {
  // tweet-search.ts の author_id 取得ロジックと統一
  // 実際の実装は KaitoAPI のレスポンス構造に依存
  return `@${authorId}`; // 簡易版
}

/**
 * 簡易関連性スコア計算
 * より詳細な計算はClaude側で実行
 */
function calculateSimpleRelevanceScore(text: string): number {
  const investmentKeywords = [
    '投資', '資産', '株式', '債券', 'ポートフォリオ', 'リスク', 'リターン',
    '市場', '経済', '金融', 'investment', 'portfolio', 'risk', 'return'
  ];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  for (const keyword of investmentKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }
  
  // 0-10スケールに正規化
  return Math.min(score * 2, 10);
}

/**
 * Claude選択プロンプト構築
 * 効率的なプロンプト構造でトークン使用量を最適化
 */
function buildSelectionPrompt(
  params: TweetSelectionParams, 
  compactCandidates: CompactTweetCandidate[]
): string {
  const selectionBuilder = new SelectionBuilder();
  
  // TweetSelectionParamsをSelectionPromptParamsに変換
  const systemContext = {
    account: {
      followerCount: params.context.userProfile.followerCount,
      postsToday: params.context.userProfile.postsToday,
      engagementRate: params.context.userProfile.engagementRate,
      lastPostTime: params.context.userProfile.lastPostTime
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
      trendingTopics: [],
      volatility: 'medium' as const,
      sentiment: 'neutral' as const
    },
    learningData: params.context.learningData
  };
  
  return selectionBuilder.buildPrompt({
    selectionType: params.selectionType,
    topic: params.criteria.topic,
    candidates: compactCandidates,
    criteria: {
      qualityThreshold: params.criteria.qualityThreshold,
      engagementWeight: params.criteria.engagementWeight,
      relevanceWeight: params.criteria.relevanceWeight
    },
    context: systemContext
  });
}

/**
 * Claudeレスポンス解析（エラーハンドリング強化版）
 * JSON形式のレスポンスをパースして選択結果を構築
 */
function parseClaudeResponse(response: string, originalCandidates: TweetCandidate[]): SelectedTweet {
  try {
    // JSON抽出ロジックの改善
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                     response.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      console.warn('⚠️ Claude レスポンスにJSON形式が見つかりません:', response.substring(0, 200));
      throw new Error('有効なJSON形式が見つかりません');
    }

    // より堅牢なパース処理
    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    // 必須フィールドの検証
    if (!parsed.tweetId || typeof parsed.score !== 'number' || !parsed.reasoning) {
      throw new Error('必須フィールドが不足しています');
    }

    // 選択されたツイートが候補に存在するか確認
    const selectedCandidate = originalCandidates.find(t => t.id === parsed.tweetId);
    if (!selectedCandidate) {
      throw new Error(`指定されたツイートID ${parsed.tweetId} が候補に存在しません`);
    }

    return {
      tweetId: parsed.tweetId,
      authorId: selectedCandidate.author_id,
      score: Math.max(0, Math.min(10, parsed.score)), // 0-10範囲に制限
      reasoning: parsed.reasoning.substring(0, 200), // 理由を200文字に制限
      expectedImpact: ['high', 'medium', 'low'].includes(parsed.expectedImpact) 
        ? parsed.expectedImpact 
        : 'medium'
    };

  } catch (error: any) {
    // 詳細なエラーログ
    console.error('Claude レスポンス解析詳細エラー:', {
      error: error.message,
      responseLength: response.length,
      responseStart: response.substring(0, 100),
      candidateCount: originalCandidates.length
    });
    
    // パースエラーの場合、最初の候補をフォールバックとして使用
    const fallbackTweet = originalCandidates[0];
    return {
      tweetId: fallbackTweet.id,
      authorId: fallbackTweet.author_id,
      score: MIN_QUALITY_SCORE,
      reasoning: 'レスポンス解析エラーによるフォールバック選択',
      expectedImpact: 'low'
    };
  }
}