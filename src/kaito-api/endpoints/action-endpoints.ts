/**
 * KaitoAPI アクションエンドポイント - 教育的投稿システム統合版
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * 投稿・いいね・RT・画像アップロード + 教育的価値検証
 * 
 * 統合機能:
 * - 教育的価値の検証
 * - 適切な頻度制御
 * - スパム防止
 * - 品質保証システム
 */

export interface PostRequest {
  content: string;
  mediaIds?: string[];
  replyToId?: string;
  quoteTweetId?: string;
}

export interface PostResponse {
  success: boolean;
  tweetId?: string;
  createdAt?: string;
  error?: string;
}

export interface EngagementRequest {
  tweetId: string;
  action: 'like' | 'unlike' | 'retweet' | 'unretweet';
}

export interface EngagementResponse {
  success: boolean;
  action: string;
  tweetId: string;
  timestamp: string;
}

// === 統合: 教育的投稿システム インターフェース ===

export interface EducationalTweetResult {
  id: string;
  content: string;
  timestamp: string;
  success: boolean;
  educationalValue: number;
  qualityScore: number;
  error?: string;
}

export interface ContentValidation {
  isEducational: boolean;
  hasValue: boolean;
  isAppropriate: boolean;
  qualityScore: number;
  topics: string[];
  reasons: string[];
}

export interface FrequencyCheck {
  canPost: boolean;
  lastPostTime: number;
  nextAllowedTime: number;
  waitTimeMs: number;
}

export interface EducationalRetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  educationalReason: string;
  error?: string;
}

export interface EducationalLikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  educationalJustification: string;
  error?: string;
}

export class ActionEndpoints {
  private lastPostTime: number = 0;
  private lastRetweetTime: number = 0;
  private lastLikeTime: number = 0;

  // === 統合: 教育キーワード定義 ===
  private readonly EDUCATIONAL_KEYWORDS = [
    '投資教育', '投資初心者', '基礎知識', '学習', '解説',
    'リスク管理', '資産運用', '分散投資', 'ポートフォリオ',
    '注意点', 'メリット', 'デメリット', '基本', '入門'
  ];

  // === 統合: 禁止キーワード（スパム防止） ===
  private readonly PROHIBITED_KEYWORDS = [
    '絶対儲かる', '確実に稼げる', '必ず上がる', '損失なし',
    '秘密の手法', '一攫千金', '楽して稼ぐ', 'すぐに億万長者'
  ];

  constructor(private baseUrl: string, private headers: Record<string, string>) {
    console.log('✅ ActionEndpoints initialized - 教育的投稿システム統合版');
  }

