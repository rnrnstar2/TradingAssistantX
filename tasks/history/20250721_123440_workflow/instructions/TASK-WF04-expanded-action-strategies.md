# TASK-WF04: 出口戦略拡張実装

## 🎯 目的
現在「投稿のみ」の出口戦略を拡張し、引用ツイート・リツイート・リプライも選択肢に加えて1日15回の最適配分を実現する。

## 📋 前提条件
**必須**: TASK-WF01の完了
**推奨**: TASK-WF02, TASK-WF03の完了（統合コンテキスト活用のため）

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_123440_workflow/outputs/TASK-WF01-optimized-workflow-design.yaml`

## 🏗️ 実装内容

### 1. 拡張アクション型定義

#### 新しいアクション型定義
**ファイル**: `src/types/action-types.ts`

```typescript
export type ActionType = 
  | 'original_post'      // オリジナル投稿
  | 'quote_tweet'        // 引用ツイート
  | 'retweet'           // リツイート
  | 'reply'             // リプライ
  | 'thread_post';      // スレッド投稿

export interface ActionDecision {
  id: string;
  type: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  params: ActionParams;
  targetTweet?: Tweet;  // 引用・RT・リプライ対象
  content?: string;     // オリジナル投稿・引用コメント用
  estimatedDuration: number;
}

export interface ActionParams {
  // オリジナル投稿用
  originalContent?: string;
  hashtags?: string[];
  
  // 引用ツイート用
  quotedTweetId?: string;
  quoteComment?: string;
  
  // リツイート用
  retweetId?: string;
  addComment?: boolean;
  
  // リプライ用
  replyToTweetId?: string;
  replyContent?: string;
}
```

### 2. ExpandedActionExecutor実装

#### 新ファイル作成
**場所**: `src/lib/expanded-action-executor.ts`

```typescript
class ExpandedActionExecutor {
  constructor(
    private xClient: XClient,
    private postingManager: PostingManager
  ) {}

  async executeAction(decision: ActionDecision): Promise<ActionResult> {
    switch (decision.type) {
      case 'original_post':
        return await this.executeOriginalPost(decision);
      case 'quote_tweet':
        return await this.executeQuoteTweet(decision);
      case 'retweet':
        return await this.executeRetweet(decision);
      case 'reply':
        return await this.executeReply(decision);
      default:
        throw new Error(`Unsupported action type: ${decision.type}`);
    }
  }

  private async executeOriginalPost(decision: ActionDecision): Promise<PostResult> {
    // 既存のpost_immediate機能を活用
    const content = decision.params.originalContent || decision.content;
    return await this.postingManager.postTweet(content);
  }

  private async executeQuoteTweet(decision: ActionDecision): Promise<QuoteResult> {
    const { quotedTweetId, quoteComment } = decision.params;
    
    if (!quotedTweetId || !quoteComment) {
      throw new Error('Quote tweet requires tweetId and comment');
    }

    return await this.xClient.quoteTweet(quotedTweetId, quoteComment);
  }

  private async executeRetweet(decision: ActionDecision): Promise<RetweetResult> {
    const { retweetId, addComment } = decision.params;
    
    if (!retweetId) {
      throw new Error('Retweet requires tweetId');
    }

    if (addComment && decision.content) {
      // コメント付きリツイート（実質引用ツイート）
      return await this.xClient.quoteTweet(retweetId, decision.content);
    } else {
      // シンプルリツイート
      return await this.xClient.retweet(retweetId);
    }
  }

  private async executeReply(decision: ActionDecision): Promise<ReplyResult> {
    const { replyToTweetId, replyContent } = decision.params;
    
    if (!replyToTweetId || !replyContent) {
      throw new Error('Reply requires tweetId and content');
    }

    return await this.xClient.reply(replyToTweetId, replyContent);
  }
}
```

### 3. X Client API拡張

#### X APIメソッド追加
**ファイル更新**: `src/lib/x-client.ts`

```typescript
// 引用ツイート機能
async quoteTweet(originalTweetId: string, comment: string): Promise<QuoteResult> {
  try {
    const response = await this.client.tweets.createTweet({
      text: comment,
      quote_tweet_id: originalTweetId
    });
    
    return {
      success: true,
      tweetId: response.data.id,
      originalTweetId,
      comment,
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Quote tweet failed: ${error.message}`);
  }
}

// リツイート機能
async retweet(tweetId: string): Promise<RetweetResult> {
  try {
    const response = await this.client.tweets.usersIdRetweets(
      this.userId,
      { tweet_id: tweetId }
    );
    
    return {
      success: true,
      originalTweetId: tweetId,
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Retweet failed: ${error.message}`);
  }
}

