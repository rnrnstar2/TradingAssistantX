#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { errorHandler } from '../error-handler';

const execAsync = promisify(exec);

interface HealthStatus {
  diskSpace: 'ok' | 'warning' | 'critical';
  dataFiles: 'ok' | 'missing' | 'corrupted';
  processes: 'running' | 'stopped';
  overall: 'healthy' | 'warning' | 'critical';
}

interface DiskSpaceInfo {
  availableGB: number;
  status: 'ok' | 'warning' | 'critical';
}

class HealthChecker {
  private readonly outputDir = 'tasks/20250721_001131/outputs';
  private readonly requiredDataFiles = [
    // 新構造での最重要ファイル
    'data/claude-summary.yaml',
    'data/account-config.yaml',
    'data/autonomous-config.yaml',
    
    // 新ディレクトリ構造ファイル
    'data/core/system-state.yaml',
    'data/core/decision-context.yaml',
    'data/current/current-analysis.yaml',
    
    // 既存戦略ファイル（保持）
    'data/content-strategy.yaml',
    'data/posting-data.yaml'
  ];
  
  private readonly optionalDataFiles = [
    // アーカイブファイル（オプション）
    'data/archives/posting-history-archive.yaml',
    'data/archives/error-log-archive.yaml',
    
    // 履歴ファイル（オプション）
    'data/metrics-history.yaml',
    'data/current-situation.yaml'
  ];

  async checkHealth(verbose: boolean = false): Promise<HealthStatus> {
    const health: HealthStatus = {
      diskSpace: 'ok',
      dataFiles: 'ok',
      processes: 'stopped',
      overall: 'healthy'
    };

    try {
      // ディスク容量チェック
      const diskInfo = await this.checkDiskSpace();
      health.diskSpace = diskInfo.status;
      
      if (verbose) {
        console.log(`💾 ディスク容量: ${diskInfo.availableGB.toFixed(2)}GB (${diskInfo.status})`);
      }

      // データファイル整合性チェック
      health.dataFiles = await this.checkDataFiles();
      
      if (verbose) {
        console.log(`📄 データファイル: ${health.dataFiles}`);
      }

      // プロセス状態チェック
      health.processes = await this.checkProcesses();
      
      if (verbose) {
        console.log(`🔄 プロセス状態: ${health.processes}`);
      }

      // 総合判定
      health.overall = this.determineOverallHealth(health);
      
      if (verbose) {
        console.log(`🎯 総合ヘルス: ${health.overall}`);
      }

      // ログ出力
      await this.logHealthStatus(health);

      return health;

    } catch (error) {
      console.error('ヘルスチェック実行エラー:', error);
      await errorHandler.logError(error instanceof Error ? error : new Error(String(error)));
      health.overall = 'critical';
      return health;
    }
  }

