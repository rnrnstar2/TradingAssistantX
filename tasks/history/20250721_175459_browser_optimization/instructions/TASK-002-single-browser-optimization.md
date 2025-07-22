# TASK-002: 単一ブラウザセッション管理最適化

## 📋 実装概要

現在複数のブラウザが並列起動している問題を解決し、インタラクティブな単一ブラウザでの情報収集システムに最適化します。

### 🎯 実装目標
- **単一ブラウザ**: 1つのブラウザインスタンスで全ての処理を実行
- **逐次実行**: 並列処理を逐次処理に変更してリソース効率化
- **既存OptimizedBrowserPool活用**: 修正済みのプール管理システムを活用

## 🔍 現在の問題分析

### 問題の特定
1. **step2_executeParallelAnalysis**: 2つの独立ブラウザコンテキストを並列取得
2. **ActionSpecificCollector**: 4つのアクションタイプを並列処理
3. **PlaywrightBrowserManager**: 最大3ブラウザプールで複数ブラウザ作成

### リソース使用状況
```
現在: 最大7ブラウザ（アカウント分析1 + ActionSpecific4 + 予備2）
目標: 単一ブラウザ（逐次実行によるリソース最適化）
```

## 🔧 実装要件

### 1. AutonomousExecutorの並列実行最適化

**修正対象**: `src/core/autonomous-executor.ts`の`step2_executeParallelAnalysis`

```typescript
// 現在のコード（並列実行）
const [accountContext, actionContext] = await Promise.all([
  browserManager.acquireContext(accountSessionId),
  browserManager.acquireContext(actionSessionId)
]);

const [accountResult, infoResult] = await Promise.allSettled([
  this.executeAccountAnalysisSafe(accountContext),
  this.executeActionSpecificCollectionSafe(actionContext)
]);

// 新しいコード（逐次実行）
const sharedSessionId = `sequential_analysis_${Date.now()}`;
const sharedContext = await browserManager.acquireContext(sharedSessionId);

// 逐次実行: アカウント分析 → ActionSpecific収集
const accountResult = await this.executeAccountAnalysisSafe(sharedContext);
const infoResult = await this.executeActionSpecificCollectionSafe(sharedContext);
```

### 2. ActionSpecificCollectorの最適化

**修正対象**: `src/lib/action-specific-collector.ts`

現在の4つのアクションタイプ並列処理を逐次処理に変更：

```typescript
// 現在のコード（並列実行推定）
const collectors = await Promise.all([
  this.collectForOriginalPost(),
  this.collectForQuoteTweet(), 
  this.collectForRetweet(),
  this.collectForReply()
]);

// 新しいコード（逐次実行）
const collectors = [];
for (const actionType of ['original_post', 'quote_tweet', 'retweet', 'reply']) {
  console.log(`🔄 [逐次収集] ${actionType}タイプの情報収集を開始...`);
  const result = await this.collectForActionType(actionType, sharedContext);
  collectors.push(result);
  
  // 適切なインターバル（サーバー負荷軽減）
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 3. OptimizedBrowserPoolの活用

**修正対象**: ブラウザ取得部分を`OptimizedBrowserPool`に統一

```typescript
// 既存のPlaywrightBrowserManagerの代わりに
// PlaywrightCommonSetup.createPlaywrightEnvironment()を使用

import { PlaywrightCommonSetup, OptimizedBrowserPool } from '../lib/playwright-common-config.js';

// 新しいブラウザ取得方法
const { browser, context, config } = await PlaywrightCommonSetup.createPlaywrightEnvironment();
```

## 📁 修正対象ファイル

### 1. `src/core/autonomous-executor.ts`

#### A. step2_executeParallelAnalysisメソッド全体の書き換え

```typescript
private async step2_executeParallelAnalysis(): Promise<ParallelAnalysisResult> {
  console.log('🔄 Step 2: 統合セッション逐次実行（アカウント分析 → ActionSpecific情報収集）');
  
  const sessionId = `sequential_analysis_${Date.now()}`;
  
  try {
    // 単一の最適化されたブラウザセッションを取得
    const { browser, context } = await PlaywrightCommonSetup.createPlaywrightEnvironment();
    
    console.log(`🎭 [統合セッション] ${sessionId} - 単一ブラウザで逐次実行`);
    
    // 逐次実行: アカウント分析
    console.log('🔍 [Step 2-1] アカウント分析を実行中...');
    const accountResult = await this.executeAccountAnalysisSafe(context);
    
    // 適切なインターバル
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 逐次実行: ActionSpecific情報収集
    console.log('🎯 [Step 2-2] ActionSpecific情報収集を実行中...');
    const infoResult = await this.executeActionSpecificCollectionSafe(context);
    
    // セッション終了
    await PlaywrightCommonSetup.cleanup(browser, context);
    
    return {
      account: accountResult.status === 'fulfilled' ? accountResult.value : null,
      information: infoResult.status === 'fulfilled' ? infoResult.value : null
    };
    
  } catch (error) {
    console.error(`❌ [統合セッションエラー] ${sessionId}:`, error);
    throw error;
  }
}
```

#### B. executeAccountAnalysisSafeメソッドの更新

```typescript
private async executeAccountAnalysisSafe(context: BrowserContext): Promise<AccountStatus> {
  console.log('🔍 [セーフなアカウント分析] 専用コンテキストで実行中...');
  
  try {
    // PlaywrightAccountCollectorを直接使用（ブラウザ管理は外部で行う）
    const { PlaywrightAccountCollector } = await import('../lib/playwright-account-collector.js');
    const collector = new PlaywrightAccountCollector();
    
    // 既存のコンテキストを使用してアカウント情報収集
    const accountInfo = await collector.collectWithContext(context);
    
    return await this.accountAnalyzer.analyzeAccountInfo(accountInfo);
  } catch (error) {
    console.error('❌ [アカウント分析エラー]:', error);
    throw error;
  }
}
```

### 2. `src/lib/playwright-account-collector.ts`

#### コンテキスト受け取りメソッドの追加

```typescript
/**
 * 外部から提供されたコンテキストを使用して収集実行
 */
