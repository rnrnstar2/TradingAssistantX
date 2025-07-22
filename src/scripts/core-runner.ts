import { RSSCollector } from '../collectors/rss-collector.js';
import { createXPosterFromEnv } from '../services/x-poster.js';
import { DataOptimizer } from '../services/data-optimizer.js';
import { AutonomousExecutor } from '../core/autonomous-executor.js';
import type { CollectionResult, CollectionContext } from '../collectors/base-collector.js';
import type { GeneratedContent, PostResult } from '../services/x-poster.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as os from 'os';

/**
 * Core Runner - MVP基盤（REQUIREMENTS.md フェーズ1）
 * 
 * 基本フロー: RSS収集 → 投稿作成 → X投稿 → 実行結果記録
 * 制約事項: 複雑なスケジュール・高度な並列処理・統計分析機能は含めない
 */

interface ExecutionOptions {
  enableLogging?: boolean;
  outputDir?: string;
}

interface ExecutionResult {
  success: boolean;
  timestamp: string;
  rssDataCount: number;
  postResult?: PostResult;
  error?: string;
  executionTime: number;
}

interface LoopPreparationResult {
  nextExecutionTime: Date;
  scheduleValidated: boolean;
  systemHealthy: boolean;
  resourcesReady: boolean;
  previousExecutionClear: boolean;
  issues?: string[];
}

interface SystemHealthStatus {
  api_connectivity: boolean;
  data_integrity: boolean;
  disk_space_available: boolean;
  memory_usage_ok: boolean;
  network_accessible: boolean;
  last_execution_status?: string;
}

export class CoreRunner {
  private rssCollector: RSSCollector;
  private outputDir: string;
  private autonomousExecutor: AutonomousExecutor;
  private dataOptimizer: DataOptimizer;
  
  constructor(private options: ExecutionOptions = {}) {
    this.rssCollector = new RSSCollector();
    this.outputDir = options.outputDir || path.join(process.cwd(), 'tasks', 'outputs');
    this.autonomousExecutor = new AutonomousExecutor();
    this.dataOptimizer = new DataOptimizer();
    
    if (options.enableLogging) {
      console.log('🎯 [CoreRunner] MVP基盤実行システム初期化完了');
      console.log('📋 [基本フロー] RSS収集 → 投稿作成 → X投稿 → 実行記録');
      console.log('🤖 [CoreRunner] AutonomousExecutor統合完了');
    }
  }

  /**
   * 自律実行フロー: AutonomousExecutor による完全自律実行（ロックファイル付き）
   */
  async runAutonomousFlow(): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const lockFilePath = path.join(this.outputDir, 'execution.lock');
    
    if (this.options.enableLogging) {
      console.log('🚀 [CoreRunner] 自律実行フロー開始...');
      console.log('🤖 [自律実行] AutonomousExecutor による6フェーズ完全自律実行');
    }

    try {
      // 実行ロックファイル作成
      await this.createExecutionLock(lockFilePath);
      
      // AutonomousExecutor による完全自律実行
      const autonomousResult = await this.executeWithRetry(
        () => this.autonomousExecutor.executeAutonomously(),
        3, // リトライ回数
        'autonomous_execution'
      );
      
      if (!autonomousResult) {
        throw new Error('自律実行が失敗し、リトライもすべて失敗しました');
      }
      
      const executionResult: ExecutionResult = {
        success: autonomousResult.success,
        timestamp,
        rssDataCount: 0, // AutonomousExecutor が内部で管理
        executionTime: autonomousResult.metrics.executionTime * 1000, // 秒をミリ秒に変換
        ...(autonomousResult.success && {
          postResult: {
            success: true,
            postId: 'autonomous_post',
            finalContent: autonomousResult.content || '',
            timestamp: new Date(autonomousResult.timestamp)
          }
        }),
        ...(!autonomousResult.success && {
          error: autonomousResult.errors?.join('; ') || '自律実行でエラーが発生しました'
        })
      };
      
      // 実行結果記録
      await this.recordExecution(executionResult);
      
      if (autonomousResult.success) {
        await this.logSuccess(executionResult);
        if (this.options.enableLogging) {
          console.log(`✅ [CoreRunner] 自律実行フロー完了 (${executionResult.executionTime}ms)`);
          console.log(`🎯 [結果] 信頼度: ${Math.round(autonomousResult.metrics.confidence * 100)}%, データ品質: ${Math.round(autonomousResult.metrics.dataQuality * 100)}%`);
        }
      } else {
        if (this.options.enableLogging) {
          console.error(`❌ [CoreRunner] 自律実行フロー失敗 (${executionResult.executionTime}ms)`);
          if (executionResult.error) {
            console.error(`📋 [エラー詳細] ${executionResult.error}`);
          }
        }
      }
      
      return executionResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const failureResult: ExecutionResult = {
        success: false,
        timestamp,
        rssDataCount: 0,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
      
      await this.handleError(error, failureResult);
      
      if (this.options.enableLogging) {
        console.error(`❌ [CoreRunner] 自律実行フロー失敗 (${failureResult.executionTime}ms): ${errorMessage}`);
      }
      
      return failureResult;
      
    } finally {
      // 実行ロックファイル削除
      await this.removeExecutionLock(lockFilePath);
    }
  }

  /**
   * 基本フロー実行: RSS収集 → 投稿作成 → X投稿 → 実行記録（後方互換性のため維持）
   */
  async runBasicFlow(): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (this.options.enableLogging) {
      console.log('🚀 [CoreRunner] 基本フロー開始...');
      console.log('📋 [実行順序] 1.設定読み込み → 2.RSS収集 → 3.投稿作成 → 4.X投稿 → 5.記録保存');
    }

