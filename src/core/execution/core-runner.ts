/**
 * Core Runner - Claude Code SDK中心の実行制御
 * 
 * 責務:
 * - Claudeとの対話制御
 * - Claudeの決定に基づく実行
 * - 実行結果のフィードバック
 * 
 * すべての意思決定はClaudeに委譲し、このクラスは実行役に徹する
 */

import { ClaudeAutonomousAgent } from '../claude-autonomous-agent.js';
import { ContentCreator } from '../../services/content-creator.js';
import { createXPosterFromEnv } from '../../services/x-poster.js';
import type { PostResult } from '../../services/x-poster.js';
import type { ClaudeActionType, SystemContext, ClaudeDecision } from '../../types/core-types';
import * as path from 'path';


export interface ExecutionOptions {
  enableLogging?: boolean;
  outputDir?: string;
}

export interface ExecutionResult {
  success: boolean;
  timestamp: string;
  rssDataCount: number;
  postResult?: PostResult;
  error?: string;
  executionTime: number;
}

export class CoreRunner {
  private claudeAgent: ClaudeAutonomousAgent;
  private outputDir: string;
  private isExecuting: boolean = false;
  
  constructor(private options: ExecutionOptions = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'tasks', 'outputs');
    
    // Claude中心のモジュール初期化
    this.claudeAgent = new ClaudeAutonomousAgent();
    
