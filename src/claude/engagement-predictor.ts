/**
 * Claude Code SDK エンゲージメント予測・パフォーマンス分析専門モジュール
 * REQUIREMENTS.md準拠版 - エンゲージメント予測機能の疎結合実装
 * post-analyzer.tsから分離されたエンゲージメント予測機能
 */

export interface EngagementPrediction {
  estimated_likes: number;
  estimated_retweets: number;
  estimated_replies: number;
  engagement_rate: number;
  best_posting_time: string;
  confidence: number;
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

export interface PerformanceAnalysis {
  performance_score: number;
  vs_prediction: {
    likes_accuracy: number;
    retweets_accuracy: number;
    replies_accuracy: number;
  };
  insights: string[];
  learning_points: string[];
}

/**
 * エンゲージメント予測・パフォーマンス分析専門クラス
 * 投稿のエンゲージメント予測、最適投稿時間、事後パフォーマンス分析を担当
 */
export class EngagementPredictor {
  private readonly ENGAGEMENT_BASELINE = 2.0;

  constructor() {
    console.log('✅ EngagementPredictor initialized - エンゲージメント予測専門モジュール');
  }

  /**
   * エンゲージメント予測
   * 投稿内容から期待エンゲージメントを予測
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
      console.error('❌ エンゲージメント予測エラー:', error);
      throw error;
    }
  }

  /**
   * 基本エンゲージメント計算
   * コンテンツ内容に基づく基本的なエンゲージメントスコア算出
   */
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

  /**
   * 最適投稿時間推定
   * 現在時刻を基準に最適な投稿時間を算出
   */
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

  /**
   * 時間帯調整係数
   * 投稿時間による影響を調整
   */
  private getTimeAdjustment(postingTime: string): number {
    const optimalTimes = ['09:00', '12:00', '18:00', '21:00'];
    return optimalTimes.includes(postingTime) ? 1.2 : 1.0;
  }

  /**
   * 予測信頼度計算
   * 予測の信頼性を示すスコア算出
   */
  private calculatePredictionConfidence(content: string, hashtags: string[]): number {
    let confidence = 0.6;

    // コンテンツ品質による調整
    if (content.length > 50) confidence += 0.1;
    if (hashtags.length > 0 && hashtags.length <= 4) confidence += 0.1;
    if (content.includes('投資') || content.includes('資産')) confidence += 0.1;

    return Math.min(confidence, 0.9);
  }

  /**
   * パフォーマンス事後分析
   * 実際の結果と予測を比較して学習データを生成
   */
  async analyzePerformance(tweet: TweetData): Promise<PerformanceAnalysis> {
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
      console.error('❌ パフォーマンス分析エラー:', error);
      throw error;
    }
  }

  /**
   * 予測精度計算
   * 実際の値と予測値の精度を算出
   */
  private calculateAccuracy(actual: number, predicted: number): number {
    if (predicted === 0) return actual === 0 ? 100 : 0;
    return Math.max(0, 100 - Math.abs(actual - predicted) / predicted * 100);
  }

  /**
   * パフォーマンスインサイト生成
   * 分析結果から有用な洞察を生成
   */
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

    // 投稿時間の効果分析
    const currentTime = new Date().toTimeString().substring(0, 5);
    if (prediction.best_posting_time === currentTime) {
      insights.push('最適時間での投稿が効果的でした');
    }

    return insights;
  }

  /**
   * 学習ポイント生成
   * 今後の改善につながる学習データを生成
   */
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

    if (content.includes('初心者')) {
      points.push('初心者向けコンテンツの反響データを取得しました');
    }

    if (content.includes('具体的') || content.includes('実践')) {
      points.push('実践的なコンテンツの効果を測定できました');
    }

    return points;
  }


}