# TASK-007: data-maintenance.tsの作成

## 🎯 目的
src/scripts/core-runner.tsからデータ階層管理機能を抽出し、新規ファイルとして実装する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認（特にデータ階層部分）
cat REQUIREMENTS.md | grep -A 20 "階層型データ管理"

# 現在のcore-runner.ts確認（メンテナンス関連部分）
grep -n "executeDataHierarchyMaintenance\|checkAndRotateDirectory\|cleanupOldArchives" src/scripts/core-runner.ts -A 10
```

### 2. src/utils/maintenance/data-maintenance.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/utils/maintenance/data-maintenance.ts

import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../logger.js';
import { getFileSize } from '../file-size-monitor.js';

export interface DataHierarchyConfig {
  currentMaxSize: number;    // 1MB
  learningMaxSize: number;   // 10MB
  currentMaxDays: number;    // 7日
  learningMaxDays: number;   // 90日
  archiveMaxDays?: number;   // 無制限
}

export interface MaintenanceResult {
  movedFiles: string[];
  deletedFiles: string[];
  totalSizeFreed: number;
  errors: string[];
}

export class DataMaintenance {
  private config: DataHierarchyConfig = {
    currentMaxSize: 1024 * 1024,        // 1MB
    learningMaxSize: 10 * 1024 * 1024,  // 10MB
    currentMaxDays: 7,
    learningMaxDays: 90
  };

  constructor(config?: Partial<DataHierarchyConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async executeDataHierarchyMaintenance(): Promise<MaintenanceResult> {
    // core-runner.tsから executeDataHierarchyMaintenance の実装を移植
    // 以下を含む：
    // - current → learning への移動
    // - learning → archives への移動
    // - サイズ制限のチェック
    // - 古いファイルの削除
  }

  async checkAndRotateDirectory(
    sourceDir: string,
    targetDir: string,
    sizeLimit: number,
    dirName: string
  ): Promise<{ movedFiles: string[]; totalSize: number }> {
    // core-runner.tsから checkAndRotateDirectory の実装を移植
    // ディレクトリのサイズチェックとローテーション
  }

  async cleanupOldArchives(archivesDir: string, maxAge: number): Promise<string[]> {
    // core-runner.tsから cleanupOldArchives の実装を移植
    // 古いアーカイブの削除
  }

  private async moveFileToArchive(filePath: string, targetDir: string): Promise<void> {
    // ファイルのアーカイブ移動
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    // ディレクトリサイズの計算
  }

  private async getFileAge(filePath: string): Promise<number> {
    // ファイル経過日数の計算
  }
}
```

### 3. 実装詳細
- src/scripts/core-runner.tsから以下のメソッドの実装を抽出：
  - executeDataHierarchyMaintenance()
  - checkAndRotateDirectory()
  - cleanupOldArchives()
- REQUIREMENTS.mdに記載されたデータ階層ルールを厳守
  - current: 1MB、7日
  - learning: 10MB、90日
  - archives: 無制限
- ファイル移動時の整合性保持
- エラーハンドリングの適切な実装

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/utils/maintenance/data-maintenance.ts

# ファイルサイズ確認
wc -l src/utils/maintenance/data-maintenance.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdのデータ階層ルールを厳守
- データの整合性を保持（移動中のエラー対応）
- 削除は慎重に（archivesは基本的に削除しない）
- MVP原則に従い、シンプルな実装を心がける

## ✅ 完了条件
- src/utils/maintenance/data-maintenance.tsが作成されている
- DataMaintenanceクラスが実装されている
- データ階層管理機能が実装されている
- TypeScriptの型チェックが通る
- 200-250行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-007-data-maintenance.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- core-runner.tsから移植した部分の説明
- 問題があった場合はその内容