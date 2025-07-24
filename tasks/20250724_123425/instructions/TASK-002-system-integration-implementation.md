# TASK-002: システム統合・動作統合実装 - ActionExecutor & SearchEngine実API連携

## 🎯 **実装目標**
ActionExecutorとSearchEngineの実API連携を完全実装し、TASK-001で作成されたKaitoAPI Coreクライアントとの統合により、30分間隔自動実行システムを完全動作させる。

## 📋 **必須要件確認**
- **ROLE**: Worker権限での実装作業
- **依存関係**: TASK-001（KaitoAPI Core実装）完了後に実行
- **出力先**: `src/kaito-api/`および`src/claude/`配下
- **制約**: 実データ（REAL_DATA_MODE=true）のみ、Mock実装完全排除

## 🔧 **実装対象ファイル**

### 既存ファイル更新
1. **`src/kaito-api/action-executor.ts`** - 実API連携への完全移行
2. **`src/kaito-api/search-engine.ts`** - 実API検索統合実装
3. **`src/claude/decision-engine.ts`** - 統合後の判断ロジック最適化

### 新規作成（必要に応じて）
4. **`src/kaito-api/services/integration-service.ts`** - 統合管理サービス
5. **`src/kaito-api/utils/api-response-parser.ts`** - API応答解析ユーティリティ

## 🚨 **最優先実装タスク**

### Phase 1: ActionExecutor実API統合
```typescript
// src/kaito-api/action-executor.ts の緊急実装項目

class ActionExecutor {
  // 🔥 実API統合への完全移行
  private async handlePost(action: PostAction): Promise<ActionResult> {
    // Mock実装 → 実API実装への置換
    // TASK-001で実装されたKaitoClientの実際のAPI呼び出し使用
    const result = await this.kaitoClient.executeRealPost(action.content);
    return this.processRealApiResponse(result);
  }

  private async handleRetweet(action: RetweetAction): Promise<ActionResult> {
    // 実際のRT API統合
    const result = await this.kaitoClient.executeRealRetweet(action.tweetId);
    return this.processRealApiResponse(result);
  }

  private async handleLike(action: LikeAction): Promise<ActionResult> {
    // 実際のいいねAPI統合
    const result = await this.kaitoClient.executeRealLike(action.tweetId);
    return this.processRealApiResponse(result);
  }

  // 🔥 実API応答処理システム
  private processRealApiResponse(apiResponse: any): ActionResult {
    // 実際のKaitoAPI応答形式に基づく処理
    // エラーハンドリング、成功判定、メトリクス収集
  }
}
```

### Phase 2: SearchEngine実API統合
```typescript
// src/kaito-api/search-engine.ts の実装項目

class SearchEngine {
  // 🔥 Mock検索 → 実API検索への置換
  private async executeMockSearch() → executeRealSearch() {
    // TASK-001のKaitoClientを使用した実際の検索API呼び出し
    const results = await this.kaitoClient.searchTweets(query);
    return this.processSearchResults(results);
  }

  // 🔥 投資教育フィルタの実データ適用
  private async filterInvestmentEducationContent(results: SearchResult[]): Promise<SearchResult[]> {
    // 実際の検索結果に対する投資教育コンテンツフィルタリング
    // INVESTMENT_KEYWORDSの実データへの適用
  }

  // 🔥 実API応答に基づくエンゲージメント分析
  private async analyzeEngagement(tweet: TweetData): Promise<EngagementAnalysis> {
    // 実際のAPI応答データを使用した分析
    // Mockデータではなく実際のRT数、いいね数、リプライ数での分析
  }
}
```

## 📊 **統合システム仕様**

### ActionExecutor ⇔ KaitoClient統合
```typescript
interface RealActionExecution {
  // TASK-001で実装されたclientとの統合
  client: KaitoApiClient;          // 実API統合済みクライアント
  endpoints: {
    tweet: TweetEndpoints;         // ツイート関連実API
    engagement: EngagementEndpoints; // エンゲージメント実API
    user: UserEndpoints;           // ユーザー関連実API
  };
  
  // 実API実行結果の処理
  processApiResult(result: ApiResponse): ActionResult;
  handleApiError(error: ApiError): ErrorResult;
  trackRealMetrics(action: Action, result: ActionResult): void;
}
```

### SearchEngine ⇔ KaitoClient統合
```typescript
interface RealSearchIntegration {
  // 実際の検索API統合
  searchTweets(query: string): Promise<RealTweetResult[]>;
  searchUsers(query: string): Promise<RealUserResult[]>;
  getTrends(location?: string): Promise<RealTrendResult[]>;
  
  // 実データに基づく分析
  analyzeRealContent(content: TweetData): Promise<ContentAnalysis>;
  calculateRealEngagement(metrics: RealMetrics): EngagementScore;
}
```

## 🔥 **実装優先順位**

### P0 (即座実装必須)
1. **ActionExecutor実API統合**: handlePost/Retweet/Like の実API実装
2. **SearchEngine実API統合**: executeMockSearch → executeRealSearch
3. **エラーハンドリング統合**: 実API固有エラーへの対応

### P1 (24時間以内)
4. **統合テスト実装**: 全コンポーネント連携動作確認
5. **メトリクス統合**: 実データに基づく成果測定
6. **30分スケジューラ統合**: CoreSchedulerとの完全連携

