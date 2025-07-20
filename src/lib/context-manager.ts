import { TaskResult, IntermediateResult, AsyncTaskStatus } from '../types/index';
import { DataCommunicationSystem } from './data-communication-system';
import { existsSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface ContextSnapshot {
  id: string;
  taskId: string;
  timestamp: number;
  state: Record<string, any>;
  checkpoint: string;
  progress: number;
}

export class ContextManager {
  private dataCommunication: DataCommunicationSystem;
  private contextDir: string;
  private statusDir: string;

  constructor(dataCommunication: DataCommunicationSystem) {
    this.dataCommunication = dataCommunication;
    this.contextDir = join(dataCommunication.getDataDirectory(), 'contexts');
    this.statusDir = join(dataCommunication.getDataDirectory(), 'status');
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.contextDir, this.statusDir].forEach(dir => {
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
    });
  }

  async saveIntermediateResult(taskId: string, result: any, checkpoint?: string): Promise<string> {
    try {
      const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const intermediateResult: IntermediateResult = {
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
    } catch (error) {
      console.error(`中間結果保存エラー (${taskId}):`, error);
      throw error;
    }
  }

  async loadIntermediateResults(taskIds: string[]): Promise<Record<string, any>> {
    try {
      const results: Record<string, any> = {};
      
      for (const taskId of taskIds) {
        const result = await this.loadLatestResult(taskId);
        if (result) {
          results[taskId] = result;
        }
      }
      
      return results;
    } catch (error) {
      console.error(`中間結果読み込みエラー:`, error);
      return {};
    }
  }

  async loadLatestResult(taskId: string): Promise<any> {
    try {
      const result = await this.dataCommunication.readIntermediateResult(taskId);
      return result?.data || null;
    } catch (error) {
      console.error(`最新結果読み込みエラー (${taskId}):`, error);
      return null;
    }
  }

  async saveContextSnapshot(
    taskId: string,
    snapshotId: string,
    state: Record<string, any>,
    checkpoint: string,
    progress: number
  ): Promise<void> {
    try {
      const snapshot: ContextSnapshot = {
        id: snapshotId,
        taskId,
        timestamp: Date.now(),
        state,
        checkpoint,
        progress
      };

      const filename = `context-${taskId}-${snapshotId}.json`;
      const filePath = join(this.contextDir, filename);
      writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (error) {
      console.error(`コンテキストスナップショット保存エラー:`, error);
      throw error;
    }
  }

  async loadContextSnapshot(taskId: string, snapshotId?: string): Promise<ContextSnapshot | null> {
    try {
      const pattern = snapshotId ? `context-${taskId}-${snapshotId}.json` : `context-${taskId}-`;
      const files = readdirSync(this.contextDir).filter(f => f.startsWith(pattern));
      
      if (files.length === 0) {
        return null;
      }
      
      // 最新のスナップショットを返す
      const latestFile = files.sort().pop();
      if (!latestFile) {
        return null;
      }
      
      const filePath = join(this.contextDir, latestFile);
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`コンテキストスナップショット読み込みエラー:`, error);
      return null;
    }
  }

  async saveTaskStatus(status: AsyncTaskStatus): Promise<void> {
    try {
      const filename = `status-${status.taskId}.json`;
      const filePath = join(this.statusDir, filename);
      writeFileSync(filePath, JSON.stringify(status, null, 2), 'utf8');
    } catch (error) {
      console.error(`タスクステータス保存エラー:`, error);
      throw error;
    }
  }

  async loadTaskStatus(taskId: string): Promise<AsyncTaskStatus | null> {
    try {
      const filename = `status-${taskId}.json`;
      const filePath = join(this.statusDir, filename);
      
      if (!existsSync(filePath)) {
        return null;
      }
      
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`タスクステータス読み込みエラー:`, error);
      return null;
    }
  }

  async updateTaskStatus(
    taskId: string,
    updates: Partial<AsyncTaskStatus>
  ): Promise<void> {
    try {
      const currentStatus = await this.loadTaskStatus(taskId);
      if (!currentStatus) {
        throw new Error(`タスクステータスが見つかりません: ${taskId}`);
      }

      const updatedStatus: AsyncTaskStatus = {
        ...currentStatus,
        ...updates
      };

      await this.saveTaskStatus(updatedStatus);
    } catch (error) {
      console.error(`タスクステータス更新エラー:`, error);
      throw error;
    }
  }

  async mergeIntermediateResults(taskIds: string[]): Promise<any> {
    try {
      const results = await this.loadIntermediateResults(taskIds);
      
      // 複数の結果をマージ
      const merged: Record<string, any> = {};
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
    } catch (error) {
      console.error(`中間結果マージエラー:`, error);
      throw error;
    }
  }

  private generateResultSummary(results: Record<string, any>): Record<string, any> {
    const summary: Record<string, any> = {
      totalTasks: Object.keys(results).length,
      successfulTasks: 0,
      failedTasks: 0,
      types: {}
    };

    for (const [taskId, result] of Object.entries(results)) {
      if (result && result.success !== false) {
        summary.successfulTasks++;
      } else {
        summary.failedTasks++;
      }

      // タスクタイプの統計
      const taskType = result?.type || 'unknown';
      summary.types[taskType] = (summary.types[taskType] || 0) + 1;
    }

    return summary;
  }

  async cleanupOldContexts(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      
      // コンテキストファイルのクリーンアップ
      const contextFiles = readdirSync(this.contextDir).filter(f => f.startsWith('context-'));
      for (const file of contextFiles) {
        const filePath = join(this.contextDir, file);
        const content = readFileSync(filePath, 'utf8');
        const context: ContextSnapshot = JSON.parse(content);
        
        if (now - context.timestamp > maxAgeMs) {
          unlinkSync(filePath);
        }
      }

      // ステータスファイルのクリーンアップ
      const statusFiles = readdirSync(this.statusDir).filter(f => f.startsWith('status-'));
      for (const file of statusFiles) {
        const filePath = join(this.statusDir, file);
        const content = readFileSync(filePath, 'utf8');
        const status: AsyncTaskStatus = JSON.parse(content);
        
        if (status.status === 'completed' || status.status === 'failed') {
          if (now - status.startTime > maxAgeMs) {
            unlinkSync(filePath);
          }
        }
      }

      // 中間結果のクリーンアップ
      await this.dataCommunication.cleanupExpiredResults();
    } catch (error) {
      console.error('コンテキストクリーンアップエラー:', error);
    }
  }

  async getTaskProgress(taskId: string): Promise<number> {
    try {
      const status = await this.loadTaskStatus(taskId);
      return status?.progress || 0;
    } catch (error) {
      console.error(`タスク進捗取得エラー:`, error);
      return 0;
    }
  }

  async getAllActiveTaskStatuses(): Promise<AsyncTaskStatus[]> {
    try {
      const statusFiles = readdirSync(this.statusDir).filter(f => f.startsWith('status-'));
      const activeStatuses: AsyncTaskStatus[] = [];
      
      for (const file of statusFiles) {
        const filePath = join(this.statusDir, file);
        const content = readFileSync(filePath, 'utf8');
        const status: AsyncTaskStatus = JSON.parse(content);
        
        if (status.status === 'running' || status.status === 'pending') {
          activeStatuses.push(status);
        }
      }
      
      return activeStatuses;
    } catch (error) {
      console.error('アクティブタスク取得エラー:', error);
      return [];
    }
  }

  async isTaskComplete(taskId: string): Promise<boolean> {
    try {
      const status = await this.loadTaskStatus(taskId);
      return status?.status === 'completed' || false;
    } catch (error) {
      console.error(`タスク完了確認エラー:`, error);
      return false;
    }
  }

  async getTaskResult(taskId: string): Promise<any> {
    try {
      const isComplete = await this.isTaskComplete(taskId);
      if (!isComplete) {
        return null;
      }
      
      return await this.loadLatestResult(taskId);
    } catch (error) {
      console.error(`タスク結果取得エラー:`, error);
      return null;
    }
  }
}