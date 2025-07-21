"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongRunningTaskManager = void 0;
class LongRunningTaskManager {
    dataCommunication;
    contextManager;
    parallelManager;
    maxSubtaskDuration = 120000; // 2分
    constructor(dataCommunication, contextManager, parallelManager) {
        this.dataCommunication = dataCommunication;
        this.contextManager = contextManager;
        this.parallelManager = parallelManager;
    }
    async executeLongRunningTask(task) {
        const startTime = Date.now();
        try {
            // 1. 短時間タスクに分割
            const subtasks = await this.divideIntoSubtasks(task);
            // 2. 初期ステータス保存
            await this.contextManager.saveTaskStatus({
                id: Date.now().toString(),
                taskId: task.id,
                status: 'running',
                startTime,
                progress: 0
            });
            // 3. サブタスクを順次実行
            const subtaskResults = [];
            for (let i = 0; i < subtasks.length; i++) {
                const subtask = subtasks[i];
                const subtaskResult = await this.executeSubtask(subtask, i, subtasks.length);
                subtaskResults.push(subtaskResult);
                // 中間結果をdataディレクトリに保存
                await this.contextManager.saveIntermediateResult(subtask.id, subtaskResult, subtaskResult.checkpoint);
                // 進捗更新
                const progress = Math.round(((i + 1) / subtasks.length) * 100);
                await this.contextManager.updateTaskStatus(task.id, {
                    progress,
                    status: 'running'
                });
            }
            // 4. 最終統合
            const finalResult = await this.integrateResults(task, subtaskResults);
            // 5. 完了ステータス更新
            await this.contextManager.updateTaskStatus(task.id, {
                status: 'completed',
                endTime: Date.now(),
                progress: 100
            });
            return {
                taskId: task.id,
                success: true,
                data: finalResult,
                timestamp: Date.now(),
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            // エラーステータス更新
            await this.contextManager.updateTaskStatus(task.id, {
                status: 'failed',
                endTime: Date.now(),
                error: error instanceof Error ? error.message : '不明なエラー'
            });
            return {
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : '不明なエラー',
                timestamp: Date.now(),
                duration: Date.now() - startTime
            };
        }
    }
    async divideIntoSubtasks(task) {
        const subtasks = [];
        // 推定実行時間に基づいて分割
        const estimatedDuration = task.estimatedDuration || 600000; // デフォルト10分
        const numberOfSubtasks = Math.ceil(estimatedDuration / this.maxSubtaskDuration);
        if (task.subtasks && task.subtasks.length > 0) {
            // 事前定義されたサブタスクを使用
            subtasks.push(...task.subtasks);
        }
        else {
            // タスクタイプに応じた自動分割
            const autoSubtasks = this.createAutoSubtasks(task, numberOfSubtasks);
            subtasks.push(...autoSubtasks);
        }
        return subtasks;
    }
    createAutoSubtasks(task, numberOfSubtasks) {
        const subtasks = [];
        const baseConfig = task.config || {};
        switch (task.type) {
            case 'collect':
                // データ収集タスクの分割
                for (let i = 0; i < numberOfSubtasks; i++) {
                    subtasks.push({
                        id: `${task.id}-subtask-${i}`,
                        name: `${task.name} - 収集フェーズ ${i + 1}`,
                        type: 'collect',
                        priority: task.priority,
                        config: {
                            ...baseConfig,
                            phase: i + 1,
                            totalPhases: numberOfSubtasks
                        },
                        timeout: this.maxSubtaskDuration
                    });
                }
                break;
            case 'analyze':
                // 分析タスクの分割
                const analysisPhases = ['データ準備', '基本分析', '詳細分析', '結果統合'];
                for (let i = 0; i < Math.min(numberOfSubtasks, analysisPhases.length); i++) {
                    subtasks.push({
                        id: `${task.id}-subtask-${i}`,
                        name: `${task.name} - ${analysisPhases[i]}`,
                        type: 'analyze',
                        priority: task.priority,
                        config: {
                            ...baseConfig,
                            phase: analysisPhases[i],
                            stepNumber: i + 1
                        },
                        timeout: this.maxSubtaskDuration
                    });
                }
                break;
            case 'strategy':
                // 戦略タスクの分割
                const strategyPhases = ['現状分析', '戦略立案', '最適化', '実装準備'];
                for (let i = 0; i < Math.min(numberOfSubtasks, strategyPhases.length); i++) {
                    subtasks.push({
                        id: `${task.id}-subtask-${i}`,
                        name: `${task.name} - ${strategyPhases[i]}`,
                        type: 'strategy',
                        priority: task.priority,
                        config: {
                            ...baseConfig,
                            phase: strategyPhases[i],
                            stepNumber: i + 1
                        },
                        timeout: this.maxSubtaskDuration
                    });
                }
                break;
            default:
                // 汎用分割
                for (let i = 0; i < numberOfSubtasks; i++) {
                    subtasks.push({
                        id: `${task.id}-subtask-${i}`,
                        name: `${task.name} - パート ${i + 1}`,
                        type: task.type,
                        priority: task.priority,
                        config: {
                            ...baseConfig,
                            partNumber: i + 1,
                            totalParts: numberOfSubtasks
                        },
                        timeout: this.maxSubtaskDuration
                    });
                }
                break;
        }
        return subtasks;
    }
    async executeSubtask(subtask, index, totalSubtasks) {
        const startTime = Date.now();
        try {
            // サブタスクを実行
            const result = await this.parallelManager.executeWithTimeout(subtask, subtask.timeout || this.maxSubtaskDuration);
            const checkpoint = this.generateCheckpoint(subtask, index, totalSubtasks);
            const progress = Math.round(((index + 1) / totalSubtasks) * 100);
            return {
                subtaskId: subtask.id,
                parentTaskId: subtask.id.split('-subtask-')[0],
                result: result.data,
                checkpoint,
                timestamp: Date.now(),
                progress
            };
        }
        catch (error) {
            throw new Error(`サブタスク実行エラー (${subtask.id}): ${error}`);
        }
    }
    generateCheckpoint(subtask, index, totalSubtasks) {
        const progress = Math.round(((index + 1) / totalSubtasks) * 100);
        return `${subtask.name}_step_${index + 1}_of_${totalSubtasks}_${progress}%`;
    }
    async integrateResults(task, subtaskResults) {
        const integratedResult = {
            taskId: task.id,
            taskName: task.name,
            taskType: task.type,
            completedAt: Date.now(),
            totalSubtasks: subtaskResults.length,
            subtaskResults: subtaskResults.map(sr => ({
                subtaskId: sr.subtaskId,
                checkpoint: sr.checkpoint,
                progress: sr.progress,
                timestamp: sr.timestamp,
                hasData: !!sr.result
            })),
            combinedData: this.combineSubtaskData(task.type, subtaskResults),
            summary: this.generateIntegrationSummary(subtaskResults)
        };
        return integratedResult;
    }
    combineSubtaskData(taskType, subtaskResults) {
        switch (taskType) {
            case 'collect':
                // データ収集結果の統合
                const allData = subtaskResults.reduce((acc, sr) => {
                    if (sr.result && Array.isArray(sr.result)) {
                        acc.push(...sr.result);
                    }
                    return acc;
                }, []);
                return {
                    totalItems: allData.length,
                    items: allData,
                    sources: [...new Set(allData.map(item => item.source))],
                    timeRange: {
                        start: Math.min(...subtaskResults.map(sr => sr.timestamp)),
                        end: Math.max(...subtaskResults.map(sr => sr.timestamp))
                    }
                };
            case 'analyze':
                // 分析結果の統合
                return {
                    analysisPhases: subtaskResults.map(sr => ({
                        phase: sr.checkpoint,
                        result: sr.result,
                        timestamp: sr.timestamp
                    })),
                    finalAnalysis: subtaskResults[subtaskResults.length - 1]?.result || null
                };
            case 'strategy':
                // 戦略結果の統合
                return {
                    strategyPhases: subtaskResults.map(sr => ({
                        phase: sr.checkpoint,
                        result: sr.result,
                        timestamp: sr.timestamp
                    })),
                    finalStrategy: subtaskResults[subtaskResults.length - 1]?.result || null
                };
            default:
                // 汎用統合
                return {
                    parts: subtaskResults.map(sr => sr.result),
                    metadata: {
                        totalParts: subtaskResults.length,
                        completedAt: Date.now()
                    }
                };
        }
    }
    generateIntegrationSummary(subtaskResults) {
        const successfulSubtasks = subtaskResults.filter(sr => sr.result);
        const totalDuration = Math.max(...subtaskResults.map(sr => sr.timestamp)) -
            Math.min(...subtaskResults.map(sr => sr.timestamp));
        return {
            totalSubtasks: subtaskResults.length,
            successfulSubtasks: successfulSubtasks.length,
            failedSubtasks: subtaskResults.length - successfulSubtasks.length,
            successRate: Math.round((successfulSubtasks.length / subtaskResults.length) * 100),
            totalDuration,
            averageSubtaskDuration: Math.round(totalDuration / subtaskResults.length),
            checkpoints: subtaskResults.map(sr => sr.checkpoint)
        };
    }
    async resumeFromCheckpoint(taskId, checkpoint) {
        try {
            // チェックポイントから状態を復元
            const snapshot = await this.contextManager.loadContextSnapshot(taskId);
            if (!snapshot) {
                throw new Error(`チェックポイントが見つかりません: ${taskId}:${checkpoint}`);
            }
            // 中断されたタスクの情報を取得
            const intermediateResult = await this.contextManager.loadLatestResult(taskId);
            // 復元実行のロジック（簡略化）
            const resumeResult = {
                taskId,
                resumedFrom: checkpoint,
                timestamp: Date.now(),
                previousResult: intermediateResult
            };
            return {
                taskId,
                success: true,
                data: resumeResult,
                timestamp: Date.now(),
                duration: 0
            };
        }
        catch (error) {
            return {
                taskId,
                success: false,
                error: error instanceof Error ? error.message : '復元エラー',
                timestamp: Date.now(),
                duration: 0
            };
        }
    }
}
exports.LongRunningTaskManager = LongRunningTaskManager;
