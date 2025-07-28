# TASK-003: SystemInitializer修正

## 🎯 タスク概要
**責務**: SystemInitializerクラスの不適切なコンストラクタ引数を修正  
**現状問題**: initializeComponents()に不適切な引数が渡されている  
**依存**: TASK-001, TASK-002と並列実行可能

## 📄 必須事前確認
1. **REQUIREMENTS.md読み込み**: システム初期化の適切な方針理解
2. **現状把握**: SystemInitializerクラスの現在の実装確認

## 📂 実装対象
**編集ファイル**: `src/core/system-initializer.ts`

## 🔧 修正内容

### 1. initializeComponents()メソッド修正
現在のメソッドシグネチャを確認し、不適切な引数を修正：

```typescript
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
```

### 2. 不適切な引数受け渡しの修正
- main.tsからの関数渡しを削除
- シンプルな設定オブジェクトのみを受け取るように修正
- 循環依存の排除

### 3. エラーハンドリング改善
```typescript
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
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的な初期化処理のみ
- ✅ **確実な動作**: 循環依存を避けた安全な設計
- 🚫 **複雑な依存関係禁止**: シンプルな依存関係のみ
- 🚫 **過剰な設定機能禁止**: 必要最小限の設定管理

## ✅ 完了条件
1. `src/core/system-initializer.ts` の修正完了
2. 不適切な引数の除去完了
3. TypeScript エラーなし
4. main.tsとの適切な連携確認

## 📄 出力管理
**報告書出力先**: `tasks/20250724_134201_main_emergency_fix/reports/REPORT-003-system-initializer-fix.md`

**報告書内容**:
- 修正前後の比較
- 引数修正の詳細
- 循環依存解決の確認