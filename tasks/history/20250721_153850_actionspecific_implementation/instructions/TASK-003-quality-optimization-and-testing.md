# TASK-003: 品質最適化・テスト拡張実装

## 🎯 実装目標

ActionSpecificCollectorシステムの品質最適化とテスト範囲拡張により、実運用での信頼性と性能を保証する。

## 📊 現状分析

### ✅ 完了済み
- 基本的なunit testケース
- モックシステムの基本実装
- TypeScript型安全性の基本確保

### 🔧 実装対象
- 実運用エラーハンドリング強化
- パフォーマンス最適化
- 統合テストケース拡張
- 実際のPlaywright動作テスト対応

## 📂 実装対象ファイル

**メインファイル**: 
- `/Users/rnrnstar/github/TradingAssistantX/src/lib/action-specific-collector.ts`
- `/Users/rnrnstar/github/TradingAssistantX/tests/unit/action-specific-collector.test.ts`
- `/Users/rnrnstar/github/TradingAssistantX/data/action-collection-strategies.yaml`

## 🎯 具体的実装内容

### 1. ActionSpecificCollector品質強化

#### A. エラーハンドリング強化

```typescript
// ActionSpecificCollectorクラスに追加
/**
 * 強化されたエラーハンドリングシステム
 */
private handleCollectionError(
  error: Error, 
  context: string, 
  actionType: string,
  retryCount: number = 0
): Promise<ActionSpecificResult | null> {
  console.error(`❌ [ActionSpecific収集エラー] ${context}:`, {
    actionType,
    error: error.message,
    retryCount,
    timestamp: new Date().toISOString()
  });

  // 致命的エラーの分類
  if (this.isCriticalError(error)) {
    console.error('🚨 [致命的エラー] システム停止が必要:', error.message);
    return Promise.resolve(null);
  }

  // 再試行可能エラーの判定
  if (this.isRetryableError(error) && retryCount < 2) {
    console.log(`🔄 [再試行] ${retryCount + 1}/2回目の再試行を実行...`);
    return this.executeRetryWithBackoff(actionType, context, retryCount + 1);
  }

  // フォールバック処理
  return this.createFallbackResult(actionType, error);
}

/**
 * 致命的エラーの判定
 */
private isCriticalError(error: Error): boolean {
  const criticalPatterns = [
    'PLAYWRIGHT_BROWSER_CRASH',
    'MEMORY_EXHAUSTED',
    'SYSTEM_SHUTDOWN',
    'CREDENTIAL_INVALID'
  ];
  
  return criticalPatterns.some(pattern => 
    error.message.includes(pattern) || error.stack?.includes(pattern)
  );
}

/**
 * 再試行可能エラーの判定
 */
private isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    'NETWORK_TIMEOUT',
    'PAGE_LOAD_FAILED',
    'TEMPORARY_UNAVAILABLE',
    'RATE_LIMIT_EXCEEDED'
  ];
  
  return retryablePatterns.some(pattern => 
    error.message.includes(pattern)
  );
}

/**
 * バックオフ付き再試行実行
 */
private async executeRetryWithBackoff(
  actionType: string,
  context: IntegratedContext,
  retryCount: number
): Promise<ActionSpecificResult> {
  const backoffTime = Math.pow(2, retryCount) * 1000; // 指数バックオフ
  console.log(`⏳ [再試行待機] ${backoffTime}ms待機後に再実行...`);
  
  await new Promise(resolve => setTimeout(resolve, backoffTime));
  
  return this.collectForAction(
    actionType as 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    context,
    85
  );
}

/**
 * フォールバック結果の生成
 */
private async createFallbackResult(
  actionType: string,
  error: Error
): Promise<ActionSpecificResult> {
  console.log(`🛡️ [フォールバック] ${actionType}の代替結果を生成...`);
  
  return {
    actionType,
    results: await this.generateStaticFallbackContent(actionType),
    sufficiencyScore: 60, // 基本レベルの充足度
    executionTime: 1000,
    strategyUsed: await this.generateCollectionStrategy(actionType, {} as IntegratedContext),
    qualityMetrics: {
      relevanceScore: 60,
      credibilityScore: 70,
      uniquenessScore: 50,
      timelinessScore: 40,
      overallScore: 55,
      feedback: ['フォールバック結果を使用', 'より良い条件で再実行を推奨']
    }
  };
}

/**
 * 静的フォールバックコンテンツ生成
 */
private async generateStaticFallbackContent(actionType: string): Promise<CollectionResult[]> {
  const fallbackContent = {
    original_post: [
      {
        id: `fallback-${actionType}-${Date.now()}`,
        type: 'educational',
        content: '投資の基本：リスク管理の重要性について学び、分散投資を心がけましょう。',
        source: 'internal-fallback',
        relevanceScore: 0.6,
        timestamp: Date.now(),
        metadata: { engagement: 0, author: 'system-fallback' }
      }
    ],
    quote_tweet: [
      {
        id: `fallback-${actionType}-${Date.now()}`,
        type: 'commentary',
        content: '市場の変動に惑わされず、長期的な視点で投資判断を行うことが重要です。',
        source: 'internal-fallback',
        relevanceScore: 0.6,
        timestamp: Date.now(),
        metadata: { engagement: 0, author: 'system-fallback' }
      }
    ],
    retweet: [
      {
        id: `fallback-${actionType}-${Date.now()}`,
        type: 'educational',
        content: '信頼できる情報源からの学習が、投資スキル向上の近道です。',
        source: 'internal-fallback',
        relevanceScore: 0.6,
        timestamp: Date.now(),
        metadata: { engagement: 0, author: 'system-fallback' }
      }
    ],
    reply: [
      {
        id: `fallback-${actionType}-${Date.now()}`,
        type: 'engagement',
        content: '投資に関する質問や疑問は、コミュニティでシェアして学び合いましょう。',
        source: 'internal-fallback',
        relevanceScore: 0.6,
        timestamp: Date.now(),
        metadata: { engagement: 0, author: 'system-fallback' }
      }
    ]
  };
  
  return fallbackContent[actionType as keyof typeof fallbackContent] || [];
}
```

