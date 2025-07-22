#!/usr/bin/env node

import { PerformanceMonitor, type SystemSystemPerformanceMetrics, type OptimizationRecommendation, type PerformanceAnomaly, type PerformanceTrend } from '../utils/performance-monitor.js';

/**
 * CLI Performance Dashboard
 * Task C3: Visualization dashboard with CLI display and anomaly detection
 */
class PerformanceDashboard {
  private monitor: PerformanceMonitor;

  constructor() {
    this.monitor = new PerformanceMonitor();
  }

  /**
   * Main dashboard display
   */
  async displayDashboard(): Promise<void> {
    console.clear();
    this.printHeader();
    
    try {
      const summary = await this.monitor.generatePerformanceSummary();
      
      this.printHealthScore(summary.healthScore);
      this.printCurrentMetrics(summary.currentMetrics);
      this.printAnomalies(summary.anomalies);
      this.printTrends(summary.trends);
      this.printRecommendations(summary.recommendations);
      
    } catch (error) {
      console.error('📊 ダッシュボード表示エラー:', error);
    }
    
    this.printFooter();
  }

  /**
   * Display recent metrics history
   */
  async displayMetricsHistory(count: number = 20): Promise<void> {
    console.clear();
    this.printHeader();
    console.log('📈 パフォーマンス履歴\n');

    try {
      const recentMetrics = await this.monitor.getRecentMetrics(count);
      
      if (recentMetrics.length === 0) {
        console.log('🔍 履歴データがありません。システムを実行してデータを蓄積してください。\n');
        return;
      }

      this.printMetricsTable(recentMetrics);
      
    } catch (error) {
      console.error('📊 履歴表示エラー:', error);
    }
  }

  /**
   * Display only anomalies and alerts
   */
  async displayAlerts(): Promise<void> {
    console.clear();
    this.printHeader();
    console.log('🚨 パフォーマンス・アラート\n');

    try {
      const anomalies = await this.monitor.detectAnomalies();
      
      if (anomalies.length === 0) {
        console.log('✅ 異常は検出されていません。システムは正常に動作しています。\n');
        return;
      }

      this.printDetailedAnomalies(anomalies);
      
    } catch (error) {
      console.error('🚨 アラート表示エラー:', error);
    }
  }

  /**
   * Display optimization recommendations
   */
  async displayOptimizations(): Promise<void> {
    console.clear();
    this.printHeader();
    console.log('⚡ 最適化推奨事項\n');

    try {
      const recommendations = await this.monitor.generateOptimizationRecommendations();
      this.printDetailedRecommendations(recommendations);
      
    } catch (error) {
      console.error('⚡ 最適化表示エラー:', error);
    }
  }

