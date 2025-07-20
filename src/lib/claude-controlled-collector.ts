import { chromium, Browser, Page } from 'playwright';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { ScrapedData } from '../types/index';

export class ClaudeControlledCollector {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private testMode: boolean;
  private results: ScrapedData[] = [];

  constructor() {
    this.testMode = process.env.X_TEST_MODE === 'true';
  }

  // 固定的な制限を一切排除
  async exploreAutonomously(): Promise<ScrapedData[]> {
    try {
      await this.initBrowser();
      
      // Claude が最初の方針を決定
      let continueExploration = true;
      
      while (continueExploration) {
        const decision = await this.askClaude(
          this.buildContextualPrompt(),
          'exploration_decision'
        );
        
        const result = await this.executeClaudeDecision(decision);
        continueExploration = result.shouldContinue;
        
        if (result.newData) {
          this.results.push(...result.newData);
        }
      }
      
      return this.results;
    } catch (error) {
      console.error('完全自律収集エラー:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private buildContextualPrompt(): string {
    const currentSituation = this.getCurrentSituation();
    const previousResults = this.results.length;
    
    return `
    【現在の状況】
    ${currentSituation}
    
    【これまでの収集結果】
    収集件数: ${previousResults}件
    
    【次の行動決定】
    投資・金融関連の価値ある情報を収集することが目的です。
    
    次に何をすべきか、以下の形式で回答してください：
    
    ACTION: [具体的な行動]
    REASON: [理由]
    CONTINUE: [true/false - 収集を継続するか]
    
    例：
    ACTION: X.comのトレンドセクションを確認してください
    REASON: 現在話題の投資トピックを把握するため
    CONTINUE: true
    
    または
    
    ACTION: 収集を完了してください
    REASON: 十分な情報を収集したため
    CONTINUE: false
    `;
  }
  
  private async executeClaudeDecision(decision: string): Promise<{
    shouldContinue: boolean;
    newData: ScrapedData[];
  }> {
    // Claude の決定を解析
    const shouldContinue = decision.includes('CONTINUE: true');
    const action = this.extractAction(decision);
    const reason = this.extractReason(decision);
    
    if (this.testMode) {
      console.log(`🧠 Claude決定: ${action}`);
      console.log(`💡 理由: ${reason}`);
    }
    
    if (!shouldContinue) {
      return { shouldContinue: false, newData: [] };
    }
    
    // Claude の指示に従って具体的アクションを実行
    const newData = await this.executeSpecificAction(action);
    
    return { shouldContinue: true, newData };
  }
  
  private async executeSpecificAction(action: string): Promise<ScrapedData[]> {
    if (!this.page) return [];
    
    // Claude の指示を具体的な操作に変換
    const actionPrompt = `
    以下の指示を具体的なブラウザ操作に変換してください：
    
    指示: ${action}
    現在のURL: ${this.page.url()}
    
    以下のような形式で回答してください：
    OPERATION: [NAVIGATE/CLICK/SCROLL/EXTRACT/SEARCH]
    TARGET: [具体的な対象]
    DETAILS: [詳細指示]
    
    例：
    OPERATION: NAVIGATE
    TARGET: https://x.com/explore/tabs/trending
    DETAILS: トレンドページに移動
    
    または
    
    OPERATION: EXTRACT
    TARGET: [data-testid="trend"]
    DETAILS: トレンド情報を抽出
    `;
    
    const operationDecision = await this.askClaude(actionPrompt, 'operation');
    return await this.performBrowserOperation(operationDecision);
  }
  
  private async performBrowserOperation(operation: string): Promise<ScrapedData[]> {
    // Claude の指示に従ってブラウザ操作を実行
    const results: ScrapedData[] = [];
    
    if (operation.includes('OPERATION: NAVIGATE')) {
      const url = this.extractTarget(operation);
      await this.page?.goto(url, { waitUntil: 'domcontentloaded' });
    } else if (operation.includes('OPERATION: EXTRACT')) {
      const selector = this.extractTarget(operation);
      const elements = await this.page?.locator(selector).all() || [];
      
      for (const element of elements.slice(0, 5)) {
        const text = await element.textContent();
        if (text && text.trim().length > 10) {
          results.push({
            content: text.trim(),
            url: this.page?.url() || '',
            timestamp: Date.now(),
            source: 'claude_directed'
          });
        }
      }
    }
    // その他の操作も同様にClaude の指示に従って実行
    
    return results;
  }
  
  private extractAction(decision: string): string {
    const match = decision.match(/ACTION:\s*(.+)/);
    return match ? match[1].trim() : 'デフォルトアクション';
  }
  
  private extractReason(decision: string): string {
    const match = decision.match(/REASON:\s*(.+)/);
    return match ? match[1].trim() : '理由不明';
  }
  
  private extractTarget(operation: string): string {
    const match = operation.match(/TARGET:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: !this.testMode
    });
    this.page = await this.browser.newPage();
    
    if (this.page) {
      await this.page.setViewportSize({ width: 1280, height: 720 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
    }
  }

  private getCurrentSituation(): string {
    if (!this.page) return 'ページが初期化されていません';

    try {
      const url = this.page.url();
      return `現在のURL: ${url}`;
    } catch (error) {
      return 'ページ情報の取得に失敗';
    }
  }

  private async askClaude(prompt: string, context: string): Promise<string> {
    try {
      const response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();
      return response || '判断できませんでした';
    } catch (error) {
      console.error('Claude APIエラー:', error);
      return 'デフォルトアクションを実行します';
    }
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}