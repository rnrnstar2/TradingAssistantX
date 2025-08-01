/**
 * データ管理クラス
 * REQUIREMENTS.md準拠版 - 統合データ管理システム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { DataManagerConfig, ReferenceAccountsConfig, ReferenceAccount } from './types';

// ClaudeOutputErrorクラスをre-export
export { ClaudeOutputError } from './types';

// ============================================================================
// 簡素化されたインターフェース（MVP版）
// ============================================================================

export interface EngagementMetrics {
  successRate: number;
  avgEngagement: number;
  sampleSize: number;
}

export interface LearningData {
  engagementPatterns: {
    timeSlots: { [timeSlot: string]: EngagementMetrics };
    contentTypes: { [type: string]: EngagementMetrics };
    topics: { [topic: string]: EngagementMetrics };
  };
  successfulTopics: {
    topics: Array<{
      topic: string;
      successRate: number;
      avgEngagement: number;
      bestTimeSlots: string[];
    }>;
  };
}

// ============================================================================
// 既存インターフェース（レガシー互換性維持）
// ============================================================================






export interface ExecutionSummary {
  executionId: string;
  startTime: string;
  endTime?: string;
  decision: any;
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

export interface PostData {
  executionId: string;
  actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
  timestamp: string;
  content?: string;
  targetTweetId?: string;
  result: {
    success: boolean;
    message: string;
    data: any;
  };
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions: number; // ツイートの表示回数（impression_count）
    bookmarks: number; // ブックマーク数
  };
  claudeSelection?: {
    score: number;
    reasoning: string;
    expectedImpact: string;
  };
}

/**
 * 統合データ管理クラス
 * 設定・学習データ・実行コンテキストの一元管理
 */
export class DataManager {
  private static instance: DataManager | null = null;
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly dataRoot = this.dataDir;
  private readonly learningDir = path.join(this.dataDir, 'learning');
  private readonly currentDir = path.join(this.dataDir, 'current');
  private readonly historyDir = path.join(this.dataDir, 'history');
  private currentExecutionId: string | null = null;
  
  readonly config: DataManagerConfig;

  constructor(config?: Partial<DataManagerConfig>) {
    this.config = {
      dataDir: this.dataDir,
      currentExecutionId: config?.currentExecutionId,
      claudeOutputPaths: config?.claudeOutputPaths,
      ...config
    };
    console.log('✅ DataManager initialized - 簡素化版');
    this.ensureDirectories();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }


  // ============================================================================
  // LEARNING DATA MANAGEMENT
  // ============================================================================

  /**
   * 学習データの読み込み（2ファイル構成対応）
   */
  async loadLearningData(): Promise<LearningData> {
    try {
      const [engagementPatterns, successfulTopics] = await Promise.all([
        this.loadEngagementPatterns(),
        this.loadSuccessfulTopics()
      ]);

      console.log('✅ 学習データ読み込み完了 (2ファイル構成)');
      
      return {
        engagementPatterns,
        successfulTopics
      };

    } catch (error) {
      console.error('❌ 学習データ読み込み失敗:', error);
      return this.getDefaultLearningData();
    }
  }


  /**
   * 成功トピックスの更新（successful-topics.yaml専用）
   */
  async updateSuccessPatterns(successfulTopics: LearningData['successfulTopics']): Promise<void> {
    try {
      const topicsPath = path.join(this.learningDir, 'successful-topics.yaml');
      const yamlStr = yaml.dump(successfulTopics, { indent: 2 });
      await fs.writeFile(topicsPath, yamlStr, 'utf-8');

      console.log('✅ 成功トピックス更新完了');

    } catch (error) {
      console.error('❌ 成功トピックス更新失敗:', error);
    }
  }




  // ============================================================================
  // CURRENT LAYER MANAGEMENT - MVP最小構成
  // ============================================================================

  async initializeExecutionCycle(): Promise<string> {
    // 既存currentをhistoryにアーカイブ（存在する場合）
    if (this.currentExecutionId) {
      await this.archiveCurrentToHistory();
    }

    // 新規実行ID生成
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    this.currentExecutionId = `${year}${month}${day}-${hour}${minute}`;
    
    // 実行ディレクトリ作成（単一ディレクトリのみ）
    const executionDir = path.join(this.currentDir, this.currentExecutionId);
    await fs.mkdir(executionDir, { recursive: true });

    console.log(`✅ 新規実行サイクル初期化完了: ${this.currentExecutionId}`);
    return this.currentExecutionId;
  }