### P2 (72時間以内)
7. **パフォーマンス最適化**: 実API環境での最適化
8. **監視システム統合**: 実運用での監視・アラート

## ⚠️ **統合実装制約**

### 🚫 絶対禁止事項
- Mock実装の残存（executeMock*メソッドの継続使用）
- 実API以外のデータソース使用
- TASK-001未完了での実装開始
- 統合テスト未実施でのリリース

### ✅ 統合実装原則
- TASK-001実装クライアントとの完全統合
- 実際のAPI応答形式に基づく処理
- エラーチェーン全体の一貫性維持
- メトリクス・ログの統合管理

## 🎯 **統合実装仕様**

### Phase 1: 基本統合実装
```typescript
// ActionExecutor統合例
export class ActionExecutor {
  constructor(
    private kaitoClient: KaitoApiClient, // TASK-001で実装済み
    private decisionEngine: DecisionEngine,
    private dataManager: DataManager
  ) {}

  async executeActions(actions: Action[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const action of actions) {
      try {
        // 実API実行（Mock排除）
        const apiResult = await this.executeRealAction(action);
        const processedResult = this.processApiResult(apiResult);
        results.push(processedResult);
        
        // 実データ学習
        await this.updateLearningData(action, processedResult);
        
      } catch (error) {
        const errorResult = this.handleRealApiError(error);
        results.push(errorResult);
      }
    }
    
    return results;
  }

  private async executeRealAction(action: Action): Promise<ApiResponse> {
    switch (action.type) {
      case 'post':
        return await this.kaitoClient.executeRealPost(action.content);
      case 'retweet':
        return await this.kaitoClient.executeRealRetweet(action.tweetId);
      case 'like':
        return await this.kaitoClient.executeRealLike(action.tweetId);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }
}
```

### Phase 2: 統合最適化実装
```typescript
// SearchEngine統合例
export class SearchEngine {
  constructor(
    private kaitoClient: KaitoApiClient, // TASK-001統合
    private cacheManager: CacheManager
  ) {}

  async searchInvestmentContent(query: string): Promise<InvestmentSearchResult[]> {
    // 実API検索実行
    const rawResults = await this.kaitoClient.searchTweets(query);
    
    // 投資教育フィルタ適用（実データ）
    const filteredResults = this.filterInvestmentEducation(rawResults);
    
    // 実エンゲージメント分析
    const analyzedResults = await this.analyzeRealEngagement(filteredResults);
    
    // キャッシュ更新（実データ）
    await this.updateRealDataCache(query, analyzedResults);
    
    return analyzedResults;
  }

  private filterInvestmentEducation(results: RawSearchResult[]): FilteredResult[] {
    return results.filter(result => {
      // 実際のツイート内容での投資教育判定
      return this.isInvestmentEducationalContent(result.text);
    });
  }
}
```

## 📈 **統合品質基準**

### 統合テスト要件
- [ ] ActionExecutor ⇔ KaitoClient連携: 100%成功
- [ ] SearchEngine ⇔ KaitoClient連携: 100%成功
- [ ] エラーハンドリング統合: 全エラーケース対応
- [ ] 30分スケジューラ統合: タイミング同期確認

### パフォーマンス統合基準
- API連携応答時間: 3秒以内
- 統合処理スループット: 10アクション/分
- メモリ使用量統合: 150MB以内
- CPU使用率統合: 30%以内

### データ整合性基準
- 実データ使用率: 100%（Mock使用率: 0%）
- API応答データ活用率: 100%
- 学習データ更新: リアルタイム同期
- メトリクス精度: 99%以上

## 🔄 **統合実装フロー**

1. **TASK-001完了確認**: KaitoClient実API統合の検証
2. **Phase 1統合開始**: ActionExecutor実API連携実装
3. **Phase 2統合実装**: SearchEngine実API連携実装
4. **統合テスト実行**: 全コンポーネント連携確認
5. **30分スケジューラ統合**: 実運用環境での動作確認
6. **品質検証**: lint/type-check/統合テスト実行
7. **統合完了報告**: REPORT-002作成

## 📋 **統合実装完了基準**

### 機能統合要件
- [ ] 実際のTwitter投稿がActionExecutor経由で成功
- [ ] 実際のTwitter検索がSearchEngine経由で成功
- [ ] 全コンポーネントがエラーなく連携動作
- [ ] 30分間隔での自動実行が完全動作

### 技術統合要件
- [ ] Mock実装が完全に排除されている
- [ ] 実API応答データが全処理で活用されている
- [ ] エラーハンドリングが統合的に動作
- [ ] TypeScript strict mode完全準拠

### システム統合要件
- [ ] MainLoop ⇔ ActionExecutor連携完了
- [ ] DecisionEngine ⇔ SearchEngine連携完了
- [ ] DataManager ⇔ 全コンポーネント統合完了
- [ ] 学習システムが実データで動作

## 📋 **報告書作成要件**

実装完了後、以下を含む統合完了報告書を作成：
- 統合実装の詳細と検証結果
- Mock排除の完了確認
- 実API連携の動作確認結果
- パフォーマンス・品質指標の達成状況
- 統合システムの総合評価

---

**統合完了により、TradingAssistantXが完全に実動作する自動投稿システムとして完成し、MVP要件を100%満たすシステムが実現されます。**