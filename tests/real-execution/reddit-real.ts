/**
 * Reddit Real Execution Test
 * Tests actual Reddit data collection with rate limit detection
 */

import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';
import { SourceTestResult, DataSourceError, TestConfiguration } from './types';

/**
 * Reddit実際のテスト実行
 */
export async function testRedditReal(config: TestConfiguration = {
  timeout: 30000,
  maxRetries: 2,
  testKeyword: 'investing'
}): Promise<SourceTestResult> {
  const startTime = new Date().toISOString();
  const startMemory = process.memoryUsage().heapUsed;
  const testStart = Date.now();

  const result: SourceTestResult = {
    sourceName: 'reddit',
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

    sessionId = `reddit_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    context = await browserManager.acquireContext(sessionId);

    // テスト実行
    const testResults = await Promise.race([
      performRedditTests(context, config),
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
      subredditAccess: testResults.subredditAccess || false,
      rateLimitDetected: testResults.rateLimitDetected || false,
      searchFunctionTested: testResults.searchFunctionTested || false,
      postDataExtracted: testResults.postDataExtracted || false,
      testKeyword: config.testKeyword,
      testedSubreddits: testResults.testedSubreddits || []
    };

  } catch (error: any) {
    // エラー分類
    result.error = classifyRedditError(error);
    result.success = false;
  } finally {
    // クリーンアップ
    if (sessionId && context) {
      try {
        const browserManager = PlaywrightBrowserManager.getInstance();
        await browserManager.releaseContext(sessionId);
      } catch (cleanupError) {
        console.warn('Reddit test cleanup error:', cleanupError);
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
 * Reddit特有のテスト実行
 */
async function performRedditTests(context: any, config: TestConfiguration): Promise<any> {
  const page = await context.newPage();
  const results = {
    itemCount: 0,
    sampleData: [] as any[],
    subredditAccess: false,
    rateLimitDetected: false,
    searchFunctionTested: false,
    postDataExtracted: false,
    testedSubreddits: [] as string[]
  };

  try {
    // テスト対象subredditのリスト
    const testSubreddits = ['investing', 'stocks', 'personalfinance', 'financialindependence'];
    
    for (const subreddit of testSubreddits.slice(0, 2)) { // 最大2つまでテスト
      try {
        console.log(`[Reddit Test] Testing subreddit: r/${subreddit}`);
        
        // Step 1: Subredditアクセステスト
        const subredditUrl = `https://www.reddit.com/r/${subreddit}`;
        await page.goto(subredditUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });

        results.testedSubreddits.push(subreddit);
        results.subredditAccess = true;

        // Step 2: レート制限検出
        const rateLimitStatus = await detectRedditRateLimit(page);
        if (rateLimitStatus) {
          results.rateLimitDetected = true;
          console.log('[Reddit Test] Rate limit detected');
          break; // レート制限発生時は他のsubredditテストをスキップ
        }

        // Step 3: 検索機能テスト
        await testRedditSearchFunction(page, config.testKeyword || 'investing');
        results.searchFunctionTested = true;

        // Step 4: 投稿データ取得テスト
        const posts = await extractRedditPosts(page);
        if (posts.length > 0) {
          results.postDataExtracted = true;
          results.itemCount += posts.length;
          results.sampleData.push(...posts);
        }

        // 各subreddit間の遅延
        await page.waitForTimeout(2000);

      } catch (subredditError) {
        console.warn(`[Reddit Test] Error testing r/${subreddit}:`, subredditError);
        continue; // 次のsubredditに続行
      }
    }

    // Step 5: コミュニティアクセス可否確認
    const accessibilityCheck = await checkRedditCommunityAccessibility(page);
    // Store accessibility info in results for later use

    console.log(`[Reddit Test] Total posts extracted: ${results.itemCount}`);
    
  } finally {
    await page.close();
  }

  return results;
}

/**
 * Redditレート制限検出
 */
