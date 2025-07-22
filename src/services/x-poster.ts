import { createHmac, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';
import { DataOptimizer } from './data-optimizer';
import type { ConvergedPost } from '../types/content-types';
import type { ActionParams, ActionMetadata } from '../types/system-types';

/**
 * 生成されたコンテンツの型定義
 */
export interface GeneratedContent {
  content: string;
  hashtags?: string[];
  category?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 投稿結果の型定義
 */
export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  timestamp: Date;
  finalContent: string;
  metrics?: {
    contentLength: number;
    hashtagCount: number;
  };
}

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  isValid: boolean;
  charCount: number;
  issues: string[];
  suggestions: string[];
}

/**
 * OAuth1.0a認証情報
 */
interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}


/**
 * X API投稿システム
 * OAuth 1.0a認証を使用してX(Twitter)への投稿を管理
 */
export class XPoster {
  private credentials: OAuth1Credentials;
  private readonly API_BASE_URL = 'https://api.twitter.com';
  private readonly TWEET_ENDPOINT = '/2/tweets';
  private readonly MAX_TWEET_LENGTH = 280;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2秒

  constructor(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string
  ) {
    this.credentials = {
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      accessToken,
      accessTokenSecret
    };
  }

  /**
   * X(Twitter)への投稿を実行
   */
  async postToX(content: GeneratedContent): Promise<PostResult> {
    try {
      // コンテンツのフォーマット
      const formattedContent = await this.formatPost(content);
      
      // 1日の投稿制限チェック
      const limitCheck = await this.checkDailyPostLimit();
      if (!limitCheck.canPost) {
        return {
          success: false,
          error: `Daily post limit reached: ${limitCheck.limit} posts per day`,
          timestamp: new Date(),
          finalContent: formattedContent
        };
      }

      // 重複投稿チェック
      const isDuplicate = await this.checkDuplicatePost(formattedContent);
      if (isDuplicate) {
        return {
          success: false,
          error: 'Duplicate content detected - similar post already exists today',
          timestamp: new Date(),
          finalContent: formattedContent
        };
      }
      
      // バリデーション
      const validation = await this.validatePost(formattedContent);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.issues.join(', ')}`,
          timestamp: new Date(),
          finalContent: formattedContent
        };
      }

      // 投稿実行（リトライ付き）
      let lastError: string = '';
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const result = await this.executePost(formattedContent);
          
          if (result.success) {
            // 投稿結果を記録
            await this.trackPostResult(result.postId!, formattedContent, true);
            
            // 新規：DataOptimizerを使用してアーカイブ
            try {
              const dataOptimizer = new DataOptimizer();
              await dataOptimizer.archivePost({
                content: formattedContent,
                timestamp: new Date(),
                postId: result.postId,
                metadata: {
                  hashtags: this.extractHashtags(formattedContent),
                  contentLength: formattedContent.length
                }
              });
              
              // 今日の投稿データを更新してインサイト抽出
              const todayPosts = await this.loadTodayPosts();
              await dataOptimizer.extractPostInsights(todayPosts);
            } catch (archiveError) {
              // アーカイブエラーは投稿の成功に影響しない
              console.warn('投稿アーカイブエラー（投稿は成功）:', archiveError);
            }
            
            return {
              success: true,
              postId: result.postId,
              timestamp: new Date(),
              finalContent: formattedContent,
              metrics: {
                contentLength: formattedContent.length,
                hashtagCount: this.countHashtags(formattedContent)
              }
            };
          } else {
            lastError = result.error || `Attempt ${attempt} failed`;
          }
        } catch (error) {
          lastError = `Network error on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        // 最後の試行でなければ待機
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }

      // 全ての試行が失敗
      await this.trackPostResult(null, formattedContent, false, lastError);
      
