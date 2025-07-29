# TASK-003: KaitoAPI Utils パフォーマンス最適化と追加機能実装

## 概要
src/kaito-api/utils/のパフォーマンスを最適化し、実用的な追加機能を実装する。

## 背景
現在のutilsは機能的には完成しているが、以下の改善により更に価値を高められる：
- パフォーマンスのボトルネック解消
- メモリ使用量の最適化
- 便利な追加ユーティリティの実装

## 実装内容

### 1. パフォーマンス最適化

#### response-handler.ts の最適化
```typescript
// リクエストログのメモリ効率改善
export class ResponseHandler {
  private requestLog: Map<string, ResponseMetadata[]> = new Map();
  private readonly MAX_LOG_ENTRIES = 100;
  private readonly LOG_RETENTION_MS = 3600000; // 1時間
  
  // 古いログの自動削除
  private cleanupOldLogs(): void {
    const now = Date.now();
    this.requestLog.forEach((logs, endpoint) => {
      const filtered = logs.filter(log => {
        const timestamp = new Date(log.timestamp).getTime();
        return now - timestamp < this.LOG_RETENTION_MS;
      });
      
      if (filtered.length === 0) {
        this.requestLog.delete(endpoint);
      } else {
        this.requestLog.set(endpoint, filtered);
      }
    });
  }
}
```

#### normalizer.ts の最適化
```typescript
// 正規化処理のキャッシング
const normalizationCache = new Map<string, any>();
const CACHE_SIZE = 1000;

export function normalizeTweetData(
  apiTweet: any, 
  options: NormalizationOptions = {}
): TweetData {
  const cacheKey = `tweet_${apiTweet.id}`;
  
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey);
  }
  
  // 正規化処理...
  const normalized = { /* ... */ };
  
  // キャッシュサイズ制限
  if (normalizationCache.size >= CACHE_SIZE) {
    const firstKey = normalizationCache.keys().next().value;
    normalizationCache.delete(firstKey);
  }
  
  normalizationCache.set(cacheKey, normalized);
  return normalized;
}
```

#### validator.ts の最適化
```typescript
// 正規表現のプリコンパイル
const REGEX_CACHE = {
  twitterId: /^\d{1,20}$/,
  username: /^[a-zA-Z0-9_]{1,15}$/,
  koreanChars: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/,
  // ... 他の正規表現
};

// バリデーション結果のキャッシング
const validationCache = new Map<string, ValidationResult>();

export function validateTwitterUserId(userId: string): ValidationResult {
  const cacheKey = `userId_${userId}`;
  
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }
  
  // バリデーション処理...
  const result = { /* ... */ };
  
  validationCache.set(cacheKey, result);
  return result;
}
```

### 2. 新規ユーティリティファイルの追加

#### rate-limiter.ts（新規作成）
```typescript
/**
 * TwitterAPI.io レート制限管理ユーティリティ
 */
import { RATE_LIMITS } from './constants';
import { RateLimitError } from './errors';

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  /**
   * レート制限チェックと記録
   */
  async checkAndRecord(endpoint: string): Promise<void> {
    const now = Date.now();
    const limit = this.getEndpointLimit(endpoint);
    
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }
    
    const timestamps = this.requests.get(endpoint)!;
    const windowStart = now - (limit.window * 1000);
    
    // 古いタイムスタンプを削除
    const activeRequests = timestamps.filter(ts => ts > windowStart);
    
    if (activeRequests.length >= limit.limit) {
      const oldestRequest = Math.min(...activeRequests);
      const resetTime = oldestRequest + (limit.window * 1000);
      throw new RateLimitError(endpoint, resetTime, limit.limit);
    }
    
    activeRequests.push(now);
    this.requests.set(endpoint, activeRequests);
  }
  
  /**
   * エンドポイント別のレート制限取得
   */
  private getEndpointLimit(endpoint: string): { limit: number; window: number } {
    if (endpoint.includes('create_tweet') || endpoint.includes('delete_tweet')) {
      return RATE_LIMITS.posting;
    }
    if (endpoint.includes('search')) {
      return RATE_LIMITS.search;
    }
    if (endpoint.includes('like') || endpoint.includes('retweet')) {
      return RATE_LIMITS.engagement;
    }
    return RATE_LIMITS.general;
  }
  
  /**
   * 残り利用可能数の取得
   */
  getRemaining(endpoint: string): number {
    const limit = this.getEndpointLimit(endpoint);
    const timestamps = this.requests.get(endpoint) || [];
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);
    const activeRequests = timestamps.filter(ts => ts > windowStart);
    
    return Math.max(0, limit.limit - activeRequests.length);
  }
}
```

