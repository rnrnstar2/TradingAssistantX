import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { loadYamlSafe } from './yaml-utils';

/**
 * 設定変更イベントの型定義
 */
export interface ConfigChangeEvent<T = any> {
  filePath: string;
  config: T | null;
  previousConfig: T | null;
  error?: Error;
  timestamp: number;
}

/**
 * 設定管理オプション
 */
export interface ConfigManagerOptions {
  /** ファイル変更監視を有効にするか */
  enableWatching?: boolean;
  /** 設定ファイルのルートディレクトリ */
  rootPath?: string;
  /** 設定バリデーションを有効にするか */
  enableValidation?: boolean;
  /** キャッシュを有効にするか */
  enableCache?: boolean;
  /** ファイル変更検出のデバウンス時間（ミリ秒） */
  debounceMs?: number;
}

/**
 * 高度な設定管理システム
 * 動的読み込み、バリデーション、Hot Reload機能を提供
 */
export class ConfigManager extends EventEmitter {
  private configCache = new Map<string, { config: any; timestamp: number; hash: string }>();
  private watchers = new Map<string, FSWatcher>();
  private validators = new Map<string, (config: any) => Promise<boolean>>();
  private readonly options: Required<ConfigManagerOptions>;

  constructor(options: ConfigManagerOptions = {}) {
    super();
    this.options = {
      enableWatching: true,
      rootPath: 'data',
      enableValidation: true,
      enableCache: true,
      debounceMs: 300,
      ...options
    };

    this.setupErrorHandling();
  }

