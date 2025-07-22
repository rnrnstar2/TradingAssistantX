/**
 * HackerNews API Real Execution Test
 * Tests actual HackerNews Firebase API calls with response time monitoring
 */

import { SourceTestResult, DataSourceError, TestConfiguration } from './types';

/**
 * HackerNews API実際のテスト実行
 */
export async function testHackerNewsApiReal(config: TestConfiguration = {
  timeout: 30000,
  maxRetries: 2,
  testQuery: 'topstories'
}): Promise<SourceTestResult> {
  const startTime = new Date().toISOString();
  const startMemory = process.memoryUsage().heapUsed;
  const testStart = Date.now();

  const result: SourceTestResult = {
    sourceName: 'hackernews_api',
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
      performHackerNewsApiTests(config),
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
      responseTimeVariations: testResults.responseTimeVariations || {},
      dataStructureValidation: testResults.dataStructureValidation || {},
      firebaseConnectionStatus: testResults.firebaseConnectionStatus || 'unknown',
      testQuery: config.testQuery
    };

  } catch (error: any) {
    // エラー分類
    result.error = classifyHackerNewsApiError(error);
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
 * HackerNews API特有のテスト実行
 */
async function performHackerNewsApiTests(config: TestConfiguration): Promise<any> {
  const results = {
    itemCount: 0,
    sampleData: [] as any[],
    apiEndpointsTested: [] as string[],
    responseTimeVariations: {} as any,
    dataStructureValidation: {} as any,
    firebaseConnectionStatus: 'unknown' as string
  };

  // テストするAPIエンドポイント
  const testEndpoints = [
    {
      name: 'topstories',
      url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
      description: 'Top stories IDs'
    },
    {
      name: 'newstories',
      url: 'https://hacker-news.firebaseio.com/v0/newstories.json',
      description: 'New stories IDs'
    },
    {
      name: 'beststories',
      url: 'https://hacker-news.firebaseio.com/v0/beststories.json',
      description: 'Best stories IDs'
    }
  ];

  // Firebase API接続テスト
  try {
    console.log('[HackerNews Test] Testing Firebase API connection...');
    results.firebaseConnectionStatus = await testFirebaseConnection();
  } catch (connectionError) {
    results.firebaseConnectionStatus = 'failed';
    console.warn('[HackerNews Test] Firebase connection test failed:', connectionError);
  }

  for (const endpoint of testEndpoints) {
    try {
      console.log(`[HackerNews Test] Testing endpoint: ${endpoint.name}`);
      
      // レスポンス時間変動の記録
      const responseTimeTest = await measureHackerNewsResponseTime(endpoint.url, endpoint.name);
      
      results.apiEndpointsTested.push(endpoint.name);
      results.responseTimeVariations[endpoint.name] = responseTimeTest.responseTimes;
      results.dataStructureValidation[endpoint.name] = responseTimeTest.dataStructure;
      
      if (responseTimeTest.storyIds && responseTimeTest.storyIds.length > 0) {
        // 個別記事取得テスト（上位3件）
        const storyDetails = await fetchHackerNewsStoryDetails(
          responseTimeTest.storyIds.slice(0, 3)
        );
        
        results.itemCount += storyDetails.length;
        results.sampleData.push({
          endpoint: endpoint.name,
          storyCount: responseTimeTest.storyIds.length,
          sampleStories: storyDetails
        });
      }

      // API呼び出し間の遅延
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (endpointError) {
      console.warn(`[HackerNews Test] Failed to test endpoint ${endpoint.name}:`, endpointError);
      
      results.apiEndpointsTested.push(`${endpoint.name}_failed`);
      results.responseTimeVariations[endpoint.name] = { error: endpointError.message };
    }
  }

  console.log(`[HackerNews Test] Total story details: ${results.itemCount}`);
  console.log(`[HackerNews Test] Endpoints tested: ${results.apiEndpointsTested.join(', ')}`);

  return results;
}

/**
 * Firebase接続テスト
 */
async function testFirebaseConnection(): Promise<string> {
  try {
    // Firebase APIの基本接続テスト
    const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    } as any);

    if (!response.ok) {
      return `http_error_${response.status}`;
    }

    const maxItem = await response.json();
    
    if (typeof maxItem === 'number' && maxItem > 0) {
      return 'success';
    } else {
      return 'invalid_response';
    }
    
  } catch (error) {
    return 'connection_failed';
  }
}

