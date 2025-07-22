/**
 * Real execution test types for data source testing
 */

export interface DataSourceError {
  category: 'network' | 'authentication' | 'rate_limit' | 'structure_change' | 'content_blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedFix: 'retry' | 'fallback' | 'disable' | 'update_code';
  details?: string;
  originalError?: Error;
}

export interface SourceTestResult {
  sourceName: string;
  testStartTime: string;
  testEndTime: string;
  success: boolean;
  error?: DataSourceError;
  collectedData?: {
    itemCount: number;
    sampleData: any[];
  };
  performanceMetrics: {
    responseTime: number;
    memoryUsed: number;
  };
  additionalInfo?: Record<string, any>;
}

export interface TestConfiguration {
  timeout: number;
  maxRetries: number;
  testKeyword?: string;
  testQuery?: string;
}

export type DataSourceTestFunction = (config?: TestConfiguration) => Promise<SourceTestResult>;

export interface TestSuite {
  suiteName: string;
  tests: {
    [testName: string]: DataSourceTestFunction;
  };
}