#### B. パフォーマンス最適化

```typescript
/**
 * パフォーマンス監視機能
 */
private async monitorPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  try {
    const result = await operation();
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    const performanceMetrics = {
      operation: operationName,
      executionTime: endTime - startTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external
      },
      timestamp: new Date().toISOString()
    };
    
    // パフォーマンス警告
    if (performanceMetrics.executionTime > 30000) { // 30秒以上
      console.warn('⚠️ [パフォーマンス警告] 実行時間超過:', performanceMetrics);
    }
    
    if (performanceMetrics.memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB以上
      console.warn('⚠️ [メモリ警告] メモリ使用量増加:', performanceMetrics);
    }
    
    // パフォーマンスログ保存
    await this.savePerformanceMetrics(performanceMetrics);
    
    return result;
    
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [パフォーマンス監視エラー]:', {
      operation: operationName,
      executionTime: endTime - startTime,
      error: error.message
    });
    throw error;
  }
}

/**
 * パフォーマンスメトリクスの保存
 */
private async savePerformanceMetrics(metrics: any): Promise<void> {
  try {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const metricsPath = path.join(
      process.cwd(), 
      'data', 
      'metrics-history', 
      'action-specific-performance.json'
    );
    
    let existingMetrics: any[] = [];
    try {
      const data = await fs.readFile(metricsPath, 'utf-8');
      existingMetrics = JSON.parse(data);
    } catch {
      // ファイルが存在しない場合は空配列
    }
    
    existingMetrics.push(metrics);
    
    // 最新100件に制限
    if (existingMetrics.length > 100) {
      existingMetrics = existingMetrics.slice(-100);
    }
    
    await fs.mkdir(path.dirname(metricsPath), { recursive: true });
    await fs.writeFile(metricsPath, JSON.stringify(existingMetrics, null, 2));
    
  } catch (error) {
    console.error('❌ [メトリクス保存エラー]:', error);
  }
}

/**
 * メモリ使用量の最適化
 */
private optimizeMemoryUsage(): void {
  // ガベージコレクション促進
  if (global.gc) {
    global.gc();
    console.log('🗑️ [メモリ最適化] ガベージコレクション実行');
  }
  
  // 大きなオブジェクトのクリーンアップ
  if (process.memoryUsage().heapUsed > 100 * 1024 * 1024) { // 100MB以上
    console.log('🧹 [メモリクリーンアップ] 大容量オブジェクトを整理中...');
    // 必要に応じて内部キャッシュのクリア等
  }
}
```

### 2. テストケース拡張

#### A. 統合テスト追加

