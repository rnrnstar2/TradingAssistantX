import fetch from 'node-fetch';
import { XAuthManager, createXAuthManagerFromEnv } from './x-auth-manager';
import {
  XTweetV2,
  XUserV2,
  XCreateTweetRequestV2,
  XCreateTweetResponseV2,
  XResponseV2,
  XErrorV2,
  XFieldsV2
} from '../types/x-api-types';
import { GeneratedContent, PostResult } from './x-poster';

/**
 * X API v2対応投稿システム
 * OAuth 2.0認証とv2エンドポイントを使用
 */
export class XPosterV2 {
  private readonly API_BASE_URL = 'https://api.twitter.com';
  private readonly TWEET_ENDPOINT = '/2/tweets';
  private readonly USER_ENDPOINT = '/2/users/me';
  private readonly MAX_TWEET_LENGTH = 280;
  
  constructor(private authManager: XAuthManager) {
    console.log('✅ XPosterV2初期化完了（API v2対応）');
    console.log(`📊 APIティア: ${authManager.getApiTier()}`);
  }
  
  /**
   * 基本投稿機能（v2エンドポイント使用）
   */
  async post(content: string): Promise<PostResult> {
    try {
      console.log('🔄 投稿実行開始（API v2）');
      
      // 基本バリデーション
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'コンテンツが空です',
          timestamp: new Date(),
          finalContent: content
        };
      }
      
      // 文字数制限チェック
      const trimmedContent = content.trim();
      if (trimmedContent.length > this.MAX_TWEET_LENGTH) {
        return {
          success: false,
          error: `文字数制限超過: ${trimmedContent.length}文字（最大${this.MAX_TWEET_LENGTH}文字）`,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
      // 投稿実行
      const result = await this.executePost(trimmedContent);
      
      if (result.success) {
        console.log('✅ 投稿成功:', result.postId);
        return {
          success: true,
          postId: result.postId,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      } else {
        console.error('❌ 投稿失敗:', result.error);
        return {
          success: false,
          error: result.error,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 投稿処理エラー:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content
      };
    }
  }
  
  /**
   * ユーザー情報取得（v2エンドポイント使用）
   */
  async getUserInfo(): Promise<XUserV2 | null> {
    try {
      console.log('🔄 ユーザー情報取得中...');
      
      const authHeaders = await this.authManager.getAuthHeaders();
      const url = `${this.API_BASE_URL}${this.USER_ENDPOINT}?user.fields=public_metrics,created_at,description,verified`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'User-Agent': 'TradingAssistantX/1.0'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ ユーザー情報取得失敗:', response.status, errorData);
        return null;
      }
      
      const result = await response.json() as XResponseV2<XUserV2>;
      
      if (result.data) {
        console.log('✅ ユーザー情報取得成功:', result.data.username);
        return result.data;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ ユーザー情報取得エラー:', error);
      return null;
    }
  }
  
  /**
   * エンゲージメント取得（Proプラン以上）
   */
  async getEngagement(tweetId: string): Promise<XTweetV2 | null> {
    try {
      console.log('🔄 エンゲージメント情報取得中...');
      
      // APIティアチェック
      const tier = this.authManager.getApiTier();
      if (tier === 'free' || tier === 'basic') {
        console.warn('⚠️ エンゲージメント詳細はProプラン以上で利用可能です');
        return null;
      }
      
      const authHeaders = await this.authManager.getAuthHeaders();
      const url = `${this.API_BASE_URL}/2/tweets/${tweetId}?tweet.fields=public_metrics,created_at`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'User-Agent': 'TradingAssistantX/1.0'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ エンゲージメント取得失敗:', response.status, errorData);
        return null;
      }
      
      const result = await response.json() as XResponseV2<XTweetV2>;
      
      if (result.data) {
        console.log('✅ エンゲージメント取得成功');
        console.log(`📊 メトリクス:`, result.data.public_metrics);
        return result.data;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ エンゲージメント取得エラー:', error);
      return null;
    }
  }
  
  /**
   * フォロワー数取得（v2エンドポイント版）
   */
  async getFollowerCount(): Promise<number> {
    const userInfo = await this.getUserInfo();
    if (userInfo && userInfo.public_metrics) {
      const count = userInfo.public_metrics.followers_count;
      console.log('✅ フォロワー数:', count);
      return count;
    }
    return 500; // デフォルト値
  }
  
  /**
   * 既存のpostToXメソッドとの互換性維持
   */
  async postToX(content: GeneratedContent): Promise<PostResult> {
    try {
      let postContent = content.content.trim();
      
      // ハッシュタグを追加
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtags = content.hashtags.slice(0, 2); // 最大2個まで
        const hashtagsStr = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
        
        if (postContent.length + hashtagsStr.length + 1 <= this.MAX_TWEET_LENGTH) {
          postContent += ' ' + hashtagsStr;
        }
      }
      
      return await this.post(postContent);
      
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
   * 実際のX API v2投稿実行
   */
  private async executePost(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // MODEチェック
      const isDevelopmentMode = process.env.MODE !== 'production';
      
      if (isDevelopmentMode) {
        console.log('\n🛠️  [DEV MODE] 実際の投稿は実行されません - 開発モードで動作中');
        console.log('📝 [投稿内容プレビュー]:');
        console.log('━'.repeat(50));
        console.log(content);
        console.log('━'.repeat(50));
        console.log(`📊 [文字数]: ${content.length}/280文字`);
        console.log('✅ [DEV MODE] 投稿は成功扱いでシミュレートされました');
        
        // 開発モード用の偽の投稿IDを生成
        const devPostId = `dev_v2_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        return {
          success: true,
          postId: devPostId
        };
      }
      
      // 本番モード: X API v2投稿
      const authHeaders = await this.authManager.getAuthHeaders();
      const url = `${this.API_BASE_URL}${this.TWEET_ENDPOINT}`;
      
      const requestBody: XCreateTweetRequestV2 = {
        text: content
      };
      
      console.log('🔍 [DEBUG] API v2 Request:', {
        url,
        method: 'POST',
        body: requestBody
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'User-Agent': 'TradingAssistantX/1.0'
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('❌ [DEBUG] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });
        
        try {
          const errorData = JSON.parse(responseText) as XErrorV2;
          const errorMessage = errorData.errors?.[0]?.detail || errorData.detail || responseText;
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorMessage}`
          };
        } catch {
          return {
            success: false,
            error: `HTTP ${response.status}: ${responseText}`
          };
        }
      }
      
      const result = JSON.parse(responseText) as XCreateTweetResponseV2;
      
      return {
        success: true,
        postId: result.data.id
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error'
      };
    }
  }
  
  /**
   * レート制限情報を取得
   */
  getRateLimits(): { postsPerMonth: number; readsPerMonth: number } {
    return this.authManager.getRateLimits();
  }
}

/**
 * 環境変数からXPosterV2インスタンスを作成するヘルパー関数
 */
export function createXPosterV2FromEnv(): XPosterV2 {
  const authManager = createXAuthManagerFromEnv();
  return new XPosterV2(authManager);
}

export default XPosterV2;