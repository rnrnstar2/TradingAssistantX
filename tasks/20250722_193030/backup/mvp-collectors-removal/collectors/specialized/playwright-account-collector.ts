import { Page, Browser, BrowserContext } from 'playwright';
import { PlaywrightCommonSetup } from '../../services/playwright-common-config.js';
import { PlaywrightBrowserManager } from '../../managers/browser/playwright-browser-manager.js';
import type { AccountInfo, AccountMetrics } from '../types/index';

export interface PlaywrightAccountInfo extends AccountInfo, AccountMetrics {
  display_name: string;
  bio: string;
  verified: boolean;
  created_at?: string;
  last_tweet_time?: number;
}

export interface PostInfo {
  id: string;
  content: string;
  timestamp: number;
  likes?: number;
  retweets?: number;
  replies?: number;
}

export class PlaywrightAccountCollector {
  private browserManager: PlaywrightBrowserManager;
  private config = {
    timeout: 30000,
    maxRetries: 3,
    requestDelay: 2000,
    testMode: process.env.X_TEST_MODE === 'true'
  };

  constructor() {
    this.browserManager = PlaywrightBrowserManager.getInstance(this.config);
  }

  async collectAccountInfo(username?: string, contextOverride?: BrowserContext): Promise<PlaywrightAccountInfo> {
    const sessionId = `account_collector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎭 [Playwright収集開始] セッション: ${sessionId}`);
    
    let page: Page | null = null;
    
    try {
      // ブラウザマネージャーからコンテキストを取得（またはオーバーライド使用）
      const context = contextOverride || await this.browserManager.acquireContext(sessionId);
      
      const targetUsername = username || await this.getCurrentUsername();
      const profileUrl = `https://x.com/${targetUsername}`;
      
      console.log(`🔍 [プロフィールアクセス] ${profileUrl}`);
      
      page = await context.newPage();
      await page.goto(profileUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // ページの読み込み完了を待機
      await this.waitForPageLoad(page);

      // セッション情報をログ出力（デバッグ用）
      const stats = this.browserManager.getSessionStats();
      console.log(`📊 [セッション統計] アクティブ: ${stats.activeSessions}/${stats.totalSessions}`);

      // 基本プロフィール情報、フォロワー統計、最近の投稿情報を並列取得（エラーハンドリング強化）
      const [basicInfoResult, followerStatsResult, recentPostTimeResult] = 
        await Promise.allSettled([
          this.extractBasicInfoSafe(page, targetUsername),
          this.extractFollowerStatsSafe(page),
          this.extractLastTweetTimeSafe(page)
        ]);

      const basicInfo = basicInfoResult.status === 'fulfilled' ? basicInfoResult.value : { user_id: targetUsername, display_name: '', bio: '', verified: false };
      const followerStats = followerStatsResult.status === 'fulfilled' ? followerStatsResult.value : { followers: 0, following: 0, tweets: 0 };
      const recentPostTime = recentPostTimeResult.status === 'fulfilled' ? recentPostTimeResult.value : undefined;

      const accountInfo: PlaywrightAccountInfo = {
        username: targetUsername,
        user_id: basicInfo.user_id || targetUsername,
        display_name: basicInfo.display_name,
        bio: basicInfo.bio,
        verified: basicInfo.verified,
        followers_count: followerStats.followers,
        following_count: followerStats.following,
        tweet_count: followerStats.tweets,
        listed_count: 0, // X.comでは通常表示されない
        last_updated: Date.now(),
        last_tweet_time: recentPostTime,
      };

      console.log(`📊 [統計抽出] フォロワー: ${followerStats.followers.toLocaleString()}、フォロー: ${followerStats.following.toLocaleString()}、ツイート: ${followerStats.tweets.toLocaleString()}`);
      console.log('✅ [収集完了] アカウント情報を正常に取得');

      return accountInfo;
    } catch (error) {
      console.error(`❌ [Playwright収集エラー] セッション: ${sessionId}:`, error);
      throw error;
    } finally {
      // ページクリーンアップ
      if (page) {
        try {
          await page.close();
        } catch (pageError) {
          console.warn('⚠️ [ページ終了エラー]:', pageError);
        }
      }
      
      // セッション解放（コンテキストオーバーライドがない場合のみ）
      if (!contextOverride) {
        await this.browserManager.releaseContext(sessionId);
      }
    }
  }

