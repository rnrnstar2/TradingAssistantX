/**
 * データ分析エンドポイント - Claude強み活用高品質データ分析
 * 生データではなくインサイトをプロンプトに統合する仕組み
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { 
  TargetQueryInsights, 
  ReferenceUserInsights, 
  SystemContext, 
  PromptLogData 
} from '../types';
import { ClaudePromptLogger } from '../utils/prompt-logger';
import { DataManager } from '../../shared/data-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// CONSTANTS - 定数定義
// ============================================================================

const CLAUDE_TIMEOUT = 15000; // 15秒タイムアウト
const MAX_RETRIES = 2;
const MAX_TWEET_ANALYSIS = 100; // 最大分析ツイート数（Target Query）
const MAX_USER_TWEETS = 20; // 最大分析ツイート数（Reference User）

// ユーザー別の専門性マッピング
const USER_EXPERTISE_MAP: Record<string, string[]> = {
  "stlouisfed": ["金融政策", "FED", "金利"],
  "kathylienfx": ["FXテクニカル", "通貨相関", "市場心理"],
  "ForexLive": ["リアルタイム", "ディーラー視点", "オーダーフロー"],
  "FXStreetNews": ["経済指標", "市場ニュース", "速報"],
  "RaoulGMI": ["マクロ経済", "長期トレンド", "暗号資産"],
  "Schuldensuehner": ["ドイツ経済", "ECB", "ユーロ圏"],
  "hk_nikkei": ["日本経済", "アジア市場", "日経平均"],
  "LiveSquawk": ["リアルタイム速報", "市場フロー", "ヘッドライン"],
  "PriapusIQ": ["オプション", "ボラティリティ", "市場構造"],
  "zerohedge": ["リスク分析", "逆張り視点", "市場批判"]
};

// ============================================================================
// STRATEGY CONFIGURATION - 戦略設定
// ============================================================================

/**
 * strategy.yamlからの設定読み込み
 */
async function loadStrategyConfig() {
  try {
    const strategyPath = path.join(process.cwd(), 'data', 'config', 'strategy.yaml');
    const strategyContent = fs.readFileSync(strategyPath, 'utf8');
    const strategy = yaml.parse(strategyContent);
    
    return {
      differentiationStrategies: strategy.differentiation_strategies || {},
      fxKeywords: strategy.fx_keywords || [],
      selectionWeights: strategy.selection_weights || {}
    };
  } catch (error) {
    console.error('戦略設定の読み込みエラー:', error);
    return {
      differentiationStrategies: {},
      fxKeywords: [],
      selectionWeights: {}
    };
  }
}

// ============================================================================
// MAIN ENDPOINT FUNCTIONS - メインエンドポイント関数
// ============================================================================

/**
 * Target Query結果の分析
 * 最大100件のツイートを分析し、FX市場のトレンド・重要情報を抽出
 */
export async function analyzeTargetQueryResults(params: {
  tweets: Array<{
    id: string;
    text: string;
    author_id: string;
    public_metrics?: any;
    created_at?: string;
  }>;
  query: string;
  topic: string;
  context?: SystemContext;
}): Promise<TargetQueryInsights> {
  try {
    const { tweets, query, topic, context } = params;
    
    // ツイート数を制限
    const tweetsToAnalyze = tweets.slice(0, MAX_TWEET_ANALYSIS);
    
    // プロンプト構築
    const prompt = await buildTargetQueryAnalysisPrompt(tweetsToAnalyze, query, topic);
    
    // プロンプトログデータ準備
    const promptLogData: PromptLogData = {
      prompt_metadata: {
        endpoint: 'analyzeTargetQueryResults',
        timestamp: new Date().toISOString(),
        execution_id: context?.executionId || 'unknown',
        model: 'sonnet',
        timeout: CLAUDE_TIMEOUT
      },
      input_context: {
        query,
        topic,
        tweet_count: tweetsToAnalyze.length
      },
      system_context: context || createDefaultSystemContext(),
      full_prompt: prompt
    };
    
    // Claude SDK実行
    const startTime = Date.now();
    const analysisResult = await executeAnalysisWithRetry(prompt, 'targetQuery');
    const endTime = Date.now();
    
    // レスポンスメタデータを追加
    promptLogData.response_metadata = {
      generation_time_ms: endTime - startTime
    };
    
    // プロンプトログ保存
    await ClaudePromptLogger.logPrompt(promptLogData).catch(error => {
      console.error('プロンプトログ保存エラー:', error);
    });
    
    // 分析結果のパース
    const insights = parseTargetQueryInsights(analysisResult, tweetsToAnalyze.length);
    
    return insights;
    
  } catch (error) {
    console.error('Target Query分析エラー:', error);
    // フォールバック: 基本的な要約を返す
    return createFallbackTargetQueryInsights(params.tweets.length);
  }
}

