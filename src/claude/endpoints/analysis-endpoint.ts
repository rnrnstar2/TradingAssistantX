/**
 * Claude Code SDK 分析エンドポイント - パフォーマンス・市場コンテキスト統合分析
 * REQUIREMENTS.md準拠版 - エンドポイント別設計
 * 既存のmarket-analyzer.ts、performance-tracker.tsから機能統合
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { 
  AnalysisInput, 
  AnalysisResult, 
  PerformanceMetrics, 
  ExecutionRecord, 
  LearningInsight,
  BasicMarketContext 
} from '../types';
// import { SearchEngine } from '../../kaito-api/search-engine';
// import { KaitoTwitterAPIClient } from '../../kaito-api/core/client';

// ============================================================================
// EXTENDED TYPES - 追加型定義
// ============================================================================

/**
 * 市場分析入力型
 */
export interface MarketAnalysisInput {
  timeframe?: string;
  context?: BasicMarketContext;
  options?: {
    includeOpportunities?: boolean;
    maxInsights?: number;
  };
}

/**
 * 市場コンテキスト返却型
 */
export interface MarketContext {
  sentiment: 'bearish' | 'neutral' | 'bullish';
  volatility: 'low' | 'medium' | 'high';
  trendingTopics: string[];
  opportunities: MarketOpportunity[];
  timestamp: string;
}

/**
 * 市場機会
 */
export interface MarketOpportunity {
  topic: string;
  relevance: number;
  suggested_action: 'post' | 'engage' | 'monitor';
  reasoning: string;
}

// ============================================================================
// INTERNAL STATE - 内部状態管理（関数ベース）
// ============================================================================

let executionRecords: ExecutionRecord[] = [];
const MAX_RECORDS = 100;

// ============================================================================
// MAIN ANALYSIS ENDPOINTS - メイン分析エンドポイント
// ============================================================================

/**
 * 分析エンドポイント - パフォーマンス・市場コンテキスト統合分析
 * 指示書要件：analyzePerformance(input: AnalysisInput): Promise<AnalysisResult>
 */
export async function analyzePerformance(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    console.log('📈 パフォーマンス分析開始:', input.analysisType);

    if (input.analysisType === 'performance') {
      return await executePerformanceAnalysis(input);
    } else if (input.analysisType === 'market') {
      return await executeMarketAnalysis(input);
    } else {
      return await executeTrendAnalysis(input);
    }

  } catch (error) {
    console.error('❌ パフォーマンス分析エラー:', error);
    throw error;
  }
}

/**
 * 市場コンテキスト分析 - 基本的な市場情報収集・分析
 * 指示書要件：analyzeMarketContext(input: MarketAnalysisInput): Promise<MarketContext>
 */
export async function analyzeMarketContext(input: MarketAnalysisInput): Promise<MarketContext> {
  try {
    console.log('📊 市場コンテキスト分析開始', input.timeframe || 'default');

    // 基本市場情報収集（market-analyzer.tsから統合）
    const [trendData, sentimentInfo] = await Promise.allSettled([
      collectTrendData(),
      estimateBasicSentiment()
    ]);

    const trends = trendData.status === 'fulfilled' ? trendData.value : [];
    const sentiment = sentimentInfo.status === 'fulfilled' ? sentimentInfo.value : 'neutral';

    const context: MarketContext = {
      sentiment,
      volatility: estimateVolatility(trends),
      trendingTopics: extractRelevantTopics(trends),
      opportunities: analyzeMarketOpportunities({
        sentiment,
        volatility: estimateVolatility(trends),
        trendingTopics: extractRelevantTopics(trends),
        timestamp: new Date().toISOString()
      }),
      timestamp: new Date().toISOString()
    };

    console.log('✅ 市場コンテキスト分析完了:', {
      sentiment: context.sentiment,
      topics: context.trendingTopics.length,
      opportunities: context.opportunities.length
    });

    return context;

  } catch (error) {
    console.error('❌ 市場コンテキスト分析エラー:', error);
    throw error;
  }
}

/**
 * 実行結果記録 - 学習データとしての記録・蓄積
 * 指示書要件：recordExecution(record: ExecutionRecord): void
 */
export function recordExecution(record: ExecutionRecord): void {
  try {
    executionRecords.push(record);
    
    // レコード数制限管理
    if (executionRecords.length > MAX_RECORDS) {
      executionRecords = executionRecords.slice(-MAX_RECORDS);
    }

    console.log(`📊 実行記録追加: ${record.action} (${record.success ? 'success' : 'failed'})`);
  } catch (error) {
    console.error('実行記録追加失敗:', error);
  }
}


