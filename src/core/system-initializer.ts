import { Logger, systemLogger } from '../shared/logger';
import { Config } from '../shared/config';
import { ComponentContainer, COMPONENT_KEYS } from './component-container';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';
import { ClaudeDecisionEngine } from '../claude/decision-engine';
import { MarketAnalyzer } from '../claude/market-analyzer';
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
    const contentGenerator = new ContentGenerator();
    const postAnalyzer = new PostAnalyzer();
    const kaitoClient = new KaitoApiClient();
    const searchEngine = new SearchEngine();
    const marketAnalyzer = new MarketAnalyzer(searchEngine, kaitoClient);
    const decisionEngine = new ClaudeDecisionEngine(searchEngine, kaitoClient, marketAnalyzer);
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