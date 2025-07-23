import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { PostContent, ProcessedData } from '../types/data-types';

/**
 * core-runner.tsとの互換性確保のためのインターフェース
 */
export interface GeneratedContent {
  theme: string;
  content: string;
  hashtags?: string[];
  style?: string;
}

/**
 * 簡素化されたバリデーション結果
 */
interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * 投稿コンテンツ生成を担当するContentCreatorクラス（MVP簡素化版）
 * 
 * Claude Code SDKによる基本的なコンテンツ生成のみ実装
 */
export class ContentCreator {
  
  constructor() {
    console.log('✅ ContentCreator初期化完了: MVP版');
  }

  /**
   * core-runner.ts互換のcreate()メソッド（MVP簡素化版）
   * 
   * @param data - GeneratedContent形式のデータ
   * @returns PostContent形式の投稿コンテンツ
   */
  async create(data: GeneratedContent): Promise<PostContent> {
    try {
      console.log('🔄 create()メソッド呼び出し（MVP版）');
      
      // 基本的なコンテンツ生成
      const content = await this.generateBasicContent(data);
      
      return {
        id: `generated-${Date.now()}`,
        content,
        type: 'original_post',
        metadata: {
          source: 'content-creator',
          theme: data.theme,
          category: 'educational',
          relevanceScore: 0.7,
          urgency: 'medium',
          targetAudience: ['beginner'],
          estimatedEngagement: 50
        },
        quality: {
          overall: 70,
          readability: 70,
          relevance: 70,
          engagement_potential: 50,
          factual_accuracy: 80,
          originality: 60,
          timeliness: 60
        },
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ create()メソッドエラー:', error);
      
      // フォールバック処理
      return this.createFallbackContent(data.theme);
    }
  }

  /**
   * 投稿コンテンツ生成メインメソッド（MVP簡素化版）
   * 
   * @param data - 処理済みデータ
   * @returns 生成された投稿コンテンツ
   */
  async createPost(data: ProcessedData): Promise<PostContent> {
    try {
      console.log('🔄 基本コンテンツ生成プロセス開始（MVP版）');
      
      // データチェック
      if (!data || !data.data || data.data.length === 0) {
        console.warn('⚠️ データ不足のためフォールバック使用');
        return this.createFallbackContent('基本投資情報');
      }
      
      // 基本的なコンテンツ生成
      const content = await this.generateBasicEducationalContent(data);
      
      return {
        id: `post_${Date.now()}`,
        content,
        type: 'original_post',
        metadata: {
          source: 'content-creator',
          theme: '投資教育',
          category: 'educational',
          relevanceScore: 0.7,
          urgency: 'medium',
          targetAudience: ['beginner'],
          estimatedEngagement: 50
        },
        quality: {
          overall: 70,
          readability: 80,
          relevance: 70,
          engagement_potential: 50,
          factual_accuracy: 80,
          originality: 60,
          timeliness: 60
        },
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ createPost()エラー:', error);
      return this.createFallbackContent('投資情報');
    }
  }

  /**
   * 基本的なコンテンツ生成（MVP版）
   */
  private async generateBasicContent(data: GeneratedContent): Promise<string> {
    try {
      const prompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

投資初心者向けの教育的な投稿を280文字以内で作成してください。

テーマ: ${data.theme}
コンテンツ: ${data.content}

要件:
- 必ず日本語のみで記述する
- 投資初心者にも理解しやすい内容
- 具体的で実践的なアドバイス
- リスクに関する注意点を含める
- 「投資は自己責任で」を含める
- 韓国語、英語、中国語等の他言語は使用禁止`;
      
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(prompt)
        .asText();
      
      return this.formatContent(response.trim());
    } catch (error) {
      console.error('❌ 基本コンテンツ生成エラー:', error);
      return this.createBasicFallback(data.theme || '投資情報');
    }
  }

  /**
   * 基本的な教育コンテンツ生成（ProcessedData版）
   */
  private async generateBasicEducationalContent(data: ProcessedData): Promise<string> {
    try {
      const content = data.data.map(d => d.content).filter(Boolean).join(' ').substring(0, 200);
      
      const prompt = `必ず日本語のみで投稿を作成してください。韓国語や他の言語は絶対に使用しないでください。

以下の情報を基に、投資初心者向けの教育的投稿を280文字以内で作成してください。

情報: ${content}

要件:
- 必ず日本語のみで記述する
- 初心者にも分かりやすい説明
- 具体的なアクション提案
- リスク管理の重要性を含める
- 「投資は自己責任で」を含める
- 韓国語、英語、中国語等の他言語は使用禁止`;
      
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(10000)
        .query(prompt)
        .asText();
      
      return this.formatContent(response.trim());
    } catch (error) {
      console.error('❌ 教育コンテンツ生成エラー:', error);
      return this.createBasicFallback('投資教育');
    }
  }

  /**
   * 韓国語チェック - 韓国語文字が含まれているかチェック
   */
  private containsKorean(text: string): boolean {
    // 韓国語のUnicodeブロック: 0xAC00-0xD7AF (ハングル音節)
    // 0x1100-0x11FF (ハングル子音), 0x3130-0x318F (ハングル互換子音)
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    return koreanRegex.test(text);
  }

  /**
   * 言語検証 - 日本語のみかチェック
   */
  private validateLanguage(content: string): { isValid: boolean; issue?: string } {
    if (this.containsKorean(content)) {
      return { isValid: false, issue: 'Korean characters detected' };
    }
    
    return { isValid: true };
  }

  /**
   * コンテンツフォーマット（MVP版）
   */
  private formatContent(content: string): string {
    let formatted = content.trim();
    
    // 言語検証
    const validation = this.validateLanguage(formatted);
    if (!validation.isValid) {
      console.warn(`⚠️ 言語検証エラー: ${validation.issue}. フォールバックを使用します。`);
      return this.createBasicFallback('投資情報');
    }
    
    // 280文字制限
    if (formatted.length > 280) {
      formatted = formatted.substring(0, 277) + '...';
    }
    
    // 基本ハッシュタグ追加
    if (formatted.length < 250) {
      formatted += ' #投資教育 #資産運用';
    }
    
    return formatted;
  }

  /**
   * 基本フォールバックコンテンツ生成（MVP版）
   */
  private createBasicFallback(theme: string): string {
    const templates = [
      `📊 ${theme}について初心者向けの基本情報をお届けします。投資はリスク管理から始めることが重要です。少額から始めて、学びながら成長しましょう。※投資は自己責任で #投資教育 #資産運用`,
      `💡 ${theme}に関する投資の基礎知識。NISA・iDeCoなどの制度を活用し、長期的な視点で資産形成を考えましょう。分散投資とリスク管理を忘れずに。※投資は自己責任で #投資教育 #資産運用`,
      `🎯 ${theme}から学ぶ投資のポイント。市場の動きに一喜一憂せず、継続的な学習と冷静な判断が成功の鍵です。まずは少額から始めてみませんか？※投資は自己責任で #投資教育 #資産運用`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * フォールバックコンテンツ（PostContent形式、MVP版）
   */
  private createFallbackContent(theme: string): PostContent {
    const content = this.createBasicFallback(theme);
    
    return {
      id: `fallback-${Date.now()}`,
      content,
      type: 'original_post',
      metadata: {
        source: 'content-creator',
        theme,
        category: 'educational',
        relevanceScore: 0.7,
        urgency: 'medium',
        targetAudience: ['beginner'],
        estimatedEngagement: 40
      },
      quality: {
        overall: 70,
        readability: 80,
        relevance: 70,
        engagement_potential: 50,
        factual_accuracy: 80,
        originality: 60,
        timeliness: 60
      },
      timestamp: Date.now()
    };
  }
}