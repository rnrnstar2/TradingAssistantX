import { ExecutionOrchestrator } from './src/lib/execution-orchestrator';
import { GrowthSystemManager } from './src/lib/growth-system-manager';
import { PostingManager } from './src/lib/posting-manager';
import { ClaudeControlledCollector } from './src/lib/claude-controlled-collector';

async function testParallelExecution() {
  console.log('🚀 並列実行とデータ連携システムのテスト開始');
  
  try {
    // 依存関係のダミー実装
    const growthSystemManager = new GrowthSystemManager('data');
    const postingManager = new PostingManager('dummy-api-key');
    const claudeCollector = new ClaudeControlledCollector();
    
    // ExecutionOrchestratorの作成
    const orchestrator = await ExecutionOrchestrator.create(
      growthSystemManager,
      postingManager,
      claudeCollector,
      'test-data'
    );
    
    console.log('✅ ExecutionOrchestrator 初期化成功');
    
    // テストタスクの作成
    const testTasks = [
      orchestrator.createAnalysisTask('テスト分析1', 'high'),
      orchestrator.createAnalysisTask('テスト分析2', 'medium'),
      orchestrator.createStrategyTask('テスト戦略1', 'high'),
      orchestrator.createStrategyTask('テスト戦略2', 'low')
    ];
    
    console.log('📋 テストタスクを作成しました:', testTasks.map(t => t.name));
    
    // 実行プランの作成
    const plan = await orchestrator.parallelManager.createExecutionPlan(testTasks);
    console.log('📊 実行プラン:', {
      parallelGroups: plan.parallelGroups.length,
      sequentialTasks: plan.sequentialTasks.length,
      estimatedDuration: plan.estimatedDuration
    });
    
    // データ連携システムのテスト
    console.log('🔄 データ連携システムのテスト');
    await orchestrator.dataCommunication.shareData('test-data.json', {
      message: 'テストデータ',
      timestamp: Date.now()
    });
    
    const sharedData = await orchestrator.dataCommunication.readSharedData('test-data.json');
    console.log('📤 データ共有テスト成功:', sharedData);
    
    // 実行状況の確認
    const status = await orchestrator.getExecutionStatus();
    console.log('📈 実行状況:', status);
    
    // 長時間実行タスクのテスト
    const longTask = orchestrator.createLongRunningTask(
      'テスト長時間実行',
      'analyze',
      30000, // 30秒
      'medium'
    );
    
    console.log('⏱️ 長時間実行タスクのテスト開始');
    const longTaskResult = await orchestrator.longRunningManager.executeLongRunningTask(longTask);
    console.log('✅ 長時間実行タスク完了:', {
      success: longTaskResult.success,
      duration: longTaskResult.duration
    });
    
    // 非同期実行のテスト
    console.log('🔄 非同期実行のテスト');
    const asyncTask = orchestrator.createAnalysisTask('非同期テスト', 'high');
    const asyncTaskId = await orchestrator.asyncManager.startAsyncTask(asyncTask);
    console.log('🆔 非同期タスクID:', asyncTaskId);
    
    // 非同期タスクの待機
    setTimeout(async () => {
      const isComplete = await orchestrator.asyncManager.isTaskComplete(asyncTaskId);
      console.log('✅ 非同期タスク完了状況:', isComplete);
    }, 5000);
    
    // メンテナンス実行
    console.log('🧹 メンテナンス実行');
    await orchestrator.performMaintenance();
    
    console.log('🎉 すべてのテストが完了しました！');
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

// テスト実行
if (require.main === module) {
  testParallelExecution().catch(console.error);
}