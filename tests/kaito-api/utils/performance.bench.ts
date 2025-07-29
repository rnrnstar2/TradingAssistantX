/**
 * KaitoAPI Utils パフォーマンス ベンチマークテスト
 * 最適化の効果を測定するためのベンチマーク
 */

import { bench, describe, beforeEach, afterEach } from 'vitest';
import { 
  normalizeTweetData, 
  normalizeUserData, 
  normalizeTweetArray 
} from '@/kaito-api/utils/normalizer';
import { 
  validateTwitterUserId, 
  validateTwitterUsername, 
  validateTweetText,
  detectMaliciousPatterns,
  containsProhibitedContent 
} from '@/kaito-api/utils/validator';
import { ResponseHandler } from '@/kaito-api/utils/response-handler';
import { RateLimiter } from '@/kaito-api/utils/rate-limiter';
import { BatchProcessor } from '@/kaito-api/utils/batch-processor';
import { MetricsCollector } from '@/kaito-api/utils/metrics-collector';

// ============================================================================
// TEST DATA
// ============================================================================

const mockTweetData = {
  id: '1234567890123456789',
  text: 'This is a test tweet for performance benchmarking. It contains various elements to test normalization.',
  author_id: '9876543210987654321',
  created_at: '2024-01-15T10:30:00.000Z',
  public_metrics: {
    retweet_count: 150,
    like_count: 500,
    quote_count: 25,
    reply_count: 30,
    impression_count: 10000
  },
  lang: 'en',
  context_annotations: [
    {
      domain: { name: 'Technology', description: 'Tech topics' },
      entity: { name: 'Performance', description: 'Performance testing' }
    }
  ]
};

const mockUserData = {
  id: '1111222233334444555',
  username: 'testuser123',
  name: 'Test User',
  description: 'This is a test user for performance benchmarking purposes.',
  created_at: '2020-01-01T00:00:00.000Z',
  location: 'Test City',
  url: 'https://example.com',
  verified: false,
  verified_type: 'none',
  profile_image_url: 'https://example.com/avatar.jpg',
  public_metrics: {
    followers_count: 1000,
    following_count: 500,
    tweet_count: 2500,
    listed_count: 50
  }
};

const generateMockTweetArray = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTweetData,
    id: `123456789012345678${i}`,
    text: `Test tweet number ${i} for performance benchmarking.`
  }));
};

const sampleTexts = [
  'Hello world! This is a test tweet.',
  'Another sample text for validation testing.',
  'Check this out: https://example.com',
  'Performance testing in progress...',
  'JavaScript alert("xss") attempt',
  '스팸 메시지입니다', // Korean text (should be flagged)
  'Normal tweet with emojis 🚀🔥💯',
  'SQL injection attempt: DROP TABLE users;',
  'Long tweet '.repeat(50) + 'end'
];

// ============================================================================
// NORMALIZER PERFORMANCE TESTS
// ============================================================================

describe('Normalizer Performance', () => {
  beforeEach(() => {
    // キャッシュクリア（実際のクリア方法は実装依存）
    console.log('🧹 Clearing normalization cache before benchmark');
  });

  bench('normalizeTweetData - single tweet', () => {
    normalizeTweetData(mockTweetData);
  });

  bench('normalizeTweetData - with cache hits', () => {
    // 同じデータを正規化してキャッシュ効果を測定
    normalizeTweetData(mockTweetData);
  });

  bench('normalizeUserData - single user', () => {
    normalizeUserData(mockUserData);
  });

  bench('normalizeUserData - with cache hits', () => {
    // 同じデータを正規化してキャッシュ効果を測定
    normalizeUserData(mockUserData);
  });

  bench('normalizeTweetArray - 10 tweets', () => {
    const tweets = generateMockTweetArray(10);
    normalizeTweetArray(tweets);
  });

  bench('normalizeTweetArray - 50 tweets', () => {
    const tweets = generateMockTweetArray(50);
    normalizeTweetArray(tweets);
  });

  bench('normalizeTweetArray - 100 tweets', () => {
    const tweets = generateMockTweetArray(100);
    normalizeTweetArray(tweets);
  });
});

