/**
 * コンテンツ生成エンドポイント - Claude強み活用高品質コンテンツ生成
 * REQUIREMENTS.md準拠版 - エンドポイント別設計（関数ベース実装）
 * 既存ContentGeneratorクラスからの機能移行
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ContentInput, GeneratedContent } from '../types';

// ============================================================================
// CONSTANTS - 定数定義
// ============================================================================

const MAX_CONTENT_LENGTH = 280;
const QUALITY_THRESHOLD = 70;
const MAX_RETRIES = 2;
const CLAUDE_TIMEOUT = 15000;

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

    // Claude用プロンプト構築
    const prompt = buildContentPrompt(topic, contentType, targetAudience, maxLength, context);
    
    // Claude SDK品質確保付きコンテンツ生成
    const rawContent = await generateWithClaudeQualityCheck(prompt, topic, qualityThreshold);
    
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
        wordCount: rawContent.length,
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
    const prompt = buildQuoteCommentPrompt(originalTweet);

    const response = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(prompt)
      .asText();

    return response.trim().substring(0, 150);

  } catch (error) {
    console.error('Quote comment generation failed:', error);
    return '参考になる情報ですね。投資は自己責任で行うことが大切です。';
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
  context?: any
): string {
  return `投資教育Xアカウント用の高品質投稿を作成してください。

トピック: ${topic}
コンテンツタイプ: ${contentType}
対象読者: ${targetAudience === 'beginner' ? '投資初心者' : targetAudience}
最大文字数: ${maxLength}文字
${context ? `コンテキスト: ${JSON.stringify(context)}` : ''}

要件:
- 教育的価値が高く、実践的な内容
- ${targetAudience === 'beginner' ? '初心者にも' : ''}理解しやすい表現
- 具体例や数値を含める
- リスク注意点を適切に含める
- エンゲージメントを促進する要素（質問など）
- 日本語で自然な表現

${maxLength}文字以内で投稿内容のみを返してください。`;
}

/**
 * 引用コメント用プロンプト構築
 */
function buildQuoteCommentPrompt(originalTweet: any): string {
  return `投資教育の観点から、以下のツイートに価値を付加する引用コメントを150文字以内で作成してください。

元ツイート: ${originalTweet.content || originalTweet.text}

要件:
- 建設的で教育的な観点
- 投資初心者にも理解しやすい補足
- 具体的で実践的なアドバイス
- 必要に応じてリスク注意点を言及
- 自然な日本語で記述`;
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
  qualityThreshold: number
): Promise<string> {
  let attempts = 0;
  let bestContent = '';
  let bestQuality = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(CLAUDE_TIMEOUT)
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
      attempts++;
    }
  }

  if (bestContent) {
    console.warn(`Quality threshold not met but using best content (quality: ${bestQuality})`);
    return bestContent;
  }

  throw new Error('Content generation failed after all retry attempts');
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