/**
 * 学習インサイト生成
 * performance-tracker.tsから統合
 */
export function generateLearningInsights(): LearningInsight[] {
  try {
    console.log('🧠 学習インサイト生成開始');

    const insights: LearningInsight[] = [];
    
    if (executionRecords.length === 0) {
      return [];
    }

    // 最成功アクション分析
    const bestAction = findBestPerformingAction();
    if (bestAction) {
      insights.push({
        pattern: `${bestAction.action}_success`,
        success_rate: bestAction.success_rate,
        recommendation: `${bestAction.action}アクションの成功率が高いです（${Math.round(bestAction.success_rate * 100)}%）`,
        confidence: 0.8
      });
    }

    // 最近の傾向分析
    const recentTrend = analyzeRecentTrend();
    if (recentTrend) {
      insights.push(recentTrend);
    }

    return insights.slice(0, 3);

  } catch (error) {
    console.error('❌ 学習インサイト生成エラー:', error);
    return [];
  }
}

/**
 * パフォーマンスメトリクス取得
 * performance-tracker.tsから統合
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  try {
    if (executionRecords.length === 0) {
      return createEmptyMetrics();
    }

    const totalExecutions = executionRecords.length;
    const successfulExecutions = executionRecords.filter(r => r.success).length;
    const successRate = successfulExecutions / totalExecutions;

    return {
      total_executions: totalExecutions,
      success_rate: Math.round(successRate * 100) / 100,
      action_breakdown: analyzeActionBreakdown(),
      recent_insights: generateLearningInsights(),
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('パフォーマンスメトリクス取得失敗:', error);
    return createEmptyMetrics();
  }
}

// ============================================================================
// ANALYSIS EXECUTION FUNCTIONS - 分析実行機能
// ============================================================================

/**
 * パフォーマンス分析実行
 */
