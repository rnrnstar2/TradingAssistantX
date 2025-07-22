/**
 * Integration Types
 * 
 * This file contains types for external tool integrations:
 * - Claude tool integrations (from claude-tools.ts)
 * - Browser automation types
 * - Analysis tool types
 */

import { Browser } from 'playwright';

// ============================================================================
// CLAUDE TOOLS INTEGRATION (from claude-tools.ts)
// ============================================================================

// Renamed to avoid collision with content-types and decision-types QualityScore
export interface IntegrationQualityScore {
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
  determineQuality: (content: string) => IntegrationQualityScore;
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

export interface GeneratedPost {
  title: string;
  content: string;
  hashtags: string[];
  metadata: {
    quality: IntegrationQualityScore;
    sources: string[];
    timestamp: Date;
  };
}

// ============================================================================
// BROWSER AUTOMATION TYPES
// ============================================================================

export interface BrowserSession {
  id: string;
  browser: Browser;
  startTime: Date;
  isActive: boolean;
  pageCount: number;
  resourceUsage: BrowserResourceUsage;
}

export interface BrowserResourceUsage {
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  networkRequests: number;
  activeConnections: number;
}

export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface NavigationOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  referer?: string;
}

export interface SelectorOptions {
  timeout?: number;
  visible?: boolean;
  hidden?: boolean;
}

// ============================================================================
// ANALYSIS INTEGRATION TYPES
// ============================================================================

export interface ContentAnalysisRequest {
  content: string;
  topics: string[];
  analysisType: 'relevance' | 'quality' | 'sentiment' | 'comprehensive';
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  strictMode?: boolean;
  threshold?: number;
  categories?: string[];
  language?: string;
}

export interface ContentAnalysisResult {
  relevanceScore: number;
  qualityScore: IntegrationQualityScore;
  sentimentScore?: number;
  keyInsights: string[];
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface InsightExtractionResult {
  insights: ExtractedInsight[];
  totalCount: number;
  confidence: number;
  categories: string[];
}

export interface ExtractedInsight {
  content: string;
  category: string;
  importance: number;
  confidence: number;
  source: string;
  context?: string;
}

// ============================================================================
// EXTERNAL API INTEGRATION TYPES
// ============================================================================

export interface APIIntegrationConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  headers?: Record<string, string>;
}

export interface APIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  responseTime: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetTime: Date;
  retryAfter?: number;
}

// ============================================================================
// WEBHOOK INTEGRATION TYPES
// ============================================================================

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  authentication?: WebhookAuth;
}

export interface WebhookAuth {
  type: 'bearer' | 'basic' | 'custom';
  token?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
}

export interface WebhookPayload {
  timestamp: Date;
  event: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  attempt: number;
  error?: string;
}

// ============================================================================
// NOTIFICATION INTEGRATION TYPES
// ============================================================================

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'teams' | 'discord' | 'webhook';
  name: string;
  config: NotificationChannelConfig;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationChannelConfig {
  // Email
  smtpServer?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  from?: string;
  to?: string[];
  
  // Slack/Teams/Discord
  webhookUrl?: string;
  channel?: string;
  
  // Custom webhook
  url?: string;
  headers?: Record<string, string>;
}

export interface NotificationMessage {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  messageId: string;
  channelId: string;
  success: boolean;
  sentAt: Date;
  error?: string;
  responseTime: number;
}

// ============================================================================
// LOGGING INTEGRATION TYPES
// ============================================================================

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destinations: LogDestination[];
  format: 'json' | 'text' | 'structured';
  includeStackTrace: boolean;
  maxFileSize?: number;
  maxFiles?: number;
}

export interface LogDestination {
  type: 'console' | 'file' | 'database' | 'external';
  config: LogDestinationConfig;
  enabled: boolean;
}

export interface LogDestinationConfig {
  // File logging
  filePath?: string;
  rotateDaily?: boolean;
  
  // Database logging
  connectionString?: string;
  tableName?: string;
  
  // External logging
  endpoint?: string;
  apiKey?: string;
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  context?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

// ============================================================================
// MONITORING INTEGRATION TYPES
// ============================================================================

export interface MonitoringConfig {
  enabled: boolean;
  interval: number; // seconds
  metrics: MonitoringMetric[];
  alertRules: AlertRule[];
  destinations: NotificationChannel[];
}

export interface MonitoringMetric {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  description: string;
  unit?: string;
  labels?: string[];
}

export interface MetricValue {
  metric: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// UTILITY TYPES AND FUNCTIONS
// ============================================================================

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'authenticating';

export interface IntegrationHealth {
  service: string;
  status: IntegrationStatus;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface IntegrationTest {
  service: string;
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export function isQualityScore(obj: any): obj is IntegrationQualityScore {
  return obj && 
    typeof obj.score === 'number' &&
    Array.isArray(obj.criteria) &&
    Array.isArray(obj.issues);
}

export function isAPIResponse<T>(obj: any): obj is APIResponse<T> {
  return obj && 
    typeof obj.success === 'boolean' &&
    typeof obj.statusCode === 'number' &&
    typeof obj.responseTime === 'number';
}