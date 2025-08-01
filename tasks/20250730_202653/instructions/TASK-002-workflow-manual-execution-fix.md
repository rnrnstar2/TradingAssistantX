# TASK-002: MainWorkflow手動実行モード修正

## 🎯 実装目標

MainWorkflowの手動実行モード（dev実行）で固定postアクションが想定されている部分を削除し、TASK-001のdev.ts修正と整合性を取る。

## 📋 現在の問題

### 🔧 現状の動作（main-workflow.ts）
```typescript
// 固定アクション設定（dev実行時のデフォルト）
const decision = {
  action: 'post',
  parameters: {
    topic: 'investment',
    query: null
  },
  confidence: 1.0,
  reasoning: '固定アクション実行: 手動実行モード'
};
```

### ⚠️ 問題点
- **TASK-001との不整合**: dev.tsでアクション必須化したのに、workflow側でpostを固定
- **論理矛盾**: 「手動実行モード」なのに実際はpostアクション固定
- **将来の拡張困難**: 他のアクションでの手動実行ができない

## 🔧 修正内容

### Phase 1: 手動実行モードロジックの削除

#### 📍 修正対象箇所
`src/workflows/main-workflow.ts` - 131-206行目の手動実行モード処理

#### 修正前（現在のコード）
```typescript
// ===============================
// 手動実行モード（3ステップ）
// ===============================

// ステップ1: データ収集
console.log('📊 ステップ1: データ収集開始');

const [profile, learningData] = await Promise.all([
  this.collectKaitoData(),
  this.getDataManager().loadLearningData()
]);

console.log('✅ データ収集完了', {
  profile: !!profile,
  followers: profile?.followersCount || profile?.followers || 0,
  learningPatterns: Object.keys(learningData.engagementPatterns?.topics || {}).length
});

// ステップ2: アクション実行（固定アクション使用）
console.log('⚡ ステップ2: アクション実行開始');

// 固定アクション設定（dev実行時のデフォルト）
const decision = {
  action: 'post',
  parameters: {
    topic: 'investment',
    query: null
  },
  confidence: 1.0,
  reasoning: '固定アクション実行: 手動実行モード'
};

console.log('✅ 固定アクション設定完了', { action: decision.action, confidence: decision.confidence });

// postアクションの場合のみディレクトリ作成
if (decision.action === 'post') {
  const realExecutionId = await this.getDataManager().initializeExecutionCycle();
  executionId = realExecutionId;
  console.log(`📋 実行サイクル開始: ${executionId}`);
} else {
  console.log(`📋 ${decision.action}アクションのため、ファイル作成をスキップ: ${executionId}`);
}

// ステップ1で収集したデータを渡す
const actionResult = await this.executeAction(decision, { profile, learningData });
console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

// ステップ3: 結果保存
console.log('💾 ステップ3: 結果保存開始');

await this.saveResults(decision, actionResult, options);
console.log('✅ 結果保存完了');

// 実行完了
const executionTime = Date.now() - startTime;

// アクション詳細の表示
let actionDetails = '';
if (actionResult.success && actionResult.action === 'quote_tweet') {
  const contentPreview = actionResult.content?.substring(0, 100) || '';
  const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
  actionDetails = ` - 引用投稿: "${contentPreview}${contentPreview.length >= 100 ? '...' : ''}" (引用元: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}")`;
} else if (actionResult.success && actionResult.action === 'post') {
  const contentPreview = actionResult.content?.substring(0, 100) || '';
  actionDetails = ` - 投稿: "${contentPreview}${contentPreview.length >= 100 ? '...' : ''}"`;
} else if (actionResult.success && actionResult.action === 'retweet') {
  const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
  actionDetails = ` - リツイート: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}"`;
} else if (actionResult.success && actionResult.action === 'like') {
  const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
  actionDetails = ` - いいね: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}"`;
}

// TODO: Step 4: 深夜大規模分析（23:55のみ） - 実装待ち

console.log(`🎉 メインワークフロー実行完了 (${executionTime}ms)${actionDetails}`);

