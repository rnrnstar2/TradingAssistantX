# TASK-003: コンテンツ収束エンジン実装

## 🎯 核心目的
収集された大量のFX情報を**価値ある1つの投稿**に収束させる知的統合システムを実装。情報の本質を抽出し、読者に最大価値を提供する投稿を自動生成する。

## 📝 技術要件

### 実装対象ファイル
- `src/lib/content-convergence-engine.ts` - メイン収束システム
- `src/lib/convergence/insight-synthesizer.ts` - 洞察統合器
- `src/lib/convergence/narrative-builder.ts` - 物語構築器
- `src/lib/convergence/value-maximizer.ts` - 価値最大化器
- `src/types/convergence-types.ts` - 収束システム型定義

### 核心機能

#### 1. コンテンツ収束エンジン本体
```typescript
class ContentConvergenceEngine {
  // 大量情報の知的統合
  async convergeToSinglePost(collectedData: CollectionResult[]): Promise<ConvergedPost>
  
  // 最重要インサイトの抽出
  async extractCoreInsights(data: CollectionResult[]): Promise<CoreInsight[]>
  
  // 読者価値の最大化
  async maximizeReaderValue(insights: CoreInsight[]): Promise<ValueOptimizedContent>
  
  // 投稿完成度の検証
  async validatePostQuality(post: ConvergedPost): Promise<QualityAssessment>
}
```

#### 2. 洞察統合器
```typescript
class InsightSynthesizer {
  // 情報パターンの発見
  discoverInformationPatterns(data: CollectionResult[]): InformationPattern[]
  
  // 重複情報の知的統合
  synthesizeDuplicateInformation(similar: CollectionResult[]): SynthesizedInsight
  
  // 矛盾情報の解決
  resolveConflictingInformation(conflicts: ConflictingData[]): ResolvedInsight
  
  // 隠れた関連性の発見
  discoverHiddenConnections(data: CollectionResult[]): ConnectionInsight[]
}

interface CoreInsight {
  id: string;
  category: 'market_trend' | 'economic_indicator' | 'expert_opinion' | 'breaking_news';
  content: string;
  confidence: number;        // 0-100
  impact: 'high' | 'medium' | 'low';
  sources: string[];
  timeRelevance: TimeRelevance;
  educationalValue: number;  // 0-100
}
```

#### 3. 物語構築器
```typescript
class NarrativeBuilder {
  // 投稿の論理構造構築
  buildLogicalStructure(insights: CoreInsight[]): PostStructure
  
  // 読みやすい流れの作成
  createReadableFlow(structure: PostStructure): NarrativeFlow
  
  // 専門用語の適切な説明
  explainTechnicalTerms(content: string): EnhancedContent
  
  // エンゲージメント要素の追加
  addEngagementElements(content: string): EngagingContent
}

interface PostStructure {
  hook: string;              // 読者の関心を引くオープニング
  mainPoints: MainPoint[];   // 主要ポイント
  supporting: SupportingDetail[]; // 裏付け情報
  conclusion: string;        // まとめ・展望
  callToAction?: string;     // 行動喚起（オプション）
}
```

#### 4. 価値最大化器
```typescript
class ValueMaximizer {
  // 教育価値の最大化
  maximizeEducationalValue(content: string): EducationallyEnhanced
  
  // 実用性の強化
  enhancePracticalUtility(content: string): PracticallyEnhanced
  
  // 独自性の確保
  ensureUniqueness(content: string, existingPosts: string[]): UniqueContent
  
  // タイムリー性の最適化
  optimizeTimeliness(content: string, marketContext: MarketContext): TimelyContent
}
```

## 🧠 知的統合アルゴリズム

### 情報重要度スコアリング
```typescript
interface ImportanceScoring {
  // 市場インパクトによるスコアリング
  marketImpactScore: (info: CollectionResult) => number;
  
  // 教育価値によるスコアリング
  educationalValueScore: (info: CollectionResult) => number;
  
  // 新規性によるスコアリング
  noveltyScore: (info: CollectionResult, existing: CollectionResult[]) => number;
  
  // 時間的重要性
  timelinesScore: (info: CollectionResult) => number;
}

class InformationRanker {
  // 複合スコアリング
  calculateCompositeScore(info: CollectionResult, context: MarketContext): number
  
  // 相対重要度の算出
  calculateRelativeImportance(infos: CollectionResult[]): RankedInformation[]
  
  // 情報間の相乗効果分析
  analyzeSynergyEffects(infos: CollectionResult[]): SynergyAnalysis
}
```

