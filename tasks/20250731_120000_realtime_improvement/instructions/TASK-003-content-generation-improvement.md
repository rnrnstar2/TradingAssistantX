# TASK-003: コンテンツ生成改善 - リアルタイムコンテキストの活用

## 📋 タスク概要
content-endpointとmain-workflow.tsを改善し、リアルタイムな参考ツイートを活用した高品質なコンテンツ生成を実現する。

## 🎯 実装目標
1. リアルタイムコンテキストパラメータの追加
2. 参考ツイートを活用した生成プロンプトの改善
3. より魅力的で時事性のあるコンテンツ生成

## 📝 実装詳細

### 1. 型定義の拡張
**ファイル**: `src/claude/types.ts`に以下を追加：

```typescript
// ContentGenerationRequestの拡張
export interface ContentGenerationRequest {
  topic: string;
  contentType: 'educational' | 'market_analysis' | 'beginner_tips' | 'news_commentary';
  targetAudience: 'beginner' | 'intermediate' | 'general';
  maxLength?: number;
  realtimeContext?: boolean;  // 新規追加：リアルタイムコンテキストを重視するか
}

// SystemContextの拡張（既存の定義に追加）
export interface SystemContext {
  // ... 既存のフィールド ...
  referenceTweets?: Array<{  // 新規追加：参考ツイート情報
    text: string;
    qualityScore?: number;
    relevanceScore?: number;
    realtimeScore?: number;
    reason?: string;
  }>;
  instruction?: string;  // 新規追加：追加指示
}
```

### 2. content-builder.tsの改善
**ファイル**: `src/claude/prompts/builders/content-builder.ts`の改善：

```typescript
// buildContentPromptメソッドの改善
buildContentPrompt(
  request: ContentGenerationRequest,
  context: SystemContext
): string {
  const basePrompt = super.buildBasePrompt(context);
  const template = contentTemplate;
  
  // リアルタイムコンテキストの構築
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

  // リアルタイム性を重視した追加指示
  let realtimeInstruction = '';
  if (request.realtimeContext) {
    realtimeInstruction = `
【リアルタイム性重視】
参考ツイートで言及されている最新の市場動向やニュースを踏まえて、
初心者にも分かりやすく解説する投稿を作成してください。
具体的な数値や出来事に言及することで、リアルタイム性を高めてください。
`;
  }

  // カスタム指示の追加
  const customInstruction = context.instruction || '';

  return template
    .replace('{{basePrompt}}', basePrompt)
    .replace('{{topic}}', request.topic)
    .replace('{{contentType}}', this.getContentTypeDescription(request.contentType))
    .replace('{{targetAudience}}', this.getAudienceDescription(request.targetAudience))
    .replace('{{maxLength}}', (request.maxLength || 140).toString())
    .replace('{{realtimeContext}}', realtimeContextSection)
    .replace('{{realtimeInstruction}}', realtimeInstruction)
    .replace('{{customInstruction}}', customInstruction)
    .replace('{{timeContext}}', this.getTimeContextPrompt(context));
}
```

### 3. content.template.tsの更新
**ファイル**: `src/claude/prompts/templates/content.template.ts`に以下を追加：

```typescript
export const contentTemplate = `
{{basePrompt}}

{{realtimeContext}}

{{realtimeInstruction}}

{{customInstruction}}

「{{topic}}」について、{{targetAudience}}向けに価値ある情報を{{maxLength}}文字以内で投稿してください。

{{timeContext}}

読者の立場に立って、今この時間に価値を感じる情報を自然で親しみやすい文章で伝えてください。読みやすさのため適切に改行を入れて、{{maxLength}}文字以内で投稿内容のみを返してください。
`;
```

### 4. main-workflow.tsの改善
**ファイル**: `src/workflows/main-workflow.ts`の481-489行目付近を改善：

```typescript
// コンテンツ生成部分の改善
const content = await generateContent({
  request: {
    topic: decision.parameters?.topic || 'investment',
    contentType: 'educational',
    targetAudience: 'beginner',
    realtimeContext: true  // 新規追加：リアルタイムコンテキストを有効化
  },
  context: {
    ...systemContext,
    referenceTweets: referenceTweets ? referenceTweets.map(tweet => ({
      text: tweet.text,
      qualityScore: tweet.qualityScore,
      relevanceScore: tweet.relevanceScore,
      realtimeScore: tweet.realtimeScore,
      reason: tweet.reason
    })) : undefined,
    instruction: referenceTweets && referenceTweets.length > 0 
      ? '参考ツイートで言及されている最新の動向を踏まえて、初心者にも分かりやすく価値ある情報を提供してください。'
      : undefined
  }
});
```

### 5. 重要な注意事項
- **後方互換性**: 既存のAPIインターフェースを維持
- **オプショナル**: 新規フィールドは全てオプショナルに
- **プロンプト最適化**: トークン数を意識した効率的なプロンプト
- **エラーハンドリング**: 参考ツイートがない場合も正常動作

## 🚫 制約事項
- 既存のエンドポイントインターフェースを破壊しない
- Claude APIの呼び出し方法は変更しない
- 型安全性を維持する

## 📊 期待される効果
- より時事性の高いコンテンツ生成
- 参考ツイートの効果的な活用
- エンゲージメント率の向上
- 投資初心者にとってより価値のある情報提供