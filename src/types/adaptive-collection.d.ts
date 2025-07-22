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