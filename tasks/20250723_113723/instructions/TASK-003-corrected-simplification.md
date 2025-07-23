# TASK-003: 修正版 scripts簡潔化（機能保持・実装簡潔化）

## 🚨 **重要：TASK-001の修正指示**

**問題**: TASK-001で要件定義書の必須機能まで削除しようとしていた  
**修正**: **機能的要件は完全保持**し、**実装の複雑性のみ**を簡潔化する  

## 🎯 **修正版タスク概要**

**目的**: REQUIREMENTS.md機能を**完全保持**し、実装コードのみ簡潔化  
**方針**: 必須機能は維持、過剰なログ・検証システムのみ削除  

## 📋 **要件定義書で必須の機能（絶対保持）**

### **✅ 完全保持する機能**
1. **6段階自律実行フロー**:
   - [1] 現在状況分析 (account-status.yaml・active-strategy.yaml読み込み)
   - [2] アカウント成長段階判定 + 戦略選択
   - [3] データ収集実行 (選択されたCollector起動)
   - [4] コンテンツ生成 (選択された戦略でcontent-creator実行)
   - [5] 品質確認・投稿実行 (x-poster.ts)
   - [6] 結果記録・学習データ更新 (data/learning/)

2. **3次元判断マトリクス**: 外部環境 > エンゲージメント状態 > 成長段階

3. **階層型データ管理**: current/learning/archives の3層構造

4. **自律的成長エンジン**: アカウント現状把握と自己分析

5. **完全疎結合設計**: データソース独立性

### **✂️ 削除する実装の複雑性（機能への影響なし）**
- ❌ 詳細なログ出力関数群（logDevelopmentRun, logSystemStartup等）
- ❌ 複雑な設定ファイル自動生成（createDefaultConfig）
- ❌ 過剰な検証システム（validateDevelopmentEnvironment）
- ❌ 詳細なエラー分類・統計収集

## 🔧 **修正版実装指示**

### **dev.ts 修正版（40-50行）**

**保持する機能**:
- ✅ `runAutonomousFlow()` 呼び出し（6段階フロー）
- ✅ TEST_MODE設定
- ✅ CoreRunner初期化

**削除する複雑性**:
- ❌ logDevelopmentRun関数
- ❌ validateDevelopmentEnvironment関数
- ❌ 詳細なエラーハンドリング関数

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from './core-runner.js';

async function dev(): Promise<void> {
  console.log('🛠️ [DEV] 開発テスト実行開始');
  console.log('📋 [モード] 6段階自律実行フロー・投稿無効');
  
  try {
    // CoreRunner初期化
    const coreRunner = new CoreRunner({ enableLogging: true });
    
    // テスト用：投稿を無効化
    process.env.TEST_MODE = 'true';
    
    console.log('🚀 [実行] 6段階自律実行フロー開始...');
    
    // ★ 要件定義書必須：6段階自律実行フロー
    const result = await coreRunner.runAutonomousFlow();
    
    // 結果表示（簡潔版）
    console.log(result.success ? '✅ 開発テスト完了' : `❌ エラー: ${result.error}`);
    console.log(`📊 実行時間: ${result.executionTime}ms`);
    
  } catch (error) {
    console.error('❌ 開発実行失敗:', error);
    process.exit(1);
  }
}

