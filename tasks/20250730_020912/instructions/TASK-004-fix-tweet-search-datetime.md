# TASK-004: ツイート検索API日時処理エラーの修正

## 📋 タスク概要
ツイート検索APIで発生している「Invalid time value」エラーの修正とデータ正規化処理の安全性向上

## 🎯 現状の問題

### エラー内容
- **エラー箇所**: `src/kaito-api/endpoints/read-only/tweet-search.ts:556`
- **エラー内容**: `API error in searchRecentTweets: Invalid time value`
- **原因**: `new Date(apiTweet.created_at).toISOString()` での無効な日時値処理

### 影響範囲
- 検索結果が取得できない
- waitアクションにフォールバック
- リツイート・いいね・引用ツイート機能が制限される

## 📐 実装要件

### 1. 安全な日時処理の実装

**修正対象ファイル**: `src/kaito-api/endpoints/read-only/tweet-search.ts`

**現在の問題コード（556行目）**:
```typescript
created_at: new Date(apiTweet.created_at).toISOString(),
```

**修正版**:
```typescript
created_at: this.safeDateToISO(apiTweet.created_at),
```

### 2. 安全な日時変換ヘルパー関数の追加

**TweetSearchEndpoint クラス内に追加**:

```typescript
/**
 * 安全な日時変換処理
 */
private safeDateToISO(dateValue: any): string {
  try {
    // null/undefined チェック
    if (!dateValue) {
      return new Date().toISOString(); // 現在時刻をフォールバック
    }
    
    // 文字列の場合
    if (typeof dateValue === 'string') {
      // 空文字列チェック
      if (dateValue.trim() === '') {
        return new Date().toISOString();
      }
      
      // 日時形式の正規化
      const normalizedDate = dateValue
        .replace(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
        .replace(/(\w{3}) (\w{3}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) \+0000 (\d{4})/, '$7-$2-$3T$4:$5:$6Z');
      
      const date = new Date(normalizedDate);
      
      // 有効な日時かチェック
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ 無効な日時形式: ${dateValue}, 現在時刻を使用`);
        return new Date().toISOString();
      }
      
      return date.toISOString();
    }
    
    // 数値の場合（Unix timestamp）
    if (typeof dateValue === 'number') {
      // ミリ秒かどうか判定（Unix timestampは通常10桁）
      const timestamp = dateValue.toString().length === 10 ? dateValue * 1000 : dateValue;
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ 無効なタイムスタンプ: ${dateValue}, 現在時刻を使用`);
        return new Date().toISOString();
      }
      
      return date.toISOString();
    }
    
    // その他の型の場合
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ 変換できない日時値: ${dateValue}, 現在時刻を使用`);
      return new Date().toISOString();
    }
    
    return date.toISOString();
    
  } catch (error) {
    console.error(`❌ 日時変換エラー: ${dateValue}`, error);
    // エラー時は現在時刻を返す
    return new Date().toISOString();
  }
}
```

### 3. client.ts の戻り値形式調整

**修正対象**: `src/kaito-api/core/client.ts` の searchTweets メソッド（1904-1911行目）

**現在のコード**:
```typescript
if (result.success && result.data) {
  return {
    success: true,
    tweets: result.data.tweets
  };
}
```

**修正版**:
```typescript
if (result.success && result.tweets) {
  return {
    success: true,
    tweets: result.tweets
  };
}
```

### 4. エラーハンドリングの強化

**normalizeTweetData メソッドの追加のエラーハンドリング**:

```typescript
private async normalizeTweetData(apiTweet: any): Promise<TweetData> {
  try {
    return {
      id: apiTweet.id_str || apiTweet.id || `fallback_${Date.now()}`,
      text: apiTweet.full_text || apiTweet.text || '',
      created_at: this.safeDateToISO(apiTweet.created_at),
      authorId: apiTweet.user?.id_str || apiTweet.author_id || 'unknown',
      authorUsername: apiTweet.user?.screen_name || apiTweet.author_username || 'unknown',
      authorDisplayName: apiTweet.user?.name || apiTweet.author_display_name || 'Unknown User',
      // ... 他のフィールドも同様に安全な処理
    };
  } catch (error) {
    console.error('❌ ツイートデータ正規化エラー:', error);
    console.error('問題のあるデータ:', JSON.stringify(apiTweet, null, 2));
    
    // フォールバックデータを返す
    return {
      id: `error_${Date.now()}`,
      text: 'データ取得エラー',
      created_at: new Date().toISOString(),
      authorId: 'unknown',
      authorUsername: 'unknown',
      authorDisplayName: 'Unknown User',
      metrics: { retweetCount: 0, likeCount: 0, replyCount: 0, quoteCount: 0 },
      publicMetrics: { retweetCount: 0, likeCount: 0, replyCount: 0, quoteCount: 0 },
      isRetweet: false,
      isReply: false,
      isQuoteTweet: false,
      lang: 'en',
      source: 'unknown',
      entities: { hashtags: [], mentions: [], urls: [] }
    };
  }
}
```

## ⚠️ 制約事項

### MVP制約
- **安全性優先**: データエラーでも処理継続
- **シンプル実装**: 複雑な日時パースは避ける
- **フォールバック戦略**: エラー時は現在時刻使用

### 技術制約
- TypeScript strictモード準拠
- 既存のAPIインターフェース維持
- パフォーマンス考慮（過度な処理は避ける）

## ✅ 完了条件

### 主要な成功条件
1. `pnpm dev:quote` が正常実行される
2. ツイート検索結果が正常取得される
3. 「Invalid time value」エラーが解消される
4. 引用ツイート・リツイート・いいねが動作する

### 動作確認テスト
```bash
# 各検索機能の動作確認
pnpm dev:quote    # 引用ツイート（検索機能使用）
pnpm dev:retweet  # リツイート（検索機能使用）
pnpm dev:like     # いいね（検索機能使用）
```

**期待される結果**:
- 検索エラーが発生しない
- 実際のツイートが検索・表示される
- waitアクションへのフォールバックが発生しない

## 📝 報告書作成時の確認事項

### 修正内容
- 実装した安全な日時処理の詳細
- エラーハンドリングの強化内容
- フォールバック戦略の動作確認

### 動作確認結果
- 各検索アクションの実行結果
- 検索で取得されたツイート数と品質
- エラーメッセージの改善状況
- 実行時間とパフォーマンス

### デバッグ情報
- 修正前後のAPIレスポンス形式
- 日時変換処理の成功率
- 発生したフォールバック事例