// リプライ機能
async reply(tweetId: string, content: string): Promise<ReplyResult> {
  try {
    const response = await this.client.tweets.createTweet({
      text: content,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    });
    
    return {
      success: true,
      tweetId: response.data.id,
      originalTweetId: tweetId,
      content,
      timestamp: Date.now()
    };
  } catch (error) {
    throw new Error(`Reply failed: ${error.message}`);
  }
}
```

### 4. 意思決定エンジン拡張

#### 拡張アクション判定ロジック
**ファイル更新**: `src/core/decision-engine.ts`

```typescript
async planExpandedActions(integratedContext: IntegratedContext): Promise<ActionDecision[]> {
  const claudePrompt = `
  Based on the integrated analysis, determine the optimal mix of actions for today's posting strategy.
  
  Context:
  - Account Status: ${JSON.stringify(integratedContext.account)}
  - Market Information: ${JSON.stringify(integratedContext.market)}
  - Available Opportunities: ${JSON.stringify(integratedContext.actionSuggestions)}
  
  Available action types:
  1. original_post - Create original content
  2. quote_tweet - Quote tweet with valuable commentary
  3. retweet - Simple retweet of valuable content
  4. reply - Engage with community conversations
  
  Daily target: 15 actions total
  Optimal distribution example: 8 original posts, 4 quote tweets, 2 retweets, 1 reply
  
  For each recommended action, provide:
  - type: One of the 4 action types
  - reasoning: Why this action is valuable now
  - params: Specific parameters for execution
  - priority: critical/high/medium/low
  
  Return as JSON array of ActionDecision objects.
  `;
  
  const decisions = await this.claudeSDK.sendMessage(claudePrompt);
  return this.validateActionDecisions(JSON.parse(decisions));
}

private validateActionDecisions(decisions: any[]): ActionDecision[] {
  return decisions.map(decision => {
    // 必須フィールドの検証
    if (!decision.type || !['original_post', 'quote_tweet', 'retweet', 'reply'].includes(decision.type)) {
      throw new Error(`Invalid action type: ${decision.type}`);
    }
    
    // アクション固有のパラメータ検証
    if (decision.type === 'quote_tweet' && !decision.params?.quotedTweetId) {
      throw new Error('Quote tweet requires quotedTweetId');
    }
    
    return decision as ActionDecision;
  });
}
```

### 5. 1日15回最適配分システム

#### DailyActionPlanner実装
**新ファイル**: `src/lib/daily-action-planner.ts`

```typescript
class DailyActionPlanner {
  private readonly DAILY_TARGET = 15;
  
  async planDailyDistribution(): Promise<ActionDistribution> {
    const currentActions = await this.getTodaysActions();
    const remaining = this.DAILY_TARGET - currentActions.length;
    
    return {
      remaining,
      optimal_distribution: this.calculateOptimalDistribution(remaining),
      timing_recommendations: await this.getTimingRecommendations(remaining)
    };
  }
  
  private calculateOptimalDistribution(remaining: number): ActionDistribution {
    // 最適配分アルゴリズム
    const base = {
      original_post: Math.ceil(remaining * 0.6),  // 60%
      quote_tweet: Math.ceil(remaining * 0.25),   // 25%
      retweet: Math.ceil(remaining * 0.10),       // 10%
      reply: Math.ceil(remaining * 0.05)          // 5%
    };
    
    // 合計が残り回数と一致するよう調整
    return this.adjustToTarget(base, remaining);
  }
  
  async getTimingRecommendations(remaining: number): Promise<TimingRecommendation[]> {
    // content-strategy.yamlのoptimal_timesを活用
    const strategy = await this.loadContentStrategy();
    const availableSlots = strategy.optimalTimes.filter(time => 
      !this.isTimeSlotUsed(time)
    );
    
    return this.distributeActionsAcrossSlots(availableSlots, remaining);
  }
}
```

### 6. ParallelManager統合

#### 拡張アクション実行統合
**ファイル更新**: `src/core/parallel-manager.ts`

```typescript
async executeExpandedActions(decisions: ActionDecision[]): Promise<ActionResult[]> {
  const actionTasks = decisions.map(decision => ({
    id: decision.id,
    task: this.createActionTask(decision)
  }));
  
  // 並列実行（API制限を考慮）
  const batchSize = 3; // 同時実行数制限
  const results: ActionResult[] = [];
  
  for (let i = 0; i < actionTasks.length; i += batchSize) {
    const batch = actionTasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(task => this.executeActionTask(task))
    );
    results.push(...batchResults);
  }
  
  return results;
}

private createActionTask(decision: ActionDecision): () => Promise<ActionResult> {
  return async () => {
    switch (decision.type) {
      case 'original_post':
        return await this.executeContentCreation(decision);
      case 'quote_tweet':
        return await this.executeQuoteTweet(decision);
      case 'retweet':
        return await this.executeRetweet(decision);
      case 'reply':
        return await this.executeReply(decision);
      default:
        throw new Error(`Unknown action type: ${decision.type}`);
    }
  };
}
```

## 📝 実装制約

### 実用性重視原則
- 各アクション型の実用的な価値を確保
- エンゲージメント向上に寄与する機能
- 1日15回の効果的な配分実現

### API制限対応
- Twitter API rate limitの遵守
- アクション実行の適切な間隔制御
- エラーハンドリングの実装

### 品質管理
- 各アクション型の品質基準設定
- 重複・スパム防止機能
- 適切なコンテンツフィルタリング

## 📊 出力ファイル

### 実装レポート
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF04-expanded-actions-report.yaml`

### アクション実行ログ
**場所**: `data/`
**ファイル名**: `daily-action-log.json`（実行時生成）

## ✅ 完了基準
1. 拡張アクション型定義完了
2. ExpandedActionExecutor実装完了
3. X Client API拡張完了
4. 意思決定エンジン拡張完了
5. 1日15回最適配分システム実装完了
6. ParallelManager統合完了
7. 全アクション型の動作確認完了
8. API制限テスト通過

## 🔗 依存関係
**前提条件**: TASK-WF01完了必須
**推奨前提**: TASK-WF02, TASK-WF03（統合コンテキスト活用）
**後続**: TASK-WF05での全体統合

---
**重要**: 投稿以外のアクションを効果的に活用し、エンゲージメントとリーチの最大化を実現することが最重要目標。