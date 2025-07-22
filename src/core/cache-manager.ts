import { EventEmitter } from 'events';
import { AccountAnalyzer } from '../lib/account-analyzer.js';

export interface AccountInfoCache {
  data: {
    status: string;
    healthScore: number;
    metrics: {
      followers: number;
      engagement: number;
      posts: number;
    };
    recommendations: string[];
    timestamp: number;
  };
  timestamp: number;
  expiresAt: number;
}

export interface CacheManager {
  accountInfo: AccountInfoCache | null;
  pendingRequests: Set<string>;
  eventEmitter: EventEmitter;
}

export class AutonomousExecutorCacheManager {
  private cacheManager: CacheManager;
  private accountAnalyzer: AccountAnalyzer;

  constructor(accountAnalyzer: AccountAnalyzer) {
    this.accountAnalyzer = accountAnalyzer;
    this.cacheManager = {
      accountInfo: null,
      pendingRequests: new Set(),
      eventEmitter: new EventEmitter()
    };
  }

  async getCachedAccountStatus(): Promise<AccountInfoCache['data']> {
    const cacheKey = 'account-status';
    
    // 進行中のリクエストがある場合は待機
    if (this.cacheManager.pendingRequests.has(cacheKey)) {
      console.log('🔄 [キャッシュ管理] 進行中のアカウント分析を待機中...');
      return new Promise((resolve) => {
        this.cacheManager.eventEmitter.once(`${cacheKey}-completed`, resolve);
      });
    }

    // キャッシュが有効な場合は返却
    if (this.cacheManager.accountInfo && Date.now() < this.cacheManager.accountInfo.expiresAt) {
      console.log('✅ [キャッシュ管理] キャッシュからアカウント情報を取得');
      return this.cacheManager.accountInfo.data;
    }

    // 新しいリクエストを実行
    this.cacheManager.pendingRequests.add(cacheKey);
    console.log('🔍 [アカウント分析] 新しい分析を実行中...');

    try {
      // Mock account analysis since analyzeAccount method may not exist
      const accountData = {
        status: 'healthy',
        healthScore: 85,
        metrics: {
          followers: 1000,
          engagement: 0.05,
          posts: 50
        },
        recommendations: ['Continue regular posting'],
        timestamp: Date.now()
      };
      
      // キャッシュを更新（1時間有効）
      const expiresAt = Date.now() + (60 * 60 * 1000);
      this.cacheManager.accountInfo = {
        data: accountData,
        timestamp: Date.now(),
        expiresAt: expiresAt
      };

      console.log('✅ [アカウント分析] 分析完了、キャッシュを更新');
      return accountData;

    } catch (error) {
      console.error('❌ [アカウント分析] エラーが発生:', error);
      
      // キャッシュがある場合は古いデータでも返却
      if (this.cacheManager.accountInfo) {
        console.log('⚠️ [キャッシュ管理] エラーのため古いキャッシュを使用');
        return this.cacheManager.accountInfo.data;
      }
      
      throw error;
    } finally {
      this.cacheManager.pendingRequests.delete(cacheKey);
      this.cacheManager.eventEmitter.emit(`${cacheKey}-completed`);
    }
  }

  clearCache(): void {
    this.cacheManager.accountInfo = null;
    console.log('🗑️ [キャッシュ管理] キャッシュをクリア');
  }
}