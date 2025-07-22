/**
 * 最小配分シンプル決定エンジン
 * コンテキスト圧迫抑制・最小情報システム用
 */

import { ClaudeOptimizedProvider, DecisionContext } from './claude-optimized-provider';
import { logger } from './minimal-logger';

export interface SimpleDecision {
  action: 'post' | 'engage' | 'amplify' | 'wait';
  reason: string;
  confidence: number;
  executionTime?: number;
}

export class MinimalDecisionEngine {
  private claudeProvider: ClaudeOptimizedProvider;
  private readonly fallbackDecisions: SimpleDecision[] = [
    { action: 'wait', reason: 'デフォルト待機', confidence: 0.5 },
    { action: 'post', reason: '基本投稿', confidence: 0.6 }
  ];

  constructor() {
    this.claudeProvider = new ClaudeOptimizedProvider();
  }

  /**
   * 複雑な分析を排除、Claude判断に委任
   */
  async makeDecision(context?: DecisionContext): Promise<SimpleDecision> {
    const startTime = Date.now();
    
    try {
      if (!context) {
        context = await this.claudeProvider.getDecisionContext();
      }

      const prompt = await this.claudeProvider.buildMinimalPrompt(context);
      const decision = await this.queryClaudeForDecision(prompt);
      const parsedDecision = this.parseSimpleDecision(decision);
      
      const executionTime = Date.now() - startTime;
      parsedDecision.executionTime = executionTime;
      
      // 判断をログに記録
      this.claudeProvider.logDecision(parsedDecision.action, parsedDecision.reason, parsedDecision.confidence);
      
      logger.performance('Decision完了', startTime);
      return parsedDecision;
      
    } catch (error) {
      logger.error('Decision生成エラー', error);
      return this.getFallbackDecision(context);
    }
  }

  /**
   * Claude APIへの最小限クエリ
   */
  private async queryClaudeForDecision(prompt: string): Promise<string> {
    // 実装: Claude APIへのリクエスト
    // プレースホルダー - 実際のClaude SDK呼び出しに置き換える
    
    // シミュレーション：簡潔な判断を返す
    await new Promise(resolve => setTimeout(resolve, 500)); // API遅延シミュレーション
    
    return `
action: post
reason: 投資教育コンテンツで価値提供のタイミング
confidence: 0.85
`;
  }

  /**
   * Claude応答の簡潔な解析
   */
  private parseSimpleDecision(decision: string): SimpleDecision {
    const lines = decision.trim().split('\n');
    const parsed: Partial<SimpleDecision> = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (!key || valueParts.length === 0) continue;
      
      const value = valueParts.join(':').trim();
      
      switch (key.trim().toLowerCase()) {
        case 'action':
          if (['post', 'engage', 'amplify', 'wait'].includes(value)) {
            parsed.action = value as SimpleDecision['action'];
          }
          break;
        case 'reason':
          parsed.reason = value.slice(0, 100); // 100文字制限
          break;
        case 'confidence':
          const conf = parseFloat(value);
          if (!isNaN(conf) && conf >= 0 && conf <= 1) {
            parsed.confidence = conf;
          }
          break;
      }
    }
    
    return {
      action: parsed.action || 'wait',
      reason: parsed.reason || '解析エラー',
      confidence: parsed.confidence || 0.5
    };
  }

  /**
   * フォールバック判断システム
   */
  private getFallbackDecision(context?: DecisionContext): SimpleDecision {
    if (!context) {
      return this.fallbackDecisions[0]; // デフォルト待機
    }
    
    // 簡単なルールベース判断
    if (context.current.todayProgress >= 15) {
      return { action: 'wait', reason: '日次制限到達', confidence: 0.9 };
    }
    
    if (context.current.accountHealth < 30) {
      return { action: 'wait', reason: 'アカウント健康度低下', confidence: 0.8 };
    }
    
    if (context.current.todayProgress < 5) {
      return { action: 'post', reason: '活動不足', confidence: 0.7 };
    }
    
    return this.fallbackDecisions[1]; // 基本投稿
  }

  /**
   * 高速判断モード（3秒以内）
   */
  async quickDecision(): Promise<SimpleDecision> {
    const timeoutPromise = new Promise<SimpleDecision>((resolve) => {
      setTimeout(() => {
        resolve(this.getFallbackDecision());
      }, 3000);
    });
    
    const decisionPromise = this.makeDecision();
    
    // 最初に完了したものを返す
    const result = await Promise.race([decisionPromise, timeoutPromise]);
    
    if (result.executionTime && result.executionTime > 3000) {
      logger.warn('Decision時間超過', result.executionTime);
    }
    
    return result;
  }

  /**
   * バッチ判断（複数アクションの順序決定）
   */
  async batchDecision(count: number): Promise<SimpleDecision[]> {
    const decisions: SimpleDecision[] = [];
    const context = await this.claudeProvider.getDecisionContext();
    
    for (let i = 0; i < count && i < 3; i++) { // 最大3件まで
      const decision = await this.makeDecision(context);
      decisions.push(decision);
      
      // 待機以外の場合は後続を調整
      if (decision.action !== 'wait') {
        context.current.todayProgress++;
      }
    }
    
    return decisions;
  }

  /**
   * 判断品質の監視
   */
  async monitorDecisionQuality(): Promise<void> {
    const testContext = await this.claudeProvider.getDecisionContext();
    const decision = await this.makeDecision(testContext);
    
    // 品質指標
    const qualityScore = this.calculateQualityScore(decision, testContext);
    
    if (qualityScore < 0.5) {
      logger.warn(`判断品質低下: ${qualityScore}`);
    }
    
    logger.info(`判断品質: ${qualityScore}`);
  }

  private calculateQualityScore(decision: SimpleDecision, context: DecisionContext): number {
    let score = decision.confidence;
    
    // 制約違反チェック
    if (decision.action !== 'wait' && context.current.todayProgress >= 15) {
      score *= 0.3; // 大幅減点
    }
    
    // 実行時間ペナルティ
    if (decision.executionTime && decision.executionTime > 5000) {
      score *= 0.8;
    }
    
    return Math.max(0, Math.min(1, score));
  }
}