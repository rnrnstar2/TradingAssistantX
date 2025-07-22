import { DataCommunicationSystem } from './data-communication-system';
import { ContextManager } from './context-manager';
import { ParallelExecutionManager } from './parallel-execution-manager';
import { LongRunningTaskManager } from './long-running-task-manager';
import { AsyncExecutionManager } from './async-execution-manager';
export class ExecutionOrchestrator {
    dataCommunication;
    contextManager;
    parallelManager;
    longRunningManager;
    asyncManager;
    constructor(growthSystemManager, postingManager, claudeCollector, dataDir = 'data') {
        // データ連携システムの初期化
        const dataCommunication = new DataCommunicationSystem(dataDir);
        const contextManager = new ContextManager(dataCommunication);
        // 並列実行管理システムの初期化
        const parallelManager = new ParallelExecutionManager(dataCommunication, contextManager, growthSystemManager, postingManager, claudeCollector);
        // 実行時間管理システムの初期化
        const longRunningManager = new LongRunningTaskManager(dataCommunication, contextManager, parallelManager);
        const asyncManager = new AsyncExecutionManager(dataCommunication, contextManager, parallelManager, longRunningManager);
        // readonly プロパティへの代入
        this.dataCommunication = dataCommunication;
        this.contextManager = contextManager;
        this.parallelManager = parallelManager;
        this.longRunningManager = longRunningManager;
        this.asyncManager = asyncManager;
    }
    // 基本的な実行メソッド
    async executeTask(task) {
        if (this.isLongRunningTask(task)) {
            return await this.longRunningManager.executeLongRunningTask(task);
        }
        else {
            return await this.parallelManager.executeWithTimeout(task, task.timeout || 30000);
        }
    }
    async executeTasksInParallel(tasks) {
        return await this.parallelManager.orchestrateParallelTasks(tasks);
    }
    async executeTaskAsync(task) {
        return await this.asyncManager.startAsyncTask(task);
    }
    // 高レベルなワークフロー実行
    async executeWorkflow(tasks) {
        try {
            // 実行プランの作成
            const plan = await this.parallelManager.createExecutionPlan(tasks);
            // 実行状況の通知
            await this.dataCommunication.broadcastStatus('execution-orchestrator', 'workflow_started', {
                totalTasks: tasks.length,
                parallelGroups: plan.parallelGroups.length,
                sequentialTasks: plan.sequentialTasks.length,
                estimatedDuration: plan.estimatedDuration
            });
            // 実行
            const results = await this.parallelManager.orchestrateParallelTasks(tasks);
            // 完了通知
            await this.dataCommunication.broadcastStatus('execution-orchestrator', 'workflow_completed', {
                totalTasks: tasks.length,
                successfulTasks: results.filter(r => r.success).length,
                failedTasks: results.filter(r => !r.success).length,
                results: results.map(r => ({
                    taskId: r.taskId,
                    success: r.success,
                    duration: r.duration
                }))
            });
            return results;
        }
        catch (error) {
            // エラー通知
            await this.dataCommunication.notifyError('execution-orchestrator', error instanceof Error ? error.message : '不明なエラー', { tasks: tasks.map(t => t.id) });
            throw error;
        }
    }
    // 非同期バッチ実行
    async executeAsyncBatch(tasks) {
        const taskIds = await this.asyncManager.createTaskBatch(tasks);
        // バッチ開始通知
        await this.dataCommunication.broadcastStatus('execution-orchestrator', 'async_batch_started', {
            batchId: Date.now().toString(),
            taskIds,
            totalTasks: tasks.length
        });
        return taskIds;
    }
    async waitForAsyncBatch(taskIds, strategy = 'all', timeoutMs = 600000) {
        return await this.asyncManager.waitForTaskBatch(taskIds, strategy, timeoutMs);
    }
    // 状態確認メソッド
    async getExecutionStatus() {
        const [parallelStatus, asyncStatuses] = await Promise.all([
            this.parallelManager.getExecutionStatus(),
            this.asyncManager.getAllTaskStatuses()
        ]);
        return {
            parallel: parallelStatus,
            async: {
                totalTasks: asyncStatuses.length,
                runningTasks: asyncStatuses.filter(s => s.status === 'running').length,
                completedTasks: asyncStatuses.filter(s => s.status === 'completed').length,
                failedTasks: asyncStatuses.filter(s => s.status === 'failed').length,
                pendingTasks: asyncStatuses.filter(s => s.status === 'pending').length
            },
            system: {
                dataDirectory: this.dataCommunication.getDataDirectory(),
                uptime: Date.now() - this.initTime,
                memoryUsage: process.memoryUsage ? process.memoryUsage() : null
            }
        };
    }
    // クリーンアップメソッド
    async performMaintenance() {
        try {
            await Promise.all([
                this.dataCommunication.cleanupOldMessages(),
                this.dataCommunication.cleanupExpiredResults(),
                this.contextManager.cleanupOldContexts(),
                this.asyncManager.cleanupCompletedTasks()
            ]);
            await this.dataCommunication.broadcastStatus('execution-orchestrator', 'maintenance_completed', { timestamp: Date.now() });
        }
        catch (error) {
            await this.dataCommunication.notifyError('execution-orchestrator', error instanceof Error ? error.message : 'メンテナンスエラー');
        }
    }
    // ユーティリティメソッド
    isLongRunningTask(task) {
        return 'estimatedDuration' in task ||
            'subtasks' in task ||
            'checkpoints' in task ||
            (task.timeout || 0) > 300000; // 5分以上
    }
    initTime = Date.now();
    // 便利なファクトリーメソッド
    static async create(growthSystemManager, postingManager, claudeCollector, dataDir = 'data') {
        const orchestrator = new ExecutionOrchestrator(growthSystemManager, postingManager, claudeCollector, dataDir);
        // 初期化完了通知
        await orchestrator.dataCommunication.broadcastStatus('execution-orchestrator', 'initialized', { timestamp: Date.now() });
        return orchestrator;
    }
    // 簡単なタスク作成ヘルパー
    createCollectionTask(name, priority = 'medium') {
        return {
            id: `collect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type: 'collect',
            priority,
            timeout: 60000
        };
    }
    createAnalysisTask(name, priority = 'medium') {
        return {
            id: `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type: 'analyze',
            priority,
            timeout: 120000
        };
    }
    createPostingTask(name, content, priority = 'medium') {
        return {
            id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type: 'post',
            priority,
            config: { content },
            timeout: 30000
        };
    }
    createStrategyTask(name, priority = 'medium') {
        return {
            id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type: 'strategy',
            priority,
            timeout: 180000
        };
    }
    createLongRunningTask(name, type, estimatedDuration, priority = 'medium') {
        return {
            id: `long-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            priority,
            estimatedDuration,
            timeout: estimatedDuration + 60000 // バッファ時間を追加
        };
    }
}
