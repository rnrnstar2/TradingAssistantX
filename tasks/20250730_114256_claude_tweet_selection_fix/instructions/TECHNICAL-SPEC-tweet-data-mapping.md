# 技術仕様書: TweetData → TweetCandidate マッピング

**対象**: Worker権限  
**関連タスク**: TASK-011  
**最終更新**: 2025-07-30

---

## 📊 **KaitoAPI TweetData 構造（実際）**

```typescript
// src/kaito-api/utils/types.ts より
export interface TweetData {
  id: string;                    // ✅ 一致
  text: string;                  // ✅ 一致  
  author_id: string;             // ✅ 一致
  created_at: string;            // ✅ 一致
  public_metrics: {
    retweet_count: number;       // ✅ 一致
    like_count: number;          // ✅ 一致
    quote_count: number;         // ✅ 一致
    reply_count: number;         // ✅ 一致
    impression_count: number;    // ⚠️ 必須（TweetCandidateではオプション）
  };
  lang?: string;                 // ✅ 一致
  in_reply_to_user_id?: string;  // ✅ 一致
  conversation_id?: string;      // ✅ 一致
  
  // その他のフィールド（TweetCandidateでは不要）
  context_annotations?: Array<...>;
  attachments?: {...};
}
```

## 🔧 **必要な修正**

### 1. **TweetCandidate型の修正**
**ファイル**: `src/claude/types.ts`

```typescript
// 修正前
export interface TweetCandidate {
  // ...
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  // ...
}

// 修正後
export interface TweetCandidate {
  id: string;
  text: string;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;    // ← 必須に変更
  };
  created_at: string;
  lang?: string;
  in_reply_to_user_id?: string;  // ← 追加
  conversation_id?: string;      // ← 追加
}
```

### 2. **型変換関数の実装**
**ファイル**: `src/claude/endpoints/selection-endpoint.ts`

```typescript
/**
 * KaitoAPI TweetData から TweetCandidate への変換
 * 既にnormalizeTweetData()で正規化されたデータを前提
 */
function convertTweetDataToCandidate(tweetData: any): TweetCandidate {
  return {
    id: tweetData.id,
    text: tweetData.text,
    author_id: tweetData.author_id,
    public_metrics: {
      like_count: tweetData.public_metrics.like_count,
      retweet_count: tweetData.public_metrics.retweet_count,
      reply_count: tweetData.public_metrics.reply_count,
      quote_count: tweetData.public_metrics.quote_count,
      impression_count: tweetData.public_metrics.impression_count || 0
    },
    created_at: tweetData.created_at,
    lang: tweetData.lang,
    in_reply_to_user_id: tweetData.in_reply_to_user_id,
    conversation_id: tweetData.conversation_id
  };
}
```

### 3. **ワークフロー統合での型安全性**  
**ファイル**: `src/workflows/main-workflow.ts`

```typescript
// executeRealLike() 内での使用例
private async executeRealLike(): Promise<void> {
  // 検索実行
  const searchResult = await this.kaitoClient.searchTweets(searchQuery.query);
  
  // 型変換: TweetData[] → TweetCandidate[]
  const candidates: TweetCandidate[] = searchResult.tweets.map(convertTweetDataToCandidate);
  
  // Claude選択実行
  const selectedTweet: SelectedTweet = await selectOptimalTweet({
    candidates: candidates,           // ← 型安全
    selectionType: 'like',
    criteria: {
      topic: this.actionTopic,
      qualityThreshold: 8,
      engagementWeight: 0.3,
      relevanceWeight: 0.7
    },
    context: {
      userProfile: this.convertAccountInfoToProfile(accountInfo),
      learningData: this.loadLearningData()
    }
  });
  
  // 選択されたツイートでいいね実行
  await this.kaitoClient.likeTweet(selectedTweet.tweetId);
}

/**
 * AccountInfo → TweetSelection用のProfile変換
 */
private convertAccountInfoToProfile(accountInfo: any): AccountInfo {
  return {
    followerCount: accountInfo.followers_count || 0,
    postsToday: accountInfo.statuses_count || 0,
    engagementRate: this.calculateEngagementRate(accountInfo),
    lastPostTime: accountInfo.status?.created_at
  };
}

/**
 * エンゲージメント率の簡易計算
 */
private calculateEngagementRate(accountInfo: any): number {
  // 実装: フォロワー数とツイート数から概算
  const followers = accountInfo.followers_count || 1;
  const tweets = accountInfo.statuses_count || 1;
  return Math.min((followers / tweets) * 0.1, 10); // 0-10%の範囲
}
```

---

## 🧪 **動作確認ポイント**

### 1. **型チェック**
```bash
# TypeScript型チェック
npm run typecheck

# 期待: エラーゼロ
```

### 2. **実行時ログ確認**
```bash
pnpm dev:like

# 期待ログ:
# 🎯 ツイート選択開始: like for "投資教育"
# 📊 候補数: N件
# ✅ ツイート選択完了: ID=XXXXX, スコア=N/10
# 💡 選択理由: XXXXX
```

### 3. **エラーケース**
```bash
# Claude未認証状態でのフォールバック確認
claude logout
pnpm dev:like

# 期待: フォールバック選択が動作
```

---

## 🔍 **既存コードとの整合性チェック**

### 確認すべきファイル
1. `src/kaito-api/endpoints/read-only/tweet-search.ts` - normalizeTweetData()
2. `src/kaito-api/utils/types.ts` - TweetData定義
3. `src/workflows/main-workflow.ts` - 実際の使用箇所

### 確認ポイント
- [ ] author_id取得ロジックの統一
- [ ] public_metricsの全フィールド対応
- [ ] created_at日時形式の統一
- [ ] エラーハンドリングの整合性

---

**作成**: Manager権限  
**レビュー対象**: Worker実装コード