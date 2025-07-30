# TASK-001: 深夜大規模分析エンドポイント実装

## 🎯 タスク概要
src/claude/endpoints/analysis-endpoint.ts を拡張し、23:55に実行される深夜大規模分析システムの核心機能を実装する。

## 📋 参照必須ドキュメント
実装前に以下のドキュメントを必ず読み込んでください：
- `docs/claude.md` - 深夜大規模分析システム仕様（🌙 マークの章）
- `docs/workflow.md` - Step 4深夜大規模分析の詳細
- `docs/directory-structure.md` - 新学習データ構造

## 🎯 実装目標
現在の基本的な分析機能を拡張し、1日分のデータを包括的に分析して翌日戦略を生成する高度な分析システムを構築する。

## 📊 実装内容詳細

### 1. 新インターフェース定義
以下のインターフェースをanalysis-endpoint.tsに追加：

```typescript
// 深夜大規模分析結果
export interface DeepNightAnalysisResult {
  analysisDate: string; // YYYY-MM-DD
  executionTime: number; // 分析処理時間（ミリ秒）
  performanceInsights: PerformanceInsight[];
  marketOpportunities: MarketOpportunity[];
  optimizationStrategies: OptimizationStrategy[];
  tomorrowStrategy: TomorrowStrategy;
  confidence: number; // 0-1
}

// 時間帯別パフォーマンス洞察
export interface PerformanceInsight {
  timeSlot: string; // "07:00-10:00" 形式
  successRate: number; // 0-1
  optimalTopics: string[];
  avgEngagementRate: number;
  recommendedActions: string[];
}

// 翌日実行戦略
export interface TomorrowStrategy {
  priorityActions: Array<{
    timeSlot: string;
    action: string;
    topic: string;
    expectedEngagement: number;
    reasoning: string;
  }>;
  avoidanceRules: Array<{
    condition: string;
    action: string;
    reason: string;
  }>;
  expectedMetrics: {
    targetFollowerGrowth: number;
    targetEngagementRate: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// 最適化戦略
export interface OptimizationStrategy {
  pattern: string;
  implementation: string;
  expectedImpact: string;
  confidence: number;
}
```

### 2. 深夜大規模分析メイン関数実装
以下の関数をanalysis-endpoint.tsに追加：

```typescript
/**
 * 深夜大規模分析実行（23:55専用）
 * 1日分のデータを包括分析し、翌日戦略を生成
 */
export async function executeDeepNightAnalysis(): Promise<DeepNightAnalysisResult> {
  const startTime = Date.now();
  const analysisDate = new Date().toISOString().split('T')[0];
  
  console.log('🌙 深夜大規模分析開始:', analysisDate);
  
  try {
    // 1. 日中データ収集
    const dailyData = await collectDailyExecutionData();
    
    // 2. パフォーマンス深層分析
    const performanceInsights = await analyzeTimeBasedPerformance(dailyData);
    
    // 3. 市場トレンド包括評価  
    const marketOpportunities = await evaluateMarketTrends(dailyData);
    
    // 4. 戦略最適化エンジン
    const optimizationStrategies = await generateOptimizationStrategies(
      performanceInsights, 
      marketOpportunities
    );
    
    // 5. 翌日戦略生成
    const tomorrowStrategy = await generateTomorrowStrategy(
      performanceInsights,
      marketOpportunities,
      optimizationStrategies
    );
    
    const executionTime = Date.now() - startTime;
    
    const result: DeepNightAnalysisResult = {
      analysisDate,
      executionTime,
      performanceInsights,
      marketOpportunities,
      optimizationStrategies,
      tomorrowStrategy,
      confidence: calculateOverallConfidence(performanceInsights, marketOpportunities)
    };
    
    console.log(`✅ 深夜大規模分析完了: ${executionTime}ms`);
    return result;
    
  } catch (error) {
    console.error('❌ 深夜大規模分析エラー:', error);
    throw new Error(`Deep night analysis failed: ${error.message}`);
  }
}
```

### 3. 分析サブ機能実装
以下の分析機能を実装：

