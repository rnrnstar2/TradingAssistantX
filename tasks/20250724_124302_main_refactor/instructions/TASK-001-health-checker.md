# TASK-001: HealthChecker クラス作成

## 🎯 タスク概要
**責務**: システムヘルスチェック機能の独立クラス化  
**対象**: src/main.ts の 206-237行のヘルスチェック機能を分離

## 📂 実装対象
**新規作成ファイル**: `src/core/health-checker.ts`

## 🔧 実装内容

### 1. HealthChecker クラス実装
```typescript
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
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的なヘルスチェック機能のみ
- ✅ **確実な動作**: 既存機能の単純移行、新機能追加なし
- 🚫 **統計・分析機能禁止**: パフォーマンス測定・レポート機能は含めない
- 🚫 **過剰な最適化禁止**: 並列処理の最適化などは行わない

## ✅ 完了条件
1. `src/core/health-checker.ts` ファイル作成完了
2. TypeScript エラーなし (npm run typecheck)
3. ESLint エラーなし (npm run lint)
4. 既存のmain.tsのヘルスチェック機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-001-health-checker.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 動作確認方法の記載