      return {
        success: false,
        error: `Failed after ${this.MAX_RETRIES} attempts: ${lastError}`,
        timestamp: new Date(),
        finalContent: formattedContent
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content.content
      };
    }
  }

  /**
   * 投稿内容のバリデーション
   */
  async validatePost(content: string): Promise<ValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const charCount = content.length;

    // 文字数制限チェック
    if (charCount > this.MAX_TWEET_LENGTH) {
      issues.push(`Content too long: ${charCount} characters (max: ${this.MAX_TWEET_LENGTH})`);
      suggestions.push('Shorten the content or remove some hashtags');
    }

    // 空コンテンツチェック
    if (charCount === 0) {
      issues.push('Content is empty');
    }

    // 最小文字数チェック
    if (charCount < 10) {
      issues.push('Content too short (minimum 10 characters recommended)');
      suggestions.push('Add more meaningful content');
    }

    // ハッシュタグチェック
    const hashtagCount = this.countHashtags(content);
    if (hashtagCount > 3) {
      issues.push(`Too many hashtags: ${hashtagCount} (recommended: 1-3)`);
      suggestions.push('Reduce the number of hashtags for better engagement');
    }

    // URL妥当性チェック
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 2) {
      issues.push('Too many URLs detected');
      suggestions.push('Limit URLs to 1-2 per tweet');
    }

    return {
      isValid: issues.length === 0,
      charCount,
      issues,
      suggestions
    };
  }

  /**
   * 投稿内容のフォーマット
   */
  async formatPost(content: GeneratedContent): Promise<string> {
    let formattedContent = content.content.trim();

    // ハッシュタグの最適化
    if (content.hashtags && content.hashtags.length > 0) {
      // 既存のハッシュタグを削除（重複を避けるため）
      formattedContent = formattedContent.replace(/#\w+/g, '').trim();
      
      // 最適なハッシュタグを追加（最大3個）
      const optimizedHashtags = content.hashtags.slice(0, 3);
      
      // 改行でハッシュタグを分離
      if (formattedContent.length + optimizedHashtags.join(' ').length + 2 <= this.MAX_TWEET_LENGTH) {
        formattedContent += '\n\n' + optimizedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      }
    }

    // 文字数オーバー時の自動調整
    if (formattedContent.length > this.MAX_TWEET_LENGTH) {
      // ハッシュタグ部分を分離
      const parts = formattedContent.split('\n\n');
      const mainContent = parts[0];
      const hashtags = parts[1] || '';
      
      // メインコンテンツを短縮
      const availableLength = this.MAX_TWEET_LENGTH - hashtags.length - 4; // 改行とスペース分
      if (mainContent.length > availableLength) {
        const shortenedContent = mainContent.substring(0, availableLength - 3) + '...';
        formattedContent = hashtags ? `${shortenedContent}\n\n${hashtags}` : shortenedContent;
      }
    }

    return formattedContent.trim();
  }

  /**
   * 投稿結果の追跡・記録
   */
  async trackPostResult(postId: string | null, content: string, success: boolean, error?: string): Promise<void> {
    try {
      const postingDataPath = path.join(process.cwd(), 'data', 'posting-data.yaml');
      
      // 投稿履歴データの構造
      const postRecord = {
        id: postId || `failed-${Date.now()}`,
        content,
        timestamp: Date.now(),
        success,
        ...(error && { error }),
        ...(success && postId && {
          metrics: {
            contentLength: content.length,
            hashtagCount: this.countHashtags(content)
          }
        })
      };

      // 既存データの読み込み（簡単な追記処理）
      let existingData = '';
      try {
        existingData = await fs.readFile(postingDataPath, 'utf-8');
      } catch {
        // ファイルが存在しない場合は新規作成
      }

      // 新しい投稿記録を追加
      const newEntry = `
  - id: "${postRecord.id}"
    content: "${content.replace(/"/g, '\\"')}"
    timestamp: ${postRecord.timestamp}
    success: ${postRecord.success}${error ? `
    error: "${error.replace(/"/g, '\\"')}"` : ''}${postRecord.metrics ? `
    metrics:
      contentLength: ${postRecord.metrics.contentLength}
      hashtagCount: ${postRecord.metrics.hashtagCount}` : ''}`;

      // ファイルの更新
      if (existingData.includes('posting_history:')) {
        // 既存のposting_historyセクションに追記
        const updatedData = existingData.replace(
          /(posting_history:\s*(?:\n {2}- .*)*)/, 
          `$1${newEntry}`
        );
        await fs.writeFile(postingDataPath, updatedData, 'utf-8');
      } else {
        // 新規ファイル作成
        const newData = `# Posting Data Management
version: "1.1.0"
lastUpdated: "${new Date().toISOString()}"

posting_history:${newEntry}

execution_summary:
  total_posts: 1
  successful_posts: ${success ? 1 : 0}
  failed_posts: ${success ? 0 : 1}
  last_execution: ${postRecord.timestamp}
  
current_status:
  is_running: false
  last_error: ${error ? `"${error.replace(/"/g, '\\"')}"` : 'null'}
  next_scheduled: null`;
        
        await fs.writeFile(postingDataPath, newData, 'utf-8');
      }

    } catch (trackError) {
      console.warn('Failed to track post result:', trackError);
      // 追跡エラーは投稿の成功/失敗に影響しない
    }
  }

  /**
   * 実際のX API投稿実行
   */
  private async executePost(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const url = `${this.API_BASE_URL}${this.TWEET_ENDPOINT}`;
      const postData = JSON.stringify({ text: content });
      
      // OAuth 1.0a認証ヘッダーの生成
      const authHeader = this.generateOAuth1Header('POST', url, {});
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'TradingAssistantX/1.0'
        },
        body: postData
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`
        };
      }

      const result = await response.json() as { data?: { id?: string } };
      
      return {
        success: true,
        postId: result.data?.id || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error'
      };
    }
  }

  /**
   * OAuth1.0a Authorizationヘッダーを生成
   */
  private generateOAuth1Header(method: string, url: string, params: Record<string, string>): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    // OAuth署名に含めるパラメータ
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.credentials.consumerKey,
      oauth_token: this.credentials.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp.toString(),
      oauth_nonce: nonce,
      oauth_version: '1.0'
    };
    
    // リクエストパラメータとOAuthパラメータを結合（署名計算用）
    const allParams = { ...params, ...oauthParams };
    
    // パラメータを正規化
    const normalizedParams = this.normalizeParameters(allParams);
    
    // 署名ベース文字列を生成
    const signatureBaseString = this.createSignatureBaseString(method, url, normalizedParams);
    
    // 署名キーを生成
    const signingKey = `${this.percentEncode(this.credentials.consumerSecret)}&${this.percentEncode(this.credentials.accessTokenSecret)}`;
    
    // HMAC-SHA1署名を生成
    const hmac = createHmac('sha1', signingKey);
    hmac.update(signatureBaseString);
    const signature = hmac.digest('base64');
    
    // Authorizationヘッダーに含めるパラメータ（署名を追加）
    const authParams: Record<string, string> = {
      ...oauthParams,
      oauth_signature: signature
    };
    
    // Authorizationヘッダー文字列を生成
    const headerParts = Object.keys(authParams)
      .sort()
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(authParams[key])}"`)
      .join(', ');
    
    return `OAuth ${headerParts}`;
  }

  /**
   * RFC 3986に準拠したパーセントエンコーディング
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * OAuth1.0aパラメータを正規化
   */
  private normalizeParameters(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const encodedParams = sortedKeys.map(key => {
      return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
    });
    return encodedParams.join('&');
  }

  /**
   * OAuth1.0a署名ベース文字列を生成
   */
  private createSignatureBaseString(method: string, url: string, normalizedParams: string): string {
    return [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(normalizedParams)
    ].join('&');
  }

  /**
   * ハッシュタグ数をカウント
   */
  private countHashtags(content: string): number {
    const hashtags = content.match(/#\w+/g);
    return hashtags ? hashtags.length : 0;
  }

  /**
   * コンテンツからハッシュタグを抽出
   */
  private extractHashtags(content: string): string[] {
    const hashtagMatches = content.match(/#\w+/g);
    return hashtagMatches ? hashtagMatches.map(tag => tag.replace('#', '')) : [];
  }

  /**
   * 遅延ユーティリティ
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重複投稿をチェック
   */
  async checkDuplicatePost(content: string): Promise<boolean> {
    try {
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      const existingContent = await fs.readFile(todayPostsPath, 'utf-8');
      const todayData = yaml.load(existingContent) as any;
      
      if (!todayData?.posts) return false;
      
      // コンテンツの類似性をチェック（簡易版）
      for (const post of todayData.posts) {
        if (post.content === content) {
          return true; // 完全一致
        }
        // 80%以上の類似度をチェック
        const similarity = this.calculateSimilarity(content, post.content);
        if (similarity > 0.8) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false; // エラー時は重複なしとして処理
    }
  }

  /**
   * 文字列の類似度を計算（簡易版）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(shorter, longer);
    return (longer.length - distance) / longer.length;
  }

  /**
   * レーベンシュタイン距離を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 投稿時間の最適化チェック
   * data/config/posting-times.yamlの設定を参考に最適な投稿時間かどうかを判定
   */
  async isOptimalPostingTime(): Promise<{ isOptimal: boolean; nextOptimalTime?: string; reason?: string }> {
    try {
      const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = yaml.load(configContent) as any;
      
      if (!config?.optimal_times) {
        return { isOptimal: true, reason: 'No optimal times configuration found' };
      }

      // 最適時間を平坦化
      const allOptimalTimes: string[] = [];
      for (const timeGroup of Object.values(config.optimal_times)) {
        if (Array.isArray(timeGroup)) {
          allOptimalTimes.push(...timeGroup);
        }
      }
      
      if (allOptimalTimes.length === 0) {
        return { isOptimal: true, reason: 'No optimal times defined' };
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // 現在時刻が最適時間の範囲内かチェック（±30分の余裕）
      for (const optimalTime of allOptimalTimes) {
        const [hours, minutes] = optimalTime.split(':').map(Number);
        const optimalMinutes = hours * 60 + minutes;
        
        // ±30分の範囲内なら最適
        if (Math.abs(currentMinutes - optimalMinutes) <= 30) {
          return { isOptimal: true, reason: `Within optimal time range of ${optimalTime}` };
        }
      }

      // 次の最適時間を計算
      const nextOptimal = allOptimalTimes
        .map(time => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        })
        .sort((a, b) => a - b)
        .find(time => time > currentMinutes);

      const nextOptimalTime = nextOptimal 
        ? `${Math.floor(nextOptimal / 60).toString().padStart(2, '0')}:${(nextOptimal % 60).toString().padStart(2, '0')}`
        : allOptimalTimes[0]; // 翌日の最初の時間

      return {
        isOptimal: false,
        nextOptimalTime,
        reason: 'Current time is not within optimal posting hours'
      };

    } catch (error) {
      console.warn('Failed to check optimal posting time:', error);
      return { isOptimal: true, reason: 'Could not load posting time configuration' };
    }
  }

  /**
   * 1日の投稿制限をチェック
   * autonomous-config.yamlから制限値を取得
   */
  async checkDailyPostLimit(): Promise<{ canPost: boolean; remaining: number; limit: number }> {
    try {
      const configPath = path.join(process.cwd(), 'data', 'config', 'autonomous-config.yaml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = yaml.load(configContent) as any;
      
      const dailyLimit = config?.execution?.daily_posts_limit || 15;
      
      // 今日の投稿数を取得
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      try {
        const todayContent = await fs.readFile(todayPostsPath, 'utf-8');
        const todayData = yaml.load(todayContent) as any;
        const todayPostCount = todayData?.statistics?.total || 0;
        
        return {
          canPost: todayPostCount < dailyLimit,
          remaining: Math.max(0, dailyLimit - todayPostCount),
          limit: dailyLimit
        };
      } catch {
        // today-posts.yamlが存在しない場合は新しい日
        return {
          canPost: true,
          remaining: dailyLimit,
          limit: dailyLimit
        };
      }
    } catch (error) {
      console.warn('Failed to check daily post limit:', error);
      // 設定読み込みエラー時はデフォルトで制限なし
      return {
        canPost: true,
        remaining: 15,
        limit: 15
      };
    }
  }

  /**
   * 今日の投稿データを読み込み
   */
  private async loadTodayPosts(): Promise<any[]> {
    try {
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      const todayContent = await fs.readFile(todayPostsPath, 'utf-8');
      const todayData = yaml.load(todayContent) as any;
      return todayData?.posts || [];
    } catch {
      // ファイルが存在しない場合は空配列を返す
      return [];
    }
  }
}

/**
 * 環境変数からX Poster インスタンスを作成するヘルパー関数
 */
export function createXPosterFromEnv(): XPoster {
  const requiredEnvVars = [
    'X_API_KEY',
    'X_API_SECRET', 
    'X_ACCESS_TOKEN',
    'X_ACCESS_TOKEN_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return new XPoster(
    process.env.X_API_KEY!,
    process.env.X_API_SECRET!,
    process.env.X_ACCESS_TOKEN!,
    process.env.X_ACCESS_TOKEN_SECRET!
  );
}

export default XPoster;