# TASK-002: Loop Manager & Scripts 新規作成

## 🎯 タスク概要
**責任範囲**: loop-manager.ts の新規作成と scripts/ディレクトリの完全再構築

## 📋 実装要件

### 🆕 新規作成ファイル

#### 1. src/core/loop-manager.ts
**機能**: ループ実行管理の中核システム
```typescript
// 必須実装機能
export class LoopManager {
  // 1日15回の定時実行管理
  scheduleAutonomousLoop(): void
  
  // 個別実行管理（開発・テスト用）
  executeSingleRun(): void
  
  // 実行状態監視
  monitorExecutionStatus(): void
  
  // エラー処理・復旧
  handleExecutionErrors(): void
}
```

#### 2. src/scripts/main.ts
**機能**: ループ実行エントリーポイント（pnpm start）
```typescript
// REQUIREMENTS.mdに基づく実装
// - 1日15回の定時実行システム
// - 最適投稿時間での自動実行
// - core-runner.ts を利用した共通ロジック実行
```

#### 3. src/scripts/dev.ts  
**機能**: 単一実行エントリーポイント（pnpm dev）
```typescript
// REQUIREMENTS.mdに基づく実装
// - 1回だけの実行（開発・テスト用）
// - core-runner.ts を利用した共通ロジック実行
```

#### 4. src/scripts/core-runner.ts
**機能**: 共通実行ロジック（DRY原則）
```typescript
// 共通のコア実行ロジック
// - アカウント分析 → 投稿作成のワークフロー
// - main.ts と dev.ts で共有される処理
```

## 📋 REQUIREMENTS.md準拠設計

### ループ実行システム設計
```typescript
// data/config/posting-times.yaml からの時間取得
const postingTimes = [
  '07:00', '08:00',        // 朝の投稿時間
  '12:00',                 // 昼の投稿時間  
  '18:00', '19:00',        // 夕方の投稿時間
  '21:00', '22:00', '23:00' // 夜の投稿時間
];
// 合計15回/日の実行
```

### スクリプト設計思想
- **core-runner.ts**: 共通のコア実行ロジック（アカウント分析→投稿作成）
- **main.ts**: core-runnerを15回/日のループで実行  
- **dev.ts**: core-runnerを1回だけ実行（開発・テスト用）

### 実行方法
- **`pnpm start`**: main.ts（ループ実行）- 1日15回の定時実行システム
- **`pnpm dev`**: dev.ts（単一実行）- 開発・デバッグ用の1回実行

## 🏗️ アーキテクチャ設計

### LoopManager 責任分離
```typescript
interface LoopManager {
  // 📅 スケジュール管理
  scheduleAutonomousLoop(): void;
  
  // 🔄 実行制御
  executeSingleRun(): void;
  
  // 📊 状態監視
  monitorExecutionStatus(): void;
  
  // 🚨 エラー処理
  handleExecutionErrors(): void;
}
```

### Scripts 連携設計
```
main.ts → LoopManager.scheduleAutonomousLoop()
           ↓ 
dev.ts  → LoopManager.executeSingleRun()
           ↓
         core-runner.ts（共通処理）
           ↓
         autonomous-executor.ts（実行）
```

## 🔗 Integration 要件

### data/ ディレクトリ連携
```yaml
# data/config/autonomous-config.yaml
execution:
  mode: "SCHEDULED_POSTING"
  loop_interval: "15_times_daily"
  
# data/config/posting-times.yaml  
posting_times:
  morning: ["07:00", "08:00"]
  noon: ["12:00"] 
  evening: ["18:00", "19:00"]
  night: ["21:00", "22:00", "23:00"]
```

### Claude Code SDK Integration
- **LoopManager**: Claude Code SDKによる自律的判断
- **Scripts**: SDKからの指示に基づく実行制御

## 🔒 技術制約

### TypeScript設定
- **strict mode**: 必須遵守
- **型安全性**: any型使用禁止
- **エラーハンドリング**: 包括的try-catch実装

### 依存関係制御
**✅ 許可されたインポート**:
- `../core/autonomous-executor.ts`
- `../core/decision-engine.ts`  
- `../types/` からの型定義
- `../utils/yaml-manager.ts`
- 標準ライブラリ・npm packages

**🚫 禁止されたインポート**:
- core/ディレクトリの他ファイル（削除対象）
- 循環参照を生む依存関係

## 🧪 検証要件

### 動作確認項目
1. **pnpm start**: ループ実行が正常開始する
2. **pnpm dev**: 単一実行が正常完了する  
3. **TypeScript**: 全ファイルでコンパイルエラー0
4. **ESLint**: 全ファイルでlintエラー0

### パフォーマンス要件
- **メモリ使用量**: ループ実行時の効率的なリソース管理
- **実行時間**: 各回の実行時間を適切に制御

## 📂 出力管理規則

### ✅ 許可された出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-002-loop-scripts-creation.md`

### 🚫 禁止事項
- ルートディレクトリへの出力
- 分析レポートの直接生成

## ⚠️ 重要な設計方針

### 疎結合原則
- **LoopManager**: 実行制御に専念、ビジネスロジックは持たない
- **Scripts**: エントリーポイントとしての責任に専念

### 拡張性考慮
- **設定駆動**: YAML設定による柔軟な時間調整
- **プラグアブル**: 新しい実行モードの追加容易性

### エラー耐性
- **Graceful Degradation**: 一部実行失敗時も継続実行
- **自動復旧**: 一時的エラーからの自動回復機能

## 📋 報告書要件

### 必須記載事項
1. **実装完了状況**: 各新規ファイルの詳細実装内容
2. **アーキテクチャ説明**: 4ファイルの連携方式
3. **検証結果**: TypeScript/ESLint/実行テストの結果
4. **REQUIREMENTS.md適合性**: 理想構造との一致確認
5. **今後の課題**: 特定された制限事項・改善点

### 報告書出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-002-loop-scripts-creation.md`

## 🎯 成功基準
- loop-manager.ts の完全な新規実装完了
- scripts/ 3ファイルの理想構造実現
- pnpm start/dev コマンドの正常動作
- REQUIREMENTS.md 100%準拠の実現

---

**革新性重視**: 自律的なループ管理システムの完全実現を目指してください