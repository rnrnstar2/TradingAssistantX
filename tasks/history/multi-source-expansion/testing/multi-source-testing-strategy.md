# 多様情報源対応テスト環境設計書

**Project**: TradingAssistantX 多様情報源対応  
**Manager**: Claude Code Manager  
**Version**: v1.0  
**Date**: 2025-01-21  

## 🎯 **テスト戦略概要**

多様情報源システムの品質確保のため、段階的テスト戦略を採用し、各レイヤーでの包括的な検証を実施する。

### テスト原則
1. **段階的検証**: 単体 → 統合 → システム → パフォーマンス
2. **実環境再現**: 外部API制限・ネットワーク遅延の模擬
3. **自動化優先**: CI/CDパイプラインでの自動テスト実行
4. **品質重視**: コードカバレッジ90%以上の維持

## 🧪 **テストレベル設計**

### 1. **単体テスト (Unit Tests)**

#### 1.1 RSSCollectorテスト設計

```typescript
// tests/unit/rss-collector.test.ts
describe('RSSCollector', () => {
  let rssCollector: RSSCollector;
  let mockParser: jest.Mocked<RSSParser>;

  beforeEach(() => {
    mockParser = createMockRSSParser();
    rssCollector = new RSSCollector(mockParser, testConfig);
  });

  describe('collect', () => {
    test('should collect from multiple RSS feeds', async () => {
      // Given: 複数のRSSフィード
      const requirements = createRSSRequirements([
        'bloomberg-markets',
        'reuters-finance'
      ]);
      
      mockParser.parseURL
        .mockResolvedValueOnce(createMockRSSResponse('bloomberg'))
        .mockResolvedValueOnce(createMockRSSResponse('reuters'));

      // When: 収集実行
      const results = await rssCollector.collect(requirements);

      // Then: 結果検証
      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('bloomberg-markets');
      expect(results[1].source).toBe('reuters-finance');
      expect(mockParser.parseURL).toHaveBeenCalledTimes(2);
    });

    test('should handle individual feed failures gracefully', async () => {
      // Given: 一部フィードが失敗
      mockParser.parseURL
        .mockResolvedValueOnce(createMockRSSResponse('bloomberg'))
        .mockRejectedValueOnce(new Error('Feed timeout'));

      // When: 収集実行
      const results = await rssCollector.collect(createRSSRequirements());

      // Then: 成功したフィードのみ取得
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('bloomberg-markets');
    });
  });

  describe('filterByQuality', () => {
    test('should filter items below quality threshold', () => {
      // Given: 品質の異なるアイテム
      const items = [
        createMockRSSItem({ title: 'High quality finance news', contentSnippet: 'Detailed analysis...', pubDate: new Date() }),
        createMockRSSItem({ title: 'Low quality', contentSnippet: 'Short', pubDate: new Date(Date.now() - 48 * 60 * 60 * 1000) })
      ];

      // When: 品質フィルタ適用
      const filtered = rssCollector.filterByQuality(items, 0.7);

      // Then: 高品質のみ残存
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('High quality finance news');
    });
  });
});
```

#### 1.2 APICollectorテスト設計

```typescript
// tests/unit/api-collector.test.ts
describe('APICollector', () => {
  let apiCollector: APICollector;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockRateLimiter: jest.Mocked<RateLimiterFlexible>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockRateLimiter = createMockRateLimiter();
    apiCollector = new APICollector(testConfig, mockHttpClient, mockRateLimiter);
  });

  describe('collectFromNewsAPI', () => {
    test('should collect articles from NewsAPI', async () => {
      // Given: NewsAPIレスポンス
      const mockResponse = {
        articles: [
          {
            title: 'Market Update',
            content: 'Financial market analysis...',
            publishedAt: '2025-01-21T10:00:00Z',
            source: { name: 'Bloomberg' }
          }
        ]
      };
      mockHttpClient.get.mockResolvedValueOnce({ data: mockResponse });

      // When: データ収集
      const query = createNewsQuery(['trading', 'investment']);
      const results = await apiCollector.collectFromNewsAPI(query);

      // Then: 正規化されたデータ取得
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Market Update');
      expect(results[0].normalizedContent).toBeDefined();
    });

    test('should handle rate limiting', async () => {
      // Given: レート制限エラー
      mockRateLimiter.consume.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      // When/Then: レート制限エラーをスロー
      const query = createNewsQuery(['trading']);
      await expect(apiCollector.collectFromNewsAPI(query)).rejects.toThrow('Rate limit exceeded');
    });
  });
});
```

#### 1.3 WebScraperテスト設計