// ============================================================================
// VALIDATOR PERFORMANCE TESTS
// ============================================================================

describe('Validator Performance', () => {
  beforeEach(() => {
    console.log('🧹 Clearing validation cache before benchmark');
  });

  bench('validateTwitterUserId', () => {
    validateTwitterUserId('1234567890123456789');
  });

  bench('validateTwitterUserId - with cache hits', () => {
    // 同じIDを検証してキャッシュ効果を測定
    validateTwitterUserId('1234567890123456789');
  });

  bench('validateTwitterUsername', () => {
    validateTwitterUsername('testuser123');
  });

  bench('validateTwitterUsername - with cache hits', () => {
    validateTwitterUsername('testuser123');
  });

  bench('validateTweetText', () => {
    validateTweetText('This is a sample tweet text for performance testing.');
  });

  bench('validateTweetText - various lengths', () => {
    sampleTexts.forEach(text => validateTweetText(text));
  });

  bench('detectMaliciousPatterns - clean text', () => {
    detectMaliciousPatterns('This is a normal tweet text.');
  });

  bench('detectMaliciousPatterns - malicious patterns', () => {
    detectMaliciousPatterns('javascript:alert("xss")<script>alert("test")</script>');
  });

  bench('containsProhibitedContent - mixed content', () => {
    sampleTexts.forEach(text => containsProhibitedContent(text));
  });

  bench('regex compilation vs precompiled', () => {
    // プリコンパイル済み正規表現の効果測定
    const text = 'Test text with various patterns 123 ABC!@#';
    
    // 新しい正規表現オブジェクトを毎回作成
    /[A-Z]/g.test(text);
    /[0-9!@#$%^&*()]/g.test(text);
    /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text);
  });
});

// ============================================================================
// RESPONSE HANDLER PERFORMANCE TESTS
// ============================================================================

describe('ResponseHandler Performance', () => {
  let responseHandler: ResponseHandler;

  beforeEach(() => {
    responseHandler = new ResponseHandler();
  });

  afterEach(() => {
    // クリーンアップ
    responseHandler = null as any;
  });

  bench('handleResponse - success case', async () => {
    const mockResponse = Promise.resolve({
      data: mockTweetData,
      headers: {
        'x-rate-limit-limit': '100',
        'x-rate-limit-remaining': '95'
      }
    });

    await responseHandler.handleResponse(mockResponse, {
      endpoint: '/test',
      method: 'GET'
    });
  });

  bench('handleResponse - with educational check', async () => {
    const mockResponse = Promise.resolve({
      data: mockTweetData,
      headers: {}
    });

    await responseHandler.handleResponse(mockResponse, {
      endpoint: '/test',
      method: 'GET',
      educational: true
    });
  });

  bench('executeWithRetry - success case', async () => {
    const apiCall = () => Promise.resolve(mockTweetData);

    await responseHandler.executeWithRetry(apiCall, {
      endpoint: '/test',
      method: 'GET'
    });
  });

  bench('log cleanup performance', () => {
    // 大量のログエントリを作成してクリーンアップ性能を測定
    for (let i = 0; i < 150; i++) {
      responseHandler['logRequest'](`/test${i}`, {
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        requestId: `req_${i}`,
        processingTime: 100 + i
      });
    }
  });
});

// ============================================================================
// RATE LIMITER PERFORMANCE TESTS
// ============================================================================

