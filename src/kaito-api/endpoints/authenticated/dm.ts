/**
 * Authenticated Direct Message Management Endpoint
 * V2ログイン認証が必要なDM送信機能
 * REQUIREMENTS.md準拠
 */

import { 
  HttpClient
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';
import { 
  DirectMessageRequest, 
  DirectMessageResponse, 
  RateLimitInfo,
  ValidationError,
  SecurityCheckResult
} from './types';

// ============================================================================
// LOCAL VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// DIRECT MESSAGE MANAGEMENT CLASS
// ============================================================================

/**
 * DM送信管理クラス
 * V2ログイン認証が必要なダイレクトメッセージ送信機能を提供
 * 
 * @class DirectMessageManagement
 * @requires V2LoginAuth - login_cookie必須
 */
export class DirectMessageManagement {
  
  // ==========================================================================
  // ENDPOINTS CONFIGURATION
  // ==========================================================================
  
  private readonly ENDPOINTS = {
    sendDirectMessage: '/twitter/send_dm_v2'
  } as const;
  
  // ==========================================================================
  // RATE LIMIT CONFIGURATION
  // ==========================================================================
  
  private readonly RATE_LIMITS = {
    sendDirectMessage: { 
      limit: 300, 
      windowMs: 15 * 60 * 1000 // 15分
    }
  };
  
  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================
  
  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {}
  
  // ==========================================================================
  // PUBLIC METHODS - DM送信機能
  // ==========================================================================
  
  /**
   * ダイレクトメッセージ送信
   * V2ログイン認証でDMを送信
   * 
   * @param request DM送信リクエスト
   * @returns DM送信結果
   * @throws エラー発生時は適切なエラーレスポンスを返却
   */
  async sendDirectMessage(request: DirectMessageRequest): Promise<DirectMessageResponse> {
    try {
      // 1. V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        return {
          success: false,
          error: 'V2ログイン認証が必要です。login_cookieが無効または期限切れです。'
        };
      }

      // 2. 入力バリデーション
      const validation = this.validateDirectMessageInput(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: `入力検証エラー: ${validation.errors.join(', ')}`
        };
      }

      // 3. セキュリティチェック
      const securityCheck = this.performSecurityCheck(request);
      if (!securityCheck.isSafe) {
        return {
          success: false,
          error: `セキュリティチェック失敗: ${securityCheck.issues.join(', ')}`
        };
      }

      // 4. APIリクエスト実行
      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.sendDirectMessage,
        {
          recipient_id: request.recipientId,
          text: request.text,
          media_ids: request.mediaIds
        }
      );

      // 5. レスポンス処理
      return this.processDirectMessageResponse(response);

    } catch (error) {
      return this.handleV2APIError(error, 'sendDirectMessage');
    }
  }
  
  // ==========================================================================
  // PRIVATE METHODS - バリデーション
  // ==========================================================================
  
  /**
   * DM送信リクエストの入力バリデーション
   * 
   * @param request DM送信リクエスト
   * @returns バリデーション結果
   */
  private validateDirectMessageInput(request: DirectMessageRequest): ValidationResult {
    const errors: string[] = [];
    
    // recipientId検証
    if (!request.recipientId || typeof request.recipientId !== 'string') {
      errors.push('recipientIdは必須の文字列です');
    } else if (!/^\d+$/.test(request.recipientId)) {
      errors.push('recipientIdは数字のみの文字列である必要があります');
    }
    
    // text検証
    if (!request.text || typeof request.text !== 'string') {
      errors.push('textは必須の文字列です');
    } else if (request.text.length === 0) {
      errors.push('メッセージテキストは空にできません');
    } else if (request.text.length > 10000) {
      errors.push('メッセージテキストは10000文字以内である必要があります');
    }
    
    // mediaIds検証（オプション）
    if (request.mediaIds !== undefined) {
      if (!Array.isArray(request.mediaIds)) {
        errors.push('mediaIdsは配列である必要があります');
      } else if (request.mediaIds.length > 4) {
        errors.push('添付可能なメディアは最大4個です');
      } else {
        for (const mediaId of request.mediaIds) {
          if (typeof mediaId !== 'string' || !/^\d+$/.test(mediaId)) {
            errors.push('mediaIdは数字のみの文字列である必要があります');
            break;
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * DM内容のセキュリティチェック
   * スパム・不適切コンテンツの検出
   * 
   * @param request DM送信リクエスト
   * @returns セキュリティチェック結果
   */
  private performSecurityCheck(request: DirectMessageRequest): SecurityCheckResult {
    const issues: string[] = [];
    const text = request.text.toLowerCase();
    
    // スパム検出
    const repeatPattern = /(.)\1{10,}/g;
    if (repeatPattern.test(text)) {
      issues.push('繰り返し文字の過度な使用が検出されました');
    }
    
    // 過度な絵文字検出
    const emojiCount = (text.match(/[\u1F600-\u1F64F]|[\u1F300-\u1F5FF]|[\u1F680-\u1F6FF]|[\u1F1E0-\u1F1FF]/g) || []).length;
    if (emojiCount > 20) {
      issues.push('絵文字の使用が過度です');
    }
    
    // 不適切なURL検出（基本的なチェック）
    const suspiciousUrls = /(?:bit\.ly|tinyurl|short)/gi;
    if (suspiciousUrls.test(text)) {
      issues.push('疑わしいURL短縮サービスが検出されました');
    }
    
    // 全て大文字の過度な使用
    const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (uppercaseRatio > 0.7 && text.length > 20) {
      issues.push('過度な大文字使用が検出されました');
    }
    
    return {
      isSafe: issues.length === 0,
      issues
    };
  }
  
  // ==========================================================================
  // PRIVATE METHODS - レスポンス処理
  // ==========================================================================
  
  /**
   * DM送信APIレスポンスの処理
   * 
   * @param response API生レスポンス
   * @returns 正規化されたDMレスポンス
   */
  private processDirectMessageResponse(response: any): DirectMessageResponse {
    // 成功レスポンスの処理
    if (response && response.data && response.data.dm_event_create) {
      const dmEvent = response.data.dm_event_create.event;
      return {
        success: true,
        messageId: dmEvent.id,
        createdAt: dmEvent.created_at
      };
    }
    
    // エラーレスポンスの処理
    if (response && response.errors && response.errors.length > 0) {
      const errorMessage = response.errors[0].message || 'DM送信に失敗しました';
      return {
        success: false,
        error: errorMessage
      };
    }
    
    // 不明なレスポンス形式
    return {
      success: false,
      error: 'DM送信レスポンスの形式が不正です'
    };
  }
  
  /**
   * V2 API エラーハンドリング
   * 
   * @param error エラーオブジェクト
   * @param operation 実行していた操作名
   * @returns エラーレスポンス
   */
  private handleV2APIError(error: any, operation: string): DirectMessageResponse {
    // レート制限エラー
    if (error.response?.status === 429) {
      const resetTime = error.response.headers?.['x-rate-limit-reset'];
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date(Date.now() + 15 * 60 * 1000);
      return {
        success: false,
        error: `レート制限に達しました。${resetDate.toLocaleTimeString()}まで待機してください`
      };
    }
    
    // 認証エラー
    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'V2ログイン認証が失敗しました。login_cookieを確認してください'
      };
    }
    
    // 権限エラー
    if (error.response?.status === 403) {
      return {
        success: false,
        error: 'DM送信権限がありません。アカウント設定を確認してください'
      };
    }
    
    // セッション期限切れ（login_cookie関連）
    if (error.message?.includes('login_cookie')) {
      return {
        success: false,
        error: 'ログインセッションが期限切れです。再ログインしてください'
      };
    }
    
    // 受信者不明エラー
    if (error.response?.status === 404) {
      return {
        success: false,
        error: '指定された受信者が見つかりません'
      };
    }
    
    // 一般的なネットワークエラー
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'ネットワークエラー: TwitterAPIに接続できません'
      };
    }
    
    // その他のエラー
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                         error.message || 
                         `DM送信操作(${operation})で不明なエラーが発生しました`;
    
    return {
      success: false,
      error: errorMessage
    };
  }
}