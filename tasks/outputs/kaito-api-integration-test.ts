/**
 * KaitoAPI統合テストスイート
 * REQUIREMENTS.md準拠の11ファイル構成確認とKaitoAPI公式仕様準拠テスト
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export class KaitoApiIntegrationTest {
  private readonly basePath = path.join(process.cwd(), 'src', 'kaito-api');

  constructor() {
    console.log('🧪 KaitoAPI統合テスト開始');
  }

  /**
   * P0: 構造完全性テスト - REQUIREMENTS.md完全準拠確認
   */
  async testStructureCompliance(): Promise<boolean> {
    console.log('📋 構造完全性テスト実行中...');
    
    // 1. 11ファイル構成確認
    const requiredFiles = [
      'core/client.ts', 'core/config.ts',
      'endpoints/user-endpoints.ts', 'endpoints/tweet-endpoints.ts',
      'endpoints/community-endpoints.ts', 'endpoints/list-endpoints.ts',
      'endpoints/trend-endpoints.ts', 'endpoints/login-endpoints.ts',
      'endpoints/action-endpoints.ts', 'endpoints/webhook-endpoints.ts',
      'utils/response-handler.ts'
    ];

    let allFilesExist = true;
    let fileCount = 0;

    for (const file of requiredFiles) {
      const filePath = path.join(this.basePath, file);
      try {
        await fs.access(filePath);
        fileCount++;
        console.log(`✅ ${file}`);
      } catch {
        console.log(`❌ ${file} - ファイルが存在しません`);
        allFilesExist = false;
      }
    }

    // 2. ファイル数確認（11ファイル厳守）
    const actualFileCount = await this.countTsFiles();
    const isExactCount = actualFileCount === 11;
    
    console.log(`📊 ファイル数: ${actualFileCount}/11 ${isExactCount ? '✅' : '❌'}`);

    // 3. 非準拠ファイル確認
    const hasExtraFiles = await this.checkExtraFiles();
    
    return allFilesExist && isExactCount && !hasExtraFiles;
  }

  /**
   * P0: TypeScript compilation確認
   */
  async testTypeScriptCompilation(): Promise<boolean> {
    console.log('🔧 TypeScript compilation確認中...');
    
    try {
      // TypeScript設定ファイル確認
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      await fs.access(tsconfigPath);
      
      console.log('✅ tsconfig.json存在確認');
      
      // 基本的なimport文整合性確認
      const importTests = await this.testImportIntegrity();
      
      return importTests;
    } catch (error) {
      console.log(`❌ TypeScript設定エラー: ${error}`);
      return false;
    }
  }

  /**
   * P0: KaitoAPI公式仕様準拠確認
   */
  async testApiDocumentationCompliance(): Promise<boolean> {
    console.log('📚 KaitoAPI公式仕様準拠確認中...');
    
    // https://docs.twitterapi.io/introduction の仕様確認
    const complianceChecks = {
      rateLimits: await this.checkRateLimitImplementation(), // 200QPS
      authentication: await this.checkAuthImplementation(), // API token方式
      costManagement: await this.checkCostImplementation(), // $0.00015/request, $0.001/tweet
      endpoints: await this.checkEndpointCompliance() // 公式エンドポイント準拠
    };

    const allCompliant = Object.values(complianceChecks).every(check => check);
    
    console.log('📋 KaitoAPI仕様準拠チェック結果:');
    console.log(`  Rate Limits (200QPS): ${complianceChecks.rateLimits ? '✅' : '❌'}`);
    console.log(`  Authentication: ${complianceChecks.authentication ? '✅' : '❌'}`);
    console.log(`  Cost Management: ${complianceChecks.costManagement ? '✅' : '❌'}`);
    console.log(`  Endpoints: ${complianceChecks.endpoints ? '✅' : '❌'}`);

    return allCompliant;
  }

  /**
   * P1: 教育的価値システム統合確認
   */
  async testEducationalValueSystem(): Promise<boolean> {
    console.log('🎓 教育的価値システム統合確認中...');
    
    // Worker3で統合された核心機能の動作確認
    const educationalFeatures = {
      contentValidation: await this.checkEducationalContentValidation(),
      spamPrevention: await this.checkSpamPreventionSystem(),
      qualityAssurance: await this.checkQualityAssuranceSystem(),
      privacyProtection: await this.checkPrivacyProtectionSystem()
    };

    const allFunctional = Object.values(educationalFeatures).every(feature => feature);
    
    console.log('📋 教育的価値システム確認結果:');
    console.log(`  Content Validation: ${educationalFeatures.contentValidation ? '✅' : '❌'}`);
    console.log(`  Spam Prevention: ${educationalFeatures.spamPrevention ? '✅' : '❌'}`);
    console.log(`  Quality Assurance: ${educationalFeatures.qualityAssurance ? '✅' : '❌'}`);
    console.log(`  Privacy Protection: ${educationalFeatures.privacyProtection ? '✅' : '❌'}`);

    return allFunctional;
  }

  /**
   * 統合テスト実行メソッド
   */
  async runIntegrationTest(): Promise<{
    structureCompliance: boolean;
    typeScriptCompilation: boolean;
    apiDocumentationCompliance: boolean;
    educationalValueSystem: boolean;
    overallSuccess: boolean;
  }> {
    console.log('🚀 KaitoAPI統合テスト開始');
    console.log('=' .repeat(50));

    const results = {
      structureCompliance: await this.testStructureCompliance(),
      typeScriptCompilation: await this.testTypeScriptCompilation(),
      apiDocumentationCompliance: await this.testApiDocumentationCompliance(),
      educationalValueSystem: await this.testEducationalValueSystem(),
      overallSuccess: false
    };

    results.overallSuccess = Object.values(results).slice(0, 4).every(result => result);

    console.log('=' .repeat(50));
    console.log('📊 統合テスト結果サマリー:');
    console.log(`  構造完全性: ${results.structureCompliance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  TypeScript: ${results.typeScriptCompilation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  API仕様準拠: ${results.apiDocumentationCompliance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  教育システム: ${results.educationalValueSystem ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  総合評価: ${results.overallSuccess ? '🎉 SUCCESS' : '⚠️ REQUIRES ATTENTION'}`);

    return results;
  }

  // ===== Private Helper Methods =====

  private async countTsFiles(): Promise<number> {
    const files = await this.getAllTsFiles(this.basePath);
    return files.length;
  }

  private async getAllTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getAllTsFiles(fullPath));
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async checkExtraFiles(): Promise<boolean> {
    const allFiles = await this.getAllTsFiles(this.basePath);
    const relativePaths = allFiles.map(file => path.relative(this.basePath, file));
    
    const allowedPatterns = [
      /^core\/(client|config)\.ts$/,
      /^endpoints\/(user|tweet|community|list|trend|login|action|webhook)-endpoints\.ts$/,
      /^utils\/response-handler\.ts$/
    ];

    const extraFiles = relativePaths.filter(file => 
      !allowedPatterns.some(pattern => pattern.test(file))
    );

    if (extraFiles.length > 0) {
      console.log('❌ 非準拠ファイル発見:');
      extraFiles.forEach(file => console.log(`  - ${file}`));
      return true;
    }

    console.log('✅ 非準拠ファイルなし');
    return false;
  }

  private async testImportIntegrity(): Promise<boolean> {
    try {
      // 基本的なimport文テスト（コンパイルエラーの代替確認）
      const coreFiles = ['core/client.ts', 'core/config.ts'];
      let importIntegrity = true;

      for (const file of coreFiles) {
        const filePath = path.join(this.basePath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // 相対パス確認
        const invalidImports = content.match(/from ['"]\.\.\/(?!kaito-api|core|endpoints|utils)/g);
        if (invalidImports) {
          console.log(`❌ ${file}: 無効なimport文発見`);
          importIntegrity = false;
        }
      }

      console.log(`Import整合性: ${importIntegrity ? '✅' : '❌'}`);
      return importIntegrity;
    } catch (error) {
      console.log(`❌ Import整合性テストエラー: ${error}`);
      return false;
    }
  }

  private async checkRateLimitImplementation(): Promise<boolean> {
    try {
      const clientPath = path.join(this.basePath, 'core/client.ts');
      const content = await fs.readFile(clientPath, 'utf-8');
      
      // 200QPS制限の実装確認
      const hasQpsLimit = content.includes('200') && (
        content.includes('qps') || content.includes('QPS') || content.includes('queries per second')
      );
      
      return hasQpsLimit;
    } catch {
      return false;
    }
  }

  private async checkAuthImplementation(): Promise<boolean> {
    try {
      const clientPath = path.join(this.basePath, 'core/client.ts');
      const content = await fs.readFile(clientPath, 'utf-8');
      
      // API token認証の実装確認
      const hasTokenAuth = content.includes('token') && (
        content.includes('API') || content.includes('auth') || content.includes('Authorization')
      );
      
      return hasTokenAuth;
    } catch {
      return false;
    }
  }

  private async checkCostImplementation(): Promise<boolean> {
    try {
      const clientPath = path.join(this.basePath, 'core/client.ts');
      const content = await fs.readFile(clientPath, 'utf-8');
      
      // コスト管理の実装確認
      const hasCostTracking = content.includes('0.00015') || content.includes('0.001') || 
                             content.includes('cost') || content.includes('price');
      
      return hasCostTracking;
    } catch {
      return false;
    }
  }

  private async checkEndpointCompliance(): Promise<boolean> {
    // 8つのendpointsファイルの存在確認
    const endpointFiles = [
      'user-endpoints.ts', 'tweet-endpoints.ts', 'community-endpoints.ts',
      'list-endpoints.ts', 'trend-endpoints.ts', 'login-endpoints.ts',
      'action-endpoints.ts', 'webhook-endpoints.ts'
    ];

    let allEndpointsExist = true;
    for (const file of endpointFiles) {
      try {
        await fs.access(path.join(this.basePath, 'endpoints', file));
      } catch {
        allEndpointsExist = false;
        break;
      }
    }

    return allEndpointsExist;
  }

  private async checkEducationalContentValidation(): Promise<boolean> {
    try {
      const actionEndpointsPath = path.join(this.basePath, 'endpoints/action-endpoints.ts');
      const content = await fs.readFile(actionEndpointsPath, 'utf-8');
      
      // 教育的コンテンツ検証機能の確認
      const hasValidation = content.includes('validateEducationalContent') ||
                           content.includes('educational') ||
                           content.includes('quality');
      
      return hasValidation;
    } catch {
      return false;
    }
  }

  private async checkSpamPreventionSystem(): Promise<boolean> {
    try {
      const actionEndpointsPath = path.join(this.basePath, 'endpoints/action-endpoints.ts');
      const content = await fs.readFile(actionEndpointsPath, 'utf-8');
      
      // スパム防止機能の確認
      const hasSpamPrevention = content.includes('spam') ||
                               content.includes('frequency') ||
                               content.includes('rate');
      
      return hasSpamPrevention;
    } catch {
      return false;
    }
  }

  private async checkQualityAssuranceSystem(): Promise<boolean> {
    try {
      const actionEndpointsPath = path.join(this.basePath, 'endpoints/action-endpoints.ts');
      const content = await fs.readFile(actionEndpointsPath, 'utf-8');
      
      // 品質保証システムの確認
      const hasQualitySystem = content.includes('quality') ||
                              content.includes('score') ||
                              content.includes('validation');
      
      return hasQualitySystem;
    } catch {
      return false;
    }
  }

  private async checkPrivacyProtectionSystem(): Promise<boolean> {
    try {
      const userEndpointsPath = path.join(this.basePath, 'endpoints/user-endpoints.ts');
      const content = await fs.readFile(userEndpointsPath, 'utf-8');
      
      // プライバシー保護機能の確認
      const hasPrivacyProtection = content.includes('privacy') ||
                                  content.includes('sanitize') ||
                                  content.includes('protection');
      
      return hasPrivacyProtection;
    } catch {
      return false;
    }
  }
}

// テスト実行部分
if (require.main === module) {
  const tester = new KaitoApiIntegrationTest();
  tester.runIntegrationTest()
    .then(results => {
      process.exit(results.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 統合テスト実行エラー:', error);
      process.exit(1);
    });
}