# TASK-001: Claude Code SDK アーキテクチャリファクタリング

## 🎯 タスク概要

既存のClaude Code SDK関連3ファイルを疎結合ライブラリとして7ファイルに分割し、機能別責務分離を実現する。

## 📋 実装対象

### 現在の構成（問題）
```
src/claude/
├── decision-engine.ts     (420行 - 複数責務混在)
├── content-generator.ts   (574行 - KaitoAPI統合で肥大化)
└── post-analyzer.ts       (521行 - 分析機能が巨大)
```

### 目標構成（7ファイル分割）
```
src/claude/
├── decision-engine.ts       # 核となる意思決定ロジック
├── market-analyzer.ts       # 市場コンテキスト分析専門
├── content-generator.ts     # 核となるコンテンツ生成
├── content-validator.ts     # 品質評価・言語検証
├── prompt-builder.ts        # プロンプト構築専門
├── post-analyzer.ts         # 投稿品質分析
└── engagement-predictor.ts  # エンゲージメント予測・パフォーマンス分析
```

## 🔧 分割戦略

### Phase 1: decision-engine.ts 分割
**移行対象メソッド**:
- `analyzeMarketContext()` → market-analyzer.ts
- `synthesizeMarketContext()` → market-analyzer.ts
- `calculateVolatility()` → market-analyzer.ts
- `buildEnhancedPrompt()` → market-analyzer.ts
- `executeEnhancedDecision()` → market-analyzer.ts

**残留メソッド（decision-engine.ts）**:
- `makeDecision()` - 核となる判断ロジック
- `validateDecision()` - 決定妥当性検証
- `evaluateMarketConditions()` - 市場状況評価
- 全てのヘルパーメソッド

### Phase 2: content-generator.ts 分割
**移行対象メソッド**:

**→ content-validator.ts**:
- `evaluateQuality()` - 品質評価
- `evaluateReadability()` - 読みやすさ評価
- `evaluateRelevance()` - 関連度評価
- `evaluateEngagementPotential()` - エンゲージメント可能性
- `containsKorean()` - 韓国語検出
- `processContent()` - コンテンツ後処理

**→ prompt-builder.ts**:
- `buildPrompt()` - プロンプト構築
- `getGenerationStrategy()` - 生成戦略
- `analyzeTrendOpportunity()` - トレンド機会分析
- `synthesizeOptimizedContent()` - 最適化コンテンツ統合
- `createDifferentiatedContent()` - 差別化コンテンツ作成

**残留メソッド（content-generator.ts）**:
- `generatePost()` - メイン生成メソッド
- `generateQuoteComment()` - 引用コメント生成
- `generateTrendAwareContent()` - トレンド連動生成
- `generateCompetitorAwareContent()` - 競合分析活用生成
- `generateWithClaude()` - Claude SDK呼び出し

### Phase 3: post-analyzer.ts 分割
**移行対象メソッド**:

**→ engagement-predictor.ts**:
- `evaluateEngagement()` - エンゲージメント予測
- `calculateBaseEngagement()` - 基本エンゲージメント計算
- `getBestPostingTime()` - 最適投稿時間
- `getTimeAdjustment()` - 時間帯調整
- `calculatePredictionConfidence()` - 予測信頼度
- `analyzePerformance()` - パフォーマンス事後分析

**残留メソッド（post-analyzer.ts）**:
- `analyzeQuality()` - 品質分析
- `analyzePost()` - 包括的投稿分析
- `generateRecommendations()` - 改善提案生成
- `identifyIssues()` - 問題特定
- `analyzeSentiment()` - センチメント分析

## 🏗️ 実装要件

### 技術要件
- **TypeScript strict モード**: 全ファイルで型安全性確保
- **インターフェース分離**: 各ファイル間の依存関係を明確に定義
- **エラーハンドリング**: 各分割後ファイルで適切なエラー処理
- **ログ出力**: 機能別に適切なログレベル設定

