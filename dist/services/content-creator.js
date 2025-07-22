import { loadYamlSafe } from '../utils/yaml-utils';
import { handleError } from '../utils/error-handler';
import { join } from 'path';
/**
 * 投稿コンテンツ生成を担当するContentCreatorクラス
 *
 * 自律的な投資教育コンテンツ作成システムの中核を担う
 */
export class ContentCreator {
    dataPath = 'data';
    currentPath = 'data/current';
    constructor() {
        // コンストラクタでの初期化は最小限に留める
    }
    /**
     * メインのコンテンツ生成メソッド
     *
     * @param collectedData - 収集されたデータ
     * @param accountStatus - アカウント状態
     * @param strategy - コンテンツ戦略
     * @returns 生成されたコンテンツ
     */
    async generateContent(collectedData, accountStatus, strategy) {
        try {
            // 1. データの前処理と統合
            const processedData = await this.processCollectedData(collectedData);
            // 2. 教育的価値の高いコンテンツ作成
            const educationalPost = await this.createEducationalPost(processedData);
            // 3. 教育的価値の追加
            const enhancedContent = await this.addEducationalValue(educationalPost.text);
            // 4. プラットフォーム最適化
            const optimizedPost = await this.optimizeForPlatform({
                ...educationalPost,
                text: enhancedContent
            });
            // 5. 最終的なコンテンツ生成
            return await this.finalizeContent(optimizedPost, accountStatus, strategy);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            // エラー時はフォールバック コンテンツを返す
            return this.createFallbackContent();
        }
    }
    /**
     * 教育的投稿の作成
     *
     * @param rawData - 処理済みデータ
     * @returns 教育的投稿コンテンツ
     */
    async createEducationalPost(rawData) {
        try {
            // コンテンツ戦略を読み込み
            const strategy = await this.loadContentStrategy();
            if (!strategy) {
                throw new Error('Content strategy could not be loaded');
            }
            // 教育的価値の高いコンテンツテンプレートを選択
            const template = this.selectEducationalTemplate(strategy.content_templates, rawData);
            // テンプレートに基づいてコンテンツを生成
            const content = this.generateContentFromTemplate(template, rawData);
            // ハッシュタグの生成
            const hashtags = this.generateEducationalHashtags(strategy, rawData);
            // 読みやすさスコアの計算
            const readabilityScore = this.calculateReadabilityScore(content);
            return {
                text: content,
                hashtags,
                length: content.length,
                readabilityScore
            };
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            // フォールバック投稿を返す
            return {
                text: "投資の基本は「リスク管理」です。資金を守ることが何より大切ですね。",
                hashtags: ['#投資基礎', '#リスク管理'],
                length: 34,
                readabilityScore: 85
            };
        }
    }
    /**
     * 教育的価値の追加
     *
     * @param content - 基本コンテンツ
     * @returns 教育的価値が追加されたコンテンツ
     */
    async addEducationalValue(content) {
        try {
            // 教育的要素を追加
            const educationalElements = [
                this.addConceptExplanation(content),
                this.addPracticalExample(content),
                this.addLearningPoint(content),
                this.addActionableAdvice(content)
            ];
            // 最も適切な教育的要素を選択
            const bestElement = educationalElements
                .filter(element => element.length > 0)
                .reduce((best, current) => current.length < best.length ? current : best, content);
            return this.ensureCharacterLimit(bestElement);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return content; // エラー時は元のコンテンツを返す
        }
    }
    /**
     * プラットフォーム最適化
     *
     * @param content - 投稿コンテンツ
     * @returns 最適化された投稿コンテンツ
     */
    async optimizeForPlatform(content) {
        try {
            // X(Twitter)向けの最適化
            let optimizedText = content.text;
            // 文字数制限の確認と調整
            if (optimizedText.length > 280) {
                optimizedText = this.truncateWithEllipsis(optimizedText, 277);
            }
            // エンゲージメント向上のための最適化
            optimizedText = this.addEngagementElements(optimizedText);
            // ハッシュタグの最適化（最大3つまで）
            const optimizedHashtags = content.hashtags.slice(0, 3);
            return {
                ...content,
                text: optimizedText,
                hashtags: optimizedHashtags,
                length: optimizedText.length,
                readabilityScore: this.calculateReadabilityScore(optimizedText)
            };
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return content;
        }
    }
    /**
     * 収集データの処理
     */
    async processCollectedData(collectedData) {
        try {
            // データの有効性チェック
            const validData = collectedData.filter(data => data && data.content && data.source && data.timestamp);
            if (validData.length === 0) {
                throw new Error('No valid collected data available');
            }
            // データの統合と構造化
            return {
                marketTrends: this.extractMarketTrends(validData),
                educationalTopics: this.extractEducationalTopics(validData),
                userInterests: this.extractUserInterests(validData),
                recentNews: this.extractRecentNews(validData)
            };
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return {
                marketTrends: [],
                educationalTopics: ['リスク管理', '基礎知識'],
                userInterests: [],
                recentNews: []
            };
        }
    }
    /**
     * コンテンツ戦略の読み込み
     */
    async loadContentStrategy() {
        try {
            const strategyPath = join(process.cwd(), this.dataPath, 'content-strategy.yaml');
            return loadYamlSafe(strategyPath);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }
    /**
     * 教育的テンプレートの選択
     */
    selectEducationalTemplate(templates, data) {
        // 高優先度の教育的テンプレートを優先選択
        const educationalTemplates = templates.filter(t => t.priority === 'high' &&
            (t.type.includes('guide') || t.type.includes('tips') || t.type.includes('education')));
        if (educationalTemplates.length > 0) {
            // ランダムに選択（実際は戦略的選択が望ましい）
            return educationalTemplates[Math.floor(Math.random() * educationalTemplates.length)];
        }
        // フォールバック
        return templates.find(t => t.priority === 'high') || templates[0];
    }
    /**
     * テンプレートからコンテンツ生成
     */
    generateContentFromTemplate(template, data) {
        let content = template.format;
        // プレースホルダーの置換
        if (data.marketTrends && data.marketTrends.length > 0) {
            content = content.replace('{content}', `${data.marketTrends[0]}について考えてみましょう。`);
        }
        else if (data.educationalTopics && data.educationalTopics.length > 0) {
            content = content.replace('{content}', `${data.educationalTopics[0]}の重要なポイントをお伝えします。`);
        }
        else {
            content = content.replace('{content}', '今日の投資学習ポイントです。');
        }
        return content;
    }
    /**
     * 教育的ハッシュタグの生成
     */
    generateEducationalHashtags(strategy, data) {
        const baseHashtags = ['#投資教育', '#トレーディング', '#資産運用'];
        // 戦略からの主要ハッシュタグ
        const themeHashtags = strategy.content_themes.primary
            .slice(0, 2)
            .map(theme => `#${theme.replace(/\s+/g, '')}`);
        return [...baseHashtags, ...themeHashtags].slice(0, 3);
    }
    /**
     * 読みやすさスコアの計算
     */
    calculateReadabilityScore(text) {
        try {
            // 簡易的な読みやすさ計算
            const sentences = text.split(/[。！？]/g).filter(s => s.trim().length > 0);
            const avgSentenceLength = text.length / sentences.length;
            // 短い文章ほど読みやすい（100点満点）
            const score = Math.max(0, Math.min(100, 100 - (avgSentenceLength - 20) * 2));
            return Math.round(score);
        }
        catch {
            return 70; // デフォルトスコア
        }
    }
    /**
     * 最終コンテンツの完成
     */
    async finalizeContent(optimizedPost, accountStatus, strategy) {
        try {
            // アカウント状態に基づくターゲットオーディエンス決定
            const targetAudience = this.determineTargetAudience(accountStatus);
            // 教育的価値の定量化
            const educationalValue = this.quantifyEducationalValue(optimizedPost.text);
            // トピックの抽出
            const topics = this.extractTopics(optimizedPost.text, strategy);
            return {
                content: optimizedPost.text,
                hashtags: optimizedPost.hashtags,
                educationalValue,
                targetAudience,
                topics
            };
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error(String(error)));
            return this.createFallbackContent();
        }
    }
    /**
     * フォールバックコンテンツの作成
     */
    createFallbackContent() {
        return {
            content: "投資の基本原則：まずはリスク管理から始めましょう。小さく始めて、学びながら成長していくことが大切です。 #投資基礎 #リスク管理 #初心者向け",
            hashtags: ['#投資基礎', '#リスク管理', '#初心者向け'],
            educationalValue: 75,
            targetAudience: 'beginner',
            topics: ['リスク管理', '基礎知識', '初心者指導']
        };
    }
    // Private helper methods
    extractMarketTrends(data) {
        return data
            .filter(d => d.metadata?.category === 'market' || d.source?.includes('market'))
            .map(d => String(d.content))
            .slice(0, 5);
    }
    extractEducationalTopics(data) {
        return ['リスク管理', '基礎分析', '市場心理', '資金管理', 'テクニカル分析'];
    }
    extractUserInterests(data) {
        return data
            .filter(d => d.metadata?.tags && Array.isArray(d.metadata.tags))
            .flatMap(d => d.metadata.tags)
            .slice(0, 10);
    }
    extractRecentNews(data) {
        return data
            .filter(d => d.timestamp > Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
            .map(d => String(d.content))
            .slice(0, 3);
    }
    addConceptExplanation(content) {
        if (content.includes('リスク')) {
            return content + '\n※リスク管理とは、損失を最小限に抑える投資戦略のことです。';
        }
        return content;
    }
    addPracticalExample(content) {
        if (content.includes('分析')) {
            return content + '\n例：チャートの移動平均線を見て売買タイミングを判断する。';
        }
        return content;
    }
    addLearningPoint(content) {
        return content + '\n💡 学習ポイント：継続的な学習が投資成功の鍵です。';
    }
    addActionableAdvice(content) {
        return content + '\n📝 今日から実践：少額から始めて経験を積みましょう。';
    }
    ensureCharacterLimit(content) {
        if (content.length > 280) {
            return content.substring(0, 277) + '...';
        }
        return content;
    }
    truncateWithEllipsis(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
    }
    addEngagementElements(text) {
        // 適度な絵文字追加でエンゲージメント向上
        if (!text.includes('📊') && !text.includes('💡') && text.includes('投資')) {
            return '📊 ' + text;
        }
        return text;
    }
    determineTargetAudience(accountStatus) {
        if (accountStatus.followers_count < 100) {
            return 'beginner';
        }
        else if (accountStatus.followers_count < 1000) {
            return 'intermediate';
        }
        return 'advanced';
    }
    quantifyEducationalValue(content) {
        let score = 50; // ベーススコア
        // 教育的キーワードの検出
        const educationalKeywords = ['基本', '学習', '重要', '理解', '方法', 'コツ', '原則', 'ポイント'];
        const foundKeywords = educationalKeywords.filter(keyword => content.includes(keyword));
        score += foundKeywords.length * 10;
        // 質問や呼びかけがある場合
        if (content.includes('？') || content.includes('ませんか') || content.includes('でしょう')) {
            score += 10;
        }
        // 具体例がある場合  
        if (content.includes('例：') || content.includes('たとえば')) {
            score += 15;
        }
        return Math.min(100, Math.max(0, score));
    }
    extractTopics(content, strategy) {
        const topics = [];
        // 戦略のプライマリテーマから該当するものを抽出
        strategy.content_themes.primary.forEach(theme => {
            if (content.includes(theme) || content.includes(theme.substring(0, 3))) {
                topics.push(theme);
            }
        });
        // デフォルトトピックを追加
        if (topics.length === 0) {
            topics.push('投資基礎');
        }
        return topics;
    }
}
