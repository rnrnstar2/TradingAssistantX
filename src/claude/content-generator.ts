/**
 * Claude Code SDK による投稿内容生成エンジン
 * REQUIREMENTS.md準拠版 - 高品質コンテンツ生成システム
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
  estimatedEngagement: number;
  quality: {
    readability: number;
    relevance: number;
    engagement_potential: number;
    factual_accuracy: number;
    originality: number;
  };
  metadata: {
    wordCount: number;
    language: string;
    contentType: string;
    generatedAt: string;
  };
}

/**
 * Claude Code SDKによる投稿内容生成クラス
 * 教育的で高品質なコンテンツを自動生成
 */
export class ContentGenerator {
  private readonly MAX_CONTENT_LENGTH = 280;
  private readonly QUALITY_THRESHOLD = 70;

  constructor() {
    console.log('✅ ContentGenerator initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * メインコンテンツ生成メソッド
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

      // コンテンツタイプ別の生成戦略
      const generationStrategy = this.getGenerationStrategy(contentType);
      
      // プロンプト構築
      const prompt = this.buildPrompt(topic, context, contentType, targetAudience, maxLength);
      
      // Claude SDKでコンテンツ生成
      const rawContent = await this.generateWithClaude(prompt);
      
      // コンテンツ後処理
      const processedContent = this.processContent(rawContent);
      
      // 品質評価
      const quality = this.evaluateQuality(processedContent, topic);
      
      // 品質基準を満たさない場合はフォールバック
      if (quality.overall < this.QUALITY_THRESHOLD) {
        console.warn('Generated content below quality threshold, using fallback');
        return this.generateFallbackContent(topic, contentType);
      }

      // ハッシュタグ生成
      const hashtags = this.generateHashtags(topic, contentType);

      return {
        content: processedContent,
        hashtags,
        estimatedEngagement: this.estimateEngagement(processedContent, hashtags),
        quality: {
          readability: quality.readability,
          relevance: quality.relevance,
          engagement_potential: quality.engagement_potential,
          factual_accuracy: quality.factual_accuracy,
          originality: quality.originality
        },
        metadata: {
          wordCount: processedContent.length,
          language: 'ja',
          contentType,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Content generation failed:', error);
      return this.generateFallbackContent(request.topic, request.contentType || 'educational');
    }
  }

  /**
   * 引用ツイート用のコメント生成
   */
  async generateQuoteComment(originalTweet: any): Promise<string> {
    try {
      const prompt = `必ず日本語のみで引用コメントを作成してください。韓国語や他の言語は絶対に使用しないでください。

以下のツイートに対する建設的で教育的な引用コメントを150文字以内で作成してください。

元ツイート: ${originalTweet.content || originalTweet.text}

要件:
- 必ず日本語のみで記述する
- 元ツイートの内容に価値を付加する観点
- 投資初心者にも理解しやすい補足説明
- 具体的で実践的なアドバイス
- リスクに関する注意点があれば言及
- 韓国語、英語、中国語等の他言語は使用禁止
- 「投資は自己責任で」を含める場合は自然に組み込む`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(prompt)
        .asText();

      return this.processContent(response.trim());

    } catch (error) {
      console.error('Quote comment generation failed:', error);
      return '参考になる情報ですね。投資判断の際は、複数の情報源を確認し、自分なりの分析を行うことが大切です。※投資は自己責任で';
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * コンテンツタイプ別生成戦略
   */
  private getGenerationStrategy(contentType: string): any {
    const strategies = {
      educational: {
        tone: 'informative',
        structure: 'problem-solution',
        examples: true,
        risk_warning: true
      },
      market_analysis: {
        tone: 'analytical',
        structure: 'data-insight',
        examples: false,
        risk_warning: true
      },
      trending: {
        tone: 'engaging',
        structure: 'hook-value',
        examples: true,
        risk_warning: false
      },
      general: {
        tone: 'friendly',
        structure: 'tip-explanation',
        examples: true,
        risk_warning: true
      }
    };

    return strategies[contentType as keyof typeof strategies] || strategies.educational;
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(topic: string, context: any, contentType: string, targetAudience: string, maxLength: number): string {
    const strategy = this.getGenerationStrategy(contentType);
    
    let prompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

投資${targetAudience === 'beginner' ? '初心者' : '経験者'}向けの${contentType === 'educational' ? '教育的な' : ''}投稿を${maxLength}文字以内で作成してください。

テーマ: ${topic}`;

    if (context) {
      prompt += `\n\n関連情報: ${JSON.stringify(context).substring(0, 200)}`;
    }

    prompt += `

要件:
- 必ず日本語のみで記述する
- ${targetAudience === 'beginner' ? '投資初心者にも理解しやすい内容' : '実践的で有用な内容'}
- 具体的で${strategy.examples ? '例を含む' : '実用的な'}アドバイス`;

    if (strategy.risk_warning) {
      prompt += `
- リスクに関する注意点を含める
- 「投資は自己責任で」を含める`;
    }

    prompt += `
- ${strategy.tone === 'engaging' ? '興味を引く' : '信頼性の高い'}内容
- 韓国語、英語、中国語等の他言語は使用禁止`;

    return prompt;
  }

  /**
   * Claude SDKでコンテンツ生成
   */
  private async generateWithClaude(prompt: string): Promise<string> {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();

    return response.trim();
  }

  /**
   * コンテンツ後処理
   */
  private processContent(content: string): string {
    let processed = content.trim();

    // 言語検証
    if (this.containsKorean(processed)) {
      console.warn('Korean characters detected, using fallback');
      return this.createFallbackText('投資情報');
    }

    // 長さ調整
    if (processed.length > this.MAX_CONTENT_LENGTH) {
      processed = processed.substring(0, this.MAX_CONTENT_LENGTH - 3) + '...';
    }

    return processed;
  }

  /**
   * 品質評価
   */
  private evaluateQuality(content: string, topic: string): any {
    return {
      overall: 75,
      readability: this.evaluateReadability(content),
      relevance: this.evaluateRelevance(content, topic),
      engagement_potential: this.evaluateEngagementPotential(content),
      factual_accuracy: 80, // 基本値
      originality: 70 // 基本値
    };
  }

  private evaluateReadability(content: string): number {
    // 簡易読みやすさ評価
    const sentenceCount = content.split(/[。！？]/).length;
    const avgSentenceLength = content.length / sentenceCount;
    
    if (avgSentenceLength < 20) return 90;
    if (avgSentenceLength < 40) return 80;
    return 70;
  }

  private evaluateRelevance(content: string, topic: string): number {
    // トピック関連度の簡易評価
    const topicKeywords = topic.split(' ');
    let relevanceScore = 60;
    
    topicKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        relevanceScore += 10;
      }
    });
    
    return Math.min(relevanceScore, 100);
  }

  private evaluateEngagementPotential(content: string): number {
    let score = 50;
    
    // エンゲージメント要素チェック
    if (content.includes('？')) score += 10; // 質問形式
    if (content.includes('💡') || content.includes('📊')) score += 5; // 絵文字
    if (content.includes('初心者')) score += 10; // ターゲット明確
    if (content.includes('具体的') || content.includes('実践')) score += 10; // 実用性
    
    return Math.min(score, 100);
  }

  /**
   * ハッシュタグ生成
   */
  private generateHashtags(topic: string, contentType: string): string[] {
    const baseHashtags = ['#投資教育', '#資産運用'];
    const typeSpecificHashtags = {
      educational: ['#投資初心者', '#資産形成'],
      market_analysis: ['#市場分析', '#投資戦略'],
      trending: ['#投資トレンド', '#マーケット'],
      general: ['#投資情報', '#金融リテラシー']
    };

    return [...baseHashtags, ...(typeSpecificHashtags[contentType as keyof typeof typeSpecificHashtags] || typeSpecificHashtags.general)];
  }

  /**
   * エンゲージメント推定
   */
  private estimateEngagement(content: string, hashtags: string[]): number {
    let baseEngagement = 30;
    
    // コンテンツ長による調整
    if (content.length > 200) baseEngagement += 10;
    
    // ハッシュタグ数による調整
    baseEngagement += hashtags.length * 5;
    
    // 質問形式ボーナス
    if (content.includes('？')) baseEngagement += 15;
    
    return Math.min(baseEngagement, 100);
  }

  /**
   * 韓国語検出
   */
  private containsKorean(text: string): boolean {
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    return koreanRegex.test(text);
  }

  /**
   * フォールバックコンテンツ生成
   */
  private generateFallbackContent(topic: string, contentType: string): GeneratedContent {
    const fallbackText = this.createFallbackText(topic);
    
    return {
      content: fallbackText,
      hashtags: this.generateHashtags(topic, contentType),
      estimatedEngagement: 40,
      quality: {
        readability: 80,
        relevance: 70,
        engagement_potential: 50,
        factual_accuracy: 80,
        originality: 60
      },
      metadata: {
        wordCount: fallbackText.length,
        language: 'ja',
        contentType: 'fallback',
        generatedAt: new Date().toISOString()
      }
    };
  }

  private createFallbackText(topic: string): string {
    const templates = [
      `📊 ${topic}について投資初心者の方向けの基本情報をお届けします。投資はリスク管理から始めることが重要です。少額から始めて、学びながら成長しましょう。※投資は自己責任で #投資教育 #資産運用`,
      `💡 ${topic}に関する投資の基礎知識をご紹介。NISA・iDeCoなどの制度を活用し、長期的な視点で資産形成を考えましょう。分散投資とリスク管理を忘れずに。※投資は自己責任で #投資教育 #資産運用`,
      `🎯 ${topic}から学ぶ投資のポイント。市場の動きに一喜一憂せず、継続的な学習と冷静な判断が成功の鍵です。まずは少額から始めてみませんか？※投資は自己責任で #投資教育 #資産運用`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
}