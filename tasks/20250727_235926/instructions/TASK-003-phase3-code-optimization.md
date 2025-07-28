# TASK-003: Phase 3 - コード最適化と冗長性削減

## 🎯 実装目標

**Phase 2で分割されたファイル群の冗長なコード・パターンを削減し、DRY原則に基づく最適化を実施する**

## 📋 前提条件

### 必須読み込み
1. **REQUIREMENTS.md** - システム要件定義の理解
2. **TASK-001, TASK-002完了確認** - 前フェーズの修正・分割が完了していること
3. **src/main-workflows/core/** - 分割された全ファイルの詳細把握
4. **共通パターンの特定** - 冗長性がある箇所の事前分析

### MVP制約確認
- **品質最優先**: コード品質向上のみに焦点、新機能追加は一切禁止
- **動作保証**: 最適化により既存機能に影響を与えないこと
- **シンプル設計**: 過度な抽象化を避けた実用的な最適化

## 🔧 実装詳細

### A. 共通エラーハンドリングパターンの統一

**問題の特定:**
各ファイルで類似のtry-catch-logパターンが重複

**解決策:**
```typescript
// src/main-workflows/core/common-error-handler.ts (新規作成)
export class CommonErrorHandler {
  /**
   * 統一エラーハンドリング - systemLogger使用
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<T | null> {
    try {
      const result = await operation();
      systemLogger.success(`✅ ${operationName}完了`);
      return result;
    } catch (error) {
      systemLogger.error(`❌ ${operationName}エラー:`, error);
      if (fallbackValue !== undefined) {
        systemLogger.info(`🔄 ${operationName}フォールバック値使用`);
        return fallbackValue;
      }
      return null;
    }
  }

  /**
   * TypeScript型安全なエラーメッセージ抽出
   */
  static extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
```

**適用箇所の最適化:**
```typescript
// 【Before】各ファイルで個別実装
try {
  const result = await dataManager.loadLearningData();
  systemLogger.success('✅ 学習データ読み込み完了');
  return result;
} catch (error) {
  systemLogger.error('❌ 学習データ読み込みエラー:', error);
  throw new Error(`Failed to load learning data: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// 【After】統一パターン使用
return await CommonErrorHandler.handleAsyncOperation(
  () => dataManager.loadLearningData(),
  '学習データ読み込み'
) || {};
```

### B. 型安全性パターンの統一

**共通型チェック関数の作成:**
```typescript
// src/main-workflows/core/type-guards.ts (新規作成)
export class TypeGuards {
  /**
   * 非null・非undefinedチェック
   */
  static isNonNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * オブジェクトの必須プロパティチェック
   */
  static hasRequiredProperties<T extends object>(
    obj: unknown,
    requiredKeys: (keyof T)[]
  ): obj is T {
    if (typeof obj !== 'object' || obj === null) return false;
    return requiredKeys.every(key => key in obj);
  }

  /**
   * 配列かつ空でないことの確認
   */
  static isNonEmptyArray<T>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length > 0;
  }
}
```

### C. ログ出力パターンの統一

**統一ログフォーマット:**
```typescript
// src/main-workflows/core/workflow-logger.ts (新規作成)
export class WorkflowLogger {
  /**
   * 実行ステップログ（統一フォーマット）
   */
  static logStep(stepNumber: number, stepName: string, status: 'start' | 'success' | 'error', details?: any): void {
    const emoji = status === 'start' ? '🔄' : status === 'success' ? '✅' : '❌';
    const message = `${emoji} 【ステップ${stepNumber}】${stepName}${status === 'start' ? '開始' : status === 'success' ? '完了' : 'エラー'}`;
    
    if (status === 'error') {
      systemLogger.error(message, details);
    } else if (status === 'success') {
      systemLogger.success(message, details);
    } else {
      systemLogger.info(message, details);
    }
  }

  /**
   * パフォーマンス測定付きログ
   */
  static async logTimedOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    systemLogger.info(`⏱️ ${operationName}開始`);
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      systemLogger.success(`✅ ${operationName}完了 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error(`❌ ${operationName}失敗 (${duration}ms):`, error);
      throw error;
    }
  }
}
```

### D. 冗長なコメント・ドキュメントの整理

**統一コメントスタイル:**
```typescript
/**
 * クラス責任の明確化 - 1行での役割記述
 * 長大なコメントブロックを簡潔に統一
 */
