#!/usr/bin/env node

import { CoreRunner } from './core-runner.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

/**
 * dev.ts - 単一実行スクリプト（MVP基盤）
 * 
 * 目的: core-runner.tsを1回だけ実行（開発・デバッグ用）
 * フロー: 環境確認 → 基本フロー実行 → 結果記録
 */

async function dev(): Promise<void> {
  console.log('🛠️  [TradingAssistantX] 開発実行システム開始');
  console.log('⚡ [実行モード] 単一実行（開発・デバッグ用）');
  console.log('📋 [基本フロー] RSS収集 → 投稿作成 → X投稿 → 結果記録');
  
  const startupTimestamp = new Date().toISOString();
  
  try {
    console.log('🔍 [開発環境] 開発用設定を確認中...');
    await validateDevelopmentEnvironment();
    
    console.log('🧰 [設定] CoreRunner初期化中...');
    const coreRunner = new CoreRunner({
      enableLogging: true,
      outputDir: path.join(process.cwd(), 'tasks', 'outputs')
    });
    
    // 実行前検証
    console.log('✅ [検証] 実行環境検証中...');
    const validation = await coreRunner.validateExecution();
    if (!validation.isValid) {
      console.error('❌ [検証失敗] 実行環境に問題があります:');
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      process.exit(1);
    }
    
    console.log('📝 [開発ログ] 実行開始情報を記録中...');
    await logDevelopmentRun(startupTimestamp);
    
    console.log('🚀 [単一実行] MVP基本フロー実行を開始します...');
    console.log('');
    console.log('📊 開発実行情報:');
    console.log('  • 実行回数: 1回のみ');
    console.log('  • 実行プロセス: RSS収集 → 投稿作成 → X投稿 → 記録保存');
    console.log('  • 開発機能: 有効');
    console.log('  • デバッグログ: 詳細表示');
    console.log('  • エラーログ: tasks/outputs/');
    console.log('');
    
    const executionStartTime = Date.now();
    console.log('⏱️  [実行開始] MVP基本フロー開始...');
    
    // 基本フロー実行
    const result = await coreRunner.runBasicFlow();
    
    const executionTime = Date.now() - executionStartTime;
    console.log('');
    
    if (result.success) {
      console.log('✅ [実行完了] 開発用単一実行が完了しました');
      console.log(`⏱️  [実行時間] ${executionTime}ms`);
      console.log(`📊 [実行統計] RSS記事: ${result.rssDataCount}件, 投稿: ${result.postResult?.success ? '成功' : '失敗'}`);
      if (result.postResult?.postId) {
        console.log(`🆔 [投稿ID] ${result.postResult.postId}`);
      }
    } else {
      console.log('❌ [実行失敗] 開発用単一実行が失敗しました');
      console.log(`⏱️  [実行時間] ${executionTime}ms`);
      console.log(`❌ [エラー] ${result.error}`);
    }
    
    console.log('');
    console.log('📋 [次のステップ]');
    console.log('  • 実行結果を tasks/outputs/ で確認');
    console.log('  • 今日の記録を data/current/today-posts.yaml で確認');
    console.log('  • ログファイルを確認してデバッグ');
    console.log('  • 本番実行には pnpm start を使用');
    
    await logDevelopmentSuccess(startupTimestamp, executionTime, result);
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ [開発実行エラー] 開発実行システムエラー:', error);
    
    await logDevelopmentError(error, startupTimestamp);
    
    console.log('');
    console.log('🔧 [デバッグ支援]');
    console.log('  1. エラーログを tasks/outputs/ で確認');
    console.log('  2. システム設定ファイルを確認');
    console.log('  3. data/config/ の設定を確認');
    console.log('  4. 環境変数の設定を確認');
    console.log('  5. ネットワーク接続を確認');
    console.log('');
    console.log('💡 [トラブルシューティング]');
    console.log('  • X API認証情報が正しく設定されているか確認');
    console.log('  • RSS設定ファイル data/config/rss-sources.yaml が存在するか確認');
    console.log('  • TypeScript コンパイルエラーがないか確認');
    console.log('  • 必要なディレクトリが存在するか確認');
    
    process.exit(1);
  }
}

/**
 * 開発実行環境検証
 */
