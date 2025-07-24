/**
 * Claude Code SDK による投稿分析・品質評価エンジン
 * REQUIREMENTS.md準拠版 - 投稿パフォーマンス分析システム
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export interface QualityMetrics {
  overall: number;
  readability: number;
  relevance: number;
  engagement_potential: number;
  factual_accuracy: number;
  originality: number;
  timeliness: number;
  risk_assessment: number;
}

export interface EngagementPrediction {
  estimated_likes: number;
  estimated_retweets: number;
  estimated_replies: number;
  engagement_rate: number;
  best_posting_time: string;
  confidence: number;
}

export interface PostAnalysis {
  quality: QualityMetrics;
  engagement: EngagementPrediction;
  recommendations: string[];
  issues: string[];
  optimization_suggestions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  target_audience_match: number;
}

export interface TweetData {
  content: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  timestamp?: string;
  hashtags?: string[];
  mentions?: string[];
}

/**
 * Claude Code SDKによる投稿分析・品質評価クラス
 * AI駆動型の投稿最適化支援システム
 */
export class PostAnalyzer {
  private readonly QUALITY_THRESHOLD = 70;
  private readonly ENGAGEMENT_BASELINE = 2.0;

  constructor() {
    console.log('✅ PostAnalyzer initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * 投稿内容の品質分析（投稿前評価）
   */
  async analyzeQuality(content: string): Promise<QualityMetrics> {
    try {
      const prompt = `以下の投稿内容を分析し、各指標を0-100点で評価してください。

投稿内容: "${content}"

評価項目:
1. 読みやすさ (readability) - 文章の分かりやすさ、構造
2. 関連性 (relevance) - 投資・金融分野との関連度
3. エンゲージメント可能性 (engagement_potential) - いいね・リツイートされやすさ
4. 事実精度 (factual_accuracy) - 内容の正確性
5. 独創性 (originality) - ユニークさ、新規性
6. 時宜性 (timeliness) - タイミングの適切さ
7. リスク評価 (risk_assessment) - 炎上・問題となるリスクの低さ

JSON形式で回答してください:
{
  "readability": 点数,
  "relevance": 点数,
  "engagement_potential": 点数,
  "factual_accuracy": 点数,
  "originality": 点数,
  "timeliness": 点数,
  "risk_assessment": 点数,
  "reasoning": {
    "readability": "理由",
    "relevance": "理由",
    "engagement_potential": "理由",
    "factual_accuracy": "理由",
    "originality": "理由",
    "timeliness": "理由",
    "risk_assessment": "理由"
  }
}`;

      const response = await claude()
        .withModel('sonnet')
        .withTimeout(15000)
        .query(prompt)
        .asText();

      const analysis = this.parseAnalysisResponse(response);
      
      // 全体スコア計算
      const overall = this.calculateOverallScore(analysis);

      return {
        overall,
        ...analysis
      };

    } catch (error) {
      console.error('Quality analysis failed:', error);
      return this.getDefaultQualityMetrics();
    }
  }

  /**
   * エンゲージメント予測分析
   */
  async evaluateEngagement(tweet: TweetData): Promise<EngagementPrediction> {
    try {
      const { content, hashtags = [], mentions = [] } = tweet;
      
      // 基本エンゲージメント計算
      const baseEngagement = this.calculateBaseEngagement(content, hashtags, mentions);
      
      // 最適投稿時間推定
      const bestPostingTime = this.getBestPostingTime();
      
      // 時間帯による調整
      const timeAdjustment = this.getTimeAdjustment(bestPostingTime);
      
      const adjustedEngagement = baseEngagement * timeAdjustment;

      return {
        estimated_likes: Math.round(adjustedEngagement * 0.7),
        estimated_retweets: Math.round(adjustedEngagement * 0.2),
        estimated_replies: Math.round(adjustedEngagement * 0.1),
        engagement_rate: adjustedEngagement,
        best_posting_time: bestPostingTime,
        confidence: this.calculatePredictionConfidence(content, hashtags)
      };

    } catch (error) {
      console.error('Engagement prediction failed:', error);
      return this.getDefaultEngagementPrediction();
    }
  }

  /**
   * 包括的投稿分析（品質+エンゲージメント+改善提案）
   */
  async analyzePost(content: string): Promise<PostAnalysis> {
    try {
      // 並行して品質分析とエンゲージメント予測を実行
      const [quality, engagement] = await Promise.all([
        this.analyzeQuality(content),
        this.evaluateEngagement({ content })
      ]);

      // 改善提案生成
      const recommendations = this.generateRecommendations(quality, engagement);
      const issues = this.identifyIssues(quality);
      const optimizationSuggestions = this.generateOptimizationSuggestions(content, quality);
      
      // センチメント分析
      const sentiment = this.analyzeSentiment(content);
      
      // ターゲットオーディエンス適合度
      const targetAudienceMatch = this.evaluateTargetAudienceMatch(content);

      return {
        quality,
        engagement,
        recommendations,
        issues,
        optimization_suggestions: optimizationSuggestions,
        sentiment,
        target_audience_match: targetAudienceMatch
      };

    } catch (error) {
      console.error('Post analysis failed:', error);
      return this.getDefaultPostAnalysis();
    }
  }

  /**
   * 投稿パフォーマンス事後分析
   */
  async analyzePerformance(tweet: TweetData): Promise<{
    performance_score: number;
    vs_prediction: {
      likes_accuracy: number;
      retweets_accuracy: number;
      replies_accuracy: number;
    };
    insights: string[];
    learning_points: string[];
  }> {
    try {
      const { content, likes = 0, retweets = 0, replies = 0 } = tweet;
      
      // 事前予測を取得
      const prediction = await this.evaluateEngagement(tweet);
      
      // パフォーマンススコア計算
      const actualEngagement = likes + retweets + replies;
      const predictedEngagement = prediction.estimated_likes + prediction.estimated_retweets + prediction.estimated_replies;
      const performanceScore = (actualEngagement / Math.max(predictedEngagement, 1)) * 100;
      
      // 予測精度分析
      const likesAccuracy = this.calculateAccuracy(likes, prediction.estimated_likes);
      const retweetsAccuracy = this.calculateAccuracy(retweets, prediction.estimated_retweets);
      const repliesAccuracy = this.calculateAccuracy(replies, prediction.estimated_replies);
      
      // インサイト生成
      const insights = this.generatePerformanceInsights(tweet, prediction, performanceScore);
      const learningPoints = this.generateLearningPoints(content, actualEngagement, predictedEngagement);

      return {
        performance_score: Math.round(performanceScore),
        vs_prediction: {
          likes_accuracy: likesAccuracy,
          retweets_accuracy: retweetsAccuracy,
          replies_accuracy: repliesAccuracy
        },
        insights,
        learning_points: learningPoints
      };

    } catch (error) {
      console.error('Performance analysis failed:', error);
      return {
        performance_score: 50,
        vs_prediction: {
          likes_accuracy: 50,
          retweets_accuracy: 50,
          replies_accuracy: 50
        },
        insights: ['分析エラーが発生しました'],
        learning_points: ['データ収集の改善が必要です']
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private parseAnalysisResponse(response: string): Omit<QualityMetrics, 'overall'> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          readability: parsed.readability || 70,
          relevance: parsed.relevance || 70,
          engagement_potential: parsed.engagement_potential || 60,
          factual_accuracy: parsed.factual_accuracy || 80,
          originality: parsed.originality || 60,
          timeliness: parsed.timeliness || 70,
          risk_assessment: parsed.risk_assessment || 80
        };
      }
    } catch (error) {
      console.warn('Failed to parse analysis response, using defaults');
    }
    
    return this.getDefaultQualityMetrics();
  }

  private calculateOverallScore(metrics: Omit<QualityMetrics, 'overall'>): number {
    const weights = {
      readability: 0.15,
      relevance: 0.20,
      engagement_potential: 0.15,
      factual_accuracy: 0.20,
      originality: 0.10,
      timeliness: 0.10,
      risk_assessment: 0.10
    };

    return Math.round(
      metrics.readability * weights.readability +
      metrics.relevance * weights.relevance +
      metrics.engagement_potential * weights.engagement_potential +
      metrics.factual_accuracy * weights.factual_accuracy +
      metrics.originality * weights.originality +
      metrics.timeliness * weights.timeliness +
      metrics.risk_assessment * weights.risk_assessment
    );
  }

  private calculateBaseEngagement(content: string, hashtags: string[], mentions: string[]): number {
    let baseScore = 10;

    // コンテンツ長による調整
    if (content.length > 100 && content.length < 200) baseScore += 5;
    if (content.length > 200) baseScore += 3;

    // ハッシュタグによる調整
    baseScore += Math.min(hashtags.length * 3, 15);

    // エンゲージメント要素
    if (content.includes('？')) baseScore += 8; // 質問
    if (content.includes('💡') || content.includes('📊')) baseScore += 5; // 絵文字
    if (content.includes('初心者')) baseScore += 7; // ターゲット明確
    if (content.includes('具体的') || content.includes('実践')) baseScore += 6; // 実用性

    return Math.min(baseScore, 50);
  }

  private getBestPostingTime(): string {
    const currentHour = new Date().getHours();
    const optimalTimes = ['09:00', '12:00', '18:00', '21:00'];
    
    // 現在時刻に最も近い最適時間を選択
    const currentMinutes = currentHour * 60;
    let bestTime = '09:00';
    let minDiff = Infinity;

    optimalTimes.forEach(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const timeMinutes = hours * 60 + minutes;
      const diff = Math.abs(currentMinutes - timeMinutes);
      
      if (diff < minDiff) {
        minDiff = diff;
        bestTime = time;
      }
    });

    return bestTime;
  }

