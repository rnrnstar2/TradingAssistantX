# TASK-004: Claude SDKプロンプトへの参考ユーザーツイート統合

## 🎯 タスク概要
Claude SDKのプロンプトビルダーとテンプレートを修正し、参考ユーザー（reference accounts）の最新ツイートをプロンプトに含めて、よりリアルタイム性の高いコンテンツ生成を可能にする。

## 📋 実装要件

### 1. プロンプトテンプレートの修正
**修正ファイル**: `src/claude/prompts/templates/content.template.ts`

**修正内容**:
```typescript
export const contentTemplate = `
{{basePrompt}}

{{realtimeContext}}

{{referenceAccountContext}}

{{realtimeInstruction}}

{{customInstruction}}

「{{topic}}」について、{{targetAudience}}向けに価値ある情報を{{maxLength}}文字以内で投稿してください。

{{timeContext}}

読者の立場に立って、具体的で実践的な情報を自然で親しみやすい文章で伝えてください。読みやすさのため適切に改行を入れて、{{maxLength}}文字以内で投稿内容のみを返してください。
`;

// 既存のquoteCommentTemplateはそのまま
```

### 2. コンテンツビルダーの修正
**修正ファイル**: `src/claude/prompts/builders/content-builder.ts`

**修正内容**:
```typescript
buildContentPrompt(
  request: ContentGenerationRequest,
  context: SystemContext
): string {
  const basePrompt = this.buildPrompt({
    topic: request.topic,
    targetAudience: request.targetAudience || 'beginner',
    context: context
  });
  const template = contentTemplate;
  
  // 既存のリアルタイムコンテキスト（検索結果）
  let realtimeContextSection = '';
  if (context.referenceTweets && context.referenceTweets.length > 0) {
    realtimeContextSection = `
【高エンゲージメント参考ツイート】
${context.referenceTweets.map((tweet, index) => 
  `${index + 1}. (エンゲージメント: ${tweet.qualityScore || 0}) ${tweet.text}`
).join('\n')}

上記の高エンゲージメントツイートを参考に、より魅力的で価値のある投稿を作成してください。
ただし、内容をそのまま真似るのではなく、投資初心者に分かりやすく、独自の視点で価値を提供してください。
`;
  }

  // 新規追加：参考アカウントのコンテキスト
  let referenceAccountContextSection = '';
  if (context.referenceAccountTweets && context.referenceAccountTweets.length > 0) {
    referenceAccountContextSection = `
【リアルタイム情報源からの最新ツイート】
${context.referenceAccountTweets.map(account => {
  const latestTweets = account.tweets.slice(0, 3); // 各アカウントから最新3件
  return `
◆ @${account.username}の最新情報:
${latestTweets.map((tweet, idx) => 
  `${idx + 1}. ${tweet.text.substring(0, 150)}${tweet.text.length > 150 ? '...' : ''}`
).join('\n')}`;
}).join('\n')}

上記の信頼できる情報源からの最新情報を踏まえて、
初心者にも分かりやすく、タイムリーで価値のある投稿を作成してください。
具体的な数値や出来事に言及する場合は、情報源を参考にしながら正確に伝えてください。
`;
  }

  // リアルタイム性を重視した追加指示の強化
  let realtimeInstruction = '';
  if (request.realtimeContext || referenceAccountContextSection) {
    realtimeInstruction = `
【リアルタイム性重視】
${referenceAccountContextSection ? '信頼できる情報源の最新ツイートと、' : ''}
${realtimeContextSection ? '高エンゲージメントツイートを参考に、' : ''}
今まさに注目すべき情報を初心者にも分かりやすく解説してください。

重要なポイント：
- 最新の市場動向やニュースに言及する場合は、具体的かつ正確に
- 専門用語は必要最小限にとどめ、使う場合は簡潔な説明を追加
- 情報の鮮度を活かしつつ、教育的価値を提供
- 読者が今すぐ行動できる実践的なアドバイスを含める
`;
  }

  // カスタム指示の追加
  const customInstruction = context.instruction || '';

  return template
    .replace('{{basePrompt}}', basePrompt)
    .replace('{{topic}}', request.topic)
    .replace('{{contentType}}', this.getContentTypeDescription(request.contentType || 'educational'))
    .replace('{{targetAudience}}', this.getAudienceDescription(request.targetAudience || 'beginner'))
    .replace('{{maxLength}}', (request.maxLength || 140).toString())
    .replace('{{realtimeContext}}', realtimeContextSection)
    .replace('{{referenceAccountContext}}', referenceAccountContextSection)
    .replace('{{realtimeInstruction}}', realtimeInstruction)
    .replace('{{customInstruction}}', customInstruction)
    .replace('{{timeContext}}', this.getTimeContextPrompt(context));
}
```

