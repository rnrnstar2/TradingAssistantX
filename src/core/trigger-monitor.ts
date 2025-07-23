/**
 * TriggerMonitor - X変更検知システムとの連携
 * 
 * x-data-collectorからのトリガーファイルを監視し、
 * 変更検知に基づいて自動的にアクションを実行
 */

import { CoreRunner } from './execution/core-runner.js';
import { readFile, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { Logger } from '../utils/logger.js';

interface TriggerEvent {
  trigger: string;
  timestamp: string;
  action_required: string;
  [key: string]: any;
}

export class TriggerMonitor {
  private logger = new Logger('TriggerMonitor');
  private coreRunner: CoreRunner;
  private triggerPath: string;
  private watcher?: chokidar.FSWatcher;
  private isRunning = false;
  
  constructor() {
    this.coreRunner = new CoreRunner();
    // x-data-collectorと共有するトリガーディレクトリ
    this.triggerPath = path.join(process.cwd(), 'data/triggers');
  }
  
  /**
   * トリガー監視を開始
   */
  async start(): Promise<void> {
    this.logger.info('Starting trigger monitor...');
    
    // トリガーディレクトリが存在しない場合は作成
    if (!existsSync(this.triggerPath)) {
      await this.logger.logWithFile('trigger-monitor', {
        message: 'Creating triggers directory',
        path: this.triggerPath
      });
    }
    
    // ファイル監視を開始
    this.watcher = chokidar.watch(`${this.triggerPath}/*.yaml`, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('add', async (filePath) => {
      this.logger.info(`New trigger detected: ${path.basename(filePath)}`);
      await this.processTrigger(filePath);
    });
    
    this.isRunning = true;
    this.logger.info('Trigger monitor started successfully');
    
    // 既存のトリガーファイルを処理
    await this.processExistingTriggers();
  }
  
  /**
   * 既存のトリガーファイルを処理
   */
  private async processExistingTriggers(): Promise<void> {
    try {
      const files = await readdir(this.triggerPath);
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));
      
      for (const file of yamlFiles) {
        const filePath = path.join(this.triggerPath, file);
        await this.processTrigger(filePath);
      }
    } catch (error) {
      this.logger.error('Failed to process existing triggers', error);
    }
  }
  
  /**
   * トリガーファイルを処理
   */
  private async processTrigger(filePath: string): Promise<void> {
    try {
      // YAMLファイルを読み込み
      const content = await readFile(filePath, 'utf-8');
      const trigger = yaml.load(content) as TriggerEvent;
      
      this.logger.info(`Processing trigger: ${trigger.action_required}`);
      
      // アクションに基づいて処理を実行
      switch (trigger.action_required) {
        case 'create_thank_you_post':
          await this.handleFollowerMilestone(trigger);
          break;
          
        case 'create_follow_up':
          await this.handleViralTweet(trigger);
          break;
          
        case 'analyze_and_respond':
          await this.handleMentions(trigger);
          break;
          
        case 'create_trend_post':
          await this.handleTrendingTopic(trigger);
          break;
          
        default:
          this.logger.warn(`Unknown action: ${trigger.action_required}`);
      }
      
      // 処理済みのトリガーファイルを削除
      await unlink(filePath);
      this.logger.info(`Trigger processed and removed: ${path.basename(filePath)}`);
      
    } catch (error) {
      this.logger.error(`Failed to process trigger: ${filePath}`, error);
    }
  }
  
  /**
   * フォロワーマイルストーン達成時の処理
   */
  private async handleFollowerMilestone(trigger: TriggerEvent): Promise<void> {
    this.logger.info(`Handling follower milestone: ${trigger.milestone} followers`);
    
    // 特別な投稿コンテキストを作成
    const specialContext = {
      type: 'follower_milestone',
      milestone: trigger.milestone,
      message: `${trigger.milestone}人のフォロワー達成！皆様のおかげです🎉`
    };
    
    // CoreRunnerを実行（特別なコンテキスト付き）
    await this.coreRunner.execute({
      specialContext,
      skipScheduleCheck: true
    });
  }
  
  /**
   * バイラルツイート検知時の処理
   */
  private async handleViralTweet(trigger: TriggerEvent): Promise<void> {
    this.logger.info(`Handling viral tweet: ${trigger.impressions} impressions`);
    
    const specialContext = {
      type: 'viral_follow_up',
      originalTweetId: trigger.tweet_id,
      impressions: trigger.impressions,
      message: '前回の投稿が好評だったので、続編をお届けします📈'
    };
    
    await this.coreRunner.execute({
      specialContext,
      skipScheduleCheck: true
    });
  }
  
  /**
   * メンション分析・対応
   */
  private async handleMentions(trigger: TriggerEvent): Promise<void> {
    this.logger.info(`Handling ${trigger.mentions?.length || 0} mentions`);
    
    // メンションの内容を分析して適切な投稿を作成
    const specialContext = {
      type: 'mention_response',
      mentions: trigger.mentions,
      message: '皆様からのご質問にお答えします💬'
    };
    
    await this.coreRunner.execute({
      specialContext,
      skipScheduleCheck: true
    });
  }
  
  /**
   * トレンドトピック対応
   */
  private async handleTrendingTopic(trigger: TriggerEvent): Promise<void> {
    this.logger.info(`Handling trending topics: ${trigger.topics?.join(', ')}`);
    
    const specialContext = {
      type: 'trending_topic',
      topics: trigger.topics,
      message: '今話題のトピックについて投資視点で解説します🔥'
    };
    
    await this.coreRunner.execute({
      specialContext,
      skipScheduleCheck: true
    });
  }
  
  /**
   * 監視を停止
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.isRunning = false;
      this.logger.info('Trigger monitor stopped');
    }
  }
}