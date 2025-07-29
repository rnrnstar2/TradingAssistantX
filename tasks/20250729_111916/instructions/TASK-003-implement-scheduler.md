# TASK-003: スケジューラー機能実装（Phase 2）

## 🎯 タスク概要
時刻ベースのスケジューラー機能を実装し、YAMLファイルから読み込んだスケジュールに従ってワークフローを実行

## 📋 実装内容

### 1. schedulerディレクトリ作成
```
src/
├── scheduler/
│   ├── time-scheduler.ts      # スケジューラー本体
│   ├── schedule-loader.ts     # YAML設定読込
│   └── types.ts              # 型定義
```

### 2. types.ts実装
```typescript
// src/scheduler/types.ts
export interface ScheduleItem {
  time: string;           // "HH:MM" 形式
  action: 'post' | 'retweet' | 'quote_tweet' | 'like';
  topic?: string;         // postアクション用
  target_query?: string;  // retweet/quote_tweet用
}

export interface DailySchedule {
  morning?: ScheduleItem[];
  lunch?: ScheduleItem[];
  evening?: ScheduleItem[];
  night?: ScheduleItem[];
}

export interface ScheduleConfig {
  daily_schedule: DailySchedule;
}
```

### 3. schedule-loader.ts実装
```typescript
// src/scheduler/schedule-loader.ts
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { ScheduleConfig, ScheduleItem } from './types';

export class ScheduleLoader {
  static load(path: string = 'data/config/schedule.yaml'): ScheduleConfig {
    try {
      const content = readFileSync(path, 'utf8');
      return load(content) as ScheduleConfig;
    } catch (error) {
      throw new Error(`スケジュール読み込みエラー: ${error.message}`);
    }
  }

  static getTodaySchedule(config: ScheduleConfig): ScheduleItem[] {
    const allItems: ScheduleItem[] = [];
    
    // 全時間帯のスケジュールを統合
    Object.values(config.daily_schedule).forEach(timeSlot => {
      if (timeSlot) {
        allItems.push(...timeSlot);
      }
    });
    
    // 時刻順にソート
    return allItems.sort((a, b) => a.time.localeCompare(b.time));
  }
}
```

### 4. time-scheduler.ts実装
```typescript
// src/scheduler/time-scheduler.ts
import { MainWorkflow } from '../workflows/main-workflow';
import { ScheduleLoader } from './schedule-loader';
import { ScheduleItem } from './types';

export class TimeScheduler {
  private scheduleItems: ScheduleItem[] = [];
  private running: boolean = false;

  async start(): Promise<void> {
    console.log('⏰ スケジューラー起動');
    
    // スケジュール読み込み
    const config = ScheduleLoader.load();
    this.scheduleItems = ScheduleLoader.getTodaySchedule(config);
    
    console.log(`📅 本日のスケジュール: ${this.scheduleItems.length}件`);
    this.running = true;
    
    // 実行ループ
    while (this.running) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // 該当時刻のタスクを検索
      const taskToRun = this.scheduleItems.find(item => item.time === currentTime);
      
      if (taskToRun) {
        console.log(`🎯 実行時刻: ${currentTime} - アクション: ${taskToRun.action}`);
        
        try {
          // MainWorkflowに追加パラメータを渡して実行
          await MainWorkflow.execute({
            scheduledAction: taskToRun.action,
            scheduledTopic: taskToRun.topic,
            scheduledQuery: taskToRun.target_query
          });
        } catch (error) {
          console.error(`❌ スケジュール実行エラー:`, error);
        }
      }
      
      // 1分待機
      await this.sleep(60000);
    }
  }

  stop(): void {
    this.running = false;
    console.log('⏹️ スケジューラー停止');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. schedule.yaml作成
```yaml
# data/config/schedule.yaml
daily_schedule:
  morning:
    - time: "07:00"
      action: "post"
      topic: "朝の投資教育"
    - time: "08:00"
      action: "retweet"
      target_query: "投資初心者 lang:ja"
  
  lunch:
    - time: "12:00"
      action: "post"
      topic: "市場動向解説"
    - time: "12:30"
      action: "like"
      target_query: "投資教育 高品質"
  
  evening:
    - time: "18:00"
      action: "quote_tweet"
      target_query: "投資ニュース"
      topic: "専門家視点の解説"
  
  night:
    - time: "21:00"
      action: "post"
      topic: "明日の注目ポイント"
```

### 6. main.ts更新（Phase 2版）
```typescript
// src/main.ts
import { TimeScheduler } from './scheduler/time-scheduler';

/**
 * pnpm start - スケジュール実行モード
 */
async function main() {
  console.log('🏁 本番モード実行開始');
  console.log('📌 Phase 2: スケジュール実行モード');
  
  const scheduler = new TimeScheduler();
  
  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log('\n🛑 終了信号を受信');
    scheduler.stop();
    process.exit(0);
  });
  
  try {
    await scheduler.start();
  } catch (error) {
    console.error('❌ スケジューラーエラー:', error);
    process.exit(1);
  }
}

main();
```

### 7. MainWorkflow.execute()の拡張
スケジュールパラメータを受け取れるように拡張：
```typescript
interface WorkflowOptions {
  scheduledAction?: string;
  scheduledTopic?: string;
  scheduledQuery?: string;
}

static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
  // スケジュール指定がある場合は、それを優先
  // ない場合は通常のClaude判断
}
```

## ⚠️ 制約事項
- **シンプル実装**: 必要最小限の時刻チェック機能のみ
- **1分精度**: 秒単位の精度は不要、1分ごとのチェックで十分
- **エラー継続**: 個別タスクのエラーでスケジューラーは停止しない
- **メモリ効率**: 大量のタイマーを作らず、単一ループで実装

## 🔧 技術要件
- TypeScript strict mode
- js-yamlライブラリの使用
- プロセスシグナルの適切な処理
- 時刻フォーマット: "HH:MM"（24時間表記）

## 📂 成果物
- 新規作成: `src/scheduler/` ディレクトリと3ファイル
- 新規作成: `data/config/schedule.yaml`
- 更新: `src/main.ts`（スケジューラー対応）
- 更新: `src/workflows/main-workflow.ts`（オプション対応）

## ✅ 完了条件
- [ ] スケジューラーが時刻通りにタスクを実行する
- [ ] YAMLファイルからスケジュールを正しく読み込む
- [ ] Ctrl+Cで正常に終了する
- [ ] エラー時も継続動作する
- [ ] TypeScriptコンパイルエラーがない