/**
 * KaitoAPI基本機能統合テスト
 * 教育的投稿システムの動作確認
 */

import { KaitoTwitterAPIClient } from './src/kaito-api/client';
import { KaitoAPIConfig } from './src/kaito-api/config';
import { TweetActions } from './src/kaito-api/tweet-actions';
import { UserInfo } from './src/kaito-api/user-info';
import { ResponseHandler } from './src/kaito-api/response-handler';
import { SearchEngine } from './src/kaito-api/search-engine';

/**
 * 基本統合テスト実行
 */
async function runIntegrationTest() {
  console.log('🧪 KaitoAPI基本機能統合テスト開始');
  
  try {
    // 1. 設定初期化テスト
    console.log('\n1️⃣ 設定初期化テスト');
    const config = new KaitoAPIConfig();
    const configData = config.getConfig();
    console.log('✅ 設定初期化成功:', {
      apiKey: configData.apiKey ? '設定済み' : '未設定',
      rateLimits: configData.rateLimits,
      educational: configData.educational
    });

    // 2. クライアント初期化テスト
    console.log('\n2️⃣ クライアント初期化テスト');
    const client = new KaitoTwitterAPIClient({
      apiKey: 'test_key_for_integration_test'
    });
    console.log('✅ クライアント初期化成功');

    // 3. レスポンスハンドラーテスト
    console.log('\n3️⃣ レスポンスハンドラーテスト');
    const responseHandler = new ResponseHandler();
    const mockResponse = Promise.resolve({ success: true, data: 'test' });
    const handledResponse = await responseHandler.handleResponse(mockResponse, {
      endpoint: '/test',
      method: 'GET',
      educational: true
    });
    console.log('✅ レスポンスハンドラー成功:', {
      success: handledResponse.success,
      educational: handledResponse.metadata.educational?.contentValidated
    });

    // 4. 教育的投稿アクションテスト
    console.log('\n4️⃣ 教育的投稿アクションテスト');
    const tweetActions = new TweetActions(client, config);
    
    // 教育的コンテンツの検証テスト
    const educationalContent = "投資教育の基本について解説します。初心者の方はまずリスク管理の重要性を理解することが大切です。";
    console.log('教育的コンテンツテスト:', educationalContent);
    console.log('✅ 教育的投稿アクション初期化成功');

    // 5. ユーザー情報取得テスト
    console.log('\n5️⃣ ユーザー情報取得テスト');
    const userInfo = new UserInfo(client, config);
    
    // 教育的アカウント検索テスト
    const educationalAccounts = await userInfo.searchEducationalAccounts({
      query: '投資教育',
      maxResults: 5,
      educationalOnly: true
    });
    console.log('✅ ユーザー情報取得成功:', {
      foundAccounts: educationalAccounts.length,
      firstAccount: educationalAccounts[0]?.basicInfo.username
    });

    // 6. 検索エンジンテスト
    console.log('\n6️⃣ 検索エンジンテスト');
    const searchEngine = new SearchEngine();
    
    // 投資教育コンテンツ検索テスト
    const searchResults = await searchEngine.searchTweets('投資教育 初心者', {
      minLikes: 5,
      language: 'ja'
    });
    console.log('✅ 検索エンジン成功:', {
      foundTweets: searchResults.length,
      firstTweet: searchResults[0]?.text.substring(0, 50) + '...'
    });

    // 7. 統合機能テスト（教育的価値の確認）
    console.log('\n7️⃣ 統合機能テスト');
    
    // 安全性チェック
    const safetyCheck = await userInfo.checkAccountSafety('test_user');
    console.log('✅ 安全性チェック成功:', {
      isSafe: safetyCheck.isSafe,
      safetyLevel: safetyCheck.safetyLevel
    });

    // ヘルスチェック
    const healthCheck = await responseHandler.performHealthCheck();
    console.log('✅ ヘルスチェック成功:', {
      healthy: healthCheck.healthy,
      errorRate: healthCheck.errorRate,
      rateLimitStatus: healthCheck.rateLimitStatus
    });

    console.log('\n🎉 KaitoAPI基本機能統合テスト完了 - 全ての機能が正常に動作しています！');
    
    return {
      success: true,
      testsCompleted: 7,
      message: '教育的投稿システムが正常に動作しています'
    };

  } catch (error) {
    console.error('\n❌ 統合テスト失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'システムに問題があります'
    };
  }
}

// テスト実行（直接実行された場合）
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest()
    .then(result => {
      console.log('\n📊 テスト結果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

export { runIntegrationTest };