async function detectRedditRateLimit(page: any): Promise<boolean> {
  const rateLimitIndicators = [
    'text=Too Many Requests',
    'text=Rate limit exceeded',
    'text=Try again later',
    '.rate-limit-message',
    '[data-testid="rate-limit"]',
    '.error-page',
    'text=429'
  ];

  for (const indicator of rateLimitIndicators) {
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
 * Reddit検索機能テスト
 */
async function testRedditSearchFunction(page: any, keyword: string): Promise<void> {
  const searchSelectors = [
    'input[placeholder*="Search"]',
    'input[name="q"]',
    'input[type="search"]',
    '[data-testid="search-input"]',
    '.search-input input',
    '#search-input'
  ];

  for (const selector of searchSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      const searchInput = await page.$(selector);
      
      if (searchInput) {
        console.log(`[Reddit Test] Search form found: ${selector}`);
        
        // 検索実行テスト
        await searchInput.fill(keyword);
        await page.waitForTimeout(1000);
        await searchInput.press('Enter');
        
        // 検索結果読み込み待機
        try {
          await page.waitForURL(url => url.toString().includes('search'), { timeout: 8000 });
          await page.waitForTimeout(3000);
        } catch (error) {
          console.warn('[Reddit Test] Search navigation timeout');
        }
        
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Reddit search function not accessible');
}

/**
 * Reddit投稿データ抽出
 */
async function extractRedditPosts(page: any): Promise<Array<{title: string, link: string, snippet: string}>> {
  return await page.evaluate(() => {
    const posts: Array<{title: string, link: string, snippet: string}> = [];
    
    try {
      const postSelectors = [
        '[data-testid="post-container"]',
        '.Post',
        'article',
        '.search-result',
        'div[data-click-id="body"]',
        '.search-post-link'
      ];

      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Reddit posts found: ${selector} (${elements.length} items)`);
          
          Array.from(elements).slice(0, 5).forEach((element: any, index: number) => {
            const titleElement = element.querySelector('h3, h2, .title, [data-testid="post-content"] h3, a[data-click-id="body"]');
            const linkElement = element.querySelector('a');
            const snippetElement = element.querySelector('p, .usertext-body, [data-testid="post-content"] p, .md, .preview-text');
            
            if (titleElement) {
              const title = titleElement.textContent?.trim() || `Reddit Post ${index + 1}`;
              const link = linkElement?.getAttribute('href') || '';
              const snippet = snippetElement?.textContent?.trim() || 'Reddit community discussion';
              
              // 最小長度フィルター
              if (title.length > 5 && title.length < 300) {
                posts.push({ title, link, snippet });
              }
            }
          });
          break;
        }
      }

      // フォールバック：一般的な見出しを探す
      if (posts.length === 0) {
        const headlines = Array.from(document.querySelectorAll('h1, h2, h3, h4')).filter((el: any) => {
          const text = el.textContent?.trim();
          return text && text.length > 10 && text.length < 200;
        });

        headlines.slice(0, 4).forEach((headline: any, index: number) => {
          const parentLink = headline.closest('a') || headline.querySelector('a');
          posts.push({
            title: headline.textContent?.trim() || `Reddit Discussion ${index + 1}`,
            link: parentLink?.getAttribute('href') || '',
            snippet: 'Reddit community discussion'
          });
        });
      }
      
    } catch (error) {
      console.error('Reddit post extraction error:', error);
    }
    
    return posts;
  });
}

/**
 * Redditコミュニティアクセス可否確認
 */
async function checkRedditCommunityAccessibility(page: any): Promise<any> {
  const accessInfo = {
    privateSubredditDetected: false,
    quarantineDetected: false,
    restrictedAccess: false
  };

  // プライベートsubreddit検出
  const privateIndicators = [
    'text=This community is private',
    'text=Private community',
    '.private-subreddit',
    '[data-testid="private-community"]'
  ];

  for (const indicator of privateIndicators) {
    try {
      const element = await page.waitForSelector(indicator, { timeout: 1000 });
      if (element) {
        accessInfo.privateSubredditDetected = true;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  // Quarantine検出
  const quarantineIndicators = [
    'text=quarantined',
    'text=This community is quarantined',
    '.quarantine-warning',
    '[data-testid="quarantine"]'
  ];

  for (const indicator of quarantineIndicators) {
    try {
      const element = await page.waitForSelector(indicator, { timeout: 1000 });
      if (element) {
        accessInfo.quarantineDetected = true;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  // 制限付きアクセス検出
  const restrictionIndicators = [
    'text=Restricted',
    'text=Members only',
    '.restricted-community',
    'text=You must be invited'
  ];

  for (const indicator of restrictionIndicators) {
    try {
      const element = await page.waitForSelector(indicator, { timeout: 1000 });
      if (element) {
        accessInfo.restrictedAccess = true;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  return accessInfo;
}

/**
 * Redditエラー分類
 */
function classifyRedditError(error: Error): DataSourceError {
  const errorMessage = error.message.toLowerCase();
  
  // レート制限
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || errorMessage.includes('429')) {
    return {
      category: 'rate_limit',
      severity: 'medium',
      recoverable: true,
      suggestedFix: 'retry',
      details: 'Reddit rate limit exceeded',
      originalError: error
    };
  }
  
  // プライベートコミュニティ
  if (errorMessage.includes('private') || errorMessage.includes('restricted')) {
    return {
      category: 'content_blocked',
      severity: 'medium',
      recoverable: false,
      suggestedFix: 'fallback',
      details: 'Reddit community access restricted',
      originalError: error
    };
  }
  
  // 検索機能アクセス不可
  if (errorMessage.includes('search function not accessible')) {
    return {
      category: 'structure_change',
      severity: 'high',
      recoverable: false,
      suggestedFix: 'update_code',
      details: 'Reddit search function selectors need updating',
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
      details: 'Reddit page loading timeout',
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
      details: 'Network connection issue to Reddit',
      originalError: error
    };
  }
  
  // その他のエラー
  return {
    category: 'network',
    severity: 'medium',
    recoverable: true,
    suggestedFix: 'retry',
    details: `Reddit unknown error: ${error.message}`,
    originalError: error
  };
}

export default testRedditReal;