#### batch-processor.ts（新規作成）
```typescript
/**
 * バッチ処理ユーティリティ
 * 複数のAPI呼び出しを効率的に処理
 */
export class BatchProcessor {
  private queue: Array<{
    id: string;
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  private processing = false;
  private concurrency: number;
  
  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }
  
  /**
   * タスクをキューに追加
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `task_${Date.now()}_${Math.random()}`;
      this.queue.push({ id, task, resolve, reject });
      this.processQueue();
    });
  }
  
  /**
   * キューの処理
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      
      await Promise.all(
        batch.map(async ({ task, resolve, reject }) => {
          try {
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      );
      
      // レート制限考慮の待機
      if (this.queue.length > 0) {
        await this.delay(100);
      }
    }
    
    this.processing = false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### metrics-collector.ts（新規作成）
```typescript
/**
 * パフォーマンスメトリクス収集ユーティリティ
 */
export class MetricsCollector {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    lastUpdated: Date;
  }> = new Map();
  
  /**
   * メトリクスの記録
   */
  record(operation: string, duration: number, success: boolean): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        errors: 0,
        lastUpdated: new Date()
      });
    }
    
    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
    metric.lastUpdated = new Date();
  }
  
  /**
   * 統計情報の取得
   */
  getStats(operation?: string): any {
    if (operation) {
      const metric = this.metrics.get(operation);
      if (!metric) return null;
      
      return {
        operation,
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
        errorRate: metric.errors / metric.count,
        lastUpdated: metric.lastUpdated
      };
    }
    
    // 全体統計
    const stats: any[] = [];
    this.metrics.forEach((metric, op) => {
      stats.push({
        operation: op,
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
        errorRate: metric.errors / metric.count,
        lastUpdated: metric.lastUpdated
      });
    });
    
    return stats;
  }
  
  /**
   * メトリクスのクリア
   */
  clear(): void {
    this.metrics.clear();
  }
}
```

### 3. index.ts の更新
```typescript
// 新規ユーティリティのエクスポート追加
export * from './rate-limiter';
export * from './batch-processor';
export * from './metrics-collector';

// 便利な統合エクスポート
export { createEducationalResponseHandler } from './response-handler';
export { TwitterAPITypeChecker } from './type-checker';
```

### 4. 最適化のベンチマーク実装
`/tests/kaito-api/utils/performance.bench.ts`を作成：

```typescript
import { bench, describe } from 'vitest';
import { normalizeTweetData, normalizeUserData } from '@/kaito-api/utils/normalizer';
import { validateTwitterUserId, validateTweetText } from '@/kaito-api/utils/validator';

describe('Normalizer Performance', () => {
  bench('normalizeTweetData', () => {
    const mockTweet = { /* モックデータ */ };
    normalizeTweetData(mockTweet);
  });
  
  bench('normalizeUserData with cache', () => {
    const mockUser = { /* モックデータ */ };
    normalizeUserData(mockUser);
  });
});

describe('Validator Performance', () => {
  bench('validateTwitterUserId', () => {
    validateTwitterUserId('1234567890123456789');
  });
  
  bench('validateTweetText', () => {
    validateTweetText('This is a test tweet for performance testing');
  });
});
```

## 実装要件
- メモリリークを防ぐ（キャッシュサイズ制限）
- 並行処理の適切な制御
- エラーハンドリングの維持
- 既存APIとの後方互換性

## テスト要件
- 新規ユーティリティの単体テスト
- パフォーマンステストの実装
- メモリ使用量のテスト
- 並行処理のテスト

## 完了条件
- [ ] パフォーマンス最適化の実装
- [ ] 3つの新規ユーティリティファイルの作成
- [ ] ベンチマークテストの実装と改善確認
- [ ] 新規ユーティリティのテスト実装
- [ ] index.tsの更新
- [ ] メモリリークがないことの確認

## 参考資料
- TwitterAPI.ioレート制限ドキュメント
- Node.js パフォーマンスベストプラクティス
- Vitest ベンチマーク機能