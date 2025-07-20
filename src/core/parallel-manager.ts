import { ClaudeControlledCollector } from '../lib/claude-controlled-collector.js';
import { GrowthSystemManager } from '../lib/growth-system-manager.js';
import { PostingManager } from '../lib/posting-manager.js';
import type { Action, Result, Task } from '../types/autonomous-system.js';

export class ParallelManager {
  private collector: ClaudeControlledCollector;
  private growthManager: GrowthSystemManager;
  private postingManager: PostingManager;

  constructor() {
    this.collector = new ClaudeControlledCollector();
    this.growthManager = new GrowthSystemManager();
    // PostingManager requires API key from environment
    const apiKey = process.env.X_API_KEY || '';
    this.postingManager = new PostingManager(apiKey);
  }

  async executeActions(actions: Action[]): Promise<Result[]> {
    const tasks = actions.map(action => this.convertActionToTask(action));
    
    const validTasks = tasks.filter((task): task is Task => task !== null);
    
    return await this.executeInParallel(validTasks);
  }

  async executeInParallel(tasks: Task[]): Promise<Result[]> {
    await this.initializeDataSharing(tasks);
    
    const results = await Promise.allSettled(
      tasks.map(task => this.executeWithDataSharing(task))
    );
    
    return this.integrateResults(results, tasks);
  }

  private convertActionToTask(action: Action): Task | null {
    const taskExecutors: Record<string, () => Promise<any>> = {
      'content_collection': () => this.executeContentCollection(action),
      'post_immediate': () => this.executePostImmediate(action),
      'performance_analysis': () => this.executePerformanceAnalysis(action),
      'timing_optimization': () => this.executeTimingOptimization(action),
      'data_cleanup': () => this.executeDataCleanup(action)
    };
    
    const executor = taskExecutors[action.type];
    if (!executor) return null;
    
    return {
      id: action.id,
      actionId: action.id,
      type: action.type,
      priority: action.priority,
      executor,
      status: 'pending',
      createdAt: action.createdAt
    };
  }

  private async executeContentCollection(action: Action): Promise<any> {
    // ClaudeControlledCollector doesn't have parameters - it explores autonomously
    return await this.collector.exploreAutonomously();
  }

  private async executePostImmediate(action: Action): Promise<any> {
    const params = action.params || {};
    
    if (params.content) {
      return await this.postingManager.postNow(params.content);
    }
    
    // Generate content using Claude
    const prompt = `
Generate a valuable educational post about trading or investing.
Focus on risk management, market analysis, or investment psychology.
Keep it under 280 characters.
Write in Japanese.
`;
    
    try {
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      const content = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();
        
      if (content) {
        return await this.postingManager.postNow(content);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
    }
    
    return null;
  }

  private async executePerformanceAnalysis(action: Action): Promise<any> {
    // Get post history from posting manager for analysis
    const stats = this.postingManager.getPostingStats();
    const mockHistory: any[] = []; // GrowthSystemManager expects PostHistory[]
    return await this.growthManager.analyzePerformance(mockHistory);
  }

  private async executeTimingOptimization(action: Action): Promise<any> {
    // Use optimizeStrategy which includes timing optimization
    return await this.growthManager.optimizeStrategy();
  }

  private async executeDataCleanup(action: Action): Promise<any> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const dataDir = path.join(process.cwd(), 'data');
    const maxAge = action.params?.maxAgeHours || 24;
    
    const cleanupTargets = [
      'context/execution-history.json',
      'decisions/strategic-decisions.yaml',
      'communication/claude-to-claude.json'
    ];
    
    for (const target of cleanupTargets) {
      try {
        const filePath = path.join(dataDir, target);
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        if (Array.isArray(parsed)) {
          const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000);
          const filtered = parsed.filter((item: any) => {
            const timestamp = new Date(item.timestamp || item.createdAt);
            return timestamp > cutoff;
          });
          
          await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
        }
      } catch (error) {
        console.error(`Cleanup failed for ${target}:`, error);
      }
    }
    
    return { cleaned: cleanupTargets.length };
  }

  private async executeWithDataSharing(task: Task): Promise<any> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const statusPath = path.join(process.cwd(), 'data', 'communication', 'execution-status.json');
    
    try {
      const statusData = {
        taskId: task.id,
        type: task.type,
        status: 'running',
        startedAt: new Date().toISOString()
      };
      
      let statuses = [];
      try {
        const existing = await fs.readFile(statusPath, 'utf-8');
        statuses = JSON.parse(existing);
      } catch {
        // File doesn't exist
      }
      
      statuses.push(statusData);
      
      await fs.mkdir(path.dirname(statusPath), { recursive: true });
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      const result = await task.executor();
      
      const completedStatus = {
        ...statusData,
        status: 'completed',
        completedAt: new Date().toISOString(),
        resultSummary: this.summarizeResult(result)
      };
      
      statuses = statuses.map((s: any) => 
        s.taskId === task.id ? completedStatus : s
      );
      
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      return result;
    } catch (error) {
      const errorStatus = {
        taskId: task.id,
        type: task.type,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString()
      };
      
      let statuses = [];
      try {
        const existing = await fs.readFile(statusPath, 'utf-8');
        statuses = JSON.parse(existing);
      } catch {
        // File doesn't exist
      }
      
      statuses = statuses.map((s: any) => 
        s.taskId === task.id ? errorStatus : s
      );
      
      await fs.writeFile(statusPath, JSON.stringify(statuses, null, 2));
      
      throw error;
    }
  }

  private integrateResults(
    results: PromiseSettledResult<any>[],
    tasks: Task[]
  ): Result[] {
    return results.map((result, index) => {
      const task = tasks[index];
      
      if (result.status === 'fulfilled') {
        return {
          id: `result-${task.id}`,
          taskId: task.id,
          actionId: task.actionId,
          status: 'success',
          data: result.value,
          completedAt: new Date().toISOString()
        };
      } else {
        return {
          id: `result-${task.id}`,
          taskId: task.id,
          actionId: task.actionId,
          status: 'failed',
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          completedAt: new Date().toISOString()
        };
      }
    });
  }

  private async initializeDataSharing(tasks: Task[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const communicationPath = path.join(process.cwd(), 'data', 'communication', 'claude-to-claude.json');
    
    const initData = {
      sessionId: `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      plannedTasks: tasks.map(t => ({
        id: t.id,
        type: t.type,
        priority: t.priority
      }))
    };
    
    await fs.mkdir(path.dirname(communicationPath), { recursive: true });
    await fs.writeFile(communicationPath, JSON.stringify(initData, null, 2));
  }

  private summarizeResult(result: any): any {
    if (!result) return null;
    
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      if (keys.length > 5) {
        return {
          _summary: 'large_object',
          keyCount: keys.length,
          sampleKeys: keys.slice(0, 5)
        };
      }
      return result;
    }
    
    if (typeof result === 'string' && result.length > 200) {
      return {
        _summary: 'long_string',
        length: result.length,
        preview: result.substring(0, 100) + '...'
      };
    }
    
    return result;
  }
}