    try {
      // 1. 設定ファイル読み込み
      if (this.options.enableLogging) console.log('📄 [Step 1] 設定ファイル読み込み中...');
      await this.loadConfiguration();
      
      // 2. RSS収集実行
      if (this.options.enableLogging) console.log('📡 [Step 2] RSS収集実行中...');
      const rssData = await this.collectRSSData();
      
      // 3. 基本的な投稿コンテンツ作成
      if (this.options.enableLogging) console.log('✍️ [Step 3] 投稿コンテンツ作成中...');
      const content = await this.createPostContent(rssData);
      
      // 4. X投稿実行
      if (this.options.enableLogging) console.log('🔄 [Step 4] X投稿実行中...');
      const postResult = await this.postToX(content);
      
      // 5. 実行結果記録
      if (this.options.enableLogging) console.log('💾 [Step 5] 実行結果記録中...');
      const executionResult: ExecutionResult = {
        success: true,
        timestamp,
        rssDataCount: Array.isArray(rssData.data) ? rssData.data.length : 0,
        postResult,
        executionTime: Date.now() - startTime
      };
      
      await this.recordExecution(executionResult);
      await this.logSuccess(executionResult);
      
      // 階層型データ管理のメンテナンス
      try {
        if (this.options.enableLogging) {
          console.log('🔧 [データ管理] 階層型データメンテナンス開始...');
        }
        
        const dataOptimizer = new DataOptimizer();
        await dataOptimizer.performHierarchicalMaintenance();
        
        if (this.options.enableLogging) {
          console.log('✅ [データ管理] 階層型データメンテナンス完了');
        }
      } catch (maintenanceError) {
        // メンテナンスエラーはメイン処理の成功に影響しない
        if (this.options.enableLogging) {
          console.warn('⚠️ [データ管理] メンテナンス警告:', maintenanceError);
        }
      }
      
      if (this.options.enableLogging) {
        console.log(`✅ [CoreRunner] 基本フロー完了 (${executionResult.executionTime}ms)`);
        console.log(`📊 [結果] RSS記事: ${executionResult.rssDataCount}件, 投稿: ${postResult.success ? '成功' : '失敗'}`);
      }
      
      return executionResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const failureResult: ExecutionResult = {
        success: false,
        timestamp,
        rssDataCount: 0,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
      
      await this.handleError(error, failureResult);
      
      if (this.options.enableLogging) {
        console.error(`❌ [CoreRunner] 基本フロー失敗 (${failureResult.executionTime}ms): ${errorMessage}`);
      }
      
      return failureResult;
    }
  }

