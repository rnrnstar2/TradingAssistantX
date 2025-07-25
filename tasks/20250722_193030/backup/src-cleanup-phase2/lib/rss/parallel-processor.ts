import {
  RssSource,
  ProcessingResult,
  SystemLoad,
  ConcurrencyConfig,
  RetryResult,
  LoadDistribution,
  SourceBatch,
  ResourceAllocation,
  ResourceOptimization,
  OptimizationRecommendation,
  FeedConnection,
  FeedTask,
  ResourceSnapshot,
  TimeoutSettings,
  FeedItem,
} from '../../types/rss-collection-types';

export class ParallelProcessor {
  private maxConcurrency: number = 15;
  private activeConnections: Map<string, FeedConnection> = new Map();
  private processingQueue: PriorityQueue<FeedTask> = new PriorityQueue();
  private connectionPool: ConnectionPool = new ConnectionPool();
  private loadBalancer: LoadBalancer = new LoadBalancer();

  private readonly DEFAULT_TIMEOUTS: TimeoutSettings = {
    connection: 10000, // 10 seconds
    response: 30000,   // 30 seconds
    total: 60000       // 60 seconds
  };

  constructor(maxConcurrency?: number) {
    if (maxConcurrency && maxConcurrency > 0) {
      this.maxConcurrency = Math.min(maxConcurrency, 20); // Cap at 20
    }
  }

