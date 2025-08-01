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
    
    // 既存のリアルタイムコンテキスト（検索結果）
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

    // 新規追加：参考アカウントのコンテキスト
    let referenceAccountContextSection = '';
    if (context.referenceAccountTweets && context.referenceAccountTweets.length > 0) {
      referenceAccountContextSection = `
【リアルタイム情報源からの最新ツイート】
${context.referenceAccountTweets.map(account => {
  const latestTweets = account.tweets.slice(0, 3); // 各アカウントから最新3件
  return `
◆ @${account.username}の最新情報:
${latestTweets.map((tweet, idx) => 
  `${idx + 1}. ${tweet.text.substring(0, 150)}${tweet.text.length > 150 ? '...' : ''}`
).join('\n')}`;
}).join('\n')}

上記の信頼できる情報源からの最新情報を踏まえて、
初心者にも分かりやすく、タイムリーで価値のある投稿を作成してください。
具体的な数値や出来事に言及する場合は、情報源を参考にしながら正確に伝えてください。
`;
    }

    // リアルタイム性を重視した追加指示の強化
    let realtimeInstruction = '';
    if (request.realtimeContext || referenceAccountContextSection) {
      realtimeInstruction = `
【リアルタイム性重視】
${referenceAccountContextSection ? '信頼できる情報源の最新ツイートと、' : ''}
${realtimeContextSection ? '高エンゲージメントツイートを参考に、' : ''}
今まさに注目すべき情報を初心者にも分かりやすく解説してください。

重要なポイント：
- 最新の市場動向やニュースに言及する場合は、具体的かつ正確に
- 専門用語は必要最小限にとどめ、使う場合は簡潔な説明を追加
- 情報の鮮度を活かしつつ、教育的価値を提供
- 読者が今すぐ行動できる実践的なアドバイスを含める
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
      .replace('{{referenceAccountContext}}', referenceAccountContextSection)
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
    // 時間帯を意識した内容ではなく、いつでも読める汎用的な内容を生成
    return '投資初心者が今すぐ価値を感じられる情報を、具体的かつ実践的に提供してください。特定の時間やイベント開催を想定した表現（"今夜"、"○時スタート"等）は避け、いつ読んでも有益な内容にしてください。';
  }

  // FX特化メソッド群
  buildFXMarketContext(): string {
    const hour = new Date().getHours();
    const market = this.getActiveMarket(hour);
    
    return `
現在の${market}市場時間帯
主要通貨ペア動向: ${this.getMarketTrends()}
ボラティリティ: ${this.getVolatilityLevel()}
注目イベント: ${this.getUpcomingEvents()}
    `.trim();
  }
  
  buildContrarianAnalysis(insights: any): string {
    if (!insights?.contrarianViews || insights.contrarianViews.length === 0) {
      return '市場のコンセンサスに対する独自の視点を提供';
    }
    
    return `
【逆張り的視点】
${insights.contrarianViews.map((view: string) => `・${view}`).join('\n')}
    `.trim();
  }
  
  buildPredictionVerification(insights: any): string {
    if (!insights?.predictions || insights.predictions.length === 0) {
      return '';
    }
    
    return `
【本日の予測】
${insights.predictions.map((p: any) => 
  `・${p.pair}: ${p.direction === 'up' ? '上昇' : '下落'}目標 ${p.target} (${p.timeframe})`
).join('\n')}
    `.trim();
  }
  
  private getActiveMarket(hour: number): string {
    // JST基準
    if (hour >= 9 && hour < 15) return '東京';
    if (hour >= 16 && hour < 21) return 'ロンドン';
    if (hour >= 21 || hour < 2) return 'ニューヨーク';
    if (hour >= 15 && hour < 16) return '東京-ロンドン重複';
    if (hour >= 21 && hour < 24) return 'ロンドン-NY重複';
    return 'オセアニア';
  }

  private getMarketTrends(): string {
    // 実際の実装では外部データソースから取得
    return 'USD/JPY上昇、EUR/USD下降、GBP/JPY横ばい';
  }

  private getVolatilityLevel(): string {
    // 実際の実装では外部データソースから取得
    return '中程度（通常の1.2倍）';
  }

  private getUpcomingEvents(): string {
    // 実際の実装では外部データソースから取得
    return 'ECB政策発表（21:30）、米雇用統計（明日）';
  }
}