  async collectRecentPosts(username?: string, limit: number = 10, contextOverride?: BrowserContext): Promise<PostInfo[]> {
    const sessionId = `posts_collector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 [投稿収集開始] ${limit}件を収集 - セッション: ${sessionId}`);
    
    let page: Page | null = null;
    
    try {
      // ブラウザマネージャーからコンテキストを取得
      const context = contextOverride || await this.browserManager.acquireContext(sessionId);
      
      const targetUsername = username || await this.getCurrentUsername();
      const profileUrl = `https://x.com/${targetUsername}`;
      
      page = await context.newPage();
      await page.goto(profileUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      await this.waitForPageLoad(page);

      // ツイート要素を待機
      await page.waitForSelector('[data-testid="tweet"]', { timeout: this.config.timeout });

      // 投稿要素を取得
      const posts = await this.extractRecentPosts(page, limit);

      console.log(`📝 [投稿収集完了] ${posts.length}件の投稿を収集`);

      return posts;
    } catch (error) {
      console.error(`❌ [投稿収集エラー] セッション: ${sessionId}:`, error);
      return [];
    } finally {
      // ページクリーンアップ
      if (page) {
        try {
          await page.close();
        } catch (pageError) {
          console.warn('⚠️ [ページ終了エラー]:', pageError);
        }
      }
      
      // セッション解放
      if (!contextOverride) {
        await this.browserManager.releaseContext(sessionId);
      }
    }
  }

  // ブラウザマネージャーに移行したため、このメソッドは不要
  // private async initializeBrowser(): Promise<void> { ... }

  private async waitForPageLoad(page: Page): Promise<void> {
    const selectors = [
      '[data-testid="UserName"]',
      '[data-testid="UserDescription"]',
      '[role="main"]'
    ];
    await PlaywrightCommonSetup.waitForPageLoad(page, selectors, this.config.timeout);
  }

  // 元のメソッド（後方互換性のために残す）
  private async extractBasicInfo(page: Page, username: string): Promise<{
    user_id: string;
    display_name: string;
    bio: string;
    verified: boolean;
  }> {
    return this.extractBasicInfoSafe(page, username);
  }

  // エラーハンドリング強化版（164行目のエラー対応）
  private async extractBasicInfoSafe(page: Page, username: string): Promise<{
    user_id: string;
    display_name: string;
    bio: string;
    verified: boolean;
  }> {
    try {
      // ページが閉じられていないかチェック
      if (page.isClosed()) {
        throw new Error('ページが既に閉じられています');
      }

      // タイムアウト付きで要素の存在を確認
      await page.waitForSelector('[data-testid="primaryColumn"]', { 
        timeout: this.config.timeout,
        state: 'attached'
      });

      // 表示名を取得（複数のセレクターパターンを試行）
      const displayName = await this.tryMultipleSelectorsSafe(page, [
        '[data-testid="UserName"] div[dir="ltr"] span',
        '[data-testid="UserName"] span[role="heading"]',
        'h1[role="heading"]',
        'h2[role="heading"]'
      ]) || username;

      // プロフィールバイオを取得
      const bio = await this.tryMultipleSelectorsSafe(page, [
        '[data-testid="UserDescription"]',
        '[data-testid="UserBio"]'
      ]) || '';

      // 認証バッジをチェック（タイムアウト設定）
      let verified = false;
      try {
        const verifiedBadge = await page.$('[data-testid="verifiedBadge"]');
        verified = verifiedBadge !== null;
      } catch (badgeError) {
        console.debug('🔍 [認証バッジ確認] 認証バッジが見つかりません');
        verified = false;
      }

      console.log(`✅ [基本情報抽出成功] ${username}: ${displayName}`);
      
      return {
        user_id: username,
        display_name: displayName,
        bio: bio,
        verified: verified
      };
    } catch (error) {
      console.warn(`⚠️ [基本情報抽出エラー] ${username}:`, error);
      return {
        user_id: username,
        display_name: username,
        bio: '',
        verified: false
      };
    }
  }

  // 元のメソッド（後方互換性のために残す）
  private async extractFollowerStats(page: Page): Promise<{
    followers: number;
    following: number;
    tweets: number;
  }> {
    return this.extractFollowerStatsSafe(page);
  }

