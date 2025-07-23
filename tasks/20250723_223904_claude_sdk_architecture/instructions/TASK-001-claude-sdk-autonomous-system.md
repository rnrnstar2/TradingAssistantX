# Claude Code SDK自律システム完全実装指示書

## 🎯 実装概要
改良されたREQUIREMENTS.mdに基づき、Claude Code SDKの自律判断・JSON返却・プロンプト連携を中心とした完全自律システムを実装します。各モジュールの単発実行可能性とswitch文による処理分岐を重視した設計を構築します。

## 🏗️ アーキテクチャ設計原則

### 1. モジュール独立性
- 各モジュールは単発実行可能
- 統一されたModuleExecutorインターフェース
- JSON形式による入出力の標準化

### 2. Claude Code SDK連携
- 実行履歴の完全なプロンプト共有
- コンテキスト情報の永続化
- JSON返却による処理分岐の自動化

### 3. 疎結合設計
- switch文による明確な処理分岐
- モジュール間の依存関係最小化
- 実行コンテキストによる状態管理

## 📁 実装対象ディレクトリ構造

### Phase 1: コア制御システム（Week 1）

#### 1.1 Claude Code SDK中央制御
```typescript
// src/core/claude-autonomous-agent.ts
export class ClaudeAutonomousAgent {
  private moduleDispatcher: ModuleDispatcher;
  private promptContextManager: PromptContextManager;
  
  // メイン自律判断エントリーポイント
  async executeAutonomousDecision(): Promise<AutonomousResult>
  
  // Claude Code SDKへの判断依頼
  async requestClaudeDecision(context: ExecutionContext): Promise<ClaudeDecision>
  
  // JSON返却の解析・検証
  validateClaudeDecision(response: any): ClaudeDecision
}

// src/core/module-dispatcher.ts
export class ModuleDispatcher {
  private modules: ModuleRegistry;
  
  // アクション分岐・モジュール選択
  async dispatchAction(decision: ClaudeDecision): Promise<ModuleResult>
  
  // 利用可能モジュールの検索
  findExecutableModule(action: string): ModuleExecutor | null
}

// src/core/prompt-context-manager.ts
export class PromptContextManager {
  // プロンプト構築・実行履歴管理
  buildPromptWithContext(decision: ClaudeDecision, context: ExecutionContext): string
  
  // 実行結果のコンテキスト統合
  integrateExecutionResult(previousContext: ExecutionContext, result: ModuleResult): ExecutionContext
  
  // コンテキストの永続化・復元
  saveContext(context: ExecutionContext): Promise<void>
  loadContext(sessionId: string): Promise<ExecutionContext>
}
```

#### 1.2 統一インターフェース設計
```typescript
// src/interfaces/module-interface.ts
export interface ModuleExecutor {
  execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>;
  canExecute(action: string): boolean;
  getActionDescription(): ActionDescription;
  getModuleMetadata(): ModuleMetadata;
}

// src/interfaces/claude-response-types.ts
export interface ClaudeDecision {
  action: ActionType;
  reasoning: string;
  parameters: ActionParameters;
  execution_context: ExecutionContext;
  confidence: number;
  expected_outcome: string;
}

export interface ModuleResult {
  success: boolean;
  action_executed: string;  
  results: any;
  performance_impact: PerformanceImpact;
  next_suggestions: ClaudeDecision[];
  execution_log: string;
  updated_context: ExecutionContext;
}
```

### Phase 2: 単発実行可能モジュール（Week 2-3）

#### 2.1 データインテリジェンスモジュール
```typescript
// src/modules/data-intelligence/intelligence-executor.ts
export class IntelligenceExecutor implements ModuleExecutor {
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  canExecute(action: string): boolean
  
  // X内市場インテリジェンス収集
  private async collectMarketIntelligence(params: any): Promise<MarketIntelligence>
  
  // 競合アカウント分析
  private async analyzeCompetitors(params: any): Promise<CompetitorAnalysis>
}

// src/modules/data-intelligence/market-analyzer.ts
export class MarketAnalyzer implements ModuleExecutor {
  // 市場動向分析の単発実行
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  
  // リアルタイム市場センチメント分析
  private async analyzeSentiment(accounts: string[]): Promise<SentimentAnalysis>
}
```

#### 2.2 コンテンツ戦略モジュール  
```typescript
// src/modules/content-strategy/strategy-planner.ts
export class StrategyPlanner implements ModuleExecutor {
  // 戦略計画の単発実行
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  
  // エンゲージメント分析結果に基づく戦略策定
  private async planStrategy(analysisResults: any): Promise<ContentStrategy>
}

// src/modules/content-strategy/content-generator.ts
export class ContentGenerator implements ModuleExecutor {
  // 多形式コンテンツ生成の単発実行
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  
  // 投稿・引用・返信コンテンツの生成
  private async generateMultiFormatContent(strategy: ContentStrategy): Promise<GeneratedContent>
}
```

