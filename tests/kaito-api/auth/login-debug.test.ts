/**
 * ログインHTTP 400エラー詳細デバッグテスト
 * リクエスト内容とレスポンス詳細を分析
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';

describe('ログインHTTP 400エラー詳細デバッグ', () => {
  test('リクエスト詳細とレスポンス内容分析', async () => {
    console.log('=== HTTP 400エラー詳細分析 ===');
    
    const authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN
    });
    
    // 環境変数確認
    const env = {
      hasToken: !!process.env.KAITO_API_TOKEN,
      hasUsername: !!process.env.X_USERNAME,
      hasEmail: !!process.env.X_EMAIL,
      hasPassword: !!process.env.X_PASSWORD,
      hasProxy: !!process.env.X_PROXY,
      username: process.env.X_USERNAME,
      email: process.env.X_EMAIL,
      proxy: process.env.X_PROXY
    };
    
    console.log('🔍 送信予定データ:');
    console.log('  - APIトークン:', process.env.KAITO_API_TOKEN?.slice(0, 8) + '...');
    console.log('  - ユーザー名:', env.username);
    console.log('  - メール:', env.email);
    console.log('  - パスワード:', env.hasPassword ? '設定済み' : 'なし');
    console.log('  - プロキシ:', env.proxy);
    
    // 手動でHTTPリクエストを実行してレスポンス詳細を確認
    const API_BASE_URL = 'https://api.twitterapi.io';
    const loginUrl = `${API_BASE_URL}/twitter/user_login_v2`;
    
    console.log('🌐 リクエスト詳細:');
    console.log('  - URL:', loginUrl);
    console.log('  - Method: POST');
    
    const headers = {
      'x-api-key': process.env.KAITO_API_TOKEN!,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'TradingAssistantX/1.0'
    };
    
    console.log('  - Headers:', Object.keys(headers));
    
    const payload = {
      user_name: process.env.X_USERNAME,
      email: process.env.X_EMAIL,
      password: process.env.X_PASSWORD,
      totp_secret: process.env.X_TOTP_SECRET,
      proxy: process.env.X_PROXY
    };
    
    console.log('  - Payload keys:', Object.keys(payload));
    
    try {
      console.log('📡 HTTPリクエスト送信中...');
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      console.log('📥 レスポンス詳細:');
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
      
      let responseText: string;
      try {
        responseText = await response.text();
        console.log('  - Body length:', responseText.length);
        console.log('  - Body preview:', responseText.slice(0, 500));
      } catch (e) {
        console.log('  - Body読み取りエラー:', e);
        responseText = 'Cannot read response body';
      }
      
      // JSONパース試行
      try {
        const responseJson = JSON.parse(responseText);
        console.log('📊 レスポンスJSON:');
        console.log(JSON.stringify(responseJson, null, 2));
        
        if (responseJson.error) {
          console.log('🚨 サーバーエラーメッセージ:', responseJson.error);
        }
        
      } catch (e) {
        console.log('📄 レスポンスはJSON形式ではありません');
        console.log('Raw response:', responseText);
      }
      
      if (!response.ok) {
        console.log('❌ HTTPエラー詳細分析:');
        
        if (response.status === 400) {
          console.log('  🔍 HTTP 400考えられる原因:');
          console.log('    1. 必須パラメータの不足');
          console.log('    2. パラメータの形式エラー');
          console.log('    3. 認証情報の不正');
          console.log('    4. APIエンドポイントの変更');
          console.log('    5. TwitterAPI.ioサービス側の問題');
        }
      }
      
    } catch (error) {
      console.log('💥 ネットワークエラー:', error);
      if (error instanceof Error) {
        console.log('  - Message:', error.message);
        console.log('  - Name:', error.name);
        if (error.stack) {
          console.log('  - Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
        }
      }
    }
    
    console.log('✅ HTTP 400エラー詳細分析完了');
  });
  
  test('TwitterAPI.io API仕様確認', async () => {
    console.log('=== TwitterAPI.io API仕様確認 ===');
    
    // API仕様書やドキュメントに基づく確認項目
    console.log('🔍 user_login_v2 エンドポイント仕様確認:');
    console.log('  - 必須パラメータ: username, email, password');
    console.log('  - オプションパラメータ: proxy');
    console.log('  - Content-Type: application/json');
    console.log('  - 認証: x-api-key ヘッダー');
    
    const requiredFields = ['username', 'email', 'password'];
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      const envKey = `X_${field.toUpperCase()}`;
      if (!process.env[envKey]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length === 0) {
      console.log('✅ 必須パラメータはすべて設定されています');
    } else {
      console.log('❌ 不足している必須パラメータ:', missingFields);
    }
    
    // パラメータ値の妥当性チェック
    console.log('🔧 パラメータ妥当性チェック:');
    
    if (process.env.X_EMAIL && !process.env.X_EMAIL.includes('@')) {
      console.log('  - X_EMAIL: ❌ 無効な形式（@が含まれていません）');
    } else {
      console.log('  - X_EMAIL: ✅ 有効な形式');
    }
    
    if (process.env.X_USERNAME && process.env.X_USERNAME.length < 1) {
      console.log('  - X_USERNAME: ❌ 空文字です');
    } else {
      console.log('  - X_USERNAME: ✅ 設定されています');
    }
    
    if (process.env.X_PASSWORD && process.env.X_PASSWORD.length < 1) {
      console.log('  - X_PASSWORD: ❌ 空文字です');
    } else {
      console.log('  - X_PASSWORD: ✅ 設定されています');
    }
    
    console.log('✅ API仕様確認完了');
  });
});