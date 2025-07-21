#!/usr/bin/env node

import { AutonomousExecutor } from '../core/autonomous-executor.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let isShuttingDown = false;
let currentExecutionPromise: Promise<void> | null = null;

/**
 * システム停止時処理
 * 現在実行中の処理完了待機のみ
 */
async function performSystemShutdownCleanup(): Promise<void> {
  // 現在実行中の処理完了待機（最大30秒）
  if (currentExecutionPromise) {
    console.log('⏳ 現在の実行完了を待機中（最大30秒）...');
    try {
      await Promise.race([
        currentExecutionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.log('⚠️  実行完了待機タイムアウト、強制終了します');
    }
  }
}

async function main() {
  console.log('🚀 TradingAssistantX 自動投稿システム起動');
  console.log(`📅 開始時刻: ${new Date().toISOString()}`);
  console.log('⏹️  停止方法: Ctrl+C または `pnpm stop`');
  console.log('📊 状態確認: `pnpm status`');
  console.log('🔄 自動投稿システム実行中...\n');
  
  const executor = new AutonomousExecutor();
  
  let iterationCount = 0;
  
  while (!isShuttingDown) {
    iterationCount++;
    console.log(`\n🔄 [${new Date().toLocaleTimeString('ja-JP')}] イテレーション ${iterationCount}`);
    
    // 現在の実行を追跡
    currentExecutionPromise = (async () => {
      try {
        await executor.executeAutonomously();
        console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 完了`);
        
      } catch (error) {
        console.error(`❌ [${new Date().toLocaleTimeString('ja-JP')}] エラー:`, error);
      }
    })();
    
    await currentExecutionPromise;
    currentExecutionPromise = null;
    
    if (isShuttingDown) break;
    
    // 固定96分間隔（1日15回投稿）
    const POSTING_INTERVAL_MS = 96 * 60 * 1000; // 96分 = 1日15回
    console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 完了 (次回: 96分後)`);
    
    await sleep(POSTING_INTERVAL_MS);
  }
}

process.on('SIGINT', async () => {
  console.log('\n⏹️  システム停止処理開始...');
  isShuttingDown = true;
  await performSystemShutdownCleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  システム停止処理開始...');
  isShuttingDown = true;
  await performSystemShutdownCleanup();
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});