describe('RateLimiter Performance', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  bench('checkAndRecord - normal load', async () => {
    await rateLimiter.checkAndRecord('/api/tweets');
  });

  bench('getRemaining - calculation', () => {
    rateLimiter.getRemaining('/api/tweets');
  });

  bench('getStatus - full status', () => {
    rateLimiter.getStatus('/api/tweets');
  });

  bench('getAllStatus - multiple endpoints', () => {
    // 複数のエンドポイントでリクエストを記録
    const endpoints = ['/api/tweets', '/api/users', '/api/search', '/api/trends'];
    
    endpoints.forEach(async (endpoint) => {
      try {
        await rateLimiter.checkAndRecord(endpoint);
      } catch (error) {
        // レート制限エラーは無視
      }
    });

    rateLimiter.getAllStatus();
  });

  bench('cleanup - old timestamps', () => {
    // 古いタイムスタンプでリクエストを記録
    for (let i = 0; i < 100; i++) {
      rateLimiter['requests'].set(`/test${i}`, [
        Date.now() - 7200000, // 2時間前
        Date.now() - 3600000, // 1時間前
        Date.now() - 1800000  // 30分前
      ]);
    }
    
    rateLimiter.cleanup();
  });
});

// ============================================================================
// BATCH PROCESSOR PERFORMANCE TESTS
// ============================================================================

