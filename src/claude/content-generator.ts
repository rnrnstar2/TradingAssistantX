/**
 * Claude Code SDK AI駆動投稿内容生成エンジン
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 品質確保付き高品質コンテンツ自動生成
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export interface ContentRequest {
  topic: string;
  context?: any;
  contentType?: 'educational' | 'market_analysis' | 'trending' | 'general';
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  maxLength?: number;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  qualityScore: number;
  metadata: {
    wordCount: number;
    contentType: string;
    generatedAt: string;
  };
}

/**
 * Claude Code SDK AI駆動コンテンツ生成クラス
 * 品質確保機能付き教育的コンテンツ自動生成
 */
export class ContentGenerator {
  private readonly MAX_CONTENT_LENGTH = 280;
  private readonly QUALITY_THRESHOLD = 70;

  constructor() {
    console.log('✅ ContentGenerator initialized - Claude強み活用版');
  }

  /**
   * メインコンテンツ生成メソッド
   * AI駆動品質確保付き生成
   */
  async generatePost(request: ContentRequest): Promise<GeneratedContent> {
    try {
      const {
        topic,
        context,
        contentType = 'educational',
        targetAudience = 'beginner',
        maxLength = this.MAX_CONTENT_LENGTH
      } = request;

      // Claude用プロンプト構築
      const prompt = this.buildContentPrompt(topic, contentType, targetAudience, maxLength, context);
      
      // Claude SDK品質確保付きコンテンツ生成
      const rawContent = await this.generateWithClaudeQualityCheck(prompt);
      
      // 基本品質チェック
      const qualityScore = this.evaluateBasicQuality(rawContent, topic);
      
      if (qualityScore < this.QUALITY_THRESHOLD) {
        console.warn(`Content quality (${qualityScore}) below threshold, regenerating...`);
        return this.generatePost(request); // 再生成
      }

      // ハッシュタグ生成
      const hashtags = this.generateHashtags(topic, contentType);

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
   */
  async generateQuoteComment(originalTweet: any): Promise<string> {
    try {
      const prompt = `投資教育の観点から、以下のツイートに価値を付加する引用コメントを150文字以内で作成してください。

元ツイート: ${originalTweet.content || originalTweet.text}

要件:
- 建設的で教育的な観点
- 投資初心者にも理解しやすい補足
- 具体的で実践的なアドバイス
- 必要に応じてリスク注意点を言及
- 自然な日本語で記述`;

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
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Claude用コンテンツプロンプト構築
   */
  private buildContentPrompt(topic: string, contentType: string, targetAudience: string, maxLength: number, context?: any): string {
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
   * Claude品質確保付きコンテンツ生成
   */
  private async generateWithClaudeQualityCheck(prompt: string): Promise<string> {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();

    return response.trim();
  }

  /**
   * 基本品質評価
   */
  private evaluateBasicQuality(content: string, topic: string): number {
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
   */
  private generateHashtags(topic: string, contentType: string): string[] {
    const baseHashtags = ['#投資教育', '#資産運用'];
    const typeSpecificHashtags = {
      educational: ['#投資初心者'],
      market_analysis: ['#市場分析'],
      trending: ['#投資トレンド'],
      general: ['#投資情報']
    };

    return [...baseHashtags, ...(typeSpecificHashtags[contentType as keyof typeof typeSpecificHashtags] || typeSpecificHashtags.general)];
  }

}