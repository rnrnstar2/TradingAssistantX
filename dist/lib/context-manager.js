import { existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { writeYamlSafe, loadYamlSafe } from '../utils/yaml-utils';
export class ContextManager {
    dataCommunication;
    contextDir;
    statusDir;
    constructor(dataCommunication) {
        this.dataCommunication = dataCommunication;
        this.contextDir = join(dataCommunication.getDataDirectory(), 'contexts');
        this.statusDir = join(dataCommunication.getDataDirectory(), 'status');
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.contextDir, this.statusDir].forEach(dir => {
            if (!existsSync(dir)) {
                require('fs').mkdirSync(dir, { recursive: true });
            }
        });
    }
    async saveIntermediateResult(taskId, result, checkpoint) {
        try {
            const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const intermediateResult = {
                id: resultId,
                taskId,
                data: result,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24時間で期限切れ
            };
            await this.dataCommunication.saveIntermediateResult(intermediateResult);
            // チェックポイントも保存
            if (checkpoint) {
                await this.saveContextSnapshot(taskId, resultId, {}, checkpoint, 0);
            }
            return resultId;
        }
        catch (error) {
            console.error(`中間結果保存エラー (${taskId}):`, error);
            throw error;
        }
    }
    async loadIntermediateResults(taskIds) {
        try {
            const results = {};
            for (const taskId of taskIds) {
                const result = await this.loadLatestResult(taskId);
                if (result) {
                    results[taskId] = result;
                }
            }
            return results;
        }
        catch (error) {
            console.error(`中間結果読み込みエラー:`, error);
            return {};
        }
    }
    async loadLatestResult(taskId) {
        try {
            const result = await this.dataCommunication.readIntermediateResult(taskId);
            return result?.data || null;
        }
        catch (error) {
            console.error(`最新結果読み込みエラー (${taskId}):`, error);
            return null;
        }
    }
    async saveContextSnapshot(taskId, snapshotId, state, checkpoint, progress) {
        try {
            const snapshot = {
                id: snapshotId,
                taskId,
                timestamp: Date.now(),
                state,
                checkpoint,
                progress
            };
            const filename = `context-${taskId}-${snapshotId}.yaml`;
            const filePath = join(this.contextDir, filename);
            writeYamlSafe(filePath, snapshot);
        }
        catch (error) {
            console.error(`コンテキストスナップショット保存エラー:`, error);
            throw error;
        }
    }
    async loadContextSnapshot(taskId, snapshotId) {
        try {
            const pattern = snapshotId ? `context-${taskId}-${snapshotId}.yaml` : `context-${taskId}-`;
            const files = readdirSync(this.contextDir).filter(f => f.startsWith(pattern) && f.endsWith('.yaml'));
            if (files.length === 0) {
                return null;
            }
            // 最新のスナップショットを返す
            const latestFile = files.sort().pop();
            if (!latestFile) {
                return null;
            }
            const filePath = join(this.contextDir, latestFile);
            return loadYamlSafe(filePath);
        }
        catch (error) {
            console.error(`コンテキストスナップショット読み込みエラー:`, error);
            return null;
        }
    }
    async saveTaskStatus(status) {
        try {
            const filename = `status-${status.taskId}.yaml`;
            const filePath = join(this.statusDir, filename);
            writeYamlSafe(filePath, status);
        }
        catch (error) {
            console.error(`タスクステータス保存エラー:`, error);
            throw error;
        }
    }
    async loadTaskStatus(taskId) {
        try {
            const filename = `status-${taskId}.yaml`;
            const filePath = join(this.statusDir, filename);
            if (!existsSync(filePath)) {
                return null;
            }
            return loadYamlSafe(filePath);
        }
        catch (error) {
            console.error(`タスクステータス読み込みエラー:`, error);
            return null;
        }
    }
    async updateTaskStatus(taskId, updates) {
        try {
            const currentStatus = await this.loadTaskStatus(taskId);
            if (!currentStatus) {
                throw new Error(`タスクステータスが見つかりません: ${taskId}`);
            }
            const updatedStatus = {
                ...currentStatus,
                ...updates
            };
            await this.saveTaskStatus(updatedStatus);
        }
        catch (error) {
            console.error(`タスクステータス更新エラー:`, error);
            throw error;
        }
    }
    async mergeIntermediateResults(taskIds) {
        try {
            const results = await this.loadIntermediateResults(taskIds);
            // 複数の結果をマージ
            const merged = {};
            for (const [taskId, result] of Object.entries(results)) {
                if (result) {
                    merged[taskId] = result;
                }
            }
            return {
                mergedAt: Date.now(),
                tasks: taskIds,
                results: merged,
                summary: this.generateResultSummary(merged)
            };
        }
        catch (error) {
            console.error(`中間結果マージエラー:`, error);
            throw error;
        }
    }
    generateResultSummary(results) {
        const summary = {
            totalTasks: Object.keys(results).length,
            successfulTasks: 0,
            failedTasks: 0,
            types: {}
        };
        for (const [taskId, result] of Object.entries(results)) {
            if (result && result.success !== false) {
                summary.successfulTasks++;
            }
            else {
                summary.failedTasks++;
            }
            // タスクタイプの統計
            const taskType = result?.type || 'unknown';
            summary.types[taskType] = (summary.types[taskType] || 0) + 1;
        }
        return summary;
    }
    async cleanupOldContexts(maxAgeMs = 24 * 60 * 60 * 1000) {
        try {
            const now = Date.now();
            // コンテキストファイルのクリーンアップ
            const contextFiles = readdirSync(this.contextDir).filter(f => f.startsWith('context-') && f.endsWith('.yaml'));
            for (const file of contextFiles) {
                const filePath = join(this.contextDir, file);
                const context = loadYamlSafe(filePath);
                if (context && now - context.timestamp > maxAgeMs) {
                    unlinkSync(filePath);
                }
            }
            // ステータスファイルのクリーンアップ
            const statusFiles = readdirSync(this.statusDir).filter(f => f.startsWith('status-') && f.endsWith('.yaml'));
            for (const file of statusFiles) {
                const filePath = join(this.statusDir, file);
                const status = loadYamlSafe(filePath);
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    if (now - status.startTime > maxAgeMs) {
                        unlinkSync(filePath);
                    }
                }
            }
            // 中間結果のクリーンアップ
            await this.dataCommunication.cleanupExpiredResults();
        }
        catch (error) {
            console.error('コンテキストクリーンアップエラー:', error);
        }
    }
    async getTaskProgress(taskId) {
        try {
            const status = await this.loadTaskStatus(taskId);
            return status?.progress || 0;
        }
        catch (error) {
            console.error(`タスク進捗取得エラー:`, error);
            return 0;
        }
    }
    async getAllActiveTaskStatuses() {
        try {
            const statusFiles = readdirSync(this.statusDir).filter(f => f.startsWith('status-') && f.endsWith('.yaml'));
            const activeStatuses = [];
            for (const file of statusFiles) {
                const filePath = join(this.statusDir, file);
                const status = loadYamlSafe(filePath);
                if (status && (status.status === 'running' || status.status === 'pending')) {
                    activeStatuses.push(status);
                }
            }
            return activeStatuses;
        }
        catch (error) {
            console.error('アクティブタスク取得エラー:', error);
            return [];
        }
    }
    async isTaskComplete(taskId) {
        try {
            const status = await this.loadTaskStatus(taskId);
            return status?.status === 'completed' || false;
        }
        catch (error) {
            console.error(`タスク完了確認エラー:`, error);
            return false;
        }
    }
    async getTaskResult(taskId) {
        try {
            const isComplete = await this.isTaskComplete(taskId);
            if (!isComplete) {
                return null;
            }
            return await this.loadLatestResult(taskId);
        }
        catch (error) {
            console.error(`タスク結果取得エラー:`, error);
            return null;
        }
    }
}
