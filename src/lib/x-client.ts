import fetch from 'node-fetch';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { PostHistory, PostingResult, XClientConfig, AccountInfo, AccountMetrics, UserResponse, Tweet, TweetsResponse, EngagementMetrics } from '../types/index';
import { loadYamlArraySafe } from '../utils/yaml-utils';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';

// OAuth 2.0 PKCE関連の型定義
interface PKCETokens {
  code_verifier: string;
  code_challenge: string;
  state: string;
}

interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

export class SimpleXClient {
  private baseUrl = 'https://api.twitter.com/2';
  private testMode: boolean;
  private rateLimitDelay: number;
  private maxRetries: number;
  private postHistory: PostHistory[] = [];
  private historyFile = 'data/posting-history.yaml';
  
  // OAuth 2.0 PKCE関連
  private oauth2TokensFile = 'data/oauth2-tokens.yaml';
  private oauth2Tokens?: OAuth2Tokens;
  
  constructor(config?: Partial<XClientConfig>) {
    this.testMode = process.env.X_TEST_MODE === 'true';
    this.rateLimitDelay = config?.rateLimitDelay || 1000;
    this.maxRetries = config?.maxRetries || 3;
    this.loadPostHistory();
    this.loadOAuth2Tokens();
  }
  
  private loadPostHistory(): void {
    if (existsSync(this.historyFile)) {
      this.postHistory = loadYamlArraySafe<PostHistory>(this.historyFile);
    }
  }
  
  private savePostHistory(): void {
    try {
      writeFileSync(this.historyFile, yaml.dump(this.postHistory, { indent: 2 }));
    } catch (error) {
      console.error('Error saving post history:', error);
    }
  }
  
  private addToHistory(content: string, success: boolean, error?: string): void {
    const historyEntry: PostHistory = {
      id: Date.now().toString(),
      content: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
      timestamp: Date.now(),
      success,
      error
    };
    
    this.postHistory.push(historyEntry);
    
    // 最新100件のみ保持
    if (this.postHistory.length > 100) {
      this.postHistory = this.postHistory.slice(-100);
    }
    
    this.savePostHistory();
  }
  
  private isDuplicatePost(text: string): boolean {
    const recentPosts = this.postHistory.filter(
      post => post.timestamp > Date.now() - (2 * 60 * 60 * 1000) && post.success // 2時間以内の成功投稿のみ
    );
    
    return recentPosts.some(post => {
      // 完全一致または90%以上類似の場合のみ重複とみなす
      const similarity = this.calculateSimilarity(text, post.content);
      return similarity > 0.9;
    });
  }
  
