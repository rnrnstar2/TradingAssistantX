import { chromium } from 'playwright';
export function createBrowserTools(page) {
    return {
        launch: async () => {
            return await chromium.launch({ headless: true });
        },
        navigate: async (url) => {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
        },
        search: async (query, selector) => {
            await page.fill(selector, query);
            await page.keyboard.press('Enter');
        },
        scroll: async (distance) => {
            await page.evaluate((distance) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                globalThis.scrollBy(0, distance);
            }, distance);
        },
        getContent: async (selector) => {
            const elements = await page.locator(selector).all();
            const contents = [];
            for (const element of elements) {
                const text = await element.textContent();
                if (text) {
                    contents.push(text.trim());
                }
            }
            return contents;
        },
        screenshot: async (path) => {
            const screenshotBuffer = await page.screenshot({
                type: 'png',
                path: path
            });
            return screenshotBuffer;
        },
        waitForSelector: async (selector, timeout) => {
            await page.waitForSelector(selector, { timeout: timeout || 30000 });
        }
    };
}
export function createAnalysisTools() {
    return {
        assessRelevance: (content, topics) => {
            if (!content || topics.length === 0)
                return 0;
            const normalizedContent = content.toLowerCase();
            let matches = 0;
            for (const topic of topics) {
                const normalizedTopic = topic.toLowerCase();
                if (normalizedContent.includes(normalizedTopic)) {
                    matches++;
                }
            }
            return matches / topics.length;
        },
        extractKeyInsights: (content) => {
            if (!content)
                return [];
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const insights = [];
            for (const sentence of sentences) {
                const trimmed = sentence.trim();
                if (trimmed.length > 20 && trimmed.length < 200) {
                    insights.push(trimmed);
                }
            }
            return insights.slice(0, 5);
        },
        determineQuality: (content) => {
            if (!content) {
                return {
                    score: 0,
                    criteria: [],
                    issues: ['No content provided']
                };
            }
            const words = content.split(/\s+/).length;
            const sentences = content.split(/[.!?]+/).length;
            const criteria = [];
            const issues = [];
            // Length assessment
            if (words >= 50) {
                criteria.push('Adequate length');
            }
            else {
                issues.push('Content too short');
            }
            // Readability assessment
            const avgWordsPerSentence = words / sentences;
            if (avgWordsPerSentence <= 20) {
                criteria.push('Good readability');
            }
            else {
                issues.push('Sentences too long');
            }
            // Structure assessment
            if (sentences >= 3) {
                criteria.push('Well-structured');
            }
            else {
                issues.push('Lacks structure');
            }
            // Calculate overall score
            const score = Math.max(0, Math.min(1, (criteria.length / 3) - (issues.length * 0.2)));
            return {
                score: Math.round(score * 100) / 100,
                criteria,
                issues
            };
        }
    };
}
export async function createBrowserInstance() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    return { browser, page };
}
