# TASK-002: autonomous-executor.ts統合実装

## 🎯 実装目標

**autonomous-executor.ts**のStep 2（情報収集）にActionSpecificCollectorを統合し、並列収集とContextBuilderとの連携を実現する。

## 📊 現状分析

### ✅ 完了済み
- autonomous-executor.tsの基本構造
- Step 1（アカウント分析）とStep 3（決定実行）の基本実装
- ContextBuilderとの基本連携

### 🔧 実装対象
- Step 2でのActionSpecificCollector並列統合
- ParallelAnalysisResultの完全実装
- 効率的な情報フロー構築

## 📂 実装対象ファイル

**メインファイル**: `/Users/rnrnstar/github/TradingAssistantX/src/scripts/autonomous-executor.ts`

## 🎯 具体的実装内容

### 1. ActionSpecificCollector初期化

```typescript
// autonomous-executor.ts上部のimport文に追加
import { ActionSpecificCollector } from '../lib/action-specific-collector.js';

// AutonomousExecutorクラス内にプロパティ追加
export class AutonomousExecutor {
  private actionSpecificCollector: ActionSpecificCollector;
  // ... 既存プロパティ

  constructor() {
    // ... 既存の初期化
    this.actionSpecificCollector = new ActionSpecificCollector();
    console.log('✅ [AutonomousExecutor] ActionSpecificCollector初期化完了');
  }
  
  // ... 既存メソッド
}
```

### 2. Step 2拡張: 並列情報収集

既存のStep 2を以下のように拡張：

```typescript
/**
 * Step 2: 並列情報収集（ActionSpecific統合版）
 */
private async executeInformationCollection(
  accountStatus: AccountStatus,
  executionId: string
): Promise<ParallelAnalysisResult> {
  console.log('📊 [Step 2] ActionSpecific並列情報収集を開始...');
  
  const startTime = Date.now();
  
  try {
    // 統合コンテキスト構築
    const integratedContext: IntegratedContext = {
      account: accountStatus,
      market: {
        trends: [],
        opportunities: [],
        competitorActivity: []
      },
      actionSuggestions: [],
      timestamp: Date.now()
    };

    // 並列実行: 汎用収集 + ActionSpecific収集
    const [generalInfo, actionSpecificInfo] = await Promise.allSettled([
      this.executeGeneralInformationCollection(integratedContext),
      this.executeActionSpecificCollection(integratedContext)
    ]);

    // 結果統合
    const parallelResult: ParallelAnalysisResult = {
      account: accountStatus,
      information: this.processActionSpecificResults(actionSpecificInfo),
      timestamp: Date.now()
    };

    const executionTime = Date.now() - startTime;
    console.log(`✅ [Step 2完了] 並列収集完了 - ${executionTime}ms`);
    
    // 実行ログ保存
    await this.saveStepExecutionLog(executionId, 'step2', {
      executionTime,
      generalInfoStatus: generalInfo.status,
      actionSpecificStatus: actionSpecificInfo.status,
      resultSummary: this.summarizeCollectionResults(parallelResult)
    });

    return parallelResult;

  } catch (error) {
    console.error('❌ [Step 2エラー]:', error);
    
    // フォールバック処理
    return {
      account: accountStatus,
      information: {
        executionTime: Date.now() - startTime,
        status: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: Date.now()
    };
  }
}
```

### 3. ActionSpecific収集実行メソッド

```typescript
/**
 * ActionSpecific情報収集実行
 */
private async executeActionSpecificCollection(
  context: IntegratedContext
): Promise<ActionSpecificPreloadResult> {
  console.log('🎯 [ActionSpecific収集] 並列収集を開始...');
  
  const startTime = Date.now();
  const targetActions = ['original_post', 'quote_tweet', 'retweet', 'reply'] as const;
  
  try {
    // 並列収集実行
    const promises = targetActions.map(async (actionType) => {
      try {
        const result = await this.actionSpecificCollector.collectForAction(
          actionType,
          context,
          85 // 85%充足度目標
        );
        console.log(`✅ [${actionType}] 収集完了 - 充足度: ${result.sufficiencyScore}%`);
        return { actionType, result };
      } catch (error) {
        console.error(`❌ [${actionType}収集エラー]:`, error);
        return { actionType, result: null };
      }
    });

    const results = await Promise.all(promises);
    const executionTime = Date.now() - startTime;
    
    // 結果の構造化
    const structuredResults: ActionSpecificPreloadResult = {
      executionTime,
      status: 'success'
    };

    results.forEach(({ actionType, result }) => {
      if (result) {
        structuredResults[actionType as keyof ActionSpecificPreloadResult] = result;
      }
    });

    // ステータス判定
    const successCount = results.filter(r => r.result !== null).length;
    if (successCount === 0) {
      structuredResults.status = 'fallback';
    } else if (successCount < targetActions.length) {
      structuredResults.status = 'partial';
    }

    console.log(`✅ [ActionSpecific収集完了] ${successCount}/${targetActions.length}成功`);
    return structuredResults;

  } catch (error) {
    console.error('❌ [ActionSpecific収集エラー]:', error);
    return {
      executionTime: Date.now() - startTime,
      status: 'fallback',
      error: error instanceof Error ? error.message : 'Collection failed'
    };
  }
}
```

### 4. 汎用情報収集との並列処理

