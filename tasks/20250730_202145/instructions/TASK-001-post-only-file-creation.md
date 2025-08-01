# TASK-001: postアクションのみファイル作成制限実装

## 🎯 タスク概要
現在全アクション（post/like/retweet/quote_tweet/follow）で実行ディレクトリとファイルが作成されているが、postアクションのみに制限する修正を実装する。

## 📋 要件定義
**ユーザー要求**:
- **postアクションのみ**: `data/current/execution-*` ディレクトリ作成 + post.yaml保存
- **like/retweet/quote_tweet/followアクション**: ディレクトリ作成もファイル保存もしない

**参照必須ドキュメント**:
- `docs/directory-structure.md` - データ管理構造の理解
- `docs/workflow.md` - ワークフロー実行仕様の確認
- `docs/kaito-api.md` - API連携仕様の確認
- `docs/claude.md` - Claude SDK統合の理解

## 🔍 現状分析

### 問題箇所特定済み
1. **MainWorkflow.execute()** - Line 58:
   ```typescript
   executionId = await this.getDataManager().initializeExecutionCycle();
   ```
   → 全アクションで実行ディレクトリを作成している

2. **MainWorkflow.saveResults()** - Line 910:
   ```typescript
   await this.getDataManager().savePost({
   ```
   → 全アクションでpost.yamlファイルを保存している

### 設計意図確認
**directory-structure.md**より:
```
├── current/
│   ├── execution-YYYYMMDD-HHMM/
│   │   └── post.yaml                 # 投稿データ（全実行情報統合）
```
→ 投稿データ用のディレクトリ・ファイル構造

## 🛠️ 実装仕様

### 対象ファイル
`src/workflows/main-workflow.ts`

### 修正内容

#### 1. 実行ディレクトリ作成の条件分岐

**修正箇所**: Line 58付近
```typescript
// 修正前
executionId = await this.getDataManager().initializeExecutionCycle();

// 修正後
if (options?.scheduledAction === 'post' || (!options?.scheduledAction && decision?.action === 'post')) {
  executionId = await this.getDataManager().initializeExecutionCycle();
  console.log(`📋 実行サイクル開始: ${executionId}`);
} else {
  executionId = `no-file-${Date.now()}`;
  console.log(`📋 postアクション以外のため、ファイル作成をスキップ: ${executionId}`);
}
```

#### 2. 結果保存の条件分岐

**修正箇所**: saveResults()メソッド全体
```typescript
private static async saveResults(decision: any, actionResult: any, options?: any): Promise<void> {
  try {
    // postアクションのみファイル保存
    if (decision.action === 'post') {
      // post.yaml統合形式での保存（既存のPostData型に準拠）
      await this.getDataManager().savePost({
        actionType: decision.action,
        content: actionResult.content,
        targetTweetId: actionResult.targetTweetId || actionResult.tweetId,
        result: actionResult.result || {
          success: actionResult.success || false,
          message: actionResult.message || '',
          data: actionResult.data || {}
        },
        engagement: actionResult.engagement || {
          likes: 0,
          retweets: 0,
          replies: 0
        },
        claudeSelection: actionResult.claudeSelection
      });

      console.log('✅ 結果保存完了（post.yaml統合形式）');
    } else {
      console.log(`✅ ${decision.action}アクションのため、ファイル保存をスキップ`);
    }
  } catch (error) {
    console.error('❌ 結果保存失敗:', error);
    throw error;
  }
}
```

#### 3. スケジュール実行時の対応

**修正箇所**: スケジュール実行ブロック内のステップ3も同様に条件分岐
- Line 95付近の `await this.saveResults(decision, actionResult, options);` 
- Line 171付近の `await this.saveResults(decision, actionResult, options);`

両方とも上記のsaveResults修正により、自動的に条件分岐される。

## ✅ 実装チェックポイント

### 1. TypeScript型安全性
- `decision.action` の型安全性確保
- `options?.scheduledAction` の型安全性確保
- 既存のActionType型との整合性確認

### 2. 動作確認テスト
各アクションタイプでの動作確認:
```bash
# postアクション - ディレクトリ・ファイル作成される
pnpm dev  # 現在の固定postアクション

# like/retweet等のアクション - ディレクトリ・ファイル作成されない
# schedule.yamlでlike/retweet/quote_tweet/followを設定してテスト
```

### 3. ログ出力確認
- postアクション: 「実行サイクル開始」「結果保存完了」
- その他アクション: 「ファイル作成をスキップ」「ファイル保存をスキップ」

### 4. 既存機能維持
- postアクションの完全な動作保証
- エラーハンドリングの維持
- 実行時間計測の継続

## 🚨 制約事項

### MVP原則遵守
- **最小限修正**: 既存ロジックを最大限活用
- **過剰設計禁止**: 将来拡張を考慮した複雑な設計は避ける
- **機能完全性**: postアクションの機能は一切変更しない

### 互換性維持
- **型定義変更禁止**: 既存のインターフェースは変更しない
- **APIシグネチャ維持**: メソッドシグネチャは変更しない
- **エラーハンドリング継承**: 既存のエラーハンドリング方式を踏襲

### 品質基準
- **TypeScript strict**: 厳密型チェック通過必須
- **ESLint通過**: lint警告ゼロ必須
- **テスト動作**: 各アクションタイプでの実際動作確認必須

## 📋 完了基準

1. ✅ MainWorkflow.execute()の実行ディレクトリ作成条件分岐実装完了
2. ✅ MainWorkflow.saveResults()のファイル保存条件分岐実装完了
3. ✅ TypeScript型エラー解消・ESLint通過
4. ✅ postアクション実行テスト: ディレクトリ・ファイル作成確認
5. ✅ 非postアクション実行テスト: ディレクトリ・ファイル作成なし確認
6. ✅ ログ出力内容確認: 適切なスキップメッセージ表示

## 📤 成果物

### 実装ファイル
- `src/workflows/main-workflow.ts` (修正済み)

### 報告書
- `tasks/20250730_202145/reports/REPORT-001-post-only-file-creation.md`
  - 修正内容詳細
  - 動作確認結果
  - 各アクションタイプでのテスト結果
  - TypeScript・ESLint通過確認

---
**発行日**: 2025-07-30  
**発行者**: Manager  
**対象**: Worker  
**優先度**: High  
**実行順序**: 単独実行  
**推定作業時間**: 30-45分