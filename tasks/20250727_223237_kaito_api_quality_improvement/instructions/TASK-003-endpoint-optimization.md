# TASK-003: エンドポイント最適化とバリデーション強化

## 🎯 タスク概要

src/kaito-api/endpoints/配下の全エンドポイントクラスを最適化し、バリデーション、エラーハンドリング、およびTwitterAPI.io仕様準拠を強化する。

## 📋 実装要件

### 1. 対象エンドポイントファイル

**主要ファイル**:
- `src/kaito-api/endpoints/action-endpoints.ts`
- `src/kaito-api/endpoints/tweet-endpoints.ts`
- `src/kaito-api/endpoints/user-endpoints.ts`
- `src/kaito-api/endpoints/trend-endpoints.ts`

### 2. TwitterAPI.io エンドポイント仕様準拠

**参考ドキュメント**: https://docs.twitterapi.io/introduction

**重要な仕様ポイント**:
- **正確なエンドポイントURL**: 公式仕様書に基づく正確なパス
- **リクエストパラメータ**: 必須/オプション項目の正確な実装
- **レスポンス形式**: 統一されたレスポンス処理
- **エラーレスポンス**: 標準化されたエラーハンドリング

## 🔧 具体的な実装内容

### Phase 1: ActionEndpoints改善

**ファイル**: `src/kaito-api/endpoints/action-endpoints.ts`

```typescript
export class ActionEndpoints {
  private readonly ENDPOINTS = {
    createTweet: '/v1/tweets',
    likeTweet: '/v1/tweets/:id/like',
    retweetTweet: '/v1/tweets/:id/retweet',
    uploadMedia: '/v1/media/upload'
  } as const;

  async createPost(request: PostRequest): Promise<PostResponse> {
    // 入力バリデーション強化
    const validation = this.validatePostRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      const response = await this.httpClient.post<TwitterAPITweetResponse>(
        this.ENDPOINTS.createTweet,
        {
          text: request.content,
          ...(request.mediaIds && { media_ids: request.mediaIds })
        }
      );

      return {
        success: true,
        tweetId: response.data.id,
        createdAt: response.data.created_at
      };
    } catch (error) {
      return this.handleActionError(error, 'createPost');
    }
  }

  private validatePostRequest(request: PostRequest): ValidationResult {
    const errors: string[] = [];

    // コンテンツ検証
    if (!request.content?.trim()) {
      errors.push('Content cannot be empty');
    }

    if (request.content && request.content.length > 280) {
      errors.push('Content exceeds 280 character limit');
    }

    // 不適切な文字チェック
    if (request.content && this.containsProhibitedContent(request.content)) {
      errors.push('Content contains prohibited characters or phrases');
    }

    // メディアID検証
    if (request.mediaIds && request.mediaIds.length > 4) {
      errors.push('Maximum 4 media items allowed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private containsProhibitedContent(content: string): boolean {
    // 韓国語チェック
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    if (koreanRegex.test(content)) return true;

    // 不適切なコンテンツチェック（スパム、攻撃的な内容など）
    const prohibitedPatterns = [
      /spam/i,
      /scam/i,
      // 追加の禁止パターン...
    ];

    return prohibitedPatterns.some(pattern => pattern.test(content));
  }

  private handleActionError(error: any, context: string): PostResponse {
    console.error(`❌ ${context} error:`, error);

    // TwitterAPI.io specific error handling
    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      };
    }

    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Authentication failed. Please check your credentials.'
      };
    }

    if (error.response?.status === 403) {
      return {
        success: false,
        error: 'Action forbidden. Check account permissions.'
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}
```

### Phase 2: TweetEndpoints改善

**ファイル**: `src/kaito-api/endpoints/tweet-endpoints.ts`

