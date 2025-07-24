/**
 * Claude Code SDK 簡潔パフォーマンス追跡・学習サイクル
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 結果分析による継続改善機能
 */

export interface ExecutionRecord {
  id: string;
  timestamp: string;
  action: string;
  success: boolean;
  confidence: number;
  reasoning: string;
  result?: {
    engagement?: number;
    reach?: number;
    errors?: string[];
  };
}

export interface LearningInsight {
  pattern: string;
  success_rate: number;
  recommendation: string;
  confidence: number;
}

export interface PerformanceMetrics {
  total_executions: number;
  success_rate: number;
  action_breakdown: {
    [action: string]: {
      count: number;
      success_rate: number;
    };
  };
  recent_insights: LearningInsight[];
  last_updated: string;
}

/**
 * 簡潔なパフォーマンス追跡・学習サイクルクラス
 * Claude強みを活用した継続改善システム
 */
export class PerformanceTracker {
  private records: ExecutionRecord[] = [];
  private readonly MAX_RECORDS = 100; // メモリ効率化のため制限

  constructor() {
    console.log('✅ PerformanceTracker initialized - Claude学習最適化版');
  }

  /**
   * 実行結果記録
   */
  recordExecution(record: ExecutionRecord): void {
    try {
      this.records.push(record);
      
      // レコード数制限管理
      if (this.records.length > this.MAX_RECORDS) {
        this.records = this.records.slice(-this.MAX_RECORDS);
      }

      console.log(`📊 Execution recorded: ${record.action} (${record.success ? 'success' : 'failed'})`);
    } catch (error) {
      console.error('Failed to record execution:', error);
    }
  }

  /**
   * パフォーマンスメトリクス取得
   */
  getMetrics(): PerformanceMetrics {
    try {
      if (this.records.length === 0) {
        return this.createEmptyMetrics();
      }

      const totalExecutions = this.records.length;
      const successfulExecutions = this.records.filter(r => r.success).length;
      const successRate = successfulExecutions / totalExecutions;

      // アクション別分析
      const actionBreakdown = this.analyzeActionBreakdown();
      
      // 最近のインサイト生成
      const recentInsights = this.generateRecentInsights();

      return {
        total_executions: totalExecutions,
        success_rate: Math.round(successRate * 100) / 100,
        action_breakdown: actionBreakdown,
        recent_insights: recentInsights,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate metrics:', error);
      return this.createEmptyMetrics();
    }
  }

  /**
   * 学習インサイト生成
   * Claude強みを活用した改善提案
   */
  generateLearningInsights(): LearningInsight[] {
    try {
      const insights: LearningInsight[] = [];
      
      // 最成功アクション分析
      const bestAction = this.findBestPerformingAction();
      if (bestAction) {
        insights.push({
          pattern: `${bestAction.action}_success`,
          success_rate: bestAction.success_rate,
          recommendation: `${bestAction.action}アクションの成功率が高いです（${Math.round(bestAction.success_rate * 100)}%）`,
          confidence: 0.8
        });
      }

      // 最近の傾向分析
      const recentTrend = this.analyzeRecentTrend();
      if (recentTrend) {
        insights.push(recentTrend);
      }

      return insights.slice(0, 3); // 最大3つのインサイト
    } catch (error) {
      console.error('Failed to generate learning insights:', error);
      return [];
    }
  }

  /**
   * パフォーマンス改善提案
   */
  getImprovementSuggestions(): string[] {
    try {
      const suggestions: string[] = [];
      const metrics = this.getMetrics();

      // 成功率ベースの提案
      if (metrics.success_rate < 0.7) {
        suggestions.push('全体的な成功率が低いため、判断基準の見直しを推奨します');
      }

      // アクション別提案
      Object.entries(metrics.action_breakdown).forEach(([action, stats]) => {
        if (stats.success_rate < 0.5 && stats.count > 5) {
          suggestions.push(`${action}の成功率が低いため、実行条件の調整を検討してください`);
        }
      });

      return suggestions.slice(0, 3); // 最大3つの提案
    } catch (error) {
      console.error('Failed to generate improvement suggestions:', error);
      return ['システム分析でエラーが発生しました'];
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * アクション別分析
   */
  private analyzeActionBreakdown(): { [action: string]: { count: number; success_rate: number } } {
    const breakdown: { [action: string]: { count: number; success_rate: number } } = {};

    this.records.forEach(record => {
      if (!breakdown[record.action]) {
        breakdown[record.action] = { count: 0, success_rate: 0 };
      }
      breakdown[record.action].count++;
    });

    Object.keys(breakdown).forEach(action => {
      const actionRecords = this.records.filter(r => r.action === action);
      const successCount = actionRecords.filter(r => r.success).length;
      breakdown[action].success_rate = successCount / actionRecords.length;
    });

    return breakdown;
  }

  /**
   * 最高パフォーマンスアクション検索
   */
  private findBestPerformingAction(): { action: string; success_rate: number } | null {
    const breakdown = this.analyzeActionBreakdown();
    let bestAction: { action: string; success_rate: number } | null = null;

    Object.entries(breakdown).forEach(([action, stats]) => {
      if (stats.count >= 3 && (!bestAction || stats.success_rate > bestAction.success_rate)) {
        bestAction = { action, success_rate: stats.success_rate };
      }
    });

    return bestAction;
  }

  /**
   * 最近の傾向分析
   */
  private analyzeRecentTrend(): LearningInsight | null {
    if (this.records.length < 10) return null;

    const recent = this.records.slice(-10);
    const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
    const overall = this.records.filter(r => r.success).length / this.records.length;

    if (recentSuccessRate > overall + 0.1) {
      return {
        pattern: 'improving_trend',
        success_rate: recentSuccessRate,
        recommendation: '最近のパフォーマンスが向上しています',
        confidence: 0.7
      };
    } else if (recentSuccessRate < overall - 0.1) {
      return {
        pattern: 'declining_trend',
        success_rate: recentSuccessRate,
        recommendation: '最近のパフォーマンスが低下しています',
        confidence: 0.7
      };
    }

    return null;
  }

  /**
   * 最近のインサイト生成
   */
  private generateRecentInsights(): LearningInsight[] {
    return this.generateLearningInsights();
  }

  /**
   * 空メトリクス作成
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      total_executions: 0,
      success_rate: 0,
      action_breakdown: {},
      recent_insights: [],
      last_updated: new Date().toISOString()
    };
  }
}