import { RSSCollector } from '../../src/collectors/base/rss-collector.js';

// MVP用の最小テスト
async function testRSSCollector() {
  const config = {
    sources: RSSCollector.getDefaultSources(),
    timeout: 10000,
    maxConcurrency: 2,
    cacheTimeout: 300
  };

  const collector = new RSSCollector(config);
  
  console.log('🚀 RSS Collectorテスト開始...');
  console.log('📰 データソース: Yahoo Finance, MarketWatch\n');
  
  try {
    const result = await collector.collectFromRSS();
    
    console.log(`✅ 取得成功！`);
    console.log(`📊 取得記事数: ${result.data.length}`);
    console.log(`⏱️  所要時間: ${result.metadata.responseTime}ms\n`);
    
    // 最初の3件を表示
    console.log('📋 最新記事（上位3件）:');
    result.data.slice(0, 3).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title || 'No title'}`);
      console.log(`   📅 ${new Date(item.timestamp).toLocaleString()}`);
      console.log(`   🔗 ${item.link || 'No link'}`);
      console.log(`   📝 ${item.summary?.slice(0, 100)}...`);
    });
    
    // データ構造の確認
    console.log('\n🔍 データ構造確認:');
    console.log(JSON.stringify(result.data[0], null, 2));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
testRSSCollector();