  /**
   * 新規実行サイクルの初期化
   */
  async initializeNewExecution(): Promise<string> {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '-')
      .substring(0, 13); // YYYYMMDD-HHMM

    this.currentExecutionId = `${timestamp}`;
    
    return this.currentExecutionId;
  }

  /**
   * 現在の実行IDを設定
   */
  setCurrentExecutionId(executionId: string): void {
    this.currentExecutionId = executionId;
  }

  /**
   * 実行ディレクトリに直接データを保存
   * @param filename - ファイル名
   * @param data - 保存するデータ
   */
  async saveExecutionData(filename: string, data: any): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }
    
    // 実行ディレクトリが存在しない場合は作成
    const executionDir = path.join(this.currentDir, this.currentExecutionId);
    await fs.mkdir(executionDir, { recursive: true });
    
    const filePath = path.join(executionDir, filename);
    
    await fs.writeFile(
      filePath,
      yaml.dump(data, { indent: 2 }),
      'utf-8'
    );
    
    console.log(`✅ 実行データ保存完了: ${filename}`);
  }

  async savePost(postData: {
    actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
    content?: string;
    targetTweetId?: string;
    result: {
      success: boolean;
      message: string;
      data: any;
    };
    engagement?: {
      likes: number;
      retweets: number;
      replies: number;
      quotes?: number;
      impressions?: number;
      bookmarks?: number;
    };
    claudeSelection?: {
      score: number;
      reasoning: string;
      expectedImpact: string;
    };
  }): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const post: PostData = {
      executionId: this.currentExecutionId,
      actionType: postData.actionType,
      timestamp: new Date().toISOString(),
      content: postData.content,
      targetTweetId: postData.targetTweetId,
      result: postData.result,
      engagement: {
        likes: postData.engagement?.likes || 0,
        retweets: postData.engagement?.retweets || 0,
        replies: postData.engagement?.replies || 0,
        quotes: postData.engagement?.quotes || 0,
        impressions: postData.engagement?.impressions || 0,
        bookmarks: postData.engagement?.bookmarks || 0
      },
      claudeSelection: postData.claudeSelection
    };

    const postPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'post.yaml'
    );

    // YAML出力生成
    let yamlContent = yaml.dump(post, { indent: 2 });
    
    // impressions重複チェック & 自動修復
    yamlContent = this.validateAndFixYamlDuplicates(yamlContent, postPath);
    
    await fs.writeFile(
      postPath,
      yamlContent,
      'utf-8'
    );

    console.log(`✅ 投稿データ保存完了: ${postData.actionType} (統合形式)`);
  }

  /**
   * YAML重複チェック & 自動修復
   * impressions重複問題の再発防止
   * 
   * @param yamlContent - 元のYAML文字列
   * @param filePath - ファイルパス（ログ用）
   * @returns 修復後のYAML文字列
   */
  private validateAndFixYamlDuplicates(yamlContent: string, filePath: string): string {
    const lines = yamlContent.split('\n');
    const impressionsLines: number[] = [];
    
    // impressions重複を検出
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('impressions:')) {
        impressionsLines.push(i);
      }
    }
    
    // 重複がない場合はそのまま返す
    if (impressionsLines.length <= 1) {
      return yamlContent;
    }
    
    // 重複検出時の警告
    console.warn(`⚠️ impressions重複検出 (${impressionsLines.length}件): ${path.basename(filePath)}`);
    console.warn(`   重複行: ${impressionsLines.map(i => i + 1).join(', ')}`);
    
    // 自動修復: 最初のimpressions行以外を削除
    const fixedLines = lines.filter((line, index) => {
      if (line.trim().startsWith('impressions:')) {
        return index === impressionsLines[0]; // 最初のimpressions行だけ残す
      }
      return true;
    });
    
    const fixedContent = fixedLines.join('\n');
    
    // 修復結果の検証
    try {
      yaml.load(fixedContent);
      console.log(`✅ impressions重複自動修復完了: ${path.basename(filePath)}`);
      return fixedContent;
    } catch (yamlError) {
      console.error(`❌ 修復後YAML検証失敗: ${filePath}`, yamlError);
      // 修復に失敗した場合は元のYAMLを返す（エラーログは残る）
      return yamlContent;
    }
  }












  async archiveCurrentToHistory(): Promise<void> {
    if (!this.currentExecutionId) {
      console.warn('⚠️ アーカイブ対象の実行サイクルがありません');
      return;
    }

    const currentExecDir = path.join(this.currentDir, this.currentExecutionId);
    
    try {
      await fs.access(currentExecDir);
    } catch {
      console.warn(`⚠️ アーカイブ対象ディレクトリが存在しません: ${currentExecDir}`);
      return;
    }

    // 月別ディレクトリパス生成（YYYY-MM形式）
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthDir = path.join(this.historyDir, yearMonth);
    
    await fs.mkdir(monthDir, { recursive: true });

    // アーカイブ先パス（DD-HHMM形式）
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const archiveName = `${day}-${hour}${minute}`;
    const archivePath = path.join(monthDir, archiveName);

    await fs.rename(currentExecDir, archivePath);

    console.log(`✅ 実行サイクルアーカイブ完了: ${this.currentExecutionId} → ${yearMonth}/${archiveName}`);
    this.currentExecutionId = null;
  }

  /**
   * 当日の全実行ディレクトリをアーカイブ（深夜分析用）
   */
  async archiveAllCurrentToHistory(): Promise<void> {
    try {
      // currentディレクトリの全executionディレクトリを取得
      const currentDirContents = await fs.readdir(this.currentDir, { withFileTypes: true });
      const executionDirs = currentDirContents
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => dirent.name.match(/^\d{8}-\d{4}$/))
        .map(dirent => dirent.name);

      if (executionDirs.length === 0) {
        console.log('📋 アーカイブ対象の実行ディレクトリがありません');
        return;
      }

      // 月別ディレクトリパス生成（YYYY-MM形式）
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthDir = path.join(this.historyDir, yearMonth);
      
      await fs.mkdir(monthDir, { recursive: true });

      let archivedCount = 0;
      
      // 各実行ディレクトリをアーカイブ
      for (const execDir of executionDirs) {
        const sourcePath = path.join(this.currentDir, execDir);
        
        // YYYYMMDD-HHMM 形式からDD-HHMMを抽出
        const match = execDir.match(/(\d{8})-(\d{4})/);
        if (match) {
          const dateStr = match[1]; // YYYYMMDD
          const timeStr = match[2]; // HHMM
          
          // 日付を抽出（DDHHM形式）
          const day = dateStr.slice(6, 8);
          const hour = timeStr.slice(0, 2);
          const minute = timeStr.slice(2, 4);
          const archiveName = `${day}-${hour}${minute}`;
          
          const archivePath = path.join(monthDir, archiveName);
          
          // ディレクトリが存在する場合はスキップ
          try {
            await fs.access(archivePath);
            console.log(`⏭️ アーカイブ先が既に存在：${archiveName}`);
            continue;
          } catch {
            // 存在しないので移動実行
          }
          
          await fs.rename(sourcePath, archivePath);
          console.log(`✅ アーカイブ完了: ${execDir} → ${yearMonth}/${archiveName}`);
          archivedCount++;
        } else {
          console.warn(`⚠️ 不正な実行ディレクトリ名: ${execDir}`);
        }
      }

      console.log(`🎉 全実行ディレクトリアーカイブ完了: ${archivedCount}個のディレクトリ`);
      
      // 現在の実行IDをクリア
      this.currentExecutionId = null;

    } catch (error) {
      console.error('❌ 全実行ディレクトリアーカイブ失敗:', error);
      throw error;
    }
  }

  /**
   * 現在の実行IDを取得
   */
  getCurrentExecutionId(): string | null {
    return this.currentExecutionId;
  }

  /**
   * 現在の実行ディレクトリを取得
   */
  getCurrentExecutionDir(): string {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }
    return path.join(this.currentDir, this.currentExecutionId);
  }





  private async ensureDirectories(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.learningDir, { recursive: true }),
        fs.mkdir(this.currentDir, { recursive: true }),
        fs.mkdir(this.historyDir, { recursive: true })
      ]);
    } catch (error) {
      console.error('❌ ディレクトリ作成失敗:', error instanceof Error ? error.message : error);
    }
  }


  private async loadEngagementPatterns(): Promise<LearningData['engagementPatterns']> {
    try {
      const engagementPath = path.join(this.learningDir, 'engagement-patterns.yaml');
      const content = await fs.readFile(engagementPath, 'utf-8');
      const data = yaml.load(content) as { engagementPatterns: LearningData['engagementPatterns'] };
      return data.engagementPatterns || this.getDefaultEngagementPatterns();
    } catch (error) {
      return this.getDefaultEngagementPatterns();
    }
  }

  private async loadSuccessfulTopics(): Promise<LearningData['successfulTopics']> {
    try {
      const topicsPath = path.join(this.learningDir, 'successful-topics.yaml');
      const content = await fs.readFile(topicsPath, 'utf-8');
      const data = yaml.load(content) as { successfulTopics: LearningData['successfulTopics'] };
      return data.successfulTopics || this.getDefaultSuccessfulTopics();
    } catch (error) {
      return this.getDefaultSuccessfulTopics();
    }
  }

  private async saveEngagementPatterns(engagementPatterns: LearningData['engagementPatterns']): Promise<void> {
    try {
      const engagementPath = path.join(this.learningDir, 'engagement-patterns.yaml');
      const data = { engagementPatterns };
      const yamlStr = yaml.dump(data, { indent: 2 });
      await fs.writeFile(engagementPath, yamlStr, 'utf-8');
    } catch (error) {
      console.error('❌ エンゲージメントパターン保存失敗:', error);
      throw error;
    }
  }





  private getDefaultLearningData(): LearningData {
    return {
      engagementPatterns: this.getDefaultEngagementPatterns(),
      successfulTopics: this.getDefaultSuccessfulTopics()
    };
  }

  private getDefaultEngagementPatterns(): LearningData['engagementPatterns'] {
    return {
      timeSlots: {
        '09:00': { successRate: 0.75, avgEngagement: 2.8, sampleSize: 10 },
        '12:00': { successRate: 0.65, avgEngagement: 2.2, sampleSize: 8 },
        '18:00': { successRate: 0.80, avgEngagement: 3.1, sampleSize: 12 }
      },
      contentTypes: {
        'post': { successRate: 0.70, avgEngagement: 2.5, sampleSize: 15 },
        'retweet': { successRate: 0.60, avgEngagement: 1.8, sampleSize: 20 },
        'quote_tweet': { successRate: 0.75, avgEngagement: 2.9, sampleSize: 10 }
      },
      topics: {
        'market_analysis': { successRate: 0.78, avgEngagement: 2.8, sampleSize: 12 },
        'educational_content': { successRate: 0.82, avgEngagement: 3.0, sampleSize: 8 }
      }
    };
  }

  private getDefaultSuccessfulTopics(): LearningData['successfulTopics'] {
    return {
      topics: [
        {
          topic: 'market_analysis',
          successRate: 0.78,
          avgEngagement: 2.8,
          bestTimeSlots: ['09:00', '18:00']
        },
        {
          topic: 'educational_content',
          successRate: 0.82,
          avgEngagement: 3.0,
          bestTimeSlots: ['18:00']
        }
      ]
    };
  }



  /**
   * スケジュール設定の読み込み
   */
  async loadSchedule(): Promise<any> {
    const filePath = path.join(this.dataDir, 'config', 'schedule.yaml');
    try {
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      return yaml.load(yamlContent);
    } catch (error) {
      console.error('❌ schedule.yaml読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * リファレンスアカウント設定の読み込み
   */
  async loadReferenceAccounts(): Promise<ReferenceAccountsConfig> {
    const filePath = path.join(this.dataDir, 'config', 'reference-accounts.yaml');
    try {
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      return yaml.load(yamlContent) as ReferenceAccountsConfig;
    } catch (error) {
      console.warn('⚠️ reference-accounts.yaml読み込みエラー、デフォルト値使用:', error);
      return {
        reference_accounts: {
          market_news: [],
          investment_experts: [],
          economic_data: []
        },
        search_settings: {
          max_tweets_per_account: 20,
          priority_weights: { high: 1.5, medium: 1.0, low: 0.5 },
          categories_enabled: []
        }
      };
    }
  }

  /**
   * 優先度に基づいてアカウントをフィルタリング
   */
  getReferenceAccountsByPriority(config: ReferenceAccountsConfig, minPriority: 'low' | 'medium' | 'high' = 'medium'): ReferenceAccount[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const minPriorityValue = priorityOrder[minPriority];
    
    const allAccounts = [
      ...config.reference_accounts.market_news,
      ...config.reference_accounts.investment_experts,
      ...config.reference_accounts.economic_data
    ];
    
    return allAccounts.filter(account => 
      priorityOrder[account.priority] >= minPriorityValue
    );
  }


  /**
   * ディレクトリの存在確認と作成
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }










}