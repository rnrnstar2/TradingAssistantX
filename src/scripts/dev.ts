#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from '../core/execution/core-runner.js';

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