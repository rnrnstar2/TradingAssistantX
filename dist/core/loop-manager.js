import { AutonomousExecutor } from './autonomous-executor.js';
import { SystemDecisionEngine } from './decision-engine.js';
import { loadYamlSafe } from '../utils/yaml-utils.js';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
export class LoopManager {
    autonomousExecutor;
    decisionEngine;
    isRunning = false;
    scheduledIntervals = [];
    postingTimes = [];
    executionStatus;
    constructor() {
        this.autonomousExecutor = new AutonomousExecutor();
        this.decisionEngine = new SystemDecisionEngine();
        this.executionStatus = {
            lastExecution: '',
            nextExecution: '',
            executionCount: 0,
            errors: 0,
            isRunning: false
        };
        console.log('🔄 [LoopManager] ループ管理システム初期化完了');
    }
    async scheduleAutonomousLoop() {
        console.log('⏰ [LoopManager] 1日15回の定時実行システムを開始...');
        if (this.isRunning) {
            console.log('⚠️ [LoopManager] 既にループが実行中です');
            return;
        }
        try {
            await this.loadPostingTimes();
            await this.setupScheduledExecution();
            this.isRunning = true;
            console.log(`✅ [LoopManager] 定時実行システム開始完了 - ${this.postingTimes.length}回/日`);
            console.log('📅 実行時刻:', this.postingTimes.join(', '));
            await this.saveExecutionStatus();
        }
        catch (error) {
            console.error('❌ [LoopManager] 定時実行システム開始エラー:', error);
            await this.handleExecutionErrors(error);
            throw error;
        }
    }
    async executeSingleRun() {
        console.log('🚀 [LoopManager] 単一実行を開始...');
        if (this.executionStatus.isRunning) {
            console.log('⚠️ [LoopManager] 実行中のため単一実行をスキップ');
            return;
        }
        this.executionStatus.isRunning = true;
        const startTime = Date.now();
        try {
            console.log('🧠 [LoopManager] 自律実行プロセス開始...');
            await this.autonomousExecutor.executeAutonomously();
            this.executionStatus.executionCount++;
            this.executionStatus.lastExecution = new Date().toISOString();
            const executionTime = Date.now() - startTime;
            console.log(`✅ [LoopManager] 単一実行完了 (${executionTime}ms)`);
            console.log(`📊 [実行統計] 累計実行回数: ${this.executionStatus.executionCount}回`);
        }
        catch (error) {
            console.error('❌ [LoopManager] 単一実行エラー:', error);
            this.executionStatus.errors++;
            await this.handleExecutionErrors(error);
            throw error;
        }
        finally {
            this.executionStatus.isRunning = false;
            await this.saveExecutionStatus();
        }
    }
    monitorExecutionStatus() {
        console.log('📊 [LoopManager] 実行状態を監視中...');
        const status = {
            lastExecution: this.executionStatus.lastExecution || 'まだ実行されていません',
            nextExecution: this.getNextExecutionTime(),
            executionCount: this.executionStatus.executionCount,
            errors: this.executionStatus.errors,
            isRunning: this.executionStatus.isRunning
        };
        console.log('📈 [実行状態]:', {
            最新実行: status.lastExecution,
            次回実行: status.nextExecution,
            実行回数: `${status.executionCount}回`,
            エラー数: `${status.errors}件`,
            実行中: status.isRunning ? 'はい' : 'いいえ'
        });
        return status;
    }
    async handleExecutionErrors(error) {
        console.error('🚨 [LoopManager] エラー処理開始...');
        const errorInfo = {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            executionContext: {
                isRunning: this.isRunning,
                executionCount: this.executionStatus.executionCount,
                lastExecution: this.executionStatus.lastExecution
            }
        };
        try {
            const outputDir = path.join(process.cwd(), 'tasks', 'outputs');
            await fs.mkdir(outputDir, { recursive: true });
            const filename = `loop-manager-error-${Date.now()}.yaml`;
            const filePath = path.join(outputDir, filename);
            await fs.writeFile(filePath, yaml.dump(errorInfo, { indent: 2 }));
            console.log(`📝 [エラーログ] エラー情報を保存: ${filename}`);
        }
        catch (saveError) {
            console.error('❌ [エラーログ保存] エラー:', saveError);
        }
        this.executionStatus.errors++;
        if (this.executionStatus.errors > 5) {
            console.log('🛑 [安全停止] エラー回数が5回を超えたため、ループを停止します');
            await this.stopScheduledExecution();
        }
        console.log('✅ [LoopManager] エラー処理完了');
    }
    async stopScheduledExecution() {
        console.log('🛑 [LoopManager] 定時実行システム停止中...');
        this.scheduledIntervals.forEach(interval => {
            clearTimeout(interval);
        });
        this.scheduledIntervals = [];
        this.isRunning = false;
        this.executionStatus.isRunning = false;
        await this.saveExecutionStatus();
        console.log('✅ [LoopManager] 定時実行システム停止完了');
    }
    async loadPostingTimes() {
        console.log('📋 [LoopManager] 投稿時間設定を読み込み中...');
        const configPath = path.join(process.cwd(), 'data', 'config', 'posting-times.yaml');
        const schedule = loadYamlSafe(configPath);
        if (schedule?.posting_times) {
            this.postingTimes = [
                ...schedule.posting_times.morning,
                ...schedule.posting_times.noon,
                ...schedule.posting_times.evening,
                ...schedule.posting_times.night
            ];
        }
        else {
            this.postingTimes = [
                '07:00', '08:00', '09:00',
                '12:00', '13:00',
                '15:00', '16:00', '17:00',
                '18:00', '19:00',
                '21:00', '22:00', '23:00',
                '00:00', '01:00'
            ];
        }
        console.log(`📅 [投稿時間] ${this.postingTimes.length}回の投稿時間を設定`);
    }
    async setupScheduledExecution() {
        console.log('⏰ [LoopManager] 定時実行スケジュール設定中...');
        for (const time of this.postingTimes) {
            const [hours, minutes] = time.split(':').map(Number);
            const executionTime = this.getMillisecondsUntilTime(hours, minutes);
            const interval = setTimeout(async () => {
                try {
                    console.log(`🕐 [定時実行] ${time} - 自律実行開始`);
                    await this.executeSingleRun();
                    this.setupRecurringExecution(hours, minutes);
                }
                catch (error) {
                    console.error(`❌ [定時実行エラー] ${time}:`, error);
                    await this.handleExecutionErrors(error);
                }
            }, executionTime);
            this.scheduledIntervals.push(interval);
        }
        console.log(`⏰ [スケジュール] ${this.scheduledIntervals.length}件のタイマー設定完了`);
    }
    setupRecurringExecution(hours, minutes) {
        const interval = setInterval(async () => {
            try {
                console.log(`🔄 [定期実行] ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} - 自律実行開始`);
                await this.executeSingleRun();
            }
            catch (error) {
                console.error(`❌ [定期実行エラー] ${hours}:${minutes}:`, error);
                await this.handleExecutionErrors(error);
            }
        }, 24 * 60 * 60 * 1000); // 24時間ごとに実行
        this.scheduledIntervals.push(interval);
    }
    getMillisecondsUntilTime(hours, minutes) {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);
        if (targetTime <= now) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        return targetTime.getTime() - now.getTime();
    }
    getNextExecutionTime() {
        if (!this.isRunning || this.postingTimes.length === 0) {
            return '定時実行が設定されていません';
        }
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const nextTime = this.postingTimes.find(time => time > currentTime);
        if (nextTime) {
            const today = now.toISOString().split('T')[0];
            return `${today} ${nextTime}`;
        }
        else {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = tomorrow.toISOString().split('T')[0];
            return `${tomorrowDate} ${this.postingTimes[0]}`;
        }
    }
    async saveExecutionStatus() {
        try {
            const statusPath = path.join(process.cwd(), 'data', 'current', 'loop-manager-status.yaml');
            const statusData = {
                ...this.executionStatus,
                nextExecution: this.getNextExecutionTime(),
                postingTimesCount: this.postingTimes.length,
                scheduledIntervalsCount: this.scheduledIntervals.length,
                updatedAt: new Date().toISOString()
            };
            await fs.mkdir(path.dirname(statusPath), { recursive: true });
            await fs.writeFile(statusPath, yaml.dump(statusData, { indent: 2 }));
        }
        catch (error) {
            console.error('❌ [実行状態保存] エラー:', error);
        }
    }
}
