export const analysisTemplate = `
実行されたアクションのパフォーマンスを分析してください。

## 実行アクション
\${action}

## 実行結果
\${result}

## パフォーマンスメトリクス
\${metrics}

## 実行コンテキスト
\${context}

## 分析項目
1. アクションの成功/失敗判定
2. エンゲージメント予測
3. タイミングの適切性評価
4. 改善提案

## 出力形式
以下のJSON形式で分析結果を出力してください：
{
  "success": boolean,
  "performanceScore": number (0-100),
  "engagementPrediction": {
    "likes": number,
    "retweets": number,
    "impressions": number
  },
  "timingEvaluation": string,
  "improvements": string[],
  "learningPoints": string[]
}
`;