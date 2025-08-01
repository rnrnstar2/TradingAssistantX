# TASK-008: ディレクトリ構造・保存形式修正指示書

## 🎯 ユーザー要求の修正対応

**ユーザー要請**: 
- 出力パスから`execution-`プレフィックスを削除
- 各ツイートごとに個別ディレクトリ作成
- 各ディレクトリ内に`post.yaml`として保存
- engagementの実際の数値を反映
- **既存ファイルがある場合は上書き保存**

**権限**: Worker権限必須  
**対象ファイル**: `scripts/fetch-my-tweets.ts`

## 📋 要求される変更内容

### 現在の出力構造（問題点）
```
data/current/execution-20250801-1259/
├── tweet-001.yaml
├── tweet-002.yaml
├── tweet-003.yaml
└── summary.yaml
```

### 期待される出力構造（目標）
```
data/current/
├── 20250801-1851/
│   └── post.yaml  # 1つ目のツイート
├── 20250801-1852/
│   └── post.yaml  # 2つ目のツイート
├── 20250801-1853/
│   └── post.yaml  # 3つ目のツイート
└── ...
```

**変更点**:
1. ❌ `execution-` プレフィックス付きディレクトリ
2. ✅ `YYYYMMDD-HHMM` 形式のみ
3. ❌ 1ディレクトリに複数ファイル
4. ✅ 1ツイート = 1ディレクトリ = 1 `post.yaml`

## 🔧 修正仕様

### 1. saveToIndividualYamls メソッドの全面改修