```typescript
export class TweetEndpoints {
  private readonly TWEET_ENDPOINTS = {
    create: '/v1/tweets',
    search: '/v1/tweets/search',
    get: '/v1/tweets/:id',
    delete: '/v1/tweets/:id',
    retweet: '/v1/tweets/:id/retweet',
    unretweet: '/v1/tweets/:id/unretweet'
  } as const;

  async searchTweets(options: TweetSearchOptions): Promise<TweetSearchResult> {
    // 検索オプション検証
    const validation = this.validateSearchOptions(options);
    if (!validation.isValid) {
      throw new Error(`Search validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const params = this.buildSearchParams(options);
      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.TWEET_ENDPOINTS.search,
        params
      );

      return {
        tweets: response.data.map(tweet => this.normalizeTweetData(tweet)),
        totalCount: response.meta?.result_count || 0,
        nextToken: response.meta?.next_token,
        searchQuery: options.query,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this.handleTweetError(error, 'searchTweets');
    }
  }

  private validateSearchOptions(options: TweetSearchOptions): ValidationResult {
    const errors: string[] = [];

    if (!options.query?.trim()) {
      errors.push('Search query is required');
    }

    if (options.query && options.query.length > 500) {
      errors.push('Search query too long (max 500 characters)');
    }

    if (options.max_results && (options.max_results < 10 || options.max_results > 100)) {
      errors.push('Max results must be between 10 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private buildSearchParams(options: TweetSearchOptions): Record<string, any> {
    return {
      query: options.query,
      max_results: options.max_results || 20,
      'tweet.fields': 'created_at,public_metrics,context_annotations,lang,author_id',
      'user.fields': 'username,verified,public_metrics',
      ...(options.start_time && { start_time: options.start_time }),
      ...(options.end_time && { end_time: options.end_time }),
      ...(options.sort_order && { sort_order: options.sort_order }),
      ...(options.next_token && { next_token: options.next_token })
    };
  }

  private normalizeTweetData(apiTweet: any): TweetData {
    return {
      id: apiTweet.id,
      text: apiTweet.text,
      author_id: apiTweet.author_id,
      created_at: apiTweet.created_at,
      public_metrics: {
        retweet_count: apiTweet.public_metrics?.retweet_count || 0,
        like_count: apiTweet.public_metrics?.like_count || 0,
        quote_count: apiTweet.public_metrics?.quote_count || 0,
        reply_count: apiTweet.public_metrics?.reply_count || 0,
        impression_count: apiTweet.public_metrics?.impression_count || 0
      },
      context_annotations: apiTweet.context_annotations || [],
      lang: apiTweet.lang,
      in_reply_to_user_id: apiTweet.in_reply_to_user_id,
      conversation_id: apiTweet.conversation_id
    };
  }
}
```

### Phase 3: UserEndpoints改善

**ファイル**: `src/kaito-api/endpoints/user-endpoints.ts`

```typescript
export class UserEndpoints {
  private readonly USER_ENDPOINTS = {
    getUserById: '/v1/users/:id',
    getUserByUsername: '/v1/users/by/username/:username',
    searchUsers: '/v1/users/search',
    followUser: '/v1/users/:id/follow',
    unfollowUser: '/v1/users/:id/unfollow',
    getFollowers: '/v1/users/:id/followers',
    getFollowing: '/v1/users/:id/following'
  } as const;

  async getUserInfo(userId: string): Promise<UserInfo> {
    // ユーザーID検証
    if (!this.isValidUserId(userId)) {
      throw new Error('Invalid user ID format');
    }

    try {
      const response = await this.httpClient.get<TwitterAPIUserResponse>(
        this.USER_ENDPOINTS.getUserById.replace(':id', userId),
        {
          'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
        }
      );

      return this.normalizeUserData(response.data);
    } catch (error) {
      throw this.handleUserError(error, 'getUserInfo');
    }
  }

  private isValidUserId(userId: string): boolean {
    // TwitterのユーザーIDは数値文字列
    return /^\d+$/.test(userId) && userId.length >= 1 && userId.length <= 20;
  }

  private normalizeUserData(apiUser: any): UserInfo {
    return {
      id: apiUser.id,
      username: apiUser.username,
      displayName: apiUser.name,
      description: apiUser.description || '',
      followersCount: apiUser.public_metrics?.followers_count || 0,
      followingCount: apiUser.public_metrics?.following_count || 0,
      tweetsCount: apiUser.public_metrics?.tweet_count || 0,
      verified: apiUser.verified || false,
      createdAt: apiUser.created_at,
      location: apiUser.location || '',
      website: apiUser.url || '',
      profileImageUrl: apiUser.profile_image_url || '',
      bannerImageUrl: apiUser.profile_banner_url || ''
    };
  }
}
```

## 📝 必須実装項目

### 1. バリデーション強化
- [ ] 入力パラメータの厳密な検証
- [ ] TwitterAPI.io制限値の遵守
- [ ] 不正データの検出と拒否

### 2. エラーハンドリング統一
- [ ] HTTPステータスコード別処理
- [ ] TwitterAPI.io特有エラーの適切な処理
- [ ] エラーメッセージの標準化

### 3. レスポンス正規化
- [ ] APIレスポンスの一貫した変換
- [ ] null/undefined値の適切な処理
- [ ] データ型の保証

### 4. パフォーマンス最適化
- [ ] 不要なAPIコールの削減
- [ ] レスポンスデータの効率的な処理
- [ ] メモリ使用量の最適化

### 5. セキュリティ強化
- [ ] 入力サニタイゼーション
- [ ] SQLインジェクション対策
- [ ] 機密情報の適切な処理

## 🚫 制約事項

### MVP制約
- **機能最小限**: 実際に使用される機能のみ実装
- **複雑なロジック回避**: シンプルで理解しやすい実装
- **パフォーマンス優先**: 過剰な機能は実装しない

### API制約
- **TwitterAPI.io仕様厳守**: 公式仕様からの逸脱禁止
- **レート制限遵守**: 200 QPS制限の厳密な管理
- **認証要件**: 適切な認証ヘッダーの付与

## 📊 品質基準

### 機能品質
- 全エンドポイントの正常動作
- エラー時の適切な処理
- バリデーションの確実な実行

### コード品質
- TypeScript strict mode 適合
- ESLint エラーなし
- 単体テスト 90%以上カバレッジ

### パフォーマンス
- 平均レスポンス時間 500ms以下
- メモリリークなし
- CPU使用率適切

## 📋 テスト要件

### 単体テスト
- [ ] 各エンドポイントの正常系テスト
- [ ] バリデーションエラーの境界値テスト
- [ ] エラーハンドリングの網羅テスト

### 統合テスト
- [ ] TwitterAPI.io実環境テスト
- [ ] エンドポイント間の連携テスト
- [ ] エラー回復テスト

## 📄 成果物

### 必須ファイル
- `src/kaito-api/endpoints/action-endpoints.ts` (改善版)
- `src/kaito-api/endpoints/tweet-endpoints.ts` (改善版)
- `src/kaito-api/endpoints/user-endpoints.ts` (改善版)
- `src/kaito-api/endpoints/trend-endpoints.ts` (改善版)

### ユーティリティファイル
- `src/kaito-api/utils/validation.ts` (新規)
- `src/kaito-api/utils/normalizer.ts` (新規)

### ドキュメント
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/endpoint-improvement-log.md`

## 🎯 重要な注意事項

1. **既存API互換性**: 破壊的変更の回避
2. **TwitterAPI.io仕様準拠**: 公式ドキュメントとの完全一致
3. **エラーハンドリング充実**: 予期しない状況での安定動作
4. **パフォーマンス重視**: レスポンス時間の最適化
5. **セキュリティ重視**: 入力検証とサニタイゼーション

---

**実装完了後、報告書を作成してください**:
📋 報告書: `tasks/20250727_223237_kaito_api_quality_improvement/reports/REPORT-003-endpoint-optimization.md`