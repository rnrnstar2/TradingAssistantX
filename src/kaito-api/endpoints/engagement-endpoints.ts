/**
 * KaitoAPI Engagement Endpoints - エンゲージメント関連API実装
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ
 * 
 * 機能概要:
 * - いいね・いいね取り消し機能
 * - ブックマーク・ブックマーク取り消し
 * - エンゲージメント分析・統計
 * - インタラクション管理
 */

import { KaitoAPIConfig } from '../core/config';

// ============================================================================
// ENGAGEMENT INTERFACES
// ============================================================================

export interface LikeResult {
  tweetId: string;
  liked: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface UnlikeResult {
  tweetId: string;
  unliked: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface BookmarkResult {
  tweetId: string;
  bookmarked: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface UnbookmarkResult {
  tweetId: string;
  unbookmarked: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface EngagementStats {
  tweetId: string;
  metrics: {
    likeCount: number;
    retweetCount: number;
    quoteCount: number;
    replyCount: number;
    impressionCount: number;
    bookmarkCount: number;
  };
  userInteractions: {
    liked: boolean;
    retweeted: boolean;
    bookmarked: boolean;
    quoted: boolean;
    replied: boolean;
  };
  timestamp: string;
}

export interface EngagementHistory {
  userId: string;
  actions: EngagementAction[];
  totalActions: number;
  timeRange: {
    startTime: string;
    endTime: string;
  };
  summary: {
    likes: number;
    retweets: number;
    bookmarks: number;
    quotes: number;
    replies: number;
  };
  timestamp: string;
}

export interface EngagementAction {
  id: string;
  type: 'like' | 'unlike' | 'retweet' | 'unretweet' | 'bookmark' | 'unbookmark' | 'quote' | 'reply';
  tweetId: string;
  timestamp: string;
  success: boolean;
  metadata?: {
    originalAuthor?: string;
    tweetText?: string;
    context?: string;
  };
}

export interface BulkEngagementResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    tweetId: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: string;
  duration: number;
}

// ============================================================================
// ENGAGEMENT ENDPOINTS CLASS
// ============================================================================

/**
 * EngagementEndpoints - エンゲージメント関連API操作クラス
 * 
 * 主要機能:
 * - いいね・ブックマーク操作
 * - エンゲージメント統計・分析
 * - 一括操作・履歴管理
 * - インタラクション追跡
 */
export class EngagementEndpoints {
  private config: KaitoAPIConfig;
  private httpClient: any; // HttpClientインスタンス
  private engagementHistory: EngagementAction[] = [];

  constructor(config: KaitoAPIConfig, httpClient: any) {
    this.config = config;
    this.httpClient = httpClient;
    
    console.log('✅ EngagementEndpoints initialized - 疎結合ライブラリアーキテクチャ');
  }

  // ============================================================================
  // LIKE METHODS
  // ============================================================================

  /**
   * ツイートにいいね
   * 指定されたツイートにいいねを付ける
   */
  async likeTweet(tweetId: string): Promise<LikeResult> {
    try {
      console.log('❤️ いいね実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.post<{
        data: {
          liked: boolean;
        }
      }>('/users/me/likes', {
        tweet_id: tweetId
      });

      const result: LikeResult = {
        tweetId,
        liked: response.data.liked,
        timestamp: new Date().toISOString(),
        success: response.data.liked
      };

      // エンゲージメント履歴記録
      if (result.success) {
        await this.recordEngagementAction({
          id: `like_${Date.now()}`,
          type: 'like',
          tweetId,
          timestamp: result.timestamp,
          success: true
        });
      }

      console.log(`${result.success ? '✅' : '❌'} いいね${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ いいねエラー:', error);
      
      const result: LikeResult = {
        tweetId,
        liked: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // 失敗も履歴に記録
      await this.recordEngagementAction({
        id: `like_fail_${Date.now()}`,
        type: 'like',
        tweetId,
        timestamp: result.timestamp,
        success: false
      });

      return result;
    }
  }

  /**
   * いいね取り消し
   * 指定されたツイートのいいねを取り消す
   */
  async unlikeTweet(tweetId: string): Promise<UnlikeResult> {
    try {
      console.log('💔 いいね取り消し実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.delete<{
        data: {
          liked: boolean;
        }
      }>(`/users/me/likes/${tweetId}`);

      const result: UnlikeResult = {
        tweetId,
        unliked: !response.data.liked,
        timestamp: new Date().toISOString(),
        success: !response.data.liked
      };

      // エンゲージメント履歴記録
      if (result.success) {
        await this.recordEngagementAction({
          id: `unlike_${Date.now()}`,
          type: 'unlike',
          tweetId,
          timestamp: result.timestamp,
          success: true
        });
      }

      console.log(`${result.success ? '✅' : '❌'} いいね取り消し${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ いいね取り消しエラー:', error);
      
      return {
        tweetId,
        unliked: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // BOOKMARK METHODS
  // ============================================================================

  /**
   * ツイートブックマーク
   * 指定されたツイートをブックマークする
   */
  async bookmarkTweet(tweetId: string): Promise<BookmarkResult> {
    try {
      console.log('🔖 ブックマーク実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.post<{
        data: {
          bookmarked: boolean;
        }
      }>('/users/me/bookmarks', {
        tweet_id: tweetId
      });

      const result: BookmarkResult = {
        tweetId,
        bookmarked: response.data.bookmarked,
        timestamp: new Date().toISOString(),
        success: response.data.bookmarked
      };

      // エンゲージメント履歴記録
      if (result.success) {
        await this.recordEngagementAction({
          id: `bookmark_${Date.now()}`,
          type: 'bookmark',
          tweetId,
          timestamp: result.timestamp,
          success: true
        });
      }

      console.log(`${result.success ? '✅' : '❌'} ブックマーク${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ ブックマークエラー:', error);
      
      return {
        tweetId,
        bookmarked: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ブックマーク取り消し
   * 指定されたツイートのブックマークを取り消す
   */
  async unbookmarkTweet(tweetId: string): Promise<UnbookmarkResult> {
    try {
      console.log('🔖❌ ブックマーク取り消し実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.delete<{
        data: {
          bookmarked: boolean;
        }
      }>(`/users/me/bookmarks/${tweetId}`);

      const result: UnbookmarkResult = {
        tweetId,
        unbookmarked: !response.data.bookmarked,
        timestamp: new Date().toISOString(),
        success: !response.data.bookmarked
      };

      // エンゲージメント履歴記録
      if (result.success) {
        await this.recordEngagementAction({
          id: `unbookmark_${Date.now()}`,
          type: 'unbookmark',
          tweetId,
          timestamp: result.timestamp,
          success: true
        });
      }

      console.log(`${result.success ? '✅' : '❌'} ブックマーク取り消し${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ ブックマーク取り消しエラー:', error);
      
      return {
        tweetId,
        unbookmarked: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // ENGAGEMENT ANALYTICS METHODS
  // ============================================================================

  /**
   * エンゲージメント統計取得
   * 指定されたツイートのエンゲージメント情報を取得
   */
  async getEngagementStats(tweetId: string): Promise<EngagementStats> {
    try {
      console.log('📊 エンゲージメント統計取得中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // ツイート情報取得
      const tweetResponse = await this.httpClient.get<{
        data: {
          id: string;
          public_metrics: {
            retweet_count: number;
            like_count: number;
            quote_count: number;
            reply_count: number;
            impression_count: number;
            bookmark_count?: number;
          };
        }
      }>(`/tweets/${tweetId}`, {
        'tweet.fields': 'public_metrics'
      });

      // ユーザーのインタラクション状況確認
      const userInteractions = await this.getUserInteractions(tweetId);

      const stats: EngagementStats = {
        tweetId,
        metrics: {
          likeCount: tweetResponse.data.public_metrics.like_count,
          retweetCount: tweetResponse.data.public_metrics.retweet_count,
          quoteCount: tweetResponse.data.public_metrics.quote_count,
          replyCount: tweetResponse.data.public_metrics.reply_count,
          impressionCount: tweetResponse.data.public_metrics.impression_count,
          bookmarkCount: tweetResponse.data.public_metrics.bookmark_count || 0
        },
        userInteractions,
        timestamp: new Date().toISOString()
      };

      console.log('✅ エンゲージメント統計取得完了:', { 
        tweetId,
        likes: stats.metrics.likeCount,
        retweets: stats.metrics.retweetCount
      });

      return stats;

    } catch (error) {
      console.error('❌ エンゲージメント統計取得エラー:', error);
      throw new Error(`Failed to get engagement stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * エンゲージメント履歴取得
   * 指定期間内のエンゲージメント履歴を取得
   */
  async getEngagementHistory(
    startTime?: string,
    endTime?: string
  ): Promise<EngagementHistory> {
    try {
      console.log('📚 エンゲージメント履歴取得中...');

      const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // デフォルト24時間前
      const end = endTime || new Date().toISOString();

      // 期間内の履歴フィルタリング
      const filteredActions = this.engagementHistory.filter(action => {
        const actionTime = new Date(action.timestamp);
        return actionTime >= new Date(start) && actionTime <= new Date(end);
      });

      // サマリー計算
      const summary = {
        likes: filteredActions.filter(a => a.type === 'like' && a.success).length,
        retweets: filteredActions.filter(a => a.type === 'retweet' && a.success).length,
        bookmarks: filteredActions.filter(a => a.type === 'bookmark' && a.success).length,
        quotes: filteredActions.filter(a => a.type === 'quote' && a.success).length,
        replies: filteredActions.filter(a => a.type === 'reply' && a.success).length
      };

      const history: EngagementHistory = {
        userId: 'me', // 現在のユーザー
        actions: filteredActions,
        totalActions: filteredActions.length,
        timeRange: {
          startTime: start,
          endTime: end
        },
        summary,
        timestamp: new Date().toISOString()
      };

      console.log('✅ エンゲージメント履歴取得完了:', { 
        totalActions: history.totalActions,
        likes: summary.likes,
        retweets: summary.retweets
      });

      return history;

    } catch (error) {
      console.error('❌ エンゲージメント履歴取得エラー:', error);
      throw new Error(`Failed to get engagement history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * 一括いいね実行
   * 複数のツイートに対して一括でいいねを実行
   */
  async bulkLikeTweets(tweetIds: string[]): Promise<BulkEngagementResult> {
    const startTime = Date.now();
    
    try {
      console.log('❤️📦 一括いいね実行中...', { count: tweetIds.length });

      if (!tweetIds || tweetIds.length === 0) {
        throw new Error('Tweet IDs are required');
      }

      if (tweetIds.length > 50) {
        throw new Error('Maximum 50 tweets allowed for bulk like operation');
      }

      const results: Array<{
        tweetId: string;
        action: string;
        success: boolean;
        error?: string;
      }> = [];

      let successful = 0;
      let failed = 0;

      // 順次処理（レート制限考慮）
      for (const tweetId of tweetIds) {
        try {
          const result = await this.likeTweet(tweetId);
          
          results.push({
            tweetId,
            action: 'like',
            success: result.success,
            error: result.error
          });

          if (result.success) {
            successful++;
          } else {
            failed++;
          }

          // レート制限対策で少し待機
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          results.push({
            tweetId,
            action: 'like',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      const bulkResult: BulkEngagementResult = {
        totalProcessed: tweetIds.length,
        successful,
        failed,
        results,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      console.log('✅ 一括いいね完了:', { 
        total: bulkResult.totalProcessed,
        successful: bulkResult.successful,
        failed: bulkResult.failed,
        duration: `${bulkResult.duration}ms`
      });

      return bulkResult;

    } catch (error) {
      console.error('❌ 一括いいねエラー:', error);
      throw new Error(`Failed to bulk like tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * ユーザーインタラクション状況取得
   */
  private async getUserInteractions(tweetId: string): Promise<{
    liked: boolean;
    retweeted: boolean;
    bookmarked: boolean;
    quoted: boolean;
    replied: boolean;
  }> {
    try {
      // 実際のAPIでは複数のエンドポイントを呼び出してインタラクション状況を確認
      // ここではシンプルな実装
      
      const interactions = {
        liked: false,
        retweeted: false,
        bookmarked: false,
        quoted: false,
        replied: false
      };

      // 履歴から確認
      const likeAction = this.engagementHistory.find(
        action => action.tweetId === tweetId && action.type === 'like' && action.success
      );
      if (likeAction) {
        interactions.liked = true;
      }

      const retweetAction = this.engagementHistory.find(
        action => action.tweetId === tweetId && action.type === 'retweet' && action.success
      );
      if (retweetAction) {
        interactions.retweeted = true;
      }

      const bookmarkAction = this.engagementHistory.find(
        action => action.tweetId === tweetId && action.type === 'bookmark' && action.success
      );
      if (bookmarkAction) {
        interactions.bookmarked = true;
      }

      return interactions;

    } catch (error) {
      console.error('❌ ユーザーインタラクション取得エラー:', error);
      return {
        liked: false,
        retweeted: false,
        bookmarked: false,
        quoted: false,
        replied: false
      };
    }
  }

  /**
   * エンゲージメントアクション記録
   */
  private async recordEngagementAction(action: EngagementAction): Promise<void> {
    try {
      this.engagementHistory.push(action);
      
      // 履歴サイズ制限（最新1000件を保持）
      if (this.engagementHistory.length > 1000) {
        this.engagementHistory = this.engagementHistory.slice(-1000);
      }
      
      console.log(`📝 エンゲージメントアクション記録: ${action.type} - ${action.tweetId}`);

    } catch (error) {
      console.error('❌ エンゲージメントアクション記録エラー:', error);
    }
  }

  /**
   * いいね状態確認
   */
  async checkLikeStatus(tweetId: string): Promise<boolean> {
    try {
      const stats = await this.getEngagementStats(tweetId);
      return stats.userInteractions.liked;
    } catch (error) {
      console.error('❌ いいね状態確認エラー:', error);
      return false;
    }
  }

  /**
   * ブックマーク状態確認
   */
  async checkBookmarkStatus(tweetId: string): Promise<boolean> {
    try {
      const stats = await this.getEngagementStats(tweetId);
      return stats.userInteractions.bookmarked;
    } catch (error) {
      console.error('❌ ブックマーク状態確認エラー:', error);
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  LikeResult,
  UnlikeResult,
  BookmarkResult,
  UnbookmarkResult,
  EngagementStats,
  EngagementHistory,
  EngagementAction,
  BulkEngagementResult,
  EngagementEndpoints
};

/**
 * 使用例:
 * 
 * ```typescript
 * const engagementEndpoints = new EngagementEndpoints(config, httpClient);
 * 
 * // いいね実行
 * const likeResult = await engagementEndpoints.likeTweet('123456789');
 * 
 * // ブックマーク実行
 * const bookmarkResult = await engagementEndpoints.bookmarkTweet('123456789');
 * 
 * // エンゲージメント統計取得
 * const stats = await engagementEndpoints.getEngagementStats('123456789');
 * 
 * // 一括いいね
 * const bulkResult = await engagementEndpoints.bulkLikeTweets([
 *   '123456789', '987654321', '456789123'
 * ]);
 * 
 * // エンゲージメント履歴取得
 * const history = await engagementEndpoints.getEngagementHistory();
 * ```
 */