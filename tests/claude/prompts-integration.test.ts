import { ContentBuilder, SearchBuilder, AnalysisBuilder } from '../../src/claude/prompts/builders/index';
import { createContentPrompt, createSearchPrompt, createAnalysisPrompt } from '../../src/claude/prompts/index';

describe('プロンプトビルダー統合テスト', () => {
  const mockSystemContext = {
    account: {
      followerCount: 1500,
      postsToday: 2,
      engagementRate: 3.2
    },
    learningData: {
      recentTopics: ['Bitcoin', 'DeFi'],
      avgEngagement: 2.8,
      totalPatterns: 150
    },
    market: {
      sentiment: 'bullish',
      volatility: 'medium',
      trendingTopics: ['NFT', 'Ethereum']
    }
  };

  test('ContentBuilder動作確認', () => {
    const builder = new ContentBuilder();
    const prompt = builder.buildPrompt({
      topic: '仮想通貨基礎',
      targetAudience: '投資初心者',
      context: mockSystemContext,
      maxLength: 280,
      style: 'educational'
    });
    
    expect(prompt).toContain('仮想通貨基礎');
    expect(prompt).toContain('投資初心者');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('SearchBuilder動作確認', () => {
    const builder = new SearchBuilder();
    const prompt = builder.buildPrompt({
      topic: 'Bitcoin',
      purpose: 'trend analysis',
      context: mockSystemContext,
      constraints: {
        maxResults: 20,
        language: 'ja',
        excludeRetweets: true
      }
    });
    
    expect(prompt).toContain('Bitcoin');
    expect(prompt).toContain('trend analysis');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('AnalysisBuilder動作確認', () => {
    const builder = new AnalysisBuilder();
    const prompt = builder.buildPrompt({
      action: 'tweet_analysis',
      result: {
        engagement: 150,
        sentiment: 'positive'
      },
      context: mockSystemContext,
      metrics: {
        likes: 45,
        retweets: 12,
        replies: 8,
        views: 1200
      }
    });
    
    expect(prompt).toContain('tweet_analysis');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('ファクトリー関数動作確認', () => {
    expect(() => createContentPrompt({
      topic: 'test',
      targetAudience: 'test',
      context: mockSystemContext
    })).not.toThrow();
    
    expect(() => createSearchPrompt({
      topic: 'test',
      purpose: 'test',
      context: mockSystemContext,
      constraints: {
        maxResults: 10,
        language: 'ja'
      }
    })).not.toThrow();
    
    expect(() => createAnalysisPrompt({
      action: 'test',
      result: { test: 'value' },
      context: mockSystemContext
    })).not.toThrow();
  });

  test('全ビルダーの統合テスト', () => {
    // ContentPrompt作成
    const contentPrompt = createContentPrompt({
      topic: 'DeFi基礎知識',
      targetAudience: '暗号資産初心者',
      context: mockSystemContext,
      maxLength: 280,
      style: 'educational'
    });

    // SearchPrompt作成
    const searchPrompt = createSearchPrompt({
      topic: 'DeFi',
      purpose: 'educational content',
      context: mockSystemContext,
      constraints: {
        maxResults: 15,
        language: 'ja'
      }
    });

    // AnalysisPrompt作成
    const analysisPrompt = createAnalysisPrompt({
      action: 'performance_analysis',
      result: {
        engagement_rate: 4.2,
        reach: 2500,
        sentiment: 'positive'
      },
      context: mockSystemContext,
      metrics: {
        likes: 78,
        retweets: 23,
        replies: 15,
        views: 2500
      }
    });

    // 基本的な検証
    expect(contentPrompt).toBeDefined();
    expect(searchPrompt).toBeDefined();
    expect(analysisPrompt).toBeDefined();
    
    expect(typeof contentPrompt).toBe('string');
    expect(typeof searchPrompt).toBe('string');
    expect(typeof analysisPrompt).toBe('string');
    
    expect(contentPrompt.length).toBeGreaterThan(50);
    expect(searchPrompt.length).toBeGreaterThan(50);
    expect(analysisPrompt.length).toBeGreaterThan(50);
  });
});