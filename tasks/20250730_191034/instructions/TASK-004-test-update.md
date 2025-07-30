# TASK-004: テストファイル新構造対応

## 🎯 実装目標

引き継ぎ資料に基づくシステム簡素化（DataManager簡素化、学習データ2ファイル構成、ワークフロー適応）に対応したテストファイルの更新を行い、新構造での品質保証を確立する。

## 📋 テスト対象の変更点

### 🔧 主要な変更に対するテスト修正

#### 1. DataManager関連テスト
**変更内容**:
- 複雑なインターフェース削除（DailyInsight, TomorrowStrategy等）
- 深夜分析メソッド削除
- savePost()メソッドの新構造対応
- 学習データ2ファイル構成対応

**必要な修正**:
- 削除されたメソッドのテスト削除
- 新savePost()構造のテストケース追加
- 2ファイル学習データ読み込みテスト

#### 2. ワークフロー関連テスト
**変更内容**:
- 学習データ使用ロジックの簡素化
- データ保存ロジックの新構造対応
- コンテキスト構築の最適化

**必要な修正**:
- 新学習データ構造を使用するテストケース
- post.yaml統合保存のテスト
- 簡素化されたコンテキスト構築のテスト

## 🧪 修正対象ファイル

### 高優先度（並行実行可能）

#### `tests/kaito-api/integration/endpoints-integration-3layer.test.ts`
**修正内容**:
- DataManager連携部分の新構造対応
- 学習データ保存・読み込みテストの更新

#### `tests/kaito-api/integration/auth-flow-integration.test.ts`
**修正内容**:
- 認証フローでのデータ保存が新構造に対応

### 中優先度（並行実行可能）

#### 新規作成: `tests/shared/data-manager.test.ts`
**作成内容**:
- 簡素化されたDataManagerの包括的テスト
- 新savePost()メソッドのテストケース
- 2ファイル学習データ構成のテスト
- エラーハンドリングのテスト

#### 新規作成: `tests/workflows/main-workflow.test.ts`
**作成内容**:
- 新構造対応ワークフローのテスト
- 学習データ活用ロジックのテスト
- データ保存ロジックのテスト

## 🔧 具体的なテスト実装

### Phase 1: DataManager新構造テスト

#### savePost()メソッドテスト
```typescript
describe('DataManager.savePost()', () => {
  it('should save post data in new unified format', async () => {
    const dataManager = new DataManager();
    await dataManager.initializeExecutionCycle();
    
    const postData = {
      actionType: 'post' as const,
      content: 'Test investment content',
      result: { success: true, message: 'Posted successfully' },
      engagement: { likes: 5, retweets: 2, replies: 1 },
      claudeSelection: {
        score: 8.5,
        reasoning: 'High educational value',
        expectedImpact: 'high'
      }
    };
    
    await dataManager.savePost(postData);
    
    // post.yamlファイルの存在・構造確認
    const savedData = await loadPostYaml();
    expect(savedData.actionType).toBe('post');
    expect(savedData.content).toBe('Test investment content');
    expect(savedData.claudeSelection.score).toBe(8.5);
  });
});
```

#### 学習データ2ファイル構成テスト
```typescript
describe('DataManager Learning Data (2-file structure)', () => {
  it('should load engagement patterns correctly', async () => {
    const dataManager = new DataManager();
    const learningData = await dataManager.loadLearningData();
    
    expect(learningData.engagementPatterns).toBeDefined();
    expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    expect(learningData.successfulTopics).toBeDefined();
    expect(learningData.successfulTopics.topics).toBeArray();
  });
  
  it('should handle missing learning files gracefully', async () => {
    // ファイルが存在しない場合のフォールバック
    const learningData = await dataManager.loadLearningData();
    expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    expect(learningData.successfulTopics.topics).toEqual([]);
  });
});
```

### Phase 2: ワークフロー新構造テスト

#### 学習データ活用テスト
```typescript
describe('MainWorkflow Learning Data Integration', () => {
  it('should use 2-file learning structure effectively', async () => {
    const mockLearningData = {
      engagementPatterns: {
        timeSlots: {
          '07:00-10:00': { successRate: 0.85, avgEngagement: 4.2 }
        }
      },
      successfulTopics: {
        topics: [
          { topic: 'NISA活用法', successRate: 0.91, avgEngagement: 5.2 }
        ]
      }
    };
    
    // モックデータでワークフロー実行
    const result = await MainWorkflow.execute();
    
    expect(result.success).toBe(true);
    expect(result.decision.parameters.topic).toBeDefined();
  });
  
  it('should save comprehensive action results', async () => {
    const result = await MainWorkflow.execute({
      scheduledAction: 'post',
      scheduledTopic: 'investment'
    });
    
    // post.yaml統合形式での保存確認
    const savedPost = await loadLatestPostYaml();
    expect(savedPost.actionType).toBe('post');
    expect(savedPost.metadata.executionContext.scheduled).toBe(true);
  });
});
```