### MVP制約遵守
- **実用最優先**: Clean Architectureの複雑さより動作確実性
- **シンプル設計**: 過度な抽象化を避ける
- **統計・分析機能除外**: MVPに不要な高度分析は実装しない
- **30分間隔実行対応**: 実行時間制約を考慮した実装

### 疎結合原則
- **依存注入**: 各クラス間の依存関係を注入方式で管理
- **インターフェース定義**: 各ファイルの公開インターフェースを明確化
- **責務分離**: 各ファイルが単一の明確な責任を持つ
- **相互依存回避**: 循環参照を避けた設計

## 📁 ファイル別実装詳細

### 1. market-analyzer.ts
```typescript
export interface MarketContext {
  sentiment: 'bearish' | 'neutral' | 'bullish';
  volatility: 'low' | 'medium' | 'high';
  trendingTopics: string[];
  highEngagementOpportunities: any[];
  competitorActivity: any[];
}

export class MarketAnalyzer {
  constructor(
    private searchEngine: SearchEngine,
    private kaitoClient: KaitoTwitterAPIClient
  );
  
  // 移行メソッド
  async analyzeMarketContext(): Promise<MarketContext>;
  synthesizeMarketContext(marketSentiment: any, highEngagementTweets: any[], trendingTopics: any[]): MarketContext;
  private calculateVolatility(marketSentiment: any): 'low' | 'medium' | 'high';
  buildEnhancedPrompt(accountStatus: any, trendData: any[], marketContext: MarketContext): string;
  async executeEnhancedDecision(enhancedPrompt: string, marketContext: MarketContext): Promise<ClaudeDecision>;
}
```

### 2. content-validator.ts
```typescript
export interface ContentValidationResult {
  isValid: boolean;
  quality: QualityMetrics;
  issues: string[];
  recommendations: string[];
}

export class ContentValidator {
  constructor();
  
  // 移行メソッド
  evaluateQuality(content: string, topic: string): QualityMetrics;
  private evaluateReadability(content: string): number;
  private evaluateRelevance(content: string, topic: string): number;
  private evaluateEngagementPotential(content: string): number;
  containsKorean(text: string): boolean;
  processContent(content: string): string;
  validateContent(content: string, topic: string): ContentValidationResult;
}
```

### 3. prompt-builder.ts
```typescript
export interface PromptConfig {
  contentType: string;
  targetAudience: string;
  maxLength: number;
  includeRiskWarning: boolean;
}

export class PromptBuilder {
  constructor();
  
  // 移行メソッド
  buildPrompt(topic: string, context: any, config: PromptConfig): string;
  private getGenerationStrategy(contentType: string): any;
  analyzeTrendOpportunity(trendingTopics: any[], topic: string): any;
  async synthesizeOptimizedContent(topic: string, trendAnalysis: any, popularContent: any[]): Promise<string>;
  async createDifferentiatedContent(competitorAnalysis: any[]): Promise<string>;
}
```

### 4. engagement-predictor.ts
```typescript
export interface EngagementPrediction {
  estimated_likes: number;
  estimated_retweets: number;
  estimated_replies: number;
  engagement_rate: number;
  best_posting_time: string;
  confidence: number;
}

export class EngagementPredictor {
  constructor();
  
  // 移行メソッド
  async evaluateEngagement(tweet: TweetData): Promise<EngagementPrediction>;
  private calculateBaseEngagement(content: string, hashtags: string[], mentions: string[]): number;
  private getBestPostingTime(): string;
  private getTimeAdjustment(postingTime: string): number;
  private calculatePredictionConfidence(content: string, hashtags: string[]): number;
  async analyzePerformance(tweet: TweetData): Promise<PerformanceAnalysis>;
}
```

## 🔄 更新される既存ファイル

