import { ClaudeAutonomousAgent } from './claude-autonomous-agent.js';
// Removed unused import: FXAPICollector
import { RssParallelCollectionEngine } from './rss-parallel-collection-engine.js';
import type { TopicDecision, DataSourceType, CollectionProgress, AdaptiveCollectionResult } from '../types/adaptive-collection.js';

export class AdaptiveCollector {
  private claudeAgent: ClaudeAutonomousAgent;
  private readonly COLLECTION_TIMEOUT = 30000; // 30秒
  private readonly MIN_ITEMS_PER_SOURCE = 3;
  private readonly OPTIMAL_ITEMS_PER_SOURCE = 10;

  constructor(claudeAgent: ClaudeAutonomousAgent) {
    this.claudeAgent = claudeAgent;
  }

  /**
   * Step 1: トピックを決定
   */
  async decideTopic(): Promise<TopicDecision> {
    console.log('🎯 [適応収集] Claudeによるトピック決定中...');
    
    // Claudeに現在の時刻・曜日・最近のトレンドから最適なトピックを決定させる
    const currentContext = {
      timestamp: new Date().toISOString(),
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours(),
      recentTrends: await this.getMinimalTrends()
    };

    // TODO: claudeAgent.decideTopicメソッドを実装
    const topic = await this.claudeAgent.decideOptimalTopic(currentContext);
    
    // トピックに基づいて必要なデータソースを決定
    const requiredSources = this.determineRequiredSources(topic);
    
    return {
      topic: topic.title,
      theme: topic.theme,
      requiredDataTypes: requiredSources,
      minimalDataThreshold: this.MIN_ITEMS_PER_SOURCE * requiredSources.length,
      optimalDataThreshold: this.OPTIMAL_ITEMS_PER_SOURCE * requiredSources.length
    };
  }

  /**
   * Step 2: 適応的にデータを収集
   */
  async collectAdaptively(topicDecision: TopicDecision): Promise<AdaptiveCollectionResult> {
    console.log(`📊 [適応収集] トピック「${topicDecision.topic}」のデータ収集開始`);
    console.log(`   必要ソース: ${topicDecision.requiredDataTypes.join(', ')}`);
    
    const startTime = Date.now();
    const progress: CollectionProgress = {
      topic: topicDecision.topic,
      collectedSources: new Map(),
      sufficiencyScore: 0,
      isMinimalThresholdMet: false,
      isOptimalThresholdMet: false
    };

    try {
      // Phase 1: 最小限の収集（並列）
      await this.collectMinimalData(topicDecision, progress);
      
      // 十分性評価
      await this.evaluateSufficiency(progress, topicDecision);
      
      if (progress.isOptimalThresholdMet) {
        return this.createResult(topicDecision, progress, startTime, 'optimal_threshold_met');
      }

      // Phase 2: 追加収集（必要に応じて）
      if (!progress.isMinimalThresholdMet) {
        await this.collectAdditionalData(topicDecision, progress);
        await this.evaluateSufficiency(progress, topicDecision);
      }

      // Phase 3: 最適化収集（時間の許す限り）
      if (!progress.isOptimalThresholdMet && (Date.now() - startTime < this.COLLECTION_TIMEOUT)) {
        await this.collectOptimalData(topicDecision, progress);
      }

      const reason = progress.isOptimalThresholdMet ? 'optimal_threshold_met' :
                     progress.isMinimalThresholdMet ? 'minimal_threshold_met' : 
                     'timeout';
      
      return this.createResult(topicDecision, progress, startTime, reason);

    } catch (error) {
      console.error('❌ [適応収集] エラー:', error);
      return this.createResult(topicDecision, progress, startTime, 'error');
    }
  }

  private async collectMinimalData(topic: TopicDecision, progress: CollectionProgress): Promise<void> {
    console.log('🔄 [Phase 1] 最小限データ収集中...');
    
    const collectionPromises = topic.requiredDataTypes.map(async (sourceType) => {
      try {
        const data = await this.collectFromSource(sourceType, topic.topic, 'minimal');
        if (data && data.length > 0) {
          progress.collectedSources.set(sourceType, data);
        }
      } catch (error) {
        console.warn(`⚠️ [${sourceType}収集] エラー:`, error);
      }
    });

    await Promise.all(collectionPromises);
  }

  private async collectAdditionalData(topic: TopicDecision, progress: CollectionProgress): Promise<void> {
    console.log('🔄 [Phase 2] 追加データ収集中...');
    
    const collectionPromises = topic.requiredDataTypes.map(async (sourceType) => {
      try {
        const existingData = progress.collectedSources.get(sourceType) || [];
        const additionalData = await this.collectFromSource(sourceType, topic.topic, 'additional');
        if (additionalData && additionalData.length > 0) {
          progress.collectedSources.set(sourceType, [...existingData, ...additionalData]);
        }
      } catch (error) {
        console.warn(`⚠️ [${sourceType}追加収集] エラー:`, error);
      }
    });

    await Promise.all(collectionPromises);
  }

  private async collectOptimalData(topic: TopicDecision, progress: CollectionProgress): Promise<void> {
    console.log('🔄 [Phase 3] 最適化データ収集中...');
    
    const collectionPromises = topic.requiredDataTypes.map(async (sourceType) => {
      try {
        const existingData = progress.collectedSources.get(sourceType) || [];
        const optimalData = await this.collectFromSource(sourceType, topic.topic, 'optimal');
        if (optimalData && optimalData.length > 0) {
          progress.collectedSources.set(sourceType, [...existingData, ...optimalData]);
        }
      } catch (error) {
        console.warn(`⚠️ [${sourceType}最適化収集] エラー:`, error);
      }
    });

    await Promise.all(collectionPromises);
  }

