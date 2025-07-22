/**
 * Advanced OAuth 2.0 Diagnostic Test
 * より詳細なOAuth 2.0認証テスト
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';

// 環境変数読み込み
dotenv.config();

async function advancedOAuth2Test() {
  console.log('🔬 Advanced OAuth 2.0 Diagnostic Test');
  console.log('=====================================');
  console.log('');

  try {
    // 1. 環境変数とトークン詳細
    const clientId = process.env.X_OAUTH2_CLIENT_ID;
    const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
    const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
    const refreshToken = process.env.X_OAUTH2_REFRESH_TOKEN;
    const expiresAt = process.env.X_OAUTH2_EXPIRES_AT;
    
    console.log('📋 Configuration Check:');
    console.log(`   Client ID: ${clientId ? clientId.substring(0, 15) + '...' : '❌ Not set'}`);
    console.log(`   Client Secret: ${clientSecret ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : '❌ Not set'}`);
    console.log(`   Refresh Token: ${refreshToken ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Expires At: ${expiresAt ? new Date(parseInt(expiresAt)) : '❌ Not set'}`);
    console.log('');

    if (!accessToken) {
      console.error('❌ Access token not found. Exiting.');
      return;
    }

    // 2. トークンのBase64デコード分析
    console.log('🔍 Token Analysis:');
    try {
      // OAuth 2.0トークンはBase64エンコードされることが多い
      const tokenInfo = Buffer.from(accessToken, 'base64').toString('utf8');
      console.log(`   Token decoded info: ${tokenInfo.substring(0, 50)}...`);
    } catch (error) {
      console.log('   Token format: Standard format (not base64)');
    }
    console.log('');

    // 3. 複数のAPIエンドポイントテスト
    const testEndpoints = [
      {
        name: 'Account Verification',
        url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
        method: 'GET'
      },
      {
        name: 'User Info (v2)',
        url: 'https://api.twitter.com/2/users/me',
        method: 'GET'
      },
      {
        name: 'User Info with fields (v2)',
        url: 'https://api.twitter.com/2/users/me?user.fields=public_metrics,verified',
        method: 'GET'
      }
    ];

    for (const endpoint of testEndpoints) {
      console.log(`🧪 Testing: ${endpoint.name}`);
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success`);
          
          // ユーザー情報の表示
          if ((data as any).data) {
            console.log(`   User: @${(data as any).data.username || 'unknown'}`);
          } else if ((data as any).screen_name) {
            console.log(`   User: @${(data as any).screen_name}`);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`   ❌ Failed`);
          console.log(`   Error: ${JSON.stringify(errorData, null, 4)}`);
          
          // 特定のエラー分析
          if (response.status === 403) {
            console.log(`   🔍 403 Analysis:`);
            console.log(`   - OAuth 2.0 permissions issue`);
            console.log(`   - App may not be properly configured`);
            console.log(`   - Token may be for wrong environment`);
          } else if (response.status === 401) {
            console.log(`   🔍 401 Analysis:`);
            console.log(`   - Token may be expired or invalid`);
            console.log(`   - Wrong authentication method`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Exception: ${error instanceof Error ? error.message : error}`);
      }
      console.log('');
    }

    // 4. OAuth 2.0 Token Introspection（可能であれば）
    console.log('🔎 OAuth 2.0 Token Introspection:');
    try {
      // X APIはトークンイントロスペクションをサポートしていないかもしれませんが試してみます
      const introspectResponse = await fetch('https://api.twitter.com/2/oauth2/introspect', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `token=${accessToken}`
      });
      
      if (introspectResponse.ok) {
        const introspectData = await introspectResponse.json();
        console.log(`   ✅ Token Introspection Success:`);
        console.log(`   ${JSON.stringify(introspectData, null, 4)}`);
      } else {
        console.log(`   ❌ Token Introspection not supported or failed: ${introspectResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Token Introspection error: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // 5. 推奨事項
    console.log('🔧 Recommendations:');
    console.log('   1. Check X Developer Portal app status');
    console.log('   2. Verify OAuth 2.0 settings are saved');
    console.log('   3. Check if account has posting restrictions');
    console.log('   4. Try regenerating Client Secret and tokens');
    console.log('   5. Check X API status page: https://api.twitterstat.us/');
    
  } catch (error) {
    console.error('❌ Advanced test failed:', error instanceof Error ? error.message : error);
  }
}

// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  advancedOAuth2Test().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { advancedOAuth2Test };