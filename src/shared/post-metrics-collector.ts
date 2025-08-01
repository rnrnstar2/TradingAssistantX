/**
 * 投稿メトリクス取得機能
 * MVP要件: 深夜分析用の投稿エンゲージメントメトリクス一括取得
 * 
 * 機能概要:
 * - dataディレクトリから保存済み投稿データを読み込み
 * - 最新50件の自分の投稿のエンゲージメント率を計算
 * - パフォーマンス要件: 50件処理を30秒以内で完了
 */

import { KaitoTwitterAPIClient } from '../kaito-api';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

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
  };
  engagementRate: number;
  performanceLevel: 'high' | 'medium' | 'low'; // 3.0%以上、1.5-3.0%、1.5%未満
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * 投稿メトリクス収集メイン関数
 * dataディレクトリから投稿データを読み込み、最新メトリクスでAPI更新
 * 
 * @param kaitoClient - KaitoTwitterAPIクライアント（メトリクス更新用）
 * @returns 投稿メトリクスデータ
 */
export async function collectPostMetrics(
  kaitoClient?: KaitoTwitterAPIClient
): Promise<PostMetricsData> {
  const startTime = Date.now();
  
  try {
    console.log(`📊 投稿メトリクス収集開始`);
    
    // Step 1: dataディレクトリから投稿データを読み込み
    const posts = await loadPostsFromDataDirectory();
    console.log(`📋 ${posts.length}件の投稿データを取得`);
    
    if (posts.length === 0) {
      console.warn('⚠️ 投稿が見つかりませんでした');
      return createEmptyMetricsData();
    }
    
    // Step 2: 最新メトリクスで更新（深夜分析用）
    let updatedPosts = posts;
    if (kaitoClient) {
      console.log('🔄 最新メトリクスで更新中...');
      updatedPosts = await updatePostsWithLatestMetrics(posts, kaitoClient);
      console.log(`✅ ${updatedPosts.length}件のメトリクス更新完了`);
    }
    
    // サマリー計算
    const avgEngagementRate = calculateAverageEngagementRate(updatedPosts);
    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`✅ メトリクス取得完了: 平均エンゲージメント率 ${avgEngagementRate.toFixed(2)}% (${elapsedTime}秒)`);
    
    return {
      posts: updatedPosts,
      summary: {
        totalPosts: updatedPosts.length,
        avgEngagementRate,
        timeframe: `最新${updatedPosts.length}件`,
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
 * dataディレクトリから投稿データを読み込み
 * current/とhistory/から最新50件の投稿を取得
 * 
 * @returns 投稿メトリクス配列
 */
async function loadPostsFromDataDirectory(): Promise<PostMetric[]> {
  const posts: PostMetric[] = [];
  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    // 1. current/ディレクトリから読み込み
    const currentDir = path.join(dataDir, 'current');
    const currentPosts = await loadPostsFromDirectory(currentDir);
    posts.push(...currentPosts);
    
    // 2. 不足分をhistory/から読み込み
    const historyDir = path.join(dataDir, 'history');
    const targetCount = 50;
    
    if (posts.length < targetCount) {
      const historyPosts = await loadPostsFromHistoryDirectory(historyDir, targetCount - posts.length);
      posts.push(...historyPosts);
    }
    
    // 3. 時系列でソート（新しい順）
    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // 4. 最新50件に制限
    return posts.slice(0, targetCount);
    
  } catch (error) {
    console.error('❌ 投稿データ読み込みエラー:', error);
    return posts;
  }
}

/**
 * 指定ディレクトリから投稿データを読み込み
 * 
 * @param dirPath - ディレクトリパス
 * @returns 投稿メトリクス配列
 */
async function loadPostsFromDirectory(dirPath: string): Promise<PostMetric[]> {
  const posts: PostMetric[] = [];
  
  try {
    const exists = await fs.stat(dirPath).catch(() => null);
    if (!exists) return posts;
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.match(/^\d{8}-\d{4}$/)) {
        const postYamlPath = path.join(dirPath, entry.name, 'post.yaml');
        const post = await loadPostYaml(postYamlPath);
        if (post) posts.push(post);
      }
    }
    
    return posts;
  } catch (error) {
    console.error(`❌ ディレクトリ読み込みエラー: ${dirPath}`, error);
    return posts;
  }
}

/**
 * historyディレクトリから投稿データを再帰的に読み込み
 * 
 * @param historyDir - historyディレクトリパス
 * @param needed - 必要な件数
 * @returns 投稿メトリクス配列
 */