async function executePerformanceAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const metrics = getPerformanceMetrics();
  const claudeAnalysis = await executeClaudePerformanceAnalysis(metrics);
  
  return {
    analysisType: 'performance',
    insights: claudeAnalysis.insights,
    recommendations: claudeAnalysis.recommendations,
    confidence: claudeAnalysis.confidence,
    metadata: {
      dataPoints: metrics.total_executions,
      timeframe: input.timeframe || 'historical',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * 市場分析実行
 */
async function executeMarketAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const marketContext = await collectMarketContext(input);
  const claudeAnalysis = await executeClaudeMarketAnalysis(marketContext);
  
  return {
    analysisType: 'market',
    insights: claudeAnalysis.insights,
    recommendations: claudeAnalysis.recommendations,
    confidence: claudeAnalysis.confidence,
    metadata: {
      dataPoints: Object.keys(marketContext).length,
      timeframe: input.timeframe || '24h',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * トレンド分析実行
 */
async function executeTrendAnalysis(_input: AnalysisInput): Promise<AnalysisResult> {
  const trendData = await collectTrendData();
  
  return {
    analysisType: 'trend',
    insights: [`トレンド数: ${trendData.length}`, '投資関連トピック抽出済み'],
    recommendations: ['継続的なトレンド監視を推奨'],
    confidence: 0.7,
    metadata: {
      dataPoints: trendData.length,
      timeframe: _input.timeframe || '1h',
      generatedAt: new Date().toISOString()
    }
  };
}

// ============================================================================
// MARKET ANALYSIS FUNCTIONS - 市場分析機能（market-analyzer.tsから統合）
// ============================================================================

/**
 * 市場コンテキスト収集
 */
async function collectMarketContext(input: AnalysisInput): Promise<any> {
  try {
    const context: any = {
      timestamp: new Date().toISOString(),
      inputData: input.data,
      context: input.context
    };

    // 基本トレンドデータ収集
    const trendData = await collectTrendData();
    context.trends = trendData;
    context.sentiment = await estimateBasicSentiment();

    return context;
  } catch (error) {
    console.warn('市場コンテキスト収集失敗、フォールバック使用');
    return { timestamp: new Date().toISOString(), fallback: true };
  }
}

/**
 * トレンドデータ収集
 */
async function collectTrendData(): Promise<any[]> {
  try {
    // 実際のAPIがある場合は外部検索エンジンを使用
    // 現在はモックデータ
    return [
      { topic: '投資信託', name: '投資信託', volume: 100 },
      { topic: 'NISA', name: 'NISA', volume: 80 },
      { topic: '株式投資', name: '株式投資', volume: 60 }
    ];
  } catch (error) {
    console.warn('トレンドデータ収集失敗');
    return [];
  }
}

/**
 * 基本センチメント推定
 */
async function estimateBasicSentiment(): Promise<'bearish' | 'neutral' | 'bullish'> {
  try {
    // 基本的なセンチメント分析（簡略版）
    return 'neutral';
  } catch (error) {
    console.warn('センチメント推定失敗、中立を返す');
    return 'neutral';
  }
}

/**
 * ボラティリティ推定
 */
function estimateVolatility(trends: any[]): 'low' | 'medium' | 'high' {
  const trendCount = trends.length;
  const volatileKeywords = ['急騰', '暴落', '急落', '高騰'];
  const hasVolatileKeywords = trends.some(trend => 
    volatileKeywords.some(keyword => 
      (trend.topic || trend.name || '').includes(keyword)
    )
  );

  if (hasVolatileKeywords || trendCount > 10) return 'high';
  if (trendCount > 5) return 'medium';
  return 'low';
}

/**
 * 関連トピック抽出
 */
function extractRelevantTopics(trends: any[]): string[] {
  const investmentKeywords = ['投資', '資産', '株', '債券', 'NISA', 'iDeCo', '金融', '経済'];
  
  return trends
    .filter(trend => {
      const topicText = trend.topic || trend.name || '';
      return investmentKeywords.some(keyword => topicText.includes(keyword));
    })
    .map(trend => trend.topic || trend.name)
    .slice(0, 5);
}

/**
 * 市場機会分析
 */
function analyzeMarketOpportunities(context: BasicMarketContext): MarketOpportunity[] {
  try {
    const opportunities: MarketOpportunity[] = [];

    // トレンドトピック分析
    context.trendingTopics.forEach(topic => {
      const relevance = calculateTopicRelevance(topic);
      if (relevance > 0.6) {
        opportunities.push({
          topic,
          relevance,
          suggested_action: suggestActionForTopic(topic, context),
          reasoning: `投資教育との関連度: ${Math.round(relevance * 100)}%`
        });
      }
    });

    // センチメントベース機会
    if (context.sentiment === 'bullish' && context.volatility === 'low') {
      opportunities.push({
        topic: '市場教育コンテンツ',
        relevance: 0.8,
        suggested_action: 'post',
        reasoning: 'ポジティブな市場環境で教育コンテンツに最適'
      });
    }

    return opportunities.slice(0, 3);
  } catch (error) {
    console.error('市場機会分析エラー:', error);
    return [];
  }
}

/**
 * トピック関連度計算
 */
function calculateTopicRelevance(topic: string): number {
  let relevance = 0.3; // ベース関連度

  const highRelevanceKeywords = ['投資', '資産運用', 'NISA'];
  const mediumRelevanceKeywords = ['株式', '債券', '金融', '経済'];

  if (highRelevanceKeywords.some(keyword => topic.includes(keyword))) {
    relevance += 0.4;
  } else if (mediumRelevanceKeywords.some(keyword => topic.includes(keyword))) {
    relevance += 0.2;
  }

  return Math.min(relevance, 1.0);
}

/**
 * トピック別アクション提案
 */
function suggestActionForTopic(topic: string, context: BasicMarketContext): 'post' | 'engage' | 'monitor' {
  const relevance = calculateTopicRelevance(topic);
  
  if (relevance > 0.8 && context.sentiment !== 'bearish') {
    return 'post';
  } else if (relevance > 0.6) {
    return 'engage';
  } else {
    return 'monitor';
  }
}

// ============================================================================
// CLAUDE ANALYSIS FUNCTIONS - Claude分析機能
// ============================================================================

/**
 * Claude市場分析実行
 */
async function executeClaudeMarketAnalysis(context: any): Promise<{
  insights: string[];
  recommendations: string[];
  confidence: number;
}> {
  const prompt = `投資教育X自動化システムの市場分析を行ってください。

市場コンテキスト:
${JSON.stringify(context, null, 2)}

以下の観点から分析してください:
1. 市場センチメント分析
2. 投資教育コンテンツの最適なタイミング
3. エンゲージメント機会の識別
4. リスク要因とその対策

JSON形式で回答してください:
{
  "insights": ["洞察1", "洞察2", "洞察3"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "confidence": 0.8
}`;

  try {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();

    return parseAnalysisResponse(response, 'market');
  } catch (error) {
    console.error('Claude市場分析失敗:', error);
    return {
      insights: ['市場分析でエラーが発生しました'],
      recommendations: ['後でもう一度お試しください'],
      confidence: 0.3
    };
  }
}

/**
 * Claudeパフォーマンス分析実行
 */
async function executeClaudePerformanceAnalysis(metrics: PerformanceMetrics): Promise<{
  insights: string[];
  recommendations: string[];
  confidence: number;
}> {
  const prompt = `投資教育X自動化システムのパフォーマンス分析を行ってください。

パフォーマンスメトリクス:
${JSON.stringify(metrics, null, 2)}

以下の観点から分析してください:
1. 成功率の傾向分析
2. アクション別パフォーマンス評価
3. 改善すべき領域の特定
4. 継続的改善のための推奨事項

JSON形式で回答してください:
{
  "insights": ["洞察1", "洞察2", "洞察3"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "confidence": 0.8
}`;

  try {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(15000)
      .query(prompt)
      .asText();

    return parseAnalysisResponse(response, 'performance');
  } catch (error) {
    console.error('Claudeパフォーマンス分析失敗:', error);
    return {
      insights: ['パフォーマンス分析でエラーが発生しました'],
      recommendations: ['システムの見直しを検討してください'],
      confidence: 0.3
    };
  }
}

/**
 * 分析応答解析
 */
function parseAnalysisResponse(response: string, type: string): {
  insights: string[];
  recommendations: string[];
  confidence: number;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights : ['分析結果の解析に失敗'],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['推奨事項の取得に失敗'],
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1)
      };
    }
  } catch (error) {
    console.error(`${type}分析応答解析失敗:`, error);
  }
  
  return {
    insights: [`${type}分析の応答解析に失敗しました`],
    recommendations: ['後でもう一度お試しください'],
    confidence: 0.3
  };
}

