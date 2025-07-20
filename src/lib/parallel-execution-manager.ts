import { Task, TaskResult, ParallelTaskGroup } from '../types/index';
import { DataCommunicationSystem } from './data-communication-system';
import { ContextManager } from './context-manager';
import { GrowthSystemManager } from './growth-system-manager';
import { PostingManager } from './posting-manager';
import { ClaudeControlledCollector } from './claude-controlled-collector';

export interface ExecutionPlan {
  parallelGroups: ParallelTaskGroup[];
  sequentialTasks: Task[];
  estimatedDuration: number;
}

export class ParallelExecutionManager {
  private dataCommunication: DataCommunicationSystem;
  private contextManager: ContextManager;
  private growthSystemManager: GrowthSystemManager;
  private postingManager: PostingManager;
  private claudeCollector: ClaudeControlledCollector;

  constructor(
    dataCommunication: DataCommunicationSystem,
    contextManager: ContextManager,
    growthSystemManager: GrowthSystemManager,
    postingManager: PostingManager,
    claudeCollector: ClaudeControlledCollector
  ) {
    this.dataCommunication = dataCommunication;
    this.contextManager = contextManager;
    this.growthSystemManager = growthSystemManager;
    this.postingManager = postingManager;
    this.claudeCollector = claudeCollector;
  }

  async orchestrateParallelTasks(tasks: Task[]): Promise<TaskResult[]> {
    try {
      // 並列実行可能なタスクを識別
      const { parallelTasks, sequentialTasks } = this.identifyParallelTasks(tasks);
      
      // 並列実行グループを作成
      const parallelGroups = this.createParallelGroups(parallelTasks);
      
      const results: TaskResult[] = [];

      // 並列実行
      for (const group of parallelGroups) {
        const groupResults = await this.executeParallelGroup(group);
        results.push(...groupResults);
      }

      // 順次実行
      for (const task of sequentialTasks) {
        const result = await this.executeWithTimeout(task, task.timeout || 30000);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('並列実行オーケストレーションエラー:', error);
      throw error;
    }
  }

  private identifyParallelTasks(tasks: Task[]): {
    parallelTasks: Task[];
    sequentialTasks: Task[];
  } {
    const parallelTasks = tasks.filter(task => 
      !task.dependencies || task.dependencies.length === 0
    );
    
    const sequentialTasks = tasks.filter(task => 
      task.dependencies && task.dependencies.length > 0
    );

    return { parallelTasks, sequentialTasks };
  }

  private createParallelGroups(tasks: Task[]): ParallelTaskGroup[] {
    const groups: ParallelTaskGroup[] = [];
    
    // 優先度とタイプでグループ化
    const highPriorityTasks = tasks.filter(t => t.priority === 'high');
    const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
    const lowPriorityTasks = tasks.filter(t => t.priority === 'low');

    if (highPriorityTasks.length > 0) {
      groups.push({
        id: `high-priority-${Date.now()}`,
        tasks: highPriorityTasks,
        strategy: 'all',
        timeout: 30000
      });
    }

    if (mediumPriorityTasks.length > 0) {
      groups.push({
        id: `medium-priority-${Date.now()}`,
        tasks: mediumPriorityTasks,
        strategy: 'settled',
        timeout: 60000
      });
    }

    if (lowPriorityTasks.length > 0) {
      groups.push({
        id: `low-priority-${Date.now()}`,
        tasks: lowPriorityTasks,
        strategy: 'settled',
        timeout: 90000
      });
    }

    return groups;
  }

  private async executeParallelGroup(group: ParallelTaskGroup): Promise<TaskResult[]> {
    try {
      const promises = group.tasks.map(task => 
        this.executeWithTimeout(task, task.timeout || group.timeout || 30000)
      );

      let results: TaskResult[];

      switch (group.strategy) {
        case 'all':
          results = await Promise.all(promises);
          break;
        case 'race':
          const winner = await Promise.race(promises);
          results = [winner];
          break;
        case 'settled':
        default:
          const settled = await Promise.allSettled(promises);
          results = settled.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              return this.createErrorResult(group.tasks[index], result.reason);
            }
          });
          break;
      }