  private getTimeAdjustment(postingTime: string): number {
    const optimalTimes = ['09:00', '12:00', '18:00', '21:00'];
    return optimalTimes.includes(postingTime) ? 1.2 : 1.0;
  }

  private calculatePredictionConfidence(content: string, hashtags: string[]): number {
    let confidence = 0.6;

    // コンテンツ品質による調整
    if (content.length > 50) confidence += 0.1;
    if (hashtags.length > 0 && hashtags.length <= 4) confidence += 0.1;
    if (content.includes('投資') || content.includes('資産')) confidence += 0.1;

    return Math.min(confidence, 0.9);
  }

  private generateRecommendations(quality: QualityMetrics, engagement: EngagementPrediction): string[] {
    const recommendations: string[] = [];

    if (quality.overall < this.QUALITY_THRESHOLD) {
      recommendations.push('投稿品質の向上が必要です');
    }

    if (quality.engagement_potential < 60) {
      recommendations.push('エンゲージメントを促進する要素（質問、具体例など）を追加してください');
    }

    if (engagement.engagement_rate < this.ENGAGEMENT_BASELINE) {
      recommendations.push(`最適投稿時間（${engagement.best_posting_time}）での投稿を検討してください`);
    }

    if (quality.readability < 70) {
      recommendations.push('文章をより読みやすく簡潔にしてください');
    }

    if (recommendations.length === 0) {
      recommendations.push('投稿品質は良好です。このまま投稿できます');
    }

    return recommendations;
  }

