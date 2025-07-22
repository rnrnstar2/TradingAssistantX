import { SystemDecisionEngine } from './decision-engine.js';
import { ContentCreator } from '../services/content-creator.js';
import { DataOptimizer } from '../services/data-optimizer.js';
import { RSSCollector } from '../collectors/rss-collector.js';
import { PlaywrightAccountCollector } from '../collectors/playwright-account.js';
import { BaseCollector } from '../collectors/base-collector.js';
import { XPoster } from '../services/x-poster.js';
import { loadYamlSafe } from '../utils/yaml-utils.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { 
  SystemDecision, 
  AccountStatus, 
  SystemExecutionResult,
  CollectionResult
} from '../types/system-types.js';
import type { PostContent as ImportedPostContent, ProcessedData } from '../types/content-types.js';
import type { Decision } from '../types/decision-types.js';
import { join } from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// System state interface
interface SystemState {
  accountHealth: number;
  followerCount: number;
  lastPostTime: string;
  systemStatus: 'healthy' | 'degraded' | 'error';
  availableActions: string[];
  timestamp: number;
}

// Execution plan interface
interface ExecutionPlan {
  action: 'original_post' | 'analysis' | 'content_creation';
  strategy: 'educational' | 'trend' | 'analytical';
  dataCollectionMethod: 'rss' | 'account' | 'mixed';
  reasoning: string;
  confidence: number;
  timestamp: number;
}

// Execution result interface
interface ExecutionResult {
  success: boolean;
  action: string;
  content?: string;
  metrics: {
    executionTime: number;
    confidence: number;
    dataQuality: number;
  };
  errors?: string[];
  timestamp: number;
}

// Post content interface (internal)
interface PostContent {
  content: string;
  strategy: string;
  confidence: number;
  metadata: {
    sources: string[];
    topic: string;
    educationalValue: number;
    trendRelevance: number;
  };
}

// Posting result interface
interface PostingResult {
  success: boolean;
  tweetId?: string;
  content: string;
  timestamp: number;
  error?: string;
}

// Enhanced error handling types
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  DATA_PROCESSING = 'data_processing',
  SYSTEM_RESOURCE = 'system_resource',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

interface EnhancedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  phase: string;
  message: string;
  originalError: Error;
  timestamp: number;
  retryable: boolean;
  context?: any;
}

/**
 * Autonomous Executor - Complete implementation with 6-phase execution flow
 * 
 * This class implements the complete autonomous execution system as specified in the requirements:
 * 1. Current State Analysis
 * 2. Decision Making
 * 3. Data Collection
 * 4. Content Generation
 * 5. Posting Execution
 * 6. Learning and Optimization
 */
export class AutonomousExecutor {
  private decisionEngine: SystemDecisionEngine;
  private contentCreator: ContentCreator;
  private dataOptimizer: DataOptimizer;
  private collectors: Map<string, BaseCollector>;
  private xPoster: XPoster;
  
  // Execution state management
  private isExecuting: boolean = false;
  private executionStartTime: number = 0;
  private readonly MAX_EXECUTION_TIME = 30 * 1000; // 30 seconds as per requirements
  
  // Enhanced error handling
  private errorHistory: EnhancedError[] = [];
  private readonly MAX_ERROR_HISTORY = 100;
  private readonly RETRY_DELAYS = [1000, 2000, 5000]; // Progressive retry delays

  constructor() {
    // Initialize core components
    this.decisionEngine = new SystemDecisionEngine();
    this.contentCreator = new ContentCreator();
    this.dataOptimizer = new DataOptimizer();
    this.xPoster = new XPoster(
      process.env.X_API_KEY || '',
      process.env.X_API_SECRET || '',
      process.env.X_ACCESS_TOKEN || '',
      process.env.X_ACCESS_TOKEN_SECRET || ''
    );
    
    // Initialize collectors map
    this.collectors = new Map<string, BaseCollector>();
    
    // Register available collectors
    this.collectors.set('rss', new RSSCollector({ enabled: true, timeout: 10000, retries: 3 }));
    this.collectors.set('account', new PlaywrightAccountCollector({
      enabled: true,
      priority: 1,
      timeout: 30000,
      retries: 2,
      analysisDepth: 5,
      metrics: ['posts', 'engagement', 'followers'],
      maxHistoryDays: 7,
      includeMetrics: true
    }));
    
    console.log('🚀 [AutonomousExecutor] Autonomous system initialized with 6-phase execution flow');
  }

