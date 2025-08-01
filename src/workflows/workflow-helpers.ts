/**
 * Workflow Helpers - Common helper functions
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • データ収集・変換・計算の共通処理
 * • ヘルパー関数・ユーティリティメソッド
 * • 他のファイルから使用される共通ロジック
 */

import { KaitoTwitterAPIClient } from '../kaito-api';
import { type AccountInfo } from '../claude/types';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, SystemContext } from './constants';

/**
 * WorkflowHelpers - ヘルパー関数群
 */
export class WorkflowHelpers {
  private static kaitoClient: KaitoTwitterAPIClient;

  /**
   * KaitoClientを設定
   */
  static setKaitoClient(client: KaitoTwitterAPIClient): void {
    this.kaitoClient = client;
  }

  /**
   * Kaitoデータ収集
   */
  static async collectKaitoData(): Promise<any> {
    try {
      const profile = await this.kaitoClient.getAccountInfo();
      
      
      return profile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
        if (errorMessage.includes('Authentication failed') || errorMessage.includes('Login failed')) {
          console.log('🔧 開発モード: 認証エラーのため模擬アカウント情報を使用');
        } else {
          console.warn('⚠️ Kaitoデータ収集でエラー、デフォルト値使用:', error);
        }
      } else {
        console.warn('⚠️ Kaitoデータ収集でエラー、デフォルト値使用:', error);
      }
      
      // エラー時のデフォルト値（デフォルト値でもcurrent-status.yamlを更新）
      const fallbackProfile = {
        followers: 100,
        following: 50,
        tweets_today: 0
      };
      
      
      return fallbackProfile;
    }
  }

  /**
   * システムコンテキスト構築（MVP最適化版）
   */
  static buildSystemContext(profile: any): SystemContext {
    return {
      account: {
        followerCount: profile?.followersCount || profile?.followers || 100,
        lastPostTime: undefined,
        postsToday: profile?.tweetsCount || 0,
        engagementRate: this.calculateEngagementRate(profile)
      },
      system: {
        health: {
          all_systems_operational: true,
          api_status: 'healthy',
          rate_limits_ok: true
        },
        executionCount: {
          today: 0,
          total: 1
        }
      }
    };
  }

  /**
   * AccountInfo → TweetSelection用のProfile変換
   */
  static convertAccountInfoToProfile(accountInfo: any): AccountInfo {
    return {
      followerCount: accountInfo.followers_count || accountInfo.followersCount || accountInfo.followers || 0,
      postsToday: accountInfo.statuses_count || accountInfo.tweetsCount || 0,
      engagementRate: this.calculateEngagementRate(accountInfo),
      lastPostTime: accountInfo.status?.created_at
    };
  }

  /**
   * エンゲージメント率の簡易計算
   */
  static calculateEngagementRate(accountInfo: any): number {
    // 実装: フォロワー数とツイート数から概算
    const followers = accountInfo.followers_count || accountInfo.followersCount || accountInfo.followers || 1;
    const tweets = accountInfo.statuses_count || accountInfo.tweetsCount || 1;
    return Math.min((followers / tweets) * 0.1, 10); // 0-10%の範囲
  }

  /**
   * 現在時刻に最適な時間帯パターンを取得
   */
  static getCurrentTimeSlotPattern(engagementPatterns: any): string {
    try {
      if (!engagementPatterns?.timeSlots) {
        console.warn('⚠️ エンゲージメントパターンが不備、フォールバック使用');
        return 'optimal_fallback';
      }

      const currentHour = new Date().getHours();
      const timeSlot = this.getTimeSlotForHour(currentHour);
      const successRate = engagementPatterns.timeSlots[timeSlot]?.successRate || 0;
      
      console.log(`📊 時間帯分析: ${timeSlot} (成功率: ${successRate})`);
      return successRate > 0.8 ? timeSlot : 'optimal_fallback';
    } catch (error) {
      console.warn('⚠️ 時間帯パターン取得エラー、フォールバック使用:', error);
      return 'optimal_fallback';
    }
  }

  /**
   * 現在の時間帯でのエンゲージメント期待値計算
   */
  static calculateCurrentEngagementExpectation(engagementPatterns: any): number {
    try {
      if (!engagementPatterns?.timeSlots) {
        console.warn('⚠️ エンゲージメントパターンが不備、デフォルト値使用');
        return 2.5;
      }

      const currentHour = new Date().getHours();
      const timeSlot = this.getTimeSlotForHour(currentHour);
      const avgEngagement = engagementPatterns.timeSlots[timeSlot]?.avgEngagement || 2.5;
      
      console.log(`📈 エンゲージメント期待値: ${avgEngagement} (${timeSlot})`);
      return avgEngagement;
    } catch (error) {
      console.warn('⚠️ エンゲージメント期待値計算エラー、デフォルト値使用:', error);
      return 2.5;
    }
  }

  /**
   * 時刻から時間帯スロットを決定
   */
  static getTimeSlotForHour(hour: number): string {
    if (hour >= 7 && hour < 10) return '07:00-10:00';
    if (hour >= 12 && hour < 14) return '12:00-14:00';
    if (hour >= 20 && hour < 22) return '20:00-22:00';
    return 'other';
  }

  /**
   * ツイート検索・フィルタリング
   */
  static async searchAndFilterTweets(
    query: string, 
    actionType: string, 
    searchOptions?: any, 
    cachedProfile?: any
  ): Promise<{ success: true, tweets: any[], currentUser: any } | { success: false, waitAction: any }> {
    // 現在のユーザー情報を取得（キャッシュがあれば使用）
    const currentUser = cachedProfile || await this.kaitoClient.getAccountInfo();
    const currentUserId = currentUser.id;
    console.log(`📋 現在のユーザーID: ${currentUserId} (@${currentUser.username}) ${cachedProfile ? '(キャッシュ使用)' : '(新規取得)'}`);

    // ツイート検索実行
    console.log(`🔍 ${actionType}対象を検索中: "${query}"`);
    const searchResult = await this.kaitoClient.searchTweets(query, searchOptions);

    if (!searchResult.success || searchResult.tweets.length === 0) {
      console.warn(`⚠️ 検索結果がないため、waitアクションに変更: "${query}"`);
      return {
        success: false,
        waitAction: {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: `No tweets found for query: ${query}`,
          query: query,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 自分のツイートを除外
    const otherstweets = searchResult.tweets.filter(tweet => {
      const isOwn = tweet.author_id === currentUserId;
      if (isOwn) {
        console.log(`🚫 自分のツイートを除外: ${tweet.id} - "${tweet.text.substring(0, 30)}..."`);
      }
      return !isOwn;
    });

    if (otherstweets.length === 0) {
      console.warn(`⚠️ 他人のツイートが見つからないため、waitアクションに変更: "${query}"`);
      return {
        success: false,
        waitAction: {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'All tweets are from current user',
          query: query,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      tweets: otherstweets,
      currentUser: currentUser
    };
  }
}

/**
 * DataManagerのインスタンスを取得（シングルトン）
 */
export function getDataManager(): DataManager {
  return DataManager.getInstance();
}

// Export individual helper functions
export const collectKaitoData = WorkflowHelpers.collectKaitoData.bind(WorkflowHelpers);
export const buildSystemContext = WorkflowHelpers.buildSystemContext.bind(WorkflowHelpers);
export const convertAccountInfoToProfile = WorkflowHelpers.convertAccountInfoToProfile.bind(WorkflowHelpers);
export const calculateEngagementRate = WorkflowHelpers.calculateEngagementRate.bind(WorkflowHelpers);
export const getCurrentTimeSlotPattern = WorkflowHelpers.getCurrentTimeSlotPattern.bind(WorkflowHelpers);
export const calculateCurrentEngagementExpectation = WorkflowHelpers.calculateCurrentEngagementExpectation.bind(WorkflowHelpers);
export const getTimeSlotForHour = WorkflowHelpers.getTimeSlotForHour.bind(WorkflowHelpers);
export const searchAndFilterTweets = WorkflowHelpers.searchAndFilterTweets.bind(WorkflowHelpers);