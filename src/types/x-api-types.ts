/**
 * X API v2 ツイート型定義
 */
export interface XTweetV2 {
  id: string;
  text: string;
  created_at: string;
  edit_history_tweet_ids?: string[];
  author_id?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  lang?: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number; // Pro以上のプランで利用可能
  };
  possibly_sensitive?: boolean;
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  entities?: {
    hashtags?: Array<{
      start: number;
      end: number;
      tag: string;
    }>;
    mentions?: Array<{
      start: number;
      end: number;
      username: string;
    }>;
    urls?: Array<{
      start: number;
      end: number;
      url: string;
      expanded_url: string;
      display_url: string;
    }>;
  };
}

/**
 * X API v2 ユーザー型定義
 */
export interface XUserV2 {
  id: string;
  username: string;
  name: string;
  created_at?: string;
  description?: string;
  location?: string;
  verified?: boolean;
  protected?: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  profile_image_url?: string;
  url?: string;
  entities?: {
    url?: {
      urls: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
    description?: {
      hashtags?: Array<{
        start: number;
        end: number;
        tag: string;
      }>;
      mentions?: Array<{
        start: number;
        end: number;
        username: string;
      }>;
      urls?: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
  };
}

/**
 * X API v2 メディア型定義
 */
export interface XMediaV2 {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  duration_ms?: number;
  height?: number;
  width?: number;
  preview_image_url?: string;
  public_metrics?: {
    view_count: number;
  };
  alt_text?: string;
}

/**
 * X API v2 エラーレスポンス型定義
 */
export interface XErrorV2 {
  errors?: Array<{
    title: string;
    detail: string;
    type?: string;
    resource_type?: string;
    parameter?: string;
    value?: string;
  }>;
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
}

/**
 * X API v2 ツイート作成リクエスト
 */
export interface XCreateTweetRequestV2 {
  text: string;
  direct_message_deep_link?: string;
  for_super_followers_only?: boolean;
  geo?: {
    place_id: string;
  };
  media?: {
    media_ids?: string[];
    tagged_user_ids?: string[];
  };
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  quote_tweet_id?: string;
  reply?: {
    exclude_reply_user_ids?: string[];
    in_reply_to_tweet_id: string;
  };
  reply_settings?: 'mentionedUsers' | 'following' | 'everyone';
}

/**
 * X API v2 ツイート作成レスポンス
 */
export interface XCreateTweetResponseV2 {
  data: {
    id: string;
    text: string;
  };
}

/**
 * X API v2 ページネーションメタ情報
 */
export interface XPaginationV2 {
  result_count: number;
  next_token?: string;
  previous_token?: string;
}

/**
 * X API v2 レート制限情報
 */
export interface XRateLimitV2 {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * X API v2 標準レスポンス型
 */
export interface XResponseV2<T> {
  data?: T;
  includes?: {
    users?: XUserV2[];
    tweets?: XTweetV2[];
    media?: XMediaV2[];
  };
  errors?: XErrorV2['errors'];
  meta?: XPaginationV2;
}

/**
 * X API v2 フィールドパラメータ
 */
export interface XFieldsV2 {
  'tweet.fields'?: Array<
    'attachments' | 'author_id' | 'context_annotations' |
    'conversation_id' | 'created_at' | 'edit_controls' |
    'edit_history_tweet_ids' | 'entities' | 'geo' | 'id' |
    'in_reply_to_user_id' | 'lang' | 'possibly_sensitive' |
    'public_metrics' | 'referenced_tweets' | 'reply_settings' |
    'source' | 'text' | 'withheld'
  >;
  'user.fields'?: Array<
    'created_at' | 'description' | 'entities' | 'id' |
    'location' | 'name' | 'pinned_tweet_id' | 'profile_image_url' |
    'protected' | 'public_metrics' | 'url' | 'username' |
    'verified' | 'withheld'
  >;
  'media.fields'?: Array<
    'duration_ms' | 'height' | 'media_key' |
    'preview_image_url' | 'type' | 'url' | 'width' |
    'public_metrics' | 'alt_text' | 'variants'
  >;
  expansions?: Array<
    'attachments.poll_ids' | 'attachments.media_keys' |
    'author_id' | 'edit_history_tweet_ids' | 'entities.mentions.username' |
    'geo.place_id' | 'in_reply_to_user_id' | 'referenced_tweets.id' |
    'referenced_tweets.id.author_id'
  >;
}

/**
 * X API v2 検索クエリパラメータ (Pro以上)
 */
export interface XSearchParamsV2 extends XFieldsV2 {
  query: string;
  max_results?: number; // 10-100, default: 10
  next_token?: string;
  since_id?: string;
  until_id?: string;
  start_time?: string; // YYYY-MM-DDTHH:mm:ssZ
  end_time?: string; // YYYY-MM-DDTHH:mm:ssZ
  sort_order?: 'recency' | 'relevancy';
}