#!/usr/bin/env node
import { Command } from 'commander';
import { DecisionLogger } from '../lib/decision-logger';
import chalk from 'chalk';
import { format } from 'date-fns';
const program = new Command();
const logger = new DecisionLogger();
// メインコマンド設定
program
    .name('decision-log-viewer')
    .description('Claude Code 意思決定ログビューアー')
    .version('1.0.0');
// リスト表示コマンド
program
    .command('list')
    .description('決定ログの一覧表示')
    .option('-n, --limit <number>', '表示件数', '10')
    .option('-t, --type <type>', '決定タイプでフィルタ')
    .option('-m, --method <method>', 'メソッド名でフィルタ')
    .option('-c, --class <class>', 'クラス名でフィルタ')
    .option('-s, --success', '成功した決定のみ表示')
    .option('-f, --failed', '失敗した決定のみ表示')
    .option('--since <date>', '指定日時以降のログ (YYYY-MM-DD)')
    .option('--until <date>', '指定日時以前のログ (YYYY-MM-DD)')
    .action(async (options) => {
    await listLogs(options);
});
// 詳細表示コマンド
program
    .command('show <logId>')
    .description('指定したログIDの詳細表示')
    .option('-p, --prompt', 'プロンプト詳細も表示')
    .option('-r, --response', 'レスポンス詳細も表示')
    .action(async (logId, options) => {
    await showLogDetail(logId, options);
});
// 統計表示コマンド
program
    .command('stats')
    .description('意思決定統計の表示')
    .option('--since <date>', '指定日時以降の統計 (YYYY-MM-DD)')
    .option('--until <date>', '指定日時以前の統計 (YYYY-MM-DD)')
    .action(async (options) => {
    await showStatistics(options);
});
// プロンプト検索コマンド
program
    .command('search <keyword>')
    .description('プロンプト内容でログを検索')
    .option('-n, --limit <number>', '表示件数', '5')
    .action(async (keyword, options) => {
    await searchLogs(keyword, options);
});
// リアルタイム監視コマンド
program
    .command('watch')
    .description('新しい決定ログをリアルタイム監視')
    .action(async () => {
    await watchLogs();
});
// ログ一覧表示関数
async function listLogs(options) {
    console.log(chalk.blue.bold('📊 Claude Code 意思決定ログ'));
    console.log(chalk.gray('='.repeat(60)));
    const query = {
        limit: parseInt(options.limit)
    };
    // フィルタ設定
    if (options.type)
        query.decisionType = options.type;
    if (options.method)
        query.methodName = options.method;
    if (options.class)
        query.className = options.class;
    if (options.success)
        query.success = true;
    if (options.failed)
        query.success = false;
    // 日時範囲設定
    if (options.since || options.until) {
        const start = options.since ? new Date(options.since) : new Date(0);
        const end = options.until ? new Date(options.until + 'T23:59:59') : new Date();
        query.timeRange = { start, end };
    }
    try {
        const logs = await logger.queryLogs(query);
        if (logs.length === 0) {
            console.log(chalk.yellow('⚠️  該当するログが見つかりませんでした'));
            return;
        }
        logs.forEach((log, index) => {
            const timestamp = format(new Date(log.timestamp), 'MM/dd HH:mm:ss');
            const statusIcon = log.result.success ? '✅' : '❌';
            const durationText = log.response.processingTime > 0
                ? `${log.response.processingTime}ms`
                : 'N/A';
            console.log(`${chalk.gray(`${index + 1}.`)} ${statusIcon} ${chalk.cyan(timestamp)} ${chalk.white(log.className)}.${chalk.yellow(log.methodName)}`);
            console.log(`   📝 ${chalk.green(log.decisionType)} (${durationText})`);
            if (log.result.error) {
                console.log(`   ${chalk.red('💥 エラー:')} ${log.result.error}`);
            }
            else if (log.result.decisionsCount) {
                console.log(`   ${chalk.blue('🎯 決定数:')} ${log.result.decisionsCount}件`);
            }
            console.log(`   ${chalk.gray(`ID: ${log.id}`)}`);
            console.log();
        });
        console.log(chalk.gray(`表示件数: ${logs.length}件`));
    }
    catch (error) {
        console.error(chalk.red('❌ ログ取得エラー:'), error);
    }
}
// ログ詳細表示関数
async function showLogDetail(logId, options) {
    try {
        const logs = await logger.queryLogs({});
        const log = logs.find(l => l.id === logId);
        if (!log) {
            console.log(chalk.red(`❌ ログID "${logId}" が見つかりませんでした`));
            return;
        }
        console.log(chalk.blue.bold('🔍 決定ログ詳細'));
        console.log(chalk.gray('='.repeat(60)));
        // 基本情報
        console.log(chalk.white.bold('📋 基本情報:'));
        console.log(`   ID: ${chalk.cyan(log.id)}`);
        console.log(`   時刻: ${chalk.green(format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'))}`);
        console.log(`   クラス: ${chalk.yellow(log.className)}`);
        console.log(`   メソッド: ${chalk.yellow(log.methodName)}`);
        console.log(`   決定タイプ: ${chalk.blue(log.decisionType)}`);
        console.log(`   モデル: ${chalk.magenta(log.metadata.modelUsed)}`);
        console.log(`   処理時間: ${chalk.cyan(log.response.processingTime + 'ms')}`);
        console.log(`   成功: ${log.result.success ? chalk.green('✅') : chalk.red('❌')}`);
        if (log.result.error) {
            console.log(`   エラー: ${chalk.red(log.result.error)}`);
        }
        console.log();
        // コンテキスト情報
        if (log.context && Object.keys(log.context).length > 0) {
            console.log(chalk.white.bold('📊 コンテキスト:'));
            Object.entries(log.context).forEach(([key, value]) => {
                console.log(`   ${key}: ${chalk.cyan(JSON.stringify(value))}`);
            });
            console.log();
        }
        // プロンプト詳細
        if (options.prompt) {
            console.log(chalk.white.bold('📝 プロンプト詳細:'));
            console.log(chalk.gray('--- プロンプト要約 ---'));
            console.log(log.prompt.summary);
            console.log();
            if (Object.keys(log.prompt.variables).length > 0) {
                console.log(chalk.gray('--- 変数 ---'));
                Object.entries(log.prompt.variables).forEach(([key, value]) => {
                    console.log(`${key}: ${chalk.cyan(JSON.stringify(value))}`);
                });
                console.log();
            }
            console.log(chalk.gray('--- 完全なプロンプト ---'));
            console.log(log.prompt.full);
            console.log();
        }
        // レスポンス詳細
        if (options.response && log.response.full) {
            console.log(chalk.white.bold('📤 レスポンス詳細:'));
            console.log(chalk.gray('--- パース結果 ---'));
            if (log.response.parsed) {
                console.log(JSON.stringify(log.response.parsed, null, 2));
            }
            else {
                console.log('パース結果なし');
            }
            console.log();
            console.log(chalk.gray('--- 完全なレスポンス ---'));
            console.log(log.response.full);
            console.log();
        }
        // 結果情報
        console.log(chalk.white.bold('🎯 結果:'));
        if (log.result.decisionsCount) {
            console.log(`   決定数: ${chalk.blue(log.result.decisionsCount)}件`);
        }
        if (log.result.actionType) {
            console.log(`   アクションタイプ: ${chalk.green(log.result.actionType)}`);
        }
    }
    catch (error) {
        console.error(chalk.red('❌ ログ詳細取得エラー:'), error);
    }
}
// 統計表示関数
async function showStatistics(options) {
    console.log(chalk.blue.bold('📈 Claude Code 決定統計'));
    console.log(chalk.gray('='.repeat(60)));
    let timeRange;
    if (options.since || options.until) {
        const start = options.since ? new Date(options.since) : new Date(0);
        const end = options.until ? new Date(options.until + 'T23:59:59') : new Date();
        timeRange = { start, end };
    }
    try {
        const stats = await logger.getStatistics(timeRange);
        if (!stats) {
            console.log(chalk.red('❌ 統計データの取得に失敗しました'));
            return;
        }
        // 全体統計
        console.log(chalk.white.bold('📊 全体統計:'));
        console.log(`   総実行回数: ${chalk.cyan(stats.total)}回`);
        console.log(`   成功: ${chalk.green(stats.successful)}回 (${chalk.cyan(Math.round(stats.successful / stats.total * 100))}%)`);
        console.log(`   失敗: ${chalk.red(stats.failed)}回 (${chalk.cyan(Math.round(stats.failed / stats.total * 100))}%)`);
        console.log(`   平均処理時間: ${chalk.yellow(stats.averageProcessingTime)}ms`);
        console.log(`   総決定数: ${chalk.blue(stats.totalDecisionsMade)}件`);
        console.log();
        // 決定タイプ別統計
        if (Object.keys(stats.byDecisionType).length > 0) {
            console.log(chalk.white.bold('📝 決定タイプ別統計:'));
            Object.entries(stats.byDecisionType)
                .sort(([, a], [, b]) => b - a)
                .forEach(([type, count]) => {
                const percentage = Math.round(count / stats.total * 100);
                console.log(`   ${chalk.blue(type)}: ${chalk.cyan(count)}回 (${percentage}%)`);
            });
            console.log();
        }
        // メソッド別統計
        if (Object.keys(stats.byMethod).length > 0) {
            console.log(chalk.white.bold('🔧 メソッド別統計:'));
            Object.entries(stats.byMethod)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10) // 上位10件のみ表示
                .forEach(([method, count]) => {
                const percentage = Math.round(count / stats.total * 100);
                console.log(`   ${chalk.yellow(method)}: ${chalk.cyan(count)}回 (${percentage}%)`);
            });
            console.log();
        }
        // モデル別統計
        if (Object.keys(stats.byModel).length > 0) {
            console.log(chalk.white.bold('🤖 モデル別統計:'));
            Object.entries(stats.byModel).forEach(([model, count]) => {
                const percentage = Math.round(count / stats.total * 100);
                console.log(`   ${chalk.magenta(model)}: ${chalk.cyan(count)}回 (${percentage}%)`);
            });
        }
    }
    catch (error) {
        console.error(chalk.red('❌ 統計取得エラー:'), error);
    }
}
// ログ検索関数
async function searchLogs(keyword, options) {
    console.log(chalk.blue.bold(`🔍 プロンプト検索: "${keyword}"`));
    console.log(chalk.gray('='.repeat(60)));
    try {
        const allLogs = await logger.queryLogs({});
        const matchingLogs = allLogs.filter(log => log.prompt.full.toLowerCase().includes(keyword.toLowerCase()) ||
            log.prompt.summary.toLowerCase().includes(keyword.toLowerCase())).slice(0, parseInt(options.limit));
        if (matchingLogs.length === 0) {
            console.log(chalk.yellow(`⚠️  "${keyword}" に一致するログが見つかりませんでした`));
            return;
        }
        matchingLogs.forEach((log, index) => {
            const timestamp = format(new Date(log.timestamp), 'MM/dd HH:mm:ss');
            const statusIcon = log.result.success ? '✅' : '❌';
            console.log(`${chalk.gray(`${index + 1}.`)} ${statusIcon} ${chalk.cyan(timestamp)} ${chalk.white(log.className)}.${chalk.yellow(log.methodName)}`);
            console.log(`   📝 ${chalk.green(log.decisionType)}`);
            // キーワードをハイライト
            const highlightedSummary = log.prompt.summary.replace(new RegExp(`(${keyword})`, 'gi'), chalk.bgYellow.black('$1'));
            console.log(`   💭 ${highlightedSummary}`);
            console.log(`   ${chalk.gray(`ID: ${log.id}`)}`);
            console.log();
        });
        console.log(chalk.gray(`検索結果: ${matchingLogs.length}件`));
    }
    catch (error) {
        console.error(chalk.red('❌ 検索エラー:'), error);
    }
}
// リアルタイム監視関数
async function watchLogs() {
    console.log(chalk.blue.bold('👀 リアルタイム監視モード'));
    console.log(chalk.gray('新しい決定ログを監視中... (Ctrl+C で終了)'));
    console.log(chalk.gray('='.repeat(60)));
    let lastLogCount = 0;
    const checkForNewLogs = async () => {
        try {
            const logs = await logger.queryLogs({ limit: 100 });
            if (logs.length > lastLogCount) {
                const newLogs = logs.slice(0, logs.length - lastLogCount);
                newLogs.reverse().forEach(log => {
                    const timestamp = format(new Date(log.timestamp), 'HH:mm:ss');
                    const statusIcon = log.result.success ? '✅' : '❌';
                    console.log(`${chalk.green('NEW')} ${statusIcon} ${chalk.cyan(timestamp)} ${chalk.white(log.className)}.${chalk.yellow(log.methodName)}`);
                    console.log(`     📝 ${chalk.blue(log.decisionType)} (${log.response.processingTime}ms)`);
                    if (log.result.error) {
                        console.log(`     ${chalk.red('💥 エラー:')} ${log.result.error}`);
                    }
                    else if (log.result.decisionsCount) {
                        console.log(`     ${chalk.green('🎯 決定数:')} ${log.result.decisionsCount}件`);
                    }
                    console.log();
                });
                lastLogCount = logs.length;
            }
        }
        catch (error) {
            console.error(chalk.red('❌ 監視エラー:'), error);
        }
    };
    // 初期ログ数を取得
    try {
        const initialLogs = await logger.queryLogs({ limit: 100 });
        lastLogCount = initialLogs.length;
    }
    catch (error) {
        console.error(chalk.red('❌ 初期化エラー:'), error);
    }
    // 5秒間隔で新しいログをチェック
    const interval = setInterval(checkForNewLogs, 5000);
    // Ctrl+C での終了処理
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n👋 監視を終了します'));
        clearInterval(interval);
        process.exit(0);
    });
}
// エラーハンドリング
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('❌ 未処理のエラー:'), error);
    process.exit(1);
});
// コマンド実行
program.parse();
