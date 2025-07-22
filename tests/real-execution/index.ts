/**
 * Real Execution Test Suite Index
 * Exports all data source test functions for easy access
 */

import { testYahooFinanceReal } from './yahoo-finance-real';
import { testBloombergReal } from './bloomberg-real';
import { testRedditReal } from './reddit-real';
import { testCoinGeckoApiReal } from './coingecko-real';
import { testHackerNewsApiReal } from './hackernews-real';

export {
  testYahooFinanceReal,
  testBloombergReal,
  testRedditReal,
  testCoinGeckoApiReal,
  testHackerNewsApiReal
};

export * from './types';

/**
 * データソース別テスト関数マップ
 */
export const DATA_SOURCE_TESTS = {
  yahoo_finance: testYahooFinanceReal,
  bloomberg: testBloombergReal,
  reddit: testRedditReal,
  coingecko_api: testCoinGeckoApiReal,
  hackernews_api: testHackerNewsApiReal
} as const;

/**
 * 全データソーステスト実行
 */
export async function runAllDataSourceTests(config?: {
  timeout?: number;
  maxRetries?: number;
  parallel?: boolean;
}) {
  const testConfig = {
    timeout: 30000,
    maxRetries: 2,
    ...config
  };

  const results: any = {};
  const testFunctions = Object.entries(DATA_SOURCE_TESTS);

  if (config?.parallel) {
    // 並列実行（最大2つまで）
    console.log('Running data source tests in parallel...');
    
    const promises = testFunctions.map(async ([sourceName, testFn]) => {
      try {
        const result = await testFn(testConfig);
        return { sourceName, result };
      } catch (error) {
        return { sourceName, result: null, error };
      }
    });

    const parallelResults = await Promise.all(promises);
    
    for (const { sourceName, result, error } of parallelResults) {
      results[sourceName] = error ? { error: error.message } : result;
    }
    
  } else {
    // シーケンシャル実行
    console.log('Running data source tests sequentially...');
    
    for (const [sourceName, testFn] of testFunctions) {
      try {
        console.log(`\n🧪 Testing ${sourceName}...`);
        results[sourceName] = await testFn(testConfig);
        console.log(`✅ ${sourceName} test completed`);
      } catch (error) {
        console.error(`❌ ${sourceName} test failed:`, error);
        results[sourceName] = { error: error.message };
      }
    }
  }

  // 結果サマリー
  const summary = {
    totalTests: testFunctions.length,
    successful: Object.values(results).filter((r: any) => r && !r.error && r.success).length,
    failed: Object.values(results).filter((r: any) => r && (r.error || !r.success)).length,
    results
  };

  console.log('\n📊 Test Summary:');
  console.log(`Total: ${summary.totalTests}, Successful: ${summary.successful}, Failed: ${summary.failed}`);

  return summary;
}