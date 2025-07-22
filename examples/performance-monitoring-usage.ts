#!/usr/bin/env node

/**
 * TradingAssistantX パフォーマンス監視システム使用例
 * 
 * このファイルは、実装されたパフォーマンス監視システムの
 * 実際の使用方法を示すサンプルコードです。
 */

import { PerformanceMonitor } from '../src/utils/performance-monitor.js';
import { PerformanceDashboard } from '../src/scripts/performance-dashboard.js';

/**
 * 例1: 基本的なパフォーマンス監視セッション
 */
async function basicPerformanceMonitoring() {
  console.log('📊 例1: 基本的なパフォーマンス監視');
  console.log('═══════════════════════════════════════\n');

  const monitor = new PerformanceMonitor();
  
  // セッション開始
  monitor.startSession();
  console.log('✅ パフォーマンス監視セッション開始');

  // 情報収集の模擬（実際のシステムではPlaywright等が実行）
  const infoCollectionStart = Date.now();
  await simulateInfoCollection();
  const infoCollectionEnd = Date.now();
  
  monitor.recordInfoCollectionTime(infoCollectionStart, infoCollectionEnd);
  console.log(`📊 情報収集時間: ${infoCollectionEnd - infoCollectionStart}ms`);

  // コンテンツ生成の模擬（実際のシステムではClaude API実行）
  const contentGenerationStart = Date.now();
  await simulateContentGeneration();
  const contentGenerationEnd = Date.now();
  
  monitor.recordContentGenerationTime(contentGenerationStart, contentGenerationEnd);
  console.log(`✨ コンテンツ生成時間: ${contentGenerationEnd - contentGenerationStart}ms`);

  // メモリ使用量記録
  monitor.recordMemoryUsage();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`🧠 メモリ使用量: ${memoryUsage.toFixed(1)}MB`);

  // 品質メトリクス記録（実際のシステムでは品質評価システムが算出）
  monitor.recordQualityMetrics(8.5, 9.2, true);
  console.log(`🎯 品質スコア: 8.5/10, 関連性: 9.2/10, 成功: true`);

  // リソース使用量記録（実際のシステムではブラウザマネージャーが提供）
  monitor.recordResourceUsage(2, 4, 15);
  console.log(`🌐 リソース: ブラウザ2個, コンテキスト4個, ネットワーク要求15件`);

  // セッション終了・メトリクス保存
  const finalMetrics = await monitor.endSession();
  console.log('✅ セッション終了・メトリクス保存完了');
  console.log('📁 メトリクス保存場所: data/metrics-history.yaml\n');
  
  return finalMetrics;
}

/**
 * 例2: 自動最適化推奨システムの使用
 */
async function optimizationRecommendationExample() {
  console.log('⚡ 例2: 自動最適化推奨システム');
  console.log('═══════════════════════════════════════\n');

  const monitor = new PerformanceMonitor();
  
  // 最適化推奨事項の取得
  const recommendations = await monitor.generateOptimizationRecommendations();
  
  console.log('🎯 システム最適化推奨事項:');
  recommendations.forEach((rec, index) => {
    const priorityIcon = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚡' : '💡';
    console.log(`\n${index + 1}. ${priorityIcon} ${rec.title} (${rec.category})`);
    console.log(`   📝 ${rec.description}`);
    console.log(`   💡 期待効果: ${rec.expectedImprovement}`);
    console.log(`   🔧 実装: ${rec.implementation}`);
  });

  console.log('\n');
  return recommendations;
}

/**
 * 例3: 異常検知とアラートシステム
 */
