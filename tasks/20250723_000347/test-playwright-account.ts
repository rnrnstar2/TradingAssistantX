#!/usr/bin/env tsx
/**
 * PlaywrightAccountCollector 統合テスト
 * X_USERNAMEとX_PASSWORDが設定されている場合のみ実行
 */

import { PlaywrightAccountCollector, PlaywrightAccountConfig } from '../../src/collectors/playwright-account.js';

async function testPlaywrightAccountCollector() {
  console.log('=== PlaywrightAccountCollector 統合テスト ===');
  
  // 環境変数確認
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  
  console.log(`環境変数確認:`);
  console.log(`- X_USERNAME: ${username ? '設定済み' : '未設定'}`);
  console.log(`- X_PASSWORD: ${password ? '設定済み' : '未設定'}`);
  
  if (!username || !password) {
    console.log('\n⚠️  X_USERNAMEとX_PASSWORDが設定されていないため、ダミーテストを実行します');
    await testWithoutCredentials();
    return;
  }
  
  // 実際のテスト
  const config: PlaywrightAccountConfig = {
    source: 'playwright-account',
    enabled: true,
    priority: 7,
    timeout: 30000,
    retries: 2,
    username: username,
    analysisDepth: 3,
    metrics: ['posts', 'engagement', 'followers'],
    maxHistoryDays: 30,
    includeMetrics: true
  };
  
  const collector = new PlaywrightAccountCollector(config);
  
  try {
    console.log('\n🚀 収集器可用性確認...');
    const isAvailable = await collector.isAvailable();
    console.log(`可用性: ${isAvailable ? '✅ 利用可能' : '❌ 利用不可'}`);
    
    console.log('\n📊 自アカウント分析実行...');
    const startTime = Date.now();
    const result = await collector.collect();
    const endTime = Date.now();
    
    console.log(`実行時間: ${endTime - startTime}ms`);
    console.log(`成功: ${result.success ? '✅' : '❌'}`);
    console.log(`データ件数: ${result.data?.length || 0}`);
    console.log(`品質スコア: ${result.metadata?.quality || 0}`);
    
    if (result.success) {
      console.log('\n📋 取得データサマリー:');
      result.data?.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.type} (品質: ${item.quality})`);
        if (item.type === 'follower_trends') {
          console.log(`     フォロワー数: ${item.data?.accountMetrics?.followers_count || 'N/A'}`);
        }
        if (item.type === 'post_history') {
          console.log(`     投稿数: ${item.data?.totalPosts || 'N/A'}`);
        }
      });
    } else {
      console.log(`❌ エラー: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

async function testWithoutCredentials() {
  console.log('\n🧪 認証情報なしでのテスト...');
  
  const config: PlaywrightAccountConfig = {
    source: 'playwright-account',
    enabled: true,
    priority: 7,
    timeout: 30000,
    retries: 2,
    analysisDepth: 1,
    metrics: ['followers'],
    maxHistoryDays: 7,
    includeMetrics: false
  };
  
  const collector = new PlaywrightAccountCollector(config);
  
  try {
    const result = await collector.collect();
    console.log('結果:', {
      success: result.success,
      dataLength: result.data?.length,
      error: result.error
    });
    
    // 認証情報なしでは失敗するはず
    if (!result.success) {
      console.log('✅ 期待通り認証エラーで失敗しました');
    } else {
      console.log('⚠️  予想と異なり成功しました');
    }
    
  } catch (error) {
    console.log('✅ 期待通りエラーが発生しました:', (error as Error).message);
  }
}

// テスト実行
testPlaywrightAccountCollector().then(() => {
  console.log('\n=== テスト完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('=== テスト失敗 ===', error);
  process.exit(1);
});