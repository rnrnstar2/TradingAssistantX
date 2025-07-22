import 'dotenv/config';
import { SimpleXClient } from './x-client';
import { existsSync } from 'fs';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import { loadYamlArraySafe } from '../utils/yaml-utils';
export class ClaudeXAgent {
    xClient;
    claudeAvailable;
    testMode;
    constructor() {
        this.xClient = new SimpleXClient();
        this.testMode = process.env.X_TEST_MODE === 'true';
        // Claude Code CLI が利用可能かチェック
        this.claudeAvailable = process.env.CLAUDE_API_KEY !== undefined || process.env.ANTHROPIC_API_KEY !== undefined;
    }
    async generateAndPost() {
        try {
            if (!existsSync('data/scraped.yaml')) {
                console.log('No scraped data found');
                return;
            }
            const data = loadYamlArraySafe('data/scraped.yaml');
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
                }
                else {
                    console.log(`Successfully posted content: ${result.success ? 'Success' : 'Failed'}`);
                    if (result.error) {
                        console.error(`Post error: ${result.error}`);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error in generateAndPost:', error);
        }
    }
    async generateContent(data) {
        if (data.length === 0) {
            return '最新情報: データなし';
        }
        const latestData = data.sort((a, b) => b.timestamp - a.timestamp)[0];
        // Claude Code SDK が利用可能な場合
        if (this.claudeAvailable) {
            try {
                if (this.testMode) {
                    console.log('\n🤖 Claude Code SDKを使用してコンテンツ生成中...');
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
                const response = await claude()
                    .withModel('haiku')
                    .withTimeout(30000)
                    .query(prompt)
                    .asText();
                if (this.testMode) {
                    console.log('✅ Claude Code SDKレスポンス受信');
                }
                return response.length > 280 ? response.slice(0, 277) + '...' : response;
            }
            catch (error) {
                console.error('Error generating content with Claude Code SDK:', error);
                return this.getFallbackContent(latestData);
            }
        }
        else {
            // Claude が利用できない場合のフォールバック
            if (this.testMode) {
                console.log('\n⚠️ Claude が設定されていません。フォールバックモードで動作します。');
            }
            return this.getFallbackContent(latestData);
        }
    }
    getFallbackContent(data) {
        const content = `最新情報: ${data.content}`;
        return content.length > 280 ? content.slice(0, 277) + '...' : content;
    }
    // テスト用の公開メソッド
    async testGenerateContent(prompt) {
        const mockData = {
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
    agent.generateAndPost().catch((error) => {
        console.error('❌ [Claude エージェント] 実行エラー:', error);
        process.exit(1);
    });
}
