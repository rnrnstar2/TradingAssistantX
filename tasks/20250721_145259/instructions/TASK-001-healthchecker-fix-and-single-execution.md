# TASK-001: HealthChecker修正とpnpm dev単発実行化

## 🎯 緊急課題概要

現在 `pnpm dev` を実行すると、HealthCheckerがcritical状態を返すため、自律実行システムのメインワークフローが実行されず、即座に停止してしまう。

**現在の状況**:
- ヘルスチェック後「⚠️ システムクリティカル状態 - 実行停止」で終了
- 実際のコンテンツ生成・投稿機能が実行されない
- 「次回96分後」表示で定期実行モードになっている

**ユーザー要求**:
- `pnpm dev` で即座に1回のワークフロー実行
- 定期実行ではなく単発実行
- メインタスクの正常実行

## 🔍 根本原因分析

### 1. HealthChecker問題
`src/utils/monitoring/health-check.ts` Line 24-29の `requiredDataFiles` が削除済みファイルを参照：

```typescript
private readonly requiredDataFiles = [
  'data/account-strategy.yaml',     // ❌ 削除済み
  'data/content-patterns.yaml',    // ❌ 削除済み  
  'data/growth-targets.yaml',      // ❌ 削除済み
  'data/posting-history.yaml'      // ❌ 削除済み
];
```

**実在ファイル（data/ディレクトリ）**:
- ✅ account-config.yaml
- ✅ autonomous-config.yaml  
- ✅ content-strategy.yaml
- ✅ posting-data.yaml

### 2. 単発実行vs定期実行問題
`src/scripts/autonomous-runner.ts` Line 64-68:
- 現在は定期実行用の96分間隔スリープが組み込まれている
- `pnpm dev` でも定期実行モードになっている

## 📋 実装要件

### Task 1A: HealthChecker修正
`src/utils/monitoring/health-check.ts` の以下を修正：

**Line 24-29**: `requiredDataFiles` を実在ファイルに更新
```typescript
private readonly requiredDataFiles = [
  'data/account-config.yaml',
  'data/autonomous-config.yaml', 
  'data/content-strategy.yaml',
  'data/posting-data.yaml'
];
```

### Task 1B: 単発実行スクリプト作成
`src/scripts/autonomous-runner-single.ts` を新規作成：

**機能要件**:
- `autonomous-executor.ts` の `executeAutonomously()` を1回のみ実行
- 96分間隔スリープを除去
- 実行完了後即座に終了

**実装方針**:
```typescript
// 基本構造例
async function main() {
  console.log('🚀 TradingAssistantX 単発実行開始');
  const executor = new AutonomousExecutor();
  
  try {
    await executor.executeAutonomously();
    console.log('✅ 単発実行完了');
  } catch (error) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  }
}
```

### Task 1C: package.json更新
`package.json` の scripts セクション修正：

```json
{
  "scripts": {
    "dev": "tsx watch src/scripts/autonomous-runner-single.ts",
    "start": "tsx src/scripts/autonomous-runner.ts",
    "dev:watch": "tsx watch src/scripts/autonomous-runner-single.ts"
  }
}
```

## 🔧 技術制約

### TypeScript設定
- **Strict Mode**: 必須遵守
- **エラーハンドリング**: try-catchでの適切な例外処理
- **型安全性**: 既存の型定義活用

### ファイル構造遵守
- **autonomous-runner.ts**: 定期実行用として保持
- **autonomous-runner-single.ts**: 新規作成（単発実行用）
- **existing interfaces**: `AutonomousExecutor` インターフェース変更禁止

### 出力管理
- **ログ出力場所**: 既存のログ出力パターンを維持
- **エラーログ**: `data/context/error-log.json` への記録継続

## ✅ 完了確認基準

### 1. HealthChecker動作確認
```bash
# ヘルスチェック単体実行でhealthy状態確認
pnpm run health
# 期待値: "✅ システムは正常です"
```

### 2. 単発実行確認
```bash
# 単発実行でワークフロー完全実行確認
pnpm dev
# 期待値: Step 1〜8まで全て実行され、96分待機なしで終了
```

### 3. 定期実行維持確認
```bash
# 定期実行モード正常動作確認
pnpm start
# 期待値: 従来通りの96分間隔定期実行
```

## 🚨 重要注意事項

### 実装優先順位
1. **最高優先**: HealthChecker修正（即座の問題解決）
2. **高優先**: 単発実行スクリプト作成
3. **中優先**: package.json更新

### 破壊的変更禁止
- **既存の定期実行システム**: 一切変更禁止
- **AutonomousExecutor**: インターフェース変更禁止
- **設定ファイル**: data/配下のYAML構造変更禁止

### 品質基準
- **Lint通過**: 必須
- **TypeScript型チェック**: エラーゼロ必須
- **動作確認**: 3段階テスト必須実行

## 📊 期待される結果

**修正前**:
```
🚀 TradingAssistantX 自動投稿システム起動
🏥 [Step 1] システム起動・ヘルスチェック
⚠️ システムクリティカル状態 - 実行停止
✅ [13:46:11] 完了 (次回: 96分後)
```

**修正後**:
```
🚀 TradingAssistantX 単発実行開始
🏥 [Step 1] システム起動・ヘルスチェック
🔄 [Step 2] 並列実行開始: アカウント分析 & 情報収集
🧠 [Step 3] 統合分析: コンテキスト生成中...
📊 [Step 4] 簡素化評価: 1日15投稿目標ベース判定
🎯 [Step 5] 拡張意思決定: 多様なアクション計画
⚖️ [Step 6] 最適配分: 本日のアクション配分計算
🚀 [Step 7] 拡張実行: 投稿/引用/RT/リプライ実行
✅ [完了] 単発実行完了
```

---

**完了報告書ファイル**: `tasks/20250721_145259/reports/REPORT-001-healthchecker-fix-and-single-execution.md`