// ============================================================================
// PERFORMANCE ANALYSIS FUNCTIONS - パフォーマンス分析機能（performance-tracker.tsから統合）
// ============================================================================

/**
 * アクション別分析
 */
function analyzeActionBreakdown(): { [action: string]: { count: number; success_rate: number } } {
  const breakdown: { [action: string]: { count: number; success_rate: number } } = {};

  executionRecords.forEach(record => {
    if (!breakdown[record.action]) {
      breakdown[record.action] = { count: 0, success_rate: 0 };
    }
    breakdown[record.action].count++;
  });

  Object.keys(breakdown).forEach(action => {
    const actionRecords = executionRecords.filter(r => r.action === action);
    const successCount = actionRecords.filter(r => r.success).length;
    breakdown[action].success_rate = successCount / actionRecords.length;
  });

  return breakdown;
}

/**
 * 最高パフォーマンスアクション検索
 */
function findBestPerformingAction(): { action: string; success_rate: number } | null {
  const breakdown = analyzeActionBreakdown();
  let bestAction: { action: string; success_rate: number } | null = null;

  Object.entries(breakdown).forEach(([action, stats]) => {
    if (stats.count >= 3 && (!bestAction || stats.success_rate > bestAction.success_rate)) {
      bestAction = { action, success_rate: stats.success_rate };
    }
  });

  return bestAction;
}

/**
 * 最近の傾向分析
 */
function analyzeRecentTrend(): LearningInsight | null {
  if (executionRecords.length < 10) return null;

  const recent = executionRecords.slice(-10);
  const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
  const overall = executionRecords.filter(r => r.success).length / executionRecords.length;

  if (recentSuccessRate > overall + 0.1) {
    return {
      pattern: 'improving_trend',
      success_rate: recentSuccessRate,
      recommendation: '最近のパフォーマンスが向上しています',
      confidence: 0.7
    };
  } else if (recentSuccessRate < overall - 0.1) {
    return {
      pattern: 'declining_trend',
      success_rate: recentSuccessRate,
      recommendation: '最近のパフォーマンスが低下しています',
      confidence: 0.7
    };
  }

  return null;
}

/**
 * 改善提案生成
 */
export function generateImprovementSuggestions(): string[] {
  try {
    const suggestions: string[] = [];
    const metrics = getPerformanceMetrics();

    // 成功率ベースの提案
    if (metrics.success_rate < 0.7) {
      suggestions.push('全体的な成功率が低いため、判断基準の見直しを推奨します');
    }

    // アクション別提案
    Object.entries(metrics.action_breakdown).forEach(([action, stats]) => {
      if (stats.success_rate < 0.5 && stats.count > 5) {
        suggestions.push(`${action}の成功率が低いため、実行条件の調整を検討してください`);
      }
    });

    return suggestions.slice(0, 3);
  } catch (error) {
    console.error('Failed to generate improvement suggestions:', error);
    return ['システム分析でエラーが発生しました'];
  }
}

/**
 * 空メトリクス作成
 */
function createEmptyMetrics(): PerformanceMetrics {
  return {
    total_executions: 0,
    success_rate: 0,
    action_breakdown: {},
    recent_insights: [],
    last_updated: new Date().toISOString()
  };
}