async function anomalyDetectionExample() {
  console.log('🚨 例3: 異常検知とアラートシステム');
  console.log('═══════════════════════════════════════\n');

  const monitor = new PerformanceMonitor();
  
  // 異常検知実行
  const anomalies = await monitor.detectAnomalies();
  
  if (anomalies.length === 0) {
    console.log('✅ 異常は検出されませんでした。システムは正常に動作しています。');
  } else {
    console.log('⚠️  以下の異常が検出されました:');
    anomalies.forEach((anomaly, index) => {
      const severityIcon = getSeverityIcon(anomaly.severity);
      console.log(`\n${index + 1}. ${severityIcon} ${anomaly.type.toUpperCase()}`);
      console.log(`   📝 ${anomaly.description}`);
      console.log(`   📊 現在値: ${formatAnomalyValue(anomaly.value, anomaly.type)}`);
      console.log(`   ⚠️  閾値: ${formatAnomalyValue(anomaly.threshold, anomaly.type)}`);
      console.log(`   🔥 重要度: ${anomaly.severity.toUpperCase()}`);
    });
  }

  console.log('\n');
  return anomalies;
}

/**
 * 例4: パフォーマンストレンド分析
 */
async function performanceTrendExample() {
  console.log('📈 例4: パフォーマンストレンド分析');
  console.log('═══════════════════════════════════════\n');

  const monitor = new PerformanceMonitor();
  
  // トレンド分析実行
  const trends = await monitor.analyzePerformanceTrends();
  
  if (trends.length === 0) {
    console.log('📊 トレンド分析には更多くのデータが必要です。');
    console.log('💡 システムを数回実行してデータを蓄積してください。');
  } else {
    console.log('📊 パフォーマンストレンド分析結果:');
    trends.forEach(trend => {
      const trendIcon = getTrendIcon(trend.trend);
      const changeStr = trend.changePercent > 0 ? `+${trend.changePercent.toFixed(1)}%` : `${trend.changePercent.toFixed(1)}%`;
      console.log(`${trendIcon} ${trend.metric}: ${trend.trend} (${changeStr}) - ${trend.period}`);
    });
  }

  console.log('\n');
  return trends;
}

/**
 * 例5: 総合パフォーマンスサマリー
 */
