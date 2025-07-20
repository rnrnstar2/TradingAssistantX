import { DecisionEngine } from './decision-engine.js';
import { ParallelManager } from './parallel-manager.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Need, Action, Context } from '../types/autonomous-system.js';

export class AutonomousExecutor {
  private decisionEngine: DecisionEngine;
  private parallelManager: ParallelManager;

  constructor() {
    this.decisionEngine = new DecisionEngine();
    this.parallelManager = new ParallelManager();
  }

  async executeAutonomously(): Promise<void> {
    try {
      const context = await this.loadCurrentContext();
      
      const needs = await this.assessCurrentNeeds(context);
      
      const actions = await this.decisionEngine.planActions(needs);
      
      await this.parallelManager.executeActions(actions);
      
      await this.saveExecutionResults(actions);
    } catch (error) {
      console.error('Autonomous execution error:', error);
      await this.handleExecutionError(error);
    }
  }

  private async assessCurrentNeeds(context: Context): Promise<Need[]> {
    const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Analyze the current situation and identify what needs to be done.
Consider:
1. Content collection needs
2. Immediate posting opportunities
3. System maintenance requirements
4. Performance optimizations

Return as JSON array of needs.
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();

      return JSON.parse(response);
    } catch {
      return [];
    }
  }

  async determineNextExecutionTime(): Promise<number> {
    const context = await this.loadCurrentContext();
    
    const prompt = `
Based on current context:
${JSON.stringify(context, null, 2)}

Determine optimal wait time before next execution (in milliseconds).
Consider system load, pending tasks, and efficiency.
Return a number between 30000 (30 seconds) and 600000 (10 minutes).
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();

      const waitTime = parseInt(response);
      return isNaN(waitTime) ? 60000 : Math.max(30000, Math.min(600000, waitTime));
    } catch {
      return 60000; // Default to 1 minute
    }
  }

  private async loadCurrentContext(): Promise<Context> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const contextPath = path.join(process.cwd(), 'data', 'context', 'current-situation.json');
    
    try {
      const data = await fs.readFile(contextPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        timestamp: new Date().toISOString(),
        systemStatus: 'initializing',
        recentActions: [],
        pendingTasks: []
      };
    }
  }

  private async saveExecutionResults(actions: Action[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const historyPath = path.join(process.cwd(), 'data', 'context', 'execution-history.json');
    
    let history = [];
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      actions: actions.map(a => ({
        type: a.type,
        status: a.status,
        result: a.result
      }))
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  }

  private async handleExecutionError(error: unknown): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const errorPath = path.join(process.cwd(), 'data', 'context', 'error-log.json');
    
    let errors = [];
    try {
      const data = await fs.readFile(errorPath, 'utf-8');
      errors = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    errors.push({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors = errors.slice(-50);
    }
    
    await fs.mkdir(path.dirname(errorPath), { recursive: true });
    await fs.writeFile(errorPath, JSON.stringify(errors, null, 2));
  }
}