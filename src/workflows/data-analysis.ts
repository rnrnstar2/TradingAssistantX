/**
 * データ分析ワークフロー
 * KaitoAPIで収集したデータをClaude分析エンドポイントで前処理し、
 * 統合されたインサイトを生成する
 */

import { 
  analyzeTargetQueryResults, 
  analyzeReferenceUserTweets 
} from '../claude/endpoints/data-analysis-endpoint';
import { 
  TargetQueryInsights, 
  ReferenceUserInsights, 
  CombinedAnalysisInsights, 
  SystemContext 
} from '../claude/types';
import { KaitoTwitterAPIClient } from '../kaito-api';
import { TweetData } from '../kaito-api/utils/types';

// ============================================================================
// TYPES - 型定義
// ============================================================================

interface DataAnalysisParams {
  targetQuery?: string;
  referenceUsers?: string[];
  topic: string;
  context?: SystemContext;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION - メイン分析関数
// ============================================================================

/**
 * データ分析の実行
 * target_query分析とreference_users分析を並列実行し、結果を統合
 * 
 * @param params 分析パラメータ
 * @returns 統合された分析インサイト
 */
export async function executeDataAnalysis(params: DataAnalysisParams): Promise<CombinedAnalysisInsights> {
  const { targetQuery, referenceUsers, topic, context } = params;
  const startTime = Date.now();

  console.log('[DataAnalysis] 分析開始', {
    targetQuery: targetQuery ? `"${targetQuery}"` : 'なし',
    referenceUsers: referenceUsers?.length || 0,
    topic
  });

  try {
    // KaitoAPIクライアントの初期化
    const kaito = new KaitoTwitterAPIClient();

    // target_query分析とreference_users分析を並列実行
    const [targetAnalysis, userAnalyses] = await Promise.all([
      targetQuery ? analyzeTargetQuery(targetQuery, topic, context, kaito) : null,
      referenceUsers ? analyzeReferenceUsers(referenceUsers, context, kaito) : []
    ]);

    // 分析結果を統合
    const combinedInsights = combineAnalysisResults(targetAnalysis, userAnalyses);

    const duration = Date.now() - startTime;
    console.log(`[DataAnalysis] 分析完了 (${duration}ms)`, {
      targetQueryInsights: !!combinedInsights.targetQueryInsights,
      referenceUserCount: combinedInsights.referenceUserInsights.length,
      actionableInsights: combinedInsights.actionableInsights.length
    });

    return combinedInsights;

  } catch (error) {
    console.error('[DataAnalysis] 分析エラー', error);
    
    // エラー時もグレースフルに処理を継続
    return {
      referenceUserInsights: [],
      overallTheme: 'データ分析中にエラーが発生しました',
      actionableInsights: []
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS - ヘルパー関数
// ============================================================================

/**
 * Target Query分析の実行
 * 検索クエリでツイートを収集し、分析エンドポイントで処理
 */
async function analyzeTargetQuery(
  query: string,
  topic: string,
  context: SystemContext | undefined,
  kaito: KaitoTwitterAPIClient
): Promise<TargetQueryInsights | null> {
  try {
    console.log(`[DataAnalysis] Target Query分析開始: "${query}"`);

    // ツイートを検索（最大100件）
    const searchResult = await kaito.searchTweets(query, {
      maxResults: 100
    });

    if (!searchResult.success || !searchResult.tweets?.length) {
      console.warn('[DataAnalysis] Target Query検索結果なし');
      return null;
    }

    const tweets = searchResult.tweets;
    console.log(`[DataAnalysis] ${tweets.length}件のツイートを分析`);

    // Claude分析エンドポイントで分析
    const insights = await analyzeTargetQueryResults({
      tweets,
      query,
      topic,
      context
    });

    return insights;

  } catch (error) {
    console.error('[DataAnalysis] Target Query分析エラー', error);
    return null;
  }
}

/**
 * Reference Users分析の並列実行
 * 各ユーザーの最新ツイートを並列で取得・分析
 */
async function analyzeReferenceUsers(
  usernames: string[],
  context: SystemContext | undefined,
  kaito: KaitoTwitterAPIClient
): Promise<ReferenceUserInsights[]> {
  console.log(`[DataAnalysis] Reference Users分析開始: ${usernames.length}人`);

  // 各ユーザーの分析を並列実行
  const analysisPromises = usernames.map(async (username) => {
    try {
      console.log(`[DataAnalysis] ${username}の分析開始`);

      // ユーザーの最新ツイートを取得（バッチAPI使用）
      const tweetsResult = await kaito.getBatchUserLastTweets([username], 20);

      if (!tweetsResult || !tweetsResult.get(username)) {
        console.warn(`[DataAnalysis] ${username}のツイート取得失敗`);
        return null;
      }

      const userTweets = tweetsResult.get(username);
      if (!userTweets || !userTweets.tweets?.length) {
        console.warn(`[DataAnalysis] ${username}のツイートなし`);
        return null;
      }

      // Claude分析エンドポイントで分析
      const insights = await analyzeReferenceUserTweets({
        tweets: userTweets.tweets,
        username,
        context
      });

      console.log(`[DataAnalysis] ${username}の分析完了`);
      return insights;

    } catch (error) {
      console.error(`[DataAnalysis] ${username}の分析エラー`, error);
      return null;
    }
  });

  // 全ユーザーの分析結果を待機
  const results = await Promise.all(analysisPromises);

  // null以外の結果のみフィルタリング
  return results.filter((result): result is ReferenceUserInsights => result !== null);
}

/**
 * 分析結果の統合
 * target_query分析とreference_users分析の結果を統合して、
 * 統一されたインサイトを生成
 */
function combineAnalysisResults(
  targetQueryInsights: TargetQueryInsights | null,
  referenceUserInsights: ReferenceUserInsights[]
): CombinedAnalysisInsights {
  // 全体的なテーマの抽出
  let overallTheme = '';
  const actionableInsights: string[] = [];

  // Target Query分析から全体テーマを抽出
  if (targetQueryInsights) {
    overallTheme = targetQueryInsights.summary;
    
    // 重要度の高いポイントを行動可能なインサイトに追加
    targetQueryInsights.keyPoints
      .filter(point => point.importance === 'critical' || point.importance === 'high')
      .forEach(point => {
        actionableInsights.push(point.point);
      });
  }

  // Reference Users分析から専門家の視点を追加
  if (referenceUserInsights.length > 0) {
    // 信頼性の高いユーザーの見解を優先
    const reliableUsers = referenceUserInsights
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, 3); // 上位3人まで

    reliableUsers.forEach(user => {
      // 高信頼度の見解を行動可能なインサイトに追加
      user.latestViews
        .filter(view => view.confidence === 'high')
        .forEach(view => {
          actionableInsights.push(`${user.username}: ${view.topic} - ${view.stance}`);
        });
    });

    // 全体テーマがない場合は、専門家の要約から生成
    if (!overallTheme && reliableUsers.length > 0) {
      overallTheme = `専門家分析: ${reliableUsers.map(u => u.summary).join(' / ')}`;
    }
  }

  // デフォルトの全体テーマ
  if (!overallTheme) {
    overallTheme = '市場分析データが不足しています';
  }

  // 重複を除去してインサイトを整理
  const uniqueInsights = Array.from(new Set(actionableInsights)).slice(0, 5);

  return {
    targetQueryInsights: targetQueryInsights || undefined,
    referenceUserInsights,
    overallTheme,
    actionableInsights: uniqueInsights
  };
}