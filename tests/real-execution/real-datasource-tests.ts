import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { Browser, Page, chromium } from 'playwright';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * リアルテスト結果の型定義
 */
interface RealTestResult {
  sourceName: string;
  success: boolean;
  error?: {
    type: string;
    message: string;
    stack?: string;
    timestamp: string;
    isPermanent: boolean;
  };
  duration: number;
  dataCollected?: any[];
}

/**
 * リアルエラー検出・報告システム
 */
class RealErrorDetector {
  private errorHistory: Array<RealTestResult> = [];
  
  /**
   * エラーの分類（一時的 vs 恒久的）
   */
  private classifyError(error: Error): boolean {
    const permanentErrors = [
      'Authentication failed',
      'API key invalid',
      'Forbidden',
      'Not Found',
      'Rate limit exceeded permanently',
      'Invalid response format'
    ];
    
    const temporaryErrors = [
      'timeout',
      'ECONNRESET',
      'ECONNREFUSED', 
      'Network Error',
      'Request timeout',
      'Connection closed'
    ];
    
    // 恒久的エラーのチェック
    if (permanentErrors.some(perm => error.message.includes(perm))) {
      return true;
    }
    
    // 一時的エラーのチェック
    if (temporaryErrors.some(temp => error.message.toLowerCase().includes(temp.toLowerCase()))) {
      return false;
    }
    
    // 不明な場合は一時的とみなす
    return false;
  }
  
  /**
   * エラー詳細の記録
   */
  recordError(sourceName: string, error: Error, duration: number): RealTestResult {
    const testResult: RealTestResult = {
      sourceName,
      success: false,
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        isPermanent: this.classifyError(error)
      },
      duration
    };
    
    this.errorHistory.push(testResult);
    return testResult;
  }
  
  /**
   * 成功結果の記録
   */
  recordSuccess(sourceName: string, duration: number, data?: any[]): RealTestResult {
    const testResult: RealTestResult = {
      sourceName,
      success: true,
      duration,
      dataCollected: data
    };
    
    this.errorHistory.push(testResult);
    return testResult;
  }
  
  /**
   * Claude用レポート生成
   */
  generateClaudeReport(): string {
    const errors = this.errorHistory.filter(r => !r.success);
    const successes = this.errorHistory.filter(r => r.success);
    
    return `
# Real Data Source Test Report

## Summary
- Total Tests: ${this.errorHistory.length}
- Successes: ${successes.length}
- Errors: ${errors.length}

## Error Details
${errors.map(err => `
### ${err.sourceName}
- **Type**: ${err.error?.type}
- **Message**: ${err.error?.message}
- **Permanent**: ${err.error?.isPermanent ? 'Yes' : 'No'}
- **Duration**: ${err.duration}ms
- **Timestamp**: ${err.error?.timestamp}
`).join('')}

## Success Details
${successes.map(succ => `
### ${succ.sourceName}
- **Duration**: ${succ.duration}ms
- **Data Collected**: ${succ.dataCollected?.length || 0} items
`).join('')}
`;
  }
}

/**
 * リアルデータソーステストクラス
 */
class RealDataSourceTests {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private errorDetector: RealErrorDetector;
  
  constructor() {
    this.errorDetector = new RealErrorDetector();
  }
  
