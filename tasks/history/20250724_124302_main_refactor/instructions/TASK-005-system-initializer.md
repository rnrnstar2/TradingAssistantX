# TASK-005: SystemInitializer クラス作成

## 🎯 タスク概要
**責務**: システム・コンポーネント初期化機能の独立クラス化  
**対象**: src/main.ts の 86-148行の初期化機能を分離  
**依存**: TASK-004 ComponentContainer 完了必須

## 📂 実装対象
**新規作成ファイル**: `src/core/system-initializer.ts`

## 🔧 実装内容

### 1. SystemInitializer クラス実装
```typescript
import { Logger, systemLogger } from '../shared/logger';
import { Config } from '../shared/config';
import { ComponentContainer, COMPONENT_KEYS } from './component-container';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';
import { DecisionEngine } from '../claude/decision-engine';
import { ContentGenerator } from '../claude/content-generator';
import { PostAnalyzer } from '../claude/post-analyzer';
import { KaitoApiClient } from '../kaito-api/client';
import { SearchEngine } from '../kaito-api/search-engine';
import { ActionExecutor } from '../kaito-api/action-executor';
import { DataManager } from '../data/data-manager';

export class SystemInitializer {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * 全コンポーネントを初期化してコンテナに登録
   */
  initializeComponents(config: Config): ComponentContainer {
    const container = new ComponentContainer();

    // 基本コンポーネント作成
    const scheduler = new CoreScheduler();
    const mainLoop = new MainLoop();
    const decisionEngine = new DecisionEngine();
    const contentGenerator = new ContentGenerator();
    const postAnalyzer = new PostAnalyzer();
    const kaitoClient = new KaitoApiClient();
    const searchEngine = new SearchEngine();
    const actionExecutor = new ActionExecutor(kaitoClient);
    const dataManager = new DataManager();

    // コンテナに登録
    container.register(COMPONENT_KEYS.SCHEDULER, scheduler);
    container.register(COMPONENT_KEYS.MAIN_LOOP, mainLoop);
    container.register(COMPONENT_KEYS.DECISION_ENGINE, decisionEngine);
    container.register(COMPONENT_KEYS.CONTENT_GENERATOR, contentGenerator);
    container.register(COMPONENT_KEYS.POST_ANALYZER, postAnalyzer);
    container.register(COMPONENT_KEYS.KAITO_CLIENT, kaitoClient);
    container.register(COMPONENT_KEYS.SEARCH_ENGINE, searchEngine);
    container.register(COMPONENT_KEYS.ACTION_EXECUTOR, actionExecutor);
    container.register(COMPONENT_KEYS.DATA_MANAGER, dataManager);
    container.register(COMPONENT_KEYS.CONFIG, config);

    this.logger.info('📦 コンポーネント初期化完了');
    return container;
  }

  /**
   * システム初期化プロセス実行
   */
  async initialize(container: ComponentContainer): Promise<void> {
    try {
      this.logger.info('⚙️ システム初期化中...');

      const config = container.get<Config>(COMPONENT_KEYS.CONFIG);
      const dataManager = container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);

      // 設定システム初期化
      await config.initialize();

      // データマネージャー初期化
      await this.initializeDataManager(dataManager);

      // KaitoAPI認証
      await kaitoClient.authenticate();

      // 接続テスト
      const connectionOk = await kaitoClient.testConnection();
      if (!connectionOk) {
        throw new Error('KaitoAPI connection test failed');
      }

      this.logger.success('✅ システム初期化完了');

    } catch (error) {
      this.logger.error('❌ システム初期化失敗:', error);
      throw error;
    }
  }

  private async initializeDataManager(dataManager: DataManager): Promise<void> {
    try {
      // データベース健全性チェック
      const healthCheck = await dataManager.performHealthCheck();
      
      if (healthCheck.errors.length > 0) {
        this.logger.warn('⚠️ Data health check issues found:', healthCheck.errors);
      }

      // 古いデータのクリーンアップ
      await dataManager.cleanupOldData(30);

      this.logger.info('✅ DataManager初期化完了');

    } catch (error) {
      this.logger.error('❌ DataManager初期化失敗:', error);
      throw error;
    }
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的な初期化処理のみ
- ✅ **確実な動作**: 既存ロジックの単純移行、機能追加なし
- 🚫 **複雑な初期化シーケンス禁止**: 最小限の初期化処理のみ
- 🚫 **診断・統計機能禁止**: 初期化時間測定・詳細レポート等は含めない

## ✅ 完了条件
1. `src/core/system-initializer.ts` ファイル作成完了
2. TypeScript エラーなし (npm run typecheck)
3. ESLint エラーなし (npm run lint)
4. 既存のmain.tsの初期化機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-005-system-initializer.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- コンポーネント初期化・システム初期化の動作確認