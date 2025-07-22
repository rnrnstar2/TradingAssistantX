/**
 * Basic Test for Modular ActionSpecificCollector
 * 分割後のモジュール動作確認テスト
 */

import { ActionSpecificCollector } from '../action-specific-collector-new.js';

/**
 * 基本動作テスト
 */
async function testBasicFunctionality() {
  console.log('🧪 [基本テスト] モジュラーActionSpecificCollector動作確認開始...');
  
  try {
    // インスタンス作成テスト
    const collector = new ActionSpecificCollector();
    console.log('✅ [テスト] インスタンス作成成功');
    
    // 設定読み込みテスト
    const config = collector.getConfig();
    console.log('✅ [テスト] 設定読み込み成功:', config ? '設定あり' : 'デフォルト設定');
    
    // テストモード確認
    const testMode = collector.isTestMode();
    console.log('✅ [テスト] テストモード確認:', testMode);
    
    // メトリクス取得テスト
    const metrics = collector.getPerformanceMetrics();
    console.log('✅ [テスト] メトリクス取得成功:', Object.keys(metrics).length, '個のメトリクス');
    
    // 模擬コンテキスト作成
    const mockContext = {
      currentTopic: 'テスト投稿分析',
      marketConditions: 'stable',
      userPreferences: {
        riskTolerance: 'medium',
        investmentHorizon: 'long_term'
      },
      recentActivity: []
    };
    
    // 簡単な収集テスト（original_post）
    console.log('🎯 [テスト] original_post収集テスト開始...');
    const result = await collector.collectForAction('original_post', mockContext, 80);
    
    console.log('✅ [テスト] 収集テスト成功:');
    console.log(`  - 結果数: ${result.results.length}件`);
    console.log(`  - 品質スコア: ${result.qualityEvaluation.overallScore}/100`);
    console.log(`  - 処理時間: ${result.collectionStats.processingTimeMs}ms`);
    console.log(`  - 十分性: ${result.sufficiencyEvaluation.currentSufficiency}%`);
    
    // トピック特化テスト
    console.log('🎯 [テスト] トピック特化収集テスト開始...');
    const topicResult = await collector.collectForTopicSpecificAction(
      'quote_tweet', 
      'FX市場分析', 
      mockContext, 
      75
    );
    
    console.log('✅ [テスト] トピック特化テスト成功:');
    console.log(`  - 結果数: ${topicResult.results.length}件`);
    console.log(`  - トピック関連度: ${topicResult.qualityEvaluation.relevanceScore}/100`);
    
    // クリーンアップ
    await collector.cleanup();
    console.log('✅ [テスト] クリーンアップ成功');
    
    console.log('🎉 [基本テスト] 全テスト完了 - 成功');
    return true;
    
  } catch (error) {
    console.error('❌ [基本テスト] エラー発生:', error);
    return false;
  }
}

/**
 * パフォーマンステスト
 */
async function testPerformance() {
  console.log('⚡ [パフォーマンステスト] 開始...');
  
  const collector = new ActionSpecificCollector();
  const mockContext = {
    currentTopic: 'パフォーマンステスト',
    marketConditions: 'volatile',
    userPreferences: { riskTolerance: 'high' },
    recentActivity: []
  };
  
  const startTime = Date.now();
  
  try {
    const result = await collector.collectForAction('retweet', mockContext, 85);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('✅ [パフォーマンス] 結果:');
    console.log(`  - 総実行時間: ${totalTime}ms`);
    console.log(`  - 内部処理時間: ${result.collectionStats.processingTimeMs}ms`);
    console.log(`  - 結果効率: ${result.results.length / (totalTime / 1000)} 結果/秒`);
    
    return totalTime < 10000; // 10秒以内なら成功
  } catch (error) {
    console.error('❌ [パフォーマンステスト] エラー:', error);
    return false;
  }
}

/**
 * メインテスト実行
 */
async function runTests() {
  console.log('🚀 [モジュラーテスト] テストスイート開始');
  console.log('========================================');
  
  const testResults: boolean[] = [];
  
  // 基本テスト
  const basicTest = await testBasicFunctionality();
  testResults.push(basicTest);
  
  console.log('----------------------------------------');
  
  // パフォーマンステスト
  const performanceTest = await testPerformance();
  testResults.push(performanceTest);
  
  console.log('========================================');
  
  const successCount = testResults.filter(r => r).length;
  const totalTests = testResults.length;
  
  console.log(`📊 [テスト結果] ${successCount}/${totalTests} 成功`);
  
  if (successCount === totalTests) {
    console.log('🎉 [テストスイート] 全テスト成功！モジュラー実装完了');
  } else {
    console.log('⚠️ [テストスイート] 一部テスト失敗 - 要調査');
  }
  
  return successCount === totalTests;
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testBasicFunctionality, testPerformance };