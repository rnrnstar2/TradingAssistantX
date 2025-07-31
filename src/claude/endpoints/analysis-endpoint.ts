/**
 * 深夜分析エンドポイント - Claude AI による投稿エンゲージメント分析
 * REQUIREMENTS.md準拠版 - エンドポイント別設計（関数ベース実装）
 * 既存のanalysis-builder.tsを活用した深夜分析機能
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { AnalysisResult, SystemContext, PromptLogData } from '../types';
import { AnalysisBuilder } from '../prompts/builders/analysis-builder';
import { ClaudePromptLogger } from '../utils/prompt-logger';

// ============================================================================
// TYPE DEFINITIONS - 型定義
// ============================================================================

/**
 * 投稿エンゲージメントデータ
 * 深夜分析機能への入力型
 */
export interface PostEngagementData {
  posts: Array<{
    id: string;
    text: string;
    timestamp: string;
    metrics: {
      likes: number;
      retweets: number;
      replies: number;
      impressions: number;
    };
    engagementRate: number;
  }>;
  timeframe: string;
  totalPosts: number;
}

// ============================================================================
// CONSTANTS - 定数定義
// ============================================================================

const CLAUDE_TIMEOUT = 60000; // 深夜分析専用60秒タイムアウト
const MIN_CONFIDENCE = 0.1;
const MAX_CONFIDENCE = 1.0;

// ============================================================================
// MAIN ENDPOINT FUNCTION - メインエンドポイント関数
// ============================================================================

/**
 * 投稿エンゲージメント分析エンドポイント
 * 
 * @description 投稿パフォーマンスを分析し、具体的な改善提案を生成します
 * 既存のAnalysisBuilderを活用して効率的な深夜分析を実現
 * 
 * @param engagementData - 投稿エンゲージメントデータ
 * @param context - システムコンテキスト（オプション）
 * @returns 分析結果とメタデータ
 * 
 * @throws {Error} 入力データ検証エラー
 * @throws {Error} Claude API認証エラー
 * @throws {Error} 分析実行エラー
 * 
 * @example
 * ```typescript
 * const analysisResult = await analyzePostEngagement({
 *   posts: [
 *     {
 *       id: '1234567890',
 *       text: '投資初心者向けの基本知識...',
 *       timestamp: '2025-07-30T23:55:00Z',
 *       metrics: { likes: 25, retweets: 8, replies: 3, impressions: 1200 },
 *       engagementRate: 2.8
 *     }
 *   ],
 *   timeframe: '24h',
 *   totalPosts: 1
 * });
 * ```
 * 
 * @since 2025-07-31
 */
