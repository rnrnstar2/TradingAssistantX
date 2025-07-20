export interface ScrapedData {
  content: string;
  url: string;
  timestamp: number;
  source: string;
}

export interface PostTemplate {
  id: string;
  content: string;
  hashtags: string[];
  category: string;
  type: string;
  format: string;
  maxLength: number;
}

export interface Config {
  targets: ScrapeTarget[];
  templates: PostTemplate[];
}

export interface ScrapeTarget {
  name: string;
  url: string;
  selector: string;
}

export interface PostHistory {
  id: string;
  content: string;
  timestamp: number;
  success: boolean;
  error?: string;
  // エンゲージメントデータ
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  impressions?: number;
  // 分析データ
  themes?: string[];
  qualityScore?: number;
  engagementRate?: number;
}

export interface PostingResult {
  success: boolean;
  id?: string;
  error?: string;
  timestamp: number;
  postId?: string;
}

export interface XClientConfig {
  apiKey: string;
  testMode: boolean;
  rateLimitDelay: number;
  maxRetries: number;
}

// 並列実行とデータ連携システムの型定義
export interface Task {
  id: string;
  name: string;
  type: 'collect' | 'analyze' | 'post' | 'strategy' | 'custom';
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  config?: Record<string, any>;
  timeout?: number;
  maxRetries?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
  duration: number;
}

export interface ParallelTaskGroup {
  id: string;
  tasks: Task[];
  strategy: 'all' | 'race' | 'settled';
  timeout?: number;
}

export interface IntermediateResult {
  id: string;
  taskId: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
}

export interface AsyncTaskStatus {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface DataCommunicationMessage {
  id: string;
  type: 'status' | 'result' | 'error' | 'progress';
  from: string;
  to?: string;
  data: unknown;
  timestamp: number;
}

export interface LongTask extends Task {
  subtasks?: Task[];
  checkpoints?: string[];
  estimatedDuration?: number;
}