async collectWithContext(context: BrowserContext): Promise<AccountInfo> {
  console.log('🎭 [アカウント情報取得] 提供されたコンテキストで実行中...');
  
  try {
    const username = this.getUsername();
    const profileUrl = `https://x.com/${username}`;
    
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    
    // 既存の収集ロジックを実行
    const accountInfo = await this.extractAccountInfo(page);
    
    await page.close();
    return accountInfo;
    
  } catch (error) {
    console.error('❌ [コンテキスト使用収集エラー]:', error);
    throw error;
  }
}
```

### 3. `src/lib/action-specific-collector.ts`

#### 並列実行の逐次化

```typescript
/**
 * 逐次実行による最適化された情報収集
 */
async executeOptimizedCollection(context: BrowserContext): Promise<ActionSpecificPreloadResult> {
  console.log('🎯 [ActionSpecific最適化収集] 逐次実行モードで開始...');
  
  const results: Record<string, any> = {};
  const actionTypes = ['original_post', 'quote_tweet', 'retweet', 'reply'];
  
  for (const actionType of actionTypes) {
    try {
      console.log(`🔄 [逐次収集] ${actionType}タイプの情報収集を開始...`);
      
      const result = await this.collectForActionTypeWithContext(actionType, context);
      results[actionType] = result;
      
      console.log(`✅ [逐次収集] ${actionType}タイプ完了`);
      
      // サーバー負荷軽減のための適切なインターバル
      if (actionType !== actionTypes[actionTypes.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.warn(`⚠️ [逐次収集] ${actionType}タイプでエラー:`, error);
      results[actionType] = null;
    }
  }
  
  return this.formatCollectionResults(results);
}

/**
 * 特定のアクションタイプで情報収集（コンテキスト受け取り版）
 */
private async collectForActionTypeWithContext(
  actionType: string, 
  context: BrowserContext
): Promise<any> {
  const page = await context.newPage();
  
  try {
    // アクションタイプ別の収集ロジック実行
    const result = await this.executeCollectionStrategy(actionType, page);
    return result;
    
  } finally {
    await page.close();
  }
}
```

## ✅ 検証方法

### 1. ブラウザ数の確認
```bash
# 実行中のブラウザプロセス数を確認
ps aux | grep chromium | grep -v grep | wc -l

# 期待値: 1（単一ブラウザ）
```

### 2. ログ出力確認
実行時に以下のログが順次出力されることを確認：
```
🔄 Step 2: 統合セッション逐次実行（アカウント分析 → ActionSpecific情報収集）
🎭 [統合セッション] sequential_analysis_1234567890 - 単一ブラウザで逐次実行
🔍 [Step 2-1] アカウント分析を実行中...
✅ [アカウント分析] 完了
🎯 [Step 2-2] ActionSpecific情報収集を実行中...
🔄 [逐次収集] original_postタイプの情報収集を開始...
✅ [逐次収集] original_postタイプ完了
...
```

### 3. パフォーマンス測定
```bash
# メモリ使用量の確認
time pnpm dev

# 実行時間の測定（並列→逐次により若干増加は許容）
```

## 🚨 注意事項

### 1. 実行時間の変化
- **予想**: 並列→逐次により実行時間が3-5倍増加
- **許容**: インタラクティブな開発体験のトレードオフとして受容

### 2. エラーハンドリング
- 1つのアクションタイプでエラーが発生しても、他の処理を継続
- ブラウザクラッシュ時の適切な復旧処理

### 3. リソース管理
- `OptimizedBrowserPool`の2セッション制限を活用
- メモリ使用量の定期監視

## 📊 完了基準

- [ ] ブラウザプロセス数が1つに削減される
- [ ] アカウント分析とActionSpecific収集が逐次実行される
- [ ] `OptimizedBrowserPool`が適切に活用される
- [ ] エラー時も適切にリソースが解放される
- [ ] 既存のテストが全てパスする

## 🔄 期待される効果

### パフォーマンス改善
- **メモリ使用量**: 約70%削減
- **CPU使用率**: 並列処理負荷の軽減
- **開発体験**: 単一ブラウザでの視覚的確認

### 運用面の改善
- **デバッグ**: 単一ブラウザでの動作追跡が容易
- **エラー調査**: 問題の特定が簡単
- **リソース管理**: 予測可能なリソース使用量

---

**実装完了後**: tasks/20250721_175459_browser_optimization/reports/REPORT-002-single-browser-optimization.md に報告書を作成してください。