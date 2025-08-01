# TASK-003: main-workflow深夜分析統合

## 🎯 タスク概要

既存のmain-workflow.tsの`executeAnalyzeAction`メソッドを実装し、深夜分析ワークフローを統合します。TASK-001のanalysis-endpointとTASK-002のpost-metrics-collectorを使用し、23:55の深夜分析フローを完成させます。

## 📋 MVP制約確認

**✅ MVP適合性**:
- 既存main-workflow.tsの拡張（新規ファイル作成なし）
- analyzeアクション統合（switchケース既存）
- 3ステップ → 4ステップ拡張（深夜分析のみ）

**🚫 実装禁止項目**:
- main-workflowの大幅リファクタリング
- 複雑な実行制御フロー
- 詳細な統計機能
- リアルタイム分析

## 🔧 実装仕様

### 修正対象ファイル
`src/workflows/main-workflow.ts`

### 既存メソッド拡張

#### 1. executeAnalyzeAction実装
**現在**: line 765-776で未実装（`throw new Error`）
**修正**: 深夜分析フローを実装

```typescript
private static async executeAnalyzeAction(
  decision: any, 
  collectedData?: { profile: any, learningData: any }
): Promise<any>
```

#### 2. executeDeepNightAnalysis実装
**現在**: line 1015-1017で未実装
**修正**: 深夜分析詳細処理を実装

```typescript
private static async executeDeepNightAnalysis(
  executionId: string,
  collectedData?: { profile: any, learningData: any }
): Promise<any>
```

### 実装ステップ

#### Step 1: executeAnalyzeAction基本実装
```typescript
private static async executeAnalyzeAction(
  decision: any, 
  collectedData?: { profile: any, learningData: any }
): Promise<any> {
  try {
    console.log('🌙 深夜分析アクション実行開始');
    
    // 1. 投稿メトリクス収集
    const postMetrics = await collectPostMetrics(this.kaitoClient);
    
    // 2. 深夜分析実行
    const analysisResult = await analyzePostEngagement(postMetrics, systemContext);
    
    // 3. 結果保存（TASK-004に依存）
    await this.saveAnalysisResults(analysisResult, postMetrics);
    
    return {
      success: true,
      action: 'analyze',
      analysisResult,
      postMetrics,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ 深夜分析アクション失敗:', error);
    throw error;
  }
}
```

#### Step 2: executeDeepNightAnalysis詳細実装
```typescript
private static async executeDeepNightAnalysis(
  executionId: string,
  collectedData?: { profile: any, learningData: any }
): Promise<any> {
  try {
    console.log('🌙 深夜大規模分析実行開始');
    
    // systemContext構築
    const systemContext = this.buildSystemContext(collectedData?.profile);
    
    // 分析実行決定構築
    const analyzeDecision = {
      action: 'analyze',
      parameters: {},
      confidence: 1.0,
      reasoning: '23:55定時深夜分析'
    };
    
    // 分析実行
    const analyzeResult = await this.executeAnalyzeAction(analyzeDecision, collectedData);
    
    console.log('✅ 深夜大規模分析完了');
    return analyzeResult;
    
  } catch (error) {
    console.error('❌ 深夜大規模分析失敗:', error);
    throw error;
  }
}
```

#### Step 3: main execute()メソッド統合
**修正箇所**: line 130付近の「TODO: Step 4: 深夜大規模分析（23:55のみ）」

```typescript
// TODO: Step 4: 深夜大規模分析（23:55のみ） - 実装待ち
↓
// Step 4: 深夜大規模分析（23:55のみ）
if (options?.scheduledAction === 'analyze') {
  console.log('🌙 ステップ4: 深夜大規模分析開始');
  const deepAnalysisResult = await this.executeDeepNightAnalysis(executionId, { profile, learningData });
  console.log('✅ 深夜大規模分析完了');
  
  // 結果にdeepAnalysisを追加
  return {
    success: true,
    executionId,
    decision,
    actionResult,
    deepAnalysisResult,
    executionTime: Date.now() - startTime
  };
}
```

### 必須インポート追加

```typescript
// 既存インポートに追加
import { collectPostMetrics } from '../shared/post-metrics-collector';
import { analyzePostEngagement } from '../claude/endpoints/analysis-endpoint';
```

### エラーハンドリング強化

#### 分析失敗時の継続動作
```typescript
try {
  const analysisResult = await analyzePostEngagement(postMetrics, systemContext);
} catch (analysisError) {
  console.warn('⚠️ 深夜分析失敗、基本情報のみ保存:', analysisError);
  // 分析失敗時も基本メトリクスは保存
  await this.saveBasicMetrics(postMetrics);
  throw analysisError;
}
```

#### タイムアウト設定
```typescript
// 深夜分析専用タイムアウト（15分）
const analysisTimeout = 15 * 60 * 1000; // 900秒
```

### 時刻判定ロジック

#### 23:55判定
```typescript
// 現在時刻が23:55かどうかの判定（既存スケジューラーで判定済み）
if (options?.scheduledAction === 'analyze') {
  // 深夜分析モード
}
```

## 🔗 依存関係

### TASK依存関係
- **TASK-001**: `analyzePostEngagement`関数使用
- **TASK-002**: `collectPostMetrics`関数使用  
- **TASK-004**: `saveAnalysisResults`メソッド（未実装の場合はコメントアウト）

### 実行順序制約
**直列実行必須** - TASK-001, TASK-002完了後に実装

## 🧪 品質要件

### 既存コード保護
- 既存のworkflow実行フローを破壊しない
- 通常の3ステップ実行は影響なし
- analyzeアクション以外の動作は変更なし

### ログ一貫性
```typescript
console.log('🌙 深夜分析アクション実行開始');
console.log('📊 投稿メトリクス収集完了: 50件');
console.log('🧠 Claude分析実行完了');
console.log('💾 分析結果保存完了');
console.log('✅ 深夜分析アクション完了 (XXXms)');
```

### エラーレポート
```typescript
console.error('❌ 深夜分析アクション失敗:', error);
console.error('📊 メトリクス取得段階でエラー:', error);
console.error('🧠 Claude分析段階でエラー:', error);
```

## ✅ 完成基準

1. **機能統合**: executeAnalyzeActionの完全実装
2. **フロー動作**: 23:55実行での4ステップ動作確認
3. **エラーハンドリング**: 各段階でのエラー処理実装
4. **既存保護**: 通常3ステップ実行への影響なし
5. **ログ一貫性**: 統一されたログ出力

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-003-workflow-integration.md`に記載：

1. **実装サマリー**: main-workflow統合の概要
2. **メソッド詳細**: executeAnalyzeAction, executeDeepNightAnalysisの実装詳細
3. **フロー確認**: 23:55実行での4ステップ動作確認
4. **エラーテスト**: 各段階でのエラー処理確認
5. **既存影響**: 通常実行への影響がないことの確認
6. **統合状況**: TASK-001, TASK-002との連携確認

## 🚨 注意事項

- **既存保護**: main-workflowの既存機能を破壊しない
- **段階実装**: TASK依存関係を考慮した段階的実装
- **エラー継続**: 分析失敗時もワークフロー全体は継続
- **時刻制限**: 23:55専用機能であることの明示