```typescript
/**
 * 各ツイートを個別ディレクトリのpost.yamlとして保存
 */
async saveToIndividualDirectories(tweets: Tweet[]): Promise<void> {
  console.log(`\n💾 個別ディレクトリ保存開始`);
  console.log(`📊 保存対象: ${tweets.length}件`);
  
  const savedDirectories: string[] = [];
  
  // 各ツイートを個別ディレクトリに保存
  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    
    // 各ツイートごとに時刻をずらしてディレクトリ名生成
    // ベースタイムスタンプから分単位でインクリメント
    const baseDate = new Date();
    baseDate.setMinutes(baseDate.getMinutes() + i);
    
    const timestamp = baseDate.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
    const executionDir = timestamp; // execution-プレフィックスなし
    
    // ユーザー提供例に合わせたYAML構造
    const postData = {
      executionId: timestamp,
      actionType: 'post',
      timestamp: tweet.created_at,
      content: tweet.text,
      result: {
        id: tweet.id,
        url: `https://twitter.com/i/status/${tweet.id}`,
        timestamp: tweet.created_at,
        success: true
      },
      engagement: {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
        quotes: tweet.public_metrics.quote_count,
        impressions: tweet.public_metrics.impression_count || 0,
        bookmarks: tweet.public_metrics.bookmark_count || 0
      }
    };
    
    try {
      // DataManagerに個別ディレクトリを設定
      this.dataManager.setCurrentExecutionId(executionDir);
      
      // post.yamlとして保存（既存ファイルは上書き）
      await this.dataManager.saveExecutionData('post.yaml', postData);
      
      savedDirectories.push(executionDir);
      
      if ((i + 1) % 10 === 0 || i === tweets.length - 1) {
        console.log(`💾 保存進捗: ${i + 1}/${tweets.length}件`);
      }
    } catch (error) {
      console.error(`❌ ${executionDir}/post.yaml 保存エラー:`, error);
      // 個別エラーでも継続処理
    }
  }
  
  console.log(`✅ 保存完了: ${savedDirectories.length}ディレクトリ`);
  console.log(`📁 保存先例:`);
  console.log(`  - data/current/${savedDirectories[0]}/post.yaml`);
  if (savedDirectories.length > 1) {
    console.log(`  - data/current/${savedDirectories[1]}/post.yaml`);
  }
  if (savedDirectories.length > 2) {
    console.log(`  - ... (全${savedDirectories.length}ディレクトリ)`);
  }
}
```

### 2. Tweet型の確認と拡張

```typescript
// TwitterAPI.ioの実際のレスポンスに基づいてengagementデータを取得
// public_metricsの完全な構造を確認
interface ExtendedPublicMetrics {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  impression_count?: number;  // TwitterAPI.ioで利用可能な場合
  bookmark_count?: number;    // TwitterAPI.ioで利用可能な場合
}
```

### 3. main関数の修正

```typescript
// 実行
async function main() {
  const fetcher = new TwitterPostsFetcher();
  
  try {
    console.log('🚀 Twitter投稿取得開始...');
    await fetcher.initialize();
    const tweets = await fetcher.fetchAllTweets();
    
    // 🚨 メソッド名変更
    await fetcher.saveToIndividualDirectories(tweets);
    
    console.log('✅ 完了');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}
```

### 4. engagementデータの完全取得

**normalizeResponse改善（src/kaito-api/endpoints/read-only/user-last-tweets.ts）**:

```typescript
private normalizeTweet(tweet: any): Tweet {
  return {
    id: tweet.id || tweet.id_str,
    text: tweet.text || tweet.full_text || '',
    author_id: tweet.author_id || tweet.user?.id_str,
    author_username: tweet.author_username || tweet.user?.screen_name,
    created_at: tweet.created_at,
    public_metrics: {
      like_count: tweet.public_metrics?.like_count || tweet.favorite_count || 0,
      retweet_count: tweet.public_metrics?.retweet_count || tweet.retweet_count || 0,
      reply_count: tweet.public_metrics?.reply_count || 0,
      quote_count: tweet.public_metrics?.quote_count || 0,
      // 🚨 追加: impressionsとbookmarksの取得
      impression_count: tweet.public_metrics?.impression_count || tweet.impression_count || 0,
      bookmark_count: tweet.public_metrics?.bookmark_count || tweet.bookmark_count || 0
    },
    entities: tweet.entities,
    referenced_tweets: tweet.referenced_tweets,
    lang: tweet.lang,
    possibly_sensitive: tweet.possibly_sensitive
  };
}
```

## 🧪 期待される結果

### ディレクトリ構造
```bash
$ ls -la data/current/
20250801-1851/
20250801-1852/
20250801-1853/
20250801-1854/
...
```

### 各ディレクトリ内容
```bash
$ ls -la data/current/20250801-1851/
post.yaml
```

### post.yaml内容例
```yaml
executionId: 20250801-1851
actionType: post
timestamp: '2025-08-01T10:30:15.000Z'
content: |-
  📈USD/JPY分析レポート

  現在値: 149.85
  サポート: 149.20
  レジスタンス: 150.50

  本日のポイント:
  ✅14:30 米GDP発表
  ✅21:30 雇用統計

  #FX #USD #JPY
result:
  id: '1951236827156803878'
  url: https://twitter.com/i/status/1951236827156803878
  timestamp: '2025-08-01T10:30:15.000Z'
  success: true
engagement:
  likes: 12
  retweets: 3
  replies: 2
  quotes: 1
  impressions: 245    # 実際の値
  bookmarks: 5        # 実際の値
```

## 🚀 実行・確認手順

### 1. 修正実行
```bash
npx tsx scripts/fetch-my-tweets.ts
```

### 2. 結果確認
```bash
# ディレクトリ一覧確認
ls -la data/current/ | grep -E "^d.*[0-9]{8}-[0-9]{4}$"

# 最初のツイート確認
cat data/current/20250801-*/post.yaml | head -20

# ディレクトリ数確認
ls -d data/current/20250801-*/ | wc -l

# engagement値確認
grep -A 6 "engagement:" data/current/20250801-*/post.yaml | head -20
```

### 3. 成功基準
- ✅ `execution-`プレフィックスなしのディレクトリ名
- ✅ 各ツイートごとに個別ディレクトリ
- ✅ 各ディレクトリに`post.yaml`という名前で保存
- ✅ engagement値が実際の数値（0以外も含む）
- ✅ **既存ファイルがある場合は警告なしで上書き**

## ⚠️ 重要な注意事項

### 1. 時刻増分の考慮
- 多数のツイート（100件以上）の場合、時刻が日付をまたぐ可能性
- 必要に応じて秒単位での増分も検討

### 2. impressions/bookmarksデータ
- TwitterAPI.ioで取得できない場合は0のまま
- 取得可能な場合は実際の値を反映

### 3. ディレクトリ作成の効率性
- 大量のディレクトリ作成によるパフォーマンスへの影響
- エラーハンドリングの重要性

### 4. 既存ファイルの上書き
- **DataManager.saveExecutionData()は既定で上書き保存**
- ファイル存在確認や警告は不要（ユーザー要望）
- 再実行時は既存データが完全に置き換えられる

---

**実装時間目安**: 40分（修正25分 + テスト15分）  
**重要度**: 🎯 高優先 - ユーザー指定形式準拠

**🎯 実装者**: Worker権限で実装してください

**最終目標**: 各ツイートを個別ディレクトリの`post.yaml`として、実際のengagement値と共に保存