import { InsightSynthesizer } from './convergence/insight-synthesizer';
import { NarrativeBuilder } from './convergence/narrative-builder';
import { ValueMaximizer } from './convergence/value-maximizer';
import {
  CollectionResult,
  ConvergedPost,
  CoreInsight,
  QualityAssessment,
  QualityScore,
  QualityMetrics,
  QUALITY_STANDARDS,
  ValueMetrics,
  PostCategory,
  AlternativePost,
  MarketContext,
  TimeRelevance,
  FactCheckResult,
  ReadabilityScore
} from '../types/convergence-types';

/**
 * コンテンツ収束エンジン
 * 大量のFX情報を価値ある1つの投稿に収束させるメインシステム
 */
export class ContentConvergenceEngine {
  private insightSynthesizer: InsightSynthesizer;
  private narrativeBuilder: NarrativeBuilder;
  private valueMaximizer: ValueMaximizer;
  
  constructor() {
    this.insightSynthesizer = new InsightSynthesizer();
    this.narrativeBuilder = new NarrativeBuilder();
    this.valueMaximizer = new ValueMaximizer();
  }
  
  /**
   * 大量情報の知的統合
   * 複数の情報源からの収集結果を1つの高品質投稿に統合
   */
  async convergeToSinglePost(collectedData: CollectionResult[]): Promise<ConvergedPost> {
    const startTime = Date.now();
    
    try {
      // 1. 核心インサイトの抽出
      const coreInsights = await this.extractCoreInsights(collectedData);
      
      // 2. 読者価値の最大化
      const valueOptimized = await this.maximizeReaderValue(coreInsights);
      
      // 3. 投稿構造の構築
      const structure = this.narrativeBuilder.buildLogicalStructure(coreInsights);
      const narrativeFlow = this.narrativeBuilder.createReadableFlow(structure);
      
      // 4. 最終コンテンツの生成
      const finalContent = await this.generateFinalContent(
        valueOptimized, 
        structure, 
        narrativeFlow
      );
      
      // 5. 品質評価
      const qualityScore = await this.calculateQualityScore(finalContent, coreInsights);
      
      // 6. カテゴリの決定
      const category = this.determinePostCategory(coreInsights);
      
      // 7. 代替投稿の生成
      const alternatives = await this.generateAlternatives(finalContent, coreInsights, structure);
      
      const processingTime = Date.now() - startTime;
      
      const convergedPost: ConvergedPost = {
        id: `convergence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: finalContent,
        metadata: {
          sourceCount: collectedData.length,
          processingTime,
          qualityScore,
          confidence: this.calculateOverallConfidence(coreInsights),
          category
        },
        insights: coreInsights,
        structure,
        alternatives
      };
      
      return convergedPost;
      
    } catch (error) {
      throw new Error(`収束処理に失敗しました: ${error}`);
    }
  }
  
  /**
   * 最重要インサイトの抽出
   * 収集データから最も価値の高いインサイトを特定・抽出
   */
  async extractCoreInsights(data: CollectionResult[]): Promise<CoreInsight[]> {
    if (data.length === 0) {
      throw new Error('インサイト抽出に必要なデータがありません');
    }
    
    // 1. 情報パターンの発見
    const patterns = this.insightSynthesizer.discoverInformationPatterns(data);
    
    // 2. 重複情報の統合
    const clusteredData = this.clusterSimilarData(data);
    const synthesizedInsights = [];
    
    for (const cluster of clusteredData) {
      if (cluster.length > 1) {
        const synthesized = this.insightSynthesizer.synthesizeDuplicateInformation(cluster);
        synthesizedInsights.push(synthesized);
      }
    }
    
    // 3. 矛盾情報の解決
    const conflicts = this.identifyConflicts(data);
    const resolvedInsights = this.insightSynthesizer.resolveConflictingInformation(conflicts);
    
    // 4. 隠れた関連性の発見
    const connections = this.insightSynthesizer.discoverHiddenConnections(data);
    
    // 5. 核心インサイトの構築
    const coreInsights = this.buildCoreInsights(
      data, 
      patterns, 
      synthesizedInsights, 
      resolvedInsights, 
      connections
    );
    
    // 6. 重要度によるソート
    return coreInsights
      .sort((a, b) => this.calculateInsightImportance(b) - this.calculateInsightImportance(a))
      .slice(0, 5); // 最大5つの核心インサイト
  }
  
  /**
   * 読者価値の最大化
   * インサイトを読者にとって最大価値となるよう最適化
   */
  async maximizeReaderValue(insights: CoreInsight[]): Promise<ValueOptimizedContent> {
    const baseContent = this.generateBaseContent(insights);
    
    // 1. 教育価値の最大化
    const educationallyEnhanced = this.valueMaximizer.maximizeEducationalValue(baseContent);
    
    // 2. 実用性の強化
    const practicallyEnhanced = this.valueMaximizer.enhancePracticalUtility(
      educationallyEnhanced.content
    );
    
    // 3. 市場コンテキストの取得と適応
    const marketContext = this.getCurrentMarketContext(insights);
    const timelyContent = this.valueMaximizer.optimizeTimeliness(
      practicallyEnhanced.content, 
      marketContext
    );
    
    // 4. 独自性の確保
    const existingPosts = await this.getRecentPosts();
    const uniqueContent = this.valueMaximizer.ensureUniqueness(
      timelyContent.content, 
      existingPosts
    );
    
    return {
      content: uniqueContent.content,
      educationalValue: educationallyEnhanced.educationalValue,
      practicalityScore: practicallyEnhanced.practicalityScore,
      uniquenessScore: uniqueContent.uniquenessScore,
      timelinessScore: timelyContent.timelinessScore
    };
  }
  
  /**
   * 投稿完成度の検証
   * 生成された投稿の品質を多面的に評価
   */
  async validatePostQuality(post: ConvergedPost): Promise<QualityAssessment> {
    // 1. ファクトチェック
    const factCheck = await this.verifyFactualAccuracy(post);
    
    // 2. 読みやすさ評価
    const readability = this.assessReadability(post.content);
    
    // 3. 価値メトリクスの測定
    const valueMetrics = this.measurePostValue(post);
    
    // 4. 総合品質スコアの計算
    const qualityScore = this.calculateOverallQuality(post, factCheck, readability, valueMetrics);
    
    // 5. 品質基準との比較
    const passesMinimumStandards = this.checkMinimumStandards(qualityScore);
    
    // 6. 改善提案の生成
    const improvements = this.generateImprovementSuggestions(qualityScore, post);
    
    // 7. 強み・弱みの特定
    const strengths = this.identifyStrengths(qualityScore, post);
    const weaknesses = this.identifyWeaknesses(qualityScore, post);
    
    return {
      score: qualityScore,
      passesMinimumStandards,
      improvements,
      strengths,
      weaknesses
    };
  }
  
  // プライベートヘルパーメソッド
  
  private clusterSimilarData(data: CollectionResult[]): CollectionResult[][] {
    const clusters: CollectionResult[][] = [];
    const processed = new Set<string>();
    
    for (const item of data) {
      if (processed.has(item.id)) continue;
      
      const cluster = [item];
      processed.add(item.id);
      
      // 類似アイテムを検索
      for (const other of data) {
        if (processed.has(other.id)) continue;
        
        const similarity = this.calculateContentSimilarity(item, other);
        if (similarity > 0.7) { // 70%以上の類似性
          cluster.push(other);
          processed.add(other.id);
        }
      }
      
      clusters.push(cluster);
    }
    
    return clusters;
  }
  
  private identifyConflicts(data: CollectionResult[]): any[] {
    const conflicts = [];
    
    // 同じトピックで矛盾する情報を検索
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const conflict = this.detectConflict(data[i], data[j]);
        if (conflict) {
          conflicts.push({
            id: `conflict_${i}_${j}`,
            conflictingSources: [data[i], data[j]],
            conflictType: conflict.type,
            severity: conflict.severity
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private buildCoreInsights(
    data: CollectionResult[],
    patterns: any[],
    synthesized: any[],
    resolved: any[],
    connections: any[]
  ): CoreInsight[] {
    const insights: CoreInsight[] = [];
    
    // データから直接インサイトを構築
    for (const item of data) {
      if (item.importance > 70) { // 重要度閾値
        insights.push(this.convertToInsight(item));
      }
    }
    
    // パターンからインサイトを構築
    for (const pattern of patterns) {
      if (pattern.significance > 60) {
        insights.push(this.convertPatternToInsight(pattern));
      }
    }
    
    // 統合されたインサイトを追加
    for (const synth of synthesized) {
      insights.push(this.convertSynthesizedToInsight(synth));
    }
    
    return insights;
  }
  
  private generateBaseContent(insights: CoreInsight[]): string {
    if (insights.length === 0) return '';
    
    const primaryInsight = insights[0];
    let content = primaryInsight.content;
    
    // 補完的なインサイトを統合
    if (insights.length > 1) {
      content += `\n\n`;
      for (let i = 1; i < Math.min(3, insights.length); i++) {
        content += `${insights[i].content}\n`;
      }
    }
    
    return content;
  }
  
  private getCurrentMarketContext(insights: CoreInsight[]): MarketContext {
    // インサイトから現在の市場コンテキストを推定
    const trends = insights.map(i => this.inferTrendFromInsight(i));
    const dominantTrend = this.findDominantTrend(trends);
    
    const volatility = this.estimateVolatility(insights);
    const sentiment = this.analyzeSentiment(insights);
    const majorEvents = this.extractMajorEvents(insights);
    
    return {
      currentTrend: dominantTrend,
      volatility,
      majorEvents,
      sentiment,
      timeframe: 'daily' // デフォルト
    };
  }
  
  private async getRecentPosts(): Promise<string[]> {
    // 実装では実際の投稿履歴を取得
    // 現在はモックデータを返す
    return [
      'ドル円の上昇トレンドについて',
      '今週の経済指標発表',
      'Fed金利決定の影響分析'
    ];
  }
  
  private async generateFinalContent(
    valueOptimized: ValueOptimizedContent,
    structure: any,
    narrativeFlow: any
  ): Promise<string> {
    let content = valueOptimized.content;
    
    // ナラティブフローを適用
    if (narrativeFlow.coherenceScore > 80) {
      content = this.applyNarrativeFlow(content, narrativeFlow);
    }
    
    // 専門用語の説明を追加
    const enhanced = this.narrativeBuilder.explainTechnicalTerms(content);
    content = enhanced.content;
    
    // エンゲージメント要素の追加
    const engaging = this.narrativeBuilder.addEngagementElements(content);
    content = engaging.content;
    
    // 最終調整
    content = this.finalizeContent(content);
    
    return content;
  }
  
  private async calculateQualityScore(content: string, insights: CoreInsight[]): Promise<QualityScore> {
    const metrics: QualityMetrics = {
      factualAccuracy: this.assessFactualAccuracy(content, insights),
      readability: this.assessReadabilityScore(content),
      educationalValue: this.assessEducationalValue(content),
      uniqueness: this.assessUniqueness(content),
      engagement: this.assessEngagementPotential(content),
      timeliness: this.assessTimeliness(content, insights)
    };
    
    const overall = (
      metrics.factualAccuracy +
      metrics.readability +
      metrics.educationalValue +
      metrics.uniqueness +
      metrics.engagement +
      metrics.timeliness
    ) / 6;
    
    const grade = this.calculateGrade(overall);
    
    return {
      overall: Math.round(overall),
      breakdown: metrics,
      grade
    };
  }
  
  private determinePostCategory(insights: CoreInsight[]): PostCategory {
    const categories = insights.map(i => i.category);
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    // カテゴリマッピング
    const categoryMapping: Record<string, PostCategory> = {
      'market_trend': 'market_analysis',
      'economic_indicator': 'economic_update',
      'expert_opinion': 'expert_synthesis',
      'breaking_news': 'breaking_news'
    };
    
    return categoryMapping[dominantCategory] || 'market_analysis';
  }
  
  private async generateAlternatives(
    content: string,
    insights: CoreInsight[],
    structure: any
  ): Promise<AlternativePost[]> {
    const alternatives: AlternativePost[] = [];
    
    // 短縮版
    const shorterVersion = await this.generateShorterVersion(content, insights);
    alternatives.push(shorterVersion);
    
    // 詳細版
    const longerVersion = await this.generateLongerVersion(content, insights, structure);
    alternatives.push(longerVersion);
    
    // 初心者向け
    const simplerVersion = await this.generateSimplerVersion(content, insights);
    alternatives.push(simplerVersion);
    
    return alternatives;
  }
  
  private calculateOverallConfidence(insights: CoreInsight[]): number {
    if (insights.length === 0) return 0;
    
    const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0);
    const averageConfidence = totalConfidence / insights.length;
    
    // ソース数による信頼性ボーナス
    const sourceBonus = Math.min(10, insights.length * 2);
    
    return Math.min(100, averageConfidence + sourceBonus);
  }
  
  // さらなるヘルパーメソッド
  
  private calculateContentSimilarity(item1: CollectionResult, item2: CollectionResult): number {
    const words1 = new Set(item1.content.toLowerCase().match(/\w+/g) || []);
    const words2 = new Set(item2.content.toLowerCase().match(/\w+/g) || []);
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  private detectConflict(item1: CollectionResult, item2: CollectionResult): { type: string; severity: number } | null {
    // 基本的な矛盾検出ロジック
    const content1 = item1.content.toLowerCase();
    const content2 = item2.content.toLowerCase();
    
    // 方向性の矛盾
    if ((content1.includes('上昇') && content2.includes('下落')) ||
        (content1.includes('強気') && content2.includes('弱気'))) {
      return { type: 'directional', severity: 80 };
    }
    
    // 数値の矛盾
    const numbers1 = content1.match(/\d+(\.\d+)?/g);
    const numbers2 = content2.match(/\d+(\.\d+)?/g);
    
    if (numbers1 && numbers2) {
      const maxDiff = Math.max(...numbers1.map(n => parseFloat(n))) - 
                     Math.min(...numbers2.map(n => parseFloat(n)));
      if (maxDiff > 50) { // 大きな数値差
        return { type: 'magnitude', severity: 60 };
      }
    }
    
    return null;
  }
  
  private convertToInsight(item: CollectionResult): CoreInsight {
    return {
      id: `insight_${item.id}`,
      category: item.category === 'analysis' ? 'expert_opinion' : item.category,
      content: item.content,
      confidence: item.reliability,
      impact: item.importance > 80 ? 'high' : item.importance > 50 ? 'medium' : 'low',
      sources: [item.source],
      timeRelevance: this.createTimeRelevance(item),
      educationalValue: this.assessItemEducationalValue(item),
      uniqueness: this.assessItemUniqueness(item)
    };
  }
  
  private convertPatternToInsight(pattern: any): CoreInsight {
    return {
      id: `pattern_insight_${pattern.id}`,
      category: 'market_trend',
      content: `${pattern.pattern}のパターンが${pattern.frequency}回確認されました`,
      confidence: Math.min(90, pattern.significance),
      impact: pattern.significance > 80 ? 'high' : 'medium',
      sources: pattern.sources,
      timeRelevance: {
        urgency: 'daily',
        peakRelevance: pattern.significance,
        timeDecayRate: 0.1
      },
      educationalValue: 70,
      uniqueness: 60
    };
  }
  
  private convertSynthesizedToInsight(synthesized: any): CoreInsight {
    return {
      id: `synthesized_insight_${synthesized.id}`,
      category: 'expert_opinion',
      content: synthesized.synthesizedContent,
      confidence: synthesized.confidence,
      impact: synthesized.confidence > 80 ? 'high' : 'medium',
      sources: synthesized.sourceInsights,
      timeRelevance: {
        urgency: 'daily',
        peakRelevance: synthesized.confidence,
        timeDecayRate: 0.05
      },
      educationalValue: 80,
      uniqueness: 75
    };
  }
  
  private calculateInsightImportance(insight: CoreInsight): number {
    const impactScore = insight.impact === 'high' ? 100 : insight.impact === 'medium' ? 70 : 40;
    return (insight.confidence + impactScore + insight.educationalValue + insight.uniqueness) / 4;
  }
  
  private createTimeRelevance(item: CollectionResult): TimeRelevance {
    const hoursOld = (Date.now() - item.timestamp) / (1000 * 60 * 60);
    
    let urgency: 'immediate' | 'daily' | 'weekly' | 'timeless';
    if (hoursOld < 2) urgency = 'immediate';
    else if (hoursOld < 24) urgency = 'daily';
    else if (hoursOld < 168) urgency = 'weekly';
    else urgency = 'timeless';
    
    const peakRelevance = Math.max(0, 100 - hoursOld * 2);
    
    return {
      urgency,
      peakRelevance,
      timeDecayRate: 0.1
    };
  }
  
  private assessItemEducationalValue(item: CollectionResult): number {
    let score = 50;
    
    // 教育的キーワードの存在
    const educationalKeywords = ['なぜ', 'どのように', '理由', '仕組み', '背景'];
    const keywordCount = educationalKeywords.filter(k => item.content.includes(k)).length;
    score += keywordCount * 10;
    
    // 専門用語の適切な使用
    const technicalTerms = ['GDP', 'CPI', 'PMI', 'FOMC', 'レバレッジ'];
    const termCount = technicalTerms.filter(t => item.content.includes(t)).length;
    score += termCount * 5;
    
    return Math.min(100, score);
  }
  
  private assessItemUniqueness(item: CollectionResult): number {
    // 簡単な独自性評価
    return Math.min(100, item.importance + (item.source.includes('独占') ? 20 : 0));
  }
  
  private inferTrendFromInsight(insight: CoreInsight): 'bullish' | 'bearish' | 'sideways' {
    const content = insight.content.toLowerCase();
    
    const bullishTerms = ['上昇', '買い', '強い', 'ポジティブ', '改善'];
    const bearishTerms = ['下落', '売り', '弱い', 'ネガティブ', '悪化'];
    
    const bullishCount = bullishTerms.filter(term => content.includes(term)).length;
    const bearishCount = bearishTerms.filter(term => content.includes(term)).length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'sideways';
  }
  
  private findDominantTrend(trends: string[]): 'bullish' | 'bearish' | 'sideways' {
    const counts = trends.reduce((acc, trend) => {
      acc[trend] = (acc[trend] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominant = Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    return dominant as 'bullish' | 'bearish' | 'sideways';
  }
  
  private estimateVolatility(insights: CoreInsight[]): 'high' | 'medium' | 'low' {
    const highVolatilityTerms = ['急落', '急騰', '激しい', '乱高下'];
    const volatilityCount = insights.reduce((count, insight) => {
      return count + highVolatilityTerms.filter(term => 
        insight.content.includes(term)
      ).length;
    }, 0);
    
    if (volatilityCount > 2) return 'high';
    if (volatilityCount > 0) return 'medium';
    return 'low';
  }
  
  private analyzeSentiment(insights: CoreInsight[]): 'positive' | 'negative' | 'neutral' {
    const positiveTerms = ['改善', '好調', 'ポジティブ', '上昇'];
    const negativeTerms = ['悪化', '不調', 'ネガティブ', '下落'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const insight of insights) {
      positiveScore += positiveTerms.filter(term => insight.content.includes(term)).length;
      negativeScore += negativeTerms.filter(term => insight.content.includes(term)).length;
    }
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }
  
  private extractMajorEvents(insights: CoreInsight[]): string[] {
    const events = [];
    
    for (const insight of insights) {
      if (insight.content.includes('発表') || insight.content.includes('会合')) {
        const match = insight.content.match(/([\w\s]+(?:発表|会合))/);
        if (match) {
          events.push(match[1]);
        }
      }
    }
    
    return events.slice(0, 3);
  }
  
  // 品質評価関連のメソッド
  
  private async verifyFactualAccuracy(post: ConvergedPost): Promise<FactCheckResult> {
    // 簡化された事実確認
    const confidence = post.insights.reduce((avg, insight) => avg + insight.confidence, 0) / post.insights.length;
    
    return {
      verified: confidence > 80,
      confidence,
      sources: post.insights.flatMap(i => i.sources),
      potentialIssues: confidence < 70 ? ['信頼性の確認が必要'] : []
    };
  }
  
  private assessReadability(content: string): ReadabilityScore {
    const sentences = content.split(/[。．.!?！？]/).filter(s => s.length > 0);
    const avgSentenceLength = content.length / sentences.length;
    
    let score = 100;
    if (avgSentenceLength > 100) score -= 20;
    if (avgSentenceLength > 150) score -= 20;
    
    const level = score > 80 ? 'easy' : score > 60 ? 'standard' : 'difficult';
    
    return {
      score,
      level,
      recommendations: score < 70 ? ['文章を短くする', '専門用語を減らす'] : []
    };
  }
  
  private measurePostValue(post: ConvergedPost): ValueMetrics {
    return {
      educational: this.assessEducationalValue(post.content),
      practical: this.assessPracticalValue(post.content),
      entertainment: this.assessEntertainmentValue(post.content),
      uniqueness: this.assessUniqueness(post.content),
      timeliness: this.assessTimeliness(post.content, post.insights),
      overall: 0 // 後で計算
    };
  }
  
  private calculateOverallQuality(
    post: ConvergedPost,
    factCheck: FactCheckResult,
    readability: ReadabilityScore,
    valueMetrics: ValueMetrics
  ): QualityScore {
    const metrics: QualityMetrics = {
      factualAccuracy: factCheck.confidence,
      readability: readability.score,
      educationalValue: valueMetrics.educational,
      uniqueness: valueMetrics.uniqueness,
      engagement: this.assessEngagementPotential(post.content),
      timeliness: valueMetrics.timeliness
    };
    
    const overall = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
    
    return {
      overall: Math.round(overall),
      breakdown: metrics,
      grade: this.calculateGrade(overall)
    };
  }
  
  private checkMinimumStandards(qualityScore: QualityScore): boolean {
    const { breakdown } = qualityScore;
    const standards = QUALITY_STANDARDS.required;
    
    return Object.keys(standards).every(key => {
      return breakdown[key as keyof QualityMetrics] >= standards[key as keyof QualityMetrics];
    });
  }
  
  private generateImprovementSuggestions(qualityScore: QualityScore, post: ConvergedPost): string[] {
    const suggestions: string[] = [];
    const { breakdown } = qualityScore;
    const required = QUALITY_STANDARDS.required;
    
    Object.entries(breakdown).forEach(([key, value]) => {
      const requiredValue = required[key as keyof QualityMetrics];
      if (value < requiredValue) {
        suggestions.push(this.getSuggestionForMetric(key as keyof QualityMetrics, value, requiredValue));
      }
    });
    
    return suggestions;
  }
  
  private identifyStrengths(qualityScore: QualityScore, post: ConvergedPost): string[] {
    const strengths: string[] = [];
    const { breakdown } = qualityScore;
    const excellence = QUALITY_STANDARDS.excellence;
    
    Object.entries(breakdown).forEach(([key, value]) => {
      const excellenceValue = excellence[key as keyof QualityMetrics];
      if (value >= excellenceValue) {
        strengths.push(this.getStrengthDescription(key as keyof QualityMetrics));
      }
    });
    
    return strengths;
  }
  
  private identifyWeaknesses(qualityScore: QualityScore, post: ConvergedPost): string[] {
    const weaknesses: string[] = [];
    const { breakdown } = qualityScore;
    const required = QUALITY_STANDARDS.required;
    
    Object.entries(breakdown).forEach(([key, value]) => {
      const requiredValue = required[key as keyof QualityMetrics];
      if (value < requiredValue) {
        weaknesses.push(this.getWeaknessDescription(key as keyof QualityMetrics));
      }
    });
    
    return weaknesses;
  }
  
  // 追加のヘルパーメソッド
  
  private assessFactualAccuracy(content: string, insights: CoreInsight[]): number {
    return insights.reduce((avg, insight) => avg + insight.confidence, 0) / insights.length;
  }
  
  private assessReadabilityScore(content: string): number {
    const sentences = content.split(/[。．.!?！？]/).filter(s => s.length > 0);
    const avgSentenceLength = content.length / sentences.length;
    
    if (avgSentenceLength < 50) return 95;
    if (avgSentenceLength < 100) return 85;
    if (avgSentenceLength < 150) return 70;
    return 50;
  }
  
  private assessEducationalValue(content: string): number {
    const educationalKeywords = ['なぜ', 'どのように', '理由', '仕組み', '背景', '原因'];
    const keywordCount = educationalKeywords.filter(k => content.includes(k)).length;
    return Math.min(100, 60 + keywordCount * 8);
  }
  
  private assessPracticalValue(content: string): number {
    const practicalKeywords = ['方法', '手順', 'ヒント', 'コツ', '注意', '確認'];
    const keywordCount = practicalKeywords.filter(k => content.includes(k)).length;
    return Math.min(100, 50 + keywordCount * 10);
  }
  
  private assessEntertainmentValue(content: string): number {
    const engagingElements = ['！', '？', '🚨', '📈', '💡', '⚡'];
    const elementCount = engagingElements.filter(e => content.includes(e)).length;
    return Math.min(100, 40 + elementCount * 12);
  }
  
  private assessUniqueness(content: string): number {
    // 簡化された独自性評価
    return 75; // プレースホルダー
  }
  
  private assessTimeliness(content: string, insights: CoreInsight[]): number {
    const urgentCount = insights.filter(i => i.timeRelevance.urgency === 'immediate').length;
    const baseScore = 70;
    return Math.min(100, baseScore + urgentCount * 10);
  }
  
  private assessEngagementPotential(content: string): number {
    const engagementElements = ['？', '！', '💬', '🔄', '📊', '🎯'];
    const elementCount = engagementElements.filter(e => content.includes(e)).length;
    return Math.min(100, 60 + elementCount * 8);
  }
  
  private calculateGrade(overall: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
    if (overall >= 95) return 'A+';
    if (overall >= 90) return 'A';
    if (overall >= 85) return 'B+';
    if (overall >= 80) return 'B';
    if (overall >= 75) return 'C+';
    if (overall >= 70) return 'C';
    if (overall >= 60) return 'D';
    return 'F';
  }
  
  private getSuggestionForMetric(metric: keyof QualityMetrics, current: number, required: number): string {
    const suggestions = {
      factualAccuracy: '情報源の信頼性を向上させる',
      readability: '文章を短く、分かりやすくする',
      educationalValue: '学習要素と説明を追加する',
      uniqueness: '独自の視点や分析を強化する',
      engagement: 'インタラクティブ要素を追加する',
      timeliness: '最新情報との関連性を高める'
    };
    
    return suggestions[metric];
  }
  
  private getStrengthDescription(metric: keyof QualityMetrics): string {
    const descriptions = {
      factualAccuracy: '高い事実正確性',
      readability: '優秀な読みやすさ',
      educationalValue: '優れた教育価値',
      uniqueness: '高い独自性',
      engagement: '強いエンゲージメント力',
      timeliness: '優秀なタイムリー性'
    };
    
    return descriptions[metric];
  }
  
  private getWeaknessDescription(metric: keyof QualityMetrics): string {
    const descriptions = {
      factualAccuracy: '事実正確性の向上が必要',
      readability: '読みやすさの改善が必要',
      educationalValue: '教育価値の強化が必要',
      uniqueness: '独自性の向上が必要',
      engagement: 'エンゲージメント要素の追加が必要',
      timeliness: 'タイムリー性の向上が必要'
    };
    
    return descriptions[metric];
  }
  
  // その他のメソッド（生成系）
  
  private applyNarrativeFlow(content: string, flow: any): string {
    // ナラティブフローの適用ロジック
    return content; // 簡略化
  }
  
  private finalizeContent(content: string): string {
    // 最終調整
    return content.trim();
  }
  
  private async generateShorterVersion(content: string, insights: CoreInsight[]): Promise<AlternativePost> {
    const shortened = content.substring(0, 180) + '...';
    const qualityScore = await this.calculateQualityScore(shortened, insights);
    
    return {
      id: `alt_short_${Date.now()}`,
      content: shortened,
      variant: 'shorter',
      qualityScore
    };
  }
  
  private async generateLongerVersion(content: string, insights: CoreInsight[], structure: any): Promise<AlternativePost> {
    const extended = content + '\n\n詳細な分析と背景情報を含む完全版です。';
    const qualityScore = await this.calculateQualityScore(extended, insights);
    
    return {
      id: `alt_long_${Date.now()}`,
      content: extended,
      variant: 'longer',
      qualityScore
    };
  }
  
  private async generateSimplerVersion(content: string, insights: CoreInsight[]): Promise<AlternativePost> {
    const simplified = content.replace(/[複雑な専門用語]/g, '[簡単な用語]');
    const qualityScore = await this.calculateQualityScore(simplified, insights);
    
    return {
      id: `alt_simple_${Date.now()}`,
      content: simplified,
      variant: 'simpler',
      qualityScore
    };
  }
}

// 型定義の追加（コンパイルエラー回避）
interface ValueOptimizedContent {
  content: string;
  educationalValue: number;
  practicalityScore: number;
  uniquenessScore: number;
  timelinessScore: number;
}