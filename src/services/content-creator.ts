import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ProcessedData, PostContent, ContentStrategy, ValidationResult, MarketTopic, TrendData } from '../types/content-types';
import { CollectionResult } from '../types/collection-types';
import { loadYamlSafe } from '../utils/yaml-utils';
import { handleError } from '../utils/error-handler';
import { join } from 'path';

/**
 * 投稿コンテンツ生成を担当するContentCreatorクラス
 * 
 * Claude Code SDKを活用した投資教育コンテンツ作成システムの中核
 */
export class ContentCreator {
  private readonly dataPath = 'data';
  
  constructor() {
    // No longer need to initialize AIProvider
  }

  /**
   * 投稿コンテンツ生成メインメソッド
   * 
   * @param data - 処理済みデータ
   * @returns 生成された投稿コンテンツ
   */
  async createPost(data: ProcessedData): Promise<PostContent> {
    try {
      // 戦略決定
      const strategy = await this.determineContentStrategy(data);
      
      // 戦略に基づいたコンテンツ生成
      let content: string;
      const sources = data.data.map(d => d.source);
      
      switch (strategy) {
        case 'educational':
          const topic = this.extractMarketTopic(data);
          content = await this.generateEducationalContent(topic);
          break;
          
        case 'trend':
          const trend = this.extractTrendData(data);
          content = await this.generateTrendContent(trend);
          break;
          
        case 'analytical':
          content = await this.generateAnalyticalContent(data);
          break;
          
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }
      
      // コンテンツ検証
      const validation = this.validateContent(content);
      if (!validation.isValid) {
        console.warn('⚠️ [ContentCreator] コンテンツ検証失敗:', validation.issues);
        content = await this.improveContent(content, validation);
      }
      
      // X投稿用フォーマット
      const formattedContent = this.formatForX(content);
      
      // メタデータ計算
      const metadata = {
        sources,
        topic: this.extractTopicName(data),
        educationalValue: this.calculateEducationalValue(content),
        trendRelevance: this.calculateTrendRelevance(content, data)
      };
      
      return {
        content: formattedContent,
        strategy,
        confidence: this.calculateConfidence(data, validation),
        metadata
      };
      
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return this.createFallbackContent();
    }
  }

  /**
   * 教育的価値の高いコンテンツ生成
   * 
   * @param topic - 市場トピック
   * @returns 教育的コンテンツ
   */
  async generateEducationalContent(topic: MarketTopic): Promise<string> {
    try {
      const prompt = `
あなたは投資教育の専門家です。以下のトピックについて、投資初心者向けに分かりやすく解説する投稿を作成してください。

トピック: ${topic.topic}
関連情報: ${topic.sources.join(', ')}

要件:
- 280文字以内
- 初心者にも理解しやすい言葉遣い
- 具体的な例や比喩を使用
- 実践的なアドバイスを含める
- 親しみやすいトーン
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      console.error('❌ [ContentCreator] 教育コンテンツ生成エラー:', error);
      return this.createEducationalFallback(topic);
    }
  }

  /**
   * トレンド対応型コンテンツ生成
   * 
   * @param trend - トレンドデータ
   * @returns トレンドコンテンツ
   */
  async generateTrendContent(trend: TrendData): Promise<string> {
    try {
      const prompt = `
あなたは投資市場のトレンド分析専門家です。以下の最新トレンドについて、タイムリーで注目を集める投稿を作成してください。

トレンド: ${trend.trend}
勢い: ${trend.momentum > 0.7 ? '強い' : trend.momentum > 0.4 ? '中程度' : '弱い'}

要件:
- 280文字以内
- 話題性とタイムリーさを重視
- 市場への影響を簡潔に説明
- エンゲージメントを促す要素を含める
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      console.error('❌ [ContentCreator] トレンドコンテンツ生成エラー:', error);
      return this.createTrendFallback(trend);
    }
  }

