# TASK-001: likeアクションのドキュメント準拠修正

## 📋 タスク概要
`src/workflows/main-workflow.ts`の`executeLikeAction`メソッドをドキュメント仕様に準拠させる修正

## 🎯 現状の問題
- **現在の実装**: `targetTweetId`を直接要求（エラーになる）
- **ドキュメント仕様**: `target_query`で検索→最初のツイートをいいね（workflow.md:112行目）
- **影響**: `pnpm dev:like`実行時に「いいね対象のツイートIDがありません」エラー

## 📐 実装要件

### 1. executeLikeActionメソッドの修正（main-workflow.ts:411-439行目）

**修正内容**:
- `decision.parameters?.targetTweetId`の直接取得を削除
- `decision.parameters?.query`から検索クエリを取得
- 検索を実行し、結果から最初のツイートを選択
- 選択したツイートIDでいいね実行

**参考実装**: 同ファイルの`executeRetweetAction`（331-406行目）と同様のパターンで実装

### 2. 実装詳細

```typescript
private static async executeLikeAction(decision: any): Promise<any> {
  try {
    // 検索クエリの取得
    const targetQuery = decision.parameters?.query;
    
    if (!targetQuery) {
      console.warn('⚠️ いいね対象の検索クエリがないため、waitアクションに変更');
      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
        reason: 'No query for like action',
        timestamp: new Date().toISOString()
      };
    }

    // ツイート検索実行
    console.log(`🔍 いいね対象を検索中: "${targetQuery}"`);
    const searchResult = await this.kaitoClient.searchTweets(targetQuery, { maxResults: 5 });

    if (!searchResult.success || searchResult.tweets.length === 0) {
      console.warn(`⚠️ 検索結果がないため、waitアクションに変更: "${targetQuery}"`);
      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
        reason: `No tweets found for query: ${targetQuery}`,
        query: targetQuery,
        timestamp: new Date().toISOString()
      };
    }

    // 最初のツイートをいいね対象とする
    const targetTweet = searchResult.tweets[0];
    console.log(`✅ いいね対象見つかりました: ${targetTweet.id} - "${targetTweet.text.substring(0, 50)}..."`);

    // いいね実行
    const likeResult = await this.kaitoClient.like(targetTweet.id);

    if (!likeResult?.success) {
      throw new Error(likeResult?.error || 'いいね実行失敗');
    }

    return {
      success: true,
      action: WORKFLOW_CONSTANTS.ACTIONS.LIKE,
      targetTweet: targetTweet.id,
      targetTweetText: targetTweet.text.substring(0, 100),
      searchQuery: targetQuery,
      result: likeResult,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ いいねアクション失敗:', error);
    throw error;
  }
}
```

## ⚠️ 制約事項

### MVP制約
- **シンプル実装**: 最初の検索結果を使用（複雑な選択ロジックは不要）
- **エラーハンドリング**: 基本的なtry-catch実装のみ
- **統計機能なし**: パフォーマンス分析などの追加機能は実装しない

### 技術制約
- TypeScript strictモード準拠
- 既存のkaitoClientインターフェース使用
- WORKFLOW_CONSTANTS使用

## ✅ 完了条件
1. `pnpm dev:like`が正常に実行される
2. 検索→いいねの流れが正しく動作
3. TypeScriptエラーがない
4. 既存テストが通る（あれば）

## 📝 報告書作成時の確認事項
- 修正前後の動作確認結果
- エラーメッセージの変化
- 実装したコードの行数と変更内容
- 動作確認で使用したコマンド