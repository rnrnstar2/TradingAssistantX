/**
 * Claude Code SDK プロンプト構築専門モジュール
 * REQUIREMENTS.md準拠版 - プロンプト構築機能の疎結合実装
 * content-generator.tsから分離されたプロンプト構築機能
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export interface PromptConfig {
  contentType: string;
  targetAudience: string;
  maxLength: number;
  includeRiskWarning: boolean;
}

export interface GenerationStrategy {
  tone: 'informative' | 'analytical' | 'engaging' | 'friendly';
  structure: 'problem-solution' | 'data-insight' | 'hook-value' | 'tip-explanation';
  examples: boolean;
  risk_warning: boolean;
}

export interface TrendAnalysis {
  relevantTrends: any[];
  opportunityScore: number;
  recommendedAngle: 'trend_focused' | 'educational';
  trendKeywords: string[];
}

export interface CompetitorInsights {
  commonThemes: string[];
  gapAreas: string[];
  recommendedDifferentiation: string;
}

/**
 * プロンプト構築専門クラス
 * 各種プロンプト生成、戦略決定、トレンド分析を担当
 */
export class PromptBuilder {
  private readonly MAX_CONTENT_LENGTH = 280;

  constructor() {
    console.log('✅ PromptBuilder initialized - プロンプト構築専門モジュール');
  }

  /**
   * メインプロンプト構築
   * コンテンツタイプ、ターゲット、制約に基づくプロンプト生成
   */
  buildPrompt(topic: string, context: any, config: PromptConfig): string {
    const strategy = this.getGenerationStrategy(config.contentType);
    
    let prompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

投資${config.targetAudience === 'beginner' ? '初心者' : '経験者'}向けの${config.contentType === 'educational' ? '教育的な' : ''}投稿を${config.maxLength}文字以内で作成してください。

テーマ: ${topic}`;

    if (context) {
      prompt += `\n\n関連情報: ${JSON.stringify(context).substring(0, 200)}`;
    }

    prompt += `

要件:
- 必ず日本語のみで記述する
- ${config.targetAudience === 'beginner' ? '投資初心者にも理解しやすい内容' : '実践的で有用な内容'}
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
   * 生成戦略決定
   * コンテンツタイプに応じた最適な生成戦略を返却
   */
  private getGenerationStrategy(contentType: string): GenerationStrategy {
    const strategies = {
      educational: {
        tone: 'informative' as const,
        structure: 'problem-solution' as const,
        examples: true,
        risk_warning: true
      },
      market_analysis: {
        tone: 'analytical' as const,
        structure: 'data-insight' as const,
        examples: false,
        risk_warning: true
      },
      trending: {
        tone: 'engaging' as const,
        structure: 'hook-value' as const,
        examples: true,
        risk_warning: false
      },
      general: {
        tone: 'friendly' as const,
        structure: 'tip-explanation' as const,
        examples: true,
        risk_warning: true
      }
    };

    return strategies[contentType as keyof typeof strategies] || strategies.educational;
  }

  /**
   * トレンド機会分析
   * トレンドトピックからコンテンツ機会を分析
   */
  analyzeTrendOpportunity(trendingTopics: any[], topic: string): TrendAnalysis {
    const relevantTrends = trendingTopics.filter(trend => 
      trend.topic && (
        trend.topic.includes(topic) ||
        trend.topic.includes('投資') ||
        trend.topic.includes('株式') ||
        trend.topic.includes('仮想通貨')
      )
    );

    return {
      relevantTrends,
      opportunityScore: relevantTrends.length * 20,
      recommendedAngle: relevantTrends.length > 0 ? 'trend_focused' : 'educational',
      trendKeywords: relevantTrends.map(t => t.topic).slice(0, 3)
    };
  }

  /**
   * 最適化コンテンツ統合
   * トレンド分析と人気コンテンツを統合した最適化プロンプト生成
   */
  async synthesizeOptimizedContent(topic: string, trendAnalysis: TrendAnalysis, popularContent: any[]): Promise<string> {
    try {
      const trendKeywords = trendAnalysis.trendKeywords.join('、');
      const popularElements = this.extractPopularElements(popularContent);

      const optimizedPrompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

以下の情報を活用して、${topic}に関する投稿を280文字以内で作成してください。

トレンドキーワード: ${trendKeywords}
人気要素: ${popularElements}

要件:
- 必ず日本語のみで記述する
- トレンドを自然に組み込む
- 教育的価値を保つ
- 投資初心者にも理解しやすい内容
- リスクに関する注意点を含める
- 韓国語、英語、中国語等の他言語は使用禁止
- 「※投資は自己責任で」を含める`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(optimizedPrompt)
        .asText();

      return this.processOptimizedContent(response.trim());

    } catch (error) {
      console.error('❌ 最適化コンテンツ統合エラー:', error);
      throw error;
    }
  }

  /**
   * 差別化コンテンツ作成
   * 競合分析結果に基づく独自性のあるコンテンツプロンプト生成
   */
  async createDifferentiatedContent(competitorAnalysis: any[]): Promise<string> {
    try {
      const competitorInsights = this.analyzeCompetitorInsights(competitorAnalysis);

      const differentiationPrompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

競合分析結果を踏まえて、差別化された投資教育コンテンツを280文字以内で作成してください。

競合の特徴: ${competitorInsights.commonThemes.join('、')}
差別化ポイント: ${competitorInsights.gapAreas.join('、')}

要件:
- 必ず日本語のみで記述する
- 競合とは異なる視点を提供
- 実践的で具体的なアドバイス
- 投資初心者向けの教育的内容
- リスク管理の重要性を含める
- 韓国語、英語、中国語等の他言語は使用禁止
- 「※投資は自己責任で」を含める`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(differentiationPrompt)
        .asText();

      return this.processOptimizedContent(response.trim());

    } catch (error) {
      console.error('❌ 差別化コンテンツ作成エラー:', error);
      throw error;
    }
  }

  /**
   * 人気要素抽出
   * 人気コンテンツから共通要素を抽出
   */
  private extractPopularElements(popularContent: any[]): string {
    if (!popularContent || popularContent.length === 0) {
      return '実践的な投資アドバイス';
    }

    const elements = popularContent.slice(0, 3).map(content => {
      if (content.text && content.text.length > 20) {
        return content.text.substring(0, 20) + '...';
      }
      return '投資関連情報';
    });

    return elements.join('、');
  }

  /**
   * 競合洞察分析
   * 競合分析データから差別化ポイントを抽出
   */
  private analyzeCompetitorInsights(competitorAnalysis: any[]): CompetitorInsights {
    const commonThemes = ['技術分析', '基本分析', 'リスク管理'];
    const gapAreas = ['初心者向け解説', '実践的手法', '心理的アスペクト'];

    return {
      commonThemes,
      gapAreas,
      recommendedDifferentiation: '初心者向けの実践的な投資心理学'
    };
  }

  /**
   * 最適化コンテンツ後処理
   * 生成されたコンテンツの品質確認と調整
   */
  private processOptimizedContent(content: string): string {
    let processed = content.trim();

    // 韓国語検出（簡易版）
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    if (koreanRegex.test(processed)) {
      throw new Error('Korean characters detected in content - content generation failed');
    }

    // 長さ調整
    if (processed.length > this.MAX_CONTENT_LENGTH) {
      processed = processed.substring(0, this.MAX_CONTENT_LENGTH - 3) + '...';
    }

    return processed;
  }

}