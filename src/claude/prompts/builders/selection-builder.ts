import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { CompactTweetCandidate } from '../../types';
import { 
  baseSelectionTemplate, 
  likeSelectionTemplate, 
  retweetSelectionTemplate, 
  quoteSelectionTemplate,
  followSelectionTemplate
} from '../templates/selection.template';

export interface SelectionPromptParams {
  selectionType: 'like' | 'retweet' | 'quote_tweet' | 'follow';
  topic: string;
  candidates: CompactTweetCandidate[];
  criteria: {
    qualityThreshold?: number;
    engagementWeight?: number;
    relevanceWeight?: number;
  };
  context: SystemContext;
}

export class SelectionBuilder extends BaseBuilder {
  buildPrompt(params: SelectionPromptParams): string {
    const template = baseSelectionTemplate;
    
    // 戦略的目的の設定
    const purposeMap = {
      like: '関係構築のために、投資教育に興味がありそうなユーザーの投稿を選択',
      retweet: 'フォロワーにとって価値がある投資教育コンテンツを選択',
      quote_tweet: '自分の専門知識で価値を追加できる投資教育投稿を選択',
      follow: '戦略的ネットワーク構築のために、投資教育分野で価値ある関係を築けるユーザーを選択'
    };
    
    // アクション別基準の選択
    const criteriaMap = {
      like: likeSelectionTemplate,
      retweet: retweetSelectionTemplate,
      quote_tweet: quoteSelectionTemplate,
      follow: followSelectionTemplate
    };
    
    // 共通変数の注入（BaseBuilderのメソッドを使用）
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 選択専用変数の注入
    prompt = prompt
      .replace(/\${selectionPurpose}/g, purposeMap[params.selectionType])
      .replace(/\${topic}/g, params.topic)
      .replace(/\${qualityThreshold}/g, (params.criteria.qualityThreshold || 7).toString())
      .replace(/\${engagementWeight}/g, ((params.criteria.engagementWeight || 0.5) * 100).toString())
      .replace(/\${relevanceWeight}/g, ((params.criteria.relevanceWeight || 0.5) * 100).toString())
      .replace(/\${candidateCount}/g, params.candidates.length.toString())
      .replace(/\${candidateList}/g, this.formatCandidateList(params.candidates))
      .replace(/\${actionSpecificCriteria}/g, criteriaMap[params.selectionType]);

    // フォロワー数、投稿数、エンゲージメント率の注入
    prompt = prompt
      .replace(/\${followerCount}/g, params.context.account.followerCount.toString())
      .replace(/\${postsToday}/g, params.context.account.postsToday.toString())
      .replace(/\${engagementRate}/g, params.context.account.engagementRate.toFixed(1));

    // 学習データの注入（最近の高評価トピック）
    const recentTopicsText = params.context.learningData?.recentTopics 
      ? `\n・過去の高評価トピック: ${params.context.learningData.recentTopics.join('、')}`
      : '';
    prompt = prompt.replace(/\${recentTopics}/g, recentTopicsText);
    
    return prompt;
  }
  
  private formatCandidateList(candidates: CompactTweetCandidate[]): string {
    return candidates.map((tweet, i) => {
      // 言語検出（簡易版）
      const detectedLang = this.detectLanguage(tweet.text);
      return `${i + 1}. ID: ${tweet.id}
   内容: ${tweet.text}
   作者: ${tweet.author}
   言語: ${detectedLang}
   エンゲージメント: ❤️${tweet.metrics.likes} 🔄${tweet.metrics.retweets} 💬${tweet.metrics.replies}
   関連度: ${tweet.relevanceScore || 'N/A'}/10`;
    }).join('\n');
  }

  private detectLanguage(text: string): string {
    // 簡易言語検出
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
    const chineseRegex = /[\u4e00-\u9fff]/;
    const englishRegex = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
    
    if (japaneseRegex.test(text)) {
      // 日本語文字があるかチェック
      const hiraganaKatakana = /[\u3040-\u309f\u30a0-\u30ff]/;
      if (hiraganaKatakana.test(text)) {
        return '🇯🇵 日本語';
      } else if (chineseRegex.test(text)) {
        return '🇨🇳 中国語';
      }
    }
    
    if (englishRegex.test(text.replace(/[^\w\s.,!?'"()-]/g, ''))) {
      return '🇺🇸 英語';
    }
    
    return '❓ その他';
  }
}