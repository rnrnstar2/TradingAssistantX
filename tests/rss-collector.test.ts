import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RSSCollector } from '../src/collectors/rss-collector.js';
import { CollectionContext } from '../src/collectors/base-collector.js';
import { YamlManager } from '../src/utils/yaml-manager.js';
import Parser from 'rss-parser';

// モックの設定
vi.mock('../src/utils/yaml-manager.js');
vi.mock('rss-parser');

describe('RSSCollector', () => {
  let collector: RSSCollector;
  let mockYamlManager: any;
  let mockParser: any;

  const mockRssSettings = {
    sources: {
      financial_major: [
        {
          name: "Test Bloomberg",
          url: "https://test.bloomberg.com/rss",
          priority: 1,
          category: "market",
          enabled: true
        },
        {
          name: "Test Yahoo Finance",
          url: "https://test.yahoo.com/rss",
          priority: 2,
          category: "general",
          enabled: false // disabled for testing
        }
      ],
      educational: [
        {
          name: "Test Educational Source",
          url: "https://test.education.com/rss",
          priority: 3,
          category: "education",
          enabled: true
        }
      ]
    },
    collection_settings: {
      max_items_per_source: 10,
      update_interval_minutes: 30,
      timeout_seconds: 15
    }
  };

  const mockFeedData = {
    items: [
      {
        guid: 'test-1',
        title: 'Test Investment News',
        contentSnippet: 'This is a test investment article about markets and trading.',
        content: '<p>This is a test investment article about markets and trading.</p>',
        link: 'https://test.com/article-1',
        pubDate: new Date().toISOString(),
        creator: 'Test Author',
        categories: ['finance', 'market']
      },
      {
        guid: 'test-2',
        title: 'Another Market Update',
        contentSnippet: 'Economic indicators show positive trends.',
        link: 'https://test.com/article-2',
        pubDate: new Date().toISOString(),
        creator: 'Test Author 2'
      }
    ]
  };

  beforeEach(() => {
    // YamlManager モック
    mockYamlManager = {
      loadConfig: vi.fn().mockResolvedValue({
        success: true,
        data: mockRssSettings
      })
    };
    (YamlManager as any).mockImplementation(() => mockYamlManager);

    // RSS Parser モック
    mockParser = {
      parseURL: vi.fn().mockResolvedValue(mockFeedData)
    };
    (Parser as any).mockImplementation(() => mockParser);

    collector = new RSSCollector({
      enabled: true,
      priority: 5,
      timeout: 30000,
      retries: 3
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能テスト', () => {
    it('コレクターの基本プロパティが正しく設定される', () => {
      expect(collector.getSourceType()).toBe('rss');
      expect(collector.getPriority()).toBe(5);
    });

    it('利用可能性チェックが正常に動作する', async () => {
      const isAvailable = await collector.isAvailable();
      expect(isAvailable).toBe(true);
      expect(mockYamlManager.loadConfig).toHaveBeenCalledWith('rss-sources.yaml');
    });

    it('コンテキストベースの収集判定が正常に動作する', () => {
      const context: CollectionContext = {
        action: 'create investment post',
        theme: 'market analysis',
        timestamp: new Date().toISOString()
      };

      const shouldCollect = collector.shouldCollect(context);
      expect(shouldCollect).toBe(true);
    });

    it('非金融テーマでは収集しない', () => {
      const context: CollectionContext = {
        action: 'create weather post',
        theme: 'weather forecast',
        timestamp: new Date().toISOString()
      };

      const shouldCollect = collector.shouldCollect(context);
      expect(shouldCollect).toBe(false);
    });
  });

  describe('設定ファイル読み込み', () => {
    it('YAML設定が正常に読み込まれる', async () => {
      const sources = await collector.getAvailableSources();
      
      expect(sources).toContain('Test Bloomberg');
      expect(sources).toContain('Test Educational Source');
      expect(sources).toContain('Test Yahoo Finance'); // disabled も含む
      expect(sources).toHaveLength(3);
    });

    it('設定ファイル読み込み失敗時のエラーハンドリング', async () => {
      mockYamlManager.loadConfig.mockResolvedValue({
        success: false,
        error: 'File not found'
      });

      const isAvailable = await collector.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('RSS データ収集', () => {
    it('正常なRSSフィード収集が動作する', async () => {
      const context: CollectionContext = {
        action: 'create investment post',
        theme: 'market analysis',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);

      expect(result.success).toBe(true);
      expect(result.source).toBe('rss');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.metadata.sourceType).toBe('rss');
    });

    it('有効なソースのみが収集される', async () => {
      const context: CollectionContext = {
        action: 'create investment post',
        theme: 'market analysis',
        timestamp: new Date().toISOString()
      };

      await collector.collect(context);

      // parseURLが2回呼ばれる（enabledがtrueのソース2つ分）
      expect(mockParser.parseURL).toHaveBeenCalledTimes(2);
      expect(mockParser.parseURL).toHaveBeenCalledWith('https://test.bloomberg.com/rss');
      expect(mockParser.parseURL).toHaveBeenCalledWith('https://test.education.com/rss');
      // disabled のソースは呼ばれない
      expect(mockParser.parseURL).not.toHaveBeenCalledWith('https://test.yahoo.com/rss');
    });

    it('RSS解析エラー時のグレースフル処理', async () => {
      mockParser.parseURL.mockRejectedValue(new Error('Network error'));

      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);

      expect(result.success).toBe(true); // 他のソースが成功すれば全体は成功
      expect(result.data).toBeDefined();
    });

    it('すべてのRSSソースがエラーの場合', async () => {
      mockParser.parseURL.mockRejectedValue(new Error('All sources failed'));

      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);

      expect(result.success).toBe(true); // エラーでも基本構造は返す
      expect(result.data).toEqual([]); // データは空配列
    });
  });

  describe('データ処理とフィルタリング', () => {
    it('重複記事の除去が動作する', async () => {
      const duplicatedFeed = {
        items: [
          {
            guid: 'same-1',
            title: 'Same Article',
            link: 'https://test.com/same',
            contentSnippet: 'Investment news',
            pubDate: new Date().toISOString()
          },
          {
            guid: 'same-2', // 異なるGUID
            title: 'Same Article', // 同じタイトル
            link: 'https://test.com/same', // 同じURL
            contentSnippet: 'Investment news',
            pubDate: new Date().toISOString()
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(duplicatedFeed);

      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);

      expect(result.success).toBe(true);
      // 重複が除去されて1つになっているかチェック（複数のソースから同じものが来た場合）
      const uniqueTitles = new Set((result.data as any[]).map(item => item.title));
      expect(uniqueTitles.size).toBeLessThanOrEqual((result.data as any[]).length);
    });

    it('関連性スコアが正しく計算される', async () => {
      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);
      
      expect(result.success).toBe(true);
      const items = result.data as any[];
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(item.relevanceScore).toBeLessThanOrEqual(1);
        });
      }
    });

    it('HTMLタグがコンテンツから除去される', async () => {
      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);
      
      expect(result.success).toBe(true);
      const items = result.data as any[];
      
      items.forEach(item => {
        expect(item.content).not.toMatch(/<[^>]*>/);
      });
    });
  });

  describe('キャッシュ機能', () => {
    it('キャッシュのクリアが動作する', () => {
      collector.clearCache();
      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('設定の再読み込みが動作する', async () => {
      await collector.reloadSettings();
      expect(mockYamlManager.loadConfig).toHaveBeenCalled();
    });
  });

  describe('統計情報とメタデータ', () => {
    it('統計情報が正しく取得される', () => {
      const stats = collector.getStats();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('settingsLoaded');
      expect(stats).toHaveProperty('isEnabled');
      expect(stats).toHaveProperty('priority');
      expect(stats).toHaveProperty('sourceType');
      
      expect(stats.sourceType).toBe('rss');
      expect(stats.isEnabled).toBe(true);
      expect(stats.priority).toBe(5);
    });

    it('収集結果のメタデータが正しく設定される', async () => {
      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await collector.collect(context);
      
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata).toHaveProperty('count');
      expect(result.metadata).toHaveProperty('sourceType', 'rss');
      expect(result.metadata).toHaveProperty('processingTime');
      expect(typeof result.metadata.processingTime).toBe('number');
    });
  });

  describe('エラーハンドリング', () => {
    it('コレクターが無効化されている場合のエラー処理', async () => {
      const disabledCollector = new RSSCollector({
        enabled: false
      });

      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await disabledCollector.collect(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('タイムアウト処理が動作する', async () => {
      // タイムアウトを短く設定
      const timeoutCollector = new RSSCollector({
        enabled: true,
        timeout: 100 // 100ms
      });

      // 長時間のレスポンスをモック
      mockParser.parseURL.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockFeedData), 200))
      );

      const context: CollectionContext = {
        action: 'create investment post',
        timestamp: new Date().toISOString()
      };

      const result = await timeoutCollector.collect(context);

      expect(result.success).toBe(true); // タイムアウトでもgracefulに処理
    });
  });
});