      return results;
    } catch (error) {
      console.error(`並列グループ実行エラー (${group.id}):`, error);
      return group.tasks.map(task => this.createErrorResult(task, error));
    }
  }

  async executeWithTimeout(task: Task, timeout: number): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`タスクタイムアウト: ${task.name}`)), timeout);
      });

      const taskPromise = this.executeTask(task);
      const result = await Promise.race([taskPromise, timeoutPromise]);

      return {
        taskId: task.id,
        success: true,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  private async executeTask(task: Task): Promise<any> {
    // タスクステータスの初期化
    await this.contextManager.saveTaskStatus({
      id: Date.now().toString(),
      taskId: task.id,
      status: 'running',
      startTime: Date.now()
    });

    // タスクタイプに応じて適切なコンポーネントで実行
    switch (task.type) {
      case 'collect':
        return await this.executeCollectTask(task);
      case 'analyze':
        return await this.executeAnalyzeTask(task);
      case 'post':
        return await this.executePostTask(task);
      case 'strategy':
        return await this.executeStrategyTask(task);
      default:
        throw new Error(`未知のタスクタイプ: ${task.type}`);
    }
  }

  private async executeCollectTask(task: Task): Promise<any> {
    try {
      const result = await this.claudeCollector.exploreAutonomously();
      
      // 結果を保存
      await this.contextManager.saveIntermediateResult(
        task.id,
        result,
        'collection_completed'
      );

      // ステータス更新
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'completed',
        endTime: Date.now()
      });

      return result;
    } catch (error) {
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'failed',
        endTime: Date.now(),
        error: error instanceof Error ? error.message : '不明なエラー'
      });
      throw error;
    }
  }

  private async executeAnalyzeTask(task: Task): Promise<any> {
    try {
      // 戦略分析を実行
      const updates = await this.growthSystemManager.optimizeStrategy();
      
      // 結果を保存
      await this.contextManager.saveIntermediateResult(
        task.id,
        updates,
        'analysis_completed'
      );

      // ステータス更新
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'completed',
        endTime: Date.now()
      });

      return updates;
    } catch (error) {
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'failed',
        endTime: Date.now(),
        error: error instanceof Error ? error.message : '不明なエラー'
      });
      throw error;
    }
  }

  private async executePostTask(task: Task): Promise<any> {
    try {
      const content = task.config?.content;
      if (!content) {
        throw new Error('投稿内容が指定されていません');
      }

      const result = await this.postingManager.postNow(content);
      
      // 結果を保存
      await this.contextManager.saveIntermediateResult(
        task.id,
        result,
        'post_completed'
      );

      // ステータス更新
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'completed',
        endTime: Date.now()
      });

      return result;
    } catch (error) {
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'failed',
        endTime: Date.now(),
        error: error instanceof Error ? error.message : '不明なエラー'
      });
      throw error;
    }
  }

  private async executeStrategyTask(task: Task): Promise<any> {
    try {
      // 戦略更新を実行
      const strategy = this.growthSystemManager.getCurrentStrategy();
      const context = this.growthSystemManager.getContextSummary();
      
      const result = {
        strategy,
        context,
        timestamp: Date.now()
      };

      // 結果を保存
      await this.contextManager.saveIntermediateResult(
        task.id,
        result,
        'strategy_updated'
      );

      // ステータス更新
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'completed',
        endTime: Date.now()
      });

      return result;
    } catch (error) {
      await this.contextManager.updateTaskStatus(task.id, {
        status: 'failed',
        endTime: Date.now(),
        error: error instanceof Error ? error.message : '不明なエラー'
      });
      throw error;
    }
  }

  private createErrorResult(task: Task, error: any): TaskResult {
    return {
      taskId: task.id,
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      timestamp: Date.now(),
      duration: 0
    };
  }

  async createExecutionPlan(tasks: Task[]): Promise<ExecutionPlan> {
    const { parallelTasks, sequentialTasks } = this.identifyParallelTasks(tasks);
    const parallelGroups = this.createParallelGroups(parallelTasks);
    
    // 推定実行時間の計算
    const parallelDuration = Math.max(...parallelGroups.map(g => g.timeout || 30000));
    const sequentialDuration = sequentialTasks.reduce((sum, task) => sum + (task.timeout || 30000), 0);
    const estimatedDuration = parallelDuration + sequentialDuration;

    return {
      parallelGroups,
      sequentialTasks,
      estimatedDuration
    };
  }

  async getExecutionStatus(): Promise<{
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalTasks: number;
  }> {
    const activeStatuses = await this.contextManager.getAllActiveTaskStatuses();
    const activeTasks = activeStatuses.filter(s => s.status === 'running').length;
    const completedTasks = activeStatuses.filter(s => s.status === 'completed').length;
    const failedTasks = activeStatuses.filter(s => s.status === 'failed').length;
    const totalTasks = activeStatuses.length;

    return {
      activeTasks,
      completedTasks,
      failedTasks,
      totalTasks
    };
  }
}