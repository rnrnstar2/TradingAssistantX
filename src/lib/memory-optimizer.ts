/**
 * メモリ効率化システム
 * コンテキスト圧迫抑制・最小情報システム用
 */

import { logger } from './minimal-logger';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export class MemoryOptimizer {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cache = new Map<string, { data: any; timestamp: number; size: number }>();
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分
  private readonly MAX_HEAP_SIZE = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * 5分ごとに不要データをクリア
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedData();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 包括的なクリーンアップ
   */
  private cleanupUnusedData(): void {
    const startTime = Date.now();
    
    try {
      // 1. 古いキャッシュデータの削除
      this.clearOldCache();
      
      // 2. メモリ使用量チェック
      const usage = this.getMemoryStats();
      
      // 3. ガベージコレクション実行
      if (usage.heapUsed > this.MAX_HEAP_SIZE) {
        this.forceGarbageCollection();
      }
      
      // 4. 使用メモリの監視・警告
      this.monitorMemoryUsage(usage);
      
      logger.performance('メモリクリーンアップ', startTime);
      
    } catch (error) {
      logger.error('メモリクリーンアップエラー', error);
    }
  }

  /**
   * 5分以上古いキャッシュエントリを削除
   */
  private clearOldCache(): void {
    const fiveMinutesAgo = Date.now() - this.CLEANUP_INTERVAL;
    let deletedCount = 0;
    let freedBytes = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < fiveMinutesAgo) {
        freedBytes += value.size;
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`キャッシュクリーンアップ: ${deletedCount}件削除, ${Math.round(freedBytes / 1024)}KB解放`);
    }
  }

  /**
   * 強制ガベージコレクション
   */
  private forceGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      const freed = beforeGC - afterGC;
      
      if (freed > 1024 * 1024) { // 1MB以上解放された場合のみログ
        logger.info(`GC実行: ${Math.round(freed / 1024 / 1024)}MB解放`);
      }
    }
  }

  /**
   * メモリ使用量の監視
   */
  private monitorMemoryUsage(usage: MemoryStats): void {
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 100) { // 100MB超過
      logger.warn(`メモリ使用量高: ${heapUsedMB}MB`);
      
      // 緊急クリーンアップ
      if (heapUsedMB > 150) {
        this.emergencyCleanup();
      }
    }
  }

  /**
   * 緊急クリーンアップ
   */
  private emergencyCleanup(): void {
    logger.warn('緊急メモリクリーンアップ開始');
    
    // キャッシュ全削除
    const cacheSize = this.cache.size;
    this.cache.clear();
    
    // 強制GC
    if (global.gc) {
      global.gc();
    }
    
    logger.warn(`緊急クリーンアップ完了: ${cacheSize}件のキャッシュ削除`);
  }

  /**
   * メモリ統計の取得
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
  }

  /**
   * キャッシュサイズ制限付きセット
   */
  setCache(key: string, data: any): boolean {
    const dataSize = this.estimateObjectSize(data);
    
    // サイズチェック
    if (dataSize > this.MAX_CACHE_SIZE / 10) { // 最大サイズの10%を超える場合は拒否
      logger.warn(`キャッシュサイズ超過: ${key}, ${Math.round(dataSize / 1024)}KB`);
      return false;
    }
    
    // 現在のキャッシュサイズチェック
    const currentSize = this.getCurrentCacheSize();
    if (currentSize + dataSize > this.MAX_CACHE_SIZE) {
      this.cleanLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size: dataSize
    });
    
    return true;
  }

  /**
   * キャッシュから取得
   */
  getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // タイムスタンプ更新（LRU用）
    cached.timestamp = Date.now();
    return cached.data;
  }

  /**
   * 現在のキャッシュサイズ計算
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const [, value] of this.cache.entries()) {
      totalSize += value.size;
    }
    return totalSize;
  }

  /**
   * LRU（Least Recently Used）でキャッシュクリア
   */
  private cleanLeastRecentlyUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // 古い順に25%削除
    const deleteCount = Math.floor(entries.length * 0.25);
    for (let i = 0; i < deleteCount; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.info(`LRUキャッシュクリア: ${deleteCount}件削除`);
  }

  /**
   * オブジェクトサイズの推定
   */
  private estimateObjectSize(obj: any): number {
    const jsonStr = JSON.stringify(obj);
    return jsonStr.length * 2; // UTF-16エンコーディングを仮定
  }

  /**
   * メモリ使用量レポート
   */
  getMemoryReport(): string {
    const usage = this.getMemoryStats();
    const cacheSize = this.getCurrentCacheSize();
    
    return `
メモリ使用量レポート:
- Heap使用量: ${Math.round(usage.heapUsed / 1024 / 1024)}MB / ${Math.round(usage.heapTotal / 1024 / 1024)}MB
- RSS: ${Math.round(usage.rss / 1024 / 1024)}MB
- External: ${Math.round(usage.external / 1024 / 1024)}MB
- キャッシュサイズ: ${Math.round(cacheSize / 1024 / 1024)}MB
- キャッシュエントリ数: ${this.cache.size}
`.trim();
  }

  /**
   * パフォーマンス健全性チェック
   */
  isHealthy(): boolean {
    const usage = this.getMemoryStats();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const cacheSize = this.getCurrentCacheSize() / 1024 / 1024;
    
    return heapUsedMB < 100 && cacheSize < 50;
  }

  /**
   * クリーンアップの停止
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    logger.info('MemoryOptimizer停止');
  }

  /**
   * 手動クリーンアップトリガー
   */
  async performManualCleanup(): Promise<void> {
    logger.info('手動メモリクリーンアップ開始');
    this.cleanupUnusedData();
    
    // 少し待ってから結果を確認
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const usage = this.getMemoryStats();
    logger.info(`手動クリーンアップ完了: ${Math.round(usage.heapUsed / 1024 / 1024)}MB使用中`);
  }
}

// シングルトンインスタンス
export const memoryOptimizer = new MemoryOptimizer();