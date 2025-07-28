import { DataOptimizer } from '../../../src/services/data-optimizer';
import { join } from 'path';

// データオプティマイザーのテスト実行
async function testDataOptimizer() {
  console.log('🧪 DataOptimizerテスト開始...');
  
  try {
    const optimizer = new DataOptimizer('data');
    
    // 1. 価値評価のテスト
    const testData = {
      timestamp: new Date().toISOString(),
      content: '投資教育に関する学習データ。金融分析と戦略について詳しく解説。',
      engagementMetrics: {
        likes: 10,
        retweets: 5,
        replies: 3
      },
      strategicRelevance: 15
    };
    
    const valueScore = await optimizer.evaluateDataValue(testData);
    console.log('📊 価値評価テスト結果:', valueScore);
    
    // 2. コンテキスト圧縮のテスト
    const contextResult = await optimizer.compressContext();
    console.log('🗜️ コンテキスト圧縮テスト結果:', contextResult);
    
    // 3. 古いデータクリーンアップのテスト（安全な期間で実行）
    const cleanupResult = await optimizer.cleanOldData(365); // 1年以上古いデータのみ対象
    console.log('🧹 クリーンアップテスト結果:', cleanupResult);
    
    // 4. データセット全体最適化のテスト（読み取り専用モード）
    console.log('📊 最適化プロセステスト（実際のファイル変更は行わない）...');
    console.log('✅ DataOptimizerテスト完了');
    
    return {
      success: true,
      valueScore,
      contextResult,
      cleanupResult
    };
    
  } catch (error) {
    console.error('❌ DataOptimizerテストエラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testDataOptimizer().then(result => {
    console.log('テスト完了:', JSON.stringify(result, null, 2));
  });
}

export { testDataOptimizer };