  // エラーハンドリング強化版（205行目のエラー対応）
  private async extractFollowerStatsSafe(page: Page): Promise<{
    followers: number;
    following: number;
    tweets: number;
  }> {
    try {
      // ページが閉じられていないかチェック
      if (page.isClosed()) {
        throw new Error('ページが既に閉じられています');
      }

      // プロフィール情報エリアの読み込み待機
      await page.waitForSelector('[data-testid="primaryColumn"]', { 
        timeout: this.config.timeout,
        state: 'attached'
      });

      let followers = 0, following = 0, tweets = 0;

      // Method 1: より安全なアプローチで統計を取得
      try {
        const statsElements = await page.$$('[role="link"] span');
        
        for (const element of statsElements) {
          if (page.isClosed()) break; // 処理中にページが閉じられた場合の対策
          
          const text = await element.textContent();
          if (text) {
            const numberMatch = text.match(/[\d,]+/);
            if (numberMatch) {
              const number = this.parseNumber(numberMatch[0]);
              
              // 前後のテキストでタイプを判定（タイムアウト付き）
              try {
                const parent = await element.evaluateHandle(el => el ? el.parentElement : null);
                const parentText = await parent.evaluate(el => el ? (el.textContent?.toLowerCase() || '') : '');
                
                if (parentText.includes('followers') || parentText.includes('フォロワー')) {
                  followers = number;
                } else if (parentText.includes('following') || parentText.includes('フォロー')) {
                  following = number;
                } else if (parentText.includes('posts') || parentText.includes('tweets') || parentText.includes('ツイート')) {
                  tweets = number;
                }
              } catch (evalError) {
                console.debug('🔍 [要素評価エラー] 統計要素の評価をスキップ:', evalError);
                continue;
              }
            }
          }
        }
      } catch (method1Error) {
        console.debug('🔍 [Method 1失敗] フォールバック方法を試行:', method1Error);
      }

      // Method 2: フォールバック - 直接セレクター指定
      if (followers === 0 || following === 0) {
        try {
          const followersText = await this.tryMultipleSelectorsSafe(page, [
            'a[href*="/followers"] span[data-testid="UserName"] span',
            'a[href*="/followers"] span:not([dir])',
            '[data-testid="primaryColumn"] a[href*="/followers"] span'
          ]);

          const followingText = await this.tryMultipleSelectorsSafe(page, [
            'a[href*="/following"] span[data-testid="UserName"] span',
            'a[href*="/following"] span:not([dir])',
            '[data-testid="primaryColumn"] a[href*="/following"] span'
          ]);

          if (followers === 0 && followersText) {
            followers = this.parseNumber(followersText);
          }
          if (following === 0 && followingText) {
            following = this.parseNumber(followingText);
          }
        } catch (method2Error) {
          console.debug('🔍 [Method 2失敗] デフォルト値を使用:', method2Error);
        }
      }

      console.log(`✅ [統計抽出成功] フォロワー: ${followers}, フォロー: ${following}, ツイート: ${tweets}`);
      
      return { followers, following, tweets };
    } catch (error) {
      console.warn('⚠️ [統計抽出エラー]:', error);
      return { followers: 0, following: 0, tweets: 0 };
    }
  }

  // 元のメソッド（後方互換性のために残す）
  private async extractLastTweetTime(page: Page): Promise<number> {
    return this.extractLastTweetTimeSafe(page);
  }

