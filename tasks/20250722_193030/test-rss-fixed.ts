import { RSSCollector } from '../../src/collectors/base/rss-collector.js';

async function testFixedRSS() {
  const config = {
    sources: RSSCollector.getDefaultSources(),
    timeout: 15000,
    maxConcurrency: 2,
    cacheTimeout: 300
  };

  const collector = new RSSCollector(config);
  
  console.log('🚀 修正版RSS Collectorテスト開始...\n');
  
  try {
    const result = await collector.collectFromRSS();
    
    console.log(`✅ 取得成功！`);
    console.log(`📊 取得記事数: ${result.data.length}`);
    console.log(`⏱️  所要時間: ${result.metadata.responseTime}ms`);
    console.log(`📰 有効なソース: ${result.data.map(d => d.metadata?.sourceName).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')}\n`);
    
    // 最初の5件を表示
    console.log('📋 最新記事（上位5件）:');
    result.data.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   📰 ${item.metadata?.sourceName || 'Unknown'}`);
      console.log(`   📅 ${new Date(item.timestamp).toLocaleString()}`);
      console.log(`   🔗 ${item.url}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testFixedRSS();