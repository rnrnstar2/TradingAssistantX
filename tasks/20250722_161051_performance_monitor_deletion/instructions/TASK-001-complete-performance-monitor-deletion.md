# TASK-001: パフォーマンス測定機能の完全削除

## 🎯 **WORKER専用タスク**
**Manager権限制限**: このタスクはWorker権限でのみ実行可能

## 📋 **タスク概要**
パフォーマンス測定機能が依然として残存しており、システムが軽量化されていない状態です。以下の作業で完全削除を実行してください。

### 🚨 **現在の問題状況**
- PerformanceMonitorクラス（342行）が完全に残存
- DecisionLoggerで7箇所のアクティブ使用
- パフォーマンス測定ログが現在も出力中
- システム軽量化が未達成

## ✅ **削除対象ファイル・箇所**

### 📂 **1. メインクラス削除**
```bash
# 完全削除対象
rm src/lib/logging/performance-monitor.ts
```

### 📝 **2. DecisionLogger修正** (`src/lib/decision-logger.ts`)

**正確な削除対象行**:
```typescript
// 6行目 - import文削除
import { PerformanceMonitor } from './logging/performance-monitor.js';

// 73行目 - プロパティ宣言削除
private performanceMonitor: PerformanceMonitor;

// 85-86行目 - 設定項目削除
enablePerformanceMonitoring: false,
performanceMonitoringInterval: 5000, // 5 seconds

// 92行目 - インスタンス削除
this.performanceMonitor = new PerformanceMonitor();

// 364-365行目 - 条件分岐内削除
if (this.config.enablePerformanceMonitoring) {
  this.performanceMonitor.startSession(sessionId, context);
}

// 403-405行目 - 条件分岐内削除
if (this.config.enablePerformanceMonitoring) {
  const metrics = this.performanceMonitor.measureDecisionTime(sessionId);
}

// 450-451行目 - 条件分岐内削除
if (this.config.enablePerformanceMonitoring) {
  this.performanceMonitor.endSession(sessionId);
}

// 497行目 - 無条件実行削除（重要）
const optimizationSuggestions = this.performanceMonitor.identifyOptimizationOpportunities();

// 539行目 - 無条件実行削除（重要）
performanceMonitoring: this.performanceMonitor.getPerformanceStatistics(),
```

**修正手順**:
1. 上記すべての箇所を正確に削除
2. 条件分岐ブロックごと削除（364-366, 403-407, 450-452行目）
3. 497行目と539行目は無条件実行なので必ず削除
4. TypeScriptエラーが出ないことを確認

### 🔧 **3. ログ出力削除**

**削除対象ログ**:
```typescript
// 🚀 セッション開始ログ削除
console.log('🚀 [意思決定開始] 新しい意思決定セッションを開始...');

// 🏁 セッション終了ログ削除
console.log(`🏁 [意思決定完了] セッション${sessionId}を完了...`);
```

### 📊 **4. 型定義クリーンアップ**

**確認・削除対象**:
- `src/types/decision-logging-types.ts` 内のパフォーマンス関連型定義
- 他ファイルでのPerformanceMonitor型参照

## ⚡ **実行手順**

### **Step 0: 作業前準備**
```bash
# 作業前のバックアップ作成
git add -A
git commit -m "backup: before performance monitor deletion"

# 現在のブランチ確認
git branch --show-current
```

### **Step 1: PerformanceMonitorファイル削除**
```bash
# メインクラス削除
rm src/lib/logging/performance-monitor.ts
```

### **Step 2: DecisionLogger修正**
1. `src/lib/decision-logger.ts` を開く
2. 上記9箇所を正確に削除（import, プロパティ, 設定2行, インスタンス, 条件分岐3ブロック, 無条件実行2行）
3. ファイル保存

### **Step 3: TypeScriptコンパイル確認**
```bash
# ビルドエラーがないことを確認
npm run build

# エラーが出た場合は削除箇所を再確認
```

### **Step 4: システム起動テスト**
```bash
# システム正常起動確認
npm run dev
```

### **Step 5: 削除効果確認**
**以下のログが表示されないことを確認**:
- `🚀 [意思決定開始] 新しい意思決定セッションを開始...`
- `🏁 [意思決定完了] セッション${sessionId}を完了...`
- その他パフォーマンス測定関連ログ

**正常動作確認**:
- Claude自律システムが起動すること
- OAuth認証が正常に読み込まれること
- エラーが発生しないこと

### **Step 6: 作業完了コミット**
```bash
git add -A
git commit -m "feat: パフォーマンス測定機能完全削除によるシステム軽量化

🎯 完了作業:
- PerformanceMonitorクラス削除 (342行削除)
- DecisionLoggerから9箇所の参照削除
- 不要ログ出力停止
- システム軽量化達成

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🚫 **保持対象（削除しないもの）**

### ✅ **削除不要**:
- `examples/performance-monitoring-usage.ts` - 開発参考資料
- `examples/README.md` - ドキュメンテーション
- `tasks/history/` - 過去履歴ファイル
- `data/metrics-history.yaml` - アカウント指標データ
- `data/archives/performance/` - アーカイブデータ

## 📋 **完了確認チェックリスト**

### **削除作業**
- [ ] `src/lib/logging/performance-monitor.ts` 完全削除済み
- [ ] `src/lib/decision-logger.ts` 6行目 import文削除済み
- [ ] `src/lib/decision-logger.ts` 73行目 プロパティ宣言削除済み
- [ ] `src/lib/decision-logger.ts` 85-86行目 設定項目削除済み
- [ ] `src/lib/decision-logger.ts` 92行目 インスタンス削除済み
- [ ] `src/lib/decision-logger.ts` 364-366行目 条件分岐削除済み
- [ ] `src/lib/decision-logger.ts` 403-407行目 条件分岐削除済み
- [ ] `src/lib/decision-logger.ts` 450-452行目 条件分岐削除済み
- [ ] `src/lib/decision-logger.ts` 497行目 無条件実行削除済み
- [ ] `src/lib/decision-logger.ts` 539行目 無条件実行削除済み

### **動作確認**
- [ ] TypeScriptビルドエラーなし (`npm run build`)
- [ ] システム正常起動確認 (`npm run dev`)
- [ ] 🚀 セッション開始ログが表示されない
- [ ] 🏁 セッション終了ログが表示されない
- [ ] Claude自律システムが正常動作
- [ ] OAuth認証が正常に読み込まれる
- [ ] パフォーマンス測定関連ログが表示されない

### **完了処理**
- [ ] 作業前バックアップコミット実行済み
- [ ] 作業完了コミット実行済み
- [ ] 完了レポート提出済み

## 🎯 **期待効果**

### **システム軽量化**:
- パフォーマンス測定オーバーヘッド削除
- メモリ使用量削減
- 不要ログ出力停止
- 実行速度向上

### **コードクリーンアップ**:
- 342行のデッドコード削除
- 依存関係の簡略化
- 保守性向上

## 🚨 **注意事項**

1. **正確な削除**: 上記7箇所を漏れなく削除
2. **ビルド確認**: 削除後必ずコンパイル確認
3. **動作テスト**: Claude自律システムの正常動作確認
4. **バックアップ**: 作業前にgit commitでバックアップ

## 📊 **完了レポート要求**

作業完了後、以下を含むレポートを提出:

1. 削除したファイル・行数
2. ビルド結果
3. 動作確認結果
4. システム軽量化効果

---
**Manager指示者**: Claude Manager  
**作成日時**: 2025-07-22T16:10:51Z  
**優先度**: HIGH - システム軽量化のため即時実行