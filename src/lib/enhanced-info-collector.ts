import type { CollectionTarget, CollectionResult } from '../types/autonomous-system.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

export class EnhancedInfoCollector {
  private targets: CollectionTarget[] = [];

  constructor() {
    this.initializeTargets();
  }

  async collectInformation(): Promise<CollectionResult[]> {
    console.log('🔍 [情報収集開始] 強化された情報収集システムを起動...');
    
    try {
      this.targets = this.defineCollectionTargets();
      
      const results = await Promise.all([
        this.collectTrendInformation(),
        this.collectCompetitorContent(),
        this.collectMarketNews(),
        this.collectHashtagActivity()
      ]);
      
      const consolidatedResults = this.consolidateResults(results);
      
      console.log(`✅ [情報収集完了] ${consolidatedResults.length}件の情報を収集しました`);
      
      return consolidatedResults;
    } catch (error) {
      console.error('❌ [情報収集エラー]:', error);
      return [];
    }
  }

  private initializeTargets(): void {
    this.targets = this.defineCollectionTargets();
  }

  private defineCollectionTargets(): CollectionTarget[] {
    return [
      {
        type: 'trend',
        source: 'x.com/explore',
        priority: 'high',
        searchTerms: ['投資', 'トレード', 'FX', '株式', '仮想通貨', '金融']
      },
      {
        type: 'competitor',
        source: 'x.com/search',
        priority: 'medium',
        searchTerms: ['投資アドバイザー', 'トレーダー', '資産運用', 'ファイナンシャルアドバイザー']
      },
      {
        type: 'news',
        source: 'x.com/search',
        priority: 'high',
        searchTerms: ['経済ニュース', '市場動向', '金融政策', '日銀', 'FRB', '株価']
      },
      {
        type: 'hashtag',
        source: 'x.com/hashtag',
        priority: 'medium',
        searchTerms: ['#投資', '#FX', '#株式投資', '#資産運用', '#投資家', '#トレード']
      }
    ];
  }

  private async collectTrendInformation(): Promise<CollectionResult[]> {
    console.log('📈 [トレンド収集] X.comトレンド情報を収集中...');
    
    try {
      const trendTarget = this.targets.find(t => t.type === 'trend');
      if (!trendTarget) return [];

      // 模擬的なトレンド情報収集（実際の実装では Playwright を使用）
      const mockTrendData = [
        {
          id: `trend-${Date.now()}-1`,
          type: 'trend',
          content: '日本株が上昇、円安が後押し',
          source: 'x.com/explore',
          relevanceScore: 0.85,
          timestamp: Date.now(),
          metadata: {
            engagement: 1250,
            hashtags: ['#日本株', '#円安', '#投資']
          }
        },
        {
          id: `trend-${Date.now()}-2`,
          type: 'trend',
          content: 'ビットコインが再び50000ドル台を回復',
          source: 'x.com/explore',
          relevanceScore: 0.78,
          timestamp: Date.now(),
          metadata: {
            engagement: 2100,
            hashtags: ['#ビットコイン', '#BTC', '#仮想通貨']
          }
        }
      ];

      console.log(`📈 [トレンド収集完了] ${mockTrendData.length}件のトレンド情報を収集`);
      return mockTrendData;
    } catch (error) {
      console.error('❌ [トレンド収集エラー]:', error);
      return [];
    }
  }

  private async collectCompetitorContent(): Promise<CollectionResult[]> {
    console.log('👥 [競合分析] 競合アカウントの投稿を分析中...');
    
    try {
      const competitorTarget = this.targets.find(t => t.type === 'competitor');
      if (!competitorTarget) return [];

      // 模擬的な競合分析データ
      const mockCompetitorData = [
        {
          id: `competitor-${Date.now()}-1`,
          type: 'competitor',
          content: '市場の変動が激しいときこそ、リスク管理が重要です。分散投資の基本を忘れずに。',
          source: 'competitor_account_1',
          relevanceScore: 0.82,
          timestamp: Date.now(),
          metadata: {
            engagement: 340,
            author: '@investment_guru',
            hashtags: ['#リスク管理', '#分散投資']
          }
        },
        {
          id: `competitor-${Date.now()}-2`,
          type: 'competitor',
          content: 'FXトレードで勝つためには、テクニカル分析よりもメンタル管理が9割です。',
          source: 'competitor_account_2',
          relevanceScore: 0.75,
          timestamp: Date.now(),
          metadata: {
            engagement: 520,
            author: '@fx_master',
            hashtags: ['#FX', '#メンタル管理']
          }
        }
      ];

      console.log(`👥 [競合分析完了] ${mockCompetitorData.length}件の競合情報を収集`);
      return mockCompetitorData;
    } catch (error) {
      console.error('❌ [競合分析エラー]:', error);
      return [];
    }
  }

