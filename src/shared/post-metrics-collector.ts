/**
 * 投稿メトリクス取得機能
 * MVP要件: 深夜分析用の投稿エンゲージメントメトリクス一括取得
 * 
 * 機能概要:
 * - 最新50件の自分の投稿のエンゲージメント率を計算
 * - KaitoAPIの/twitter/tweetsエンドポイントを使用
 * - パフォーマンス要件: 50件処理を30秒以内で完了
 */

import { KaitoTwitterAPIClient } from '../kaito-api';
import { TweetData } from '../kaito-api/utils/types';

// ============================================================================
// 型定義
// ============================================================================

/**
 * 投稿メトリクスデータ
 * 深夜分析用の包括的なメトリクスデータ構造
 */
export interface PostMetricsData {
  posts: PostMetric[];
  summary: {
    totalPosts: number;
    avgEngagementRate: number;
    timeframe: string;
    generatedAt: string;
  };
}

/**
 * 個別投稿メトリクス
 * 各投稿のエンゲージメントデータと分析結果
 */
export interface PostMetric {
  id: string;
  text: string;
  timestamp: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions: number;
    views: number;
  };
  engagementRate: number;
  performanceLevel: 'high' | 'medium' | 'low'; // 3.0%以上、1.5-3.0%、1.5%未満
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * 投稿メトリクス収集メイン関数
 * 最新50件の自分の投稿のエンゲージメントメトリクスを取得
 * 
 * @param kaitoClient - KaitoTwitterAPIクライアント
 * @returns 投稿メトリクスデータ
 */
