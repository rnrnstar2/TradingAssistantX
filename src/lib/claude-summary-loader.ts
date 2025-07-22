import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';

// 最適化されたシステムデータの型定義
export interface OptimizedSystemData {
  core_summary: {
    lastUpdated: string;
    systemHealth: number;
    currentPhase: string;
    priority_actions: string[];
  };
  account_status: {
    followers: number;
    engagement_rate: number;
    target_progress: string;
    health_status: string;
  };
  posting_strategy: {
    daily_target: number;
    completed_today: number;
    next_action: string;
    optimal_times: string[];
  };
  system_state?: {
    execution_mode: string;
    parallel_tasks: number;
    context_sharing: boolean;
  } | null;
  decision_context?: {
    recent_decisions: any[];
    strategy_adjustments: any[];
  } | null;
  fallback_mode: boolean;
  data_source: string;
}

export class ClaudeSummaryLoader {
  private summaryFile = 'data/claude-summary.yaml';
  private systemStateFile = 'data/core/system-state.yaml';
  private decisionContextFile = 'data/core/decision-context.yaml';
  
  /**
   * 最適化されたデータを読み込み（30行のclaude-summary.yamlを優先）
   * 必要に応じてsystem-state.yaml, decision-context.yamlを追加読み込み
   */
  async loadOptimizedData(): Promise<OptimizedSystemData> {
    console.log('📋 [Claude Summary Loader] 最適化データ読み込み開始...');
    
    try {
      // 1. 最優先: claude-summary.yaml (30行の軽量データ)
      const summaryData = await this.loadClaudeSummary();
      
      if (summaryData) {
        console.log('✅ [Claude Summary] claude-summary.yamlから軽量データを読み込み');
        
        // 2. 必要に応じて: system-state.yaml (15行)
        const systemState = await this.loadSystemState();
        
        // 3. 必要に応じて: decision-context.yaml
        const decisionContext = await this.loadDecisionContext();
        
        const optimizedData: OptimizedSystemData = {
          core_summary: {
            lastUpdated: summaryData.lastUpdated || new Date().toISOString(),
            systemHealth: summaryData.system?.current_health || 80,
            currentPhase: summaryData.system?.current_phase || 'active',
            priority_actions: summaryData.system?.priority_actions || ['posting', 'engagement']
          },
          account_status: {
            followers: summaryData.account?.followers || 0,
            engagement_rate: summaryData.account?.engagement_rate || 3,
            target_progress: summaryData.account?.target_progress || '0%',
            health_status: summaryData.account?.health_status || 'healthy'
          },
          posting_strategy: {
            daily_target: summaryData.posting?.daily_target || 15,
            completed_today: summaryData.posting?.completed_today || 0,
            next_action: summaryData.posting?.next_action || 'original_post',
            optimal_times: summaryData.posting?.optimal_times || ['09:00', '12:00', '19:00']
          },
          system_state: systemState,
          decision_context: decisionContext,
          fallback_mode: false,
          data_source: 'claude-summary.yaml'
        };
        
        console.log('📊 [最適化完了] データ統合完了', {
          health: optimizedData.core_summary.systemHealth,
          followers: optimizedData.account_status.followers,
          todayProgress: `${optimizedData.posting_strategy.completed_today}/${optimizedData.posting_strategy.daily_target}`
        });
        
        return optimizedData;
      }
      
    } catch (error) {
      console.error('❌ [Claude Summary読み込みエラー]:', error);
    }
    
    // フォールバック: 最小限のデフォルトデータ
    console.log('🔧 [フォールバック] デフォルトデータを使用');
    return await this.getFallbackData();
  }
  
  /**
   * claude-summary.yamlの読み込み
   */
  private async loadClaudeSummary(): Promise<any | null> {
    try {
      if (!existsSync(this.summaryFile)) {
        console.warn('⚠️ [Claude Summary] claude-summary.yamlが存在しません');
        return null;
      }
      
      const content = readFileSync(this.summaryFile, 'utf8');
      
      if (content.trim().length === 0) {
        console.warn('⚠️ [Claude Summary] claude-summary.yamlが空です');
        return null;
      }
      
      const data = yaml.load(content);
      
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ [Claude Summary] claude-summary.yamlの形式が無効です');
        return null;
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ [Claude Summary読み込み失敗]:', error);
      return null;
    }
  }
  
