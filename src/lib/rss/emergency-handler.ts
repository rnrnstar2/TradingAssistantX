import {
  EmergencyInformation,
  EmergencyResponse,
  MarketCrisis,
  CrisisResponse,
  EmergencyTrigger,
  ActionResult,
  NotificationResult,
  ResponseAnalysis,
  AlertSystem,
  ResponseProtocol,
  ProtocolStep,
  EscalationRule,
  EmergencyType,
  CrisisIndicator,
  ResponseAction,
} from '../../types/rss-collection-types';

export class EmergencyHandler {
  private alertSystems: AlertSystem[] = [];
  private responseProtocols: Map<string, ResponseProtocol> = new Map();
  private emergencyHistory: Map<string, EmergencyResponse[]> = new Map();
  private activeTriggers: Map<string, EmergencyTrigger> = new Map();
  
  private readonly MAX_RESPONSE_TIME = 30000; // 30 seconds
  private readonly ESCALATION_DELAY = 15000; // 15 seconds before escalation

  constructor() {
    this.initializeAlertSystems();
    this.initializeResponseProtocols();
    this.initializeEmergencyTriggers();
  }

  async handleEmergencyInformation(emergency: EmergencyInformation): Promise<EmergencyResponse> {
    const responseStart = Date.now();
    const responseId = `emergency_response_${Date.now()}`;
    
    try {
      // Step 1: Immediate classification and protocol selection (< 2 seconds)
      const protocol = this.selectResponseProtocol(emergency);
      
      // Step 2: Execute immediate actions (< 10 seconds)
      const immediateActions = await this.executeImmediateActions(emergency, protocol);
      
      // Step 3: Trigger notifications (< 5 seconds, parallel)
      const notificationPromise = this.sendEmergencyNotifications(emergency);
      
      // Step 4: Prepare follow-up actions (< 15 seconds, parallel)
      const followUpActions = await this.prepareFollowUpActions(emergency, protocol);
      
      // Wait for notifications to complete
      const notificationResult = await notificationPromise;
      
      const responseTime = Date.now() - responseStart;
      
      const response: EmergencyResponse = {
        id: responseId,
        emergencyId: emergency.id,
        actions: [...immediateActions, ...followUpActions],
        responseTime,
        status: responseTime <= this.MAX_RESPONSE_TIME ? 'completed' : 'executing',
        result: {
          actionsExecuted: immediateActions.length,
          notificationsSent: notificationResult.successful.length,
          totalResponseTime: responseTime,
          withinTimeLimit: responseTime <= this.MAX_RESPONSE_TIME,
          escalationRequired: responseTime > this.ESCALATION_DELAY
        },
        timestamp: new Date()
      };

      // Store in history for learning
      this.storeEmergencyResponse(emergency.id, response);
      
      // Check if escalation is needed
      if (responseTime > this.ESCALATION_DELAY) {
        await this.escalateResponse(emergency, response);
      }

      return response;

    } catch (error) {
      return this.createErrorResponse(responseId, emergency.id, error, Date.now() - responseStart);
    }
  }

  async respondToMarketCrisis(crisis: MarketCrisis): Promise<CrisisResponse> {
    const crisisStart = Date.now();
    
    // Determine crisis severity and response level
    const responseLevel = this.determineCrisisResponseLevel(crisis);
    const actions: ResponseAction[] = [];
    
    // Execute crisis-specific protocols
    switch (crisis.type.toLowerCase()) {
      case 'liquidity_crisis':
        actions.push(...await this.handleLiquidityCrisis(crisis));
        break;
      case 'currency_crisis':
        actions.push(...await this.handleCurrencyCrisis(crisis));
        break;
      case 'market_crash':
        actions.push(...await this.handleMarketCrash(crisis));
        break;
      case 'geopolitical_crisis':
        actions.push(...await this.handleGeopoliticalCrisis(crisis));
        break;
      default:
        actions.push(...await this.handleGeneralCrisis(crisis));
    }

    return {
      crisisId: crisis.id,
      actions,
      coordinatedResponse: crisis.severity === 'critical',
      escalationLevel: responseLevel,
      timestamp: new Date()
    };
  }

