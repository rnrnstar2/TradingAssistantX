/**
 * Claude SDK モック動作確認スクリプト
 */

import dotenv from 'dotenv';
dotenv.config();

import { generateContent } from '../src/claude/endpoints/content-endpoint';
import { analyzePerformance } from '../src/claude/endpoints/analysis-endpoint';
import { generateSearchQuery } from '../src/claude/endpoints/search-endpoint';

async function testClaudeSDK() {
  console.log('🧪 Claude SDK モック動作確認テスト開始...\n');
  
  // 環境変数確認
  console.log('📋 環境変数確認:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`CLAUDE_SDK_DEV_MODE: ${process.env.CLAUDE_SDK_DEV_MODE}`);
  console.log(`USE_CLAUDE_MOCK: ${process.env.USE_CLAUDE_MOCK}\n`);
  
  try {
    // 1. コンテンツ生成テスト
    console.log('1️⃣ コンテンツ生成エンドポイントテスト');
    const contentResult = await generateContent({
      request: {
        topic: '投資教育',
        contentType: 'educational',
        targetAudience: 'beginner',
        maxLength: 280
      },
      context: {},
      qualityThreshold: 70
    });
    console.log('✅ コンテンツ生成成功:');
    console.log(`  - コンテンツ: ${contentResult.content.substring(0, 50)}...`);
    console.log(`  - 品質スコア: ${contentResult.qualityScore}`);
    console.log(`  - ハッシュタグ: ${contentResult.hashtags.join(' ')}\n`);
    
    // 2. 分析エンドポイントテスト
    console.log('2️⃣ 分析エンドポイントテスト');
    const analysisResult = await analyzePerformance({
      analysisType: 'market',
      data: { sample: 'test' },
      timeframe: '24h',
      context: {
        sentiment: 'neutral',
        volatility: 'medium',
        trendingTopics: ['投資', 'NISA'],
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ 市場分析成功:');
    console.log(`  - インサイト数: ${analysisResult.insights.length}`);
    console.log(`  - 推奨事項数: ${analysisResult.recommendations.length}`);
    console.log(`  - 信頼度: ${analysisResult.confidence}\n`);
    
    // 3. 検索クエリ生成テスト
    console.log('3️⃣ 検索クエリ生成エンドポイントテスト');
    const searchResult = await generateSearchQuery({
      purpose: 'retweet',
      topic: '投資教育',
      constraints: {
        maxResults: 20,
        minEngagement: 10,
        timeframe: '24h'
      }
    });
    console.log('✅ 検索クエリ生成成功:');
    console.log(`  - クエリ: ${searchResult.query}`);
    console.log(`  - 優先度: ${searchResult.priority}`);
    console.log(`  - 期待結果数: ${searchResult.expectedResults}\n`);
    
    console.log('🎉 すべてのテストが成功しました！');
    console.log('Claude CLIが認証されていない場合でも、モックを使用して正常に動作しています。');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
testClaudeSDK();