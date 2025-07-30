/**
 * プロキシ管理システム
 * 複数プロキシのローテーション管理
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface ProxyConfig {
  url: string;
  name: string;
  priority: number;
  active: boolean;
}

interface ProxyRotationConfig {
  enabled: boolean;
  max_retries: number;
  cooldown_minutes: number;
}

interface ProxiesConfig {
  proxies: ProxyConfig[];
  rotation: ProxyRotationConfig;
}

export class ProxyManager {
  private config!: ProxiesConfig;  // 後で初期化されるため!を付ける
  private currentProxyIndex: number = 0;
  private failedProxies: Map<string, number> = new Map(); // プロキシURL -> 失敗時刻
  private configPath: string;

  constructor(configPath: string = 'data/config/proxies.yaml') {
    this.configPath = configPath;
    this.loadConfig();
  }

  /**
   * 設定ファイル読み込み
   */
  private loadConfig(): void {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configContent) as ProxiesConfig;
      console.log(`✅ プロキシ設定読み込み完了: ${this.config.proxies.length}個のプロキシ`);
    } catch (error) {
      console.error('❌ プロキシ設定読み込みエラー:', error);
      // デフォルト設定（空の設定）
      this.config = {
        proxies: [],
        rotation: {
          enabled: false,
          max_retries: 1,
          cooldown_minutes: 30
        }
      };
      console.error('⚠️ プロキシ設定ファイルが見つかりません。proxies.yamlを作成してください。');
    }
  }

  /**
   * 現在のプロキシを取得
   */
  getCurrentProxy(): string | null {
    const activeProxies = this.getActiveProxies();
    if (activeProxies.length === 0) {
      console.error('❌ 利用可能なプロキシがありません');
      return null;
    }

    const proxy = activeProxies[this.currentProxyIndex % activeProxies.length];
    console.log(`🔄 使用プロキシ: ${proxy.name} (${proxy.priority})`);
    return proxy.url;
  }

  /**
   * 次のプロキシに切り替え
   */
  rotateProxy(): string | null {
    if (!this.config.rotation.enabled) {
      console.log('⚠️ プロキシローテーションが無効です');
      return this.getCurrentProxy();
    }

    const activeProxies = this.getActiveProxies();
    if (activeProxies.length <= 1) {
      console.log('⚠️ 切り替え可能なプロキシがありません');
      return this.getCurrentProxy();
    }

    this.currentProxyIndex++;
    const newProxy = this.getCurrentProxy();
    console.log(`🔄 プロキシ切り替え: インデックス ${this.currentProxyIndex}`);
    return newProxy;
  }

  /**
   * プロキシの失敗を記録
   */
  markProxyFailed(proxyUrl: string): void {
    this.failedProxies.set(proxyUrl, Date.now());
    console.log(`❌ プロキシ失敗記録: ${proxyUrl}`);
  }

  /**
   * アクティブなプロキシリストを取得
   */
  private getActiveProxies(): ProxyConfig[] {
    const now = Date.now();
    const cooldownMs = this.config.rotation.cooldown_minutes * 60 * 1000;

    return this.config.proxies
      .filter(proxy => {
        if (!proxy.active) return false;
        
        const failedTime = this.failedProxies.get(proxy.url);
        if (!failedTime) return true;
        
        // クールダウン時間が経過したか確認
        if (now - failedTime > cooldownMs) {
          this.failedProxies.delete(proxy.url);
          return true;
        }
        
        return false;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * すべてのプロキシをリセット
   */
  resetAllProxies(): void {
    this.failedProxies.clear();
    this.currentProxyIndex = 0;
    console.log('🔄 すべてのプロキシをリセットしました');
  }

  /**
   * プロキシステータスを取得
   */
  getProxyStatus(): {
    total: number;
    active: number;
    failed: number;
    current: string | null;
  } {
    const activeProxies = this.getActiveProxies();
    return {
      total: this.config.proxies.length,
      active: activeProxies.length,
      failed: this.failedProxies.size,
      current: this.getCurrentProxy()
    };
  }
}