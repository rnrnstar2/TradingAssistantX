/**
 * データ管理クラス
 * REQUIREMENTS.md準拠版 - 統合データ管理システム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';


export interface DecisionPattern {
  timestamp: string;
  context: {
    followers: number;
    last_post_hours_ago: number;
    market_trend: string;
  };
  decision: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  result: {
    engagement_rate: number;
    new_followers: number;
    success: boolean;
  };
}

export interface SuccessStrategy {
  high_engagement: {
    post_times: string[];
    topics: string[];
    hashtags: string[];
  };
  content_types: {
    [type: string]: {
      success_rate: number;
      avg_engagement: number;
    };
  };
}

export interface ActionResult {
  timestamp: string;
  action: string;
  content: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    engagement_rate: number;
  };
  success: boolean;
}

export interface SessionMemory {
  current_session: {
    start_time: string;
    actions_taken: number;
    last_action: string;
    next_scheduled: string;
  };
  memory: {
    recent_topics: string[];
    successful_hashtags: string[];
    follower_growth_trend: string;
  };
}

export interface CurrentStatus {
  account_status: {
    followers: number;
    following: number;
    tweets_today: number;
    engagement_rate_24h: number;
  };
  system_status: {
    last_execution: string;
    next_execution: string;
    errors_today: number;
    success_rate: number;
  };
  rate_limits: {
    posts_remaining: number;
    retweets_remaining: number;
    likes_remaining: number;
    reset_time: string;
  };
}

export interface ExecutionSummary {
  executionId: string;
  startTime: string;
  endTime?: string;
  decision: any; // ClaudeDecisionは別ファイルで定義されているため
  actions: Array<{
    type: string;
    timestamp: string;
    success: boolean;
    result?: any;
  }>;
  metrics: {
    totalActions: number;
    successCount: number;
    errorCount: number;
  };
}

export interface CurrentExecutionData {
  executionId: string;
  claudeOutputs: {
    decision?: any;
    content?: any;
    analysis?: any;
    searchQuery?: any;
  };
  kaitoResponses: Record<string, any>;
  posts: PostData[];
  summary: ExecutionSummary;
}

export interface PostData {
  id: string;
  timestamp: string;
  content: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

/**
 * 統合データ管理クラス
 * 設定・学習データ・実行コンテキストの一元管理
 */
export class DataManager {
  private readonly dataDir = path.join(process.cwd(), 'src', 'data');
  private readonly learningDir = path.join(this.dataDir, 'learning');
  private readonly contextDir = path.join(this.dataDir, 'context');
  private readonly currentDir = path.join(this.dataDir, 'current');
  private readonly historyDir = path.join(this.dataDir, 'history');
  private currentExecutionId: string | null = null;

  constructor() {
    console.log('✅ DataManager initialized - REQUIREMENTS.md準拠版');
    this.ensureDirectories();
  }


  // ============================================================================
  // LEARNING DATA MANAGEMENT
  // ============================================================================

  /**
   * 学習データの読み込み
   */
  async loadLearningData(): Promise<{
    decisionPatterns: DecisionPattern[];
    successStrategies: SuccessStrategy;
    actionResults: ActionResult[];
  }> {
    try {
      const [decisionPatterns, successStrategies, actionResults] = await Promise.all([
        this.loadDecisionPatterns(),
        this.loadSuccessStrategies(),
        this.loadActionResults()
      ]);

      console.log('✅ 学習データ読み込み完了:', {
        patterns: decisionPatterns.length,
        results: actionResults.length
      });

      return {
        decisionPatterns,
        successStrategies,
        actionResults
      };

    } catch (error) {
      console.error('❌ 学習データ読み込み失敗:', error);
      return {
        decisionPatterns: [],
        successStrategies: this.getDefaultSuccessStrategies(),
        actionResults: []
      };
    }
  }

  /**
   * 決定結果の記録
   */
  async saveDecisionResult(decision: any, result: any): Promise<void> {
    try {
      const pattern: DecisionPattern = {
        timestamp: new Date().toISOString(),
        context: {
          followers: result.context?.followers || 0,
          last_post_hours_ago: result.context?.last_post_hours_ago || 0,
          market_trend: result.context?.market_trend || 'neutral'
        },
        decision: {
          action: decision.action,
          reasoning: decision.reasoning,
          confidence: decision.confidence
        },
        result: {
          engagement_rate: result.engagement_rate || 0,
          new_followers: result.new_followers || 0,
          success: result.success || false
        }
      };

      await this.appendToLearningFile('decision-patterns.yaml', pattern);
      console.log('✅ 決定結果記録完了:', { action: decision.action, success: result.success });

    } catch (error) {
      console.error('❌ 決定結果記録失敗:', error);
    }
  }