```typescript
// tests/unit/web-scraper.test.ts
describe('WebScraper', () => {
  let webScraper: WebScraper;
  let mockBrowserManager: jest.Mocked<PlaywrightBrowserManager>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    mockPage = createMockPage();
    mockBrowserManager = createMockBrowserManager();
    mockBrowserManager.getBrowser.mockResolvedValue(createMockBrowser(mockPage));
    
    webScraper = new WebScraper(mockBrowserManager, testConfig);
  });

  describe('scrapeWebsite', () => {
    test('should extract structured data from website', async () => {
      // Given: Webサイトモック
      const target = createWebTarget('yahoo-finance');
      mockPage.evaluate.mockResolvedValueOnce({
        title: 'Stock Market News',
        content: 'Market analysis content...',
        publishedAt: '2025-01-21'
      });

      // When: スクレイピング実行
      const results = await webScraper.scrapeWebsite(target);

      // Then: データ抽出確認
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Stock Market News');
      expect(mockPage.goto).toHaveBeenCalledWith(target.url, { waitUntil: 'networkidle' });
    });

    test('should handle dynamic content loading', async () => {
      // Given: 動的コンテンツサイト
      const target = createWebTarget('marketwatch', {
        waitForSelector: '.article-content'
      });

      // When: スクレイピング実行
      await webScraper.scrapeWebsite(target);

      // Then: 動的コンテンツ待機確認
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.article-content', { timeout: 10000 });
    });
  });
});
```

### 2. **統合テスト (Integration Tests)**

#### 2.1 MultiSourceCollector統合テスト

```typescript
// tests/integration/multi-source-integration.test.ts
describe('MultiSourceCollector Integration', () => {
  let multiSourceCollector: MultiSourceCollector;
  
  beforeAll(async () => {
    // テスト用設定でシステム初期化
    const config = await loadTestConfig();
    multiSourceCollector = new MultiSourceCollector(config);
  });

  describe('collectFromAllSources', () => {
    test('should integrate data from RSS, API, and Web sources', async () => {
      // Given: 統合収集要件
      const requirements = createIntegratedCollectionRequirements();
      
      // When: 全情報源から収集
      const results = await multiSourceCollector.collectFromAllSources(requirements);

      // Then: 多様な情報源から統合データ取得
      expect(results.length).toBeGreaterThan(0);
      
      const sources = new Set(results.map(r => r.sourceType));
      expect(sources.has('rss')).toBe(true);
      expect(sources.has('api')).toBe(true);
      expect(sources.has('web')).toBe(true);
      
      // データ品質確認
      results.forEach(result => {
        expect(result.qualityScore).toBeGreaterThanOrEqual(0.7);
        expect(result.normalizedContent).toBeDefined();
      });
    });

    test('should fallback to legacy system on failure', async () => {
      // Given: 新システム一時無効化
      const config = createConfigWithDisabledNewSources();
      const fallbackCollector = new MultiSourceCollector(config);

      // When: 収集実行
      const results = await fallbackCollector.collectFromAllSources(createBasicRequirements());

      // Then: レガシーXシステムから結果取得
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.sourceType === 'legacy_x')).toBe(true);
    });
  });
});
```

#### 2.2 既存システム互換性テスト

```typescript
// tests/integration/legacy-compatibility.test.ts
describe('Legacy System Compatibility', () => {
  let enhancedCollector: EnhancedActionSpecificCollector;
  let originalCollector: ActionSpecificCollector;

  beforeEach(() => {
    const multiSourceCollector = createTestMultiSourceCollector();
    enhancedCollector = new EnhancedActionSpecificCollector(
      createMockPlaywrightEngine(),
      multiSourceCollector
    );
    originalCollector = new ActionSpecificCollector(createMockPlaywrightEngine());
  });

  test('should maintain compatibility with existing ActionSpecificCollector interface', async () => {
    // Given: 既存システムと同一の入力
    const actionType: ActionType = 'trending_analysis';
    const context = createTestActionContext();
    const sufficiencyTarget = 85;

    // When: 両システムで同一処理実行
    const enhancedResult = await enhancedCollector.collectForAction(
      actionType, context, sufficiencyTarget
    );
    const originalResult = await originalCollector.collectForAction(
      actionType, context, sufficiencyTarget
    );

    // Then: 互換性のある結果形式
    expect(enhancedResult).toMatchObject({
      actionType: originalResult.actionType,
      results: expect.any(Array),
      sufficiencyScore: expect.any(Number),
      qualityMetrics: expect.any(Object)
    });
    
    // 拡張結果は品質向上
    expect(enhancedResult.results.length).toBeGreaterThanOrEqual(originalResult.results.length);
    expect(enhancedResult.qualityMetrics.overallScore).toBeGreaterThanOrEqual(
      originalResult.qualityMetrics.overallScore
    );
  });
});
```

