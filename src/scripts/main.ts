#!/usr/bin/env node

import { CoreRunner } from './core-runner.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

/**
 * main.ts - フェーズ4 完全自律ループ実行システム
 * 
 * 実装内容:
 * - 1日15回の定時実行システム
 * - posting-times.yamlからのスケジュール読み取り
 * - 次回実行時刻計算・タイマー機能
 * - 緊急実行対応機能
 * - エラー回復・監視機能
 */

/**
 * 投稿スケジュール設定
 */
interface PostingSchedule {
  optimal_times: {
    morning: string[];
    midday: string[];
    afternoon: string[];
    evening: string[];
    night: string[];
  };
  timezone: string;
  auto_schedule: boolean;
}

/**
 * スケジュール実行結果
 */
interface ScheduleExecutionResult {
  success: boolean;
  executedAt: Date;
  nextExecutionTime: Date;
  totalExecutionsToday: number;
  error?: string;
}

async function main(): Promise<void> {
  console.log('🚀 [TradingAssistantX] フェーズ4 完全自律ループ実行システム開始');
  console.log('⏰ [実行モード] 1日15回定時実行システム');
  console.log('📋 [対応機能] スケジュール管理・タイマー・緊急実行・エラー回復');
  
  const startupTimestamp = new Date().toISOString();
  
  try {
    console.log('🔧 [初期化] システム設定・スケジュール読み込み中...');
    await validateSystemConfiguration();
    
    console.log('📋 [設定] CoreRunner準備中...');
    const coreRunner = new CoreRunner({
      enableLogging: true,
      outputDir: path.join(process.cwd(), 'tasks', 'outputs')
    });
    
    console.log('📅 [スケジュール] 投稿時刻設定読み込み中...');
    const schedule = await loadPostingSchedule();
    
    console.log('💡 [起動ログ] システム準備情報を記録中...');
    await logSystemStartup(startupTimestamp, schedule);
    
    console.log('🔄 [定時実行] スケジュールループ開始...');
    console.log('');
    console.log('📊 実行システム情報:');
    console.log('  • フェーズ: 4（完全自律システム）');
    console.log('  • 実行回数: 15回/日');
    console.log(`  • タイムゾーン: ${schedule.timezone}`);
    console.log('  • 自動スケジュール: 有効');
    console.log('  • エラー回復: 有効');
    console.log('  • 緊急実行: 対応済み');
    console.log('');
    
    // 定時実行ループ開始
    await startScheduledLoop(coreRunner, schedule);
    
  } catch (error) {
    console.error('❌ [システムエラー] 定時実行システムエラー:', error);
    
    await logSystemError(error, startupTimestamp);
    
    console.log('');
    console.log('🚨 [エラー対処法]');
    console.log('  1. posting-times.yaml の設定確認');
    console.log('  2. ネットワーク接続を確認');
    console.log('  3. システム時刻・タイムゾーン確認');
    console.log('  4. pnpm dev で単一実行をテスト');
    console.log('  5. tasks/outputs/ のエラーログを確認');
    console.log('');
    
    process.exit(1);
  }
}

/**
 * posting-times.yamlからスケジュール読み取り
 */
