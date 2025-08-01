# TASK-002: ReferenceTweetAnalyzer拡張 - リアルタイム性評価の追加

## 📋 タスク概要
ReferenceTweetAnalyzerを拡張し、リアルタイム性を重視した選択基準を追加する。

## 🎯 実装目標
1. リアルタイム性スコアの判定基準追加
2. 総合的な選択基準の改善
3. Claude判断の精度向上

## 📝 実装詳細

### 1. 実装対象ファイル
- **新規作成**: `src/claude/utils/reference-tweet-analyzer.ts`

### 2. 実装内容

#### ReferenceTweetAnalyzerクラスの実装
```typescript
import { analyzeWithClaude } from '../endpoints/selection-endpoint';
import type { TweetCandidate } from '../types';

/**
 * 参考ツイート分析・選択クラス
 * 投資教育的価値・リアルタイム性・エンゲージメントを総合評価
 */
export class ReferenceTweetAnalyzer {
  /**
   * リアルタイム性を重視した参考ツイート選択
   * @param tweets 候補ツイート配列
   * @param topicContext 現在のトピックコンテキスト
   * @param maxCount 最大選択数
   * @returns 選択されたツイート（スコア付き）
   */
  static async selectReferenceTweets(
    tweets: Array<{
      text: string;
      id: string;
      author_id: string;
      public_metrics?: any;
      created_at?: string;
    }>,
    topicContext: string,
    maxCount: number
  ): Promise<any[]> {
    if (!tweets || tweets.length === 0) {
      return [];
    }

    // Claude向けのプロンプト構築
    const prompt = `
以下のツイートから、投資教育コンテンツ生成の参考として最適なツイートを選択してください。

【選択基準】
1. 品質スコア（1-10）: 内容の正確性・教育的価値
2. 関連度スコア（1-10）: ${topicContext}との関連性
3. リアルタイム性スコア（1-10）: 
   - 最新の市場動向・ニュース・トレンドを含むか（8-10点）
   - 今起きていることへの言及があるか（6-8点）
   - 具体的な数値・銘柄・イベントに言及しているか（5-7点）
   - 一般的な投資アドバイスのみ（1-4点）

【追加評価項目】
- 信頼性: 情報源の確実性、根拠の明確さ
- 独自性: ユニークな視点や分析があるか
- 実用性: 投資初心者〜中級者が活用できる情報か

【選択方法】
- 総合スコア = 品質×0.3 + 関連度×0.2 + リアルタイム性×0.5
- リアルタイム性を最重視し、今まさに注目すべき情報を優先
- 最大${maxCount}件を選択

【ツイート一覧】
${tweets.map((tweet, index) => `
[${index + 1}]
ID: ${tweet.id}
投稿時刻: ${tweet.created_at || '不明'}
内容: ${tweet.text}
エンゲージメント: いいね${tweet.public_metrics?.like_count || 0} RT${tweet.public_metrics?.retweet_count || 0}
`).join('\n')}

【出力形式】
選択したツイートのIDリストと各スコアをJSON形式で返してください。
例: [{"id": "123", "qualityScore": 8, "relevanceScore": 7, "realtimeScore": 9, "reason": "最新のFOMC結果に言及"}]
`;

    try {
      // Claudeによる分析
      const response = await analyzeWithClaude(prompt);
      
      // レスポンスのパース
      let selectedTweets = [];
      try {
        selectedTweets = JSON.parse(response);
      } catch (parseError) {
        console.error('❌ Claude応答のパースエラー:', parseError);
        // フォールバック: エンゲージメント順で選択
        return tweets
          .sort((a, b) => {
            const aEngagement = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0);
            const bEngagement = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0);
            return bEngagement - aEngagement;
          })
          .slice(0, maxCount)
          .map(tweet => ({
            ...tweet,
            qualityScore: 5,
            relevanceScore: 5,
            realtimeScore: 5,
            reason: 'フォールバック選択'
          }));
      }

      // 選択されたツイートに元データを結合
      const enrichedTweets = selectedTweets.map(selected => {
        const originalTweet = tweets.find(t => t.id === selected.id);
        return {
          ...originalTweet,
          qualityScore: selected.qualityScore,
          relevanceScore: selected.relevanceScore,
          realtimeScore: selected.realtimeScore,
          reason: selected.reason
        };
      }).filter(tweet => tweet !== undefined);

      return enrichedTweets;

    } catch (error) {
      console.error('❌ ReferenceTweetAnalyzer エラー:', error);
      // エラー時のフォールバック
      return tweets
        .slice(0, Math.min(3, maxCount))
        .map(tweet => ({
          ...tweet,
          qualityScore: 5,
          relevanceScore: 5,
          realtimeScore: 5,
          reason: 'エラーフォールバック'
        }));
    }
  }

  /**
   * ツイートのリアルタイム性を簡易判定（Claudeを使わない高速版）
   * @param text ツイート本文
   * @returns リアルタイム性スコア（1-10）
   */
  static evaluateRealtimeScore(text: string): number {
    let score = 3; // ベーススコア

    // 時間を示す表現
    const timeIndicators = ['今', '本日', '今日', '速報', 'breaking', '緊急', '最新'];
    if (timeIndicators.some(indicator => text.includes(indicator))) {
      score += 2;
    }

    // 具体的な数値
    if (/\d+[.％%円ドル]/g.test(text)) {
      score += 2;
    }

    // 市場イベント
    const marketEvents = ['FOMC', '日銀', '決算', '指標', 'GDP', 'CPI', '雇用統計'];
    if (marketEvents.some(event => text.includes(event))) {
      score += 2;
    }

    // 銘柄コード
    if (/[0-9]{4}|[A-Z]{2,5}/g.test(text)) {
      score += 1;
    }

    return Math.min(score, 10);
  }
}
```

### 3. 既存ファイルへのエクスポート追加
**ファイル**: `src/claude/utils/index.ts`に以下を追加：
```typescript
export { ReferenceTweetAnalyzer } from './reference-tweet-analyzer';
```

### 4. main-workflow.tsでのインポート修正
**ファイル**: `src/workflows/main-workflow.ts`の19行目付近に追加：
```typescript
import { ReferenceTweetAnalyzer } from '../claude/utils';
```

### 5. 重要な注意事項
- **Claude API呼び出し**: selection-endpointの既存関数を再利用
- **エラーハンドリング**: Claudeエラー時はフォールバック処理
- **パフォーマンス**: 大量のツイートでも高速に処理
- **型安全性**: TypeScriptの型を適切に定義

## 🚫 制約事項
- selection-endpointの既存実装を変更しない
- Claude APIの呼び出し回数を最小限に抑える
- 既存の型定義と整合性を保つ

## 📊 期待される効果
- リアルタイムな市場情報の優先的な選択
- より価値のある参考ツイートの提供
- コンテンツ生成の品質向上