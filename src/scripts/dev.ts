#!/usr/bin/env node
import 'dotenv/config';
import { CoreRunner } from '../core/execution/core-runner.js';
import { TriggerMonitor } from '../core/trigger-monitor.js';

async function dev(): Promise<void> {
  // MODE環境変数で統一制御
  const mode = process.env.MODE || 'dev';
  const watchMode = process.argv.includes('--watch');
  
  // 既存の環境変数をクリア
  delete process.env.TEST_MODE;
  delete process.env.DEV_MODE;
  delete process.env.NODE_ENV;
  delete process.env.REAL_POST;
  
  if (mode === 'production') {
    console.log('🚀 [PRODUCTION] 実際の投稿モードで実行');
    console.log('⚠️  警告: X(Twitter)に実際に投稿されます！');
    process.env.MODE = 'production';
  } else {
    console.log('🛠️ [DEV] 開発テスト実行開始');
    console.log('📋 [モード] 投稿プレビューのみ（実際には投稿しません）');
    process.env.MODE = 'dev';
  }
  
  // 変更検知モード
  if (watchMode) {
    console.log('👁️ [WATCH] 変更検知モードで起動');
    console.log('📂 監視対象: data/triggers/*.yaml');
    
    const triggerMonitor = new TriggerMonitor();
    await triggerMonitor.start();
    
    console.log('✅ トリガー監視を開始しました。Ctrl+Cで終了します。');
    
    // プロセス終了時のクリーンアップ
    process.on('SIGINT', async () => {
      console.log('\n🛑 監視を停止しています...');
      await triggerMonitor.stop();
      process.exit(0);
    });
    
    // 待機
    await new Promise(() => {}); // 無限待機
    
  } else {
    // 通常の単発実行
    try {
      // CoreRunner初期化
      const coreRunner = new CoreRunner({ enableLogging: true });
      
      console.log('🚀 [実行] 6段階自律実行フロー開始...');
    
    // ★ 要件定義書必須：6段階自律実行フロー
    const result = await coreRunner.runAutonomousFlow();
    
    // 結果表示（簡潔版）
    const modeText = mode === 'production' ? '投稿' : '開発テスト';
    console.log(result.success ? `✅ ${modeText}完了` : `❌ エラー: ${result.error}`);
    console.log(`📊 実行時間: ${result.executionTime}ms`);
    
  } catch (error) {
    console.error('❌ 実行失敗:', error);
    process.exit(1);
  }
}

dev().catch(console.error);