### 自動物語生成ロジック
```typescript
interface StorytellingTemplate {
  // 市場動向記事テンプレート
  marketTrend: {
    hook: string;
    context: string;
    analysis: string;
    implications: string;
    conclusion: string;
  };
  
  // 経済指標解説テンプレート
  economicIndicator: {
    indicator: string;
    result: string;
    analysis: string;
    marketReaction: string;
    outlook: string;
  };
  
  // 専門家見解統合テンプレート
  expertSynthesis: {
    consensus: string;
    dissenting: string;
    analysis: string;
    implications: string;
  };
}

class AutoStoryGenerator {
  // 最適テンプレート選択
  selectOptimalTemplate(insights: CoreInsight[]): StorytellingTemplate
  
  // テンプレートの知的補完
  fillTemplateIntelligently(template: any, data: CoreInsight[]): CompletedStory
  
  // 自然な文章への変換
  convertToNaturalLanguage(structure: CompletedStory): NaturalLanguagePost
}
```

### 品質保証システム
```typescript
class QualityAssurance {
  // ファクトチェック
  verifyFactualAccuracy(post: ConvergedPost): FactCheckResult
  
  // 読みやすさ評価
  assessReadability(content: string): ReadabilityScore
  
  // 投稿価値の定量評価
  measurePostValue(post: ConvergedPost): ValueMetrics
  
  // 最終品質スコア
  calculateOverallQuality(post: ConvergedPost): QualityScore
}

interface QualityMetrics {
  factualAccuracy: number;    // 0-100
  readability: number;        // 0-100
  educationalValue: number;   // 0-100
  uniqueness: number;         // 0-100
  engagement: number;         // 0-100
  timeliness: number;         // 0-100
}
```

## 📊 実装仕様

### 情報統合アルゴリズム
```typescript
class InformationIntegrator {
  // クラスタリングによる情報分類
  clusterInformation(data: CollectionResult[]): InformationCluster[]
  
  // クラスター内の情報統合
  integrateClusterInformation(cluster: InformationCluster): IntegratedInformation
  
  // 統合結果の品質評価
  evaluateIntegrationQuality(integrated: IntegratedInformation): IntegrationQuality
}

interface InformationCluster {
  topic: string;
  items: CollectionResult[];
  centralTheme: string;
  confidence: number;
  importance: number;
}
```

### 投稿フォーマット最適化
```typescript
interface PostFormat {
  // X(Twitter)最適化
  twitter: {
    maxLength: 280;
    hashtags: string[];
    mentions?: string[];
    mediaAttachment?: boolean;
  };
  
  // 長文投稿用
  thread: {
    posts: string[];
    continuityMarkers: string[];
    summaryPost: string;
  };
}

class FormatOptimizer {
  // 最適投稿形式の決定
  determineOptimalFormat(content: string, requirements: PostRequirements): PostFormat
  
  // 文字数制約への適応
  adaptToLengthConstraints(content: string, maxLength: number): AdaptedContent
  
  // エンゲージメント要素の追加
  addEngagementEnhancers(post: string): EnhancedPost
}
```

## 🎯 投稿品質基準

### 最低品質基準
```typescript
const QUALITY_STANDARDS = {
  // 必須要素
  required: {
    factualAccuracy: 90,      // ファクト正確性90%以上
    readability: 80,          // 読みやすさ80%以上
    educationalValue: 75,     // 教育価値75%以上
    uniqueness: 70,           // 独自性70%以上
  },
  
  // 推奨レベル
  preferred: {
    factualAccuracy: 95,
    readability: 90,
    educationalValue: 85,
    uniqueness: 80,
    timeliness: 85,
  },
  
  // エクセレンス基準
  excellence: {
    factualAccuracy: 98,
    readability: 95,
    educationalValue: 90,
    uniqueness: 85,
    timeliness: 90,
    engagement: 80,
  }
};
```

