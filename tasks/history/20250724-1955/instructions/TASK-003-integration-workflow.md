# Worker指示書: Claude/KaitoAPI連携とデータフロー統合

## 🎯 実装目的
DataManagerの拡張機能を活用し、ClaudeエンドポイントとKaitoAPIの連携を通じてデータを適切にcurrent/historyレイヤーに保存する統合ワークフローを実装する。

## 📋 実装要件

### 1. メインワークフローの統合（main.tsの更新）

**対象ファイル**: `src/main.ts`

#### 実装内容：
```typescript
// 1. 実行サイクルの初期化
const executionId = await dataManager.initializeExecutionCycle();

// 2. 前回実行のアーカイブ（必要な場合）
await dataManager.archiveCurrentToHistory();

// 3. 既存の処理フローにデータ保存を追加
// - Claude決定後: await dataManager.saveClaudeOutput('decision', decision);
// - コンテンツ生成後: await dataManager.saveClaudeOutput('content', content);
// - KaitoAPI応答後: await dataManager.saveKaitoResponse('post-result', result);
// - 投稿作成後: await dataManager.savePost(postData);

// 4. 実行完了時のサマリー更新
await dataManager.updateExecutionSummary(summary);
```

### 2. execution-flow.tsの拡張

**対象ファイル**: `src/main-workflows/execution-flow.ts`

#### 必須追加機能：
1. **データ保存フック**
   - 各ステップ完了時の自動データ保存
   - エラー発生時の部分的な結果保存

2. **実行トレース**
   ```typescript
   interface ExecutionTrace {
     step: string;
     timestamp: string;
     input: any;
     output: any;
     duration: number;
     success: boolean;
     error?: string;
   }
   ```

3. **データフロー管理**
   - Claude出力 → current/claude-outputs/
   - Kaito応答 → current/kaito-responses/
   - 投稿データ → current/posts/
   - 実行サマリー → current/execution-summary.yaml

### 3. scheduler-manager.tsの更新

**対象ファイル**: `src/main-workflows/scheduler-manager.ts`

#### 追加機能：
1. **実行前チェック**
   - 前回実行の完了確認
   - アーカイブ必要性の判定
   - ディスク容量チェック

2. **定期メンテナンス**
   - 古いcurrentデータの自動アーカイブ
   - historyデータの月次整理

### 4. KaitoAPI応答の最適化対応

**考慮事項**：
- get_user_last_tweetsの20件制限への対応
- 差分取得ロジックの実装
- キャッシュ戦略

#### 実装例：
```typescript
// 最新投稿の差分取得
async function fetchRecentTweets(userId: string) {
  // 1. KaitoAPIから最新20件取得
  const latestTweets = await kaitoAPI.getUserLastTweets(userId, 20);
  
  // 2. 既存データとマージ
  const existingPosts = await dataManager.getRecentPosts(100);
  
  // 3. 重複を除いて保存
  const newPosts = latestTweets.filter(tweet => 
    !existingPosts.some(post => post.id === tweet.id)
  );
  
  for (const post of newPosts) {
    await dataManager.savePost(post);
  }
}
```

### 5. エラーハンドリングとリカバリー

#### 実装必須項目：
1. **部分的失敗の処理**
   - トランザクション的な操作
   - ロールバック機能

2. **リトライ機構**
   - 一時的エラーの自動リトライ
   - 指数バックオフ

3. **データ整合性保証**
   - チェックサム検証
   - アーカイブ完全性確認

### 6. 型定義の統合

既存の型定義に以下を追加：
```typescript
// src/shared/types.ts に追加
export interface DataFlowConfig {
  currentRetentionMinutes: number;  // デフォルト: 30
  archiveOnCompletion: boolean;     // デフォルト: true
  maxCurrentFiles: number;          // デフォルト: 20
  enableCompression: boolean;       // デフォルト: false (MVP)
}

export interface ExecutionMetadata {
  executionId: string;
  startTime: string;
  endTime?: string;
  dataManager: {
    currentPath: string;
    archivePath?: string;
    filesCreated: number;
    totalSize: number;
  };
}
```

### 7. ログ出力の統合

DataManager操作のログを既存のLoggerに統合：
```typescript
logger.info('[DataManager] Execution cycle initialized', { executionId });
logger.info('[DataManager] Claude output saved', { type: 'decision' });
logger.error('[DataManager] Archive failed', { error });
```

## ✅ 完了条件

1. main.tsがDataManagerの新機能を適切に呼び出している
2. 実行フローの各ステップでデータが保存されている
3. エラー時も部分的な結果が保存される
4. KaitoAPIの制限に対応した差分取得が動作する
5. すべての型チェックが通過する

## 🚫 禁止事項

- 既存の実行フローの大幅な変更
- 同期的なI/O操作（すべて非同期で実装）
- メモリへの大量データ保持
- テストコードの実装（MVPでは不要）

## 📝 実装の優先順位

1. main.tsへのDataManager統合（最優先）
2. execution-flow.tsのデータ保存フック
3. エラーハンドリング実装
4. KaitoAPI最適化対応
5. その他の拡張機能

## 💡 実装のヒント

- 既存コードの変更は最小限に
- try-catchブロックで各データ保存操作を保護
- 非同期処理は適切にawaitする
- ログ出力で実行状況を可視化

必ずREQUIREMENTS.mdとDataManagerの新仕様に従って実装すること。