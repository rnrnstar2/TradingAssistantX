/**
 * Collection Utilities
 * ActionSpecificCollectorから共通ユーティリティ機能を分離
 */

import type { 
  CollectionResult, 
  CollectionTarget,
  QualityEvaluation 
} from '../../types/autonomous-system.js';

export class CollectionUtils {

  /**
   * URLからドメインを抽出
   */
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * 重複除去
   */
  static removeDuplicates(results: CollectionResult[]): CollectionResult[] {
    const seen = new Set<string>();
    const uniqueResults: CollectionResult[] = [];

    for (const result of results) {
      // IDベースの重複チェック
      if (seen.has(result.id)) {
        continue;
      }

      // コンテンツベースの重複チェック（タイトル+内容の最初の100文字）
      const contentHash = (result.title + (result.content?.substring(0, 100) || '')).toLowerCase();
      const contentId = `content_${contentHash}`;
      
      if (seen.has(contentId)) {
        continue;
      }

      seen.add(result.id);
      seen.add(contentId);
      uniqueResults.push(result);
    }

    return uniqueResults;
  }

  /**
   * 関連度スコア計算
   */
  static calculateRelevanceScore(
    result: CollectionResult, 
    keywords: string[], 
    actionType: string
  ): number {
    let score = 0.3; // ベーススコア

    // キーワードマッチング
    const content = (result.title + ' ' + (result.content || '')).toLowerCase();
    const matchedKeywords = keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    const keywordScore = (matchedKeywords.length / keywords.length) * 0.4;
    score += keywordScore;

    // タイムリネス（新しさ）
    const ageInHours = (Date.now() - result.timestamp) / (1000 * 60 * 60);
    const timelinessScore = Math.max(0, (24 - ageInHours) / 24) * 0.2;
    score += timelinessScore;

    // アクションタイプ別調整
    const actionMultiplier = this.getActionTypeMultiplier(actionType, result.type);
    score *= actionMultiplier;

    return Math.min(score, 1.0);
  }

  /**
   * アクションタイプ別乗数
   */
  private static getActionTypeMultiplier(actionType: string, resultType: string): number {
    const multipliers: Record<string, Record<string, number>> = {
      'original_post': {
        'insight': 1.2,
        'analysis': 1.1,
        'news': 0.9,
        'discussion': 0.8
      },
      'quote_tweet': {
        'news': 1.2,
        'insight': 1.1,
        'analysis': 1.0,
        'discussion': 0.9
      },
      'retweet': {
        'news': 1.3,
        'analysis': 1.1,
        'insight': 1.0,
        'discussion': 0.8
      },
      'reply': {
        'discussion': 1.2,
        'news': 1.0,
        'insight': 0.9,
        'analysis': 0.9
      }
    };

    return multipliers[actionType]?.[resultType] || 1.0;
  }

  /**
   * 品質評価
   */
  static evaluateQuality(results: CollectionResult[]): QualityEvaluation {
    if (results.length === 0) {
      return {
        overallScore: 0,
        relevanceScore: 0,
        credibilityScore: 0,
        uniquenessScore: 0,
        timelinessScore: 0,
        feedback: '収集された結果がありません',
        suggestions: ['収集戦略を見直してください', 'より多くの情報源を追加してください']
      };
    }

    // 各スコアの計算
    const relevanceScore = this.calculateAverageRelevance(results);
    const credibilityScore = this.calculateAverageCredibility(results);
    const uniquenessScore = this.calculateUniquenessScore(results);
    const timelinessScore = this.calculateTimelinessScore(results);

    const overallScore = (
      relevanceScore * 0.3 +
      credibilityScore * 0.25 +
      uniquenessScore * 0.25 +
      timelinessScore * 0.2
    );

    return {
      overallScore: Math.round(overallScore),
      relevanceScore: Math.round(relevanceScore),
      credibilityScore: Math.round(credibilityScore),
      uniquenessScore: Math.round(uniquenessScore),
      timelinessScore: Math.round(timelinessScore),
      feedback: this.generateQualityFeedback(overallScore),
      suggestions: this.generateSuggestions(overallScore, results.length)
    };
  }

  /**
   * 平均関連度計算
   */
  private static calculateAverageRelevance(results: CollectionResult[]): number {
    const sum = results.reduce((total, result) => total + result.relevanceScore, 0);
    return (sum / results.length) * 100;
  }

