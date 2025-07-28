# performance-analyzer.ts 新規実装指示書

## 🎯 実装目的
**システム最重要欠落機能**: performance-analyzer.ts が完全に存在せず、学習・最適化・エンゲージメント分析機能が全て欠如している状況を解決。自律的なシステム改善を可能にする。

## 📂 実装対象
**ファイルパス**: `src/services/performance-analyzer.ts`
**理由**: 調査結果により完全に欠如していることが確認済み

## 🔍 必須参照
**REQUIREMENTS.md** を必ず読み込み、以下の要件と整合性を確保すること：
- 分析・評価機能（REQUIREMENTS.md 198行目）
- 理想のワークフロー効果測定（REQUIREMENTS.md 138行目）
- 階層データから最適戦略を高速選択（REQUIREMENTS.md 134行目）
- 継続的最適化と学習（REQUIREMENTS.md 18-19行目）

## ⚠️ MVP制約遵守
**シンプルさ最優先**: 複雑な統計機能・高度な分析は実装しない
**実用性重視**: 意思決定に直接貢献する機能のみ実装
**拡張性確保**: 将来の機能追加に対応可能な設計

## 🚀 実装機能要件

### 1. エンゲージメント分析機能
```typescript
interface EngagementAnalysis {
  analyzePostPerformance(postData: PostData): EngagementMetrics;
  calculateEngagementRate(metrics: PostMetrics): number;
  identifyHighPerformingContent(): ContentPattern[];
}
```

**実装内容**:
- 投稿のいいね・RT・返信数分析
- エンゲージメント率計算（エンゲージメント数/フォロワー数）
- アカウント成長段階判定（集中特化/段階的拡張/多様化展開）
- 高エンゲージメントコンテンツのパターン特定

### 2. 投稿効果測定機能
```typescript
interface PostEffectivenessMeasurement {
  measurePostImpact(postId: string): PostImpactResult;
  trackDailyPerformance(): DailyPerformanceReport;
  generateWeeklyInsights(): WeeklyInsights;
}
```

**実装内容**:
- 個別投稿の効果測定（時間経過による数値変化）
- 投稿時間とエンゲージメントの相関分析
- 日次パフォーマンス追跡
- コンテンツ戦略（教育重視/トレンド対応/分析特化）別効果測定

### 3. 日次インサイト抽出機能
```typescript
interface DailyInsightExtraction {
  extractDailyInsights(): DailyInsights;
  updateLearningData(insights: DailyInsights): void;
  generateRecommendations(): StrategyRecommendation[];
}
```

**実装内容**:
- 1日の投稿パフォーマンス総合評価
- 最も効果的だった投稿時間・コンテンツタイプの特定
- フォロワー増減とコンテンツ戦略の相関分析
- 次日の戦略推奨（RSS集中/複合収集/アカウント分析の選択根拠）

### 4. 成長段階判定ロジック
```typescript
interface GrowthStageAssessment {
  determineCurrentStage(accountMetrics: AccountMetrics): GrowthStage;
  evaluateStrategyEffectiveness(): StrategyEffectiveness;
  suggestStageTransition(): StageTransitionAdvice;
}
```

**実装内容**:
- REQUIREMENTS.md 72-75行目の成長段階判定
- 集中特化段階（エンゲージメント低・テーマ分散時）
- 段階的拡張段階（安定エンゲージメント時）
- 多様化展開段階（高エンゲージメント・複数実績時）

### 5. 学習データ更新機能
```typescript
interface LearningDataUpdate {
  updateEngagementPatterns(newData: EngagementData): void;
  archiveInsights(): void;
  optimizeDataHierarchy(): void;
}
```

**実装内容**:
- `data/learning/engagement-patterns.yaml` 更新
- `data/learning/post-insights.yaml` 更新  
- data/current/ → data/learning/ → data/archives/ 階層移動
- 古いデータの圧縮・アーカイブ

## 🏗️ クラス設計

