export interface AutonomousConfig {
  execution: {
    mode: 'scheduled_posting' | 'dynamic_analysis';
    posting_interval_minutes: number;
    health_check_enabled: boolean;
    maintenance_enabled: boolean;
  };
  autonomous_system: {
    max_parallel_tasks: number;
    context_sharing_enabled: boolean;
    decision_persistence: boolean;
  };
  claude_integration: {
    sdk_enabled: boolean;
    max_context_size: number;
  };
  data_management: {
    cleanup_interval: number;
    max_history_entries: number;
  };
}