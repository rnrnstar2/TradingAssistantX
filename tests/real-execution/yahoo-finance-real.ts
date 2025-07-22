/**
 * Yahoo Finance Real Execution Test
 * Tests actual Yahoo Finance data collection with error detection
 */

import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';
import { SourceTestResult, DataSourceError, TestConfiguration } from './types';

/**
 * Yahoo Finance実際のテスト実行
 */
export async function testYahooFinanceReal(config: TestConfiguration = {
  timeout: 30000,
  maxRetries: 2,
  testKeyword: 'AAPL'
}): Promise<SourceTestResult> {
  const startTime = new Date().toISOString();
  const startMemory = process.memoryUsage().heapUsed;
  const testStart = Date.now();

  const result: SourceTestResult = {
    sourceName: 'yahoo_finance',
    testStartTime: startTime,
    testEndTime: '',
    success: false,
    performanceMetrics: {
      responseTime: 0,
      memoryUsed: 0
    }
  };

  let context: any = null;
  let sessionId: string | null = null;

  try {
    // ブラウザマネージャー取得
    const browserManager = PlaywrightBrowserManager.getInstance({
      maxBrowsers: 1,
      maxContextsPerBrowser: 2
    });

    sessionId = `yahoo_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    context = await browserManager.acquireContext(sessionId);

    // テスト実行
    const testResults = await Promise.race([
      performYahooFinanceTests(context, config),
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
      cookieConsentHandled: testResults.cookieConsentHandled || false,
      searchFormFound: testResults.searchFormFound || false,
      resultsExtracted: testResults.resultsExtracted || false,
      testKeyword: config.testKeyword
    };

  } catch (error: any) {
    // エラー分類
    result.error = classifyYahooFinanceError(error);
    result.success = false;
  } finally {
    // クリーンアップ
    if (sessionId && context) {
      try {
        const browserManager = PlaywrightBrowserManager.getInstance();
        await browserManager.releaseContext(sessionId);
      } catch (cleanupError) {
        console.warn('Yahoo Finance test cleanup error:', cleanupError);
      }
    }

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
 * Yahoo Finance特有のテスト実行
 */
async function performYahooFinanceTests(context: any, config: TestConfiguration): Promise<any> {
  const page = await context.newPage();
  const results = {
    itemCount: 0,
    sampleData: [] as any[],
    cookieConsentHandled: false,
    searchFormFound: false,
    resultsExtracted: false
  };

  try {
    // Step 1: Yahoo Financeトップページアクセス
    console.log('[Yahoo Finance Test] Accessing top page...');
    await page.goto('https://finance.yahoo.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });

    // Step 2: Cookie consent処理テスト
    try {
      await handleYahooFinanceCookieConsent(page);
      results.cookieConsentHandled = true;
    } catch (cookieError) {
      console.warn('[Yahoo Finance Test] Cookie consent handling failed:', cookieError);
    }

    // Step 3: 検索フォーム検出テスト
    const searchSelectors = [
      'input[name="p"]',
      '#yfin-usr-qry',
      'input[placeholder*="search"]',
      'input[type="search"]',
      '.search-input input'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        searchInput = await page.$(selector);
        if (searchInput) {
          results.searchFormFound = true;
          console.log(`[Yahoo Finance Test] Search form found: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!searchInput) {
      throw new Error('Yahoo Finance search form not found');
    }

    // Step 4: 検索実行テスト
    console.log(`[Yahoo Finance Test] Performing search with keyword: ${config.testKeyword}`);
    await searchInput.fill(config.testKeyword || 'AAPL');
    await page.waitForTimeout(1000);
    await searchInput.press('Enter');

    // Step 5: 検索結果読み込み待機
    try {
      await page.waitForURL(url => 
        url.toString().includes('search') || url.toString().includes('query'), 
        { timeout: 10000 }
      );
      await page.waitForTimeout(3000);
    } catch (error) {
      console.warn('[Yahoo Finance Test] Search result navigation timeout');
      await page.waitForTimeout(5000);
    }

    // Step 6: 結果抽出テスト
    const searchResults = await page.evaluate(() => {
      const results: Array<{title: string, link: string, snippet: string}> = [];
      
      try {
        const resultSelectors = [
          '[data-module="SearchResults"] li',
          '.search-result-item',
          '.result',
          '.searchResult',
          'li[data-test="result"]'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            Array.from(elements).slice(0, 3).forEach((element: any, index: number) => {
              const titleElement = element.querySelector('h3, h2, .title, a');
              const linkElement = element.querySelector('a');
              const snippetElement = element.querySelector('p, .snippet, .description');
              
              if (titleElement) {
                results.push({
                  title: titleElement.textContent?.trim() || `Result ${index + 1}`,
                  link: linkElement?.getAttribute('href') || '',
                  snippet: snippetElement?.textContent?.trim() || 'Yahoo Finance content'
                });
              }
            });
            break;
          }
        }
      } catch (error) {
        console.error('Yahoo Finance result extraction error:', error);
      }
      
      return results;
    });

    results.itemCount = searchResults.length;
    results.sampleData = searchResults;
    results.resultsExtracted = searchResults.length > 0;

    console.log(`[Yahoo Finance Test] Extracted ${searchResults.length} results`);
    
  } finally {
    await page.close();
  }

  return results;
}

/**
 * Yahoo Finance Cookie consent処理
 */
async function handleYahooFinanceCookieConsent(page: any): Promise<void> {
  const consentSelectors = [
    'button[name="agree"]',
    'button[data-tracking="Accept"]',
    'button:has-text("Accept")',
    '.consent-banner button',
    '[data-testid="consent-accept-all"]',
    'button:has-text("I Accept")',
    'button:has-text("同意")'
  ];

  for (const selector of consentSelectors) {
    try {
      const consentButton = await page.waitForSelector(selector, { timeout: 2000 });
      if (consentButton) {
        await consentButton.click({ timeout: 3000 });
        console.log(`[Yahoo Finance Test] Cookie consent clicked: ${selector}`);
        await page.waitForTimeout(1000);
        return;
      }
    } catch (error) {
      continue;
    }
  }
}

/**
 * Yahoo Financeエラー分類
 */
function classifyYahooFinanceError(error: Error): DataSourceError {
  const errorMessage = error.message.toLowerCase();
  
  // タイムアウトエラー
  if (errorMessage.includes('timeout') || errorMessage.includes('navigation timeout')) {
    return {
      category: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'Yahoo Finance page loading timeout',
      originalError: error
    };
  }
  
  // 検索フォームが見つからない
  if (errorMessage.includes('search form not found')) {
    return {
      category: 'structure_change',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'update_code',
      details: 'Yahoo Finance search form selectors need updating',
      originalError: error
    };
  }
  
  // ネットワークエラー
  if (errorMessage.includes('net::') || errorMessage.includes('connection')) {
    return {
      category: 'network',
      severity: 'high',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'Network connection issue to Yahoo Finance',
      originalError: error
    };
  }
  
  // コンテンツブロック
  if (errorMessage.includes('blocked') || errorMessage.includes('forbidden')) {
    return {
      category: 'content_blocked',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'fallback',
      details: 'Yahoo Finance content access blocked',
      originalError: error
    };
  }
  
  // その他のエラー
  return {
    category: 'network',
    severity: 'medium',
    recoverable: true,
    suggestedFix: 'retry',
    details: `Yahoo Finance unknown error: ${error.message}`,
    originalError: error
  };
}

export default testYahooFinanceReal;