# TASK-003: MainWorkflow Step 4（深夜大規模分析）実装

## 🎯 タスク概要
src/workflows/main-workflow.ts に深夜大規模分析（Step 4）を実装し、23:55時に自動的に翌日戦略生成まで完了する機能を追加する。

## ⚠️ 依存関係
このタスクは以下のタスクの完了後に実行してください：
- ✅ **TASK-001**: 深夜大規模分析エンドポイント実装
- ✅ **TASK-002**: 新学習データ構造対応実装

## 📋 参照必須ドキュメント
実装前に以下のドキュメントを必ず読み込んでください：
- `docs/workflow.md` - Step 4: 結果保存・深夜大規模分析
- `docs/claude.md` - 🌙 深夜大規模分析システム：24時間学習サイクル
- `docs/directory-structure.md` - 新学習データ構造

## 🎯 実装目標
現在の3ステップワークフロー（データ収集→アクション実行→結果保存）に、23:55時のみ実行される第4ステップ（深夜大規模分析）を追加し、翌日戦略生成まで自動完了する。

## 📊 実装内容詳細

### 1. 23:55判定機能の実装
MainWorkflow.execute()メソッドに23:55時の特別処理判定を追加：

```typescript
/**
 * 3ステップのメインワークフロー実行（23:55時は4ステップ）
 */
static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
  const startTime = Date.now();
  let executionId: string;

  try {
    console.log('🚀 メインワークフロー実行開始');

    // 既存の初期化処理...
    
    // 現在時刻の取得と深夜分析判定
    const currentTime = new Date();
    const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    const isDeepNightAnalysisTime = timeString === '23:55';
    
    if (isDeepNightAnalysisTime) {
      console.log('🌙 深夜大規模分析時刻を検出: Step 4実行モード');
    }

    // 既存のStep 1-3処理...
    
    // Step 4: 深夜大規模分析（23:55のみ）
    if (isDeepNightAnalysisTime) {
      console.log('🌙 Step 4: 深夜大規模分析開始');
      const analysisResult = await this.executeDeepNightAnalysis(executionId);
      console.log('✅ Step 4: 深夜大規模分析完了');
      
      // 結果にanalysisResultを追加
      return {
        success: true,
        executionId,
        decision,
        actionResult,
        deepNightAnalysis: analysisResult, // 新規追加
        executionTime: Date.now() - startTime
      };
    }

    // 通常実行の結果返却...

  } catch (error) {
    // 既存のエラーハンドリング...
  }
}
```

### 2. 深夜大規模分析実行メソッド実装
新しいプライベートメソッドを追加：

```typescript
/**
 * 深夜大規模分析の実行（Step 4）
 * 23:55時のみ実行される特別処理
 */
private static async executeDeepNightAnalysis(executionId: string): Promise<any> {
  const analysisStartTime = Date.now();
  
  try {
    console.log(`🌙 深夜大規模分析開始 - ExecutionID: ${executionId}`);
    
    // 1. 深夜大規模分析の実行（TASK-001で実装されるメソッドを使用）
    const { executeDeepNightAnalysis } = await import('../claude/endpoints/analysis-endpoint');
    const analysisResult = await executeDeepNightAnalysis();
    
    console.log(`📊 大規模分析完了: ${analysisResult.performanceInsights.length}個の洞察, ${analysisResult.marketOpportunities.length}個の機会`);
    
    // 2. 分析結果の保存（TASK-002で実装されるメソッドを使用）
    const dataManager = this.dataManager;
    
    // 日次分析結果の保存
    const dailyInsights = {
      date: analysisResult.analysisDate,
      performancePatterns: this.convertToPerformancePatterns(analysisResult.performanceInsights),
      marketOpportunities: analysisResult.marketOpportunities,
      optimizationInsights: this.convertToOptimizationInsights(analysisResult.optimizationStrategies),
      generatedAt: new Date().toISOString(),
      analysisVersion: 'v1.0'
    };
    
    await dataManager.saveDailyInsights(dailyInsights);
    console.log('✅ 日次分析結果保存完了');
    
    // 3. 翌日戦略の保存
    await dataManager.saveTomorrowStrategy(analysisResult.tomorrowStrategy);
    console.log('✅ 翌日戦略保存完了');
    
    // 4. パフォーマンス集計の生成・保存
    const performanceSummary = await this.generatePerformanceSummary(analysisResult);
    await dataManager.savePerformanceSummary(performanceSummary);
    console.log('✅ パフォーマンス集計保存完了');
    
    // 5. 実行ログ保存
    await dataManager.saveKaitoResponse('deep-night-analysis-result', {
      executionId,
      analysisTime: Date.now() - analysisStartTime,
      insights: analysisResult.performanceInsights.length,
      opportunities: analysisResult.marketOpportunities.length,
      strategiesGenerated: analysisResult.optimizationStrategies.length,
      confidence: analysisResult.confidence,
      timestamp: new Date().toISOString()
    });
    
    const totalTime = Date.now() - analysisStartTime;
    console.log(`🎉 深夜大規模分析完全完了 (${totalTime}ms) - 翌日戦略準備完了`);
    
    return {
      success: true,
      analysisTime: totalTime,
      insights: analysisResult.performanceInsights.length,
      opportunities: analysisResult.marketOpportunities.length,
      strategies: analysisResult.optimizationStrategies.length,
      confidence: analysisResult.confidence,
      filesGenerated: [
        `daily-insights-${analysisResult.analysisDate.replace(/-/g, '')}.yaml`,
        'tomorrow-strategy.yaml',
        `performance-summary-${analysisResult.analysisDate.replace(/-/g, '')}.yaml`
      ]
    };
    
  } catch (error) {
    const totalTime = Date.now() - analysisStartTime;
    console.error(`❌ 深夜大規模分析エラー (${totalTime}ms):`, error);
    
    // エラー情報保存
    await this.dataManager.saveKaitoResponse('deep-night-analysis-error', {
      executionId,
      error: error.message,
      analysisTime: totalTime,
      timestamp: new Date().toISOString()
    });
    
    // エラーでもワークフローは継続（重要）
    console.warn('⚠️ 深夜大規模分析は失敗しましたが、ワークフローは継続します');
    
    return {
      success: false,
      error: error.message,
      analysisTime: totalTime
    };
  }
}
```

