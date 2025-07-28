import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';
import { KaitoApiClient } from '../../kaito-api';
import { SystemContext, AccountInfo, LearningData } from '../../shared/types';

/**
 * ContextLoader - システムコンテキスト読み込み機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • DataManager・KaitoAPIから現在状況収集
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
   * データ管理・APIから現在の状況を収集
   */
  async loadSystemContext(): Promise<SystemContext> {
    try {
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);

      // 並行処理でデータ取得効率化
      let accountInfo: AccountInfo;
      let trendData: any;
      let learningData: any;
      
      try {
        [learningData, accountInfo, trendData] = await Promise.all([
          dataManager.loadLearningData(),
          kaitoClient.getAccountInfo(),
          kaitoClient.searchTrends ? kaitoClient.searchTrends() : Promise.resolve([])
        ]);
      } catch (error) {
        // 開発環境用のフォールバック
        systemLogger.warn('⚠️ API接続エラー。開発用のモックデータを使用します');
        learningData = await dataManager.loadLearningData();
        accountInfo = {
          id: 'dev_account',
          username: 'dev_user',
          followersCount: 0,
          followingCount: 0,
          tweetsCount: 0,
          timestamp: new Date().toISOString()
        } as AccountInfo;
        trendData = [];
      }

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      systemLogger.error('❌ システムコンテキスト読み込みエラー:', errorMessage);
      if (errorStack) {
        systemLogger.error('スタックトレース:', errorStack);
      }
      throw new Error(`システムコンテキスト読み込み失敗: ${errorMessage}`);
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