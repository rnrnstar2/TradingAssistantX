/**
 * Action Specific Collector - New Modular Implementation
 * 巨大なクラスをモジュラーアーキテクチャに置き換える新実装
 */

import { CollectionOrchestrator } from './collectors/core/collection-orchestrator.js';
import { CollectionConfigManager } from './collectors/config/collection-config-manager.js';
import { MockDataGenerator } from './collectors/utils/mock-data-generator.js';

import type { 
  CollectionTarget, 
  CollectionResult, 
  IntegratedContext,
  ActionCollectionConfig,
  ActionSpecificResult,
  ActionSpecificPreloadResult,
  SufficiencyEvaluation,
  CollectionStrategy,
  QualityEvaluation,
  MultiSourceCollector,
  ExtendedActionCollectionConfig,
  SourceConfig
} from '../types/autonomous-system.js';

/**
 * 新しいモジュラーActionSpecificCollector
 * 後方互換性を保ちながら内部実装を分割されたモジュールに置き換え
 */
export class ActionSpecificCollector {
  private orchestrator: CollectionOrchestrator;
  private configManager: CollectionConfigManager;
  private testMode: boolean;
  private useMultipleSources: boolean;

  constructor(configPath?: string, useMultipleSources: boolean = true) {
    this.testMode = process.env.X_TEST_MODE === 'true';
    this.useMultipleSources = useMultipleSources;
    
    // 新しいモジュラーコンポーネントを初期化
    this.orchestrator = new CollectionOrchestrator();
    this.configManager = new CollectionConfigManager();
    
    // 設定を読み込み
    this.orchestrator.initialize(configPath);
    
    if (this.testMode) {
      console.log('🧪 [ActionSpecificCollector-New] テストモード有効');
    }
    
    if (this.useMultipleSources) {
      console.log('🔗 [ActionSpecificCollector-New] MultiSource統合モード有効');
    }
    
    console.log('✅ [ActionSpecificCollector-New] モジュラー初期化完了');
  }

