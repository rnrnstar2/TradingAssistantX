# TASK-001: Phase 1 - 型安全性と依存関係修正

## 🎯 実装目標

**src/main-workflows/の型安全性問題と依存関係エラーを修正し、安定したコード品質を確保する**

## 📋 前提条件

### 必須読み込み
1. **REQUIREMENTS.md** - システム要件定義の理解
2. **src/main-workflows/status-controller.ts** - 修正对象ファイルの詳細把握
3. **src/shared/component-container.ts** - コンポーネント管理システムの理解

### MVP制約確認
- **シンプル実装**: 複雑な抽象化を避け、確実に動作する最小限の修正
- **品質最優先**: TypeScript strictモードでエラーゼロを目指す
- **保守性重視**: 可読性とメンテナンス性を考慮した修正

## 🔧 実装詳細

### A. status-controller.ts の型安全性修正

**問題箇所の特定と修正:**

1. **未定義クラス参照エラー修正**
   ```typescript
   // 【修正前】Line 121, 123
   const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
     ? this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER) : null;
   const mainLoop = this.container.has(COMPONENT_KEYS.MAIN_LOOP) 
     ? this.container.get<MainLoop>(COMPONENT_KEYS.MAIN_LOOP) : null;

   // 【修正後】SchedulerManagerを使用
   const schedulerManager = this.container.has(COMPONENT_KEYS.SCHEDULER_MANAGER) 
     ? this.container.get<SchedulerManager>(COMPONENT_KEYS.SCHEDULER_MANAGER) : null;
   ```

2. **型定義の統一**
   ```typescript
   // 【修正前】Line 248-252: 未定義インターフェース
   private getEnhancedSystemStatus(
     isInitialized: boolean,
     scheduler: CoreScheduler | null,
     mainLoop: MainLoop | null
   ): SystemStatusReport

   // 【修正後】実際のコンポーネントを使用
   private getEnhancedSystemStatus(
     isInitialized: boolean,
     schedulerManager: SchedulerManager | null
   ): SystemStatusReport
   ```

3. **メソッド実装の修正**
   ```typescript
   // getEnhancedSystemStatus メソッド内の型安全な実装
   const schedulerStatus = schedulerManager ? {
     running: schedulerManager.getSchedulerStatus().running,
     nextExecution: schedulerManager.getSchedulerStatus().nextExecution,
     totalExecutions: schedulerManager.getLoopMetrics()?.totalExecutions || 0,
     successRate: schedulerManager.getLoopMetrics()?.successRate || 0,
     averageExecutionTime: schedulerManager.getLoopMetrics()?.avgExecutionTime || 0
   } : null;
   ```

### B. 依存関係の整合性確保

1. **インポート文の修正**
   ```typescript
   // 不要なインポートを削除し、実際に使用するもののみ保持
   import { SchedulerManager } from './scheduler-manager';
   // 削除: import { CoreScheduler, MainLoop } from './未定義パス';
   ```

2. **型定義インターフェースの調整**
   ```typescript
   // 実際の型に合わせてインターフェースを修正
   interface SchedulerManagerStatus {
     running: boolean;
     nextExecution?: string;
     totalExecutions: number;
     successRate: number;
     averageExecutionTime: number;
     lastExecution?: string;
   }
   ```

### C. system-lifecycle.ts の型整合性確認

**問題の可能性がある箇所の確認と修正:**

1. **HealthChecker クラス内の型参照**
   ```typescript
   // Line 257, 289: MainLoop参照の確認
   // 実際に存在するコンポーネントかチェックし、必要に応じて修正
   ```

2. **ShutdownManager の依存関係**
   ```typescript
   // Line 425: CoreScheduler参照の確認
   // SchedulerManagerに統一する必要がある場合は修正
   ```

## ⚠️ 重要な制約事項

### MVP制約遵守
- **機能追加禁止**: 新しい機能は追加せず、既存の型エラーのみ修正
- **最小限修正**: エラー解決に必要最小限の変更のみ実施
- **動作保証**: 修正後も既存の機能が正常動作することを確認

### 禁止事項
- ❌ 新しいクラスやインターフェースの追加
- ❌ 既存の機能ロジックの変更
- ❌ パフォーマンス最適化のための大幅な改修
- ❌ 将来の拡張性を考慮した過度な抽象化

### 修正方針
- ✅ 既存のSchedulerManagerを最大限活用
- ✅ 型安全性を確保する最小限の変更
- ✅ 可読性とメンテナンス性の維持
- ✅ REQUIREMENTS.mdの要件に沿った修正

## 🔍 品質チェック要件

### TypeScript Strict Mode
```bash
# 修正完了後に実行
npx tsc --noEmit --strict
```

### ESLint チェック
```bash
# コーディング規約チェック
npx eslint src/main-workflows/ --fix
```

### 動作確認
```bash
# 基本的なビルドチェック
npm run build
```

## 📊 完了基準

1. **TypeScript エラーゼロ**: `npx tsc --noEmit --strict` でエラーなし
2. **ESLint 通過**: 全コーディング規約チェック通過
3. **ビルド成功**: `npm run build` が正常完了
4. **既存機能保持**: 型修正により既存機能が破損していないこと

## 📝 実装ガイドライン

### ファイル修正順序
1. **status-controller.ts** - 最優先（型エラーが最多）
2. **system-lifecycle.ts** - 依存関係確認・修正
3. **全体の整合性チェック** - インポート文とコンポーネント参照の統一

### コード品質基準
- **型安全性**: すべての変数・関数に適切な型指定
- **null安全性**: null/undefinedチェックの徹底
- **エラーハンドリング**: try-catch文での適切な例外処理
- **ログ出力**: systemLoggerを使用した情報出力

### 出力先指定
- **修正対象**: `src/main-workflows/` 配下のファイルのみ
- **バックアップ不要**: 既存コードの動作を保持する修正のため

## 🚫 絶対禁止事項

- **ルートディレクトリへの出力**: 一時ファイル・分析結果の直接出力禁止
- **機能改変**: 型修正以外の機能変更は一切禁止
- **設定ファイル変更**: tsconfig.json等の設定変更禁止
- **新規依存関係**: 新しいライブラリやパッケージの追加禁止

---

**このタスクはPhase 1の緊急修正タスクです。型安全性を確保し、次のPhaseでのリファクタリング作業の基盤を確立してください。**