### 3. **パフォーマンステスト (Performance Tests)**

#### 3.1 収集速度テスト

```typescript
// tests/performance/collection-performance.test.ts
describe('Collection Performance', () => {
  let multiSourceCollector: MultiSourceCollector;
  
  beforeAll(() => {
    multiSourceCollector = new MultiSourceCollector(createPerformanceTestConfig());
  });

  test('should complete collection within acceptable time limits', async () => {
    // Given: パフォーマンステスト要件
    const requirements = createLargeScaleCollectionRequirements();
    
    // When: パフォーマンス測定
    const startTime = Date.now();
    const results = await multiSourceCollector.collectFromAllSources(requirements);
    const executionTime = Date.now() - startTime;

    // Then: パフォーマンス基準クリア
    expect(executionTime).toBeLessThan(90000); // 90秒以内
    expect(results.length).toBeGreaterThan(10); // 最低10件の結果
    
    // メモリ使用量確認
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(512 * 1024 * 1024); // 512MB以下
  });

  test('should handle concurrent collections efficiently', async () => {
    // Given: 並列収集タスク
    const tasks = Array.from({ length: 5 }, (_, i) =>
      createCollectionRequirements(`task-${i}`)
    );

    // When: 並列実行
    const startTime = Date.now();
    const results = await Promise.all(
      tasks.map(req => multiSourceCollector.collectFromAllSources(req))
    );
    const totalTime = Date.now() - startTime;

    // Then: 効率的な並列処理
    expect(results).toHaveLength(5);
    expect(totalTime).toBeLessThan(120000); // 逐次実行より高速
    
    // 全タスクで結果取得確認
    results.forEach((taskResults, index) => {
      expect(taskResults.length).toBeGreaterThan(0);
    });
  });
});
```

#### 3.2 メモリ・CPU使用量テスト

```typescript
// tests/performance/resource-usage.test.ts
describe('Resource Usage Tests', () => {
  test('should maintain memory usage within limits during extended operation', async () => {
    const collector = new MultiSourceCollector(createTestConfig());
    const initialMemory = process.memoryUsage().heapUsed;

    // 長時間運用シミュレーション
    for (let i = 0; i < 100; i++) {
      await collector.collectFromAllSources(createRandomRequirements());
      
      // メモリリーク検出
      if (i % 10 === 0) {
        global.gc?.(); // ガベージコレクション強制実行
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以下の増加
      }
    }
  });
});
```

## 🗃️ **テストデータ・モック設計**

### 1. **モックデータファクトリ**

```typescript
// tests/fixtures/mock-data-factory.ts
export class MockDataFactory {
  
  // RSS モックデータ生成
  static createMockRSSResponse(source: string): RSSResponse {
    return {
      items: [
        {
          title: `${source} Market Update`,
          link: `https://${source}.com/article/123`,
          contentSnippet: 'Market analysis and financial insights...',
          pubDate: new Date().toISOString(),
          creator: 'Financial Reporter',
          categories: ['finance', 'markets']
        }
      ],
      feedUrl: `https://${source}.com/rss`,
      title: `${source} Financial News`,
      description: 'Latest financial news and analysis'
    };
  }

  // API モックレスポンス生成
  static createMockNewsAPIResponse(): NewsAPIResponse {
    return {
      status: 'ok',
      totalResults: 100,
      articles: [
        {
          source: { id: 'bloomberg', name: 'Bloomberg' },
          author: 'John Doe',
          title: 'Stock Market Reaches New Heights',
          description: 'Analysis of recent market trends...',
          url: 'https://bloomberg.com/article/456',
          urlToImage: 'https://bloomberg.com/image/456.jpg',
          publishedAt: '2025-01-21T10:00:00Z',
          content: 'Full article content with financial analysis...'
        }
      ]
    };
  }

  // Web スクレイピング モックデータ
  static createMockWebContent(): WebScrapedContent {
    return {
      title: 'Investment Strategy Guide',
      content: 'Comprehensive guide to investment strategies including risk management, portfolio diversification, and market analysis techniques.',
      publishedAt: '2025-01-21',
      author: 'Investment Expert',
      url: 'https://finance.example.com/investment-guide',
      selectors: {
        title: 'h1.article-title',
        content: '.article-body',
        date: '.publish-date'
      }
    };
  }
}
```

### 2. **テスト設定ファイル**

```yaml
# tests/config/test-multi-source-config.yaml
version: "2.0.0-test"
testMode: true

global:
  enabled: true
  fallbackToLegacy: true
  maxConcurrentSources: 3  # テスト環境では制限
  collectionTimeout: 30    # 30秒でテストタイムアウト
  qualityThreshold: 0.6    # テスト用に緩和