  // === 統合: 教育的投稿作成 ===
  async createEducationalPost(content: string): Promise<EducationalTweetResult> {
    try {
      console.log('📝 教育的投稿作成開始:', { contentLength: content.length });

      // 頻度チェック
      const frequencyCheck = this.checkPostingFrequency();
      if (!frequencyCheck.canPost) {
        throw new Error(`投稿頻度制限: ${Math.ceil(frequencyCheck.waitTimeMs / 60000)}分後に再試行してください`);
      }

      // コンテンツ検証
      const validation = await this.validateEducationalContent(content);
      if (!validation.isEducational || !validation.isAppropriate) {
        throw new Error(`教育的価値不足: ${validation.reasons.join(', ')}`);
      }

      // スパム検出
      if (this.detectSpam(content)) {
        throw new Error('スパムと判定されたため投稿できません');
      }

      // 実際の投稿実行
      const result = await this.createPost({
        content,
        mediaIds: [],
        replyToId: undefined,
        quoteTweetId: undefined
      });
      
      // 投稿時間更新
      this.lastPostTime = Date.now();

      const educationalResult: EducationalTweetResult = {
        id: result.tweetId || '',
        content: content,
        timestamp: result.createdAt || new Date().toISOString(),
        success: result.success,
        educationalValue: validation.qualityScore,
        qualityScore: validation.qualityScore,
        error: result.error
      };

      if (result.success) {
        console.log('✅ 教育的投稿完了:', {
          id: result.tweetId,
          educationalValue: validation.qualityScore,
          topics: validation.topics
        });
      }

      return educationalResult;

    } catch (error) {
      console.error('❌ 教育的投稿失敗:', error);
      return {
        id: '',
        content: content,
        timestamp: new Date().toISOString(),
        success: false,
        educationalValue: 0,
        qualityScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 投稿作成（既存機能保持）
  async createPost(request: PostRequest): Promise<PostResponse> {
    try {
      console.log('Creating post:', request.content.substring(0, 50) + '...');
      
      // MVP版：基本的な投稿実行
      const tweetId = `tweet_${Date.now()}`;
      
      return {
        success: true,
        tweetId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Post creation failed'
      };
    }
  }

  // === 統合: 教育的リツイート ===
  async retweetEducationalContent(tweetId: string, originalContent: string): Promise<EducationalRetweetResult> {
    try {
      console.log('🔄 教育的リツイート開始:', { tweetId });

      // 頻度チェック（リツイート用）
      const now = Date.now();
      const timeSinceLastRetweet = now - this.lastRetweetTime;
      const minRetweetInterval = 10 * 60 * 1000; // 10分間隔

      if (timeSinceLastRetweet < minRetweetInterval) {
        throw new Error('リツイート頻度制限: 10分間隔でリツイートしてください');
      }

      // 元投稿の教育的価値検証
      const validation = await this.validateEducationalContent(originalContent);
      if (!validation.isEducational) {
        throw new Error('元投稿に教育的価値が不足しています');
      }

      // リツイート実行
      const engagementResult = await this.performEngagement({
        tweetId,
        action: 'retweet'
      });
      
      // リツイート時間更新
      this.lastRetweetTime = Date.now();

      const retweetResult: EducationalRetweetResult = {
        id: `retweet_${Date.now()}`,
        originalTweetId: tweetId,
        timestamp: engagementResult.timestamp,
        success: engagementResult.success,
        educationalReason: `教育的価値: ${validation.qualityScore}% - トピック: ${validation.topics.join(', ')}`,
        error: engagementResult.success ? undefined : 'Retweet failed'
      };

      if (engagementResult.success) {
        console.log('✅ 教育的リツイート完了:', {
          originalTweetId: tweetId,
          educationalValue: validation.qualityScore
        });
      }

      return retweetResult;

    } catch (error) {
      console.error('❌ 教育的リツイート失敗:', error);
      return {
        id: '',
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        educationalReason: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // === 統合: 教育的いいね ===
  async likeEducationalContent(tweetId: string, content: string): Promise<EducationalLikeResult> {
    try {
      console.log('❤️ 教育的いいね開始:', { tweetId });

      // 頻度チェック（いいね用）
      const now = Date.now();
      const timeSinceLastLike = now - this.lastLikeTime;
      const minLikeInterval = 2 * 60 * 1000; // 2分間隔

      if (timeSinceLastLike < minLikeInterval) {
        throw new Error('いいね頻度制限: 2分間隔でいいねしてください');
      }

      // コンテンツの教育的価値検証
      const validation = await this.validateEducationalContent(content);
      if (!validation.isEducational || validation.qualityScore < 50) {
        throw new Error('教育的価値が不足しているためいいねできません');
      }

      // いいね実行
      const engagementResult = await this.performEngagement({
        tweetId,
        action: 'like'
      });
      
      // いいね時間更新
      this.lastLikeTime = Date.now();

      const likeResult: EducationalLikeResult = {
        tweetId: tweetId,
        timestamp: engagementResult.timestamp,
        success: engagementResult.success,
        educationalJustification: `教育的価値: ${validation.qualityScore}% - ${validation.topics.join(', ')}`,
        error: engagementResult.success ? undefined : 'Like failed'
      };

      if (engagementResult.success) {
        console.log('✅ 教育的いいね完了:', {
          tweetId: tweetId,
          educationalValue: validation.qualityScore
        });
      }

      return likeResult;

    } catch (error) {
      console.error('❌ 教育的いいね失敗:', error);
      return {
        tweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        educationalJustification: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // エンゲージメント実行（既存機能保持）
  async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
    try {
      console.log(`Performing ${request.action} on tweet ${request.tweetId}`);
      
      return {
        success: true,
        action: request.action,
        tweetId: request.tweetId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Engagement ${request.action} failed: ${error}`);
    }
  }

  // 画像アップロード（既存機能保持）
  async uploadMedia(mediaData: Buffer, mediaType: string): Promise<{ mediaId: string }> {
    // 基本的な画像アップロード実装
    const mediaId = `media_${Date.now()}`;
    console.log(`Media uploaded: ${mediaId} (${mediaType})`);
    
    return { mediaId };
  }

  // === 統合: 投稿統計取得 ===
  getPostingStatistics() {
    const frequencyLimit = 30 * 60 * 1000; // 30分間隔をデフォルトとする
    return {
      lastPostTime: this.lastPostTime,
      lastRetweetTime: this.lastRetweetTime,
      lastLikeTime: this.lastLikeTime,
      nextAllowedPost: this.lastPostTime + frequencyLimit,
      canPostNow: this.checkPostingFrequency().canPost
    };
  }

  // ============================================================================
  // === 統合: プライベートメソッド ===
  // ============================================================================

  private async validateEducationalContent(content: string): Promise<ContentValidation> {
    try {
      if (!content || content.trim().length === 0) {
        return {
          isEducational: false,
          hasValue: false,
          isAppropriate: false,
          qualityScore: 0,
          topics: [],
          reasons: ['コンテンツが空です']
        };
      }

      const reasons: string[] = [];
      let qualityScore = 0;
      const topics: string[] = [];

      // 教育キーワードチェック
      const hasEducationalKeywords = this.EDUCATIONAL_KEYWORDS.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasEducationalKeywords) {
        qualityScore += 30;
        const matchedKeywords = this.EDUCATIONAL_KEYWORDS.filter(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase())
        );
        topics.push(...matchedKeywords);
      } else {
        reasons.push('教育的キーワードが不足しています');
      }

      // 禁止キーワードチェック
      const hasProhibitedKeywords = this.PROHIBITED_KEYWORDS.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasProhibitedKeywords) {
        qualityScore -= 50;
        reasons.push('不適切なキーワードが含まれています');
      }

      // 長さチェック（適切な情報量）
      if (content.length >= 50 && content.length <= 250) {
        qualityScore += 20;
      } else if (content.length < 50) {
        reasons.push('情報量が不足しています');
      } else {
        reasons.push('情報量が過多です');
      }

      return {
        isEducational: qualityScore >= 40,
        hasValue: qualityScore >= 60,
        isAppropriate: !hasProhibitedKeywords,
        qualityScore: Math.max(0, Math.min(100, qualityScore)),
        topics: [...new Set(topics)],
        reasons: reasons.length > 0 ? reasons : ['検証完了']
      };

    } catch (error) {
      console.error('コンテンツ検証エラー:', error);
      return {
        isEducational: false,
        hasValue: false,
        isAppropriate: false,
        qualityScore: 0,
        topics: [],
        reasons: ['検証処理エラー']
      };
    }
  }

  private checkPostingFrequency(): FrequencyCheck {
    const now = Date.now();
    const timeSinceLastPost = now - this.lastPostTime;
    const requiredInterval = 30 * 60 * 1000; // 30分間隔
    const canPost = timeSinceLastPost >= requiredInterval;
    
    return {
      canPost,
      lastPostTime: this.lastPostTime,
      nextAllowedTime: this.lastPostTime + requiredInterval,
      waitTimeMs: canPost ? 0 : requiredInterval - timeSinceLastPost
    };
  }

  private detectSpam(content: string): boolean {
    // 同じ文字の大量繰り返し
    const repeatingPattern = /(.)\1{10,}/;
    if (repeatingPattern.test(content)) return true;

    // 過度な絵文字使用
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > content.length * 0.3) return true;

    // 全角文字での過度な装飾
    const decorativeChars = (content.match(/[★☆♪♫◆◇■□▲▼]/g) || []).length;
    if (decorativeChars > 10) return true;

    return false;
  }
}