  /**
   * system-state.yamlの読み込み（オプション）
   */
  private async loadSystemState(): Promise<any | null> {
    try {
      if (!existsSync(this.systemStateFile)) {
        console.log('📋 [System State] system-state.yamlは存在しません（オプション）');
        return null;
      }
      
      const content = readFileSync(this.systemStateFile, 'utf8');
      const data = yaml.load(content);
      
      console.log('✅ [System State] system-state.yamlを読み込み');
      return data;
      
    } catch (error) {
      console.warn('⚠️ [System State読み込み警告]:', error);
      return null;
    }
  }
  
  /**
   * decision-context.yamlの読み込み（オプション）
   */
  private async loadDecisionContext(): Promise<any | null> {
    try {
      if (!existsSync(this.decisionContextFile)) {
        console.log('📋 [Decision Context] decision-context.yamlは存在しません（オプション）');
        return null;
      }
      
      const content = readFileSync(this.decisionContextFile, 'utf8');
      const data = yaml.load(content);
      
      console.log('✅ [Decision Context] decision-context.yamlを読み込み');
      return data;
      
    } catch (error) {
      console.warn('⚠️ [Decision Context読み込み警告]:', error);
      return null;
    }
  }
  
  /**
   * フォールバック用の最小限データ
   */
  private async getFallbackData(): Promise<OptimizedSystemData> {
    return {
      core_summary: {
        lastUpdated: new Date().toISOString(),
        systemHealth: 75,
        currentPhase: 'fallback',
        priority_actions: ['health_check', 'data_recovery']
      },
      account_status: {
        followers: 0,
        engagement_rate: 0,
        target_progress: '0%',
        health_status: 'unknown'
      },
      posting_strategy: {
        daily_target: 15,
        completed_today: 0,
        next_action: 'system_check',
        optimal_times: ['09:00', '12:00', '15:00', '18:00', '21:00']
      },
      system_state: null,
      decision_context: null,
      fallback_mode: true,
      data_source: 'fallback_default'
    };
  }
  
  /**
   * 現在のシステムヘルス状態を確認
   */
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  }> {
    try {
      const data = await this.loadOptimizedData();
      
      const issues: string[] = [];
      let score = data.core_summary.systemHealth;
      
      // データソースの確認
      if (data.fallback_mode) {
        issues.push('フォールバックモードで動作中');
        score = Math.min(score, 60);
      }
      
      // アカウント状態の確認
      if (data.account_status.followers === 0) {
        issues.push('フォロワー数データが取得できていません');
        score = Math.min(score, 70);
      }
      
      // 投稿進捗の確認
      const progressRate = data.posting_strategy.completed_today / data.posting_strategy.daily_target;
      if (progressRate < 0.3) {
        issues.push('今日の投稿進捗が低調です');
        score = Math.min(score, 80);
      }
      
      // 総合判定
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (score < 50) status = 'critical';
      else if (score < 75) status = 'warning';
      
      console.log(`🏥 [System Health] 総合ヘルス: ${status} (${score}点)`);
      
      return { status, score, issues };
      
    } catch (error) {
      console.error('❌ [System Health確認エラー]:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['システムヘルス確認に失敗しました']
      };
    }
  }
  
  /**
   * 最適化データが利用可能かどうかを確認
   */
  isOptimizedDataAvailable(): boolean {
    return existsSync(this.summaryFile);
  }
  
  /**
   * システム統計情報の取得
   */
  async getSystemStats(): Promise<{
    dataSource: string;
    filesSizes: { [key: string]: number };
    lastUpdate: string;
    fallbackMode: boolean;
  }> {
    const stats = {
      dataSource: 'unknown',
      filesSizes: {} as { [key: string]: number },
      lastUpdate: 'unknown',
      fallbackMode: true
    };
    
    try {
      // ファイルサイズの確認
      const filesToCheck = [
        this.summaryFile,
        this.systemStateFile,
        this.decisionContextFile
      ];
      
      for (const file of filesToCheck) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf8');
          stats.filesSizes[file] = content.length;
        }
      }
      
      // メインデータの確認
      if (existsSync(this.summaryFile)) {
        const data = await this.loadOptimizedData();
        stats.dataSource = data.data_source;
        stats.lastUpdate = data.core_summary.lastUpdated;
        stats.fallbackMode = data.fallback_mode;
      }
      
      console.log('📊 [システム統計]', stats);
      
    } catch (error) {
      console.error('❌ [統計取得エラー]:', error);
    }
    
    return stats;
  }
}

// Export singleton instance for convenience
export const claudeSummaryLoader = new ClaudeSummaryLoader();