#!/usr/bin/env tsx

/**
 * Multi-Source Integration Test
 * Tests the multi-source collector functionality
 */

import { MultiSourceCollector } from '../../../src/lib/multi-source-collector.js';

async function runIntegrationTest() {
  console.log('🚀 Starting Multi-Source Integration Test...\n');

  try {
    // Create collector with default configuration
    console.log('📦 Creating MultiSourceCollector with default config...');
    const collector = MultiSourceCollector.createWithDefaultConfig();
    console.log('✅ Collector created successfully\n');

    // Test health check
    console.log('🏥 Running health check...');
    const healthStatus = await collector.healthCheck();
    console.log('Health Status:', JSON.stringify(healthStatus, null, 2));
    console.log('✅ Health check completed\n');

    // Test individual source collection
    console.log('📰 Testing RSS collection...');
    try {
      const rssResults = await collector.collectFromRSS();
      console.log(`✅ RSS Collection successful: ${rssResults.data.length} items collected`);
      console.log(`   Sources: ${rssResults.provider}`);
      console.log(`   Response time: ${rssResults.metadata.responseTime}ms`);
      if (rssResults.data.length > 0) {
        console.log(`   Sample item: ${rssResults.data[0].title.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`⚠️  RSS Collection failed: ${error}`);
    }
    console.log();

    console.log('🏗️ Testing API collection...');
    try {
      const apiResults = await collector.collectFromAPIs();
      console.log(`✅ API Collection successful: ${apiResults.data.length} items collected`);
      console.log(`   Sources: ${apiResults.provider}`);
      console.log(`   Response time: ${apiResults.metadata.responseTime}ms`);
      if (apiResults.data.length > 0) {
        console.log(`   Sample item: ${apiResults.data[0].title.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`⚠️  API Collection failed: ${error}`);
    }
    console.log();

    console.log('👥 Testing Community collection...');
    try {
      const communityResults = await collector.collectFromCommunity();
      console.log(`✅ Community Collection successful: ${communityResults.data.length} items collected`);
      console.log(`   Sources: ${communityResults.provider}`);
      console.log(`   Response time: ${communityResults.metadata.responseTime}ms`);
      if (communityResults.data.length > 0) {
        console.log(`   Sample item: ${communityResults.data[0].title.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`⚠️  Community Collection failed: ${error}`);
    }
    console.log();

    // Test full multi-source collection
    console.log('🌐 Testing full multi-source collection...');
    try {
      const fullResults = await collector.executeMultiSourceCollection();
      const totalItems = fullResults.reduce((sum, result) => sum + result.data.length, 0);
      console.log(`✅ Full Collection successful: ${totalItems} total items from ${fullResults.length} sources`);
      
      fullResults.forEach(result => {
        console.log(`   - ${result.source}: ${result.data.length} items (${result.metadata.responseTime}ms)`);
      });

      if (totalItems > 0) {
        // Show top 3 items by relevance
        const allItems = fullResults.flatMap(result => result.data)
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
          .slice(0, 3);
        
        console.log('\n📊 Top 3 items by relevance:');
        allItems.forEach((item, index) => {
          console.log(`   ${index + 1}. [${item.relevanceScore?.toFixed(2)}] ${item.title.substring(0, 60)}...`);
          console.log(`      Source: ${item.provider} | ${item.url}`);
        });
      }
    } catch (error) {
      console.log(`❌ Full Collection failed: ${error}`);
    }
    console.log();

    // Test performance metrics
    console.log('📈 Performance Metrics:');
    const metrics = collector.getPerformanceMetrics();
    console.log(JSON.stringify(metrics, null, 2));
    console.log();

    // Test request statistics
    console.log('📊 Request Statistics:');
    const stats = collector.getRequestStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log();

    console.log('✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest().catch(console.error);
}