  async setup() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
  }
  
  async cleanup() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  /**
   * Yahoo Financeのリアルテスト
   */
  async testYahooFinance(): Promise<RealTestResult> {
    const startTime = Date.now();
    const sourceName = 'Yahoo Finance';
    
    try {
      if (!this.page) throw new Error('Browser not initialized');
      
      await this.page.goto('https://finance.yahoo.com/quote/AAPL', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const data = await this.page.evaluate(() => {
        const priceElement = document.querySelector('[data-symbol="AAPL"][data-field="regularMarketPrice"]');
        const changeElement = document.querySelector('[data-symbol="AAPL"][data-field="regularMarketChange"]');
        
        return {
          price: priceElement?.textContent?.trim() || null,
          change: changeElement?.textContent?.trim() || null,
          timestamp: new Date().toISOString()
        };
      });
      
      const duration = Date.now() - startTime;
      return this.errorDetector.recordSuccess(sourceName, duration, [data]);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.errorDetector.recordError(sourceName, error as Error, duration);
    }
  }
  
  /**
   * Bloombergのリアルテスト
   */
  async testBloomberg(): Promise<RealTestResult> {
    const startTime = Date.now();
    const sourceName = 'Bloomberg';
    
    try {
      if (!this.page) throw new Error('Browser not initialized');
      
      await this.page.goto('https://www.bloomberg.com/markets', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const data = await this.page.evaluate(() => {
        const headlines = Array.from(document.querySelectorAll('h3, h4')).slice(0, 3).map(el => ({
          headline: el.textContent?.trim() || '',
          timestamp: new Date().toISOString()
        }));
        
        return headlines;
      });
      
      const duration = Date.now() - startTime;
      return this.errorDetector.recordSuccess(sourceName, duration, data);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.errorDetector.recordError(sourceName, error as Error, duration);
    }
  }
  
  /**
   * Redditのリアルテスト
   */
  async testReddit(): Promise<RealTestResult> {
    const startTime = Date.now();
    const sourceName = 'Reddit';
    
    try {
      if (!this.page) throw new Error('Browser not initialized');
      
      await this.page.goto('https://www.reddit.com/r/investing/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const data = await this.page.evaluate(() => {
        const posts = Array.from(document.querySelectorAll('[data-testid="post-container"]')).slice(0, 5).map(el => {
          const titleElement = el.querySelector('h3');
          return {
            title: titleElement?.textContent?.trim() || '',
            timestamp: new Date().toISOString()
          };
        });
        
        return posts;
      });
      
      const duration = Date.now() - startTime;
      return this.errorDetector.recordSuccess(sourceName, duration, data);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.errorDetector.recordError(sourceName, error as Error, duration);
    }
  }
  
  /**
   * CoinGecko APIのリアルテスト
   */
  async testCoinGeckoAPI(): Promise<RealTestResult> {
    const startTime = Date.now();
    const sourceName = 'CoinGecko API';
    
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const data = [{
        bitcoin_usd: response.data.bitcoin?.usd || null,
        ethereum_usd: response.data.ethereum?.usd || null,
        timestamp: new Date().toISOString()
      }];
      
      const duration = Date.now() - startTime;
      return this.errorDetector.recordSuccess(sourceName, duration, data);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.errorDetector.recordError(sourceName, error as Error, duration);
    }
  }
  
  /**
   * HackerNews APIのリアルテスト
   */
  async testHackerNewsAPI(): Promise<RealTestResult> {
    const startTime = Date.now();
    const sourceName = 'HackerNews API';
    
    try {
      const topStoriesResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json', {
        timeout: 30000
      });
      
      const topStoryIds = topStoriesResponse.data.slice(0, 3);
      
      const stories = await Promise.all(
        topStoryIds.map(async (id: number) => {
          const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            timeout: 30000
          });
          return {
            id,
            title: storyResponse.data.title,
            url: storyResponse.data.url,
            timestamp: new Date().toISOString()
          };
        })
      );
      
      const duration = Date.now() - startTime;
      return this.errorDetector.recordSuccess(sourceName, duration, stories);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.errorDetector.recordError(sourceName, error as Error, duration);
    }
  }
}

/**
 * テスト実行制御関数
 */
async function executeRealTest(sourceName: string): Promise<RealTestResult> {
  const tester = new RealDataSourceTests();
  let result: RealTestResult;
  
  try {
    await tester.setup();
    
    switch (sourceName.toLowerCase()) {
      case 'yahoo finance':
        result = await tester.testYahooFinance();
        break;
      case 'bloomberg':
        result = await tester.testBloomberg();
        break;
      case 'reddit':
        result = await tester.testReddit();
        break;
      case 'coingecko api':
        result = await tester.testCoinGeckoAPI();
        break;
      case 'hackernews api':
        result = await tester.testHackerNewsAPI();
        break;
      default:
        throw new Error(`Unknown source: ${sourceName}`);
    }
    
    // JSON出力
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(
      process.cwd(),
      'tasks/20250722_004919_real_error_learning_system/outputs',
      `real-test-${sourceName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`
    );
    
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    
  } finally {
    await tester.cleanup();
  }
  
  return result!;
}

// Vitestテストスイート
describe('Real Data Source Tests', () => {
  let tester: RealDataSourceTests;
  
  beforeEach(async () => {
    tester = new RealDataSourceTests();
    await tester.setup();
  });
  
  afterEach(async () => {
    await tester.cleanup();
  });
  
  test('Yahoo Finance real test', async () => {
    const result = await tester.testYahooFinance();
    expect(result).toBeDefined();
    expect(result.sourceName).toBe('Yahoo Finance');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);
  
  test('Bloomberg real test', async () => {
    const result = await tester.testBloomberg();
    expect(result).toBeDefined();
    expect(result.sourceName).toBe('Bloomberg');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);
  
  test('Reddit real test', async () => {
    const result = await tester.testReddit();
    expect(result).toBeDefined();
    expect(result.sourceName).toBe('Reddit');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);
  
  test('CoinGecko API real test', async () => {
    const result = await tester.testCoinGeckoAPI();
    expect(result).toBeDefined();
    expect(result.sourceName).toBe('CoinGecko API');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);
  
  test('HackerNews API real test', async () => {
    const result = await tester.testHackerNewsAPI();
    expect(result).toBeDefined();
    expect(result.sourceName).toBe('HackerNews API');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);
  
  test('Execute all real tests in parallel (max 3)', async () => {
    const sources = ['Yahoo Finance', 'CoinGecko API', 'HackerNews API'];
    
    const results = await Promise.allSettled(
      sources.map(source => executeRealTest(source))
    );
    
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.status).toBeDefined();
      console.log(`${sources[index]}: ${result.status}`);
    });
  }, 120000);
});

// エクスポート
export { RealDataSourceTests, RealErrorDetector, executeRealTest, type RealTestResult };