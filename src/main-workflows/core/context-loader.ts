import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';
import { TweetEndpoints } from '../../kaito-api/endpoints/tweet-endpoints';
import { KaitoApiClient } from '../../kaito-api';
import { SystemContext, AccountInfo, LearningData } from '../../shared/types';

/**
 * ContextLoader - システムコンテキスト読み込み機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • DataManager・KaitoAPI・SearchEngineから現在状況収集
 * • 型安全なシステムコンテキストの構築
 * • アカウント情報・学習データ・トレンドデータの抽出・正規化
 * 
 * 🔄 主要機能:
 * • loadSystemContext: 並行処理でデータ取得効率化
 * • extractAccountInfo: 型安全なアカウント情報変換
 * • extractLearningData: 学習データの型安全な抽出
 * • extractTrendData: トレンドデータの型安全な抽出
 */
export class ContextLoader {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * システムコンテキスト読み込み - 型安全版
   * データ管理・API・検索エンジンから現在の状況を収集
   */
  async loadSystemContext(): Promise<SystemContext> {
    try {
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);

      // 並行処理でデータ取得効率化
      const [learningData, accountInfo, trendData] = await Promise.all([
        dataManager.loadLearningData(),
        kaitoClient.getAccountInfo(),
        searchEngine.searchTrends()
      ]);

      // 型安全なアカウント情報変換
      const safeAccountInfo = this.extractAccountInfo(accountInfo);
      const safeLearningData = this.extractLearningData(learningData);
      const safeTrendData = this.extractTrendData(trendData);

      return {
        timestamp: new Date().toISOString(),
        account: safeAccountInfo,
        system: {
          executionCount: {
            today: safeLearningData.executionCount?.today || 0,
            total: safeLearningData.executionCount?.total || 0
          },
          health: { 
            all_systems_operational: true,
            api_status: 'healthy' as const,
            rate_limits_ok: true
          }
        },
        market: safeTrendData,
        learningData: {
          decisionPatterns: safeLearningData.decisionPatterns,
          successStrategies: safeLearningData.successStrategies,
          errorLessons: safeLearningData.errorLessons
        }
      };

    } catch (error) {
      systemLogger.error('❌ システムコンテキスト読み込みエラー:', error);
      throw new Error(`システムコンテキスト読み込み失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * アカウント情報の型安全な抽出
   */
  private extractAccountInfo(accountInfo: AccountInfo): SystemContext['account'] {
    return {
      followerCount: accountInfo.followersCount || 0,
      lastPostTime: (accountInfo as any).lastPostTime,
      postsToday: (accountInfo as any).postsToday || 0,
      engagementRate: (accountInfo as any).engagementRate || 0,
      accountHealth: 'good' as const
    };
  }

  /**
   * 学習データの型安全な抽出
   */
  private extractLearningData(learningData: any): {
    executionCount?: { today: number; total: number };
    decisionPatterns: any[];
    successStrategies: any[];
    errorLessons: any[];
  } {
    return {
      executionCount: (learningData as any).executionCount,
      decisionPatterns: (learningData.decisionPatterns || []).map((pattern: any) => ({
        ...pattern,
        id: pattern.id || Date.now().toString()
      })),
      successStrategies: Array.isArray(learningData.successStrategies) 
        ? learningData.successStrategies.map((strategy: any) => ({
            id: strategy.id || Date.now().toString(),
            strategy: strategy.strategy || 'Unknown strategy',
            successRate: strategy.successRate || 0,
            conditions: strategy.conditions || [],
            examples: strategy.examples || []
          }))
        : [],
      errorLessons: (learningData as any).errorLessons || []
    };
  }

  /**
   * トレンドデータの型安全な抽出
   */
  private extractTrendData(trendData: any): SystemContext['market'] {
    return {
      trendingTopics: (Array.isArray(trendData) && trendData.length > 0) 
        ? trendData.map((trend: any) => trend.topic || trend) 
        : ['Bitcoin', 'NISA', '投資'],
      volatility: 'medium',
      sentiment: 'neutral'
    };
  }
}