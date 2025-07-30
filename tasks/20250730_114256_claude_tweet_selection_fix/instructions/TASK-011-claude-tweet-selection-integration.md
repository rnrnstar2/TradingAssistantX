# TASK-011: Claude ツイート選択機能の統合修正

**作業種別**: Worker権限での実装修正・統合  
**優先度**: 高  
**推定作業時間**: 60-90分  
**担当**: Worker権限

---

## 📋 **現在の実装状況**

### ✅ **完了済み**
- `src/claude/endpoints/selection-endpoint.ts` - 基本的な選択ロジック実装
- `src/claude/types.ts` - 型定義追加（SelectedTweet, TweetSelectionParams等）
- `src/claude/index.ts` - エクスポート統合
- `docs/claude.md` - ドキュメント更新
- `docs/directory-structure.md` - 構造更新

### ⚠️ **修正が必要な問題点**

## 🎯 **修正作業内容**

### 1. **型整合性の修正**
**問題**: `TweetCandidate`型がKaitoAPIの実際の`TweetData`構造と異なる

**修正手順**:
```typescript
// src/claude/types.ts の TweetCandidate を以下に修正
export interface TweetCandidate {
  id: string;
  text: string;
  author_id: string;          // ← KaitoAPIのnormalizeTweetDataと一致確認
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;  // ← 追加
  };
  created_at: string;
  lang?: string;
  in_reply_to_user_id?: string;    // ← KaitoAPIに合わせて追加
  conversation_id?: string;        // ← KaitoAPIに合わせて追加
}
```

**確認箇所**:
- `src/kaito-api/endpoints/read-only/tweet-search.ts` の `normalizeTweetData()` 関数
- `src/kaito-api/utils/types.ts` の `TweetData` インターフェース

### 2. **Author ID 取得ロジックの修正**
**問題**: `selection-endpoint.ts` の `author_id` 取得が `tweet-search.ts` の複雑なロジックと未整合

**修正手順**:
```typescript
// src/claude/endpoints/selection-endpoint.ts の formatTweetsForPrompt() 内
function formatTweetsForPrompt(tweets: TweetCandidate[]): CompactTweetCandidate[] {
  return tweets.map((tweet, index) => {
    // 作者名取得ロジックを tweet-search.ts と統一
    const authorName = extractAuthorName(tweet.author_id) || `@${tweet.author_id}`;
    
    return {
      id: tweet.id,
      text: truncatedText,
      author: authorName,  // ← 統一されたロジックを使用
      // ...
    };
  });
}

// extractAuthorName() 関数を追加実装
function extractAuthorName(authorId: string): string {
  // tweet-search.ts の author_id 取得ロジックと整合
  // 実際の実装は KaitoAPI のレスポンス構造に依存
  return `@${authorId}`; // 簡易版
}
```

### 3. **ワークフロー統合の修正**
**問題**: `main-workflow.ts` での実際の使用時のインポート・型不整合

**修正手順**:
```typescript
// src/workflows/main-workflow.ts に以下を追加
import { selectOptimalTweet, type SelectedTweet, type TweetSelectionParams } from '../claude';

// executeRealLike(), executeRealRetweet() 内で使用
const selectedTweet: SelectedTweet = await selectOptimalTweet({
  candidates: searchResult.tweets,  // ← TweetData[] から TweetCandidate[] への変換確認
  selectionType: 'like',
  criteria: {
    topic: this.actionTopic,
    qualityThreshold: 8,
    engagementWeight: 0.3,
    relevanceWeight: 0.7
  },
  context: {
    userProfile: {
      followerCount: accountInfo.followers_count,
      postsToday: 0,  // ← 実際の値に修正
      engagementRate: 2.5  // ← 実際の計算ロジックに修正
    }
  }
});
```

### 4. **エラーハンドリングの強化**
**修正箇所**: `src/claude/endpoints/selection-endpoint.ts`

```typescript
// parseClaudeResponse() 関数の修正
function parseClaudeResponse(response: string, originalCandidates: TweetCandidate[]): SelectedTweet {
  try {
    // JSON抽出ロジックの改善
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                     response.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      console.warn('⚠️ Claude レスポンスにJSON形式が見つかりません:', response.substring(0, 200));
      throw new Error('有効なJSON形式が見つかりません');
    }

    // より堅牢なパース処理
    // ...
  } catch (error) {
    // 詳細なエラーログ
    console.error('Claude レスポンス解析詳細エラー:', {
      error: error.message,
      responseLength: response.length,
      responseStart: response.substring(0, 100),
      candidateCount: originalCandidates.length
    });
    
    // フォールバック処理
    // ...
  }
}
```

### 5. **統合テスト用のモック修正**
**修正箇所**: `src/claude/endpoints/selection-endpoint.ts`

```typescript
// 開発・テスト用の改善
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 開発モード: Claude選択プロンプト確認');
  console.log('Prompt length:', prompt.length);
  console.log('Candidates:', compactCandidates.length);
}
```

---

## 🧪 **動作確認手順**

### 1. **型チェック**
```bash
cd /Users/rnrnstar/github/TradingAssistantX
npm run typecheck
```

### 2. **統合テスト**
```bash
# いいねアクション実行でのClaude選択確認
pnpm dev:like

# ログで以下を確認:
# - "🎯 ツイート選択開始" メッセージ
# - "✅ ツイート選択完了" メッセージ  
# - 選択されたツイートIDとスコア
```

### 3. **エラーケーステスト**
```bash
# Claude認証なしでのフォールバック確認
# (claude logout した状態でテスト)
```

---

## 📝 **期待する成果物**

### 必須修正ファイル
1. `src/claude/types.ts` - TweetCandidate型の修正
2. `src/claude/endpoints/selection-endpoint.ts` - エラーハンドリング・author取得ロジック修正
3. `src/workflows/main-workflow.ts` - 実際の統合使用

### 確認事項
- [ ] 型エラーなしでコンパイル成功
- [ ] `pnpm dev:like` でClaude選択が動作
- [ ] フォールバック処理が適切に動作
- [ ] ログメッセージが適切に出力

---

## ⚡ **緊急度・重要度**

**緊急度**: 高（現在の実装が動作しない可能性）  
**重要度**: 高（メイン機能の一部）  
**影響範囲**: Claude選択機能全体  

---

## 📚 **参考資料**

- `src/kaito-api/endpoints/read-only/tweet-search.ts` - TweetData構造
- `src/kaito-api/utils/types.ts` - 型定義
- `docs/claude.md` - 機能仕様
- `docs/workflow.md` - ワークフロー詳細

---

**作成**: Manager権限  
**作成日時**: 2025-07-30  
**レビュー要**: Worker実装完了後