# TASK-002: ブラウザプール管理統一・緊急修正

## 🚨 緊急修正要件
**問題**: 2つのブラウザ管理システムが競合し、セッション制限が機能せず実行エラーが発生  
**目標**: 1つのブラウザ管理システムに統一し、確実な2セッション制限を実装

## 🔍 特定された問題

### Critical: ブラウザプール管理競合
**現象**:
- `OptimizedBrowserPool`（最大2セッション制限）
- `PlaywrightBrowserManager`（最大3ブラウザ×5コンテキスト）
- **実際の動作**: 5つのセッション作成 → 設計意図と乖離

**エラー内容**:
```
❌ [ターゲット収集エラー] https://x.com/search: browserContext.newPage: 
Target page, context or browser has been closed
```

**影響**:
- ActionSpecific収集の途中停止
- 全ワークフロー未完了
- リソース効率性の大幅低下

## 🎯 修正要件

### 修正1: ブラウザ管理システム統一 (Critical)

#### 1.1 推奨アプローチ: PlaywrightBrowserManagerメイン採用
**理由**:
- より包括的な機能（セッション検証、定期メンテナンス）
- シングルトンパターンによる確実な制御
- 詳細なログ・監視機能

**作業内容**:
```typescript
// src/lib/action-specific-collector.ts
// 現在の問題箇所
const { browser: playwrightBrowser, context: playwrightContext } = 
  await PlaywrightCommonSetup.createPlaywrightEnvironment();

// 修正後
const browserManager = PlaywrightBrowserManager.getInstance();
const context = await browserManager.acquireContext(`action-${actionType}-${Date.now()}`);
```

#### 1.2 OptimizedBrowserPool削除・無効化
**ファイル**: `src/lib/playwright-common-config.ts`

**作業内容**:
1. `OptimizedBrowserPool`クラス全体をコメントアウトまたは削除
2. `PlaywrightCommonSetup.createPlaywrightEnvironment()`を`PlaywrightBrowserManager`使用に変更
3. 全ての参照を更新

### 修正2: ActionSpecificCollector修正 (High)

#### 2.1 ブラウザ取得方法の統一
**ファイル**: `src/lib/action-specific-collector.ts`

**現在の問題コード**:
```typescript
const { browser: playwrightBrowser, context: playwrightContext } = 
  await PlaywrightCommonSetup.createPlaywrightEnvironment();

browser = playwrightBrowser;
context = playwrightContext;
```