  private calculateSimilarity(text1: string, text2: string): number {
    // 単純なJaccard係数で類似度計算
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return intersection.size / union.size;
  }
  
  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimitDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }
  }
  
  async post(text: string): Promise<PostingResult> {
    const timestamp = Date.now();
    
    // 重複チェック
    if (this.isDuplicatePost(text)) {
      const error = 'Duplicate post detected within 24 hours';
      this.addToHistory(text, false, error);
      return { success: false, error, timestamp };
    }
    
    // テストモードの場合、コンソール出力のみ
    if (this.testMode) {
      console.log('\n📱 [TEST MODE] X投稿シミュレーション:');
      console.log('================================');
      console.log(text);
      console.log('================================');
      console.log(`文字数: ${text.length}/280`);
      console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
      this.addToHistory(text, true);
      return { success: true, id: 'test-' + timestamp, timestamp };
    }
    
    // 本番モード - OAuth 2.0チェック
    if (!this.oauth2Tokens) {
      const error = 'OAuth 2.0 tokens not available. Please complete authorization flow first.';
      console.error(error);
      this.addToHistory(text, false, error);
      return { success: false, error, timestamp };
    }
    
    await this.waitForRateLimit();
    
    try {
      const url = `${this.baseUrl}/tweets`;
      
      // OAuth 2.0認証ヘッダーの生成
      const authHeader = await this.generateOAuth2Headers();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 280)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
        this.addToHistory(text, false, error);
        return { success: false, error, timestamp };
      }
      
      const result = await response.json() as any;
      console.log('Posted to X successfully:', result);
      this.addToHistory(text, true);
      return { success: true, id: result.data?.id || 'unknown', timestamp };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error posting to X:', errorMessage);
      this.addToHistory(text, false, errorMessage);
      return { success: false, error: errorMessage, timestamp };
    }
  }
  
  // 投稿履歴を取得
  getPostHistory(): PostHistory[] {
    return [...this.postHistory];
  }
  
  // 最近の投稿成功率を取得
  getSuccessRate(hours: number = 24): number {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    const recentPosts = this.postHistory.filter(post => post.timestamp > since);
    
    if (recentPosts.length === 0) return 0;
    
    const successful = recentPosts.filter(post => post.success).length;
    return (successful / recentPosts.length) * 100;
  }
  
  // 投稿履歴をクリア
  clearHistory(): void {
    this.postHistory = [];
    this.savePostHistory();
  }

  // ユーザー名からアカウント情報取得
  async getUserByUsername(username: string): Promise<AccountInfo & AccountMetrics> {
    try {
      const authHeader = await this.generateOAuth2Headers();
      const response = await fetch(`${this.baseUrl}/users/by/username/${username}?user.fields=public_metrics`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`X API error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json() as UserResponse;
      const accountData = {
        username: result.data.username,
        user_id: result.data.id,
        display_name: result.data.name,
        verified: result.data.verified,
        followers_count: result.data.public_metrics.followers_count,
        following_count: result.data.public_metrics.following_count,
        tweet_count: result.data.public_metrics.tweet_count,
        listed_count: result.data.public_metrics.listed_count,
        last_updated: Date.now()
      };

      this.saveAccountInfo(accountData);
      return accountData;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw error;
    }
  }

  // 自分のアカウント情報取得
  async getMyAccountInfo(): Promise<AccountInfo & AccountMetrics> {
    try {
      const authHeader = await this.generateOAuth2Headers();
      const response = await fetch(`${this.baseUrl}/users/me?user.fields=public_metrics`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`X API error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json() as UserResponse;
      const accountData = {
        username: result.data.username,
        user_id: result.data.id,
        display_name: result.data.name,
        verified: result.data.verified,
        followers_count: result.data.public_metrics.followers_count,
        following_count: result.data.public_metrics.following_count,
        tweet_count: result.data.public_metrics.tweet_count,
        listed_count: result.data.public_metrics.listed_count,
        last_updated: Date.now()
      };

      this.saveAccountInfo(accountData);
      return accountData;
    } catch (error) {
      console.error('Error fetching my account info:', error);
      throw error;
    }
  }

  // 自分のアカウント詳細情報取得（拡張版）
  async getMyAccountDetails(): Promise<UserResponse> {
    try {
      const authHeader = await this.generateOAuth2Headers();
      const response = await fetch(`${this.baseUrl}/users/me?user.fields=public_metrics,description,location,created_at,verified,profile_image_url`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`X API error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json() as UserResponse;
      return result;
    } catch (error) {
      console.error('Error fetching my account details:', error);
      throw error;
    }
  }

  // 自分の最近のツイート分析
  async getMyRecentTweets(count: number = 10): Promise<Tweet[]> {
    try {
      // まず自分のユーザーIDを取得
      const userDetails = await this.getMyAccountDetails();
      const userId = userDetails.data.id;

      const authHeader = await this.generateOAuth2Headers();
      const response = await fetch(
        `${this.baseUrl}/users/${userId}/tweets?max_results=${Math.min(count, 100)}&tweet.fields=public_metrics,created_at,context_annotations&expansions=author_id`, 
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`X API error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json() as TweetsResponse;
      
      // Tweet形式に変換
      const tweets: Tweet[] = (result.data || []).map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics,
        author_id: tweet.author_id
      }));

      return tweets;
    } catch (error) {
      console.error('Error fetching my recent tweets:', error);
      return []; // エラー時は空配列を返す
    }
  }

  // エンゲージメント詳細分析
  async getEngagementMetrics(tweetIds: string[]): Promise<EngagementMetrics[]> {
    try {
      const engagementMetrics: EngagementMetrics[] = [];

      const authHeader = await this.generateOAuth2Headers();
      
      // 各ツイートのエンゲージメント情報を取得
      for (const tweetId of tweetIds.slice(0, 10)) { // 最大10件まで
        try {
          const response = await fetch(
            `${this.baseUrl}/tweets/${tweetId}?tweet.fields=public_metrics,created_at`,
            {
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              }
            }
          );

          if (response.ok) {
            const result = await response.json() as { data: Tweet };
            const tweet = result.data;
            
            const metrics: EngagementMetrics = {
              tweetId: tweet.id,
              likes: tweet.public_metrics?.like_count || 0,
              retweets: tweet.public_metrics?.retweet_count || 0,
              replies: tweet.public_metrics?.reply_count || 0,
              quotes: tweet.public_metrics?.quote_count || 0,
              impressions: tweet.public_metrics?.impression_count || 0,
              engagementRate: this.calculateEngagementRate(tweet.public_metrics),
              timestamp: tweet.created_at
            };

            engagementMetrics.push(metrics);
          }
        } catch (error) {
          console.error(`Error fetching metrics for tweet ${tweetId}:`, error);
          // 個別のエラーは無視して継続
        }

        // Rate limit対応
        await this.waitForRateLimit();
      }

      return engagementMetrics;
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      return [];
    }
  }

  // エンゲージメント率計算
  private calculateEngagementRate(publicMetrics: any): number {
    if (!publicMetrics || !publicMetrics.impression_count) return 0;

    const totalEngagements = 
      (publicMetrics.like_count || 0) +
      (publicMetrics.retweet_count || 0) +
      (publicMetrics.reply_count || 0) +
      (publicMetrics.quote_count || 0);

    return (totalEngagements / publicMetrics.impression_count) * 100;
  }

  // 引用ツイート機能
  async quoteTweet(originalTweetId: string, comment: string): Promise<any> {
    const timestamp = Date.now();
    
    // テストモードの場合
    if (this.testMode) {
      console.log('\n📱 [TEST MODE] 引用ツイートシミュレーション:');
      console.log('================================');
      console.log(`引用対象: ${originalTweetId}`);
      console.log(`コメント: ${comment}`);
      console.log('================================');
      console.log(`文字数: ${comment.length}/280`);
      console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
      this.addToHistory(`Quote: ${comment}`, true);
      return { 
        success: true, 
        tweetId: 'test-quote-' + timestamp, 
        originalTweetId,
        comment,
        timestamp 
      };
    }
    
    // 本番モード - OAuth 2.0チェック
    if (!this.oauth2Tokens) {
      const error = 'OAuth 2.0 tokens not available. Please complete authorization flow first.';
      this.addToHistory(`Quote: ${comment}`, false, error);
      return { success: false, error, timestamp };
    }
    
    await this.waitForRateLimit();
    
    try {
      const url = `${this.baseUrl}/tweets`;
      
      // OAuth 2.0認証
      const authHeader = await this.generateOAuth2Headers();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: comment.slice(0, 280),
          quote_tweet_id: originalTweetId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
        this.addToHistory(`Quote: ${comment}`, false, error);
        return { success: false, error, timestamp };
      }
      
      const result = await response.json() as any;
      console.log('Quote tweet posted successfully:', result);
      this.addToHistory(`Quote: ${comment}`, true);
      return { 
        success: true, 
        tweetId: result.data?.id || 'unknown', 
        originalTweetId,
        comment,
        timestamp 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error posting quote tweet:', errorMessage);
      this.addToHistory(`Quote: ${comment}`, false, errorMessage);
      return { success: false, error: errorMessage, timestamp };
    }
  }

  // リツイート機能
  async retweet(tweetId: string): Promise<any> {
    const timestamp = Date.now();
    
    // テストモードの場合
    if (this.testMode) {
      console.log('\n📱 [TEST MODE] リツイートシミュレーション:');
      console.log('================================');
      console.log(`リツイート対象: ${tweetId}`);
      console.log('================================');
      console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
      this.addToHistory(`Retweet: ${tweetId}`, true);
      return { 
        success: true, 
        originalTweetId: tweetId,
        timestamp 
      };
    }
    
    // 本番モード - OAuth 2.0チェック
    if (!this.oauth2Tokens) {
      const error = 'OAuth 2.0 tokens not available. Please complete authorization flow first.';
      this.addToHistory(`Retweet: ${tweetId}`, false, error);
      return { success: false, error, timestamp };
    }
    
    await this.waitForRateLimit();
    
    try {
      // まず自分のユーザーIDを取得
      const userDetails = await this.getMyAccountDetails();
      const userId = userDetails.data.id;
      
      const url = `${this.baseUrl}/users/${userId}/retweets`;
      
      // OAuth 2.0認証
      const authHeader = await this.generateOAuth2Headers();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweet_id: tweetId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
        this.addToHistory(`Retweet: ${tweetId}`, false, error);
        return { success: false, error, timestamp };
      }
      
      const result = await response.json() as any;
      console.log('Retweet posted successfully:', result);
      this.addToHistory(`Retweet: ${tweetId}`, true);
      return { 
        success: true, 
        originalTweetId: tweetId,
        timestamp 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error retweeting:', errorMessage);
      this.addToHistory(`Retweet: ${tweetId}`, false, errorMessage);
      return { success: false, error: errorMessage, timestamp };
    }
  }

  // リプライ機能
  async reply(tweetId: string, content: string): Promise<any> {
    const timestamp = Date.now();
    
    // 重複チェック
    if (this.isDuplicatePost(content)) {
      const error = 'Duplicate reply detected within 24 hours';
      this.addToHistory(`Reply: ${content}`, false, error);
      return { success: false, error, timestamp };
    }
    
    // テストモードの場合
    if (this.testMode) {
      console.log('\n📱 [TEST MODE] リプライシミュレーション:');
      console.log('================================');
      console.log(`リプライ対象: ${tweetId}`);
      console.log(`内容: ${content}`);
      console.log('================================');
      console.log(`文字数: ${content.length}/280`);
      console.log(`投稿時刻: ${new Date().toLocaleString('ja-JP')}`);
      this.addToHistory(`Reply: ${content}`, true);
      return { 
        success: true, 
        tweetId: 'test-reply-' + timestamp,
        originalTweetId: tweetId,
        content,
        timestamp 
      };
    }
    
    // 本番モード - OAuth 2.0チェック
    if (!this.oauth2Tokens) {
      const error = 'OAuth 2.0 tokens not available. Please complete authorization flow first.';
      this.addToHistory(`Reply: ${content}`, false, error);
      return { success: false, error, timestamp };
    }
    
    await this.waitForRateLimit();
    
    try {
      const url = `${this.baseUrl}/tweets`;
      
      // OAuth 2.0認証
      const authHeader = await this.generateOAuth2Headers();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content.slice(0, 280),
          reply: {
            in_reply_to_tweet_id: tweetId
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const error = `X API error: ${response.status} - ${errorData.detail || response.statusText}`;
        this.addToHistory(`Reply: ${content}`, false, error);
        return { success: false, error, timestamp };
      }
      
      const result = await response.json() as any;
      console.log('Reply posted successfully:', result);
      this.addToHistory(`Reply: ${content}`, true);
      return { 
        success: true, 
        tweetId: result.data?.id || 'unknown',
        originalTweetId: tweetId,
        content,
        timestamp 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error posting reply:', errorMessage);
      this.addToHistory(`Reply: ${content}`, false, errorMessage);
      return { success: false, error: errorMessage, timestamp };
    }
  }

  // アカウント情報をファイルに保存
  private saveAccountInfo(accountData: AccountInfo & AccountMetrics): void {
    try {
      const accountFile = 'data/account-info.yaml';
      
      // 既存データの読み込み
      let existingData: any = {};
      if (existsSync(accountFile)) {
        const existingContent = require('fs').readFileSync(accountFile, 'utf8');
        existingData = yaml.load(existingContent) || {};
      }

      // 履歴データの保持
      const history = existingData.history || [];
      
      // 新しい履歴エントリを追加
      history.push({
        timestamp: accountData.last_updated,
        followers_count: accountData.followers_count
      });

      // 直近10件のみ保持
      const limitedHistory = history.slice(-10);

      // 更新されたデータ構造
      const updatedData = {
        account: {
          username: accountData.username,
          user_id: accountData.user_id,
          display_name: accountData.display_name,
          verified: accountData.verified
        },
        current_metrics: {
          followers_count: accountData.followers_count,
          following_count: accountData.following_count,
          tweet_count: accountData.tweet_count,
          listed_count: accountData.listed_count,
          last_updated: accountData.last_updated
        },
        history: limitedHistory
      };

      writeFileSync(accountFile, yaml.dump(updatedData, { indent: 2 }));
    } catch (error) {
      console.error('Error saving account info:', error);
    }
  }


  // OAuth 2.0認証ヘッダー生成（User Context用）
  private async generateOAuth2Headers(): Promise<string> {
    const accessToken = await this.getValidAccessToken();
    return `Bearer ${accessToken}`;
  }


  // OAuth 2.0 PKCE関連メソッド
  
  /**
   * OAuth 2.0トークンファイルを読み込み
   */
  private loadOAuth2Tokens(): void {
    try {
      // 優先度1: 環境変数からの読み込み
      const envAccessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
      const envRefreshToken = process.env.X_OAUTH2_REFRESH_TOKEN;
      
      if (envAccessToken) {
        this.oauth2Tokens = {
          access_token: envAccessToken,
          refresh_token: envRefreshToken || '',
          expires_at: parseInt(process.env.X_OAUTH2_EXPIRES_AT || '0') || (Date.now() + (2 * 60 * 60 * 1000)), // デフォルト2時間
          token_type: 'bearer',
          scope: process.env.X_OAUTH2_SCOPES || 'tweet.write users.read offline.access'
        };
        console.log('✅ [Security] OAuth2 tokens loaded from environment variables');
        return;
      }
      
      // 優先度2: YAMLファイル（警告付きフォールバック）
      if (existsSync(this.oauth2TokensFile)) {
        const content = readFileSync(this.oauth2TokensFile, 'utf8');
        this.oauth2Tokens = yaml.load(content) as OAuth2Tokens;
        console.warn('⚠️ [Security Warning] OAuth2 tokens loaded from YAML file');
        console.warn('   Recommendation: Move tokens to environment variables for better security');
      }
    } catch (error) {
      console.error('Error loading OAuth 2.0 tokens:', error);
    }
  }

  /**
   * OAuth 2.0トークンをファイルに保存
   */
  private saveOAuth2Tokens(tokens: OAuth2Tokens): void {
    try {
      this.oauth2Tokens = tokens;
      writeFileSync(this.oauth2TokensFile, yaml.dump(tokens, { indent: 2 }));
    } catch (error) {
      console.error('Error saving OAuth 2.0 tokens:', error);
    }
  }

  /**
   * PKCE Code Verifierを生成
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64url');
  }

  /**
   * PKCE Code Challengeを生成
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
  }

  /**
   * OAuth 2.0認証用のstate値を生成
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * OAuth 2.0 Authorization URLを生成
   * User Context認証フロー用
   */
  public generateAuthorizationUrl(): { url: string; codeVerifier: string; state: string } {
    const clientId = process.env.X_OAUTH2_CLIENT_ID;
    const redirectUri = process.env.X_OAUTH2_REDIRECT_URI;
    const scopes = process.env.X_OAUTH2_SCOPES || 'tweet.write users.read offline.access';
    
    if (!clientId || !redirectUri) {
      throw new Error('OAuth 2.0 client ID and redirect URI must be configured');
    }

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    
    return {
      url: authUrl,
      codeVerifier,
      state
    };
  }

  /**
   * Authorization CodeからAccess Tokenを取得
   * Authorization Code Flow with PKCE
   */
  public async exchangeCodeForTokens(
    authorizationCode: string, 
    codeVerifier: string
  ): Promise<OAuth2Tokens> {
    const clientId = process.env.X_OAUTH2_CLIENT_ID;
    const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
    const redirectUri = process.env.X_OAUTH2_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('OAuth 2.0 credentials not configured');
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: authorizationCode,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }).toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const tokenData = await response.json() as any;
    
    const tokens: OAuth2Tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type,
      scope: tokenData.scope
    };

    this.saveOAuth2Tokens(tokens);
    return tokens;
  }

  /**
   * Refresh Tokenを使用してAccess Tokenを更新
   */
  public async refreshAccessToken(): Promise<OAuth2Tokens> {
    if (!this.oauth2Tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.X_OAUTH2_CLIENT_ID;
    const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('OAuth 2.0 credentials not configured');
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.oauth2Tokens.refresh_token,
        client_id: clientId
      }).toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const tokenData = await response.json() as any;
    
    const tokens: OAuth2Tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || this.oauth2Tokens.refresh_token, // 新しいものがなければ既存を保持
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type,
      scope: tokenData.scope
    };

    this.saveOAuth2Tokens(tokens);
    return tokens;
  }

  /**
   * 有効なAccess Tokenを取得（必要に応じて更新）
   */
  public async getValidAccessToken(): Promise<string> {
    if (!this.oauth2Tokens) {
      throw new Error('No OAuth 2.0 tokens available. Please complete authorization flow first.');
    }

    // トークンの有効期限をチェック（5分のマージンを持つ）
    if (this.oauth2Tokens.expires_at < Date.now() + (5 * 60 * 1000)) {
      console.log('🔄 Access token expired, refreshing...');
      const newTokens = await this.refreshAccessToken();
      return newTokens.access_token;
    }

    return this.oauth2Tokens.access_token;
  }
}