### 3. ベースビルダーの拡張
**修正ファイル**: `src/claude/prompts/builders/base-builder.ts`

**追加メソッド**:
```typescript
/**
 * 参考アカウント情報の要約を生成
 */
protected summarizeReferenceAccounts(referenceAccountTweets?: any[]): string {
  if (!referenceAccountTweets || referenceAccountTweets.length === 0) {
    return '';
  }

  const accountSummaries = referenceAccountTweets.map(account => {
    const tweetCount = account.tweets.length;
    const latestTweet = account.tweets[0];
    const avgEngagement = this.calculateAverageEngagement(account.tweets);
    
    return `@${account.username}: ${tweetCount}件の最新情報（平均エンゲージメント: ${avgEngagement.toFixed(1)}）`;
  });

  return `参考情報源: ${accountSummaries.join(', ')}`;
}

/**
 * ツイートの平均エンゲージメントを計算
 */
private calculateAverageEngagement(tweets: any[]): number {
  if (!tweets || tweets.length === 0) return 0;
  
  const totalEngagement = tweets.reduce((sum, tweet) => {
    const metrics = tweet.public_metrics || {};
    return sum + (metrics.like_count || 0) + (metrics.retweet_count || 0);
  }, 0);
  
  return totalEngagement / tweets.length;
}

/**
 * 情報の新鮮度を評価
 */
protected evaluateFreshness(tweets: any[]): string {
  if (!tweets || tweets.length === 0) return 'データなし';
  
  const now = new Date();
  const latestTweetTime = new Date(tweets[0].created_at);
  const hoursDiff = (now.getTime() - latestTweetTime.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff < 1) return '1時間以内の最新情報';
  if (hoursDiff < 6) return '6時間以内の情報';
  if (hoursDiff < 24) return '24時間以内の情報';
  return '1日以上前の情報';
}
```

### 4. コンテンツエンドポイントでのログ強化
**修正ファイル**: `src/claude/endpoints/content-endpoint.ts`

**buildContentPrompt関数内に追加**:
```typescript
// 参考アカウントツイートを含める（存在する場合）
if (context?.referenceAccountTweets && context.referenceAccountTweets.length > 0) {
  prompt += `【リアルタイム情報源】\n`;
  context.referenceAccountTweets.forEach(account => {
    const freshness = evaluateFreshness(account.tweets);
    prompt += `・@${account.username}: ${account.tweets.length}件の最新ツイート（${freshness}）\n`;
    
    // 最新3件のツイート概要を含める
    account.tweets.slice(0, 3).forEach((tweet, idx) => {
      const tweetTime = new Date(tweet.created_at).toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      prompt += `  ${idx + 1}. [${tweetTime}] ${tweet.text.substring(0, 80)}...\n`;
    });
  });
  prompt += '\nこれらの最新情報を参考に、タイムリーで価値のある投稿を作成してください。\n\n';
}
```

## ⚠️ 実装時の注意事項

1. **情報の優先順位**: 
   - 参考アカウントツイート（最新の信頼できる情報）
   - 検索結果の高エンゲージメントツイート（人気のある内容）
   - 両方を適切にバランスして使用

2. **プロンプトサイズ**: 参考ツイートが多い場合は要約して含める
3. **情報の正確性**: 参考アカウントの情報を使う際は、誤解を招かないよう注意
4. **文字数制限**: プロンプトが長くなりすぎないよう、適切に要約
5. **エラーハンドリング**: 参考アカウント情報がない場合も正常に動作

## 🧪 テスト要件

1. 参考アカウントツイートありの場合のプロンプト生成テスト
2. 参考アカウントツイートなしの場合のプロンプト生成テスト
3. 検索結果と参考アカウントの両方がある場合のテスト
4. プロンプトサイズの検証（Claude APIの制限内か）
5. 生成されたコンテンツの品質確認

## 📁 成果物

1. `src/claude/prompts/templates/content.template.ts` - テンプレート修正
2. `src/claude/prompts/builders/content-builder.ts` - ビルダー機能拡張
3. `src/claude/prompts/builders/base-builder.ts` - 共通メソッド追加
4. `src/claude/endpoints/content-endpoint.ts` - ログ機能強化

## ✅ 完了条件

- [ ] 参考アカウントツイートがプロンプトに含まれる
- [ ] 情報の新鮮度が評価・表示される
- [ ] 検索結果と参考アカウントの両方が適切に処理される
- [ ] プロンプトが読みやすく整理されている
- [ ] TypeScriptのコンパイルエラーがない
- [ ] 既存の機能に影響がない