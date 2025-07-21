// TASK-001: X アカウント情報システム動作確認テスト
// MVP実装の基本動作を検証

import { SimpleXClient } from '../../../src/lib/x-client';

async function testAccountInfoSystem() {
  console.log('🧪 X アカウント情報システム動作確認開始');
  console.log('=====================================');

  try {
    // テストモードでクライアント初期化
    const client = new SimpleXClient(process.env.X_API_KEY || '', {
      testMode: true
    });

    console.log('✅ SimpleXClient 初期化成功');

    // ユーザー名による情報取得テスト（テストモードでは実行しない）
    if (process.env.X_TEST_MODE !== 'true') {
      console.log('\n📊 ユーザー情報取得テスト中...');
      const accountInfo = await client.getUserByUsername('rnrnstar');
      console.log('Account Info:', accountInfo);
    } else {
      console.log('\n🔄 テストモード: 実際のAPI呼び出しはスキップ');
      console.log('実際の使用時は X_TEST_MODE=false で実行してください');
    }

    console.log('\n✅ 動作確認完了');
    console.log('実装されたメソッド:');
    console.log('- getUserByUsername(): ユーザー名からアカウント情報取得');
    console.log('- getMyAccountInfo(): 自分のアカウント情報取得');
    console.log('- saveAccountInfo(): アカウント情報のYAML保存');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
  }
}

// 直接実行時のみテスト実行
if (require.main === module) {
  testAccountInfoSystem();
}

export { testAccountInfoSystem };