# 🚨 MVP簡略化緊急実行指示書

**タスクID**: TASK-MVP-SIMPLIFICATION  
**作成日**: 2025-01-23  
**権限**: Worker  
**緊急度**: 最高  
**承認者**: Manager

## 🎯 実行目的

REQUIREMENTS.mdのMVP原則違反を修正し、過剰実装を除去してシンプルなシステムを実現する。

## 📋 実行手順

### Phase 1: 不要ファイル完全削除

以下のファイルを **完全に削除** せよ：

```bash
# Core/Execution層の過剰機能
rm src/core/execution/execution-monitor.ts
rm src/core/execution/execution-lock.ts  
rm src/core/execution/execution-recovery.ts

# Services層の過剰分析機能
rm src/services/performance-analyzer.ts
rm src/services/record-manager.ts

# Utils層の不要監視機能
rm src/utils/file-size-monitor.ts
rm src/utils/integrity-checker.ts
rm src/utils/maintenance/data-maintenance.ts
```

### Phase 2: core-runner.ts の大幅簡素化

**ファイル**: `src/core/execution/core-runner.ts`

#### 🚫 削除すべき機能

1. **ExecutionMonitor関連**
   - `performHealthCheck()` メソッド
   - `gatherSystemContext()` の複雑な監視機能
   - システムヘルスチェック機能

2. **ExecutionLock関連**  
   - `acquireExecutionLock()` / `releaseExecutionLock()`
   - YAMLファイルベースのロック管理
   - PID・プロセス監視機能

3. **ExecutionRecovery関連**
   - `executeWithRetry()` の複雑なリトライ機能
   - `handleErrorWithClaude()` の高度なエラー分類
   - システム自動修復機能

#### ✅ 簡素化後の推奨実装

```typescript
// 単純な排他制御
private isExecuting: boolean = false;

async runAutonomousFlow(): Promise<ExecutionResult> {
  if (this.isExecuting) {
    throw new Error('Execution already in progress');
  }
  
  this.isExecuting = true;
  try {
    // 基本的な実行ロジックのみ
    const decision = await this.claudeAgent.askWhatToDo(context);
    const result = await this.executeClaudeDecision(decision, executionId);
    return this.createSuccessResult(result);
  } catch (error) {
    console.error('Execution failed:', error);
    return this.createErrorResult(error);
  } finally {
    this.isExecuting = false;
  }
}

// 基本的なエラーハンドリングのみ
private async executeWithBasicErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    return null;
  }
}
```

### Phase 3: autonomous-executor.ts の最適化

**ファイル**: `src/core/autonomous-executor.ts`

#### ✅ 保持すべき実装（参考例）
- `private isExecuting: boolean = false;` (line 131)
- 基本的な6フェーズ実行フロー
- 単純なエラーハンドリング

#### 🚫 削除推奨
- 複雑なエラー分類機能 (lines 84-323)
- 詳細なメトリクス収集
- 高度なリカバリー機能

### Phase 4: Import文の修正

削除したファイルに関連する全てのimport文を修正：

1. **core-runner.ts**
```typescript
// 削除
import { ExecutionMonitor } from './execution-monitor.js';
import { ExecutionLock } from './execution-lock.js';
import { ExecutionRecovery } from './execution-recovery.js';
import { RecordManager } from '../../services/record-manager.js';
import { DataMaintenance } from '../../utils/maintenance/data-maintenance.js';
```

2. **他の関連ファイル**
   - 削除したクラスを参照する全ファイルのimport修正
   - 型定義ファイルの対応する型削除

### Phase 5: 設定ファイルの簡素化

**注意**: data/config/配下は読み取り専用なので変更しない

### Phase 6: 動作確認

```bash
# 構文チェック
npx tsc --noEmit

# 基本動作確認
pnpm dev

# エラーが出ないことを確認
pnpm start
```

## 🚫 絶対禁止事項

1. **REQUIREMENTS.mdに記載のない新機能追加**
2. **削除指示したファイルの部分保持**
3. **複雑な監視・分析機能の再実装**
4. **"あったら良い"機能の追加**

## 🎯 成功基準

- [ ] 指定ファイルが完全削除されている
- [ ] core-runner.tsが50%以上簡素化されている
- [ ] import文エラーが全て解消されている
- [ ] `pnpm dev` が正常動作する
- [ ] 基本的な投稿機能が維持されている

## 📊 期待効果

- **コード量**: 30%以上削減
- **複雑性**: 大幅減少
- **保守性**: 向上
- **MVP原則**: 完全遵守

## 🚀 緊急実行指示

**Worker**: この指示書に従い、直ちにMVP簡略化を実行せよ。完了後は動作確認結果をtasks/outputs/に報告すること。

**期限**: 本日中
**優先度**: 最高
**承認**: Manager済み

---

**Manager署名**: システムの複雑さは敗北である。シンプルさこそが勝利への道だ。