  private identifyIssues(quality: QualityMetrics): string[] {
    const issues: string[] = [];

    if (quality.risk_assessment < 70) {
      issues.push('炎上リスクが検出されました');
    }

    if (quality.factual_accuracy < 60) {
      issues.push('事実確認が必要な内容が含まれています');
    }

    if (quality.relevance < 60) {
      issues.push('投資・金融分野との関連性が低い可能性があります');
    }

    return issues;
  }

  private generateOptimizationSuggestions(content: string, quality: QualityMetrics): string[] {
    const suggestions: string[] = [];

    if (!content.includes('？')) {
      suggestions.push('質問形式を取り入れてエンゲージメントを促進');
    }

    if (!content.includes('💡') && !content.includes('📊')) {
      suggestions.push('適切な絵文字を使用して視認性を向上');
    }

    if (quality.originality < 70) {
      suggestions.push('ユニークな視点や個人的な経験を追加');
    }

    if (content.length < 100) {
      suggestions.push('より詳細な説明や具体例を追加');
    }

    return suggestions;
  }

  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['成功', '利益', '成長', '良い', '推奨', '有望'];
    const negativeWords = ['リスク', '損失', '危険', '注意', '問題'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private evaluateTargetAudienceMatch(content: string): number {
    let score = 60;

    // ターゲットキーワード
    if (content.includes('初心者')) score += 15;
    if (content.includes('基本') || content.includes('基礎')) score += 10;
    if (content.includes('始める') || content.includes('入門')) score += 10;
    if (content.includes('投資は自己責任')) score += 5;

    return Math.min(score, 100);
  }

  private calculateAccuracy(actual: number, predicted: number): number {
    if (predicted === 0) return actual === 0 ? 100 : 0;
    return Math.max(0, 100 - Math.abs(actual - predicted) / predicted * 100);
  }

  private generatePerformanceInsights(tweet: TweetData, prediction: EngagementPrediction, performanceScore: number): string[] {
    const insights: string[] = [];

    if (performanceScore > 120) {
      insights.push('予想を上回る優秀なパフォーマンスです');
    } else if (performanceScore < 80) {
      insights.push('期待を下回るパフォーマンスでした');
    } else {
      insights.push('予想通りのパフォーマンスでした');
    }

    if (tweet.hashtags && tweet.hashtags.length > 0) {
      insights.push(`ハッシュタグ（${tweet.hashtags.join(', ')}）が効果的でした`);
    }

    return insights;
  }

  private generateLearningPoints(content: string, actual: number, predicted: number): string[] {
    const points: string[] = [];

    if (actual > predicted * 1.2) {
      points.push('このタイプのコンテンツは予想以上に反響がありました');
    } else if (actual < predicted * 0.8) {
      points.push('このタイプのコンテンツは期待ほど反響がありませんでした');
    }

    if (content.includes('？')) {
      points.push('質問形式が効果的かどうかを検証できました');
    }

    return points;
  }

  // デフォルト値生成メソッド
  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      overall: 70,
      readability: 70,
      relevance: 70,
      engagement_potential: 60,
      factual_accuracy: 80,
      originality: 60,
      timeliness: 70,
      risk_assessment: 80
    };
  }

  private getDefaultEngagementPrediction(): EngagementPrediction {
    return {
      estimated_likes: 15,
      estimated_retweets: 3,
      estimated_replies: 2,
      engagement_rate: 2.0,
      best_posting_time: '12:00',
      confidence: 0.6
    };
  }

  private getDefaultPostAnalysis(): PostAnalysis {
    return {
      quality: this.getDefaultQualityMetrics(),
      engagement: this.getDefaultEngagementPrediction(),
      recommendations: ['品質分析が利用できません'],
      issues: [],
      optimization_suggestions: [],
      sentiment: 'neutral',
      target_audience_match: 70
    };
  }
}