  /**
   * 平均信頼性計算
   */
  private static calculateAverageCredibility(results: CollectionResult[]): number {
    // 信頼性の高いソースからの結果にボーナス
    const credibilityScores = results.map(result => {
      let baseScore = 70; // ベース信頼性

      // ソース別信頼性調整
      if (result.url?.includes('bloomberg.com') || result.url?.includes('reuters.com')) {
        baseScore += 20;
      } else if (result.url?.includes('yahoo.com') || result.url?.includes('nikkei.com')) {
        baseScore += 15;
      } else if (result.url?.includes('reddit.com') || result.url?.includes('news.ycombinator.com')) {
        baseScore += 10;
      }

      return Math.min(baseScore, 100);
    });

    return credibilityScores.reduce((sum, score) => sum + score, 0) / credibilityScores.length;
  }

  /**
   * 独自性スコア計算
   */
  private static calculateUniquenessScore(results: CollectionResult[]): number {
    const sources = new Set(results.map(r => this.extractDomain(r.url || '')));
    const sourcesDiversity = Math.min((sources.size / 5) * 100, 100); // 5つ以上のソースで満点
    
    const contentTypes = new Set(results.map(r => r.type));
    const typesDiversity = Math.min((contentTypes.size / 4) * 100, 100); // 4つ以上のタイプで満点

    return (sourcesDiversity * 0.6 + typesDiversity * 0.4);
  }

  /**
   * タイムリネススコア計算
   */
  private static calculateTimelinessScore(results: CollectionResult[]): number {
    const now = Date.now();
    const timelinessScores = results.map(result => {
      const ageInHours = (now - result.timestamp) / (1000 * 60 * 60);
      if (ageInHours <= 1) return 100;
      if (ageInHours <= 6) return 90;
      if (ageInHours <= 24) return 80;
      if (ageInHours <= 72) return 70;
      return 50;
    });

    return timelinessScores.reduce((sum, score) => sum + score, 0) / timelinessScores.length;
  }

  /**
   * ドメイン抽出
   */
  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 品質フィードバック生成
   */
  private static generateQualityFeedback(score: number): string {
    if (score >= 90) return '優秀な品質の情報が収集されました';
    if (score >= 80) return '良好な品質の情報が収集されました';
    if (score >= 70) return '標準的な品質の情報が収集されました';
    if (score >= 60) return '最低限の品質の情報が収集されました';
    return '品質の改善が必要です';
  }

  /**
   * 改善提案生成
   */
  private static generateSuggestions(score: number, resultCount: number): string[] {
    const suggestions: string[] = [];

    if (score < 70) {
      suggestions.push('より信頼性の高い情報源を追加してください');
      suggestions.push('検索キーワードを調整してください');
    }

    if (resultCount < 5) {
      suggestions.push('収集対象を拡大してください');
    }

    if (score < 60) {
      suggestions.push('収集戦略を根本的に見直してください');
    }

    return suggestions.length > 0 ? suggestions : ['現在の品質レベルを維持してください'];
  }

  /**
   * ソースタイプをターゲットタイプにマッピング
   */
  static mapSourceToTargetType(sourceName: string): string {
    const mappings: Record<string, string> = {
      'yahoo_finance': 'news',
      'bloomberg': 'news',
      'reuters': 'news',
      'nikkei': 'news',
      'reddit': 'community',
      'hackernews': 'community',
      'coingecko': 'api',
      'alpha_vantage': 'api',
      'fred': 'api'
    };

    // 部分マッチでも対応
    for (const [key, value] of Object.entries(mappings)) {
      if (sourceName.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'web'; // デフォルト
  }

  /**
   * URL解決
   */
  static resolveApiSourceUrl(source: any): string {
    if (source.url) return source.url;
    
    // デフォルトURL生成
    const defaultUrls: Record<string, string> = {
      'yahoo_finance': 'https://finance.yahoo.com',
      'bloomberg': 'https://www.bloomberg.com/markets',
      'reuters': 'https://www.reuters.com/business/finance',
      'reddit': 'https://www.reddit.com/r/investing',
      'hackernews': 'https://news.ycombinator.com'
    };

    return defaultUrls[source.name] || source.name;
  }

  /**
   * タイムアウト計算
   */
  static getTimeoutForAttempt(
    currentIteration: number, 
    maxIterations: number,
    timeoutConfig = { initial: 60000, retry: 60000, final: 30000 }
  ): number {
    if (currentIteration === 1) {
      return timeoutConfig.initial;
    } else if (currentIteration < maxIterations) {
      return timeoutConfig.retry;
    } else {
      return timeoutConfig.final;
    }
  }

  /**
   * 優先度を重みに変換
   */
  static mapPriorityToWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }
}