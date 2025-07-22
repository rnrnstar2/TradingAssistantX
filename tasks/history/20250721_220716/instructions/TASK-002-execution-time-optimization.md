# TASK-002: 実行時間最適化

## 🎯 目標
実行時間を2分以内に短縮（Critical Fix B完了）

## 📊 現状分析
- 現在のEXECUTION_TIMEOUT: 3分
- 実際の実行時間: 2分以上（目標未達）
- レポート推奨: ブラウザタイムアウト30秒設定

## ⚡ 最適化戦略

### Priority 1: ブラウザセッション最適化
```typescript
// 推奨設定
const BROWSER_CONFIG = {
  maxConcurrentSessions: 1,
  maxWaitTime: 30000, // 30秒
  headless: true, // ヘッドレスモード強制
  timeout: {
    navigation: 15000, // 15秒
    element: 10000,    // 10秒
    action: 5000       // 5秒
  }
};
```

### Priority 2: 並列処理制限強化
```typescript
// 同期実行による安定性確保
const EXECUTION_CONFIG = {
  parallelLimit: 1,
  retryLimit: 2,
  earlyTermination: true
};
```

### Priority 3: フォールバック機能早期発動
```typescript
// 30秒以内にフォールバック実行
const FALLBACK_TIMEOUT = 30000;
```

## 🔧 実装対象ファイル

### 主要修正ファイル
1. `src/scripts/autonomous-runner-single.ts`
   - EXECUTION_TIMEOUT調整
   - ブラウザ設定最適化

2. `src/lib/playwright-browser-manager.ts` 
   - セッション管理最適化
   - タイムアウト設定統一

3. `src/lib/playwright-common-config.ts`
   - ブラウザ設定の共通化
   - パフォーマンス最適化

## 📈 成功指標
- ✅ `pnpm start` 実行時間2分以内
- ✅ ブラウザセッションエラー0件
- ✅ 既存機能の正常動作確認

## 🔍 テスト要件
実行時間測定スクリプト作成：
```bash
time pnpm start 2>&1 | tee execution-time.log
```

## 📝 出力要件
完了後、以下に報告書作成：
`/Users/rnrnstar/github/TradingAssistantX/tasks/20250721_220716/reports/REPORT-002-execution-time-optimization.md`

出力必須項目：
- 修正前後の実行時間比較
- 最適化ポイント詳細
- パフォーマンステスト結果

## ⚠️ 制約事項
- 30分以内完了必須
- 既存機能への影響禁止
- 品質妥協禁止