### decision-engine.ts（更新）
```typescript
import { MarketAnalyzer, MarketContext } from './market-analyzer';

export class ClaudeDecisionEngine {
  constructor(
    private searchEngine: SearchEngine,
    private kaitoClient: KaitoTwitterAPIClient,
    private marketAnalyzer: MarketAnalyzer
  );
  
  // 新統合メソッド
  async makeEnhancedDecision(): Promise<ClaudeDecision> {
    const marketContext = await this.marketAnalyzer.analyzeMarketContext();
    // 決定ロジック実装
  }
  
  // 既存メソッドは維持
  async makeDecision(context: SystemContext): Promise<ClaudeDecision>;
  validateDecision(decision: ClaudeDecision): boolean;
}
```

### content-generator.ts（更新）
```typescript
import { ContentValidator } from './content-validator';
import { PromptBuilder } from './prompt-builder';

export class ContentGenerator {
  constructor(
    private searchEngine?: SearchEngine,
    private contentValidator?: ContentValidator,
    private promptBuilder?: PromptBuilder
  );
  
  // 既存メソッドは統合方式で維持
  async generatePost(request: ContentRequest): Promise<GeneratedContent>;
  async generateQuoteComment(originalTweet: any): Promise<string>;
  async generateTrendAwareContent(topic: string): Promise<string>;
}
```

### post-analyzer.ts（更新）
```typescript
import { EngagementPredictor } from './engagement-predictor';

export class PostAnalyzer {
  constructor(private engagementPredictor?: EngagementPredictor);
  
  // 統合分析メソッド
  async analyzePost(content: string): Promise<PostAnalysis> {
    const [quality, engagement] = await Promise.all([
      this.analyzeQuality(content),
      this.engagementPredictor?.evaluateEngagement({ content })
    ]);
    // 統合結果返却
  }
  
  // 既存品質分析メソッドは維持
  async analyzeQuality(content: string): Promise<QualityMetrics>;
}
```

## 🧪 テスト要件

### 単体テスト
- 各新規ファイルに対応するテストファイル作成
- 分割された機能の個別テスト実装
- エラーハンドリングのテスト追加

### 統合テスト
- 既存ファイルと新規ファイルの連携テスト
- エンドツーエンドの動作確認
- KaitoAPI統合部分のモックテスト

## ⚠️ 注意事項

### 既存機能の互換性
- 既存のパブリックAPIは変更しない
- 外部から呼び出されている機能は維持
- インポート文の更新が必要な箇所は明記

### エラーハンドリング
- 分割により発生する可能性のある新しいエラーケース対応
- 依存クラスが利用できない場合のフォールバック実装
- 適切なログ出力とエラー報告

### パフォーマンス
- ファイル分割による実行時間への影響最小化
- 必要に応じてインスタンス再利用の仕組み実装
- メモリ使用量の最適化

## 📊 完了基準

### 機能要件
- [ ] 7ファイルへの分割完了
- [ ] 既存パブリックAPI完全互換
- [ ] 全メソッドの動作確認
- [ ] エラーハンドリング実装

### 品質要件  
- [ ] TypeScript strict モード通過
- [ ] lint/type-check エラー0件
- [ ] 単体テスト実装・通過
- [ ] 統合テスト実装・通過

### ドキュメント
- [ ] 各ファイルのインターフェース文書化
- [ ] 依存関係図作成
- [ ] 移行手順書作成
- [ ] 使用例の更新

## 📝 報告書要件

実装完了後、以下の報告書を作成してください：
`tasks/20250724_121013_claude_sdk_implementation/reports/REPORT-001-claude-sdk-architecture-refactoring.md`

### 報告内容
1. 分割実装の詳細
2. 各ファイルの責務と依存関係
3. 既存機能との互換性確認結果
4. テスト実行結果
5. パフォーマンス影響評価
6. 今後の拡張における推奨事項

---

**重要**: このタスクは汎用性の高い疎結合ライブラリ実現のための基盤作業です。品質を最優先とし、妥協は一切認められません。