  // ============================================================================
  // ENHANCED ERROR HANDLING METHODS
  // ============================================================================

  /**
   * Categorizes an error based on its type and message
   */
  private categorizeError(error: Error, phase: string): EnhancedError {
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('connect') || errorMessage.includes('timeout')) {
      category = ErrorCategory.NETWORK;
      retryable = true;
      severity = ErrorSeverity.HIGH;
    }
    // Authentication errors  
    else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') ||
             errorMessage.includes('forbidden') || errorMessage.includes('401') || 
             errorMessage.includes('403')) {
      category = ErrorCategory.AUTHENTICATION;
      retryable = false;
      severity = ErrorSeverity.CRITICAL;
    }
    // Rate limit errors
    else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') ||
             errorMessage.includes('429')) {
      category = ErrorCategory.RATE_LIMIT;
      retryable = true;
      severity = ErrorSeverity.HIGH;
    }
    // Timeout errors
    else if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
      category = ErrorCategory.TIMEOUT;
      retryable = true;
      severity = ErrorSeverity.MEDIUM;
    }
    // Data processing errors
    else if (errorMessage.includes('parse') || errorMessage.includes('invalid data') ||
             errorMessage.includes('json') || errorMessage.includes('xml')) {
      category = ErrorCategory.DATA_PROCESSING;
      retryable = false;
      severity = ErrorSeverity.MEDIUM;
    }
    // System resource errors
    else if (errorMessage.includes('memory') || errorMessage.includes('resource') ||
             errorMessage.includes('limit exceeded')) {
      category = ErrorCategory.SYSTEM_RESOURCE;
      retryable = false;
      severity = ErrorSeverity.CRITICAL;
    }

    return {
      category,
      severity,
      phase,
      message: error.message,
      originalError: error,
      timestamp: Date.now(),
      retryable,
      context: { stack: error.stack }
    };
  }

  /**
   * Logs an error with enhanced context and adds to history
   */
  private async logEnhancedError(enhancedError: EnhancedError): Promise<void> {
    // Add to error history
    this.errorHistory.push(enhancedError);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory.shift();
    }

    // Log with appropriate severity
    const severityIcon = {
      [ErrorSeverity.LOW]: '⚠️',
      [ErrorSeverity.MEDIUM]: '🔴', 
      [ErrorSeverity.HIGH]: '🚨',
      [ErrorSeverity.CRITICAL]: '💀'
    }[enhancedError.severity];

    console.error(`${severityIcon} [${enhancedError.phase}] ${enhancedError.category.toUpperCase()} Error:`, enhancedError.message);
    
    // Save detailed error log to file
    try {
      const outputDir = join(process.cwd(), 'tasks', 'outputs');
      await fs.promises.mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `error-log-${timestamp}.yaml`;
      const filePath = join(outputDir, filename);
      
      const errorLogData = {
        error: {
          category: enhancedError.category,
          severity: enhancedError.severity,
          phase: enhancedError.phase,
          message: enhancedError.message,
          retryable: enhancedError.retryable,
          timestamp: new Date(enhancedError.timestamp).toISOString()
        },
        context: enhancedError.context,
        execution_state: {
          is_executing: this.isExecuting,
          execution_time: Date.now() - this.executionStartTime,
          max_execution_time: this.MAX_EXECUTION_TIME
        }
      };
      
      await fs.promises.writeFile(filePath, yaml.dump(errorLogData));
    } catch (logError) {
      console.error('Failed to save error log:', logError);
    }
  }

  /**
   * Attempts to retry an operation with progressive delays
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    enhancedError: EnhancedError,
    maxRetries: number = 3
  ): Promise<T | null> {
    if (!enhancedError.retryable || maxRetries <= 0) {
      return null;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const delay = this.RETRY_DELAYS[Math.min(attempt, this.RETRY_DELAYS.length - 1)];
        
        if (attempt > 0) {
          console.log(`⏱️ [Retry] Attempting retry ${attempt + 1}/${maxRetries} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await operation();
      } catch (retryError) {
        if (attempt === maxRetries - 1) {
          console.error(`❌ [Retry] All ${maxRetries} retry attempts failed`);
          await this.logEnhancedError(this.categorizeError(retryError as Error, `${enhancedError.phase}_retry`));
        }
      }
    }
    
    return null;
  }

  /**
   * Determines if the system should continue execution after an error
   */
  private shouldContinueExecution(enhancedError: EnhancedError): boolean {
    // Critical errors should stop execution
    if (enhancedError.severity === ErrorSeverity.CRITICAL) {
      return false;
    }
    
    // Check recent error frequency
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp > Date.now() - 300000 // Last 5 minutes
    );
    
    // If too many recent errors, stop execution
    if (recentErrors.length > 10) {
      console.error('🛑 [Error Threshold] Too many recent errors, stopping execution');
      return false;
    }
    
    // Check for repeated critical errors
    const criticalErrors = recentErrors.filter(error => error.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length > 2) {
      console.error('🛑 [Critical Error Threshold] Too many critical errors, stopping execution');
      return false;
    }
    
    return true;
  }

  /**
   * Executes an operation with comprehensive error handling
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    phase: string,
    fallback?: () => Promise<T>,
    retries: number = 2
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const enhancedError = this.categorizeError(error as Error, phase);
      await this.logEnhancedError(enhancedError);
      
      // Try retries for retryable errors
      if (enhancedError.retryable && retries > 0) {
        const retryResult = await this.retryOperation(operation, enhancedError, retries);
        if (retryResult !== null) {
          console.log(`✅ [Recovery] ${phase} succeeded after retry`);
          return retryResult;
        }
      }
      
      // Try fallback if available
      if (fallback) {
        try {
          console.log(`🔄 [Fallback] Attempting fallback for ${phase}...`);
          const fallbackResult = await fallback();
          console.log(`✅ [Fallback] ${phase} succeeded with fallback`);
          return fallbackResult;
        } catch (fallbackError) {
          await this.logEnhancedError(this.categorizeError(fallbackError as Error, `${phase}_fallback`));
        }
      }
      
      // Check if execution should continue
      if (!this.shouldContinueExecution(enhancedError)) {
        throw new Error(`Critical error in ${phase}, execution stopped`);
      }
      
      return null;
    }
  }

  /**
   * Main autonomous execution method - implements the 6-phase flow
   * 
   * Phase 1: Current State Analysis
   * Phase 2: Decision Making
   * Phase 3: Data Collection
   * Phase 4: Content Generation
   * Phase 5: Posting Execution
   * Phase 6: Learning and Optimization
   */
  async executeAutonomously(): Promise<ExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Execution already in progress');
    }

    this.isExecuting = true;
    this.executionStartTime = Date.now();
    
    const executionLog = {
      timestamp: new Date().toISOString(),
      phases: [] as any[],
      final_result: '',
      metrics: {
        execution_time: 0,
        memory_usage: 0
      }
    };

    try {
      console.log('🚀 [Autonomous Execution] Starting 6-phase autonomous execution');
      
      // Phase 1: Analyze Current State
      console.log('📊 [Phase 1] Current State Analysis...');
      const startPhase1 = Date.now();
      const currentState = await this.analyzeCurrentState();
      const phase1Duration = (Date.now() - startPhase1) / 1000;
      executionLog.phases.push({
        name: 'analysis',
        duration: phase1Duration,
        result: 'success'
      });
      
      // Phase 2: Make Decisions
      console.log('🤔 [Phase 2] Decision Making...');
      const startPhase2 = Date.now();
      const executionPlan = await this.makeDecisions(currentState);
      const phase2Duration = (Date.now() - startPhase2) / 1000;
      executionLog.phases.push({
        name: 'decision',
        duration: phase2Duration,
        result: executionPlan.strategy
      });
      
      // Phase 3: Collect Information
      console.log('📚 [Phase 3] Data Collection...');
      const startPhase3 = Date.now();
      const collectedData = await this.collectInformation(executionPlan);
      const phase3Duration = (Date.now() - startPhase3) / 1000;
      executionLog.phases.push({
        name: 'collection',
        duration: phase3Duration,
        result: `${collectedData.length} items collected`
      });
      
      // Phase 4: Generate Content
      console.log('✍️ [Phase 4] Content Generation...');
      const startPhase4 = Date.now();
      const postContent = await this.generateContent(collectedData);
      const phase4Duration = (Date.now() - startPhase4) / 1000;
      executionLog.phases.push({
        name: 'content_generation',
        duration: phase4Duration,
        result: 'content_created'
      });
      
      // Phase 5: Execute Posting
      console.log('📝 [Phase 5] Posting Execution...');
      const startPhase5 = Date.now();
      const postingResult = await this.executePosting(postContent);
      const phase5Duration = (Date.now() - startPhase5) / 1000;
      executionLog.phases.push({
        name: 'posting',
        duration: phase5Duration,
        result: postingResult.success ? 'posted_successfully' : 'posting_failed'
      });
      
      // Phase 6: Learn and Optimize
      console.log('🎓 [Phase 6] Learning and Optimization...');
      const startPhase6 = Date.now();
      await this.learnAndOptimize(postingResult);
      const phase6Duration = (Date.now() - startPhase6) / 1000;
      executionLog.phases.push({
        name: 'optimization',
        duration: phase6Duration,
        result: 'learning_complete'
      });
      
      const totalExecutionTime = (Date.now() - this.executionStartTime) / 1000;
      executionLog.final_result = 'completed_successfully';
      executionLog.metrics.execution_time = totalExecutionTime;
      executionLog.metrics.memory_usage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      
      // Save execution log
      await this.saveExecutionLog(executionLog);
      
      console.log(`✅ [Autonomous Execution] Completed successfully in ${totalExecutionTime.toFixed(2)}s`);
      
      return {
        success: true,
        action: executionPlan.action,
        content: postContent.content,
        metrics: {
          executionTime: totalExecutionTime,
          confidence: executionPlan.confidence,
          dataQuality: this.calculateDataQuality(collectedData)
        },
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ [Autonomous Execution] Error:', error);
      executionLog.final_result = 'execution_failed';
      executionLog.metrics.execution_time = (Date.now() - this.executionStartTime) / 1000;
      
      await this.saveExecutionLog(executionLog);
      
      return {
        success: false,
        action: 'error',
        metrics: {
          executionTime: (Date.now() - this.executionStartTime) / 1000,
          confidence: 0,
          dataQuality: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: Date.now()
      };
    } finally {
      this.isExecuting = false;
    }
  }
  
  /**
   * Phase 1: Analyze Current State
   * Analyzes account status, system health, and recent activity
   */
  private async analyzeCurrentState(): Promise<SystemState> {
    try {
      // Get account information using Playwright collector
      const accountCollector = this.collectors.get('account') as PlaywrightAccountCollector;
      let accountData;
      
      try {
        accountData = await accountCollector.collect();
      } catch (error) {
        console.warn('⚠️ [State Analysis] Account collection failed, using fallback');
        accountData = this.getFallbackAccountData();
      }
      
      // Load current system status
      const systemStatus = await this.getSystemStatus();
      
      // Check execution time constraint
      const elapsed = Date.now() - this.executionStartTime;
      if (elapsed > this.MAX_EXECUTION_TIME) {
        throw new Error('Execution time limit exceeded during state analysis');
      }
      
      const state: SystemState = {
        accountHealth: accountData.healthScore || 75,
        followerCount: accountData.followers?.current || 0,
        lastPostTime: this.getLastPostTime(),
        systemStatus: systemStatus,
        availableActions: ['original_post', 'analysis', 'content_creation'],
        timestamp: Date.now()
      };
      
      console.log(`📊 [State Analysis] Health: ${state.accountHealth}%, Followers: ${state.followerCount}, Status: ${state.systemStatus}`);
      
      return state;
      
    } catch (error) {
      console.error('❌ [State Analysis] Error:', error);
      // Return minimal state for fallback
      return {
        accountHealth: 50,
        followerCount: 0,
        lastPostTime: new Date().toISOString(),
        systemStatus: 'error',
        availableActions: ['original_post'],
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Phase 2: Make Decisions
   * Uses the decision engine to determine the best action and strategy
   */
  private async makeDecisions(state: SystemState): Promise<ExecutionPlan> {
    try {
      // Use the decision engine to make strategic decisions
      const decisions = await this.decisionEngine.analyzeAndDecide({
        timestamp: new Date().toISOString(),
        systemStatus: 'running',
        recentActions: [],
        pendingTasks: []
      });
      
      const decision = decisions && decisions.length > 0 ? decisions[0] : null;
      
      // Determine data collection method based on action and state
      let dataCollectionMethod: 'rss' | 'account' | 'mixed' = 'rss';
      if (decision && decision.type === 'analysis') {
        dataCollectionMethod = 'account';
      } else if (Number(state.accountHealth) < 60) {
        dataCollectionMethod = 'mixed';
      }
      
      // Determine strategy based on follower count and decision
      let strategy: 'educational' | 'trend' | 'analytical' = 'educational';
      if (state.followerCount < 1000) {
        strategy = 'educational'; // Focus on education for small accounts
      } else if (decision && decision.type === 'analysis') {
        strategy = 'analytical';
      } else {
        strategy = 'trend';
      }
      
      const plan: ExecutionPlan = {
        action: (decision?.type as 'original_post' | 'analysis' | 'content_creation') || 'content_creation',
        strategy,
        dataCollectionMethod,
        reasoning: decision?.reasoning || 'Default reasoning - no decision available',
        confidence: decision?.confidence || 0.7,
        timestamp: Date.now()
      };
      
      console.log(`🤔 [Decision Making] Action: ${plan.action}, Strategy: ${plan.strategy}, Method: ${plan.dataCollectionMethod}`);
      console.log(`📝 [Decision Making] Reasoning: ${plan.reasoning}`);
      
      return plan;
      
    } catch (error) {
      console.error('❌ [Decision Making] Error:', error);
      // Fallback decision
      return {
        action: 'original_post',
        strategy: 'educational',
        dataCollectionMethod: 'rss',
        reasoning: 'Fallback decision due to error in decision engine',
        confidence: 0.5,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Phase 3: Collect Information
   * Collects data based on the execution plan using appropriate collectors
   */
  private async collectInformation(plan: ExecutionPlan): Promise<CollectionResult[]> {
    try {
      const collectionResults: CollectionResult[] = [];
      
      // Select collectors based on the plan
      const collectorsToUse: BaseCollector[] = [];
      
      if (plan.dataCollectionMethod === 'rss' || plan.dataCollectionMethod === 'mixed') {
        collectorsToUse.push(this.collectors.get('rss') as RSSCollector);
      }
      
      if (plan.dataCollectionMethod === 'account' || plan.dataCollectionMethod === 'mixed') {
        collectorsToUse.push(this.collectors.get('account') as PlaywrightAccountCollector);
      }
      
      // Execute data collection
      for (const collector of collectorsToUse) {
        try {
          const result = await collector.collect({
            action: plan.action,
            timestamp: Date.now(),
            strategy: plan.strategy
          });
          
          // Convert to CollectionResult format
          if (Array.isArray(result.data)) {
            result.data.forEach((item: any, index: number) => {
              collectionResults.push({
                id: `${collector.constructor.name.toLowerCase()}_${Date.now()}_${index}`,
                type: plan.strategy,
                content: typeof item === 'string' ? item : item.content || JSON.stringify(item),
                source: collector.constructor.name.toLowerCase(),
                relevanceScore: 0.8,
                timestamp: Date.now(),
                metadata: {
                  collector: collector.constructor.name,
                  strategy: plan.strategy,
                  reliability: 'medium'
                }
              });
            });
          }
        } catch (collectorError) {
          console.warn(`⚠️ [Data Collection] Collector ${collector.constructor.name} failed:`, collectorError);
        }
      }
      
      // Ensure we have at least some data
      if (collectionResults.length === 0) {
        collectionResults.push(this.getFallbackCollectionResult(plan));
      }
      
      console.log(`📚 [Data Collection] Collected ${collectionResults.length} items using ${plan.dataCollectionMethod} method`);
      
      return collectionResults;
      
    } catch (error) {
      console.error('❌ [Data Collection] Error:', error);
      return [this.getFallbackCollectionResult(plan)];
    }
  }

  /**
   * Phase 4: Generate Content
   * Uses the content creator to generate appropriate content based on collected data
   */
  private async generateContent(data: CollectionResult[]): Promise<PostContent> {
    try {
      // Convert CollectionResult[] to ProcessedData format for ContentCreator
      const processedData: ProcessedData = {
        data: data.map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          source: item.source,
          relevanceScore: item.relevanceScore,
          timestamp: item.timestamp,
          metadata: item.metadata,
          category: 'market_trend' as const,
          importance: 0.7,
          reliability: 0.8,
          url: (item as any).url || item.source || ''
        })),
        processingTime: 500,
        dataQuality: this.calculateDataQuality(data),
        readyForConvergence: true
      };
      
      // Generate content using ContentCreator
      const contentResult = await this.contentCreator.createPost(processedData);
      
      // Convert ContentCreator result to internal PostContent format
      const postContent: PostContent = {
        content: contentResult.content,
        strategy: contentResult.strategy,
        confidence: contentResult.confidence,
        metadata: {
          sources: contentResult.metadata.sources,
          topic: contentResult.metadata.topic,
          educationalValue: contentResult.metadata.educationalValue,
          trendRelevance: contentResult.metadata.trendRelevance
        }
      };
      
      console.log(`✍️ [Content Generation] Created ${contentResult.strategy} content with ${contentResult.confidence}% confidence`);
      console.log(`📝 [Content Preview] ${postContent.content.substring(0, 100)}...`);
      
      return postContent;
      
    } catch (error) {
      console.error('❌ [Content Generation] Error:', error);
      // Return fallback content
      return {
        content: '📊 投資の基本：リスク管理から始めましょう。継続的な学習と冷静な判断が成功の鍵です。 #投資教育 #資産運用',
        strategy: 'educational',
        confidence: 0.6,
        metadata: {
          sources: [],
          topic: '投資基礎',
          educationalValue: 80,
          trendRelevance: 40
        }
      };
    }
  }

  /**
   * Phase 5: Execute Posting
   * Posts the generated content to X (Twitter)
   */
  private async executePosting(content: PostContent): Promise<PostingResult> {
    try {
      console.log('📝 [Posting Execution] Attempting to post to X...');
      
      // Use XPoster to post the content
      const result = await this.xPoster.postToX(content);
      
      const postingResult: PostingResult = {
        success: result.success,
        tweetId: result.postId,
        content: content.content,
        timestamp: Date.now(),
        error: result.error
      };
      
      if (postingResult.success) {
        console.log(`📝 [Posting Success] Posted tweet ${postingResult.tweetId}`);
        
        // Save to today's posts
        await this.saveTodaysPosts({
          content: content.content,
          tweetId: postingResult.tweetId,
          strategy: content.strategy,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ [Posting Failed]', postingResult.error);
      }
      
      return postingResult;
      
    } catch (error) {
      console.error('❌ [Posting Execution] Error:', error);
      return {
        success: false,
        content: content.content,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Phase 6: Learn and Optimize
   * Learns from the execution results and optimizes future performance
   */
  private async learnAndOptimize(result: PostingResult): Promise<void> {
    try {
      console.log('🎓 [Learning] Processing execution results for learning...');
      
      // Update success patterns if posting was successful
      if (result.success) {
        await this.updateSuccessPatterns({
          content: result.content,
          timestamp: new Date().toISOString(),
          engagement: {
            posted_at: new Date().toISOString(),
            success: true
          }
        });
      }
      
      // Extract insights and optimize data using DataOptimizer
      try {
        await this.dataOptimizer.extractPostInsights([{
          content: result.content,
          success: result.success,
          timestamp: result.timestamp,
          error: result.error || null
        }]);
        
        // Perform data optimization to keep learning data clean
        const optimizationResult = await this.dataOptimizer.optimizeDataset();
        console.log('🧹 [Data Optimization] Learning data optimized:', optimizationResult);
      } catch (optimizationError) {
        console.warn('⚠️ [Data Optimization] Failed:', optimizationError);
      }
      
      console.log('🎓 [Learning] Learning and optimization completed');
      
    } catch (error) {
      console.error('❌ [Learning] Error during learning and optimization:', error);
      // Don't throw error here, as learning failures shouldn't fail the entire execution
    }
  }

  // Helper methods for the 6-phase execution
  
  private getFallbackAccountData(): any {
    return {
      healthScore: 75,
      followers: { current: 500 },
      engagement: { avg_likes: 10, avg_retweets: 2, engagement_rate: '2.4%' },
      performance: { posts_today: 3, target_progress: '60%', best_posting_time: '12:00' },
      health: { status: 'healthy', api_limits: 'normal', quality_score: 75 },
      recommendations: ['Continue regular posting']
    };
  }

  private async getSystemStatus(): Promise<'healthy' | 'degraded' | 'error'> {
    try {
      // Check for recent errors in execution logs
      const outputDir = join(process.cwd(), 'tasks', 'outputs');
      if (!fs.existsSync(outputDir)) {
        return 'healthy';
      }
      
      const files = await fs.promises.readdir(outputDir);
      const recentErrorLogs = files.filter(f => 
        f.includes('error-log') && 
        Date.now() - parseInt(f.match(/\d+/)?.[0] || '0') < 60 * 60 * 1000 // 1 hour
      );
      
      if (recentErrorLogs.length > 5) {
        return 'degraded';
      } else if (recentErrorLogs.length > 0) {
        return 'degraded';
      }
      
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  private getLastPostTime(): string {
    try {
      const todayPostsPath = join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      if (!fs.existsSync(todayPostsPath)) {
        return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      }
      
      const todayPosts = loadYamlSafe(todayPostsPath) as any;
      const posts = todayPosts?.posts || [];
      
      if (posts.length > 0) {
        return posts[posts.length - 1].timestamp || new Date().toISOString();
      }
      
      return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    } catch (error) {
      return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    }
  }
  
  private getFallbackCollectionResult(plan: ExecutionPlan): CollectionResult {
    const fallbackContent = {
      educational: '投資の基本原則について理解することは、成功への第一歩です。',
      trend: '最新の市場動向を把握し、適切な判断を行うことが重要です。',
      analytical: '市場データを分析し、データに基づいた投資判断を行いましょう。'
    };
    
    return {
      id: `fallback_${Date.now()}`,
      type: plan.strategy,
      content: fallbackContent[plan.strategy],
      source: 'fallback',
      relevanceScore: 0.6,
      timestamp: Date.now(),
      metadata: {
        type: 'fallback_data',
        reliability: 'low'
      }
    };
  }

  private calculateDataQuality(data: CollectionResult[]): number {
    if (data.length === 0) return 0;
    
    const avgRelevance = data.reduce((sum, item) => sum + item.relevanceScore, 0) / data.length;
    const recencyBonus = data.filter(item => 
      Date.now() - item.timestamp < 24 * 60 * 60 * 1000 // 24 hours
    ).length / data.length * 0.2;
    
    return Math.min(1, avgRelevance + recencyBonus);
  }

  private async saveExecutionLog(executionLog: any): Promise<void> {
    try {
      const outputDir = join(process.cwd(), 'tasks', 'outputs');
      await fs.promises.mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `execution-log-${timestamp}.yaml`;
      const filePath = join(outputDir, filename);
      
      await fs.promises.writeFile(filePath, yaml.dump(executionLog));
      console.log(`📊 [Execution Log] Saved: ${filename}`);
    } catch (error) {
      console.error('❌ [Save Execution Log] Error:', error);
    }
  }

  private async saveTodaysPosts(postData: any): Promise<void> {
    try {
      const todayPostsPath = join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      const currentDir = join(process.cwd(), 'data', 'current');
      
      await fs.promises.mkdir(currentDir, { recursive: true });
      
      let todayPosts: any = { posts: [] };
      if (fs.existsSync(todayPostsPath)) {
        todayPosts = loadYamlSafe(todayPostsPath) || { posts: [] };
      }
      
      todayPosts.posts.push(postData);
      todayPosts.updated_at = new Date().toISOString();
      
      await fs.promises.writeFile(todayPostsPath, yaml.dump(todayPosts));
      console.log('📝 [Today Posts] Updated today\'s posts record');
    } catch (error) {
      console.error('❌ [Save Today Posts] Error:', error);
    }
  }
  
  private async updateSuccessPatterns(successData: any): Promise<void> {
    try {
      const learningDir = join(process.cwd(), 'data', 'learning');
      const successPatternsPath = join(learningDir, 'success-patterns.yaml');
      
      await fs.promises.mkdir(learningDir, { recursive: true });
      
      let successPatterns: any = { patterns: [] };
      if (fs.existsSync(successPatternsPath)) {
        successPatterns = loadYamlSafe(successPatternsPath) || { patterns: [] };
      }
      
      successPatterns.patterns.push(successData);
      successPatterns.updated_at = new Date().toISOString();
      
      // Keep only the last 50 success patterns
      if (successPatterns.patterns.length > 50) {
        successPatterns.patterns = successPatterns.patterns.slice(-50);
      }
      
      await fs.promises.writeFile(successPatternsPath, yaml.dump(successPatterns));
      console.log('📊 [Success Patterns] Updated success patterns');
    } catch (error) {
      console.error('❌ [Success Patterns] Error:', error);
    }
  }

  private async loadDataManagementConfig(): Promise<any> {
    try {
      const configPath = join(process.cwd(), 'data', 'config', 'autonomous-config.yaml');
      if (!fs.existsSync(configPath)) {
        return {
          learning_data_optimization: {
            enabled: true,
            max_file_size_mb: 5
          },
          performance_monitoring: {
            enabled: true
          }
        };
      }
      
      const config = loadYamlSafe(configPath) as any;
      return config?.data_management || {};
    } catch (error) {
      console.error('❌ [Config] Error loading data management config:', error);
      return {};
    }
  }

  // Legacy methods for backward compatibility (simplified)
  
  async step2_executeParallelAnalysis(): Promise<any> {
    console.log('🔄 [Legacy] Executing parallel analysis fallback');
    const state = await this.analyzeCurrentState();
    return {
      account: this.getFallbackAccountData(),
      information: { status: 'completed', executionTime: Date.now() },
      timestamp: Date.now()
    };
  }

  async generateBaselineContext(): Promise<any> {
    console.log('🔄 [Legacy] Generating baseline context');
    const state = await this.analyzeCurrentState();
    return {
      account: { healthScore: state.accountHealth },
      market: { trends: [], opportunities: [] },
      timestamp: Date.now()
    };
  }

  async preloadActionSpecificInformation(): Promise<any> {
    console.log('🔄 [Legacy] Preloading action specific information');
    return {
      status: 'success',
      executionTime: Date.now()
    };
  }
}