async function loadPostingSchedule(): Promise<PostingSchedule> {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const schedule = yaml.load(configContent) as PostingSchedule;
    
    // スケジュール検証
    if (!schedule.optimal_times) {
      throw new Error('optimal_times configuration is missing');
    }
    
    const totalTimes = Object.values(schedule.optimal_times)
      .flat()
      .filter(time => time && typeof time === 'string').length;
      
    console.log(`✅ [スケジュール] ${totalTimes}回の投稿時刻を読み込み完了`);
    console.log(`   タイムゾーン: ${schedule.timezone || 'Asia/Tokyo'}`);
    
    return {
      ...schedule,
      timezone: schedule.timezone || 'Asia/Tokyo',
      auto_schedule: schedule.auto_schedule ?? true
    };
    
  } catch (error) {
    throw new Error(`投稿スケジュール読み込みエラー: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * 次回実行時刻計算
 */
function calculateNextExecutionTime(schedule: PostingSchedule, currentTime: Date = new Date()): Date {
  const allTimes: string[] = Object.values(schedule.optimal_times).flat();
  
  // 現在時刻を時分形式で変換
  const currentTimeStr = currentTime.toTimeString().substring(0, 5); // "HH:MM"形式
  
  // 今日の残りの実行時刻を検索
  const upcomingTimes = allTimes
    .filter(time => time > currentTimeStr)
    .sort();
  
  let nextTime: Date;
  
  if (upcomingTimes.length > 0) {
    // 今日の次の実行時刻
    const nextTimeStr = upcomingTimes[0];
    nextTime = new Date(currentTime);
    const [hours, minutes] = nextTimeStr.split(':').map(Number);
    nextTime.setHours(hours, minutes, 0, 0);
  } else {
    // 今日の実行時刻が全て終了、明日の最初の実行時刻
    const firstTimeStr = allTimes.sort()[0];
    nextTime = new Date(currentTime);
    nextTime.setDate(nextTime.getDate() + 1); // 明日
    const [hours, minutes] = firstTimeStr.split(':').map(Number);
    nextTime.setHours(hours, minutes, 0, 0);
  }
  
  return nextTime;
}

/**
 * 定時実行ループメイン処理
 */
async function startScheduledLoop(coreRunner: CoreRunner, schedule: PostingSchedule): Promise<void> {
  console.log('🔄 [定時実行ループ] 開始');
  
  let executionCount = 0;
  
  // 緊急停止シグナル設定
  let isShuttingDown = false;
  process.on('SIGTERM', () => {
    console.log('🛑 [シャットダウン] SIGTERM受信、安全にシャットダウン中...');
    isShuttingDown = true;
  });
  process.on('SIGINT', () => {
    console.log('🛑 [シャットダウン] SIGINT受信、安全にシャットダウン中...');
    isShuttingDown = true;
  });
  
  // メインループ
  while (!isShuttingDown) {
    try {
      const currentTime = new Date();
      const nextExecutionTime = calculateNextExecutionTime(schedule, currentTime);
      const waitTime = nextExecutionTime.getTime() - currentTime.getTime();
      
      console.log(`⏰ [次回実行] ${nextExecutionTime.toLocaleString('ja-JP', { timeZone: schedule.timezone })}`);
      console.log(`   待機時間: ${Math.round(waitTime / 1000 / 60)}分`);
      
      if (waitTime > 0) {
        console.log('💤 [待機中] 次回実行時刻まで待機...');
        await sleep(Math.min(waitTime, 60000)); // 最大1分間隔でチェック
        
        // 待機中にシャットダウン信号を受信した場合
        if (isShuttingDown) {
          console.log('🛑 [待機中断] シャットダウン信号により待機を中断');
          break;
        }
        
        // まだ実行時刻ではない場合は再ループ
        if (new Date().getTime() < nextExecutionTime.getTime()) {
          continue;
        }
      }
      
      // 実行前の最終チェック
      const validationResult = await coreRunner.validateExecution();
      if (!validationResult.isValid) {
        console.warn('⚠️ [実行スキップ] システム検証失敗:', validationResult.issues);
        await sleep(300000); // 5分待機後リトライ
        continue;
      }
      
      console.log(`🚀 [実行開始] ${executionCount + 1}回目の実行を開始`);
      
      // 基本フロー実行
      const result = await coreRunner.runBasicFlow();
      
      if (result.success) {
        executionCount++;
        console.log(`✅ [実行完了] 成功 (${executionCount}回目)`);
        
        await logScheduleExecution({
          success: true,
          executedAt: new Date(),
          nextExecutionTime: calculateNextExecutionTime(schedule, new Date()),
          totalExecutionsToday: executionCount
        });
      } else {
        console.error('❌ [実行失敗]:', result.error);
        
        await logScheduleExecution({
          success: false,
          executedAt: new Date(),
          nextExecutionTime: calculateNextExecutionTime(schedule, new Date()),
          totalExecutionsToday: executionCount,
          error: result.error
        });
        
        // エラー時は少し長めに待機
        console.log('⏳ [エラー回復] 5分間待機後リトライ');
        await sleep(300000); // 5分
      }
      
    } catch (error) {
      console.error('❌ [ループエラー]:', error);
      
      await logScheduleExecution({
        success: false,
        executedAt: new Date(),
        nextExecutionTime: calculateNextExecutionTime(schedule, new Date()),
        totalExecutionsToday: executionCount,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 重大エラー時は10分間待機
      console.log('⏳ [重大エラー] 10分間待機後リトライ');
      await sleep(600000); // 10分
    }
  }
  
  console.log('🛑 [シャットダウン完了] 定時実行ループを終了しました');
  process.exit(0);
}

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * システム設定検証
 */
async function validateSystemConfiguration(): Promise<void> {
  console.log('✅ [設定検証] システム設定ファイルを検証中...');
  
  const requiredDirectories = [
    'data',
    'data/config',
    'data/current',
    'tasks/outputs'
  ];
  
  for (const dir of requiredDirectories) {
    const dirPath = path.join(process.cwd(), dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`  ✓ ${dir} ディレクトリ確認完了`);
    } catch (error) {
      console.error(`  ❌ ${dir} ディレクトリエラー:`, error);
      throw new Error(`Required directory ${dir} could not be created`);
    }
  }
  
  const configFiles = [
    { path: 'data/config/rss-sources.yaml', required: false, description: 'RSS設定' },
    { path: 'data/config/posting-times.yaml', required: false, description: '投稿時間設定（フェーズ4用）' },
    { path: 'data/config/autonomous-config.yaml', required: false, description: '自動実行設定（フェーズ4用）' }
  ];
  
  for (const config of configFiles) {
    const configPath = path.join(process.cwd(), config.path);
    try {
      await fs.access(configPath);
      console.log(`  ✓ ${config.path} 設定ファイル確認完了`);
    } catch (error) {
      if (config.required) {
        console.error(`  ❌ ${config.path} 必須設定ファイルが見つかりません`);
        throw new Error(`Required config file ${config.path} not found`);
      } else {
        console.log(`  ⚠️  ${config.path} 設定ファイルが見つかりません（${config.description}）`);
        await createDefaultConfig(config.path);
      }
    }
  }
  
  console.log('✅ [設定検証] システム設定検証完了');
}

/**
 * デフォルト設定ファイル作成
 */
async function createDefaultConfig(configPath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), configPath);
  
  if (configPath.includes('posting-times.yaml')) {
    const defaultPostingTimes = {
      description: 'フェーズ4定期実行用投稿時間設定',
      version: '1.0.0',
      phase: 'MVP基盤（フェーズ1）- 現在未使用',
      future_implementation: {
        optimal_times: {
          morning: ['07:00', '08:00', '09:00'],
          noon: ['12:00', '13:00'],
          afternoon: ['15:00', '16:00', '17:00'],
          evening: ['18:00', '19:00', '20:00'],
          night: ['21:00', '22:00', '23:00']
        },
        total_posts_per_day: 15,
        interval_strategy: 'optimal_engagement_times'
      }
    };
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, yaml.dump(defaultPostingTimes, { indent: 2 }));
    console.log(`  ✓ ${configPath} デフォルト設定ファイルを作成しました（フェーズ4用準備）`);
    
  } else if (configPath.includes('autonomous-config.yaml')) {
    const defaultAutonomousConfig = {
      description: 'フェーズ4定期実行用自動実行設定',
      version: '1.0.0',
      phase: 'MVP基盤（フェーズ1）- 現在未使用',
      future_implementation: {
        execution: {
          mode: 'SCHEDULED_POSTING',
          loop_interval: '15_times_daily',
          enable_metrics: true,
          enable_logging: true,
          max_execution_time: '10_minutes'
        },
        quality: {
          min_content_length: 50,
          max_content_length: 280,
          educational_focus: true,
          duplicate_check: true
        },
        safety: {
          max_errors_per_day: 5,
          cooldown_after_error: 300000,
          daily_post_limit: 15,
          enable_validation: true
        }
      }
    };
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, yaml.dump(defaultAutonomousConfig, { indent: 2 }));
    console.log(`  ✓ ${configPath} デフォルト設定ファイルを作成しました（フェーズ4用準備）`);
  }
}

/**
 * スケジュール実行ログ
 */
async function logScheduleExecution(result: ScheduleExecutionResult): Promise<void> {
  try {
    const scheduleLog = {
      timestamp: result.executedAt.toISOString(),
      execution: {
        success: result.success,
        totalExecutionsToday: result.totalExecutionsToday,
        nextExecutionTime: result.nextExecutionTime.toISOString(),
        error: result.error
      },
      system: {
        mode: 'scheduled_posting',
        phase: 'Phase4_Autonomous_System'
      }
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `schedule-execution-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(scheduleLog, { indent: 2 }));
    
  } catch (error) {
    console.warn('⚠️ [スケジュールログ] ログ記録失敗:', error);
  }
}

