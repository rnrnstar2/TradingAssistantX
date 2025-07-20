import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Context, Decision, Need, Action } from '../types/autonomous-system.js';
import { loadYamlSafe, loadYamlArraySafe } from '../utils/yaml-utils';
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

Convert these needs to actionable decisions with the following EXACT JSON structure.
Each decision MUST include all required fields:

REQUIRED DECISION FORMAT:
{
  "id": "decision-[timestamp]-[random]",
  "type": "[one of: collect_content, immediate_post, analyze_performance, optimize_timing, clean_data, strategy_shift, content_generation, posting_schedule]",
  "priority": "[one of: critical, high, medium, low]",
  "reasoning": "explanation of why this decision was made",
  "params": {},
  "dependencies": [],
  "estimatedDuration": [number in minutes]
}

Return ONLY a JSON array of decision objects. No markdown, no explanation.
Example: [{"id":"decision-123-abc","type":"content_generation","priority":"high","reasoning":"Need fresh content","params":{},"dependencies":[],"estimatedDuration":30}]
`;

    let response = '';
    try {
      response = await claude()
        .withModel('sonnet')
        .query(prompt)
        .asText();

      // 🔥 CRITICAL: Claude応答内容をログ出力
      console.log('🔍 Claude raw response:', response);

      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      
      console.log('🔍 Extracted JSON text:', jsonText);
      
      const decisions = JSON.parse(jsonText);
      console.log('🔍 Parsed decisions:', JSON.stringify(decisions, null, 2));
      
      // 各decision.typeを検証
      decisions.forEach((decision: any, index: number) => {
        console.log(`🔍 Decision ${index}: type="${decision.type}", id="${decision.id}"`);
      });
      
      return decisions;
    } catch (error) {
      console.error('❌ prioritizeNeeds JSON parse error:', error);
      console.error('❌ Raw response was:', response);
      return [];
    }
  }

  private async convertDecisionToAction(decision: Decision): Promise<Action | null> {
    const actionType = this.mapDecisionToActionType(decision);
    
    // 🔥 CRITICAL: デバッグログ追加
    if (!actionType) {
      console.log(`❌ Unknown decision type: "${decision.type}" - Available types:`, 
        Object.keys(this.getTypeMappingForDebug()));
      return null;
    }
    
    console.log(`✅ Mapped decision "${decision.type}" to action "${actionType}"`);
    
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
      'clean_data': 'data_cleanup',
      // 🔥 CRITICAL: 実際に使用されているtypeを追加
      'strategy_shift': 'strategy_optimization',
      'content_generation': 'content_creation',
      'posting_schedule': 'schedule_optimization'
    };
    
    return typeMapping[decision.type] || null;
  }

  private async loadSharedContext(): Promise<any> {
    const path = (await import('path')).default;
    
    const insightsPath = path.join(process.cwd(), 'data', 'context', 'shared-insights.yaml');
    
    const result = loadYamlSafe<any>(insightsPath);
    if (result !== null) {
      return result;
    }
    
    return {
      lastUpdated: new Date().toISOString(),
      insights: [],
      patterns: {},
      recommendations: []
    };
  }

  private async saveDecisions(decisions: Decision[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    
    const decisionsPath = path.join(process.cwd(), 'data', 'strategic-decisions.yaml');
    
    let history = loadYamlArraySafe<any>(decisionsPath);
    
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

  // デバッグ用ヘルパー関数追加
  private getTypeMappingForDebug(): Record<string, string> {
    return {
      'collect_content': 'content_collection',
      'immediate_post': 'post_immediate',
      'analyze_performance': 'performance_analysis',
      'optimize_timing': 'timing_optimization',
      'clean_data': 'data_cleanup',
      'strategy_shift': 'strategy_optimization',
      'content_generation': 'content_creation',
      'posting_schedule': 'schedule_optimization'
    };
  }
}