  /**
   * Print dashboard header
   */
  private printHeader(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 TradingAssistantX パフォーマンス・ダッシュボード');
    console.log(`📅 ${new Date().toLocaleString('ja-JP')}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }

  /**
   * Print footer with navigation options
   */
  private printFooter(): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 コマンド例:');
    console.log('  pnpm run performance:dashboard     # 総合ダッシュボード');
    console.log('  pnpm run performance:history       # 履歴表示');
    console.log('  pnpm run performance:alerts        # アラート表示');
    console.log('  pnpm run performance:optimize       # 最適化推奨事項');
    console.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * Print health score with visual indicator
   */
  private printHealthScore(healthScore: number): void {
    console.log('🏥 システム・ヘルス・スコア');
    console.log('─────────────────────────────────────────────────────────────');
    
    const barLength = 50;
    const filledLength = Math.round((healthScore / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    let color = '🟢';
    let status = '優良';
    if (healthScore < 70) {
      color = '🟡';
      status = '注意';
    }
    if (healthScore < 50) {
      color = '🟠';
      status = '警告';
    }
    if (healthScore < 30) {
      color = '🔴';
      status = '危険';
    }

    console.log(`${color} スコア: ${healthScore}/100 (${status})`);
    console.log(`[${bar}] ${healthScore}%\n`);
  }

  /**
   * Print current session metrics
   */
  private printCurrentMetrics(metrics: Partial<SystemPerformanceMetrics>): void {
    console.log('📊 現在のセッション・メトリクス');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (!metrics.execution && !metrics.quality && !metrics.resources) {
      console.log('⏳ セッション進行中... (メトリクス収集中)\n');
      return;
    }

    if (metrics.execution) {
      console.log(`⏱️  実行時間:         ${this.formatTime(metrics.execution.totalTime || 0)}`);
      console.log(`📊  情報収集時間:     ${this.formatTime(metrics.execution.infoCollectionTime || 0)}`);
      console.log(`✨  コンテンツ生成:   ${this.formatTime(metrics.execution.contentGenerationTime || 0)}`);
      console.log(`🧠  メモリ使用量:     ${this.formatMemory(metrics.execution.memoryUsage || 0)}`);
    }

    if (metrics.quality) {
      console.log(`🎯  コンテンツ品質:   ${metrics.quality.contentScore}/10`);
      console.log(`🎪  情報関連性:       ${metrics.quality.informationRelevance}/10`);
      console.log(`✅  生成成功率:       ${metrics.quality.generationSuccess ? '成功' : '失敗'}`);
    }

    if (metrics.resources) {
      console.log(`🌐  ブラウザ数:       ${metrics.resources.browserCount}`);
      console.log(`📝  アクティブ・コンテキスト: ${metrics.resources.activeContexts}`);
      console.log(`🔗  ネットワーク要求: ${metrics.resources.networkRequests}`);
    }

    console.log('');
  }

  /**
   * Print anomalies with severity indicators
   */
  private printAnomalies(anomalies: PerformanceAnomaly[]): void {
    console.log('🚨 異常検知');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (anomalies.length === 0) {
      console.log('✅ 異常なし - システムは正常に動作中\n');
      return;
    }

    anomalies.forEach(anomaly => {
      const severityIcon = this.getSeverityIcon(anomaly.severity);
      console.log(`${severityIcon} ${anomaly.description}`);
      console.log(`   現在値: ${this.formatValue(anomaly.value, anomaly.type)}, 閾値: ${this.formatValue(anomaly.threshold, anomaly.type)}`);
    });
    
    console.log('');
  }

  /**
   * Print performance trends
   */
  private printTrends(trends: PerformanceTrend[]): void {
    console.log('📈 パフォーマンス・トレンド');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (trends.length === 0) {
      console.log('📊 トレンド分析には更多くのデータが必要です\n');
      return;
    }

    trends.forEach(trend => {
      const trendIcon = this.getTrendIcon(trend.trend);
      const changeStr = trend.changePercent > 0 ? `+${trend.changePercent.toFixed(1)}%` : `${trend.changePercent.toFixed(1)}%`;
      console.log(`${trendIcon} ${trend.metric}: ${trend.trend} (${changeStr})`);
    });
    
    console.log('');
  }

  /**
   * Print optimization recommendations
   */
  private printRecommendations(recommendations: OptimizationRecommendation[]): void {
    console.log('⚡ 最適化推奨事項');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (recommendations.length === 0) {
      console.log('🎉 現在、最適化の推奨事項はありません\n');
      return;
    }

    recommendations.slice(0, 3).forEach((rec, index) => {
      const priorityIcon = this.getPriorityIcon(rec.priority);
      console.log(`${index + 1}. ${priorityIcon} ${rec.title}`);
      console.log(`   📝 ${rec.description}`);
      console.log(`   💡 期待効果: ${rec.expectedImprovement}`);
    });
    
    if (recommendations.length > 3) {
      console.log(`\n   ... 他 ${recommendations.length - 3} 件の推奨事項`);
    }
    
    console.log('');
  }

  /**
   * Print detailed anomalies for alerts view
   */
  private printDetailedAnomalies(anomalies: PerformanceAnomaly[]): void {
    anomalies.forEach((anomaly, index) => {
      const severityIcon = this.getSeverityIcon(anomaly.severity);
      console.log(`${index + 1}. ${severityIcon} ${anomaly.type.toUpperCase()}: ${anomaly.description}`);
      console.log(`   🕐 発生時刻: ${new Date(anomaly.timestamp).toLocaleString('ja-JP')}`);
      console.log(`   📊 現在値: ${this.formatValue(anomaly.value, anomaly.type)}`);
      console.log(`   ⚠️  閾値: ${this.formatValue(anomaly.threshold, anomaly.type)}`);
      console.log(`   🔥 重要度: ${anomaly.severity.toUpperCase()}`);
      console.log('');
    });
  }

  /**
   * Print detailed recommendations for optimization view
   */
  private printDetailedRecommendations(recommendations: OptimizationRecommendation[]): void {
    recommendations.forEach((rec, index) => {
      const priorityIcon = this.getPriorityIcon(rec.priority);
      console.log(`${index + 1}. ${priorityIcon} ${rec.title} (${rec.category})`);
      console.log(`   📝 説明: ${rec.description}`);
      console.log(`   💡 期待効果: ${rec.expectedImprovement}`);
      console.log(`   🔧 実装方法: ${rec.implementation}`);
      console.log(`   🎯 優先度: ${rec.priority.toUpperCase()}`);
      console.log('');
    });
  }

  /**
   * Print metrics history table
   */
  private printMetricsTable(metrics: SystemPerformanceMetrics[]): void {
    console.log('┌────────────────────────────────────────────────────────────────┐');
    console.log('│ 実行時間 │ メモリ │ 品質スコア │ ブラウザ │ ネットワーク │');
    console.log('├────────────────────────────────────────────────────────────────┤');
    
    metrics.slice(-10).forEach(metric => {
      const time = this.formatTime(metric.execution.totalTime).padEnd(8);
      const memory = this.formatMemory(metric.execution.memoryUsage).padEnd(6);
      const quality = `${metric.quality.contentScore}/10`.padEnd(10);
      const browsers = `${metric.resources.browserCount}`.padEnd(8);
      const requests = `${metric.resources.networkRequests}`.padEnd(12);
      
      console.log(`│ ${time} │ ${memory} │ ${quality} │ ${browsers} │ ${requests} │`);
    });
    
    console.log('└────────────────────────────────────────────────────────────────┘\n');
  }

  // Helper methods for formatting
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
  }

  private formatMemory(mb: number): string {
    if (mb < 1024) return `${mb.toFixed(1)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  }

  private formatValue(value: number, type: string): string {
    switch (type) {
      case 'execution_time': return this.formatTime(value);
      case 'memory_usage': return this.formatMemory(value);
      default: return value.toFixed(1);
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  }
}

// CLI Interface
async function main() {
  const dashboard = new PerformanceDashboard();
  const command = process.argv[2] || 'dashboard';

  switch (command) {
    case 'dashboard':
    case 'main':
      await dashboard.displayDashboard();
      break;
    case 'history':
      const count = parseInt(process.argv[3]) || 20;
      await dashboard.displayMetricsHistory(count);
      break;
    case 'alerts':
      await dashboard.displayAlerts();
      break;
    case 'optimize':
    case 'recommendations':
      await dashboard.displayOptimizations();
      break;
    case 'help':
      console.log(`
🚀 TradingAssistantX パフォーマンス・ダッシュボード

使用法:
  node performance-dashboard.js [command] [options]

コマンド:
  dashboard        メイン・ダッシュボード表示 (デフォルト)
  history [count]  パフォーマンス履歴表示 (デフォルト: 20件)
  alerts          アラート・異常検知のみ表示
  optimize        最適化推奨事項のみ表示
  help            このヘルプを表示

例:
  node performance-dashboard.js
  node performance-dashboard.js history 50
  node performance-dashboard.js alerts
      `);
      break;
    default:
      console.error(`❌ 不明なコマンド: ${command}`);
      console.error('使用法については "node performance-dashboard.js help" を実行してください');
      process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 ダッシュボード実行エラー:', error);
    process.exit(1);
  });
}

export { PerformanceDashboard };