export class SchedulerCore {
  /**
   * 30分間隔スケジューラー開始
   */
  start(): void {
    // 冗長な説明コメントを削除し、必要最小限に統一
  }
}
```

### E. 重複する定数・設定値の統一

**共通設定の抽出:**
```typescript
// src/main-workflows/core/workflow-constants.ts (新規作成)
export const WORKFLOW_CONSTANTS = {
  // スケジューラー関連
  DEFAULT_INTERVAL_MINUTES: 30,
  MAX_DAILY_EXECUTIONS: 48,
  EXECUTION_WINDOW: { start: '07:00', end: '23:00' },
  
  // リトライ関連
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY: 30000,
  
  // KaitoAPI関連
  RATE_LIMIT_INTERVAL: 700,
  CACHE_TTL: 300000,
  
  // ログメッセージ
  STEP_MESSAGES: {
    DATA_LOAD: 'データ読み込み',
    CLAUDE_DECISION: 'Claude判断',
    ACTION_EXECUTION: 'アクション実行',
    RESULT_RECORDING: '結果記録'
  }
} as const;
```

## ⚠️ 重要な制約事項

### MVP制約遵守
- **機能不変**: 既存機能の動作を一切変更しない
- **最小限抽象化**: 必要最小限の共通化のみ実施
- **テスト容易性**: 最適化により単体テストが困難にならないこと

### 最適化原則
- **DRY原則**: 同じコードパターンの重複を3箇所以上で統一
- **YAGNI原則**: 将来の拡張性は考慮せず現在必要な最適化のみ
- **可読性重視**: 最適化により逆に読みにくくならないよう注意

### 禁止事項
- ❌ 過度な抽象化による複雑性の増加
- ❌ 既存のpublicメソッドのシグネチャ変更
- ❌ 新しい外部依存関係の追加
- ❌ パフォーマンス改善を目的とした大幅な変更

## 🔍 品質チェック要件

### 最適化前後の比較
```bash
# コード行数比較
find src/main-workflows -name "*.ts" -exec wc -l {} + | tail -1

# TypeScript厳格チェック
npx tsc --noEmit --strict

# ESLint品質チェック
npx eslint src/main-workflows/ --fix
```

### 機能回帰テスト
```bash
# 動作確認
pnpm dev

# エラーログ監視
tail -f logs/system.log
```

## 📊 完了基準

1. **冗長性削減**: 3箇所以上の重複パターンが統一されていること
2. **コード品質**: ESLint警告ゼロ、TypeScriptエラーゼロ
3. **可読性向上**: 各ファイルの役割が明確になっていること
4. **機能保持**: `pnpm dev` が正常実行され、全機能が動作すること

## 📝 実装ガイドライン

### 最適化実行順序
1. **共通ユーティリティ作成** (並列実行可能)
   - common-error-handler.ts
   - type-guards.ts
   - workflow-logger.ts
   - workflow-constants.ts

2. **既存ファイルの最適化適用** (順次実行)
   - scheduler-core.ts → 共通パターン適用
   - execution-flow.ts → 共通パターン適用
   - その他のファイル → 共通パターン適用

3. **全体整合性チェック・調整**

### コード最適化の具体例
```typescript
// 【Before】重複パターン
const startTime = Date.now();
try {
  systemLogger.info('🔄 データ読み込み開始');
  const result = await operation();
  const duration = Date.now() - startTime;
  systemLogger.success(`✅ データ読み込み完了 (${duration}ms)`);
  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  systemLogger.error(`❌ データ読み込み失敗 (${duration}ms):`, error);
  throw error;
}

// 【After】統一パターン
return await WorkflowLogger.logTimedOperation(
  () => operation(),
  'データ読み込み'
);
```

### エラーハンドリングの統一例
```typescript
// 各ファイルで使用される統一パターン
import { CommonErrorHandler, TypeGuards, WorkflowLogger, WORKFLOW_CONSTANTS } from './core/workflow-utils';

// 型安全なデータ抽出
const safeAccountInfo = TypeGuards.isNonNull(accountInfo) 
  ? this.extractAccountInfo(accountInfo) 
  : this.getDefaultAccountInfo();

// 統一エラーハンドリング
const learningData = await CommonErrorHandler.handleAsyncOperation(
  () => dataManager.loadLearningData(),
  WORKFLOW_CONSTANTS.STEP_MESSAGES.DATA_LOAD,
  {} // fallback
);
```

## 📁 出力先指定

- **新規共通ファイル**: `src/main-workflows/core/` 配下
- **最適化対象**: `src/main-workflows/` 全ファイル
- **作業ログ**: `tasks/20250727_235926/outputs/optimization-log.md`

## 🚫 絶対禁止事項

- **過度な抽象化**: 3行程度の処理を共通化するような過剰最適化
- **機能追加**: 最適化と称した新機能の実装
- **API変更**: 外部から呼び出されるメソッドのシグネチャ変更
- **設定変更**: TypeScriptやESLintの設定ファイル変更

---

**このタスクはPhase 3の最適化タスクです。Phase 1, 2の基盤の上に、品質向上と保守性改善を実現してください。**