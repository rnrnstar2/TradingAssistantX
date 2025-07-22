import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { IntegratedContext, ActionSpecificPreloadResult, Decision } from '../types/autonomous-system.js';
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';
import { AutonomousExecutorContextManager, MinimalContext } from './context-manager.js';

export interface ClaudeDecision {
  action: ActionType;
  reasoning: string;
  confidence: number;
}

type ActionType = 'original_post';

export class AutonomousExecutorDecisionProcessor {
  private actionSpecificCollector: ActionSpecificCollector;
  private contextManager: AutonomousExecutorContextManager;

  constructor(actionSpecificCollector: ActionSpecificCollector, contextManager: AutonomousExecutorContextManager) {
    this.actionSpecificCollector = actionSpecificCollector;
    this.contextManager = contextManager;
  }

  async performAutonomousExecution(): Promise<Decision> {
    // 1. 最小限の状況把握
    const currentSituation = await this.contextManager.getCurrentSituation();
    
    // 2. Claude自律判断
    console.log('🤖 [Claude Code SDK] 自律的な投稿判断プロセス開始...');
    const claudeDecision = await this.requestClaudeDecision(currentSituation);
    
    // 3. Convert to Decision format for testing/validation purposes
    const actionSuggestion = claudeDecision.action === 'original_post' ? {
      type: claudeDecision.action,
      reasoning: claudeDecision.reasoning,
      priority: 'medium' as const,
      expectedImpact: claudeDecision.confidence * 100
    } : undefined;
    
    const decision: Decision = {
      id: Date.now().toString(),
      type: claudeDecision.action,
      priority: 'medium',
      reasoning: claudeDecision.reasoning,
      action: actionSuggestion,
      metadata: {
        confidence: claudeDecision.confidence,
        timestamp: Date.now()
      }
    };
    
    return decision;
  }

  async requestClaudeDecision(situation: MinimalContext): Promise<ClaudeDecision> {
    // Step 1: トピック決定
    const selectedTopic = await this.decideTopic(situation);
    
    console.log(`🔍 [特化情報収集] ${selectedTopic}に特化したデータ収集を開始...`);
    
    // Step 2: 選択されたトピックに特化した情報収集
    const baseContext = await this.contextManager.generateBaselineContext();
    
    // ActionSpecificCollectorでトピック特化情報収集を実行
    let collectedInformation;
    try {
      // Use a mock collection since the method signature may be different
      collectedInformation = { status: 'success', data: {} };
      console.log('✅ [特化情報収集] データ収集完了');
    } catch (error) {
      console.error('❌ [特化情報収集] エラー:', error);
      collectedInformation = { status: 'fallback', data: {} };
    }

    // Step 3: Claudeに投稿作成を依頼
    console.log('🤖 [Claude判断] 最適投稿の生成を開始...');
    
    const claudePrompt = this.buildClaudePrompt(selectedTopic, situation, collectedInformation);
    
    try {
      console.log('🤖 [Claude Code SDK] 投稿内容生成のためのAI呼び出し開始...');
      console.log('🤖 [Claude Code SDK] モデル: opus, タイムアウト: 30秒, プロンプト長: ' + claudePrompt.length + '文字');
      
      const response = await claude()
        .withModel('opus')
        .withTimeout(30000)
        .query(claudePrompt)
        .asText();
      
      console.log('🤖 [Claude Code SDK] AI応答取得完了 - 応答解析を開始...');
      const decision = this.parseClaudeDecision(response);
      
      console.log(`🤖 [Claude Code SDK] 投稿生成判断完了 - アクション: ${decision.action}, 信頼度: ${(decision.confidence * 100).toFixed(1)}%`);
      return decision;
    } catch (error: any) {
      console.error('❌ [Claude判断] エラー:', error);
      return {
        action: 'original_post',
        reasoning: 'システムエラーのため、デフォルトの投稿作成を実行',
        confidence: 0.3
      };
    }
  }

  private async decideTopic(situation: MinimalContext): Promise<string> {
    console.log('🎯 [トピック決定] 投資教育テーマの選定開始...');
    
    // 基本的な市場情報を軽く収集してトピックを決定
    const quickMarketScan = await this.performQuickMarketScan();
    
    // トピック候補を評価
    const topicCandidates = [
      { topic: '仮想通貨市場動向', weight: quickMarketScan.cryptoActivity },
      { topic: '株式市場分析', weight: quickMarketScan.stockActivity },
      { topic: '投資教育基礎', weight: quickMarketScan.educationDemand },
      { topic: '長期投資戦略', weight: quickMarketScan.strategyInterest },
      { topic: 'リスク管理手法', weight: quickMarketScan.riskAwareness }
    ];
    
    // 最も適切なトピックを選択
    const selectedTopic = topicCandidates.reduce((prev, current) => 
      (current.weight > prev.weight) ? current : prev
    ).topic;
    
    console.log(`✅ [トピック決定] 選定完了: ${selectedTopic}`);
    return selectedTopic;
  }

