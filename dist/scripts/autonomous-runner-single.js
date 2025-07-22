#!/usr/bin/env node
import { AutonomousExecutor } from '../core/autonomous-executor.js';
// 実行制御定数
const MAX_EXECUTION_COUNT = 1; // 単発実行モードでは1回限り
const EXECUTION_TIMEOUT = 600 * 1000; // 10分でタイムアウト
// 実行状態管理
let executionCount = 0;
let executionStartTime = 0;
let timeoutHandle;
async function executeSingleAutonomousAction() {
    console.log('🤖 [単発実行] Claude自律判断開始');
    console.log(`📅 開始時刻: ${new Date().toISOString()}`);
    // 実行回数制限チェック
    if (executionCount >= MAX_EXECUTION_COUNT) {
        console.log('🛑 [実行制限] 最大実行回数に達しました');
        process.exit(0);
    }
    executionCount++;
    executionStartTime = Date.now();
    console.log(`🤖 [単発実行] 実行回数: ${executionCount}/${MAX_EXECUTION_COUNT}`);
    // タイムアウト制御設定
    timeoutHandle = setTimeout(() => {
        console.log('⏰ [タイムアウト] 実行時間制限により強制終了');
        generateExecutionReport('timeout');
        process.exit(1);
    }, EXECUTION_TIMEOUT);
    const executor = new AutonomousExecutor();
    try {
        await executor.executeAutonomously();
        console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 単発実行完了（決定+投稿実行）`);
        // 成功時のレポート生成
        generateExecutionReport('success');
    }
    catch (error) {
        console.error(`❌ [${new Date().toLocaleTimeString('ja-JP')}] 実行エラー:`, error);
        generateExecutionReport('error');
        process.exit(1);
    }
    finally {
        // タイムアウトハンドルをクリア
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        // 確実に終了
        console.log('✅ [単発実行完了] プロセスを終了します');
        process.exit(0);
    }
}
// 実行レポート生成
function generateExecutionReport(terminationReason) {
    const endTime = Date.now();
    const duration = endTime - executionStartTime;
    // メモリ使用量取得
    const memUsage = process.memoryUsage();
    const peakMemory = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    const report = {
        startTime: executionStartTime,
        endTime: endTime,
        duration: duration,
        executionCount: executionCount,
        terminationReason: terminationReason,
        resourceUsage: {
            peakMemory: peakMemory,
            activeBrowsers: 0, // TODO: 実際のブラウザ数を取得
            activeContexts: 0 // TODO: 実際のコンテキスト数を取得
        }
    };
    console.log('📊 [実行レポート]:', {
        実行時間: `${Math.round(duration / 1000)}秒`,
        終了理由: terminationReason,
        メモリ使用量: `${peakMemory}MB`,
        実行回数: `${executionCount}/${MAX_EXECUTION_COUNT}`
    });
    // レポートをファイルに保存（必要に応じて）
    saveExecutionReport(report).catch((error) => {
        console.error('❌ [実行レポート] 保存エラー:', error);
    });
}
// 実行レポート保存
async function saveExecutionReport(report) {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const outputDir = path.join(process.cwd(), 'tasks', '20250721_211123_error_fixes', 'outputs');
        const reportPath = path.join(outputDir, 'TASK-002-execution-log.txt');
        const reportText = `
=== 実行制御レポート ===
開始時刻: ${new Date(report.startTime).toISOString()}
終了時刻: ${new Date(report.endTime).toISOString()}
実行時間: ${report.duration}ms
終了理由: ${report.terminationReason}
メモリ使用量: ${report.resourceUsage.peakMemory}MB
実行回数: ${report.executionCount}
`;
        await fs.mkdir(outputDir, { recursive: true });
        await fs.appendFile(reportPath, reportText);
        console.log('💾 [レポート保存] 実行ログを保存しました');
    }
    catch (error) {
        console.error('❌ [レポート保存エラー]:', error);
    }
}
// プロセス終了ハンドラー設定
process.on('SIGINT', () => {
    console.log('🛑 [中断要求] プロセスを安全に終了');
    if (executionStartTime > 0) {
        generateExecutionReport('interrupt');
    }
    process.exit(0);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ [未処理エラー]', reason);
    if (executionStartTime > 0) {
        generateExecutionReport('error');
    }
    process.exit(1);
});
// シングル実行ランナーのファクトリー関数（再利用可能）
export function createSingleExecutionRunner() {
    return {
        async execute() {
            await executeSingleAutonomousAction();
        }
    };
}
// 環境変数制御（直接実行時のみ）
if (import.meta.url === `file://${process.argv[1]}`) {
    const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
    if (IS_SINGLE_EXECUTION) {
        console.log('🧪 [単発実行モード] テスト環境での実行を開始');
    }
    executeSingleAutonomousAction().catch(error => {
        console.error('💥 Fatal error:', error);
        if (executionStartTime > 0) {
            generateExecutionReport('error');
        }
        process.exit(1);
    });
}
