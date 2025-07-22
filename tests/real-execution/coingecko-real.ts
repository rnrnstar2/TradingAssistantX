/**
 * CoinGecko API Real Execution Test
 * Tests actual CoinGecko API calls with rate limit measurement
 */

import { SourceTestResult, DataSourceError, TestConfiguration } from './types';

/**
 * CoinGecko API実際のテスト実行
 */
export async function testCoinGeckoApiReal(config: TestConfiguration = {
  timeout: 30000,
  maxRetries: 2,
  testQuery: 'trending'
}): Promise<SourceTestResult> {
  const startTime = new Date().toISOString();
  const startMemory = process.memoryUsage().heapUsed;
  const testStart = Date.now();

  const result: SourceTestResult = {
    sourceName: 'coingecko_api',
    testStartTime: startTime,
    testEndTime: '',
    success: false,
    performanceMetrics: {
      responseTime: 0,
      memoryUsed: 0
    }
  };

  try {
    // テスト実行
    const testResults = await Promise.race([
      performCoinGeckoApiTests(config),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), config.timeout)
      )
    ]) as any;

    // 成功時の結果設定
    result.success = true;
    result.collectedData = {
      itemCount: testResults.itemCount || 0,
      sampleData: testResults.sampleData || []
    };

    result.additionalInfo = {
      apiEndpointsTested: testResults.apiEndpointsTested || [],
      rateLimitInfo: testResults.rateLimitInfo || {},
      responseFormats: testResults.responseFormats || {},
      apiKeyRequired: testResults.apiKeyRequired || false,
      testQuery: config.testQuery
    };

  } catch (error: any) {
    // エラー分類
    result.error = classifyCoinGeckoApiError(error);
    result.success = false;
  } finally {
    // パフォーマンス計測
    const endTime = new Date().toISOString();
    const endMemory = process.memoryUsage().heapUsed;
    
    result.testEndTime = endTime;
    result.performanceMetrics.responseTime = Date.now() - testStart;
    result.performanceMetrics.memoryUsed = endMemory - startMemory;
  }

  return result;
}

/**
 * CoinGecko API特有のテスト実行
 */
async function performCoinGeckoApiTests(config: TestConfiguration): Promise<any> {
  const results = {
    itemCount: 0,
    sampleData: [] as any[],
    apiEndpointsTested: [] as string[],
    rateLimitInfo: {} as any,
    responseFormats: {} as any,
    apiKeyRequired: false
  };

  // テストするAPIエンドポイント
  const testEndpoints = [
    {
      name: 'trending',
      url: 'https://api.coingecko.com/api/v3/search/trending',
      description: 'Trending coins search'
    },
    {
      name: 'simple_price',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      description: 'Simple price lookup'
    },
    {
      name: 'ping',
      url: 'https://api.coingecko.com/api/v3/ping',
      description: 'API status check'
    }
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`[CoinGecko Test] Testing endpoint: ${endpoint.name}`);
      
      // API制限の実際の測定
      const apiCallResult = await testCoinGeckoApiCall(endpoint.url, endpoint.name);
      
      results.apiEndpointsTested.push(endpoint.name);
      results.rateLimitInfo[endpoint.name] = apiCallResult.rateLimitInfo;
      results.responseFormats[endpoint.name] = apiCallResult.responseFormat;
      
      if (apiCallResult.data) {
        results.itemCount += apiCallResult.itemCount || 0;
        results.sampleData.push({
          endpoint: endpoint.name,
          data: apiCallResult.data
        });
      }

      // エラーレスポンスの分類
      if (apiCallResult.error) {
        console.log(`[CoinGecko Test] Endpoint ${endpoint.name} error:`, apiCallResult.error);
      }

      // API呼び出し間の遅延（レート制限回避）
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (endpointError) {
      console.warn(`[CoinGecko Test] Failed to test endpoint ${endpoint.name}:`, endpointError);
      
      results.apiEndpointsTested.push(`${endpoint.name}_failed`);
      results.rateLimitInfo[endpoint.name] = { error: endpointError.message };
    }
  }

  console.log(`[CoinGecko Test] Total API data points: ${results.itemCount}`);
  console.log(`[CoinGecko Test] Endpoints tested: ${results.apiEndpointsTested.join(', ')}`);

  return results;
}

/**
 * CoinGecko APIコール実行とレスポンス分析
 */