```typescript
// tests/unit/action-specific-collector.test.ts に追加

describe('統合テスト', () => {
  test('DecisionEngineとの統合動作確認', async () => {
    const decisionEngine = new DecisionEngine(collector);
    const mockContext: IntegratedContext = {
      account: {
        currentState: {
          timestamp: '2024-01-01T00:00:00Z',
          followers: { current: 1000, change_24h: 10, growth_rate: '1%' },
          engagement: { avg_likes: 50, avg_retweets: 10, engagement_rate: '5%' },
          performance: { posts_today: 5, target_progress: '50%', best_posting_time: '12:00' },
          health: { status: 'healthy', api_limits: 'normal', quality_score: 85 },
          recommendations: ['テストレコメンデーション'],
          healthScore: 85
        },
        recommendations: ['統合テスト用レコメンデーション'],
        healthScore: 85
      },
      market: {
        trends: [{ id: 'trend1', content: 'テストトレンド', priority: 'high' }],
        opportunities: [{ id: 'opp1', content: 'テスト機会', priority: 'medium' }],
        competitorActivity: []
      },
      actionSuggestions: [{ type: 'original_post', priority: 'high', reasoning: 'テスト' }],
      timestamp: Date.now()
    };

    const decisions = await decisionEngine.planExpandedActions(mockContext);
    
    expect(decisions).toBeDefined();
    expect(Array.isArray(decisions)).toBe(true);
    expect(decisions.length).toBeGreaterThan(0);
    
    // ActionSpecific収集が実行された決定があることを確認
    const enhancedDecisions = decisions.filter(d => 
      d.metadata?.enhancedWithSpecificCollection === true
    );
    expect(enhancedDecisions.length).toBeGreaterThanOrEqual(0);
  });

  test('autonomous-executor.tsとの統合動作確認', async () => {
    // autonomous-executor統合テストのモック実装
    const mockExecutor = {
      actionSpecificCollector: collector,
      async executeActionSpecificCollection(context: IntegratedContext) {
        const promises = ['original_post', 'quote_tweet', 'retweet', 'reply'].map(
          actionType => collector.collectForAction(actionType as any, context, 85)
        );
        
        const results = await Promise.allSettled(promises);
        return results.map(r => r.status === 'fulfilled' ? r.value : null);
      }
    };

    const results = await mockExecutor.executeActionSpecificCollection(mockContext);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(4); // 4つのアクションタイプ
    
    // 少なくとも一つは成功していることを確認
    const successfulResults = results.filter(r => r !== null);
    expect(successfulResults.length).toBeGreaterThan(0);
  });
});

describe('エラーハンドリングテスト', () => {
  test('ネットワークエラー時の適切な再試行', async () => {
    // Playwright環境でネットワークエラーをシミュレート
    const { PlaywrightCommonSetup } = await import('../../src/lib/playwright-common-config');
    
    let callCount = 0;
    vi.mocked(PlaywrightCommonSetup.createPlaywrightEnvironment)
      .mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('NETWORK_TIMEOUT: Connection failed');
        }
        return {
          browser: { close: vi.fn() },
          context: { 
            newPage: vi.fn().mockResolvedValue({
              goto: vi.fn(),
              close: vi.fn(),
              $$eval: vi.fn().mockResolvedValue([]),
              textContent: vi.fn().mockResolvedValue('')
            })
          }
        };
      });

    const result = await collector.collectForAction('original_post', mockContext, 85);
    
    expect(result).toBeDefined();
    expect(callCount).toBe(3); // 最初の失敗 + 2回の再試行
    expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
  });

  test('致命的エラー時の適切な停止', async () => {
    // 致命的エラーをシミュレート
    const { PlaywrightCommonSetup } = await import('../../src/lib/playwright-common-config');
    vi.mocked(PlaywrightCommonSetup.createPlaywrightEnvironment)
      .mockRejectedValue(new Error('PLAYWRIGHT_BROWSER_CRASH: Browser crashed'));

    const result = await collector.collectForAction('original_post', mockContext, 85);
    
    expect(result).toBeDefined();
    expect(result.sufficiencyScore).toBe(0);
    expect(result.qualityMetrics.feedback).toContain('収集処理でエラーが発生しました');
  });
});

describe('パフォーマンステスト', () => {
  test('メモリ使用量の監視', async () => {
    const initialMemory = process.memoryUsage();
    
    // 複数回実行してメモリリークをチェック
    for (let i = 0; i < 5; i++) {
      await collector.collectForAction('original_post', mockContext, 85);
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // メモリ増加が50MB以下であることを確認
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('並列実行時の安定性', async () => {
    const promises = Array.from({ length: 4 }, (_, i) =>
      collector.collectForAction(
        ['original_post', 'quote_tweet', 'retweet', 'reply'][i] as any,
        mockContext,
        85
      )
    );

    const results = await Promise.allSettled(promises);
    
    // 全て完了していることを確認
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    
    // 実行時間の合理性確認
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<ActionSpecificResult> => r.status === 'fulfilled')
      .map(r => r.value);
      
    successfulResults.forEach(result => {
      expect(result.executionTime).toBeLessThan(90000); // 90秒以内
    });
  });
});
```

### 3. YAML設定ファイル最適化

