/**
 * ContentCreator 動作確認テスト
 * TASK-001 実装完了後の動作確認用
 */

import { ContentCreator } from '../../../src/services/content-creator';
import { CollectionResult } from '../../../src/types/collection-common';

// テスト用のモックデータ作成
const createMockCollectionResult = (): CollectionResult => ({
  id: 'test-001',
  content: '今日の株式市場では、リスク管理の重要性が再び注目されています。投資家にとって基本的な原則を守ることが成功への鍵となります。',
  source: 'test-source',
  timestamp: Date.now(),
  metadata: {
    category: 'market',
    tags: ['リスク管理', '投資基礎']
  },
  status: 'success'
});

const createMockAccountStatus = () => ({
  followers_count: 150,
  health_score: 75,
  performance_trend: 'stable',
  recommendations: ['定期投稿を継続', '教育コンテンツ強化']
});

const createMockStrategy = () => ({
  content_themes: {
    primary: ['リスク管理', '市場分析', '投資心理'],
    educational_patterns: ['基本原則解説', '実践的アドバイス'],
    engagement_patterns: ['質問投げかけ', '経験共有']
  },
  posting_strategy: {
    frequency: 15,
    optimal_times: ['07:00', '12:00', '19:00'],
    tone_of_voice: '教育的で親しみやすい',
    avoid_topics: ['投資勧誘', '誇大表現']
  },
  content_templates: [
    {
      type: 'beginner-guide',
      format: '📚 初心者ガイド\n\n{content}\n\n#投資初心者 #学習',
      priority: 'high'
    }
  ],
  target_audience: {
    demographics: ['20-40代', '投資初心者'],
    interests: ['投資', '資産運用'],
    pain_points: ['リスク管理', '継続学習']
  },
  engagement_tactics: {
    primary: ['実践的Tips', '市場解説'],
    content_focus: ['教育重視', '初心者サポート']
  }
});

// 動作確認実行
async function testContentCreator(): Promise<void> {
  console.log('=== ContentCreator 動作確認テスト開始 ===\n');
  
  try {
    const contentCreator = new ContentCreator();
    
    // 1. 基本的なコンテンツ生成テスト
    console.log('1. 基本コンテンツ生成テスト...');
    const mockData = [createMockCollectionResult()];
    const mockAccount = createMockAccountStatus();
    const mockStrategy = createMockStrategy();
    
    const generatedContent = await contentCreator.generateContent(
      mockData,
      mockAccount,
      mockStrategy
    );
    
    console.log('✅ 生成されたコンテンツ:');
    console.log(`   コンテンツ: ${generatedContent.content}`);
    console.log(`   ハッシュタグ: ${generatedContent.hashtags.join(', ')}`);
    console.log(`   教育的価値: ${generatedContent.educationalValue}`);
    console.log(`   対象層: ${generatedContent.targetAudience}`);
    console.log(`   トピック: ${generatedContent.topics.join(', ')}\n`);
    
    // 2. 教育的投稿作成テスト
    console.log('2. 教育的投稿作成テスト...');
    const rawData = { 
      marketTrends: ['市場の変動性'], 
      educationalTopics: ['リスク管理の基本'] 
    };
    
    const educationalPost = await contentCreator.createEducationalPost(rawData);
    
    console.log('✅ 教育的投稿:');
    console.log(`   テキスト: ${educationalPost.text}`);
    console.log(`   ハッシュタグ: ${educationalPost.hashtags.join(', ')}`);
    console.log(`   文字数: ${educationalPost.length}`);
    console.log(`   読みやすさ: ${educationalPost.readabilityScore}\n`);
    
    // 3. 教育的価値追加テスト
    console.log('3. 教育的価値追加テスト...');
    const basicContent = 'リスクとは投資において避けられない要素です。';
    const enhancedContent = await contentCreator.addEducationalValue(basicContent);
    
    console.log('✅ 教育的価値追加:');
    console.log(`   元コンテンツ: ${basicContent}`);
    console.log(`   強化後: ${enhancedContent}\n`);
    
    // 4. プラットフォーム最適化テスト
    console.log('4. プラットフォーム最適化テスト...');
    const longContent = {
      text: '投資において最も重要なのはリスク管理です。これは損失を最小限に抑え、長期的な成功を目指すための基本的な戦略です。市場は予測不可能な要素が多く、十分な準備と知識が必要になります。初心者の方は特に基礎をしっかりと学んでから実践に移ることをお勧めします。',
      hashtags: ['#投資', '#リスク管理', '#初心者', '#教育'],
      length: 150,
      readabilityScore: 80
    };
    
    const optimizedContent = await contentCreator.optimizeForPlatform(longContent);
    
    console.log('✅ プラットフォーム最適化:');
    console.log(`   最適化前文字数: ${longContent.length}`);
    console.log(`   最適化後文字数: ${optimizedContent.length}`);
    console.log(`   最適化後テキスト: ${optimizedContent.text}`);
    console.log(`   最適化後ハッシュタグ: ${optimizedContent.hashtags.join(', ')}\n`);
    
    console.log('=== 全てのテスト完了 ===\n');
    console.log('✅ ContentCreator は正常に動作しています！');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    throw error;
  }
}

// テスト実行
testContentCreator().catch(console.error);

export { testContentCreator };