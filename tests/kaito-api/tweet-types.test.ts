/**
 * KaitoAPI Tweet Types Unit Test
 * 
 * Tweet関連型定義の詳細テスト
 * - TweetData, TweetResult, RetweetResult, QuoteResult
 * - TweetSearchResult, TweetSearchOptions, CreateTweetOptions
 * - DeleteTweetResult
 */

import { describe, test, expect } from 'vitest';
import type {
  TweetData,
  TweetResult,
  RetweetResult,
  QuoteResult,
  TweetSearchResult,
  TweetSearchOptions,
  CreateTweetOptions,
  DeleteTweetResult
} from '../../src/kaito-api/types';

describe('Tweet Types Unit Tests', () => {
  
  describe('TweetData Type Tests', () => {
    test('should accept valid TweetData with all required fields', () => {
      const validTweet: TweetData = {
        id: '1234567890',
        text: 'This is a test tweet for educational purposes',
        authorId: 'user123',
        createdAt: '2023-12-01T12:00:00.000Z',
        publicMetrics: {
          retweetCount: 5,
          likeCount: 10,
          quoteCount: 2,
          replyCount: 3,
          impressionCount: 100
        }
      };
      
      expect(validTweet.id).toBe('1234567890');
      expect(validTweet.text).toBe('This is a test tweet for educational purposes');
      expect(validTweet.authorId).toBe('user123');
      expect(validTweet.publicMetrics.retweetCount).toBe(5);
      expect(validTweet.publicMetrics.likeCount).toBe(10);
    });
    
    test('should accept TweetData with optional fields', () => {
      const tweetWithOptionals: TweetData = {
        id: '1234567890',
        text: 'Tweet with optional fields',
        authorId: 'user123',
        createdAt: '2023-12-01T12:00:00.000Z',
        publicMetrics: {
          retweetCount: 0,
          likeCount: 0,
          quoteCount: 0,
          replyCount: 0,
          impressionCount: 0
        },
        contextAnnotations: [
          {
            domain: 'Finance',
            entity: 'Trading',
            description: 'Financial trading discussion'
          }
        ],
        attachments: {
          mediaKeys: ['media_1', 'media_2'],
          pollIds: ['poll_1']
        },
        referencedTweets: [
          {
            type: 'replied_to',
            id: 'original_tweet_id'
          }
        ],
        inReplyToUserId: 'original_user_id',
        conversationId: 'conversation_123',
        lang: 'en'
      };
      
      expect(tweetWithOptionals.contextAnnotations).toBeDefined();
      expect(tweetWithOptionals.contextAnnotations![0].domain).toBe('Finance');
      expect(tweetWithOptionals.attachments?.mediaKeys).toHaveLength(2);
      expect(tweetWithOptionals.referencedTweets![0].type).toBe('replied_to');
    });
    
    test('should enforce correct publicMetrics structure', () => {
      const tweet: TweetData = {
        id: '123',
        text: 'Test',
        authorId: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        publicMetrics: {
          retweetCount: 1,
          likeCount: 2,
          quoteCount: 3,
          replyCount: 4,
          impressionCount: 5
        }
      };
      
      // Verify all required publicMetrics fields are present and are numbers
      expect(typeof tweet.publicMetrics.retweetCount).toBe('number');
      expect(typeof tweet.publicMetrics.likeCount).toBe('number');
      expect(typeof tweet.publicMetrics.quoteCount).toBe('number');
      expect(typeof tweet.publicMetrics.replyCount).toBe('number');
      expect(typeof tweet.publicMetrics.impressionCount).toBe('number');
    });
    
    test('should enforce referencedTweets type union', () => {
      const tweetTypes: Array<'retweeted' | 'quoted' | 'replied_to'> = [
        'retweeted', 'quoted', 'replied_to'
      ];
      
      tweetTypes.forEach(type => {
        const tweet: TweetData = {
          id: '123',
          text: 'Test',
          authorId: 'user',
          createdAt: '2023-01-01T00:00:00Z',
          publicMetrics: {
            retweetCount: 0,
            likeCount: 0,
            quoteCount: 0,
            replyCount: 0,
            impressionCount: 0
          },
          referencedTweets: [{
            type,
            id: 'referenced_tweet_id'
          }]
        };
        
        expect(tweet.referencedTweets![0].type).toBe(type);
      });
    });
  });
  
  describe('TweetResult Type Tests', () => {
    test('should accept valid successful TweetResult', () => {
      const successResult: TweetResult = {
        id: 'tweet_123',
        text: 'Successfully posted tweet',
        url: 'https://x.com/user/status/tweet_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(successResult.success).toBe(true);
      expect(successResult.error).toBeUndefined();
      expect(successResult.url).toContain('x.com');
    });
    
    test('should accept TweetResult with error', () => {
      const errorResult: TweetResult = {
        id: '',
        text: 'Failed to post tweet',
        url: '',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Rate limit exceeded'
      };
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Rate limit exceeded');
    });
  });
  
  describe('RetweetResult Type Tests', () => {
    test('should accept valid RetweetResult', () => {
      const retweetResult: RetweetResult = {
        id: 'retweet_123',
        originalTweetId: 'original_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(retweetResult.originalTweetId).toBe('original_123');
      expect(retweetResult.success).toBe(true);
    });
    
    test('should accept RetweetResult with error', () => {
      const errorRetweet: RetweetResult = {
        id: '',
        originalTweetId: 'original_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Tweet not found'
      };
      
      expect(errorRetweet.success).toBe(false);
      expect(errorRetweet.error).toBe('Tweet not found');
    });
  });
  
  describe('QuoteResult Type Tests', () => {
    test('should accept valid QuoteResult', () => {
      const quoteResult: QuoteResult = {
        id: 'quote_123',
        originalTweetId: 'original_123',
        comment: 'This is a great insight!',
        url: 'https://x.com/user/status/quote_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(quoteResult.comment).toBe('This is a great insight!');
      expect(quoteResult.originalTweetId).toBe('original_123');
      expect(quoteResult.success).toBe(true);
    });
  });
  
  describe('TweetSearchResult Type Tests', () => {
    test('should accept valid TweetSearchResult', () => {
      const mockTweet: TweetData = {
        id: '123',
        text: 'Search result tweet',
        authorId: 'user123',
        createdAt: '2023-12-01T12:00:00.000Z',
        publicMetrics: {
          retweetCount: 0,
          likeCount: 0,
          quoteCount: 0,
          replyCount: 0,
          impressionCount: 0
        }
      };
      
      const searchResult: TweetSearchResult = {
        tweets: [mockTweet],
        totalCount: 1,
        searchQuery: 'test query',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(searchResult.tweets).toHaveLength(1);
      expect(searchResult.totalCount).toBe(1);
      expect(searchResult.searchQuery).toBe('test query');
    });
    
    test('should accept TweetSearchResult with nextToken', () => {
      const searchResult: TweetSearchResult = {
        tweets: [],
        totalCount: 100,
        nextToken: 'next_page_token',
        searchQuery: 'large search',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(searchResult.nextToken).toBe('next_page_token');
    });
  });
  
  describe('TweetSearchOptions Type Tests', () => {
    test('should accept minimal TweetSearchOptions', () => {
      const minimalOptions: TweetSearchOptions = {
        query: 'trading education'
      };
      
      expect(minimalOptions.query).toBe('trading education');
    });
    
    test('should accept TweetSearchOptions with all optional fields', () => {
      const fullOptions: TweetSearchOptions = {
        query: 'financial markets',
        maxResults: 50,
        nextToken: 'page_token',
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-12-31T23:59:59.999Z',
        sortOrder: 'recency',
        includeRetweets: false,
        lang: 'en',
        tweetFields: ['id', 'text', 'created_at', 'public_metrics'],
        expansions: ['author_id', 'referenced_tweets.id']
      };
      
      expect(fullOptions.sortOrder).toBe('recency');
      expect(fullOptions.includeRetweets).toBe(false);
      expect(fullOptions.tweetFields).toContain('public_metrics');
      expect(fullOptions.expansions).toContain('author_id');
    });
    
    test('should enforce sortOrder union type', () => {
      const recencySort: TweetSearchOptions = {
        query: 'test',
        sortOrder: 'recency'
      };
      
      const relevancySort: TweetSearchOptions = {
        query: 'test',
        sortOrder: 'relevancy'
      };
      
      expect(recencySort.sortOrder).toBe('recency');
      expect(relevancySort.sortOrder).toBe('relevancy');
    });
  });
  
  describe('CreateTweetOptions Type Tests', () => {
    test('should accept minimal CreateTweetOptions', () => {
      const minimalOptions: CreateTweetOptions = {
        text: 'This is a test tweet'
      };
      
      expect(minimalOptions.text).toBe('This is a test tweet');
    });
    
    test('should accept CreateTweetOptions with all optional fields', () => {
      const fullOptions: CreateTweetOptions = {
        text: 'Tweet with all options',
        mediaIds: ['media_1', 'media_2'],
        pollOptions: ['Option A', 'Option B', 'Option C'],
        pollDurationMinutes: 1440,
        inReplyToTweetId: 'reply_to_123',
        quoteTweetId: 'quote_123',
        location: {
          placeId: 'place_123'
        },
        directMessageDeepLink: 'https://x.com/messages/compose?recipient_id=123',
        forSuperFollowersOnly: false
      };
      
      expect(fullOptions.mediaIds).toHaveLength(2);
      expect(fullOptions.pollOptions).toHaveLength(3);
      expect(fullOptions.pollDurationMinutes).toBe(1440);
      expect(fullOptions.location?.placeId).toBe('place_123');
      expect(fullOptions.forSuperFollowersOnly).toBe(false);
    });
  });
  
  describe('DeleteTweetResult Type Tests', () => {
    test('should accept successful DeleteTweetResult', () => {
      const deleteResult: DeleteTweetResult = {
        tweetId: 'tweet_to_delete',
        deleted: true,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(deleteResult.deleted).toBe(true);
      expect(deleteResult.success).toBe(true);
    });
    
    test('should accept failed DeleteTweetResult', () => {
      const failedDelete: DeleteTweetResult = {
        tweetId: 'nonexistent_tweet',
        deleted: false,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Tweet not found'
      };
      
      expect(failedDelete.deleted).toBe(false);
      expect(failedDelete.success).toBe(false);
      expect(failedDelete.error).toBe('Tweet not found');
    });
  });
});