/**
 * パフォーマンスメトリクス収集ユーティリティ
 * 
 * 機能概要:
 * - API操作のパフォーマンス追跡
 * - 統計情報の収集・分析
 * - エラー率の監視
 * - レスポンス時間の分析
 * - カスタムメトリクスの記録
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface MetricData {
  count: number;
  totalTime: number;
  errors: number;
  lastUpdated: Date;
  minTime: number;
  maxTime: number;
  timeValues: number[]; // 最新N件の時間データ（移動平均計算用）
}

export interface OperationStats {
  operation: string;
  count: number;
  averageTime: number;
  medianTime: number;
  minTime: number;
  maxTime: number;
  errorRate: number;
  successRate: number;
  totalErrors: number;
  lastUpdated: Date;
  throughput: number; // operations per minute
}

export interface SystemMetrics {
  totalOperations: number;
  totalSuccessful: number;
  totalErrors: number;
  overallErrorRate: number;
  averageResponseTime: number;
  operationsPerMinute: number;
  uptime: number; // milliseconds
  memoryUsage?: number; // MB
}

export interface MetricsCollectorConfig {
  maxTimeValues?: number; // 移動平均計算用の最大サンプル数
  enableMemoryTracking?: boolean;
  aggregationInterval?: number; // milliseconds
}

// ============================================================================
// METRICS COLLECTOR CLASS
// ============================================================================

export class MetricsCollector {
  private metrics: Map<string, MetricData> = new Map();
  private startTime: number = Date.now();
  private config: Required<MetricsCollectorConfig>;
  
  constructor(config: MetricsCollectorConfig = {}) {
    this.config = {
      maxTimeValues: config.maxTimeValues || 100,
      enableMemoryTracking: config.enableMemoryTracking || false,
      aggregationInterval: config.aggregationInterval || 60000 // 1 minute
    };
    
    console.log('📊 MetricsCollector initialized:', this.config);
  }

  /**
   * メトリクスの記録
   * @param operation - 操作名
   * @param duration - 実行時間（ミリ秒）
   * @param success - 成功フラグ
   */
  record(operation: string, duration: number, success: boolean): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        errors: 0,
        lastUpdated: new Date(),
        minTime: Infinity,
        maxTime: 0,
        timeValues: []
      });
    }
    
    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.totalTime += duration;
    metric.lastUpdated = new Date();
    
    // 時間の最小・最大値更新
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    
    // 移動平均用の時間データ保存
    metric.timeValues.push(duration);
    if (metric.timeValues.length > this.config.maxTimeValues) {
      metric.timeValues.shift();
    }
    
    if (!success) {
      metric.errors++;
    }
  }
  
  /**
   * 操作の統計情報取得
   * @param operation - 操作名
   * @returns OperationStats | null
   */
  getStats(operation: string): OperationStats | null {
    const metric = this.metrics.get(operation);
    if (!metric) return null;
    
    const averageTime = metric.totalTime / metric.count;
    const medianTime = this.calculateMedian(metric.timeValues);
    const errorRate = metric.errors / metric.count;
    const successRate = 1 - errorRate;
    
    // 1分あたりのスループット計算
    const now = Date.now();
    const timeWindowMs = Math.min(now - this.startTime, 60000); // 最大1分間
    const throughput = timeWindowMs > 0 ? (metric.count / timeWindowMs) * 60000 : 0;
    
    return {
      operation,
      count: metric.count,
      averageTime,
      medianTime,
      minTime: metric.minTime === Infinity ? 0 : metric.minTime,
      maxTime: metric.maxTime,
      errorRate,
      successRate,
      totalErrors: metric.errors,
      lastUpdated: metric.lastUpdated,
      throughput
    };
  }
  
  /**
   * 全操作の統計情報取得
   * @returns OperationStats[]
   */
  getAllStats(): OperationStats[] {
    const stats: OperationStats[] = [];
    this.metrics.forEach((_, operation) => {
      const stat = this.getStats(operation);
      if (stat) {
        stats.push(stat);
      }
    });
    
    // スループット順でソート
    return stats.sort((a, b) => b.throughput - a.throughput);
  }
  
  /**
   * システム全体のメトリクス取得
   * @returns SystemMetrics
   */
  getSystemMetrics(): SystemMetrics {
    let totalOperations = 0;
    let totalErrors = 0;
    let totalTime = 0;
    
    this.metrics.forEach(metric => {
      totalOperations += metric.count;
      totalErrors += metric.errors;
      totalTime += metric.totalTime;
    });
    
    const totalSuccessful = totalOperations - totalErrors;
    const overallErrorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const averageResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;
    
    const uptime = Date.now() - this.startTime;
    const operationsPerMinute = uptime > 0 ? (totalOperations / uptime) * 60000 : 0;
    
    const systemMetrics: SystemMetrics = {
      totalOperations,
      totalSuccessful,
      totalErrors,
      overallErrorRate,
      averageResponseTime,
      operationsPerMinute,
      uptime
    };
    
    // メモリ使用量の追加（Node.js環境の場合）
    if (this.config.enableMemoryTracking && typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      systemMetrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }
    
    return systemMetrics;
  }
  
  /**
   * パフォーマンス分析レポート生成
   * @returns パフォーマンス分析結果
   */
  generatePerformanceReport(): {
    summary: SystemMetrics;
    topOperations: OperationStats[];
    slowestOperations: OperationStats[];
    errorProneOperations: OperationStats[];
    recommendations: string[];
  } {
    const summary = this.getSystemMetrics();
    const allStats = this.getAllStats();
    
    // トップ5のスループット
    const topOperations = allStats.slice(0, 5);
    
    // 最も遅い5操作
    const slowestOperations = [...allStats]
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);
    
    // エラー率の高い5操作
    const errorProneOperations = [...allStats]
      .filter(stat => stat.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
    
    // 推奨事項生成
    const recommendations = this.generateRecommendations(summary, allStats);
    
    return {
      summary,
      topOperations,
      slowestOperations,
      errorProneOperations,
      recommendations
    };
  }
  
  /**
   * 推奨事項生成
   * @param summary - システムメトリクス
   * @param stats - 操作統計
   * @returns 推奨事項リスト
   */
  private generateRecommendations(summary: SystemMetrics, stats: OperationStats[]): string[] {
    const recommendations: string[] = [];
    
    // 全体的なエラー率が高い場合
    if (summary.overallErrorRate > 0.05) { // 5%以上
      recommendations.push(`Overall error rate is ${(summary.overallErrorRate * 100).toFixed(1)}%. Consider improving error handling.`);
    }
    
    // 平均レスポンス時間が遅い場合
    if (summary.averageResponseTime > 2000) { // 2秒以上
      recommendations.push(`Average response time is ${summary.averageResponseTime.toFixed(0)}ms. Consider performance optimization.`);
    }
    
    // 特定の操作が遅い場合
    const slowOperations = stats.filter(s => s.averageTime > 5000); // 5秒以上
    if (slowOperations.length > 0) {
      recommendations.push(`${slowOperations.length} operations have average time > 5s: ${slowOperations.map(s => s.operation).join(', ')}`);
    }
    
    // 高エラー率の操作がある場合
    const highErrorOperations = stats.filter(s => s.errorRate > 0.1); // 10%以上
    if (highErrorOperations.length > 0) {
      recommendations.push(`${highErrorOperations.length} operations have error rate > 10%: ${highErrorOperations.map(s => s.operation).join(', ')}`);
    }
    
    // メモリ使用量が高い場合
    if (summary.memoryUsage && summary.memoryUsage > 512) { // 512MB以上
      recommendations.push(`Memory usage is ${summary.memoryUsage}MB. Consider memory optimization.`);
    }
    
    // スループットが低い場合
    if (summary.operationsPerMinute < 60 && summary.totalOperations > 10) {
      recommendations.push(`Low throughput: ${summary.operationsPerMinute.toFixed(1)} ops/min. Consider scaling or optimization.`);
    }
    
    return recommendations;
  }
  
  /**
   * 中央値計算
   * @param values - 数値配列
   * @returns 中央値
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }
  
  /**
   * メトリクスのクリア
   * @param operation - クリア対象の操作名（省略時は全て）
   */
  clear(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
      console.log(`📊 Metrics cleared for operation: ${operation}`);
    } else {
      this.metrics.clear();
      this.startTime = Date.now();
      console.log('📊 All metrics cleared');
    }
  }
  
  /**
   * メトリクスのエクスポート（JSON形式）
   * @returns メトリクスデータのJSON文字列
   */
  exportMetrics(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      startTime: new Date(this.startTime).toISOString(),
      uptime: Date.now() - this.startTime,
      systemMetrics: this.getSystemMetrics(),
      operationStats: this.getAllStats(),
      config: this.config
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * メトリクスのインポート（JSON形式）
   * @param jsonData - インポート対象のJSONデータ
   */
  importMetrics(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      // 基本的な検証
      if (!data.operationStats || !Array.isArray(data.operationStats)) {
        throw new Error('Invalid metrics data format');
      }
      
      this.clear(); // 既存データをクリア
      
      // 操作統計を復元
      data.operationStats.forEach((stat: OperationStats) => {
        const metric: MetricData = {
          count: stat.count,
          totalTime: stat.averageTime * stat.count,
          errors: stat.totalErrors,
          lastUpdated: new Date(stat.lastUpdated),
          minTime: stat.minTime,
          maxTime: stat.maxTime,
          timeValues: [] // 詳細データは復元できない
        };
        
        this.metrics.set(stat.operation, metric);
      });
      
      if (data.startTime) {
        this.startTime = new Date(data.startTime).getTime();
      }
      
      console.log('📊 Metrics imported successfully');
    } catch (error) {
      console.error('❌ Failed to import metrics:', error);
      throw error;
    }
  }
  
  /**
   * アラート用しきい値チェック
   * @param thresholds - しきい値設定
   * @returns アラート情報
   */
  checkAlerts(thresholds: {
    maxErrorRate?: number;
    maxAverageTime?: number;
    minThroughput?: number;
  } = {}): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const alerts: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];
    const defaults = {
      maxErrorRate: 0.05, // 5%
      maxAverageTime: 2000, // 2秒
      minThroughput: 60 // 60 ops/min
    };
    
    const config = { ...defaults, ...thresholds };
    const systemMetrics = this.getSystemMetrics();
    const allStats = this.getAllStats();
    
    // システム全体のエラー率チェック
    if (systemMetrics.overallErrorRate > config.maxErrorRate) {
      alerts.push({
        type: 'high_error_rate',
        message: `System error rate (${(systemMetrics.overallErrorRate * 100).toFixed(1)}%) exceeds threshold (${(config.maxErrorRate * 100).toFixed(1)}%)`,
        severity: systemMetrics.overallErrorRate > config.maxErrorRate * 2 ? 'high' : 'medium'
      });
    }
    
    // システム全体の平均レスポンス時間チェック
    if (systemMetrics.averageResponseTime > config.maxAverageTime) {
      alerts.push({
        type: 'slow_response',
        message: `Average response time (${systemMetrics.averageResponseTime.toFixed(0)}ms) exceeds threshold (${config.maxAverageTime}ms)`,
        severity: systemMetrics.averageResponseTime > config.maxAverageTime * 2 ? 'high' : 'medium'
      });
    }
    
    // スループットチェック
    if (systemMetrics.operationsPerMinute < config.minThroughput && systemMetrics.totalOperations > 10) {
      alerts.push({
        type: 'low_throughput',
        message: `Throughput (${systemMetrics.operationsPerMinute.toFixed(1)} ops/min) below threshold (${config.minThroughput} ops/min)`,
        severity: 'medium'
      });
    }
    
    // 個別操作のチェック
    allStats.forEach(stat => {
      if (stat.errorRate > config.maxErrorRate * 2) {
        alerts.push({
          type: 'operation_high_error',
          message: `Operation '${stat.operation}' has high error rate: ${(stat.errorRate * 100).toFixed(1)}%`,
          severity: 'high'
        });
      }
      
      if (stat.averageTime > config.maxAverageTime * 2) {
        alerts.push({
          type: 'operation_slow',
          message: `Operation '${stat.operation}' is slow: ${stat.averageTime.toFixed(0)}ms average`,
          severity: 'medium'
        });
      }
    });
    
    return alerts;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * 実行時間測定デコレータ
 * @param metricsCollector - メトリクス収集インスタンス
 * @param operationName - 操作名
 */
export function measureTime(metricsCollector: MetricsCollector, operationName: string) {
  return function<T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = (async function(this: any, ...args: any[]) {
      const startTime = Date.now();
      let success = true;
      
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        metricsCollector.record(operationName, duration, success);
      }
    }) as any;
    
    return descriptor;
  };
}

/**
 * 関数実行時間測定ヘルパー
 * @param fn - 測定対象の関数
 * @param operationName - 操作名
 * @param metricsCollector - メトリクス収集インスタンス
 * @returns 実行結果
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  operationName: string,
  metricsCollector: MetricsCollector
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  
  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    metricsCollector.record(operationName, duration, success);
  }
}

/**
 * グローバル メトリクス収集インスタンス
 */
const globalMetricsCollector = new MetricsCollector();

/**
 * グローバル メトリクス収集インスタンスの取得
 * @returns MetricsCollector
 */
export function getGlobalMetricsCollector(): MetricsCollector {
  return globalMetricsCollector;
}

// ============================================================================
// EXPORT
// ============================================================================

export default MetricsCollector;