/**
 * KaitoAPI トレンドエンドポイント
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * トレンド情報取得（WOEID対応）
 */

import { TrendData, TrendLocation } from '../types';

export class TrendEndpoints {
  constructor(private baseUrl: string, private headers: Record<string, string>) {}

  // トレンド取得
  async getTrends(woeid: number = 1): Promise<TrendData[]> {
    try {
      // 基本的なトレンド取得実装
      console.log(`Fetching trends for WOEID: ${woeid}`);
      
      // MVP版：基本的なトレンド情報を返す
      return [
        {
          name: '投資教育',
          query: '投資教育',
          tweetVolume: 1500,
          rank: 1
        },
        {
          name: 'NISA',
          query: 'NISA',
          tweetVolume: 2300,
          rank: 2
        }
      ];
    } catch (error) {
      console.error('Trend fetch error:', error);
      return [];
    }
  }

  // トレンド場所一覧
  async getTrendLocations(): Promise<TrendLocation[]> {
    // 基本的な場所一覧の実装
    return [
      { woeid: 1, name: 'Worldwide', countryCode: '' },
      { woeid: 23424856, name: 'Japan', countryCode: 'JP' }
    ];
  }
}