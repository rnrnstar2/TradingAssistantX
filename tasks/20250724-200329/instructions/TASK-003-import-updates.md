# TASK-003: インポート文更新タスク

## 🎯 タスク概要
Worker1とWorker2の完了後、プロジェクト全体のインポート文を更新し、新しい型定義構造に対応させる。

## 📋 実装要件

### 1. 前提条件
- **Worker1完了**: `src/kaito-api/types.ts`が作成済み
- **Worker2完了**: `src/shared/types.ts`が整理済み

### 2. インポート更新対象ファイル

#### 2.1 KaitoAPIエンドポイントファイル
以下のファイルで、ローカル型定義を削除し、`../types`からインポート：

```typescript
// 変更前（各エンドポイントファイル）
export interface TweetData { ... }
export interface TweetResult { ... }

// 変更後
import { TweetData, TweetResult } from '../types';
```

対象ファイル：
- `src/kaito-api/endpoints/tweet-endpoints.ts`
- `src/kaito-api/endpoints/user-endpoints.ts`
- `src/kaito-api/endpoints/action-endpoints.ts`
- `src/kaito-api/endpoints/community-endpoints.ts`
- `src/kaito-api/endpoints/list-endpoints.ts`
- `src/kaito-api/endpoints/login-endpoints.ts`
- `src/kaito-api/endpoints/trend-endpoints.ts`
- `src/kaito-api/endpoints/webhook-endpoints.ts`

#### 2.2 KaitoAPIコアファイル
- `src/kaito-api/core/client.ts`
- `src/kaito-api/core/config.ts`

同様に、ローカル型定義を削除し、`../types`からインポート。

#### 2.3 メインワークフローファイル
以下のファイルで、型のインポート元を`shared/types`に統一：

- `src/main-workflows/execution-flow.ts`
- `src/main-workflows/scheduler-manager.ts`
- `src/main-workflows/status-controller.ts`
- `src/main-workflows/system-lifecycle.ts`

```typescript
// 変更前
import { ExecutionResult } from '../shared/types';
import { ClaudeDecision } from '../claude/types';

// 変更後（sharedが再エクスポートしているため）
import { ExecutionResult, ClaudeDecision } from '../shared/types';
```

#### 2.4 その他の依存ファイル
型定義を使用している他のファイルも同様に更新：
- `src/main.ts`
- `src/dev.ts`
- `src/scheduler/main-loop.ts`
- `src/data/data-manager.ts`

### 3. インポート更新の原則

#### 3.1 優先順位
1. **shared/types**からインポート（可能な限り）
2. モジュール固有の型は、そのモジュールの`types.ts`から
3. ローカル定義は極力避ける

#### 3.2 パスの統一
- 相対パス使用（`../shared/types`）
- index.tsがある場合は活用
- 循環参照を避ける

### 4. 実装手順
1. **依存関係の確認**: 各ファイルの型使用状況を確認
2. **インポート文の更新**: 新しい型定義構造に合わせて更新
3. **ローカル型定義の削除**: 移行済みの型定義を削除
4. **動作確認**: TypeScriptコンパイラでエラーがないか確認

### 5. 型チェック実行
すべての更新完了後、以下のコマンドで型チェック：

```bash
pnpm run type-check
```

エラーがある場合は修正。

### 6. 注意事項
- **破壊的変更禁止**: 既存の型の構造は変更しない
- **段階的更新**: ファイルごとに確実に更新
- **バックアップ**: 大きな変更前にgit statusで確認

## 🔧 実装完了後
- `tasks/20250724-200329/reports/REPORT-003-import-updates.md`に実装報告書を作成
- 更新したファイル一覧と、各ファイルの変更内容を記載
- 型チェックの結果を報告