/**
 * Reference Userツイートの分析
 * 特定ユーザーの最大20件のツイートを分析し、専門性・最新見解を抽出
 */
export async function analyzeReferenceUserTweets(params: {
  tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics?: any;
  }>;
  username: string;
  context?: SystemContext;
}): Promise<ReferenceUserInsights> {
  try {
    const { tweets, username, context } = params;
    
    // ツイート数を制限
    const tweetsToAnalyze = tweets.slice(0, MAX_USER_TWEETS);
    
    // プロンプト構築
    const prompt = buildReferenceUserAnalysisPrompt(tweetsToAnalyze, username);
    
    // プロンプトログデータ準備
    const promptLogData: PromptLogData = {
      prompt_metadata: {
        endpoint: 'analyzeReferenceUserTweets',
        timestamp: new Date().toISOString(),
        execution_id: context?.executionId || 'unknown',
        model: 'sonnet',
        timeout: CLAUDE_TIMEOUT
      },
      input_context: {
        username,
        tweet_count: tweetsToAnalyze.length
      },
      system_context: context || createDefaultSystemContext(),
      full_prompt: prompt
    };
    
    // Claude SDK実行
    const startTime = Date.now();
    const analysisResult = await executeAnalysisWithRetry(prompt, 'referenceUser');
    const endTime = Date.now();
    
    // レスポンスメタデータを追加
    promptLogData.response_metadata = {
      generation_time_ms: endTime - startTime
    };
    
    // プロンプトログ保存
    await ClaudePromptLogger.logPrompt(promptLogData).catch(error => {
      console.error('プロンプトログ保存エラー:', error);
    });
    
    // 分析結果のパース
    const insights = parseReferenceUserInsights(analysisResult, username, tweetsToAnalyze.length);
    
    return insights;
    
  } catch (error) {
    console.error('Reference User分析エラー:', error);
    // フォールバック: 基本的な要約を返す
    return createFallbackReferenceUserInsights(params.username, params.tweets.length);
  }
}

// ============================================================================
// PROMPT BUILDING FUNCTIONS - プロンプト構築機能
// ============================================================================

/**
 * Target Query分析用プロンプト構築
 */
