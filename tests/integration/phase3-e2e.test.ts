import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AutonomousExecutor } from '../../src/core/autonomous-executor';
import { DecisionEngine } from '../../src/core/decision-engine';
import { LoopManager } from '../../src/core/loop-manager';
import { RSSCollector } from '../../src/collectors/rss-collector';
import { ContentCreator } from '../../src/services/content-creator';
import { DataOptimizer } from '../../src/services/data-optimizer';
import { XPoster } from '../../src/services/x-poster';
import { YAMLManager } from '../../src/utils/yaml-manager';
import { IntegrityChecker } from '../../src/utils/integrity-checker';
import * as fs from 'fs/promises';
import * as path from 'path';

// モック設定
jest.mock('../../src/collectors/rss-collector');
jest.mock('../../src/services/content-creator');
jest.mock('../../src/services/x-poster');
jest.mock('../../src/utils/yaml-manager');
jest.mock('../../src/utils/integrity-checker');

describe('Phase 3 E2E Tests', () => {
  let autonomousExecutor: AutonomousExecutor;
  let decisionEngine: DecisionEngine;
  let loopManager: LoopManager;
  let mockRSSCollector: jest.Mocked<RSSCollector>;
  let mockContentCreator: jest.Mocked<ContentCreator>;
  let mockXPoster: jest.Mocked<XPoster>;
  let mockYAMLManager: jest.Mocked<YAMLManager>;
  let mockIntegrityChecker: jest.Mocked<IntegrityChecker>;

  beforeEach(() => {
    // モックの初期化
    mockRSSCollector = new RSSCollector() as jest.Mocked<RSSCollector>;
    mockContentCreator = new ContentCreator() as jest.Mocked<ContentCreator>;
    mockXPoster = new XPoster() as jest.Mocked<XPoster>;
    mockYAMLManager = new YAMLManager() as jest.Mocked<YAMLManager>;
    mockIntegrityChecker = new IntegrityChecker() as jest.Mocked<IntegrityChecker>;

    // 標準的なモック返却値の設定
    mockIntegrityChecker.validateStructure.mockResolvedValue(true);
    mockYAMLManager.readData.mockResolvedValue({
      follower_count: 500,
      engagement_rate: 2.5,
      last_post_time: new Date().toISOString()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario 1: First Run Flow', () => {
    it('should execute full autonomous cycle on first run', async () => {
      // 初回実行シミュレーション
      mockYAMLManager.readData.mockResolvedValueOnce(null); // account-status.yaml が存在しない

      // RSS収集モック
      mockRSSCollector.collect.mockResolvedValue({
        success: true,
        data: [
          {
            title: 'Market Update',
            description: 'Stock market reaches new highs',
            link: 'https://example.com/news1',
            publishedAt: new Date().toISOString()
          }
        ],
        errors: []
      });

      // コンテンツ生成モック
      mockContentCreator.create.mockResolvedValue({
        content: '📈 市場速報\n\n株式市場が新高値を更新しました。投資初心者の方は、このような上昇相場でも慎重な判断が必要です。\n\n#投資 #株式投資 #投資初心者',
        metadata: {
          theme: 'investment_basics',
          strategy: 'educational'
        }
      });

      // X投稿モック
      mockXPoster.post.mockResolvedValue({
        success: true,
        postId: '1234567890',
        url: 'https://twitter.com/example/status/1234567890'
      });

      // 実行
      autonomousExecutor = new AutonomousExecutor();
      const result = await autonomousExecutor.execute();

      // 検証
      expect(result.success).toBe(true);
      expect(mockIntegrityChecker.validateStructure).toHaveBeenCalled();
      expect(mockRSSCollector.collect).toHaveBeenCalled();
      expect(mockContentCreator.create).toHaveBeenCalled();
      expect(mockXPoster.post).toHaveBeenCalled();
      expect(mockYAMLManager.writeData).toHaveBeenCalledWith(
        expect.stringContaining('account-status.yaml'),
        expect.any(Object)
      );
    });
  });

  describe('Scenario 2: Scheduled Posting Flow', () => {
    it('should execute scheduled posting correctly', async () => {
      // 定時実行の設定
      const currentHour = new Date().getHours();
      const scheduledTimes = [7, 12, 18, 21];
      
      mockYAMLManager.readData
        .mockResolvedValueOnce({
          // posting-times.yaml
          scheduled_times: scheduledTimes,
          enabled: true
        })
        .mockResolvedValueOnce({
          // account-status.yaml
          follower_count: 1500,
          engagement_rate: 3.2,
          last_post_time: new Date(Date.now() - 3600000).toISOString() // 1時間前
        });

      // 実行時間が定時投稿時間に該当する場合のみ投稿
      const shouldPost = scheduledTimes.includes(currentHour);

      if (shouldPost) {
        mockRSSCollector.collect.mockResolvedValue({
          success: true,
          data: [
            {
              title: 'Investment Tips',
              description: 'Top 5 investment strategies for beginners',
              link: 'https://example.com/tips',
              publishedAt: new Date().toISOString()
            }
          ],
          errors: []
        });

        mockContentCreator.create.mockResolvedValue({
          content: '💡 投資のヒント\n\n初心者向けの投資戦略トップ5をご紹介します。\n\n1. 分散投資を心がける\n2. 長期的な視点を持つ\n\n#投資初心者 #投資戦略',
          metadata: {
            theme: 'investment_basics',
            strategy: 'educational'
          }
        });

        mockXPoster.post.mockResolvedValue({
          success: true,
          postId: '1234567891',
          url: 'https://twitter.com/example/status/1234567891'
        });
      }

      decisionEngine = new DecisionEngine();
      const decision = await decisionEngine.makeDecision();

      if (shouldPost) {
        expect(decision.shouldPost).toBe(true);
        expect(decision.strategy).toBe('scheduled');
      } else {
        expect(decision.shouldPost).toBe(false);
      }
    });
  });

  describe('Scenario 3: Urgent News Flow', () => {
    it('should handle urgent news posting', async () => {
      // 緊急ニュースのシミュレーション
      mockRSSCollector.collect.mockResolvedValue({
        success: true,
        data: [
          {
            title: 'Breaking: Major Market Crash',
            description: 'Global markets plunge 10% in early trading',
            link: 'https://example.com/breaking',
            publishedAt: new Date().toISOString(),
            urgency: 'high'
          }
        ],
        errors: []
      });

      mockYAMLManager.readData.mockResolvedValue({
        follower_count: 3000,
        engagement_rate: 4.1,
        last_post_time: new Date(Date.now() - 1800000).toISOString() // 30分前
      });

      mockContentCreator.create.mockResolvedValue({
        content: '🚨 緊急速報\n\n世界市場が10%急落しています。\n\n投資初心者の方へ：\n・慌てて売らない\n・リスク管理の重要性を再認識\n・長期投資の視点を忘れずに\n\n#緊急 #株式市場 #投資',
        metadata: {
          theme: 'market_analysis',
          strategy: 'urgent',
          urgency: 'high'
        }
      });

      mockXPoster.post.mockResolvedValue({
        success: true,
        postId: '1234567892',
        url: 'https://twitter.com/example/status/1234567892'
      });

      decisionEngine = new DecisionEngine();
      const decision = await decisionEngine.makeDecision();

      expect(decision.shouldPost).toBe(true);
      expect(decision.strategy).toBe('urgent');
      expect(decision.urgency).toBe('high');
    });
  });

  describe('Scenario 4: Error Recovery Flow', () => {
    it('should recover from failures gracefully', async () => {
      // ネットワークエラーのシミュレーション
      mockRSSCollector.collect.mockRejectedValueOnce(new Error('Network timeout'));

      // リトライで成功
      mockRSSCollector.collect.mockResolvedValueOnce({
        success: true,
        data: [
          {
            title: 'Market Recovery',
            description: 'Markets stabilize after volatile session',
            link: 'https://example.com/recovery',
            publishedAt: new Date().toISOString()
          }
        ],
        errors: []
      });

      mockContentCreator.create.mockResolvedValue({
        content: '📊 市場回復\n\n変動の激しいセッションの後、市場は安定化しています。\n\n投資の基本を思い出しましょう。\n\n#投資 #市場分析',
        metadata: {
          theme: 'market_analysis',
          strategy: 'educational'
        }
      });

      mockXPoster.post.mockResolvedValue({
        success: true,
        postId: '1234567893',
        url: 'https://twitter.com/example/status/1234567893'
      });

      autonomousExecutor = new AutonomousExecutor();
      const result = await autonomousExecutor.execute();

      // エラーハンドリングとリトライが正しく動作することを確認
      expect(result.success).toBe(true);
      expect(mockRSSCollector.collect).toHaveBeenCalledTimes(2); // 初回失敗 + リトライ
      expect(result.errors).toContain('Network timeout');
      expect(result.recovered).toBe(true);
    });

    it('should handle authentication errors', async () => {
      // 認証エラーのシミュレーション
      mockXPoster.post.mockRejectedValue(new Error('Authentication failed'));

      mockRSSCollector.collect.mockResolvedValue({
        success: true,
        data: [
          {
            title: 'Test News',
            description: 'Test content',
            link: 'https://example.com/test',
            publishedAt: new Date().toISOString()
          }
        ],
        errors: []
      });

      mockContentCreator.create.mockResolvedValue({
        content: 'Test post content',
        metadata: {
          theme: 'test',
          strategy: 'test'
        }
      });

      autonomousExecutor = new AutonomousExecutor();
      const result = await autonomousExecutor.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Authentication failed');
      expect(mockYAMLManager.writeData).toHaveBeenCalledWith(
        expect.stringContaining('execution-log.yaml'),
        expect.objectContaining({
          error: 'Authentication failed',
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle data integrity violations', async () => {
      // データ整合性違反のシミュレーション
      mockIntegrityChecker.validateStructure.mockResolvedValue(false);
      mockIntegrityChecker.getViolations.mockReturnValue([
        'Unauthorized file created: /data/invalid-file.yaml',
        'File size exceeded: /data/current/account-status.yaml (1.2MB)'
      ]);

      autonomousExecutor = new AutonomousExecutor();
      const result = await autonomousExecutor.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Data integrity check failed');
      expect(mockIntegrityChecker.rollback).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should complete execution within 30 seconds', async () => {
      const startTime = Date.now();

      mockRSSCollector.collect.mockResolvedValue({
        success: true,
        data: Array(50).fill({
          title: 'Test Article',
          description: 'Test description',
          link: 'https://example.com/test',
          publishedAt: new Date().toISOString()
        }),
        errors: []
      });

      mockContentCreator.create.mockResolvedValue({
        content: 'Performance test post',
        metadata: {
          theme: 'test',
          strategy: 'test'
        }
      });

      mockXPoster.post.mockResolvedValue({
        success: true,
        postId: '1234567894',
        url: 'https://twitter.com/example/status/1234567894'
      });

      autonomousExecutor = new AutonomousExecutor();
      await autonomousExecutor.execute();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(30000); // 30秒以内
    });

    it('should use less than 200MB memory', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 大量データのシミュレーション
      mockRSSCollector.collect.mockResolvedValue({
        success: true,
        data: Array(1000).fill({
          title: 'Memory Test Article',
          description: 'A'.repeat(1000), // 長い説明文
          link: 'https://example.com/memory-test',
          publishedAt: new Date().toISOString()
        }),
        errors: []
      });

      autonomousExecutor = new AutonomousExecutor();
      await autonomousExecutor.execute();

      const memoryUsed = process.memoryUsage().heapUsed - initialMemory;
      expect(memoryUsed).toBeLessThan(200 * 1024 * 1024); // 200MB以内
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain correct data hierarchy', async () => {
      const mockDataHierarchy = {
        current: {
          'account-status.yaml': { size: 1024, age: 1 },
          'today-posts.yaml': { size: 2048, age: 0 }
        },
        learning: {
          'post-insights.yaml': { size: 5120, age: 30 },
          'engagement-patterns.yaml': { size: 3072, age: 45 }
        },
        archives: {
          'posts/2025-01/': { size: 102400, age: 90 }
        }
      };

      const dataOptimizer = new DataOptimizer();
      const validationResult = await dataOptimizer.validateHierarchy(mockDataHierarchy);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.currentSize).toBeLessThan(1024 * 1024); // 1MB
      expect(validationResult.learningSize).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });
});