### Phase 3: 統合テスト・エラーハンドリング

#### エラーハンドリングテスト
```typescript
describe('Error Handling in New Structure', () => {
  it('should handle corrupted learning data files', async () => {
    // 破損した学習データファイルのテスト
    await createCorruptedLearningFile();
    
    const dataManager = new DataManager();
    const learningData = await dataManager.loadLearningData();
    
    // デフォルト値での動作確認
    expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    expect(learningData.successfulTopics.topics).toEqual([]);
  });
  
  it('should handle disk space issues during post.yaml save', async () => {
    // ディスク容量不足のシミュレーション
    const dataManager = new DataManager();
    
    await expect(dataManager.savePost(largeMockPost))
      .rejects.toThrow(/disk space/i);
  });
});
```

## 🎯 実装指針

### テスト品質基準
- **網羅率**: 各モジュール90%以上のコードカバレッジ
- **実用性**: 実際のユースケースを反映したテストケース
- **堅牢性**: エラー状況での適切な動作確認

### モッキング戦略
- **ファイルI/O**: fs-extraのモック使用
- **学習データ**: 小さく意味のあるテストデータ作成
- **時間依存**: Date.nowのモック使用

### 並行実行対応
- **テスト分離**: 各テストファイルが独立して実行可能
- **リソース競合回避**: 異なる一時ディレクトリ使用
- **クリーンアップ**: 各テスト後の確実なリソース解放

## 📁 修正・作成対象ファイル

### 既存修正
- `tests/kaito-api/integration/endpoints-integration-3layer.test.ts`
- `tests/kaito-api/integration/auth-flow-integration.test.ts`

### 新規作成
- `tests/shared/data-manager.test.ts`
- `tests/workflows/main-workflow.test.ts`
- `tests/test-utils/learning-data-mock.ts` (テスト用学習データ)

### ヘルパー修正
- `tests/test-utils/claude-mock-data.ts` (新構造対応)

## ⚠️ 重要な制約

### 依存関係
- **TASK-001完了後**: DataManager新構造のテスト可能
- **TASK-002完了後**: 学習データ2ファイル構成のテスト可能
- **TASK-003完了後**: ワークフロー新構造のテスト可能

### テスト環境
- **一時ディレクトリ**: テスト専用の分離された環境
- **モックデータ**: 最小限で意味のあるデータセット
- **クリーンアップ**: テスト後の確実なファイル削除

## ✅ 完了基準

1. **既存テスト修正完了**: 新構造に対応した既存テストの修正
2. **新規テスト作成完了**: DataManager, MainWorkflowの包括的テスト
3. **エラーハンドリングテスト完了**: 各種エラー状況での動作確認
4. **統合テスト完了**: 全体システムの新構造での動作確認
5. **並行実行テスト**: 複数テストファイルの並行実行確認
6. **カバレッジ達成**: 主要モジュール90%以上のカバレッジ
7. **CI/CD対応**: 継続的インテグレーション環境での実行確認

## 🔧 実装順序

1. **Phase 1**: テスト用モックデータ・ヘルパー作成
2. **Phase 2**: DataManager新構造テスト作成（`tests/shared/data-manager.test.ts`）
3. **Phase 3**: ワークフロー新構造テスト作成（`tests/workflows/main-workflow.test.ts`）
4. **Phase 4**: 既存統合テストの修正
5. **Phase 5**: エラーハンドリング・エッジケーステスト
6. **Phase 6**: 統合テスト・カバレッジ確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_191034/reports/REPORT-004-test-update.md`に以下内容で報告書を作成：

1. **テスト修正サマリー**: 修正したテスト数、新規作成したテスト数
2. **新構造テスト状況**: DataManager, ワークフロー, 学習データの新構造テスト詳細
3. **品質指標**: コードカバレッジ、テスト実行時間、成功率
4. **エラーハンドリング**: 各種エラー状況でのテスト結果
5. **今後の保守**: テストコードの保守性・拡張性の向上状況

---

**🚨 CRITICAL**: この新構造対応テストにより、システム簡素化後の品質保証が確立され、継続的な開発・保守において高い信頼性が確保される。MVP要件での安定運用の基盤。