  private async collectFromSource(
    sourceType: DataSourceType, 
    topic: string, 
    level: 'minimal' | 'additional' | 'optimal'
  ): Promise<any[]> {
    const limit = level === 'minimal' ? 5 : level === 'additional' ? 10 : 20;
    
    switch (sourceType) {
      case 'market':
        return await this.collectMarketData(topic, limit);
      case 'news':
        return await this.collectNewsData(topic, limit);
      case 'community':
        return await this.collectCommunityData(topic, limit);
      case 'economic':
        return await this.collectEconomicData(topic, limit);
      default:
        return [];
    }
  }

  private async evaluateSufficiency(progress: CollectionProgress, topic: TopicDecision): Promise<void> {
    const totalItems = Array.from(progress.collectedSources.values())
      .reduce((sum, items) => sum + items.length, 0);
    
    progress.sufficiencyScore = (totalItems / topic.optimalDataThreshold) * 100;
    progress.isMinimalThresholdMet = totalItems >= topic.minimalDataThreshold;
    progress.isOptimalThresholdMet = totalItems >= topic.optimalDataThreshold;
    
    console.log(`📊 [十分性評価] スコア: ${progress.sufficiencyScore.toFixed(1)}%`);
    console.log(`   収集済み: ${totalItems}件, 最小閾値: ${topic.minimalDataThreshold}, 最適閾値: ${topic.optimalDataThreshold}`);
  }

  private determineRequiredSources(topic: any): DataSourceType[] {
    // トピックの種類に応じて必要なデータソースを決定
    const topicKeywords = topic.title.toLowerCase();
    const sources: DataSourceType[] = [];
    
    if (topicKeywords.includes('市場') || topicKeywords.includes('相場') || topicKeywords.includes('fx')) {
      sources.push('market');
    }
    
    if (topicKeywords.includes('ニュース') || topicKeywords.includes('経済') || topicKeywords.includes('政策')) {
      sources.push('news', 'economic');
    }
    
    if (topicKeywords.includes('トレンド') || topicKeywords.includes('話題')) {
      sources.push('community', 'news');
    }
    
    // デフォルトで最低限newsは含める
    if (sources.length === 0) {
      sources.push('news', 'market');
    }
    
    return [...new Set(sources)]; // 重複削除
  }

  private async getMinimalTrends(): Promise<string[]> {
    try {
      // 最小限のトレンド情報を取得（実装を簡素化）
      return [
        '現在の金融市場',
        '主要通貨ペア動向',
        '経済指標発表'
      ];
    } catch (error) {
      console.warn('⚠️ トレンド情報取得エラー:', error);
      return ['投資教育コンテンツ'];
    }
  }

  private async collectMarketData(topic: string, limit: number): Promise<any[]> {
    try {
      // FXAPICollector was removed, using fallback market data
      const fallbackData = [
        { symbol: 'USDJPY', bid: '150.25', ask: '150.27' },
        { symbol: 'EURUSD', bid: '1.0845', ask: '1.0847' }
      ];
      return fallbackData.map(rate => ({
        type: 'market',
        content: `${rate.symbol}: ${rate.bid}/${rate.ask}`,
        timestamp: new Date(),
        metadata: rate
      })).slice(0, limit) || [
        { type: 'market', content: `${topic}関連の市場データ`, timestamp: new Date() }
      ];
    } catch (error) {
      console.warn('⚠️ 市場データ収集エラー:', error);
      return [];
    }
  }

  private async collectNewsData(topic: string, limit: number): Promise<any[]> {
    try {
      const rssEngine = new RssParallelCollectionEngine();
      const newsData = await rssEngine.collectParallelFeeds([]);
      return newsData.map(item => ({
        type: 'news',
        content: item.content || `${topic}関連のニュース`,
        timestamp: new Date(),
        metadata: item
      })).slice(0, limit) || [
        { type: 'news', content: `${topic}関連のニュース`, timestamp: new Date() }
      ];
    } catch (error) {
      console.warn('⚠️ ニュースデータ収集エラー:', error);
      return [];
    }
  }

  private async collectCommunityData(topic: string, limit: number): Promise<any[]> {
    try {
      // TODO: コミュニティデータ収集を実装（簡素化）
      return [
        { type: 'community', content: `${topic}関連のコミュニティ情報`, timestamp: new Date() }
      ];
    } catch (error) {
      console.warn('⚠️ コミュニティデータ収集エラー:', error);
      return [];
    }
  }

  private async collectEconomicData(topic: string, limit: number): Promise<any[]> {
    try {
      // TODO: 経済データ収集を実装（簡素化）
      return [
        { type: 'economic', content: `${topic}関連の経済データ`, timestamp: new Date() }
      ];
    } catch (error) {
      console.warn('⚠️ 経済データ収集エラー:', error);
      return [];
    }
  }

  private createResult(
    topic: TopicDecision,
    progress: CollectionProgress,
    startTime: number,
    reason: 'optimal_threshold_met' | 'minimal_threshold_met' | 'timeout' | 'error'
  ): AdaptiveCollectionResult {
    const totalItems = Array.from(progress.collectedSources.values())
      .reduce((sum, items) => sum + items.length, 0);
    
    return {
      topic,
      collectedData: progress.collectedSources,
      totalItemsCollected: totalItems,
      collectionDuration: Date.now() - startTime,
      sufficiencyScore: progress.sufficiencyScore,
      stoppedEarly: reason !== 'timeout',
      reason
    };
  }
}