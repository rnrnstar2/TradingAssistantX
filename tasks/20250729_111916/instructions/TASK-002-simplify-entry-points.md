# TASK-002: エントリーポイント（dev.ts/main.ts）の簡素化

## 🎯 タスク概要
dev.ts と main.ts を新しいworkflows/構造に合わせて簡素化し、明確な役割分担を実装

## 📋 実装内容

### 1. dev.ts簡素化

#### 現状の問題点
- main-workflows/の複雑な依存関係
- 不要なスケジューラー初期化コード
- 過剰なエラーハンドリング

#### 新実装
```typescript
// src/dev.ts
import { MainWorkflow } from './workflows/main-workflow';

/**
 * pnpm dev - 開発用単一実行エントリーポイント
 * 1回だけワークフローを実行して終了
 */
async function runDev() {
  console.log('🚀 開発モード実行開始');
  
  try {
    const result = await MainWorkflow.execute();
    console.log('✅ ワークフロー完了:', result);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 即座に実行
runDev();
```

### 2. main.ts簡素化（Phase 1版）

#### 新実装（スケジューラーなし版）
```typescript
// src/main.ts
import { MainWorkflow } from './workflows/main-workflow';

/**
 * pnpm start - 本番実行エントリーポイント
 * Phase 1: 単一実行（dev.tsと同じ動作）
 * Phase 2: スケジューラー実装後に時刻制御追加予定
 */
async function main() {
  console.log('🏁 本番モード実行開始');
  console.log('📌 Phase 1: 単一実行モード');
  
  try {
    const result = await MainWorkflow.execute();
    console.log('✅ ワークフロー完了:', result);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 即座に実行
main();
```

### 3. index.ts更新

#### 現状の問題点
- 複雑な初期化ロジック
- 不要な環境変数チェック
- 過剰な設定読み込み

#### 新実装
```typescript
// src/index.ts
/**
 * 共通初期化処理（必要最小限）
 */
export function initialize() {
  // 環境変数の基本チェック
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is required');
  }
  
  // 基本的な初期化のみ
  console.log('🔧 システム初期化完了');
}

// エクスポート
export { MainWorkflow } from './workflows/main-workflow';
export { kaitoClient } from './kaito-api';
export { dataManager } from './data';
```

### 4. 削除対象コード
以下の機能・コードを削除：
- スケジューラー関連の初期化
- 複雑なライフサイクル管理
- 統計・分析関連の初期化
- 過剰なログ出力
- 不要な設定ファイル読み込み

### 5. package.jsonスクリプト確認
既存のスクリプトが正しく動作することを確認：
```json
{
  "scripts": {
    "dev": "tsx src/dev.ts",
    "start": "tsx src/main.ts"
  }
}
```

## ⚠️ 制約事項
- **シンプル最優先**: 必要最小限のコードのみ
- **Phase 1制限**: スケジューラー機能は実装しない
- **エラーハンドリング**: 基本的なtry-catchのみ
- **ログ出力**: 最小限の開始・完了・エラーログのみ

## 🔧 技術要件
- TypeScript strict mode
- MainWorkflowクラスの正しいimport
- プロセス終了コードの適切な設定（成功:0, エラー:1）

## 📂 成果物
- 更新: `src/dev.ts`（20行程度に簡素化）
- 更新: `src/main.ts`（20行程度に簡素化）
- 更新: `src/index.ts`（必要最小限に簡素化）

## ✅ 完了条件
- [ ] dev.tsが単一実行を正しく行う
- [ ] main.tsがPhase 1版として動作する
- [ ] 不要な複雑性が完全に除去されている
- [ ] `pnpm dev`と`pnpm start`が正常動作する
- [ ] TypeScriptコンパイルエラーがない