# TASK-001: 検索戦略改善 - リアルタイム性向上のための複数クエリ実装

## 📋 タスク概要
main-workflow.tsの検索部分を改善し、より多様で最新の投資関連ツイートを収集できるようにする。

## 🎯 実装目標
1. 複数の検索戦略を並列実行して多様な最新ツイートを収集
2. Twitter Advanced Search演算子を活用した高精度検索
3. 検索結果数を10件から25件に増加

## 📝 実装詳細

### 1. 検索戦略の実装場所
- **ファイル**: `src/workflows/main-workflow.ts`
- **メソッド**: `executePostAction`内の検索部分（396行目付近）
- **修正箇所**: target_query検索処理部分

### 2. 実装内容

#### 複数検索戦略の実装
```typescript
// 既存のif文内を以下のように改善
if (decision.parameters?.target_query || decision.parameters?.query) {
  const targetQuery = decision.parameters?.target_query || decision.parameters?.query;
  console.log(`🔍 参考ツイート検索中: "${targetQuery}"`);
  
  try {
    // 複数の検索戦略を定義
    const searchStrategies = [
      // 最新の話題を広く取得（2時間以内、最低10RT）
      `投資 OR 株 OR 為替 within_time:2h min_retweets:10`,
      
      // エンゲージメントの高い投資関連ツイート（リツイート除外）
      `(日経平均 OR ドル円 OR 米国株) filter:has_engagement -filter:retweets`,
      
      // ニュースリンク付きの最新投資情報（6時間以内）
      `投資 filter:news within_time:6h`,
      
      // 既存のtarget_queryも使用
      targetQuery
    ];

    // 各戦略で検索し、多様な最新ツイートを収集
    const allTweets = [];
    const searchPromises = searchStrategies.map(async (query) => {
      try {
        const result = await this.kaitoClient.searchTweets(query, {
          maxResults: 25,  // 10→25件に増加
          lang: 'ja',
          sortOrder: 'recency'  // 最新順で取得（KaitoAPIがサポートしている場合）
        });
        
        if (result.success && result.tweets.length > 0) {
          console.log(`✅ 検索成功: "${query}" - ${result.tweets.length}件取得`);
          return result.tweets;
        }
        return [];
      } catch (error) {
        console.warn(`⚠️ 検索失敗: "${query}"`, error);
        return [];
      }
    });

    // 並列実行して結果を収集
    const searchResults = await Promise.all(searchPromises);
    searchResults.forEach(tweets => allTweets.push(...tweets));

    // 重複を除去（tweet IDベース）
    const uniqueTweets = Array.from(
      new Map(allTweets.map(tweet => [tweet.id, tweet])).values()
    );

    console.log(`📊 検索結果統計: 合計${allTweets.length}件 → 重複除去後${uniqueTweets.length}件`);

    if (uniqueTweets.length > 0) {
      // 自分のツイートを除外
      const otherstweets = uniqueTweets.filter(tweet => {
        const currentUser = profile;
        return tweet.author_id !== currentUser.id;
      });
      
      // Claude Codeで分析して投資教育に適した参考ツイートを選択
      const topicContext = decision.parameters?.topic || 'investment';
      
      // 最大10件選択（増加）
      const selectedTweets = await ReferenceTweetAnalyzer.selectReferenceTweets(
        otherstweets.map(tweet => ({
          text: tweet.text,
          id: tweet.id,
          author_id: tweet.author_id,
          public_metrics: tweet.public_metrics,
          created_at: tweet.created_at  // 時刻情報も含める
        })),
        topicContext,
        10 // 3→10件に増加
      );
      
      if (selectedTweets.length > 0) {
        referenceTweets = selectedTweets;
        console.log(`✅ 高品質な参考ツイート ${referenceTweets.length}件を選択（リアルタイム性・関連度・品質順）`);
        
        // 選択されたツイートの詳細をログ
        referenceTweets.forEach((tweet, index) => {
          console.log(`  ${index + 1}. 関連度: ${tweet.relevanceScore?.toFixed(1)}/10, 品質: ${tweet.qualityScore?.toFixed(1)}/10, リアルタイム性: ${tweet.realtimeScore?.toFixed(1)}/10`);
          console.log(`     内容: ${tweet.text.substring(0, 50)}...`);
        });
      } else {
        console.log('⚠️ 品質基準を満たす参考ツイートが見つかりませんでした');
      }
    }
  } catch (searchError) {
    console.warn('⚠️ 参考ツイート検索失敗、通常のコンテンツ生成を実行:', searchError);
    // エラーでも続行
  }
}
```

### 3. 重要な注意事項
- **エラーハンドリング**: 各検索戦略は独立して実行し、1つが失敗しても他は継続
- **重複除去**: tweet IDベースで重複を除去
- **並列実行**: Promise.allで効率的に検索を実行
- **後方互換性**: 既存のコードフローを壊さないよう注意

### 4. テスト確認事項
- 検索結果が正しく収集されるか
- 重複除去が機能しているか
- エラー時でもコンテンツ生成が継続されるか
- パフォーマンスへの影響が許容範囲か

## 🚫 制約事項
- MVPの基本構造は変更しない
- 既存の動作を壊さない
- KaitoAPIの仕様範囲内で実装する

## 📊 期待される効果
- より多様な最新投資情報の収集
- リアルタイムトレンドへの対応力向上
- コンテンツ品質の向上