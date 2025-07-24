# TASK-004: ComponentContainer クラス作成

## 🎯 タスク概要
**責務**: 依存性注入コンテナの実装  
**対象**: 新規機能（main.tsのコンポーネント管理を改善）

## 📂 実装対象
**新規作成ファイル**: `src/core/component-container.ts`

## 🔧 実装内容

### 1. ComponentContainer クラス実装
```typescript
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
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的なDIコンテナ機能のみ
- ✅ **確実な動作**: シンプルなMap based実装
- 🚫 **複雑なDI機能禁止**: 自動注入・スコープ管理・ファクトリー等は含めない
- 🚫 **過剰な最適化禁止**: パフォーマンス最適化は行わない

## ✅ 完了条件
1. `src/core/component-container.ts` ファイル作成完了
2. TypeScript エラーなし (npm run typecheck)  
3. ESLint エラーなし (npm run lint)
4. 基本的なregister/get機能の動作確認

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-004-component-container.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 基本機能（register/get/has）の動作確認