/**
 * Bloomberg Real Execution Test
 * Tests actual Bloomberg data collection with subscription wall detection
 */

import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';
import { SourceTestResult, DataSourceError, TestConfiguration } from './types';

/**
 * Bloomberg実際のテスト実行
 */
export async function testBloombergReal(config: TestConfiguration = {
  timeout: 30000,
  maxRetries: 2,
  testKeyword: 'market'
}): Promise<SourceTestResult> {
  const startTime = new Date().toISOString();
  const startMemory = process.memoryUsage().heapUsed;
  const testStart = Date.now();

  const result: SourceTestResult = {
    sourceName: 'bloomberg',
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

    sessionId = `bloomberg_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    context = await browserManager.acquireContext(sessionId);

    // テスト実行
    const testResults = await Promise.race([
      performBloombergTests(context, config),
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
      subscriptionWallDetected: testResults.subscriptionWallDetected || false,
      searchFormFound: testResults.searchFormFound || false,
      resultsExtracted: testResults.resultsExtracted || false,
      testKeyword: config.testKeyword
    };

  } catch (error: any) {
    // エラー分類
    result.error = classifyBloombergError(error);
    result.success = false;
  } finally {
    // クリーンアップ
    if (sessionId && context) {
      try {
        const browserManager = PlaywrightBrowserManager.getInstance();
        await browserManager.releaseContext(sessionId);
      } catch (cleanupError) {
        console.warn('Bloomberg test cleanup error:', cleanupError);
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
 * Bloomberg特有のテスト実行
 */
async function performBloombergTests(context: any, config: TestConfiguration): Promise<any> {
  const page = await context.newPage();
  const results = {
    itemCount: 0,
    sampleData: [] as any[],
    cookieConsentHandled: false,
    subscriptionWallDetected: false,
    searchFormFound: false,
    resultsExtracted: false
  };

  try {
    // Step 1: Bloombergトップページアクセステスト
    console.log('[Bloomberg Test] Accessing top page...');
    await page.goto('https://www.bloomberg.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });

    // Step 2: 複雑なCookie consent処理テスト
    try {
      await handleBloombergCookieConsent(page);
      results.cookieConsentHandled = true;
    } catch (cookieError) {
      console.warn('[Bloomberg Test] Cookie consent handling failed:', cookieError);
    }

    // Step 3: サブスクリプション壁検出テスト
    try {
      const subscriptionWall = await detectBloombergSubscriptionWall(page);
      results.subscriptionWallDetected = subscriptionWall;
      if (subscriptionWall) {
        console.log('[Bloomberg Test] Subscription wall detected');
      }
    } catch (wallError) {
      console.warn('[Bloomberg Test] Subscription wall detection failed:', wallError);
    }

    // Step 4: 検索フォーム検出テスト
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[name="query"]',
      'input[type="search"]',
      '.search-input input',
      '[data-module="Search"] input',
      '.header-search input'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        searchInput = await page.$(selector);
        if (searchInput) {
          results.searchFormFound = true;
          console.log(`[Bloomberg Test] Search form found: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!searchInput) {
      throw new Error('Bloomberg search form not found');
    }

    // Step 5: 検索実行テスト（認証エラーの詳細記録）
    try {
      console.log(`[Bloomberg Test] Performing search with keyword: ${config.testKeyword}`);
      await searchInput.fill(config.testKeyword || 'market');
      await page.waitForTimeout(1500);
      await searchInput.press('Enter');

      // 検索結果ページ読み込み待機
      try {
        await page.waitForURL(url => 
          url.toString().includes('search') || url.toString().includes('query'), 
          { timeout: 12000 }
        );
        await page.waitForTimeout(4000);
      } catch (error) {
        console.warn('[Bloomberg Test] Search result navigation timeout');
        await page.waitForTimeout(6000);
      }

      // 認証エラー検出
      const authErrors = await detectBloombergAuthErrors(page);
      if (authErrors.length > 0) {
        console.log('[Bloomberg Test] Authentication errors detected:', authErrors);
      }

    } catch (searchError) {
      console.warn('[Bloomberg Test] Search execution failed:', searchError);
    }

    // Step 6: 結果抽出テスト
    const searchResults = await page.evaluate(() => {
      const results: Array<{title: string, link: string, snippet: string}> = [];
      
      try {
        const resultSelectors = [
          '.search-result-story',
          '.search-result',
          '.story-item',
          '.search-content .result',
          '[data-module="SearchResults"] .result'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Bloomberg search results found: ${selector} (${elements.length} items)`);
            
            Array.from(elements).slice(0, 3).forEach((element: any, index: number) => {
              const titleElement = element.querySelector('h3, h2, .title, .headline, a');
              const linkElement = element.querySelector('a');
              const snippetElement = element.querySelector('p, .snippet, .summary, .description');
              
              if (titleElement) {
                results.push({
                  title: titleElement.textContent?.trim() || `Bloomberg Result ${index + 1}`,
                  link: linkElement?.getAttribute('href') || '',
                  snippet: snippetElement?.textContent?.trim() || 'Bloomberg market analysis'
                });
              }
            });
            break;
          }
        }

        // フォールバック：Bloomberg特有のコンテンツを探す
        if (results.length === 0) {
          const headlines = Array.from(document.querySelectorAll('h1, h2, h3')).filter((el: any) => {
            const text = el.textContent?.trim();
            return text && text.length > 10 && text.length < 200;
          });

          headlines.slice(0, 3).forEach((headline: any, index: number) => {
            const parentLink = headline.closest('a') || headline.querySelector('a');
            results.push({
              title: headline.textContent?.trim() || `Bloomberg Article ${index + 1}`,
              link: parentLink?.getAttribute('href') || '',
              snippet: 'Bloomberg market analysis and economic news'
            });
          });
        }
        
      } catch (error) {
        console.error('Bloomberg result extraction error:', error);
      }
      
      return results;
    });

    results.itemCount = searchResults.length;
    results.sampleData = searchResults;
    results.resultsExtracted = searchResults.length > 0;

    console.log(`[Bloomberg Test] Extracted ${searchResults.length} results`);
    
  } finally {
    await page.close();
  }

  return results;
}

/**
 * Bloomberg複雑Cookie consent処理
 */
async function handleBloombergCookieConsent(page: any): Promise<void> {
  const consentSelectors = [
    // Bloomberg特有のセレクタ
    '[data-module="ConsentBanner"] button[data-tracking="Accept"]',
    '[data-module="ConsentBanner"] button:has-text("Accept")',
    '.consent-banner .accept-button',
    'button[data-module="privacy-consent"]',
    
    // 一般的なセレクタ
    'button[name="agree"]',
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I Accept")',
    '.cookie-consent button',
    '#onetrust-accept-btn-handler'
  ];

  for (const selector of consentSelectors) {
    try {
      const consentButton = await page.waitForSelector(selector, { timeout: 2000 });
      if (consentButton) {
        // Bloomberg reliability improvement: multiple click attempts
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await consentButton.click({ timeout: 3000 });
            console.log(`[Bloomberg Test] Cookie consent clicked: ${selector}`);
            await page.waitForTimeout(1000);
            return;
          } catch (clickError) {
            if (attempt === 2) throw clickError;
            await page.waitForTimeout(500);
          }
        }
      }
    } catch (error) {
      continue;
    }
  }
}

/**
 * Bloombergサブスクリプション壁検出
 */
async function detectBloombergSubscriptionWall(page: any): Promise<boolean> {
  const subscriptionIndicators = [
    '.paywall',
    '.subscription-barrier',
    '.premium-content',
    '[data-module="paywall"]',
    'text=Subscribe to continue',
    'text=Sign up for unlimited',
    'text=Premium subscribers',
    '.subscriber-only'
  ];

  for (const indicator of subscriptionIndicators) {
    try {
      const element = await page.waitForSelector(indicator, { timeout: 1000 });
      if (element) {
        return true;
      }
    } catch (error) {
      continue;
    }
  }

  return false;
}

/**
 * Bloomberg認証エラーの詳細記録
 */
async function detectBloombergAuthErrors(page: any): Promise<string[]> {
  const authErrors: string[] = [];
  
  const errorIndicators = [
    'text=Access Denied',
    'text=Authentication Failed',
    'text=Please log in',
    'text=Subscription required',
    '.error-message',
    '.auth-error',
    '.login-required'
  ];

  for (const indicator of errorIndicators) {
    try {
      const element = await page.waitForSelector(indicator, { timeout: 1000 });
      if (element) {
        const errorText = await element.textContent();
        if (errorText) {
          authErrors.push(errorText.trim());
        }
      }
    } catch (error) {
      continue;
    }
  }

  return authErrors;
}

/**
 * Bloombergエラー分類
 */
function classifyBloombergError(error: Error): DataSourceError {
  const errorMessage = error.message.toLowerCase();
  
  // サブスクリプション壁
  if (errorMessage.includes('subscription') || errorMessage.includes('paywall')) {
    return {
      category: 'authentication',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'fallback',
      details: 'Bloomberg subscription wall encountered',
      originalError: error
    };
  }
  
  // タイムアウトエラー
  if (errorMessage.includes('timeout') || errorMessage.includes('navigation timeout')) {
    return {
      category: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'Bloomberg page loading timeout',
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
      details: 'Bloomberg search form selectors need updating',
      originalError: error
    };
  }
  
  // 認証エラー
  if (errorMessage.includes('authentication') || errorMessage.includes('access denied')) {
    return {
      category: 'authentication',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'disable',
      details: 'Bloomberg authentication required',
      originalError: error
    };
  }
  
  // コンテンツブロック
  if (errorMessage.includes('blocked') || errorMessage.includes('forbidden')) {
    return {
      category: 'content_blocked',
      severity: 'critical',
      recoverable: false,
      suggestedFix: 'fallback',
      details: 'Bloomberg content access blocked',
      originalError: error
    };
  }
  
  // その他のエラー
  return {
    category: 'network',
    severity: 'medium',
    recoverable: true,
    suggestedFix: 'retry',
    details: `Bloomberg unknown error: ${error.message}`,
    originalError: error
  };
}

export default testBloombergReal;