async function validateDevelopmentEnvironment(): Promise<void> {
  console.log('🧪 [環境検証] 開発実行環境を検証中...');
  
  const developmentDirs = [
    'data',
    'data/config',
    'data/current',
    'tasks',
    'tasks/outputs'
  ];
  
  for (const dir of developmentDirs) {
    const dirPath = path.join(process.cwd(), dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`  ✓ ${dir} ディレクトリ確認・作成完了`);
    } catch (error) {
      console.error(`  ❌ ${dir} ディレクトリエラー:`, error);
      throw new Error(`Development directory ${dir} could not be created`);
    }
  }
  
  console.log('✅ [環境検証] 開発実行環境検証完了');
}

/**
 * 開発実行開始ログ
 */
async function logDevelopmentRun(timestamp: string): Promise<void> {
  try {
    const developmentInfo = {
      timestamp,
      mode: 'development_single_execution',
      command: 'pnpm dev',
      purpose: 'MVP基盤テスト・デバッグ',
      system: {
        node_version: process.version,
        platform: process.platform,
        architecture: process.arch,
        working_directory: process.cwd(),
        environment: 'development'
      },
      configuration: {
        execution_mode: 'single_run',
        basic_flow: 'RSS収集 → 投稿作成 → X投稿 → 記録保存',
        logging_enabled: true,
        output_directory: 'tasks/outputs/',
        target_files: ['data/current/today-posts.yaml']
      },
      expectations: {
        execution_count: 1,
        timeout: '15 minutes',
        output_files: ['execution results', 'success/error logs', 'today posts record']
      }
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `dev-startup-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(developmentInfo, { indent: 2 }));
    console.log(`  ✓ 開発実行情報を記録: ${filename}`);
    
  } catch (error) {
    console.warn('⚠️ [開発ログ] 開発実行ログの記録に失敗:', error);
  }
}

/**
 * 開発実行成功ログ
 */
async function logDevelopmentSuccess(startupTimestamp: string, executionTime: number, result: any): Promise<void> {
  try {
    const successInfo = {
      startup_timestamp: startupTimestamp,
      completion_timestamp: new Date().toISOString(),
      mode: 'development_single_execution',
      command: 'pnpm dev',
      result: result.success ? 'success' : 'partial_success',
      execution_details: {
        total_time_ms: executionTime,
        total_time_readable: `${(executionTime / 1000).toFixed(2)}秒`,
        rss_data_count: result.rssDataCount,
        post_successful: result.postResult?.success || false,
        post_id: result.postResult?.postId || null
      },
      outputs: {
        execution_results: 'tasks/outputs/',
        today_posts: 'data/current/today-posts.yaml',
        logs: 'tasks/outputs/'
      },
      next_steps: [
        'Review execution results in tasks/outputs/',
        'Check today posts record in data/current/today-posts.yaml',
        'Use pnpm start for production runs'
      ]
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `dev-success-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(successInfo, { indent: 2 }));
    console.log(`📊 [成功ログ] 開発実行結果情報を記録: ${filename}`);
    
  } catch (error) {
    console.warn('⚠️ [成功ログ] 成功ログの記録に失敗:', error);
  }
}

/**
 * 開発実行エラーログ
 */
async function logDevelopmentError(error: unknown, startupTimestamp: string): Promise<void> {
  try {
    const errorInfo = {
      startup_timestamp: startupTimestamp,
      error_timestamp: new Date().toISOString(),
      mode: 'development_single_execution',
      command: 'pnpm dev',
      result: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      system: {
        node_version: process.version,
        platform: process.platform,
        working_directory: process.cwd(),
        environment: 'development'
      },
      debugging: {
        error_location: 'development execution',
        possible_causes: [
          'X API認証情報の設定問題',
          'RSS設定ファイルの問題',
          'ネットワーク接続の問題',
          'TypeScriptコンパイルエラー',
          '依存関係の問題',
          'ディレクトリ権限の問題'
        ],
        troubleshooting_steps: [
          'Check X API credentials in environment variables',
          'Verify RSS configuration in data/config/rss-sources.yaml',
          'Test network connectivity',
          'Check TypeScript compilation',
          'Validate file permissions and directory structure',
          'Review system logs in tasks/outputs/'
        ]
      }
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `dev-error-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
    console.log(`📝 [エラーログ] 開発実行エラー情報を記録: ${filename}`);
    
  } catch (logError) {
    console.error('❌ [ログエラー] エラーログの記録に失敗:', logError);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [未処理拒否] Development Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [未処理例外] Development Uncaught Exception:', error);
  process.exit(1);
});

// 開発実行判定
if (process.argv[1] && (process.argv[1].endsWith('dev.ts') || process.argv[1].endsWith('dev.js'))) {
  dev().catch((error) => {
    console.error('❌ [開発関数エラー]:', error);
    process.exit(1);
  });
}