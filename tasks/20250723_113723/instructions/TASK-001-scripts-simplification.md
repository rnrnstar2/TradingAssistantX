# TASK-001: src/scripts 簡潔化リファクタリング

## 🎯 **タスク概要**

**目的**: REQUIREMENTS.md準拠のシンプルなスクリプト実装に簡潔化  
**問題**: 現在のdev.ts(300行)・main.ts(633行)が過度に複雑で、要件定義書のMVP基盤と乖離  
**方針**: 要求仕様を満たす最小限の実装に簡潔化  

## 📋 **現状分析**

### **現在の複雑さ**
- **dev.ts**: 300行（複雑なログ・検証・エラーハンドリング）
- **main.ts**: 633行（複雑なスケジュール管理・エラー回復システム）

### **要件定義書期待**
- **基本フロー**: RSS収集 → 投稿作成 → X投稿 → 結果記録
- **定期実行**: 1日15回の定時実行
- **MVP基盤**: シンプルな実装

### **ユーザー要求**
- **DEV**: 定期実行の中の1つが実行、投稿しない（テスト用）
- **MAIN**: 定期実行機能、実際に投稿
- **設計**: 単純に考えていい

## 🔧 **簡潔化設計**

### **1. dev.ts 簡潔版（20-30行）**

**基本機能**:
```typescript
// 環境設定 → CoreRunner初期化 → 1回実行（投稿無効）
import { CoreRunner } from './core-runner.js';

async function dev() {
  console.log('🛠️ [DEV] 開発テスト実行');
  
  const coreRunner = new CoreRunner({ enableLogging: true });
  
  // テスト用：投稿を無効化
  process.env.TEST_MODE = 'true'; // X投稿をスキップ
  
  const result = await coreRunner.runAutonomousFlow();
  
  console.log(result.success ? '✅ テスト完了' : `❌ エラー: ${result.error}`);
}

dev().catch(console.error);
```

### **2. main.ts 簡潔版（50-80行）**

**基本機能**:
```typescript
// posting-times.yaml読み取り → 定期実行ループ → 実際に投稿
import { CoreRunner } from './core-runner.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';

async function main() {
  console.log('🚀 [MAIN] 定期実行開始');
  
  const coreRunner = new CoreRunner({ enableLogging: true });
  const schedule = await loadSchedule();
  
  while (true) {
    const nextTime = getNextExecutionTime(schedule);
    await waitUntil(nextTime);
    
    console.log('⏰ 実行時刻に到達');
    const result = await coreRunner.runAutonomousFlow();
    console.log(result.success ? '✅ 実行完了' : '❌ 実行失敗');
  }
}

async function loadSchedule() {
  const configPath = 'data/config/posting-times.yaml';
  const content = await fs.readFile(configPath, 'utf-8');
  return yaml.load(content);
}

function getNextExecutionTime(schedule) {
  // 全時刻を統合し、次回実行時刻を計算
}

function waitUntil(targetTime) {
  // 指定時刻まで待機
}

main().catch(console.error);
```

## 🔧 **実装指示**

### **削除対象機能（過剰実装）**
- ✂️ 詳細なログ出力システム（logDevelopmentRun, logSystemStartup等）
- ✂️ 複雑なエラーハンドリング（カテゴリ分類・重大度判定）
- ✂️ 設定ファイル自動生成（createDefaultConfig）
- ✂️ システムヘルスチェック（validateSystemConfiguration）
- ✂️ 緊急実行機能（handleEmergencyExecution）
- ✂️ 複雑な検証システム（validateDevelopmentEnvironment）
- ✂️ 詳細な統計・メトリクス収集

### **保持する最小限機能**
- ✅ CoreRunner初期化・実行
- ✅ posting-times.yaml読み取り
- ✅ 基本的な定期実行ループ
- ✅ 簡潔なコンソール出力
- ✅ 基本的なエラーキャッチ

## 🎯 **具体的修正内容**

### **dev.ts 新実装**

**ファイル**: `src/scripts/dev.ts`

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from './core-runner.js';

/**
 * dev.ts - 開発テスト用単一実行
 * DEV: 定期実行の中の1つが実行、投稿しない
 */