  /**
   * 成功パターンの更新
   */
  async updateSuccessPatterns(patterns: any): Promise<void> {
    try {
      const strategiesPath = path.join(this.learningDir, 'success-strategies.yaml');
      const yamlStr = yaml.dump(patterns, { indent: 2 });
      await fs.writeFile(strategiesPath, yamlStr, 'utf-8');

      console.log('✅ 成功パターン更新完了');

    } catch (error) {
      console.error('❌ 成功パターン更新失敗:', error);
    }
  }

  /**
   * アクション結果の記録
   */
  async recordActionResult(action: string, content: string, metrics: any): Promise<void> {
    try {
      const result: ActionResult = {
        timestamp: new Date().toISOString(),
        action,
        content: content.substring(0, 200), // 最初の200文字のみ保存
        metrics: {
          likes: metrics.likes || 0,
          retweets: metrics.retweets || 0,
          replies: metrics.replies || 0,
          engagement_rate: metrics.engagement_rate || 0
        },
        success: metrics.engagement_rate > 2.0 // 2%以上をサクセスと判定
      };

      await this.appendToLearningFile('action-results.yaml', result);
      console.log('✅ アクション結果記録完了:', { action, engagement: result.metrics.engagement_rate });

    } catch (error) {
      console.error('❌ アクション結果記録失敗:', error);
    }
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * セッションメモリの読み込み
   */
  async loadSessionMemory(): Promise<SessionMemory> {
    try {
      const memoryPath = path.join(this.contextDir, 'session-memory.yaml');
      const content = await fs.readFile(memoryPath, 'utf-8');
      const memory = yaml.load(content) as SessionMemory;

      console.log('✅ セッションメモリ読み込み完了');
      return memory;

    } catch (error) {
      console.warn('⚠️ セッションメモリ読み込み失敗、デフォルト値使用');
      return this.getDefaultSessionMemory();
    }
  }

  /**
   * セッションメモリの保存
   */
  async saveSessionMemory(memory: SessionMemory): Promise<void> {
    try {
      const memoryPath = path.join(this.contextDir, 'session-memory.yaml');
      const yamlStr = yaml.dump(memory, { indent: 2 });
      await fs.writeFile(memoryPath, yamlStr, 'utf-8');

      console.log('✅ セッションメモリ保存完了');

    } catch (error) {
      console.error('❌ セッションメモリ保存失敗:', error);
    }
  }

  /**
   * 現在状況の読み込み
   */
  async loadCurrentStatus(): Promise<CurrentStatus> {
    try {
      const statusPath = path.join(this.contextDir, 'current-status.yaml');
      const content = await fs.readFile(statusPath, 'utf-8');
      const status = yaml.load(content) as CurrentStatus;

      console.log('✅ 現在状況読み込み完了');
      return status;

    } catch (error) {
      console.warn('⚠️ 現在状況読み込み失敗、デフォルト値使用');
      return this.getDefaultCurrentStatus();
    }
  }

  /**
   * 現在状況の保存
   */
  async saveCurrentStatus(status: CurrentStatus): Promise<void> {
    try {
      const statusPath = path.join(this.contextDir, 'current-status.yaml');
      const yamlStr = yaml.dump(status, { indent: 2 });
      await fs.writeFile(statusPath, yamlStr, 'utf-8');

      console.log('✅ 現在状況保存完了');

    } catch (error) {
      console.error('❌ 現在状況保存失敗:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * データベースの健全性チェック
   */
  async performHealthCheck(): Promise<{
    learning: boolean;
    context: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let learningOk = false;
    let contextOk = false;

    try {
      await this.loadLearningData();
      learningOk = true;
    } catch (error) {
      errors.push(`Learning data health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.loadCurrentStatus();
      contextOk = true;
    } catch (error) {
      errors.push(`Context health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('🏥 データベース健全性チェック完了:', {
      learning: learningOk,
      context: contextOk,
      errorCount: errors.length
    });

    return { learning: learningOk, context: contextOk, errors };
  }

  /**
   * データのクリーンアップ（古いデータの削除）
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 決定パターンのクリーンアップ
      const patterns = await this.loadDecisionPatterns();
      const filteredPatterns = patterns.filter(pattern => 
        new Date(pattern.timestamp) > cutoffDate
      );

      if (filteredPatterns.length !== patterns.length) {
        await this.saveLearningFile('decision-patterns.yaml', { patterns: filteredPatterns });
        console.log(`🧹 古い決定パターンを削除: ${patterns.length - filteredPatterns.length}件`);
      }

      // アクション結果のクリーンアップ
      const results = await this.loadActionResults();
      const filteredResults = results.filter(result => 
        new Date(result.timestamp) > cutoffDate
      );

      if (filteredResults.length !== results.length) {
        await this.saveLearningFile('action-results.yaml', { results: filteredResults });
        console.log(`🧹 古いアクション結果を削除: ${results.length - filteredResults.length}件`);
      }

      console.log('✅ データクリーンアップ完了');

    } catch (error) {
      console.error('❌ データクリーンアップ失敗:', error instanceof Error ? error.message : error);
    }
  }

  // ============================================================================
  // CURRENT LAYER MANAGEMENT - MVP最小構成
  // ============================================================================

  /**
   * 新規実行サイクル開始
   * 既存currentをhistoryにアーカイブし、新規実行ディレクトリを作成
   */
  async initializeExecutionCycle(): Promise<string> {
    try {
      // 既存currentをhistoryにアーカイブ（存在する場合）
      if (this.currentExecutionId) {
        await this.archiveCurrentToHistory();
      }

      // 新規実行ID生成（execution-YYYYMMDD-HHMM形式）
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      
      this.currentExecutionId = `execution-${year}${month}${day}-${hour}${minute}`;
      
      // 実行ディレクトリ作成
      const executionDir = path.join(this.currentDir, this.currentExecutionId);
      await Promise.all([
        fs.mkdir(path.join(executionDir, 'claude-outputs'), { recursive: true }),
        fs.mkdir(path.join(executionDir, 'kaito-responses'), { recursive: true }),
        fs.mkdir(path.join(executionDir, 'posts'), { recursive: true })
      ]);

      // 実行サマリー初期化
      const initialSummary: ExecutionSummary = {
        executionId: this.currentExecutionId,
        startTime: now.toISOString(),
        decision: null,
        actions: [],
        metrics: {
          totalActions: 0,
          successCount: 0,
          errorCount: 0
        }
      };

      await this.saveExecutionSummary(initialSummary);
      
      // active-session.yaml更新
      const activeSession = {
        executionId: this.currentExecutionId,
        startTime: now.toISOString(),
        status: 'active'
      };
      await fs.writeFile(
        path.join(this.currentDir, 'active-session.yaml'),
        yaml.dump(activeSession, { indent: 2 }),
        'utf-8'
      );

      console.log(`✅ 新規実行サイクル初期化完了: ${this.currentExecutionId}`);
      return this.currentExecutionId;

    } catch (error) {
      console.error('❌ 実行サイクル初期化失敗:', error);
      throw new Error(`Failed to initialize execution cycle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claude出力保存
   * 指定タイプのClaude出力をYAML形式で保存
   */
  async saveClaudeOutput(type: 'decision' | 'content' | 'analysis' | 'search-query', data: any): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle. Call initializeExecutionCycle first.');
      }

      const outputPath = path.join(
        this.currentDir,
        this.currentExecutionId,
        'claude-outputs',
        `${type}.yaml`
      );

      const outputData = {
        timestamp: new Date().toISOString(),
        type,
        data
      };

      await fs.writeFile(
        outputPath,
        yaml.dump(outputData, { indent: 2 }),
        'utf-8'
      );

      console.log(`✅ Claude出力保存完了: ${type}`);

      // 実行サマリー更新（decisionの場合）
      if (type === 'decision') {
        const summary = await this.loadExecutionSummary();
        summary.decision = data;
        await this.saveExecutionSummary(summary);
      }

    } catch (error) {
      console.error(`❌ Claude出力保存失敗 (${type}):`, error);
      throw new Error(`Failed to save Claude output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Kaito応答保存（最新20件制限対応）
   * Kaito APIからの応答を保存し、古いファイルを自動削除
   */
  async saveKaitoResponse(type: string, data: any): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle. Call initializeExecutionCycle first.');
      }

      const responsesDir = path.join(
        this.currentDir,
        this.currentExecutionId,
        'kaito-responses'
      );

      // タイムスタンプ付きファイル名生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${type}-${timestamp}.yaml`;

      const responseData = {
        timestamp: new Date().toISOString(),
        type,
        data
      };

      await fs.writeFile(
        path.join(responsesDir, filename),
        yaml.dump(responseData, { indent: 2 }),
        'utf-8'
      );

      // 最新20件制限チェック
      const files = await fs.readdir(responsesDir);
      const sortedFiles = files
        .filter(f => f.endsWith('.yaml'))
        .sort((a, b) => b.localeCompare(a)); // 新しい順

      // 20件を超えたら古いファイルを削除
      if (sortedFiles.length > 20) {
        const filesToDelete = sortedFiles.slice(20);
        await Promise.all(
          filesToDelete.map(file => 
            fs.unlink(path.join(responsesDir, file))
          )
        );
        console.log(`🧹 古いKaito応答ファイル削除: ${filesToDelete.length}件`);
      }

      console.log(`✅ Kaito応答保存完了: ${type}`);

    } catch (error) {
      console.error(`❌ Kaito応答保存失敗 (${type}):`, error);
      throw new Error(`Failed to save Kaito response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 投稿データ保存（1投稿1ファイル）
   * 投稿データを個別ファイルとして保存し、インデックスを更新
   */
  async savePost(postData: any): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle. Call initializeExecutionCycle first.');
      }

      const postsDir = path.join(
        this.currentDir,
        this.currentExecutionId,
        'posts'
      );

      // 投稿ID生成（post-TIMESTAMP形式）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const postId = `post-${timestamp}`;
      
      const post: PostData = {
        id: postId,
        timestamp: new Date().toISOString(),
        content: postData.content || postData.text || '',
        metrics: postData.metrics || {
          likes: 0,
          retweets: 0,
          replies: 0
        }
      };

      // 投稿ファイル保存
      await fs.writeFile(
        path.join(postsDir, `${postId}.yaml`),
        yaml.dump(post, { indent: 2 }),
        'utf-8'
      );

      // インデックス更新
      await this.updatePostIndex(post);

      console.log(`✅ 投稿保存完了: ${postId}`);

    } catch (error) {
      console.error('❌ 投稿保存失敗:', error);
      throw new Error(`Failed to save post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 実行サマリー更新
   * 実行中のアクションと結果を記録
   */
  async updateExecutionSummary(summary: ExecutionSummary): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle. Call initializeExecutionCycle first.');
      }

      await this.saveExecutionSummary(summary);
      console.log('✅ 実行サマリー更新完了');

    } catch (error) {
      console.error('❌ 実行サマリー更新失敗:', error);
      throw new Error(`Failed to update execution summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HISTORY LAYER MANAGEMENT - MVP最小構成
  // ============================================================================

  /**
   * Current層をHistoryにアーカイブ
   * 実行完了後にcurrentディレクトリをhistoryに移動
   */
  async archiveCurrentToHistory(): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        console.warn('⚠️ アーカイブ対象の実行サイクルがありません');
        return;
      }

      const currentExecDir = path.join(this.currentDir, this.currentExecutionId);
      
      // ディレクトリが存在するか確認
      try {
        await fs.access(currentExecDir);
      } catch {
        console.warn(`⚠️ アーカイブ対象ディレクトリが存在しません: ${currentExecDir}`);
        return;
      }

      // 実行サマリーに終了時刻を記録
      try {
        const summary = await this.loadExecutionSummary();
        summary.endTime = new Date().toISOString();
        await this.saveExecutionSummary(summary);
      } catch (error) {
        console.warn('⚠️ 実行サマリーの終了時刻更新に失敗:', error);
      }

      // 月別ディレクトリパス生成（YYYY-MM形式）
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthDir = path.join(this.historyDir, yearMonth);
      
      // 月別ディレクトリ作成
      await fs.mkdir(monthDir, { recursive: true });

      // アーカイブ先パス（DD-HHMM形式）
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const archiveName = `${day}-${hour}${minute}`;
      const archivePath = path.join(monthDir, archiveName);

      // ディレクトリをhistoryに移動（Node.jsではrenameを使用）
      await fs.rename(currentExecDir, archivePath);

      // active-session.yamlをクリア
      const inactiveSession = {
        executionId: null,
        status: 'inactive',
        lastArchived: this.currentExecutionId,
        archivedAt: new Date().toISOString()
      };
      await fs.writeFile(
        path.join(this.currentDir, 'active-session.yaml'),
        yaml.dump(inactiveSession, { indent: 2 }),
        'utf-8'
      );

      console.log(`✅ 実行サイクルアーカイブ完了: ${this.currentExecutionId} → ${yearMonth}/${archiveName}`);
      this.currentExecutionId = null;

    } catch (error) {
      console.error('❌ アーカイブ失敗:', error);
      throw new Error(`Failed to archive current to history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 過去データ参照（月指定）
   * 指定月のアーカイブデータを取得
   */
  async getHistoryData(yearMonth: string): Promise<any> {
    try {
      const monthDir = path.join(this.historyDir, yearMonth);
      
      // ディレクトリ存在確認
      try {
        await fs.access(monthDir);
      } catch {
        console.warn(`⚠️ 指定月のアーカイブが存在しません: ${yearMonth}`);
        return { executions: [], summary: { totalExecutions: 0, yearMonth } };
      }

      // 月内の全実行ディレクトリを取得
      const execDirs = await fs.readdir(monthDir);
      const executions = [];

      for (const execDir of execDirs) {
        const execPath = path.join(monthDir, execDir);
        const stat = await fs.stat(execPath);
        
        if (stat.isDirectory()) {
          try {
            // 実行サマリーを読み込み
            const summaryPath = path.join(execPath, 'execution-summary.yaml');
            const summaryContent = await fs.readFile(summaryPath, 'utf-8');
            const summary = yaml.load(summaryContent) as ExecutionSummary;
            
            executions.push({
              directory: execDir,
              summary
            });
          } catch (error) {
            console.warn(`⚠️ 実行サマリー読み込みスキップ: ${execDir}`);
          }
        }
      }

      console.log(`✅ 履歴データ取得完了: ${yearMonth} (${executions.length}件)`);
      
      return {
        executions,
        summary: {
          totalExecutions: executions.length,
          yearMonth
        }
      };

    } catch (error) {
      console.error(`❌ 履歴データ取得失敗 (${yearMonth}):`, error);
      throw new Error(`Failed to get history data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * アーカイブ整合性チェック
   * アーカイブの構造と内容の整合性を検証
   */
  async validateArchive(): Promise<boolean> {
    try {
      let isValid = true;
      const issues: string[] = [];

      // historyディレクトリの存在確認
      try {
        await fs.access(this.historyDir);
      } catch {
        issues.push('Historyディレクトリが存在しません');
        isValid = false;
      }

      // 月別ディレクトリの検証
      if (isValid) {
        const monthDirs = await fs.readdir(this.historyDir);
        
        for (const monthDir of monthDirs) {
          const monthPath = path.join(this.historyDir, monthDir);
          const stat = await fs.stat(monthPath);
          
          if (stat.isDirectory()) {
            // YYYY-MM形式の検証
            if (!/^\d{4}-\d{2}$/.test(monthDir)) {
              issues.push(`不正な月別ディレクトリ名: ${monthDir}`);
              isValid = false;
            }
            
            // 実行ディレクトリの検証
            const execDirs = await fs.readdir(monthPath);
            for (const execDir of execDirs) {
              const execPath = path.join(monthPath, execDir);
              const execStat = await fs.stat(execPath);
              
              if (execStat.isDirectory()) {
                // DD-HHMM形式の検証
                if (!/^\d{2}-\d{4}$/.test(execDir)) {
                  issues.push(`不正な実行ディレクトリ名: ${monthDir}/${execDir}`);
                  isValid = false;
                }
                
                // 必須ファイルの存在確認
                const requiredFiles = ['execution-summary.yaml'];
                for (const file of requiredFiles) {
                  try {
                    await fs.access(path.join(execPath, file));
                  } catch {
                    issues.push(`必須ファイル不足: ${monthDir}/${execDir}/${file}`);
                    isValid = false;
                  }
                }
              }
            }
          }
        }
      }

      if (isValid) {
        console.log('✅ アーカイブ整合性チェック: 正常');
      } else {
        console.error('❌ アーカイブ整合性チェック: 問題あり', issues);
      }

      return isValid;

    } catch (error) {
      console.error('❌ アーカイブ整合性チェック失敗:', error);
      return false;
    }
  }

  // ============================================================================
  // DATA RETRIEVAL INTEGRATION - MVP最小構成
  // ============================================================================

  /**
   * 現在の実行データ取得
   * 現在実行中のサイクルの全データを統合して返却
   */
  async getCurrentExecutionData(): Promise<CurrentExecutionData> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle');
      }

      const execDir = path.join(this.currentDir, this.currentExecutionId);
      
      // Claude出力の読み込み
      const claudeOutputs: any = {};
      const outputTypes = ['decision', 'content', 'analysis', 'search-query'];
      
      for (const type of outputTypes) {
        try {
          const outputPath = path.join(execDir, 'claude-outputs', `${type}.yaml`);
          const content = await fs.readFile(outputPath, 'utf-8');
          const data = yaml.load(content) as any;
          claudeOutputs[type.replace('-', '')] = data.data;
        } catch {
          // ファイルが存在しない場合はスキップ
        }
      }

      // Kaito応答の読み込み
      const kaitoResponses: Record<string, any> = {};
      try {
        const responsesDir = path.join(execDir, 'kaito-responses');
        const files = await fs.readdir(responsesDir);
        
        for (const file of files) {
          if (file.endsWith('.yaml')) {
            const content = await fs.readFile(path.join(responsesDir, file), 'utf-8');
            const data = yaml.load(content) as any;
            kaitoResponses[data.type] = data.data;
          }
        }
      } catch {
        // ディレクトリが存在しない場合はスキップ
      }

      // 投稿データの読み込み
      const posts = await this.loadPostsFromDirectory(path.join(execDir, 'posts'));

      // 実行サマリーの読み込み
      const summary = await this.loadExecutionSummary();

      const executionData: CurrentExecutionData = {
        executionId: this.currentExecutionId,
        claudeOutputs,
        kaitoResponses,
        posts,
        summary
      };

      console.log('✅ 現在実行データ取得完了');
      return executionData;

    } catch (error) {
      console.error('❌ 現在実行データ取得失敗:', error);
      throw new Error(`Failed to get current execution data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 最近の投稿データ取得（差分取得対応）
   * currentとhistoryから指定件数の投稿を時系列で取得
   */
  async getRecentPosts(limit: number = 20): Promise<PostData[]> {
    try {
      const allPosts: PostData[] = [];

      // Current層から投稿取得
      if (this.currentExecutionId) {
        const currentPostsDir = path.join(this.currentDir, this.currentExecutionId, 'posts');
        const currentPosts = await this.loadPostsFromDirectory(currentPostsDir);
        allPosts.push(...currentPosts);
      }

      // 不足分をHistory層から取得
      if (allPosts.length < limit) {
        const needed = limit - allPosts.length;
        const historyPosts = await this.getRecentPostsFromHistory(needed);
        allPosts.push(...historyPosts);
      }

      // タイムスタンプで降順ソート（新しい順）
      allPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 指定件数に制限
      const recentPosts = allPosts.slice(0, limit);

      console.log(`✅ 最近の投稿取得完了: ${recentPosts.length}件`);
      return recentPosts;

    } catch (error) {
      console.error('❌ 最近の投稿取得失敗:', error);
      return [];
    }
  }

  // ============================================================================
  // ALIAS METHODS - 指示書準拠のメソッド名
  // ============================================================================

  /**
   * 新しい実行サイクル開始（指示書準拠のエイリアス）
   */
  async startNewCycle(): Promise<string> {
    return this.initializeExecutionCycle();
  }

  /**
   * 現在サイクルへの保存（指示書準拠の汎用メソッド）
   */
  async saveToCurrentCycle(type: string, data: any): Promise<void> {
    try {
      if (!this.currentExecutionId) {
        throw new Error('No active execution cycle. Call startNewCycle first.');
      }

      const execDir = path.join(this.currentDir, this.currentExecutionId);
      const outputDir = path.join(execDir, 'claude-outputs');
      
      const filePath = path.join(outputDir, `${type}.yaml`);
      const yamlContent = yaml.dump({
        type,
        timestamp: new Date().toISOString(),
        data
      }, { indent: 2 });

      await fs.writeFile(filePath, yamlContent, 'utf-8');
      console.log(`✅ ${type}データを現在サイクルに保存`);
    } catch (error) {
      console.error(`❌ ${type}データ保存失敗:`, error);
      throw error;
    }
  }

  /**
   * サイクル完了・アーカイブ（指示書準拠のエイリアス）
   */
  async archiveCycle(cycleId: string): Promise<void> {
    if (cycleId !== this.currentExecutionId) {
      console.warn(`⚠️ 指定されたサイクルID (${cycleId}) は現在のサイクルと一致しません`);
    }
    return this.archiveCurrentToHistory();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async ensureDirectories(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.learningDir, { recursive: true }),
        fs.mkdir(this.contextDir, { recursive: true }),
        fs.mkdir(this.currentDir, { recursive: true }),
        fs.mkdir(this.historyDir, { recursive: true })
      ]);
    } catch (error) {
      console.error('❌ ディレクトリ作成失敗:', error instanceof Error ? error.message : error);
    }
  }

  private async loadDecisionPatterns(): Promise<DecisionPattern[]> {
    try {
      const patternsPath = path.join(this.learningDir, 'decision-patterns.yaml');
      const content = await fs.readFile(patternsPath, 'utf-8');
      const data = yaml.load(content) as { patterns: DecisionPattern[] };
      return data.patterns || [];
    } catch (error) {
      return [];
    }
  }

  private async loadSuccessStrategies(): Promise<SuccessStrategy> {
    try {
      const strategiesPath = path.join(this.learningDir, 'success-strategies.yaml');
      const content = await fs.readFile(strategiesPath, 'utf-8');
      const strategies = yaml.load(content) as { strategies: SuccessStrategy };
      return strategies.strategies || this.getDefaultSuccessStrategies();
    } catch (error) {
      return this.getDefaultSuccessStrategies();
    }
  }

  private async loadActionResults(): Promise<ActionResult[]> {
    try {
      const resultsPath = path.join(this.learningDir, 'action-results.yaml');
      const content = await fs.readFile(resultsPath, 'utf-8');
      const data = yaml.load(content) as { results: ActionResult[] };
      return data.results || [];
    } catch (error) {
      return [];
    }
  }

  private async appendToLearningFile(filename: string, data: any): Promise<void> {
    const filePath = path.join(this.learningDir, filename);
    
    try {
      // 既存データを読み込み
      let existingData: any = { patterns: [], results: [], strategies: {} };
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existingData = yaml.load(content) as any;
      } catch (error) {
        // ファイルが存在しない場合は新規作成
      }

      // データを追加
      if (filename === 'decision-patterns.yaml') {
        existingData.patterns = existingData.patterns || [];
        existingData.patterns.push(data);
      } else if (filename === 'action-results.yaml') {
        existingData.results = existingData.results || [];
        existingData.results.push(data);
      }

      // ファイルに保存
      const yamlStr = yaml.dump(existingData, { indent: 2 });
      await fs.writeFile(filePath, yamlStr, 'utf-8');

    } catch (error) {
      console.error(`❌ 学習データファイル更新失敗 (${filename}):`, error instanceof Error ? error.message : error);
    }
  }

  private async saveLearningFile(filename: string, data: any): Promise<void> {
    const filePath = path.join(this.learningDir, filename);
    const yamlStr = yaml.dump(data, { indent: 2 });
    await fs.writeFile(filePath, yamlStr, 'utf-8');
  }

  // デフォルト値生成メソッド群

  private getDefaultSuccessStrategies(): SuccessStrategy {
    return {
      high_engagement: {
        post_times: ['09:00', '12:00', '18:00'],
        topics: ['market_analysis', 'educational_content'],
        hashtags: ['#投資', '#資産形成']
      },
      content_types: {
        educational: {
          success_rate: 0.78,
          avg_engagement: 2.8
        },
        market_commentary: {
          success_rate: 0.65,
          avg_engagement: 2.1
        }
      }
    };
  }

  private getDefaultSessionMemory(): SessionMemory {
    return {
      current_session: {
        start_time: new Date().toISOString(),
        actions_taken: 0,
        last_action: 'none',
        next_scheduled: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      memory: {
        recent_topics: ['市場分析', '投資戦略', 'リスク管理'],
        successful_hashtags: ['#投資', '#資産形成', '#投資教育'],
        follower_growth_trend: 'stable'
      }
    };
  }

  private getDefaultCurrentStatus(): CurrentStatus {
    return {
      account_status: {
        followers: 100,
        following: 50,
        tweets_today: 0,
        engagement_rate_24h: 2.5
      },
      system_status: {
        last_execution: '',
        next_execution: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        errors_today: 0,
        success_rate: 1.0
      },
      rate_limits: {
        posts_remaining: 10,
        retweets_remaining: 20,
        likes_remaining: 50,
        reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    };
  }

  private async loadExecutionSummary(): Promise<ExecutionSummary> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const summaryPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'execution-summary.yaml'
    );

    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      return yaml.load(content) as ExecutionSummary;
    } catch (error) {
      throw new Error(`Failed to load execution summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveExecutionSummary(summary: ExecutionSummary): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const summaryPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'execution-summary.yaml'
    );

    await fs.writeFile(
      summaryPath,
      yaml.dump(summary, { indent: 2 }),
      'utf-8'
    );
  }

  private async updatePostIndex(post: PostData): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const indexPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'posts',
      'post-index.yaml'
    );

    let index: { posts: Array<{ id: string; timestamp: string; summary: string }> } = { posts: [] };

    // 既存インデックスの読み込み
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = yaml.load(content) as typeof index;
    } catch {
      // ファイルが存在しない場合は新規作成
    }

    // 新規投稿を追加
    index.posts.push({
      id: post.id,
      timestamp: post.timestamp,
      summary: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
    });

    // インデックスを保存
    await fs.writeFile(
      indexPath,
      yaml.dump(index, { indent: 2 }),
      'utf-8'
    );
  }

  private async loadPostsFromDirectory(directory: string): Promise<PostData[]> {
    const posts: PostData[] = [];

    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        if (file.startsWith('post-') && file.endsWith('.yaml')) {
          try {
            const content = await fs.readFile(path.join(directory, file), 'utf-8');
            const post = yaml.load(content) as PostData;
            posts.push(post);
          } catch (error) {
            console.warn(`⚠️ 投稿ファイル読み込みスキップ: ${file}`);
          }
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は空配列を返す
    }

    return posts;
  }

  private async getRecentPostsFromHistory(limit: number): Promise<PostData[]> {
    const posts: PostData[] = [];

    try {
      // 最新月から順に検索
      const monthDirs = await fs.readdir(this.historyDir);
      const sortedMonths = monthDirs
        .filter(dir => /^\d{4}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a)); // 新しい月順

      for (const monthDir of sortedMonths) {
        if (posts.length >= limit) break;

        const monthPath = path.join(this.historyDir, monthDir);
        const execDirs = await fs.readdir(monthPath);
        const sortedExecs = execDirs
          .filter(dir => /^\d{2}-\d{4}$/.test(dir))
          .sort((a, b) => b.localeCompare(a)); // 新しい実行順

        for (const execDir of sortedExecs) {
          if (posts.length >= limit) break;

          const postsDir = path.join(monthPath, execDir, 'posts');
          const execPosts = await this.loadPostsFromDirectory(postsDir);
          
          // 新しい順にソートして必要な分だけ追加
          execPosts.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          const needed = limit - posts.length;
          posts.push(...execPosts.slice(0, needed));
        }
      }
    } catch (error) {
      console.warn('⚠️ History層からの投稿取得でエラー:', error);
    }

    return posts;
  }

  private async checkFileCountLimit(directory: string, maxFiles: number): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));
      
      if (yamlFiles.length >= maxFiles) {
        console.warn(`⚠️ ファイル数が上限に達しています: ${yamlFiles.length}/${maxFiles}`);
        // 最も古いファイルを削除
        const sortedFiles = yamlFiles.sort((a, b) => a.localeCompare(b));
        const toDelete = sortedFiles[0];
        await fs.unlink(path.join(directory, toDelete));
        console.log(`🧹 古いファイルを削除: ${toDelete}`);
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }

  private async checkDirectorySize(directory: string, maxSizeMB: number): Promise<boolean> {
    try {
      let totalSize = 0;
      
      const calculateDirSize = async (dir: string): Promise<number> => {
        let size = 0;
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            size += await calculateDirSize(itemPath);
          } else {
            size += stat.size;
          }
        }
        
        return size;
      };
      
      totalSize = await calculateDirSize(directory);
      const sizeMB = totalSize / (1024 * 1024);
      
      if (sizeMB > maxSizeMB) {
        console.warn(`⚠️ ディレクトリサイズが制限を超えています: ${sizeMB.toFixed(2)}MB / ${maxSizeMB}MB`);
        return false;
      }
      
      return true;
    } catch (error) {
      // ディレクトリが存在しない場合はtrue
      return true;
    }
  }
}