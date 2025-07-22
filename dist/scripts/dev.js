#!/usr/bin/env node
import { CoreRunner } from './core-runner.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
async function dev() {
    console.log('🛠️  [TradingAssistantX] 開発実行システム開始');
    console.log('⚡ [実行モード] 単一実行（開発・デバッグ用）');
    console.log('🧪 [システム概要] 1回だけの実行でテスト・デバッグを実行');
    const startupTimestamp = new Date().toISOString();
    try {
        console.log('🔍 [開発環境] 開発用設定を確認中...');
        await validateDevelopmentEnvironment();
        console.log('🧰 [設定] 開発実行環境をセットアップ中...');
        const coreRunner = new CoreRunner({
            mode: 'single',
            enableLogging: true,
            enableMetrics: true
        });
        console.log('📝 [開発ログ] 実行開始情報を記録中...');
        await logDevelopmentRun(startupTimestamp);
        console.log('🚀 [単一実行] 開発用単一実行を開始します...');
        console.log('');
        console.log('📊 開発実行情報:');
        console.log('  • 実行回数: 1回のみ');
        console.log('  • 実行プロセス: アカウント分析 → 投稿作成');
        console.log('  • 開発機能: 有効');
        console.log('  • デバッグログ: 詳細表示');
        console.log('  • メトリクス: 有効');
        console.log('');
        const executionStartTime = Date.now();
        console.log('⏱️  [実行開始] 単一実行フロー開始...');
        await coreRunner.runSingle();
        const executionTime = Date.now() - executionStartTime;
        console.log('');
        console.log('✅ [実行完了] 開発用単一実行が完了しました');
        console.log(`⏱️  [実行時間] ${executionTime}ms`);
        console.log('');
        console.log('📋 [次のステップ]');
        console.log('  • 実行結果を tasks/outputs/ で確認');
        console.log('  • メトリクスを data/metrics/ で確認');
        console.log('  • ログファイルを確認してデバッグ');
        console.log('  • 本番実行には pnpm start を使用');
        await logDevelopmentSuccess(startupTimestamp, executionTime);
    }
    catch (error) {
        console.error('❌ [開発実行エラー] 開発実行システムエラー:', error);
        await logDevelopmentError(error, startupTimestamp);
        console.log('');
        console.log('🔧 [デバッグ支援]');
        console.log('  1. エラーログを tasks/outputs/ で確認');
        console.log('  2. システム設定ファイルを確認');
        console.log('  3. データファイルの整合性を確認');
        console.log('  4. ネットワーク接続を確認');
        console.log('  5. 依存関係の問題を確認');
        console.log('');
        console.log('💡 [トラブルシューティング]');
        console.log('  • TypeScript コンパイルエラーがないか確認');
        console.log('  • 必要な設定ファイルが存在するか確認');
        console.log('  • API 認証情報が正しく設定されているか確認');
        process.exit(1);
    }
}
async function validateDevelopmentEnvironment() {
    console.log('🧪 [環境検証] 開発実行環境を検証中...');
    const developmentDirs = [
        'data',
        'data/config',
        'data/current',
        'data/metrics',
        'tasks',
        'tasks/outputs'
    ];
    for (const dir of developmentDirs) {
        const dirPath = path.join(process.cwd(), dir);
        try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`  ✓ ${dir} ディレクトリ確認・作成完了`);
        }
        catch (error) {
            console.error(`  ❌ ${dir} ディレクトリエラー:`, error);
            throw new Error(`Development directory ${dir} could not be created`);
        }
    }
    const developmentChecks = [
        { name: '開発用データディレクトリ', path: 'data', type: 'directory' },
        { name: '出力ディレクトリ', path: 'tasks/outputs', type: 'directory' },
        { name: 'メトリクスディレクトリ', path: 'data/metrics', type: 'directory' }
    ];
    for (const check of developmentChecks) {
        const checkPath = path.join(process.cwd(), check.path);
        try {
            const stats = await fs.stat(checkPath);
            if (check.type === 'directory' && stats.isDirectory()) {
                console.log(`  ✓ ${check.name} 確認完了`);
            }
            else if (check.type === 'file' && stats.isFile()) {
                console.log(`  ✓ ${check.name} 確認完了`);
            }
            else {
                console.log(`  ⚠️  ${check.name} タイプが期待と異なります`);
            }
        }
        catch (error) {
            console.log(`  ❌ ${check.name} 確認に失敗: ${error}`);
        }
    }
    console.log('✅ [環境検証] 開発実行環境検証完了');
}
async function logDevelopmentRun(timestamp) {
    try {
        const developmentInfo = {
            timestamp,
            mode: 'development_single_execution',
            command: 'pnpm dev',
            purpose: 'development_testing_debugging',
            system: {
                node_version: process.version,
                platform: process.platform,
                architecture: process.arch,
                working_directory: process.cwd(),
                environment: 'development'
            },
            configuration: {
                execution_mode: 'single_run',
                monitoring_enabled: true,
                metrics_enabled: true,
                logging_level: 'debug',
                development_features: true
            },
            expectations: {
                execution_count: 1,
                timeout: '15 minutes',
                output_files: ['execution results', 'metrics', 'logs']
            }
        };
        const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
        await fs.mkdir(outputDir, { recursive: true });
        const filename = `dev-startup-${Date.now()}.yaml`;
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, yaml.dump(developmentInfo, { indent: 2 }));
        console.log(`  ✓ 開発実行情報を記録: ${filename}`);
    }
    catch (error) {
        console.warn('⚠️ [開発ログ] 開発実行ログの記録に失敗:', error);
    }
}
async function logDevelopmentSuccess(startupTimestamp, executionTime) {
    try {
        const successInfo = {
            startup_timestamp: startupTimestamp,
            completion_timestamp: new Date().toISOString(),
            mode: 'development_single_execution',
            command: 'pnpm dev',
            result: 'success',
            performance: {
                execution_time_ms: executionTime,
                execution_time_readable: `${(executionTime / 1000).toFixed(2)}秒`
            },
            outputs: {
                execution_results: 'tasks/outputs/',
                metrics: 'data/metrics/',
                logs: 'tasks/outputs/'
            },
            next_steps: [
                'Review execution results in tasks/outputs/',
                'Check metrics in data/metrics/',
                'Use pnpm start for production runs'
            ]
        };
        const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
        await fs.mkdir(outputDir, { recursive: true });
        const filename = `dev-success-${Date.now()}.yaml`;
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, yaml.dump(successInfo, { indent: 2 }));
        console.log(`📊 [成功ログ] 開発実行成功情報を記録: ${filename}`);
    }
    catch (error) {
        console.warn('⚠️ [成功ログ] 成功ログの記録に失敗:', error);
    }
}
async function logDevelopmentError(error, startupTimestamp) {
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
                    'Configuration file issues',
                    'Network connectivity problems',
                    'TypeScript compilation errors',
                    'Missing dependencies',
                    'API authentication issues'
                ],
                troubleshooting_steps: [
                    'Check TypeScript compilation',
                    'Verify configuration files',
                    'Test network connectivity',
                    'Validate API credentials',
                    'Review system logs'
                ]
            }
        };
        const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
        await fs.mkdir(outputDir, { recursive: true });
        const filename = `dev-error-${Date.now()}.yaml`;
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
        console.log(`📝 [エラーログ] 開発実行エラー情報を記録: ${filename}`);
    }
    catch (logError) {
        console.error('❌ [ログエラー] エラーログの記録に失敗:', logError);
    }
}
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
