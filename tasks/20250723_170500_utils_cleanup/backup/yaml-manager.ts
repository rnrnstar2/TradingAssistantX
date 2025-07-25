import { loadYamlArraySafe, loadYamlAsync, writeYamlAsync } from './yaml-utils';
import { promises as fs, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';

/**
 * YAML設定ファイルの統一的な読み書きを管理するマネージャークラス
 * 既存のyaml-utils.tsの機能を包含し、より高レベルなAPIを提供
 */

export interface YamlValidationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: string[];
  properties?: Record<string, YamlValidationSchema>;
  items?: YamlValidationSchema;
}

export interface YamlCacheEntry<T> {
  data: T;
  timestamp: number;
  filePath: string;
  lastModified: number;
}

export interface YamlManagerOptions {
  enableCache?: boolean;
  cacheMaxAge?: number; // ミリ秒
  rootPath?: string;
  autoCreateDirectories?: boolean;
}

export interface YamlLoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  filePath: string;
}

export interface YamlSaveResult {
  success: boolean;
  error?: string;
  filePath: string;
  backupCreated?: boolean;
}

/**
 * YamlManagerインターフェース
 */
export interface YamlManagerInterface {
  loadConfig<T>(filePath: string, schema?: YamlValidationSchema): Promise<YamlLoadResult<T>>;
  saveConfig<T>(filePath: string, data: T, createBackup?: boolean): Promise<YamlSaveResult>;
  reloadConfig<T>(filePath: string, schema?: YamlValidationSchema): Promise<YamlLoadResult<T>>;
  validateConfig(filePath: string, schema: YamlValidationSchema): Promise<boolean>;
  clearCache(filePath?: string): void;
  getCacheStats(): { size: number; entries: string[] };
}

/**
 * YAML設定管理クラス
 */
export class YamlManager implements YamlManagerInterface {
  private cache = new Map<string, YamlCacheEntry<any>>();
  private readonly options: Required<YamlManagerOptions>;

  constructor(options: YamlManagerOptions = {}) {
    this.options = {
      enableCache: true,
      cacheMaxAge: 5 * 60 * 1000, // 5分
      rootPath: 'data',
      autoCreateDirectories: true,
      ...options
    };
  }

  /**
   * 設定ファイルを読み込み
   */
  async loadConfig<T>(filePath: string, schema?: YamlValidationSchema): Promise<YamlLoadResult<T>> {
    const fullPath = this.resolvePath(filePath);
    
    try {
      // キャッシュチェック
      if (this.options.enableCache) {
        const cached = this.getCachedConfig<T>(fullPath);
        if (cached) {
          return {
            success: true,
            data: cached,
            fromCache: true,
            filePath: fullPath
          };
        }
      }

      // ファイル存在確認
      if (!existsSync(fullPath)) {
        return {
          success: false,
          error: `ファイルが存在しません: ${fullPath}`,
          filePath: fullPath
        };
      }

      // ファイル読み込み
      const data = await loadYamlAsync<T>(fullPath);
      
      if (data === null) {
        return {
          success: false,
          error: `YAMLファイルの読み込みに失敗しました: ${fullPath}`,
          filePath: fullPath
        };
      }

      // スキーマ検証
      if (schema && !this.validateData(data, schema)) {
        return {
          success: false,
          error: `スキーマ検証に失敗しました: ${fullPath}`,
          filePath: fullPath
        };
      }

      // キャッシュに保存
      if (this.options.enableCache) {
        this.setCachedConfig(fullPath, data);
      }

      return {
        success: true,
        data,
        fromCache: false,
        filePath: fullPath
      };

    } catch (error) {
      return {
        success: false,
        error: `設定ファイル読み込みエラー: ${error instanceof Error ? error.message : String(error)}`,
        filePath: fullPath
      };
    }
  }

  /**
   * 配列型YAMLファイルを読み込み
   */
  async loadConfigArray<T>(filePath: string, schema?: YamlValidationSchema): Promise<YamlLoadResult<T[]>> {
    const fullPath = this.resolvePath(filePath);
    
    try {
      // キャッシュチェック
      if (this.options.enableCache) {
        const cached = this.getCachedConfig<T[]>(fullPath);
        if (cached) {
          return {
            success: true,
            data: cached,
            fromCache: true,
            filePath: fullPath
          };
        }
      }

      // ファイル読み込み
      const data = loadYamlArraySafe<T>(fullPath);
      
      // スキーマ検証
      if (schema && !this.validateData(data, schema)) {
        return {
          success: false,
          error: `スキーマ検証に失敗しました: ${fullPath}`,
          filePath: fullPath
        };
      }

      // キャッシュに保存
      if (this.options.enableCache) {
        this.setCachedConfig(fullPath, data);
      }

      return {
        success: true,
        data,
        fromCache: false,
        filePath: fullPath
      };

    } catch (error) {
      return {
        success: false,
        error: `設定ファイル読み込みエラー: ${error instanceof Error ? error.message : String(error)}`,
        filePath: fullPath
      };
    }
  }