export async function collectPostMetrics(
  kaitoClient: KaitoTwitterAPIClient
): Promise<PostMetricsData> {
  const startTime = Date.now();
  
  try {
    console.log(`📊 投稿メトリクス収集開始`);
    
    // 1. 最新投稿ID取得
    const postIds = await getLatestPostIds(kaitoClient, 50);
    console.log(`📋 ${postIds.length}件の投稿IDを取得`);
    
    if (postIds.length === 0) {
      console.warn('⚠️ 投稿が見つかりませんでした');
      return createEmptyMetricsData();
    }
    
    // 2. メトリクス一括取得
    const tweets = await fetchMetricsBatch(kaitoClient, postIds);
    console.log(`✅ ${tweets.length}件のメトリクスを取得`);
    
    // 3. メトリクスデータ変換
    const posts = tweets.map(tweet => transformToPostMetric(tweet));
    
    // 4. サマリー計算
    const avgEngagementRate = calculateAverageEngagementRate(posts);
    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`✅ メトリクス取得完了: 平均エンゲージメント率 ${avgEngagementRate.toFixed(2)}% (${elapsedTime}秒)`);
    
    return {
      posts,
      summary: {
        totalPosts: posts.length,
        avgEngagementRate,
        timeframe: `最新${posts.length}件`,
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`❌ メトリクス取得エラー: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// ============================================================================
// 内部ヘルパー関数
// ============================================================================

/**
 * 最新投稿ID取得
 * 自分の最新N件の投稿IDを取得
 * 
 * @param kaitoClient - KaitoTwitterAPIクライアント
 * @param limit - 取得件数（最大50）
 * @returns 投稿ID配列
 */
async function getLatestPostIds(
  kaitoClient: KaitoTwitterAPIClient, 
  limit: number = 50
): Promise<string[]> {
  try {
    // 環境変数からユーザー名取得
    const username = process.env.X_USERNAME;
    if (!username) {
      throw new Error('X_USERNAME環境変数が設定されていません');
    }
    
    // from:username検索クエリで自分の投稿を取得
    const searchQuery = `from:${username}`;
    console.log(`🔍 検索クエリ: ${searchQuery}`);
    
    const searchResult = await kaitoClient.searchTweets(searchQuery, {
      maxResults: limit
    });
    
    if (!searchResult.success || !searchResult.tweets) {
      console.warn('⚠️ 投稿検索に失敗しました');
      return [];
    }
    
    // 投稿IDのみ抽出
    const postIds = searchResult.tweets
      .map(tweet => tweet.id)
      .filter(id => id && id.length > 0)
      .slice(0, limit);
    
    return postIds;
    
  } catch (error) {
    console.error('❌ 最新投稿ID取得エラー:', error);
    return [];
  }
}

/**
 * メトリクス一括取得
 * 複数の投稿IDからメトリクス情報を一括取得
 * 
 * @param kaitoClient - KaitoTwitterAPIクライアント
 * @param tweetIds - 投稿ID配列
 * @returns ツイートデータ配列
 */
async function fetchMetricsBatch(
  kaitoClient: KaitoTwitterAPIClient,
  tweetIds: string[]
): Promise<TweetData[]> {
  try {
    console.log(`🔍 メトリクス一括取得: ${tweetIds.length}件`);
    
    // TwitterAPI.ioのgetTweetsByIdsエンドポイントを使用
    // このエンドポイントは最大100件のツイートIDを一度に処理可能
    const result = await kaitoClient.getTweetsByIds(tweetIds);
    
    if (!result.success || !result.tweets) {
      console.warn('⚠️ メトリクス一括取得に失敗しました');
      return [];
    }
    
    console.log(`✅ メトリクス取得成功: ${result.tweets.length}件取得`);
    
    // 取得したツイートを返す
    return result.tweets;
    
  } catch (error) {
    console.error('❌ メトリクス一括取得エラー:', error);
    // エラー時は部分的なデータでも継続
    return [];
  }
}

/**
 * ツイートデータをPostMetricに変換
 * 
 * @param tweet - ツイートデータ
 * @returns 投稿メトリクス
 */
function transformToPostMetric(tweet: TweetData): PostMetric {
  const metrics = {
    likes: tweet.public_metrics?.like_count || 0,
    retweets: tweet.public_metrics?.retweet_count || 0,
    replies: tweet.public_metrics?.reply_count || 0,
    quotes: tweet.public_metrics?.quote_count || 0,
    impressions: tweet.public_metrics?.impression_count || 0,
    views: tweet.public_metrics?.impression_count || 0  // viewsはimpression_countと同じ
  };
  
  const engagementRate = calculateEngagementRate(metrics);
  const performanceLevel = determinePerformanceLevel(engagementRate);
  
  return {
    id: tweet.id,
    text: tweet.text || '',
    timestamp: tweet.created_at || new Date().toISOString(),
    metrics,
    engagementRate,
    performanceLevel
  };
}

/**
 * エンゲージメント率計算
 * 
 * @param metrics - メトリクスデータ
 * @returns エンゲージメント率（%）
 */
function calculateEngagementRate(metrics: {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions: number;
  views: number;
}): number {
  // ゼロ除算回避
  if (metrics.impressions === 0) {
    return 0;
  }
  
  // 引用ツイートもエンゲージメントに含める
  const totalEngagement = metrics.likes + metrics.retweets + metrics.replies + metrics.quotes;
  const engagementRate = (totalEngagement / metrics.impressions) * 100;
  
  // 小数点第2位まで
  return Math.round(engagementRate * 100) / 100;
}

/**
 * パフォーマンスレベル判定
 * 
 * @param engagementRate - エンゲージメント率（%）
 * @returns パフォーマンスレベル
 */
function determinePerformanceLevel(engagementRate: number): 'high' | 'medium' | 'low' {
  if (engagementRate >= 3.0) {
    return 'high';
  } else if (engagementRate >= 1.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * 平均エンゲージメント率計算
 * 
 * @param posts - 投稿メトリクス配列
 * @returns 平均エンゲージメント率（%）
 */
function calculateAverageEngagementRate(posts: PostMetric[]): number {
  if (posts.length === 0) {
    return 0;
  }
  
  const totalRate = posts.reduce((sum, post) => sum + post.engagementRate, 0);
  const avgRate = totalRate / posts.length;
  
  // 小数点第2位まで
  return Math.round(avgRate * 100) / 100;
}

/**
 * 空のメトリクスデータ作成
 * エラー時やデータが無い場合のフォールバック
 * 
 * @returns 空のメトリクスデータ
 */
function createEmptyMetricsData(): PostMetricsData {
  return {
    posts: [],
    summary: {
      totalPosts: 0,
      avgEngagementRate: 0,
      timeframe: '最新0件',
      generatedAt: new Date().toISOString()
    }
  };
}

// ============================================================================
// エクスポート
// ============================================================================

export {
  collectPostMetrics as default
};