  /**
   * 分析特化型コンテンツ生成
   * 
   * @param data - 処理済みデータ
   * @returns 分析コンテンツ
   */
  async generateAnalyticalContent(data: ProcessedData): Promise<string> {
    try {
      const keyInsights = this.extractKeyInsights(data);
      const prompt = `
あなたは投資市場の専門アナリストです。以下のデータから深い洞察を提供する分析投稿を作成してください。

主要な洞察:
${keyInsights.map(insight => `- ${insight}`).join('\n')}

要件:
- 280文字以内
- データに基づいた客観的な分析
- 専門的だが理解しやすい説明
- 投資判断に役立つ視点を提供
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      console.error('❌ [ContentCreator] 分析コンテンツ生成エラー:', error);
      return this.createAnalyticalFallback(data);
    }
  }

  /**
   * コンテンツ品質検証
   * 
   * @param content - 検証対象コンテンツ
   * @returns 検証結果
   */
  private validateContent(content: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 文字数チェック
    if (content.length > 280) {
      issues.push(`文字数超過: ${content.length}文字`);
      suggestions.push('コンテンツを短縮してください');
    }
    
    if (content.length < 50) {
      issues.push('コンテンツが短すぎます');
      suggestions.push('より詳細な情報を追加してください');
    }
    
    // 読みやすさチェック
    const sentences = content.split(/[。！？]/g).filter(s => s.trim());
    const avgSentenceLength = content.length / sentences.length;
    
    if (avgSentenceLength > 50) {
      issues.push('文が長すぎます');
      suggestions.push('短い文に分割してください');
    }
    
    // 教育的要素チェック
    const educationalKeywords = ['基本', '重要', 'ポイント', '理解', '学習'];
    const hasEducationalElement = educationalKeywords.some(keyword => content.includes(keyword));
    
    if (!hasEducationalElement) {
      suggestions.push('教育的要素を追加してください');
    }
    
    // 専門用語の過度な使用チェック
    const technicalTerms = ['ボラティリティ', 'レバレッジ', 'ヘッジ', 'アービトラージ'];
    const technicalTermCount = technicalTerms.filter(term => content.includes(term)).length;
    
    if (technicalTermCount > 2) {
      issues.push('専門用語が多すぎます');
      suggestions.push('初心者にも分かりやすい表現を使用してください');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * X投稿用フォーマット
   * 
   * @param content - フォーマット対象コンテンツ
   * @returns フォーマット済みコンテンツ
   */
  private formatForX(content: string): string {
    let formatted = content.trim();
    
    // 280文字制限対応
    if (formatted.length > 280) {
      formatted = formatted.substring(0, 277) + '...';
    }
    
    // ハッシュタグ追加（文字数に余裕がある場合）
    const remainingChars = 280 - formatted.length;
    if (remainingChars > 20) {
      const hashtags = ['#投資教育', '#資産運用'];
      const hashtagsStr = ' ' + hashtags.join(' ');
      
      if (formatted.length + hashtagsStr.length <= 280) {
        formatted += hashtagsStr;
      }
    }
    
    // エンゲージメント要素の追加
    if (!formatted.includes('📊') && !formatted.includes('💡') && !formatted.includes('🎯')) {
      if (formatted.includes('分析')) {
        formatted = '📊 ' + formatted;
      } else if (formatted.includes('ポイント') || formatted.includes('重要')) {
        formatted = '💡 ' + formatted;
      } else {
        formatted = '🎯 ' + formatted;
      }
    }
    
    return formatted;
  }

  /**
   * コンテンツ戦略の決定
   */
  private async determineContentStrategy(data: ProcessedData): Promise<ContentStrategy> {
    try {
      // アカウント状態を読み込み
      const accountStatusPath = join(process.cwd(), this.dataPath, 'current', 'account-status.yaml');
      const accountStatus = loadYamlSafe<any>(accountStatusPath);
      const followerCount = accountStatus?.followers || 500;
      
      // 成長段階に基づく戦略選択
      if (followerCount < 1000) {
        // 初期段階：教育重視
        return 'educational';
      }
      
      // データの特性分析
      const hasTrendingTopic = this.hasTrendingTopic(data);
      const hasComplexData = this.hasComplexData(data);
      
      if (hasTrendingTopic && data.data.some(d => 
        d.timestamp > Date.now() - 6 * 60 * 60 * 1000 // 6時間以内
      )) {
        return 'trend';
      }
      
      if (hasComplexData || data.data.length > 5) {
        return 'analytical';
      }
      
      // デフォルトは教育重視
      return 'educational';
      
    } catch (error) {
      console.warn('⚠️ [ContentCreator] 戦略決定エラー、教育戦略を使用');
      return 'educational';
    }
  }

  /**
   * コンテンツ改善
   */
  private async improveContent(content: string, validation: ValidationResult): Promise<string> {
    let improved = content;
    
    // 文字数超過の場合
    if (content.length > 280) {
      improved = await this.condensContent(content);
    }
    
    // 教育的要素の追加
    if (validation.suggestions.includes('教育的要素を追加してください')) {
      improved = this.addEducationalElement(improved);
    }
    
    return improved;
  }

  /**
   * コンテンツ圧縮
   */
  private async condensContent(content: string): Promise<string> {
    try {
      const prompt = `
以下のコンテンツを280文字以内に要約してください。重要な情報は保持し、読みやすさを維持してください。

元のコンテンツ:
${content}
`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();
      return response.trim();
      
    } catch (error) {
      // フォールバック：単純な切り詰め
      return content.substring(0, 277) + '...';
    }
  }

  // ヘルパーメソッド
  private extractMarketTopic(data: ProcessedData): MarketTopic {
    const topicCounts = new Map<string, number>();
    
    data.data.forEach(item => {
      if (item.metadata?.tags) {
        (item.metadata.tags as string[]).forEach(tag => {
          topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    const topTopic = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      topic: topTopic ? topTopic[0] : '投資基礎',
      relevance: topTopic ? topTopic[1] / data.data.length : 0.5,
      sources: data.data.map(d => d.source),
      timestamp: Date.now()
    };
  }

  private extractTrendData(data: ProcessedData): TrendData {
    const recentData = data.data.filter(d => 
      d.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    
    const trend = recentData.length > 0 ? 
      recentData[0].content.substring(0, 50) : 
      '市場動向';
    
    return {
      trend,
      momentum: recentData.length / data.data.length,
      sources: recentData.map(d => d.source),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
  }

  private extractKeyInsights(data: ProcessedData): string[] {
    return data.data
      .filter(d => d.metadata && typeof d.metadata.importance === 'string' && d.metadata.importance === 'high')
      .map(d => d.content)
      .slice(0, 3);
  }

  private extractTopicName(data: ProcessedData): string {
    const topics = data.data
      .filter(d => d.metadata?.category)
      .map(d => d.metadata.category as string);
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '投資';
  }

  private calculateEducationalValue(content: string): number {
    let score = 50;
    
    const educationalKeywords = ['基本', '学習', '理解', '重要', 'ポイント', '初心者'];
    const foundKeywords = educationalKeywords.filter(keyword => content.includes(keyword));
    score += foundKeywords.length * 10;
    
    if (content.includes('例：') || content.includes('たとえば')) {
      score += 15;
    }
    
    if (content.includes('？')) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateTrendRelevance(content: string, data: ProcessedData): number {
    const recentDataRatio = data.data.filter(d => 
      d.timestamp > Date.now() - 24 * 60 * 60 * 1000
    ).length / data.data.length;
    
    let score = recentDataRatio * 50;
    
    const trendKeywords = ['最新', '速報', '今日', '本日', '発表'];
    const foundKeywords = trendKeywords.filter(keyword => content.includes(keyword));
    score += foundKeywords.length * 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateConfidence(data: ProcessedData, validation: ValidationResult): number {
    let confidence = 70;
    
    if (data.dataQuality > 0.8) confidence += 10;
    if (validation.isValid) confidence += 10;
    if (data.data.length > 3) confidence += 10;
    
    return Math.min(100, confidence);
  }

  private hasTrendingTopic(data: ProcessedData): boolean {
    return data.data.some(d => 
      d.metadata && typeof d.metadata.importance === 'string' && d.metadata.importance === 'high' &&
      d.timestamp > Date.now() - 6 * 60 * 60 * 1000
    );
  }

  private hasComplexData(data: ProcessedData): boolean {
    const categories = new Set(data.data.map(d => d.metadata?.category).filter(Boolean));
    return categories.size > 3;
  }

  private addEducationalElement(content: string): string {
    if (!content.includes('ポイント') && content.length < 250) {
      return content + '\n💡 学習ポイント：継続的な学習が成功の鍵です。';
    }
    return content;
  }

  // フォールバックコンテンツ
  private createFallbackContent(): PostContent {
    return {
      content: '📊 投資の基本原則：リスク管理から始めましょう。小さく始めて、学びながら成長することが大切です。 #投資教育 #資産運用',
      strategy: 'educational',
      confidence: 60,
      metadata: {
        sources: [],
        topic: '投資基礎',
        educationalValue: 80,
        trendRelevance: 30
      }
    };
  }

  private createEducationalFallback(topic: MarketTopic): string {
    return `📚 ${topic.topic}について学びましょう。投資の基本を理解することで、より良い判断ができるようになります。少しずつ知識を積み重ねていきましょう！`;
  }

  private createTrendFallback(trend: TrendData): string {
    return `🔥 注目のトレンド：${trend.trend}。市場の動きを理解し、冷静な判断を心がけましょう。`;
  }

  private createAnalyticalFallback(data: ProcessedData): string {
    return `📊 市場分析：複数の要因が絡み合う現在の相場。データに基づいた冷静な判断が重要です。`;
  }
}