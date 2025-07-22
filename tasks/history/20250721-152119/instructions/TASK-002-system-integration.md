# TASK-002: ActionSpecificCollector システム統合実装

## 🎯 実装目標

ActionSpecificCollectorを既存のDecisionEngineとautonomous-executorに統合し、「Claude-Playwright連鎖サイクル」による自律的情報収集システムを完成させる。

## 📋 実装概要

既存の8ステップワークフローのStep 2を革新的に進化させ、アクション決定→特化収集→連鎖判断→追加収集の自律的サイクルを実現する。

## 🔧 実装詳細

### 1. DecisionEngine拡張実装

**ファイルパス**: `src/core/decision-engine.ts`

#### makeExpandedActionDecisions() メソッド拡張
```typescript
// 追加インポート
import { ActionSpecificCollector } from '../lib/action-specific-collector';

export class DecisionEngine {
  private actionSpecificCollector?: ActionSpecificCollector;

  constructor(
    claude: Claude,
    config: AutonomousConfig,
    actionSpecificCollector?: ActionSpecificCollector
  ) {
    // 既存コンストラクタ拡張
    this.actionSpecificCollector = actionSpecificCollector;
  }

  // 拡張アクション決定メソッドの修正
  async makeExpandedActionDecisions(
    context: IntegratedContext,
    needsEvaluation: NeedsEvaluation
  ): Promise<Decision[]> {
    try {
      // 1. 基本アクション決定（既存ロジック維持）
      const baseDecisions = await this.generateBaseActionDecisions(context, needsEvaluation);
      
      // 2. 新機能: アクション特化型情報収集
      const enhancedDecisions = await this.enhanceDecisionsWithSpecificCollection(
        baseDecisions,
        context
      );
      
      // 3. 最終決定生成（既存ロジック拡張）
      return await this.finalizeExpandedDecisions(enhancedDecisions, context);
      
    } catch (error) {
      console.error('拡張アクション決定エラー:', error);
      // フォールバック: 既存ロジックで継続
      return await this.generateBaseActionDecisions(context, needsEvaluation);
    }
  }

  // 新規メソッド: アクション特化型情報収集による決定強化
  private async enhanceDecisionsWithSpecificCollection(
    baseDecisions: Decision[],
    context: IntegratedContext
  ): Promise<Decision[]> {
    if (!this.actionSpecificCollector) {
      return baseDecisions; // コレクターが無い場合は既存決定をそのまま返す
    }

    const enhancedDecisions: Decision[] = [];

    for (const decision of baseDecisions) {
      if (decision.action?.type) {
        try {
          // アクション特化情報収集実行
          const specificResults = await this.actionSpecificCollector.collectForAction(
            decision.action.type as any,
            context,
            85 // 85%充足度目標
          );

          // 収集結果を活用した決定強化
          const enhancedDecision = await this.enhanceDecisionWithCollectionResults(
            decision,
            specificResults
          );

          enhancedDecisions.push(enhancedDecision);
          
        } catch (error) {
          console.warn(`アクション特化収集失敗 (${decision.action.type}):`, error);
          enhancedDecisions.push(decision); // エラー時は元の決定を維持
        }
      } else {
        enhancedDecisions.push(decision);
      }
    }

    return enhancedDecisions;
  }

  // 新規メソッド: 収集結果による決定強化
  private async enhanceDecisionWithCollectionResults(
    decision: Decision,
    collectionResults: ActionSpecificResult
  ): Promise<Decision> {
    const enhancementPrompt = `
決定強化分析：

【元の決定】
アクション: ${decision.action?.type}
理由: ${decision.reasoning}
期待効果: ${decision.expectedImpact}

【特化収集結果】
充足度: ${collectionResults.sufficiencyScore}%
品質スコア: ${collectionResults.qualityMetrics.overallScore}
収集データ数: ${collectionResults.results.length}
実行時間: ${collectionResults.executionTime}秒

【収集データ概要】
${collectionResults.results.slice(0, 3).map(r => 
  `- ${r.type}: ${r.content.substring(0, 100)}... (関連度: ${r.relevanceScore})`
).join('\n')}

