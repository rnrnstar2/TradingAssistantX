import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../logger.js';

const logger = new Logger('ResourceMonitor');

const execAsync = promisify(exec);

export interface ResourceStatus {
  cpu: {
    usage: number;
    available: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    available: number;
    percentage: number;
  };
}

export interface ResourceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minDiskSpace: number;
}

export class ResourceMonitor {
  private defaultThresholds: ResourceThresholds = {
    maxCpuUsage: 80,      // %
    maxMemoryUsage: 80,   // %
    minDiskSpace: 1024    // MB
  };
  
  private thresholds: ResourceThresholds;
  private lastCpuInfo: { idle: number; total: number } | null = null;

  constructor(customThresholds: Partial<ResourceThresholds> = {}) {
    this.thresholds = { ...this.defaultThresholds, ...customThresholds };
  }

  /**
   * システムリソースの現在状態を取得
   */
  async getResourceStatus(): Promise<ResourceStatus> {
    try {
      const [cpuUsage, memoryInfo, diskInfo] = await Promise.all([
        this.getCpuUsage(),
        this.getMemoryUsage(),
        this.getDiskUsage()
      ]);

      const status: ResourceStatus = {
        cpu: {
          usage: cpuUsage,
          available: 100 - cpuUsage
        },
        memory: memoryInfo,
        disk: diskInfo
      };

      logger.info('リソース状態を取得しました', {
        cpu: `${status.cpu.usage.toFixed(1)}%`,
        memory: `${status.memory.percentage.toFixed(1)}%`,
        disk: `${status.disk.percentage.toFixed(1)}%`
      });

      return status;
    } catch (error) {
      logger.error('リソース状態の取得に失敗しました', { error });
      throw error;
    }
  }

  /**
   * リソースの可用性をチェック
   */
  async checkResourceAvailability(): Promise<{ available: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let available = true;

    try {
      const status = await this.getResourceStatus();

      // CPU使用率チェック
      if (status.cpu.usage > this.thresholds.maxCpuUsage) {
        warnings.push(`CPU使用率が高い状態です: ${status.cpu.usage.toFixed(1)}%`);
        available = false;
      }

      // メモリ使用率チェック
      if (status.memory.percentage > this.thresholds.maxMemoryUsage) {
        warnings.push(`メモリ使用率が高い状態です: ${status.memory.percentage.toFixed(1)}%`);
        available = false;
      }

      // ディスク容量チェック
      const availableMB = status.disk.available / (1024 * 1024);
      if (availableMB < this.thresholds.minDiskSpace) {
        warnings.push(`ディスク容量が不足しています: ${availableMB.toFixed(0)}MB`);
        available = false;
      }

      if (warnings.length > 0) {
        logger.warn('リソースに関する警告があります', { warnings });
      }

      return { available, warnings };
    } catch (error) {
      logger.error('リソース可用性チェックに失敗しました', { error });
      return { available: false, warnings: ['リソースチェックに失敗しました'] };
    }
  }

