/**
 * KaitoAPI設定管理システムの実装
 * REQUIREMENTS.md準拠版 - Phase 2.2 設定管理強化
 * 
 * 機能概要:
 * - 環境別設定管理 (dev/staging/prod)
 * - セキュリティ機能 (API Key管理、認証情報保護)
 * - 設定検証・最適化
 * - 監査・ログ機能
 */

import { writeFile, readFile, access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// CONFIGURATION INTERFACES - Phase 2.2
// ============================================================================

/**
 * 環境別KaitoAPI設定インターフェース
 */
export interface KaitoAPIConfig {
  environment: 'dev' | 'staging' | 'prod';
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
      retryConditions: string[];
    };
  };
  authentication: {
    primaryKey: string;
    secondaryKey?: string;
    keyRotationInterval: number;
    encryptionEnabled: boolean;
  };
  performance: {
    qpsLimit: number;
    responseTimeTarget: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    alertingEnabled: boolean;
    healthCheckInterval: number;
  };
  security: {
    rateLimitEnabled: boolean;
    ipWhitelist: string[];
    auditLoggingEnabled: boolean;
    encryptionKey: string;
  };
  features: {
    realApiEnabled: boolean;
    mockFallbackEnabled: boolean;
    batchProcessingEnabled: boolean;
    advancedCachingEnabled: boolean;
  };
  metadata: {
    version: string;
    lastUpdated: string;
    updatedBy: string;
    checksum: string;
  };
}

/**
 * 設定検証結果インターフェース
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
  validatedAt: string;
  validationDuration: number;
  configVersion: string;
  environment: string;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
}

export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  suggestion?: string;
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  impact: 'performance' | 'security' | 'functionality';
  recommendation?: string;
}

/**
 * 設定最適化結果インターフェース
 */
export interface ConfigOptimization {
  optimized: boolean;
  changes: ConfigOptimizationChange[];
  performanceImpact: {
    expectedSpeedImprovement: number;
    expectedMemoryReduction: number;
    expectedCostReduction: number;
  };
  optimizedAt: string;
  optimizationDuration: number;
  recommendedActions: string[];
}

export interface ConfigOptimizationChange {
  field: string;
  originalValue: any;
  optimizedValue: any;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * API Key回転結果インターフェース
 */
export interface KeyRotationResult {
  success: boolean;
  rotatedKeys: string[];
  newKeyInfo: {
    keyId: string;
    expiresAt: string;
    algorithm: string;
  };
  oldKeyInfo: {
    keyId: string;
    retiredAt: string;
    graceperiodEnd: string;
  };
  rotationDuration: number;
  nextRotationScheduled: string;
  securityStatus: 'enhanced' | 'maintained' | 'degraded';
}

/**
 * セキュリティ検証結果インターフェース
 */
export interface SecurityValidationResult {
  securityScore: number; // 0-100
  vulnerabilities: SecurityVulnerability[];
  compliance: ComplianceCheck[];
  recommendations: SecurityRecommendation[];
  validatedAt: string;
  validationDuration: number;
  certificationLevel: 'basic' | 'standard' | 'enterprise';
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'encryption' | 'access_control' | 'data_protection';
  description: string;
  remediation: string;
  cveReference?: string;
}

export interface ComplianceCheck {
  standard: string; // e.g., 'SOC2', 'ISO27001', 'GDPR'
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partially_compliant';
  evidence: string;
  remediationRequired?: string;
}

export interface SecurityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  recommendation: string;
  implementation: string;
  estimatedEffort: string;
}

/**
 * 設定監査結果インターフェース
 */
export interface ConfigAuditResult {
  auditId: string;
  auditedAt: string;
  auditDuration: number;
  auditor: string;
  scope: string[];
  findings: AuditFinding[];
  complianceStatus: 'compliant' | 'non_compliant' | 'requires_attention';
  recommendations: AuditRecommendation[];
  nextAuditScheduled: string;
  auditTrail: AuditTrailEntry[];
}

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'performance' | 'compliance' | 'configuration';
  finding: string;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface AuditRecommendation {
  priority: number;
  category: string;
  recommendation: string;
  implementation: string;
  timeline: string;
  cost: 'low' | 'medium' | 'high';
}

export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  changes: any;
  outcome: 'success' | 'failure' | 'partial';
}

/**
 * 環境設定テンプレートインターフェース
 */
export interface EnvironmentTemplate {
  dev: Partial<KaitoAPIConfig>;
  staging: Partial<KaitoAPIConfig>;
  prod: Partial<KaitoAPIConfig>;
}

// ============================================================================
// KAITO API CONFIG MANAGER - Phase 2.2 実装
// ============================================================================

