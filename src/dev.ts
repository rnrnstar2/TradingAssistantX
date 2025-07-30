import { MainWorkflow } from './workflows/main-workflow';
import { ScheduleLoader } from './scheduler/schedule-loader';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

/**
 * コマンドライン引数を解析
 */
function parseCommandLineArgs(): { action?: string } {
  const args = process.argv.slice(2);
  const result: { action?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && i + 1 < args.length) {
      result.action = args[i + 1];
    }
  }
  
  return result;
}

/**
 * schedule.yamlから指定されたアクションを取得
 */
async function loadActionFromSchedule(targetAction?: string) {
  try {
    const scheduleConfig = ScheduleLoader.load('data/config/schedule.yaml');
    const scheduleItems = ScheduleLoader.getTodaySchedule(scheduleConfig);
    
    if (scheduleItems.length === 0) {
      throw new Error('スケジュールが設定されていません');
    }
    
    let selectedAction;
    
    if (targetAction) {
      // 指定されたアクションを検索
      selectedAction = scheduleItems.find(item => item.action === targetAction);
      
      if (!selectedAction) {
        console.warn(`⚠️ 指定されたアクション '${targetAction}' が見つかりません。最初のアクションを使用します。`);
        selectedAction = scheduleItems[0];
      } else {
        console.log(`🎯 コマンドライン指定: アクション '${selectedAction.action}' (${selectedAction.topic || selectedAction.target_query || '基本実行'}) を実行`);
      }
    } else {
      // デフォルトは最初のアクション
      selectedAction = scheduleItems[0];
      console.log(`🎯 開発モード: アクション '${selectedAction.action}' (${selectedAction.topic || selectedAction.target_query || '基本実行'}) を実行`);
    }
    
    return selectedAction;
  } catch (error) {
    console.error('❌ スケジュール読み込みエラー:', error);
    throw error;
  }
}

/**
 * pnpm dev - 開発用単一実行エントリーポイント
 * 1回だけワークフローを実行して終了
 */
async function runDev() {
  console.log('🚀 開発モード実行開始');
  
  try {
    // コマンドライン引数を解析
    const cmdArgs = parseCommandLineArgs();
    
    // 指定されたアクションまたはデフォルトアクションを取得
    const selectedAction = await loadActionFromSchedule(cmdArgs.action);
    
    // MainWorkflowに選択されたアクションを渡す
    const result = await MainWorkflow.execute({
      scheduledAction: selectedAction.action,
      scheduledTopic: selectedAction.topic,
      scheduledQuery: selectedAction.target_query
    });
    
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