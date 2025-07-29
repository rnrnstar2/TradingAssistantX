/**
 * V2 DM Management Endpoint - V2ログイン認証専用
 * REQUIREMENTS.md準拠 - プライベートメッセージ管理
 * 
 * 機能:
 * - DM送信・プライベートメッセージ管理
 * - DM履歴取得・会話管理
 * - メディア付きDM・グループDM
 * 
 * 認証レベル: V2ログイン認証（login_cookies必要）
 */

import { 
  HttpClient
} from '../../types';
import { V2LoginAuth } from '../../core/v2-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface DMResponse {
  success: boolean;
  data: {
    id: string;
    text: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    recipientUsername: string;
    createdAt: Date;
    mediaAttachments?: DMMediaAttachment[];
    quickReplyType?: string;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface DMHistoryResponse {
  success: boolean;
  data: {
    conversationId: string;
    messages: DMMessage[];
    participants: Participant[];
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    previousCursor?: string;
    hasMore: boolean;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface ConversationListResponse {
  success: boolean;
  data: {
    conversations: Conversation[];
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// DATA INTERFACES
// ============================================================================

interface DMMessage {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: Date;
  messageType: 'text' | 'media' | 'quick_reply' | 'welcome_message';
  mediaAttachments?: DMMediaAttachment[];
  quickReply?: {
    type: string;
    metadata?: Record<string, any>;
  };
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
}

interface DMMediaAttachment {
  id: string;
  type: 'photo' | 'video' | 'gif' | 'document';
  url: string;
  altText?: string;
  size?: number;
  mimeType?: string;
}

interface Participant {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  verified: boolean;
}

interface Conversation {
  id: string;
  type: 'one_to_one' | 'group_dm';
  participants: Participant[];
  lastMessage?: DMMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface SendDMOptions {
  mediaIds?: string[];
  altTexts?: Record<string, string>;
  quickReplyType?: 'options' | 'location' | 'text_input';
  quickReplyOptions?: string[];
  cta?: {
    type: 'web' | 'app';
    label: string;
    url: string;
  };
}

interface DMHistoryOptions {
  count?: number;
  cursor?: string;
  includeMedia?: boolean;
  includeReactions?: boolean;
  sinceId?: string;
  maxId?: string;
}

interface ConversationOptions {
  includeLastMessage?: boolean;
  includeUnreadCount?: boolean;
  filter?: 'all' | 'unread' | 'group' | 'one_to_one';
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// DM MANAGEMENT ENDPOINT CLASS
// ============================================================================

/**
 * DMManagementEndpoint - V2認証DM管理操作クラス
 * 
 * V2ログイン認証（login_cookies）で実行可能な機能:
 * - プライベートメッセージ送信・受信
 * - DM会話履歴の取得・検索
 * - メディア付きDM・グループDM管理
 * - クイックリプライ・CTA機能
 */
export class DMManagementEndpoint {
  private readonly ENDPOINTS = {
    sendDM: '/twitter/dm/send',
    sendGroupDM: '/twitter/dm/group/send',
    getDMHistory: '/twitter/dm/conversation',
    getConversations: '/twitter/dm/conversations',
    deleteDM: '/twitter/dm/delete',
    markAsRead: '/twitter/dm/mark_read',
    createGroupDM: '/twitter/dm/group/create',
    addToGroupDM: '/twitter/dm/group/add_participant',
    removeFromGroupDM: '/twitter/dm/group/remove_participant'
  } as const;

  private readonly RATE_LIMITS = {
    sendDM: { limit: 1000, window: 3600 }, // 1000/hour (V2制限)
    getDMHistory: { limit: 300, window: 3600 }, // 300/hour
    getConversations: { limit: 300, window: 3600 }, // 300/hour
    groupOperations: { limit: 100, window: 3600 } // 100/hour
  } as const;

  private readonly VALIDATION_RULES = {
    messageText: { 
      minLength: 1, 
      maxLength: 10000 // DM文字数制限
    },
    userId: /^[0-9]+$/,
    username: /^[a-zA-Z0-9_]{1,15}$/,
    conversationId: /^[a-zA-Z0-9_-]+$/,
    mediaIds: { maxCount: 1 }, // DMはメディア1個まで
    participantLimit: { min: 2, max: 50 } // グループDM参加者制限
  } as const;

  // DM送信制限（スパム防止）
  private readonly DM_LIMITS = {
    maxDMsPerHour: 1000,
    cooldownBetweenDMs: 1000, // 1秒
    maxRecipientsPerGroup: 50
  } as const;

  private lastDMTime: number = 0;

  constructor(
    private httpClient: HttpClient,
    private v2Auth: V2LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS - SEND MESSAGES
  // ============================================================================

  /**
   * DM送信（1対1）
   * login_cookies認証が必要
   */
  async sendDM(recipientId: string, message: string, options?: SendDMOptions): Promise<DMResponse> {
    // 入力バリデーション
    const userIdValidation = this.validateUserId(recipientId);
    const messageValidation = this.validateMessageText(message);
    
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid recipientId: ${userIdValidation.errors.join(', ')}`);
    }
    if (!messageValidation.isValid) {
      throw new Error(`Invalid message: ${messageValidation.errors.join(', ')}`);
    }

    // レート制限チェック
    await this.enforceRateLimit();

    // V2認証クッキー取得・検証
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        recipient_id: recipientId,
        text: message,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.mediaIds?.length) {
        payload.media_ids = options.mediaIds;
        if (options.altTexts) {
          payload.media_alt_texts = options.altTexts;
        }
      }

      if (options?.quickReplyType) {
        payload.quick_reply = {
          type: options.quickReplyType,
          options: options.quickReplyOptions
        };
      }

      if (options?.cta) {
        payload.cta = options.cta;
      }

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.sendDM,
        payload
      );

      const normalizedData = await this.normalizeDMResponse(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'sendDM');
    }
  }

  /**
   * DM送信（ユーザー名指定）
   * login_cookies認証が必要
   */
  async sendDMByUsername(username: string, message: string, options?: SendDMOptions): Promise<DMResponse> {
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new Error(`Invalid username: ${usernameValidation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        recipient_username: username,
        text: message,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.sendDM,
        payload
      );

      const normalizedData = await this.normalizeDMResponse(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'sendDMByUsername');
    }
  }

  /**
   * グループDMメッセージ送信
   * login_cookies認証が必要
   */
  async sendGroupDM(conversationId: string, message: string, options?: SendDMOptions): Promise<DMResponse> {
    const conversationValidation = this.validateConversationId(conversationId);
    const messageValidation = this.validateMessageText(message);
    
    if (!conversationValidation.isValid) {
      throw new Error(`Invalid conversationId: ${conversationValidation.errors.join(', ')}`);
    }
    if (!messageValidation.isValid) {
      throw new Error(`Invalid message: ${messageValidation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        conversation_id: conversationId,
        text: message,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.sendGroupDM,
        payload
      );

      const normalizedData = await this.normalizeDMResponse(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'sendGroupDM');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - RETRIEVE MESSAGES
  // ============================================================================

  /**
   * DM履歴取得
   * login_cookies認証が必要
   */
  async getDMHistory(conversationId: string, options?: DMHistoryOptions): Promise<DMHistoryResponse> {
    const validation = this.validateConversationId(conversationId);
    if (!validation.isValid) {
      throw new Error(`Invalid conversationId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const params: any = {
        conversation_id: conversationId,
        count: Math.min(options?.count || 50, 200),
        login_cookies: loginCookie
      };

      if (options?.cursor) params.cursor = options.cursor;
      if (options?.includeMedia) params.include_media = options.includeMedia;
      if (options?.includeReactions) params.include_reactions = options.includeReactions;
      if (options?.sinceId) params.since_id = options.sinceId;
      if (options?.maxId) params.max_id = options.maxId;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getDMHistory,
        params
      );

      const normalizedData = await this.normalizeDMHistoryResponse(response);

      return {
        success: true,
        data: normalizedData,
        pagination: {
          nextCursor: response.next_cursor,
          previousCursor: response.previous_cursor,
          hasMore: !!response.next_cursor
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getDMHistory');
    }
  }

  /**
   * 会話一覧取得
   * login_cookies認証が必要
   */
  async getConversations(options?: ConversationOptions & { cursor?: string; count?: number }): Promise<ConversationListResponse> {
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const params: any = {
        count: Math.min(options?.count || 20, 50),
        login_cookies: loginCookie
      };

      if (options?.cursor) params.cursor = options.cursor;
      if (options?.includeLastMessage) params.include_last_message = options.includeLastMessage;
      if (options?.includeUnreadCount) params.include_unread_count = options.includeUnreadCount;
      if (options?.filter && options.filter !== 'all') params.filter = options.filter;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getConversations,
        params
      );

      const conversations = await Promise.all(
        (response.conversations || []).map((conv: any) => this.normalizeConversation(conv))
      );

      return {
        success: true,
        data: {
          conversations,
          totalCount: response.total_count || conversations.length
        },
        pagination: {
          nextCursor: response.next_cursor,
          hasMore: !!response.next_cursor
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getConversations');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - GROUP DM MANAGEMENT
  // ============================================================================

  /**
   * グループDM作成
   * login_cookies認証が必要
   */
  async createGroupDM(participantIds: string[], groupName?: string): Promise<{
    success: boolean;
    data: { conversationId: string; participants: Participant[] };
  }> {
    // 参加者数バリデーション
    if (participantIds.length < this.VALIDATION_RULES.participantLimit.min || 
        participantIds.length > this.VALIDATION_RULES.participantLimit.max) {
      throw new Error(`Group DM must have ${this.VALIDATION_RULES.participantLimit.min}-${this.VALIDATION_RULES.participantLimit.max} participants`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        participant_ids: participantIds,
        group_name: groupName,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.createGroupDM,
        payload
      );

      const participants = await Promise.all(
        (response.participants || []).map((p: any) => this.normalizeParticipant(p))
      );

      return {
        success: true,
        data: {
          conversationId: response.conversation_id,
          participants
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'createGroupDM');
    }
  }

  /**
   * DM既読マーク
   * login_cookies認証が必要
   */
  async markAsRead(conversationId: string, lastReadMessageId?: string): Promise<{
    success: boolean;
    data: { conversationId: string; markedAt: Date };
  }> {
    const validation = this.validateConversationId(conversationId);
    if (!validation.isValid) {
      throw new Error(`Invalid conversationId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        conversation_id: conversationId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      if (lastReadMessageId) {
        payload.last_read_event_id = lastReadMessageId;
      }

      await this.httpClient.post<any>(
        this.ENDPOINTS.markAsRead,
        payload
      );

      return {
        success: true,
        data: {
          conversationId,
          markedAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'markAsRead');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('userId is required and must be a string');
    } else if (!this.VALIDATION_RULES.userId.test(userId)) {
      errors.push('userId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || typeof username !== 'string') {
      errors.push('username is required and must be a string');
    } else if (!this.VALIDATION_RULES.username.test(username)) {
      errors.push('username must be 1-15 characters, alphanumeric and underscore only');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateMessageText(text: string): ValidationResult {
    const errors: string[] = [];

    if (!text || typeof text !== 'string') {
      errors.push('Message text is required and must be a string');
    } else if (text.length < this.VALIDATION_RULES.messageText.minLength) {
      errors.push(`Message must be at least ${this.VALIDATION_RULES.messageText.minLength} characters`);
    } else if (text.length > this.VALIDATION_RULES.messageText.maxLength) {
      errors.push(`Message exceeds ${this.VALIDATION_RULES.messageText.maxLength} character limit`);
    }

    if (text && text.trim().length === 0) {
      errors.push('Message cannot be empty or contain only whitespace');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateConversationId(conversationId: string): ValidationResult {
    const errors: string[] = [];

    if (!conversationId || typeof conversationId !== 'string') {
      errors.push('conversationId is required and must be a string');
    } else if (!this.VALIDATION_RULES.conversationId.test(conversationId)) {
      errors.push('conversationId format is invalid');
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - RATE LIMITING
  // ============================================================================

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastDM = now - this.lastDMTime;
    
    if (timeSinceLastDM < this.DM_LIMITS.cooldownBetweenDMs) {
      const waitTime = this.DM_LIMITS.cooldownBetweenDMs - timeSinceLastDM;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastDMTime = Date.now();
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeDMResponse(apiResponse: any): Promise<{
    id: string;
    text: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    recipientUsername: string;
    createdAt: Date;
    mediaAttachments?: DMMediaAttachment[];
    quickReplyType?: string;
  }> {
    return {
      id: apiResponse.event?.id || apiResponse.id,
      text: apiResponse.event?.message_create?.message_data?.text || apiResponse.text || '',
      senderId: apiResponse.event?.message_create?.sender_id || apiResponse.sender_id || '',
      senderUsername: apiResponse.sender?.screen_name || '',
      recipientId: apiResponse.event?.message_create?.target?.recipient_id || apiResponse.recipient_id || '',
      recipientUsername: apiResponse.recipient?.screen_name || '',
      createdAt: new Date(apiResponse.event?.created_timestamp || apiResponse.created_at || Date.now()),
      mediaAttachments: apiResponse.event?.message_create?.message_data?.attachment ? 
        [await this.normalizeDMMediaAttachment(apiResponse.event.message_create.message_data.attachment)] : 
        undefined,
      quickReplyType: apiResponse.event?.message_create?.message_data?.quick_reply?.type
    };
  }

  private async normalizeDMHistoryResponse(apiResponse: any): Promise<{
    conversationId: string;
    messages: DMMessage[];
    participants: Participant[];
    totalCount: number;
  }> {
    const messages = await Promise.all(
      (apiResponse.events || []).map((event: any) => this.normalizeDMMessage(event))
    );

    const participants = await Promise.all(
      Object.values(apiResponse.users || {}).map((user: any) => this.normalizeParticipant(user))
    );

    return {
      conversationId: apiResponse.conversation_id || '',
      messages,
      participants,
      totalCount: messages.length
    };
  }

  private async normalizeDMMessage(apiEvent: any): Promise<DMMessage> {
    return {
      id: apiEvent.id,
      text: apiEvent.message_create?.message_data?.text || '',
      senderId: apiEvent.message_create?.sender_id || '',
      senderUsername: '', // ユーザー情報から取得
      createdAt: new Date(apiEvent.created_timestamp),
      messageType: apiEvent.type === 'message_create' ? 'text' : 'text',
      mediaAttachments: apiEvent.message_create?.message_data?.attachment ? 
        [await this.normalizeDMMediaAttachment(apiEvent.message_create.message_data.attachment)] : 
        undefined
    };
  }

  private async normalizeDMMediaAttachment(attachment: any): Promise<DMMediaAttachment> {
    return {
      id: attachment.media?.id_str || attachment.id,
      type: attachment.type || 'photo',
      url: attachment.media?.media_url_https || attachment.url,
      altText: attachment.media?.alt_text,
      size: attachment.media?.size,
      mimeType: attachment.media?.mime_type
    };
  }

  private async normalizeParticipant(apiUser: any): Promise<Participant> {
    return {
      id: apiUser.id_str || apiUser.id,
      username: apiUser.screen_name || apiUser.username,
      displayName: apiUser.name || apiUser.display_name,
      profileImageUrl: apiUser.profile_image_url_https || apiUser.profile_image_url,
      verified: apiUser.verified || false
    };
  }

  private async normalizeConversation(apiConv: any): Promise<Conversation> {
    return {
      id: apiConv.conversation_id,
      type: apiConv.type === 'group_dm' ? 'group_dm' : 'one_to_one',
      participants: await Promise.all(
        (apiConv.participants || []).map((p: any) => this.normalizeParticipant(p))
      ),
      lastMessage: apiConv.last_message ? await this.normalizeDMMessage(apiConv.last_message) : undefined,
      unreadCount: apiConv.unread_count || 0,
      createdAt: new Date(apiConv.created_timestamp),
      updatedAt: new Date(apiConv.updated_timestamp || apiConv.created_timestamp)
    };
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleV2AuthError(error: any, operation: string): never {
    // V2認証特有のエラー処理
    if (error.message?.includes('login_cookie')) {
      throw new Error(`V2 session expired or invalid - re-authentication required for operation: ${operation}`);
    }
    
    if (error.status === 401) {
      throw new Error(`V2 authentication failed for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`V2 operation forbidden - check account permissions: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`V2 rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }

    // DM特有のエラー
    if (error.message?.includes('cannot send message to this user')) {
      throw new Error(`Cannot send DM - user does not accept messages or you are blocked: ${operation}`);
    }

    if (error.message?.includes('message too long')) {
      throw new Error(`DM message exceeds character limit: ${operation}`);
    }

    if (error.message?.includes('conversation not found')) {
      throw new Error(`DM conversation not found: ${operation}`);
    }

    if (error.message?.includes('group dm limit exceeded')) {
      throw new Error(`Group DM participant limit exceeded: ${operation}`);
    }

    if (error.status === 404) {
      throw new Error(`User or conversation not found for DM operation: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Bad request for DM operation: ${operation}. Check input parameters.`);
    }

    // その他のエラー
    throw new Error(`V2 DM API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}