  private async collectMarketNews(): Promise<CollectionResult[]> {
    console.log('📰 [市場ニュース] 金融・経済ニュースを収集中...');
    
    try {
      const newsTarget = this.targets.find(t => t.type === 'news');
      if (!newsTarget) return [];

      // 模擬的な市場ニュースデータ
      const mockNewsData = [
        {
          id: `news-${Date.now()}-1`,
          type: 'news',
          content: '日銀、金利政策維持を決定。市場の反応は限定的',
          source: 'financial_news',
          relevanceScore: 0.88,
          timestamp: Date.now(),
          metadata: {
            engagement: 890,
            hashtags: ['#日銀', '#金利政策', '#金融政策']
          }
        },
        {
          id: `news-${Date.now()}-2`,
          type: 'news',
          content: 'NYダウ、好決算を受けて過去最高値を更新',
          source: 'market_news',
          relevanceScore: 0.83,
          timestamp: Date.now(),
          metadata: {
            engagement: 1200,
            hashtags: ['#NYダウ', '#決算', '#米国株']
          }
        }
      ];

      console.log(`📰 [市場ニュース完了] ${mockNewsData.length}件のニュースを収集`);
      return mockNewsData;
    } catch (error) {
      console.error('❌ [市場ニュースエラー]:', error);
      return [];
    }
  }

  private async collectHashtagActivity(): Promise<CollectionResult[]> {
    console.log('#️⃣ [ハッシュタグ分析] 人気ハッシュタグの活動を分析中...');
    
    try {
      const hashtagTarget = this.targets.find(t => t.type === 'hashtag');
      if (!hashtagTarget) return [];

      // 模擬的なハッシュタグ活動データ
      const mockHashtagData = [
        {
          id: `hashtag-${Date.now()}-1`,
          type: 'hashtag',
          content: '#投資 タグで活発な議論：初心者向けの投資戦略について',
          source: 'hashtag_analysis',
          relevanceScore: 0.72,
          timestamp: Date.now(),
          metadata: {
            engagement: 450,
            hashtags: ['#投資', '#初心者', '#投資戦略']
          }
        },
        {
          id: `hashtag-${Date.now()}-2`,
          type: 'hashtag',
          content: '#FX タグで注目：ドル円の今後の展望について活発な意見交換',
          source: 'hashtag_analysis',
          relevanceScore: 0.68,
          timestamp: Date.now(),
          metadata: {
            engagement: 320,
            hashtags: ['#FX', '#ドル円', '#為替']
          }
        }
      ];

      console.log(`#️⃣ [ハッシュタグ分析完了] ${mockHashtagData.length}件のハッシュタグ情報を収集`);
      return mockHashtagData;
    } catch (error) {
      console.error('❌ [ハッシュタグ分析エラー]:', error);
      return [];
    }
  }

  private consolidateResults(resultArrays: CollectionResult[][]): CollectionResult[] {
    const allResults = resultArrays.flat();
    
    // 関連性スコアでソート（高い順）
    const sortedResults = allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // 重複除去（コンテンツの類似性で判定）
    const uniqueResults = this.removeDuplicates(sortedResults);
    
    // 上位30件に制限
    const limitedResults = uniqueResults.slice(0, 30);
    
    console.log(`🔄 [結果統合] ${allResults.length}件から${limitedResults.length}件に集約`);
    
    return limitedResults;
  }

  private removeDuplicates(results: CollectionResult[]): CollectionResult[] {
    const seen = new Set<string>();
    const unique: CollectionResult[] = [];
    
    for (const result of results) {
      // コンテンツの最初の50文字でユニーク性を判定
      const contentKey = result.content.substring(0, 50).toLowerCase();
      
      if (!seen.has(contentKey)) {
        seen.add(contentKey);
        unique.push(result);
      }
    }
    
    return unique;
  }

  async evaluateCollectionQuality(results: CollectionResult[]): Promise<{
    overallScore: number;
    recommendations: string[];
  }> {
    const averageRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
    const typeDistribution = this.analyzeTypeDistribution(results);
    
    const recommendations: string[] = [];
    
    if (averageRelevance < 0.7) {
      recommendations.push('収集条件を調整して関連性の高い情報を増やす');
    }
    
    if (typeDistribution.trend < 0.3) {
      recommendations.push('トレンド情報の収集を強化する');
    }
    
    if (typeDistribution.news < 0.2) {
      recommendations.push('市場ニュースの収集を増やす');
    }
    
    return {
      overallScore: averageRelevance,
      recommendations
    };
  }

  private analyzeTypeDistribution(results: CollectionResult[]): Record<string, number> {
    const total = results.length;
    const counts = results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const distribution: Record<string, number> = {};
    for (const [type, count] of Object.entries(counts)) {
      distribution[type] = count / total;
    }
    
    return distribution;
  }
}