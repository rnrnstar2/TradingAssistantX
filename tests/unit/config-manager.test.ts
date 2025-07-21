import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadOptimizedConfig, loadAutonomousConfig, convertOptimizedToAutonomous, DEFAULT_AUTONOMOUS_CONFIG } from '../../src/utils/config-loader';
import { TestHelper, MockFactory } from '../../src/utils/test-helper';
import type { AutonomousConfig } from '../../src/types/autonomous-config';
import * as fs from 'fs';
import yaml from 'js-yaml';

// モック設定
vi.mock('fs');
vi.mock('js-yaml');

describe('ConfigManager (config-loader)', () => {
  const mockFs = vi.mocked(fs);
  const mockYaml = vi.mocked(yaml);

  beforeEach(() => {
    TestHelper.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestHelper.cleanupTestEnvironment();
  });

  describe('loadOptimizedConfig', () => {
    test('claude-summary.yamlが存在する場合の優先読み込み', () => {
      const mockSummaryData = {
        system: {
          mode: 'scheduled_posting',
          posting_interval: 60,
          health_check_enabled: true,
          maintenance_enabled: true,
          max_parallel_tasks: 3,
          context_sharing: true,
          max_context_size: 50000
        }
      };

      mockFs.existsSync.mockImplementation((path: string) => {
        return path === 'data/claude-summary.yaml';
      });
      
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path === 'data/claude-summary.yaml') {
          return JSON.stringify(mockSummaryData);
        }
        throw new Error('File not found');
      });
      
      mockYaml.load.mockReturnValue(mockSummaryData);

      const result = loadOptimizedConfig();

      expect(result.summary).toEqual(mockSummaryData);
      expect(result.systemState).toBeNull();
      expect(result.autonomousConfig).toBeNull();
      expect(mockFs.existsSync).toHaveBeenCalledWith('data/claude-summary.yaml');
    });

    test('claude-summary.yamlとsystem-state.yaml両方が存在する場合', () => {
      const mockSummaryData = { system: { mode: 'test' } };
      const mockSystemState = { status: 'active', health: 'good' };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path === 'data/claude-summary.yaml') {
          return JSON.stringify(mockSummaryData);
        }
        if (path === 'data/core/system-state.yaml') {
          return JSON.stringify(mockSystemState);
        }
        throw new Error('File not found');
      });

      mockYaml.load.mockImplementation((content) => {
        if (content === JSON.stringify(mockSummaryData)) {
          return mockSummaryData;
        }
        if (content === JSON.stringify(mockSystemState)) {
          return mockSystemState;
        }
        return null;
      });

      const result = loadOptimizedConfig();

      expect(result.summary).toEqual(mockSummaryData);
      expect(result.systemState).toEqual(mockSystemState);
      expect(result.autonomousConfig).toBeNull();
    });

    test('claude-summary.yamlが存在しない場合のフォールバック', () => {
      const mockAutonomousConfig = TestHelper.createMockConfig();

      mockFs.existsSync.mockImplementation((path: string) => {
        return path === 'data/autonomous-config.yaml';
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAutonomousConfig));
      mockYaml.load.mockReturnValue(mockAutonomousConfig);

      const result = loadOptimizedConfig();

      expect(result.summary).toBeNull();
      expect(result.systemState).toBeNull();
      expect(result.autonomousConfig).toEqual(mockAutonomousConfig);
    });

    test('すべてのファイルが存在しない場合のデフォルト設定', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadOptimizedConfig();

      expect(result.summary).toBeNull();
      expect(result.systemState).toBeNull();
      expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });

    test('ファイル読み込みエラー時のエラーハンドリング', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = loadOptimizedConfig();

      expect(result.summary).toBeNull();
      expect(result.systemState).toBeNull();
      expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });

    test('YAML パースエラー時のエラーハンドリング', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml content');
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML format');
      });

      const result = loadOptimizedConfig();

      expect(result.summary).toBeNull();
      expect(result.systemState).toBeNull();
      expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });
  });

  describe('loadAutonomousConfig', () => {
    test('正常な設定ファイル読み込み', () => {
      const mockConfig: AutonomousConfig = TestHelper.createMockConfig();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      mockYaml.load.mockReturnValue(mockConfig);

      const result = loadAutonomousConfig();

      expect(result).toEqual(mockConfig);
      expect(mockFs.existsSync).toHaveBeenCalledWith('data/autonomous-config.yaml');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('data/autonomous-config.yaml', 'utf8');
    });

    test('設定ファイルが存在しない場合のエラー', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => loadAutonomousConfig()).toThrow('Autonomous config file not found: data/autonomous-config.yaml');
    });

    test('無効な設定構造の場合のエラー', () => {
      const invalidConfig = {
        // executionとautonomous_systemが欠けている無効な構造
        some_other_field: 'value'
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));
      mockYaml.load.mockReturnValue(invalidConfig);

      expect(() => loadAutonomousConfig()).toThrow('Invalid autonomous config structure');
    });

    test('execution セクションが欠けている場合', () => {
      const configWithoutExecution = {
        autonomous_system: {
          max_parallel_tasks: 3,
          context_sharing_enabled: true,
          decision_persistence: false
        }
        // execution セクションが欠けている
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithoutExecution));
      mockYaml.load.mockReturnValue(configWithoutExecution);

      expect(() => loadAutonomousConfig()).toThrow('Invalid autonomous config structure');
    });

    test('autonomous_system セクションが欠けている場合', () => {
      const configWithoutAutonomousSystem = {
        execution: {
          mode: 'scheduled_posting',
          posting_interval_minutes: 60,
          health_check_enabled: true,
          maintenance_enabled: true
        }
        // autonomous_system セクションが欠けている
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithoutAutonomousSystem));
      mockYaml.load.mockReturnValue(configWithoutAutonomousSystem);

      expect(() => loadAutonomousConfig()).toThrow('Invalid autonomous config structure');
    });
  });

  describe('convertOptimizedToAutonomous', () => {
    test('最適化設定から自律設定への変換', () => {
      const optimizedConfig = {
        summary: {
          system: {
            mode: 'dynamic_analysis',
            posting_interval: 90,
            health_check_enabled: false,
            maintenance_enabled: true,
            max_parallel_tasks: 5,
            context_sharing: false,
            decision_persistence: true,
            max_context_size: 75000
          }
        }
      };

      const result = convertOptimizedToAutonomous(optimizedConfig);

      expect(result.execution.mode).toBe('dynamic_analysis');
      expect(result.execution.posting_interval_minutes).toBe(90);
      expect(result.execution.health_check_enabled).toBe(false);
      expect(result.execution.maintenance_enabled).toBe(true);
      expect(result.autonomous_system.max_parallel_tasks).toBe(5);
      expect(result.autonomous_system.context_sharing_enabled).toBe(false);
      expect(result.autonomous_system.decision_persistence).toBe(true);
      expect(result.claude_integration.max_context_size).toBe(75000);
    });

    test('部分的な最適化設定での変換とデフォルト値', () => {
      const partialOptimizedConfig = {
        summary: {
          system: {
            mode: 'test_mode'
            // 他のフィールドは欠けている
          }
        }
      };

      const result = convertOptimizedToAutonomous(partialOptimizedConfig);

      expect(result.execution.mode).toBe('test_mode');
      // デフォルト値が適用されることを確認
      expect(result.execution.posting_interval_minutes).toBe(60);
      expect(result.execution.health_check_enabled).toBe(true);
      expect(result.autonomous_system.max_parallel_tasks).toBe(3);
      expect(result.autonomous_system.context_sharing_enabled).toBe(true);
    });

    test('summaryが存在しない場合のautonomousConfigフォールバック', () => {
      const configWithoutSummary = {
        autonomousConfig: TestHelper.createMockConfig()
      };

      const result = convertOptimizedToAutonomous(configWithoutSummary);

      expect(result).toEqual(configWithoutSummary.autonomousConfig);
    });

    test('summary も autonomousConfig も存在しない場合のデフォルト設定', () => {
      const emptyConfig = {};

      const result = convertOptimizedToAutonomous(emptyConfig);

      expect(result).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });

    test('空のsummaryでの変換', () => {
      const configWithEmptySummary = {
        summary: {}
      };

      const result = convertOptimizedToAutonomous(configWithEmptySummary);

      // デフォルト値が適用されることを確認
      expect(result.execution.mode).toBe('scheduled_posting');
      expect(result.execution.posting_interval_minutes).toBe(60);
      expect(result.autonomous_system.max_parallel_tasks).toBe(3);
    });
  });

  describe('DEFAULT_AUTONOMOUS_CONFIG', () => {
    test('デフォルト設定の妥当性確認', () => {
      expect(DEFAULT_AUTONOMOUS_CONFIG).toBeDefined();
      expect(DEFAULT_AUTONOMOUS_CONFIG.execution).toBeDefined();
      expect(DEFAULT_AUTONOMOUS_CONFIG.autonomous_system).toBeDefined();
      expect(DEFAULT_AUTONOMOUS_CONFIG.claude_integration).toBeDefined();
      expect(DEFAULT_AUTONOMOUS_CONFIG.data_management).toBeDefined();
    });

    test('デフォルト設定の各フィールドの妥当性', () => {
      const config = DEFAULT_AUTONOMOUS_CONFIG;

      // execution セクション
      expect(config.execution.mode).toBe('scheduled_posting');
      expect(config.execution.posting_interval_minutes).toBe(60);
      expect(config.execution.health_check_enabled).toBe(true);
      expect(config.execution.maintenance_enabled).toBe(true);

      // autonomous_system セクション
      expect(config.autonomous_system.max_parallel_tasks).toBe(3);
      expect(config.autonomous_system.context_sharing_enabled).toBe(true);
      expect(config.autonomous_system.decision_persistence).toBe(false);

      // claude_integration セクション
      expect(config.claude_integration.sdk_enabled).toBe(true);
      expect(config.claude_integration.max_context_size).toBe(50000);

      // data_management セクション
      expect(config.data_management.cleanup_interval).toBe(3600000); // 1時間
      expect(config.data_management.max_history_entries).toBe(100);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量の設定データ処理性能', () => {
      const largeSummaryData = {
        system: {
          mode: 'performance_test',
          posting_interval: 30,
          custom_data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: `performance_test_data_${i}`.repeat(10)
          }))
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(largeSummaryData));
      mockYaml.load.mockReturnValue(largeSummaryData);

      const startTime = Date.now();
      const result = loadOptimizedConfig();
      const executionTime = Date.now() - startTime;

      expect(result.summary).toEqual(largeSummaryData);
      expect(executionTime).toBeLessThan(1000); // 1秒以内で処理完了
    });

    test('並列設定読み込み処理', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test: data');
      mockYaml.load.mockReturnValue({ test: 'data' });

      const promises = Array.from({ length: 10 }, () => loadOptimizedConfig());

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(10);
        results.forEach(result => {
          expect(result).toBeDefined();
        });
      });
    });
  });

  describe('エラー境界テスト', () => {
    test('ファイルシステム権限エラー', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => {
        const result = loadOptimizedConfig();
        expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
      }).not.toThrow();
    });

    test('メモリ不足エラーシミュレーション', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOMEM: not enough memory');
      });

      const result = loadOptimizedConfig();
      expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });

    test('不正なJSONフォーマット', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');
      mockYaml.load.mockImplementation(() => {
        throw new Error('Unexpected token in JSON');
      });

      const result = loadOptimizedConfig();
      expect(result.autonomousConfig).toEqual(DEFAULT_AUTONOMOUS_CONFIG);
    });
  });
});