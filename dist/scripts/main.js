#!/usr/bin/env node
import { CoreRunner } from './core-runner.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
async function main() {
    console.log('🚀 [TradingAssistantX] メイン実行システム開始');
    console.log('⏰ [実行モード] 1日15回の定時実行システム');
    console.log('📅 [システム概要] 最適投稿時間での自動実行');
    const startupTimestamp = new Date().toISOString();
    try {
        console.log('🔧 [初期化] システム設定を確認中...');
        await validateSystemConfiguration();
        console.log('📋 [設定] 実行環境をセットアップ中...');
        const coreRunner = new CoreRunner({
            mode: 'loop',
            enableLogging: true,
            enableMetrics: true
        });
        console.log('💡 [起動ログ] システム起動情報を記録中...');
        await logSystemStartup(startupTimestamp);
        console.log('🔄 [ループ開始] 定時実行システムを開始します...');
        console.log('');
        console.log('📊 システム情報:');
        console.log('  • 実行回数: 15回/日');
        console.log('  • 実行間隔: 設定ファイルに基づく定時実行');
        console.log('  • 監視機能: 有効');
        console.log('  • メトリクス: 有効');
        console.log('  • ログ記録: 有効');
        console.log('');
        await coreRunner.runLoop();
    }
    catch (error) {
        console.error('❌ [システムエラー] メイン実行システムエラー:', error);
        await logSystemError(error, startupTimestamp);
        console.log('');
        console.log('🚨 [エラー対処法]');
        console.log('  1. データファイルの整合性を確認');
        console.log('  2. ネットワーク接続を確認');
        console.log('  3. 設定ファイルの内容を確認');
        console.log('  4. pnpm dev で単一実行をテスト');
        console.log('');
        process.exit(1);
    }
}
async function validateSystemConfiguration() {
    console.log('✅ [設定検証] システム設定ファイルを検証中...');
    const requiredDirectories = [
        'data',
        'data/config',
        'data/current',
        'data/metrics',
        'tasks/outputs'
    ];
    for (const dir of requiredDirectories) {
        const dirPath = path.join(process.cwd(), dir);
        try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`  ✓ ${dir} ディレクトリ確認完了`);
        }
        catch (error) {
            console.error(`  ❌ ${dir} ディレクトリエラー:`, error);
            throw new Error(`Required directory ${dir} could not be created`);
        }
    }
    const configFiles = [
        { path: 'data/config/posting-times.yaml', required: false },
        { path: 'data/config/autonomous-config.yaml', required: false }
    ];
    for (const config of configFiles) {
        const configPath = path.join(process.cwd(), config.path);
        try {
            await fs.access(configPath);
            console.log(`  ✓ ${config.path} 設定ファイル確認完了`);
        }
        catch (error) {
            if (config.required) {
                console.error(`  ❌ ${config.path} 必須設定ファイルが見つかりません`);
                throw new Error(`Required config file ${config.path} not found`);
            }
            else {
                console.log(`  ⚠️  ${config.path} 設定ファイルが見つかりません（デフォルト値を使用）`);
                await createDefaultConfig(config.path);
            }
        }
    }
    console.log('✅ [設定検証] システム設定検証完了');
}
async function createDefaultConfig(configPath) {
    const fullPath = path.join(process.cwd(), configPath);
    if (configPath.includes('posting-times.yaml')) {
        const defaultPostingTimes = {
            posting_times: {
                morning: ['07:00', '08:00', '09:00'],
                noon: ['12:00', '13:00'],
                evening: ['15:00', '16:00', '17:00', '18:00', '19:00'],
                night: ['21:00', '22:00', '23:00', '00:00', '01:00']
            }
        };
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, yaml.dump(defaultPostingTimes, { indent: 2 }));
        console.log(`  ✓ ${configPath} デフォルト設定ファイルを作成しました`);
    }
    else if (configPath.includes('autonomous-config.yaml')) {
        const defaultAutonomousConfig = {
            execution: {
                mode: 'SCHEDULED_POSTING',
                loop_interval: '15_times_daily',
                enable_metrics: true,
                enable_logging: true
            },
            quality: {
                min_content_length: 50,
                max_content_length: 280,
                educational_focus: true
            },
            safety: {
                max_errors_per_day: 5,
                cooldown_after_error: 300000
            }
        };
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, yaml.dump(defaultAutonomousConfig, { indent: 2 }));
        console.log(`  ✓ ${configPath} デフォルト設定ファイルを作成しました`);
    }
}
async function logSystemStartup(timestamp) {
    try {
        const startupInfo = {
            timestamp,
            mode: 'loop_execution',
            command: 'pnpm start',
            system: {
                node_version: process.version,
                platform: process.platform,
                architecture: process.arch,
                working_directory: process.cwd()
            },
            configuration: {
                execution_mode: '15_times_daily',
                monitoring_enabled: true,
                metrics_enabled: true,
                logging_enabled: true
            }
        };
        const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
        await fs.mkdir(outputDir, { recursive: true });
        const filename = `main-startup-${Date.now()}.yaml`;
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, yaml.dump(startupInfo, { indent: 2 }));
        console.log(`  ✓ システム起動情報を記録: ${filename}`);
    }
    catch (error) {
        console.warn('⚠️ [起動ログ] 起動ログの記録に失敗:', error);
    }
}
async function logSystemError(error, startupTimestamp) {
    try {
        const errorInfo = {
            startup_timestamp: startupTimestamp,
            error_timestamp: new Date().toISOString(),
            mode: 'loop_execution',
            command: 'pnpm start',
            error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                type: error instanceof Error ? error.constructor.name : 'Unknown'
            },
            system: {
                node_version: process.version,
                platform: process.platform,
                working_directory: process.cwd()
            }
        };
        const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
        await fs.mkdir(outputDir, { recursive: true });
        const filename = `main-error-${Date.now()}.yaml`;
        const filePath = path.join(outputDir, filename);
        await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
        console.log(`📝 [エラーログ] システムエラー情報を記録: ${filename}`);
    }
    catch (logError) {
        console.error('❌ [ログエラー] エラーログの記録に失敗:', logError);
    }
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [未処理拒否] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('❌ [未処理例外] Uncaught Exception:', error);
    process.exit(1);
});
// メイン実行判定
if (process.argv[1] && process.argv[1].endsWith('main.ts') || process.argv[1].endsWith('main.js')) {
    main().catch((error) => {
        console.error('❌ [メイン関数エラー]:', error);
        process.exit(1);
    });
}
