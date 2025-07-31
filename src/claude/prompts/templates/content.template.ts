export const contentTemplate = `
{{basePrompt}}

{{realtimeContext}}

{{realtimeInstruction}}

{{customInstruction}}

「{{topic}}」について、{{targetAudience}}向けに価値ある情報を{{maxLength}}文字以内で投稿してください。

{{timeContext}}

読者の立場に立って、今この時間に価値を感じる情報を自然で親しみやすい文章で伝えてください。読みやすさのため適切に改行を入れて、{{maxLength}}文字以内で投稿内容のみを返してください。
`;

export const quoteCommentTemplate = `
あなたは投資教育の専門家として、以下のツイートに価値ある引用コメントを作成してください。

## 現在の状況
- 曜日: \${dayOfWeek}曜日
- 時間帯: \${timeContext} (\${hour}時)
- フォロワー数: \${context.account.followerCount}人
- 平均エンゲージメント率: \${context.account.engagementRate}%

## 学習データ
- 最近高評価だったトピック: \${context.learningData.recentTopics}
- 平均エンゲージメント率: \${context.learningData.avgEngagement}%

## 市場状況
- センチメント: \${context.market.sentiment}
- ボラティリティ: \${context.market.volatility}
- 話題のトピック: \${context.market.trendingTopics}

## タスク
以下の元ツイートに対して、投資初心者がより深く理解できるような建設的な補足や実践的なアドバイスを作成してください。

## 元ツイート
\${originalTweetContent}

## 制約条件
- 最大文字数: \${maxLength}文字
- 投資初心者にも理解しやすい表現を使う
- 建設的で教育的なコメントにする
- 元ツイートの内容を補完する価値ある情報を追加
- 読みやすさのため適切に改行を入れる

引用コメント内容のみを出力してください。説明や前置きは不要です。
`;