async function comprehensivePerformanceSummary() {
  console.log('📋 例5: 総合パフォーマンスサマリー');
  console.log('═══════════════════════════════════════\n');

  const monitor = new PerformanceMonitor();
  
  // 総合サマリー取得
  const summary = await monitor.generatePerformanceSummary();
  
  console.log('🏥 システムヘルススコア');
  console.log(`📊 ${summary.healthScore}/100`);
  
  const barLength = 30;
  const filledLength = Math.round((summary.healthScore / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`[${bar}] ${summary.healthScore}%`);

  console.log('\n🎯 推奨事項数:', summary.recommendations.length);
  console.log('🚨 検出異常数:', summary.anomalies.length);
  console.log('📈 分析トレンド数:', summary.trends.length);

  console.log('\n');
  return summary;
}

/**
 * 例6: CLIダッシュボードの使用
 */
async function dashboardUsageExample() {
  console.log('🖥️  例6: CLIダッシュボードの使用方法');
  console.log('═══════════════════════════════════════\n');

  console.log('💡 ダッシュボードコマンド例:');
  console.log('');
  console.log('# メインダッシュボード表示');
  console.log('node src/scripts/performance-dashboard.ts');
  console.log('');
  console.log('# パフォーマンス履歴表示（最新20件）');
  console.log('node src/scripts/performance-dashboard.ts history');
  console.log('');
  console.log('# パフォーマンス履歴表示（最新50件）');
  console.log('node src/scripts/performance-dashboard.ts history 50');
  console.log('');
  console.log('# アラート・異常検知のみ表示');
  console.log('node src/scripts/performance-dashboard.ts alerts');
  console.log('');
  console.log('# 最適化推奨事項のみ表示');
  console.log('node src/scripts/performance-dashboard.ts optimize');
  console.log('');
  console.log('# ヘルプ表示');
  console.log('node src/scripts/performance-dashboard.ts help');
  console.log('');

  // 実際にダッシュボードを表示（デモ）
  console.log('🚀 実際のダッシュボード表示:');
  console.log('─────────────────────────────────────');
  
  const dashboard = new PerformanceDashboard();
  await dashboard.displayDashboard();
}

/**
 * 例7: 既存システムとの統合例
 */
async function systemIntegrationExample() {
  console.log('🔗 例7: 既存システムとの統合例');
  console.log('═══════════════════════════════════════\n');

  console.log('💡 AutonomousExecutorとの統合例:');
  console.log('```typescript');
  console.log('// 既存のAutonomousExecutorクラスに統合');
  console.log('import { PerformanceMonitor } from "./utils/performance-monitor.js";');
  console.log('');
  console.log('export class AutonomousExecutor {');
  console.log('  private performanceMonitor = new PerformanceMonitor();');
  console.log('');
  console.log('  async executeClaudeAutonomous(): Promise<Decision> {');
  console.log('    // パフォーマンス監視開始');
  console.log('    this.performanceMonitor.startSession();');
  console.log('');
  console.log('    try {');
  console.log('      // 情報収集');
  console.log('      const infoStart = Date.now();');
  console.log('      const collectedInfo = await this.collectInformation();');
  console.log('      this.performanceMonitor.recordInfoCollectionTime(infoStart, Date.now());');
  console.log('');
  console.log('      // コンテンツ生成');
  console.log('      const contentStart = Date.now();');
  console.log('      const decision = await this.generateDecision(collectedInfo);');
  console.log('      this.performanceMonitor.recordContentGenerationTime(contentStart, Date.now());');
  console.log('');
  console.log('      // 品質評価');
  console.log('      const quality = this.evaluateDecision(decision);');
  console.log('      this.performanceMonitor.recordQualityMetrics(');
  console.log('        quality.contentScore,');
  console.log('        quality.informationRelevance,');
  console.log('        quality.generationSuccess');
  console.log('      );');
  console.log('');
  console.log('      // リソース記録');
  console.log('      this.performanceMonitor.recordResourceUsage(');
  console.log('        this.browserManager.getActiveBrowserCount(),');
  console.log('        this.contextManager.getActiveContextsCount(),');
  console.log('        this.networkTracker.getRequestCount()');
  console.log('      );');
  console.log('');
  console.log('      return decision;');
  console.log('');
  console.log('    } finally {');
  console.log('      // セッション終了・メトリクス保存');
  console.log('      await this.performanceMonitor.endSession();');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```');
  console.log('');
}

// ヘルパー関数
function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving': return '📈';
    case 'degrading': return '📉';
    case 'stable': return '➡️';
    default: return '❓';
  }
}

function formatAnomalyValue(value: number, type: string): string {
  switch (type) {
    case 'execution_time':
      return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
    case 'memory_usage':
      return value < 1024 ? `${value.toFixed(1)}MB` : `${(value / 1024).toFixed(1)}GB`;
    default:
      return value.toFixed(1);
  }
}

// 模擬関数
async function simulateInfoCollection(): Promise<void> {
  // 実際のシステムではPlaywrightでの情報収集
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
}

async function simulateContentGeneration(): Promise<void> {
  // 実際のシステムではClaude APIでのコンテンツ生成
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
}

// メイン実行関数
async function main() {
  console.log('🚀 TradingAssistantX パフォーマンス監視システム使用例');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 全ての使用例を順次実行
    await basicPerformanceMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 視認性のため待機

    await optimizationRecommendationExample();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await anomalyDetectionExample();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await performanceTrendExample();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await comprehensivePerformanceSummary();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await dashboardUsageExample();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await systemIntegrationExample();

    console.log('✅ 全ての使用例実行完了！');
    console.log('📁 メトリクスデータ: data/metrics-history.yaml');
    console.log('🖥️  ダッシュボード: node src/scripts/performance-dashboard.ts');
    
  } catch (error) {
    console.error('❌ 使用例実行エラー:', error);
    process.exit(1);
  }
}

// スクリプト直接実行時
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  basicPerformanceMonitoring,
  optimizationRecommendationExample,
  anomalyDetectionExample,
  performanceTrendExample,
  comprehensivePerformanceSummary,
  dashboardUsageExample,
  systemIntegrationExample
};