```typescript
/**
 * 汎用情報収集（既存のEnhancedInfoCollector活用）
 */
private async executeGeneralInformationCollection(
  context: IntegratedContext
): Promise<any> {
  console.log('📡 [汎用収集] 市場情報・トレンド収集を開始...');
  
  try {
    // 既存のEnhancedInfoCollectorを活用
    if (this.enhancedInfoCollector) {
      const marketInfo = await this.enhancedInfoCollector.collectMarketInformation();
      const trendInfo = await this.enhancedInfoCollector.collectTrendInformation();
      
      return {
        market: marketInfo,
        trends: trendInfo,
        timestamp: Date.now()
      };
    }
    
    return { status: 'skipped', reason: 'EnhancedInfoCollector not available' };
    
  } catch (error) {
    console.error('❌ [汎用収集エラー]:', error);
    return { status: 'error', error: error.message };
  }
}
```

### 5. 結果処理とログ保存

```typescript
/**
 * ActionSpecific収集結果の処理
 */
private processActionSpecificResults(
  settledResult: PromiseSettledResult<ActionSpecificPreloadResult>
): ActionSpecificPreloadResult {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value;
  } else {
    console.error('❌ [ActionSpecific処理エラー]:', settledResult.reason);
    return {
      executionTime: 0,
      status: 'fallback',
      error: settledResult.reason?.message || 'Processing failed'
    };
  }
}

/**
 * 収集結果の要約
 */
private summarizeCollectionResults(result: ParallelAnalysisResult): string {
  const info = result.information;
  const actionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'];
  const successfulActions = actionTypes.filter(
    type => info[type as keyof ActionSpecificPreloadResult] !== undefined
  );
  
  return `ActionSpecific: ${successfulActions.length}/${actionTypes.length}成功, ` +
         `実行時間: ${info.executionTime}ms, ステータス: ${info.status}`;
}

/**
 * Step実行ログの保存
 */
private async saveStepExecutionLog(
  executionId: string,
  stepName: string,
  data: any
): Promise<void> {
  try {
    const logData = {
      executionId,
      stepName,
      timestamp: new Date().toISOString(),
      data
    };
    
    const logPath = join(process.cwd(), 'data', 'context', 'execution-history.json');
    
    // 既存ログ読み込み
    let existingLogs: any[] = [];
    try {
      const existingData = await fs.readFile(logPath, 'utf-8');
      existingLogs = JSON.parse(existingData);
    } catch {
      // ファイルが存在しない場合は空配列から開始
    }
    
    // 新ログ追加
    existingLogs.push(logData);
    
    // 最新100件に制限
    if (existingLogs.length > 100) {
      existingLogs = existingLogs.slice(-100);
    }
    
    // 保存
    await fs.writeFile(logPath, JSON.stringify(existingLogs, null, 2));
    
  } catch (error) {
    console.error('❌ [ログ保存エラー]:', error);
  }
}
```

### 6. メイン実行フローの更新

```typescript
/**
 * メイン実行メソッドでのStep 2呼び出し更新
 */
public async executeAutonomousFlow(): Promise<ExecutionResult> {
  const executionId = `exec-${Date.now()}`;
  console.log(`🚀 [自律実行開始] ExecutionID: ${executionId}`);
  
  try {
    // Step 1: アカウント分析（既存）
    const accountStatus = await this.executeAccountAnalysis(executionId);
    
    // Step 2: 並列情報収集（新実装）
    const parallelAnalysis = await this.executeInformationCollection(
      accountStatus,
      executionId
    );
    
    // Step 3: 決定実行（既存だが、parallelAnalysisを活用）
    const decisions = await this.executeDecisionMaking(
      parallelAnalysis,
      executionId
    );
    
    // 実行結果の構築
    return {
      executionId,
      success: true,
      accountStatus,
      information: parallelAnalysis.information,
      decisions,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [自律実行エラー]:', error);
    return this.createErrorResult(executionId, error);
  }
}
```

## 📋 実装チェックポイント

### 必須要件
- [x] ActionSpecificCollectorの正常統合
- [x] 並列処理による効率化（Promise.allSettled活用）
- [x] 汎用収集との共存
- [x] エラーハンドリングとフォールバック
- [x] 実行ログ保存機能

### 品質基準
- **TypeScript**: strict mode完全対応
- **並列効率**: 2つの収集プロセスの同時実行
- **エラー復旧**: 部分失敗時の適切な継続処理
- **ログ管理**: 実行履歴の適切な保存

### テスト項目
- 並列収集の正常動作
- 部分失敗時の処理継続
- ログ保存機能の動作確認
- メモリ使用量の最適化確認

## 🚫 注意事項

- **既存フロー維持**: Step 1とStep 3の既存処理は変更しない
- **後方互換性**: 既存のautonomous-executor.ts呼び出しインターフェースを維持
- **並列安全性**: Promise.allSettledを使用して部分失敗に対応
- **リソース管理**: ActionSpecificCollectorの適切なクリーンアップ

## 📤 完成報告

実装完了後、以下の報告書を作成：
**報告書**: `tasks/20250721_153850_actionspecific_implementation/reports/REPORT-002-autonomous-executor-integration.md`

### 報告内容
- Step 2の並列処理実装結果
- 性能測定データ（実行時間、成功率）
- エラーハンドリング動作確認
- ログ保存機能のテスト結果
- TASK-001との統合確認事項