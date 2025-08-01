// Simple test script to verify the auth_session parameter fix
import { KaitoTwitterAPIClient } from '../../src/kaito-api/index';
import { KaitoAPIConfigManager } from '../../src/kaito-api/core/config';

async function testLogin() {
  try {
    console.log('🧪 Testing auth_session parameter fix...');
    
    // Initialize managers
    const configManager = new KaitoAPIConfigManager();
    const devConfig = await configManager.generateConfig('dev');
    
    // Initialize client
    const client = new KaitoTwitterAPIClient();
    client.initializeWithConfig(devConfig);
    
    // Authenticate
    await client.authenticate();
    console.log('✅ Authentication successful');
    
    // Try to post a simple test message
    const testContent = "Test post to verify auth_session parameter fix 🧪";
    const result = await client.post(testContent);
    
    if (result.success) {
      console.log('✅ POST SUCCESS:', result);
      console.log('🎉 auth_session parameter fix verified!');
    } else {
      console.log('❌ POST FAILED:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testLogin();