    if (options.enableLogging) {
      console.log('🤖 [CoreRunner] Claude Code SDK中心の実行システム初期化完了');
    }
  }

  /**
   * Claude中心の自律実行フロー - 簡素化版
   */
  async runAutonomousFlow(): Promise<ExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Execution already in progress');
    }
    
    this.isExecuting = true;
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    if (this.options.enableLogging) {
      console.log('🚀 [CoreRunner] Claude自律実行フロー開始');
      console.log(`🆔 [Execution ID] ${executionId}`);
    }

    try {
      // 1. 基本的な現在状況を収集
      const context = await this.gatherSystemContext();
      
      // 2. Claudeに次の行動を聞く（MVP版）
      const decision = await this.claudeAgent.decideMVPAction(context);
      
      // 3. Claudeの決定を実行
      const result = await this.executeClaudeDecision(decision, executionId);
      
      return this.createSuccessResult(result, startTime);
      
    } catch (error) {
      console.error('Execution failed:', error);
      return this.createErrorResult(error, startTime);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 現在のシステム状況を収集
   */
  private async gatherSystemContext(): Promise<SystemContext> {
    if (this.options.enableLogging) {
      console.log('📊 [Context] システム状況を収集中...');
    }

    // 簡略化されたシステム状況を収集
    const context: SystemContext = {
      timestamp: new Date().toISOString(),
      account: { 
        followerCount: 1000,
        engagementRate: 0.05,
        lastPostTime: null,
        recentPerformance: {
          impressions: 0,
          likes: 0,
          retweets: 0,
          replies: 0
        }
      },
      system: { 
        health: {
          all_systems_operational: true,
          api_connectivity: true,
          data_integrity: true,
          memory_usage_ok: true
        },
        executionCount: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0
        }
      },
      market: { 
        volatility: 'low',
        trendingTopics: [],
        importantNews: []
      },
      history: {
        recentPosts: [],
        lastExecutionTime: null
      }
    };

    if (this.options.enableLogging) {
      console.log('✅ [Context] システム状況収集完了');
    }

    return context;
  }


  /**
   * Claudeの決定を実行 - 簡素化版
   */
  private async executeClaudeDecision(decision: ClaudeDecision, executionId: string): Promise<any> {
    if (this.options.enableLogging) {
      console.log(`⚡ [Execute] アクション実行: ${decision.action}`);
    }

    return await this.executeWithBasicErrorHandling(
      async () => {
        switch (decision.action) {
          case 'collect_data':
            return await this.executeDataCollection(decision.parameters);
            
          case 'create_post':
            return await this.executePostCreation(decision.parameters);
            
          case 'analyze':
            return await this.executeAnalysis(decision.parameters);
            
          case 'wait':
            return await this.executeWait(decision.parameters);
            
          default:
            throw new Error(`Unknown action: ${decision.action}`);
        }
      },
      `execute_${decision.action}`
    );
  }

  /**
   * データ収集の実行 (RSS削除により一時的に無効化)
   */
  private async executeDataCollection(parameters: any): Promise<any> {
    // TODO: X API Collectorを実装後に有効化
    console.log('📊 [Data Collection] RSS削除により一時的にスキップ中...');
    
    return {
      success: true,
      action: 'collect_data',
      dataCount: 0,
      data: { message: 'RSS collector removed - awaiting X API implementation' }
    };
  }

  /**
   * 投稿作成の実行
   */
  private async executePostCreation(parameters: any): Promise<any> {
    const contentCreator = new ContentCreator();
    const xPoster = createXPosterFromEnv();
    
    // Claudeが生成したコンテンツを使用
    const postContent = await contentCreator.create({
      theme: parameters.theme,
      content: parameters.content,
      hashtags: parameters.hashtags
    });
    
    // PostContentをGeneratedContentに変換
    const generatedContent = {
      theme: parameters.theme || '投資教育',
      content: postContent.content,
      hashtags: postContent.hashtags || [],
      style: 'educational'
    };
    
    // MODE チェック（統一環境変数）
    if (process.env.MODE !== 'production') {
      if (this.options.enableLogging) {
        console.log('🧪 [DEV MODE] X投稿をスキップ（開発モード）');
        console.log('📝 [投稿内容]');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(generatedContent.content);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 [文字数]: ${generatedContent.content.length}/280文字`);
        console.log(`🏷️ [ハッシュタグ]: ${generatedContent.hashtags ? generatedContent.hashtags.join(' ') : 'なし'}`);
      }
      
      return {
        success: true,
        action: 'create_post',
        postResult: {
          success: true,
          postId: 'dev_' + Date.now(),
          finalContent: generatedContent.content,
          timestamp: new Date()
        },
        message: 'Dev mode - post skipped'
      };
    }
    
    // 投稿実行
    const postResult = await xPoster.postToX(generatedContent);
    
    return {
      success: postResult.success,
      action: 'create_post',
      postResult,
      message: postResult.success ? 'Posted successfully' : 'Failed to post'
    };
  }


  /**
   * 待機の実行
   */
  private async executeWait(parameters: any): Promise<any> {
    const duration = parameters.duration || 60000; // デフォルト1分
    const reason = parameters.reason || 'Strategic wait';
    
    if (this.options.enableLogging) {
      console.log(`⏱️ [Wait] ${duration}ms 待機中... 理由: ${reason}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return {
      success: true,
      action: 'wait',
      duration,
      reason
    };
  }

  /**
   * アカウント分析の実行（フォロワー数のみ）
   */
  private async executeAnalysis(parameters: any): Promise<any> {
    if (this.options.enableLogging) {
      console.log('📊 [Analysis] アカウント状況分析中...');
    }
    
    // MVP: シンプルなフォロワー数確認のみ
    const accountAnalysis = {
      followerCount: 1000, // 実際の実装では実データを取得
      lastAnalysis: new Date().toISOString(),
      growth: parameters.checkGrowth ? '+10 since last check' : 'not checked',
      recommendation: this.getSimpleRecommendation(1000)
    };
    
    if (this.options.enableLogging) {
      console.log(`✅ [Analysis] フォロワー数: ${accountAnalysis.followerCount}`);
    }
    
    return {
      success: true,
      action: 'analyze',
      data: accountAnalysis
    };
  }

  private getSimpleRecommendation(followerCount: number): string {
    if (followerCount < 500) return 'focus_on_content_quality';
    if (followerCount < 1000) return 'increase_posting_frequency';
    return 'maintain_current_strategy';
  }




  /**
   * 実行IDを生成
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 基本的なエラーハンドリング
   */
  private async executeWithBasicErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${operationName} failed:`, error);
      return null;
    }
  }

  /**
   * 成功結果を作成
   */
  private createSuccessResult(result: any, startTime: number): ExecutionResult {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      rssDataCount: result?.dataCount || 0,
      postResult: result?.postResult,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * エラー結果を作成
   */
  private createErrorResult(error: unknown, startTime: number): ExecutionResult {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      rssDataCount: 0,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime
    };
  }
}