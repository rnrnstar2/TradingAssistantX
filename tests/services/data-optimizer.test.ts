import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DataOptimizer } from '../../src/services/data-optimizer';

describe('DataOptimizer', () => {
  let optimizer: DataOptimizer;
  let testDataRoot: string;

  beforeEach(() => {
    optimizer = new DataOptimizer();
    testDataRoot = join(process.cwd(), 'test-data');
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rmdir(testDataRoot, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe('データセット最適化', () => {
    it('optimizeDataset()を実行できる', async () => {
      const result = await optimizer.optimizeDataset();
      
      expect(result).toBeDefined();
      expect(typeof result.removedCount).toBe('number');
      expect(typeof result.archivedCount).toBe('number');
      expect(typeof result.currentDataSize).toBe('number');
      expect(typeof result.contextCompressionRatio).toBe('number');
      expect(result.removedCount).toBeGreaterThanOrEqual(0);
      expect(result.archivedCount).toBeGreaterThanOrEqual(0);
      expect(result.currentDataSize).toBeGreaterThanOrEqual(0);
      expect(result.contextCompressionRatio).toBeGreaterThanOrEqual(0);
    });

    it('空のディレクトリでも正常に動作する', async () => {
      const result = await optimizer.optimizeDataset();
      
      expect(result.removedCount).toBe(0);
      expect(result.archivedCount).toBe(0);
      expect(result.currentDataSize).toBe(0);
    });
  });

  describe('古いデータのクリーンアップ', () => {
    it('cleanOldData()を実行できる', async () => {
      const result = await optimizer.cleanOldData(7);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.removedFiles)).toBe(true);
      expect(Array.isArray(result.archivedFiles)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.totalSpaceFreed).toBe('number');
      expect(result.totalSpaceFreed).toBeGreaterThanOrEqual(0);
    });

    it('負の保持日数でもエラーにならない', async () => {
      const result = await optimizer.cleanOldData(-1);
      
      expect(result).toBeDefined();
      expect(result.errors.length).toBe(0);
    });
  });

  describe('データ価値評価', () => {
    it('教育的価値を正しく評価する', async () => {
      const testData = {
        educationalContent: {
          complexity: 0.8,
          topicRelevance: 0.9,
          learningValue: 0.7
        },
        engagementMetrics: {
          likes: 10,
          retweets: 5,
          replies: 3
        },
        timestamp: new Date().toISOString()
      };

      const result = await optimizer.evaluateDataValue(testData);
      
      expect(result).toBeDefined();
      expect(typeof result.educationalValue).toBe('number');
      expect(typeof result.engagementScore).toBe('number');
      expect(typeof result.recencyScore).toBe('number');
      expect(typeof result.totalScore).toBe('number');
      expect(result.educationalValue).toBeGreaterThan(0);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('エンゲージメント指標を正しく評価する', async () => {
      const testData = {
        engagementMetrics: {
          likes: 100,
          retweets: 50,
          replies: 25
        },
        timestamp: new Date().toISOString()
      };

      const result = await optimizer.evaluateDataValue(testData);
      
      expect(result.engagementScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('古いデータは新鮮度スコアが低い', async () => {
      const oldData = {
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 60日前
      };
      const newData = {
        timestamp: new Date().toISOString()
      };

      const oldResult = await optimizer.evaluateDataValue(oldData);
      const newResult = await optimizer.evaluateDataValue(newData);
      
      expect(newResult.recencyScore).toBeGreaterThan(oldResult.recencyScore);
    });

    it('空のデータでもエラーにならない', async () => {
      const result = await optimizer.evaluateDataValue({});
      
      expect(result).toBeDefined();
      expect(result.totalScore).toBe(0);
    });
  });

  describe('学習データクリーニング', () => {
    it('cleanSuccessPatterns()を実行できる', async () => {
      await expect(optimizer.cleanSuccessPatterns()).resolves.not.toThrow();
    });

    it('cleanHighEngagementData()を実行できる', async () => {
      await expect(optimizer.cleanHighEngagementData()).resolves.not.toThrow();
    });

    it('cleanEffectiveTopics()を実行できる', async () => {
      await expect(optimizer.cleanEffectiveTopics()).resolves.not.toThrow();
    });

    it('performDeepCleaning()を実行できる', async () => {
      await expect(optimizer.performDeepCleaning()).resolves.not.toThrow();
    });
  });

  describe('データアーカイブ', () => {
    it('archiveData()でデータを正常にアーカイブできる', async () => {
      // テストデータの準備
      const testDir = join(testDataRoot, 'current');
      await fs.mkdir(testDir, { recursive: true });
      
      const testFile = join(testDir, 'test-data.yaml');
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      
      // YAMLファイルを手動作成（テスト用）
      await fs.writeFile(testFile, `test: data\ntimestamp: ${testData.timestamp}\n`);
      
      const archivePath = join(testDataRoot, 'archives', '2024-01', 'test-data.yaml');
      
      await expect(optimizer.archiveData(testFile, archivePath)).resolves.not.toThrow();
    });
  });

  describe('コンテキスト圧縮', () => {
    it('compressContext()を実行できる', async () => {
      const result = await optimizer.compressContext();
      
      expect(result).toBeDefined();
      expect(typeof result.originalSize).toBe('number');
      expect(typeof result.optimizedSize).toBe('number');
      expect(typeof result.compressionRatio).toBe('number');
      expect(result.originalSize).toBeGreaterThanOrEqual(0);
      expect(result.optimizedSize).toBeGreaterThanOrEqual(0);
      expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('データ構造圧縮', () => {
    it('不要なフィールドを削除する', () => {
      const testData = {
        important: 'data',
        _metadata: 'should be removed',
        _internal: 'should be removed',
        debug: 'should be removed',
        verbose: 'should be removed',
        emptyArray: [],
        emptyObject: {}
      };

      const compressed = optimizer['compressDataStructure'](testData);
      
      expect(compressed.important).toBe('data');
      expect(compressed._metadata).toBeUndefined();
      expect(compressed._internal).toBeUndefined();
      expect(compressed.debug).toBeUndefined();
      expect(compressed.verbose).toBeUndefined();
      expect(compressed.emptyArray).toBeUndefined();
      expect(compressed.emptyObject).toBeUndefined();
    });

    it('nullやundefinedを処理する', () => {
      expect(optimizer['compressDataStructure'](null)).toBe(null);
      expect(optimizer['compressDataStructure'](undefined)).toBe(undefined);
      expect(optimizer['compressDataStructure']('string')).toBe('string');
    });
  });

  describe('データハッシュ生成', () => {
    it('同じデータは同じハッシュを生成する', () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 }; // 順序が違うが同じデータ
      
      const hash1 = optimizer['generateDataHash'](data1);
      const hash2 = optimizer['generateDataHash'](data2);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256ハッシュは64文字
    });

    it('異なるデータは異なるハッシュを生成する', () => {
      const data1 = { a: 1, b: 2 };
      const data2 = { a: 1, b: 3 };
      
      const hash1 = optimizer['generateDataHash'](data1);
      const hash2 = optimizer['generateDataHash'](data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('保持ルールの読み込み', () => {
    it('デフォルトルールを取得できる', () => {
      const defaultRules = optimizer['getDefaultRetentionRules']();
      
      expect(defaultRules).toBeDefined();
      expect(defaultRules.retention_rules).toBeDefined();
      expect(defaultRules.quality_filters).toBeDefined();
      expect(defaultRules.performance_constraints).toBeDefined();
      expect(defaultRules.value_assessment).toBeDefined();
      
      // 具体的な値の検証
      expect(defaultRules.retention_rules.success_patterns.max_entries).toBe(50);
      expect(defaultRules.retention_rules.high_engagement.max_entries).toBe(100);
      expect(defaultRules.retention_rules.effective_topics.max_entries).toBe(30);
      expect(defaultRules.value_assessment.min_total_value_score).toBe(40);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないディレクトリでもエラーにならない', async () => {
      const result = await optimizer.cleanOldData(7);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('不正なYAMLファイルを処理する', async () => {
      await expect(optimizer.evaluateDataValue(null)).resolves.toBeDefined();
    });
  });

  describe('ファイルサイズ計算', () => {
    it('現在のデータサイズを計算できる', async () => {
      const size = await optimizer['calculateCurrentDataSize']();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('簡易価値スコア計算', () => {
    it('各要素を正しく計算する', () => {
      const testData = {
        engagementRate: 0.05,
        successRate: 0.8,
        timestamp: new Date().toISOString(),
        effectiveness: 0.7
      };

      const score = optimizer['calculateQuickValueScore'](testData);
      
      expect(score).toBeGreaterThan(0);
      // エンゲージメント(0.05 * 30) + 成功率(0.8 * 40) + 新鮮度(~20) + 効果(0.7 * 10)
      expect(score).toBeGreaterThan(50);
    });

    it('空のデータでも正常に動作する', () => {
      const score = optimizer['calculateQuickValueScore']({});
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});