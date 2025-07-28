# core-runner.ts 実行フロー簡素化指示書

**作成日時**: 2025-07-22 20:59:27  
**作成者**: Manager  
**対象**: Worker チーム  
**緊急度**: High Priority  

## 🎯 修正目標

現在の複雑化したcore-runner.tsを、REQUIREMENTS.mdで定義された理想フロー「アカウント分析→投稿作成」に準拠したシンプル構造に修正する。

## 🔍 現状分析

### 現在のフロー（複雑化）
```
Phase 1: executeAccountAnalysis()
├── generateBaselineContext()
├── step2_executeParallelAnalysis()  
├── IntegratedContext統合処理
└── フォールバック処理

Phase 2: executeContentCreation()
├── planActionsWithIntegratedContext()
├── executeAutonomously()
└── executeBasicPosting() (フォールバック)
```

### 理想フロー（シンプル）
```
1. 自己認識: アカウント分析
2. 戦略立案: 最適戦略決定
3. 情報統合: データ融合
4. 価値創造: コンテンツ生成・投稿
5. 効果測定: エンゲージメント分析 (未実装)
6. データ最適化: 古データ削除 (未実装)
```

## 📋 Phase 1: runSingle()メソッド簡素化

### A. 現在の複雑な分析処理を簡素化

**現状問題**:
```typescript
// 複雑な2段階処理
const baselineContext = await this.generateBaselineContext();
const parallelAnalysis = await this.step2_executeParallelAnalysis();

// 複雑なIntegratedContext構築
const integratedContext: IntegratedContext = {
  ...baselineContext,
  account: {
    currentState: parallelAnalysis.account as any,
    recommendations: [],
    healthScore: (parallelAnalysis.account as any).healthScore || 75
  },
  market: baselineContext.market || { /*...*/ }
};
```

**修正指示**:
1. `generateBaselineContext()` と `step2_executeParallelAnalysis()` を統合
2. 新しいメソッド `analyzeAccount()` を作成:
   ```typescript
   private async analyzeAccount(): Promise<AccountAnalysisResult> {
     console.log('🔍 アカウント分析実行中...');
     
     // PlaywrightAccountCollectorで直接分析
     const accountData = await this.playwrightAccount.analyze();
     
     // 必要最小限のデータのみ返却
     return {
       currentState: accountData,
       healthScore: this.calculateHealthScore(accountData),
       nextAction: this.determineNextAction(accountData)
     };
   }
   ```

### B. 複雑なIntegratedContext構築の削除

**修正指示**:
1. `IntegratedContext`型の複雑な統合処理を削除
2. 必要な情報のみを直接`AutonomousExecutor.execute()`に渡す
3. シンプルなデータ受け渡しに変更

## 📋 Phase 2: 未実装機能の追加

### A. 効果測定機能の実装

**追加指示**:
```typescript
private async measurePostEffectiveness(postResult: PostResult): Promise<void> {
  console.log('📊 効果測定中...');
  
  // 投稿結果の分析
  const effectiveness = {
    postId: postResult.id,
    timestamp: new Date().toISOString(),
    engagement: postResult.engagement || 0,
    reach: postResult.reach || 0,
    success: postResult.engagement > 5 // 仮の閾値
  };
  
  // 成功パターンの学習データ保存
  if (effectiveness.success) {
    await this.saveSuccessPattern(effectiveness, postResult.content);
  }
  
  // data/learning/への保存
  await this.yamlManager.saveToFile(
    'data/learning/effectiveness-data.yaml',
    effectiveness
  );
}
```

### B. データ最適化機能の実装

**追加指示**:
```typescript
private async optimizeDataStorage(): Promise<void> {
  console.log('🧹 データ最適化中...');
  
  const dataOptimizer = new DataOptimizer();
  
  // 古いデータのアーカイブ
  await dataOptimizer.archiveOldData();
  
  // data/current/の最適化
  await dataOptimizer.optimizeCurrentData();
  
  // 不要なファイルの削除
  await dataOptimizer.cleanupUnusedFiles();
}
```