return {
  success: true,
  executionId,
  decision,
  actionResult,
  executionTime
};
```

#### 修正後（削除・エラー処理）
```typescript
// ===============================
// 手動実行モード - 廃止済み
// ===============================

console.error('❌ 手動実行モードは廃止されました');
console.error('📋 dev.tsから適切なアクションを指定してください:');
console.error('  pnpm dev:post, pnpm dev:retweet, pnpm dev:like, pnpm dev:quote, pnpm dev:follow');
console.error('📖 詳細: docs/workflow.md を参照');

throw new Error('Manual execution mode is deprecated. Use scheduled action mode only.');
```

### Phase 2: execute()メソッドの整理

#### 🔧 ロジック簡素化
1. **スケジュール実行モードのみ**: options?.scheduledActionがない場合はエラー
2. **デッドコード削除**: 手動実行モード関連のすべてのコード削除
3. **一貫性確保**: 全実行でスケジュール実行モードのロジックを使用

#### 実装例
```typescript
static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
  const startTime = Date.now();
  let executionId: string;

  try {
    console.log('🚀 メインワークフロー実行開始');

    // スケジュール実行モードのみサポート
    if (!options?.scheduledAction) {
      console.error('❌ scheduledActionが必要です');
      console.error('📋 dev.tsから適切なアクションを指定してください');
      throw new Error('scheduledAction is required');
    }

    // 以下は既存のスケジュール実行モードのロジックのみ
    // ...
  }
}
```

## 🎯 実装指針

### ドキュメント参照要件
**必須参照**:
- `docs/workflow.md` - dev実行とスケジュール実行の統合
- `docs/directory-structure.md` - ワークフロー構造理解
- `src/dev.ts` - TASK-001での修正内容理解

### 依存関係
- **TASK-001完了後**: dev.tsの修正完了後に実行
- **options.scheduledAction**: 必須パラメータ化
- **既存機能維持**: スケジュール実行モードは影響なし

### 品質要件
- **TypeScript strict**: 型安全性確保
- **エラーハンドリング**: 明確なエラーメッセージ
- **ログ一貫性**: スケジュール実行と同じログ形式

## 📁 影響するファイル

### 直接修正対象
- `src/workflows/main-workflow.ts` - execute()メソッド簡素化

### 動作確認対象
- `src/dev.ts` - TASK-001との連携確認
- スケジュール実行モード - 既存機能への影響確認

## ⚠️ 重要な制約

### 後方互換性
- **スケジュール実行**: main.tsでの本番実行は影響なし
- **既存API**: execute()メソッドのシグネチャは維持
- **データ構造**: WorkflowOptions、WorkflowResultは変更なし

### 削除対象
- 手動実行モード関連コード（131-206行目）
- 固定postアクション処理
- 手動実行時の特別処理

## ✅ 完了基準

1. **手動実行モード削除完了**: 131-206行目の完全削除
2. **エラーハンドリング実装**: scheduledActionなしでの適切なエラー
3. **ロジック一貫性確保**: スケジュール実行モードのみの統一処理
4. **動作確認完了**: dev:xxxスクリプトでの正常動作確認
5. **TypeScript品質確認**: strict modeでのコンパイルエラーなし

## 🔧 実装順序

1. **Phase 1**: 手動実行モード削除（131-206行目）
2. **Phase 2**: execute()メソッド先頭でのバリデーション追加
3. **Phase 3**: エラーメッセージ・ログの整理
4. **Phase 4**: 動作テスト・品質確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_202653/reports/REPORT-002-workflow-manual-execution-fix.md`に以下内容で報告書を作成：

1. **削除サマリー**: 削除したコード行数・機能概要
2. **ロジック統一**: スケジュール実行モード一本化の効果
3. **動作確認結果**: 全dev:xxxスクリプトでのテスト結果
4. **依存関係**: TASK-001との整合性確認結果
5. **今後の保守**: execute()メソッドの保守容易性向上

---

**🚨 CRITICAL**: この修正により、MainWorkflowが一貫したロジックで動作し、dev.tsとの整合性が取れる。手動・スケジュール実行の区別がなくなり、システムの理解しやすさが大幅に向上。