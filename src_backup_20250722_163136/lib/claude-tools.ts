import { Browser, Page, chromium } from 'playwright';
import { BrowserTools, AnalysisTools, QualityScore } from '../types/claude-tools';

export function createBrowserTools(page: Page): BrowserTools {
  return {
    launch: async (): Promise<Browser> => {
      return await chromium.launch({ headless: true });
    },
    
    navigate: async (url: string): Promise<void> => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    },
    
    search: async (query: string, selector: string): Promise<void> => {
      await page.fill(selector, query);
      await page.keyboard.press('Enter');
    },
    
    scroll: async (distance: number): Promise<void> => {
      await page.evaluate((distance: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).scrollBy(0, distance);
      }, distance);
    },
    
    getContent: async (selector: string): Promise<string[]> => {
      const elements = await page.locator(selector).all();
      const contents: string[] = [];
      
      for (const element of elements) {
        const text = await element.textContent();
        if (text) {
          contents.push(text.trim());
        }
      }
      
      return contents;
    },
    
    screenshot: async (path?: string): Promise<Buffer> => {
      const screenshotBuffer = await page.screenshot({ 
        type: 'png',
        path: path 
      });
      return screenshotBuffer;
    },
    
    waitForSelector: async (selector: string, timeout?: number): Promise<void> => {
      await page.waitForSelector(selector, { timeout: timeout || 30000 });
    }
  };
}

export function createAnalysisTools(): AnalysisTools {
  return {
    assessRelevance: (content: string, topics: string[]): number => {
      if (!content || topics.length === 0) return 0;
      
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
    
    extractKeyInsights: (content: string): string[] => {
      if (!content) return [];
      
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const insights: string[] = [];
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          insights.push(trimmed);
        }
      }
      
      return insights.slice(0, 5);
    },
    
    determineQuality: (content: string): QualityScore => {
      if (!content) {
        return { 
          score: 0, 
          criteria: [], 
          issues: ['No content provided'] 
        };
      }
      
      const words = content.split(/\s+/).length;
      const sentences = content.split(/[.!?]+/).length;
      const criteria: string[] = [];
      const issues: string[] = [];
      
      // Length assessment
      if (words >= 50) {
        criteria.push('Adequate length');
      } else {
        issues.push('Content too short');
      }
      
      // Readability assessment
      const avgWordsPerSentence = words / sentences;
      if (avgWordsPerSentence <= 20) {
        criteria.push('Good readability');
      } else {
        issues.push('Sentences too long');
      }
      
      // Structure assessment
      if (sentences >= 3) {
        criteria.push('Well-structured');
      } else {
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

export async function createBrowserInstance(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  return { browser, page };
}