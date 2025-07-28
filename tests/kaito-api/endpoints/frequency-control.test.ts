/**
 * Frequency Control Test Suite
 * 頻度制御機能の専用単体テスト
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type { FrequencyCheck } from '../../../src/kaito-api/types';

describe('Frequency Control Functionality', () => {
  let actionEndpoints: ActionEndpoints;
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    actionEndpoints = new ActionEndpoints('https://api.test.com', {
      'Authorization': 'Bearer test-token'
    });
    mockDateNow = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    mockDateNow.mockRestore();
    jest.clearAllMocks();
  });

  // Helper method to access private checkPostingFrequency method
  const checkFrequency = (): FrequencyCheck => {
    return (actionEndpoints as any).checkPostingFrequency();
  };

  describe('checkPostingFrequency - 投稿頻度制御機能', () => {
    describe('初期状態テスト', () => {
      it('should allow posting initially (no previous posts)', () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        const result = checkFrequency();

        expect(result.canPost).toBe(true);
        expect(result.lastPostTime).toBe(0);
        expect(result.nextAllowedTime).toBe(30 * 60 * 1000); // 30 minutes from 0
        expect(result.waitTimeMs).toBe(0);
      });

      it('should have correct required interval (30 minutes)', () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        const result = checkFrequency();
        const expectedNextTime = 0 + (30 * 60 * 1000); // 30 minutes from initial lastPostTime (0)

        expect(result.nextAllowedTime).toBe(expectedNextTime);
      });
    });

    describe('投稿頻度制御テスト - 30分間隔', () => {
      it('should block posting within 30 minutes', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First post to set lastPostTime
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Check frequency immediately after post
        const result = checkFrequency();

        expect(result.canPost).toBe(false);
        expect(result.lastPostTime).toBe(baseTime);
        expect(result.nextAllowedTime).toBe(baseTime + 30 * 60 * 1000);
        expect(result.waitTimeMs).toBe(30 * 60 * 1000);
      });

      it('should allow posting after exactly 30 minutes', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Move time forward exactly 30 minutes
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000);

        const result = checkFrequency();

        expect(result.canPost).toBe(true);
        expect(result.waitTimeMs).toBe(0);
      });

      it('should block posting at 29 minutes 59 seconds', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Move time forward to 29 minutes 59 seconds
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000 - 1000);

        const result = checkFrequency();

        expect(result.canPost).toBe(false);
        expect(result.waitTimeMs).toBe(1000); // 1 second remaining
      });

      it('should calculate wait time correctly at various intervals', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        const testCases = [
          { minutesAfter: 5, expectedWaitMs: 25 * 60 * 1000 },
          { minutesAfter: 10, expectedWaitMs: 20 * 60 * 1000 },
          { minutesAfter: 15, expectedWaitMs: 15 * 60 * 1000 },
          { minutesAfter: 25, expectedWaitMs: 5 * 60 * 1000 },
          { minutesAfter: 29.5, expectedWaitMs: 0.5 * 60 * 1000 }
        ];

        for (const testCase of testCases) {
          mockDateNow.mockReturnValue(baseTime + testCase.minutesAfter * 60 * 1000);
          const result = checkFrequency();

          expect(result.canPost).toBe(false);
          expect(result.waitTimeMs).toBeCloseTo(testCase.expectedWaitMs, -2); // Allow 100ms tolerance
        }
      });
    });

    describe('次回許可時間計算テスト', () => {
      it('should calculate next allowed time correctly', async () => {
        const postTime = 1640995200000;
        mockDateNow.mockReturnValue(postTime);

        // Perform post to set lastPostTime
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        const result = checkFrequency();
        const expectedNextTime = postTime + 30 * 60 * 1000;

        expect(result.nextAllowedTime).toBe(expectedNextTime);
      });

      it('should maintain consistent next allowed time regardless of current time', async () => {
        const postTime = 1640995200000;
        mockDateNow.mockReturnValue(postTime);

        // Perform post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Check at different times but next allowed time should remain the same
        const expectedNextTime = postTime + 30 * 60 * 1000;

        const checkTimes = [
          postTime + 5 * 60 * 1000,  // 5 minutes after
          postTime + 15 * 60 * 1000, // 15 minutes after
          postTime + 25 * 60 * 1000  // 25 minutes after
        ];

        for (const checkTime of checkTimes) {
          mockDateNow.mockReturnValue(checkTime);
          const result = checkFrequency();
          expect(result.nextAllowedTime).toBe(expectedNextTime);
        }
      });
    });

    describe('ミリ秒単位精度テスト', () => {
      it('should handle millisecond precision in wait time calculation', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Check at various millisecond offsets
        const testCases = [
          { offset: 1000, expectedWait: 30 * 60 * 1000 - 1000 },
          { offset: 5500, expectedWait: 30 * 60 * 1000 - 5500 },
          { offset: 30 * 60 * 1000 - 1, expectedWait: 1 },
          { offset: 30 * 60 * 1000, expectedWait: 0 }
        ];

        for (const testCase of testCases) {
          mockDateNow.mockReturnValue(baseTime + testCase.offset);
          const result = checkFrequency();

          expect(result.waitTimeMs).toBe(testCase.expectedWait);
          expect(result.canPost).toBe(testCase.expectedWait === 0);
        }
      });

      it('should handle edge case of exact millisecond boundaries', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Test exactly at 30 minutes
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000);
        let result = checkFrequency();
        expect(result.canPost).toBe(true);
        expect(result.waitTimeMs).toBe(0);

        // Test 1 millisecond before 30 minutes
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000 - 1);
        result = checkFrequency();
        expect(result.canPost).toBe(false);
        expect(result.waitTimeMs).toBe(1);

        // Test 1 millisecond after 30 minutes
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000 + 1);
        result = checkFrequency();
        expect(result.canPost).toBe(true);
        expect(result.waitTimeMs).toBe(0);
      });
    });

    describe('複数投稿での状態更新テスト', () => {
      it('should update lastPostTime after each successful post', async () => {
        const times = [1640995200000, 1640995200000 + 31 * 60 * 1000, 1640995200000 + 62 * 60 * 1000];

        for (let i = 0; i < times.length; i++) {
          mockDateNow.mockReturnValue(times[i]);
          
          await actionEndpoints.createEducationalPost(`投稿 #${i + 1} について`);
          
          const result = checkFrequency();
          expect(result.lastPostTime).toBe(times[i]);
        }
      });

      it('should not update lastPostTime on failed posts', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First successful post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');
        
        const resultAfterSuccess = checkFrequency();
        expect(resultAfterSuccess.lastPostTime).toBe(baseTime);

        // Move time forward but try to post invalid content (should fail)
        mockDateNow.mockReturnValue(baseTime + 31 * 60 * 1000);
        
        const failedResult = await actionEndpoints.createEducationalPost(''); // Empty content should fail
        expect(failedResult.success).toBe(false);

        // Check that lastPostTime was not updated
        const resultAfterFailed = checkFrequency();
        expect(resultAfterFailed.lastPostTime).toBe(baseTime); // Should still be the first post time
      });
    });

    describe('統計取得との整合性テスト', () => {
      it('should be consistent with getPostingStatistics', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        const frequencyResult = checkFrequency();
        const stats = actionEndpoints.getPostingStatistics();

        expect(frequencyResult.canPost).toBe(stats.canPostNow);
        expect(frequencyResult.lastPostTime).toBe(stats.lastPostTime);
        expect(frequencyResult.nextAllowedTime).toBe(stats.nextAllowedPost);
      });

      it('should maintain consistency across multiple checks', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Multiple consecutive checks should return identical results
        const results: FrequencyCheck[] = [];
        for (let i = 0; i < 5; i++) {
          results.push(checkFrequency());
        }

        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i]).toEqual(results[0]);
        }
      });
    });

    describe('エラー処理・エッジケーステスト', () => {
      it('should handle negative time differences gracefully', () => {
        // Set a future lastPostTime (simulating system clock issues)
        const currentTime = 1640995200000;
        const futureTime = currentTime + 60 * 60 * 1000; // 1 hour in future

        mockDateNow.mockReturnValue(futureTime);
        
        // Manually set lastPostTime to a future value
        (actionEndpoints as any).lastPostTime = futureTime + 60 * 60 * 1000; // Even further in future

        mockDateNow.mockReturnValue(currentTime); // Current time is now in the past

        const result = checkFrequency();

        // Should handle gracefully - when current time < lastPostTime, should not allow posting
        expect(result.canPost).toBe(false);
        expect(result.waitTimeMs).toBeGreaterThan(0);
      });

      it('should handle very large time values', () => {
        const largeTime = Number.MAX_SAFE_INTEGER - 30 * 60 * 1000;
        mockDateNow.mockReturnValue(largeTime);

        const result = checkFrequency();

        expect(result.canPost).toBe(true);
        expect(result.waitTimeMs).toBe(0);
        expect(typeof result.nextAllowedTime).toBe('number');
        expect(isFinite(result.nextAllowedTime)).toBe(true);
      });

      it('should maintain state integrity during concurrent checks', () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // Simulate concurrent frequency checks
        const results = Promise.all([
          Promise.resolve(checkFrequency()),
          Promise.resolve(checkFrequency()),
          Promise.resolve(checkFrequency())
        ]);

        return results.then(([result1, result2, result3]) => {
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        });
      });
    });

    describe('特定の頻度制御ルールテスト', () => {
      it('should enforce exactly 30 minute intervals for posts', async () => {
        const intervals = [
          29 * 60 * 1000,     // 29 minutes - should be blocked
          30 * 60 * 1000,     // 30 minutes - should be allowed
          31 * 60 * 1000,     // 31 minutes - should be allowed
          60 * 60 * 1000,     // 60 minutes - should be allowed
        ];

        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // Initial post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        for (const interval of intervals) {
          mockDateNow.mockReturnValue(baseTime + interval);
          const result = checkFrequency();
          const shouldBeAllowed = interval >= 30 * 60 * 1000;

          expect(result.canPost).toBe(shouldBeAllowed);
          if (!shouldBeAllowed) {
            expect(result.waitTimeMs).toBeGreaterThan(0);
          } else {
            expect(result.waitTimeMs).toBe(0);
          }
        }
      });

      it('should reset wait time after successful post', async () => {
        const baseTime = 1640995200000;
        mockDateNow.mockReturnValue(baseTime);

        // First successful post
        await actionEndpoints.createEducationalPost('投資教育について学びましょう');

        // Check frequency - should not be able to post
        let result = checkFrequency();
        expect(result.canPost).toBe(false);

        // Move forward 30 minutes and post again
        mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000);
        await actionEndpoints.createEducationalPost('リスク管理について学びましょう');

        // Now check frequency again - should not be able to post immediately
        result = checkFrequency();
        expect(result.canPost).toBe(false);
        expect(result.lastPostTime).toBe(baseTime + 30 * 60 * 1000);
        expect(result.waitTimeMs).toBe(30 * 60 * 1000);
      });
    });
  });

  describe('Integration with Educational Posting', () => {
    it('should prevent educational posts when frequency limit is active', async () => {
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime);

      // First post
      await actionEndpoints.createEducationalPost('投資教育について学びましょう');

      // Try immediate second post
      try {
        await actionEndpoints.createEducationalPost('リスク管理について学びましょう');
        fail('Should have thrown frequency limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('投稿頻度制限');
      }
    });

    it('should allow educational posts when frequency limit has passed', async () => {
      const baseTime = 1640995200000;
      mockDateNow.mockReturnValue(baseTime);

      // First post
      const firstResult = await actionEndpoints.createEducationalPost('投資教育について学びましょう');
      expect(firstResult.success).toBe(true);

      // Move time forward 30 minutes
      mockDateNow.mockReturnValue(baseTime + 30 * 60 * 1000);

      // Second post should succeed
      const secondResult = await actionEndpoints.createEducationalPost('リスク管理について学びましょう');
      expect(secondResult.success).toBe(true);
    });

    it('should provide accurate wait time in error messages', async () => {
      const baseTime = 1640995200000;
      mockDateNow.mockReturnValue(baseTime);

      // First post
      await actionEndpoints.createEducationalPost('投資教育について学びましょう');

      // Try posting 10 minutes later
      mockDateNow.mockReturnValue(baseTime + 10 * 60 * 1000);

      try {
        await actionEndpoints.createEducationalPost('リスク管理について学びましょう');
        fail('Should have thrown frequency limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('20分後に再試行してください');
      }
    });
  });
});