import type {
  DecisionChain,
  DecisionLoggingDecisionLoggingPerformanceMetrics,
  QualityScore,
  OptimizationSuggestion,
  VisualFlow,
  FlowNode,
  FlowEdge,
  Dashboard,
  DashboardSection,
  QualityReport,
  OptimizationViz,
  PriorityMatrix,
  ImplementationStep,
  TimeWindow,
  QualityTrend,
  ImprovementArea,
  DashboardAlert,
  VisualizationConfig
} from '../../types/decision-logging-types.js';

export class VisualizationFormatter {
  /**
   * リアルタイム判断フロー表示
   */
  formatDecisionFlow(decisionChain: DecisionChain): VisualFlow {
    console.log('🌊 [フロー可視化] 意思決定フローの可視化データ生成開始...');

    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // 開始ノード
    nodes.push({
      id: 'start',
      type: 'start',
      label: '決定プロセス開始',
      data: { sessionId: decisionChain.sessionId },
      position: { x: 0, y: 0 },
      metadata: {
        executionTime: 0,
        confidence: 1.0,
        status: 'completed'
      }
    });

    // 各ステップをノードに変換
    let yPosition = 100;
    for (let i = 0; i < decisionChain.steps.length; i++) {
      const step = decisionChain.steps[i];
      const nodeId = `step-${i}`;

      nodes.push({
        id: nodeId,
        type: this.mapStepTypeToNodeType(step.stepType),
        label: this.truncateText(step.reasoning, 50),
        data: {
          stepType: step.stepType,
          confidence: step.confidenceLevel,
          executionTime: step.executionTime,
          fullReasoning: step.reasoning
        },
        position: { x: 200, y: yPosition },
        metadata: {
          executionTime: step.executionTime,
          confidence: step.confidenceLevel,
          status: 'completed'
        }
      });

      // 前のノードとの接続
      const sourceId = i === 0 ? 'start' : `step-${i-1}`;
      edges.push({
        id: `edge-${sourceId}-${nodeId}`,
        source: sourceId,
        target: nodeId,
        type: 'flow',
        metadata: {
          weight: step.confidenceLevel,
          traversed: true
        }
      });

      yPosition += 120;
    }

    // 分岐ノードの追加
    for (const branch of decisionChain.branches) {
      const branchNodeId = `branch-${branch.id}`;
      nodes.push({
        id: branchNodeId,
        type: 'branch',
        label: this.truncateText(branch.reasoning, 40),
        data: {
          branchType: branch.branchType,
          condition: branch.condition,
          chosen: branch.chosen
        },
        position: { x: 400, y: yPosition },
        metadata: {
          executionTime: 0,
          confidence: branch.chosen ? 0.8 : 0.3,
          status: branch.chosen ? 'completed' : 'in_progress'
        }
      });

      // 分岐エッジ
      edges.push({
        id: `edge-branch-${branch.id}`,
        source: branch.parentStepId,
        target: branchNodeId,
        type: branch.branchType === 'fallback' ? 'fallback' : 'conditional',
        label: branch.branchType,
        metadata: {
          weight: branch.chosen ? 0.8 : 0.3,
          traversed: branch.chosen
        }
      });

      yPosition += 80;
    }

    // 終了ノード
    nodes.push({
      id: 'end',
      type: 'end',
      label: '決定完了',
      data: { totalExecutionTime: decisionChain.totalExecutionTime },
      position: { x: 200, y: yPosition },
      metadata: {
        executionTime: decisionChain.totalExecutionTime,
        confidence: decisionChain.qualityScore,
        status: 'completed'
      }
    });

    // 最後のステップから終了ノードへのエッジ
    if (decisionChain.steps.length > 0) {
      const lastStepId = `step-${decisionChain.steps.length - 1}`;
      edges.push({
        id: `edge-${lastStepId}-end`,
        source: lastStepId,
        target: 'end',
        type: 'flow',
        metadata: {
          weight: 1.0,
          traversed: true
        }
      });
    }

    const visualFlow: VisualFlow = {
      sessionId: decisionChain.sessionId,
      nodes,
      edges,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        executionPath: this.extractExecutionPath(nodes, edges),
        criticalPath: this.identifyCriticalPath(nodes, edges)
      }
    };

