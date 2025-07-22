import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { AutonomousConfig } from '../types/autonomous-config';

// 軽量最適化設定読み込み（claude-summary.yaml優先）
export function loadOptimizedConfig() {
  const claudeSummaryPath = 'data/claude-summary.yaml';
  const systemStatePath = 'data/core/system-state.yaml';
  const configPath = 'data/autonomous-config.yaml';
  
  try {
    // 1. 最優先: claude-summary.yaml (30行)
    if (existsSync(claudeSummaryPath)) {
      const summaryContent = readFileSync(claudeSummaryPath, 'utf8');
      const summary = yaml.load(summaryContent) as any;
      
      if (summary) {
        console.log('✅ [最適化設定] claude-summary.yamlから軽量データを読み込み');
        
        // 2. 必要に応じて: system-state.yaml (15行)  
        let systemState = null;
        if (existsSync(systemStatePath)) {
          const systemStateContent = readFileSync(systemStatePath, 'utf8');
          systemState = yaml.load(systemStateContent) as any;
        }
        
        return { summary, systemState, autonomousConfig: null };
      }
    }
    
    // 3. フォールバック: autonomous-config.yaml
    console.log('⚠️ [フォールバック] claude-summary.yaml不在、autonomous-config.yamlを使用');
    const autonomousConfig = loadAutonomousConfig();
    return { summary: null, systemState: null, autonomousConfig };
    
  } catch (error) {
    console.error('❌ [設定読み込みエラー]:', error);
    console.log('🔧 [緊急フォールバック] デフォルト設定を使用');
    return { summary: null, systemState: null, autonomousConfig: DEFAULT_AUTONOMOUS_CONFIG };
  }
}

export function loadAutonomousConfig(): AutonomousConfig {
  const configPath = 'data/autonomous-config.yaml';
  
  if (!existsSync(configPath)) {
    throw new Error(`Autonomous config file not found: ${configPath}`);
  }
  
  const configContent = readFileSync(configPath, 'utf8');
  const config = yaml.load(configContent) as AutonomousConfig;
  
  // 設定値検証
  if (!config.execution || !config.autonomous_system) {
    throw new Error('Invalid autonomous config structure');
  }
  
  return config;
}

// 軽量設定を従来形式に変換するヘルパー関数
export function convertOptimizedToAutonomous(optimizedConfig: any): AutonomousConfig {
  if (optimizedConfig.summary) {
    const summary = optimizedConfig.summary;
    return {
      execution: {
        mode: summary.system?.mode || 'scheduled_posting',
        posting_interval_minutes: summary.system?.posting_interval || 60,
        health_check_enabled: summary.system?.health_check_enabled ?? true,
        maintenance_enabled: summary.system?.maintenance_enabled ?? true
      },
      autonomous_system: {
        max_parallel_tasks: summary.system?.max_parallel_tasks || 3,
        context_sharing_enabled: summary.system?.context_sharing ?? true,
        decision_persistence: summary.system?.decision_persistence ?? false
      },
      claude_integration: {
        sdk_enabled: true,
        max_context_size: summary.system?.max_context_size || 50000
      },
      data_management: {
        cleanup_interval: 3600000,
        max_history_entries: 100
      }
    };
  }
  
  return optimizedConfig.autonomousConfig || DEFAULT_AUTONOMOUS_CONFIG;
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  execution: {
    mode: 'scheduled_posting',
    posting_interval_minutes: 60,
    health_check_enabled: true,
    maintenance_enabled: true
  },
  autonomous_system: {
    max_parallel_tasks: 3,
    context_sharing_enabled: true,
    decision_persistence: false
  },
  claude_integration: {
    sdk_enabled: true,
    max_context_size: 50000
  },
  data_management: {
    cleanup_interval: 3600000,
    max_history_entries: 100
  }
};