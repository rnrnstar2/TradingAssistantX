import { RSSCollector } from '../../../src/collectors/base/rss-collector.js';

async function testRSSCollector() {
  console.log('🔍 [RSS Collector テスト] RSS Collectorの独立動作確認を開始...');
  
  try {
    const config = {
      sources: [
        {
          name: 'Financial Times',
          url: 'https://www.ft.com/rss/home',
          provider: 'ft',
          enabled: true,
          timeout: 10000,
          maxItems: 5,
          categories: ['finance', 'markets', 'business']
        }
      ],
      timeout: 10000,
      maxConcurrency: 3,
      cacheTimeout: 300
    };
    
    const collector = new RSSCollector(config);
    console.log('✅ [RSS Collector] インスタンス作成成功');
    
    const result = await collector.collectFromRSS();
    console.log('✅ [RSS Collector] データ収集成功');
    console.log(`📊 [結果] ${result.data.length}件のアイテムを収集`);
    
    if (result.data.length > 0) {
      console.log(`📝 [サンプル] ${result.data[0].title}`);
    }
    
    console.log('🎉 [RSS Collector テスト] 全て正常に動作しました');
    return true;
    
  } catch (error) {
    console.error('❌ [RSS Collector テスト] エラー:', error.message);
    return false;
  }
}

testRSSCollector().then(success => {
  process.exit(success ? 0 : 1);
});