  /**
   * 設定ファイルを保存
   */
  async saveConfig<T>(filePath: string, data: T, createBackup = false): Promise<YamlSaveResult> {
    const fullPath = this.resolvePath(filePath);
    
    try {
      // ディレクトリ自動作成
      if (this.options.autoCreateDirectories) {
        const dir = dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
      }

      // バックアップ作成
      let backupCreated = false;
      if (createBackup && existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fs.copyFile(fullPath, backupPath);
        backupCreated = true;
      }

      // ファイル保存
      const success = await writeYamlAsync(fullPath, data);
      
      if (!success) {
        return {
          success: false,
          error: `YAMLファイルの保存に失敗しました: ${fullPath}`,
          filePath: fullPath
        };
      }

      // キャッシュ更新
      if (this.options.enableCache) {
        this.setCachedConfig(fullPath, data);
      }

      return {
        success: true,
        filePath: fullPath,
        backupCreated
      };

    } catch (error) {
      return {
        success: false,
        error: `設定ファイル保存エラー: ${error instanceof Error ? error.message : String(error)}`,
        filePath: fullPath
      };
    }
  }

  /**
   * 設定ファイルを再読み込み（キャッシュを無視）
   */
  async reloadConfig<T>(filePath: string, schema?: YamlValidationSchema): Promise<YamlLoadResult<T>> {
    const fullPath = this.resolvePath(filePath);
    
    // キャッシュクリア
    this.cache.delete(fullPath);
    
    // 再読み込み
    return await this.loadConfig<T>(filePath, schema);
  }

  /**
   * 設定ファイルのスキーマ検証
   */
  async validateConfig(filePath: string, schema: YamlValidationSchema): Promise<boolean> {
    const result = await this.loadConfig(filePath);
    if (!result.success || !result.data) {
      return false;
    }
    
    return this.validateData(result.data, schema);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(filePath?: string): void {
    if (filePath) {
      const fullPath = this.resolvePath(filePath);
      this.cache.delete(fullPath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * 複数の設定ファイルを一括読み込み
   */
  async loadMultipleConfigs<T>(filePaths: string[], schema?: YamlValidationSchema): Promise<Map<string, YamlLoadResult<T>>> {
    const results = new Map<string, YamlLoadResult<T>>();
    
    const promises = filePaths.map(async (filePath) => {
      const result = await this.loadConfig<T>(filePath, schema);
      return { filePath, result };
    });

    const resolvedPromises = await Promise.allSettled(promises);
    
    resolvedPromises.forEach((promise, index) => {
      const filePath = filePaths[index];
      if (promise.status === 'fulfilled') {
        results.set(filePath, promise.value.result);
      } else {
        results.set(filePath, {
          success: false,
          error: `一括読み込みエラー: ${promise.reason}`,
          filePath: this.resolvePath(filePath)
        });
      }
    });

    return results;
  }

  // プライベートメソッド

  private resolvePath(filePath: string): string {
    if (filePath.startsWith('/') || filePath.includes(':\\')) {
      return filePath;
    }
    return join(process.cwd(), this.options.rootPath, filePath);
  }

  private getCachedConfig<T>(filePath: string): T | null {
    const entry = this.cache.get(filePath);
    if (!entry) {
      return null;
    }

    // キャッシュの有効期限チェック
    if (Date.now() - entry.timestamp > this.options.cacheMaxAge) {
      this.cache.delete(filePath);
      return null;
    }

    // ファイル更新チェック
    try {
      const stats = statSync(filePath);
      if (stats.mtime.getTime() !== entry.lastModified) {
        this.cache.delete(filePath);
        return null;
      }
    } catch {
      // ファイルが存在しない場合はキャッシュを削除
      this.cache.delete(filePath);
      return null;
    }

    return entry.data;
  }

  private setCachedConfig<T>(filePath: string, data: T): void {
    try {
      const stats = statSync(filePath);
      this.cache.set(filePath, {
        data,
        timestamp: Date.now(),
        filePath,
        lastModified: stats.mtime.getTime()
      });
    } catch {
      // ファイルのstatが取得できない場合はキャッシュしない
    }
  }

  private validateData(data: any, schema: YamlValidationSchema): boolean {
    try {
      return this.validateDataRecursive(data, schema);
    } catch {
      return false;
    }
  }

  private validateDataRecursive(data: any, schema: YamlValidationSchema): boolean {
    // 型チェック
    switch (schema.type) {
      case 'object':
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          return false;
        }
        
        // 必須プロパティチェック
        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in data)) {
              return false;
            }
          }
        }
        
        // プロパティの再帰検証
        if (schema.properties) {
          for (const [key, childSchema] of Object.entries(schema.properties)) {
            if (key in data) {
              if (!this.validateDataRecursive(data[key], childSchema)) {
                return false;
              }
            }
          }
        }
        break;
        
      case 'array':
        if (!Array.isArray(data)) {
          return false;
        }
        
        // 配列要素の検証
        if (schema.items) {
          for (const item of data) {
            if (!this.validateDataRecursive(item, schema.items)) {
              return false;
            }
          }
        }
        break;
        
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number';
      case 'boolean':
        return typeof data === 'boolean';
      default:
        return false;
    }
    
    return true;
  }
}

// デフォルトインスタンスをエクスポート
export const defaultYamlManager = new YamlManager();

// 便利な関数をエクスポート（後方互換性のため）
export async function loadYamlWithManager<T>(filePath: string, schema?: YamlValidationSchema): Promise<T | null> {
  const result = await defaultYamlManager.loadConfig<T>(filePath, schema);
  return result.success ? result.data! : null;
}

export async function saveYamlWithManager<T>(filePath: string, data: T, createBackup = false): Promise<boolean> {
  const result = await defaultYamlManager.saveConfig(filePath, data, createBackup);
  return result.success;
}