rss:
  enabled: true
  sources:
    - name: "test-bloomberg"
      url: "http://localhost:3001/mock-rss/bloomberg"
      category: "financial_news"
      priority: "high"
      qualityThreshold: 0.7

apis:
  enabled: true
  sources:
    - name: "mock-newsapi"
      endpoint: "http://localhost:3001/mock-api/news"
      category: "general_news"
      mockMode: true

webScraping:
  enabled: true
  sources:
    - name: "mock-finance-site"
      baseUrl: "http://localhost:3001/mock-web"
      category: "financial_news"
      mockSelectors: true
```

## 🤖 **テスト自動化・CI/CD設定**

### 1. **GitHub Actions設定**

```yaml
# .github/workflows/multi-source-tests.yml
name: Multi-Source Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      test-mock-server:
        image: nginx:alpine
        ports:
          - 3001:80
        options: --health-cmd="curl -f http://localhost" --health-interval=10s

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Setup test environment
      run: |
        cp tests/config/test.env .env
        mkdir -p data/test
        cp tests/fixtures/test-*.yaml data/
    
    - name: Run unit tests
      run: pnpm test:unit --coverage
    
    - name: Run integration tests
      run: pnpm test:integration
      env:
        MULTI_SOURCE_ENABLED: true
        TEST_MODE: true
        MOCK_SERVER_URL: http://localhost:3001
    
    - name: Run performance tests
      run: pnpm test:performance
      timeout-minutes: 10
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### 2. **テストスクリプト設定**

```json
// package.json (テストスクリプト部分)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:performance": "vitest run tests/performance/",
    "test:multi-source": "vitest run tests/**/*multi-source*",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:mock-setup": "node tests/setup/mock-server.js",
    "test:clean": "rimraf tests/temp coverage .nyc_output"
  }
}
```

## 📋 **テストチェックリスト**

### Phase 1: 基本テスト (Worker実装完了時)

#### RSS Collector
- [ ] 複数RSS フィード同時処理テスト
- [ ] 個別フィード失敗時の継続処理テスト  
- [ ] 品質フィルタリング精度テスト
- [ ] RSS パーサーエラーハンドリングテスト
- [ ] 並列処理パフォーマンステスト

#### API Collector  
- [ ] NewsAPI統合テスト
- [ ] Alpha Vantage統合テスト
- [ ] レート制限遵守テスト
- [ ] API認証エラーハンドリングテスト
- [ ] データ正規化精度テスト

#### Web Scraper
- [ ] 複数サイトスクレイピングテスト
- [ ] robots.txt遵守確認テスト
- [ ] 動的コンテンツ抽出テスト
- [ ] アンチ検出機能テスト
- [ ] エラーサイト処理テスト

### Phase 2: 統合テスト (システム統合完了時)

#### Multi-Source Integration
- [ ] 全情報源統合収集テスト
- [ ] 重複除去機能テスト
- [ ] 品質評価統合テスト  
- [ ] フォールバック機能テスト
- [ ] 並列処理統合テスト

#### Legacy Compatibility
- [ ] ActionSpecificCollector互換性テスト
- [ ] Claude SDK連携維持テスト
- [ ] YAML設定互換性テスト
- [ ] 既存ワークフロー継続テスト

### Phase 3: パフォーマンス・品質テスト (最終検証)

#### Performance Validation
- [ ] 90秒以内収集完了テスト
- [ ] メモリ使用量512MB以下テスト
- [ ] 並列処理効率テスト
- [ ] 長時間運用安定性テスト

#### Quality Assurance  
- [ ] データ品質0.7以上維持テスト
- [ ] 収集成功率95%以上テスト
- [ ] システム可用性99%以上テスト
- [ ] エラー処理網羅性テスト

## 🚀 **テスト実行手順**

### 開発環境での実行

```bash
# 1. テスト環境セットアップ
pnpm run test:setup

# 2. モックサーバー起動
pnpm run test:mock-setup

# 3. 単体テスト実行
pnpm run test:unit

# 4. 統合テスト実行  
pnpm run test:integration

# 5. パフォーマンステスト実行
pnpm run test:performance

# 6. 全テスト実行 (CI環境)
pnpm run test:all
```

### テスト結果監視

```bash
# カバレッジレポート確認
pnpm run test:coverage
open coverage/index.html

# テスト結果詳細確認
cat test-results.json | jq '.summary'

# パフォーマンス指標確認  
cat performance-results.json | jq '.metrics'
```

---

**Testing Strategy Approved**: Claude Code Manager  
**Implementation Ready**: 2025-01-21  
**Next**: Worker Implementation → Testing Execution → Quality Validation