async function buildTargetQueryAnalysisPrompt(
  tweets: Array<any>, 
  query: string, 
  topic: string
): Promise<string> {
  const now = new Date();
  const timeContext = now.toLocaleString('ja-JP', { 
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // 戦略設定を読み込む
  const strategyConfig = await loadStrategyConfig();
  
  // FX特化プロンプトテンプレート
  let FX_ANALYSIS_PROMPT = `あなたはFX市場の専門アナリストです。以下のツイートからFX市場の重要な情報を分析してください。
現在時刻: ${timeContext}

【分析視点】
1. 通貨ペア別動向（USD/JPY, EUR/USD等の具体的言及）
2. テクニカル指標（サポート/レジスタンス、移動平均線等）
3. ファンダメンタルズ要因（金利政策、経済指標等）
4. 市場センチメント（リスクオン/オフ、ボラティリティ）

【独自性評価基準】
- 一般的でない逆張り的視点（10点満点）
- 他アナリストが見落としている点（10点満点）
- 具体的な予測・エントリーポイント（10点満点）
- リスク警告の価値（10点満点）

【必須抽出項目】
- mentionedCurrencyPairs: 言及された通貨ペア
- technicalLevels: 具体的な価格レベル
- contrarian_views: 逆張り的見解
- predictions: 具体的な予測（方向性、タイミング、価格）
- riskWarnings: 注意すべきリスク

クエリ: ${query}
トピック: ${topic}

【ツイートデータ】`;
  
  tweets.forEach((tweet, index) => {
    const tweetTime = tweet.created_at ? 
      new Date(tweet.created_at).toLocaleString('ja-JP', { 
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '時刻不明';
    
    const engagement = tweet.public_metrics ? 
      `(いいね: ${tweet.public_metrics.like_count || 0}, RT: ${tweet.public_metrics.retweet_count || 0})` : 
      '';
    
    FX_ANALYSIS_PROMPT += `\n${index + 1}. [${tweetTime}] ${engagement}\n`;
    FX_ANALYSIS_PROMPT += `   ${tweet.text.replace(/\n/g, ' ').substring(0, 200)}\n`;
  });
  
  FX_ANALYSIS_PROMPT += `\n【出力形式】
{
  "summary": "200文字以内のFX専門的サマリー",
  "keyPoints": [
    {
      "point": "ポイント内容",
      "importance": "critical|high|medium",
      "category": "technical|fundamental|sentiment|prediction",
      "uniquenessScore": 8.5
    }
  ],
  "mentionedPairs": ["USD/JPY", "EUR/USD"],
  "technicalLevels": {
    "USD/JPY": {
      "support": [149.50, 149.00],
      "resistance": [150.50, 151.00]
    }
  },
  "contrarianViews": ["一般的な強気相場観に対し、テクニカル的な反転サインが..."],
  "predictions": [
    {
      "pair": "USD/JPY",
      "direction": "down",
      "target": 149.00,
      "timeframe": "今週中",
      "confidence": 0.75
    }
  ],
  "marketSentiment": "risk-off turning",
  "confidence": 0.85,
  "riskWarnings": ["FOMCリスク", "テクニカル的な過熱感"]
}`;
  
  // 戦略設定に基づく追加指示
  if (strategyConfig.differentiationStrategies?.uniqueness_first) {
    FX_ANALYSIS_PROMPT += `\n\n【重要】独自性・差別化を特に重視してください。`;
    FX_ANALYSIS_PROMPT += `\n- uniquenessScoreは特に厳密に評価し、8点以上の項目を優先`;
    FX_ANALYSIS_PROMPT += `\n- 逆張り的視点（contrarianViews）は必ず2つ以上抽出`;
  }
  
  if (strategyConfig.selectionWeights?.contrarian_views && 
      strategyConfig.selectionWeights.contrarian_views > 0.7) {
    FX_ANALYSIS_PROMPT += `\n- 市場のコンセンサスと異なる見解を積極的に探索`;
  }
  
  return FX_ANALYSIS_PROMPT;
}

/**
 * Reference User分析用プロンプト構築
 */
function buildReferenceUserAnalysisPrompt(
  tweets: Array<any>, 
  username: string
): string {
  const now = new Date();
  const timeContext = now.toLocaleString('ja-JP', { 
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // ユーザータイプの判定
  const userTypeHint = getUserTypeHint(username);
  
  let prompt = `あなたはFX市場専門のアナリストです。現在時刻: ${timeContext}\n\n`;
  prompt += `【分析タスク】\n`;
  prompt += `@${username}${userTypeHint}の最新${tweets.length}件のツイートを分析し、`;
  prompt += `このユーザーの専門性と最新の見解を抽出してください。\n\n`;
  
  prompt += `【ツイートデータ】\n`;
  tweets.forEach((tweet, index) => {
    const tweetTime = new Date(tweet.created_at).toLocaleString('ja-JP', { 
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const engagement = tweet.public_metrics ? 
      `(いいね: ${tweet.public_metrics.like_count || 0})` : 
      '';
    
    prompt += `${index + 1}. [${tweetTime}] ${engagement}\n`;
    prompt += `   ${tweet.text.replace(/\n/g, ' ').substring(0, 200)}\n\n`;
  });
  
  prompt += `【出力形式】\n`;
  prompt += `以下のJSON形式で分析結果を返してください:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "150文字以内の要約",\n`;
  prompt += `  "expertise": ["FX", "金融政策"],\n`;
  prompt += `  "latestViews": [\n`;
  prompt += `    {\n`;
  prompt += `      "topic": "トピック",\n`;
  prompt += `      "stance": "見解・スタンス",\n`;
  prompt += `      "confidence": "high/medium/low"\n`;
  prompt += `    }\n`;
  prompt += `  ],\n`;
  prompt += `  "reliability": 0.9\n`;
  prompt += `}\n\n`;
  
  prompt += `【注意事項】\n`;
  prompt += `- ユーザーの専門分野を正確に把握する\n`;
  prompt += `- 最新の見解・トレンドを重視する\n`;
  prompt += `- latestViewsは2-3個に絞る\n`;
  prompt += `- 一貫性のある発言をしているユーザーは高い信頼性スコアを付ける`;
  
  // 専門性に応じた追加分析視点を追加
  prompt += getAnalysisPromptForUser(username, tweets);
  
  return prompt;
}

/**
 * ユーザータイプのヒントを取得
 */
function getUserTypeHint(username: string): string {
  const lowerUsername = username.toLowerCase();
  
  if (lowerUsername.includes('fed') || lowerUsername.includes('ecb') || lowerUsername.includes('boj')) {
    return '（中央銀行関連アカウント）';
  } else if (lowerUsername.includes('fx') || lowerUsername.includes('trader')) {
    return '（FXトレーダー）';
  } else if (lowerUsername.includes('news') || lowerUsername.includes('reuters') || lowerUsername.includes('bloomberg')) {
    return '（ニュースメディア）';
  }
  
  return '';
}

/**
 * 専門性に応じた分析視点の調整
 */
function getAnalysisPromptForUser(username: string, tweets: any[]): string {
  const expertise = USER_EXPERTISE_MAP[username] || ["FX全般"];
  
  let specializedPrompt = `\n【専門性に基づく追加分析視点】\n`;
  specializedPrompt += `このユーザーの専門分野: ${expertise.join(', ')}\n\n`;
  
  // 専門性に応じた具体的な分析指示
  if (expertise.includes("金融政策") || expertise.includes("FED") || expertise.includes("ECB")) {
    specializedPrompt += `- 金融政策に関する発言の重要度を評価\n`;
    specializedPrompt += `- 中央銀行の姿勢変化を示唆する内容を抽出\n`;
    specializedPrompt += `- 金利見通しへの影響を分析\n`;
  }
  
  if (expertise.includes("FXテクニカル") || expertise.includes("テクニカル分析")) {
    specializedPrompt += `- 具体的な価格レベル（サポート/レジスタンス）を抽出\n`;
    specializedPrompt += `- テクニカル指標の言及を特定\n`;
    specializedPrompt += `- エントリー/エグジットポイントの示唆を評価\n`;
  }
  
  if (expertise.includes("リアルタイム") || expertise.includes("速報")) {
    specializedPrompt += `- 最新の市場動向やニュースの重要度を評価\n`;
    specializedPrompt += `- 他の情報源より早い情報の価値を判断\n`;
    specializedPrompt += `- 市場への即時影響を分析\n`;
  }
  
  if (expertise.includes("逆張り視点") || expertise.includes("リスク分析")) {
    specializedPrompt += `- 市場コンセンサスと異なる視点の価値を評価\n`;
    specializedPrompt += `- 潜在的リスクの指摘を重視\n`;
    specializedPrompt += `- 独自性の高い分析の抽出\n`;
  }
  
  return specializedPrompt;
}

// ============================================================================
// CLAUDE SDK EXECUTION - Claude SDK実行
// ============================================================================

/**
 * リトライ付きClaude分析実行
 */
async function executeAnalysisWithRetry(
  prompt: string, 
  analysisType: 'targetQuery' | 'referenceUser'
): Promise<string> {
  let attempts = 0;
  let lastError: any;
  
  while (attempts < MAX_RETRIES) {
    try {
      console.log(`🤖 Claude分析実行中... (${analysisType})`);
      
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(CLAUDE_TIMEOUT)
        .skipPermissions()
        .query(prompt)
        .asText();
      
      return response.trim();
      
    } catch (error) {
      console.error(`分析試行 ${attempts + 1} 失敗:`, error);
      lastError = error;
      attempts++;
      
      if (attempts < MAX_RETRIES) {
        console.log(`再試行します... (${attempts + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
      }
    }
  }
  
  throw lastError || new Error('分析実行に失敗しました');
}

// ============================================================================
// PARSING FUNCTIONS - パース機能
// ============================================================================

/**
 * Target Query分析結果のパース
 */
function parseTargetQueryInsights(
  analysisResult: string, 
  dataPoints: number
): TargetQueryInsights {
  try {
    // JSON部分を抽出
    const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が見つかりません');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      summary: parsed.summary || '分析結果の要約を取得できませんでした',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      marketSentiment: parsed.marketSentiment || undefined,
      mentionedPairs: Array.isArray(parsed.mentionedPairs) ? parsed.mentionedPairs : [],
      technicalLevels: parsed.technicalLevels || {},
      contrarianViews: Array.isArray(parsed.contrarianViews) ? parsed.contrarianViews : [],
      predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
      riskWarnings: Array.isArray(parsed.riskWarnings) ? parsed.riskWarnings : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      analyzedAt: new Date().toISOString(),
      dataPoints
    };
    
  } catch (error) {
    console.error('Target Query分析結果のパースエラー:', error);
    return createFallbackTargetQueryInsights(dataPoints);
  }
}

/**
 * Reference User分析結果のパース
 */
function parseReferenceUserInsights(
  analysisResult: string, 
  username: string,
  tweetCount: number
): ReferenceUserInsights {
  try {
    // JSON部分を抽出
    const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が見つかりません');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      username,
      summary: parsed.summary || 'ユーザー分析の要約を取得できませんでした',
      expertise: Array.isArray(parsed.expertise) ? parsed.expertise : ['FX'],
      latestViews: Array.isArray(parsed.latestViews) ? parsed.latestViews : [],
      reliability: typeof parsed.reliability === 'number' ? parsed.reliability : 0.7,
      analyzedAt: new Date().toISOString(),
      tweetCount
    };
    
  } catch (error) {
    console.error('Reference User分析結果のパースエラー:', error);
    return createFallbackReferenceUserInsights(username, tweetCount);
  }
}

// ============================================================================
// FALLBACK FUNCTIONS - フォールバック機能
// ============================================================================

/**
 * Target Queryフォールバック結果生成
 */
function createFallbackTargetQueryInsights(dataPoints: number): TargetQueryInsights {
  return {
    summary: 'ツイート分析中にエラーが発生しました。基本的な集計のみ提供します。',
    keyPoints: [
      {
        point: `${dataPoints}件のツイートを分析対象として収集しました`,
        importance: 'medium',
        category: 'analysis'
      }
    ],
    mentionedPairs: [],
    technicalLevels: {},
    contrarianViews: [],
    predictions: [],
    riskWarnings: [],
    confidence: 0.3,
    analyzedAt: new Date().toISOString(),
    dataPoints
  };
}

/**
 * Reference Userフォールバック結果生成
 */
function createFallbackReferenceUserInsights(
  username: string, 
  tweetCount: number
): ReferenceUserInsights {
  return {
    username,
    summary: 'ユーザー分析中にエラーが発生しました。基本情報のみ提供します。',
    expertise: ['不明'],
    latestViews: [],
    reliability: 0.3,
    analyzedAt: new Date().toISOString(),
    tweetCount
  };
}

/**
 * デフォルトのSystemContext生成
 */
function createDefaultSystemContext(): SystemContext {
  return {
    timestamp: new Date().toISOString(),
    account: {
      followerCount: 0,
      postsToday: 0,
      engagementRate: 0
    },
    system: {
      health: {
        all_systems_operational: true,
        api_status: 'healthy',
        rate_limits_ok: true
      },
      executionCount: { today: 0, total: 0 }
    }
  };
}