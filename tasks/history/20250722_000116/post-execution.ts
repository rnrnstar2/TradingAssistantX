import { SimpleXClient } from '../../src/lib/x-client';
import { writeFileSync } from 'fs';
import * as yaml from 'js-yaml';

async function executeFirstPost() {
  console.log('🚀 第1回X投稿実行開始...');
  
  // 投稿内容
  const postContent = `🚀 Claude Code SDK完全自律システム始動！

従来: 人間判断依存
→革新: Claude完全自律

✅動的最適化  
✅継続学習
✅高品質コンテンツ自動生成

フォロワー5→∞への挑戦🎯

#投資教育 #ClaudeAI #自動化システム`;

  console.log('📝 投稿内容:');
  console.log('================================');
  console.log(postContent);
  console.log('================================');
  console.log(`文字数: ${postContent.length}/280`);
  
  try {
    // X Client初期化（テストモード）
    process.env.X_TEST_MODE = 'true';
    const xClient = new SimpleXClient('test-api-key');
    
    console.log('📤 投稿実行中...');
    const result = await xClient.post(postContent);
    
    // 結果記録
    const executionResult = {
      postContent,
      characterCount: postContent.length,
      result,
      timestamp: new Date().toISOString(),
      executedBy: 'autonomous-system'
    };
    
    // 結果保存
    writeFileSync(
      'tasks/20250722_000116/outputs/execution-result.yaml',
      yaml.dump(executionResult, { indent: 2 })
    );
    
    // 投稿ログ保存
    const postLog = {
      id: result.id || Date.now().toString(),
      content: postContent,
      timestamp: result.timestamp || Date.now(),
      success: result.success,
      error: result.error || null,
      url: result.success ? `https://x.com/rnrnstar/status/${result.id}` : null,
      engagement: {
        likes: 0,
        retweets: 0,
        replies: 0
      }
    };
    
    writeFileSync(
      'tasks/20250722_000116/outputs/post-log.json',
      JSON.stringify(postLog, null, 2)
    );
    
    console.log('✅ 第1回X投稿実行完了!');
    console.log('📊 結果:', result.success ? '成功' : '失敗');
    if (result.error) {
      console.error('❌ エラー:', result.error);
    }
    
    return executionResult;
  } catch (error) {
    console.error('❌ 投稿実行中にエラーが発生:', error);
    throw error;
  }
}

// 直接実行
executeFirstPost().catch(console.error);

export { executeFirstPost };