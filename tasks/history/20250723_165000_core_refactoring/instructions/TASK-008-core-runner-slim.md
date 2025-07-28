# TASK-008: core-runner.tsのスリム化と移動

## 🎯 目的
src/scripts/core-runner.tsから各機能を新規ファイルに移動した後、スリム化してsrc/core/execution/に移動する

## ⚠️ 前提条件
**この作業はTASK-001〜007が完了してから実行すること**

## 📋 作業内容

### 1. 必須: 前タスクの完了確認
```bash
# 新規ファイルの存在確認
ls -la src/core/execution/
ls -la src/services/record-manager.ts
ls -la src/utils/monitoring/resource-monitor.ts
ls -la src/utils/maintenance/data-maintenance.ts
```

### 2. core-runner.tsのバックアップ作成
```bash
cp src/scripts/core-runner.ts src/scripts/core-runner.ts.backup
```

### 3. src/core/execution/core-runner.ts の作成（スリム版）

以下の構造で新規ファイルを作成：

```typescript
// src/core/execution/core-runner.ts

import { RSSCollector } from '../../collectors/rss-collector.js';
import { createXPosterFromEnv } from '../../services/x-poster.js';
import { DataOptimizer } from '../../services/data-optimizer.js';
import { AutonomousExecutor } from '../autonomous-executor.js';
import { ExecutionMonitor } from './execution-monitor.js';
import { ExecutionLock } from './execution-lock.js';
import { ExecutionRecovery } from './execution-recovery.js';
import { RecordManager } from '../../services/record-manager.js';
import { DataMaintenance } from '../../utils/maintenance/data-maintenance.js';
import type { CollectionContext } from '../../collectors/base-collector.js';
import type { CollectionResult } from '../../types/data-types.js';
import * as path from 'path';

/**
 * Core Runner - メイン実行フロー制御（スリム版）
 * 
 * 責務：実行フローの制御と各モジュールの調整のみ
 * 他の機能は専用モジュールに委譲
 */

export interface ExecutionOptions {
  enableLogging?: boolean;
  outputDir?: string;
}

export interface ExecutionResult {
  success: boolean;
  timestamp: string;
  rssDataCount: number;
  postResult?: any;
  error?: string;
  executionTime: number;
}

export class CoreRunner {
  private rssCollector: RSSCollector;
  private outputDir: string;
  private autonomousExecutor: AutonomousExecutor;
  private dataOptimizer: DataOptimizer;
  private executionMonitor: ExecutionMonitor;
  private executionLock: ExecutionLock;
  private executionRecovery: ExecutionRecovery;
  private recordManager: RecordManager;
  private dataMaintenance: DataMaintenance;
  
  constructor(private options: ExecutionOptions = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'tasks', 'outputs');
    
    // 各モジュールの初期化
    this.rssCollector = new RSSCollector();
    this.autonomousExecutor = new AutonomousExecutor();
    this.dataOptimizer = new DataOptimizer();
    this.executionMonitor = new ExecutionMonitor(this.outputDir);
    this.executionLock = new ExecutionLock(this.outputDir);
    this.executionRecovery = new ExecutionRecovery();
    this.recordManager = new RecordManager(this.outputDir);
    this.dataMaintenance = new DataMaintenance();
  }

  /**
   * 自律実行フロー: AutonomousExecutor による完全自律実行
   */
  async runAutonomousFlow(): Promise<ExecutionResult> {
    // シンプルな実行フロー
    // 1. ロック取得
    // 2. ヘルスチェック
    // 3. 自律実行（リトライ付き）
    // 4. 記録保存
    // 5. データメンテナンス
    // 6. ロック解放
  }

  /**
   * 基本実行フロー: RSS収集 → 投稿作成 → X投稿
   */
  async runBasicFlow(): Promise<ExecutionResult> {
    // シンプルな基本フロー
    // 1. RSS収集
    // 2. コンテンツ生成
    // 3. X投稿
    // 4. 記録保存
  }

  // プライベートメソッドは最小限に
  private async initializeExecution(): Promise<void> {
    // 実行初期化
  }

  private async finalizeExecution(result: ExecutionResult): Promise<void> {
    // 実行終了処理
  }
}
```

### 4. インポートパスの修正
- 新しいファイル構造に合わせてインポートパスを調整
- 相対パスを正確に設定（../../collectors/など）

### 5. src/scripts/core-runner.ts の削除
```bash
# バックアップ確認後に削除
rm src/scripts/core-runner.ts
```

### 6. 関連ファイルの更新
以下のファイルでcore-runner.tsのインポートパスを更新：
```bash
# インポートしているファイルを検索
grep -r "from.*core-runner" src/
grep -r "import.*core-runner" src/
```

### 7. 動作確認
```bash
# TypeScript型チェック
npx tsc --noEmit

# 基本的な動作確認
pnpm dev
```

## ⚠️ 制約事項
- 既存の外部インターフェースを維持
- runAutonomousFlow()とrunBasicFlow()のシグネチャは変更しない
- エラーハンドリングパターンを維持
- 200-300行程度にスリム化

## ✅ 完了条件
- src/core/execution/core-runner.tsが作成されている（スリム版）
- src/scripts/core-runner.tsが削除されている
- 関連ファイルのインポートパスが更新されている
- TypeScriptの型チェックが通る
- pnpm devが正常に動作する
- ファイルサイズが200-300行程度

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-008-core-runner-slim.md`
- 移動前後のファイルパス
- スリム化前後の行数比較
- 各モジュールへの委譲状況
- 更新した関連ファイルのリスト
- 問題があった場合はその内容