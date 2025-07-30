import { readFileSync, existsSync, statSync } from 'fs';
import { load } from 'js-yaml';
import { 
  ScheduleConfig, 
  ScheduleItem, 
  ScheduleLoadError, 
  ConfigValidationError,
  isValidScheduleConfig,
  isValidScheduleItem,
  isValidTimeFormat 
} from './types';

/**
 * スケジュール設定ローダー - YAML設定ファイルの読み込み・検証・キャッシュ機能
 */
export class ScheduleLoader {
  private static configCache: Map<string, { 
    config: ScheduleConfig; 
    timestamp: number; 
    fileModified: number;
  }> = new Map();

  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分間のキャッシュ

  /**
   * スケジュール設定の読み込み
   * @param path 設定ファイルのパス（デフォルト: data/config/schedule.yaml）
   * @returns 検証済みのScheduleConfig
   * @throws ScheduleLoadError ファイル読み込み・解析エラー時
   * @throws ConfigValidationError 設定検証エラー時
   */
  static load(path: string = 'data/config/schedule.yaml'): ScheduleConfig {
    const startTime = Date.now();
    
    try {
      console.log(`📄 スケジュール設定読み込み開始: ${path}`);
      
      // ファイル存在確認
      if (!existsSync(path)) {
        throw new ScheduleLoadError(`設定ファイルが見つかりません: ${path}`);
      }

      // キャッシュ確認
      const cachedConfig = this.getCachedConfig(path);
      if (cachedConfig) {
        const loadTime = Date.now() - startTime;
        console.log(`📋 キャッシュからスケジュール読み込み完了: ${loadTime}ms`);
        return cachedConfig;
      }

      // ファイル読み込み
      const content = readFileSync(path, 'utf8');
      
      // YAML解析
      const yamlContent = load(content);
      if (!yamlContent) {
        throw new ScheduleLoadError('YAML解析結果が空です');
      }

      // 構造検証とキャスト
      const config = this.validateAndCastConfig(yamlContent);
      
      // キャッシュに保存
      this.setCachedConfig(path, config);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ スケジュール設定読み込み完了: ${config.daily_schedule.length}件, ${loadTime}ms`);
      
      return config;
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ スケジュール設定読み込みエラー: ${loadTime}ms`);
      
      if (error instanceof ScheduleLoadError || error instanceof ConfigValidationError) {
        throw error;
      }
      
      // 予期しないエラーの場合
      throw new ScheduleLoadError(
        `設定ファイル読み込み中に予期しないエラーが発生しました: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 本日のスケジュール取得（時刻順ソート済み）
   * @param config スケジュール設定
   * @returns 検証済み・時刻順ソート済みのScheduleItem配列
   */
  static getTodaySchedule(config: ScheduleConfig): ScheduleItem[] {
    try {
      console.log(`📅 本日のスケジュール処理開始: ${config.daily_schedule.length}件`);
      
      // 各ScheduleItemの検証
      const validatedItems = this.validateScheduleItems(config.daily_schedule);
      
      // 時刻順ソート
      const sortedItems = validatedItems.sort((a, b) => a.time.localeCompare(b.time));
      
      // 重複チェック
      this.checkDuplicateTimes(sortedItems);
      
      console.log(`📋 本日のスケジュール処理完了: ${sortedItems.length}件（時刻順ソート済み）`);
      
      return sortedItems;
      
    } catch (error) {
      console.error(`❌ スケジュール処理エラー:`, error);
      throw new ConfigValidationError(
        `スケジュール処理中にエラーが発生しました: ${(error as Error).message}`
      );
    }
  }

  /**
   * キャッシュクリア（テスト・デバッグ用）
   */
  static clearCache(): void {
    this.configCache.clear();
    console.log('🗑️  スケジュール設定キャッシュをクリアしました');
  }

  // ====================================================================
  // PRIVATE METHODS
  // ====================================================================

  /**
   * キャッシュされた設定の取得
   */
  private static getCachedConfig(path: string): ScheduleConfig | null {
    const cached = this.configCache.get(path);
    if (!cached) return null;

    // TTL確認
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.configCache.delete(path);
      return null;
    }

    // ファイル更新時刻確認
    try {
      const fileModified = statSync(path).mtime.getTime();
      if (fileModified > cached.fileModified) {
        this.configCache.delete(path);
        return null;
      }
    } catch (error) {
      // ファイル確認エラーの場合はキャッシュ削除
      this.configCache.delete(path);
      return null;
    }

    return cached.config;
  }

  /**
   * 設定のキャッシュ保存
   */
  private static setCachedConfig(path: string, config: ScheduleConfig): void {
    try {
      const fileModified = statSync(path).mtime.getTime();
      this.configCache.set(path, {
        config,
        timestamp: Date.now(),
        fileModified
      });
    } catch (error) {
      // キャッシュ保存失敗は非致命的エラー
      console.warn(`⚠️  設定キャッシュ保存に失敗: ${(error as Error).message}`);
    }
  }

  /**
   * 設定の構造検証とキャスト
   */
  private static validateAndCastConfig(content: any): ScheduleConfig {
    // 基本的な型チェック
    if (!content || typeof content !== 'object') {
      throw new ConfigValidationError('設定ファイルの構造が不正です（オブジェクトではありません）');
    }

    // daily_schedule フィールドの確認
    if (!content.daily_schedule) {
      throw new ConfigValidationError('daily_schedule フィールドが見つかりません');
    }

    if (!Array.isArray(content.daily_schedule)) {
      throw new ConfigValidationError('daily_schedule は配列である必要があります');
    }

    // 型ガードを使った厳密な検証
    if (!isValidScheduleConfig(content)) {
      throw new ConfigValidationError('設定ファイルの構造が ScheduleConfig インターフェースに適合しません');
    }

    return content as ScheduleConfig;
  }

  /**
   * 各ScheduleItemの詳細検証
   */
  private static validateScheduleItems(items: any[]): ScheduleItem[] {
    const validatedItems: ScheduleItem[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // ScheduleItem型検証
        if (!isValidScheduleItem(item)) {
          throw new ConfigValidationError(`スケジュールアイテム[${i}]の構造が無効です`);
        }

        // 時刻フォーマット検証（再確認）
        if (!isValidTimeFormat(item.time)) {
          throw new ConfigValidationError(
            `スケジュールアイテム[${i}]の時刻フォーマットが無効です: ${item.time} （HH:MM形式である必要があります）`
          );
        }

        // アクション固有の検証
        this.validateActionSpecificFields(item, i);
        
        validatedItems.push(item);
        
      } catch (error) {
        console.error(`❌ スケジュールアイテム[${i}]検証エラー:`, error);
        throw error;
      }
    }
    
    return validatedItems;
  }

  /**
   * アクション固有フィールドの検証
   */
  private static validateActionSpecificFields(item: ScheduleItem, index: number): void {
    switch (item.action) {
      case 'post':
        // postアクションにはtopicが推奨
        if (!item.topic) {
          console.warn(`⚠️  スケジュールアイテム[${index}]: postアクションですがtopicが未設定です`);
        }
        break;
        
      case 'retweet':
      case 'quote_tweet':
        // retweet/quote_tweetにはtarget_queryが推奨
        if (!item.target_query) {
          console.warn(`⚠️  スケジュールアイテム[${index}]: ${item.action}アクションですがtarget_queryが未設定です`);
        }
        break;
        
      case 'like':
        // likeアクションには特別な検証なし
        break;
        
      case 'follow':
        // followアクションにはtarget_queryが推奨
        if (!item.target_query) {
          console.warn(`⚠️  スケジュールアイテム[${index}]: ${item.action}アクションですがtarget_queryが未設定です`);
        }
        break;
        
      case 'analyze':
        // analyzeアクションには特別な検証なし（深夜分析専用）
        break;
        
      default:
        throw new ConfigValidationError(
          `スケジュールアイテム[${index}]: 未対応のアクション種別です: ${item.action}`
        );
    }
  }

  /**
   * 重複時刻のチェック
   */
  private static checkDuplicateTimes(items: ScheduleItem[]): void {
    const timeMap = new Map<string, number>();
    
    for (let i = 0; i < items.length; i++) {
      const time = items[i].time;
      const existingIndex = timeMap.get(time);
      
      if (existingIndex !== undefined) {
        throw new ConfigValidationError(
          `重複した実行時刻が検出されました: ${time} （インデックス: ${existingIndex}, ${i}）`
        );
      }
      
      timeMap.set(time, i);
    }
  }
}