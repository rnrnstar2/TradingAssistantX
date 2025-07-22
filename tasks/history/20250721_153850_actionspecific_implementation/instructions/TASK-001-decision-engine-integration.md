# TASK-001: DecisionEngine統合完全実装

## 🎯 実装目標

**ActionSpecificCollector**をDecisionEngineに完全統合し、Claude主導の動的情報収集を実現する。

## 📊 現状分析

### ✅ 完了済み
- ActionSpecificCollectorの基本インポートと初期化準備
- ActionSpecificResult型定義
- 基本的なコンストラクタ注入準備

### 🔧 実装対象
- `planExpandedActions()`メソッドでの実際活用
- 並列処理対応（ActionSpecificPreloadResult）
- エラーハンドリングと品質保証

## 📂 実装対象ファイル

**メインファイル**: `/Users/rnrnstar/github/TradingAssistantX/src/core/decision-engine.ts`

## 🎯 具体的実装内容

### 1. ActionSpecific並列収集メソッド実装

`DecisionEngine`クラスに以下メソッドを追加：

```typescript
/**
 * アクション特化型情報並列収集
 */
async preloadActionSpecificInformation(
  integratedContext: IntegratedContext,
  targetActions: string[] = ['original_post', 'quote_tweet', 'retweet', 'reply']
): Promise<ActionSpecificPreloadResult> {
  console.log('🎯 [ActionSpecific並列収集] 開始...');
  
  if (!this.actionSpecificCollector) {
    console.warn('⚠️ ActionSpecificCollector未初期化、スキップ');
    return {
      executionTime: 0,
      status: 'fallback',
      error: 'ActionSpecificCollector not initialized'
    };
  }

  const startTime = Date.now();
  const results: Partial<ActionSpecificPreloadResult> = {};

  try {
    // 並列実行
    const promises = targetActions.map(async (actionType) => {
      try {
        const result = await this.actionSpecificCollector!.collectForAction(
          actionType as 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
          integratedContext,
          85 // 85%充足度目標
        );
        return { actionType, result };
      } catch (error) {
        console.error(`❌ [${actionType}収集エラー]:`, error);
        return { actionType, result: null };
      }
    });

    const actionResults = await Promise.all(promises);
    
    // 結果の統合
    actionResults.forEach(({ actionType, result }) => {
      if (result) {
        results[actionType as keyof ActionSpecificPreloadResult] = result;
      }
    });

    const executionTime = Date.now() - startTime;
    const successCount = actionResults.filter(r => r.result !== null).length;
    
    console.log(`✅ [ActionSpecific並列収集] 完了 - ${successCount}/${targetActions.length}成功`);
    
    return {
      ...results,
      executionTime,
      status: successCount > 0 ? 'success' : successCount === 0 ? 'fallback' : 'partial'
    } as ActionSpecificPreloadResult;

  } catch (error) {
    console.error('❌ [ActionSpecific並列収集エラー]:', error);
    return {
      executionTime: Date.now() - startTime,
      status: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 2. planExpandedActions()メソッド拡張

既存の`planExpandedActions()`メソッドに統合：

```typescript
// 既存メソッド内の適切な箇所に追加
async planExpandedActions(integratedContext: IntegratedContext): Promise<Decision[]> {
  console.log('🧠 [統合コンテキスト決定] IntegratedContextを活用した意思決定を開始...');
  
  // ActionSpecific情報を事前収集
  const actionSpecificInfo = await this.preloadActionSpecificInformation(integratedContext);
  
  // 収集した情報をメタデータに追加
  const enhancedContext = {
    ...integratedContext,
    actionSpecificInformation: actionSpecificInfo
  };

  // 既存のClaude判断処理を拡張
  const prompt = `
現在のアカウント状況と市場情報、事前収集したActionSpecific情報を統合して、
最適なアクション決定を行ってください。

アカウント健康度: ${integratedContext.account.healthScore}
市場トレンド数: ${integratedContext.market.trends.length}
ActionSpecific収集状況: ${actionSpecificInfo.status}

事前収集された専門情報:
${Object.entries(actionSpecificInfo)
  .filter(([key]) => ['original_post', 'quote_tweet', 'retweet', 'reply'].includes(key))
  .map(([actionType, info]) => `${actionType}: ${info ? '収集成功' : '収集失敗'}`)
  .join('\n')}

この統合情報を活用して、価値創造に焦点を当てた具体的なアクション決定を行ってください。
`;

  // 後続の処理で enhancedContext と actionSpecificInfo を活用
  // ...既存の実装を継続
}
```

### 3. エラーハンドリング強化

```typescript
private handleActionSpecificError(error: Error, context: string): void {
  console.error(`❌ [ActionSpecific統合エラー] ${context}:`, {
    message: error.message,
    stack: error.stack?.substring(0, 500),
    timestamp: new Date().toISOString()
  });
  
  // 必要に応じて分析データ保存
  // this.saveErrorAnalysis(error, context);
}
```

## 📋 実装チェックポイント

### 必須要件
- [x] ActionSpecificCollectorの完全統合
- [x] 並列処理による効率化
- [x] エラーハンドリングとフォールバック
- [x] TypeScript型安全性保証
- [x] 既存インターフェース維持

### 品質基準
- **TypeScript**: strict mode完全対応
- **実行時間**: 90秒以内
- **成功率**: 80%以上
- **メモリ効率**: 並列処理最適化

### テスト項目
- 並列収集の正常動作
- エラー時のフォールバック
- パフォーマンス基準達成
- 型安全性確認

## 🚫 注意事項

- **既存メソッドの削除禁止**: 既存のDecisionEngineメソッドを削除しない
- **インターフェース維持**: 既存の戻り値型を変更しない
- **段階実装**: 新機能追加は段階的に実装
- **並列処理安全性**: Promise.allの適切なエラーハンドリング

## 📤 完成報告

実装完了後、以下の報告書を作成：
**報告書**: `tasks/20250721_153850_actionspecific_implementation/reports/REPORT-001-decision-engine-integration.md`

### 報告内容
- 実装完了したメソッド一覧
- 性能測定結果
- エラーハンドリング動作確認
- TypeScript型チェック結果
- 次のタスクへの引き継ぎ事項