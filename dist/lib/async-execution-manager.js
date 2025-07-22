export class AsyncExecutionManager {
    dataCommunication;
    contextManager;
    parallelManager;
    longRunningManager;
    runningTasks = new Map();
    constructor(dataCommunication, contextManager, parallelManager, longRunningManager) {
        this.dataCommunication = dataCommunication;
        this.contextManager = contextManager;
        this.parallelManager = parallelManager;
        this.longRunningManager = longRunningManager;
    }
    async startAsyncTask(task) {
        const taskId = `async-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 初期ステータス保存
        const initialStatus = {
            id: Date.now().toString(),
            taskId,
            status: 'pending',
            startTime: Date.now(),
            progress: 0
        };
        await this.contextManager.saveTaskStatus(initialStatus);
        // 非同期実行の開始
        const { promise, cancel } = this.createAsyncExecution(task, taskId);
        const handle = {
            taskId,
            promise,
            startTime: Date.now(),
            cancel
        };
        this.runningTasks.set(taskId, handle);
        // バックグラウンドで実行状況を監視
        this.monitorAsyncTask(taskId).catch((error) => {
            console.error(`❌ [非同期実行] タスク監視エラー (${taskId}):`, error);
        });
        return taskId;
    }
    createAsyncExecution(task, taskId) {
        let cancelled = false;
        const promise = new Promise((resolve, reject) => {
            const executeTask = async () => {
                try {
                    if (cancelled) {
                        throw new Error('タスクがキャンセルされました');
                    }
                    // タスクステータスを実行中に更新
                    await this.contextManager.updateTaskStatus(taskId, {
                        status: 'running'
                    });
                    // タスクタイプに応じた実行方法を決定
                    let result;
                    if (this.isLongRunningTask(task)) {
                        // 長時間実行タスク
                        result = await this.longRunningManager.executeLongRunningTask(task);
                    }
                    else {
                        // 通常タスク
                        result = await this.parallelManager.executeWithTimeout(task, task.timeout || 30000);
                    }
                    if (cancelled) {
                        throw new Error('タスクがキャンセルされました');
                    }
                    // 成功ステータス更新
                    await this.contextManager.updateTaskStatus(taskId, {
                        status: 'completed',
                        endTime: Date.now(),
                        progress: 100
                    });
                    // 結果を永続化
                    await this.saveTaskResult(taskId, result);
                    resolve(result);
                }
                catch (error) {
                    // エラーステータス更新
                    await this.contextManager.updateTaskStatus(taskId, {
                        status: 'failed',
                        endTime: Date.now(),
                        error: error instanceof Error ? error.message : '不明なエラー'
                    });
                    reject(error);
                }
            };
            executeTask().catch(reject);
        });
        const cancel = () => {
            cancelled = true;
            this.runningTasks.delete(taskId);
        };
        return { promise, cancel };
    }
    isLongRunningTask(task) {
        const longRunningTypes = ['collect', 'analyze'];
        const hasLongEstimation = (task.timeout || 0) > 300000; // 5分以上
        return longRunningTypes.includes(task.type) || hasLongEstimation;
    }
    async monitorAsyncTask(taskId) {
        const handle = this.runningTasks.get(taskId);
        if (!handle) {
            return;
        }
        try {
            const result = await handle.promise;
            // 完了通知
            await this.dataCommunication.notifyResult('async-execution-manager', 'system', {
                taskId,
                result,
                completedAt: Date.now()
            });
        }
        catch (error) {
            // エラー通知
            await this.dataCommunication.notifyError('async-execution-manager', error instanceof Error ? error.message : '不明なエラー', { taskId });
        }
        finally {
            // タスクハンドルをクリーンアップ
            this.runningTasks.delete(taskId);
        }
    }
    async isTaskComplete(taskId) {
        try {
            const status = await this.contextManager.loadTaskStatus(taskId);
            return status?.status === 'completed' || false;
        }
        catch (error) {
            console.error(`タスク完了確認エラー (${taskId}):`, error);
            return false;
        }
    }
    async getTaskResult(taskId) {
        try {
            const isComplete = await this.isTaskComplete(taskId);
            if (!isComplete) {
                return null;
            }
            const resultFile = `task-result-${taskId}.json`;
            return await this.dataCommunication.readSharedData(resultFile);
        }
        catch (error) {
            console.error(`タスク結果取得エラー (${taskId}):`, error);
            return null;
        }
    }
    async getTaskStatus(taskId) {
        try {
            return await this.contextManager.loadTaskStatus(taskId);
        }
        catch (error) {
            console.error(`タスクステータス取得エラー (${taskId}):`, error);
            return null;
        }
    }
    async cancelTask(taskId) {
        try {
            const handle = this.runningTasks.get(taskId);
            if (handle) {
                handle.cancel();
                // キャンセルステータス更新
                await this.contextManager.updateTaskStatus(taskId, {
                    status: 'failed',
                    endTime: Date.now(),
                    error: 'タスクがキャンセルされました'
                });
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`タスクキャンセルエラー (${taskId}):`, error);
            return false;
        }
    }
    async getRunningTasks() {
        return Array.from(this.runningTasks.values());
    }
    async waitForTask(taskId, timeoutMs = 300000) {
        const handle = this.runningTasks.get(taskId);
        if (!handle) {
            throw new Error(`タスクが見つかりません: ${taskId}`);
        }
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`タスク待機タイムアウト: ${taskId}`)), timeoutMs);
        });
        try {
            return await Promise.race([handle.promise, timeoutPromise]);
        }
        catch (error) {
            throw error;
        }
    }
    async waitForMultipleTasks(taskIds, strategy = 'all', timeoutMs = 300000) {
        const handles = taskIds.map(id => this.runningTasks.get(id)).filter(Boolean);
        if (handles.length === 0) {
            throw new Error('有効なタスクが見つかりません');
        }
        const promises = handles.map(handle => handle.promise);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('複数タスク待機タイムアウト')), timeoutMs);
        });
        try {
            if (strategy === 'all') {
                const results = await Promise.race([Promise.all(promises), timeoutPromise]);
                return results;
            }
            else {
                const result = await Promise.race([Promise.race(promises), timeoutPromise]);
                return [result];
            }
        }
        catch (error) {
            throw error;
        }
    }
    async saveTaskResult(taskId, result) {
        try {
            const resultFile = `task-result-${taskId}.json`;
            await this.dataCommunication.shareData(resultFile, result);
        }
        catch (error) {
            console.error(`タスク結果保存エラー (${taskId}):`, error);
        }
    }
    async getTaskProgress(taskId) {
        try {
            const status = await this.contextManager.loadTaskStatus(taskId);
            return status?.progress || 0;
        }
        catch (error) {
            console.error(`タスク進捗取得エラー (${taskId}):`, error);
            return 0;
        }
    }
    async getAllTaskStatuses() {
        try {
            return await this.contextManager.getAllActiveTaskStatuses();
        }
        catch (error) {
            console.error('全タスクステータス取得エラー:', error);
            return [];
        }
    }
    async cleanupCompletedTasks(maxAgeMs = 3600000) {
        try {
            // 完了したタスクのクリーンアップ
            const allStatuses = await this.getAllTaskStatuses();
            const now = Date.now();
            for (const status of allStatuses) {
                if (status.status === 'completed' || status.status === 'failed') {
                    const age = now - status.startTime;
                    if (age > maxAgeMs) {
                        // 結果ファイルを削除
                        const resultFile = `task-result-${status.taskId}.json`;
                        await this.dataCommunication.readSharedData(resultFile); // 存在確認
                        // 実際の削除は DataCommunicationSystem のクリーンアップ機能で実行
                    }
                }
            }
            // コンテキストのクリーンアップ
            await this.contextManager.cleanupOldContexts(maxAgeMs);
        }
        catch (error) {
            console.error('完了タスククリーンアップエラー:', error);
        }
    }
    async createTaskBatch(tasks) {
        const taskIds = [];
        for (const task of tasks) {
            const taskId = await this.startAsyncTask(task);
            taskIds.push(taskId);
        }
        return taskIds;
    }
    async waitForTaskBatch(taskIds, strategy = 'all', timeoutMs = 600000) {
        try {
            return await this.waitForMultipleTasks(taskIds, strategy, timeoutMs);
        }
        catch (error) {
            // 部分的な結果を収集
            const partialResults = [];
            for (const taskId of taskIds) {
                const isComplete = await this.isTaskComplete(taskId);
                if (isComplete) {
                    const result = await this.getTaskResult(taskId);
                    if (result) {
                        partialResults.push(result);
                    }
                }
            }
            if (partialResults.length === 0) {
                throw error;
            }
            return partialResults;
        }
    }
}
