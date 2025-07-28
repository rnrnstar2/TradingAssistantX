import { 
  TweetData, 
  UserData, 
  CreateTweetOptions, 
  TweetSearchOptions,
  UserSearchOptions,
  EngagementResponse 
} from '../../../src/kaito-api/types';

describe('TwitterAPI.io Type Safety Tests', () => {
  describe('TweetData Type Tests', () => {
    it('should validate TweetData structure', () => {
      const validTweetData: TweetData = {
        id: '1234567890',
        text: 'Test tweet content',
        author_id: 'user123',
        created_at: '2025-01-27T12:00:00.000Z',
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        }
      };

      expect(validTweetData.id).toBe('1234567890');
      expect(validTweetData.public_metrics.like_count).toBe(0);
    });
  });

  describe('CreateTweetOptions Type Tests', () => {
    it('should validate CreateTweetOptions structure', () => {
      const validOptions: CreateTweetOptions = {
        text: 'Test tweet',
        media_ids: ['media123'],
        reply: {
          in_reply_to_tweet_id: '9876543210'
        },
        quote_tweet_id: '5555555555'
      };

      expect(validOptions.text).toBe('Test tweet');
      expect(validOptions.media_ids).toContain('media123');
      expect(validOptions.reply?.in_reply_to_tweet_id).toBe('9876543210');
    });
  });

  describe('SearchOptions Type Tests', () => {
    it('should validate TweetSearchOptions structure', () => {
      const validOptions: TweetSearchOptions = {
        query: 'bitcoin trading',
        max_results: 20,
        'tweet.fields': 'created_at,public_metrics'
      };

      expect(validOptions.query).toBe('bitcoin trading');
      expect(validOptions.max_results).toBe(20);
    });

    it('should validate UserSearchOptions structure', () => {
      const validOptions: UserSearchOptions = {
        query: 'crypto trader',
        max_results: 10,
        'user.fields': 'verified,public_metrics'
      };

      expect(validOptions.query).toBe('crypto trader');
      expect(validOptions.max_results).toBe(10);
    });
  });

  describe('EngagementResponse Type Tests', () => {
    it('should validate EngagementResponse structure', () => {
      const validResponse: EngagementResponse = {
        success: true,
        action: 'like',
        tweetId: '1234567890',
        timestamp: '2025-01-27T12:00:00.000Z',
        data: {
          liked: true
        }
      };

      expect(validResponse.success).toBe(true);
      expect(validResponse.data.liked).toBe(true);
    });
  });
});