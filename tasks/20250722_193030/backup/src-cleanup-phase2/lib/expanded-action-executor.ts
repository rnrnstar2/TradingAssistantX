import { SimpleXClient } from './x-client';
import { PostingManager } from './posting-manager';
import { 
  ActionDecision, 
  ActionResult, 
  PostResult
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