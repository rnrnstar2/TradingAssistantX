import { chromium } from 'playwright';
/**
 * 構造化FXサイト収集器
 * HTML構造が整理された専門サイトから確実にデータ取得
 */
export class FXStructuredSiteCollector {
    config;
    browser = null;
    static DEFAULT_CONFIG = {
        timeout: 15000,
        maxRetries: 2,
        requestDelay: 1000,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        headless: true
    };
    static FX_SITES = [
        {
            name: 'みんかぶFX',
            url: 'https://fx.minkabu.jp/news',
            selectors: {
                articles: '.news-list .news-item',
                title: '.news-title a, .title a',
                content: '.news-summary, .summary',
                timestamp: '.news-date, .date',
                link: '.news-title a, .title a'
            },
            priority: 1
        },
        {
            name: 'ZAi FX',
            url: 'https://zai.diamond.jp/list/fxnews',
            selectors: {
                articles: '.articleList .articleList-item',
                title: '.articleList-title a',
                content: '.articleList-summary',
                timestamp: '.articleList-date',
                link: '.articleList-title a'
            },
            priority: 1
        },
        {
            name: 'トレーダーズウェブFX',
            url: 'https://www.traderswebfx.jp/news',
            selectors: {
                articles: '.news-list-item',
                title: '.news-title a',
                content: '.news-lead',
                timestamp: '.news-time',
                link: '.news-title a'
            },
            priority: 2
        }
    ];
    constructor(config) {
        this.config = { ...FXStructuredSiteCollector.DEFAULT_CONFIG, ...config };
    }
    /**
     * 全構造化サイトからの並列データ収集
     */
    async collectFromAllSites() {
        console.log('🌐 [構造化サイト収集] FX専門サイトからのデータ取得開始');
        try {
            await this.initializeBrowser();
            // 優先度順でサイト処理
            const sortedSites = [...FXStructuredSiteCollector.FX_SITES].sort((a, b) => a.priority - b.priority);
            const allResults = [];
            for (const site of sortedSites) {
                try {
                    console.log(`📰 [${site.name}] データ取得中...`);
                    const results = await this.collectFromSite(site);
                    allResults.push(...results);
                    // サイト間の間隔
                    await this.delay(this.config.requestDelay);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.warn(`⚠️ [${site.name}失敗]:`, errorMessage);
                    // 次のサイトに継続
                }
            }
            console.log(`✅ [構造化サイト収集完了] ${allResults.length}件のデータを取得`);
            return allResults;
        }
        finally {
            await this.cleanup();
        }
    }
    /**
     * 単一サイトからのデータ収集
     */
    async collectFromSite(site) {
        if (!this.browser) {
            throw new Error('ブラウザが初期化されていません');
        }
        const page = await this.browser.newPage();
        try {
            // ページアクセス
            await page.goto(site.url, {
                waitUntil: 'domcontentloaded',
                timeout: this.config.timeout
            });
            // 記事要素の読み込み待機
            try {
                await page.waitForSelector(site.selectors.articles, { timeout: 8000 });
            }
            catch (timeoutError) {
                console.warn(`⚠️ [${site.name}] 記事要素の読み込みタイムアウト`);
                return [];
            }
            // 記事データ抽出
            const articles = await page.$$eval(site.selectors.articles, (elements, selectors) => {
                return elements.slice(0, 10).map((article, index) => {
                    try {
                        // タイトル抽出
                        const titleElement = article.querySelector(selectors.title);
                        const title = titleElement?.textContent?.trim() || '';
                        // 内容抽出
                        const contentElement = article.querySelector(selectors.content);
                        const content = contentElement?.textContent?.trim() || '';
                        // タイムスタンプ抽出
                        const timestampElement = article.querySelector(selectors.timestamp);
                        const timestampText = timestampElement?.textContent?.trim() || '';
                        // リンク抽出（相対パスはそのまま保持、後で変換）
                        let link = '';
                        if (selectors.link) {
                            const linkElement = article.querySelector(selectors.link);
                            link = linkElement?.getAttribute('href') || '';
                        }
                        return {
                            title,
                            content,
                            timestamp: timestampText,
                            link,
                            valid: !!(title && (content || timestampText))
                        };
                    }
                    catch (error) {
                        console.warn(`記事${index}の抽出でエラー:`, error);
                        return { title: '', content: '', timestamp: '', link: '', valid: false };
                    }
                });
            }, site.selectors);
            // 有効な記事のみフィルタリングしてCollectionResultに変換
            const results = articles
                .filter((article) => article.valid && article.title)
                .map((article, index) => {
                // 相対パスを絶対パスに変換
                let absoluteUrl = article.link;
                if (article.link && !article.link.startsWith('http')) {
                    const baseUrl = new URL(site.url).origin;
                    absoluteUrl = article.link.startsWith('/')
                        ? baseUrl + article.link
                        : baseUrl + '/' + article.link;
                }
                return {
                    id: `${site.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
                    type: 'news',
                    content: `${article.title}${article.content ? '\n\n' + article.content : ''}`,
                    source: site.name,
                    timestamp: this.parseTimestamp(article.timestamp) || Date.now(),
                    relevanceScore: site.priority === 1 ? 0.8 : 0.7,
                    metadata: {
                        title: article.title,
                        url: absoluteUrl,
                        originalTimestamp: article.timestamp,
                        site: site.name,
                        dataType: 'fx_news_structured'
                    }
                };
            });
            console.log(`📊 [${site.name}] ${results.length}件の記事を取得`);
            return results;
        }
        catch (error) {
            console.error(`❌ [${site.name}エラー]:`, error);
            return [];
        }
        finally {
            await page.close();
        }
    }
    /**
     * ブラウザ初期化
     */
    async initializeBrowser() {
        if (this.browser)
            return;
        console.log('🚀 [ブラウザ起動] 構造化サイト収集用');
        this.browser = await chromium.launch({
            headless: this.config.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        // デフォルトコンテキストにタイムアウト設定
        const context = await this.browser.newContext({
            userAgent: this.config.userAgent,
            viewport: { width: 1280, height: 720 }
        });
        context.setDefaultTimeout(this.config.timeout);
    }
    /**
     * タイムスタンプ解析
     */
    parseTimestamp(timestampText) {
        if (!timestampText)
            return null;
        try {
            // 一般的な日時フォーマットのパターンマッチング
            const patterns = [
                /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[\s\T](\d{1,2}):(\d{1,2})/, // YYYY-MM-DD HH:MM
                /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})[\s\T](\d{1,2}):(\d{1,2})/, // MM/DD/YYYY HH:MM  
                /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD
                /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // MM/DD/YYYY
                /(\d{1,2})時間?前/, // X時間前
                /(\d{1,2})分前/ // X分前
            ];
            for (const pattern of patterns) {
                const match = timestampText.match(pattern);
                if (match) {
                    // 相対時間の処理
                    if (pattern.source.includes('時間')) {
                        const hoursAgo = parseInt(match[1]);
                        return Date.now() - (hoursAgo * 60 * 60 * 1000);
                    }
                    if (pattern.source.includes('分')) {
                        const minutesAgo = parseInt(match[1]);
                        return Date.now() - (minutesAgo * 60 * 1000);
                    }
                    // 日時の処理
                    try {
                        const parsed = new Date(timestampText);
                        if (!isNaN(parsed.getTime())) {
                            return parsed.getTime();
                        }
                    }
                    catch {
                        // フォールバック処理継続
                    }
                }
            }
            // 最終フォールバック: 現在時刻
            return Date.now();
        }
        catch (error) {
            console.debug('タイムスタンプ解析失敗:', timestampText, error);
            return Date.now();
        }
    }
    /**
     * 遅延ユーティリティ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * クリーンアップ
     */
    async cleanup() {
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('🧹 [ブラウザクリーンアップ] 完了');
            }
            catch (error) {
                console.warn('⚠️ [クリーンアップ警告]:', error);
            }
            finally {
                this.browser = null;
            }
        }
    }
    /**
     * 手動クリーンアップ（外部呼び出し用）
     */
    async forceCleanup() {
        await this.cleanup();
    }
}
