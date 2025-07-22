import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../logging/logger';
import { YamlManager } from './yaml-manager';
import { BasicErrorHandler, handleError } from './error-handler';

/**
 * 構造検証結果のインターフェース
 */
export interface StructureValidationResult {
  isValid: boolean;
  violations: StructureViolation[];
  warnings: string[];
}

/**
 * 構造違反の詳細
 */
export interface StructureViolation {
  type: 'missing' | 'unauthorized' | 'naming' | 'structure';
  path: string;
  expected?: string;
  actual?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * 実行検証結果
 */
export interface ExecutionValidation {
  preExecution: StructureValidationResult;
  postExecution: StructureValidationResult;
  dataLimits: DataLimitValidation;
  namingRules: NamingValidation;
}

/**
 * データ制限検証
 */
export interface DataLimitValidation {
  current: {
    fileCount: number;
    maxFiles: number;
    totalSize: number;
    maxSize: number;
  };
  learning: {
    totalSize: number;
    maxSize: number;
  };
}

/**
 * 命名規則検証
 */
export interface NamingValidation {
  isValid: boolean;
  violations: string[];
}

/**
 * 整合性アクション
 */
export interface IntegrityAction {
  type: 'block' | 'rollback' | 'warn' | 'allow';
  reason: string;
  details: any;
  timestamp: Date;
}

/**
 * ファイル変更記録
 */
export interface FileChange {
  operation: 'create' | 'modify' | 'delete';
  path: string;
  backup?: string;
  timestamp: Date;
}

/**
 * 許可された書き込みパス
 */
const ALLOWED_WRITE_PATHS = [
  'data/current/',
  'data/learning/', 
  'data/archives/',
  'tasks/outputs/'
];

/**
 * 読み取り専用パス
 */
const READONLY_PATHS = [
  'src/',
  'data/config/',
  'tests/',
  'docs/',
  'REQUIREMENTS.md'
];

/**
 * データサイズ制限（バイト）
 */
const DATA_LIMITS = {
  currentMaxFiles: 20,
  currentMaxSize: 1024 * 1024, // 1MB
  learningMaxSize: 10 * 1024 * 1024 // 10MB
};

/**
 * IntegrityChecker - システムの整合性チェックを行うクラス
 * REQUIREMENTS.mdで定義されたハルシネーション防止機構の核心コンポーネント
 */
export class IntegrityChecker {
  private static instance: IntegrityChecker;
  private logger: Logger;
  private yamlManager: YamlManager;
  private errorHandler: BasicErrorHandler;
  private violationHistory: StructureViolation[] = [];

  private constructor() {
    this.logger = new Logger('IntegrityChecker');
    this.yamlManager = new YamlManager();
    this.errorHandler = new BasicErrorHandler();
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(): IntegrityChecker {
    if (!IntegrityChecker.instance) {
      IntegrityChecker.instance = new IntegrityChecker();
    }
    return IntegrityChecker.instance;
  }

  /**
   * 実行前検証
   */
  public async validateBeforeExecution(): Promise<StructureValidationResult> {
    this.logger.info('実行前検証を開始');
    
    try {
      const structureResult = await this.validateStructure();
      const dataLimitsResult = await this.validateDataLimits();
      
      // データ制限違反を構造違反として追加
      if (dataLimitsResult.current.fileCount > dataLimitsResult.current.maxFiles) {
        structureResult.violations.push({
          type: 'structure',
          path: 'data/current/',
          severity: 'high',
          expected: `最大${dataLimitsResult.current.maxFiles}ファイル`,
          actual: `${dataLimitsResult.current.fileCount}ファイル`
        });
        structureResult.isValid = false;
      }

      if (dataLimitsResult.current.totalSize > dataLimitsResult.current.maxSize) {
        structureResult.violations.push({
          type: 'structure',
          path: 'data/current/',
          severity: 'high',
          expected: `最大${Math.round(dataLimitsResult.current.maxSize / 1024)}KB`,
          actual: `${Math.round(dataLimitsResult.current.totalSize / 1024)}KB`
        });
        structureResult.isValid = false;
      }

      this.logger.info(`実行前検証完了: ${structureResult.isValid ? '成功' : '失敗'}`, {
        violations: structureResult.violations.length,
        warnings: structureResult.warnings.length
      });

      return structureResult;
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        violations: [{
          type: 'structure',
          path: 'system',
          severity: 'critical',
          actual: '検証プロセス失敗'
        }],
        warnings: []
      };
    }
  }

  /**
   * 実行後検証
   */
  public async validateAfterExecution(): Promise<StructureValidationResult> {
    this.logger.info('実行後検証を開始');
    return await this.validateBeforeExecution(); // 同じロジックを使用
  }

