/**
 * Claude SDK の完全モック実装
 * 実際のClaude API呼び出しを完全禁止、全てモック化
 */

import { vi } from 'vitest';

export const mockClaude = {
  withModel: vi.fn().mockReturnThis(),
  withTimeout: vi.fn().mockReturnThis(), 
  query: vi.fn().mockReturnThis(),
  asText: vi.fn()
};

// デフォルトのモック応答
export const defaultMockResponses = {
  decision: JSON.stringify({
    action: 'wait',
    reasoning: 'テスト用のモック決定',
    confidence: 0.8,
    parameters: {
      duration: 1800000,
      reason: 'test_wait'
    }
  }),
  
  content: 'これはテスト用のモックコンテンツです。投資教育に関する高品質な内容をClaude SDKが生成したという想定です。',
  
  analysis: JSON.stringify({
    insights: ['テスト用洞察1', 'テスト用洞察2'],
    recommendations: ['テスト用推奨事項1', 'テスト用推奨事項2'],
    confidence: 0.9
  }),
  
  search: JSON.stringify({
    query: '投資 教育 初心者 -spam',
    exclude: ['spam', '詐欺'],
    engagement_min: 10,
    time_range: '24h',
    reasoning: 'テスト用検索クエリ生成',
    priority: 0.8,
    expectedResults: 20
  })
};

// Claude SDK モック関数の設定
export function setupClaudeMock(responseType: keyof typeof defaultMockResponses = 'decision') {
  mockClaude.asText.mockResolvedValue(defaultMockResponses[responseType]);
  return mockClaude;
}

// カスタムレスポンス設定
export function setupClaudeMockWithResponse(response: string) {
  mockClaude.asText.mockResolvedValue(response);
  return mockClaude;
}

// エラー発生のモック設定
export function setupClaudeMockError(error: Error = new Error('Claude API mock error')) {
  mockClaude.asText.mockRejectedValue(error);
  return mockClaude;
}

// モック状態リセット
export function resetClaudeMock() {
  vi.clearAllMocks();
  mockClaude.withModel.mockReturnThis();
  mockClaude.withTimeout.mockReturnThis();
  mockClaude.query.mockReturnThis();
}

// 実際のClaude SDKインポートのモック置換
vi.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  claude: () => mockClaude
}));