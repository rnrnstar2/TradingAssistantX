# TASK-001: ヘッドレスモード動的切り替え機能実装

## 📋 実装概要

dev/startコマンドに応じてPlaywrightのヘッドレスモードを動的に切り替える機能を実装します。

### 🎯 実装目標
- **dev実行時**: ヘッドレスOFF（ブラウザを視覚的に確認可能）
- **start実行時**: ヘッドレスON（本番運用モード）
- **環境変数での制御**: `PLAYWRIGHT_HEADLESS`環境変数による上書き可能

## 🔧 実装要件

### 1. 環境変数の追加・拡張
現在の`X_TEST_MODE`に加えて、以下の環境変数を追加：

```bash
# 新規追加
PLAYWRIGHT_HEADLESS=auto|true|false
# auto: コマンドに応じて自動判定（デフォルト）
# true: 強制ヘッドレスON
# false: 強制ヘッドレスOFF
```

### 2. 判定ロジック実装
以下の優先順位でヘッドレスモードを決定：

1. **環境変数優先**: `PLAYWRIGHT_HEADLESS=true|false`が設定されている場合はそれを使用
2. **自動判定**: `PLAYWRIGHT_HEADLESS=auto`または未設定の場合
   - `process.argv`または`process.env.npm_lifecycle_event`を確認
   - `dev`, `dev:watch`の場合: ヘッドレスOFF
   - `start`の場合: ヘッドレスON
3. **フォールバック**: 判定不可の場合はヘッドレスON（安全側）

## 📁 修正対象ファイル

### 1. `src/lib/playwright-common-config.ts`
現在の`testMode`ベースの判定を拡張：

```typescript
// 現在のコード（修正対象）
const launchOptions = finalConfig.testMode 
  ? { ...PlaywrightCommonSetup.LAUNCH_OPTIONS, headless: false, slowMo: 1000 }
  : PlaywrightCommonSetup.LAUNCH_OPTIONS;

// 新しいコード（実装目標）
const headlessMode = PlaywrightCommonSetup.determineHeadlessMode();
const launchOptions = {
  ...PlaywrightCommonSetup.LAUNCH_OPTIONS,
  headless: headlessMode,
  ...(headlessMode ? {} : { slowMo: 1000 }) // 非ヘッドレス時のみslowMo追加
};
```

### 2. `src/lib/playwright-browser-manager.ts`
同様の修正を適用：

```typescript
// 現在のコード（修正対象）
const launchOptions = this.config.testMode 
  ? { ...PlaywrightBrowserManager.LAUNCH_OPTIONS, headless: false, slowMo: 1000 }
  : PlaywrightBrowserManager.LAUNCH_OPTIONS;

// 新しいコード（実装目標）
const headlessMode = this.determineHeadlessMode();
const launchOptions = {
  ...PlaywrightBrowserManager.LAUNCH_OPTIONS,
  headless: headlessMode,
  ...(headlessMode ? {} : { slowMo: 1000 })
};
```

## 🛠️ 実装詳細

### 1. ヘッドレスモード判定メソッド

`PlaywrightCommonSetup`クラスに以下のメソッドを追加：

```typescript
/**
 * ヘッドレスモードを動的に判定
 */
static determineHeadlessMode(): boolean {
  // 1. 環境変数の直接指定をチェック
  const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
  if (envHeadless === 'true') return true;
  if (envHeadless === 'false') return false;
  
  // 2. 自動判定（npm scriptまたはコマンドライン引数から）
  const npmScript = process.env.npm_lifecycle_event;
  const isDevMode = npmScript === 'dev' || npmScript === 'dev:watch';
  
  // 3. process.argvからの判定（フォールバック）
  const hasDevArg = process.argv.some(arg => 
    arg.includes('autonomous-runner-single') || 
    arg.includes('tsx watch')
  );
  
  // 4. 最終判定
  if (isDevMode || hasDevArg) {
    console.log('🎭 [ヘッドレスモード] DEV環境を検出 - ヘッドレスOFF');
    return false;
  }
  
  console.log('🎭 [ヘッドレスモード] PROD環境を検出 - ヘッドレスON');
  return true;
}
```

### 2. ログ出力の改善

ヘッドレスモード判定時の詳細ログを追加：

```typescript
console.log(`🎭 [ブラウザ起動] ヘッドレスモード: ${headlessMode ? 'ON' : 'OFF'} (環境: ${npmScript || 'unknown'})`);
```

### 3. デバッグ情報の追加

設定確認用のデバッグメソッドを追加：

```typescript
/**
 * 現在のPlaywright設定情報を出力（デバッグ用）
 */
static logCurrentConfig(): void {
  const headless = PlaywrightCommonSetup.determineHeadlessMode();
  const npmScript = process.env.npm_lifecycle_event;
  const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
  
  console.log('🔍 [Playwright設定情報]');
  console.log(`  ヘッドレスモード: ${headless ? 'ON' : 'OFF'}`);
  console.log(`  npmスクリプト: ${npmScript || 'N/A'}`);
  console.log(`  PLAYWRIGHT_HEADLESS: ${envHeadless || 'N/A'}`);
  console.log(`  X_TEST_MODE: ${process.env.X_TEST_MODE || 'N/A'}`);
}
```

## ✅ 検証方法

### 1. 基本動作確認
```bash
# DEV環境（ヘッドレスOFF確認）
pnpm dev

# PROD環境（ヘッドレスON確認）
pnpm start
```

### 2. 環境変数での上書き確認
```bash
# 強制ヘッドレスON
PLAYWRIGHT_HEADLESS=true pnpm dev

# 強制ヘッドレスOFF
PLAYWRIGHT_HEADLESS=false pnpm start
```

### 3. ログ確認
実行時に以下のログが出力されることを確認：
- `🎭 [ヘッドレスモード] DEV環境を検出 - ヘッドレスOFF`
- `🎭 [ブラウザ起動] ヘッドレスモード: OFF (環境: dev)`

## 🚨 注意事項

### 1. 既存機能への影響
- 既存の`testMode`による制御は**維持**
- 後方互換性を**確保**

### 2. パフォーマンス考慮
- 判定ロジックは軽量に実装
- 判定結果のキャッシュは不要（毎回判定でOK）

### 3. エラーハンドリング
- 環境変数が不正な値の場合は警告を出力し、安全側（ヘッドレスON）にフォールバック

## 📊 完了基準

- [ ] `pnpm dev`実行時にブラウザが視覚的に起動する
- [ ] `pnpm start`実行時にヘッドレスモードで動作する
- [ ] `PLAYWRIGHT_HEADLESS`環境変数での上書きが機能する
- [ ] 適切なログが出力される
- [ ] 既存のテストが全てパスする

## 🔄 実装後の活用

この機能により：
- **開発時**: ブラウザの動作を視覚的に確認可能
- **デバッグ時**: `PLAYWRIGHT_HEADLESS=false`で一時的に可視化
- **本番時**: パフォーマンス最適化されたヘッドレス動作

---

**実装完了後**: tasks/20250721_175459_browser_optimization/reports/REPORT-001-headless-mode-switch.md に報告書を作成してください。