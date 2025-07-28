# TASK-001: 適応的情報収集システムの実装

## 🎯 実装目標
トピック決定後に必要な情報のみを収集し、情報が十分集まった時点で収集を停止する効率的なシステムを実装

## 📋 実装要件

### 1. トピック優先の情報収集フロー
**現在の問題**: 全データソースから固定的に収集してからトピックを決定
**改善後**: トピック決定→必要データソース選択→段階的収集→十分性評価

### 2. 実装対象ファイル
- `src/core/true-autonomous-workflow.ts`
- `src/lib/adaptive-collector.ts` (新規作成)
- `src/types/adaptive-collection.d.ts` (新規作成)

### 3. 実装詳細

#### A. 型定義の作成 (`src/types/adaptive-collection.d.ts`)
```typescript
export interface TopicDecision {
  topic: string;
  theme: string;
  requiredDataTypes: DataSourceType[];
  minimalDataThreshold: number;
  optimalDataThreshold: number;
}

export type DataSourceType = 'market' | 'news' | 'community' | 'economic';

export interface CollectionProgress {
  topic: string;
  collectedSources: Map<DataSourceType, any[]>;
  sufficiencyScore: number;
  isMinimalThresholdMet: boolean;
  isOptimalThresholdMet: boolean;
}

export interface AdaptiveCollectionResult {
  topic: TopicDecision;
  collectedData: Map<DataSourceType, any[]>;
  totalItemsCollected: number;
  collectionDuration: number;
  sufficiencyScore: number;
  stoppedEarly: boolean;
  reason: 'optimal_threshold_met' | 'minimal_threshold_met' | 'timeout' | 'error';
}
```

#### B. AdaptiveCollectorクラスの実装 (`src/lib/adaptive-collector.ts`)
```typescript
import { ClaudeAutonomousAgent } from './claude-autonomous-agent.js';
import { FXAPICollector } from './fx-api-collector.js';
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

  // その他の必要なプライベートメソッドを実装...
}
```

#### C. TrueAutonomousWorkflowの修正
`analyzeCurrentSituation`メソッドを以下のように修正：

```typescript
private async analyzeCurrentSituation(context?: IntegratedContext): Promise<IntegratedContext> {
  console.log('🧠 [Claude状況分析] 適応的情報収集システムで分析中...');
  
  const realDataMode = process.env.REAL_DATA_MODE === 'true';
  
  if (realDataMode) {
    console.log('📊 [適応収集モード] トピック決定後の効率的収集を開始...');
    
    try {
      // 新しい適応的収集システムを使用
      const adaptiveCollector = new AdaptiveCollector(this.claudeAgent);
      
      // Step 1: トピック決定
      const topicDecision = await adaptiveCollector.decideTopic();
      console.log(`🎯 [トピック決定] ${topicDecision.topic}`);
      
      // Step 2: 適応的収集
      const collectionResult = await adaptiveCollector.collectAdaptively(topicDecision);
      console.log(`✅ [収集完了] ${collectionResult.totalItemsCollected}件収集, ${collectionResult.reason}`);
      
      // Step 3: コンテキスト構築
      return await this.buildAdaptiveContext(collectionResult);
      
    } catch (error) {
      console.error('❌ [適応収集エラー]:', error);
      return await this.getFallbackContext();
    }
  } else {
    console.log('🧪 [テストモード] モックデータを使用');
    return await this.getFallbackContext();
  }
}
```

### 4. 実装時の注意事項

1. **エラーハンドリング**: 各データソースの収集が失敗しても全体が止まらないように
2. **タイムアウト制御**: 収集が長時間化しないよう適切なタイムアウトを設定
3. **段階的収集**: 最小限→追加→最適の3段階で効率的に収集
4. **十分性評価**: Claudeの判断も活用して情報の質と量を評価
5. **既存コードとの互換性**: 既存のDecisionEngineやexecuteAutonomouslyとの連携を維持

### 5. テスト要件

1. トピック決定が適切に行われること
2. 必要なデータソースのみが選択されること
3. 十分な情報が集まった時点で収集が停止すること
4. タイムアウトが正しく機能すること
5. エラー時のフォールバックが適切に動作すること

### 6. 成功基準

- 情報収集時間が現在の50%以下に短縮
- 収集される情報の関連性が向上（トピックに特化）
- 無駄な情報収集の削減
- 1投稿に必要十分な情報のみを効率的に収集

## 🔧 実装順序
1. 型定義ファイルの作成
2. AdaptiveCollectorクラスの実装
3. ClaudeAutonomousAgentへのdecideOptimalTopicメソッド追加
4. TrueAutonomousWorkflowの修正
5. 動作テストと調整