async function dev(): Promise<void> {
  console.log('🛠️ [DEV] 開発テスト実行開始');
  console.log('📋 [モード] 投稿無効・テスト専用');
  
  try {
    // CoreRunner初期化
    const coreRunner = new CoreRunner({ enableLogging: true });
    
    // テスト用：投稿を無効化
    process.env.TEST_MODE = 'true';
    
    console.log('🚀 [実行] 6段階自律実行フロー開始...');
    
    // 自律実行フロー実行（投稿無効）
    const result = await coreRunner.runAutonomousFlow();
    
    // 結果表示
    if (result.success) {
      console.log('✅ [完了] 開発テスト実行完了');
      console.log(`📊 [結果] 実行時間: ${result.executionTime}ms`);
    } else {
      console.log('❌ [失敗] テスト実行失敗');
      console.log(`📋 [エラー] ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ [エラー] 開発実行失敗:', error);
    process.exit(1);
  }
}

// 実行
dev().catch((error) => {
  console.error('❌ [致命的エラー]:', error);
  process.exit(1);
});
```

### **main.ts 新実装**

**ファイル**: `src/scripts/main.ts`

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from './core-runner.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * main.ts - 定期実行システム
 * MAIN: 1日15回の定期実行、実際に投稿
 */

interface PostingSchedule {
  optimal_times: {
    morning: string[];
    midday: string[];
    afternoon: string[];
    evening: string[];
    night: string[];
  };
}

async function main(): Promise<void> {
  console.log('🚀 [MAIN] 定期実行システム開始');
  console.log('📋 [モード] 1日15回定期実行・実投稿');
  
  try {
    // CoreRunner初期化
    const coreRunner = new CoreRunner({ enableLogging: true });
    
    // スケジュール読み込み
    const schedule = await loadPostingSchedule();
    
    console.log('⏰ [開始] 定期実行ループ開始');
    
    // 定期実行ループ
    while (true) {
      const nextTime = getNextExecutionTime(schedule);
      console.log(`⏱️ [待機] 次回実行: ${nextTime.toLocaleString()}`);
      
      await waitUntil(nextTime);
      
      console.log('🚀 [実行] 投稿実行開始');
      const result = await coreRunner.runAutonomousFlow();
      
      console.log(result.success ? '✅ [完了] 投稿実行完了' : '❌ [失敗] 投稿実行失敗');
    }
    
  } catch (error) {
    console.error('❌ [エラー] 定期実行失敗:', error);
    process.exit(1);
  }
}

/**
 * posting-times.yaml読み込み
 */
async function loadPostingSchedule(): Promise<PostingSchedule> {
  const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
  const content = await fs.readFile(configPath, 'utf-8');
  return yaml.load(content) as PostingSchedule;
}

/**
 * 次回実行時刻計算
 */
function getNextExecutionTime(schedule: PostingSchedule): Date {
  const allTimes = Object.values(schedule.optimal_times).flat().sort();
  const now = new Date();
  const currentTimeStr = now.toTimeString().substring(0, 5);
  
  // 今日の残り時刻を検索
  const upcomingTimes = allTimes.filter(time => time > currentTimeStr);
  
  if (upcomingTimes.length > 0) {
    // 今日の次の時刻
    const nextTimeStr = upcomingTimes[0];
    const [hours, minutes] = nextTimeStr.split(':').map(Number);
    const nextTime = new Date(now);
    nextTime.setHours(hours, minutes, 0, 0);
    return nextTime;
  } else {
    // 明日の最初の時刻
    const firstTimeStr = allTimes[0];
    const [hours, minutes] = firstTimeStr.split(':').map(Number);
    const nextTime = new Date(now);
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(hours, minutes, 0, 0);
    return nextTime;
  }
}

/**
 * 指定時刻まで待機
 */
async function waitUntil(targetTime: Date): Promise<void> {
  const waitMs = targetTime.getTime() - Date.now();
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

// 実行
main().catch((error) => {
  console.error('❌ [致命的エラー]:', error);
  process.exit(1);
});
```

## 🚫 **MVP制約遵守事項**

### **禁止事項**
- ❌ 詳細なログ出力システムの実装
- ❌ 複雑なエラーハンドリングシステム
- ❌ 設定ファイル自動生成機能
- ❌ システムヘルスチェック機能
- ❌ 統計・メトリクス収集機能
- ❌ 緊急実行・リカバリ機能

### **許可範囲**
- ✅ 基本的なコンソール出力
- ✅ シンプルなエラーキャッチ
- ✅ posting-times.yaml読み取り
- ✅ 基本的な定期実行ループ
- ✅ CoreRunner実行

## ✅ **検証要件**

### **dev.ts 検証**
1. `pnpm dev` 実行確認
2. 投稿が実行されないことを確認（TEST_MODE=true）
3. 6段階フローが実行されることを確認
4. 20-30行程度の簡潔なコードになっていることを確認

### **main.ts 検証**  
1. posting-times.yaml読み取り確認
2. 次回実行時刻計算の正確性確認
3. 定期実行ループの動作確認
4. 50-80行程度の簡潔なコードになっていることを確認

## 🔍 **品質基準**

### **TypeScript要件**
- strictモード準拠
- 型エラーなし
- lintエラーなし

### **簡潔性要件**
- **dev.ts**: 30行以下
- **main.ts**: 80行以下
- 複雑なログ・検証機能なし
- 要件定義書のMVP基盤に準拠

### **動作要件**
- `pnpm dev`: 単一実行・投稿無効
- `pnpm start`: 定期実行・実投稿
- エラー時の基本的な表示

## 📊 **成功基準**

### **主要成功指標**
1. **簡潔性**: 現在の933行 → 約110行（88%削減）
2. **要件準拠**: REQUIREMENTS.mdのMVP基盤に準拠
3. **機能維持**: DEV/MAINの基本機能維持
4. **保守性**: シンプルで理解しやすいコード

### **品質確認項目**
- [ ] TypeScript型チェック通過
- [ ] ESLint通過
- [ ] dev.ts: 30行以下・投稿無効動作
- [ ] main.ts: 80行以下・定期実行動作

## 📋 **報告書要件**

実装完了後、以下を含む報告書を作成してください：

### **報告書パス**
`tasks/20250723_113723/reports/REPORT-001-scripts-simplification.md`

### **報告書内容**
1. **簡潔化結果**: 行数削減率・削除した機能一覧
2. **動作確認結果**: dev/main両方の動作テスト結果
3. **品質確認結果**: TypeScript/ESLint結果
4. **要件適合性**: REQUIREMENTS.md準拠確認
5. **保守性向上**: シンプル化による利点

---

## 🚨 **CRITICAL: Manager権限制限遵守**

この指示書に従い、src/scripts/dev.ts・main.tsのみを修正してください。  
他のファイルの修正や新規ファイル作成は禁止です。  
実装完了後、必ず報告書を作成してください。