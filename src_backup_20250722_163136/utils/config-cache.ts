import * as fs from 'fs';
import { EventEmitter } from 'events';

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  config: any;
  timestamp: number;
  hash: string;
}

/**
 * キャッシュオプション
 */
interface ConfigCacheOptions {
  maxSize?: number;
  enableHashing?: boolean;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  cachedConfigs: number;
  maxSize: number;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
}

/**
 * 設定データのキャッシュ管理を専門に担当
 * Single Responsibilityに準拠し、キャッシュ機能のみに集中
 */
export class ConfigCache extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    totalRequests: 0,
    cacheHits: 0
  };

  constructor(private options: ConfigCacheOptions = {}) {
    super();
    this.options = {
      maxSize: 100,
      enableHashing: true,
      ...options
    };
  }

  /**
   * キャッシュからデータを取得
   */
  async get<T>(filePath: string): Promise<T | null> {
    this.stats.totalRequests++;

    const cached = this.cache.get(filePath);
    if (!cached) {
      this.emit('cache:miss', { filePath });
      return null;
    }

    // キャッシュの有効性確認
    if (!await this.isValid(filePath)) {
      this.cache.delete(filePath);
      this.emit('cache:expired', { filePath });
      return null;
    }

    this.stats.cacheHits++;
    this.emit('cache:hit', { filePath, config: cached.config });
    return cached.config as T;
  }

  /**
   * データをキャッシュに保存
   */
  async set(filePath: string, config: any): Promise<void> {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = this.options.enableHashing ? this.generateHash(content) : '';

      // キャッシュサイズ制限チェック
      if (this.cache.size >= (this.options.maxSize || 100)) {
        // LRU的に最も古いエントリを削除
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
          this.emit('cache:evicted', { filePath: oldestKey });
        }
      }

      this.cache.set(filePath, {
        config,
        timestamp: stats.mtimeMs,
        hash
      });

      this.emit('cache:set', { filePath, config });
    } catch (error) {
      this.emit('cache:error', { filePath, error: error as Error });
      throw error;
    }
  }

  /**
   * キャッシュの有効性確認
   */
  async isValid(filePath: string): Promise<boolean> {
    const cached = this.cache.get(filePath);
    if (!cached) return false;

    try {
      const stats = fs.statSync(filePath);
      return stats.mtimeMs <= cached.timestamp;
    } catch {
      return false;
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(filePath?: string): void {
    if (filePath) {
      const deleted = this.cache.delete(filePath);
      if (deleted) {
        this.emit('cache:cleared', { filePath });
      }
    } else {
      const size = this.cache.size;
      this.cache.clear();
      this.stats.totalRequests = 0;
      this.stats.cacheHits = 0;
      this.emit('cache:cleared-all', { clearedCount: size });
    }
  }

  /**
   * ファイル内容のハッシュ生成
   */
  private generateHash(content: string): string {
    if (!this.options.enableHashing) return '';
    
    // シンプルなハッシュ生成（CRC32のような複雑なものは不要）
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests) 
      : 0;

    return {
      cachedConfigs: this.cache.size,
      maxSize: this.options.maxSize || 100,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits
    };
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 指定ファイルのキャッシュが存在するかチェック
   */
  has(filePath: string): boolean {
    return this.cache.has(filePath);
  }

  /**
   * 全てのキャッシュキーを取得
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}