export async function analyzePostEngagement(
  engagementData: PostEngagementData,
  context?: SystemContext
): Promise<AnalysisResult> {
  const executionId = context?.executionId || `analysis-${Date.now()}`;
  
  try {
    console.log(`🔍 深夜分析開始: ${engagementData.totalPosts}件の投稿を分析 (${new Date().toLocaleTimeString('ja-JP')})`);
    
    // 入力データ検証
    validateEngagementData(engagementData);
    
    // 分析用プロンプト構築
    const prompt = buildEngagementAnalysisPrompt(engagementData, context);
    
    // プロンプトログデータ準備
    const promptLogData: PromptLogData = {
      prompt_metadata: {
        endpoint: 'analyzePostEngagement',
        timestamp: new Date().toISOString(),
        execution_id: executionId,
        model: 'sonnet',
        timeout: CLAUDE_TIMEOUT
      },
      input_context: {
        total_posts: engagementData.totalPosts,
        timeframe: engagementData.timeframe,
        avg_engagement_rate: calculateAverageEngagement(engagementData.posts),
        total_impressions: engagementData.posts.reduce((sum, post) => sum + post.metrics.impressions, 0)
      },
      system_context: context || getDefaultSystemContext(),
      full_prompt: prompt
    };
    
    // Claude APIを使用して分析実行
    console.log('🤖 Claude分析API呼び出し中...');
    const startTime = Date.now();
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(CLAUDE_TIMEOUT)
      .skipPermissions()
      .query(prompt)
      .asText();
    const endTime = Date.now();
    
    console.log(`⏱️ 分析完了: ${endTime - startTime}ms`);
    
    // レスポンス解析
    const analysisResult = parseAnalysisResponse(response, engagementData);
    
    // レスポンスメタデータを追加
    promptLogData.response_metadata = {
      content_length: response.length,
      quality_score: analysisResult.confidence * 100,
      generation_time_ms: endTime - startTime
    };
    
    // プロンプトログ保存
    await ClaudePromptLogger.logPrompt(promptLogData).catch(error => {
      console.error('プロンプトログ保存エラー:', error);
      // エラーでもワークフローを停止させない
    });
    
    console.log(`✅ 深夜分析完了: 信頼度=${(analysisResult.confidence * 100).toFixed(1)}%`);
    console.log(`💡 主要インサイト: ${analysisResult.insights.length}件`);
    console.log(`📋 改善提案: ${analysisResult.recommendations.length}件`);
    
    return analysisResult;
    
  } catch (error: any) {
    console.error('❌ 深夜分析エラー:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    if (error?.message?.includes('login') || error?.message?.includes('authentication')) {
      throw new Error('Claude CLI認証エラー: "claude login"を実行してください');
    }
    
    throw new Error(`分析実行失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS - ユーティリティ関数
// ============================================================================

/**
 * エンゲージメントデータの検証
 */
function validateEngagementData(data: PostEngagementData): void {
  const errors: string[] = [];
  
  if (!data.posts || !Array.isArray(data.posts)) {
    errors.push('posts配列が必要です');
  } else if (data.posts.length === 0) {
    errors.push('少なくとも1件の投稿データが必要です');
  } else {
    // 各投稿データの検証
    data.posts.forEach((post, index) => {
      if (!post.id || typeof post.id !== 'string') {
        errors.push(`posts[${index}]: idが必要です`);
      }
      if (!post.text || typeof post.text !== 'string') {
        errors.push(`posts[${index}]: textが必要です`);
      }
      if (!post.timestamp || typeof post.timestamp !== 'string') {
        errors.push(`posts[${index}]: timestampが必要です`);
      }
      if (!post.metrics || typeof post.metrics !== 'object') {
        errors.push(`posts[${index}]: metricsが必要です`);
      } else {
        const requiredMetrics = ['likes', 'retweets', 'replies', 'impressions'];
        requiredMetrics.forEach(metric => {
          if (typeof post.metrics[metric as keyof typeof post.metrics] !== 'number') {
            errors.push(`posts[${index}]: metrics.${metric}が必要です`);
          }
        });
      }
      if (typeof post.engagementRate !== 'number') {
        errors.push(`posts[${index}]: engagementRateが必要です`);
      }
    });
  }
  
  if (!data.timeframe || typeof data.timeframe !== 'string') {
    errors.push('timeframeが必要です');
  }
  
  if (typeof data.totalPosts !== 'number' || data.totalPosts < 1) {
    errors.push('totalPostsは1以上の数値が必要です');
  }
  
  if (errors.length > 0) {
    throw new Error(`入力データ検証エラー: ${errors.join(', ')}`);
  }
}

/**
 * 平均エンゲージメント率計算
 */
function calculateAverageEngagement(posts: PostEngagementData['posts']): number {
  if (posts.length === 0) return 0;
  const totalEngagement = posts.reduce((sum, post) => sum + post.engagementRate, 0);
  return Number((totalEngagement / posts.length).toFixed(2));
}

/**
 * 分析用プロンプト構築
 * 既存のAnalysisBuilderパターンを活用
 */
function buildEngagementAnalysisPrompt(
  engagementData: PostEngagementData, 
  context?: SystemContext
): string {
  // エンゲージメント分析専用のプロンプトを構築
  const totalImpressions = engagementData.posts.reduce((sum, post) => sum + post.metrics.impressions, 0);
  const avgEngagement = calculateAverageEngagement(engagementData.posts);
  const topPost = engagementData.posts.reduce((best, current) => 
    current.engagementRate > best.engagementRate ? current : best
  );
  
  // 時間帯情報の取得
  const now = new Date();
  const timeContext = `${now.getHours()}時台（深夜分析実行）`;
  
  let prompt = `あなたは投資教育アカウントの成果分析専門家です。以下の投稿パフォーマンスデータを分析してください。\n\n`;
  
  // アカウント状況を含める
  if (context?.account) {
    prompt += `【アカウント状況】\n`;
    prompt += `・フォロワー数: ${context.account.followerCount}人\n`;
    prompt += `・分析期間の投稿数: ${engagementData.totalPosts}件\n`;
    prompt += `・平均エンゲージメント率: ${context.account.engagementRate.toFixed(1)}%\n\n`;
  }
  
  // 投稿パフォーマンス概要
  prompt += `【分析期間: ${engagementData.timeframe}】\n`;
  prompt += `・総投稿数: ${engagementData.totalPosts}件\n`;
  prompt += `・総インプレッション: ${totalImpressions.toLocaleString()}回\n`;
  prompt += `・平均エンゲージメント率: ${avgEngagement}%\n`;
  prompt += `・最高パフォーマンス投稿: ${topPost.engagementRate}%\n\n`;
  
  // 個別投稿詳細（最大5件まで）
  prompt += `【投稿詳細分析】\n`;
  const postsToAnalyze = engagementData.posts.slice(0, 5);
  postsToAnalyze.forEach((post, index) => {
    prompt += `${index + 1}. ID: ${post.id}\n`;
    prompt += `   内容: "${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}"\n`;
    prompt += `   メトリクス: いいね${post.metrics.likes}, RT${post.metrics.retweets}, 返信${post.metrics.replies}, インプレッション${post.metrics.impressions}\n`;
    prompt += `   エンゲージメント率: ${post.engagementRate}%\n`;
    prompt += `   投稿時刻: ${new Date(post.timestamp).toLocaleString('ja-JP')}\n\n`;
  });
  
  // 市場状況を含める
  if (context?.market) {
    prompt += `【市場コンテキスト】\n`;
    prompt += `・市場センチメント: ${context.market.sentiment === 'bullish' ? '強気' : context.market.sentiment === 'bearish' ? '弱気' : '中立'}\n`;
    prompt += `・ボラティリティ: ${context.market.volatility === 'high' ? '高' : context.market.volatility === 'low' ? '低' : '中'}\n`;
    if (context.market.trendingTopics && context.market.trendingTopics.length > 0) {
      prompt += `・話題のトピック: ${context.market.trendingTopics.join('、')}\n`;
    }
    prompt += '\n';
  }
  
  // 分析指示
  prompt += `【分析要求】\n`;
  prompt += `1. 投稿パフォーマンスの成功要因を特定\n`;
  prompt += `2. エンゲージメントが低かった投稿の改善点を分析\n`;
  prompt += `3. コンテンツタイプ別の効果を評価\n`;
  prompt += `4. 投稿時間帯とパフォーマンスの関係を分析\n`;
  prompt += `5. 具体的で実行可能な改善提案を作成\n\n`;
  
  // 出力形式指定
  prompt += `【出力形式】\n`;
  prompt += `以下のJSON形式で結果を出力してください：\n`;
  prompt += `{\n`;
  prompt += `  "analysisType": "performance",\n`;
  prompt += `  "insights": [\n`;
  prompt += `    "具体的な成功要因や課題の分析結果（3-5件）"\n`;
  prompt += `  ],\n`;
  prompt += `  "recommendations": [\n`;
  prompt += `    "実行可能な具体的改善提案（3-5件）"\n`;
  prompt += `  ],\n`;
  prompt += `  "confidence": 0.85,\n`;
  prompt += `  "metadata": {\n`;
  prompt += `    "dataPoints": ${engagementData.totalPosts},\n`;
  prompt += `    "timeframe": "${engagementData.timeframe}",\n`;
  prompt += `    "generatedAt": "${new Date().toISOString()}"\n`;
  prompt += `  }\n`;
  prompt += `}\n\n`;
  
  prompt += `現在は${timeContext}です。投資教育アカウントとして価値ある分析を提供してください。`;
  
  return prompt;
}

/**
 * 分析レスポンス解析
 */
function parseAnalysisResponse(response: string, originalData: PostEngagementData): AnalysisResult {
  try {
    // JSON抽出ロジック
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                     response.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      console.warn('⚠️ Claude レスポンスにJSON形式が見つかりません:', response.substring(0, 200));
      throw new Error('有効なJSON形式が見つかりません');
    }
    
    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    
    // 必須フィールドの検証
    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      throw new Error('insights配列が必要です');
    }
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('recommendations配列が必要です');
    }
    if (typeof parsed.confidence !== 'number') {
      throw new Error('confidence数値が必要です');
    }
    
    // confidence値の正規化
    const normalizedConfidence = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, parsed.confidence));
    
    return {
      analysisType: 'performance',
      insights: parsed.insights.slice(0, 10).map((insight: string) => insight.substring(0, 200)), // 最大10件、200文字制限
      recommendations: parsed.recommendations.slice(0, 10).map((rec: string) => rec.substring(0, 200)), // 最大10件、200文字制限
      confidence: normalizedConfidence,
      metadata: {
        dataPoints: originalData.totalPosts,
        timeframe: originalData.timeframe,
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error: any) {
    console.error('分析レスポンス解析エラー:', {
      error: error.message,
      responseLength: response.length,
      responseStart: response.substring(0, 100)
    });
    
    // フォールバック分析結果
    return {
      analysisType: 'performance',
      insights: [
        `${originalData.totalPosts}件の投稿を分析しました`,
        `平均エンゲージメント率: ${calculateAverageEngagement(originalData.posts)}%`,
        'レスポンス解析エラーのため詳細分析は利用できません'
      ],
      recommendations: [
        '投稿内容の多様化を検討してください',
        '投稿時間帯の最適化を図ってください',
        '詳細な分析のためにClaude接続を確認してください'
      ],
      confidence: MIN_CONFIDENCE,
      metadata: {
        dataPoints: originalData.totalPosts,
        timeframe: originalData.timeframe,
        generatedAt: new Date().toISOString()
      }
    };
  }
}

/**
 * デフォルトシステムコンテキスト取得
 */
function getDefaultSystemContext(): SystemContext {
  return {
    timestamp: new Date().toISOString(),
    account: {
      followerCount: 1000,
      postsToday: 0,
      engagementRate: 2.5,
      lastPostTime: new Date().toISOString()
    },
    system: {
      health: {
        all_systems_operational: true,
        api_status: 'healthy',
        rate_limits_ok: true
      },
      executionCount: { today: 0, total: 0 }
    },
    learningData: {
      recentTopics: [],
      avgEngagement: 2.5,
      totalPatterns: 0
    },
    market: {
      sentiment: 'neutral',
      volatility: 'medium',
      trendingTopics: []
    }
  };
}