```typescript
export class PerformanceAnalyzer {
  private yamlManager: YamlManager;
  private logger: Logger;
  
  constructor() {
    this.yamlManager = new YamlManager();
    this.logger = new Logger('PerformanceAnalyzer');
  }
  
  // エンゲージメント分析
  async analyzeEngagement(timeFrame: 'daily' | 'weekly'): Promise<EngagementAnalysis> { }
  
  // 投稿効果測定
  async measurePostEffectiveness(postIds: string[]): Promise<PostEffectivenessReport> { }
  
  // 成長段階判定
  async assessGrowthStage(accountData: AccountData): Promise<GrowthStageAssessment> { }
  
  // 日次インサイト抽出
  async extractDailyInsights(): Promise<DailyInsights> { }
  
  // 学習データ更新
  async updateLearningData(insights: DailyInsights): Promise<void> { }
  
  // 戦略推奨
  async generateStrategyRecommendations(): Promise<StrategyRecommendation[]> { }
}
```

## 🔗 他システムとの連携

### autonomous-executor.ts との連携
- Phase6（学習最適化）での呼び出し
- 実行結果の分析とフィードバック提供

### decision-engine.ts との連携  
- 成長段階判定結果の提供
- エンゲージメント状態の判定データ提供
- 戦略選択の根拠データ提供

### data-hierarchy-manager.ts との連携
- 学習データの階層移動指示
- データ価値評価への分析結果提供

## 📊 出力データ形式

### data/learning/engagement-patterns.yaml
```yaml
engagement_patterns:
  last_updated: "2025-01-23T10:00:00Z"
  high_engagement_times:
    - hour: 21
      avg_engagement_rate: 0.08
    - hour: 12  
      avg_engagement_rate: 0.06
  effective_content_types:
    - type: "educational_basic"
      avg_engagement: 0.07
      success_rate: 0.85
  growth_stage: "集中特化段階"
  stage_confidence: 0.92
```

### tasks/outputs/daily-performance-analysis.yaml
```yaml
daily_analysis:
  date: "2025-01-23"
  posts_analyzed: 3
  total_engagement: 150
  avg_engagement_rate: 0.065
  best_performing_post:
    id: "post_20250123_001"
    engagement_rate: 0.12
    content_type: "educational_basic"
  recommendations:
    - "教育重視型コンテンツの継続"
    - "夜21時台の投稿時間最適"
  next_strategy: "RSS集中収集"
```

## 🧪 テスト・品質確保

### 単体テスト要件
- 各分析メソッドの正確性テスト
- エラーハンドリングテスト
- データ形式検証テスト

### 統合テスト要件
- autonomous-executor.ts との連携テスト
- YAML ファイル読み書きテスト
- 階層データ移動テスト

## ⚡ パフォーマンス要件
- 日次分析処理: 30秒以内
- メモリ使用量: 最大50MB
- エラー時の適切なフォールバック

## 🔐 セキュリティ・制約
- data/config/ への書き込み禁止
- 許可された出力先のみ使用: data/current/, data/learning/, tasks/outputs/
- 個人情報・機密データの適切な取り扱い

## 📝 実装完了条件
1. PerformanceAnalyzer クラスの完全実装
2. 全ての required メソッドの実装
3. エラーハンドリングの実装
4. TypeScript strict mode での型安全性確保
5. 基本的な単体テストの実装
6. REQUIREMENTS.md との整合性確認
7. 既存システムとの連携テスト

## 🚨 注意事項
- **Worker権限での実装**: Manager権限での編集禁止
- **MVP原則遵守**: 複雑な機械学習・統計解析は実装しない
- **実データ使用**: モックデータ・テストモードは使用しない
- **疎結合設計**: 他のサービスへの依存を最小限に
- **完全性優先**: 動作する完全な機能を実装

## ✅ 完了報告
実装完了後、以下の報告書を作成すること：
**報告書**: `tasks/outputs/performance-analyzer-implementation-report.md`

**報告内容**:
- 実装した機能の詳細
- テスト結果
- 既存システムとの連携確認結果
- パフォーマンス測定結果
- 今後の改善提案