#### 2.3 アクション実行モジュール
```typescript
// src/modules/action-execution/post-executor.ts
export class PostExecutor implements ModuleExecutor {
  // 投稿実行の単発実行
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  
  // KaitoTwitterAPI統合投稿
  private async executePost(content: GeneratedContent): Promise<PostResult>
}

// src/modules/action-execution/engagement-executor.ts  
export class EngagementExecutor implements ModuleExecutor {
  // RT・いいね・返信の単発実行
  async execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>
  
  // 統合エンゲージメントアクション
  private async executeEngagementActions(actions: EngagementAction[]): Promise<EngagementResult>
}
```

### Phase 3: JSON処理・永続化システム（Week 4）

#### 3.1 JSON処理システム
```typescript
// src/utils/json-processor.ts
export class JSONProcessor {
  // Claude返却JSONの検証・解析
  validateAndParseClaudeResponse(response: string): ClaudeDecision
  
  // JSON形式エラーハンドリング
  handleJSONError(error: any): ProcessingError
  
  // レスポンス形式の標準化
  standardizeResponse(rawResponse: any): ClaudeDecision
}

// src/utils/context-serializer.ts
export class ContextSerializer {
  // 実行コンテキストの直列化
  serialize(context: ExecutionContext): string
  
  // コンテキストの復元
  deserialize(serialized: string): ExecutionContext
  
  // 差分更新による効率化
  updateSerialized(previous: string, changes: Partial<ExecutionContext>): string
}
```

#### 3.2 モジュール登録・検索システム
```typescript
// src/utils/module-registry.ts
export class ModuleRegistry {
  private modules: Map<string, ModuleExecutor>;
  
  // モジュールの動的登録
  registerModule(actionTypes: string[], module: ModuleExecutor): void
  
  // アクションに対応するモジュール検索
  findModule(action: string): ModuleExecutor | null
  
  // 利用可能アクション一覧
  getAvailableActions(): ActionDescription[]
}
```

### Phase 4: KaitoTwitterAPI統合（Week 5-6）

#### 4.1 API統合アダプター
```typescript
// src/adapters/kaito-api-adapter.ts
export class KaitoAPIAdapter {
  // 200 QPS性能の完全活用
  private rateLimiter: RateLimiter;
  
  // 統合データ収集
  async collectIntelligence(params: CollectionParams): Promise<IntelligenceData>
  
  // 多様アクション実行
  async executeActions(actions: XAction[]): Promise<ActionResults>
  
  // リアルタイム分析
  async analyzePerformance(metrics: PerformanceMetrics): Promise<AnalysisResult>
}
```

## 🔧 実装時の技術要件

### JSON処理・分岐システム
- Claude Code SDKからのJSON返却の厳密なバリデーション
- switch文による高速な処理分岐
- エラー時のフォールバック機能

### プロンプト連携システム  
- 実行履歴の完全なプロンプト埋め込み
- コンテキスト情報の効率的な直列化
- Claude Code SDKとの双方向フィードバック

### パフォーマンス要件
- モジュール単発実行時間: 30秒以内
- JSON処理時間: 100ms以内  
- コンテキスト保存・読み込み: 500ms以内
- KaitoTwitterAPI 200 QPS性能の90%活用

## 🧪 テスト要件

### 単体テスト
- 各モジュールの独立実行テスト
- JSON処理・バリデーションテスト
- エラーハンドリング網羅テスト

### 統合テスト  
- Claude Code SDK連携フローテスト
- モジュール分岐・実行統合テスト
- 実行履歴・コンテキスト永続化テスト

### パフォーマンステスト
- 200 QPS負荷テスト
- メモリ使用量・実行速度測定
- 長期実行での安定性確認

## 📊 成功指標

### 技術指標
- [ ] 全8アクションの単発実行機能完成
- [ ] JSON返却・switch分岐システム100%動作
- [ ] プロンプト連携・実行履歴共有完成
- [ ] KaitoTwitterAPI 200 QPS性能90%活用達成

### 実用指標  
- [ ] Claude Code SDK自律判断精度95%以上
- [ ] モジュール実行成功率98%以上
- [ ] 実行コンテキスト同期率100%
- [ ] システム稼働率99.5%以上

## 🚨 重要な実装制約

### Claude Code SDK連携原則
- 全実行内容をプロンプトに含める
- JSON形式での標準化されたレスポンス
- 実行履歴の完全な保存・共有

### モジュール設計原則
- 各モジュールの完全な独立性
- 統一インターフェースの厳守  
- 単発実行可能性の保証

### データ管理制約
- 実行コンテキストの適切な永続化
- YAML形式での設定・履歴保存
- tasks/outputs/配下への実行ログ出力

## 📋 完了条件

1. Claude Code SDK自律システムの完全動作確認
2. 8種類モジュールの単発実行機能完成
3. JSON処理・switch分岐システムの100%動作  
4. プロンプト連携・実行履歴共有システム完成
5. KaitoTwitterAPI 200 QPS性能の効率活用
6. 全テストの通過と成功指標の達成

実装完了後、報告書を作成してください：
📋 報告書: tasks/20250723_223904_claude_sdk_architecture/reports/REPORT-001-autonomous-system.md