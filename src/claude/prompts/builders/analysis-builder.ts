import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { analysisTemplate } from '../templates/analysis.template';
// TODO: 深夜分析テンプレート - 実装待ち
// import { 
//   deepAnalysisBaseTemplate,
//   ANALYSIS_TYPE_TEMPLATES,
//   DeepAnalysisType
// } from '../templates/deep-analysis.template';

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

// TODO: 深夜分析プロンプトパラメータ - 実装待ち
// export interface DeepAnalysisPromptParams {
//   analysisType: DeepAnalysisType;
//   dailyData: any[];
//   dataContext: {
//     totalActions: number;
//     successRate: number;
//     timeSlots: any;
//     actionTypes: any;
//   };
//   accountMetrics?: any;
//   weeklyTrends?: any;
// }

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

  /**
   * 深夜大規模分析用プロンプトビルダー
   * TODO: 深夜分析機能の実装待ち
   */
  buildDeepAnalysisPrompt(params: any): string {
    throw new Error('Deep analysis prompt builder is not implemented yet');
  }

  /**
   * 深夜分析データコンテキストの構築ヘルパー
   * TODO: 深夜分析機能の実装待ち
   */
  buildDataContext(dailyData: any[]): any {
    throw new Error('Deep analysis data context builder is not implemented yet');
  }

  /**
   * 時間帯別サマリー取得
   */
  private getTimeSlotSummary(dailyData: any[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    dailyData.forEach(data => {
      const hour = new Date(data.timestamp).getHours();
      const slot = this.getTimeSlotFromHour(hour);
      summary[slot] = (summary[slot] || 0) + 1;
    });
    
    return summary;
  }

  /**
   * アクションタイプ別サマリー取得
   */
  private getActionTypeSummary(dailyData: any[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    dailyData.forEach(data => {
      const action = data.action || 'unknown';
      summary[action] = (summary[action] || 0) + 1;
    });
    
    return summary;
  }

  /**
   * 時間から時間帯を取得
   */
  private getTimeSlotFromHour(hour: number): string {
    if (hour >= 6 && hour < 10) return '早朝(6-10時)';
    if (hour >= 10 && hour < 14) return '午前(10-14時)';
    if (hour >= 14 && hour < 18) return '午後(14-18時)';
    if (hour >= 18 && hour < 22) return '夜間(18-22時)';
    return '深夜(22-6時)';
  }
}