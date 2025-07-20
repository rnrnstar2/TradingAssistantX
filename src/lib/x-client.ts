import fetch from 'node-fetch';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { PostHistory, PostingResult, XClientConfig } from '../types/index';
import * as yaml from 'js-yaml';

export class SimpleXClient {
  private apiKey: string;
  private baseUrl = 'https://api.twitter.com/2';
  private testMode: boolean;
  private rateLimitDelay: number;
  private maxRetries: number;
  private postHistory: PostHistory[] = [];
  private historyFile = 'data/posting-history.yaml';
  
  constructor(apiKey: string, config?: Partial<XClientConfig>) {
    this.apiKey = apiKey;
    this.testMode = process.env.X_TEST_MODE === 'true';
    this.rateLimitDelay = config?.rateLimitDelay || 1000;
    this.maxRetries = config?.maxRetries || 3;
    this.loadPostHistory();
  }
  
  private loadPostHistory(): void {
    if (existsSync(this.historyFile)) {
      try {
        const data = readFileSync(this.historyFile, 'utf8');
        this.postHistory = yaml.load(data) as PostHistory[];
      } catch (error) {
        console.error('Error loading post history:', error);
        this.postHistory = [];
      }
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
      post => post.timestamp > Date.now() - (24 * 60 * 60 * 1000) // 24時間以内
    );
    
    return recentPosts.some(post => 
      post.content.includes(text.slice(0, 50)) && post.success
    );
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
    
    // 本番モード
    if (!this.apiKey) {
      const error = 'X API key not provided';
      console.error(error);
      this.addToHistory(text, false, error);
      return { success: false, error, timestamp };
    }
    
    await this.waitForRateLimit();
    
    try {
      const response = await fetch(`${this.baseUrl}/tweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
}