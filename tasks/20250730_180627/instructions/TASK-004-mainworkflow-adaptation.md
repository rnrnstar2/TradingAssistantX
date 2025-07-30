# TASK-004: MainWorkflow修正 - 簡素化されたDataManager対応

## 🎯 タスク概要

`src/workflows/main-workflow.ts`を修正し、Worker1で簡素化されたDataManagerの新しいAPIに対応させます。複雑なデータ保存処理を削除し、新しい単一ファイル形式（post.yaml）に対応します。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様
- `docs/workflow.md` - ワークフロー仕様書
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 削除対象メソッド呼び出し

以下のDataManagerメソッド呼び出しを削除してください：

#### Context管理関連（削除）
```typescript
// 削除対象
await this.getDataManager().loadSessionMemory()
await this.getDataManager().loadCurrentStatus()
await this.getDataManager().saveCurrentStatus()
await this.getDataManager().updateAccountStatus()
```

#### 複雑なデータ保存（削除）
```typescript
// 削除対象
await this.getDataManager().saveClaudeOutput()
await this.getDataManager().saveKaitoResponse()
```

### 2. 簡素化されたデータ収集

#### 変更前（複雑）:
```typescript
const [profile, learningData, currentStatus] = await Promise.all([
  this.collectKaitoData(),
  this.getDataManager().loadLearningData(),
  this.getDataManager().loadCurrentStatus()
]);
```

#### 変更後（簡素）:
```typescript
const [profile, learningData] = await Promise.all([
  this.collectKaitoData(),
  this.getDataManager().loadLearningData()
]);
```

### 3. 新しいデータ保存処理

#### saveResults()メソッドの修正
```typescript
private static async saveResults(decision: any, actionResult: any): Promise<void> {
  try {
    // 新しい単一ファイル形式での保存
    await this.getDataManager().savePost({
      actionType: decision.action as 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow',
      content: actionResult.content || actionResult.text || '',
      tweetId: actionResult.tweetId || actionResult.id,
      result: {
        success: actionResult.success,
        message: actionResult.message || '',
        data: actionResult.data || {}
      },
      engagement: actionResult.engagement || actionResult.metrics || {
        likes: 0,
        retweets: 0,
        replies: 0
      }
    });

    console.log('✅ 結果保存完了（新形式）');
  } catch (error) {
    console.error('❌ 結果保存失敗:', error);
    throw error;
  }
}
```

### 4. executeAction()メソッドの修正

#### パラメータ簡素化:
```typescript
// 変更前
const actionResult = await this.executeAction(decision, { profile, learningData, currentStatus });

// 変更後  
const actionResult = await this.executeAction(decision, { profile, learningData });
```

#### メソッドシグネチャ修正:
```typescript
private static async executeAction(
  decision: any, 
  context: { 
    profile: any; 
    learningData: any; 
  }
): Promise<any> {
  // 実装内容はそのまま（contextからcurrentStatusの参照を削除）
}
```

### 5. 不要な処理の削除

#### アカウント情報更新処理削除:
```typescript
// 削除対象（現在コード内にあれば削除）
if (profile && profile.user_info) {
  await this.getDataManager().updateAccountStatus(profile.user_info);
}
```

#### Claude出力・Kaito応答保存削除:
```typescript
// 削除対象
await this.getDataManager().saveClaudeOutput('decision', decision);
await this.getDataManager().saveKaitoResponse('action-result', actionResult);
```

## 🚨 重要な制約事項

### 依存関係
- **Worker1完了後実行**: DataManagerの簡素化完了後に実行
- **新API準拠**: 簡素化されたDataManagerのAPIのみ使用
- **最小限の変更**: ワークフローロジックは維持

### MVP制約遵守
- **複雑性削除**: 過剰なデータ保存処理を削除
- **単一ファイル**: post.yaml形式での統一保存
- **シンプルな構造**: 最小限のデータ管理

### TypeScript品質要件
- **型安全性**: strict mode遵守
- **エラーハンドリング**: 適切なエラー処理維持
- **コメント不要**: 新しいコメントは追加しない

## 📝 実装手順

1. **Worker1完了確認**: DataManagerの簡素化が完了していることを確認
2. **不要メソッド削除**: 削除対象のメソッド呼び出しを特定・削除
3. **データ収集簡素化**: Promise.allの引数からcurrentStatus削除
4. **保存処理修正**: saveResults()を新しいsavePost()API対応に修正
5. **パラメータ修正**: executeAction()のパラメータを簡素化
6. **動作確認**: TypeScriptコンパイルと基本フロー確認

## ✅ 完了条件

- [ ] 削除対象のDataManagerメソッド呼び出しがすべて削除されている
- [ ] データ収集がprofileとlearningDataのみになっている
- [ ] saveResults()が新しいsavePost() APIを使用している
- [ ] executeAction()のパラメータが簡素化されている
- [ ] TypeScriptエラーが発生しない
- [ ] ワークフローの基本的な実行フローが維持されている

## 📋 注意事項

### 実装上の注意
- **段階的修正**: 一度に全て変更せず、段階的に修正
- **型チェック**: 各修正後にTypeScriptコンパイルを確認
- **ロジック維持**: ワークフローの核心ロジックは変更しない

### 互換性確保
- **既存のAction実行**: アクション実行ロジックは維持
- **エラーハンドリング**: エラー処理パターンを維持
- **ログ出力**: 実行状況のログ出力を維持

### 出力制限
- **報告書のみ**: tasks/20250730_180627/reports/REPORT-004-mainworkflow-adaptation.md にのみ報告書を出力
- **他ファイル作成禁止**: 新しいファイル作成は行わない

## 🎯 期待される効果

- ワークフローの簡素化
- データ保存処理の統一化
- 新しいディレクトリ構造への完全対応
- 保守性の向上

## 🔧 テスト確認項目

1. **コンパイル確認**: TypeScriptエラーが発生しない
2. **メソッド確認**: 削除対象メソッドが呼び出されていない
3. **保存確認**: 新しいsavePost()が正しく実装されている
4. **パラメータ確認**: executeAction()のパラメータが正しく変更されている
5. **フロー確認**: 3ステップワークフローが正常に動作する

## 📖 参考情報

### 新しいpost.yaml形式
```yaml
executionId: execution-20250730-1806
actionType: post
timestamp: 2025-07-30T18:06:00Z
content: "投稿内容"
result:
  success: true
  message: "投稿成功"
  data: { tweetId: "123456789" }
engagement:
  likes: 0
  retweets: 0
  replies: 0
```