この特化収集結果を活用して、元の決定を強化してください：
1. 具体的なコンテンツ案の改善
2. 期待効果の再評価
3. 実行優先度の調整
4. リスク評価の更新

強化された決定をJSONで返してください。
    `;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: enhancementPrompt }]
      });

      const enhancedDecisionData = JSON.parse(response.content[0].text);
      
      return {
        ...decision,
        ...enhancedDecisionData,
        metadata: {
          ...decision.metadata,
          enhancedWithSpecificCollection: true,
          collectionSufficiency: collectionResults.sufficiencyScore,
          collectionQuality: collectionResults.qualityMetrics.overallScore,
          enhancementTimestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.warn('決定強化処理エラー:', error);
      return decision; // エラー時は元の決定を返す
    }
  }
}
```

### 2. AutonomousExecutor統合実装

**ファイルパス**: `src/core/autonomous-executor.ts`

#### Step 2の革新的進化
```typescript
// 追加インポート
import { ActionSpecificCollector } from '../lib/action-specific-collector';

export class AutonomousExecutor {
  private actionSpecificCollector: ActionSpecificCollector;

  constructor(config: AutonomousConfig) {
    // 既存コンストラクタに追加
    this.actionSpecificCollector = new ActionSpecificCollector(
      this.claude,
      this.browser,
      this.loadActionCollectionConfig()
    );
    
    // DecisionEngineにActionSpecificCollectorを渡す
    this.decisionEngine = new DecisionEngine(
      this.claude,
      this.config,
      this.actionSpecificCollector
    );
  }

  // Step 2: 並列実行（アカウント分析 & 情報収集）の拡張
  private async step2_executeParallelAnalysis(): Promise<ParallelAnalysisResult> {
    console.log('🔄 Step 2: 並列実行（アカウント分析 & ActionSpecific情報収集）');
    
    try {
      const [accountResult, infoResult] = await Promise.all([
        // 既存: アカウント分析
        this.accountCollector.collectAccountInfo(),
        
        // 新機能: ActionSpecific情報収集プリロード
        this.preloadActionSpecificInformation()
      ]);

      return {
        account: accountResult,
        information: infoResult,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Step 2 並列実行エラー:', error);
      // フォールバック処理
      return await this.executeStandardParallelAnalysis();
    }
  }

  // 新規メソッド: ActionSpecific情報収集プリロード
  private async preloadActionSpecificInformation(): Promise<ActionSpecificPreloadResult> {
    try {
      // 基本的なトレンド情報を事前収集
      const baselineContext = await this.generateBaselineContext();
      
      // 各アクションタイプの軽量プリロード実行
      const preloadResults = await Promise.all([
        this.actionSpecificCollector.collectForAction('original_post', baselineContext, 60),
        this.actionSpecificCollector.collectForAction('quote_tweet', baselineContext, 50),
        this.actionSpecificCollector.collectForAction('retweet', baselineContext, 40),
        this.actionSpecificCollector.collectForAction('reply', baselineContext, 30)
      ]);

      return {
        original_post: preloadResults[0],
        quote_tweet: preloadResults[1],
        retweet: preloadResults[2],
        reply: preloadResults[3],
        executionTime: Date.now() - startTime,
        status: 'success'
      };
      
    } catch (error) {
      console.warn('ActionSpecific プリロードエラー:', error);
      return {
        status: 'fallback',
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  // 新規メソッド: 設定ファイル読み込み
  private loadActionCollectionConfig(): ActionCollectionConfig {
    try {
      const configPath = path.join(process.cwd(), 'data', 'action-collection-strategies.yaml');
      const configContent = fs.readFileSync(configPath, 'utf8');
      return yaml.parse(configContent);
    } catch (error) {
      console.warn('ActionCollection設定読み込みエラー:', error);
      return this.getDefaultActionCollectionConfig();
    }
  }

  // 新規メソッド: デフォルト設定
  private getDefaultActionCollectionConfig(): ActionCollectionConfig {
    return {
      strategies: {
        original_post: {
          priority: 60,
          focusAreas: ['独自洞察発見', '市場分析情報'],
          sources: [],
          collectMethods: ['trend_analysis'],
          sufficiencyTarget: 85
        },
        // 他のアクションタイプのデフォルト設定...
      },
      sufficiencyThresholds: {
        original_post: 85,
        quote_tweet: 80,
        retweet: 75,
        reply: 70
      },
      maxExecutionTime: 90,
      qualityStandards: {
        relevanceScore: 80,
        credibilityScore: 85,
        uniquenessScore: 70,
        timelinessScore: 90
      }
    };
  }
}
```

