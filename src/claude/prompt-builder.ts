/**
 * Claude Code SDK プロンプト最適化モジュール
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * Claude用プロンプト構築・最適化機能
 */

export interface PromptConfig {
  contentType: string;
  targetAudience: string;
  maxLength: number;
  includeRiskWarning?: boolean;
}

/**
 * Claude用プロンプト最適化クラス
 * 効果的なプロンプト構築・品質向上機能
 */
export class PromptBuilder {
  private readonly MAX_CONTENT_LENGTH = 280;

  constructor() {
    console.log('✅ PromptBuilder initialized - Claude最適化版');
  }

  /**
   * メインプロンプト構築
   * Claude向け最適化プロンプト生成
   */
  buildPrompt(topic: string, context: any, config: PromptConfig): string {
    const { contentType, targetAudience, maxLength, includeRiskWarning = true } = config;
    
    let prompt = `投資教育Xアカウント用の高品質投稿を作成してください。

テーマ: ${topic}
コンテンツタイプ: ${contentType}
対象読者: ${targetAudience === 'beginner' ? '投資初心者' : '投資経験者'}
最大文字数: ${maxLength}文字`;

    if (context) {
      prompt += `\nコンテキスト: ${JSON.stringify(context).substring(0, 100)}`;
    }

    prompt += `

要件:
- ${targetAudience === 'beginner' ? '初心者にも理解しやすい' : '実践的で有用な'}内容
- 具体的で実用的なアドバイス
- 教育的価値の高い情報
- エンゲージメントを促進する要素（質問など）`;

    if (includeRiskWarning) {
      prompt += `
- 適切なリスク注意点を含める`;
    }

    prompt += `
- 自然で読みやすい日本語

${maxLength}文字以内で投稿内容のみを返してください。`;

    return prompt;
  }

  /**
   * 判断用プロンプト構築
   * アクション決定のためのプロンプト生成
   */
  buildDecisionPrompt(context: any): string {
    return `投資教育X自動化システムのアクション判断を行ってください。

現在状況:
${JSON.stringify(context, null, 2)}

以下から最適なアクションを選択し、理由を含めて回答してください:
1. post - 投稿作成
2. retweet - リツイート
3. quote_tweet - 引用ツイート
4. like - いいね
5. wait - 待機

JSON形式で回答してください:
{
  "action": "選択したアクション",
  "reasoning": "判断理由",
  "confidence": 0.8,
  "parameters": { "topic": "投稿トピック" }
}`;
  }

  /**
   * コンテンツ品質向上プロンプト
   * 生成済みコンテンツの改善用プロンプト
   */
  buildQualityImprovementPrompt(content: string, issues: string[]): string {
    return `以下の投稿内容を改善してください。

現在の投稿:
${content}

改善点:
${issues.map(issue => `- ${issue}`).join('\n')}

改善要求:
- 教育的価値を向上させる
- 読みやすさを改善する
- エンゲージメントを促進する要素を追加
- 280文字以内で最適化

改善された投稿内容のみを返してください。`;
  }

  /**
   * プロンプト最適化
   * Claude応答品質向上のためのプロンプト調整
   */
  optimizePrompt(basePrompt: string, previousResults?: any[]): string {
    let optimizedPrompt = basePrompt;

    // 過去の結果に基づく最適化
    if (previousResults && previousResults.length > 0) {
      const successPatterns = this.analyzeSuccessPatterns(previousResults);
      if (successPatterns.length > 0) {
        optimizedPrompt += `\n\n成功パターンを参考にしてください:\n${successPatterns.slice(0, 2).join('\n')}`;
      }
    }

    // Claude向け指示強化
    optimizedPrompt += `\n\n重要: 
- 日本語で自然な表現を使用
- 投資初心者の視点を考慮
- 実用的で具体的な内容を心がける`;

    return optimizedPrompt;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * 成功パターン分析
   */
  private analyzeSuccessPatterns(results: any[]): string[] {
    const patterns: string[] = [];
    
    results.filter(r => r.success).forEach(result => {
      if (result.content?.includes('？')) {
        patterns.push('- 質問形式は効果的です');
      }
      if (result.content?.includes('具体')) {
        patterns.push('- 具体例の使用は有効です');
      }
    });

    return [...new Set(patterns)]; // 重複除去
  }
}