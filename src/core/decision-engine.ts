import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Context, Decision, Need, Action } from '../types/autonomous-system.js';
import * as yaml from 'js-yaml';

export class DecisionEngine {
  constructor() {
    // Claude Code SDK is used directly
  }

  async analyzeAndDecide(context: Context): Promise<Decision[]> {
    const sharedContext = await this.loadSharedContext();
    
    const decisions = await this.makeStrategicDecisions(context, sharedContext);
    
    await this.saveDecisions(decisions);
    
    return decisions;
  }

  async planActions(needs: Need[]): Promise<Action[]> {
    const decisions = await this.prioritizeNeeds(needs);
    
    const actions: Action[] = [];
    
    for (const decision of decisions) {
      const action = await this.convertDecisionToAction(decision);
      if (action) {
        actions.push(action);
      }
    }
    
    return actions;
  }

  private async makeStrategicDecisions(
    context: Context,
    sharedContext: any
  ): Promise<Decision[]> {
    const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Shared insights:
${JSON.stringify(sharedContext, null, 2)}

Make strategic decisions for the autonomous system.
Consider:
1. Content collection strategy
2. Posting timing and frequency
3. Resource allocation
4. System optimization needs

Return as JSON array of decisions with priority levels.
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

  private async prioritizeNeeds(needs: Need[]): Promise<Decision[]> {
    const prompt = `
Current needs:
${JSON.stringify(needs, null, 2)}

Prioritize these needs and convert them to actionable decisions.
Consider urgency, impact, and resource requirements.

Return as JSON array of decisions ordered by priority.
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

  private async convertDecisionToAction(decision: Decision): Promise<Action | null> {
    const actionType = this.mapDecisionToActionType(decision);
    
    if (!actionType) return null;
    
    return {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: actionType,
      priority: decision.priority,
      params: decision.params || {},
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  private mapDecisionToActionType(decision: Decision): string | null {
    const typeMapping: Record<string, string> = {
      'collect_content': 'content_collection',
      'immediate_post': 'post_immediate',
      'analyze_performance': 'performance_analysis',
      'optimize_timing': 'timing_optimization',
      'clean_data': 'data_cleanup'
    };
    
    return typeMapping[decision.type] || null;
  }

  private async loadSharedContext(): Promise<any> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const insightsPath = path.join(process.cwd(), 'data', 'context', 'shared-insights.yaml');
    
    try {
      const data = await fs.readFile(insightsPath, 'utf-8');
      return yaml.load(data) as any;
    } catch {
      return {
        lastUpdated: new Date().toISOString(),
        insights: [],
        patterns: {},
        recommendations: []
      };
    }
  }

  private async saveDecisions(decisions: Decision[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const decisionsPath = path.join(process.cwd(), 'data', 'decisions', 'strategic-decisions.yaml');
    
    let history = [];
    try {
      const data = await fs.readFile(decisionsPath, 'utf-8');
      history = yaml.load(data) as any[];
    } catch {
      // File doesn't exist yet
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      decisions: decisions
    });
    
    // Keep only last 50 decision sets
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    await fs.mkdir(path.dirname(decisionsPath), { recursive: true });
    await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
  }
}