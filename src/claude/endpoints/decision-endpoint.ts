/**
 * Claude SDK Decision Endpoint
 * REQUIREMENTS.md準拠版 - エンドポイント別設計判断エンドポイント
 * 既存decision-engine.tsからの移行版 - 関数ベース実装
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ClaudeDecision, DecisionInput, SystemContext, SYSTEM_LIMITS, VALID_ACTIONS } from '../types';

/**
 * 判断エンドポイント - Claude判断による最適アクション決定
 * 既存decision-engine.tsのmakeEnhancedDecisionメソッドを関数化
 */
export async function makeDecision(input: DecisionInput): Promise<ClaudeDecision> {
  try {
    console.log('🧠 Claude高度判断開始 - エンドポイント版');

    // 1. 基本制約チェック
    const constraintCheck = validateConstraints(input.context, input.constraints);
    if (constraintCheck) {
      return constraintCheck;
    }

    // 2. 基本状況データ準備
    const contextData = prepareContextData(input);
    
    // 3. Claude判断プロンプト構築
    const prompt = buildDecisionPrompt(contextData, input.learningData);
    
    // 4. Claude判断実行
    const decision = await executeClaudeDecision(prompt);
    
    // 5. 応答検証
    const validatedDecision = validateDecision(decision) ? 
      decision : 
      createWaitDecision('Invalid decision format', 0.6);

    console.log('✅ Claude判断完了:', { 
      action: validatedDecision.action, 
      confidence: validatedDecision.confidence 
    });

    return validatedDecision;

  } catch (error) {
    console.error('❌ Claude判断エラー:', error);
    return createWaitDecision('Claude判断失敗のため待機', 0.5);
  }
}

/**
 * 基本制約チェック
 * 既存decision-engine.tsの制約ロジックを統合
 */
function validateConstraints(context: SystemContext, constraints?: { maxPostsPerDay?: number; minWaitBetweenPosts?: number }): ClaudeDecision | null {
  const maxPosts = constraints?.maxPostsPerDay || SYSTEM_LIMITS.MAX_POSTS_PER_DAY;
  const minWait = constraints?.minWaitBetweenPosts || SYSTEM_LIMITS.MIN_WAIT_BETWEEN_POSTS;

  // Null/undefined check for context
  if (!context) {
    return createWaitDecision('Context is missing', 0.6);
  }

  // アカウント情報チェック
  if (!context.account) {
    return createWaitDecision('Account context missing', 0.7);
  }

  // 日次投稿制限チェック
  if (context.account.postsToday >= maxPosts) {
    return createWaitDecision('Daily post limit reached', 0.9);
  }

  // システムヘルスチェック
  if (!context.system.health.all_systems_operational) {
    return createWaitDecision('System health issues detected', 0.7);
  }

  // API状態チェック
  if (context.system.health.api_status === 'error') {
    return createWaitDecision('API error status detected', 0.8);
  }

  // レート制限チェック
  if (!context.system.health.rate_limits_ok) {
    return createWaitDecision('Rate limits exceeded', 0.7);
  }

  return null;
}

/**
 * コンテキストデータ準備
 * 既存decision-engine.tsのgatherBasicContextと同様の処理
 */
function prepareContextData(input: DecisionInput): any {
  return {
    timestamp: input.currentTime.toISOString(),
    account: input.context.account,
    system: input.context.system,
    market: input.context.market,
    constraints: input.constraints || {}
  };
}

/**
 * 決定プロンプト構築
 * 既存decision-engine.tsのbuildDecisionPromptを改良
 */
function buildDecisionPrompt(context: any, learningData?: any): string {
  return `投資教育X自動化システムのアクション判断を行ってください。

現在状況:
- 時刻: ${context.timestamp}
- アカウント情報: ${JSON.stringify(context.account, null, 2)}
- システム状況: ${JSON.stringify(context.system, null, 2)}
- 市場状況: ${JSON.stringify(context.market, null, 2)}
${learningData ? `- 学習データ: ${JSON.stringify(learningData, null, 2)}` : ''}

システム制約:
- 1日最大${SYSTEM_LIMITS.MAX_POSTS_PER_DAY}投稿
- 最小投稿間隔: ${SYSTEM_LIMITS.MIN_WAIT_BETWEEN_POSTS / 3600000}時間
- 品質確保優先（失敗時は素直に待機）

以下から最適なアクションを選択し、理由を含めて回答してください:
1. post - 投稿作成（教育的コンテンツ）
2. retweet - リツイート（関連投稿の拡散）
3. quote_tweet - 引用ツイート（コメント付き拡散）
4. like - いいね（エンゲージメント）
5. wait - 待機（次回実行まで待機）

JSON形式で回答してください:
{
  "action": "選択したアクション",
  "reasoning": "判断理由（具体的で詳細な説明）",
  "confidence": 0.8,
  "parameters": {
    "topic": "投稿トピック",
    "searchQuery": "検索クエリ",
    "targetTweetId": "対象ツイートID",
    "duration": 1800000,
    "reason": "待機理由"
  }
}`;
}

/**
 * Claude判断実行
 * 既存decision-engine.tsのexecuteClaudeDecisionと同等
 */
async function executeClaudeDecision(prompt: string): Promise<ClaudeDecision> {
  try {
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(10000)
      .query(prompt)
      .asText();

    return parseClaudeResponse(response);
  } catch (error) {
    console.error('Claude実行失敗:', error);
    return createWaitDecision('Claude実行失敗のため待機', 0.5);
  }
}

/**
 * Claude応答解析
 * 既存decision-engine.tsのparseClaudeResponseと同等
 */
function parseClaudeResponse(response: string): ClaudeDecision {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        action: parsed.action || 'wait',
        reasoning: parsed.reasoning || 'Claude判断結果',
        parameters: parsed.parameters || {},
        confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1)
      };
    }
  } catch (error) {
    console.error('応答解析失敗:', error);
  }
  
  return createWaitDecision('Response parsing failed', 0.5);
}

/**
 * 決定検証
 * 既存decision-engine.tsのvalidateDecisionと同等
 */
function validateDecision(decision: ClaudeDecision): boolean {
  return !!(
    decision.action && 
    decision.reasoning && 
    VALID_ACTIONS.includes(decision.action) &&
    decision.confidence >= 0 && 
    decision.confidence <= 1 &&
    decision.parameters !== undefined
  );
}

/**
 * 待機決定作成
 * 既存decision-engine.tsのcreateWaitDecisionと同等
 */
function createWaitDecision(reasoning: string, confidence: number): ClaudeDecision {
  return {
    action: 'wait',
    reasoning,
    parameters: {
      duration: 1800000, // 30 minutes
      reason: 'scheduled_wait'
    },
    confidence: Math.min(Math.max(confidence, 0), 1)
  };
}