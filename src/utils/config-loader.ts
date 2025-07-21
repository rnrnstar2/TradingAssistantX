import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { AutonomousConfig } from '../types/autonomous-config';

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

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  execution: {
    mode: 'scheduled_posting',
    posting_interval_minutes: 96,
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