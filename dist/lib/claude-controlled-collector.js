import { chromium } from 'playwright';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';
export class ClaudeControlledCollector {
    browserContexts = [];
    async performParallelCollection() {
        console.log('🔍 [Claude制御収集] 並列ブラウザ操作を開始...');
        try {
            this.browserContexts = await this.createMultipleContexts(3);
            const collectionTasks = [
                this.collectFromTrends(this.browserContexts[0]),
                this.collectFromSearch(this.browserContexts[1], ['投資', 'トレード']),
                this.collectFromHashtags(this.browserContexts[2], ['#FX', '#株式投資'])
            ];
            const results = await Promise.all(collectionTasks);
            await this.closeBrowserContexts(this.browserContexts);
            const mergedResults = this.mergeCollectionResults(results);
            console.log(`✅ [Claude制御収集完了] ${mergedResults.length}件の情報を収集`);
            return mergedResults;
        }
        catch (error) {
            console.error('❌ [Claude制御収集エラー]:', error);
            await this.closeBrowserContexts(this.browserContexts);
            return [];
        }
    }
    async createMultipleContexts(count) {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        const contexts = [];
        for (let i = 0; i < count; i++) {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 }
            });
            contexts.push(context);
        }
        console.log(`🌐 [ブラウザ準備] ${count}個のブラウザコンテキストを作成`);
        return contexts;
    }
    async collectFromTrends(context) {
        console.log('📈 [トレンド収集] X.comトレンドページを分析中...');
        try {
            const page = await context.newPage();
            // X.comにアクセス（ログインなしでも見れる範囲）
            await page.goto('https://x.com/explore', {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            // Claude指示による自律的な操作
            const claudeInstructions = await this.getClaudeInstructions('trend_analysis');
            const results = await this.executeClaudeInstructions(page, claudeInstructions);
            await page.close();
            return results;
        }
        catch (error) {
            console.error('❌ [トレンド収集エラー]:', error);
            return [];
        }
    }
    async collectFromSearch(context, searchTerms) {
        console.log(`🔍 [検索収集] キーワード検索: ${searchTerms.join(', ')}`);
        try {
            const page = await context.newPage();
            const allResults = [];
            for (const term of searchTerms) {
                const searchUrl = `https://x.com/search?q=${encodeURIComponent(term)}&src=typed_query&f=live`;
                await page.goto(searchUrl, {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });
                const claudeInstructions = await this.getClaudeInstructions('search_analysis', { term });
                const results = await this.executeClaudeInstructions(page, claudeInstructions);
                allResults.push(...results);
                // リクエスト間隔を設ける
                await page.waitForTimeout(2000);
            }
            await page.close();
            return allResults;
        }
        catch (error) {
            console.error('❌ [検索収集エラー]:', error);
            return [];
        }
    }
    async collectFromHashtags(context, hashtags) {
        console.log(`#️⃣ [ハッシュタグ収集] ハッシュタグ分析: ${hashtags.join(', ')}`);
        try {
            const page = await context.newPage();
            const allResults = [];
            for (const hashtag of hashtags) {
                const hashtagUrl = `https://x.com/hashtag/${hashtag.replace('#', '')}`;
                await page.goto(hashtagUrl, {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });
                const claudeInstructions = await this.getClaudeInstructions('hashtag_analysis', { hashtag });
                const results = await this.executeClaudeInstructions(page, claudeInstructions);
                allResults.push(...results);
                // リクエスト間隔を設ける
                await page.waitForTimeout(2000);
            }
            await page.close();
            return allResults;
        }
        catch (error) {
            console.error('❌ [ハッシュタグ収集エラー]:', error);
            return [];
        }
    }
    async getClaudeInstructions(analysisType, params) {
        const prompt = this.buildInstructionPrompt(analysisType, params);
        try {
            const instructions = await claude()
                .withModel('sonnet')
                .query(prompt)
                .asText();
            return instructions;
        }
        catch (error) {
            console.error('❌ [Claude指示取得エラー]:', error);
            return this.getFallbackInstructions(analysisType);
        }
    }
    buildInstructionPrompt(analysisType, params) {
        const basePrompt = `
You are an expert at analyzing financial/investment content on X (Twitter).
Analysis type: ${analysisType}
${params ? `Parameters: ${JSON.stringify(params)}` : ''}

Provide specific instructions for extracting valuable investment-related content.
Focus on:
1. Market trends and insights
2. Educational content
3. Real-time market reactions
4. Investment strategies and tips

Return concise, actionable instructions for content extraction.
`;
        switch (analysisType) {
            case 'trend_analysis':
                return basePrompt + `
Specifically look for:
- Trending financial topics
- Market sentiment indicators
- Popular investment discussions
- Economic news reactions
`;
            case 'search_analysis':
                return basePrompt + `
For search term "${params?.term}", identify:
- High-engagement posts about this topic
- Educational content and explanations
- Market analysis and predictions
- Real user experiences and insights
`;
            case 'hashtag_analysis':
                return basePrompt + `
For hashtag "${params?.hashtag}", analyze:
- Most engaging posts using this hashtag
- Recurring themes and patterns
- Educational vs promotional content
- Community discussions and debates
`;
            default:
                return basePrompt;
        }
    }
    async executeClaudeInstructions(page, instructions) {
        console.log('🧠 [Claude実行] ページ分析を実行中...');
        try {
            // ページ内容を取得
            const pageContent = await this.extractPageContent(page);
            // Claude に分析を依頼
            const analysisPrompt = `
Instructions: ${instructions}

Page content to analyze:
${pageContent}

Extract relevant investment/financial content and return as JSON array:
[{
  "id": "unique-id",
  "type": "trend|news|discussion",
  "content": "extracted content",
  "source": "x.com",
  "relevanceScore": 0.0-1.0,
  "timestamp": timestamp,
  "metadata": {
    "engagement": number,
    "author": "username",
    "hashtags": ["#tag1"]
  }
}]

Return ONLY the JSON array, no markdown or explanation.
`;
            const response = await claude()
                .withModel('sonnet')
                .query(analysisPrompt)
                .asText();
            // JSON解析
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);
                console.log(`🧠 [Claude分析完了] ${results.length}件のコンテンツを抽出`);
                return results;
            }
            return [];
        }
        catch (error) {
            console.error('❌ [Claude実行エラー]:', error);
            return [];
        }
    }
    async extractPageContent(page) {
        try {
            // X/Twitterの投稿要素を取得
            const tweets = await page.$$eval('[data-testid="tweet"]', (elements) => {
                return elements.slice(0, 10).map(el => ({
                    text: el.textContent?.trim() || '',
                    time: el.querySelector('time')?.getAttribute('datetime') || '',
                }));
            });
            return JSON.stringify(tweets, null, 2);
        }
        catch (error) {
            // フォールバック: ページの基本的なテキスト内容を取得
            try {
                const content = await page.textContent('body');
                return content?.substring(0, 5000) || '';
            }
            catch {
                return '';
            }
        }
    }
    getFallbackInstructions(analysisType) {
        const fallbackInstructions = {
            trend_analysis: 'Extract trending financial topics and market discussions',
            search_analysis: 'Find relevant investment content and educational posts',
            hashtag_analysis: 'Analyze hashtag usage patterns and engaging content'
        };
        return fallbackInstructions[analysisType] ||
            'Extract relevant financial/investment content';
    }
    mergeCollectionResults(resultArrays) {
        const allResults = resultArrays.flat();
        // 重複除去とスコアによるソート
        const uniqueResults = this.removeDuplicateResults(allResults);
        const sortedResults = uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        // 上位50件に制限
        return sortedResults.slice(0, 50);
    }
    removeDuplicateResults(results) {
        const seen = new Set();
        const unique = [];
        for (const result of results) {
            const contentHash = this.generateContentHash(result.content);
            if (!seen.has(contentHash)) {
                seen.add(contentHash);
                unique.push(result);
            }
        }
        return unique;
    }
    generateContentHash(content) {
        // 簡単なハッシュ関数（コンテンツの類似性判定用）
        return content
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .substring(0, 100);
    }
    async closeBrowserContexts(contexts) {
        console.log('🔒 [ブラウザクリーンアップ] ブラウザコンテキストを閉じています...');
        try {
            await Promise.all(contexts.map(context => context.close()));
            console.log('✅ [ブラウザクリーンアップ完了]');
        }
        catch (error) {
            console.error('❌ [ブラウザクリーンアップエラー]:', error);
        }
    }
}