### 3. データ変換ヘルパーメソッド実装
分析結果を新学習データ構造に変換するメソッド：

```typescript
/**
 * パフォーマンス洞察をパフォーマンスパターンに変換
 */
private static convertToPerformancePatterns(insights: any[]): any[] {
  return insights.map(insight => ({
    timeSlot: insight.timeSlot,
    successRate: insight.successRate,
    optimalTopics: insight.optimalTopics || [],
    avgEngagementRate: insight.avgEngagementRate || 0,
    sampleSize: insight.sampleSize || 1
  }));
}

/**
 * 最適化戦略を最適化洞察に変換
 */
private static convertToOptimizationInsights(strategies: any[]): any[] {
  return strategies.map(strategy => ({
    pattern: strategy.pattern,
    implementation: strategy.implementation,
    expectedImpact: strategy.expectedImpact,
    confidence: strategy.confidence || 0.5,
    priority: this.calculatePriority(strategy.confidence)
  }));
}

/**
 * 信頼度から優先度を計算
 */
private static calculatePriority(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * パフォーマンス集計の生成
 */
private static async generatePerformanceSummary(analysisResult: any): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  
  // 今日の実行データから集計情報を生成
  const currentData = await this.dataManager.getCurrentExecutionData();
  
  return {
    date: today,
    totalActions: currentData.summary?.metrics?.totalActions || 0,
    successfulActions: currentData.summary?.metrics?.successCount || 0,
    successRate: this.calculateSuccessRate(
      currentData.summary?.metrics?.successCount || 0,
      currentData.summary?.metrics?.totalActions || 1
    ),
    engagementMetrics: {
      totalLikes: 0, // 実際のメトリクスは今後実装
      totalRetweets: 0,
      totalReplies: 0,
      avgEngagementRate: analysisResult.tomorrowStrategy?.expectedMetrics?.targetEngagementRate || 0
    },
    followerGrowth: analysisResult.tomorrowStrategy?.expectedMetrics?.targetFollowerGrowth || 0,
    topPerformingActions: this.extractTopActions(analysisResult.performanceInsights),
    insights: this.generateSummaryInsights(analysisResult),
    generatedAt: new Date().toISOString()
  };
}

/**
 * 成功率の計算
 */
private static calculateSuccessRate(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((successCount / totalCount) * 100) / 100;
}

/**
 * トップパフォーマンスアクションの抽出
 */
private static extractTopActions(insights: any[]): any[] {
  return insights
    .filter(insight => insight.successRate > 0.7)
    .map(insight => ({
      action: 'mixed', // 実際の分析結果に基づいて決定
      topic: insight.optimalTopics?.[0] || 'general',
      engagementRate: insight.avgEngagementRate || 0
    }))
    .slice(0, 3);
}

/**
 * サマリー洞察の生成
 */
private static generateSummaryInsights(analysisResult: any): string[] {
  const insights: string[] = [];
  
  // パフォーマンス洞察から主要な発見をテキスト化
  if (analysisResult.performanceInsights?.length > 0) {
    const bestTimeSlot = analysisResult.performanceInsights
      .sort((a, b) => b.successRate - a.successRate)[0];
    insights.push(`最高成功率時間帯: ${bestTimeSlot.timeSlot} (${Math.round(bestTimeSlot.successRate * 100)}%)`);
  }
  
  // 市場機会から主要な発見をテキスト化
  if (analysisResult.marketOpportunities?.length > 0) {
    const topOpportunity = analysisResult.marketOpportunities
      .sort((a, b) => b.relevance - a.relevance)[0];
    insights.push(`注目トピック: ${topOpportunity.topic} (関連度${Math.round(topOpportunity.relevance * 100)}%)`);
  }
  
  // 最適化戦略から主要な推奨事項をテキスト化
  if (analysisResult.optimizationStrategies?.length > 0) {
    const topStrategy = analysisResult.optimizationStrategies
      .sort((a, b) => b.confidence - a.confidence)[0];
    insights.push(`推奨改善: ${topStrategy.implementation}`);
  }
  
  return insights;
}
```