/**
 * KaitoAPI設定管理システム (Phase 2.2)
 * 環境別設定管理・セキュリティ強化・監査機能を提供
 * 
 * 主要機能:
 * - 環境別設定の読み込み・管理
 * - セキュリティ強化 (API Key回転、暗号化)
 * - 設定検証・最適化
 * - 監査・コンプライアンス機能
 * - リアルタイム設定更新
 */
export class KaitoAPIConfigManager {
  private currentConfig: KaitoAPIConfig | null = null;
  private configCache: Map<string, KaitoAPIConfig> = new Map();
  private auditLog: AuditTrailEntry[] = [];
  private keyRotationSchedule: Map<string, Date> = new Map();
  
  // セキュリティ機能
  private encryptionEnabled: boolean = true;
  private auditingEnabled: boolean = true;
  private complianceMode: boolean = true;
  
  // パフォーマンス監視
  private performanceMetrics: {
    configLoadTimes: number[];
    validationTimes: number[];
    optimizationTimes: number[];
    lastUpdated: string;
  };

  constructor() {
    this.performanceMetrics = {
      configLoadTimes: [],
      validationTimes: [],
      optimizationTimes: [],
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ KaitoAPIConfigManager initialized - Phase 2.2 設定管理システム');
  }

  // ============================================================================
  // 設定管理機能 - Phase 2.2 Core Features
  // ============================================================================

  /**
   * 環境別設定読み込み
   * 指定された環境 (dev/staging/prod) の設定を読み込む
   */
  async loadConfig(env: 'dev' | 'staging' | 'prod'): Promise<KaitoAPIConfig> {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 設定読み込み開始: ${env}環境`);
      
      // キャッシュ確認
      const cacheKey = `config_${env}_${Date.now()}`;
      if (this.configCache.has(env)) {
        console.log(`📦 キャッシュから設定を読み込み: ${env}`);
        const cachedConfig = this.configCache.get(env)!;
        await this.logAuditEvent('config_load', 'system', `${env}_config`, { source: 'cache' });
        return cachedConfig;
      }
      
      // 環境別設定生成（MVP段階はMock実装）
      const config = await this.generateEnvironmentConfig(env);
      
      // 設定検証
      const validation = await this.validateConfigInternal(config);
      if (!validation.isValid) {
        throw new Error(`設定検証失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      // キャッシュに保存
      this.configCache.set(env, config);
      this.currentConfig = config;
      
      // 監査ログ記録
      await this.logAuditEvent('config_load', 'system', `${env}_config`, { 
        version: config.metadata.version,
        validation: 'passed'
      });
      
      // パフォーマンス記録
      const loadTime = Date.now() - startTime;
      this.performanceMetrics.configLoadTimes.push(loadTime);
      this.performanceMetrics.lastUpdated = new Date().toISOString();
      
      console.log(`✅ 設定読み込み完了: ${env} (${loadTime}ms)`);
      return config;
      
    } catch (error) {
      console.error(`❌ 設定読み込みエラー (${env}):`, error);
      await this.logAuditEvent('config_load_error', 'system', `${env}_config`, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 設定検証実行
   * 現在の設定に対して包括的な検証を実行
   */
  async validateConfig(): Promise<ConfigValidationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 設定検証開始...');
      
      if (!this.currentConfig) {
        throw new Error('設定が読み込まれていません。先にloadConfig()を実行してください。');
      }
      
      const result = await this.validateConfigInternal(this.currentConfig);
      
      // パフォーマンス記録
      const validationTime = Date.now() - startTime;
      this.performanceMetrics.validationTimes.push(validationTime);
      
      // 監査ログ記録
      await this.logAuditEvent('config_validation', 'system', 'current_config', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        duration: validationTime
      });
      
      console.log(`${result.isValid ? '✅' : '❌'} 設定検証完了: ${result.errors.length}エラー, ${result.warnings.length}警告 (${validationTime}ms)`);
      return result;
      
    } catch (error) {
      console.error('❌ 設定検証エラー:', error);
      throw error;
    }
  }

  /**
   * 設定最適化実行
   * パフォーマンス・セキュリティ・コスト観点からの設定最適化
   */
  async optimizeConfig(): Promise<ConfigOptimization> {
    const startTime = Date.now();
    
    try {
      console.log('⚡ 設定最適化開始...');
      
      if (!this.currentConfig) {
        throw new Error('設定が読み込まれていません。先にloadConfig()を実行してください。');
      }
      
      const optimization = await this.performConfigOptimization(this.currentConfig);
      
      // 最適化された設定を適用
      if (optimization.optimized && optimization.changes.length > 0) {
        await this.applyOptimizationChanges(optimization.changes);
      }
      
      // パフォーマンス記録
      const optimizationTime = Date.now() - startTime;
      this.performanceMetrics.optimizationTimes.push(optimizationTime);
      
      // 監査ログ記録
      await this.logAuditEvent('config_optimization', 'system', 'current_config', {
        optimized: optimization.optimized,
        changesCount: optimization.changes.length,
        duration: optimizationTime
      });
      
      console.log(`✅ 設定最適化完了: ${optimization.changes.length}変更, ${optimization.performanceImpact.expectedSpeedImprovement}%速度向上 (${optimizationTime}ms)`);
      return optimization;
      
    } catch (error) {
      console.error('❌ 設定最適化エラー:', error);
      throw error;
    }
  }

