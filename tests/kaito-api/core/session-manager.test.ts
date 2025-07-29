/**
 * SessionManager単体テスト
 * TASK-001: session.tsのSessionManagerクラスに対する包括的な単体テスト
 * 
 * @fileoverview KaitoAPI認証システムの中核機能であるSessionManagerの全メソッドをテスト
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/kaito-api/core/session';
import type { LoginResult, SessionData } from '../../../src/kaito-api/core/types';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  // モックデータ準備
  const validLoginResult: LoginResult = {
    success: true,
    login_cookie: 'test_cookie_value_123',
    user_info: {
      id: 'test_user_123',
      username: 'testuser'
    }
  };

  const invalidLoginResult: LoginResult = {
    success: false,
    error: 'Login failed'
  };

  const minimalValidLoginResult: LoginResult = {
    success: true,
    login_cookie: 'minimal_cookie'
  };

  const invalidCookieLoginResult: LoginResult = {
    success: true,
    user_info: {
      id: 'test_user',
      username: 'test'
    }
  } as LoginResult; // login_cookieが未定義

  beforeEach(() => {
    // タイマーモック
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    
    // コンソールモック
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  describe('saveSession', () => {
    describe('正常系', () => {
      it('有効なLoginResultでセッションを正常保存', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).not.toBeNull();
        expect(sessionInfo!.cookies).toBe('test_cookie_value_123');
        expect(sessionInfo!.userId).toBe('test_user_123');
        expect(sessionInfo!.status).toBe('active');
      });

      it('24時間の有効期限が正しく設定される', () => {
        const currentTime = Date.now();
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        const expectedExpiry = currentTime + (24 * 60 * 60 * 1000);
        
        expect(sessionInfo!.expiresAt).toBe(expectedExpiry);
        expect(sessionInfo!.createdAt).toBe(currentTime);
      });

      it('セッションIDが適切に生成される', () => {
        const currentTime = Date.now();
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo!.sessionId).toBe(`session_${currentTime}`);
      });

      it('userId情報が正しく保存される', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo!.userId).toBe('test_user_123');
      });

      it('最小限の有効データで保存成功', () => {
        sessionManager.saveSession(minimalValidLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).not.toBeNull();
        expect(sessionInfo!.cookies).toBe('minimal_cookie');
        expect(sessionInfo!.userId).toBe('unknown_user'); // デフォルト値
      });

      it('user_info未定義時のデフォルト処理', () => {
        const loginResultWithoutUserInfo: LoginResult = {
          success: true,
          login_cookie: 'test_cookie'
        };
        
        sessionManager.saveSession(loginResultWithoutUserInfo);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo!.userId).toBe('unknown_user');
      });
    });

    describe('異常系', () => {
      it('無効なLoginResult(success: false)でエラー', () => {
        expect(() => {
          sessionManager.saveSession(invalidLoginResult);
        }).toThrow('Invalid login result for session save');
      });

      it('login_cookieが未定義の場合エラー', () => {
        expect(() => {
          sessionManager.saveSession(invalidCookieLoginResult);
        }).toThrow('Invalid login result for session save');
      });

      it('不正な形式のLoginResultでエラー', () => {
        const malformedResult = {
          success: true
          // login_cookieが未定義
        } as LoginResult;
        
        expect(() => {
          sessionManager.saveSession(malformedResult);
        }).toThrow('Invalid login result for session save');
      });
    });

    describe('ログ出力', () => {
      it('成功時に適切なログメッセージ出力', () => {
        sessionManager.saveSession(validLoginResult);
        
        expect(consoleSpy).toHaveBeenCalledWith('✅ Session saved successfully');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('🕐 Session expires at:')
        );
      });
    });
  });

  describe('getValidCookie', () => {
    describe('正常系', () => {
      it('有効期限内のセッションでcookieを返却', () => {
        sessionManager.saveSession(validLoginResult);
        
        const cookie = sessionManager.getValidCookie();
        expect(cookie).toBe('test_cookie_value_123');
      });

      it('セッションが存在しない場合null返却', () => {
        const cookie = sessionManager.getValidCookie();
        expect(cookie).toBeNull();
      });

      it('セッション保存直後のcookie取得', () => {
        sessionManager.saveSession(validLoginResult);
        
        const cookie = sessionManager.getValidCookie();
        expect(cookie).toBe('test_cookie_value_123');
      });

      it('複数回呼び出しでの一貫性', () => {
        sessionManager.saveSession(validLoginResult);
        
        const cookie1 = sessionManager.getValidCookie();
        const cookie2 = sessionManager.getValidCookie();
        
        expect(cookie1).toBe(cookie2);
        expect(cookie1).toBe('test_cookie_value_123');
      });
    });

    describe('期限切れ処理', () => {
      it('期限切れセッションでnull返却＋自動クリア', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 25時間後に進める（24時間 + 1時間）
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        
        const cookie = sessionManager.getValidCookie();
        expect(cookie).toBeNull();
        
        // セッションが自動的にクリアされることを確認
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).toBeNull();
      });

      it('期限ギリギリのセッションで正常返却', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 23時間59分59秒後に進める（期限内）
        vi.advanceTimersByTime((24 * 60 * 60 * 1000) - 1000);
        
        const cookie = sessionManager.getValidCookie();
        expect(cookie).toBe('test_cookie_value_123');
      });
    });

    describe('ログ出力', () => {
      it('セッション無し時のログメッセージ', () => {
        sessionManager.getValidCookie();
        
        expect(consoleSpy).toHaveBeenCalledWith('❌ No session data available');
      });

      it('期限切れ時のログメッセージ', () => {
        sessionManager.saveSession(validLoginResult);
        
        // セッションを期限切れにする
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        
        sessionManager.getValidCookie();
        
        expect(consoleSpy).toHaveBeenCalledWith('⏰ Session expired, clearing data');
      });
    });
  });

  describe('isSessionValid', () => {
    describe('基本動作', () => {
      it('有効セッション存在時にtrue', () => {
        sessionManager.saveSession(validLoginResult);
        
        expect(sessionManager.isSessionValid()).toBe(true);
      });

      it('セッション無し時にfalse', () => {
        expect(sessionManager.isSessionValid()).toBe(false);
      });

      it('期限切れセッション時にfalse', () => {
        sessionManager.saveSession(validLoginResult);
        
        // セッションを期限切れにする
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        
        expect(sessionManager.isSessionValid()).toBe(false);
      });
    });

    describe('内部ロジック確認', () => {
      it('getValidCookie()と結果が一致', () => {
        // セッション無し状態
        expect(sessionManager.isSessionValid()).toBe(sessionManager.getValidCookie() !== null);
        
        // セッション有り状態
        sessionManager.saveSession(validLoginResult);
        expect(sessionManager.isSessionValid()).toBe(sessionManager.getValidCookie() !== null);
        
        // 期限切れ状態
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        expect(sessionManager.isSessionValid()).toBe(sessionManager.getValidCookie() !== null);
      });
    });
  });

  describe('getSessionInfo', () => {
    describe('正常系', () => {
      it('有効セッションの完全情報返却', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).not.toBeNull();
        
        expect(sessionInfo!.sessionId).toContain('session_');
        expect(sessionInfo!.userId).toBe('test_user_123');
        expect(sessionInfo!.cookies).toBe('test_cookie_value_123');
        expect(sessionInfo!.status).toBe('active');
        expect(typeof sessionInfo!.createdAt).toBe('number');
        expect(typeof sessionInfo!.expiresAt).toBe('number');
        expect(typeof sessionInfo!.lastUpdated).toBe('number');
      });

      it('返却データが元データのコピー（参照分離）', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo1 = sessionManager.getSessionInfo();
        const sessionInfo2 = sessionManager.getSessionInfo();
        
        // 異なるオブジェクトインスタンス
        expect(sessionInfo1).not.toBe(sessionInfo2);
        
        // 内容は同じ
        expect(sessionInfo1).toEqual(sessionInfo2);
        
        // 一方を変更しても他方に影響しない
        sessionInfo1!.userId = 'modified';
        expect(sessionInfo2!.userId).toBe('test_user_123');
      });
    });

    describe('無効状態', () => {
      it('無効セッション時にnull返却', () => {
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).toBeNull();
      });

      it('期限切れセッション時にnull返却', () => {
        sessionManager.saveSession(validLoginResult);
        
        // セッションを期限切れにする
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).toBeNull();
      });
    });

    describe('データ整合性', () => {
      it('返却データの型・構造が正確', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).not.toBeNull();
        
        // 必須フィールドの型チェック
        expect(typeof sessionInfo!.sessionId).toBe('string');
        expect(typeof sessionInfo!.userId).toBe('string');
        expect(typeof sessionInfo!.cookies).toBe('string');
        expect(typeof sessionInfo!.createdAt).toBe('number');
        expect(typeof sessionInfo!.expiresAt).toBe('number');
        expect(typeof sessionInfo!.lastUpdated).toBe('number');
        expect(typeof sessionInfo!.status).toBe('string');
      });

      it('全必須フィールドが含まれている', () => {
        sessionManager.saveSession(validLoginResult);
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo).not.toBeNull();
        
        const requiredFields = [
          'sessionId', 'userId', 'cookies', 'createdAt', 
          'expiresAt', 'lastUpdated', 'status'
        ];
        
        requiredFields.forEach(field => {
          expect(sessionInfo).toHaveProperty(field);
          expect(sessionInfo![field as keyof SessionData]).toBeDefined();
        });
      });
    });
  });

  describe('clearSession', () => {
    describe('基本動作', () => {
      it('セッションデータの完全削除', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 削除前の確認
        expect(sessionManager.isSessionValid()).toBe(true);
        
        sessionManager.clearSession();
        
        // 削除後の確認
        expect(sessionManager.isSessionValid()).toBe(false);
        expect(sessionManager.getValidCookie()).toBeNull();
        expect(sessionManager.getSessionInfo()).toBeNull();
      });

      it('削除後の各種メソッドでnull/false返却', () => {
        sessionManager.saveSession(validLoginResult);
        sessionManager.clearSession();
        
        expect(sessionManager.getValidCookie()).toBeNull();
        expect(sessionManager.isSessionValid()).toBe(false);
        expect(sessionManager.getSessionInfo()).toBeNull();
        
        const stats = sessionManager.getSessionStats();
        expect(stats.hasSession).toBe(false);
        expect(stats.timeRemaining).toBe(0);
        expect(stats.expiresAt).toBeNull();
      });
    });

    describe('状態確認', () => {
      it('クリア前後の状態変化確認', () => {
        // クリア前の状態
        expect(sessionManager.isSessionValid()).toBe(false);
        
        sessionManager.saveSession(validLoginResult);
        expect(sessionManager.isSessionValid()).toBe(true);
        
        sessionManager.clearSession();
        expect(sessionManager.isSessionValid()).toBe(false);
      });

      it('既にクリア済み状態での重複実行', () => {
        // 最初からクリア状態
        sessionManager.clearSession();
        expect(sessionManager.isSessionValid()).toBe(false);
        
        // 2回目のクリア実行
        expect(() => {
          sessionManager.clearSession();
        }).not.toThrow();
        
        expect(sessionManager.isSessionValid()).toBe(false);
      });
    });

    describe('ログ出力確認', () => {
      it('適切なログメッセージ出力', () => {
        sessionManager.clearSession();
        
        expect(consoleSpy).toHaveBeenCalledWith('🧹 Session cleared');
      });
    });
  });

  describe('getSessionStats', () => {
    describe('セッション有り状態', () => {
      it('有効セッション時の統計情報返却', () => {
        const currentTime = Date.now();
        sessionManager.saveSession(validLoginResult);
        
        const stats = sessionManager.getSessionStats();
        
        expect(stats.hasSession).toBe(true);
        expect(stats.timeRemaining).toBe(24 * 60 * 60 * 1000); // 24時間（ミリ秒）
        expect(stats.expiresAt).toBe(new Date(currentTime + 24 * 60 * 60 * 1000).toISOString());
      });

      it('時間残量計算の正確性', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 1時間経過
        vi.advanceTimersByTime(60 * 60 * 1000);
        
        const stats = sessionManager.getSessionStats();
        expect(stats.timeRemaining).toBe(23 * 60 * 60 * 1000); // 23時間残り
      });

      it('expiresAtのISO形式確認', () => {
        const currentTime = Date.now();
        sessionManager.saveSession(validLoginResult);
        
        const stats = sessionManager.getSessionStats();
        const expectedISOString = new Date(currentTime + 24 * 60 * 60 * 1000).toISOString();
        
        expect(stats.expiresAt).toBe(expectedISOString);
        expect(stats.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('セッション無し状態', () => {
      it('セッション無し時のデフォルト値', () => {
        const stats = sessionManager.getSessionStats();
        
        expect(stats.hasSession).toBe(false);
        expect(stats.timeRemaining).toBe(0);
        expect(stats.expiresAt).toBeNull();
      });
    });

    describe('時間計算', () => {
      it('期限ギリギリでの時間残量計算', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 期限の1秒前まで進める
        vi.advanceTimersByTime((24 * 60 * 60 * 1000) - 1000);
        
        const stats = sessionManager.getSessionStats();
        expect(stats.timeRemaining).toBe(1000); // 1秒残り
      });

      it('負の値を0にクランプ', () => {
        sessionManager.saveSession(validLoginResult);
        
        // 期限を超過
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        
        const stats = sessionManager.getSessionStats();
        expect(stats.timeRemaining).toBe(0); // 負の値ではなく0
      });
    });
  });

  describe('統合テスト - メソッド間連携', () => {
    it('完全なセッションライフサイクル', () => {
      // 1. 初期状態確認
      expect(sessionManager.isSessionValid()).toBe(false);
      expect(sessionManager.getValidCookie()).toBeNull();
      
      // 2. セッション保存
      sessionManager.saveSession(validLoginResult);
      expect(sessionManager.isSessionValid()).toBe(true);
      expect(sessionManager.getValidCookie()).toBe('test_cookie_value_123');
      
      // 3. セッション情報確認
      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo).not.toBeNull();
      expect(sessionInfo!.userId).toBe('test_user_123');
      
      // 4. 統計情報確認
      const stats = sessionManager.getSessionStats();
      expect(stats.hasSession).toBe(true);
      expect(stats.timeRemaining).toBeGreaterThan(0);
      
      // 5. セッションクリア
      sessionManager.clearSession();
      expect(sessionManager.isSessionValid()).toBe(false);
      expect(sessionManager.getValidCookie()).toBeNull();
    });

    it('時間経過によるセッション期限切れフロー', () => {
      // セッション作成
      sessionManager.saveSession(validLoginResult);
      expect(sessionManager.isSessionValid()).toBe(true);
      
      // 時間経過（期限内）
      vi.advanceTimersByTime(12 * 60 * 60 * 1000); // 12時間
      expect(sessionManager.isSessionValid()).toBe(true);
      
      // さらに時間経過（期限切れ）
      vi.advanceTimersByTime(13 * 60 * 60 * 1000); // 追加13時間（合計25時間）
      expect(sessionManager.isSessionValid()).toBe(false);
      expect(sessionManager.getValidCookie()).toBeNull();
      expect(sessionManager.getSessionInfo()).toBeNull();
    });

    it('複数の操作での一貫性確認', () => {
      sessionManager.saveSession(validLoginResult);
      
      // 複数回の操作で一貫した結果
      for (let i = 0; i < 5; i++) {
        expect(sessionManager.isSessionValid()).toBe(true);
        expect(sessionManager.getValidCookie()).toBe('test_cookie_value_123');
        
        const sessionInfo = sessionManager.getSessionInfo();
        expect(sessionInfo!.userId).toBe('test_user_123');
        
        const stats = sessionManager.getSessionStats();
        expect(stats.hasSession).toBe(true);
      }
    });

    it('段階的な時間経過での状態変化', () => {
      sessionManager.saveSession(validLoginResult);
      
      // 段階的な時間経過と状態確認
      const checkPoints = [
        { hours: 6, valid: true },
        { hours: 12, valid: true },
        { hours: 18, valid: true },
        { hours: 23, valid: true },
        { hours: 25, valid: false }  // 期限切れ（24時間を超過）
      ];
      
      let totalTime = 0;
      for (const checkPoint of checkPoints) {
        const timeToAdvance = (checkPoint.hours - totalTime) * 60 * 60 * 1000;
        vi.advanceTimersByTime(timeToAdvance);
        totalTime = checkPoint.hours;
        
        const isValid = sessionManager.isSessionValid();
        expect(isValid).toBe(checkPoint.valid);
        
        if (checkPoint.valid) {
          expect(sessionManager.getValidCookie()).toBe('test_cookie_value_123');
          const stats = sessionManager.getSessionStats();
          expect(stats.hasSession).toBe(true);
          expect(stats.timeRemaining).toBeGreaterThan(0);
        } else {
          expect(sessionManager.getValidCookie()).toBeNull();
        }
      }
    });
  });

  describe('エラーハンドリング・境界値テスト', () => {
    it('null/undefinedのLoginResultでエラー', () => {
      expect(() => {
        sessionManager.saveSession(null as any);
      }).toThrow();
      
      expect(() => {
        sessionManager.saveSession(undefined as any);
      }).toThrow();
    });

    it('空オブジェクトのLoginResultでエラー', () => {
      const emptyResult = {} as LoginResult;
      
      expect(() => {
        sessionManager.saveSession(emptyResult);
      }).toThrow('Invalid login result for session save');
    });

    it('部分的に無効なLoginResultでエラー', () => {
      const partiallyInvalidResults = [
        { success: true, login_cookie: '' }, // 空文字列
        { success: true, login_cookie: null }, // null
        { success: true, login_cookie: undefined }, // undefined
        { success: false, login_cookie: 'valid_cookie' }, // success: false
      ];

      partiallyInvalidResults.forEach(result => {
        expect(() => {
          sessionManager.saveSession(result as any);
        }).toThrow('Invalid login result for session save');
      });
    });

    it('大量のセッション操作でのメモリ効率性', () => {
      // 大量の操作でメモリリークしないことを確認
      for (let i = 0; i < 100; i++) {
        sessionManager.saveSession({
          success: true,
          login_cookie: `cookie_${i}`,
          user_info: { id: `user_${i}`, username: `test_${i}` }
        });
        
        expect(sessionManager.isSessionValid()).toBe(true);
        sessionManager.clearSession();
        expect(sessionManager.isSessionValid()).toBe(false);
      }
      
      // 最終状態の確認
      expect(sessionManager.isSessionValid()).toBe(false);
      expect(sessionManager.getSessionInfo()).toBeNull();
    });

    it('極端な時刻での動作確認', () => {
      // 現在時刻を遠い未来に設定
      const futureTime = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1年後
      vi.setSystemTime(futureTime);
      
      sessionManager.saveSession(validLoginResult);
      
      expect(sessionManager.isSessionValid()).toBe(true);
      
      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo!.createdAt).toBe(futureTime);
      expect(sessionInfo!.expiresAt).toBe(futureTime + 24 * 60 * 60 * 1000);
    });

    it('非常に長いcookie文字列での動作', () => {
      const longCookie = 'x'.repeat(10000); // 10KB の文字列
      const longCookieResult: LoginResult = {
        success: true,
        login_cookie: longCookie,
        user_info: { id: 'test', username: 'test' }
      };

      expect(() => {
        sessionManager.saveSession(longCookieResult);
      }).not.toThrow();

      expect(sessionManager.getValidCookie()).toBe(longCookie);
    });

    it('特殊文字を含むcookieでの動作', () => {
      const specialCookie = 'test-cookie_123|special@chars#$%^&*()';
      const specialCookieResult: LoginResult = {
        success: true,
        login_cookie: specialCookie,
        user_info: { id: 'test', username: 'test' }
      };

      sessionManager.saveSession(specialCookieResult);
      expect(sessionManager.getValidCookie()).toBe(specialCookie);
    });

    it('Unicode文字を含むユーザー情報での動作', () => {
      const unicodeResult: LoginResult = {
        success: true,
        login_cookie: 'test_cookie',
        user_info: { 
          id: 'ユーザー123', 
          username: 'テストユーザー😀' 
        }
      };

      sessionManager.saveSession(unicodeResult);
      
      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo!.userId).toBe('ユーザー123');
    });

    it('メソッドの実行順序による影響なし', () => {
      // 異なる順序でメソッドを呼び出しても一貫した結果
      
      // パターン1: 通常の順序
      sessionManager.saveSession(validLoginResult);
      expect(sessionManager.isSessionValid()).toBe(true);
      expect(sessionManager.getValidCookie()).toBe('test_cookie_value_123');
      sessionManager.clearSession();
      
      // パターン2: stats -> info -> cookie の順序
      expect(sessionManager.getSessionStats().hasSession).toBe(false);
      expect(sessionManager.getSessionInfo()).toBeNull();
      expect(sessionManager.getValidCookie()).toBeNull();
      
      // パターン3: cookie -> stats -> info の順序
      sessionManager.saveSession(validLoginResult);
      expect(sessionManager.getValidCookie()).toBe('test_cookie_value_123');
      expect(sessionManager.getSessionStats().hasSession).toBe(true);
      expect(sessionManager.getSessionInfo()).not.toBeNull();
    });
  });
});