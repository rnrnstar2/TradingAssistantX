import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { ContentGenerationRequest } from '../../types';
import { contentTemplate, quoteCommentTemplate } from '../templates/content.template';

export interface ContentPromptParams {
  topic: string;
  targetAudience: string;
  context: SystemContext;
  maxLength?: number;
  style?: string;
}

export interface QuoteCommentPromptParams {
  originalTweet: {
    content?: string;
    text?: string;
  };
  context: SystemContext;
  maxLength?: number;
}

export class ContentBuilder extends BaseBuilder {
  buildPrompt(params: ContentPromptParams): string {
    const template = contentTemplate;
    
    // 共通変数の注入（BaseBuilderのメソッドを使用）
    let prompt = this.injectCommonVariables(template, params.context);
    
    // コンテンツ専用変数の注入
    prompt = prompt
      .replace(/\${topic}/g, params.topic)
      .replace(/\${audienceDescription}/g, params.targetAudience)
      .replace(/\${maxLength}/g, (params.maxLength || 280).toString())
      .replace(/\${style}/g, params.style || 'educational');
    
    // 学習データ変数の注入
    if (params.context.learningData) {
      prompt = this.injectLearningVariables(prompt, params.context.learningData);
    }
    
    // 市場状況変数の注入
    if (params.context.market) {
      prompt = this.injectMarketVariables(prompt, params.context.market);
    }
    
    return prompt;
  }

  buildContentPrompt(
    request: ContentGenerationRequest,
    context: SystemContext
  ): string {
    const basePrompt = this.buildPrompt({
      topic: request.topic,
      targetAudience: request.targetAudience || 'beginner',
      context: context
    });
    const template = contentTemplate;
    
    // リアルタイムコンテキストの構築
    let realtimeContextSection = '';
    if (context.referenceTweets && context.referenceTweets.length > 0) {
      realtimeContextSection = `
【高エンゲージメント参考ツイート】
${context.referenceTweets.map((tweet, index) => 
  `${index + 1}. (エンゲージメント: ${tweet.qualityScore || 0}) ${tweet.text}`
).join('\n')}

上記の高エンゲージメントツイートを参考に、より魅力的で価値のある投稿を作成してください。
ただし、内容をそのまま真似るのではなく、投資初心者に分かりやすく、独自の視点で価値を提供してください。
`;
    }

    // リアルタイム性を重視した追加指示
    let realtimeInstruction = '';
    if (request.realtimeContext) {
      realtimeInstruction = `
【リアルタイム性重視】
参考ツイートで言及されている最新の市場動向やニュースを踏まえて、
初心者にも分かりやすく解説する投稿を作成してください。
具体的な数値や出来事に言及することで、リアルタイム性を高めてください。
`;
    }

    // カスタム指示の追加
    const customInstruction = context.instruction || '';

    return template
      .replace('{{basePrompt}}', basePrompt)
      .replace('{{topic}}', request.topic)
      .replace('{{contentType}}', this.getContentTypeDescription(request.contentType || 'educational'))
      .replace('{{targetAudience}}', this.getAudienceDescription(request.targetAudience || 'beginner'))
      .replace('{{maxLength}}', (request.maxLength || 140).toString())
      .replace('{{realtimeContext}}', realtimeContextSection)
      .replace('{{realtimeInstruction}}', realtimeInstruction)
      .replace('{{customInstruction}}', customInstruction)
      .replace('{{timeContext}}', this.getTimeContextPrompt(context));
  }

  buildQuoteCommentPrompt(params: QuoteCommentPromptParams): string {
    const template = quoteCommentTemplate;
    
    // 共通変数の注入（BaseBuilderのメソッドを使用）
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 引用コメント専用変数の注入
    const tweetContent = params.originalTweet?.content || params.originalTweet?.text || '（内容なし）';
    prompt = prompt
      .replace(/\${originalTweetContent}/g, tweetContent)
      .replace(/\${maxLength}/g, (params.maxLength || 150).toString());
    
    // 学習データ変数の注入
    if (params.context.learningData) {
      prompt = this.injectLearningVariables(prompt, params.context.learningData);
    }
    
    // 市場状況変数の注入
    if (params.context.market) {
      prompt = this.injectMarketVariables(prompt, params.context.market);
    }
    
    return prompt;
  }

  // ヘルパーメソッド: コンテンツタイプの説明を取得
  private getContentTypeDescription(contentType: string): string {
    const descriptions: Record<string, string> = {
      'educational': '投資の基礎知識や初心者向けの教育的な内容',
      'market_analysis': '現在の市場動向の分析と解説',
      'beginner_tips': '投資初心者向けの実践的なアドバイス',
      'news_commentary': 'ニュースに対する投資視点での解説'
    };
    return descriptions[contentType] || descriptions.educational;
  }

  // ヘルパーメソッド: 対象読者の説明を取得
  private getAudienceDescription(targetAudience: string): string {
    const descriptions: Record<string, string> = {
      'beginner': '投資を始めたばかりの初心者',
      'intermediate': '基礎知識はあるが実践経験が少ない中級者',
      'general': '幅広い投資家層'
    };
    return descriptions[targetAudience] || descriptions.general;
  }

  // ヘルパーメソッド: 時間コンテキストプロンプトを取得
  private getTimeContextPrompt(context: SystemContext): string {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 9) {
      return '朝の時間帯なので、1日のスタートに役立つ前向きな投資情報を提供してください。';
    } else if (hour >= 9 && hour < 15) {
      return '市場時間中なので、リアルタイムの動向を踏まえた実践的な内容にしてください。';
    } else if (hour >= 12 && hour < 14) {
      return '昼休みの時間帯なので、サクッと読めて実践的な内容が好まれます。';
    } else if (hour >= 20 && hour < 22) {
      return '夜の時間帯なので、1日の振り返りと明日への準備に役立つ内容にしてください。';
    }
    
    return '読者の立場に立って、今この時間に価値を感じる情報を提供してください。';
  }
}