  /**
   * 設定ファイルを動的に読み込み
   */
  async loadConfig<T>(configPath: string): Promise<T | null> {
    const fullPath = this.resolvePath(configPath);
    const startTime = Date.now();

    try {
      // キャッシュチェック
      if (this.options.enableCache && await this.isCacheValid(fullPath)) {
        const cached = this.configCache.get(fullPath);
        if (cached) {
          this.emit('config:cache-hit', { filePath: fullPath, config: cached.config });
          return cached.config as T;
        }
      }

      // ファイル存在確認
      if (!fs.existsSync(fullPath)) {
        this.emit('config:not-found', { filePath: fullPath });
        return null;
      }

      // 設定読み込み
      const config = await this.readConfigFile<T>(fullPath);
      if (!config) {
        return null;
      }

      // バリデーション実行
      if (this.options.enableValidation && !await this.validateConfig(fullPath, config)) {
        this.emit('config:validation-failed', { filePath: fullPath, config });
        return null;
      }

      // キャッシュ更新
      if (this.options.enableCache) {
        await this.updateCache(fullPath, config);
      }

      // ファイル監視開始
      if (this.options.enableWatching && !this.watchers.has(fullPath)) {
        await this.watchConfigFile(fullPath);
      }

      const loadTime = Date.now() - startTime;
      this.emit('config:loaded', { 
        filePath: fullPath, 
        config, 
        loadTime,
        timestamp: Date.now()
      });

      return config as T;

    } catch (error) {
      this.emit('config:error', { 
        filePath: fullPath, 
        error: error as Error,
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * 設定ファイルを再読み込み
   */
  async reloadConfig<T>(configPath: string): Promise<T | null> {
    const fullPath = this.resolvePath(configPath);
    
    // キャッシュクリア
    this.configCache.delete(fullPath);
    
    // 再読み込み
    return await this.loadConfig<T>(configPath);
  }

  /**
   * 設定バリデーターを登録
   */
  registerValidator<T>(configPath: string, validator: (config: T) => Promise<boolean>): void {
    const fullPath = this.resolvePath(configPath);
    this.validators.set(fullPath, validator);
  }

  /**
   * 設定ファイルの監視を開始
   */
  async watchConfigFiles(patterns: string[] = ['**/*.yaml', '**/*.yml']): Promise<void> {
    const watchPatterns = patterns.map(pattern => 
      path.join(this.options.rootPath, pattern)
    );

    const watcher = chokidar.watch(watchPatterns, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('change', async (filePath) => {
        await this.handleFileChange(filePath);
      })
      .on('add', async (filePath) => {
        this.emit('config:file-added', { filePath, timestamp: Date.now() });
      })
      .on('unlink', (filePath) => {
        this.handleFileRemoved(filePath);
      })
      .on('error', (error) => {
        this.emit('config:watch-error', { error, timestamp: Date.now() });
      });

    this.watchers.set('global', watcher);
    this.emit('config:watching-started', { patterns: watchPatterns });
  }

  /**
   * 設定ファイル監視を停止
   */
  async stopWatching(): Promise<void> {
    const entries = Array.from(this.watchers.entries());
    for (const [path, watcher] of entries) {
      await watcher.close();
      this.watchers.delete(path);
    }
    this.emit('config:watching-stopped');
  }

  /**
   * 設定キャッシュをクリア
   */
  clearCache(configPath?: string): void {
    if (configPath) {
      const fullPath = this.resolvePath(configPath);
      this.configCache.delete(fullPath);
      this.emit('config:cache-cleared', { filePath: fullPath });
    } else {
      this.configCache.clear();
      this.emit('config:cache-cleared-all');
    }
  }

  /**
   * 設定統計情報を取得
   */
  getStats(): {
    cachedConfigs: number;
    activeWatchers: number;
    registeredValidators: number;
  } {
    return {
      cachedConfigs: this.configCache.size,
      activeWatchers: this.watchers.size,
      registeredValidators: this.validators.size
    };
  }

  /**
   * すべてのリソースをクリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.stopWatching();
    this.clearCache();
    this.validators.clear();
    this.removeAllListeners();
    this.emit('config:cleanup-completed');
  }

  // プライベートメソッド
  private resolvePath(configPath: string): string {
    if (path.isAbsolute(configPath)) {
      return configPath;
    }
    return path.join(process.cwd(), this.options.rootPath, configPath);
  }

  private async readConfigFile<T>(fullPath: string): Promise<T | null> {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const config = yaml.load(content) as T;
      return config;
    } catch (error) {
      this.emit('config:parse-error', { 
        filePath: fullPath, 
        error: error as Error,
        timestamp: Date.now()
      });
      return null;
    }
  }

  private async validateConfig(filePath: string, config: any): Promise<boolean> {
    const validator = this.validators.get(filePath);
    if (!validator) {
      return true; // バリデーターが登録されていない場合は通す
    }

    try {
      return await validator(config);
    } catch (error) {
      this.emit('config:validation-error', { 
        filePath, 
        config, 
        error: error as Error,
        timestamp: Date.now()
      });
      return false;
    }
  }

  private async isCacheValid(fullPath: string): Promise<boolean> {
    const cached = this.configCache.get(fullPath);
    if (!cached) return false;

    try {
      const stats = fs.statSync(fullPath);
      return stats.mtimeMs <= cached.timestamp;
    } catch {
      return false;
    }
  }

  private async updateCache(fullPath: string, config: any): Promise<void> {
    try {
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const hash = this.generateHash(content);

      this.configCache.set(fullPath, {
        config,
        timestamp: stats.mtimeMs,
        hash
      });
    } catch (error) {
      // キャッシュ更新エラーは無視（設定読み込み自体は成功している）
    }
  }

  private generateHash(content: string): string {
    // シンプルなハッシュ生成（CRC32のような複雑なものは不要）
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }

  private async watchConfigFile(fullPath: string): Promise<void> {
    if (this.watchers.has(fullPath)) return;

    const watcher = chokidar.watch(fullPath, {
      persistent: true,
      ignoreInitial: true
    });

    let timeoutId: NodeJS.Timeout;

    watcher.on('change', () => {
      // デバウンス処理
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        await this.handleFileChange(fullPath);
      }, this.options.debounceMs);
    });

    this.watchers.set(fullPath, watcher);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const previousConfig = this.configCache.get(filePath)?.config || null;
      
      // キャッシュクリアして再読み込み
      this.configCache.delete(filePath);
      const newConfig = await this.readConfigFile(filePath);

      const changeEvent: ConfigChangeEvent = {
        filePath,
        config: newConfig,
        previousConfig,
        timestamp: Date.now()
      };

      this.emit('config:changed', changeEvent);
      this.emit(`config:changed:${filePath}`, changeEvent);

    } catch (error) {
      this.emit('config:reload-error', { 
        filePath, 
        error: error as Error,
        timestamp: Date.now()
      });
    }
  }

  private handleFileRemoved(filePath: string): void {
    this.configCache.delete(filePath);
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close().catch((error) => {
        console.error(`❌ [設定管理] ファイル監視停止エラー (${filePath}):`, error);
      });
      this.watchers.delete(filePath);
    }
    this.emit('config:file-removed', { filePath, timestamp: Date.now() });
  }

  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('ConfigManager Error:', error);
    });

    // プロセス終了時のクリーンアップ
    const cleanup = async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('ConfigManager cleanup error:', error);
      }
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', () => {
      // 同期的なクリーンアップ
      const watchers = Array.from(this.watchers.values());
      for (const watcher of watchers) {
        void watcher.close(); // プロセス終了時はpromiseを無視
      }
    });
  }
}

// デフォルトインスタンスをエクスポート
export const defaultConfigManager = new ConfigManager();