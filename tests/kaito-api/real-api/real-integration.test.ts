import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';

// 環境変数でのみ実行されるテスト
const REAL_API_ENABLED = !!process.env.KAITO_API_TOKEN;

describe('Real TwitterAPI.io Integration Tests', () => {
  let client: KaitoTwitterAPIClient;

  beforeAll(() => {
    if (!REAL_API_ENABLED) {
      console.log('⚠️ Real API tests skipped - set KAITO_API_TOKEN');
      return;
    }

    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN!,
      qpsLimit: 200,
      costTracking: true
    });
  });

  it('should connect to real TwitterAPI.io health endpoint', async () => {
    if (!REAL_API_ENABLED) return;

    const isConnected = await client.testConnection();
    expect(isConnected).toBe(true);
  });

  it('should authenticate with real TwitterAPI.io', async () => {
    if (!REAL_API_ENABLED) return;

    const isAuthenticated = await client.testAuthentication();
    expect(isAuthenticated).toBe(true);
  });

  it('should perform comprehensive endpoint test', async () => {
    if (!REAL_API_ENABLED) return;

    const allTestsPassed = await client.testEndpoints();
    expect(allTestsPassed).toBe(true);
  });

  it('should get account info from real API', async () => {
    if (!REAL_API_ENABLED) return;

    const accountInfo = await client.getAccountInfo();
    
    expect(accountInfo).toBeDefined();
    expect(accountInfo.id).toBeDefined();
    expect(accountInfo.username).toBeDefined();
    expect(typeof accountInfo.followersCount).toBe('number');
    expect(accountInfo.timestamp).toBeDefined();
  });

  // 注意：実際の投稿は手動実行のみ
  it.skip('should create real tweet (manual execution only)', async () => {
    if (!REAL_API_ENABLED) return;

    const result = await client.post('API integration test tweet #testing');
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    console.log('✅ Real tweet created:', result.id);
    // 注意: 実際の運用では作成したツイートの削除も考慮
  });
});