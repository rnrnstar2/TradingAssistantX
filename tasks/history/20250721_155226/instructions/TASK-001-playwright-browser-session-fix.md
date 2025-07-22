# TASK-001: Playwright ブラウザセッション並列実行エラー修正

## 🎯 実装目標

Playwright自動化システムの並列実行時に発生している「Target page, context or browser has been closed」エラーを修正し、安定したブラウザセッション管理を実現する。

## 🚨 現在のエラー状況

### エラー発生場所
1. **PlaywrightAccountCollector.extractBasicInfo()** - 164行目
2. **PlaywrightAccountCollector.extractFollowerStats()** - 205行目  
3. **PlaywrightAccountCollector.extractLastTweetTime()** - 249行目

### エラーの原因分析
- **並列実行競合**: `step2_executeParallelAnalysis()` で複数のPlaywrightインスタンスが同時起動
- **不適切なリソース管理**: ブラウザセッションが予期せずに終了
- **cleanup()の早期実行**: エラー時のfinally句でブラウザが他の処理中に強制終了

## 📋 修正要件

### 1. ブラウザセッション管理の修正

**対象ファイル**: `src/lib/playwright-account-collector.ts`

#### 修正内容:
- **シングルトンパターンの実装**: グローバルブラウザインスタンス管理
- **リソースプール管理**: 並列実行時のブラウザリソース競合回避
- **適切なcleanup制御**: 他の処理が完了するまでブラウザセッションを維持

### 2. 並列実行時の同期処理改善

**対象ファイル**: `src/core/autonomous-executor.ts`

#### 修正内容:
- **並列実行の順序制御**: アカウント分析とActionSpecific情報収集の適切な分離
- **エラーハンドリングの強化**: 一方の処理でエラーが発生しても他方を継続
- **リソース競合の回避**: Playwrightブラウザリソースの適切な分散

### 3. PlaywrightCommonSetup の改善

**対象ファイル**: `src/lib/playwright-common-config.ts` (存在する場合)

#### 修正内容:
- **ブラウザプール管理**: 複数のブラウザインスタンスの効率的な管理
- **セッション分離**: 並列処理で独立したブラウザコンテキストを提供

## 🔧 実装指針

### A. シングルトンブラウザマネージャーの実装

```typescript
// 実装例の指針
class PlaywrightBrowserManager {
  private static instance: PlaywrightBrowserManager;
  private browserPool: Browser[] = [];
  private activeConnections: Map<string, BrowserContext> = new Map();
  
  // シングルトンパターンでグローバル管理
  static getInstance(): PlaywrightBrowserManager
  
  // 並列実行用のブラウザコンテキスト取得
  async acquireContext(sessionId: string): Promise<BrowserContext>
  
  // リソース返却（即座にcleanupしない）
  async releaseContext(sessionId: string): Promise<void>
  
  // 全セッション終了時のみcleanup
  async cleanupAll(): Promise<void>
}
```

### B. 並列実行制御の改善

```typescript
// step2_executeParallelAnalysis の改善指針
async step2_executeParallelAnalysis(): Promise<ParallelAnalysisResult> {
  const sessionId = `session_${Date.now()}`;
  
  try {
    // セッション固有のブラウザコンテキストを取得
    const browserManager = PlaywrightBrowserManager.getInstance();
    const accountContext = await browserManager.acquireContext(`${sessionId}_account`);
    const actionContext = await browserManager.acquireContext(`${sessionId}_action`);
    
    // 並列実行（個別のコンテキストで実行）
    const [accountResult, actionResult] = await Promise.allSettled([
      this.accountAnalyzer.analyzeCurrentStatus(accountContext),
      this.actionSpecificCollector.collect(actionContext)
    ]);
    
    // 結果の適切な処理
    return this.handleParallelResults(accountResult, actionResult);
  } finally {
    // セッション終了時にリソース返却（即座にcleanupしない）
    await browserManager.releaseContext(`${sessionId}_account`);
    await browserManager.releaseContext(`${sessionId}_action`);
  }
}
```

## ✅ 品質要件

### TypeScript厳格モード
- **厳格な型チェック**: すべての型定義を明確化
- **null安全性**: Optional chainingとnull checksの徹底
- **エラーハンドリング**: try-catch-finallyの適切な使用

### テスト要件
- **単体テスト**: ブラウザマネージャーの各メソッドのテスト
- **統合テスト**: 並列実行シナリオでのエラー発生テスト
- **エラーケース**: 異常終了時の適切なリソース解放テスト

### パフォーマンス要件
- **並列実行**: 複数のPlaywrightセッションが互いに影響しない
- **リソース効率**: 不要なブラウザインスタンスの削減
- **メモリ管理**: 長時間実行でのメモリリーク防止

## 📁 出力管理規則

### 承認された出力場所
- **修正ファイル**: 既存ファイルの編集のみ（新規作成は最小限）
- **テストファイル**: `tests/` ディレクトリ配下
- **一時ファイル**: `tasks/20250721_155226/outputs/` 配下

### 禁止事項
- **ルートディレクトリ**: 直下への任意のファイル作成は絶対禁止
- **config変更**: システム設定ファイルの不要な変更禁止

## 🚀 実装手順

### Step 1: PlaywrightBrowserManager実装
1. シングルトンパターンでブラウザプール管理クラス作成
2. セッション固有のコンテキスト管理機能実装
3. 適切なリソース解放制御実装

### Step 2: PlaywrightAccountCollector修正
1. ブラウザマネージャー統合
2. extractBasicInfo, extractFollowerStats, extractLastTweetTime の安定化
3. エラーハンドリング強化

### Step 3: AutonomousExecutor修正
1. step2_executeParallelAnalysis の並列実行制御改善
2. セッション管理の統合
3. エラー発生時の適切な継続処理

### Step 4: テスト実装
1. 並列実行テストケース作成
2. エラー回復テストケース作成
3. 実際のエラーシナリオでの動作確認

## 📋 完了条件

### 必須条件
- [x] 並列実行時の「Target page, context or browser has been closed」エラーゼロ
- [x] 複数のPlaywrightセッションが同時実行可能
- [x] エラー発生時の適切なリソース解放
- [x] TypeScript strict mode でのエラーゼロ
- [x] lint, typecheck の全通過

### 検証条件
- [x] `pnpm dev` コマンドでエラーなく実行完了
- [x] 並列実行環境での3回連続正常動作
- [x] システム全体の動作に影響を与えない

## 🎯 実用性重視

### 価値提供
- **システム安定性**: X自動化システムの信頼性向上
- **実行効率**: 並列処理による処理速度の向上
- **メンテナンス性**: エラー発生頻度の削減

### 制限回避
- **過剰な制限なし**: 必要な機能を適切に実装
- **実用性優先**: 理論より実際の問題解決に集中
- **パフォーマンス重視**: システム全体の動作効率向上

---

**重要**: この修正により、TradingAssistantX システムの自律実行機能が安定して動作し、ユーザーに価値のあるX自動化サービスを提供できるようになります。