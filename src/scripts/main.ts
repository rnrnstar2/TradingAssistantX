#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from '../core/execution/core-runner.js';

async function main(): Promise<void> {
  console.log('🚀 [MAIN] シンプル定期実行システム開始');
  
  const coreRunner = new CoreRunner({ enableLogging: true });
  
  // MVP: 単純な1時間間隔ループ
  while (true) {
    console.log('🚀 6段階自律実行フロー開始');
    
    const result = await coreRunner.runAutonomousFlow();
    
    console.log(result.success ? '✅ 実行完了' : `❌ エラー: ${result.error}`);
    
    // シンプルな1時間待機
    console.log('⏱️ 1時間待機...');
    await new Promise(resolve => setTimeout(resolve, 3600000));
  }
}

main().catch(console.error);