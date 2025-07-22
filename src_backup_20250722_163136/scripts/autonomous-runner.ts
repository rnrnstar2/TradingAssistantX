#!/usr/bin/env node

import { AutonomousExecutor } from '../core/autonomous-executor.js';
import { readYamlSafe } from '../utils/yaml-utils.js';
import { join } from 'path';
import { createSingleExecutionRunner } from './autonomous-runner-single.js';

interface ContentStrategy {
  posting_strategy?: {
    frequency?: number;
    optimal_times?: string[];
  };
}

interface ScheduledExecution {
  isRunning: boolean;
  nextExecutionTime: Date | null;
  scheduleTimeouts: NodeJS.Timeout[];
}

// スケジュール実行状態管理
const scheduleState: ScheduledExecution = {
  isRunning: false,
  nextExecutionTime: null,
  scheduleTimeouts: []
};

async function loadOptimalTimes(): Promise<string[]> {
  try {
    const configPath = join(process.cwd(), 'data', 'content-strategy.yaml');
    const config = await readYamlSafe<ContentStrategy>(configPath);
    
    if (config?.posting_strategy?.optimal_times) {
      return config.posting_strategy.optimal_times;
    }
    
    // デフォルトのゴールデンタイム（15個の最適時間）
    return [
      '07:00', '07:30', '08:00', '08:30',
      '12:00', '12:30',
      '18:00', '18:30', '19:00', '19:30',
      '21:00', '21:30', '22:00', '22:30', '23:30'
    ];
  } catch (error) {
    console.warn('⚠️ content-strategy.yaml読み込みエラー、デフォルト時間を使用:', error);
    return [
      '07:00', '07:30', '08:00', '08:30',
      '12:00', '12:30',
      '18:00', '18:30', '19:00', '19:30',
      '21:00', '21:30', '22:00', '22:30', '23:30'
    ];
  }
}

function parseTimeToNextExecution(timeStr: string): Date | null {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`❌ 無効な時間フォーマット: ${timeStr}`);
    return null;
  }
  
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  
  // 過去の時間の場合は翌日に設定
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  return target;
}

function getNextExecutionTime(optimalTimes: string[]): Date | null {
  const now = new Date();
  const today = new Date(now);
  
  // 今日の残り時間を確認
  for (const timeStr of optimalTimes) {
    const executionTime = parseTimeToNextExecution(timeStr);
    if (executionTime && executionTime > now) {
      return executionTime;
    }
  }
  
  // 今日の時間がすべて過ぎている場合、明日の最初の時間を返す
  const [firstTime] = optimalTimes;
  if (firstTime) {
    const tomorrow = parseTimeToNextExecution(firstTime);
    if (tomorrow) {
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  }
  
  return null;
}

function scheduleNextExecution(optimalTimes: string[]): void {
  const nextTime = getNextExecutionTime(optimalTimes);
  
  if (!nextTime) {
    console.error('❌ 次の実行時間を決定できませんでした');
    return;
  }
  
  scheduleState.nextExecutionTime = nextTime;
  const delay = nextTime.getTime() - Date.now();
  
  console.log(`⏰ 次回実行予定: ${nextTime.toLocaleString('ja-JP')}`);
  console.log(`⏱️  実行まで: ${Math.round(delay / 1000 / 60)}分`);
  
  const timeout = setTimeout(async () => {
    await executeScheduledAction();
    scheduleNextExecution(optimalTimes); // 再帰的に次をスケジュール
  }, delay);
  
  scheduleState.scheduleTimeouts.push(timeout);
}

async function executeScheduledAction(): Promise<void> {
  console.log(`🤖 [定期実行] 開始 - ${new Date().toLocaleString('ja-JP')}`);
  
  try {
    // autonomous-runner-single.tsの機能を再利用
    const singleRunner = createSingleExecutionRunner();
    await singleRunner.execute();
    
    console.log(`✅ [定期実行] 完了 - ${new Date().toLocaleString('ja-JP')}`);
  } catch (error) {
    console.error(`❌ [定期実行] エラー - ${new Date().toLocaleString('ja-JP')}:`, error);
  }
}

async function startScheduledExecution(): Promise<void> {
  if (scheduleState.isRunning) {
    console.log('⚠️ スケジュール実行は既に開始されています');
    return;
  }
  
  console.log('🚀 ゴールデンタイム定期実行システム開始');
  scheduleState.isRunning = true;
  
  try {
    const optimalTimes = await loadOptimalTimes();
    console.log(`📅 実行予定時間 (${optimalTimes.length}個):`, optimalTimes.join(', '));
    
    scheduleNextExecution(optimalTimes);
    
    console.log('✅ スケジュール実行システムが正常に開始されました');
    console.log('🔄 プロセスを終了するまで実行を継続します');
    
  } catch (error) {
    console.error('❌ スケジュール実行システム開始エラー:', error);
    scheduleState.isRunning = false;
  }
}

function stopScheduledExecution(): void {
  console.log('⏹️ スケジュール実行システムを停止中...');
  
  scheduleState.scheduleTimeouts.forEach(timeout => clearTimeout(timeout));
  scheduleState.scheduleTimeouts = [];
  scheduleState.isRunning = false;
  scheduleState.nextExecutionTime = null;
  
  console.log('✅ スケジュール実行システムが停止されました');
}

// シグナルハンドラー
process.on('SIGINT', () => {
  console.log('\n🛑 停止要求を受信しました');
  stopScheduledExecution();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 終了要求を受信しました');
  stopScheduledExecution();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ [未処理エラー]', reason);
  stopScheduledExecution();
  process.exit(1);
});

// メイン実行
startScheduledExecution().catch(error => {
  console.error('💥 Fatal error:', error);
  stopScheduledExecution();
  process.exit(1);
});