  private async checkDiskSpace(): Promise<DiskSpaceInfo> {
    try {
      // macOS対応: df -h でサイズ情報を取得
      const { stdout } = await execAsync('df -h . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      // 利用可能容量は通常4列目（0ベース：3）
      let availableStr = parts[3] || '0G';
      
      // Gi, G, M等の単位を処理
      let availableGB = 0;
      if (availableStr && availableStr.includes('G')) {
        availableGB = parseFloat(availableStr.replace(/[^0-9.]/g, ''));
      } else if (availableStr && availableStr.includes('M')) {
        const availableMB = parseFloat(availableStr.replace(/[^0-9.]/g, ''));
        availableGB = availableMB / 1024;
      } else if (availableStr && availableStr.includes('T')) {
        const availableTB = parseFloat(availableStr.replace(/[^0-9.]/g, ''));
        availableGB = availableTB * 1024;
      } else if (availableStr) {
        // 単位なしの場合はKBと仮定
        const availableKB = parseFloat(availableStr.replace(/[^0-9.]/g, ''));
        availableGB = availableKB / (1024 * 1024);
      }

      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (availableGB < 0.5) {
        status = 'critical';
      } else if (availableGB < 1) {
        status = 'warning';
      }

      return { availableGB, status };
    } catch (error) {
      console.error('ディスク容量チェック失敗:', error);
      await errorHandler.logError(error instanceof Error ? error : new Error(String(error)));
      return { availableGB: 0, status: 'critical' };
    }
  }

  private async checkDataFiles(): Promise<'ok' | 'missing' | 'corrupted'> {
    try {
      let missingRequired = 0;
      let corruptedFiles = 0;
      
      // 必須ファイルのチェック
      for (const filePath of this.requiredDataFiles) {
        const fullPath = join(process.cwd(), filePath);
        
        try {
          await fs.access(fullPath);
          
          // 基本的な読み取りテスト
          const content = await fs.readFile(fullPath, 'utf-8');
          if (content.length === 0) {
            console.warn(`⚠️ [ファイル破損] ${filePath} が空です`);
            corruptedFiles++;
          }
        } catch {
          console.warn(`⚠️ [ファイル欠失] ${filePath} が存在しません`);
          missingRequired++;
        }
      }
      
      // オプションファイルのチェック（エラーではない）
      let optionalMissing = 0;
      for (const filePath of this.optionalDataFiles) {
        const fullPath = join(process.cwd(), filePath);
        
        try {
          await fs.access(fullPath);
        } catch {
          optionalMissing++;
        }
      }
      
      if (optionalMissing > 0) {
        console.log(`📝 [オプションファイル] ${optionalMissing}件のオプションファイルが欠失（正常）`);
      }
      
      // 判定ロジック
      if (corruptedFiles > 0) {
        return 'corrupted';
      }
      
      // claude-summary.yamlが必須、それ以外は許容
      const claudeSummaryPath = join(process.cwd(), 'data/claude-summary.yaml');
      try {
        await fs.access(claudeSummaryPath);
        console.log('✅ [最重要] claude-summary.yaml の存在を確認');
      } catch {
        console.error('❌ [致命的] claude-summary.yaml が存在しません');
        return 'missing';
      }
      
      // その他の必須ファイルの50%以上が欠失した場合はmissing
      const otherRequiredFiles = this.requiredDataFiles.length - 1; // claude-summary.yamlを除く
      if (missingRequired > otherRequiredFiles * 0.5) {
        return 'missing';
      }
      
      return 'ok';
    } catch (error) {
      console.error('データファイルチェック失敗:', error);
      await errorHandler.logError(error instanceof Error ? error : new Error(String(error)));
      return 'corrupted';
    }
  }

  private async checkProcesses(): Promise<'running' | 'stopped'> {
    try {
      const { stdout } = await execAsync('ps aux | grep "autonomous-runner" | grep -v grep');
      return stdout.trim().length > 0 ? 'running' : 'stopped';
    } catch {
      return 'stopped';
    }
  }

  private determineOverallHealth(health: HealthStatus): 'healthy' | 'warning' | 'critical' {
    // Critical条件: ディスク容量critical または データファイル問題
    if (health.diskSpace === 'critical' || health.dataFiles !== 'ok') {
      return 'critical';
    }

    // Warning条件: ディスク容量warning
    if (health.diskSpace === 'warning') {
      return 'warning';
    }

    return 'healthy';
  }

  private async logHealthStatus(health: HealthStatus): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        ...health
      };

      const logPath = join(this.outputDir, 'TASK-003-health-log.txt');
      const logLine = `${timestamp} | ${JSON.stringify(health)}\n`;
      
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('ログ出力失敗:', error);
      await errorHandler.logError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isCritical(): Promise<boolean> {
    const health = await this.checkHealth(false);
    return health.overall === 'critical';
  }
}

// CLI実行
async function main() {
  const verbose = process.argv.includes('--verbose');
  const healthChecker = new HealthChecker();
  
  try {
    console.log('🔍 システムヘルスチェック開始...');
    
    const health = await healthChecker.checkHealth(verbose);
    
    console.log(`\n📊 ヘルスチェック結果:`);
    console.log(`   ディスク容量: ${health.diskSpace}`);
    console.log(`   データファイル: ${health.dataFiles}`);
    console.log(`   プロセス: ${health.processes}`);
    console.log(`   総合判定: ${health.overall}`);

    if (health.overall === 'critical') {
      console.log('\n🚨 Critical状態が検出されました');
      process.exit(1);
    } else if (health.overall === 'warning') {
      console.log('\n⚠️  Warning状態です');
      process.exit(0);
    } else {
      console.log('\n✅ システムは正常です');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('ヘルスチェック実行エラー:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { HealthChecker, type HealthStatus };

// Export main for CLI use
export { main };