async function loadPostsFromHistoryDirectory(historyDir: string, needed: number): Promise<PostMetric[]> {
  const posts: PostMetric[] = [];
  
  try {
    const exists = await fs.stat(historyDir).catch(() => null);
    if (!exists) return posts;
    
    // 年月フォルダを取得（新しい順）
    const yearMonths = await fs.readdir(historyDir, { withFileTypes: true });
    const sortedYearMonths = yearMonths
      .filter(e => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    
    for (const yearMonth of sortedYearMonths) {
      if (posts.length >= needed) break;
      
      const ymDir = path.join(historyDir, yearMonth.name);
      const dayTimes = await fs.readdir(ymDir, { withFileTypes: true });
      const sortedDayTimes = dayTimes
        .filter(e => e.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name));
      
      for (const dayTime of sortedDayTimes) {
        if (posts.length >= needed) break;
        
        const postYamlPath = path.join(ymDir, dayTime.name, 'post.yaml');
        const post = await loadPostYaml(postYamlPath);
        if (post) posts.push(post);
      }
    }
    
    return posts;
  } catch (error) {
    console.error('❌ historyディレクトリ読み込みエラー:', error);
    return posts;
  }
}

/**
 * post.yamlファイルを読み込んでPostMetricに変換
 * 
 * @param yamlPath - YAMLファイルパス
 * @returns PostMetricまたはnull
 */
async function loadPostYaml(yamlPath: string): Promise<PostMetric | null> {
  try {
    const exists = await fs.stat(yamlPath).catch(() => null);
    if (!exists) return null;
    
    const yamlContent = await fs.readFile(yamlPath, 'utf-8');
    const data = yaml.load(yamlContent) as any;
    
    // post.yamlのデータ構造から必要な情報を抽出
    if (!data?.result?.id || !data?.timestamp) {
      return null;
    }
    
    const metrics = {
      likes: data.engagement?.likes || 0,
      retweets: data.engagement?.retweets || 0,
      replies: data.engagement?.replies || 0,
      quotes: data.engagement?.quotes || 0,
      impressions: data.engagement?.impressions || 100 // インプレッションがない場合はデフォルト値
    };
    
    const engagementRate = calculateEngagementRate(metrics);
    const performanceLevel = determinePerformanceLevel(engagementRate);
    
    return {
      id: data.result.id,
      text: data.content || '',
      timestamp: data.timestamp,
      metrics,
      engagementRate,
      performanceLevel
    };
    
  } catch (error) {
    // エラーは無視（ファイルが存在しない場合など）
    return null;
  }
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

/**
 * 最新メトリクスで投稿データを更新
 * 
 * @param posts - 元の投稿データ
 * @param kaitoClient - KaitoTwitterAPIクライアント
 * @returns 更新された投稿データ
 */
async function updatePostsWithLatestMetrics(
  posts: PostMetric[], 
  kaitoClient: KaitoTwitterAPIClient
): Promise<PostMetric[]> {
  try {
    // 投稿IDリストを作成
    const tweetIds = posts.map(post => post.id).filter(id => id && id.length > 0);
    
    if (tweetIds.length === 0) {
      console.warn('⚠️ 更新対象の投稿IDがありません');
      return posts;
    }
    
    console.log(`🔍 最新メトリクス取得中: ${tweetIds.length}件`);
    
    // KaitoAPIで最新メトリクス一括取得
    const result = await kaitoClient.getTweetsByIds(tweetIds);
    
    if (!result.success || !result.tweets) {
      console.warn('⚠️ 最新メトリクス取得失敗、元データを使用');
      return posts;
    }
    
    console.log(`📊 最新メトリクス取得成功: ${result.tweets.length}件`);
    
    // メトリクスマップを作成
    const metricsMap = new Map();
    result.tweets.forEach(tweet => {
      metricsMap.set(tweet.id, tweet.public_metrics);
    });
    
    // 投稿データを更新
    const updatedPosts = posts.map(post => {
      const latestMetrics = metricsMap.get(post.id);
      
      if (!latestMetrics) {
        console.warn(`⚠️ ID ${post.id} のメトリクスが見つかりません`);
        return post;
      }
      
      // 最新メトリクスで更新
      const updatedMetrics = {
        likes: latestMetrics.like_count || 0,
        retweets: latestMetrics.retweet_count || 0,
        replies: latestMetrics.reply_count || 0,
        quotes: latestMetrics.quote_count || 0,
        impressions: latestMetrics.impression_count || post.metrics.impressions // インプレッションがない場合は元の値を保持
      };
      
      const engagementRate = calculateEngagementRate(updatedMetrics);
      const performanceLevel = determinePerformanceLevel(engagementRate);
      
      return {
        ...post,
        metrics: updatedMetrics,
        engagementRate,
        performanceLevel
      };
    });
    
    console.log(`✅ メトリクス更新完了: ${updatedPosts.length}件`);
    return updatedPosts;
    
  } catch (error) {
    console.error('❌ 最新メトリクス更新エラー:', error);
    // エラー時は元のデータを返す
    return posts;
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export {
  collectPostMetrics as default
};