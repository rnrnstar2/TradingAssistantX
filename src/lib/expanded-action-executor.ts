import { SimpleXClient } from './x-client';
import { PostingManager } from './posting-manager';
import { 
  ActionDecision, 
  ActionResult, 
  PostResult, 
  QuoteResult, 
  RetweetResult, 
  ReplyResult 
} from '../types/action-types';

export class ExpandedActionExecutor {
  constructor(
    private xClient: SimpleXClient,
    private postingManager: PostingManager
  ) {}

  async executeAction(decision: ActionDecision): Promise<ActionResult> {
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        actionId: decision.id,
        type: decision.type,
        timestamp: Date.now(),
        error: errorMessage
      };
    }
  }

  private async executeOriginalPost(decision: ActionDecision): Promise<PostResult> {
    const content = decision.params.originalContent || decision.content;
    
    if (!content) {
      throw new Error('Original post requires content');
    }

    const result = await this.postingManager.postNow(content);
    
    return {
      success: result.success,
      actionId: decision.id,
      type: 'original_post',
      timestamp: result.timestamp,
      tweetId: result.id,
      content,
      error: result.error
    };
  }

  private async executeQuoteTweet(decision: ActionDecision): Promise<QuoteResult> {
    const { quotedTweetId, quoteComment } = decision.params;
    
    if (!quotedTweetId || !quoteComment) {
      throw new Error('Quote tweet requires tweetId and comment');
    }

    // X APIのquote_tweet機能を使用
    const result = await this.xClient.quoteTweet(quotedTweetId, quoteComment);
    
    return {
      success: result.success,
      actionId: decision.id,
      type: 'quote_tweet',
      timestamp: result.timestamp,
      tweetId: result.tweetId,
      originalTweetId: quotedTweetId,
      comment: quoteComment,
      error: result.error
    };
  }

  private async executeRetweet(decision: ActionDecision): Promise<RetweetResult> {
    const { retweetId, addComment } = decision.params;
    
    if (!retweetId) {
      throw new Error('Retweet requires tweetId');
    }

    let result;
    
    if (addComment && decision.content) {
      // コメント付きリツイート（実質引用ツイート）
      result = await this.xClient.quoteTweet(retweetId, decision.content);
    } else {
      // シンプルリツイート
      result = await this.xClient.retweet(retweetId);
    }
    
    return {
      success: result.success,
      actionId: decision.id,
      type: 'retweet',
      timestamp: result.timestamp,
      originalTweetId: retweetId,
      error: result.error
    };
  }

  private async executeReply(decision: ActionDecision): Promise<ReplyResult> {
    const { replyToTweetId, replyContent } = decision.params;
    
    if (!replyToTweetId || !replyContent) {
      throw new Error('Reply requires tweetId and content');
    }

    const result = await this.xClient.reply(replyToTweetId, replyContent);
    
    return {
      success: result.success,
      actionId: decision.id,
      type: 'reply',
      timestamp: result.timestamp,
      tweetId: result.tweetId,
      originalTweetId: replyToTweetId,
      content: replyContent,
      error: result.error
    };
  }

  // バッチ実行機能
  async executeActions(decisions: ActionDecision[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    for (const decision of decisions) {
      try {
        const result = await this.executeAction(decision);
        results.push(result);
        
        // API制限を考慮して少し待機
        if (decisions.length > 1) {
          await this.waitForApiLimit();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          actionId: decision.id,
          type: decision.type,
          timestamp: Date.now(),
          error: errorMessage
        });
      }
    }
    
    return results;
  }

  private async waitForApiLimit(): Promise<void> {
    // 1秒待機してAPI制限を回避
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // アクション統計情報取得
  getActionStats(): any {
    return this.postingManager.getPostingStats();
  }
}