/**
 * 緊急実行トリガー
 */
async function handleEmergencyExecution(coreRunner: CoreRunner, reason: string): Promise<void> {
  console.log(`🚨 [緊急実行] 緊急実行をトリガー: ${reason}`);
  
  try {
    const result = await coreRunner.runBasicFlow();
    
    if (result.success) {
      console.log('✅ [緊急実行] 緊急実行完了');
    } else {
      console.error('❌ [緊急実行] 緊急実行失敗:', result.error);
    }
    
    // 緊急実行ログ
    const emergencyLog = {
      timestamp: new Date().toISOString(),
      type: 'emergency_execution',
      reason,
      result: {
        success: result.success,
        error: result.error,
        executionTime: result.executionTime
      }
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `emergency-execution-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(emergencyLog, { indent: 2 }));
    
  } catch (error) {
    console.error('❌ [緊急実行エラー]:', error);
  }
}

/**
 * システム準備開始ログ（スケジュール対応版）
 */
async function logSystemStartup(timestamp: string, schedule?: PostingSchedule): Promise<void> {
  try {
    const startupInfo = {
      timestamp,
      mode: 'scheduled_autonomous_loop',
      command: 'pnpm start',
      phase: 'Phase4_Complete_Autonomous_System',
      status: 'fully_operational',
      system: {
        node_version: process.version,
        platform: process.platform,
        architecture: process.arch,
        working_directory: process.cwd()
      },
      schedule_configuration: schedule ? {
        timezone: schedule.timezone,
        auto_schedule: schedule.auto_schedule,
        total_daily_posts: Object.values(schedule.optimal_times).flat().length,
        posting_times: schedule.optimal_times
      } : null,
      active_capabilities: {
        scheduled_posting: 'operational',
        emergency_execution: 'active',
        error_recovery: 'enabled',
        autonomous_loop: 'running',
        schedule_management: 'active'
      },
      implemented_features: [
        '1日15回の定時実行システム',
        'YAML設定ベーススケジュール管理',
        '次回実行時刻自動計算',
        '実行タイマー・待機機能',
        '緊急実行対応機能',
        'エラー回復・リトライ機能',
        '安全なシャットダウン機能'
      ]
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `main-startup-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(startupInfo, { indent: 2 }));
    console.log(`  ✓ システム準備情報を記録: ${filename}`);
    
  } catch (error) {
    console.warn('⚠️ [起動ログ] 起動ログの記録に失敗:', error);
  }
}