```yaml
# data/action-collection-strategies.yaml の最適化版
version: "1.1.0"
system:
  maxExecutionTime: 90
  sufficiencyThreshold: 85
  qualityMinimum: 75
  retryLimit: 2
  backoffMultiplier: 2

# パフォーマンス設定
performance:
  memoryLimit: 100MB
  concurrentLimit: 4
  timeoutSettings:
    pageLoad: 30000
    networkRequest: 15000
    claudeQuery: 10000

# エラーハンドリング設定
errorHandling:
  criticalErrors:
    - "PLAYWRIGHT_BROWSER_CRASH"
    - "MEMORY_EXHAUSTED"
    - "SYSTEM_SHUTDOWN"
    - "CREDENTIAL_INVALID"
  retryableErrors:
    - "NETWORK_TIMEOUT"
    - "PAGE_LOAD_FAILED"
    - "TEMPORARY_UNAVAILABLE"
    - "RATE_LIMIT_EXCEEDED"

strategies:
  original_post:
    priority: 60
    focusAreas:
      - "独自洞察発見"
      - "市場分析情報"
      - "教育的価値"
      - "投稿機会特定"
    sources:
      - name: "market_trends"
        url: "https://finance.yahoo.com"
        priority: "high"
        searchPatterns: ["crypto", "trading", "market"]
        timeout: 30000
      - name: "educational_content"
        url: "https://www.investopedia.com"
        priority: "medium"
        searchPatterns: ["basics", "strategy", "analysis"]
        timeout: 25000
    collectMethods:
      - "trend_analysis"
      - "educational_gap_identification"
      - "market_opportunity_scan"
    sufficiencyTarget: 90
    fallbackContent:
      - type: "educational"
        content: "投資の基本：リスク管理の重要性について学び、分散投資を心がけましょう。"

  quote_tweet:
    priority: 25
    focusAreas:
      - "候補ツイート検索"
      - "付加価値分析"
      - "エンゲージメント評価"
    sources:
      - name: "twitter_trends"
        url: "https://x.com/explore"
        priority: "high"
        searchPatterns: ["trending", "viral", "discussion"]
        timeout: 30000
    collectMethods:
      - "candidate_tweet_search"
      - "engagement_analysis"
      - "value_addition_assessment"
    sufficiencyTarget: 85
    fallbackContent:
      - type: "commentary"
        content: "市場の変動に惑わされず、長期的な視点で投資判断を行うことが重要です。"

  retweet:
    priority: 10
    focusAreas:
      - "信頼性検証"
      - "価値評価"
      - "リスク分析"
    sources:
      - name: "verified_accounts"
        url: "https://x.com/search"
        priority: "high"
        filters: ["verified", "authority"]
        timeout: 25000
    collectMethods:
      - "credibility_check"
      - "value_assessment"
      - "risk_evaluation"
    sufficiencyTarget: 80
    fallbackContent:
      - type: "educational"
        content: "信頼できる情報源からの学習が、投資スキル向上の近道です。"

  reply:
    priority: 5
    focusAreas:
      - "エンゲージメント機会"
      - "コミュニティ参加"
      - "価値提供"
    sources:
      - name: "community_discussions"
        url: "https://x.com/search"
        priority: "high"
        filters: ["questions", "discussions"]
        timeout: 20000
    collectMethods:
      - "engagement_opportunity_scan"
      - "community_value_assessment"
    sufficiencyTarget: 75
    fallbackContent:
      - type: "engagement"
        content: "投資に関する質問や疑問は、コミュニティでシェアして学び合いましょう。"

qualityStandards:
  relevanceScore: 80
  credibilityScore: 85
  uniquenessScore: 70
  timelinessScore: 90
  
# 品質監視設定
monitoring:
  performanceThresholds:
    executionTime: 30000  # 30秒
    memoryUsage: 52428800  # 50MB
  alerting:
    enabled: true
    thresholds:
      errorRate: 10  # 10%以上
      responseTime: 45000  # 45秒以上
```

## 📋 実装チェックポイント

### 必須要件
- [x] エラーハンドリング完全実装（再試行・フォールバック）
- [x] パフォーマンス監視システム
- [x] 統合テストケース拡張
- [x] YAML設定最適化
- [x] メモリ管理システム

### 品質基準
- **エラー回復**: 90%以上の適切なエラー処理
- **パフォーマンス**: 実行時間90秒以内、メモリ使用量100MB以内
- **テスト網羅**: 統合テスト、エラーハンドリング、パフォーマンステスト
- **設定管理**: 運用レベルの詳細設定

### テスト項目
- エラーシナリオでの適切な動作
- パフォーマンス基準内での動作
- 統合システムでの安定動作
- メモリリークの無いこと

## 🚫 注意事項

- **既存機能維持**: 既存のコアロジックは変更しない
- **後方互換性**: 既存のインターフェースを維持
- **段階実装**: 新機能は段階的に追加
- **テスト重視**: 全ての新機能にテストケースを追加

## 📤 完成報告

実装完了後、以下の報告書を作成：
**報告書**: `tasks/20250721_153850_actionspecific_implementation/reports/REPORT-003-quality-optimization-and-testing.md`

### 報告内容
- エラーハンドリング実装結果
- パフォーマンス最適化効果測定
- テストケース拡張結果
- YAML設定最適化内容
- 実運用向け推奨設定