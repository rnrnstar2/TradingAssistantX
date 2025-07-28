#!/usr/bin/env node
/**
 * Kaito API テスト実行スクリプト
 * 
 * 📋 指示書: TASK-005-integration-tests.md
 * 
 * 🎯 目的:
 * Kaito APIの全テストスイートを順次実行し、結果をレポート
 * dev.tsとmain.tsの実行フローに沿った統合テストを含む包括的テスト
 * 
 * 📊 実行内容:
 * 1. Core Client Tests - クライアントの基本機能
 * 2. Tweet Endpoints Tests - ツイート関連エンドポイント
 * 3. Action Endpoints Tests - アクション関連エンドポイント  
 * 4. Integration Tests - 統合フローテスト
 * 5. Error Recovery Tests - エラーリカバリーテスト
 * 
 * 💻 使用方法:
 * ```bash
 * # 全テスト実行
 * pnpm test:kaito
 * # または直接実行
 * tsx tests/kaito-api/run-tests.ts
 * ```
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  critical: boolean; // 失敗時に全体を中止するか
}

interface TestResult {
  suite: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

class KaitoTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  /**
   * 全テスト実行
   */
  async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    
    console.log('🧪 Kaito API テスト実行開始...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テストスイート一覧:');
    
    const testSuites: TestSuite[] = [
      {
        name: 'Core Client Tests',
        path: 'tests/kaito-api/core/client.test.ts',
        description: 'KaitoTwitterAPIClientの基本機能テスト',
        critical: true
      },
      {
        name: 'Tweet Endpoints Tests',
        path: 'tests/kaito-api/endpoints/tweet-endpoints.test.ts',
        description: 'ツイート検索・取得エンドポイントテスト',
        critical: true
      },
      {
        name: 'Action Endpoints Tests',
        path: 'tests/kaito-api/endpoints/action-endpoints.test.ts',
        description: '投稿・RT・いいねアクションエンドポイントテスト',
        critical: true
      },
      {
        name: 'Integration Flow Tests',
        path: 'tests/kaito-api/integration/flow-integration.test.ts',
        description: 'dev.ts/main.ts実行フロー統合テスト',
        critical: true
      },
      {
        name: 'Error Recovery Tests',
        path: 'tests/kaito-api/integration/error-recovery.test.ts',
        description: 'エラーハンドリング・リカバリーテスト',
        critical: false
      },
      {
        name: 'Full Stack Integration Tests',
        path: 'tests/kaito-api/integration/full-stack-integration.test.ts',
        description: '完全スタック統合テスト',
        critical: false
      }
    ];

    // テストスイート一覧表示
    testSuites.forEach((suite, index) => {
      const status = this.checkTestFileExists(suite.path) ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${suite.name}`);
      console.log(`   📄 ${suite.description}`);
      console.log(`   📁 ${suite.path}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 各テストスイートを順次実行
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
      
      // クリティカルなテストが失敗した場合は中止
      const lastResult = this.results[this.results.length - 1];
      if (suite.critical && !lastResult.success) {
        console.error(`❌ クリティカルテスト失敗のため実行を中止: ${suite.name}`);
        break;
      }
    }

    // 最終結果表示
    this.displaySummary();
  }

  /**
   * 個別テストスイート実行
   */
  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n▶️  実行中: ${suite.name}`);
    console.log(`📁 ${suite.path}`);
    
    if (!this.checkTestFileExists(suite.path)) {
      const result: TestResult = {
        suite: suite.name,
        success: false,
        duration: 0,
        error: 'テストファイルが存在しません'
      };
      this.results.push(result);
      console.error(`❌ ${suite.name} - テストファイルが存在しません`);
      return;
    }

    const startTime = Date.now();
    
    try {
      // Jest実行コマンド
      const jestCommand = `npx jest ${suite.path} --verbose --no-cache --forceExit`;
      
      console.log(`🔄 実行コマンド: ${jestCommand}`);
      
      const output = execSync(jestCommand, { 
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 120000 // 2分タイムアウト
      });
      
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        suite: suite.name,
        success: true,
        duration,
        output: output.toString()
      };
      
      this.results.push(result);
      console.log(`✅ ${suite.name} 完了 (${duration}ms)`);
      
      // 詳細出力（必要に応じて）
      if (process.env.VERBOSE === 'true') {
        console.log(`📊 出力詳細:\n${output}`);
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        suite: suite.name,
        success: false,
        duration,
        error: error.message,
        output: error.stdout?.toString()
      };
      
      this.results.push(result);
      console.error(`❌ ${suite.name} 失敗 (${duration}ms)`);
      console.error(`📝 エラー詳細: ${error.message}`);
      
      if (error.stdout) {
        console.error(`📊 出力: ${error.stdout}`);
      }
      if (error.stderr) {
        console.error(`📊 エラー出力: ${error.stderr}`);
      }
    }
  }

  /**
   * テストファイル存在確認
   */
  private checkTestFileExists(testPath: string): boolean {
    const fullPath = join(process.cwd(), testPath);
    return existsSync(fullPath);
  }

  /**
   * 最終結果サマリー表示
   */
  private displaySummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Kaito API テスト実行サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`⏱️  総実行時間: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`📋 実行スイート数: ${this.results.length}`);
    console.log(`✅ 成功: ${successCount}`);
    console.log(`❌ 失敗: ${failureCount}`);
    console.log(`📈 成功率: ${((successCount / this.results.length) * 100).toFixed(1)}%\n`);
    
    // 個別結果表示
    console.log('📋 詳細結果:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`.padEnd(8);
      const suiteName = result.suite.padEnd(35);
      
      console.log(`│ ${index + 1}. ${status} ${suiteName} ${duration} │`);
      
      if (!result.success && result.error) {
        const errorMsg = result.error.substring(0, 50) + (result.error.length > 50 ? '...' : '');
        console.log(`│    📝 ${errorMsg.padEnd(54)} │`);
      }
    });
    
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    // 失敗詳細
    const failures = this.results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('❌ 失敗詳細:');
      failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.suite}:`);
        console.log(`   エラー: ${failure.error}`);
        if (failure.output) {
          console.log(`   出力: ${failure.output.substring(0, 200)}...`);
        }
      });
    }
    
    // 推奨事項
    console.log('\n💡 推奨事項:');
    if (failureCount === 0) {
      console.log('✨ 全テスト成功！システムは正常に動作しています。');
      console.log('📈 継続的な品質向上のため、定期的なテスト実行を推奨します。');
    } else {
      console.log('🔧 失敗したテストの修正が必要です。');
      console.log('📝 エラーログを確認し、該当コンポーネントの修正を行ってください。');
      console.log('🧪 修正後、再度テストを実行して動作を確認してください。');
    }
    
    // カバレッジ情報への案内
    console.log('\n📊 詳細なカバレッジレポートを生成するには:');
    console.log('   npm run test:kaito:coverage');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 終了ステータス設定
    if (failureCount > 0) {
      console.log('❌ テスト失敗のため、プロセスをエラー終了します。');
      process.exit(1);
    } else {
      console.log('✅ 全テスト成功！');
      process.exit(0);
    }
  }

  /**
   * 単体テスト実行（特定スイートのみ）
   */
  async runSingleSuite(suiteName: string): Promise<void> {
    console.log(`🎯 単体テスト実行: ${suiteName}\n`);
    
    const testSuites: TestSuite[] = [
      {
        name: 'Core Client Tests',
        path: 'tests/kaito-api/core/client.test.ts',
        description: 'KaitoTwitterAPIClientの基本機能テスト',
        critical: true
      },
      {
        name: 'Integration Flow Tests',
        path: 'tests/kaito-api/integration/flow-integration.test.ts',
        description: 'dev.ts/main.ts実行フロー統合テスト',
        critical: true
      },
      {
        name: 'Error Recovery Tests',
        path: 'tests/kaito-api/integration/error-recovery.test.ts',
        description: 'エラーハンドリング・リカバリーテスト',
        critical: false
      }
    ];
    
    const targetSuite = testSuites.find(suite => 
      suite.name.toLowerCase().includes(suiteName.toLowerCase())
    );
    
    if (!targetSuite) {
      console.error(`❌ テストスイートが見つかりません: ${suiteName}`);
      console.log('📋 利用可能なテストスイート:');
      testSuites.forEach(suite => {
        console.log(`   - ${suite.name}`);
      });
      process.exit(1);
    }
    
    this.startTime = Date.now();
    await this.runTestSuite(targetSuite);
    this.displaySummary();
  }
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runner = new KaitoTestRunner();
  
  if (args.length > 0) {
    // 特定のテストスイートのみ実行
    await runner.runSingleSuite(args[0]);
  } else {
    // 全テスト実行
    await runner.runAllTests();
  }
}

// 直接実行チェック
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('🚨 テスト実行エラー:', error);
    process.exit(1);
  });
}

export { KaitoTestRunner };