### 4. WorkflowResult型拡張
workflows/constants.ts のWorkflowResult型を拡張：

```typescript
export interface WorkflowResult {
  success: boolean;
  executionId: string;
  decision: any;
  actionResult?: any;
  deepNightAnalysis?: {  // 新規追加
    success: boolean;
    analysisTime: number;
    insights: number;
    opportunities: number;
    strategies: number;
    confidence: number;
    filesGenerated: string[];
    error?: string;
  };
  error?: string;
  executionTime: number;
}
```

### 5. エラーハンドリング強化
深夜大規模分析が失敗してもワークフロー全体は継続する設計：

```typescript
// executeメソッド内のエラーハンドリング強化
try {
  // 既存のStep 1-3...
  
  if (isDeepNightAnalysisTime) {
    try {
      const analysisResult = await this.executeDeepNightAnalysis(executionId);
      // 成功時の処理...
    } catch (analysisError) {
      // 深夜分析エラーは警告として扱い、ワークフローは継続
      console.warn('⚠️ 深夜大規模分析でエラーが発生しましたが、ワークフローは継続します:', analysisError);
      
      return {
        success: true, // ワークフロー全体は成功扱い
        executionId,
        decision,
        actionResult,
        deepNightAnalysis: {
          success: false,
          error: analysisError.message,
          analysisTime: 0,
          insights: 0,
          opportunities: 0,
          strategies: 0,
          confidence: 0,
          filesGenerated: []
        },
        executionTime: Date.now() - startTime
      };
    }
  }
  
} catch (error) {
  // ワークフロー全体のエラーハンドリング...
}
```

## 🚨 重要な制約・注意事項

### MVP制約遵守
- ✅ **必要最小限の機能**: 深夜分析の実行と結果保存のみ
- 🚫 **分析結果表示禁止**: 結果の可視化・ダッシュボード機能は実装しない
- 🚫 **過剰な設定項目禁止**: 23:55固定、カスタマイズ不要

### システム設計制約
- **非破壊的実装**: 既存の3ステップワークフローは完全に保持
- **エラー分離**: 深夜分析エラーはワークフロー全体に影響させない
- **時刻精度**: 23:55の1分間でのみ実行（23:56以降は通常処理）

### パフォーマンス制約
- **実行時間制限**: 深夜分析は最大30分以内で完了
- **メモリ効率**: 大量データ処理でもメモリリークしない設計
- **ファイルI/O最適化**: 大量ファイル生成時の効率的な書き込み

## 📂 出力管理
- ❌ **ルートディレクトリ出力禁止**: 分析ファイルも適切なディレクトリに保存
- ✅ **data/learning/**: 日次分析結果・パフォーマンス集計
- ✅ **data/current/**: 翌日戦略ファイル
- ✅ **実行ログ**: 分析実行履歴をKaitoレスポンスとして保存

## 🧪 テスト要件
1. **23:55判定テスト**: 時刻判定ロジックの正確性確認
2. **深夜分析実行テスト**: executeDeepNightAnalysis()の動作確認
3. **エラーハンドリングテスト**: 分析失敗時のワークフロー継続確認
4. **データ保存テスト**: 生成ファイルの正確性確認
5. **統合テスト**: 3ステップ→4ステップの完全な流れ確認

## ✅ 完了基準
1. 23:55時に自動的にStep 4が実行される
2. 深夜大規模分析が正常に完了する
3. 翌日戦略ファイルが正確に生成される
4. 分析エラー時もワークフロー全体は継続する
5. 既存の3ステップワークフローが影響を受けない
6. npm run lint および npm run typecheck が通る
7. 統合テストがすべて通る

## 📋 実装後の報告書作成
実装完了後、以下の報告書を作成してください：
- 📄 **報告書パス**: `tasks/20250730_151951/reports/REPORT-003-main-workflow-step4-implementation.md`
- 📊 **実装内容**: Step 4実装詳細・23:55判定ロジック・エラーハンドリング
- 🧪 **テスト結果**: 統合テスト結果・実行時間・生成ファイル確認
- 🚨 **重要**: TypeScript型チェックとlintの通過確認を含める

## 🎯 最重要事項
この実装により、TradingAssistantXは単なる定時実行ツールから、**自己進化するAIシステム**へと変貌します。23:55→00:30の深夜時間帯に1日の学習を完了し、翌日7:00から新戦略で自動実行開始する完全自律型システムを実現してください。実装品質と信頼性を最優先とし、システムの継続運用を保証する堅牢な実装をお願いします。