### 自動品質改善
```typescript
class QualityImprover {
  // 低品質部分の特定
  identifyWeakAreas(post: ConvergedPost, quality: QualityMetrics): WeakArea[]
  
  // 自動改善提案
  generateImprovementSuggestions(weakAreas: WeakArea[]): ImprovementSuggestion[]
  
  // 改善の自動適用
  autoApplyImprovements(post: ConvergedPost, suggestions: ImprovementSuggestion[]): ImprovedPost
}
```

## 🔧 システム統合

### 他システムとの連携
```typescript
interface SystemIntegration {
  // 探索エンジンとの統合
  integrateExplorationResults: (results: ExplorationResult[]) => ProcessedData;
  
  // リソース管理との連携
  respectResourceConstraints: (limits: ResourceConstraints) => ConstrainedExecution;
  
  // 既存投稿システムとの統合
  integrateWithPostingSystem: (post: ConvergedPost) => PostingInstruction;
}
```

### リアルタイム適応機能
```typescript
class AdaptiveContentGenerator {
  // 市場状況に応じた適応
  adaptToMarketCondition(post: ConvergedPost, condition: MarketCondition): AdaptedPost
  
  // ユーザー反応に基づく学習
  learnFromUserReactions(post: ConvergedPost, reactions: UserReaction[]): LearningUpdate
  
  // 継続的な品質改善
  continuousQualityImprovement(history: PostHistory): QualityImprovementPlan
}
```

## 📤 出力フォーマット

### 収束結果
```typescript
interface ConvergedPost {
  id: string;
  content: string;
  metadata: {
    sourceCount: number;
    processingTime: number;
    qualityScore: QualityScore;
    confidence: number;
    category: PostCategory;
  };
  insights: CoreInsight[];
  structure: PostStructure;
  alternatives?: AlternativePost[];
}
```

### 品質レポート
```typescript
interface QualityReport {
  overall: QualityScore;
  breakdown: QualityBreakdown;
  improvements: ImprovementSuggestion[];
  comparisonWithPrevious?: QualityComparison;
}
```

## 🚀 実装フロー

### Phase 1: 基盤統合システム
1. 型定義の作成
2. 基本的な情報統合ロジック
3. シンプルな投稿生成機能

### Phase 2: 高度収束アルゴリズム
1. 洞察統合器の実装
2. 物語構築器の実装  
3. 品質保証システムの実装

### Phase 3: 最適化・学習機能
1. 価値最大化アルゴリズム
2. 自動品質改善機能
3. 統合テスト・検証

## 📤 出力先

### ファイル出力
- **実装コード**: 上記指定パス
- **生成投稿サンプル**: `tasks/20250721_233822_autonomous_fx_collection_mvp/outputs/sample-converged-posts.json`
- **品質分析レポート**: `tasks/20250721_233822_autonomous_fx_collection_mvp/outputs/quality-analysis.json`
- **収束プロセスログ**: `tasks/20250721_233822_autonomous_fx_collection_mvp/outputs/convergence-logs.txt`

### レポート作成
実装完了後、以下を含む報告書を作成:
- 収束アルゴリズムの動作確認
- 実際の投稿生成デモ
- 品質評価システムの検証
- システム改善提案

## ⚡ パフォーマンス目標

### 処理効率
- **収束処理時間**: 15秒以内
- **品質評価時間**: 5秒以内
- **メモリ使用量**: 30MB以下
- **最終投稿生成**: 3秒以内

### 品質基準
- **総合品質スコア**: 85点以上
- **読者満足度予測**: 80%以上
- **ファクト正確性**: 95%以上
- **独自性スコア**: 75%以上

## ⚠️ 制約・注意事項

### 技術制約
- **TypeScript strict**: 全コードでstrict対応必須
- **自然言語処理**: 軽量なアルゴリズム使用（重いNLP避ける）
- **メモリ効率**: 大量テキストの効率処理
- **品質保証**: 投稿品質の客観評価必須

### MVP制約遵守
- 機械学習は最小限（ルールベース中心）
- 過度な自然言語生成AI依存禁止
- 設定可能項目は核心機能のみ
- 現在動作を最優先

このシステムにより、収集した大量のFX情報を読者にとって価値ある1つの投稿に効率的に収束させ、教育的かつ実用的なコンテンツを自動生成します。