export interface ContentStrategy {
  version: string;
  lastUpdated: string;
  content_themes: {
    primary: string[];
    educational_patterns: string[];
    engagement_patterns: string[];
  };
  posting_strategy: {
    frequency: number;
    optimal_times: string[];
    tone_of_voice: string;
    avoid_topics: string[];
  };
  content_templates: Array<{
    type: string;
    format: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  target_audience: {
    demographics: string[];
    interests: string[];
    pain_points: string[];
  };
  engagement_tactics: {
    primary: string[];
    content_focus: string[];
  };
}