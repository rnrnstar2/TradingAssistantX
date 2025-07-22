export interface PostingData {
  version: string;
  lastUpdated: string;
  posting_history: Array<{
    id: string;
    content: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }>;
  execution_summary: {
    total_posts: number;
    successful_posts: number;
    failed_posts: number;
    last_execution: number;
  };
  current_status: {
    is_running: boolean;
    last_error: string | null;
    next_scheduled: number | null;
  };
}