#### 3.1 時間帯別パフォーマンス分析
```typescript
async function analyzeTimeBasedPerformance(dailyData: any[]): Promise<PerformanceInsight[]> {
  // 時間帯を3時間区切りで分析
  const timeSlots = [
    '07:00-10:00', '10:00-13:00', '13:00-16:00', 
    '16:00-19:00', '19:00-22:00', '22:00-01:00'
  ];
  
  // 各時間帯の成功率・最適トピック・推奨アクションを分析
}
```

#### 3.2 市場トレンド包括評価
```typescript
async function evaluateMarketTrends(dailyData: any[]): Promise<MarketOpportunity[]> {
  // 投資教育需要の時系列変化分析
  // 新興トピック機会発見  
  // 市場センチメント変化の影響度測定
}
```

#### 3.3 翌日戦略生成エンジン
```typescript
async function generateTomorrowStrategy(
  insights: PerformanceInsight[],
  opportunities: MarketOpportunity[],
  strategies: OptimizationStrategy[]
): Promise<TomorrowStrategy> {
  // 時間帯別最適アクション組み合わせ生成
  // リスク要因の事前特定と回避策
  // 成長機会の優先順位付け
}
```

### 4. Claude AI統合強化
既存のClaudeAnalysis機能を拡張し、深夜大規模分析専用のプロンプトとロジックを実装：

```typescript
async function executeClaudeDeepAnalysis(
  dailyData: any[], 
  analysisType: 'performance' | 'market' | 'strategy'
): Promise<any> {
  // 深夜分析専用のClaudeプロンプト構築
  // 長時間分析に最適化されたプロンプト設計
  // 結果の信頼性検証機能
}
```

## 🚨 重要な制約・注意事項

### MVP制約遵守
- ✅ **必要最小限の機能**: 翌日戦略生成に必要な分析機能のみ実装
- 🚫 **統計ダッシュボード禁止**: 分析結果の可視化機能は実装しない
- 🚫 **過剰な最適化禁止**: パフォーマンス最適化より機能完全性を優先

### 技術的制約
- **Claude API制限**: 深夜分析は長時間処理のため適切なタイムアウト設定（60秒）
- **メモリ効率**: 1日分のデータを効率的に処理（不要データの即座破棄）
- **エラーハンドリング**: 分析エラー時もシステム継続できる設計

### データ整合性
- **型安全性**: すべてのインターフェースはTypeScript strict mode対応
- **データ検証**: 分析データの整合性チェック機能
- **後方互換性**: 既存の分析機能を破壊しない拡張

## 📂 出力管理
- ❌ **ルートディレクトリ出力禁止**: 分析結果を直接ルートに出力しない
- ✅ **data/learning/**: 分析結果は適切なディレクトリに保存
- ✅ **ファイル命名**: daily-insights-YYYYMMDD.yaml 形式に従う

## 🧪 テスト要件
1. **単体テスト**: 各分析機能の正常系・異常系テスト
2. **統合テスト**: 1日分のモックデータを使用した全体テスト
3. **エラーハンドリングテスト**: Claude API失敗時の動作確認
4. **パフォーマンステスト**: 15-30分以内の処理完了確認

## ✅ 完了基準
1. すべての新インターフェースが型安全に実装されている
2. executeDeepNightAnalysis()が完全に動作する
3. モックデータでの分析結果が妥当な内容を返す
4. 既存の分析機能が正常に動作する
5. npm run lint および npm run typecheck が通る
6. 単体テストがすべて通る

## 📋 実装後の報告書作成
実装完了後、以下の報告書を作成してください：
- 📄 **報告書パス**: `tasks/20250730_151951/reports/REPORT-001-deep-night-analysis-endpoint.md`
- 📊 **実装内容**: 新機能の詳細・テスト結果・動作確認
- 🚨 **重要**: TypeScript型チェックとlintの通過確認を含める

## 🎯 最重要事項
この実装により、TradingAssistantXは単なる自動投稿ツールから、**学習・進化する投資教育AI**へと進化します。実装品質と機能完全性を最優先とし、妥協のない高品質な実装をお願いします。