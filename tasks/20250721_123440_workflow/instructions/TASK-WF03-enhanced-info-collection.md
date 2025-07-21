# TASK-WF03: 情報収集システム序盤移動・強化

## 🎯 目的
現在Step 6で実行されている情報収集を序盤に移動し、アカウント分析と並列実行して意思決定の質を向上させる。

## 📋 前提条件
**必須**: TASK-WF01の完了

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_123440_workflow/outputs/TASK-WF01-optimized-workflow-design.yaml`

## 🏗️ 実装内容

### 1. 情報収集システムの実行タイミング変更

#### 現在の問題
```typescript
// 現在: Step 6で実行（遅すぎる）
async executeActions() {
  // ... 意思決定後
  await this.executeContentCreation();
  await this.executePostImmediate();
  // ここで情報収集（手遅れ）
}
```

#### 改善後の実行フロー
```typescript
// 改善: Step 2で並列実行
async executeAutonomously(): Promise<void> {
  // 1. ヘルスチェック
  const isCritical = await this.healthChecker.isCritical();
  if (isCritical) return;

  // 2. 並列実行（重要な改善）
  const [accountStatus, collectionResults] = await Promise.all([
    this.accountAnalyzer.analyzeCurrentStatus(),
    this.enhancedInfoCollector.collectInformation() // ← 序盤移動
  ]);

  // 3. 両方の結果を統合して意思決定
  const integratedContext = this.integrateAnalysisResults(accountStatus, collectionResults);
  const decisions = await this.decisionEngine.planActions(integratedContext);
  
  // ... 以下実行
}
```

### 2. EnhancedInfoCollectorクラス実装

#### 新ファイル作成
**場所**: `src/lib/enhanced-info-collector.ts`

```typescript
interface CollectionTarget {
  type: 'trend' | 'competitor' | 'hashtag' | 'news';
  source: string;
  priority: 'high' | 'medium' | 'low';
  searchTerms: string[];
}

interface CollectionResult {
  id: string;
  type: string;
  content: string;
  source: string;
  relevanceScore: number;
  timestamp: number;
  metadata: {
    engagement?: number;
    author?: string;
    hashtags?: string[];
  };
}

class EnhancedInfoCollector {
  async collectInformation(): Promise<CollectionResult[]> {
    const targets = this.defineCollectionTargets();
    const results = await Promise.all([
      this.collectTrendInformation(),
      this.collectCompetitorContent(),
      this.collectMarketNews(),
      this.collectHashtagActivity()
    ]);
    
    return this.consolidateResults(results);
  }
  
  private defineCollectionTargets(): CollectionTarget[] {
    return [
      {
        type: 'trend',
        source: 'x.com/explore',
        priority: 'high',
        searchTerms: ['投資', 'トレード', 'FX', '株式']
      },
      {
        type: 'competitor',
        source: 'x.com/search',
        priority: 'medium', 
        searchTerms: ['投資アドバイザー', 'トレーダー']
      },
      {
        type: 'news',
        source: 'x.com/search',
        priority: 'high',
        searchTerms: ['経済ニュース', '市場動向', '金融政策']
      }
    ];
  }
}
```

### 3. Playwright操作の最適化

#### 並列収集対応
**ファイル**: `src/lib/claude-controlled-collector.ts`

```typescript
class ClaudeControlledCollector {
  async performParallelCollection(): Promise<CollectionResult[]> {
    // 複数ページの並列処理
    const browserContexts = await this.createMultipleContexts(3);
    
    const collectionTasks = [
      this.collectFromTrends(browserContexts[0]),
      this.collectFromSearch(browserContexts[1], ['投資', 'トレード']),
      this.collectFromHashtags(browserContexts[2], ['#FX', '#株式投資'])
    ];
    
    const results = await Promise.all(collectionTasks);
    await this.closeBrowserContexts(browserContexts);
    
    return this.mergeCollectionResults(results);
  }
  
