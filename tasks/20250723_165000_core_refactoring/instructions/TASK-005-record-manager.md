# TASK-005: record-manager.tsの作成

## 🎯 目的
src/scripts/core-runner.tsから実行記録・統計管理機能を抽出し、新規ファイルとして実装する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認
cat REQUIREMENTS.md | head -300

# 現在のcore-runner.ts確認（記録関連部分）
grep -n "recordExecution\|handleError\|logSuccess\|getDailyStatistics\|collectSystemMetrics" src/scripts/core-runner.ts
```

### 2. src/services/record-manager.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/services/record-manager.ts

import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as os from 'os';
import { logger } from '../utils/logger.js';

export interface ExecutionRecord {
  success: boolean;
  timestamp: string;
  rssDataCount?: number;
  postResult?: any;
  error?: string;
  executionTime: number;
  systemMetrics?: SystemMetrics;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_latency: number;
}

export interface DailyStatistics {
  date: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  topErrors?: string[];
}

export class RecordManager {
  constructor(private outputDir: string) {}

  async recordExecution(result: ExecutionRecord): Promise<void> {
    // core-runner.tsから recordExecution の実装を移植
    // 以下を含む：
    // - 実行記録の保存
    // - 日次統計の更新
    // - エラー記録
  }

  async handleError(error: unknown, partialResult: Partial<ExecutionRecord>): Promise<void> {
    // core-runner.tsから handleError の実装を移植
    // エラー記録と通知
  }

  async logSuccess(result: ExecutionRecord): Promise<void> {
    // core-runner.tsから logSuccess の実装を移植
    // 成功記録の保存
  }

  async getDailyStatistics(): Promise<DailyStatistics> {
    // core-runner.tsから getDailyStatistics の実装を移植
    // 日次統計の集計
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    // core-runner.tsから collectSystemMetrics の実装を移植
    // システムメトリクスの収集
  }

  private async updateDailyStats(result: ExecutionRecord): Promise<void> {
    // 日次統計の更新ロジック
  }

  private async saveExecutionLog(logData: any): Promise<void> {
    // 実行ログの保存
  }
}
```

### 3. 実装詳細
- src/scripts/core-runner.tsから以下のメソッドの実装を抽出：
  - recordExecution()
  - handleError()
  - logSuccess()
  - getDailyStatistics()
  - collectSystemMetrics()
- YAML形式での記録保存を維持
- エラーハンドリングを適切に実装
- 統計情報の集計ロジックを保持

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/services/record-manager.ts

# ファイルサイズ確認
wc -l src/services/record-manager.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdに記載された責務のみ実装
- YAMLファイルへの出力はtasks/outputs/配下のみ
- 既存の記録フォーマットを維持
- MVP原則に従い、過剰な統計機能は避ける

## ✅ 完了条件
- src/services/record-manager.tsが作成されている
- RecordManagerクラスが実装されている
- 実行記録・統計管理機能が実装されている
- TypeScriptの型チェックが通る
- 300-350行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-005-record-manager.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- core-runner.tsから移植した部分の説明
- 問題があった場合はその内容