  async processParallelFeeds(sources: RssSource[]): Promise<ProcessingResult[]> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];
    
    // Create tasks for each source
    const tasks = sources.map(source => this.createFeedTask(source));
    
    // Add tasks to priority queue
    tasks.forEach(task => this.processingQueue.enqueue(task));
    
    // Process tasks with controlled concurrency
    const processingPromises: Promise<ProcessingResult>[] = [];
    
    while (processingPromises.length < this.maxConcurrency && !this.processingQueue.isEmpty()) {
      const task = this.processingQueue.dequeue();
      if (task) {
        processingPromises.push(this.processTask(task));
      }
    }
    
    // Wait for all initial tasks to complete
    const initialResults = await Promise.allSettled(processingPromises);
    
    // Process results and handle any remaining tasks
    for (const result of initialResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        
        // If there are more tasks in queue, start the next one
        if (!this.processingQueue.isEmpty()) {
          const nextTask = this.processingQueue.dequeue();
          if (nextTask) {
            const nextResult = await this.processTask(nextTask);
            results.push(nextResult);
          }
        }
      }
    }

    console.log(`Parallel processing completed: ${results.length} sources in ${Date.now() - startTime}ms`);
    return results;
  }

  async adaptiveConcurrencyControl(currentLoad: SystemLoad): Promise<ConcurrencyConfig> {
    const adaptiveConfig: ConcurrencyConfig = {
      maxConcurrency: this.maxConcurrency,
      adaptiveMode: true,
      loadThresholds: {
        cpu: 80,
        memory: 85,
        network: 90
      }
    };

    // Reduce concurrency if system is under high load
    if (currentLoad.cpuUsage > adaptiveConfig.loadThresholds.cpu ||
        currentLoad.memoryUsage > adaptiveConfig.loadThresholds.memory) {
      adaptiveConfig.maxConcurrency = Math.max(5, Math.floor(this.maxConcurrency * 0.6));
    }
    
    // Increase concurrency if system load is low
    else if (currentLoad.cpuUsage < 50 && 
             currentLoad.memoryUsage < 60 && 
             currentLoad.networkLatency < 100) {
      adaptiveConfig.maxConcurrency = Math.min(20, Math.floor(this.maxConcurrency * 1.3));
    }

    this.maxConcurrency = adaptiveConfig.maxConcurrency;
    return adaptiveConfig;
  }

  async handleFailoverRetry(failedSources: RssSource[]): Promise<RetryResult[]> {
    const retryResults: RetryResult[] = [];
    
    for (const source of failedSources) {
      const retryResult = await this.retrySource(source);
      retryResults.push(retryResult);
    }

    return retryResults;
  }

  distributeProcessingLoad(sources: RssSource[]): LoadDistribution {
    const batches = this.loadBalancer.createBatches(sources, this.maxConcurrency);
    
    const estimatedTotalTime = Math.max(...batches.map(batch => batch.estimatedTime));
    
    const resourceAllocation: ResourceAllocation = {
      cpuAllocation: 80 / batches.length, // Distribute CPU among batches
      memoryAllocation: 100 / batches.length, // MB per batch
      networkConnections: Math.floor(this.maxConcurrency / batches.length),
      timeoutSettings: this.DEFAULT_TIMEOUTS
    };

    return {
      batches,
      estimatedTotalTime,
      resourceAllocation
    };
  }

  optimizeResourceAllocation(): ResourceOptimization {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze current performance
    const averageLatency = this.calculateAverageLatency();
    const memoryUsage = this.getCurrentMemoryUsage();
    const errorRate = this.calculateErrorRate();

    // Generate optimization recommendations
    if (averageLatency > 5000) { // 5 seconds
      recommendations.push({
        type: 'timeout_adjustment',
        description: 'Reduce connection timeout to improve responsiveness',
        impact: 'medium',
        effort: 'low',
        parameters: { connectionTimeout: 8000, responseTimeout: 25000 }
      });
    }

    if (memoryUsage > 80) {
      recommendations.push({
        type: 'memory_optimization',
        description: 'Implement streaming parsing for large feeds',
        impact: 'high',
        effort: 'medium',
        parameters: { useStreaming: true, maxFeedSize: 1024 * 1024 } // 1MB
      });
    }

    if (errorRate > 0.1) { // 10% error rate
      recommendations.push({
        type: 'retry_strategy',
        description: 'Implement exponential backoff for failed requests',
        impact: 'medium',
        effort: 'low',
        parameters: { initialDelay: 1000, maxRetries: 3, backoffMultiplier: 2 }
      });
    }

    const expectedImprovement = recommendations.reduce((sum, rec) => {
      return sum + (rec.impact === 'high' ? 30 : rec.impact === 'medium' ? 20 : 10);
    }, 0);

    return {
      recommendations,
      expectedImprovement,
      implementationPriority: recommendations.length > 2 ? 3 : recommendations.length > 0 ? 2 : 1
    };
  }

  private async processTask(task: FeedTask): Promise<ProcessingResult> {
    const startTime = Date.now();
    const source = await this.getSourceById(task.sourceId);
    
    if (!source) {
      return {
        sourceId: task.sourceId,
        status: 'failure',
        items: [],
        processingTime: Date.now() - startTime,
        resourceUsage: this.getCurrentResourceSnapshot(),
        nextProcessingTime: new Date(Date.now() + 60000) // retry in 1 minute
      };
    }

    try {
      // Create connection
      const connection = this.createConnection(source);
      this.activeConnections.set(source.id, connection);

      // Fetch and parse feed
      const items = await this.fetchAndParseFeed(source);
      
      // Clean up connection
      this.activeConnections.delete(source.id);

      return {
        sourceId: source.id,
        status: 'success',
        items,
        processingTime: Date.now() - startTime,
        resourceUsage: this.getCurrentResourceSnapshot(),
        nextProcessingTime: new Date(Date.now() + source.refreshRate * 60 * 1000)
      };

    } catch (error) {
      this.activeConnections.delete(source.id);
      
      return {
        sourceId: source.id,
        status: task.retryCount >= task.maxRetries ? 'failure' : 'retry',
        items: [],
        processingTime: Date.now() - startTime,
        resourceUsage: this.getCurrentResourceSnapshot(),
        nextProcessingTime: new Date(Date.now() + Math.pow(2, task.retryCount) * 30000) // exponential backoff
      };
    }
  }

  private async fetchAndParseFeed(source: RssSource): Promise<FeedItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUTS.total);

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TradingAssistantX/1.0',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      clearTimeout(timeoutId);

      return this.parseFeedContent(content, source);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseFeedContent(content: string, source: RssSource): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      if (source.format === 'json') {
        return this.parseJsonFeed(content, source);
      }
      
      // Simple XML parsing for RSS/Atom
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      
      // Handle RSS format
      const rssItems = doc.querySelectorAll('item');
      rssItems.forEach((item, index) => {
        const feedItem = this.parseRssItem(item, source, index);
        if (feedItem) items.push(feedItem);
      });
      
      // Handle Atom format
      if (items.length === 0) {
        const atomEntries = doc.querySelectorAll('entry');
        atomEntries.forEach((entry, index) => {
          const feedItem = this.parseAtomEntry(entry, source, index);
          if (feedItem) items.push(feedItem);
        });
      }
      
    } catch (error) {
      console.error(`Failed to parse feed ${source.id}:`, error);
    }

    return items;
  }

  private parseJsonFeed(content: string, source: RssSource): FeedItem[] {
    const items: FeedItem[] = [];
    
    try {
      const feed = JSON.parse(content);
      
      if (feed.items && Array.isArray(feed.items)) {
        feed.items.forEach((item: any, index: number) => {
          items.push({
            id: `${source.id}_${item.id || index}`,
            title: item.title || 'Untitled',
            description: item.content_text || item.content_html || '',
            link: item.url || '',
            publishedAt: new Date(item.date_published || Date.now()),
            author: item.author?.name,
            category: item.tags,
            sourceId: source.id,
            content: item.content_html,
            rawData: item
          });
        });
      }
    } catch (error) {
      console.error(`Failed to parse JSON feed ${source.id}:`, error);
    }

    return items;
  }

  private parseRssItem(item: Element, source: RssSource, index: number): FeedItem | null {
    try {
      const title = item.querySelector('title')?.textContent || 'Untitled';
      const description = item.querySelector('description')?.textContent || 
                         item.querySelector('content\\:encoded')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent;
      const author = item.querySelector('author')?.textContent || 
                    item.querySelector('dc\\:creator')?.textContent;

      return {
        id: `${source.id}_${index}_${Date.now()}`,
        title,
        description,
        link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        author: author || undefined,
        sourceId: source.id,
        rawData: item.outerHTML
      };
    } catch (error) {
      console.error(`Failed to parse RSS item:`, error);
      return null;
    }
  }

  private parseAtomEntry(entry: Element, source: RssSource, index: number): FeedItem | null {
    try {
      const title = entry.querySelector('title')?.textContent || 'Untitled';
      const summary = entry.querySelector('summary')?.textContent || 
                     entry.querySelector('content')?.textContent || '';
      const link = entry.querySelector('link')?.getAttribute('href') || '';
      const published = entry.querySelector('published')?.textContent || 
                       entry.querySelector('updated')?.textContent;
      const author = entry.querySelector('author name')?.textContent;

      return {
        id: `${source.id}_${index}_${Date.now()}`,
        title,
        description: summary,
        link,
        publishedAt: published ? new Date(published) : new Date(),
        author: author || undefined,
        sourceId: source.id,
        rawData: entry.outerHTML
      };
    } catch (error) {
      console.error(`Failed to parse Atom entry:`, error);
      return null;
    }
  }

  private createFeedTask(source: RssSource): FeedTask {
    return {
      id: `task_${source.id}_${Date.now()}`,
      sourceId: source.id,
      priority: source.priority,
      estimatedTime: 5000, // 5 seconds estimate
      retryCount: 0,
      maxRetries: 3,
      status: 'queued',
      createdAt: new Date()
    };
  }

  private createConnection(source: RssSource): FeedConnection {
    return {
      sourceId: source.id,
      url: source.url,
      status: 'connecting',
      startTime: new Date(),
      lastActivity: new Date()
    };
  }

  private async retrySource(source: RssSource): Promise<RetryResult> {
    const maxAttempts = 3;
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        await this.fetchAndParseFeed(source);
        
        return {
          sourceId: source.id,
          attempts,
          success: true,
          recoveryTime: Date.now() - startTime
        };
        
      } catch (error) {
        if (attempts === maxAttempts) {
          return {
            sourceId: source.id,
            attempts,
            success: false,
            finalError: error instanceof Error ? error.message : 'Unknown error',
            recoveryTime: Date.now() - startTime
          };
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    return {
      sourceId: source.id,
      attempts,
      success: false,
      finalError: 'Max retry attempts exceeded',
      recoveryTime: Date.now() - startTime
    };
  }

  private async getSourceById(sourceId: string): Promise<RssSource | null> {
    // This would typically fetch from a database or configuration
    // For now, return null to indicate source not found
    return null;
  }

  private getCurrentResourceSnapshot(): ResourceSnapshot {
    return {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 0, // Would need to implement CPU monitoring
      networkLatency: this.calculateAverageLatency(),
      concurrentConnections: this.activeConnections.size
    };
  }

  private calculateAverageLatency(): number {
    const connections = Array.from(this.activeConnections.values());
    if (connections.length === 0) return 0;

    const totalLatency = connections.reduce((sum, conn) => {
      return sum + (conn.responseTime || 0);
    }, 0);

    return totalLatency / connections.length;
  }

  private getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100;
  }

  private calculateErrorRate(): number {
    // Would implement based on historical data
    return 0.05; // 5% default error rate
  }
}