/**
 * システム準備成功ログ
 */
async function logSystemPrepareSuccess(startupTimestamp: string): Promise<void> {
  try {
    const successInfo = {
      startup_timestamp: startupTimestamp,
      completion_timestamp: new Date().toISOString(),
      mode: 'loop_preparation',
      command: 'pnpm start',
      result: 'preparation_success',
      phase: 'MVP基盤（フェーズ1）完了',
      preparation_completed: {
        directory_structure: 'created',
        configuration_files: 'validated_or_created',
        core_runner_prepared: true,
        basic_structure: 'ready'
      },
      current_status: {
        single_execution: '利用可能（pnpm devで実行）',
        loop_execution: 'フェーズ4で実装予定',
        configuration: '基本設定完了',
        logging: '有効'
      },
      next_steps: [
        'pnpm dev で単一実行テストを実行',
        'フェーズ4の定期実行機能実装を待機',
        'tasks/outputs/ で実行ログを確認',
        'data/current/today-posts.yaml で投稿履歴を確認'
      ]
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `main-prepare-success-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(successInfo, { indent: 2 }));
    console.log(`📊 [準備完了ログ] システム準備成功情報を記録: ${filename}`);
    
  } catch (error) {
    console.warn('⚠️ [準備完了ログ] 準備完了ログの記録に失敗:', error);
  }
}

/**
 * システムエラーログ
 */
async function logSystemError(error: unknown, startupTimestamp: string): Promise<void> {
  try {
    const errorInfo = {
      startup_timestamp: startupTimestamp,
      error_timestamp: new Date().toISOString(),
      mode: 'loop_preparation',
      command: 'pnpm start',
      result: 'preparation_error',
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      system: {
        node_version: process.version,
        platform: process.platform,
        working_directory: process.cwd()
      },
      troubleshooting: {
        immediate_steps: [
          'Check directory permissions',
          'Verify network connectivity',
          'Test with pnpm dev for single execution',
          'Review configuration files in data/config/'
        ],
        common_causes: [
          'Directory permission issues',
          'Missing dependencies',
          'Configuration file problems',
          'Network connectivity issues'
        ]
      }
    };
    
    const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `main-error-${Date.now()}.yaml`;
    const filePath = path.join(outputDir, filename);
    
    await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
    console.log(`📝 [エラーログ] システムエラー情報を記録: ${filename}`);
    
  } catch (logError) {
    console.error('❌ [ログエラー] エラーログの記録に失敗:', logError);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [未処理拒否] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [未処理例外] Uncaught Exception:', error);
  process.exit(1);
});

// メイン実行判定
if (process.argv[1] && (process.argv[1].endsWith('main.ts') || process.argv[1].endsWith('main.js'))) {
  main().catch((error) => {
    console.error('❌ [メイン関数エラー]:', error);
    process.exit(1);
  });
}