    console.log(`✅ [フロー可視化完了] ${nodes.length}ノード、${edges.length}エッジを生成`);
    return visualFlow;
  }

  /**
   * パフォーマンスダッシュボード生成
   */
  generatePerformanceDashboard(metrics: DecisionLoggingPerformanceMetrics[]): Dashboard {
    console.log(`📊 [ダッシュボード生成] ${metrics.length}件のメトリクスからダッシュボード生成...`);

    if (metrics.length === 0) {
      return this.createEmptyDashboard();
    }

    const timeRange = this.calculateTimeRange(metrics);
    const sections: DashboardSection[] = [];

    // 決定時間の傾向
    sections.push({
      id: 'decision-time-trend',
      title: '意思決定時間の傾向',
      type: 'chart',
      data: this.prepareDecisionTimeChartData(metrics),
      visualization: {
        chartType: 'line',
        xAxis: 'timestamp',
        yAxis: 'decisionTime',
        colors: ['#3b82f6'],
        options: {
          unit: 'ms',
          title: '意思決定時間 (ミリ秒)'
        }
      }
    });

    // リソース使用量
    sections.push({
      id: 'resource-usage',
      title: 'リソース使用量',
      type: 'chart',
      data: this.prepareResourceUsageChartData(metrics),
      visualization: {
        chartType: 'bar',
        xAxis: 'timestamp',
        yAxis: 'usage',
        colors: ['#ef4444', '#f59e0b'],
        options: {
          stacked: true,
          title: 'CPU & メモリ使用量'
        }
      }
    });

    // 統計サマリー
    sections.push({
      id: 'summary-stats',
      title: '統計サマリー',
      type: 'table',
      data: this.prepareSummaryStats(metrics),
      visualization: {
        chartType: 'bar',
        xAxis: 'metric',
        yAxis: 'value',
        colors: ['#10b981'],
        options: {}
      }
    });

    // API呼び出し効率
    sections.push({
      id: 'api-efficiency',
      title: 'Claude API効率',
      type: 'chart',
      data: this.prepareApiEfficiencyData(metrics),
      visualization: {
        chartType: 'scatter',
        xAxis: 'apiCalls',
        yAxis: 'decisionTime',
        colors: ['#8b5cf6'],
        options: {
          title: 'API呼び出し数vs意思決定時間'
        }
      }
    });

    const alerts = this.generatePerformanceAlerts(metrics);

    const dashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeRange,
      sections,
      overallHealth: this.calculateOverallHealth(metrics),
      alerts
    };

    console.log(`✅ [ダッシュボード生成完了] ${sections.length}セクション、${alerts.length}アラート`);
    return dashboard;
  }

  /**
   * 判断品質レポート作成
   */
  createQualityReport(qualityScores: QualityScore[]): QualityReport {
    console.log(`📋 [品質レポート] ${qualityScores.length}件の品質スコアからレポート生成...`);

    if (qualityScores.length === 0) {
      return {
        id: `quality-report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeRange: { start: '', end: '', duration: 0 },
        overallQuality: 0,
        qualityTrends: [],
        improvementAreas: [],
        recommendations: ['十分なデータが蓄積されていません']
      };
    }

    const timeRange = this.calculateQualityTimeRange(qualityScores);
    const overallQuality = qualityScores.reduce((sum, qs) => sum + qs.overallScore, 0) / qualityScores.length;

    // 品質トレンド分析
    const qualityTrends = this.analyzeQualityTrends(qualityScores);

    // 改善領域の特定
    const improvementAreas = this.identifyQualityImprovementAreas(qualityScores);

    // 推奨事項の生成
    const recommendations = this.generateQualityRecommendations(qualityScores, qualityTrends);

    const report: QualityReport = {
      id: `quality-report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeRange,
      overallQuality,
      qualityTrends,
      improvementAreas,
      recommendations
    };

    console.log(`✅ [品質レポート完了] 総合品質: ${overallQuality.toFixed(2)}, 改善領域: ${improvementAreas.length}件`);
    return report;
  }

  /**
   * 最適化提案の可視化
   */
  visualizeOptimizationSuggestions(suggestions: OptimizationSuggestion[]): OptimizationViz {
    console.log(`🎯 [最適化可視化] ${suggestions.length}件の提案を可視化...`);

    const priorityMatrix = this.createPriorityMatrix(suggestions);
    const implementationRoadmap = this.createImplementationRoadmap(suggestions);

    const viz: OptimizationViz = {
      id: `optimization-viz-${Date.now()}`,
      timestamp: new Date().toISOString(),
      suggestions,
      priorityMatrix,
      implementationRoadmap
    };

    console.log(`✅ [最適化可視化完了] 優先度マトリクス、実装ロードマップ生成`);
    return viz;
  }

  // ヘルパーメソッド

  private mapStepTypeToNodeType(stepType: string): FlowNode['type'] {
    const mapping: Record<string, FlowNode['type']> = {
      'context_analysis': 'decision',
      'reasoning': 'decision',
      'decision_generation': 'action',
      'validation': 'decision',
      'execution': 'action'
    };
    return mapping[stepType] || 'decision';
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private extractExecutionPath(nodes: FlowNode[], edges: FlowEdge[]): string[] {
    const path: string[] = [];
    
    // 実際に実行されたパスを辿る
    const traversedEdges = edges.filter(e => e.metadata.traversed);
    
    if (traversedEdges.length > 0) {
      let currentNode = 'start';
      path.push(currentNode);
      
      while (currentNode !== 'end') {
        const nextEdge = traversedEdges.find(e => e.source === currentNode);
        if (nextEdge) {
          currentNode = nextEdge.target;
          path.push(currentNode);
        } else {
          break;
        }
      }
    }
    
    return path;
  }

  private identifyCriticalPath(nodes: FlowNode[], edges: FlowEdge[]): string[] {
    // 最も時間がかかったノードを通るパスを特定
    const sortedNodes = nodes
      .filter(n => n.type !== 'start' && n.type !== 'end')
      .sort((a, b) => b.metadata.executionTime - a.metadata.executionTime);
    
    return sortedNodes.slice(0, 3).map(n => n.id);
  }

  private calculateTimeRange(metrics: DecisionLoggingPerformanceMetrics[]): TimeWindow {
    const timestamps = metrics.map(m => new Date(m.timestamp).getTime());
    const start = new Date(Math.min(...timestamps)).toISOString();
    const end = new Date(Math.max(...timestamps)).toISOString();
    
    return {
      start,
      end,
      duration: Math.max(...timestamps) - Math.min(...timestamps)
    };
  }

  private prepareDecisionTimeChartData(metrics: DecisionLoggingPerformanceMetrics[]): any[] {
    return metrics.map(m => ({
      timestamp: new Date(m.timestamp).toISOString(),
      decisionTime: m.decisionTime,
      label: `${m.decisionTime}ms`
    }));
  }

  private prepareResourceUsageChartData(metrics: DecisionLoggingPerformanceMetrics[]): any[] {
    return metrics.map(m => ({
      timestamp: new Date(m.timestamp).toISOString(),
      cpu: m.cpuUsage,
      memory: m.memoryUsage,
      label: `CPU: ${m.cpuUsage}%, Memory: ${m.memoryUsage}MB`
    }));
  }

  private prepareSummaryStats(metrics: DecisionLoggingPerformanceMetrics[]): any[] {
    const avgDecisionTime = metrics.reduce((sum, m) => sum + m.decisionTime, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgCpu = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const totalApiCalls = metrics.reduce((sum, m) => sum + m.claudeApiCalls, 0);

    return [
      { metric: '平均意思決定時間', value: `${(avgDecisionTime/1000).toFixed(1)}秒`, unit: 's' },
      { metric: '平均メモリ使用量', value: `${avgMemory.toFixed(0)}MB`, unit: 'MB' },
      { metric: '平均CPU使用率', value: `${avgCpu.toFixed(1)}%`, unit: '%' },
      { metric: '総API呼び出し数', value: totalApiCalls.toString(), unit: '回' },
      { metric: 'セッション数', value: metrics.length.toString(), unit: '件' }
    ];
  }

  private prepareApiEfficiencyData(metrics: DecisionLoggingPerformanceMetrics[]): any[] {
    return metrics.map(m => ({
      apiCalls: m.claudeApiCalls,
      decisionTime: m.decisionTime,
      efficiency: m.claudeApiCalls > 0 ? m.decisionTime / m.claudeApiCalls : 0,
      label: `API: ${m.claudeApiCalls}回, 時間: ${m.decisionTime}ms`
    }));
  }

  private generatePerformanceAlerts(metrics: DecisionLoggingPerformanceMetrics[]): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];
    const recent = metrics.slice(-10); // 直近10件

    if (recent.length === 0) return alerts;

    const avgDecisionTime = recent.reduce((sum, m) => sum + m.decisionTime, 0) / recent.length;
    if (avgDecisionTime > 15000) {
      alerts.push({
        id: `alert-decision-time-${Date.now()}`,
        severity: 'critical',
        message: `意思決定時間が長すぎます (平均: ${(avgDecisionTime/1000).toFixed(1)}秒)`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    if (avgMemory > 800) {
      alerts.push({
        id: `alert-memory-${Date.now()}`,
        severity: 'warning',
        message: `メモリ使用量が高い (平均: ${avgMemory.toFixed(0)}MB)`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    return alerts;
  }

  private calculateOverallHealth(metrics: DecisionLoggingPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0.5;

    const recent = metrics.slice(-5);
    const avgDecisionTime = recent.reduce((sum, m) => sum + m.decisionTime, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgCpu = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;

    let health = 1.0;
    if (avgDecisionTime > 10000) health -= 0.3;
    if (avgMemory > 500) health -= 0.2;
    if (avgCpu > 80) health -= 0.2;

    return Math.max(0, Math.min(1, health));
  }

  private createEmptyDashboard(): Dashboard {
    return {
      id: `empty-dashboard-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeRange: { start: '', end: '', duration: 0 },
      sections: [{
        id: 'empty-message',
        title: 'データなし',
        type: 'summary',
        data: { message: 'パフォーマンスデータが蓄積されていません' },
        visualization: {
          chartType: 'bar',
          xAxis: '',
          yAxis: '',
          colors: [],
          options: {}
        }
      }],
      overallHealth: 0.5,
      alerts: []
    };
  }

  private calculateQualityTimeRange(qualityScores: QualityScore[]): TimeWindow {
    const timestamps = qualityScores.map(qs => new Date(qs.timestamp).getTime());
    const start = new Date(Math.min(...timestamps)).toISOString();
    const end = new Date(Math.max(...timestamps)).toISOString();
    
    return {
      start,
      end,
      duration: Math.max(...timestamps) - Math.min(...timestamps)
    };
  }

  private analyzeQualityTrends(qualityScores: QualityScore[]): QualityTrend[] {
    if (qualityScores.length < 2) return [];

    const mid = Math.floor(qualityScores.length / 2);
    const firstHalf = qualityScores.slice(0, mid);
    const secondHalf = qualityScores.slice(mid);

    const trends: QualityTrend[] = [];
    const metrics = ['overallScore', 'reasoningQuality', 'executionEfficiency', 'outcomeAccuracy'];

    for (const metric of metrics) {
      const firstAvg = firstHalf.reduce((sum, qs) => sum + (qs as any)[metric], 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, qs) => sum + (qs as any)[metric], 0) / secondHalf.length;
      
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      let trend: QualityTrend['trend'] = 'stable';
      
      if (changePercent > 5) trend = 'improving';
      else if (changePercent < -5) trend = 'declining';

      trends.push({
        metric,
        trend,
        currentValue: secondAvg,
        previousValue: firstAvg,
        changePercent
      });
    }

    return trends;
  }

  private identifyQualityImprovementAreas(qualityScores: QualityScore[]): ImprovementArea[] {
    if (qualityScores.length === 0) return [];

    const latest = qualityScores[qualityScores.length - 1];
    const areas: ImprovementArea[] = [];

    if (latest.reasoningQuality < 0.7) {
      areas.push({
        area: '推論品質',
        currentScore: latest.reasoningQuality,
        targetScore: 0.8,
        priority: 'high',
        actionItems: [
          '推論プロセスの詳細化',
          '論理構造の改善',
          'コンテキスト分析の強化'
        ]
      });
    }

    if (latest.executionEfficiency < 0.7) {
      areas.push({
        area: '実行効率',
        currentScore: latest.executionEfficiency,
        targetScore: 0.8,
        priority: 'medium',
        actionItems: [
          '時間予測精度の向上',
          'プロセス最適化',
          '並列処理の活用'
        ]
      });
    }

    if (latest.outcomeAccuracy < 0.7) {
      areas.push({
        area: '結果精度',
        currentScore: latest.outcomeAccuracy,
        targetScore: 0.8,
        priority: 'high',
        actionItems: [
          'エラーハンドリング強化',
          'バリデーション改善',
          '品質チェック追加'
        ]
      });
    }

    return areas;
  }

  private generateQualityRecommendations(
    qualityScores: QualityScore[],
    trends: QualityTrend[]
  ): string[] {
    const recommendations: string[] = [];

    const decliningTrends = trends.filter(t => t.trend === 'declining');
    if (decliningTrends.length > 0) {
      recommendations.push(`${decliningTrends.map(t => t.metric).join(', ')}の品質が低下しています`);
    }

    const avgOverallScore = qualityScores.reduce((sum, qs) => sum + qs.overallScore, 0) / qualityScores.length;
    if (avgOverallScore < 0.6) {
      recommendations.push('全体的な品質向上が必要です。システム見直しを推奨します');
    }

    if (qualityScores.length < 10) {
      recommendations.push('より多くのデータ蓄積により、精度の高い分析が可能になります');
    }

    return recommendations;
  }

  private createPriorityMatrix(suggestions: OptimizationSuggestion[]): PriorityMatrix {
    const matrix: PriorityMatrix = {
      highImpactLowComplexity: [],
      highImpactHighComplexity: [],
      lowImpactLowComplexity: [],
      lowImpactHighComplexity: []
    };

    for (const suggestion of suggestions) {
      const highImpact = suggestion.expectedImpact > 0.6;
      const lowComplexity = suggestion.implementationComplexity === 'low';

      if (highImpact && lowComplexity) {
        matrix.highImpactLowComplexity.push(suggestion);
      } else if (highImpact && !lowComplexity) {
        matrix.highImpactHighComplexity.push(suggestion);
      } else if (!highImpact && lowComplexity) {
        matrix.lowImpactLowComplexity.push(suggestion);
      } else {
        matrix.lowImpactHighComplexity.push(suggestion);
      }
    }

    return matrix;
  }

  private createImplementationRoadmap(suggestions: OptimizationSuggestion[]): ImplementationStep[] {
    // 優先度と複雑度に基づいてフェーズ分け
    const highPriority = suggestions.filter(s => s.priority === 'high');
    const mediumPriority = suggestions.filter(s => s.priority === 'medium');
    const lowPriority = suggestions.filter(s => s.priority === 'low');

    const steps: ImplementationStep[] = [];

    if (highPriority.length > 0) {
      steps.push({
        id: 'phase-1-critical',
        phase: 1,
        description: '緊急度の高い最適化項目',
        suggestions: highPriority.map(s => s.description),
        estimatedDuration: highPriority.length * 5, // 5日/項目の概算
        dependencies: []
      });
    }

    if (mediumPriority.length > 0) {
      steps.push({
        id: 'phase-2-important',
        phase: 2,
        description: '重要な改善項目',
        suggestions: mediumPriority.map(s => s.description),
        estimatedDuration: mediumPriority.length * 3,
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : []
      });
    }

    if (lowPriority.length > 0) {
      steps.push({
        id: 'phase-3-enhancement',
        phase: 3,
        description: '追加の最適化項目',
        suggestions: lowPriority.map(s => s.description),
        estimatedDuration: lowPriority.length * 2,
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : []
      });
    }

    return steps;
  }
}