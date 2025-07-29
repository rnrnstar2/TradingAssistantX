import { TimeScheduler } from './scheduler/time-scheduler';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

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