/**
 * HackerNewsレスポンス時間測定
 */
async function measureHackerNewsResponseTime(url: string, endpointName: string): Promise<any> {
  const measurements = [];
  const result = {
    responseTimes: [] as number[],
    dataStructure: {} as any,
    storyIds: [] as number[]
  };

  // 3回測定してレスポンス時間変動を記録
  for (let i = 0; i < 3; i++) {
    try {
      const startTime = Date.now();
      
      console.log(`[HackerNews API] Measurement ${i + 1}/3 for ${endpointName}: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      result.responseTimes.push(responseTime);
      
      // データ構造変更の検出（初回のみ）
      if (i === 0) {
        result.dataStructure = validateHackerNewsDataStructure(data, endpointName);
        
        if (Array.isArray(data)) {
          result.storyIds = data.slice(0, 10); // 上位10件のIDを保存
        }
      }

      console.log(`[HackerNews API] ${endpointName} measurement ${i + 1}: ${responseTime}ms`);
      
      // 測定間の遅延
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error: any) {
      console.error(`[HackerNews API] ${endpointName} measurement ${i + 1} failed:`, error.message);
      result.responseTimes.push(-1); // エラーを示すため
    }
  }

  return result;
}

/**
 * HackerNews個別記事取得テスト
 */
async function fetchHackerNewsStoryDetails(storyIds: number[]): Promise<any[]> {
  const stories = [];
  
  for (const storyId of storyIds) {
    try {
      console.log(`[HackerNews API] Fetching story details: ${storyId}`);
      
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const story = await response.json();
        
        if (story && story.title) {
          stories.push({
            id: story.id,
            title: story.title,
            url: story.url || '',
            score: story.score || 0,
            by: story.by || '',
            time: story.time || 0,
            type: story.type || ''
          });
        }
      }
      
      // レート制限回避
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.warn(`[HackerNews API] Failed to fetch story ${storyId}:`, error);
    }
  }
  
  return stories;
}

/**
 * HackerNewsデータ構造検証
 */
function validateHackerNewsDataStructure(data: any, endpointName: string): any {
  const validation = {
    dataType: typeof data,
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : 0,
    hasExpectedStructure: false,
    sampleElements: [] as any[]
  };

  try {
    switch (endpointName) {
      case 'topstories':
      case 'newstories':
      case 'beststories':
        // ストーリーIDの配列であることを確認
        validation.hasExpectedStructure = Array.isArray(data) && 
                                        data.length > 0 && 
                                        data.every(id => typeof id === 'number' && id > 0);
        
        if (validation.hasExpectedStructure) {
          validation.sampleElements = data.slice(0, 3);
        }
        break;
      
      default:
        validation.hasExpectedStructure = data !== null && data !== undefined;
    }
  } catch (error) {
    validation.hasExpectedStructure = false;
  }

  return validation;
}

/**
 * HackerNews APIエラー分類
 */
function classifyHackerNewsApiError(error: Error): DataSourceError {
  const errorMessage = error.message.toLowerCase();
  
  // Firebase接続エラー
  if (errorMessage.includes('firebase') || errorMessage.includes('connection')) {
    return {
      category: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'HackerNews Firebase API connection failed',
      originalError: error
    };
  }
  
  // タイムアウトエラー
  if (errorMessage.includes('timeout')) {
    return {
      category: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'HackerNews API response timeout',
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
      details: 'HackerNews API data structure changed',
      originalError: error
    };
  }
  
  // レート制限（稀だが可能性あり）
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      category: 'rate_limit',
      severity: 'low',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'HackerNews API rate limit exceeded',
      originalError: error
    };
  }
  
  // HTTPエラー
  if (errorMessage.includes('http 4') || errorMessage.includes('http 5')) {
    const severity = errorMessage.includes('http 4') ? 'medium' : 'high';
    return {
      category: 'network',
      severity: severity as any,
      recoverable: true,
      suggestedFix: 'retry',
      details: `HackerNews API HTTP error: ${error.message}`,
      originalError: error
    };
  }
  
  // その他のエラー
  return {
    category: 'network',
    severity: 'low',
    recoverable: true,
    suggestedFix: 'retry',
    details: `HackerNews API unknown error: ${error.message}`,
    originalError: error
  };
}

export default testHackerNewsApiReal;