### 3. 型定義拡張

**ファイルパス**: `src/types/autonomous-system.ts`

#### 新規インターフェース追加
```typescript
// ActionSpecific関連の型定義
interface ActionSpecificPreloadResult {
  original_post?: ActionSpecificResult;
  quote_tweet?: ActionSpecificResult;
  retweet?: ActionSpecificResult;
  reply?: ActionSpecificResult;
  executionTime: number;
  status: 'success' | 'partial' | 'fallback';
  error?: string;
}

interface ParallelAnalysisResult {
  account: AccountStatus;
  information: ActionSpecificPreloadResult;
  timestamp: number;
}

// 既存のActionSpecificResult等は TASK-001 で定義済み
```

### 4. 統合テスト実装

**ファイルパス**: `tests/integration/action-specific-integration.test.ts`

#### 統合テストケース
```typescript
describe('ActionSpecificCollector システム統合', () => {
  describe('DecisionEngine統合', () => {
    test('makeExpandedActionDecisions: ActionSpecific収集による決定強化', async () => {
      // テスト実装
    });
    
    test('フォールバック動作: ActionSpecificCollector無効時の正常動作', async () => {
      // テスト実装
    });
  });

  describe('AutonomousExecutor統合', () => {
    test('Step 2: ActionSpecific情報収集プリロードの動作確認', async () => {
      // テスト実装
    });
    
    test('8ステップワークフロー全体でのActionSpecific活用', async () => {
      // テスト実装
    });
  });

  describe('エラーハンドリング', () => {
    test('ActionSpecific収集失敗時のフォールバック動作', async () => {
      // テスト実装
    });
  });
});
```

## 🚀 実装順序

1. **型定義拡張**: 必要なインターフェースの追加
2. **DecisionEngine拡張**: makeExpandedActionDecisions()の修正
3. **AutonomousExecutor統合**: Step 2の革新的進化実装
4. **設定読み込み**: YAML設定ファイル連携
5. **統合テスト**: システム全体の統合テスト作成
6. **品質検証**: TypeScript型チェック、lint通過確認

## 📊 品質基準

### 統合要件
- 既存システムとの完全互換性維持
- フォールバック機能による安定性確保
- エラーハンドリングの完全実装

### パフォーマンス要件
- Step 2実行時間: 90秒以内
- プリロード処理: 60秒以内
- フォールバック切り替え: 5秒以内

### テスト要件
- 統合テストの完全実装
- エラーシナリオのテスト
- パフォーマンステスト

## 🔄 出力管理

**出力先**: `tasks/20250721-152119/outputs/`
**命名規則**: `TASK-002-system-integration-{component}.{ext}`

**成果物**:
- `TASK-002-decision-engine-enhanced.ts`
- `TASK-002-autonomous-executor-integrated.ts`
- `TASK-002-integration-types.ts`
- `TASK-002-integration-tests.ts`

## ✅ 完了条件

1. DecisionEngineの拡張実装完了
2. AutonomousExecutorの統合実装完了
3. 型定義の拡張と型安全性確保
4. 統合テストの実装と通過
5. 既存システムとの互換性確認
6. TypeScript型チェック・lint通過
7. 実装報告書の作成

## 📋 報告書作成

実装完了後、以下の報告書を作成してください：
**報告書パス**: `tasks/20250721-152119/reports/REPORT-002-system-integration.md`

**報告書内容**:
- 統合実装の詳細
- 既存システムとの互換性確認結果
- テスト結果
- パフォーマンス測定結果
- 統合システムの動作確認

## 🔗 依存関係

**前提条件**: TASK-001（ActionSpecificCollector コアシステム）の完了
**並列実行**: 不可（TASK-001完了後に開始）

---

**重要**: この統合により「Claude主導による自律的判断×目的特化収集」システムが完成します。既存システムの安定性を保ちながら、革新的な機能を実現してください。