  /**
   * ファイル書き込み権限チェック
   */
  public async checkWritePermission(targetPath: string): Promise<boolean> {
    try {
      const normalizedPath = path.normalize(targetPath);
      
      // 読み取り専用パスのチェック
      for (const readonlyPath of READONLY_PATHS) {
        if (normalizedPath.startsWith(readonlyPath)) {
          this.logger.warn(`読み取り専用パスへの書き込み試行を拒否: ${normalizedPath}`);
          return false;
        }
      }

      // 許可されたパスのチェック
      const isAllowed = ALLOWED_WRITE_PATHS.some(allowedPath => 
        normalizedPath.startsWith(allowedPath)
      );

      if (!isAllowed) {
        this.logger.warn(`許可されていないパスへの書き込み試行を拒否: ${normalizedPath}`);
        return false;
      }

      this.logger.debug(`書き込み権限チェック通過: ${normalizedPath}`);
      return true;
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * 構造検証（プライベートメソッド）
   */
  private async validateStructure(): Promise<StructureValidationResult> {
    const violations: StructureViolation[] = [];
    const warnings: string[] = [];

    try {
      // REQUIREMENTS.mdの存在確認
      const requirementsExists = await this.fileExists('REQUIREMENTS.md');
      if (!requirementsExists) {
        violations.push({
          type: 'missing',
          path: 'REQUIREMENTS.md',
          severity: 'critical'
        });
      }

      // 必須ディレクトリの確認
      const requiredDirs = ['src/', 'data/', 'tests/', 'docs/'];
      for (const dir of requiredDirs) {
        const exists = await this.directoryExists(dir);
        if (!exists) {
          violations.push({
            type: 'missing',
            path: dir,
            severity: 'high'
          });
        }
      }

      // data/配下の構造確認
      const dataSubdirs = ['config/', 'current/', 'learning/', 'archives/'];
      for (const subdir of dataSubdirs) {
        const fullPath = path.join('data', subdir);
        const exists = await this.directoryExists(fullPath);
        if (!exists) {
          warnings.push(`推奨ディレクトリが存在しません: ${fullPath}`);
        }
      }

      return {
        isValid: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        violations: [{
          type: 'structure',
          path: 'system',
          severity: 'critical',
          actual: '構造検証プロセス失敗'
        }],
        warnings: []
      };
    }
  }

  /**
   * データ制限チェック（プライベートメソッド）
   */
  private async validateDataLimits(): Promise<DataLimitValidation> {
    try {
      // data/current/の制限チェック
      const currentStats = await this.getDirectoryStats('data/current/');
      
      // data/learning/の制限チェック
      const learningStats = await this.getDirectoryStats('data/learning/');

      return {
        current: {
          fileCount: currentStats.fileCount,
          maxFiles: DATA_LIMITS.currentMaxFiles,
          totalSize: currentStats.totalSize,
          maxSize: DATA_LIMITS.currentMaxSize
        },
        learning: {
          totalSize: learningStats.totalSize,
          maxSize: DATA_LIMITS.learningMaxSize
        }
      };
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)));
      return {
        current: {
          fileCount: 0,
          maxFiles: DATA_LIMITS.currentMaxFiles,
          totalSize: 0,
          maxSize: DATA_LIMITS.currentMaxSize
        },
        learning: {
          totalSize: 0,
          maxSize: DATA_LIMITS.learningMaxSize
        }
      };
    }
  }

  /**
   * 違反時アクション実行（プライベートメソッド）
   */
  private async executeViolationAction(violation: StructureViolation): Promise<IntegrityAction> {
    const action: IntegrityAction = {
      type: 'warn',
      reason: `構造違反検出: ${violation.type}`,
      details: violation,
      timestamp: new Date()
    };

    switch (violation.severity) {
      case 'critical':
        action.type = 'block';
        this.logger.error(`重大な違反を検出: ${violation.path}`, violation);
        break;
      case 'high':
        action.type = 'rollback';
        this.logger.warn(`高レベル違反を検出: ${violation.path}`, violation);
        break;
      case 'medium':
        action.type = 'warn';
        this.logger.warn(`中レベル違反を検出: ${violation.path}`, violation);
        break;
      case 'low':
        action.type = 'allow';
        this.logger.info(`低レベル違反を検出: ${violation.path}`, violation);
        break;
    }

    this.violationHistory.push(violation);
    return action;
  }

  /**
   * ロールバック実行（プライベートメソッド）
   */
  private async performRollback(changes: FileChange[]): Promise<void> {
    this.logger.warn('ロールバック実行を開始', { changes: changes.length });
    
    for (const change of changes.reverse()) {
      try {
        switch (change.operation) {
          case 'create':
            if (await this.fileExists(change.path)) {
              await fs.unlink(change.path);
              this.logger.info(`作成されたファイルを削除: ${change.path}`);
            }
            break;
          case 'modify':
            if (change.backup && await this.fileExists(change.backup)) {
              await fs.copyFile(change.backup, change.path);
              await fs.unlink(change.backup);
              this.logger.info(`ファイルを復元: ${change.path}`);
            }
            break;
          case 'delete':
            if (change.backup && await this.fileExists(change.backup)) {
              await fs.copyFile(change.backup, change.path);
              await fs.unlink(change.backup);
              this.logger.info(`削除されたファイルを復元: ${change.path}`);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`ロールバック失敗: ${change.path}`, error);
      }
    }
  }

  /**
   * ファイル存在確認ヘルパー
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ディレクトリ存在確認ヘルパー
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * ディレクトリ統計取得ヘルパー
   */
  private async getDirectoryStats(dirPath: string): Promise<{fileCount: number, totalSize: number}> {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let fileCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          fileCount++;
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return { fileCount, totalSize };
    } catch {
      return { fileCount: 0, totalSize: 0 };
    }
  }

  /**
   * 違反履歴の取得
   */
  public getViolationHistory(): StructureViolation[] {
    return [...this.violationHistory];
  }

  /**
   * 違反履歴のクリア
   */
  public clearViolationHistory(): void {
    this.violationHistory = [];
    this.logger.info('違反履歴をクリアしました');
  }
}