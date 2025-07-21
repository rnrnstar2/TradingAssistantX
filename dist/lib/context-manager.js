"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class ContextManager {
    dataCommunication;
    contextDir;
    statusDir;
    constructor(dataCommunication) {
        this.dataCommunication = dataCommunication;
        this.contextDir = (0, path_1.join)(dataCommunication.getDataDirectory(), 'contexts');
        this.statusDir = (0, path_1.join)(dataCommunication.getDataDirectory(), 'status');
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.contextDir, this.statusDir].forEach(dir => {
            if (!(0, fs_1.existsSync)(dir)) {
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
            const filename = `context-${taskId}-${snapshotId}.json`;
            const filePath = (0, path_1.join)(this.contextDir, filename);
            (0, fs_1.writeFileSync)(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`コンテキストスナップショット保存エラー:`, error);
            throw error;
        }
    }
    async loadContextSnapshot(taskId, snapshotId) {
        try {
            const pattern = snapshotId ? `context-${taskId}-${snapshotId}.json` : `context-${taskId}-`;
            const files = (0, fs_1.readdirSync)(this.contextDir).filter(f => f.startsWith(pattern));
            if (files.length === 0) {
                return null;
            }
            // 最新のスナップショットを返す
            const latestFile = files.sort().pop();
            if (!latestFile) {
                return null;
            }
            const filePath = (0, path_1.join)(this.contextDir, latestFile);
            const content = (0, fs_1.readFileSync)(filePath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error(`コンテキストスナップショット読み込みエラー:`, error);
            return null;
        }
    }
    async saveTaskStatus(status) {
        try {
            const filename = `status-${status.taskId}.json`;
            const filePath = (0, path_1.join)(this.statusDir, filename);
            (0, fs_1.writeFileSync)(filePath, JSON.stringify(status, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`タスクステータス保存エラー:`, error);
            throw error;
        }
    }
    async loadTaskStatus(taskId) {
        try {
            const filename = `status-${taskId}.json`;
            const filePath = (0, path_1.join)(this.statusDir, filename);
            if (!(0, fs_1.existsSync)(filePath)) {
                return null;
            }
            const content = (0, fs_1.readFileSync)(filePath, 'utf8');
            return JSON.parse(content);
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
            const contextFiles = (0, fs_1.readdirSync)(this.contextDir).filter(f => f.startsWith('context-'));
            for (const file of contextFiles) {
                const filePath = (0, path_1.join)(this.contextDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const context = JSON.parse(content);
                if (now - context.timestamp > maxAgeMs) {
                    (0, fs_1.unlinkSync)(filePath);
                }
            }
            // ステータスファイルのクリーンアップ
            const statusFiles = (0, fs_1.readdirSync)(this.statusDir).filter(f => f.startsWith('status-'));
            for (const file of statusFiles) {
                const filePath = (0, path_1.join)(this.statusDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const status = JSON.parse(content);
                if (status.status === 'completed' || status.status === 'failed') {
                    if (now - status.startTime > maxAgeMs) {
                        (0, fs_1.unlinkSync)(filePath);
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
            const statusFiles = (0, fs_1.readdirSync)(this.statusDir).filter(f => f.startsWith('status-'));
            const activeStatuses = [];
            for (const file of statusFiles) {
                const filePath = (0, path_1.join)(this.statusDir, file);
                const content = (0, fs_1.readFileSync)(filePath, 'utf8');
                const status = JSON.parse(content);
                if (status.status === 'running' || status.status === 'pending') {
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
exports.ContextManager = ContextManager;