## 📋 Phase 3: 新しいrunSingle()の実装

### 理想的な構造

```typescript
async runSingle(): Promise<void> {
  const startTime = Date.now();
  
  try {
    this.updateMetrics('start', startTime);
    
    // Phase 1: シンプルなアカウント分析
    console.log('🔍 [Phase 1] アカウント分析実行中...');
    const accountAnalysis = await this.analyzeAccount();
    
    // Phase 2: 投稿作成・実行
    console.log('✍️ [Phase 2] 投稿作成・実行中...');
    const postResult = await this.createAndPost(accountAnalysis);
    
    // Phase 3: 効果測定（新規追加）
    console.log('📊 [Phase 3] 効果測定中...');
    await this.measurePostEffectiveness(postResult);
    
    // Phase 4: データ最適化（新規追加）
    console.log('🧹 [Phase 4] データ最適化中...');
    await this.optimizeDataStorage();
    
    const endTime = Date.now();
    this.updateMetrics('end', endTime);
    
    console.log('✅ [CoreRunner] 実行完了');
    console.log(`⏱️  実行時間: ${endTime - startTime}ms`);
    
  } catch (error) {
    await this.handleUnifiedError(error);
    throw error;
  }
}
```

### createAndPost()の実装

```typescript
private async createAndPost(accountAnalysis: AccountAnalysisResult): Promise<PostResult> {
  // 戦略決定（planActionsWithIntegratedContextをシンプル化）
  const strategy = await this.decisionEngine.determineStrategy(accountAnalysis);
  
  // 自律実行（executeAutonomouslyを直接実行）
  const result = await this.autonomousExecutor.execute(strategy);
  
  return result;
}
```

## 📋 Phase 4: エラー処理の統一

### 現状問題
- executeAccountAnalysis()のフォールバック
- executeContentCreation()のexecuteBasicPosting()フォールバック
- 複数箇所でのエラー処理の重複

### 統一エラー処理の実装

```typescript
private async handleUnifiedError(error: any): Promise<void> {
  console.error('🚨 [CoreRunner] エラー発生:', error.message);
  
  // エラーログの保存
  await this.logError(error);
  
  // フォールバック実行（必要最小限）
  try {
    console.log('🔄 フォールバック実行中...');
    await this.executeMinimalPosting();
  } catch (fallbackError) {
    console.error('💥 フォールバックも失敗:', fallbackError.message);
    // 最終的なエラー記録
    await this.logCriticalError(fallbackError);
  }
}
```

## 🏆 修正後の期待効果

### 定量的改善
- メソッド数: 50%削減（複雑な統合処理削除）
- 実行フロー: 6ステップに簡素化（現在の複雑なPhase1, 2から改善）
- エラー処理: 統一化（複数のフォールバック処理を1つに）

### 定性的改善
- **可読性**: 理想フローと1:1対応
- **保守性**: 複雑な`IntegratedContext`構築削除
- **機能完全性**: 効果測定・データ最適化の追加
- **REQUIREMENTS.md準拠**: 理想の6ステップを完全実装

## ⚠️ 実装時の注意点

### 依存関係の維持
1. `AutonomousExecutor`、`LoopManager`、`SystemDecisionEngine`の既存インターフェース保持
2. 型安全性の確保（AccountAnalysisResult、PostResult型の定義）
3. YAML設定ファイルとの整合性維持

### 段階的実装
1. **Step 1**: runSingle()の新構造実装
2. **Step 2**: 既存の複雑メソッド削除
3. **Step 3**: 新機能（効果測定・データ最適化）追加
4. **Step 4**: エラー処理統一
5. **Step 5**: テスト実行・動作確認

### テスト維持
- 既存のテストケースを新構造に対応
- 新機能（効果測定・データ最適化）のテストケース追加
- main.ts、dev.tsからの呼び出しが正常動作することを確認

**この修正により、core-runner.tsはREQUIREMENTS.mdの理想フロー「アカウント分析→投稿作成→効果測定→データ最適化」を完全に実現する、シンプルで保守性の高いコードに生まれ変わる。**