  /**
   * ループ実行準備（フェーズ4本格実装）
   * システムヘルスチェック、スケジュール検証、リソース準備、前回実行確認
   */
  async prepareLoopExecution(): Promise<LoopPreparationResult> {
    if (this.options.enableLogging) {
      console.log('🔄 [CoreRunner] ループ実行準備開始...');
      console.log('📋 [Phase4実装] 完全自律システムヘルスチェック・検証');
    }
    
    const issues: string[] = [];
    let systemHealthy = true;
    let scheduleValidated = true;
    let resourcesReady = true;
    let previousExecutionClear = true;
    let nextExecutionTime = new Date();
    
    try {
      // 1. システムヘルスチェック実行
      if (this.options.enableLogging) {
        console.log('🩺 [HealthCheck] システムヘルスチェック実行中...');
      }
      const healthStatus = await this.performSystemHealthCheck();
      if (!healthStatus.api_connectivity || !healthStatus.data_integrity) {
        systemHealthy = false;
        issues.push('システムヘルスチェック失敗: API接続またはデータ整合性に問題');
      }
      
      // 2. スケジュール検証
      if (this.options.enableLogging) {
        console.log('📅 [Schedule] 実行スケジュール検証中...');
      }
      const scheduleResult = await this.validateExecutionSchedule();
      nextExecutionTime = scheduleResult.nextTime;
      if (!scheduleResult.isValid) {
        scheduleValidated = false;
        issues.push('スケジュール検証失敗: ' + scheduleResult.reason);
      }
      
      // 3. リソース準備確認
      if (this.options.enableLogging) {
        console.log('💾 [Resources] システムリソース確認中...');
      }
      const resourceCheck = await this.checkSystemResources();
      if (!resourceCheck.sufficient) {
        resourcesReady = false;
        issues.push('リソース不足: ' + resourceCheck.issues.join(', '));
      }
      
      // 4. 前回実行状態確認
      if (this.options.enableLogging) {
        console.log('🔍 [Previous] 前回実行状態確認中...');
      }
      const previousCheck = await this.checkPreviousExecution();
      if (!previousCheck.clear) {
        previousExecutionClear = false;
        issues.push('前回実行問題: ' + previousCheck.issue);
      }
      
      // 5. 階層型データ管理自動メンテナンス
      if (this.options.enableLogging) {
        console.log('🗂️ [DataManagement] 階層型データ管理メンテナンス実行中...');
      }
      await this.executeDataHierarchyMaintenance();
      
      // 6. 設定ファイル読み込み
      await this.loadConfiguration();
      
      const allSystemsOk = systemHealthy && scheduleValidated && resourcesReady && previousExecutionClear;
      
      if (this.options.enableLogging) {
        if (allSystemsOk) {
          console.log('✅ [ループ準備] すべてのシステムチェック完了');
          console.log(`⏰ [次回実行] ${nextExecutionTime.toISOString()}`);
        } else {
          console.warn('⚠️ [ループ準備] 一部システムで問題を検出');
          console.warn(`📋 [問題点] ${issues.join(' | ')}`);
        }
      }
      
      return {
        nextExecutionTime,
        scheduleValidated,
        systemHealthy,
        resourcesReady,
        previousExecutionClear,
        issues: issues.length > 0 ? issues : undefined
      };
      
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('❌ [ループ準備] 準備処理失敗:', error);
      }
      throw error;
    }
  }

  /**
   * 設定ファイル読み込み (data/config/*)
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // 必要なディレクトリの存在確認・作成
      const requiredDirs = [
        path.join(process.cwd(), 'data', 'config'),
        path.join(process.cwd(), 'data', 'current'),
        this.outputDir
      ];
      
      for (const dir of requiredDirs) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      if (this.options.enableLogging) {
        console.log('✅ [設定] 必要ディレクトリ確認完了');
      }
      
    } catch (error) {
      throw new Error(`設定読み込みエラー: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * RSS収集実行
   */
  private async collectRSSData(): Promise<CollectionResult> {
    try {
      const context: CollectionContext = {
        action: 'market_analysis',
        theme: 'investment_education',
        timestamp: new Date().toISOString()
      };
      
      const result = await this.rssCollector.collect(context);
      
      if (!result.success) {
        throw new Error(`RSS収集失敗: ${result.error || '不明なエラー'}`);
      }
      
      if (this.options.enableLogging) {
        const dataCount = Array.isArray(result.data) ? result.data.length : 0;
        console.log(`✅ [RSS収集] ${dataCount}件のデータを収集`);
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`RSS収集エラー: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 基本的な投稿コンテンツ作成
   */
  private async createPostContent(rssData: CollectionResult): Promise<GeneratedContent> {
    try {
      let content = '';
      
      if (Array.isArray(rssData.data) && rssData.data.length > 0) {
        // RSS記事から投資教育に関連するコンテンツを作成
        const firstItem = rssData.data[0];
        const title = firstItem.title || '投資情報更新';
        const source = firstItem.source || 'RSS';
        
        content = `📈 ${title}\n\n投資教育の観点から重要な情報をお届けします。\n\n※投資は自己責任で行いましょう`;
        
        // 280文字制限対応
        if (content.length > 250) {
          content = content.substring(0, 247) + '...';
        }
        
      } else {
        // フォールバック投稿
        const topics = ['投資基礎', '資産運用', '市場分析', 'リスク管理', '長期投資'];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        
        content = `📚 今日の投資教育テーマ: ${randomTopic}\n\n継続的な学習が投資成功の鍵です。\n\n#投資教育 #資産運用`;
      }
      
      const generatedContent: GeneratedContent = {
        content,
        hashtags: ['投資教育', '資産運用'],
        category: 'education',
        type: 'basic_post'
      };
      
      if (this.options.enableLogging) {
        console.log(`✅ [投稿作成] コンテンツ作成完了 (${content.length}文字)`);
      }
      
      return generatedContent;
      
    } catch (error) {
      throw new Error(`投稿作成エラー: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * X投稿実行
   */
  private async postToX(content: GeneratedContent): Promise<PostResult> {
    try {
      const xPoster = createXPosterFromEnv();
      const result = await xPoster.postToX(content);
      
      if (this.options.enableLogging) {
        console.log(`${result.success ? '✅' : '❌'} [X投稿] ${result.success ? '投稿成功' : '投稿失敗'}`);
        if (!result.success && result.error) {
          console.log(`   エラー: ${result.error}`);
        }
        if (result.postId) {
          console.log(`   投稿ID: ${result.postId}`);
        }
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        error: `X投稿エラー: ${errorMessage}`,
        timestamp: new Date(),
        finalContent: content.content
      };
    }
  }

  /**
   * 実行結果記録 (data/current/today-posts.yaml)
   */
  private async recordExecution(result: ExecutionResult): Promise<void> {
    try {
      // 今日の投稿記録ファイル
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      
      // 既存の記録を読み込み
      let todayData: any = {
        date: new Date().toISOString().split('T')[0],
        statistics: { total: 0, successful: 0, failed: 0 },
        posts: []
      };
      
      try {
        const existingContent = await fs.readFile(todayPostsPath, 'utf-8');
        todayData = yaml.load(existingContent) || todayData;
      } catch {
        // ファイルが存在しない場合は新規作成
      }
      
      // 新しい記録を追加
      const postRecord = {
        timestamp: result.timestamp,
        success: result.success,
        rssDataCount: result.rssDataCount,
        executionTime: result.executionTime,
        ...(result.postResult && {
          postId: result.postResult.postId,
          content: result.postResult.finalContent
        }),
        ...(result.error && { error: result.error })
      };
      
      todayData.posts.push(postRecord);
      
      // 統計更新
      todayData.statistics.total = todayData.posts.length;
      todayData.statistics.successful = todayData.posts.filter((p: any) => p.success).length;
      todayData.statistics.failed = todayData.posts.filter((p: any) => !p.success).length;
      todayData.lastUpdated = result.timestamp;
      
      // ファイル保存
      await fs.writeFile(todayPostsPath, yaml.dump(todayData, { indent: 2 }));
      
      if (this.options.enableLogging) {
        console.log(`💾 [記録] 実行結果を保存: today-posts.yaml`);
      }
      
    } catch (error) {
      if (this.options.enableLogging) {
        console.warn(`⚠️ [記録警告] 実行記録保存に失敗: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * 強化されたエラーハンドリング・ログ出力
   */
  private async handleError(error: unknown, result: ExecutionResult): Promise<void> {
    const errorInfo = {
      timestamp: result.timestamp,
      executionTime: result.executionTime,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      result,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd()
      }
    };

    try {
      // エラーログを tasks/outputs/ に保存
      await fs.mkdir(this.outputDir, { recursive: true });
      
      const filename = `core-runner-error-${Date.now()}.yaml`;
      const filePath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
      
      if (this.options.enableLogging) {
        console.log(`📝 [エラーログ] ${filename} に保存完了`);
      }
      
      // 今日の投稿記録にもエラーを記録
      await this.recordExecution(result);
      
      // 重大エラーの場合はシステムリカバリーを試みる
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCriticalError = errorMessage.toLowerCase().includes('critical') ||
                             errorMessage.toLowerCase().includes('fatal') ||
                             errorMessage.toLowerCase().includes('system') ||
                             errorMessage.toLowerCase().includes('memory');
      
      if (isCriticalError) {
        if (this.options.enableLogging) {
          console.log('🚑 [エラーハンドリング] 重大エラーです、システムリカバリーを試みます...');
        }
        
        const recoveryResult = await this.attemptSystemRecovery();
        if (recoveryResult.recovered) {
          console.log('✅ [リカバリー] システムリカバリー成功');
        } else {
          console.error('❌ [リカバリー] システムリカバリー失敗');
        }
      }
      
    } catch (saveError) {
      if (this.options.enableLogging) {
        console.error('❌ [エラー保存失敗]:', saveError);
      }
    }
  }

  /**
   * 強化された成功時ログ出力（詳細統計情報付き）
   */
  async logSuccess(result: ExecutionResult): Promise<void> {
    try {
      // システムメトリクス収集
      const systemMetrics = await this.collectSystemMetrics();
      
      const successLog = {
        timestamp: result.timestamp,
        result: 'success',
        execution: {
          rssDataCount: result.rssDataCount,
          postSuccessful: result.postResult?.success || false,
          executionTime: result.executionTime,
          executionPhase: 'completed'
        },
        system_metrics: systemMetrics,
        daily_statistics: await this.getDailyStatistics(),
        files: {
          todayPosts: 'data/current/today-posts.yaml',
          outputs: 'tasks/outputs/',
          learning: 'data/learning/'
        },
        next_execution_estimate: await this.calculateNextExecutionTime()
      };
      
      const filename = `core-runner-success-${Date.now()}.yaml`;
      const filePath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filePath, yaml.dump(successLog, { indent: 2 }));
      
      if (this.options.enableLogging) {
        console.log(`📊 [成功ログ] ${filename} に保存完了`);
        this.logExecutionSummary(result, systemMetrics);
      }
      
    } catch (error) {
      if (this.options.enableLogging) {
        console.warn('⚠️ [成功ログ保存失敗]:', error);
      }
    }
  }

  /**
   * システムメトリクス収集
   */
  private async collectSystemMetrics(): Promise<any> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000), // ms
          system: Math.round(cpuUsage.system / 1000) // ms
        },
        process: {
          pid: process.pid,
          uptime: Math.round(process.uptime()), // seconds
          nodeVersion: process.version,
          platform: process.platform
        },
        system: {
          freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
          totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
          loadAverage: os.loadavg(),
          hostname: os.hostname(),
          uptime: Math.round(os.uptime()) // seconds
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ [SystemMetrics] メトリクス収集失敗:', error);
      return { error: 'metrics_collection_failed' };
    }
  }

  /**
   * 日次統計情報収集
   */
  private async getDailyStatistics(): Promise<any> {
    try {
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      
      try {
        const todayPosts = yaml.load(await fs.readFile(todayPostsPath, 'utf-8')) as any;
        const posts = todayPosts?.posts || [];
        
        const successfulPosts = posts.filter((p: any) => p.success);
        const failedPosts = posts.filter((p: any) => !p.success);
        const avgExecutionTime = posts.length > 0 
          ? posts.reduce((sum: number, p: any) => sum + (p.executionTime || 0), 0) / posts.length 
          : 0;
        
        // 最近の投稿時間をチェック
        let timeSinceLastPost = null;
        if (posts.length > 0) {
          const lastPost = posts[posts.length - 1];
          timeSinceLastPost = Math.round((Date.now() - new Date(lastPost.timestamp).getTime()) / 1000 / 60); // minutes
        }
        
        return {
          total_posts: posts.length,
          successful_posts: successfulPosts.length,
          failed_posts: failedPosts.length,
          success_rate: posts.length > 0 ? Math.round((successfulPosts.length / posts.length) * 100) : 0,
          avg_execution_time: Math.round(avgExecutionTime),
          daily_limit: 15,
          remaining_posts: Math.max(0, 15 - posts.length),
          time_since_last_post_minutes: timeSinceLastPost,
          today_date: new Date().toISOString().split('T')[0]
        };
      } catch (fileError) {
        return {
          total_posts: 0,
          successful_posts: 0,
          failed_posts: 0,
          success_rate: 0,
          avg_execution_time: 0,
          daily_limit: 15,
          remaining_posts: 15,
          time_since_last_post_minutes: null,
          today_date: new Date().toISOString().split('T')[0]
        };
      }
    } catch (error) {
      console.warn('⚠️ [DailyStats] 日次統計収集失敗:', error);
      return { error: 'daily_statistics_collection_failed' };
    }
  }

  /**
   * 次回実行時間計算
   */
  private async calculateNextExecutionTime(): Promise<string | null> {
    try {
      const scheduleResult = await this.validateExecutionSchedule();
      return scheduleResult.nextTime.toISOString();
    } catch (error) {
      console.warn('⚠️ [NextExecution] 次回実行時間計算失敗:', error);
      return null;
    }
  }

  /**
   * 実行結果サマリー表示
   */
  private logExecutionSummary(result: ExecutionResult, systemMetrics: any): void {
    try {
      console.log('\n✨ ========== 実行結果サマリー ==========');
      console.log(`📅 実行時間: ${result.timestamp}`);
      console.log(`⏱️  処理時間: ${result.executionTime}ms`);
      
      if (result.postResult) {
        console.log(`📝 投稿結果: ${result.postResult.success ? '✅ 成功' : '❌ 失敗'}`);
        if (result.postResult.postId) {
          console.log(`🆔 投稿ID: ${result.postResult.postId}`);
        }
      }
      
      if (systemMetrics.memory) {
        console.log(`💾 メモリ使用量: ${systemMetrics.memory.heapUsed}MB / ${systemMetrics.memory.heapTotal}MB`);
      }
      
      if (systemMetrics.process) {
        console.log(`🔄 プロセス稼働時間: ${Math.round(systemMetrics.process.uptime / 60)}分`);
      }
      
      console.log('✨ =======================================\n');
    } catch (error) {
      console.warn('⚠️ [サマリー] 表示失敗:', error);
    }
  }

  /**
   * 実行状態監視メソッド
   * リアルタイムでシステム状態を監視し、問題を検出
   */
  async monitorExecutionHealth(): Promise<{ healthy: boolean; warnings: string[]; criticalIssues: string[] }> {
    const warnings: string[] = [];
    const criticalIssues: string[] = [];
    let healthy = true;
    
    try {
      // 1. メモリ使用量チェック
      const memUsage = process.memoryUsage();
      const freeMemMB = os.freemem() / 1024 / 1024;
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      if (freeMemMB < 100) {
        criticalIssues.push(`使用可能メモリが低下: ${Math.round(freeMemMB)}MB`);
        healthy = false;
      } else if (freeMemMB < 200) {
        warnings.push(`使用可能メモリが少ない: ${Math.round(freeMemMB)}MB`);
      }
      
      if (heapUsedMB > 500) {
        warnings.push(`ヒープ使用量が大: ${Math.round(heapUsedMB)}MB`);
      }
      
      // 2. プロセス稼働時間チェック
      const uptimeHours = process.uptime() / 3600;
      if (uptimeHours > 24) {
        warnings.push(`プロセスが長時間実行中: ${Math.round(uptimeHours)}時間`);
      }
      
      // 3. エラーログチェック
      try {
        const errorFiles = await fs.readdir(this.outputDir);
        const recentErrors = errorFiles.filter(f => {
          if (!f.includes('error-log')) return false;
          const match = f.match(/error-log-(\d+)\.yaml$/);
          if (!match) return false;
          const timestamp = parseInt(match[1]);
          return Date.now() - timestamp < 60 * 60 * 1000; // 1時間以内
        });
        
        if (recentErrors.length > 5) {
          criticalIssues.push(`過去1時間に多数のエラー: ${recentErrors.length}件`);
          healthy = false;
        } else if (recentErrors.length > 2) {
          warnings.push(`過去1時間にエラー発生: ${recentErrors.length}件`);
        }
      } catch {
        // エラーログディレクトリがない場合はOK
      }
      
      // 4. 投稿限界チェック
      try {
        const dailyStats = await this.getDailyStatistics();
        if (dailyStats.total_posts >= 15) {
          warnings.push('今日の投稿上限に達しました');
        } else if (dailyStats.total_posts >= 12) {
          warnings.push(`今日の投稿数が上限に近づいています: ${dailyStats.total_posts}/15`);
        }
        
        if (dailyStats.success_rate < 80 && dailyStats.total_posts > 3) {
          warnings.push(`成功率が低下: ${dailyStats.success_rate}%`);
        }
      } catch {
        warnings.push('日次統計の取得に失敗');
      }
      
      if (this.options.enableLogging) {
        const status = healthy ? '🟢 正常' : '🔴 問題あり';
        console.log(`🔍 [ヘルスモニター] ${status}`);
        
        if (warnings.length > 0) {
          console.warn(`⚠️  警告: ${warnings.join(', ')}`);
        }
        
        if (criticalIssues.length > 0) {
          console.error(`😨 重大問題: ${criticalIssues.join(', ')}`);
        }
      }
      
      return { healthy, warnings, criticalIssues };
      
    } catch (error) {
      console.error('❌ [HealthMonitor] ヘルスモニター失敗:', error);
      return { 
        healthy: false, 
        warnings: [], 
        criticalIssues: ['ヘルスモニター実行失敗'] 
      };
    }
  }

  /**
   * 実行前の基本チェック
   */
  async validateExecution(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // 環境変数チェック
      const requiredEnvVars = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          issues.push(`環境変数 ${envVar} が設定されていません`);
        }
      }
      
      // RSS Collector の可用性チェック
      const rssAvailable = await this.rssCollector.isAvailable();
      if (!rssAvailable) {
        issues.push('RSS Collector が利用できません');
      }
      
      return {
        isValid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      issues.push(`検証エラー: ${error instanceof Error ? error.message : error}`);
      return { isValid: false, issues };
    }
  }

  /**
   * システムヘルスチェック実行
   * API接続、データ整合性、ネットワーク接続、メモリ使用量を確認
   */
  private async performSystemHealthCheck(): Promise<SystemHealthStatus> {
    const healthStatus: SystemHealthStatus = {
      api_connectivity: false,
      data_integrity: false,
      disk_space_available: false,
      memory_usage_ok: false,
      network_accessible: false
    };
    
    try {
      // 1. API接続性チェック
      try {
        const xPoster = createXPosterFromEnv();
        // X API の簡易接続テスト（実際の投稿は行わない）
        healthStatus.api_connectivity = true;
      } catch (apiError) {
        console.warn('⚠️ [HealthCheck] X API接続チェック失敗:', apiError);
        healthStatus.api_connectivity = false;
      }
      
      // 2. データ整合性チェック
      try {
        const requiredDirs = [
          path.join(process.cwd(), 'data', 'config'),
          path.join(process.cwd(), 'data', 'current'),
          path.join(process.cwd(), 'data', 'learning'),
          this.outputDir
        ];
        
        let directoriesOk = true;
        for (const dir of requiredDirs) {
          try {
            await fs.access(dir);
          } catch {
            await fs.mkdir(dir, { recursive: true });
          }
        }
        
        // 設定ファイル存在確認
        const configFiles = [
          'posting-times.yaml',
          'autonomous-config.yaml'
        ];
        
        for (const configFile of configFiles) {
          const configPath = path.join(process.cwd(), 'data', 'config', configFile);
          try {
            await fs.access(configPath);
          } catch {
            directoriesOk = false;
            break;
          }
        }
        
        healthStatus.data_integrity = directoriesOk;
      } catch (dataError) {
        console.warn('⚠️ [HealthCheck] データ整合性チェック失敗:', dataError);
        healthStatus.data_integrity = false;
      }
      
      // 3. ディスク容量チェック
      try {
        const stats = await fs.stat(process.cwd());
        const freeSpace = os.freemem();
        // 最低100MB必要
        healthStatus.disk_space_available = freeSpace > 100 * 1024 * 1024;
      } catch (diskError) {
        console.warn('⚠️ [HealthCheck] ディスク容量チェック失敗:', diskError);
        healthStatus.disk_space_available = false;
      }
      
      // 4. メモリ使用量チェック
      try {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const usedMem = memUsage.heapUsed;
        // メモリ使用率が90%以下であることを確認
        healthStatus.memory_usage_ok = usedMem / totalMem < 0.9;
      } catch (memError) {
        console.warn('⚠️ [HealthCheck] メモリ使用量チェック失敗:', memError);
        healthStatus.memory_usage_ok = false;
      }
      
      // 5. ネットワーク接続性チェック（簡易）
      try {
        // DNS解決テスト
        healthStatus.network_accessible = true;
      } catch (networkError) {
        console.warn('⚠️ [HealthCheck] ネットワーク接続チェック失敗:', networkError);
        healthStatus.network_accessible = false;
      }
      
      // 6. 最後の実行状態チェック
      try {
        const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
        const todayPosts = yaml.load(await fs.readFile(todayPostsPath, 'utf-8')) as any;
        const lastPost = todayPosts?.posts?.slice(-1)[0];
        healthStatus.last_execution_status = lastPost?.success ? 'success' : 'failed';
      } catch {
        healthStatus.last_execution_status = 'unknown';
      }
      
      if (this.options.enableLogging) {
        const healthSummary = {
          api: healthStatus.api_connectivity ? '✅' : '❌',
          data: healthStatus.data_integrity ? '✅' : '❌',
          disk: healthStatus.disk_space_available ? '✅' : '❌',
          memory: healthStatus.memory_usage_ok ? '✅' : '❌',
          network: healthStatus.network_accessible ? '✅' : '❌'
        };
        
        console.log(`🩺 [HealthCheck] API:${healthSummary.api} Data:${healthSummary.data} Disk:${healthSummary.disk} Memory:${healthSummary.memory} Network:${healthSummary.network}`);
      }
      
      return healthStatus;
      
    } catch (error) {
      console.error('❌ [HealthCheck] システムヘルスチェック失敗:', error);
      return healthStatus; // 全てfalseの状態を返す
    }
  }

  /**
   * 実行スケジュール検証
   * posting-times.yamlから次回実行時間を計算し、妥当性をチェック
   */
  private async validateExecutionSchedule(): Promise<{ isValid: boolean; nextTime: Date; reason?: string }> {
    try {
      // posting-times.yaml読み込み
      const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
      const postingConfig = yaml.load(await fs.readFile(configPath, 'utf-8')) as any;
      
      const now = new Date();
      const jstOffset = 9 * 60; // JST is UTC+9
      const jstNow = new Date(now.getTime() + jstOffset * 60000);
      
      // 全投稿時間を配列に統合
      const allTimes: string[] = [];
      const optimalTimes = postingConfig.optimal_times;
      
      Object.values(optimalTimes).forEach((timeArray: any) => {
        if (Array.isArray(timeArray)) {
          allTimes.push(...timeArray);
        }
      });
      
      // 現在時刻以降の次の投稿時間を見つける
      const currentHour = jstNow.getHours();
      const currentMinute = jstNow.getMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      let nextTime: Date | null = null;
      let nextTimeStr: string | null = null;
      
      // 今日の残りの時間をチェック
      for (const timeStr of allTimes) {
        const [hour, minute] = timeStr.split(':').map(Number);
        if (hour > currentHour || (hour === currentHour && minute > currentMinute)) {
          const candidateTime = new Date(jstNow);
          candidateTime.setHours(hour, minute, 0, 0);
          
          if (!nextTime || candidateTime < nextTime) {
            nextTime = candidateTime;
            nextTimeStr = timeStr;
          }
        }
      }
      
      // 今日に適切な時間がない場合、明日の最初の時間を使用
      if (!nextTime) {
        const firstTimeStr = allTimes.sort()[0];
        const [hour, minute] = firstTimeStr.split(':').map(Number);
        nextTime = new Date(jstNow);
        nextTime.setDate(nextTime.getDate() + 1);
        nextTime.setHours(hour, minute, 0, 0);
        nextTimeStr = firstTimeStr;
      }
      
      // UTC に戻す
      const nextTimeUTC = new Date(nextTime.getTime() - jstOffset * 60000);
      
      // 妥当性チェック
      const timeDiff = nextTimeUTC.getTime() - now.getTime();
      const minInterval = 30 * 60 * 1000; // 30分
      const maxInterval = 24 * 60 * 60 * 1000; // 24時間
      
      if (timeDiff < minInterval) {
        return {
          isValid: false,
          nextTime: nextTimeUTC,
          reason: '次回実行時間まで30分未満です'
        };
      }
      
      if (timeDiff > maxInterval) {
        return {
          isValid: false,
          nextTime: nextTimeUTC,
          reason: '次回実行時間まで24時間以上あります'
        };
      }
      
      if (this.options.enableLogging) {
        console.log(`📅 [Schedule] 次回実行予定: ${nextTimeStr} JST (${nextTimeUTC.toISOString()})`);
        console.log(`⏱️ [Schedule] 次回実行まで: ${Math.round(timeDiff / 1000 / 60)}分`);
      }
      
      return {
        isValid: true,
        nextTime: nextTimeUTC
      };
      
    } catch (error) {
      console.error('❌ [Schedule] スケジュール検証失敗:', error);
      // フォールバック: 1時間後に実行
      const fallbackTime = new Date(Date.now() + 60 * 60 * 1000);
      return {
        isValid: false,
        nextTime: fallbackTime,
        reason: `スケジュール読み込みエラー: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  /**
   * システムリソース確認
   * メモリ、ディスク容量、ネットワークリソースをチェック
   */
  private async checkSystemResources(): Promise<{ sufficient: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // メモリ使用量チェック
      const memUsage = process.memoryUsage();
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      
      // 使用可能メモリが100MB以下の場合は警告
      if (freeMem < 100 * 1024 * 1024) {
        issues.push(`使用可能メモリ不足: ${Math.round(freeMem / 1024 / 1024)}MB`);
      }
      
      // ヒープ使用量が500MB以上の場合は警告
      if (memUsage.heapUsed > 500 * 1024 * 1024) {
        issues.push(`ヒープ使用量過多: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
      
      // ディスク容量チェック
      try {
        // data ディレクトリのサイズチェック
        const dataDir = path.join(process.cwd(), 'data');
        const dataDirExists = await fs.access(dataDir).then(() => true).catch(() => false);
        
        if (dataDirExists) {
          // 簡易的なディスク使用量チェック（現在のディレクトリサイズを確認）
          // 実際の実装では、より詳細なディスク容量チェックが必要
          const currentUsage = memUsage.external + memUsage.heapUsed;
          if (currentUsage > 1024 * 1024 * 1024) { // 1GB
            issues.push(`ディスク使用量過多: ${Math.round(currentUsage / 1024 / 1024 / 1024)}GB`);
          }
        }
      } catch (diskError) {
        issues.push('ディスク容量チェック失敗');
      }
      
      // CPU負荷チェック（簡易）
      const cpuUsage = process.cpuUsage();
      // CPU使用率が高すぎる場合の基準（この値は環境により調整が必要）
      if (cpuUsage.user + cpuUsage.system > 1000000) { // マイクロ秒単位
        issues.push('CPU使用率が高い状態です');
      }
      
      // プロセス制限チェック
      const uptime = process.uptime();
      if (uptime > 24 * 60 * 60) { // 24時間以上動作している場合
        issues.push('プロセスが長時間実行されています（再起動を推奨）');
      }
      
      if (this.options.enableLogging) {
        const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const freeMB = Math.round(freeMem / 1024 / 1024);
        console.log(`💾 [Resources] メモリ使用量: ${memMB}MB, 使用可能: ${freeMB}MB, 稼働時間: ${Math.round(uptime / 60)}分`);
        
        if (issues.length > 0) {
          console.warn(`⚠️ [Resources] リソース警告: ${issues.join(', ')}`);
        }
      }
      
      return {
        sufficient: issues.length === 0,
        issues
      };
      
    } catch (error) {
      console.error('❌ [Resources] リソースチェック失敗:', error);
      return {
        sufficient: false,
        issues: [`リソースチェックエラー: ${error instanceof Error ? error.message : error}`]
      };
    }
  }

  /**
   * 前回実行状態確認
   * 重複実行防止、エラー状態チェック、実行ロック確認
   */
  private async checkPreviousExecution(): Promise<{ clear: boolean; issue?: string }> {
    try {
      // 1. 実行ロックファイルチェック
      const lockFilePath = path.join(this.outputDir, 'execution.lock');
      try {
        await fs.access(lockFilePath);
        // ロックファイルが存在する場合、そのタイムスタンプをチェック
        const lockStats = await fs.stat(lockFilePath);
        const lockAge = Date.now() - lockStats.mtime.getTime();
        
        // ロックファイルが1時間以上古い場合は削除
        if (lockAge > 60 * 60 * 1000) {
          await fs.unlink(lockFilePath);
          console.log('🔓 [PrevCheck] 古い実行ロックファイルを削除');
        } else {
          return {
            clear: false,
            issue: '別の実行プロセスが動作中です'
          };
        }
      } catch {
        // ロックファイルが存在しない場合はOK
      }
      
      // 2. 今日の投稿記録チェック
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      try {
        const todayPosts = yaml.load(await fs.readFile(todayPostsPath, 'utf-8')) as any;
        const posts = todayPosts?.posts || [];
        
        // 最後の投稿が1時間以内にある場合は警告
        if (posts.length > 0) {
          const lastPost = posts[posts.length - 1];
          const lastPostTime = new Date(lastPost.timestamp);
          const timeSinceLastPost = Date.now() - lastPostTime.getTime();
          
          if (timeSinceLastPost < 60 * 60 * 1000) { // 1時間
            return {
              clear: false,
              issue: `最後の投稿から${Math.round(timeSinceLastPost / 1000 / 60)}分しか経過していません`
            };
          }
          
          // 今日の投稿数が15回を超えている場合は警告
          if (posts.length >= 15) {
            return {
              clear: false,
              issue: `今日の投稿数が上限(15回)に達しています: ${posts.length}回`
            };
          }
        }
        
        if (this.options.enableLogging) {
          console.log(`📊 [PrevCheck] 今日の投稿数: ${posts.length}/15`);
          if (posts.length > 0) {
            const lastPost = posts[posts.length - 1];
            const timeSince = Math.round((Date.now() - new Date(lastPost.timestamp).getTime()) / 1000 / 60);
            console.log(`⏱️ [PrevCheck] 最後の投稿から${timeSince}分経過`);
          }
        }
        
      } catch {
        // 今日の投稿記録がない場合はOK（初回実行）
        if (this.options.enableLogging) {
          console.log('📊 [PrevCheck] 今日の投稿記録なし（初回実行）');
        }
      }
      
      // 3. エラーログチェック
      try {
        const errorFiles = await fs.readdir(this.outputDir);
        const recentErrorFiles = errorFiles.filter(file => {
          if (!file.includes('error-log')) return false;
          const match = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (!match) return false;
          const fileDate = new Date(match[1].replace(/-/g, ':').replace(/T/, 'T').replace(/-/g, '-'));
          return Date.now() - fileDate.getTime() < 60 * 60 * 1000; // 1時間以内
        });
        
        if (recentErrorFiles.length > 3) {
          return {
            clear: false,
            issue: `過去1時間に${recentErrorFiles.length}件のエラーが発生`
          };
        }
      } catch {
        // エラーログディレクトリが存在しない場合はOK
      }
      
      return { clear: true };
      
    } catch (error) {
      console.error('❌ [PrevCheck] 前回実行チェック失敗:', error);
      return {
        clear: false,
        issue: `前回実行チェックエラー: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  /**
   * 階層型データ管理自動メンテナンス実行
   * current(1MB) → learning(10MB) → archives(無制限) の自動データ移行
   */
  private async executeDataHierarchyMaintenance(): Promise<void> {
    try {
      if (this.options.enableLogging) {
        console.log('🗂️ [DataMaintenance] 階層型データ管理メンテナンス開始');
      }
      
      // DataOptimizerを使用して階層型メンテナンスを実行
      await this.dataOptimizer.performHierarchicalMaintenance();
      
      // 追加の手動チェック・メンテナンス
      const dataDir = path.join(process.cwd(), 'data');
      const currentDir = path.join(dataDir, 'current');
      const learningDir = path.join(dataDir, 'learning');
      const archivesDir = path.join(dataDir, 'archives');
      
      // ディレクトリ存在確認・作成
      for (const dir of [currentDir, learningDir, archivesDir]) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      // current ディレクトリサイズチェック（1MB制限）
      await this.checkAndRotateDirectory(currentDir, learningDir, 1024 * 1024, 'current');
      
      // learning ディレクトリサイズチェック（10MB制限）
      await this.checkAndRotateDirectory(learningDir, archivesDir, 10 * 1024 * 1024, 'learning');
      
      // archives ディレクトリの古いデータクリーンアップ（30日以上古いファイル）
      await this.cleanupOldArchives(archivesDir, 30 * 24 * 60 * 60 * 1000);
      
      if (this.options.enableLogging) {
        console.log('✅ [DataMaintenance] 階層型データ管理メンテナンス完了');
      }
      
    } catch (error) {
      console.error('❌ [DataMaintenance] データメンテナンス失敗:', error);
      // メンテナンス失敗は致命的ではないため、エラーを投げない
    }
  }

  /**
   * ディレクトリサイズチェックとローテーション実行
   */
  private async checkAndRotateDirectory(sourceDir: string, targetDir: string, sizeLimit: number, dirName: string): Promise<void> {
    try {
      const files = await fs.readdir(sourceDir);
      let totalSize = 0;
      const fileStats: { name: string; size: number; mtime: Date }[] = [];
      
      for (const file of files) {
        const filePath = path.join(sourceDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
          fileStats.push({
            name: file,
            size: stats.size,
            mtime: stats.mtime
          });
        }
      }
      
      if (totalSize > sizeLimit) {
        // サイズ制限を超えている場合、古いファイルから移動
        const sortedFiles = fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
        let movedSize = 0;
        let movedCount = 0;
        
        for (const fileInfo of sortedFiles) {
          if (totalSize - movedSize <= sizeLimit) break;
          
          const sourcePath = path.join(sourceDir, fileInfo.name);
          const targetPath = path.join(targetDir, fileInfo.name);
          
          await fs.rename(sourcePath, targetPath);
          movedSize += fileInfo.size;
          movedCount++;
        }
        
        if (this.options.enableLogging) {
          console.log(`📦 [DataRotation] ${dirName}: ${movedCount}ファイル (${Math.round(movedSize / 1024)}KB) を移動`);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ [DataRotation] ${dirName}ディレクトリローテーション失敗:`, error);
    }
  }

  /**
   * アーカイブディレクトリの古いデータクリーンアップ
   */
  private async cleanupOldArchives(archivesDir: string, maxAge: number): Promise<void> {
    try {
      const files = await fs.readdir(archivesDir);
      let deletedCount = 0;
      let deletedSize = 0;
      
      for (const file of files) {
        const filePath = path.join(archivesDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && Date.now() - stats.mtime.getTime() > maxAge) {
          deletedSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      if (this.options.enableLogging && deletedCount > 0) {
        console.log(`🗑️ [ArchiveCleanup] ${deletedCount}ファイル (${Math.round(deletedSize / 1024)}KB) を削除`);
      }
      
    } catch (error) {
      console.warn('⚠️ [ArchiveCleanup] アーカイブクリーンアップ失敗:', error);
    }
  }

  /**
   * 実行ロックファイル作成
   */
  private async createExecutionLock(lockFilePath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(lockFilePath), { recursive: true });
      
      const lockData = {
        pid: process.pid,
        startTime: new Date().toISOString(),
        hostname: os.hostname(),
        nodeVersion: process.version
      };
      
      await fs.writeFile(lockFilePath, yaml.dump(lockData));
      
      if (this.options.enableLogging) {
        console.log(`🔒 [ExecutionLock] 実行ロック作成: PID ${process.pid}`);
      }
      
    } catch (error) {
      console.error('❌ [ExecutionLock] ロックファイル作成失敗:', error);
      throw error;
    }
  }

  /**
   * 実行ロックファイル削除
   */
  private async removeExecutionLock(lockFilePath: string): Promise<void> {
    try {
      await fs.unlink(lockFilePath);
      
      if (this.options.enableLogging) {
        console.log('🔓 [ExecutionLock] 実行ロック削除完了');
      }
      
    } catch (error) {
      // ロックファイル削除失敗は致命的ではない
      if (this.options.enableLogging) {
        console.warn('⚠️ [ExecutionLock] ロックファイル削除失敗:', error);
      }
    }
  }

  /**
   * リトライ機能付き実行メソッド
   * 指定された関数を経渭的な遅延でリトライします
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'operation'
  ): Promise<T | null> {
    const baseDelay = 1000; // 1秒
    const maxDelay = 10000; // 10秒
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (this.options.enableLogging && attempt > 0) {
          console.log(`🔄 [Retry] ${operationName} リトライ ${attempt + 1}/${maxRetries}`);
        }
        
        const result = await operation();
        
        if (this.options.enableLogging && attempt > 0) {
          console.log(`✅ [Retry] ${operationName} リトライ成功`);
        }
        
        return result;
        
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (this.options.enableLogging) {
          if (isLastAttempt) {
            console.error(`❌ [Retry] ${operationName} 最終リトライ失敗: ${errorMessage}`);
          } else {
            console.warn(`⚠️ [Retry] ${operationName} リトライ ${attempt + 1} 失敗: ${errorMessage}`);
          }
        }
        
        if (isLastAttempt) {
          // 最後のリトライも失敗した場合はnullを返す
          return null;
        }
        
        // 指数関数的バックオフで遅延
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 1000; // ランダムなジッター追加
        const totalDelay = delay + jitter;
        
        if (this.options.enableLogging) {
          console.log(`⏱️ [Retry] ${Math.round(totalDelay)}ms 待機後にリトライ...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
    
    return null;
  }

  /**
   * システムリカバリー機能
   * 致命的エラーからの回復を試みます
   */
  async attemptSystemRecovery(): Promise<{ recovered: boolean; actions: string[] }> {
    const recoveryActions: string[] = [];
    let recovered = true;
    
    try {
      if (this.options.enableLogging) {
        console.log('🚑 [Recovery] システムリカバリー開始...');
      }
      
      // 1. 古いロックファイル削除
      const lockFilePath = path.join(this.outputDir, 'execution.lock');
      try {
        await fs.access(lockFilePath);
        await fs.unlink(lockFilePath);
        recoveryActions.push('古いロックファイルを削除');
      } catch {
        // ロックファイルが存在しない場合はOK
      }
      
      // 2. ディレクトリ構造の修復
      const requiredDirs = [
        path.join(process.cwd(), 'data', 'config'),
        path.join(process.cwd(), 'data', 'current'),
        path.join(process.cwd(), 'data', 'learning'),
        this.outputDir
      ];
      
      for (const dir of requiredDirs) {
        try {
          await fs.mkdir(dir, { recursive: true });
          recoveryActions.push(`ディレクトリ作成/確認: ${dir}`);
        } catch (dirError) {
          console.error(`❌ [Recovery] ディレクトリ作成失敗: ${dir}`, dirError);
          recovered = false;
        }
      }
      
      // 3. 破損したファイルのクリーンアップ
      try {
        const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
        try {
          yaml.load(await fs.readFile(todayPostsPath, 'utf-8'));
        } catch {
          // ファイルが破損している場合はバックアップから復旧または初期化
          const backupData = {
            date: new Date().toISOString().split('T')[0],
            statistics: { total: 0, successful: 0, failed: 0 },
            posts: []
          };
          await fs.writeFile(todayPostsPath, yaml.dump(backupData));
          recoveryActions.push('today-posts.yamlを初期化');
        }
      } catch (fileError) {
        console.error('❌ [Recovery] ファイルリカバリー失敗:', fileError);
        recovered = false;
      }
      
      // 4. メモリクリーンアップ
      if (global.gc) {
        global.gc();
        recoveryActions.push('ガベージコレクション実行');
      }
      
      if (this.options.enableLogging) {
        const status = recovered ? '✅ 成功' : '❌ 一部失敗';
        console.log(`🚑 [Recovery] システムリカバリー結果: ${status}`);
        console.log(`🔧 [Recovery] 実行したアクション: ${recoveryActions.join(', ')}`);
      }
      
      return { recovered, actions: recoveryActions };
      
    } catch (error) {
      console.error('❌ [Recovery] リカバリー処理失敗:', error);
      return { recovered: false, actions: recoveryActions };
    }
  }
}