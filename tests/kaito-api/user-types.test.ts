/**
 * KaitoAPI User Types Unit Test
 * 
 * User関連型定義の詳細テスト
 * - UserInfo, FollowResult, UnfollowResult, UserSearchResult
 * - SafeUserProfile, UserAnalytics, AccountSafetyCheck
 * - EducationalSearchOptions
 */

import { describe, test, expect } from 'vitest';
import type {
  UserInfo,
  FollowResult,
  UnfollowResult,
  UserSearchResult,
  UserSearchOptions,
  ProfileUpdateData,
  ProfileUpdateResult,
  SafeUserProfile,
  UserAnalytics,
  AccountSafetyCheck,
  EducationalSearchOptions
} from '../../src/kaito-api/types';

describe('User Types Unit Tests', () => {
  
  describe('UserInfo Type Tests', () => {
    test('should accept valid UserInfo with all required fields', () => {
      const userInfo: UserInfo = {
        id: 'user_12345',
        username: 'trading_expert',
        displayName: 'Trading Expert',
        description: 'Educational trading content creator',
        followersCount: 10000,
        followingCount: 500,
        tweetsCount: 2500,
        verified: true,
        createdAt: '2020-01-01T00:00:00.000Z',
        location: 'New York, NY',
        website: 'https://trading-education.com',
        profileImageUrl: 'https://example.com/profile.jpg',
        bannerImageUrl: 'https://example.com/banner.jpg'
      };
      
      expect(userInfo.id).toBe('user_12345');
      expect(userInfo.username).toBe('trading_expert');
      expect(userInfo.followersCount).toBe(10000);
      expect(userInfo.verified).toBe(true);
      expect(typeof userInfo.followersCount).toBe('number');
      expect(typeof userInfo.followingCount).toBe('number');
      expect(typeof userInfo.tweetsCount).toBe('number');
      expect(typeof userInfo.verified).toBe('boolean');
    });
    
    test('should enforce number types for count fields', () => {
      const userInfo: UserInfo = {
        id: 'user_123',
        username: 'testuser',
        displayName: 'Test User',
        description: 'Test description',
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 200,
        verified: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        location: 'Test Location',
        website: 'https://test.com',
        profileImageUrl: 'https://test.com/profile.jpg',
        bannerImageUrl: 'https://test.com/banner.jpg'
      };
      
      expect(Number.isInteger(userInfo.followersCount)).toBe(true);
      expect(Number.isInteger(userInfo.followingCount)).toBe(true);
      expect(Number.isInteger(userInfo.tweetsCount)).toBe(true);
    });
  });
  
  describe('FollowResult Type Tests', () => {
    test('should accept successful FollowResult', () => {
      const followResult: FollowResult = {
        userId: 'target_user_123',
        following: true,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(followResult.following).toBe(true);
      expect(followResult.success).toBe(true);
      expect(followResult.error).toBeUndefined();
    });
    
    test('should accept failed FollowResult with error', () => {
      const failedFollow: FollowResult = {
        userId: 'target_user_123',
        following: false,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'User not found or blocked'
      };
      
      expect(failedFollow.following).toBe(false);
      expect(failedFollow.success).toBe(false);
      expect(failedFollow.error).toBe('User not found or blocked');
    });
  });
  
  describe('UnfollowResult Type Tests', () => {
    test('should accept successful UnfollowResult', () => {
      const unfollowResult: UnfollowResult = {
        userId: 'target_user_123',
        unfollowed: true,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(unfollowResult.unfollowed).toBe(true);
      expect(unfollowResult.success).toBe(true);
    });
    
    test('should accept failed UnfollowResult', () => {
      const failedUnfollow: UnfollowResult = {
        userId: 'target_user_123',
        unfollowed: false,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Not following this user'
      };
      
      expect(failedUnfollow.unfollowed).toBe(false);
      expect(failedUnfollow.error).toBe('Not following this user');
    });
  });
  
  describe('UserSearchResult Type Tests', () => {
    test('should accept valid UserSearchResult', () => {
      const mockUser: UserInfo = {
        id: 'user_123',
        username: 'testuser',
        displayName: 'Test User',
        description: 'Test user for search',
        followersCount: 100,
        followingCount: 50,
        tweetsCount: 200,
        verified: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        location: 'Test Location',
        website: 'https://test.com',
        profileImageUrl: 'https://test.com/profile.jpg',
        bannerImageUrl: 'https://test.com/banner.jpg'
      };
      
      const searchResult: UserSearchResult = {
        users: [mockUser],
        totalCount: 1,
        searchQuery: 'trading expert',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(searchResult.users).toHaveLength(1);
      expect(searchResult.totalCount).toBe(1);
      expect(searchResult.searchQuery).toBe('trading expert');
    });
    
    test('should accept UserSearchResult with nextToken', () => {
      const searchResult: UserSearchResult = {
        users: [],
        totalCount: 500,
        nextToken: 'next_page_token',
        searchQuery: 'financial advisor',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(searchResult.nextToken).toBe('next_page_token');
      expect(searchResult.totalCount).toBe(500);
    });
  });
  
  describe('UserSearchOptions Type Tests', () => {
    test('should accept minimal UserSearchOptions', () => {
      const minimalOptions: UserSearchOptions = {
        query: 'trading education'
      };
      
      expect(minimalOptions.query).toBe('trading education');
    });
    
    test('should accept UserSearchOptions with all optional fields', () => {
      const fullOptions: UserSearchOptions = {
        query: 'financial advisor',
        maxResults: 100,
        nextToken: 'page_token',
        includeVerified: true,
        minFollowers: 1000,
        maxFollowers: 100000
      };
      
      expect(fullOptions.includeVerified).toBe(true);
      expect(fullOptions.minFollowers).toBe(1000);
      expect(fullOptions.maxFollowers).toBe(100000);
      expect(typeof fullOptions.minFollowers).toBe('number');
      expect(typeof fullOptions.maxFollowers).toBe('number');
    });
  });
  
  describe('ProfileUpdateData Type Tests', () => {
    test('should accept ProfileUpdateData with selective fields', () => {
      const partialUpdate: ProfileUpdateData = {
        displayName: 'Updated Name',
        description: 'Updated description'
      };
      
      expect(partialUpdate.displayName).toBe('Updated Name');
      expect(partialUpdate.location).toBeUndefined();
    });
    
    test('should accept ProfileUpdateData with all optional fields', () => {
      const fullUpdate: ProfileUpdateData = {
        displayName: 'New Display Name',
        description: 'New description',
        location: 'New Location',
        website: 'https://newwebsite.com',
        profileImageUrl: 'https://new-profile.jpg',
        bannerImageUrl: 'https://new-banner.jpg'
      };
      
      expect(Object.keys(fullUpdate)).toHaveLength(6);
      expect(fullUpdate.website).toBe('https://newwebsite.com');
    });
  });
  
  describe('ProfileUpdateResult Type Tests', () => {
    test('should accept successful ProfileUpdateResult', () => {
      const updateResult: ProfileUpdateResult = {
        userId: 'user_123',
        updated: true,
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        updatedFields: ['displayName', 'description']
      };
      
      expect(updateResult.updated).toBe(true);
      expect(updateResult.updatedFields).toHaveLength(2);
      expect(updateResult.updatedFields).toContain('displayName');
    });
  });
  
  describe('SafeUserProfile Type Tests', () => {
    test('should accept valid SafeUserProfile with proper Pick types', () => {
      const safeProfile: SafeUserProfile = {
        basicInfo: {
          username: 'educational_trader',
          displayName: 'Educational Trader',
          verified: true,
          description: 'Educational trading content'
        },
        publicMetrics: {
          followersCount: 5000,
          tweetsCount: 1000
        },
        educationalValue: {
          isEducationalAccount: true,
          educationalTopics: ['trading', 'investment', 'finance'],
          credibilityLevel: 'high'
        },
        safetyLevel: 'safe'
      };
      
      expect(safeProfile.basicInfo.username).toBe('educational_trader');
      expect(safeProfile.publicMetrics.followersCount).toBe(5000);
      expect(safeProfile.educationalValue.isEducationalAccount).toBe(true);
      expect(safeProfile.educationalValue.credibilityLevel).toBe('high');
      expect(safeProfile.safetyLevel).toBe('safe');
    });
    
    test('should enforce union types correctly', () => {
      const credibilityLevels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
      const safetyLevels: Array<'safe' | 'caution' | 'restricted'> = ['safe', 'caution', 'restricted'];
      
      credibilityLevels.forEach(level => {
        const profile: SafeUserProfile = {
          basicInfo: {
            username: 'test',
            displayName: 'Test',
            verified: false,
            description: 'Test'
          },
          publicMetrics: {
            followersCount: 100,
            tweetsCount: 50
          },
          educationalValue: {
            isEducationalAccount: true,
            educationalTopics: ['test'],
            credibilityLevel: level
          },
          safetyLevel: 'safe'
        };
        
        expect(profile.educationalValue.credibilityLevel).toBe(level);
      });
      
      safetyLevels.forEach(level => {
        const profile: SafeUserProfile = {
          basicInfo: {
            username: 'test',
            displayName: 'Test',
            verified: false,
            description: 'Test'
          },
          publicMetrics: {
            followersCount: 100,
            tweetsCount: 50
          },
          educationalValue: {
            isEducationalAccount: false,
            educationalTopics: [],
            credibilityLevel: 'low'
          },
          safetyLevel: level
        };
        
        expect(profile.safetyLevel).toBe(level);
      });
    });
  });
  
  describe('UserAnalytics Type Tests', () => {
    test('should accept valid UserAnalytics', () => {
      const analytics: UserAnalytics = {
        userId: 'user_123',
        engagementRate: 0.05,
        educationalContentRatio: 0.8,
        activityLevel: 'high',
        credibilityScore: 0.9,
        topTopics: ['trading', 'finance', 'investment'],
        lastAnalyzed: '2023-12-01T12:00:00.000Z'
      };
      
      expect(analytics.engagementRate).toBe(0.05);
      expect(analytics.educationalContentRatio).toBe(0.8);
      expect(analytics.activityLevel).toBe('high');
      expect(analytics.credibilityScore).toBe(0.9);
      expect(analytics.topTopics).toHaveLength(3);
    });
    
    test('should enforce activityLevel union type', () => {
      const activityLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      activityLevels.forEach(level => {
        const analytics: UserAnalytics = {
          userId: 'user_123',
          engagementRate: 0.03,
          educationalContentRatio: 0.5,
          activityLevel: level,
          credibilityScore: 0.7,
          topTopics: ['test'],
          lastAnalyzed: '2023-12-01T12:00:00.000Z'
        };
        
        expect(analytics.activityLevel).toBe(level);
      });
    });
  });
  
  describe('AccountSafetyCheck Type Tests', () => {
    test('should accept valid AccountSafetyCheck', () => {
      const safetyCheck: AccountSafetyCheck = {
        isSafe: true,
        safetyLevel: 'safe',
        concerns: [],
        recommendations: ['Continue engaging with educational content']
      };
      
      expect(safetyCheck.isSafe).toBe(true);
      expect(safetyCheck.safetyLevel).toBe('safe');
      expect(safetyCheck.concerns).toHaveLength(0);
      expect(safetyCheck.recommendations).toHaveLength(1);
    });
    
    test('should accept AccountSafetyCheck with concerns', () => {
      const concernedCheck: AccountSafetyCheck = {
        isSafe: false,
        safetyLevel: 'caution',
        concerns: ['Low credibility score', 'Suspicious activity pattern'],
        recommendations: ['Review recent posts', 'Verify account information']
      };
      
      expect(concernedCheck.isSafe).toBe(false);
      expect(concernedCheck.safetyLevel).toBe('caution');
      expect(concernedCheck.concerns).toHaveLength(2);
      expect(concernedCheck.recommendations).toHaveLength(2);
    });
  });
  
  describe('EducationalSearchOptions Type Tests', () => {
    test('should extend UserSearchOptions correctly', () => {
      const educationalOptions: EducationalSearchOptions = {
        query: 'trading education',
        maxResults: 50,
        educationalOnly: true,
        minCredibilityLevel: 'high',
        topics: ['trading', 'investment']
      };
      
      // Should have UserSearchOptions properties
      expect(educationalOptions.query).toBe('trading education');
      expect(educationalOptions.maxResults).toBe(50);
      
      // Should have additional educational properties
      expect(educationalOptions.educationalOnly).toBe(true);
      expect(educationalOptions.minCredibilityLevel).toBe('high');
      expect(educationalOptions.topics).toHaveLength(2);
    });
    
    test('should enforce minCredibilityLevel union type', () => {
      const credibilityLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      credibilityLevels.forEach(level => {
        const options: EducationalSearchOptions = {
          query: 'test',
          minCredibilityLevel: level
        };
        
        expect(options.minCredibilityLevel).toBe(level);
      });
    });
  });
});