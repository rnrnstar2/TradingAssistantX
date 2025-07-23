# TASK-006: resource-monitor.tsの作成

## 🎯 目的
システムリソースの監視機能を新規ファイルとして実装し、既存のhealth-check.tsを拡張する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認
cat REQUIREMENTS.md | head -300

# 既存のhealth-check.ts確認
cat src/utils/monitoring/health-check.ts

# core-runner.tsのリソース関連部分確認
grep -n "cpu_usage\|memory_usage\|disk_usage\|checkSystemResources" src/scripts/core-runner.ts
```

### 2. src/utils/monitoring/resource-monitor.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/utils/monitoring/resource-monitor.ts

import * as os from 'os';
import * as fs from 'fs/promises';
import { logger } from '../logger.js';

export interface ResourceStatus {
  cpu: {
    usage: number;
    available: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    available: number;
    percentage: number;
  };
}

export interface ResourceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minDiskSpace: number;
}

export class ResourceMonitor {
  private defaultThresholds: ResourceThresholds = {
    maxCpuUsage: 80,      // %
    maxMemoryUsage: 80,   // %
    minDiskSpace: 1024    // MB
  };

  constructor(private thresholds: ResourceThresholds = {}) {
    this.thresholds = { ...this.defaultThresholds, ...thresholds };
  }

  async getResourceStatus(): Promise<ResourceStatus> {
    // リソース状態の取得
    // CPU、メモリ、ディスクの使用状況を収集
  }

  async checkResourceAvailability(): Promise<{ available: boolean; warnings: string[] }> {
    // リソースの可用性チェック
    // 閾値との比較
    // 警告メッセージの生成
  }

  async getCpuUsage(): Promise<number> {
    // CPU使用率の計算
  }

  async getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    // メモリ使用状況の取得
  }

  async getDiskUsage(path: string = '/'): Promise<{ used: number; available: number; percentage: number }> {
    // ディスク使用状況の取得
  }

  isResourceHealthy(status: ResourceStatus): boolean {
    // リソース状態の健全性判定
  }
}
```

### 3. 実装詳細
- Node.jsのosモジュールを活用してシステム情報を取得
- ファイルシステム情報の取得にはfsモジュールを使用
- 閾値ベースの健全性チェック
- 警告メッセージの生成
- health-check.tsとの連携を考慮

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/utils/monitoring/resource-monitor.ts

# ファイルサイズ確認
wc -l src/utils/monitoring/resource-monitor.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdに記載された責務のみ実装
- プラットフォーム依存の処理は適切にハンドリング
- 過度に詳細な監視機能は避ける（MVP原則）
- 既存のhealth-check.tsとの重複を避ける

## ✅ 完了条件
- src/utils/monitoring/resource-monitor.tsが作成されている
- ResourceMonitorクラスが実装されている
- リソース監視機能が実装されている
- TypeScriptの型チェックが通る
- 約200行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-006-resource-monitor.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- health-check.tsとの連携方法
- 問題があった場合はその内容