  /**
   * メイン収集メソッド（後方互換性維持）
   */
  async collectForAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    context: IntegratedContext,
    targetSufficiency: number = 90
  ): Promise<ActionSpecificResult> {
    console.log(`🎯 [ActionSpecific-New] ${actionType}向け情報収集開始...`);
    
    try {
      return await this.orchestrator.collectForAction(actionType, context, targetSufficiency);
    } catch (error) {
      console.error(`❌ [ActionSpecific-New] 収集エラー:`, error);
      
      // フォールバック: テストモード結果を返す
      return this.generateFallbackResult(actionType, targetSufficiency);
    }
  }

  /**
   * トピック特化収集（新機能）
   */
  async collectForTopicSpecificAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    topic: string,
    context: IntegratedContext,
    targetSufficiency: number = 90
  ): Promise<ActionSpecificResult> {
    console.log(`🎯 [TopicSpecific-New] ${topic}に関する${actionType}向け情報収集開始...`);
    
    try {
      return await this.orchestrator.collectForTopicSpecificAction(
        actionType, 
        topic, 
        context, 
        targetSufficiency
      );
    } catch (error) {
      console.error(`❌ [TopicSpecific-New] 収集エラー:`, error);
      return this.generateFallbackResult(actionType, targetSufficiency);
    }
  }

  /**
   * 十分性評価（簡略化実装）
   */
  async evaluateCurrentSufficiency(
    currentResults: CollectionResult[],
    actionType: string,
    targetSufficiency: number
  ): Promise<SufficiencyEvaluation> {
    const currentSufficiency = Math.min((currentResults.length / 10) * 100, 100);
    
    return {
      currentSufficiency,
      targetSufficiency,
      recommendation: currentSufficiency >= targetSufficiency ? 'sufficient' : 'needs_more',
      details: {
        informationQuality: currentSufficiency > 80 ? 'high' : 'medium',
        sourcesDiversity: currentResults.length > 5 ? 'adequate' : 'needs_improvement',
        contentFreshness: 'recent',
        actionRelevance: currentSufficiency > 75 ? 'high' : 'medium'
      }
    };
  }

  /**
   * プリロード収集（レガシー互換性）
   */
  async preloadForAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    context: IntegratedContext
  ): Promise<ActionSpecificPreloadResult> {
    console.log(`🔄 [Preload-New] ${actionType}向けプリロード開始...`);
    
    const result = await this.collectForAction(actionType, context, 80); // 低い閾値でプリロード
    
    return {
      actionType,
      preloadedResults: result.results,
      timestamp: Date.now(),
      cacheKey: `preload-${actionType}-${Date.now()}`,
      expiresAt: Date.now() + (30 * 60 * 1000), // 30分
      qualitySnapshot: result.qualityEvaluation
    };
  }

  /**
   * 設定情報取得
   */
  getConfig(): ActionCollectionConfig | null {
    return this.configManager.getCurrentConfig();
  }

  /**
   * 拡張設定取得
   */
  getExtendedConfig(): ExtendedActionCollectionConfig | null {
    return this.configManager.getExtendedConfig();
  }

  /**
   * 利用可能なコレクター一覧
   */
  getAvailableCollectors(): string[] {
    return this.orchestrator.getAvailableCollectors();
  }

  /**
   * メトリクス取得
   */
  getPerformanceMetrics() {
    return this.orchestrator.getMetrics();
  }

  /**
   * テストモード確認
   */
  isTestMode(): boolean {
    return this.testMode;
  }

  /**
   * MultiSource機能確認
   */
  isMultiSourceEnabled(): boolean {
    return this.useMultipleSources;
  }

  /**
   * フォールバック結果生成
   */
  private generateFallbackResult(actionType: string, targetSufficiency: number): ActionSpecificResult {
    if (this.testMode) {
      return MockDataGenerator.generateMockActionResult(actionType);
    }
    
    const fallbackResults = MockDataGenerator.generateFallbackResults(actionType);
    
    return {
      actionType,
      results: fallbackResults,
      qualityEvaluation: {
        overallScore: 60,
        relevanceScore: 65,
        credibilityScore: 70,
        uniquenessScore: 55,
        timelinessScore: 60,
        feedback: 'フォールバック結果を使用しました',
        suggestions: ['ネットワーク接続を確認してください', '設定を見直してください']
      },
      collectionStats: {
        totalResults: fallbackResults.length,
        uniqueResults: fallbackResults.length,
        processingTimeMs: 100,
        sourcesUsed: ['fallback']
      },
      sufficiencyEvaluation: {
        currentSufficiency: 50,
        targetSufficiency,
        recommendation: 'fallback_used',
        details: {
          informationQuality: 'medium',
          sourcesDiversity: 'limited',
          contentFreshness: 'fallback',
          actionRelevance: 'basic'
        }
      }
    };
  }

  /**
   * 旧APIとの互換性メソッド群（必要に応じて実装）
   */

  // 従来の内部メソッドは削除またはプライベート化
  // 外部から直接呼ばれていたメソッドのみ互換性を保つ

  /**
   * 手動での品質評価（レガシー互換）
   */
  evaluateCollectionQuality(results: CollectionResult[]): QualityEvaluation {
    // CollectionUtilsを直接使用
    const CollectionUtils = require('./collectors/utils/collection-utils.js').CollectionUtils;
    return CollectionUtils.evaluateQuality(results);
  }

  /**
   * 重複除去（レガシー互換）
   */
  removeDuplicates(results: CollectionResult[]): CollectionResult[] {
    const CollectionUtils = require('./collectors/utils/collection-utils.js').CollectionUtils;
    return CollectionUtils.removeDuplicates(results);
  }

  /**
   * ライフサイクル管理
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [ActionSpecific-New] クリーンアップ開始...');
    // 必要に応じてリソース解放処理を実装
    console.log('✅ [ActionSpecific-New] クリーンアップ完了');
  }
}

// 旧クラスとの互換性のためのエクスポート
export { ActionSpecificCollector as NewActionSpecificCollector };

// デフォルトエクスポートも提供
export default ActionSpecificCollector;