dev().catch(console.error);
```

### **main.ts 修正版（80-100行）**

**保持する機能**:
- ✅ `runAutonomousFlow()` 呼び出し（6段階フロー）
- ✅ posting-times.yaml読み取り
- ✅ 1日15回定期実行
- ✅ 次回実行時刻計算

**削除する複雑性**:
- ❌ logSystemStartup関数群
- ❌ validateSystemConfiguration関数
- ❌ handleEmergencyExecution関数
- ❌ 複雑なエラー回復システム

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from './core-runner.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  console.log('🚀 [MAIN] 1日15回定期実行システム開始');
  console.log('📋 [モード] 6段階自律実行フロー・実投稿');
  
  try {
    // CoreRunner初期化
    const coreRunner = new CoreRunner({ enableLogging: true });
    
    // スケジュール読み込み
    const schedule = await loadPostingSchedule();
    console.log('📅 投稿スケジュール読み込み完了');
    
    // 定期実行ループ
    console.log('⏰ 定期実行ループ開始');
    
    while (true) {
      const nextTime = getNextExecutionTime(schedule);
      console.log(`⏱️ 次回実行: ${nextTime.toLocaleString()}`);
      
      await waitUntil(nextTime);
      
      console.log('🚀 投稿実行開始');
      
      // ★ 要件定義書必須：6段階自律実行フロー
      const result = await coreRunner.runAutonomousFlow();
      
      console.log(result.success ? '✅ 投稿完了' : '❌ 投稿失敗');
      
      // 簡潔なエラー処理
      if (!result.success) {
        console.log('⏳ 5分待機後リトライ');
        await new Promise(resolve => setTimeout(resolve, 300000));
      }
    }
    
  } catch (error) {
    console.error('❌ 定期実行失敗:', error);
    process.exit(1);
  }
}

// 必要最小限のヘルパー関数
async function loadPostingSchedule(): Promise<PostingSchedule> {
  const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
  const content = await fs.readFile(configPath, 'utf-8');
  return yaml.load(content) as PostingSchedule;
}

function getNextExecutionTime(schedule: PostingSchedule): Date {
  const allTimes = Object.values(schedule.optimal_times).flat().sort();
  const now = new Date();
  const currentTimeStr = now.toTimeString().substring(0, 5);
  
  const upcomingTimes = allTimes.filter(time => time > currentTimeStr);
  
  if (upcomingTimes.length > 0) {
    const nextTimeStr = upcomingTimes[0];
    const [hours, minutes] = nextTimeStr.split(':').map(Number);
    const nextTime = new Date(now);
    nextTime.setHours(hours, minutes, 0, 0);
    return nextTime;
  } else {
    const firstTimeStr = allTimes[0];
    const [hours, minutes] = firstTimeStr.split(':').map(Number);
    const nextTime = new Date(now);
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(hours, minutes, 0, 0);
    return nextTime;
  }
}

async function waitUntil(targetTime: Date): Promise<void> {
  const waitMs = targetTime.getTime() - Date.now();
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

main().catch(console.error);
```

## ✅ **機能的要件確認**

### **DEV動作確認**
1. ✅ `runAutonomousFlow()` が呼ばれる（6段階実行）
2. ✅ TEST_MODE=trueで投稿スキップ
3. ✅ 自律的状況分析・戦略選択が実行される
4. ✅ 階層型データ管理が動作する

### **MAIN動作確認**
1. ✅ `runAutonomousFlow()` が呼ばれる（6段階実行）
2. ✅ 1日15回の定期実行
3. ✅ posting-times.yaml準拠のスケジュール
4. ✅ 自律的成長エンジンが動作する

## 🚫 **絶対保持する要件**

### **必須機能（削除禁止）**
- ✅ 6段階自律実行フロー
- ✅ account-status.yaml・active-strategy.yaml読み込み
- ✅ 3次元判断マトリクス実行
- ✅ アカウント成長段階判定
- ✅ 階層型データ管理
- ✅ 学習・最適化システム
- ✅ 完全疎結合設計

## 📊 **修正版成功基準**

### **機能保持確認**
1. **自律実行**: runAutonomousFlow()が正常実行
2. **状況分析**: PlaywrightAccountCollector実行確認
3. **戦略選択**: DecisionEngine動作確認
4. **学習最適化**: data/learning/への記録確認

### **簡潔化確認**
1. **dev.ts**: 50行以下・機能完全保持
2. **main.ts**: 100行以下・機能完全保持
3. **コード削減**: ログ関数群の削除のみ

## 📋 **報告書要件**

### **報告書パス**
`tasks/20250723_113723/reports/REPORT-003-corrected-simplification.md`

### **必須確認項目**
1. **機能保持確認**: 6段階フローの完全実行確認
2. **要件適合性**: REQUIREMENTS.md必須機能の動作確認
3. **簡潔化結果**: 削除した実装詳細と保持した機能一覧

---

## 🚨 **CRITICAL: 要件定義書機能の完全保持**

この修正指示書に従い、REQUIREMENTS.mdの必須機能を**完全保持**してください。  
削除対象は「ログ関数・検証関数」等の実装詳細のみです。  
**機能的要件は絶対に削除しないでください。**