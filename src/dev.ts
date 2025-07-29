import { MainWorkflow } from './workflows/main-workflow';

/**
 * pnpm dev - 開発用単一実行エントリーポイント
 * 1回だけワークフローを実行して終了
 */
async function runDev() {
  console.log('🚀 開発モード実行開始');
  
  try {
    const result = await MainWorkflow.execute();
    if (result.success) {
      console.log('✅ ワークフロー完了');
    } else {
      console.error('❌ ワークフロー失敗:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 即座に実行
runDev();