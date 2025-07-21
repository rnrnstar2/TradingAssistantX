export interface AccountConfig {
  version: string;
  lastUpdated: number;
  account: {
    username: string;
    user_id: string;
    display_name: string;
    verified: boolean;
  };
  current_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    last_updated: number;
  };
  growth_targets: {
    followers: {
      current: number;
      daily: number;
      weekly: number;
      monthly: number;
      quarterly: number;
    };
    engagement: {
      likesPerPost: number;
      retweetsPerPost: number;
      repliesPerPost: number;
      engagementRate: number;
    };
    reach: {
      viewsPerPost: number;
      impressionsPerDay: number;
    };
  };
  progress: {
    followersGrowth: number;
    engagementGrowth: number;
    reachGrowth: number;
    overallScore: number;
    trend: 'ontrack' | 'ahead' | 'behind';
  };
  history: {
    metrics_history: Array<{
      timestamp: number;
      followers_count: number;
    }>;
  };
}