/**
 * コンテンツ生成エンドポイント - Claude強み活用高品質コンテンツ生成
 * REQUIREMENTS.md準拠版 - エンドポイント別設計（関数ベース実装）
 * 既存ContentGeneratorクラスからの機能移行
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ContentInput, GeneratedContent, SystemContext } from '../types';
import { ContentBuilder } from '../prompts/builders/content-builder';

// 警告表示フラグ（初回のみ表示）
let devModeWarningShown = false;

// テスト環境かどうかを判定
const isTestEnvironment = process.env.NODE_ENV === 'test';

// ============================================================================
// CONSTANTS - 定数定義
// ============================================================================

const MAX_CONTENT_LENGTH = 140; // TwitterAPIの実際の制限に合わせて140文字に制限
const QUALITY_THRESHOLD = 70;
const MAX_RETRIES = 2;
const CLAUDE_TIMEOUT = 15000;

// ============================================================================
// UTILITY FUNCTIONS - ユーティリティ関数
// ============================================================================

/**
 * Twitter文字数計算（絵文字対応）- KaitoAPIと統一
 */
function calculateTwitterLength(text: string): number {
  // 絵文字を2文字としてカウント
  // KaitoAPIのgetTwitterTextLengthと同じロジックを使用
  let length = 0;
  const chars = Array.from(text);
  
  for (const char of chars) {
    // 絵文字判定
    const codePoint = char.codePointAt(0) || 0;
    
    // 絵文字範囲（KaitoAPIと同じ判定）
    if (
      (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) || // Misc Symbols and Pictographs
      (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Misc symbols
      (codePoint >= 0x2700 && codePoint <= 0x27BF) ||   // Dingbats
      (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
      (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols
      char === '✅' || char === '💪' || char === '📈' || char === '🌅' // 特定の絵文字
    ) {
      length += 2; // 絵文字は2文字としてカウント
    } else {
      length += 1;
    }
  }
  
  return length;
}

/**
 * Twitter文字数制限に合わせてコンテンツを短縮
 */
function truncateForTwitter(content: string): string {
  const maxLength = MAX_CONTENT_LENGTH - 5; // 安全マージンを含めて155文字
  
  if (calculateTwitterLength(content) <= maxLength) {
    return content;
  }
  
  // 行ごとに分割して処理
  const lines = content.split('\n');
  let result = '';
  
  for (const line of lines) {
    const testResult = result + (result ? '\n' : '') + line;
    if (calculateTwitterLength(testResult) <= maxLength) {
      result = testResult;
    } else {
      // この行を追加すると制限を超える場合
      if (result) {
        // 既存の内容があれば、そこで終了
        break;
      } else {
        // 最初の行が長い場合、短縮して追加
        const segments = Array.from(line);
        let truncatedLine = '';
        
        for (const char of segments) {
          const testLine = truncatedLine + char;
          if (calculateTwitterLength(testLine) <= maxLength - 3) { // "..." の分を考慮
            truncatedLine = testLine;
          } else {
            break;
          }
        }
        
        result = truncatedLine + '...';
        break;
      }
    }
  }
  
  return result || content.substring(0, 250) + '...'; // フォールバック
}

// ============================================================================
// ERROR HANDLING - エラーハンドリング
// ============================================================================

/**
 * Claude SDKの認証状態をチェック
 */
async function checkClaudeAuthentication(): Promise<boolean> {
  try {
    console.log('🔍 Claude SDKチェック開始...');
    
    // SDKを使用してテスト
    const testResponse = await claude()
      .withModel('sonnet') // エイリアスを使用
      .withTimeout(10000)
      .skipPermissions()
      .query('Hello')
      .asText();
    
    console.log('✅ Claude SDKチェック成功');
    return !!testResponse;
  } catch (error: any) {
    console.error('❌ Claude SDK認証エラー:', error);
    console.error('Error message:', error?.message);
    return false;
  }
}



// ============================================================================
// MAIN ENDPOINT FUNCTIONS - メインエンドポイント関数
// ============================================================================

/**
 * コンテンツ生成エンドポイント - Claude強み活用高品質コンテンツ生成
 * ContentGenerator.generatePost()からの機能移行
 */
export async function generateContent(input: ContentInput): Promise<GeneratedContent> {
  try {
    const {
      request,
      context,
      qualityThreshold = QUALITY_THRESHOLD
    } = input;

    const {
      topic,
      contentType = 'educational',
      targetAudience = 'beginner',
      maxLength = MAX_CONTENT_LENGTH
    } = request;

    // 入力検証
    const validContentTypes = ['educational', 'market_analysis', 'trending', 'announcement', 'reply'];
    if (!validContentTypes.includes(contentType)) {
      throw new Error(`Invalid contentType: ${contentType}. Valid types are: ${validContentTypes.join(', ')}`);
    }

    // Claude用プロンプト構築
    const prompt = buildContentPrompt(topic, contentType, targetAudience, maxLength, context);
    
    // Claude SDK品質確保付きコンテンツ生成
    let rawContent = await generateWithClaudeQualityCheck(prompt, topic, contentType, qualityThreshold);
    
    // Twitter文字数制限チェックと自動短縮
    const twitterLength = calculateTwitterLength(rawContent);
    if (twitterLength > MAX_CONTENT_LENGTH) {
      console.warn(`⚠️ コンテンツが長すぎます (${twitterLength}文字 > ${MAX_CONTENT_LENGTH}文字) - 自動短縮中...`);
      rawContent = truncateForTwitter(rawContent);
      console.log(`✅ 短縮完了: ${calculateTwitterLength(rawContent)}文字`);
    }
    
    // 基本品質チェック
    const qualityScore = evaluateBasicQuality(rawContent, topic);
    
    if (qualityScore < qualityThreshold) {
      console.warn(`Content quality (${qualityScore}) below threshold, regenerating...`);
      return generateContent(input); // 再生成
    }

    // ハッシュタグ生成
    const hashtags = generateHashtags(topic, contentType);

    return {
      content: rawContent,
      hashtags,
      qualityScore,
      metadata: {
        wordCount: calculateTwitterLength(rawContent), // Twitter文字数カウント
        contentType,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Content generation failed:', error);
    throw error; // 品質確保のため、失敗時は素直にエラーを投げる
  }
}

/**
 * 引用ツイート用コメント生成
 * ContentGenerator.generateQuoteComment()からの機能移行
 */
export async function generateQuoteComment(originalTweet: any): Promise<string> {
  try {
    // モック機能を削除 - 常に実際のClaude APIを使用
    
    const prompt = buildQuoteCommentPrompt(originalTweet);

    const response = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(prompt)
      .asText();

    return response.trim().substring(0, 150);

  } catch (error) {
    console.error('Quote comment generation failed:', error);
    
    if ((error as any)?.message?.includes('login') || (error as any)?.message?.includes('authentication')) {
      throw new Error('Claude CLI認証エラー: "claude login"を実行してください');
    }
    
    // 認証エラーの場合はエラーを投げる
    throw new Error('Claude CLI認証が必要です。claude loginを実行してください。');
  }
}

// ============================================================================
// PROMPT BUILDING FUNCTIONS - プロンプト構築機能
// ============================================================================

/**
 * Claude用コンテンツプロンプト構築
 * ContentGenerator.buildContentPrompt()からの機能移行
 */
function buildContentPrompt(
  topic: string, 
  contentType: string, 
  targetAudience: string, 
  maxLength: number, 
  context?: SystemContext
): string {
  const audienceDescription = targetAudience === 'beginner' ? '投資初心者' : targetAudience;
  
  // 時間帯情報の取得
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  
  // 時間帯に応じた挨拶やトーン
  const timeContext = 
    hour < 6 ? '早朝' :
    hour < 10 ? '朝' :
    hour < 12 ? '午前中' :
    hour < 14 ? '昼' :
    hour < 17 ? '午後' :
    hour < 20 ? '夕方' :
    '夜';
  
  // プロンプト構築
  let prompt = `あなたは投資教育の専門家です。現在は${dayOfWeek}曜日の${timeContext}（${hour}時台）です。\n\n`;
  
  // アカウント状況を含める
  if (context?.account) {
    prompt += `【アカウント状況】\n`;
    prompt += `・フォロワー数: ${context.account.followerCount}人\n`;
    prompt += `・本日の投稿数: ${context.account.postsToday}回\n`;
    prompt += `・平均エンゲージメント率: ${context.account.engagementRate.toFixed(1)}%\n`;
    
    if (context.account.lastPostTime) {
      const lastPostHours = Math.floor((now.getTime() - new Date(context.account.lastPostTime).getTime()) / (1000 * 60 * 60));
      prompt += `・前回投稿から: ${lastPostHours}時間経過\n`;
    }
    prompt += '\n';
  }
  
  // 学習データを含める
  if (context?.learningData) {
    prompt += `【過去の成功パターン】\n`;
    if (context.learningData.recentTopics && context.learningData.recentTopics.length > 0) {
      prompt += `・最近高評価だったトピック: ${context.learningData.recentTopics.join('、')}\n`;
    }
    if (context.learningData.avgEngagement) {
      prompt += `・最近の平均エンゲージメント: ${context.learningData.avgEngagement.toFixed(1)}%\n`;
    }
    prompt += '\n';
  }
  
  // 市場状況を含める
  if (context?.market) {
    prompt += `【市場状況】\n`;
    prompt += `・市場センチメント: ${context.market.sentiment === 'bullish' ? '強気' : context.market.sentiment === 'bearish' ? '弱気' : '中立'}\n`;
    prompt += `・ボラティリティ: ${context.market.volatility === 'high' ? '高' : context.market.volatility === 'low' ? '低' : '中'}\n`;
    if (context.market.trendingTopics && context.market.trendingTopics.length > 0) {
      prompt += `・話題のトピック: ${context.market.trendingTopics.join('、')}\n`;
    }
    prompt += '\n';
  }
  
  // メインの指示
  prompt += `「${topic}」について、${audienceDescription}向けに価値ある情報を${maxLength}文字以内で投稿してください。\n\n`;
  
  // 時間帯別の投稿ガイドライン
  if (hour < 10) {
    prompt += `朝の時間帯なので、1日のスタートに役立つ情報や、前向きなメッセージを含めても良いでしょう。\n`;
  } else if (hour >= 12 && hour < 14) {
    prompt += `昼休みの時間帯なので、サクッと読めて実践的な内容が好まれます。\n`;
  } else if (hour >= 20) {
    prompt += `夜の時間帯なので、1日の振り返りや、明日に向けた準備に関する内容も良いでしょう。\n`;
  }
  
  // 週末の特別な配慮
  if (dayOfWeek === '土' || dayOfWeek === '日') {
    prompt += `週末なので、じっくり学習できる内容や、来週に向けた準備の話題も適しています。\n`;
  }
  
  prompt += `\n読者の立場に立って、今この時間に価値を感じる情報を自然で親しみやすい文章で伝えてください。読みやすさのため適切に改行を入れて、${maxLength}文字以内で投稿内容のみを返してください。`;
  
  return prompt;
}

/**
 * 引用コメント用プロンプト構築（ビルダーパターンを使用）
 */
function buildQuoteCommentPrompt(originalTweet: any): string {
  const builder = new ContentBuilder();
  return builder.buildQuoteCommentPrompt({
    originalTweet: originalTweet,
    context: getSystemContextForContent(),
    maxLength: 150
  });
}

// ============================================================================
// CLAUDE SDK EXECUTION - Claude SDK実行・品質確保
// ============================================================================

/**
 * Claude品質確保付きコンテンツ生成
 * ContentGenerator.generateWithClaudeQualityCheck()からの機能移行
 */
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  contentType: string,
  qualityThreshold: number
): Promise<string> {
  // 開発モードも常に実際のClaude APIを使用
  console.log(`🎯 コンテンツ生成開始: ${topic} (${new Date().toLocaleTimeString('ja-JP')})`);
  // モック機能を削除 - 常に実際のClaude APIを使用

  // モック機能を削除 - 常に実際Claude APIを使用

  // 認証チェック
  const isAuthenticated = await checkClaudeAuthentication();
  if (!isAuthenticated) {
    console.error('⚠️ Claude CLI認証が必要です。"claude login"を実行してください。');
    throw new Error('Claude CLI認証が必要です。claude loginを実行してください。');
  }

  let attempts = 0;
  let bestContent = '';
  let bestQuality = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // SDKを使用してコンテンツ生成
      console.log('🤖 Claude SDK呼び出し中...');
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(CLAUDE_TIMEOUT)
        .skipPermissions()
        .query(prompt)
        .asText();

      const content = response.trim();
      const quality = evaluateBasicQuality(content, topic);

      if (quality >= qualityThreshold) {
        return content;
      }

      if (quality > bestQuality) {
        bestContent = content;
        bestQuality = quality;
      }

      attempts++;
      console.warn(`Quality score ${quality} below threshold ${qualityThreshold}, regenerating (${attempts}/${MAX_RETRIES})`);

    } catch (error) {
      console.error(`Generation attempt ${attempts + 1} failed:`, error);
      console.error('Error details:', {
        message: (error as any)?.message,
        exitCode: (error as any)?.exitCode,
        code: (error as any)?.code,
        stack: (error as any)?.stack?.split('\n').slice(0, 5).join('\n')
      });
      
      // SDKエラーの詳細を表示
      if ((error as any)?.exitCode === 1) {
        console.error('❌ Claude SDK subprocess exited with code 1');
        console.error('Possible causes:');
        console.error('- Claude CLI is not authenticated (run: claude login)');
        console.error('- Invalid model name');
        console.error('- SDK subprocess issues');
        throw error; // エラーをそのまま投げる
      } else if ((error as any)?.message?.includes('timeout')) {
        console.warn('タイムアウトエラー、再試行します...');
      }
      
      attempts++;
    }
  }

  if (bestContent) {
    console.warn(`Quality threshold not met but using best content (quality: ${bestQuality})`);
    return bestContent;
  }

  // 最終的なフォールバック
  console.error('ℹ️ コンテンツ生成に失敗しました');
  throw new Error('コンテンツ生成に失敗しました。Claude CLIの認証を確認してください。');
}

// ============================================================================
// QUALITY EVALUATION & HASHTAG GENERATION - 品質評価・ハッシュタグ生成
// ============================================================================

/**
 * 基本品質評価
 * ContentGenerator.evaluateBasicQuality()からの機能移行
 */
function evaluateBasicQuality(content: string, topic: string): number {
  let score = 60; // ベーススコア

  // 文字数適正性
  if (content.length >= 50 && content.length <= 280) score += 15;
  
  // トピック関連性
  if (content.includes(topic) || content.includes('投資') || content.includes('資産')) score += 15;
  
  // 教育的要素
  if (content.includes('初心者') || content.includes('基本') || content.includes('注意')) score += 10;
  
  return Math.min(score, 100);
}

/**
 * ハッシュタグ生成
 * ContentGenerator.generateHashtags()からの機能移行
 */
function generateHashtags(topic: string, contentType: string): string[] {
  const baseHashtags = ['#投資教育', '#資産運用'];
  const typeSpecificHashtags = {
    educational: ['#投資初心者'],
    market_analysis: ['#市場分析'],
    trending: ['#投資トレンド'],
    general: ['#投資情報']
  };

  return [...baseHashtags, ...(typeSpecificHashtags[contentType as keyof typeof typeSpecificHashtags] || typeSpecificHashtags.general)];
}

/**
 * コンテンツ生成用SystemContext取得関数
 */
function getSystemContextForContent(): SystemContext {
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