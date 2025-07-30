import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { analysisTemplate } from '../templates/analysis.template';

export interface AnalysisPromptParams {
  action: string;
  result: unknown;
  context: SystemContext;
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
}

export class AnalysisBuilder extends BaseBuilder {
  buildPrompt(params: AnalysisPromptParams): string {
    const template = analysisTemplate;
    
    // 共通変数の注入（BaseBuilderのメソッドを使用）
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 分析専用変数の注入
    prompt = prompt
      .replace(/\${action}/g, params.action)
      .replace(/\${result}/g, JSON.stringify(params.result, null, 2));
    
    // メトリクスの注入
    if (params.metrics) {
      const metricsJson = JSON.stringify(params.metrics, null, 2);
      prompt = prompt.replace(/\${metrics}/g, metricsJson);
    } else {
      prompt = prompt.replace(/\${metrics}/g, '{}');
    }
    
    // コンテキストの注入
    const contextJson = JSON.stringify({
      timeOfDay: this.getTimeContext(),
      accountStatus: this.formatAccountStatus(params.context.account),
      market: params.context.market || {}
    }, null, 2);
    prompt = prompt.replace(/\${context}/g, contextJson);
    
    return prompt;
  }
}