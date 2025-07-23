// MVP YAML Types - Minimal definitions for runtime compatibility

export interface YAMLData {
  [key: string]: any;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalPosts: number;
  insights: string[];
}