**修正後のコード**:
```typescript
const browserManager = PlaywrightBrowserManager.getInstance({
  maxBrowsers: 1,           // 1ブラウザに制限
  maxContextsPerBrowser: 2  // 2コンテキストに制限
});

const sessionId = `action-specific-${actionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
context = await browserManager.acquireContext(sessionId);
```

#### 2.2 リソース解放の修正
**現在の問題**:
```typescript
await PlaywrightCommonSetup.cleanup(browser || undefined, context || undefined);
```

**修正後**:
```typescript
if (sessionId) {
  await browserManager.releaseContext(sessionId);
}
```

### 修正3: 確実なセッション制限実装 (High)

#### 3.1 PlaywrightBrowserManager設定強化
**ファイル**: `src/lib/playwright-browser-manager.ts`

**設定変更**:
```typescript
private static readonly DEFAULT_CONFIG: PlaywrightManagerConfig = {
  timeout: 30000,
  maxRetries: 3,
  requestDelay: 2000,
  testMode: process.env.X_TEST_MODE === 'true',
  maxBrowsers: 1,      // 1ブラウザに制限
  maxContextsPerBrowser: 2  // 2コンテキストに制限
};
```

#### 3.2 同時セッション制限チェック強化
```typescript
async acquireContext(sessionId: string): Promise<BrowserContext> {
  // アクティブセッション数チェック強化
  const activeSessions = Array.from(this.activeSessions.values())
    .filter(s => s.isActive).length;
  
  if (activeSessions >= 2) {
    console.log(`⚠️ [セッション制限] 最大2セッション到達、待機中...`);
    await this.waitForAvailableSession();
  }
  
  // 既存ロジック継続...
}

private async waitForAvailableSession(maxWaitMs: number = 30000): Promise<void> {
  // 使用可能なセッションが出るまで待機
}
```

### 修正4: 並列実行管理の最適化 (Medium)

#### 4.1 AutonomousExecutor修正
**ファイル**: `src/core/autonomous-executor.ts`

**ActionSpecific並列実行の制限**:
```typescript
// 現在: 4つのActionSpecificを並列実行
// 修正後: 2つずつの段階的実行

private async executeActionSpecificCollectionSafe(context: IntegratedContext): Promise<ActionSpecificPreloadResult> {
  // バッチ1: original_post, quote_tweet
  const batch1 = await Promise.all([
    this.collectActionSpecific('original_post', context),
    this.collectActionSpecific('quote_tweet', context)
  ]);
  
  // セッション解放待機
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // バッチ2: retweet, reply  
  const batch2 = await Promise.all([
    this.collectActionSpecific('retweet', context),
    this.collectActionSpecific('reply', context)
  ]);
  
  // 結果統合
  return this.mergeActionSpecificResults([...batch1, ...batch2]);
}
```

## 🔧 技術実装詳細

### Phase 1: OptimizedBrowserPool無効化 (15分)
1. `src/lib/playwright-common-config.ts`の`OptimizedBrowserPool`クラスをコメントアウト
2. `PlaywrightCommonSetup.createPlaywrightEnvironment()`の実装変更
3. 全ての参照を`PlaywrightBrowserManager`に変更

### Phase 2: ActionSpecificCollector修正 (20分)
1. `executeWithContinuationGuarantee`メソッドの修正
2. ブラウザ取得・解放ロジックの統一
3. セッションID管理の実装

### Phase 3: セッション制限強化 (10分)
1. `PlaywrightBrowserManager`設定変更
2. 同時セッション制限チェック実装
3. 待機ロジック追加

### Phase 4: 並列実行最適化 (15分)
1. `AutonomousExecutor`の並列実行管理修正
2. バッチ実行ロジック実装
3. セッション解放待機実装

## ✅ 実装チェックリスト

### Critical修正
- [ ] `OptimizedBrowserPool`の完全無効化
- [ ] `ActionSpecificCollector`のブラウザ取得ロジック統一
- [ ] `PlaywrightBrowserManager`への統一移行
- [ ] セッション解放ロジック修正

### セッション制限確保
- [ ] 最大1ブラウザ、2コンテキスト設定
- [ ] アクティブセッション数チェック強化
- [ ] セッション待機ロジック実装
- [ ] リソース監視強化

### 動作確認
- [ ] TypeScript型チェック通過
- [ ] 単一ActionSpecific収集テスト
- [ ] 全ワークフロー完了テスト
- [ ] リソース使用量確認

## 📊 期待される改善効果

### 修正前の問題
- **セッション数**: 5つ（制御不能）
- **実行完了率**: 60%（途中停止）
- **リソース効率**: 低（競合により無駄）

### 修正後の目標
- **セッション数**: 2つ（確実な制御）
- **実行完了率**: 95%以上
- **リソース効率**: 高（最適化された管理）

## 🚨 重要事項

### 緊急性
- **即座修正必要**: ブラウザプール競合により基本動作が不安定
- **実行時間制限**: 1時間以内での修正完了
- **品質担保**: TypeScript strict mode完全準拠維持

### 修正後テスト
1. **単体テスト**: `pnpm run check-types`
2. **統合テスト**: `pnpm run dev`で30秒間動作確認
3. **完了確認**: 全8ステップのワークフロー完了

### リスク管理
- **最小限修正**: 動作に必要な最小限の変更のみ
- **段階的適用**: Phase順での慎重な実装
- **ロールバック準備**: 問題発生時の復旧手順確認

---

**優先度**: Critical  
**所要時間**: 1時間  
**難易度**: Medium  
**影響範囲**: ブラウザ管理システム全体