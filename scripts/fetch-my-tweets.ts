import { config } from 'dotenv';
import { KaitoTwitterAPIClient, KaitoAPIConfigManager } from '../src/kaito-api';
import { DataManager } from '../src/shared/data-manager';
import type { Tweet } from '../src/kaito-api/endpoints/read-only/types';

// .envファイル読み込み
config();

/**
 * 自分のTwitter投稿を全取得してpost.yamlに保存
 */
class TwitterPostsFetcher {
  private kaitoClient: KaitoTwitterAPIClient;
  private dataManager: DataManager;
  private username: string;

  constructor() {
    // 環境変数X_USERNAMEから取得
    this.username = process.env.X_USERNAME!;
    if (!this.username) {
      throw new Error('X_USERNAME環境変数が設定されていません');
    }
    
    // KaitoTwitterAPIClient初期化
    this.kaitoClient = new KaitoTwitterAPIClient();
    this.dataManager = new DataManager();
  }

  /**
   * 非同期初期化
   */
  async initialize(): Promise<void> {
    // 設定管理
    const configManager = new KaitoAPIConfigManager();
    const config = await configManager.generateConfig('dev');
    this.kaitoClient.initializeWithConfig(config);
  }

  /**
   * 全投稿取得（ページネーション対応）
   */
  async fetchAllTweets(): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      console.log(`取得中... 現在: ${allTweets.length}件`);
      
      const response = await this.kaitoClient.getUserLastTweets({
        userName: this.username,
        limit: 200,
        includeReplies: false,
        cursor
      });

      if (response.success && response.tweets) {
        allTweets.push(...response.tweets);
        cursor = response.cursor;
        hasMore = response.has_more || false;
        
        console.log(`取得済み: ${allTweets.length}件`);
        await this.sleep(1000);
      } else {
        console.error('取得エラー:', response.error);
        break;
      }
    }

    return allTweets;
  }

  /**
   * 各ツイートを個別ディレクトリのpost.yamlとして保存
   */
  async saveToIndividualDirectories(tweets: Tweet[]): Promise<void> {
    console.log(`\n💾 個別ディレクトリ保存開始`);
    console.log(`📊 保存対象: ${tweets.length}件`);
    
    const savedDirectories: string[] = [];
    
    // 各ツイートを個別ディレクトリに保存
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      
      // 各ツイートごとに時刻をずらしてディレクトリ名生成
      // ベースタイムスタンプから分単位でインクリメント
      const baseDate = new Date();
      baseDate.setMinutes(baseDate.getMinutes() + i);
      
      const timestamp = baseDate.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
      const executionDir = timestamp; // execution-プレフィックスなし
      
      // ユーザー提供例に合わせたYAML構造
      const postData = {
        executionId: timestamp,
        actionType: 'post',
        timestamp: tweet.created_at,
        content: tweet.text,
        result: {
          id: tweet.id,
          url: `https://twitter.com/i/status/${tweet.id}`,
          timestamp: tweet.created_at,
          success: true
        },
        engagement: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          quotes: tweet.public_metrics.quote_count,
          impressions: tweet.public_metrics.impression_count || 0,
          bookmarks: tweet.public_metrics.bookmark_count || 0
        }
      };
      
      try {
        // DataManagerに個別ディレクトリを設定
        this.dataManager.setCurrentExecutionId(executionDir);
        
        // post.yamlとして保存
        await this.dataManager.saveExecutionData('post.yaml', postData);
        
        savedDirectories.push(executionDir);
        
        if ((i + 1) % 10 === 0 || i === tweets.length - 1) {
          console.log(`💾 保存進捗: ${i + 1}/${tweets.length}件`);
        }
      } catch (error) {
        console.error(`❌ ${executionDir}/post.yaml 保存エラー:`, error);
        // 個別エラーでも継続処理
      }
    }
    
    console.log(`✅ 保存完了: ${savedDirectories.length}ディレクトリ`);
    console.log(`📁 保存先例:`);
    console.log(`  - data/current/${savedDirectories[0]}/post.yaml`);
    if (savedDirectories.length > 1) {
      console.log(`  - data/current/${savedDirectories[1]}/post.yaml`);
    }
    if (savedDirectories.length > 2) {
      console.log(`  - ... (全${savedDirectories.length}ディレクトリ)`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 実行
async function main() {
  const fetcher = new TwitterPostsFetcher();
  
  try {
    console.log('🚀 Twitter投稿取得開始...');
    await fetcher.initialize();
    const tweets = await fetcher.fetchAllTweets();
    
    // メソッド名変更
    await fetcher.saveToIndividualDirectories(tweets);
    
    console.log('✅ 完了');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// ES module環境での実行判定
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}