/**
 * コンテキスト圧迫抑制システム - 単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextCompressionSystem } from '../../src/lib/context-compression-system';
import { RealtimeInfoCollector } from '../../src/lib/realtime-info-collector';
import { MinimalLogger } from '../../src/lib/minimal-logger';
import { ClaudeOptimizedProvider } from '../../src/lib/claude-optimized-provider';
import { MinimalDecisionEngine } from '../../src/lib/minimal-decision-engine';
import { MemoryOptimizer } from '../../src/lib/memory-optimizer';

// モック設定
vi.mock('../../src/lib/realtime-info-collector', () => ({
  RealtimeInfoCollector: vi.fn().mockImplementation(() => ({
    getEssentialContext: vi.fn(),
    startPeriodicCleanup: vi.fn(),
  }))
}));

vi.mock('../../src/lib/minimal-logger', () => ({
  MinimalLogger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    performance: vi.fn(),
    decision: vi.fn(),
  }
}));

vi.mock('../../src/lib/claude-optimized-provider', () => ({
  ClaudeOptimizedProvider: vi.fn().mockImplementation(() => ({
    getDecisionContext: vi.fn(),
    getStatusSummary: vi.fn(),
    monitorPerformance: vi.fn(),
    logDecision: vi.fn(),
  }))
}));

vi.mock('../../src/lib/minimal-decision-engine', () => ({
  MinimalDecisionEngine: vi.fn().mockImplementation(() => ({
    quickDecision: vi.fn(),
    makeDecision: vi.fn(),
    monitorDecisionQuality: vi.fn(),
  }))
}));

vi.mock('../../src/lib/memory-optimizer', () => ({
  MemoryOptimizer: vi.fn().mockImplementation(() => ({
    isHealthy: vi.fn(),
    performManualCleanup: vi.fn(),
    getMemoryStats: vi.fn(),
    getMemoryReport: vi.fn(),
    stop: vi.fn(),
  })),
  memoryOptimizer: {
    isHealthy: vi.fn(),
    performManualCleanup: vi.fn(),
    getMemoryStats: vi.fn(),
    getMemoryReport: vi.fn(),
    stop: vi.fn(),
  }
}));

describe('ContextCompressionSystem', () => {
  let system: ContextCompressionSystem;
  let mockRealtimeCollector: vi.Mocked<RealtimeInfoCollector>;
  let mockClaudeProvider: vi.Mocked<ClaudeOptimizedProvider>;
  let mockDecisionEngine: vi.Mocked<MinimalDecisionEngine>;
  let mockMemoryOptimizer: vi.Mocked<MemoryOptimizer>;

  beforeEach(() => {
    // モック初期化
    mockRealtimeCollector = {
      getEssentialContext: vi.fn(),
      startPeriodicCleanup: vi.fn(),
    } as any;
    
    mockClaudeProvider = {
      getDecisionContext: vi.fn(),
      getStatusSummary: vi.fn(),
      monitorPerformance: vi.fn(),
    } as any;
    
    mockDecisionEngine = {
      quickDecision: vi.fn(),
      makeDecision: vi.fn(),
      monitorDecisionQuality: vi.fn(),
    } as any;
    
    mockMemoryOptimizer = {
      isHealthy: vi.fn(),
      performManualCleanup: vi.fn(),
      getMemoryStats: vi.fn(),
      getMemoryReport: vi.fn(),
      stop: vi.fn(),
    } as any;

    // システム初期化
    system = new ContextCompressionSystem();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeOptimizedDecision', () => {
    it('正常にClaudeの判断を実行する', async () => {
      // モック設定
      mockMemoryOptimizer.isHealthy.mockReturnValue(true);
      mockClaudeProvider.getDecisionContext.mockResolvedValue({
        current: { time: '12:00:00', accountHealth: 80, todayProgress: 5 },
        immediate: { bestOpportunity: 'post - 投稿機会', constraints: [] },
        context: 'テストコンテキスト'
      });
      mockDecisionEngine.quickDecision.mockResolvedValue({
        action: 'post',
        reason: '投資教育コンテンツ',
        confidence: 0.8
      });

      // 実行
      const decision = await system.executeOptimizedDecision();

      // 検証
      expect(decision.action).toBe('post');
      expect(decision.reason).toBe('投資教育コンテンツ');
      expect(decision.confidence).toBe(0.8);
      expect(mockClaudeProvider.getDecisionContext).toHaveBeenCalled();
      expect(mockDecisionEngine.quickDecision).toHaveBeenCalled();
    });

    it('メモリ不足時はクリーンアップを実行する', async () => {
      // モック設定
      mockMemoryOptimizer.isHealthy.mockReturnValue(false);
      mockClaudeProvider.getDecisionContext.mockResolvedValue({
        current: { time: '12:00:00', accountHealth: 80, todayProgress: 5 },
        immediate: { bestOpportunity: 'post - 投稿機会', constraints: [] },
        context: 'テストコンテキスト'
      });
      mockDecisionEngine.quickDecision.mockResolvedValue({
        action: 'post',
        reason: '投資教育コンテンツ',
        confidence: 0.8
      });

      // 実行
      await system.executeOptimizedDecision();

      // 検証
      expect(mockMemoryOptimizer.performManualCleanup).toHaveBeenCalled();
    });

    it('エラー時はフォールバック判断を返す', async () => {
      // エラーを発生させる
      mockClaudeProvider.getDecisionContext.mockRejectedValue(new Error('テストエラー'));

      // 実行
      const decision = await system.executeOptimizedDecision();

      // 検証
      expect(decision.action).toBe('wait');
      expect(decision.reason).toBe('システムエラー - 待機');
      expect(decision.confidence).toBe(0.3);
    });
  });

  describe('getSystemStatus', () => {
    it('システム状態を正しく取得する', async () => {
      // モック設定
      mockMemoryOptimizer.getMemoryStats.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 60 * 1024 * 1024
      });
      mockClaudeProvider.getStatusSummary.mockResolvedValue('[12:00:00] 健康度:80% 進捗:5/15 機会:post');
      mockMemoryOptimizer.isHealthy.mockReturnValue(true);

      // 実行
      const status = await system.getSystemStatus();

      // 検証
      expect(status).toContain('12:00:00');
      expect(status).toContain('健康度:80%');
      expect(status).toContain('メモリ:50MB');
      expect(status).toContain('キャッシュ健全性:OK');
    });
  });

  describe('generatePerformanceReport', () => {
    it('パフォーマンスレポートを生成する', async () => {
      // モック設定
      mockMemoryOptimizer.getMemoryReport.mockReturnValue('メモリレポート');

      // 実行
      const report = await system.generatePerformanceReport();

      // 検証
      expect(report).toContain('コンテキスト圧縮システム - パフォーマンスレポート');
      expect(report).toContain('効率化指標');
      expect(report).toContain('メモリ詳細');
      expect(report).toContain('システム健全性');
    });
  });

  describe('executeBatchOperations', () => {
    it('バッチ処理を正常実行する', async () => {
      // モック設定
      mockClaudeProvider.getDecisionContext.mockResolvedValue({
        current: { time: '12:00:00', accountHealth: 80, todayProgress: 5 },
        immediate: { bestOpportunity: 'post - 投稿機会', constraints: [] },
        context: 'テストコンテキスト'
      });
      mockDecisionEngine.makeDecision.mockResolvedValue({
        action: 'post',
        reason: '投資教育コンテンツ',
        confidence: 0.8
      });

      // 実行
      const decisions = await system.executeBatchOperations(['post', 'engage', 'amplify']);

      // 検証
      expect(decisions).toHaveLength(3);
      expect(decisions[0].action).toBe('post');
      expect(mockDecisionEngine.makeDecision).toHaveBeenCalledTimes(3);
    });

    it('バッチ処理は最大3件に制限される', async () => {
      // モック設定
      mockClaudeProvider.getDecisionContext.mockResolvedValue({
        current: { time: '12:00:00', accountHealth: 80, todayProgress: 5 },
        immediate: { bestOpportunity: 'post - 投稿機会', constraints: [] },
        context: 'テストコンテキスト'
      });
      mockDecisionEngine.makeDecision.mockResolvedValue({
        action: 'post',
        reason: '投資教育コンテンツ',
        confidence: 0.8
      });

      // 実行（5件指定だが3件に制限される）
      const decisions = await system.executeBatchOperations(['post', 'engage', 'amplify', 'wait', 'post']);

      // 検証
      expect(decisions).toHaveLength(3);
      expect(mockDecisionEngine.makeDecision).toHaveBeenCalledTimes(3);
    });
  });

  describe('optimizeSystem', () => {
    it('システム最適化を実行する', async () => {
      // 実行
      await system.optimizeSystem();

      // 検証
      expect(mockMemoryOptimizer.performManualCleanup).toHaveBeenCalled();
      expect(mockClaudeProvider.monitorPerformance).toHaveBeenCalled();
      expect(mockDecisionEngine.monitorDecisionQuality).toHaveBeenCalled();
    });
  });

  describe('emergencyOptimization', () => {
    it('緊急最適化を実行する', async () => {
      // 実行
      await system.emergencyOptimization();

      // 検証
      expect(mockMemoryOptimizer.performManualCleanup).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('システムを正常に停止する', () => {
      // 実行
      system.shutdown();

      // 検証
      expect(mockMemoryOptimizer.stop).toHaveBeenCalled();
    });
  });
});

describe('メモリ効率化', () => {
  it('システムは100MB以下のメモリ使用量を維持する', async () => {
    const system = new ContextCompressionSystem();
    const memoryStats = await system['memoryOptimizer'].getMemoryStats();
    
    expect(memoryStats.heapUsed).toBeLessThan(100 * 1024 * 1024);
  });

  it('判断実行時間は30秒以内を維持する', async () => {
    const system = new ContextCompressionSystem();
    const startTime = Date.now();
    
    await system.executeOptimizedDecision();
    
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(30000);
  });
});