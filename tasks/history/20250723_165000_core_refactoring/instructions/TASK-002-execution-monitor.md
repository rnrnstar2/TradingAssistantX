# TASK-002: execution-monitor.tsの作成

## 🎯 目的
src/scripts/core-runner.tsからシステム監視・ヘルスチェック機能を抽出し、新規ファイルとして実装する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認
cat REQUIREMENTS.md | head -300

# 現在のcore-runner.ts確認（監視関連部分）
grep -n "monitorExecutionHealth\|performSystemHealthCheck\|SystemHealthStatus" src/scripts/core-runner.ts
```

### 2. src/core/execution/execution-monitor.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/core/execution/execution-monitor.ts

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { checkSystemHealth } from '../../utils/monitoring/health-check.js';
import { logger } from '../../utils/logger.js';

export interface SystemHealthStatus {
  api_connectivity: boolean;
  data_integrity: boolean;
  disk_space_available: boolean;
  memory_usage_ok: boolean;
  network_accessible: boolean;
  last_execution_status?: string;
}

export interface ExecutionHealthResult {
  healthy: boolean;
  warnings: string[];
  criticalIssues: string[];
}

export class ExecutionMonitor {
  constructor(private outputDir: string) {}

  async monitorExecutionHealth(): Promise<ExecutionHealthResult> {
    // core-runner.tsから該当メソッドの実装を移植
    // 以下を含む：
    // - システムヘルスチェック
    // - スケジュール検証
    // - リソース確認
    // - 前回実行の確認
  }

  async performSystemHealthCheck(): Promise<SystemHealthStatus> {
    // core-runner.tsから該当メソッドの実装を移植
    // 以下を含む：
    // - API接続性確認
    // - データ整合性確認
    // - ディスク容量確認
    // - メモリ使用量確認
    // - ネットワーク接続確認
  }

  async validateExecutionSchedule(): Promise<boolean> {
    // スケジュール検証ロジック
  }

  async checkSystemResources(): Promise<boolean> {
    // システムリソース確認ロジック
  }

  async checkPreviousExecution(): Promise<boolean> {
    // 前回実行状態確認ロジック
  }
}
```

### 3. 実装詳細
- src/scripts/core-runner.tsから以下のメソッドの実装を抽出：
  - monitorExecutionHealth()
  - performSystemHealthCheck()
  - 関連するプライベートメソッド
- 適切なインポート文を追加
- 型定義を整理
- エラーハンドリングを維持

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/core/execution/execution-monitor.ts

# インポートパスの確認
grep -n "import" src/core/execution/execution-monitor.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdに記載された責務のみ実装
- 疎結合設計を維持（他モジュールへの過度な依存を避ける）
- 既存のエラーハンドリングパターンを維持
- MVP原則に従い、過剰な機能追加は避ける

## ✅ 完了条件
- src/core/execution/execution-monitor.tsが作成されている
- SystemHealthStatus型がエクスポートされている
- ExecutionMonitorクラスが実装されている
- TypeScriptの型チェックが通る
- 300-400行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-002-execution-monitor.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- core-runner.tsから移植した部分の説明
- 問題があった場合はその内容