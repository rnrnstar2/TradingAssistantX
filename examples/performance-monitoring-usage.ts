#!/usr/bin/env node

/**
 * TradingAssistantX パフォーマンス関連機能使用例
 * 
 * このファイルは、実装されたパフォーマンス関連機能の
 * 実際の使用方法を示すサンプルコードです。
 */

import { PerformancePerfector } from '../src/lib/quality/performance-perfector.js';
import { XPerformanceAnalyzer } from '../src/lib/x-performance-analyzer.js';

/**
 * 例1: システムパフォーマンス最適化
 */
async function systemPerformanceOptimization() {
  console.log('📊 例1: システムパフォーマンス最適化');
  console.log('═══════════════════════════════════════\n');

  const perfector = new PerformancePerfector();
  
  console.log('⚡ システムパフォーマンス最適化を開始...');
  
  try {
    // システム最適化実行
    const result = await perfector.perfectSystemPerformance();
    
    console.log('✅ パフォーマンス最適化完了');
    console.log(`📊 現在スコア: ${result.current_score}`);
    console.log(`🎯 目標スコア: ${result.target_score}`);
    console.log(`🏆 達成状況: ${result.achievement_status}`);
    
    if (result.performance_improvements) {
      console.log('\n🔧 最適化結果:');
      if (result.performance_improvements.cpu_optimization) {
        console.log(`💻 CPU最適化: ${JSON.stringify(result.performance_improvements.cpu_optimization)}`);
      }
      if (result.performance_improvements.memory_optimization) {
        console.log(`🧠 メモリ最適化: ${JSON.stringify(result.performance_improvements.memory_optimization)}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ パフォーマンス最適化エラー:', error);
    throw error;
  }
}

/**
 * 例2: Xアカウントパフォーマンス分析
 */
async function xAccountAnalysisExample() {
  console.log('⚡ 例2: Xアカウントパフォーマンス分析');
  console.log('═══════════════════════════════════════\n');

  const analyzer = new XPerformanceAnalyzer();
  
  try {
    console.log('🚀 X分析システム初期化中...');
    await analyzer.initialize();
    
    // デモ用のユーザー名（実際の使用時は適切なユーザー名に変更）
    const testUsername = 'example_user';
    console.log(`📊 アカウント「${testUsername}」の分析を開始...`);
    
    // アカウントメトリクス分析（実際の実行では認証が必要）
    console.log('💡 実際の実行にはX API認証が必要です');
    console.log('📋 分析可能な項目:');
    console.log('   - フォロワー数');
    console.log('   - 投稿パフォーマンス');
    console.log('   - エンゲージメント率');
    console.log('   - リーチとインプレッション');
    
    return { status: 'demo_completed', analyzed_user: testUsername };
    
  } catch (error) {
    console.error('❌ X分析エラー:', error);
    return { status: 'error', error: error };
  } finally {
    await analyzer.cleanup();
    console.log('✅ X分析システム終了\n');
  }
}

/**
 * 例3: システムリソース監視
 */
async function systemResourceMonitoring() {
  console.log('🚨 例3: システムリソース監視');
  console.log('═══════════════════════════════════════\n');

  console.log('💻 現在のシステムリソース状況:');
  
  // メモリ使用量
  const memoryUsage = process.memoryUsage();
  console.log(`🧠 メモリ使用量:`);
  console.log(`   - ヒープ使用量: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   - ヒープ総量: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   - RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(1)}MB`);
  
  // CPU情報
  const cpuUsage = process.cpuUsage();
  console.log(`\n⚡ CPU使用量:`);
  console.log(`   - ユーザー: ${(cpuUsage.user / 1000).toFixed(1)}ms`);
  console.log(`   - システム: ${(cpuUsage.system / 1000).toFixed(1)}ms`);
  
  // プロセス稼働時間
  const uptime = process.uptime();
  console.log(`\n⏱️  プロセス稼働時間: ${uptime.toFixed(1)}秒`);
  
  // リソース警告チェック
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 100) {
    console.log('\n⚠️  警告: メモリ使用量が100MBを超えています');
  } else {
    console.log('\n✅ メモリ使用量は正常範囲内です');
  }
  
  return {
    memory: memoryUsage,
    cpu: cpuUsage,
    uptime: uptime,
    warnings: heapUsedMB > 100 ? ['high_memory_usage'] : []
  };
}

/**
 * 例4: 利用可能なスクリプトの紹介
 */
async function availableScriptsExample() {
  console.log('🖥️  例4: 利用可能なスクリプト');
  console.log('═══════════════════════════════════════\n');

  console.log('💡 実行可能なメインスクリプト:');
  console.log('');
  console.log('# 自律実行システム（単発）');
  console.log('pnpm run dev');
  console.log('# または');
  console.log('tsx src/scripts/autonomous-runner-single.ts');
  console.log('');
  console.log('# OAuth1認証テスト');
  console.log('tsx src/scripts/oauth1-test-connection.ts');
  console.log('');
  console.log('# OAuth1セットアップヘルパー');
  console.log('tsx src/scripts/oauth1-setup-helper.ts');
  console.log('');
  console.log('💡 パフォーマンス関連ファイル:');
  console.log('   - src/lib/quality/performance-perfector.ts');
  console.log('   - src/lib/x-performance-analyzer.ts');
  console.log('   - src/lib/browser/performance-tuner.ts');
  
  return {
    main_scripts: [
      'autonomous-runner-single.ts',
      'oauth1-test-connection.ts',
      'oauth1-setup-helper.ts'
    ],
    performance_modules: [
      'performance-perfector.ts',
      'x-performance-analyzer.ts',
      'performance-tuner.ts'
    ]
  };
}

// ヘルパー関数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 待機用ヘルパー関数
async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// メイン実行関数
async function main() {
  console.log('🚀 TradingAssistantX パフォーマンス関連機能使用例');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 全ての使用例を順次実行
    await systemPerformanceOptimization();
    await sleep(1000); // 視認性のため待機

    await xAccountAnalysisExample();
    await sleep(1000);

    await systemResourceMonitoring();
    await sleep(1000);

    await availableScriptsExample();

    console.log('\n✅ 全ての使用例実行完了！');
    console.log('📊 実際のパフォーマンス最適化: PerformancePerfector');
    console.log('📈 X分析機能: XPerformanceAnalyzer');
    console.log('🚀 システム実行: pnpm run dev');
    
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
  systemPerformanceOptimization,
  xAccountAnalysisExample,
  systemResourceMonitoring,
  availableScriptsExample
};