  // エラーハンドリング強化版（249行目のエラー対応）
  private async extractLastTweetTimeSafe(page: Page): Promise<number> {
    try {
      // ページが閉じられていないかチェック
      if (page.isClosed()) {
        throw new Error('ページが既に閉じられています');
      }

      // 投稿が存在するかチェック（短時間待機）
      const hasTweets = await page.locator('[data-testid="tweet"]').count() > 0;
      if (!hasTweets) {
        // 短時間待機してもう一度確認
        try {
          await page.waitForSelector('[data-testid="tweet"]', { 
            timeout: 5000,
            state: 'attached'
          });
        } catch (timeoutError) {
          console.log('📝 [投稿なし] アカウントに投稿が存在しません - デフォルト値を使用');
          return Date.now() - (24 * 60 * 60 * 1000); // 24時間前
        }
      }

      let lastTweetTime = Date.now() - (24 * 60 * 60 * 1000); // デフォルト: 24時間前

      try {
        // タイムアウト付きで時間要素を取得
        const timeElements = await page.$$('[data-testid="tweet"] time');
        
        if (timeElements.length > 0) {
          // 最初のツイートのタイムスタンプを取得
          const firstTimeElement = timeElements[0];
          
          if (firstTimeElement && !page.isClosed()) {
            const datetime = await firstTimeElement.getAttribute('datetime');
            if (datetime) {
              const parsedTime = new Date(datetime).getTime();
              if (!isNaN(parsedTime) && parsedTime > 0) {
                lastTweetTime = parsedTime;
                console.log(`✅ [最新投稿時間取得成功] ${new Date(parsedTime).toISOString()}`);
              }
            }
          }
        } else {
          console.debug('🔍 [投稿時間取得] ツイート要素が見つかりませんでした');
        }
      } catch (timeError) {
        console.debug('🔍 [投稿時間取得エラー] フォールバック値を使用:', timeError);
      }

      return lastTweetTime;
    } catch (error) {
      console.warn('⚠️ [最新投稿時間取得エラー]:', error);
      return Date.now() - (24 * 60 * 60 * 1000);
    }
  }

  private async extractRecentPosts(page: Page, limit: number): Promise<PostInfo[]> {
    try {
      const posts: PostInfo[] = [];
      const tweetElements = await page.$$('[data-testid="tweet"]');

      for (let i = 0; i < Math.min(tweetElements.length, limit); i++) {
        const tweet = tweetElements[i];
        
        try {
          // ツイート内容を取得
          const contentElement = await tweet.$('[data-testid="tweetText"]');
          const content = contentElement ? await contentElement.textContent() : '';

          // タイムスタンプを取得
          const timeElement = await tweet.$('time');
          const datetime = timeElement ? await timeElement.getAttribute('datetime') : null;
          const timestamp = datetime ? new Date(datetime).getTime() : Date.now();

          // エンゲージメント数を取得（オプション）
          const likes = await this.extractEngagementCount(tweet, 'like');
          const retweets = await this.extractEngagementCount(tweet, 'retweet');
          const replies = await this.extractEngagementCount(tweet, 'reply');

          if (content && content.trim()) {
            posts.push({
              id: `tweet-${timestamp}-${i}`,
              content: content.trim(),
              timestamp,
              likes,
              retweets,
              replies
            });
          }
        } catch (error) {
          console.warn(`⚠️ [投稿${i}抽出エラー]:`, error);
        }
      }

      return posts;
    } catch (error) {
      console.warn('⚠️ [投稿リスト抽出エラー]:', error);
      return [];
    }
  }

