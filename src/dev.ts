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
 * アクション必須チェックとヘルプ表示
 */
function displayAvailableActions(scheduleItems: any[]) {
  console.error('❌ アクション指定が必要です。以下のいずれかを使用してください:');
  console.log('');
  console.log('📋 利用可能なコマンド:');
  
  const actionTypes = [...new Set(scheduleItems.map(item => item.action))];
  actionTypes.forEach(action => {
    const examples = scheduleItems.filter(item => item.action === action).slice(0, 2);
    const exampleDesc = examples[0]?.topic || examples[0]?.target_query || '基本実行';
    console.log(`  pnpm dev:${action.padEnd(8)} # ${action}テスト (例: ${exampleDesc})`);
  });
  
  console.log('');
  console.log('📖 詳細: docs/workflow.md を参照');
  console.log('🔍 スケジュール: data/config/schedule.yaml に定義済み');
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
      // 指定されたアクションの全候補を取得
      const actionCandidates = scheduleItems.filter(item => item.action === targetAction);
      
      if (actionCandidates.length === 0) {
        console.warn(`⚠️ 指定されたアクション '${targetAction}' が見つかりません。最初のアクションを使用します。`);
        selectedAction = scheduleItems[0];
      } else {
        // ランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * actionCandidates.length);
        selectedAction = actionCandidates[randomIndex];
        console.log(`🎲 ランダム選択: アクション '${selectedAction.action}' (${selectedAction.topic || selectedAction.target_query || '基本実行'}) を実行 [${randomIndex + 1}/${actionCandidates.length}]`);
      }
    } else {
      // アクション指定なしはエラー
      displayAvailableActions(scheduleItems);
      throw new Error('Action specification required');
    }
    
    return selectedAction;
  } catch (error) {
    if (error instanceof Error && error.message === 'Action specification required') {
      // アクション指定エラーの場合は適切なexit code
      process.exit(1);
    } else {
      console.error('❌ スケジュール読み込みエラー:', error);
      process.exit(1);
    }
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