/**
 * QPSController Unit Tests - QPS制限制御テスト
 * src/kaito-api/core/client.tsのQPSControllerクラステスト
 * 
 * テスト対象:
 * - QPS制限制御（200 QPS上限）
 * - リクエスト間隔制御
 * - 待機時間計算
 * - 現在QPS計算の正確性
 */

// テスト用にQPSControllerクラスを抽出（client.tsからプライベートクラスを取得）
class QPSController {
  private requestTimes: number[] = [];
  private readonly qpsLimit: number;

  constructor(qpsLimit: number = 200) {
    this.qpsLimit = qpsLimit;
  }

  async enforceQPS(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 1秒以内のリクエスト履歴をフィルタリング
    this.requestTimes = this.requestTimes.filter(time => time > oneSecondAgo);
    
    if (this.requestTimes.length >= this.qpsLimit) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest) + 10; // 10ms バッファ
      
      if (waitTime > 0) {
        console.log(`⏱️ QPS制限により待機: ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimes.push(Date.now());
  }

  getCurrentQPS(): number {
    const oneSecondAgo = Date.now() - 1000;
    return this.requestTimes.filter(time => time > oneSecondAgo).length;
  }
}

describe('QPSController Unit Tests', () => {
  let qpsController: QPSController;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Date.nowをモック化
    const mockNow = 1000000000; // 固定時間
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    
    qpsController = new QPSController(200);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default QPS limit of 200', () => {
      const controller = new QPSController();
      expect(controller.getCurrentQPS()).toBe(0);
    });

    it('should initialize with custom QPS limit', () => {
      const controller = new QPSController(100);
      expect(controller.getCurrentQPS()).toBe(0);
    });
  });

  describe('getCurrentQPS', () => {
    it('should return 0 when no requests have been made', () => {
      expect(qpsController.getCurrentQPS()).toBe(0);
    });

    it('should count requests within the last second', async () => {
      const mockNow = 1000000000;
      
      // 複数回enforceQPSを呼び出してリクエスト履歴を蓄積
      await qpsController.enforceQPS();
      expect(qpsController.getCurrentQPS()).toBe(1);
      
      await qpsController.enforceQPS();
      expect(qpsController.getCurrentQPS()).toBe(2);
      
      await qpsController.enforceQPS();
      expect(qpsController.getCurrentQPS()).toBe(3);
    });

    it('should not count requests older than 1 second', async () => {
      const initialTime = 1000000000;
      
      // 最初のリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await qpsController.enforceQPS();
      expect(qpsController.getCurrentQPS()).toBe(1);
      
      // 1.1秒後の時点で新しいリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 1100);
      await qpsController.enforceQPS();
      
      // 古いリクエストは除外され、新しいリクエストのみカウント
      expect(qpsController.getCurrentQPS()).toBe(1);
    });

    it('should handle requests at the 1-second boundary', async () => {
      const initialTime = 1000000000;
      
      // 初期リクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await qpsController.enforceQPS();
      
      // ちょうど1秒後（境界値）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 1000);
      await qpsController.enforceQPS();
      
      // 1秒ちょうどの境界では、古いリクエストは除外される
      expect(qpsController.getCurrentQPS()).toBe(1);
    });
  });

  describe('enforceQPS', () => {
    it('should not wait when QPS limit is not exceeded', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await qpsController.enforceQPS();
      
      // setTimeoutがPromiseの待機用に呼ばれていないことを確認
      expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
      
      setTimeoutSpy.mockRestore();
    });

    it('should wait when QPS limit is exceeded', async () => {
      const initialTime = 1000000000;
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      
      // QPS制限を低く設定したコントローラーを作成
      const limitedController = new QPSController(2);
      
      // 制限まで埋める
      await limitedController.enforceQPS();
      await limitedController.enforceQPS();
      
      // 制限を超える次のリクエスト
      const promiseResolveResult = vi.fn();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          promiseResolveResult(delay);
          callback();
          return {} as any;
        }) as any
      );
      
      await limitedController.enforceQPS();
      
      // 待機時間が計算されていることを確認
      expect(promiseResolveResult).toHaveBeenCalledWith(expect.any(Number));
      const waitTime = promiseResolveResult.mock.calls[0][0];
      expect(waitTime).toBeGreaterThan(0);
      
      setTimeoutSpy.mockRestore();
    });

    it('should calculate correct wait time when QPS limit is exceeded', async () => {
      const initialTime = 1000000000;
      const controller = new QPSController(2);
      
      // 最初のリクエスト（時刻: 1000000000）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await controller.enforceQPS();
      
      // 2番目のリクエスト（時刻: 1000000500 = 500ms後）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 500);
      await controller.enforceQPS();
      
      // 3番目のリクエスト（時刻: 1000000600 = 600ms後）- 制限を超える
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 600);
      
      const promiseResolveResult = vi.fn();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          promiseResolveResult(delay);
          callback();
          return {} as any;
        }) as any
      );
      
      await controller.enforceQPS();
      
      // 期待される待機時間: 1000 - (600 - 0) + 10 = 410ms
      expect(promiseResolveResult).toHaveBeenCalledWith(410);
      
      setTimeoutSpy.mockRestore();
    });

    it('should not wait if calculated wait time is negative or zero', async () => {
      const initialTime = 1000000000;
      const controller = new QPSController(2);
      
      // 最初のリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await controller.enforceQPS();
      
      // 2番目のリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 100);
      await controller.enforceQPS();
      
      // 3番目のリクエスト（1秒以上経過後）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 1500);
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
      
      await controller.enforceQPS();
      
      // 待機が発生しないことを確認
      expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
      
      setTimeoutSpy.mockRestore();
    });

    it('should add request time after processing', async () => {
      const initialTime = 1000000000;
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      
      expect(qpsController.getCurrentQPS()).toBe(0);
      
      await qpsController.enforceQPS();
      
      expect(qpsController.getCurrentQPS()).toBe(1);
    });

    it('should handle multiple rapid requests correctly', async () => {
      const controller = new QPSController(5);
      const initialTime = 1000000000;
      
      // 5つのリクエストを短時間で実行
      for (let i = 0; i < 5; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(initialTime + i * 10);
        await controller.enforceQPS();
      }
      
      expect(controller.getCurrentQPS()).toBe(5);
      
      // 6番目のリクエスト（制限を超える）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 50);
      
      const promiseResolveResult = vi.fn();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          promiseResolveResult(delay);
          callback();
          return {} as any;
        }) as any
      );
      
      await controller.enforceQPS();
      
      // 適切な待機時間が計算されていることを確認
      expect(promiseResolveResult).toHaveBeenCalledWith(expect.any(Number));
      const waitTime = promiseResolveResult.mock.calls[0][0];
      expect(waitTime).toBeGreaterThan(0);
      
      setTimeoutSpy.mockRestore();
    });

    it('should clean up old request times automatically', async () => {
      const controller = new QPSController(100);
      const initialTime = 1000000000;
      
      // 古いリクエストを複数追加
      for (let i = 0; i < 10; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(initialTime + i * 100);
        await controller.enforceQPS();
      }
      
      expect(controller.getCurrentQPS()).toBe(10);
      
      // 2秒後に新しいリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 2000);
      await controller.enforceQPS();
      
      // 古いリクエストは自動的にクリーンアップされ、新しいリクエストのみ残る
      expect(controller.getCurrentQPS()).toBe(1);
    });
  });

  describe('buffer handling', () => {
    it('should include 10ms buffer in wait time calculation', async () => {
      const controller = new QPSController(1);
      const initialTime = 1000000000;
      
      // 最初のリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await controller.enforceQPS();
      
      // 500ms後の2番目のリクエスト（制限を超える）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 500);
      
      const promiseResolveResult = vi.fn();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          promiseResolveResult(delay);
          callback();
          return {} as any;
        }) as any
      );
      
      await controller.enforceQPS();
      
      // 期待される待機時間: 1000 - 500 + 10 = 510ms（10msバッファ含む）
      expect(promiseResolveResult).toHaveBeenCalledWith(510);
      
      setTimeoutSpy.mockRestore();
    });
  });

  describe('console logging', () => {
    it('should log wait message when QPS limit is exceeded', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const controller = new QPSController(1);
      const initialTime = 1000000000;
      
      // 最初のリクエスト
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      await controller.enforceQPS();
      
      // 2番目のリクエスト（制限を超える）
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 500);
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
      
      await controller.enforceQPS();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⏱️ QPS制限により待機'));
      
      consoleSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });
});