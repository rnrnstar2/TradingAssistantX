import { MainWorkflow } from './workflows/main-workflow';
import { ScheduleLoader } from './scheduler/schedule-loader';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

/**
 * schedule.yamlから固定アクションを取得
 */
async function loadFixedAction() {
  try {
    const scheduleConfig = ScheduleLoader.load('data/config/schedule.yaml');
    const scheduleItems = ScheduleLoader.getTodaySchedule(scheduleConfig);
    
    if (scheduleItems.length === 0) {
      throw new Error('スケジュールが設定されていません');
    }
    
    // 最初のアクション（index 0）を固定で使用
    const fixedAction = scheduleItems[0];
    
    console.log(`🎯 開発モード: アクション '${fixedAction.action}' (${fixedAction.topic || fixedAction.target_query || '基本実行'}) を実行`);
    
    return fixedAction;
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
    // YAMLから固定アクションを取得
    const fixedAction = await loadFixedAction();
    
    // MainWorkflowに固定アクションを渡す
    const result = await MainWorkflow.execute({
      scheduledAction: fixedAction.action,
      scheduledTopic: fixedAction.topic,
      scheduledQuery: fixedAction.target_query
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