async function testCoinGeckoApiCall(url: string, endpointName: string): Promise<any> {
  const callStart = Date.now();
  const result = {
    data: null as any,
    itemCount: 0,
    rateLimitInfo: {} as any,
    responseFormat: {} as any,
    error: null as any
  };

  try {
    console.log(`[CoinGecko API] Calling ${endpointName}: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'TradingAssistantX-Test/1.0'
      }
    });

    const responseTime = Date.now() - callStart;
    
    // レート制限情報を取得
    result.rateLimitInfo = {
      status: response.status,
      responseTime: responseTime,
      headers: {
        rateLimit: response.headers.get('x-ratelimit-limit'),
        rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
        rateLimitReset: response.headers.get('x-ratelimit-reset'),
        retryAfter: response.headers.get('retry-after')
      }
    };

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // レスポンス形式の検証
    result.responseFormat = {
      dataType: typeof data,
      hasExpectedStructure: validateCoinGeckoResponseStructure(data, endpointName),
      keys: data && typeof data === 'object' ? Object.keys(data) : [],
      dataSize: JSON.stringify(data).length
    };

    result.data = data;

    // アイテム数の計算
    if (endpointName === 'trending' && data?.coins) {
      result.itemCount = data.coins.length;
    } else if (endpointName === 'simple_price' && data) {
      result.itemCount = Object.keys(data).length;
    } else if (endpointName === 'ping' && data) {
      result.itemCount = 1; // Pingレスポンス
    }

    console.log(`[CoinGecko API] ${endpointName} successful: ${result.itemCount} items, ${responseTime}ms`);

  } catch (error: any) {
    result.error = error;
    result.rateLimitInfo.error = error.message;
    console.error(`[CoinGecko API] ${endpointName} failed:`, error.message);
  }

  return result;
}

/**
 * CoinGeckoレスポンス構造検証
 */
function validateCoinGeckoResponseStructure(data: any, endpointName: string): boolean {
  try {
    switch (endpointName) {
      case 'trending':
        return data && 
               typeof data === 'object' && 
               Array.isArray(data.coins) &&
               data.coins.length > 0 &&
               data.coins[0].item &&
               data.coins[0].item.id &&
               data.coins[0].item.name;
      
      case 'simple_price':
        return data &&
               typeof data === 'object' &&
               Object.keys(data).length > 0 &&
               Object.values(data).every(prices => 
                 typeof prices === 'object' && prices !== null
               );
      
      case 'ping':
        return data && 
               typeof data === 'object' &&
               (data.gecko_says !== undefined);
      
      default:
        return data !== null && data !== undefined;
    }
  } catch (error) {
    return false;
  }
}

/**
 * CoinGecko APIエラー分類
 */
function classifyCoinGeckoApiError(error: Error): DataSourceError {
  const errorMessage = error.message.toLowerCase();
  
  // レート制限エラー
  if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      category: 'rate_limit',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'CoinGecko API rate limit exceeded',
      originalError: error
    };
  }
  
  // API制限（プランアップグレード必要）
  if (errorMessage.includes('402') || errorMessage.includes('payment required') || errorMessage.includes('upgrade')) {
    return {
      category: 'authentication',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'disable',
      details: 'CoinGecko API plan upgrade required',
      originalError: error
    };
  }
  
  // データ構造変更
  if (errorMessage.includes('validation') || errorMessage.includes('structure')) {
    return {
      category: 'structure_change',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'update_code',
      details: 'CoinGecko API response structure changed',
      originalError: error
    };
  }
  
  // ネットワークエラー
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return {
      category: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'Network connection issue to CoinGecko API',
      originalError: error
    };
  }
  
  // HTTP エラーステータス
  if (errorMessage.includes('http 4') || errorMessage.includes('http 5')) {
    const severity = errorMessage.includes('http 4') ? 'high' : 'critical';
    return {
      category: 'network',
      severity: severity as any,
      recoverable: severity === 'high',
      suggestedFix: severity === 'high' ? 'retry' : 'disable',
      details: `CoinGecko API HTTP error: ${error.message}`,
      originalError: error
    };
  }
  
  // その他のエラー
  return {
    category: 'network',
    severity: 'medium',
    recoverable: true,
    suggestedFix: 'retry',
    details: `CoinGecko API unknown error: ${error.message}`,
    originalError: error
  };
}

export default testCoinGeckoApiReal;