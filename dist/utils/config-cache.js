import * as fs from 'fs';
import { EventEmitter } from 'events';
/**
 * 設定データのキャッシュ管理を専門に担当
 * Single Responsibilityに準拠し、キャッシュ機能のみに集中
 */
export class ConfigCache extends EventEmitter {
    options;
    cache = new Map();
    stats = {
        totalRequests: 0,
        cacheHits: 0
    };
    constructor(options = {}) {
        super();
        this.options = options;
        this.options = {
            maxSize: 100,
            enableHashing: true,
            ...options
        };
    }
    /**
     * キャッシュからデータを取得
     */
    async get(filePath) {
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
        return cached.config;
    }
    /**
     * データをキャッシュに保存
     */
    async set(filePath, config) {
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
        }
        catch (error) {
            this.emit('cache:error', { filePath, error: error });
            throw error;
        }
    }
    /**
     * キャッシュの有効性確認
     */
    async isValid(filePath) {
        const cached = this.cache.get(filePath);
        if (!cached)
            return false;
        try {
            const stats = fs.statSync(filePath);
            return stats.mtimeMs <= cached.timestamp;
        }
        catch {
            return false;
        }
    }
    /**
     * キャッシュをクリア
     */
    clear(filePath) {
        if (filePath) {
            const deleted = this.cache.delete(filePath);
            if (deleted) {
                this.emit('cache:cleared', { filePath });
            }
        }
        else {
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
    generateHash(content) {
        if (!this.options.enableHashing)
            return '';
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
    getStats() {
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
    size() {
        return this.cache.size;
    }
    /**
     * 指定ファイルのキャッシュが存在するかチェック
     */
    has(filePath) {
        return this.cache.has(filePath);
    }
    /**
     * 全てのキャッシュキーを取得
     */
    keys() {
        return Array.from(this.cache.keys());
    }
}
