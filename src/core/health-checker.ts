import { Logger, systemLogger } from '../shared/logger';
import { MainLoop } from '../scheduler/main-loop';
import { DataManager } from '../data/data-manager';  
import { KaitoApiClient } from '../kaito-api/client';

interface ComponentHealth {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  details?: string;
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  timestamp: string;
}

export class HealthChecker {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * システム全体のヘルスチェック実行
   */
  async performSystemHealthCheck(
    mainLoop: MainLoop,
    dataManager: DataManager, 
    kaitoClient: KaitoApiClient
  ): Promise<HealthReport> {
    try {
      this.logger.info('🏥 システムヘルスチェック実行中...');

      const healthChecks = await Promise.allSettled([
        this.checkMainLoopHealth(mainLoop),
        this.checkDataManagerHealth(dataManager),
        this.checkApiHealth(kaitoClient)
      ]);

      const components: ComponentHealth[] = [];
      let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      // 結果を集約
      healthChecks.forEach((check, index) => {
        if (check.status === 'fulfilled') {
          components.push(check.value);
          if (check.value.status === 'error') {
            overallStatus = 'error';
          } else if (check.value.status === 'warning' && overallStatus !== 'error') {
            overallStatus = 'warning';
          }
        } else {
          components.push({
            component: ['MainLoop', 'DataManager', 'KaitoAPI'][index],
            status: 'error',
            details: check.reason instanceof Error ? check.reason.message : 'Unknown error'
          });
          overallStatus = 'error';
        }
      });

      const report: HealthReport = {
        overall: overallStatus,
        components,
        timestamp: new Date().toISOString()
      };

      if (report.overall === 'healthy') {
        this.logger.success('✅ システムヘルスチェック完了');
      } else {
        this.logger.warn('⚠️ システムヘルスチェック完了（問題あり）:', report);
      }

      return report;

    } catch (error) {
      this.logger.error('❌ システムヘルスチェック失敗:', error);
      throw error;
    }
  }

  private async checkMainLoopHealth(mainLoop: MainLoop): Promise<ComponentHealth> {
    try {
      const health = await mainLoop.performHealthCheck();
      
      return {
        component: 'MainLoop',
        status: health.overall === 'healthy' ? 'healthy' : 'warning',
        details: health.overall !== 'healthy' ? JSON.stringify(health) : undefined
      };
    } catch (error) {
      return {
        component: 'MainLoop', 
        status: 'error',
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  private async checkDataManagerHealth(dataManager: DataManager): Promise<ComponentHealth> {
    try {
      const health = await dataManager.performHealthCheck();
      
      return {
        component: 'DataManager',
        status: health.errors.length === 0 ? 'healthy' : 'warning',
        details: health.errors.length > 0 ? `Errors: ${health.errors.join(', ')}` : undefined
      };
    } catch (error) {
      return {
        component: 'DataManager',
        status: 'error', 
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  private async checkApiHealth(kaitoClient: KaitoApiClient): Promise<ComponentHealth> {
    try {
      const isHealthy = await kaitoClient.testConnection();
      
      return {
        component: 'KaitoAPI',
        status: isHealthy ? 'healthy' : 'error',
        details: !isHealthy ? 'API connection test failed' : undefined
      };
    } catch (error) {
      return {
        component: 'KaitoAPI',
        status: 'error',
        details: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}