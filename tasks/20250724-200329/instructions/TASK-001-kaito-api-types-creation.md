# TASK-001: KaitoAPI型定義統合タスク

## 🎯 タスク概要
`kaito-api/types.ts`ファイルを新規作成し、現在各エンドポイントファイルに散在している型定義を集約する。

## 📋 実装要件

### 1. 新規ファイル作成
- **作成ファイル**: `src/kaito-api/types.ts`
- **目的**: KaitoAPI全体の型定義を一元管理

### 2. 型定義の移行対象
以下のファイルから型定義を抽出し、`types.ts`に移行する：

#### 2.1 tweet-endpoints.ts
- `TweetData`
- `TweetResult`
- `TweetSearchParams`
- `TweetSearchResponse`
- `ReplyRequest`
- `ReplyResponse`
- `QuoteTweetRequest`
- `QuoteTweetResponse`

#### 2.2 user-endpoints.ts
- `UserInfo`
- `FollowResult`
- `UnfollowResult`
- `UserSearchParams`
- `UserSearchResponse`
- `UserTimelineParams`
- `UserTimelineResponse`
- `FollowersListParams`
- `FollowersListResponse`
- `FollowingListParams`
- `FollowingListResponse`

#### 2.3 action-endpoints.ts
- `PostRequest`
- `PostResponse`
- `EngagementRequest`
- `EngagementResponse`
- `EducationalTweetResult`
- `ContentValidation`
- `MediaUploadResult`
- `FrequencyCheck`
- `BatchActionsResult`

#### 2.4 community-endpoints.ts
- `CommunityInfo`
- `CommunityMember`
- `CommunityTweet`

#### 2.5 list-endpoints.ts
- `ListInfo`
- `ListTweet`

#### 2.6 login-endpoints.ts
- `LoginRequest`
- `LoginResponse`
- `TwoFactorAuthRequest`

#### 2.7 trend-endpoints.ts
- `TrendInfo`
- `TrendLocation`

#### 2.8 webhook-endpoints.ts
- `WebhookFilter`
- `WebhookResponse`

#### 2.9 core/client.ts
以下の型は重複しているため、shared/types.tsとの整合性を保ちながら移行：
- `KaitoAPIResponse<T>`
- `KaitoAPIError`
- `RateLimitInfo`
- `PostResult` (shared/types.tsと重複)
- `RetweetResult` (shared/types.tsと重複)
- `QuoteTweetResult` (shared/types.tsと重複)
- `LikeResult` (shared/types.tsと重複)
- `UserFollowResult`
- `SearchTweetsResult`

#### 2.10 core/config.ts
- `KaitoAPIConfig`
- `KaitoAPIEndpoint`
- `KaitoAPICredentials`

### 3. 実装方針
1. **型定義の整理**: 各エンドポイントから型定義をコピーして整理
2. **命名規則統一**: API仕様に合わせてキャメルケースで統一
3. **エクスポート整理**: すべての型を明示的にexport
4. **コメント追加**: 各型定義に適切なJSDocコメントを追加

### 4. 注意事項
- **既存ファイルの型定義は削除しない**: 移行後、別のWorkerがインポート文を更新するまで残す
- **shared/types.tsとの重複**: `PostResult`等の重複は、コメントで重複を明記し、後続Workerが解決
- **型の互換性**: 既存コードが壊れないよう、型定義の構造は変更しない

### 5. 期待される成果物
`src/kaito-api/types.ts`ファイルが作成され、以下の構造を持つ：

```typescript
/**
 * KaitoAPI 統合型定義
 * 各エンドポイントの型定義を一元管理
 */

// ============================================================================
// TWEET TYPES
// ============================================================================
export interface TweetData { ... }
export interface TweetResult { ... }
// ... 他のtweet関連型

// ============================================================================
// USER TYPES
// ============================================================================
export interface UserInfo { ... }
export interface FollowResult { ... }
// ... 他のuser関連型

// ============================================================================
// ACTION TYPES
// ============================================================================
export interface PostRequest { ... }
export interface PostResponse { ... }
// ... 他のaction関連型

// ... 他のセクション

// ============================================================================
// CORE TYPES
// ============================================================================
export interface KaitoAPIResponse<T> { ... }
export interface KaitoAPIError { ... }
// ... 他のcore関連型
```

## 🔧 実装完了後
- `tasks/20250724-200329/reports/REPORT-001-kaito-api-types-creation.md`に実装報告書を作成
- 移行した型定義の一覧と、各ファイルからの移行状況を記載