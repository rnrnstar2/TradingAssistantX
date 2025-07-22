import { ContentCreator } from '../../src/services/content-creator';
import { ProcessedData, PostContent, ContentStrategy } from '../../src/types/content-types';
import { CollectionResult } from '../../src/types/collection-types';
import * as yamlUtils from '../../src/utils/yaml-utils';

// Mockの設定
jest.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  AIProvider: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue('モックされたコンテンツ生成結果')
  }))
}));

jest.mock('../../src/utils/yaml-utils', () => ({
  loadYamlSafe: jest.fn()
}));

jest.mock('../../src/utils/error-handler', () => ({
  handleError: jest.fn()
}));

describe('ContentCreator', () => {
  let contentCreator: ContentCreator;
  const mockLoadYamlSafe = yamlUtils.loadYamlSafe as jest.MockedFunction<typeof yamlUtils.loadYamlSafe>;

  beforeEach(() => {
    jest.clearAllMocks();
    contentCreator = new ContentCreator();
    
    // デフォルトのモック設定
    mockLoadYamlSafe.mockReturnValue({
      followers: 500
    });
  });

  describe('createPost', () => {
    const createMockProcessedData = (overrides?: Partial<ProcessedData>): ProcessedData => ({
      data: [
        {
          id: '1',
          source: 'RSS Feed 1',
          content: '市場の重要な動向について',
          timestamp: Date.now(),
          metadata: {
            category: 'market',
            importance: 'high',
            tags: ['市場分析', '投資']
          }
        }
      ],
      processingTime: 1000,
      dataQuality: 0.9,
      readyForConvergence: true,
      ...overrides
    });

    it('教育的コンテンツを正常に生成できる', async () => {
      const mockData = createMockProcessedData();
      mockLoadYamlSafe.mockReturnValue({ followers: 300 }); // 初期段階

      const result = await contentCreator.createPost(mockData);

      expect(result).toBeDefined();
      expect(result.strategy).toBe('educational');
      expect(result.content).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.educationalValue).toBeGreaterThan(0);
    });

    it('トレンドコンテンツを正常に生成できる', async () => {
      const mockData = createMockProcessedData({
        data: [
          {
            id: '1',
            source: 'RSS Feed 1',
            content: '速報：重要な市場ニュース',
            timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2時間前
            metadata: {
              category: 'breaking_news',
              importance: 'high'
            }
          }
        ]
      });
      mockLoadYamlSafe.mockReturnValue({ followers: 2000 }); // 成長段階

      const result = await contentCreator.createPost(mockData);

      expect(result).toBeDefined();
      expect(result.strategy).toBe('trend');
      expect(result.metadata.trendRelevance).toBeGreaterThan(0);
    });

    it('分析特化型コンテンツを正常に生成できる', async () => {
      const mockData = createMockProcessedData({
        data: Array(6).fill(null).map((_, i) => ({
          id: String(i),
          source: `Source ${i}`,
          content: `分析データ ${i}`,
          timestamp: Date.now(),
          metadata: {
            category: ['market', 'economic', 'technical'][i % 3],
            importance: 'medium'
          }
        }))
      });
      mockLoadYamlSafe.mockReturnValue({ followers: 3000 }); // 成長段階

      const result = await contentCreator.createPost(mockData);

      expect(result).toBeDefined();
      expect(result.strategy).toBe('analytical');
    });

    it('エラー時にフォールバックコンテンツを返す', async () => {
      const mockData = createMockProcessedData({
        data: [] // 空のデータ
      });

      const result = await contentCreator.createPost(mockData);

      expect(result).toBeDefined();
      expect(result.content).toContain('投資の基本原則');
      expect(result.strategy).toBe('educational');
      expect(result.confidence).toBe(60);
    });
  });

  describe('generateEducationalContent', () => {
    it('教育的コンテンツが280文字以内で生成される', async () => {
      const topic = {
        topic: 'リスク管理',
        relevance: 0.8,
        sources: ['Source1', 'Source2'],
        timestamp: Date.now()
      };

      // @ts-ignore - private methodへのアクセス
      const result = await contentCreator.generateEducationalContent(topic);

      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(280);
    });
  });

  describe('validateContent', () => {
    it('有効なコンテンツを検証できる', () => {
      const validContent = '投資の基本を理解することが重要です。リスク管理から始めましょう。';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.validateContent(validContent);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('文字数超過を検出できる', () => {
      const longContent = 'あ'.repeat(300);
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.validateContent(longContent);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('文字数超過: 300文字');
    });

    it('短すぎるコンテンツを検出できる', () => {
      const shortContent = '短い';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.validateContent(shortContent);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('コンテンツが短すぎます');
    });

    it('専門用語の過度な使用を検出できる', () => {
      const technicalContent = 'ボラティリティが高く、レバレッジを活用したヘッジ戦略でアービトラージを狙う';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.validateContent(technicalContent);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('専門用語が多すぎます');
    });
  });

  describe('formatForX', () => {
    it('280文字以内のコンテンツをフォーマットできる', () => {
      const content = '投資の基本を学びましょう。';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.formatForX(content);

      expect(result).toContain(content);
      expect(result.length).toBeLessThanOrEqual(280);
    });

    it('長いコンテンツを適切に切り詰める', () => {
      const longContent = 'あ'.repeat(300);
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.formatForX(longContent);

      expect(result.length).toBeLessThanOrEqual(280);
      expect(result).toContain('...');
    });

    it('適切な絵文字を追加する', () => {
      const analysisContent = '市場分析の結果です。';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.formatForX(analysisContent);

      expect(result).toContain('📊');
    });

    it('余裕がある場合ハッシュタグを追加する', () => {
      const shortContent = '投資を学ぼう';
      
      // @ts-ignore - private methodへのアクセス
      const result = contentCreator.formatForX(shortContent);

      expect(result).toContain('#投資教育');
      expect(result).toContain('#資産運用');
    });
  });

  describe('成長段階別の戦略選択', () => {
    const mockData = createMockProcessedData();

    it('フォロワー1000人未満では教育戦略を選択', async () => {
      mockLoadYamlSafe.mockReturnValue({ followers: 500 });

      const result = await contentCreator.createPost(mockData);

      expect(result.strategy).toBe('educational');
    });

    it('フォロワー1000人以上でトレンドがある場合はトレンド戦略を選択', async () => {
      mockLoadYamlSafe.mockReturnValue({ followers: 2000 });
      const trendData = createMockProcessedData({
        data: [{
          id: '1',
          source: 'RSS',
          content: '速報ニュース',
          timestamp: Date.now() - 1 * 60 * 60 * 1000, // 1時間前
          metadata: { importance: 'high' }
        }]
      });

      const result = await contentCreator.createPost(trendData);

      expect(result.strategy).toBe('trend');
    });

    it('複雑なデータの場合は分析戦略を選択', async () => {
      mockLoadYamlSafe.mockReturnValue({ followers: 3000 });
      const complexData = createMockProcessedData({
        data: Array(6).fill(null).map((_, i) => ({
          id: String(i),
          source: `Source ${i}`,
          content: `データ ${i}`,
          timestamp: Date.now(),
          metadata: { category: `category${i % 4}` }
        }))
      });

      const result = await contentCreator.createPost(complexData);

      expect(result.strategy).toBe('analytical');
    });
  });
});

function createMockProcessedData(overrides?: Partial<ProcessedData>): ProcessedData {
  return {
    data: [
      {
        id: '1',
        source: 'RSS Feed 1',
        content: 'テストコンテンツ',
        timestamp: Date.now(),
        metadata: {}
      }
    ],
    processingTime: 1000,
    dataQuality: 0.9,
    readyForConvergence: true,
    ...overrides
  };
}