  async executeAutomaticActions(triggers: EmergencyTrigger[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    // Execute triggers in parallel for speed
    const triggerPromises = triggers
      .filter(trigger => trigger.active)
      .map(trigger => this.executeTrigger(trigger));
    
    const triggerResults = await Promise.allSettled(triggerPromises);
    
    triggerResults.forEach((result, index) => {
      const trigger = triggers[index];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          triggerId: trigger.id,
          success: false,
          executionTime: 0,
          result: null,
          error: result.reason instanceof Error ? result.reason.message : 'Execution failed',
          timestamp: new Date()
        });
      }
    });

    return results;
  }

  async sendEmergencyNotifications(emergency: EmergencyInformation): Promise<NotificationResult> {
    const notificationStart = Date.now();
    const channels: string[] = [];
    const successful: string[] = [];
    const failed: string[] = [];
    
    // Select appropriate alert systems based on urgency
    const selectedSystems = this.selectAlertSystems(emergency.classification.urgencyLevel);
    
    // Send notifications in parallel for speed
    const notificationPromises = selectedSystems.map(async (system) => {
      channels.push(system.name);
      
      try {
        await this.sendNotification(system, emergency);
        successful.push(system.name);
      } catch (error) {
        failed.push(system.name);
        console.error(`Failed to send notification via ${system.name}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);

    return {
      channels,
      successful,
      failed,
      timestamp: new Date(),
      message: this.createNotificationMessage(emergency)
    };
  }

  async analyzeEmergencyResponse(response: EmergencyResponse): Promise<ResponseAnalysis> {
    const emergency = await this.getEmergencyById(response.emergencyId);
    if (!emergency) {
      throw new Error(`Emergency ${response.emergencyId} not found for analysis`);
    }

    // Calculate effectiveness metrics
    const effectiveness = this.calculateEffectiveness(response);
    const timeliness = this.calculateTimeliness(response);
    const accuracy = this.calculateAccuracy(response, emergency);

    // Generate improvement suggestions
    const improvements = this.generateImprovementSuggestions(response);
    const lessonsLearned = this.extractLessonsLearned(response, emergency);
    const nextActionRecommendations = this.generateNextActionRecommendations(response, emergency);

    return {
      responseId: response.id,
      effectiveness,
      timeliness,
      accuracy,
      improvements,
      lessonsLearned,
      nextActionRecommendations
    };
  }

  private initializeAlertSystems(): void {
    this.alertSystems = [
      {
        id: 'email_system',
        name: 'Email Alerts',
        type: 'email',
        config: { smtp: 'localhost', priority: 'normal' },
        active: true,
        priority: 3
      },
      {
        id: 'webhook_system',
        name: 'Webhook Notifications',
        type: 'webhook',
        config: { url: 'http://localhost:3000/webhook', timeout: 5000 },
        active: true,
        priority: 1
      },
      {
        id: 'console_system',
        name: 'Console Logging',
        type: 'webhook',
        config: { logLevel: 'emergency' },
        active: true,
        priority: 4
      }
    ];
  }

  private initializeResponseProtocols(): void {
    // Market Crisis Protocol
    this.responseProtocols.set('market_crisis', {
      id: 'market_crisis',
      emergencyType: 'market_crisis',
      steps: [
        {
          order: 1,
          action: 'assess_severity',
          description: 'Assess crisis severity and market impact',
          timeout: 5000,
          required: true,
          parameters: {}
        },
        {
          order: 2,
          action: 'notify_stakeholders',
          description: 'Notify relevant stakeholders and systems',
          timeout: 10000,
          required: true,
          parameters: { urgency: 'high' }
        },
        {
          order: 3,
          action: 'activate_safeguards',
          description: 'Activate automated trading safeguards',
          timeout: 15000,
          required: false,
          parameters: { mode: 'conservative' }
        }
      ],
      timeout: 30000,
      escalationRules: [
        {
          condition: 'timeout_exceeded',
          action: 'escalate_to_manual',
          delay: 15000,
          parameters: { level: 'critical' }
        }
      ]
    });

    // Monetary Policy Protocol
    this.responseProtocols.set('monetary_policy', {
      id: 'monetary_policy',
      emergencyType: 'monetary_policy',
      steps: [
        {
          order: 1,
          action: 'parse_policy_change',
          description: 'Parse and categorize policy change',
          timeout: 8000,
          required: true,
          parameters: {}
        },
        {
          order: 2,
          action: 'calculate_impact',
          description: 'Calculate expected market impact',
          timeout: 12000,
          required: true,
          parameters: { models: ['yield_curve', 'fx_impact'] }
        },
        {
          order: 3,
          action: 'update_positions',
          description: 'Update position recommendations',
          timeout: 10000,
          required: false,
          parameters: { auto_execute: false }
        }
      ],
      timeout: 30000,
      escalationRules: []
    });
  }

  private initializeEmergencyTriggers(): void {
    const triggers: EmergencyTrigger[] = [
      {
        id: 'volatility_spike',
        type: 'market_indicator',
        condition: 'vix > 30',
        threshold: 30,
        action: 'activate_volatility_protocol',
        priority: 8,
        active: true
      },
      {
        id: 'major_news',
        type: 'news_impact',
        condition: 'impact_score > 0.8',
        threshold: 0.8,
        action: 'process_major_news',
        priority: 9,
        active: true
      },
      {
        id: 'liquidity_crisis',
        type: 'liquidity_indicator',
        condition: 'spread_widening > 50%',
        threshold: 0.5,
        action: 'liquidity_protection',
        priority: 10,
        active: true
      }
    ];

    triggers.forEach(trigger => {
      this.activeTriggers.set(trigger.id, trigger);
    });
  }

  private selectResponseProtocol(emergency: EmergencyInformation): ResponseProtocol {
    const protocolKey = emergency.classification.category;
    const protocol = this.responseProtocols.get(protocolKey);
    
    return protocol || this.responseProtocols.get('market_crisis') || this.getDefaultProtocol();
  }

  private async executeImmediateActions(
    emergency: EmergencyInformation, 
    protocol: ResponseProtocol
  ): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];
    const immediateSteps = protocol.steps.filter(step => step.order <= 2 && step.required);
    
    for (const step of immediateSteps) {
      try {
        const action = await this.executeProtocolStep(step, emergency);
        actions.push(action);
      } catch (error) {
        console.error(`Failed to execute immediate step ${step.action}:`, error);
      }
    }

    return actions;
  }

  private async prepareFollowUpActions(
    emergency: EmergencyInformation, 
    protocol: ResponseProtocol
  ): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];
    const followUpSteps = protocol.steps.filter(step => step.order > 2);
    
    for (const step of followUpSteps) {
      const action: ResponseAction = {
        id: `followup_${step.action}_${Date.now()}`,
        type: step.action,
        description: step.description,
        executionTime: step.timeout,
        parameters: { ...step.parameters, emergencyId: emergency.id },
        status: 'pending'
      };
      
      actions.push(action);
    }

    return actions;
  }

  private selectAlertSystems(urgencyLevel: string): AlertSystem[] {
    switch (urgencyLevel) {
      case 'critical':
        return this.alertSystems.filter(system => system.active);
      case 'high':
        return this.alertSystems.filter(system => system.active && system.priority <= 2);
      case 'medium':
        return this.alertSystems.filter(system => system.active && system.priority <= 3);
      default:
        return this.alertSystems.filter(system => system.active && system.priority <= 4);
    }
  }

  private async sendNotification(system: AlertSystem, emergency: EmergencyInformation): Promise<void> {
    const message = this.createNotificationMessage(emergency);
    
    switch (system.type) {
      case 'webhook':
        if (system.config.url) {
          await this.sendWebhookNotification(system.config.url, message, emergency);
        } else {
          console.log(`EMERGENCY ALERT [${system.name}]: ${message}`);
        }
        break;
      case 'email':
        await this.sendEmailNotification(system.config, message, emergency);
        break;
      default:
        console.log(`ALERT [${system.name}]: ${message}`);
    }
  }

  private async sendWebhookNotification(url: string, message: string, emergency: EmergencyInformation): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'emergency',
          urgency: emergency.classification.urgencyLevel,
          message,
          emergency
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Webhook notification failed: ${error}`);
    }
  }

  private async sendEmailNotification(config: any, message: string, emergency: EmergencyInformation): Promise<void> {
    // Placeholder for email implementation
    console.log(`EMAIL NOTIFICATION: ${message}`);
  }

  private createNotificationMessage(emergency: EmergencyInformation): string {
    return `EMERGENCY ALERT: ${emergency.classification.category.toUpperCase()} - ${emergency.classification.urgencyLevel.toUpperCase()} urgency. ${emergency.content.substring(0, 200)}...`;
  }

  private determineCrisisResponseLevel(crisis: MarketCrisis): number {
    const severityLevels = { 'minor': 1, 'moderate': 2, 'major': 3, 'critical': 4 };
    return severityLevels[crisis.severity] || 1;
  }

  private async handleLiquidityCrisis(crisis: MarketCrisis): Promise<ResponseAction[]> {
    return [
      {
        id: `liquidity_${Date.now()}`,
        type: 'liquidity_management',
        description: 'Activate liquidity protection measures',
        executionTime: 5000,
        parameters: { mode: 'conservative', markets: crisis.affectedMarkets },
        status: 'pending'
      }
    ];
  }

  private async handleCurrencyCrisis(crisis: MarketCrisis): Promise<ResponseAction[]> {
    return [
      {
        id: `currency_${Date.now()}`,
        type: 'currency_protection',
        description: 'Implement currency hedging strategies',
        executionTime: 8000,
        parameters: { currencies: crisis.affectedMarkets },
        status: 'pending'
      }
    ];
  }

  private async handleMarketCrash(crisis: MarketCrisis): Promise<ResponseAction[]> {
    return [
      {
        id: `crash_${Date.now()}`,
        type: 'crash_protocol',
        description: 'Execute market crash protection protocol',
        executionTime: 3000,
        parameters: { severity: crisis.severity },
        status: 'pending'
      }
    ];
  }

  private async handleGeopoliticalCrisis(crisis: MarketCrisis): Promise<ResponseAction[]> {
    return [
      {
        id: `geopolitical_${Date.now()}`,
        type: 'geopolitical_response',
        description: 'Assess geopolitical impact on markets',
        executionTime: 10000,
        parameters: { regions: crisis.affectedMarkets },
        status: 'pending'
      }
    ];
  }

  private async handleGeneralCrisis(crisis: MarketCrisis): Promise<ResponseAction[]> {
    return [
      {
        id: `general_${Date.now()}`,
        type: 'general_response',
        description: 'Execute general crisis response',
        executionTime: 7000,
        parameters: { type: crisis.type },
        status: 'pending'
      }
    ];
  }

  private async executeTrigger(trigger: EmergencyTrigger): Promise<ActionResult> {
    const executionStart = Date.now();
    
    try {
      // Simulate trigger execution
      await this.simulateTriggerExecution(trigger);
      
      return {
        triggerId: trigger.id,
        success: true,
        executionTime: Date.now() - executionStart,
        result: { action: trigger.action, executed: true },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        triggerId: trigger.id,
        success: false,
        executionTime: Date.now() - executionStart,
        result: null,
        error: error instanceof Error ? error.message : 'Trigger execution failed',
        timestamp: new Date()
      };
    }
  }

  private async simulateTriggerExecution(trigger: EmergencyTrigger): Promise<void> {
    // Simulate processing time based on trigger priority
    const processingTime = Math.max(100, (11 - trigger.priority) * 200);
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private async executeProtocolStep(step: ProtocolStep, emergency: EmergencyInformation): Promise<ResponseAction> {
    const executionStart = Date.now();
    
    try {
      // Execute the step - in real implementation this would perform actual actions
      await this.simulateStepExecution(step);
      
      return {
        id: `step_${step.action}_${Date.now()}`,
        type: step.action,
        description: step.description,
        executionTime: Date.now() - executionStart,
        parameters: step.parameters,
        status: 'completed',
        result: { success: true, step: step.action }
      };
    } catch (error) {
      return {
        id: `step_${step.action}_${Date.now()}`,
        type: step.action,
        description: step.description,
        executionTime: Date.now() - executionStart,
        parameters: step.parameters,
        status: 'failed',
        result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async simulateStepExecution(step: ProtocolStep): Promise<void> {
    // Simulate step execution time
    const executionTime = Math.min(step.timeout, Math.random() * 2000 + 1000);
    await new Promise(resolve => setTimeout(resolve, executionTime));
  }

  private storeEmergencyResponse(emergencyId: string, response: EmergencyResponse): void {
    const history = this.emergencyHistory.get(emergencyId) || [];
    history.push(response);
    this.emergencyHistory.set(emergencyId, history);
  }

  private async escalateResponse(emergency: EmergencyInformation, response: EmergencyResponse): Promise<void> {
    console.warn(`ESCALATION: Emergency ${emergency.id} response time exceeded ${this.ESCALATION_DELAY}ms`);
    
    // Send escalation notification
    await this.sendEscalationNotification(emergency, response);
  }

  private async sendEscalationNotification(emergency: EmergencyInformation, response: EmergencyResponse): Promise<void> {
    const escalationMessage = `ESCALATION REQUIRED: Emergency ${emergency.id} exceeded response time. Manual intervention may be needed.`;
    console.error(escalationMessage);
  }

  private createErrorResponse(responseId: string, emergencyId: string, error: any, responseTime: number): EmergencyResponse {
    return {
      id: responseId,
      emergencyId,
      actions: [],
      responseTime,
      status: 'failed',
      result: {
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        totalResponseTime: responseTime
      },
      timestamp: new Date()
    };
  }

  private async getEmergencyById(emergencyId: string): Promise<EmergencyInformation | null> {
    // In a real implementation, this would fetch from storage
    return null;
  }

  private calculateEffectiveness(response: EmergencyResponse): number {
    const successfulActions = response.actions.filter(action => action.status === 'completed').length;
    const totalActions = response.actions.length;
    
    if (totalActions === 0) return 0;
    
    const actionEffectiveness = successfulActions / totalActions;
    const timeEffectiveness = response.responseTime <= this.MAX_RESPONSE_TIME ? 1.0 : 0.5;
    
    return Math.round((actionEffectiveness * 0.7 + timeEffectiveness * 0.3) * 100);
  }

  private calculateTimeliness(response: EmergencyResponse): number {
    if (response.responseTime <= 10000) return 100; // Excellent < 10s
    if (response.responseTime <= 20000) return 85;  // Good < 20s
    if (response.responseTime <= 30000) return 70;  // Acceptable < 30s
    return 50; // Needs improvement > 30s
  }

  private calculateAccuracy(response: EmergencyResponse, emergency: EmergencyInformation): number {
    // Simple accuracy calculation based on successful vs failed actions
    const successfulActions = response.actions.filter(action => action.status === 'completed').length;
    const totalActions = response.actions.length;
    
    return totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 0;
  }

  private generateImprovementSuggestions(response: EmergencyResponse): string[] {
    const suggestions = [];
    
    if (response.responseTime > this.MAX_RESPONSE_TIME) {
      suggestions.push('Optimize response protocols to reduce processing time');
    }
    
    const failedActions = response.actions.filter(action => action.status === 'failed').length;
    if (failedActions > 0) {
      suggestions.push('Improve error handling and retry mechanisms for failed actions');
    }
    
    if (response.actions.length === 0) {
      suggestions.push('Ensure emergency protocols generate appropriate response actions');
    }
    
    return suggestions;
  }

  private extractLessonsLearned(response: EmergencyResponse, emergency: EmergencyInformation): string[] {
    const lessons = [];
    
    if (response.responseTime <= 15000) {
      lessons.push('Fast response achieved - maintain current protocol efficiency');
    }
    
    if (response.actions.every(action => action.status === 'completed')) {
      lessons.push('All actions executed successfully - protocol is well-designed');
    }
    
    if (emergency.classification.urgencyLevel === 'critical' && response.responseTime <= this.MAX_RESPONSE_TIME) {
      lessons.push('Critical emergency handled within time limits - system performing well');
    }
    
    return lessons;
  }

  private generateNextActionRecommendations(response: EmergencyResponse, emergency: EmergencyInformation): string[] {
    const recommendations = [];
    
    recommendations.push('Monitor market reaction for 30 minutes post-emergency');
    recommendations.push('Update risk assessment based on emergency outcome');
    recommendations.push('Review and update emergency protocols if needed');
    
    if (emergency.classification.urgencyLevel === 'critical') {
      recommendations.push('Conduct post-emergency analysis within 24 hours');
    }
    
    return recommendations;
  }

  private getDefaultProtocol(): ResponseProtocol {
    return {
      id: 'default',
      emergencyType: 'general',
      steps: [
        {
          order: 1,
          action: 'assess_situation',
          description: 'Assess emergency situation',
          timeout: 10000,
          required: true,
          parameters: {}
        },
        {
          order: 2,
          action: 'notify',
          description: 'Send notifications',
          timeout: 15000,
          required: true,
          parameters: {}
        }
      ],
      timeout: 30000,
      escalationRules: []
    };
  }
}