  /**
   * CPU使用率を計算
   */
  async getCpuUsage(): Promise<number> {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      // 初回実行時
      if (!this.lastCpuInfo) {
        this.lastCpuInfo = { idle: totalIdle, total: totalTick };
        // 少し待ってから再計測
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getCpuUsage();
      }

      const idleDiff = totalIdle - this.lastCpuInfo.idle;
      const totalDiff = totalTick - this.lastCpuInfo.total;
      const usage = 100 - (100 * idleDiff / totalDiff);

      this.lastCpuInfo = { idle: totalIdle, total: totalTick };

      return Math.max(0, Math.min(100, usage));
    } catch (error) {
      logger.error('CPU使用率の取得に失敗しました', { error });
      return 0;
    }
  }

  /**
   * メモリ使用状況を取得
   */
  async getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const percentage = (usedMem / totalMem) * 100;

      return {
        used: usedMem,
        total: totalMem,
        percentage: Math.round(percentage * 10) / 10
      };
    } catch (error) {
      logger.error('メモリ使用状況の取得に失敗しました', { error });
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * ディスク使用状況を取得
   */
  async getDiskUsage(path: string = '/'): Promise<{ used: number; available: number; percentage: number }> {
    try {
      // プラットフォームに応じたコマンドを実行
      const platform = os.platform();
      let command: string;

      if (platform === 'darwin' || platform === 'linux') {
        command = `df -k "${path}" | tail -1`;
      } else if (platform === 'win32') {
        // Windows対応（基本的な実装）
        command = `wmic logicaldisk get size,freespace /value`;
      } else {
        throw new Error(`サポートされていないプラットフォーム: ${platform}`);
      }

      const { stdout } = await execAsync(command);

      if (platform === 'darwin' || platform === 'linux') {
        const parts = stdout.trim().split(/\s+/);
        const total = parseInt(parts[1], 10) * 1024; // KB to Bytes
        const used = parseInt(parts[2], 10) * 1024;
        const available = parseInt(parts[3], 10) * 1024;
        const percentage = (used / total) * 100;

        return {
          used,
          available,
          percentage: Math.round(percentage * 10) / 10
        };
      } else {
        // Windows用の簡易実装
        const lines = stdout.trim().split('\n');
        let size = 0;
        let freeSpace = 0;

        lines.forEach(line => {
          if (line.includes('Size=')) {
            size = parseInt(line.split('=')[1], 10) || 0;
          }
          if (line.includes('FreeSpace=')) {
            freeSpace = parseInt(line.split('=')[1], 10) || 0;
          }
        });

        const used = size - freeSpace;
        const percentage = size > 0 ? (used / size) * 100 : 0;

        return {
          used,
          available: freeSpace,
          percentage: Math.round(percentage * 10) / 10
        };
      }
    } catch (error) {
      logger.error('ディスク使用状況の取得に失敗しました', { error, path });
      
      // フォールバック: プロセスの使用状況から推定
      const memUsage = process.memoryUsage();
      const estimated = memUsage.external + memUsage.heapUsed;
      
      return {
        used: estimated,
        available: 10 * 1024 * 1024 * 1024, // 10GB（仮定）
        percentage: 50 // 50%（仮定）
      };
    }
  }

  /**
   * リソース状態の健全性を判定
   */
  isResourceHealthy(status: ResourceStatus): boolean {
    // CPU使用率が閾値以下
    if (status.cpu.usage > this.thresholds.maxCpuUsage) {
      return false;
    }

    // メモリ使用率が閾値以下
    if (status.memory.percentage > this.thresholds.maxMemoryUsage) {
      return false;
    }

    // ディスク容量が最小値以上
    const availableMB = status.disk.available / (1024 * 1024);
    if (availableMB < this.thresholds.minDiskSpace) {
      return false;
    }

    return true;
  }

  /**
   * リソース状態のサマリーを取得
   */
  async getResourceSummary(): Promise<string> {
    try {
      const status = await this.getResourceStatus();
      const isHealthy = this.isResourceHealthy(status);
      
      const summary = [
        `リソース状態: ${isHealthy ? '✅ 正常' : '⚠️ 警告'}`,
        `CPU使用率: ${status.cpu.usage.toFixed(1)}%`,
        `メモリ: ${(status.memory.used / (1024 * 1024 * 1024)).toFixed(1)}GB / ${(status.memory.total / (1024 * 1024 * 1024)).toFixed(1)}GB (${status.memory.percentage.toFixed(1)}%)`,
        `ディスク: 利用可能 ${(status.disk.available / (1024 * 1024 * 1024)).toFixed(1)}GB`
      ].join('\n');

      return summary;
    } catch (error) {
      return 'リソース状態の取得に失敗しました';
    }
  }
}

// シングルトンインスタンスをエクスポート
export const resourceMonitor = new ResourceMonitor();