  async collectFromTrends(context: BrowserContext): Promise<CollectionResult[]> {
    const page = await context.newPage();
    await page.goto('https://x.com/explore');
    
    // Claude指示による自律的な操作
    const claudeInstructions = await this.getClaudeInstructions('trend_analysis');
    return await this.executeClaudeInstructions(page, claudeInstructions);
  }
}
```

### 4. Claude統合情報評価システム

#### リアルタイム情報評価
```typescript
class InformationEvaluator {
  async evaluateCollectedInformation(results: CollectionResult[]): Promise<EvaluatedInfo[]> {
    const claudePrompt = `
    Evaluate the following collected information for trading/investment content creation:
    
    ${JSON.stringify(results, null, 2)}
    
    For each item, provide:
    1. Relevance score (0-1)
    2. Content value for our audience
    3. Actionable insights
    4. Recommended usage (original post, quote tweet, retweet)
    
    Return as JSON array.
    `;
    
    const evaluation = await this.claudeSDK.sendMessage(claudePrompt);
    return JSON.parse(evaluation);
  }
  
  async identifyContentOpportunities(evaluatedInfo: EvaluatedInfo[]): Promise<ContentOpportunity[]> {
    // 収集情報から投稿機会を特定
    // 引用ツイート、リツイート候補の抽出
    // オリジナル投稿のインスピレーション特定
  }
}
```

### 5. 統合コンテキスト生成

#### アカウント分析と情報収集の統合
```typescript
class ContextIntegrator {
  integrateAnalysisResults(
    accountStatus: AccountStatus,
    collectionResults: CollectionResult[]
  ): IntegratedContext {
    return {
      account: {
        currentState: accountStatus,
        recommendations: accountStatus.recommendations,
        healthScore: accountStatus.healthScore
      },
      market: {
        trends: this.extractTrends(collectionResults),
        opportunities: this.identifyOpportunities(collectionResults),
        competitorActivity: this.analyzeCompetitors(collectionResults)
      },
      actionSuggestions: this.generateActionSuggestions(accountStatus, collectionResults),
      timestamp: Date.now()
    };
  }
  
  private generateActionSuggestions(
    account: AccountStatus, 
    info: CollectionResult[]
  ): ActionSuggestion[] {
    // アカウント状況と市場情報を統合した行動提案
    // 投稿、引用、リツイートの具体的提案
  }
}
```

### 6. DecisionEngine統合

#### 統合コンテキストを活用した意思決定
**ファイル更新**: `src/core/decision-engine.ts`

```typescript
async planActions(integratedContext: IntegratedContext): Promise<Decision[]> {
  const claudePrompt = `
  Based on the integrated analysis:
  
  Account Status: ${JSON.stringify(integratedContext.account)}
  Market Information: ${JSON.stringify(integratedContext.market)}
  Action Suggestions: ${JSON.stringify(integratedContext.actionSuggestions)}
  
  Determine the best actions to take. Consider:
  1. Account health and engagement needs
  2. Market trends and opportunities
  3. Available action types: original_post, quote_tweet, retweet
  4. Timing optimization for 15 daily posts
  
  Return decisions in the established JSON format.
  `;
  
  const decisions = await this.claudeSDK.sendMessage(claudePrompt);
  return this.validateDecisions(JSON.parse(decisions));
}
```

## 📝 実装制約

### 実用性重視原則
- 収集した情報を実際の意思決定に活用
- リアルタイム市場情報の価値を最大化
- 実用的な投稿機会の特定

### パフォーマンス最適化
- 並列処理による効率化
- ブラウザリソースの適切な管理
- API呼び出しの最適化

### 情報品質管理
- 収集情報の関連性評価
- ノイズ除去とフィルタリング
- 信頼性の高い情報源の優先

## 📊 出力ファイル

### 実装レポート
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF03-enhanced-collection-report.yaml`

### 収集情報データ
**場所**: `data/`
**ファイル名**: `real-time-collection-results.json`（実行時生成）

## ✅ 完了基準
1. 情報収集の実行タイミング変更完了
2. EnhancedInfoCollectorクラス実装完了
3. Playwright並列操作最適化完了
4. Claude統合情報評価システム実装完了
5. 統合コンテキスト生成機能完了
6. DecisionEngineとの統合完了
7. パフォーマンステスト通過
8. 動作確認完了

## 🔗 依存関係
**前提条件**: TASK-WF01完了必須
**並列実行**: TASK-WF02と同時実行可能
**後続**: TASK-WF04での意思決定改善に直結

---
**重要**: 情報収集を意思決定前に完了させ、Claude Code の自律的判断の質を向上させることが最重要目標。