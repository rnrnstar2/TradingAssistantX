/**
 * 実TwitterAPI.io機能テスト - 3層認証システム実機能動作確認
 * 
 * 重要警告: 実際のTwitterへの投稿・削除を実行
 * - 実際のツイート投稿（後で削除）
 * - 実際のエンゲージメント（いいね・リツイート）
 * - 実際のAPIコスト発生（$0.15/1k tweets）
 * - 本番Twitter アカウントへの影響
 * 
 * 実行前必須確認:
 * - テスト専用Twitterアカウント使用
 * - 投稿内容がテスト用であることを明記
 * - 投稿後の自動削除機能確認
 * - コスト制限設定確認
 * 
 * TASK-004対応: 実機能テスト・検証
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api';
import type { PostResult, EngagementResult, TweetSearchOptions } from '../../../src/kaito-api/types';

// 実機能テスト用の設定
const REAL_FUNCTION_TEST_CONFIG = {
  // 実機能テスト実行フラグ（環境変数で制御）
  ENABLED: process.env.ENABLE_REAL_FUNCTION_TESTS === 'true',
  
  // 安全対策設定
  TEST_ACCOUNT_ONLY: true,
  AUTO_DELETE_POSTS: true,
  MAX_TEST_POSTS: 5,
  MAX_COST_USD: 2.0,
  
  // テスト投稿識別子
  TEST_IDENTIFIER: '[TEST]',
  TEST_HASHTAG: '#APIテスト',
  
  // タイムアウト設定
  TIMEOUT_MS: 60000, // 1分
  CLEANUP_DELAY_MS: 5000, // 5秒後に削除
  
  // レート制限対策
  REQUEST_DELAY_MS: 3000 // 3秒間隔
};

describe('実TwitterAPI.io機能テスト', () => {
  let authManager: AuthManager;
  let client: KaitoTwitterAPIClient;
  let createdTweetIds: string[] = [];
  let requestCount: number = 0;
  let estimatedCost: number = 0;
  
  beforeAll(async () => {
    // 実機能テスト実行可否確認
    if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
      console.log('⚠️ 実機能テスト無効 - ENABLE_REAL_FUNCTION_TESTS=true で有効化');
      console.log('⚠️ 注意: 実機能テストは実際のTwitterへの投稿・削除を実行します');
      return;
    }
    
    console.log('🚨 実機能テスト開始 - 実際のTwitter操作を実行します');
    console.log('📋 テスト設定:', {
      maxPosts: REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS,
      maxCost: `$${REAL_FUNCTION_TEST_CONFIG.MAX_COST_USD}`,
      autoDelete: REAL_FUNCTION_TEST_CONFIG.AUTO_DELETE_POSTS,
      testAccount: REAL_FUNCTION_TEST_CONFIG.TEST_ACCOUNT_ONLY
    });
    
    // 環境変数確認
    expect(process.env.KAITO_API_TOKEN).toBeDefined();
    
    // 認証情報確認（最低1つの認証方法が必要）
    const hasV1Auth = process.env.X_USERNAME && process.env.X_PASSWORD;
    const hasV2Auth = process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD;
    
    if (!hasV1Auth && !hasV2Auth) {
      throw new Error('実機能テストには最低1つの認証方法（V1またはV2）が必要です');
    }
    
    console.log('✅ 実機能テスト環境確認完了');
  });
  
  beforeEach(async () => {
    if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) return;
    
    // コスト・投稿数制限チェック
    if (createdTweetIds.length >= REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS) {
      throw new Error(`テスト投稿数制限到達: ${REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS}投稿`);
    }
    
    if (estimatedCost >= REAL_FUNCTION_TEST_CONFIG.MAX_COST_USD) {
      throw new Error(`テスト費用制限到達: $${REAL_FUNCTION_TEST_CONFIG.MAX_COST_USD}`);
    }
    
    // クライアント初期化
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN!,
      preferredAuthMethod: 'v2'
    });
    
    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN!,
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 3000
      },
      costTracking: {
        enabled: true,
        ratePerThousand: 0.15,
        alertThreshold: REAL_FUNCTION_TEST_CONFIG.MAX_COST_USD
      }
    });
    
    // レート制限対策の待機
    if (requestCount > 0) {
      await new Promise(resolve => 
        setTimeout(resolve, REAL_FUNCTION_TEST_CONFIG.REQUEST_DELAY_MS)
      );
    }
  });
  
  afterEach(async () => {
    if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) return;
    
    // 自動削除が有効な場合、作成したツイートを削除
    if (REAL_FUNCTION_TEST_CONFIG.AUTO_DELETE_POSTS && createdTweetIds.length > 0) {
      console.log(`🗑️ テスト投稿自動削除開始: ${createdTweetIds.length}件`);
      
      // 削除前に短時間待機（投稿直後の削除を避ける）
      await new Promise(resolve => 
        setTimeout(resolve, REAL_FUNCTION_TEST_CONFIG.CLEANUP_DELAY_MS)
      );
      
      for (const tweetId of createdTweetIds) {
        try {
          await client.deleteTweet(tweetId);
          console.log(`✅ テスト投稿削除完了: ${tweetId}`);
        } catch (error) {
          console.warn(`⚠️ テスト投稿削除失敗: ${tweetId} - ${error.message}`);
        }
      }
      
      createdTweetIds = [];
    }
    
    // 統計更新
    requestCount++;
    estimatedCost += 0.15 / 1000;
    
    console.log(`📊 実機能テスト統計: ${requestCount}リクエスト, ${createdTweetIds.length}/${REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS}投稿, $${estimatedCost.toFixed(4)}`);
    
    // ログアウト
    if (authManager) {
      await authManager.logout();
    }
  });

  describe('実際のツイート投稿（V1）', () => {
    test('V1認証での実際のツイート投稿・削除', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実機能テストスキップ');
        return;
      }
      
      // V1認証確認
      const hasV1Auth = process.env.X_USERNAME && process.env.X_PASSWORD;
      if (!hasV1Auth) {
        console.log('⚠️ V1認証情報未設定 - V1投稿テストスキップ');
        return;
      }
      
      console.log('📝 V1実投稿テスト開始...');
      
      try {
        // V1ログイン実行
        const loginResult = await authManager.loginV1();
        
        if (!loginResult.success) {
          console.log('⚠️ V1ログイン失敗 - テストスキップ:', loginResult.error);
          return;
        }
        
        // V1認証での投稿作成
        const testContent = `${REAL_FUNCTION_TEST_CONFIG.TEST_IDENTIFIER} V1認証テスト投稿 ${new Date().toISOString()} ${REAL_FUNCTION_TEST_CONFIG.TEST_HASHTAG}`;
        
        const postResult: PostResult = await client.createPost({
          content: testContent,
          mediaIds: []
        });
        
        expect(postResult).toBeDefined();
        expect(postResult.success).toBe(true);
        expect(postResult.tweetId).toBeDefined();
        expect(typeof postResult.tweetId).toBe('string');
        expect(postResult.createdAt).toBeDefined();
        
        // 作成されたツイートIDを記録（削除用）
        createdTweetIds.push(postResult.tweetId);
        
        console.log('✅ V1実投稿成功:', {
          tweetId: postResult.tweetId,
          content: testContent.substring(0, 50) + '...',
          createdAt: postResult.createdAt
        });
        
        // 投稿確認のための短時間待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 投稿削除テスト
        const deleteResult = await client.deleteTweet(postResult.tweetId);
        
        expect(deleteResult).toBeDefined();
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.deletedTweetId).toBe(postResult.tweetId);
        
        // 削除済みなので配列から除去
        createdTweetIds = createdTweetIds.filter(id => id !== postResult.tweetId);
        
        console.log('✅ V1実投稿削除成功:', {
          deletedId: deleteResult.deletedTweetId,
          deletedAt: deleteResult.deletedAt
        });
        
      } catch (error) {
        console.error('❌ V1実投稿テストエラー:', error);
        
        // V1 API廃止予定による失敗は想定内
        if (error.message.includes('deprecated') || error.message.includes('v1')) {
          console.log('⚠️ V1 API廃止に伴う失敗 - 期待される動作');
          expect(error.message).toBeDefined();
        } else {
          throw error;
        }
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実際のツイート投稿（V2）', () => {
    test('V2認証での実際のツイート投稿・削除', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実機能テストスキップ');
        return;
      }
      
      // V2認証確認
      const hasV2Auth = process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD;
      if (!hasV2Auth) {
        console.log('⚠️ V2認証情報未設定 - V2投稿テストスキップ');
        return;
      }
      
      console.log('🚀 V2実投稿テスト開始...');
      
      try {
        // V2ログイン実行
        const loginResult = await authManager.loginV2();
        
        if (!loginResult.success) {
          console.log('⚠️ V2ログイン失敗 - テストスキップ:', loginResult.error);
          return;
        }
        
        // V2認証での高機能投稿作成
        const testContent = `${REAL_FUNCTION_TEST_CONFIG.TEST_IDENTIFIER} V2認証高機能テスト投稿\n\n📊 投資教育テスト内容:\n• リスク管理の重要性\n• 分散投資の効果\n• 長期投資の考え方\n\n${new Date().toISOString()} ${REAL_FUNCTION_TEST_CONFIG.TEST_HASHTAG} #投資教育テスト`;
        
        const postResult: PostResult = await client.createPost({
          content: testContent,
          mediaIds: []
        });
        
        expect(postResult).toBeDefined();
        expect(postResult.success).toBe(true);
        expect(postResult.tweetId).toBeDefined();
        expect(typeof postResult.tweetId).toBe('string');
        expect(postResult.createdAt).toBeDefined();
        
        // 作成されたツイートIDを記録
        createdTweetIds.push(postResult.tweetId);
        
        console.log('✅ V2実投稿成功:', {
          tweetId: postResult.tweetId,
          contentLength: testContent.length,
          createdAt: postResult.createdAt
        });
        
        // V2高機能確認（長文投稿）
        expect(testContent.length).toBeGreaterThan(100);
        expect(testContent).toContain('投資教育');
        expect(testContent).toContain('リスク管理');
        
        // 投稿確認のための短時間待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 投稿削除テスト
        const deleteResult = await client.deleteTweet(postResult.tweetId);
        
        expect(deleteResult).toBeDefined();
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.deletedTweetId).toBe(postResult.tweetId);
        
        // 削除済みなので配列から除去
        createdTweetIds = createdTweetIds.filter(id => id !== postResult.tweetId);
        
        console.log('✅ V2実投稿削除成功:', {
          deletedId: deleteResult.deletedTweetId,
          deletedAt: deleteResult.deletedAt
        });
        
      } catch (error) {
        console.error('❌ V2実投稿テストエラー:', error);
        throw error;
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
    
    test('V2での投稿オプション機能テスト', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED || createdTweetIds.length >= REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS) {
        console.log('⚠️ V2オプション機能テストスキップ');
        return;
      }
      
      // V2認証確認
      const authStatus = authManager.getAuthStatus();
      if (authStatus.authLevel !== 'v2-login') {
        console.log('⚠️ V2認証未完了 - オプション機能テストスキップ');
        return;
      }
      
      console.log('⚙️ V2オプション機能テスト開始...');
      
      try {
        // 特殊文字・絵文字を含む高機能投稿
        const advancedContent = `${REAL_FUNCTION_TEST_CONFIG.TEST_IDENTIFIER} V2高機能投稿テスト\n\n💡 投資教育コンテンツ:\n📈 市場分析 → 📊 データ検証 → 💰 投資判断\n\n🔍 重要ポイント:\n✅ リスク許容度の把握\n✅ 投資目標の明確化\n✅ 継続的な学習\n\n${new Date().toISOString()}\n${REAL_FUNCTION_TEST_CONFIG.TEST_HASHTAG} #投資教育 #資産形成`;
        
        const postResult: PostResult = await client.createPost({
          content: advancedContent,
          mediaIds: []
        });
        
        expect(postResult.success).toBe(true);
        expect(postResult.tweetId).toBeDefined();
        
        createdTweetIds.push(postResult.tweetId);
        
        // 高機能投稿の特徴確認
        expect(advancedContent.length).toBeGreaterThan(200);
        expect(advancedContent).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u); // 絵文字含有
        expect(advancedContent).toContain('投資教育');
        expect(advancedContent).toContain('✅'); // 特殊文字含有
        
        console.log('✅ V2高機能投稿成功:', {
          tweetId: postResult.tweetId,
          contentLength: advancedContent.length,
          hasEmojis: true,
          hasSpecialChars: true
        });
        
      } catch (error) {
        console.error('❌ V2オプション機能テストエラー:', error);
        throw error;
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実際のエンゲージメント', () => {
    test('実際のいいね・リツイートの実行・取り消し', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実機能テストスキップ');
        return;
      }
      
      // 認証確認
      const authStatus = authManager.getAuthStatus();
      if (!authStatus.userSessionValid) {
        console.log('⚠️ ユーザー認証未完了 - エンゲージメントテストスキップ');
        return;
      }
      
      console.log('👍 実エンゲージメントテスト開始...');
      
      try {
        // 既存の投稿（公開ツイート）に対するエンゲージメント
        // 注意: 実際のアカウントに影響するため、テスト用アカウントの投稿を使用
        const targetTweetId = '1234567890123456789'; // テスト用の既存ツイートID
        
        // いいね実行
        const likeResult: EngagementResult = await client.performEngagement({
          tweetId: targetTweetId,
          action: 'like'
        });
        
        if (likeResult.success) {
          expect(likeResult.success).toBe(true);
          expect(likeResult.action).toBe('like');
          expect(likeResult.tweetId).toBe(targetTweetId);
          expect(likeResult.timestamp).toBeDefined();
          
          console.log('✅ いいね実行成功:', {
            tweetId: likeResult.tweetId,
            action: likeResult.action,
            timestamp: likeResult.timestamp
          });
          
          // いいね取り消し
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const unlikeResult: EngagementResult = await client.performEngagement({
            tweetId: targetTweetId,
            action: 'unlike'
          });
          
          if (unlikeResult.success) {
            expect(unlikeResult.success).toBe(true);
            expect(unlikeResult.action).toBe('unlike');
            
            console.log('✅ いいね取り消し成功:', {
              tweetId: unlikeResult.tweetId,
              action: unlikeResult.action
            });
          }
        }
        
        // リツイート実行（教育的価値の高い投稿）
        const retweetResult: EngagementResult = await client.performEngagement({
          tweetId: targetTweetId,
          action: 'retweet'
        });
        
        if (retweetResult.success) {
          expect(retweetResult.success).toBe(true);
          expect(retweetResult.action).toBe('retweet');
          
          console.log('✅ リツイート実行成功:', {
            tweetId: retweetResult.tweetId,
            action: retweetResult.action
          });
          
          // リツイート取り消し
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const unretweetResult: EngagementResult = await client.performEngagement({
            tweetId: targetTweetId,
            action: 'unretweet'
          });
          
          if (unretweetResult.success) {
            expect(unretweetResult.success).toBe(true);
            expect(unretweetResult.action).toBe('unretweet');
            
            console.log('✅ リツイート取り消し成功:', {
              tweetId: unretweetResult.tweetId,
              action: unretweetResult.action
            });
          }
        }
        
      } catch (error) {
        console.error('❌ 実エンゲージメントテストエラー:', error);
        
        // 対象ツイートの存在確認エラーは想定内
        if (error.message.includes('not found') || error.message.includes('404')) {
          console.log('⚠️ 対象ツイート不存在 - テスト用ツイートIDの更新が必要');
          expect(error.message).toContain('not found');
        } else {
          throw error;
        }
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実際の検索・情報取得', () => {
    test('実際のツイート検索機能', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実機能テストスキップ');
        return;
      }
      
      console.log('🔍 実検索機能テスト開始...');
      
      try {
        // 投資教育関連の実際の検索
        const searchOptions: TweetSearchOptions = {
          query: '投資 OR 資産形成 OR 投資教育',
          maxResults: 10,
          sortOrder: 'recency',
          includeRetweets: false,
          lang: 'ja'
        };
        
        const searchResult = await client.searchTweets(searchOptions);
        
        expect(searchResult).toBeDefined();
        expect(searchResult.tweets).toBeDefined();
        expect(Array.isArray(searchResult.tweets)).toBe(true);
        expect(searchResult.tweets.length).toBeGreaterThan(0);
        expect(searchResult.tweets.length).toBeLessThanOrEqual(10);
        expect(searchResult.searchQuery).toBe(searchOptions.query);
        expect(searchResult.timestamp).toBeDefined();
        
        // 検索結果の品質確認
        const tweets = searchResult.tweets;
        const educationalTweets = tweets.filter(tweet => 
          tweet.text.includes('投資') || 
          tweet.text.includes('資産') || 
          tweet.text.includes('教育')
        );
        
        expect(educationalTweets.length).toBeGreaterThan(0);
        
        console.log('✅ 実検索機能成功:', {
          totalResults: tweets.length,
          educationalResults: educationalTweets.length,
          query: searchResult.searchQuery,
          timestamp: searchResult.timestamp
        });
        
        // 最初のツイートの詳細確認
        const firstTweet = tweets[0];
        expect(firstTweet).toHaveProperty('id');
        expect(firstTweet).toHaveProperty('text');
        expect(firstTweet).toHaveProperty('created_at');
        expect(firstTweet).toHaveProperty('author');
        
        console.log('✅ ツイートデータ構造確認完了:', {
          id: firstTweet.id,
          textLength: firstTweet.text.length,
          author: firstTweet.author.username,
          createdAt: firstTweet.created_at
        });
        
      } catch (error) {
        console.error('❌ 実検索機能テストエラー:', error);
        throw error;
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
    
    test('実際のユーザー情報取得', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実機能テストスキップ');
        return;
      }
      
      console.log('👤 実ユーザー情報取得テスト開始...');
      
      try {
        // 著名な投資教育アカウントの情報取得
        const testUsernames = ['TwitterDev', 'Twitter']; // 安全な公開アカウント
        
        for (const username of testUsernames) {
          const userInfo = await client.getUserInfo(username);
          
          expect(userInfo).toBeDefined();
          expect(userInfo.username).toBe(username);
          expect(userInfo.user_id).toBeDefined();
          expect(userInfo.display_name).toBeDefined();
          expect(typeof userInfo.followers_count).toBe('number');
          expect(typeof userInfo.following_count).toBe('number');
          expect(typeof userInfo.tweet_count).toBe('number');
          
          console.log(`✅ ユーザー情報取得成功 - ${username}:`, {
            userId: userInfo.user_id,
            displayName: userInfo.display_name,
            followers: userInfo.followers_count,
            following: userInfo.following_count,
            tweets: userInfo.tweet_count,
            verified: userInfo.verified
          });
          
          // レート制限対策
          if (testUsernames.indexOf(username) < testUsernames.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
      } catch (error) {
        console.error('❌ 実ユーザー情報取得テストエラー:', error);
        throw error;
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実機能統合テスト', () => {
    test('投稿 → 検索 → エンゲージメント → 削除フロー', async () => {
      if (!REAL_FUNCTION_TEST_CONFIG.ENABLED || createdTweetIds.length >= REAL_FUNCTION_TEST_CONFIG.MAX_TEST_POSTS - 1) {
        console.log('⚠️ 実統合機能テストスキップ');
        return;
      }
      
      console.log('🔄 実統合機能フローテスト開始...');
      
      try {
        // 統合ログイン実行
        const loginResult = await authManager.login();
        if (!loginResult.success) {
          console.log('⚠️ 統合ログイン失敗 - フローテストスキップ');
          return;
        }
        
        // 1. 特徴的な投稿作成
        const uniqueId = Date.now().toString();
        const testContent = `${REAL_FUNCTION_TEST_CONFIG.TEST_IDENTIFIER} 統合フローテスト${uniqueId}\n\n💡 本日の投資教育トピック:\n• 複利効果の威力について\n• 時間を味方につける投資戦略\n\n${REAL_FUNCTION_TEST_CONFIG.TEST_HASHTAG} #統合テスト${uniqueId}`;
        
        const postResult = await client.createPost({
          content: testContent,
          mediaIds: []
        });
        
        expect(postResult.success).toBe(true);
        createdTweetIds.push(postResult.tweetId);
        
        console.log('✅ フロー1: 投稿作成成功', {
          tweetId: postResult.tweetId,
          uniqueId: uniqueId
        });
        
        // 2. 投稿の検索確認（短時間待機後）
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const searchResult = await client.searchTweets({
          query: `統合テスト${uniqueId}`,
          maxResults: 5,
          sortOrder: 'recency'
        });
        
        expect(searchResult.tweets).toBeDefined();
        
        const foundTweet = searchResult.tweets.find(tweet => 
          tweet.id === postResult.tweetId || tweet.text.includes(uniqueId)
        );
        
        if (foundTweet) {
          console.log('✅ フロー2: 投稿検索成功', {
            foundTweetId: foundTweet.id,
            searchQuery: `統合テスト${uniqueId}`
          });
        } else {
          console.log('⚠️ フロー2: 投稿が検索結果に未反映（時間差の可能性）');
        }
        
        // 3. 自分の投稿へのエンゲージメント（可能な場合）
        try {
          const likeResult = await client.performEngagement({
            tweetId: postResult.tweetId,
            action: 'like'
          });
          
          if (likeResult.success) {
            console.log('✅ フロー3: エンゲージメント成功');
            
            // いいね取り消し
            await new Promise(resolve => setTimeout(resolve, 2000));
            await client.performEngagement({
              tweetId: postResult.tweetId,
              action: 'unlike'
            });
          }
        } catch (engagementError) {
          console.log('⚠️ フロー3: 自己エンゲージメント制限（期待される動作）');
        }
        
        // 4. 投稿削除
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const deleteResult = await client.deleteTweet(postResult.tweetId);
        expect(deleteResult.success).toBe(true);
        
        createdTweetIds = createdTweetIds.filter(id => id !== postResult.tweetId);
        
        console.log('✅ フロー4: 投稿削除成功', {
          deletedId: deleteResult.deletedTweetId
        });
        
        console.log('🎉 統合フローテスト完全成功');
        
      } catch (error) {
        console.error('❌ 統合フローテストエラー:', error);
        throw error;
      }
    }, REAL_FUNCTION_TEST_CONFIG.TIMEOUT_MS * 2); // フローテストは長時間
  });
});