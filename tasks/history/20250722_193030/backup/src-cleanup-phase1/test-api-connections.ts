#!/usr/bin/env tsx
import dotenv from 'dotenv';
import axios from 'axios';

// .env.local の読み込み
dotenv.config({ path: '.env.local' });

interface TestResult {
  service: string;
  success: boolean;
  message: string;
  data?: any;
}

async function testAlphaVantage(): Promise<TestResult> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return { service: 'Alpha Vantage', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`,
      { timeout: 10000 }
    );
    
    if (response.data['Global Quote']) {
      return { 
        service: 'Alpha Vantage', 
        success: true, 
        message: '接続成功', 
        data: response.data['Global Quote']['05. price']
      };
    } else {
      return { service: 'Alpha Vantage', success: false, message: 'データ形式が不正です' };
    }
  } catch (error: any) {
    return { 
      service: 'Alpha Vantage', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function testCoinGecko(): Promise<TestResult> {
  const apiKey = process.env.COINGECKO_API_KEY;
  
  if (!apiKey) {
    return { service: 'CoinGecko', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { 
        headers: { 'x-cg-demo-api-key': apiKey },
        timeout: 10000 
      }
    );
    
    if (response.data.bitcoin?.usd) {
      return { 
        service: 'CoinGecko', 
        success: true, 
        message: '接続成功',
        data: `Bitcoin: $${response.data.bitcoin.usd}`
      };
    } else {
      return { service: 'CoinGecko', success: false, message: 'データ形式が不正です' };
    }
  } catch (error: any) {
    return { 
      service: 'CoinGecko', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function testFRED(): Promise<TestResult> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    return { service: 'FRED', success: false, message: 'APIキーが設定されていません' };
  }
  
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`,
      { timeout: 15000 }
    );
    
    if (response.data.observations?.length > 0) {
      return { 
        service: 'FRED', 
        success: true, 
        message: '接続成功',
        data: `GDP: ${response.data.observations[0].value}`
      };
    } else {
      return { service: 'FRED', success: false, message: 'データが取得できません' };
    }
  } catch (error: any) {
    return { 
      service: 'FRED', 
      success: false, 
      message: `接続失敗: ${error.message}` 
    };
  }
}

async function runAllTests() {
  console.log('🧪 API接続テスト開始...\n');
  
  const tests = [
    testAlphaVantage(),
    testCoinGecko(),
    testFRED()
  ];
  
  const results = await Promise.all(tests);
  
  console.log('📊 テスト結果:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.service}: ${result.message}`);
    if (result.data) {
      console.log(`   📄 データ例: ${result.data}`);
    }
    if (result.success) successCount++;
  }
  
  console.log('=' .repeat(50));
  console.log(`📈 成功率: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount === results.length) {
    console.log('🎉 全てのAPI接続が成功しました！次のステップに進めます。');
  } else {
    console.log('⚠️  一部のAPI接続に問題があります。設定を確認してください。');
  }
}

// スクリプト実行
runAllTests().catch(console.error);