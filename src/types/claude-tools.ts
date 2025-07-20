import { Browser } from 'playwright';

// Quality score for content assessment
export interface QualityScore {
  score: number;
  criteria: string[];
  issues: string[];
}

// Claudeに提供するツールの型定義
export interface BrowserTools {
  launch: () => Promise<Browser>;
  navigate: (url: string) => Promise<void>;
  search: (query: string, selector: string) => Promise<void>;
  scroll: (distance: number) => Promise<void>;
  getContent: (selector: string) => Promise<string[]>;
  screenshot: (path?: string) => Promise<Buffer>;
  waitForSelector: (selector: string, timeout?: number) => Promise<void>;
}

export interface AnalysisTools {
  assessRelevance: (content: string, topics: string[]) => number;
  extractKeyInsights: (content: string) => string[];
  determineQuality: (content: string) => QualityScore;
}

export interface InstructionContext {
  goal: string;
  preferences: {
    topics: string[];
    avoidTopics: string[];
    quality: 'educational' | 'informative' | 'trending';
  };
  autonomyLevel: 'high' | 'medium' | 'guided';
  constraints?: string[];
}

export interface CollectionResult {
  content: string;
  insights: string[];
  quality: QualityScore;
  sources: string[];
  timestamp: Date;
}

export interface GeneratedPost {
  title: string;
  content: string;
  hashtags: string[];
  metadata: {
    quality: QualityScore;
    sources: string[];
    timestamp: Date;
  };
}