describe('BatchProcessor Performance', () => {
  let batchProcessor: BatchProcessor;

  beforeEach(() => {
    batchProcessor = new BatchProcessor({ concurrency: 5 });
  });

  afterEach(async () => {
    await batchProcessor.waitForCompletion();
    batchProcessor.clearQueue();
  });

  bench('add single task', async () => {
    const task = {
      id: 'test_task',
      task: () => Promise.resolve('result')
    };

    await batchProcessor.add(task);
  });

  bench('addBatch - 10 tasks', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task_${i}`,
      task: () => Promise.resolve(`result_${i}`)
    }));

    await batchProcessor.addBatch(tasks);
  });

  bench('addBatch - 50 tasks', async () => {
    const tasks = Array.from({ length: 50 }, (_, i) => ({
      id: `task_${i}`,
      task: () => Promise.resolve(`result_${i}`)
    }));

    await batchProcessor.addBatch(tasks);
  });

  bench('priority queue sorting', () => {
    // 異なる優先度のタスクを追加してソート性能を測定
    const priorities: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low'];
    
    for (let i = 0; i < 100; i++) {
      const priority = priorities[i % 3];
      batchProcessor.add({
        id: `priority_task_${i}`,
        task: () => Promise.resolve(i),
        priority
      });
    }
  });
});

// ============================================================================
// METRICS COLLECTOR PERFORMANCE TESTS
// ============================================================================

describe('MetricsCollector Performance', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
  });

  afterEach(() => {
    metricsCollector.clear();
  });

  bench('record metrics - single operation', () => {
    metricsCollector.record('test_operation', 150, true);
  });

  bench('record metrics - multiple operations', () => {
    const operations = ['api_call', 'database_query', 'cache_lookup', 'validation', 'normalization'];
    
    operations.forEach((op, i) => {
      metricsCollector.record(op, 100 + i * 50, Math.random() > 0.1);
    });
  });

  bench('getStats - single operation', () => {
    // データを準備
    for (let i = 0; i < 100; i++) {
      metricsCollector.record('test_op', 100 + i, true);
    }
    
    metricsCollector.getStats('test_op');
  });

  bench('getAllStats - multiple operations', () => {
    // 複数の操作のデータを準備
    const operations = ['op1', 'op2', 'op3', 'op4', 'op5'];
    
    operations.forEach(op => {
      for (let i = 0; i < 50; i++) {
        metricsCollector.record(op, 100 + i, Math.random() > 0.1);
      }
    });
    
    metricsCollector.getAllStats();
  });

  bench('getSystemMetrics', () => {
    // システムメトリクス計算の性能測定
    for (let i = 0; i < 1000; i++) {
      metricsCollector.record(`op_${i % 10}`, 100 + i, Math.random() > 0.05);
    }
    
    metricsCollector.getSystemMetrics();
  });

  bench('generatePerformanceReport', () => {
    // パフォーマンスレポート生成の性能測定
    const operations = ['api', 'db', 'cache', 'validation', 'processing'];
    
    operations.forEach(op => {
      for (let i = 0; i < 200; i++) {
        metricsCollector.record(op, 50 + Math.random() * 500, Math.random() > 0.08);
      }
    });
    
    metricsCollector.generatePerformanceReport();
  });

  bench('median calculation', () => {
    // 中央値計算の性能測定
    const values = Array.from({ length: 1000 }, () => Math.random() * 1000);
    
    // プライベートメソッドへのアクセス（テスト目的）
    const calculateMedian = (metricsCollector as any).calculateMedian.bind(metricsCollector);
    calculateMedian(values);
  });
});

// ============================================================================
// INTEGRATED PERFORMANCE TESTS
// ============================================================================

describe('Integrated Performance Tests', () => {
  bench('full pipeline - tweet processing', async () => {
    // 完全なパイプライン：検証 -> 正規化 -> メトリクス記録
    const rawTweet = {
      ...mockTweetData,
      id: '9999888877776666555'
    };

    const metricsCollector = new MetricsCollector();
    const startTime = Date.now();
    
    try {
      // 1. バリデーション
      validateTweetText(rawTweet.text);
      validateTwitterUserId(rawTweet.author_id);
      
      // 2. 正規化
      const normalizedTweet = normalizeTweetData(rawTweet);
      
      // 3. セキュリティチェック
      detectMaliciousPatterns(rawTweet.text);
      containsProhibitedContent(rawTweet.text);
      
      const duration = Date.now() - startTime;
      metricsCollector.record('full_pipeline', duration, true);
      
      return normalizedTweet;
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsCollector.record('full_pipeline', duration, false);
      throw error;
    }
  });

  bench('cache efficiency - repeated operations', () => {
    // キャッシュ効率の測定
    const testData = Array.from({ length: 20 }, (_, i) => ({
      userId: `123456789012345678${i % 5}`, // 5種類のIDを繰り返し
      username: `user${i % 3}`, // 3種類のユーザー名を繰り返し
      tweetText: `Tweet number ${i % 7}` // 7種類のテキストを繰り返し
    }));

    testData.forEach(({ userId, username, tweetText }) => {
      validateTwitterUserId(userId);
      validateTwitterUsername(username);
      validateTweetText(tweetText);
    });
  });

  bench('memory pressure test', () => {
    // メモリ使用量とガベージコレクションの影響を測定
    const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
      ...mockTweetData,
      id: `pressure_test_${i}`,
      text: `Memory pressure test tweet ${i} `.repeat(10)
    }));

    largeDataSet.forEach(tweet => {
      normalizeTweetData(tweet);
      validateTweetText(tweet.text);
    });

    // 明示的にnullに設定してGCを促す
    (largeDataSet as any) = null;
  });
});

// ============================================================================
// BENCHMARK UTILITIES
// ============================================================================

/**
 * ベンチマーク結果の分析ヘルパー
 */
export function analyzeBenchmarkResults(results: any[]): {
  fastest: string;
  slowest: string;
  averageTime: number;
  recommendations: string[];
} {
  if (!results || results.length === 0) {
    return {
      fastest: 'N/A',
      slowest: 'N/A',
      averageTime: 0,
      recommendations: ['No benchmark results to analyze']
    };
  }

  const fastest = results.reduce((min, current) => 
    current.time < min.time ? current : min
  );
  
  const slowest = results.reduce((max, current) => 
    current.time > max.time ? current : max
  );

  const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;

  const recommendations: string[] = [];
  
  if (slowest.time > averageTime * 3) {
    recommendations.push(`${slowest.name} is significantly slower than average`);
  }
  
  if (averageTime > 100) {
    recommendations.push('Consider caching or optimization for operations > 100ms');
  }

  return {
    fastest: fastest.name,
    slowest: slowest.name,
    averageTime,
    recommendations
  };
}

export default analyzeBenchmarkResults;