  // ============================================================================
  // セキュリティ機能 - Phase 2.2 Security Features
  // ============================================================================

  /**
   * API Key回転実行
   * セキュリティ強化のためのAPI Key自動回転
   */
  async rotateAPIKeys(): Promise<KeyRotationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 API Key回転開始...');
      
      if (!this.currentConfig) {
        throw new Error('設定が読み込まれていません。');
      }
      
      // 現在のキー情報
      const oldKeyInfo = {
        keyId: this.generateKeyId(this.currentConfig.authentication.primaryKey),
        retiredAt: new Date().toISOString(),
        graceperiodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間後
      };
      
      // 新しいキー生成
      const newPrimaryKey = await this.generateSecureAPIKey();
      const newKeyInfo = {
        keyId: this.generateKeyId(newPrimaryKey),
        expiresAt: new Date(Date.now() + this.currentConfig.authentication.keyRotationInterval).toISOString(),
        algorithm: 'SHA-256'
      };
      
      // 設定更新
      const oldSecondaryKey = this.currentConfig.authentication.secondaryKey;
      this.currentConfig.authentication.secondaryKey = this.currentConfig.authentication.primaryKey; // 旧プライマリをセカンダリに
      this.currentConfig.authentication.primaryKey = newPrimaryKey;
      
      // 次回回転スケジュール設定
      const nextRotation = new Date(Date.now() + this.currentConfig.authentication.keyRotationInterval);
      this.keyRotationSchedule.set('primary', nextRotation);
      
      const rotationDuration = Date.now() - startTime;
      
      const result: KeyRotationResult = {
        success: true,
        rotatedKeys: ['primary', ...(oldSecondaryKey ? ['secondary'] : [])],
        newKeyInfo,
        oldKeyInfo,
        rotationDuration,
        nextRotationScheduled: nextRotation.toISOString(),
        securityStatus: 'enhanced'
      };
      
      // 監査ログ記録
      await this.logAuditEvent('key_rotation', 'system', 'api_keys', {
        rotatedKeys: result.rotatedKeys,
        newKeyId: newKeyInfo.keyId,
        oldKeyId: oldKeyInfo.keyId,
        success: true
      });
      