// Helper classes
class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

class ConnectionPool {
  private readonly maxConnections = 50;
  private activeConnections = new Set<string>();

  isAvailable(): boolean {
    return this.activeConnections.size < this.maxConnections;
  }

  acquire(connectionId: string): boolean {
    if (this.isAvailable()) {
      this.activeConnections.add(connectionId);
      return true;
    }
    return false;
  }

  release(connectionId: string): void {
    this.activeConnections.delete(connectionId);
  }

  getActiveCount(): number {
    return this.activeConnections.size;
  }
}

class LoadBalancer {
  createBatches(sources: RssSource[], maxConcurrency: number): SourceBatch[] {
    const batches: SourceBatch[] = [];
    const sortedSources = sources.sort((a, b) => b.priority - a.priority);
    
    for (let i = 0; i < sortedSources.length; i += maxConcurrency) {
      const batchSources = sortedSources.slice(i, i + maxConcurrency);
      
      batches.push({
        sources: batchSources,
        priority: Math.max(...batchSources.map(s => s.priority)),
        estimatedTime: Math.max(...batchSources.map(s => this.estimateProcessingTime(s))),
        resourceRequirement: batchSources.length * 10 // MB per source estimate
      });
    }
    
    return batches;
  }

  private estimateProcessingTime(source: RssSource): number {
    // Base estimate of 3-8 seconds depending on source characteristics
    let estimate = 5000; // 5 seconds base
    
    if (source.errorCount > 5) estimate += 2000; // Add time for unreliable sources
    if (source.successRate < 0.8) estimate += 1000; // Add time for poor performing sources
    
    return estimate;
  }
}