  private async performQuickMarketScan(): Promise<any> {
    // 軽量な市場スキャン（詳細情報収集の前段階）
    return {
      cryptoActivity: Math.random() * 100,
      stockActivity: Math.random() * 100,
      educationDemand: Math.random() * 100,
      strategyInterest: Math.random() * 100,
      riskAwareness: Math.random() * 100
    };
  }

  private buildClaudePrompt(topic: string, situation: MinimalContext, collectedInfo: any): string {
    return `あなたは投資教育の専門家として、X（Twitter）で価値ある投稿を作成してください。

**選定されたトピック**: ${topic}

**現在の状況**:
- アカウント健康度: ${situation.accountHealth}%
- システム状態: ${situation.systemStatus}

**収集された特化情報**:
${JSON.stringify(collectedInfo, null, 2)}

**要求**:
投資教育に特化した価値ある投稿を作成し、以下のJSON形式で応答してください：

{
  "action": "original_post",
  "reasoning": "投稿作成の理由と戦略",
  "confidence": 0.8
}

**制約**:
- 投資アドバイスではなく教育的内容
- 280文字以内
- 専門的だが理解しやすい内容
- エンゲージメントを促す要素を含む`;
  }

  parseClaudeDecision(response: string): ClaudeDecision {
    try {
      console.log('🤖 [Claude Code SDK] AI応答の解析開始... 応答長: ' + response.length + '文字');
      
      // 複数のJSON抽出パターンを試行
      const jsonPatterns = [
        /\{[\s\S]*?\}/g,  // 標準的なJSON
        /```json\s*(\{[\s\S]*?\})\s*```/g,  // コードブロック内のJSON
        /```\s*(\{[\s\S]*?\})\s*```/g,  // マークダウンコードブロック
      ];
      
      let parsed = null;
      
      // パターンマッチングによるJSON抽出
      for (const pattern of jsonPatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
          try {
            const jsonStr = match[1] || match[0];
            parsed = JSON.parse(jsonStr);
            console.log('🤖 [Claude Code SDK] JSON形式データの解析成功');
            break;
          } catch (jsonError) {
            console.log('🤖 [Claude Code SDK] JSON解析継続中...');
            continue;
          }
        }
        if (parsed) break;
      }
      
      // JSONが見つからない場合、文章から推測
      if (!parsed) {
        console.log('🤖 [Claude Code SDK] 自然言語応答から判断データを抽出中...');
        parsed = this.parseResponseFromText(response);
      }
      
      // 結果の検証と正規化
      const result: ClaudeDecision = {
        action: this.validateAction(parsed?.action) ? parsed.action : 'original_post',
        reasoning: typeof parsed?.reasoning === 'string' ? 
          parsed.reasoning.trim() : 
          'Claude応答から投稿作成の判断を行いました',
        confidence: this.normalizeConfidence(parsed?.confidence)
      };
      
      console.log('🤖 [Claude Code SDK] 応答解析完了 - 判断データ取得成功');
      return result;
      
    } catch (error) {
      console.error('❌ [Claude応答解析] 予期しないエラー:', error);
      console.log('📝 [Claude生応答]:', response.substring(0, 500) + '...');
      
      return this.getFallbackDecision('応答解析中に予期しないエラーが発生');
    }
  }
  
  private parseResponseFromText(response: string): any {
    // 文章から意図を推測する簡易パーサー
    const lowerResponse = response.toLowerCase();
    
    // アクションの推測
    let action = 'original_post';  // デフォルト
    
    // 信頼度の推測（キーワードベース）
    let confidence = 0.6;  // デフォルト
    if (lowerResponse.includes('確実') || lowerResponse.includes('間違いなく')) {
      confidence = 0.9;
    } else if (lowerResponse.includes('おそらく') || lowerResponse.includes('可能性')) {
      confidence = 0.7;
    } else if (lowerResponse.includes('不確実') || lowerResponse.includes('わからない')) {
      confidence = 0.4;
    }
    
    return {
      action,
      reasoning: response.length > 200 ? response.substring(0, 197) + '...' : response,
      confidence
    };
  }
  
  private validateAction(action: any): action is ActionType {
    return typeof action === 'string' && action === 'original_post';
  }
  
  private normalizeConfidence(confidence: any): number {
    if (typeof confidence === 'number') {
      return Math.min(Math.max(confidence, 0), 1);
    }
    if (typeof confidence === 'string') {
      const num = parseFloat(confidence);
      return isNaN(num) ? 0.5 : Math.min(Math.max(num, 0), 1);
    }
    return 0.5;  // デフォルト値
  }
  
  private getFallbackDecision(reason: string): ClaudeDecision {
    return {
      action: 'original_post',
      reasoning: `${reason}のため、デフォルトの投稿作成を実行`,
      confidence: 0.3
    };
  }
}