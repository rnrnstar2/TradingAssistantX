#!/usr/bin/env tsx

/**
 * TwitterAPI.io統合動作確認スクリプト
 * 全体的な動作確認を実行
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';

async function runIntegrationCheck() {
  console.log('🧪 TwitterAPI.io統合動作確認開始');
  console.log('=====================================');

  const client = new KaitoTwitterAPIClient({
    apiKey: process.env.KAITO_API_TOKEN || 'test-token',
    qpsLimit: 200,
    costTracking: true
  });

  // デフォルト設定でクライアントを初期化
  const mockConfig = {
    environment: 'dev',
    api: {
      baseUrl: 'https://api.twitterapi.io',
      version: 'v1',
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        retryConditions: ['NETWORK_ERROR', 'TIMEOUT']
      }
    },
    authentication: {
      primaryKey: process.env.KAITO_API_TOKEN || 'test-key',
      keyRotationInterval: 86400000,
      encryptionEnabled: false
    },
    performance: {
      qpsLimit: 200,
      responseTimeTarget: 700,
      cacheEnabled: false,
      cacheTTL: 0
    },
    monitoring: {
      metricsEnabled: true,
      logLevel: 'info',
      alertingEnabled: false,
      healthCheckInterval: 30000
    },
    security: {
      rateLimitEnabled: true,
      ipWhitelist: [],
      auditLoggingEnabled: true,
      encryptionKey: 'test-key'
    },
    features: {
      realApiEnabled: true,
      mockFallbackEnabled: false,
      batchProcessingEnabled: false,
      advancedCachingEnabled: false
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      updatedBy: 'test',
      checksum: 'test-checksum'
    }
  };

  client.initializeWithConfig(mockConfig);

  const results = {
    connection: false,
    authentication: false,
    endpoints: false,
    qpsControl: false,
    costTracking: false
  };

  try {
    // 1. 接続テスト
    console.log('📡 接続テスト実行中...');
    results.connection = await client.testConnection();
    console.log(`接続テスト: ${results.connection ? '✅ 成功' : '❌ 失敗'}`);

    // 2. 認証テスト
    console.log('🔐 認証テスト実行中...');
    results.authentication = await client.testAuthentication();
    console.log(`認証テスト: ${results.authentication ? '✅ 成功' : '❌ 失敗'}`);

    // 3. エンドポイントテスト
    console.log('🔧 エンドポイントテスト実行中...');
    results.endpoints = await client.testEndpoints();
    console.log(`エンドポイントテスト: ${results.endpoints ? '✅ 成功' : '❌ 失敗'}`);

    // 4. QPS制御テスト
    console.log('⏱️ QPS制御テスト実行中...');
    const startTime = Date.now();
    await Promise.all([
      client.testConnection(),
      client.testConnection(),
      client.testConnection()
    ]);
    const duration = Date.now() - startTime;
    results.qpsControl = duration > 2100; // 700ms * 3
    console.log(`QPS制御テスト: ${results.qpsControl ? '✅ 成功' : '❌ 失敗'} (${duration}ms)`);

    // 5. コスト追跡テスト
    console.log('💰 コスト追跡テスト実行中...');
    const costInfo = client.getCostTrackingInfo();
    results.costTracking = typeof costInfo.estimatedCost === 'number';
    console.log(`コスト追跡テスト: ${results.costTracking ? '✅ 成功' : '❌ 失敗'}`);

    // 総合結果
    const allPassed = Object.values(results).every(result => result === true);
    console.log('=====================================');
    console.log(`🎯 総合結果: ${allPassed ? '✅ 全テスト成功' : '❌ 一部テスト失敗'}`);
    
    if (!allPassed) {
      console.log('❌ 失敗したテスト:');
      Object.entries(results).forEach(([test, passed]) => {
        if (!passed) {
          console.log(`  - ${test}`);
        }
      });
    }

    return allPassed;

  } catch (error) {
    console.error('❌ 統合テスト実行エラー:', error);
    return false;
  }
}

// ESモジュール環境での実行チェック
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationCheck()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runIntegrationCheck };