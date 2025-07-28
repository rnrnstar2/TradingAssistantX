// 最適化パターン動作確認テスト
import { CommonErrorHandler } from '../../src/main-workflows/core/common-error-handler';
import { TypeGuards } from '../../src/main-workflows/core/type-guards';
import { WorkflowLogger } from '../../src/main-workflows/core/workflow-logger';
import { WORKFLOW_CONSTANTS } from '../../src/main-workflows/core/workflow-constants';

// CommonErrorHandler のテスト
async function testCommonErrorHandler() {
  console.log('=== CommonErrorHandler テスト ===');
  
  // 成功パターン
  const result1 = await CommonErrorHandler.handleAsyncOperation(
    async () => ({ success: true, data: 'test' }),
    'テスト操作成功'
  );
  console.log('成功テスト:', result1);
  
  // エラーパターン（フォールバック付き）
  const result2 = await CommonErrorHandler.handleAsyncOperation(
    async () => { throw new Error('テストエラー'); },
    'テスト操作失敗',
    { success: false, data: 'fallback' }
  );
  console.log('エラーテスト（フォールバック）:', result2);
}

// TypeGuards のテスト
function testTypeGuards() {
  console.log('=== TypeGuards テスト ===');
  
  console.log('非null確認:', TypeGuards.isNonNull('test'));
  console.log('空文字列確認:', TypeGuards.isNonEmptyString(''));
  console.log('有効配列確認:', TypeGuards.isNonEmptyArray([1, 2, 3]));
  console.log('有効数値確認:', TypeGuards.isValidNumber(42));
  console.log('関数確認:', TypeGuards.isFunction(() => {}));
}

// WorkflowLogger のテスト
function testWorkflowLogger() {
  console.log('=== WorkflowLogger テスト ===');
  
  WorkflowLogger.logStep(1, 'テストステップ', 'start');
  WorkflowLogger.logStep(1, 'テストステップ', 'success');
  WorkflowLogger.logInfo('情報ログテスト');
  WorkflowLogger.logSuccess('成功ログテスト');
  WorkflowLogger.logWarning('警告ログテスト');
}

// WorkflowConstants のテスト
function testWorkflowConstants() {
  console.log('=== WorkflowConstants テスト ===');
  
  console.log('スケジューラー間隔:', WORKFLOW_CONSTANTS.SCHEDULER.DEFAULT_INTERVAL_MINUTES);
  console.log('最大実行回数:', WORKFLOW_CONSTANTS.SCHEDULER.MAX_DAILY_EXECUTIONS);
  console.log('実行時間窓:', WORKFLOW_CONSTANTS.SCHEDULER.EXECUTION_WINDOW);
  console.log('アクション種別:', WORKFLOW_CONSTANTS.ACTIONS);
  console.log('ステップ定義:', WORKFLOW_CONSTANTS.WORKFLOW_STEPS);
}

// メイン実行
async function runOptimizationTests() {
  try {
    await testCommonErrorHandler();
    testTypeGuards();
    testWorkflowLogger();
    testWorkflowConstants();
    
    console.log('\n✅ 全ての最適化パターンテストが完了しました');
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

runOptimizationTests();