  private async extractEngagementCount(tweetElement: any, type: 'like' | 'retweet' | 'reply'): Promise<number> {
    try {
      const testIds = {
        like: 'like',
        retweet: 'retweet',
        reply: 'reply'
      };

      const engagementElement = await tweetElement.$(`[data-testid="${testIds[type]}"] span`);
      if (engagementElement) {
        const text = await engagementElement.textContent();
        return text ? this.parseNumber(text) : 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async tryMultipleSelectors(page: Page, selectors: string[]): Promise<string | null> {
    return this.tryMultipleSelectorsSafe(page, selectors);
  }

  // エラーハンドリング強化版のセレクター試行
  private async tryMultipleSelectorsSafe(page: Page, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        // ページが閉じられていないかチェック
        if (page.isClosed()) {
          console.debug('🔍 [セレクター試行] ページが閉じられているため中断');
          return null;
        }

        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (error) {
        console.debug(`🔍 [セレクター試行] ${selector} 失敗:`, error);
        // 次のセレクターを試行
        continue;
      }
    }
    return null;
  }

  private parseNumber(text: string): number {
    return PlaywrightCommonSetup.parseNumber(text);
  }

  private async getCurrentUsername(): Promise<string> {
    try {
      // 1. 設定ファイルから取得を試行
      const fs = (await import('fs')).default;
      const yaml = (await import('js-yaml')).default;
      const path = (await import('path')).default;
      
      const configPath = path.join(process.cwd(), 'data/account-config.yaml');
      if (fs.existsSync(configPath)) {
        const configData = yaml.load(fs.readFileSync(configPath, 'utf8')) as any;
        const username = configData?.account?.username;
        if (username && username !== 'defaultuser') {
          console.log(`🔧 [ユーザー名取得] 設定ファイルから: ${username}`);
          return username;
        }
      }
      
      // 2. 環境変数から取得
      const envUsername = process.env.X_USERNAME;
      if (envUsername && envUsername !== 'defaultuser') {
        console.log(`🔧 [ユーザー名取得] 環境変数から: ${envUsername}`);
        return envUsername;
      }
      
      // 3. フォールバック：エラーを投げる
      throw new Error('アカウント名が設定されていません。data/account-config.yamlまたは環境変数X_USERNAMEを確認してください。');
      
    } catch (error) {
      console.error('❌ [ユーザー名取得エラー]:', error);
      throw error;
    }
  }

  // ブラウザマネージャーを使用した新しいクリーンアップ
  async cleanup(): Promise<void> {
    console.log('🧹 [PlaywrightAccountCollector] クリーンアップ中...');
    await this.browserManager.cleanupInactiveSessions();
  }

  // 完全クリーンアップ（システム終了時）
  async cleanupAll(): Promise<void> {
    console.log('🧹 [PlaywrightAccountCollector] 完全クリーンアップ中...');
    await this.browserManager.cleanupAll();
  }

  // ブラウザマネージャーの統計情報取得（デバッグ用）
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    totalBrowsers: number;
    activeBrowsers: number;
  } {
    return this.browserManager.getSessionStats();
  }

  /**
   * 外部から提供されたコンテキストを使用して収集実行
   */
  async collectWithContext(context: BrowserContext): Promise<PlaywrightAccountInfo> {
    console.log('🎭 [アカウント情報取得] 提供されたコンテキストで実行中...');
    
    try {
      const username = await this.getCurrentUsername();
      const profileUrl = `https://x.com/${username}`;
      
      const page = await context.newPage();
      await page.goto(profileUrl, { waitUntil: 'networkidle' });
      
      // 既存の収集ロジックを実行
      const accountInfo = await this.extractAccountInfo(page, username);
      
      await page.close();
      return accountInfo;
      
    } catch (error) {
      console.error('❌ [コンテキスト使用収集エラー]:', error);
      throw error;
    }
  }

  // 並列実行用の専用メソッド（contextを受け取る）
  async analyzeCurrentStatus(context?: BrowserContext): Promise<PlaywrightAccountInfo> {
    return this.collectAccountInfo(undefined, context);
  }

  /**
   * アカウント情報抽出の統合メソッド（既存ロジックの統合）
   */
  private async extractAccountInfo(page: Page, username: string): Promise<PlaywrightAccountInfo> {
    // ページの読み込み完了を待機
    await this.waitForPageLoad(page);

    // 基本プロフィール情報、フォロワー統計、最近の投稿情報を並列取得（エラーハンドリング強化）
    const [basicInfoResult, followerStatsResult, recentPostTimeResult] = 
      await Promise.allSettled([
        this.extractBasicInfoSafe(page, username),
        this.extractFollowerStatsSafe(page),
        this.extractLastTweetTimeSafe(page)
      ]);

    const basicInfo = basicInfoResult.status === 'fulfilled' ? basicInfoResult.value : { user_id: username, display_name: '', bio: '', verified: false };
    const followerStats = followerStatsResult.status === 'fulfilled' ? followerStatsResult.value : { followers: 0, following: 0, tweets: 0 };
    const recentPostTime = recentPostTimeResult.status === 'fulfilled' ? recentPostTimeResult.value : undefined;

    const accountInfo: PlaywrightAccountInfo = {
      username: username,
      user_id: basicInfo.user_id || username,
      display_name: basicInfo.display_name,
      bio: basicInfo.bio,
      verified: basicInfo.verified,
      followers_count: followerStats.followers,
      following_count: followerStats.following,
      tweet_count: followerStats.tweets,
      listed_count: 0, // X.comでは通常表示されない
      last_updated: Date.now(),
      last_tweet_time: recentPostTime,
    };

    console.log(`📊 [統計抽出] フォロワー: ${followerStats.followers.toLocaleString()}、フォロー: ${followerStats.following.toLocaleString()}、ツイート: ${followerStats.tweets.toLocaleString()}`);
    console.log('✅ [収集完了] アカウント情報を正常に取得');

    return accountInfo;
  }
}