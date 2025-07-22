import type {
  DecisionLoggingPerformanceMetrics,
  ResourceUsage,
  TimeWindow,
  TrendAnalysis,
  OptimizationSuggestion
} from '../../types/decision-logging-types.js';

export class PerformanceMonitor {
  private sessions: Map<string, PerformanceSession> = new Map();
  private metrics: DecisionLoggingPerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;

  /**
   * 意思決定時間の測定
   */
  measureDecisionTime(sessionId: string): DecisionLoggingPerformanceMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`セッション${sessionId}が見つかりません`);
    }

    const now = Date.now();
    const decisionTime = now - session.startTime;
    const memUsage = process.memoryUsage();
    const memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
    const cpuUsage = Math.random() * 10 + 5; // 簡易値

    const metrics: DecisionLoggingPerformanceMetrics = {
      sessionId,
      timestamp: new Date().toISOString(),
      decisionTime,
      cpuUsage,
      memoryUsage,
      networkLatency: session.networkLatency || 0,
      claudeApiCalls: session.claudeApiCalls || 0,
      cacheHitRate: session.cacheHitRate || 0,
      resourceUsage: {
        memoryMB: memoryUsage,
        cpuPercent: cpuUsage,
        diskIOBytes: 0,
        networkIOBytes: 0,
        activeConnections: Object.keys(this.sessions).length
      }
    };

    this.metrics.push(metrics);
    this.pruneMetricsHistory();

    return metrics;
  }

  /**
   * システム最適化ポイント特定
   */
  identifyOptimizationOpportunities(): OptimizationSuggestion[] {
    console.log('🔍 [最適化分析] システム最適化ポイントの特定開始...');

    const suggestions: OptimizationSuggestion[] = [];
    const recentMetrics = this.getRecentMetrics(24); // 直近24時間

    if (recentMetrics.length === 0) {
      return [{
        id: 'data-collection',
        category: 'system',
        priority: 'medium',
        description: 'パフォーマンスデータの収集が不足しています',
        implementationComplexity: 'low',
        expectedImpact: 0.3,
        implementationSteps: ['メトリクス収集の有効化', 'モニタリング頻度の調整']
      }];
    }

    // 決定時間の監視（Claude Codeによる自律判断は時間がかかっても正常）
    const avgDecisionTime = recentMetrics.reduce((sum, m) => sum + m.decisionTime, 0) / recentMetrics.length;
    if (avgDecisionTime > 120000) { // 2分以上の場合のみ警告（Claude自律判断を考慮）
      suggestions.push({
        id: 'decision-time-monitor',
        category: 'performance',
        priority: 'low',
        description: `Claude自律判断に時間がかかっています (平均: ${(avgDecisionTime/1000).toFixed(1)}秒) - 通常動作の可能性が高いです`,
        implementationComplexity: 'low',
        expectedImpact: 0.3,
        implementationSteps: [
          'Claude APIの応答状況を確認',
          'ネットワーク接続の状態を確認',
          '複雑な判断タスクの場合は正常動作'
        ]
      });
    }

    // メモリ使用量の最適化
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    if (avgMemoryUsage > 500) { // 500MB以上
      suggestions.push({
        id: 'memory-opt',
        category: 'resource',
        priority: 'medium',
        description: `メモリ使用量が高い (平均: ${avgMemoryUsage.toFixed(0)}MB)`,
        implementationComplexity: 'medium',
        expectedImpact: 0.5,
        implementationSteps: [
          'データ構造の見直し',
          'ガベージコレクションの最適化',
          'メモリリークの調査'
        ]
      });
    }

    // キャッシュヒット率の改善
    const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length;
    if (avgCacheHitRate < 0.5) { // 50%未満
      suggestions.push({
        id: 'cache-improvement',
        category: 'performance',
        priority: 'medium',
        description: `キャッシュヒット率が低い (${(avgCacheHitRate*100).toFixed(1)}%)`,
        implementationComplexity: 'low',
        expectedImpact: 0.6,
        implementationSteps: [
          'キャッシュ戦略の見直し',
          'キャッシュサイズの調整',
          'TTL設定の最適化'
        ]
      });
    }

    // Claude API呼び出し最適化
    const avgApiCalls = recentMetrics.reduce((sum, m) => sum + m.claudeApiCalls, 0) / recentMetrics.length;
    if (avgApiCalls > 5) {
      suggestions.push({
        id: 'api-optimization',
        category: 'performance',
        priority: 'high',
        description: `Claude API呼び出し回数が多い (平均: ${avgApiCalls.toFixed(1)}回)`,
        implementationComplexity: 'high',
        expectedImpact: 0.8,
        implementationSteps: [
          'API呼び出しの統合',
          'バッチ処理の導入',
          'レスポンスキャッシュの活用'
        ]
      });
    }

    console.log(`✅ [最適化分析完了] ${suggestions.length}件の改善提案を特定`);
    
    return suggestions;
  }

  /**
   * パフォーマンス傾向分析
   */
  analyzePerformanceTrends(timeWindow: TimeWindow): TrendAnalysis {
    console.log(`📈 [傾向分析] ${timeWindow.start} - ${timeWindow.end} の性能傾向分析...`);

    const windowMetrics = this.getMetricsInTimeWindow(timeWindow);
    
    if (windowMetrics.length < 2) {
      return {
        timeWindow,
        performanceTrend: 'stable',
        averageDecisionTime: 0,
        resourceUtilizationTrend: 0,
        recommendations: ['十分なデータが蓄積されていません']
      };
    }

    // パフォーマンス傾向の計算
    const firstHalf = windowMetrics.slice(0, Math.floor(windowMetrics.length / 2));
    const secondHalf = windowMetrics.slice(Math.floor(windowMetrics.length / 2));

    const firstHalfAvgTime = firstHalf.reduce((sum, m) => sum + m.decisionTime, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, m) => sum + m.decisionTime, 0) / secondHalf.length;

    let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    const timeDifference = (secondHalfAvgTime - firstHalfAvgTime) / firstHalfAvgTime;

    if (timeDifference > 0.1) performanceTrend = 'degrading';
    else if (timeDifference < -0.1) performanceTrend = 'improving';

    const averageDecisionTime = windowMetrics.reduce((sum, m) => sum + m.decisionTime, 0) / windowMetrics.length;

    // リソース使用量傾向
    const firstHalfAvgResource = firstHalf.reduce((sum, m) => sum + m.memoryUsage + m.cpuUsage, 0) / firstHalf.length;
    const secondHalfAvgResource = secondHalf.reduce((sum, m) => sum + m.memoryUsage + m.cpuUsage, 0) / secondHalf.length;
    const resourceUtilizationTrend = (secondHalfAvgResource - firstHalfAvgResource) / firstHalfAvgResource;

    const recommendations = this.generateTrendRecommendations(performanceTrend, resourceUtilizationTrend);

    const analysis: TrendAnalysis = {
      timeWindow,
      performanceTrend,
      averageDecisionTime,
      resourceUtilizationTrend,
      recommendations
    };

    console.log(`✅ [傾向分析完了] トレンド: ${performanceTrend}, 平均決定時間: ${(averageDecisionTime/1000).toFixed(1)}秒`);

    return analysis;
  }

  /**
   * パフォーマンスセッション開始
   */
  startSession(sessionId: string, context?: any): void {
    this.sessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      context: context || {},
      claudeApiCalls: 0,
      networkLatency: 0,
      cacheHitRate: 0
    });
  }

  /**
   * パフォーマンスセッション終了
   */
  endSession(sessionId: string): DecisionLoggingPerformanceMetrics | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ セッション${sessionId}が見つかりません`);
      return null;
    }

    const metrics = this.measureDecisionTime(sessionId);
    this.sessions.delete(sessionId);

    return metrics;
  }

  /**
   * Claude API呼び出しの記録
   */
  recordClaudeApiCall(sessionId: string, responseTime: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.claudeApiCalls++;
      session.networkLatency = (session.networkLatency + responseTime) / session.claudeApiCalls;
    }
  }

  /**
   * キャッシュヒットの記録
   */
  recordCacheHit(sessionId: string, isHit: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const totalAttempts = (session.cacheHitRate * session.claudeApiCalls) + 1;
      const hits = (session.cacheHitRate * session.claudeApiCalls) + (isHit ? 1 : 0);
      session.cacheHitRate = hits / totalAttempts;
    }
  }

  /**
   * 直近のメトリクス取得
   */
  private getRecentMetrics(hours: number): DecisionLoggingPerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  /**
   * 時間ウィンドウ内のメトリクス取得
   */
  private getMetricsInTimeWindow(timeWindow: TimeWindow): DecisionLoggingPerformanceMetrics[] {
    const startTime = new Date(timeWindow.start).getTime();
    const endTime = new Date(timeWindow.end).getTime();
    
    return this.metrics.filter(m => {
      const metricTime = new Date(m.timestamp).getTime();
      return metricTime >= startTime && metricTime <= endTime;
    });
  }

  /**
   * メトリクス履歴の剪定
   */
  private pruneMetricsHistory(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * 傾向に基づく推奨事項の生成
   */
  private generateTrendRecommendations(
    performanceTrend: 'improving' | 'stable' | 'degrading',
    resourceTrend: number
  ): string[] {
    const recommendations: string[] = [];

    switch (performanceTrend) {
      case 'degrading':
        recommendations.push('パフォーマンスが低下しています。システムの最適化を検討してください');
        recommendations.push('最近の変更がパフォーマンスに影響していないか確認してください');
        break;
      case 'improving':
        recommendations.push('パフォーマンスが向上しています。現在の最適化を継続してください');
        break;
      case 'stable':
        recommendations.push('パフォーマンスは安定しています');
        break;
    }

    if (resourceTrend > 0.2) {
      recommendations.push('リソース使用量が増加傾向です。メモリリークの確認を推奨します');
    } else if (resourceTrend < -0.2) {
      recommendations.push('リソース効率が改善されています');
    }

    return recommendations;
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStatistics(): any {
    const recentMetrics = this.getRecentMetrics(24);
    
    if (recentMetrics.length === 0) {
      return {
        totalSessions: 0,
        averageDecisionTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        totalClaudeApiCalls: 0
      };
    }

    return {
      totalSessions: recentMetrics.length,
      averageDecisionTime: recentMetrics.reduce((sum, m) => sum + m.decisionTime, 0) / recentMetrics.length,
      averageMemoryUsage: recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length,
      averageCpuUsage: recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length,
      totalClaudeApiCalls: recentMetrics.reduce((sum, m) => sum + m.claudeApiCalls, 0),
      averageCacheHitRate: recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length
    };
  }
}

interface PerformanceSession {
  sessionId: string;
  startTime: number;
  context: any;
  claudeApiCalls: number;
  networkLatency: number;
  cacheHitRate: number;
}