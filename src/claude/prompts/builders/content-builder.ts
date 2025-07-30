import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
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
}