      console.log(`✅ API Key回転完了: ${result.rotatedKeys.join(', ')} (${rotationDuration}ms)`);
      return result;
      
    } catch (error) {
      console.error('❌ API Key回転エラー:', error);
      
      const result: KeyRotationResult = {
        success: false,
        rotatedKeys: [],
        newKeyInfo: { keyId: '', expiresAt: '', algorithm: '' },
        oldKeyInfo: { keyId: '', retiredAt: '', graceperiodEnd: '' },
        rotationDuration: Date.now() - startTime,
        nextRotationScheduled: '',
        securityStatus: 'degraded'
      };
      
      await this.logAuditEvent('key_rotation_error', 'system', 'api_keys', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return result;
    }
  }

  /**
   * セキュリティ検証実行
   * 設定のセキュリティ状況を包括的に検証
   */
  async validateSecurity(): Promise<SecurityValidationResult> {
    try {
      console.log('🛡️ セキュリティ検証開始...');
      
      if (!this.currentConfig) {
        throw new Error('設定が読み込まれていません。');
      }
      
      const startTime = Date.now();
      const vulnerabilities: SecurityVulnerability[] = [];
      const compliance: ComplianceCheck[] = [];
      const recommendations: SecurityRecommendation[] = [];
      
      // セキュリティ脆弱性チェック
      await this.checkSecurityVulnerabilities(vulnerabilities);
      
      // コンプライアンスチェック
      await this.checkCompliance(compliance);
      
      // セキュリティ推奨事項生成
      await this.generateSecurityRecommendations(recommendations);
      
      // セキュリティスコア計算
      const securityScore = this.calculateSecurityScore(vulnerabilities, compliance);
      
      // 認証レベル決定
      const certificationLevel = this.determineCertificationLevel(securityScore, vulnerabilities);
      
      const validationDuration = Date.now() - startTime;
      
      const result: SecurityValidationResult = {
        securityScore,
        vulnerabilities,
        compliance,
        recommendations,
        validatedAt: new Date().toISOString(),
        validationDuration,
        certificationLevel
      };
      
      // 監査ログ記録
      await this.logAuditEvent('security_validation', 'system', 'security_config', {
        securityScore,
        vulnerabilityCount: vulnerabilities.length,
        complianceItems: compliance.length,
        certificationLevel,
        duration: validationDuration
      });
      
      console.log(`✅ セキュリティ検証完了: スコア${securityScore}/100, ${vulnerabilities.length}脆弱性 (${validationDuration}ms)`);
      return result;
      
    } catch (error) {
      console.error('❌ セキュリティ検証エラー:', error);
      throw error;
    }
  }

  /**
   * 設定監査実行
   * 設定変更・アクセスログの包括的監査
   */
  async auditConfiguration(): Promise<ConfigAuditResult> {
    try {
      console.log('📋 設定監査開始...');
      
      const startTime = Date.now();
      const auditId = this.generateAuditId();
      const findings: AuditFinding[] = [];
      const recommendations: AuditRecommendation[] = [];
      
      // 監査実行
      await this.performConfigurationAudit(findings, recommendations);
      
      // コンプライアンス状況評価
      const complianceStatus = this.evaluateComplianceStatus(findings);
      
      // 次回監査スケジュール
      const nextAuditScheduled = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30日後
      
      const auditDuration = Date.now() - startTime;
      
      const result: ConfigAuditResult = {
        auditId,
        auditedAt: new Date().toISOString(),
        auditDuration,
        auditor: 'KaitoAPIConfigManager',
        scope: ['configuration', 'security', 'performance', 'compliance'],
        findings,
        complianceStatus,
        recommendations,
        nextAuditScheduled,
        auditTrail: [...this.auditLog]
      };
      
      // 監査ログ記録
      await this.logAuditEvent('configuration_audit', 'system', 'full_config', {
        auditId,
        findingsCount: findings.length,
        complianceStatus,
        duration: auditDuration
      });
      
      console.log(`✅ 設定監査完了: ${findings.length}発見事項, ${complianceStatus} (${auditDuration}ms)`);
      return result;
      
    } catch (error) {
      console.error('❌ 設定監査エラー:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY & HELPER METHODS - Phase 2.2
  // ============================================================================

  /**
   * 現在の設定取得
   */
  getCurrentConfig(): KaitoAPIConfig | null {
    return this.currentConfig ? { ...this.currentConfig } : null;
  }

  /**
   * 設定キャッシュクリア
   */
  clearConfigCache(): void {
    this.configCache.clear();
    console.log('🗑️ 設定キャッシュクリア完了');
  }

  /**
   * パフォーマンスメトリクス取得
   */
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 監査ログ取得
   */
  getAuditLog(): AuditTrailEntry[] {
    return [...this.auditLog];
  }

  // ============================================================================
  // PRIVATE METHODS - Phase 2.2 Implementation
  // ============================================================================

  /**
   * 環境別設定生成 (MVP段階はMock実装)
   */
  private async generateEnvironmentConfig(env: 'dev' | 'staging' | 'prod'): Promise<KaitoAPIConfig> {
    const baseConfig: KaitoAPIConfig = {
      environment: env,
      api: {
        baseUrl: this.getEnvironmentApiUrl(env),
        version: 'v1.0',
        timeout: env === 'prod' ? 5000 : 10000,
        retryPolicy: {
          maxRetries: env === 'prod' ? 3 : 5,
          backoffMs: 1000,
          retryConditions: ['429', '500', '502', '503', '504']
        }
      },
      authentication: {
        primaryKey: await this.generateSecureAPIKey(),
        keyRotationInterval: env === 'prod' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 本番7日、それ以外30日
        encryptionEnabled: env === 'prod'
      },
      performance: {
        qpsLimit: env === 'prod' ? 200 : 100,
        responseTimeTarget: 700,
        cacheEnabled: true,
        cacheTTL: env === 'prod' ? 300 : 600 // 本番5分、それ以外10分
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: env === 'prod' ? 'warn' : 'debug',
        alertingEnabled: env === 'prod',
        healthCheckInterval: env === 'prod' ? 30000 : 60000
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: env === 'prod' ? [] : ['127.0.0.1', '::1'], // 本番は空、開発は localhost のみ
        auditLoggingEnabled: env === 'prod',
        encryptionKey: await this.generateEncryptionKey()
      },
      features: {
        realApiEnabled: env === 'prod',
        mockFallbackEnabled: env !== 'prod',
        batchProcessingEnabled: true,
        advancedCachingEnabled: env === 'prod'
      },
      metadata: {
        version: '2.2.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'KaitoAPIConfigManager',
        checksum: ''
      }
    };
    
    // チェックサム生成
    baseConfig.metadata.checksum = this.generateConfigChecksum(baseConfig);
    
    return baseConfig;
  }

  /**
   * 設定検証実行 (内部実装)
   */
  private async validateConfigInternal(config: KaitoAPIConfig): Promise<ConfigValidationResult> {
    const startTime = Date.now();
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];
    
    let totalChecks = 0;
    let passedChecks = 0;
    
    // API設定検証
    totalChecks += 4;
    if (!config.api.baseUrl || !config.api.baseUrl.startsWith('https://')) {
      errors.push({
        field: 'api.baseUrl',
        message: 'API Base URLは必須でHTTPS形式である必要があります',
        severity: 'critical',
        suggestion: 'https://api.example.com の形式で設定してください'
      });
    } else {
      passedChecks++;
    }
    
    if (config.api.timeout < 1000 || config.api.timeout > 30000) {
      warnings.push({
        field: 'api.timeout',
        message: 'APIタイムアウトが推奨範囲外です (1000-30000ms)',
        impact: 'performance',
        recommendation: '5000-10000msの範囲で設定することを推奨します'
      });
    } else {
      passedChecks++;
    }
    
    if (config.api.retryPolicy.maxRetries < 1 || config.api.retryPolicy.maxRetries > 10) {
      warnings.push({
        field: 'api.retryPolicy.maxRetries',
        message: 'リトライ回数が推奨範囲外です (1-10)',
        impact: 'performance',
        recommendation: '3-5回の設定を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    if (config.api.retryPolicy.backoffMs < 100) {
      warnings.push({
        field: 'api.retryPolicy.backoffMs',
        message: 'バックオフ時間が短すぎます',
        impact: 'performance',
        recommendation: '1000ms以上を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    // 認証設定検証
    totalChecks += 3;
    if (!config.authentication.primaryKey || config.authentication.primaryKey.length < 32) {
      errors.push({
        field: 'authentication.primaryKey',
        message: 'プライマリキーは32文字以上である必要があります',
        severity: 'critical',
        suggestion: 'セキュアなランダムキーを生成してください'
      });
    } else {
      passedChecks++;
    }
    
    if (config.authentication.keyRotationInterval < 24 * 60 * 60 * 1000) { // 24時間未満
      warnings.push({
        field: 'authentication.keyRotationInterval',
        message: 'キー回転間隔が短すぎます',
        impact: 'security',
        recommendation: '最低24時間以上の間隔を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    if (config.environment === 'prod' && !config.authentication.encryptionEnabled) {
      errors.push({
        field: 'authentication.encryptionEnabled',
        message: '本番環境では暗号化が必須です',
        severity: 'high',
        suggestion: 'encryptionEnabledをtrueに設定してください'
      });
    } else {
      passedChecks++;
    }
    
    // パフォーマンス設定検証
    totalChecks += 3;
    if (config.performance.qpsLimit < 1 || config.performance.qpsLimit > 1000) {
      warnings.push({
        field: 'performance.qpsLimit',
        message: 'QPS制限が推奨範囲外です (1-1000)',
        impact: 'performance',
        recommendation: '100-200の範囲を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    if (config.performance.responseTimeTarget > 2000) {
      warnings.push({
        field: 'performance.responseTimeTarget',
        message: '応答時間目標が長すぎます',
        impact: 'performance',
        recommendation: '700ms以下を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    if (config.performance.cacheTTL < 60 || config.performance.cacheTTL > 3600) {
      warnings.push({
        field: 'performance.cacheTTL',
        message: 'キャッシュTTLが推奨範囲外です (60-3600秒)',
        impact: 'performance',
        recommendation: '300-600秒の範囲を推奨します'
      });
    } else {
      passedChecks++;
    }
    
    // セキュリティ設定検証
    totalChecks += 2;
    if (config.environment === 'prod' && !config.security.auditLoggingEnabled) {
      warnings.push({
        field: 'security.auditLoggingEnabled',
        message: '本番環境では監査ログが推奨されます',
        impact: 'security',
        recommendation: 'auditLoggingEnabledをtrueに設定してください'
      });
    } else {
      passedChecks++;
    }
    
    if (!config.security.encryptionKey || config.security.encryptionKey.length < 32) {
      errors.push({
        field: 'security.encryptionKey',
        message: '暗号化キーは32文字以上である必要があります',
        severity: 'high',
        suggestion: 'セキュアなランダムキーを生成してください'
      });
    } else {
      passedChecks++;
    }
    
    const failedChecks = totalChecks - passedChecks;
    const validationDuration = Date.now() - startTime;
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date().toISOString(),
      validationDuration,
      configVersion: config.metadata.version,
      environment: config.environment,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks: warnings.length
      }
    };
  }

  /**
   * 設定最適化実行 (内部実装)
   */
  private async performConfigOptimization(config: KaitoAPIConfig): Promise<ConfigOptimization> {
    const changes: ConfigOptimizationChange[] = [];
    
    // パフォーマンス最適化
    if (config.performance.qpsLimit < 150 && config.environment === 'prod') {
      changes.push({
        field: 'performance.qpsLimit',
        originalValue: config.performance.qpsLimit,
        optimizedValue: 200,
        reason: '本番環境のQPS制限を最適化',
        impact: 'high'
      });
    }
    
    if (config.performance.responseTimeTarget > 700) {
      changes.push({
        field: 'performance.responseTimeTarget',
        originalValue: config.performance.responseTimeTarget,
        optimizedValue: 700,
        reason: '応答時間目標を最適化',
        impact: 'medium'
      });
    }
    
    // キャッシュ最適化
    if (!config.features.advancedCachingEnabled && config.environment === 'prod') {
      changes.push({
        field: 'features.advancedCachingEnabled',
        originalValue: false,
        optimizedValue: true,
        reason: '高度キャッシング機能を有効化',
        impact: 'high'
      });
    }
    
    // セキュリティ最適化
    if (!config.authentication.encryptionEnabled && config.environment === 'prod') {
      changes.push({
        field: 'authentication.encryptionEnabled',
        originalValue: false,
        optimizedValue: true,
        reason: '本番環境での暗号化を有効化',
        impact: 'high'
      });
    }
    
    // ログレベル最適化
    if (config.monitoring.logLevel === 'debug' && config.environment === 'prod') {
      changes.push({
        field: 'monitoring.logLevel',
        originalValue: 'debug',
        optimizedValue: 'warn',
        reason: '本番環境のログレベル最適化',
        impact: 'medium'
      });
    }
    
    const performanceImpact = {
      expectedSpeedImprovement: changes.filter(c => c.impact === 'high').length * 15 + 
                               changes.filter(c => c.impact === 'medium').length * 8,
      expectedMemoryReduction: changes.filter(c => c.field.includes('cache')).length * 10,
      expectedCostReduction: changes.filter(c => c.field.includes('qps') || c.field.includes('timeout')).length * 5
    };
    
    const recommendedActions = [
      changes.length > 0 ? '最適化の変更を適用することを推奨します' : '現在の設定は最適化されています',
      'パフォーマンス監視を継続してください',
      '設定変更後は統合テストを実行してください'
    ];
    
    return {
      optimized: changes.length > 0,
      changes,
      performanceImpact,
      optimizedAt: new Date().toISOString(),
      optimizationDuration: 0, // 計算時間は別途記録
      recommendedActions
    };
  }

  /**
   * セキュリティ脆弱性チェック
   */
  private async checkSecurityVulnerabilities(vulnerabilities: SecurityVulnerability[]): Promise<void> {
    if (!this.currentConfig) return;
    
    // 暗号化チェック
    if (!this.currentConfig.authentication.encryptionEnabled && this.currentConfig.environment === 'prod') {
      vulnerabilities.push({
        id: 'SEC-001',
        severity: 'high',
        category: 'encryption',
        description: '本番環境で暗号化が無効になっています',
        remediation: '認証設定でencryptionEnabledをtrueに設定してください',
        cveReference: undefined
      });
    }
    
    // API Key強度チェック
    if (this.currentConfig.authentication.primaryKey.length < 64) {
      vulnerabilities.push({
        id: 'SEC-002',
        severity: 'medium',
        category: 'authentication',
        description: 'API Keyの強度が不十分です',
        remediation: '64文字以上のセキュアなランダムキーを使用してください',
        cveReference: undefined
      });
    }
    
    // 監査ログチェック
    if (!this.currentConfig.security.auditLoggingEnabled && this.currentConfig.environment === 'prod') {
      vulnerabilities.push({
        id: 'SEC-003',
        severity: 'medium',
        category: 'access_control',
        description: '監査ログが無効になっています',
        remediation: 'セキュリティ設定でauditLoggingEnabledをtrueに設定してください',
        cveReference: undefined
      });
    }
  }

  /**
   * コンプライアンスチェック
   */
  private async checkCompliance(compliance: ComplianceCheck[]): Promise<void> {
    if (!this.currentConfig) return;
    
    // SOC2 Type II コンプライアンス
    compliance.push({
      standard: 'SOC2',
      requirement: 'ログ監視と保存',
      status: this.currentConfig.security.auditLoggingEnabled ? 'compliant' : 'non_compliant',
      evidence: `監査ログ: ${this.currentConfig.security.auditLoggingEnabled ? '有効' : '無効'}`,
      remediationRequired: !this.currentConfig.security.auditLoggingEnabled ? 
        '監査ログ機能を有効化してください' : undefined
    });
    
    // データ暗号化要件
    compliance.push({
      standard: 'ISO27001',
      requirement: 'データ暗号化',
      status: this.currentConfig.authentication.encryptionEnabled ? 'compliant' : 'partially_compliant',
      evidence: `暗号化: ${this.currentConfig.authentication.encryptionEnabled ? '有効' : '無効'}`,
      remediationRequired: !this.currentConfig.authentication.encryptionEnabled ? 
        '暗号化機能を有効化してください' : undefined
    });
    
    // アクセス制御
    compliance.push({
      standard: 'NIST',
      requirement: 'アクセス制御',
      status: this.currentConfig.security.rateLimitEnabled ? 'compliant' : 'non_compliant',
      evidence: `レート制限: ${this.currentConfig.security.rateLimitEnabled ? '有効' : '無効'}`,
      remediationRequired: !this.currentConfig.security.rateLimitEnabled ? 
        'レート制限機能を有効化してください' : undefined
    });
  }

  /**
   * セキュリティ推奨事項生成
   */
  private async generateSecurityRecommendations(recommendations: SecurityRecommendation[]): Promise<void> {
    if (!this.currentConfig) return;
    
    // キー回転推奨
    if (this.currentConfig.authentication.keyRotationInterval > 7 * 24 * 60 * 60 * 1000) {
      recommendations.push({
        priority: 'high',
        category: 'Key Management',
        recommendation: 'API Keyの回転間隔を短縮することを推奨します',
        implementation: 'keyRotationIntervalを7日以下に設定してください',
        estimatedEffort: '1-2 hours'
      });
    }
    
    // 監視強化
    if (!this.currentConfig.monitoring.alertingEnabled) {
      recommendations.push({
        priority: 'medium',
        category: 'Monitoring',
        recommendation: 'アラート機能の有効化を推奨します',
        implementation: 'monitoring.alertingEnabledをtrueに設定してください',
        estimatedEffort: '2-4 hours'
      });
    }
    
    // IP制限
    if (this.currentConfig.security.ipWhitelist.length === 0 && this.currentConfig.environment === 'prod') {
      recommendations.push({
        priority: 'medium',
        category: 'Access Control',
        recommendation: 'IP制限の設定を推奨します',
        implementation: '信頼できるIPアドレスをipWhitelistに追加してください',
        estimatedEffort: '1 hour'
      });
    }
  }

  /**
   * 設定監査実行 (内部実装)
   */
  private async performConfigurationAudit(findings: AuditFinding[], recommendations: AuditRecommendation[]): Promise<void> {
    // 設定変更履歴の監査
    const recentChanges = this.auditLog.filter(entry => 
      Date.now() - new Date(entry.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // 過去7日間
    );
    
    if (recentChanges.length > 50) {
      findings.push({
        id: 'AUDIT-001',
        severity: 'medium',
        category: 'configuration',
        finding: '過去7日間で50回を超える設定変更が検出されました',
        evidence: `変更回数: ${recentChanges.length}`,
        impact: '設定の安定性に影響する可能性があります',
        recommendation: '設定変更の頻度を見直してください'
      });
    }
    
    // セキュリティ設定の監査
    if (this.currentConfig && !this.currentConfig.security.auditLoggingEnabled) {
      findings.push({
        id: 'AUDIT-002',
        severity: 'high',
        category: 'security',
        finding: '監査ログが無効になっています',
        evidence: 'security.auditLoggingEnabled = false',
        impact: 'セキュリティインシデントの追跡が困難になります',
        recommendation: '監査ログ機能を有効化してください'
      });
    }
    
    // パフォーマンス設定の監査
    if (this.currentConfig && this.currentConfig.performance.responseTimeTarget > 1000) {
      findings.push({
        id: 'AUDIT-003',
        severity: 'low',
        category: 'performance',
        finding: '応答時間目標が長すぎます',
        evidence: `responseTimeTarget: ${this.currentConfig.performance.responseTimeTarget}ms`,
        impact: 'ユーザーエクスペリエンスに影響する可能性があります',
        recommendation: '700ms以下に設定することを推奨します'
      });
    }
    
    // 推奨事項生成
    recommendations.push({
      priority: 1,
      category: 'Security',
      recommendation: '定期的なセキュリティ監査の実施',
      implementation: '月次でセキュリティ監査を実行してください',
      timeline: '1 month',
      cost: 'low'
    });
    
    recommendations.push({
      priority: 2,
      category: 'Performance',
      recommendation: 'パフォーマンス指標の継続監視',
      implementation: '応答時間とQPSの監視を強化してください',
      timeline: '2 weeks',
      cost: 'medium'
    });
  }

  /**
   * 最適化変更適用
   */
  private async applyOptimizationChanges(changes: ConfigOptimizationChange[]): Promise<void> {
    if (!this.currentConfig) return;
    
    for (const change of changes) {
      const fieldPath = change.field.split('.');
      let target: any = this.currentConfig;
      
      // オブジェクトの深い階層への設定適用
      for (let i = 0; i < fieldPath.length - 1; i++) {
        target = target[fieldPath[i]];
      }
      
      const finalField = fieldPath[fieldPath.length - 1];
      target[finalField] = change.optimizedValue;
      
      console.log(`🔧 設定最適化適用: ${change.field} = ${change.optimizedValue} (${change.reason})`);
    }
    
    // メタデータ更新
    this.currentConfig.metadata.lastUpdated = new Date().toISOString();
    this.currentConfig.metadata.checksum = this.generateConfigChecksum(this.currentConfig);
  }

  /**
   * 監査イベントログ記録
   */
  private async logAuditEvent(action: string, user: string, resource: string, changes: any): Promise<void> {
    if (!this.auditingEnabled) return;
    
    const auditEntry: AuditTrailEntry = {
      timestamp: new Date().toISOString(),
      action,
      user,
      resource,
      changes,
      outcome: 'success'
    };
    
    this.auditLog.push(auditEntry);
    
    // ログサイズ制限 (最新1000件を保持)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * セキュアなAPI Key生成
   */
  private async generateSecureAPIKey(): Promise<string> {
    const randomBytes = await this.generateRandomBytes(64);
    return createHash('sha256').update(randomBytes).digest('hex');
  }

  /**
   * 暗号化キー生成
   */
  private async generateEncryptionKey(): Promise<string> {
    const randomBytes = await this.generateRandomBytes(64);
    return createHash('sha512').update(randomBytes).digest('hex');
  }

  /**
   * ランダムバイト生成
   */
  private async generateRandomBytes(length: number): Promise<string> {
    return randomBytes(length).toString('hex');
  }

  /**
   * Key ID生成
   */
  private generateKeyId(key: string): string {
    return createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  /**
   * 監査ID生成
   */
  private generateAuditId(): string {
    return `AUDIT-${Date.now()}-${randomBytes(8).toString('hex')}`;
  }

  /**
   * 設定チェックサム生成
   */
  private generateConfigChecksum(config: KaitoAPIConfig): string {
    const configString = JSON.stringify(config, null, 2);
    return createHash('sha256').update(configString).digest('hex');
  }

  /**
   * 環境別API URL取得
   */
  private getEnvironmentApiUrl(env: 'dev' | 'staging' | 'prod'): string {
    const urls = {
      dev: 'https://dev-api.twitterapi.io',
      staging: 'https://staging-api.twitterapi.io',
      prod: 'https://api.twitterapi.io'
    };
    return urls[env];
  }

  /**
   * セキュリティスコア計算
   */
  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[], compliance: ComplianceCheck[]): number {
    let score = 100;
    
    // 脆弱性によるスコア減点
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }
    
    // コンプライアンス状況によるスコア調整
    for (const comp of compliance) {
      if (comp.status === 'non_compliant') {
        score -= 10;
      } else if (comp.status === 'partially_compliant') {
        score -= 5;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 認証レベル決定
   */
  private determineCertificationLevel(score: number, vulnerabilities: SecurityVulnerability[]): 'basic' | 'standard' | 'enterprise' {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    
    if (score >= 90 && criticalVulns === 0) {
      return 'enterprise';
    } else if (score >= 70 && criticalVulns === 0) {
      return 'standard';
    } else {
      return 'basic';
    }
  }

  /**
   * コンプライアンス状況評価
   */
  private evaluateComplianceStatus(findings: AuditFinding[]): 'compliant' | 'non_compliant' | 'requires_attention' {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;
    
    if (criticalFindings > 0) {
      return 'non_compliant';
    } else if (highFindings > 2) {
      return 'requires_attention';
    } else {
      return 'compliant';
    }
  }
}

// ============================================================================
// EXPORT INTERFACES AND CLASSES - Phase 2.2
// ============================================================================

export {
  KaitoAPIConfig,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigOptimization,
  ConfigOptimizationChange,
  KeyRotationResult,
  SecurityValidationResult,
  SecurityVulnerability,
  ComplianceCheck,
  SecurityRecommendation,
  ConfigAuditResult,
  AuditFinding,
  AuditRecommendation,
  AuditTrailEntry,
  EnvironmentTemplate
};

/**
 * Phase 2.2 Config Manager 使用例:
 * 
 * ```typescript
 * const configManager = new KaitoAPIConfigManager();
 * 
 * // 環境別設定読み込み
 * const prodConfig = await configManager.loadConfig('prod');
 * 
 * // 設定検証
 * const validation = await configManager.validateConfig();
 * 
 * // 設定最適化
 * const optimization = await configManager.optimizeConfig();
 * 
 * // API Key回転
 * const rotation = await configManager.rotateAPIKeys();
 * 
 * // セキュリティ監査
 * const security = await configManager.validateSecurity();
 * 
 * // 設定監査
 * const audit = await configManager.auditConfiguration();
 * ```
 */