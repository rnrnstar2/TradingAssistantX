import 'dotenv/config';
import { SimpleXClient } from './x-client';
import { ScrapedData } from '../types/index';
import { existsSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { loadYamlArraySafe } from '../utils/yaml-utils';

export class ClaudeXAgent {
  private xClient: SimpleXClient;
  private anthropic?: Anthropic;
  private testMode: boolean;
  
  constructor() {
    this.xClient = new SimpleXClient(process.env.X_API_KEY || '');
    this.testMode = process.env.X_TEST_MODE === 'true';
    
    // Claude APIキーがある場合のみ初期化
    if (process.env.CLAUDE_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
      });
    }
  }
  
  async generateAndPost(): Promise<void> {
    try {
      if (!existsSync('data/scraped.yaml')) {
        console.log('No scraped data found');
        return;
      }
      
      const data: ScrapedData[] = loadYamlArraySafe<ScrapedData>('data/scraped.yaml');
      
      if (data.length === 0) {
        console.log('No data to process');
        return;
      }
      
      // テストモードでデータを表示
      if (this.testMode) {
        console.log('\n📊 処理データ:');
        console.log(`- データ数: ${data.length}件`);
        console.log(`- 最新データ: ${new Date(data[0].timestamp).toLocaleString('ja-JP')}`);
      }
      
      const content = await this.generateContent(data);
      
      if (content) {
        const result = await this.xClient.post(content);
        if (this.testMode) {
          console.log('\n✅ テスト完了！');
          console.log(`投稿結果: ${result.success ? '成功' : '失敗'}`);
          if (result.error) {
            console.log(`エラー: ${result.error}`);
          }
        } else {
          console.log(`Successfully posted content: ${result.success ? 'Success' : 'Failed'}`);
          if (result.error) {
            console.error(`Post error: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in generateAndPost:', error);
    }
  }
  
  private async generateContent(data: ScrapedData[]): Promise<string> {
    if (data.length === 0) {
      return '最新情報: データなし';
    }
    
    const latestData = data.sort((a, b) => b.timestamp - a.timestamp)[0];
    
    // Claude APIが利用可能な場合
    if (this.anthropic) {
      try {
        if (this.testMode) {
          console.log('\n🤖 Claude APIを使用してコンテンツ生成中...');
        }
      const prompt = `
最新の収集データ: ${latestData.content}
ソース: ${latestData.source}
URL: ${latestData.url}

上記の情報を基に、Xに投稿する簡潔で洞察的なコンテンツを生成してください。
- 280文字以内厳守
- 読者に価値を提供
- 適切なハッシュタグを含む
- 日本語で記述`;

      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const generatedContent = message.content[0].type === 'text' ? message.content[0].text : '';
        
        if (this.testMode) {
          console.log('✅ Claude APIレスポンス受信');
        }
        
        return generatedContent.length > 280 ? generatedContent.slice(0, 277) + '...' : generatedContent;
      } catch (error) {
        console.error('Error generating content with Claude:', error);
        return this.getFallbackContent(latestData);
      }
    } else {
      // Claude APIが利用できない場合のフォールバック
      if (this.testMode) {
        console.log('\n⚠️ Claude APIキーが設定されていません。フォールバックモードで動作します。');
      }
      return this.getFallbackContent(latestData);
    }
  }
  
  private getFallbackContent(data: ScrapedData): string {
    const content = `最新情報: ${data.content}`;
    return content.length > 280 ? content.slice(0, 277) + '...' : content;
  }
  
  // テスト用の公開メソッド
  async testGenerateContent(prompt: string): Promise<string> {
    const mockData: ScrapedData = {
      content: prompt,
      url: 'https://test.example.com',
      timestamp: Date.now(),
      source: 'test-source'
    };
    
    return this.generateContent([mockData]);
  }
}

if (require.main === module) {
  const agent = new ClaudeXAgent();
  agent.generateAndPost();
}