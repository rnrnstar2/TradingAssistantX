# TASK-004: 統合テスト・動作検証実装

## 🎯 実装目標
TASK-001〜003で実装された新しい多様情報源システムの統合テストを実施し、システム全体の動作を検証します。

## 📊 検証対象システム
- **TASK-001**: 多様な情報源統合システム（MultiSourceCollector）
- **TASK-002**: ActionSpecificCollector拡張実装
- **TASK-003**: 設定ファイル更新・新情報源対応

## 🚀 実装要件

### 1. テストファイル作成

#### 新規作成ファイル
```
tests/integration/multi-source-integration.test.ts - 統合テスト
tests/unit/multi-source-collector.test.ts - 単体テスト
tests/unit/action-specific-collector-extended.test.ts - 拡張機能テスト  
tests/e2e/information-collection-workflow.test.ts - E2Eテスト
```

#### 既存テスト更新
```
tests/unit/action-specific-collector.test.ts - 既存テストの更新
tests/integration/action-specific-integration.test.ts - 統合機能の更新
```

### 2. 統合テスト実装

#### multi-source-integration.test.ts
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MultiSourceCollector } from '../../src/lib/multi-source-collector';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector';

describe('Multi-Source Information Collection Integration', () => {
  let multiSourceCollector: MultiSourceCollector;
  let actionSpecificCollector: ActionSpecificCollector;

  beforeAll(async () => {
    // テスト環境のセットアップ
    multiSourceCollector = new MultiSourceCollector();
    actionSpecificCollector = new ActionSpecificCollector(undefined, true);
  });

  describe('RSS Integration', () => {
    it('should collect information from RSS sources', async () => {
      const results = await multiSourceCollector.collectFromRSS(['yahoo_finance', 'reuters']);
      
      expect(results.data).toBeDefined();
      expect(results.data.length).toBeGreaterThan(0);
      expect(results.source).toBe('rss');
      expect(results.metadata.requestCount).toBeGreaterThan(0);
    });

    it('should handle RSS timeout gracefully', async () => {
      const results = await multiSourceCollector.collectFromRSS(['invalid_rss_source']);
      
      expect(results.data).toBeDefined();
      expect(results.data.length).toBe(0); // フォールバックデータ
      expect(results.metadata.requestCount).toBe(0);
    });
  });

  describe('API Integration', () => {
    it('should collect information from API sources', async () => {
      const apiConfig = {
        sources: ['alpha_vantage', 'coingecko'],
        endpoints: ['prices', 'market_data']
      };
      
      const results = await multiSourceCollector.collectFromAPIs(apiConfig);
      
      expect(results.data).toBeDefined();
      expect(results.source).toBe('api');
      
      if (results.data.length > 0) {
        expect(results.data[0]).toHaveProperty('relevanceScore');
        expect(results.data[0]).toHaveProperty('source');
        expect(results.data[0]).toHaveProperty('content');
      }
    });

    it('should respect API rate limits', async () => {
      const startTime = Date.now();
      
      const promises = Array(5).fill(null).map(() => 
        multiSourceCollector.collectFromAPIs({
          sources: ['alpha_vantage'],
          endpoints: ['stock_quote']
        })
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      // レート制限により適切な間隔で実行されることを確認
      expect(endTime - startTime).toBeGreaterThan(5000); // 最低5秒
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Community Integration', () => {
    it('should collect information from community sources', async () => {
      const results = await multiSourceCollector.collectFromCommunity(['reddit']);
      
      expect(results.data).toBeDefined();
      expect(results.source).toBe('community');
      
      // コミュニティデータの品質チェック
      results.data.forEach(item => {
        expect(item.content.length).toBeGreaterThan(20);
        expect(item.relevanceScore).toBeGreaterThan(0);
        expect(item.metadata).toBeDefined();
      });
    });
  });

  describe('ActionSpecificCollector Extended Integration', () => {
    it('should integrate multiple sources for original_post', async () => {
      const mockContext = createMockIntegratedContext();
      
      const result = await actionSpecificCollector.collectForAction(
        'original_post',
        mockContext,
        85
      );
      
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      expect(result.qualityMetrics).toBeDefined();
      
      // 多様な情報源からの収集を確認
      const sources = new Set(result.results.map(r => r.source));
      expect(sources.size).toBeGreaterThan(1); // 複数情報源
    });

    it('should fallback to X when multi-source fails', async () => {
      const mockContext = createMockIntegratedContext();
      
      // 多様情報源を無効化
      const collector = new ActionSpecificCollector(undefined, false);
      
      const result = await collector.collectForAction(
        'original_post',
        mockContext,
        85
      );
      
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
    });

    it('should optimize source selection by action type', async () => {
      const mockContext = createMockIntegratedContext();
      
      // 異なるアクションタイプで情報源が最適化されることを確認
      const originalResult = await actionSpecificCollector.collectForAction('original_post', mockContext);
      const replyResult = await actionSpecificCollector.collectForAction('reply', mockContext);
      
      // アクションタイプ別の最適化が反映されることを確認
      expect(originalResult.strategyUsed.sources).toBeDefined();
      expect(replyResult.strategyUsed.sources).toBeDefined();
      
      // original_postは多様な情報源、replyはコミュニティ重視
      const originalSources = originalResult.results.map(r => r.source);
      const replySources = replyResult.results.map(r => r.source);
      
      expect(originalSources.length).toBeGreaterThanOrEqual(replySources.length);
    });
  });

  describe('Quality Evaluation Integration', () => {
    it('should evaluate multi-source quality correctly', async () => {
      const mockResults = [
        { source: 'rss', relevanceScore: 0.9, content: 'RSS content', id: 'rss-1', type: 'news', timestamp: Date.now(), metadata: {} },
        { source: 'api', relevanceScore: 0.95, content: 'API content', id: 'api-1', type: 'data', timestamp: Date.now(), metadata: {} },
        { source: 'community', relevanceScore: 0.7, content: 'Community content', id: 'comm-1', type: 'discussion', timestamp: Date.now(), metadata: {} }
      ];
      
      const mockContext = createMockIntegratedContext();
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(70);
      expect(result.qualityMetrics.credibilityScore).toBeGreaterThan(70);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(70);
    });
  });

  describe('Configuration Integration', () => {
    it('should load updated configuration correctly', async () => {
      const collector = new ActionSpecificCollector();
      
      expect(collector.config).toBeDefined();
      expect(collector.config.multiSources).toBeDefined();
      expect(collector.config.sourceSelection).toBeDefined();
    });

    it('should handle missing configuration gracefully', async () => {
      const collector = new ActionSpecificCollector('invalid-config-path.yaml');
      
      // デフォルト設定で動作することを確認
      expect(collector.config).toBeDefined();
      
      const mockContext = createMockIntegratedContext();
      const result = await collector.collectForAction('original_post', mockContext);
      
      expect(result.results).toBeDefined();
    });
  });

  afterAll(async () => {
    // クリーンアップ処理
  });
});

// ヘルパー関数
function createMockIntegratedContext() {
  return {
    account: {
      currentState: {
        timestamp: new Date().toISOString(),
        followers: { current: 100, change_24h: 5, growth_rate: '5%' },
        engagement: { avg_likes: 10, avg_retweets: 5, engagement_rate: '2%' },
        performance: { posts_today: 2, target_progress: '40%', best_posting_time: '12:00' },
        health: { status: 'healthy', api_limits: 'normal', quality_score: 85 },
        recommendations: [],
        healthScore: 85
      },
      recommendations: [],
      healthScore: 85
    },
    market: {
      trends: [],
      opportunities: [],
      competitorActivity: []
    },
    actionSuggestions: [],
    timestamp: Date.now()
  };
}
```

### 3. パフォーマンステスト

#### performance-integration.test.ts
```typescript
describe('Performance Integration Tests', () => {
  it('should complete multi-source collection within time limit', async () => {
    const startTime = Date.now();
    
    const collector = new ActionSpecificCollector(undefined, true);
    const mockContext = createMockIntegratedContext();
    
    const result = await collector.collectForAction('original_post', mockContext, 85);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(90000); // 90秒制限
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should handle concurrent collections efficiently', async () => {
    const collector = new ActionSpecificCollector(undefined, true);
    const mockContext = createMockIntegratedContext();
    
    const concurrentPromises = [
      collector.collectForAction('original_post', mockContext),
      collector.collectForAction('quote_tweet', mockContext),
      collector.collectForAction('retweet', mockContext),
      collector.collectForAction('reply', mockContext)
    ];
    
    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentPromises);
    const endTime = Date.now();
    
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    expect(endTime - startTime).toBeLessThan(120000); // 2分以内
  });
});
```

### 4. E2Eワークフローテスト

#### information-collection-workflow.test.ts
```typescript
describe('Information Collection Workflow E2E', () => {
  it('should execute full multi-source workflow', async () => {
    // 1. 設定読み込み
    const collector = new ActionSpecificCollector();
    expect(collector.config).toBeDefined();
    
    // 2. 情報収集実行
    const mockContext = createMockIntegratedContext();
    const result = await collector.collectForAction('original_post', mockContext, 85);
    
    // 3. 結果検証
    expect(result.actionType).toBe('original_post');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.sufficiencyScore).toBeGreaterThan(0);
    
    // 4. 品質基準確認
    expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(70);
    expect(result.qualityMetrics.overallScore).toBeGreaterThan(70);
    
    // 5. 実行時間確認
    expect(result.executionTime).toBeLessThan(90000);
  });
});
```

### 5. エラーハンドリングテスト

#### error-handling.test.ts
```typescript
describe('Error Handling Integration', () => {
  it('should gracefully handle API failures', async () => {
    // ネットワーク障害をシミュレート
    const collector = new ActionSpecificCollector(undefined, true);
    const mockContext = createMockIntegratedContext();
    
    // API接続失敗をモック
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    
    const result = await collector.collectForAction('original_post', mockContext);
    
    expect(result.results).toBeDefined();
    expect(result.sufficiencyScore).toBeGreaterThan(0); // フォールバック動作
  });

  it('should handle configuration errors', async () => {
    const collector = new ActionSpecificCollector('non-existent-config.yaml');
    const mockContext = createMockIntegratedContext();
    
    const result = await collector.collectForAction('original_post', mockContext);
    
    expect(result.results).toBeDefined(); // デフォルト設定で動作
  });
});
```

## 📋 実装手順

### Phase 1: 基本統合テスト
1. 各情報源（RSS、API、コミュニティ）の単体テスト実装
2. ActionSpecificCollector拡張機能のテスト実装
3. 設定ファイル読み込みテストの実装

### Phase 2: システム統合テスト
1. 多様情報源の統合動作テスト
2. 品質評価システムのテスト
3. フォールバック機能のテスト

### Phase 3: パフォーマンステスト
1. 実行時間制限テスト
2. 並列処理のパフォーマンステスト
3. メモリ使用量のテスト

### Phase 4: E2Eテスト
1. 完全ワークフローのテスト
2. エラーハンドリングのテスト
3. 実際の運用環境でのテスト

## ⚠️ 制約・注意事項

### テスト環境
- 実際のAPIへのアクセス制限を考慮
- モック/スタブの適切な使用
- テストデータの管理

### パフォーマンス要件
- 90秒実行制限の確認
- レート制限の遵守確認
- メモリリークの検証

### セキュリティ要件
- 認証情報の適切な管理
- テスト環境でのAPI制限確認

## ✅ 完了基準

1. **テストカバレッジ**
   - 新機能の90%以上のカバレッジ
   - 統合テストの全パス
   - エラーケースの網羅的テスト

2. **パフォーマンス基準**
   - 90秒制限内での実行確認
   - レート制限の遵守確認
   - 並列処理の効率性確認

3. **品質基準**
   - TypeScript strict mode準拠
   - ESLint/Prettier通過
   - 実際の運用環境での動作確認

## 📁 出力管理
- ✅ 承認された出力場所: `tasks/20250721_190718_information_source_expansion/outputs/`
- 🚫 ルートディレクトリへの出力は絶対禁止
- 📋 命名規則: `TASK-004-{name}-output.{ext}` 形式使用

## 📋 報告書要件
実装完了後、以下内容で報告書を作成：
- 統合テスト結果の詳細
- パフォーマンステスト結果
- 発見された問題・制限事項
- 運用時の推奨事項
- 今後の改善提案

---

**テスト品質**: システム全体の信頼性を支える重要な検証プロセスです。徹底的なテストにより、本番環境での安定動作を保証してください。