# TASK-007: 個別YAML形式保存指示書

## 🎯 新しい保存形式要件

**ユーザー要請**: 「これ見たいなyamlで保存するべき。１つずつ」  
**権限**: Worker権限必須  
**対象ファイル**: `scripts/fetch-my-tweets.ts`

## 📋 要求される変更内容

### 現在の保存形式（変更対象）
```yaml
# data/current/execution-YYYYMMDD-HHMM/post.yaml
timestamp: '2025-08-01T11:01:26.687Z'
total_posts: 150
posts:
  - id: '1951236827156803878'
    text: '🌃NY市場開始！...'
    created_at: '2025-08-01T10:00:00.000Z'
    metrics:
      likes: 5
      retweets: 2
      replies: 1
      quotes: 0
  - id: '1951236827156803879'
    text: '次の投稿...'
    # ... 150件の投稿が1つのファイルに
```

### 新しい保存形式（目標）
```yaml
# data/current/execution-YYYYMMDD-HHMM/tweet-001.yaml
executionId: 20250801-2000
actionType: post
timestamp: '2025-08-01T11:01:26.687Z'
content: |-
  🌃NY市場開始！金曜夜のドル円チェックポイント

  今日一日お疲れさまでした✨
  来週に向けて今夜の動きを確認しておきましょう

  ▫️ドル円：週末ポジション調整に注意
  ▫️クロス円：リスクオン・オフの流れを確認

  初心者の方は無理せず、まずは観察から📊
result:
  id: '1951236827156803878'
  url: https://twitter.com/i/status/1951236827156803878
  timestamp: '2025-08-01T11:01:26.687Z'
  success: true
engagement:
  likes: 5
  retweets: 2
  replies: 1
  quotes: 0
  impressions: 0
  bookmarks: 0
```

**ファイル構造変更**:
- ❌ 単一ファイル: `post.yaml`
- ✅ 個別ファイル: `tweet-001.yaml`, `tweet-002.yaml`, ..., `tweet-150.yaml`

## 🔧 修正仕様

### 1. saveToPostYaml メソッドを saveToIndividualYamls に変更

```typescript
/**
 * 個別YAML形式で保存（1ツイート = 1ファイル）
 */
async saveToIndividualYamls(tweets: Tweet[]): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const executionDir = `execution-${timestamp}`;
  
  console.log(`\n💾 個別YAML保存開始`);
  console.log(`📁 Execution Dir: ${executionDir}`);
  console.log(`📊 保存対象: ${tweets.length}件`);
  
  // DataManager設定
  this.dataManager.setCurrentExecutionId(executionDir);
  
  // 各ツイートを個別ファイルとして保存
  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    const tweetNumber = String(i + 1).padStart(3, '0'); // 001, 002, 003...
    const filename = `tweet-${tweetNumber}.yaml`;
    
    // ユーザー提供例に合わせたYAML構造
    const tweetData = {
      executionId: executionDir,
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
        impressions: 0, // TwitterAPI.ioでは取得不可
        bookmarks: 0    // TwitterAPI.ioでは取得不可
      }
    };
    
    try {
      await this.dataManager.saveExecutionData(filename, tweetData);
      
      if ((i + 1) % 10 === 0 || i === tweets.length - 1) {
        console.log(`💾 保存進捗: ${i + 1}/${tweets.length}件`);
      }
    } catch (error) {
      console.error(`❌ ${filename} 保存エラー:`, error);
      // 個別エラーでも継続処理
    }
  }
  
  // サマリーファイルも作成（オプション）
  const summaryData = {
    executionId: executionDir,
    timestamp: new Date().toISOString(),
    total_tweets: tweets.length,
    saved_files: tweets.map((_, i) => `tweet-${String(i + 1).padStart(3, '0')}.yaml`),
    date_range: {
      oldest: tweets[tweets.length - 1]?.created_at,
      newest: tweets[0]?.created_at
    }
  };
  
  await this.dataManager.saveExecutionData('summary.yaml', summaryData);
  
  console.log(`✅ 個別保存完了: ${tweets.length}ファイル + summary.yaml`);
  console.log(`📁 保存先: data/current/${executionDir}/`);
}
```

### 2. main関数の修正

```typescript
// 実行
async function main() {
  const fetcher = new TwitterPostsFetcher();
  
  try {
    console.log('🚀 Twitter投稿取得開始...');
    await fetcher.initialize();
    const tweets = await fetcher.fetchAllTweets();
    
    // 🚨 メソッド名変更
    await fetcher.saveToIndividualYamls(tweets);
    
    console.log('✅ 完了');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}
```

### 3. content形式の調整

**YAML multiline対応**:
```typescript
content: tweet.text  // ← 自動的に |- 形式でYAML出力される
```

**改行を含むツイートの適切な処理**:
- YAML標準形式で自動的に `|-` (literal scalar) として出力
- 改行・絵文字・特殊文字も正確に保持

## 🧪 期待される結果

### ディレクトリ構造
```
data/current/execution-20250801-1600/
├── tweet-001.yaml    # 最新ツイート
├── tweet-002.yaml    # 2番目のツイート
├── tweet-003.yaml    # 3番目のツイート
├── ...
├── tweet-087.yaml    # 最古のツイート
└── summary.yaml      # サマリー情報
```

### 個別ファイル例
```yaml
# tweet-001.yaml
executionId: execution-20250801-1600
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
  impressions: 0
  bookmarks: 0
```

### サマリーファイル例
```yaml
# summary.yaml
executionId: execution-20250801-1600
timestamp: '2025-08-01T16:00:30.123Z'
total_tweets: 87
saved_files:
  - tweet-001.yaml
  - tweet-002.yaml
  # ... 87ファイル分
date_range:
  oldest: '2025-07-15T08:22:10.000Z'
  newest: '2025-08-01T10:30:15.000Z'
```

## 🚀 実行・確認手順

### 1. 修正実行
```bash
npx tsx scripts/fetch-my-tweets.ts
```

### 2. 結果確認
```bash
# ディレクトリ確認
ls -la data/current/execution-*/

# ファイル数確認
ls data/current/execution-*/tweet-*.yaml | wc -l

# 最新ツイート確認
cat data/current/execution-*/tweet-001.yaml

# 最古ツイート確認
cat data/current/execution-*/tweet-087.yaml  # 実際の数に応じて

# サマリー確認
cat data/current/execution-*/summary.yaml
```

### 3. 成功基準
- ✅ 取得したツイート数と同数のYAMLファイルが作成される
- ✅ 各ファイルがユーザー提供例と同じ構造を持つ
- ✅ `content` フィールドがmultiline YAML形式で正しく保存される
- ✅ `engagement` データが正確に保存される
- ✅ ファイル命名が `tweet-001.yaml` ～ `tweet-XXX.yaml` 形式

## ⚠️ 重要な注意事項

### 1. ファイル数制限の考慮
- 1000件以上のツイートがある場合の処理速度
- ディスク容量の使用量増加

### 2. YAML形式の正確性
- 特殊文字（絵文字、記号）の適切なエスケープ
- 改行を含むテキストの正確な保存

### 3. エラーハンドリング
- 個別ファイル保存失敗時も全体処理は継続
- 部分的失敗の場合のレポート

---

**実装時間目安**: 30分（修正20分 + テスト10分）  
**重要度**: 🎯 高優先 - ユーザー指定フォーマット準拠

**🎯 実装者**: Worker権限で実装してください

**最終目標**: ユーザー指定の個別YAML形式での完全な保存機能実現