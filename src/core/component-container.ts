import { Logger, systemLogger } from '../shared/logger';

export class ComponentContainer {
  private components: Map<string, any> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * コンポーネントを登録
   */
  register<T>(key: string, instance: T): void {
    if (this.components.has(key)) {
      this.logger.warn(`⚠️ Component '${key}' is being overwritten`);
    }

    this.components.set(key, instance);
    this.logger.debug(`📦 Component '${key}' registered`);
  }

  /**
   * コンポーネントを取得
   */
  get<T>(key: string): T {
    const component = this.components.get(key);
    
    if (!component) {
      throw new Error(`Component '${key}' not found in container`);
    }

    return component as T;
  }

  /**
   * コンポーネントの存在確認
   */
  has(key: string): boolean {
    return this.components.has(key);
  }

  /**
   * 全コンポーネント取得（デバッグ用）
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    
    this.components.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  /**
   * 登録済みコンポーネント名一覧取得
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * コンテナクリア（テスト用）
   */
  clear(): void {
    const keyCount = this.components.size;
    this.components.clear();
    this.logger.debug(`🧹 Container cleared (${keyCount} components removed)`);
  }
}

// よく使用されるコンポーネントキーの定数定義
export const COMPONENT_KEYS = {
  SCHEDULER: 'scheduler',
  MAIN_LOOP: 'mainLoop', 
  DECISION_ENGINE: 'decisionEngine',
  CONTENT_GENERATOR: 'contentGenerator',
  POST_ANALYZER: 'postAnalyzer',
  KAITO_CLIENT: 'kaitoClient',
  SEARCH_ENGINE: 'searchEngine',
  ACTION_EXECUTOR: 'actionExecutor',
  DATA_MANAGER: 'dataManager',
  CONFIG: 'config',
  HEALTH_CHECKER: 'healthChecker',
  SHUTDOWN_MANAGER: 'shutdownManager',
  SYSTEM_STATUS: 'systemStatus'
} as const;