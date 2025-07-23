// MVP Config Types - Minimal definitions for runtime compatibility

export interface SystemConfig {
  rss: {
    sources: RSSSource[];
    maxItems: number;
  };
  posting: {
    interval: number;
    enabled: boolean;
  };
}

export interface RSSSource {
  name: string;
  url: string;
  enabled: boolean;
}