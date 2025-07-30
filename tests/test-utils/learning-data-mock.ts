/**
 * 学習データ用モックデータ生成ユーティリティ
 * 新構造対応 - 2ファイル学習データ構成
 */

import type { LearningData, EngagementMetrics } from '../../src/shared/data-manager';

// ============================================================================
// 学習データ - 2ファイル構成対応
// ============================================================================

/**
 * エンゲージメントパターンのモックデータ作成
 */
export function createMockEngagementPatterns(): LearningData['engagementPatterns'] {
  return {
    timeSlots: {
      '07:00-10:00': { successRate: 0.85, avgEngagement: 4.2, sampleSize: 15 },
      '12:00-14:00': { successRate: 0.72, avgEngagement: 3.1, sampleSize: 12 },
      '18:00-20:00': { successRate: 0.91, avgEngagement: 5.1, sampleSize: 18 },
      '20:00-22:00': { successRate: 0.78, avgEngagement: 3.8, sampleSize: 10 },
      'other': { successRate: 0.45, avgEngagement: 2.0, sampleSize: 8 }
    },
    contentTypes: {
      'post': { successRate: 0.75, avgEngagement: 3.5, sampleSize: 25 },
      'retweet': { successRate: 0.65, avgEngagement: 2.8, sampleSize: 30 },
      'quote_tweet': { successRate: 0.82, avgEngagement: 4.1, sampleSize: 15 },
      'like': { successRate: 0.90, avgEngagement: 1.5, sampleSize: 40 }
    },
    topics: {
      'NISA活用法': { successRate: 0.91, avgEngagement: 5.2, sampleSize: 12 },
      '投資信託基礎': { successRate: 0.88, avgEngagement: 4.8, sampleSize: 10 },
      '仮想通貨解説': { successRate: 0.73, avgEngagement: 3.9, sampleSize: 8 },
      'リスク管理': { successRate: 0.85, avgEngagement: 4.5, sampleSize: 15 },
      '市場分析': { successRate: 0.67, avgEngagement: 3.2, sampleSize: 20 }
    }
  };
}

/**
 * 成功トピックスのモックデータ作成
 */
export function createMockSuccessfulTopics(): LearningData['successfulTopics'] {
  return {
    topics: [
      {
        topic: 'NISA活用法',
        successRate: 0.91,
        avgEngagement: 5.2,
        bestTimeSlots: ['07:00-10:00', '18:00-20:00']
      },
      {
        topic: '投資信託基礎',
        successRate: 0.88,
        avgEngagement: 4.8,
        bestTimeSlots: ['18:00-20:00']
      },
      {
        topic: 'リスク管理',
        successRate: 0.85,
        avgEngagement: 4.5,
        bestTimeSlots: ['07:00-10:00', '20:00-22:00']
      },
      {
        topic: '仮想通貨解説',
        successRate: 0.73,
        avgEngagement: 3.9,
        bestTimeSlots: ['12:00-14:00', '18:00-20:00']
      },
      {
        topic: '市場分析',
        successRate: 0.67,
        avgEngagement: 3.2,
        bestTimeSlots: ['07:00-10:00']
      }
    ]
  };
}

/**
 * 完全な学習データのモック作成（2ファイル統合）
 */
export function createMockLearningData(): LearningData {
  return {
    engagementPatterns: createMockEngagementPatterns(),
    successfulTopics: createMockSuccessfulTopics()
  };
}

// ============================================================================
// エラー・エッジケース用モックデータ
// ============================================================================

/**
 * 空の学習データ（初期状態）
 */
export function createEmptyLearningData(): LearningData {
  return {
    engagementPatterns: {
      timeSlots: {},
      contentTypes: {},
      topics: {}
    },
    successfulTopics: {
      topics: []
    }
  };
}

/**
 * 部分的なエンゲージメントパターン（一部データ欠損）
 */
export function createPartialEngagementPatterns(): LearningData['engagementPatterns'] {
  return {
    timeSlots: {
      '07:00-10:00': { successRate: 0.85, avgEngagement: 4.2, sampleSize: 5 }
      // 他の時間帯のデータが欠損
    },
    contentTypes: {
      'post': { successRate: 0.75, avgEngagement: 3.5, sampleSize: 10 }
      // 他のコンテンツタイプのデータが欠損
    },
    topics: {
      'NISA活用法': { successRate: 0.91, avgEngagement: 5.2, sampleSize: 3 }
      // 他のトピックのデータが欠損
    }
  };
}

/**
 * 低品質な学習データ（サンプルサイズが小さい）
 */
export function createLowQualityLearningData(): LearningData {
  return {
    engagementPatterns: {
      timeSlots: {
        '07:00-10:00': { successRate: 0.85, avgEngagement: 4.2, sampleSize: 1 },
        '12:00-14:00': { successRate: 0.72, avgEngagement: 3.1, sampleSize: 1 }
      },
      contentTypes: {
        'post': { successRate: 0.75, avgEngagement: 3.5, sampleSize: 2 }
      },
      topics: {
        'NISA活用法': { successRate: 0.91, avgEngagement: 5.2, sampleSize: 1 }
      }
    },
    successfulTopics: {
      topics: [
        {
          topic: 'NISA活用法',
          successRate: 0.91,
          avgEngagement: 5.2,
          bestTimeSlots: ['07:00-10:00']
        }
      ]
    }
  };
}

/**
 * 破損した学習データ（不正な値）
 */
export function createCorruptedLearningData(): any {
  return {
    engagementPatterns: {
      timeSlots: {
        '07:00-10:00': { successRate: -0.5, avgEngagement: 'invalid', sampleSize: 'not_a_number' }
      },
      contentTypes: null,
      topics: undefined
    },
    successfulTopics: {
      topics: 'not_an_array'
    }
  };
}

// ============================================================================
// テスト用ヘルパー関数
// ============================================================================

/**
 * 特定の時間帯に最適化された学習データ作成
 */
export function createOptimizedLearningDataForTimeSlot(timeSlot: string): LearningData {
  const learningData = createMockLearningData();
  
  // 指定時間帯の成功率を高く設定
  if (learningData.engagementPatterns.timeSlots[timeSlot]) {
    learningData.engagementPatterns.timeSlots[timeSlot].successRate = 0.95;
    learningData.engagementPatterns.timeSlots[timeSlot].avgEngagement = 6.0;
  }

  return learningData;
}

/**
 * 特定のトピックに最適化された学習データ作成
 */
export function createOptimizedLearningDataForTopic(topic: string): LearningData {
  const learningData = createMockLearningData();
  
  // 指定トピックの成功率を高く設定
  if (learningData.engagementPatterns.topics[topic]) {
    learningData.engagementPatterns.topics[topic].successRate = 0.95;
    learningData.engagementPatterns.topics[topic].avgEngagement = 6.0;
  }

  // 成功トピックスにも追加
  const existingTopic = learningData.successfulTopics.topics.find(t => t.topic === topic);
  if (existingTopic) {
    existingTopic.successRate = 0.95;
    existingTopic.avgEngagement = 6.0;
  } else {
    learningData.successfulTopics.topics.unshift({
      topic: topic,
      successRate: 0.95,
      avgEngagement: 6.0,
      bestTimeSlots: ['07:00-10:00', '18:00-20:00']
    });
  }

  return learningData;
}

/**
 * ランダムな学習データ生成（テストバリエーション用）
 */
export function createRandomLearningData(seed?: number): LearningData {
  const random = seed ? () => Math.sin(seed++) * 10000 - Math.floor(Math.sin(seed-1) * 10000) : Math.random;
  
  const timeSlots = ['07:00-10:00', '12:00-14:00', '18:00-20:00', '20:00-22:00'];
  const contentTypes = ['post', 'retweet', 'quote_tweet', 'like'];
  const topics = ['NISA活用法', '投資信託基礎', '仮想通貨解説', 'リスク管理', '市場分析'];

  const engagementPatterns: LearningData['engagementPatterns'] = {
    timeSlots: {},
    contentTypes: {},
    topics: {}
  };

  // ランダムな時間帯データ
  timeSlots.forEach(slot => {
    engagementPatterns.timeSlots[slot] = {
      successRate: random() * 0.5 + 0.5, // 0.5-1.0
      avgEngagement: random() * 3 + 2, // 2-5
      sampleSize: Math.floor(random() * 20) + 5 // 5-25
    };
  });

  // ランダムなコンテンツタイプデータ
  contentTypes.forEach(type => {
    engagementPatterns.contentTypes[type] = {
      successRate: random() * 0.5 + 0.5,
      avgEngagement: random() * 3 + 2,
      sampleSize: Math.floor(random() * 30) + 10
    };
  });

  // ランダムなトピックデータ
  topics.forEach(topic => {
    engagementPatterns.topics[topic] = {
      successRate: random() * 0.5 + 0.5,
      avgEngagement: random() * 3 + 2,
      sampleSize: Math.floor(random() * 15) + 5
    };
  });

  const successfulTopics: LearningData['successfulTopics'] = {
    topics: topics.map(topic => ({
      topic,
      successRate: random() * 0.5 + 0.5,
      avgEngagement: random() * 3 + 2,
      bestTimeSlots: timeSlots.filter(() => random() > 0.5).slice(0, 2)
    }))
  };

  return {
    engagementPatterns,
    successfulTopics
  };
}

// ============================================================================
// YAML形式モックデータ（ファイル保存テスト用）
// ============================================================================

/**
 * engagement-patterns.yaml形式のモックデータ（文字列）
 */
export function createMockEngagementPatternsYaml(): string {
  return `engagementPatterns:
  timeSlots:
    "07:00-10:00":
      successRate: 0.85
      avgEngagement: 4.2
      sampleSize: 15
    "12:00-14:00":
      successRate: 0.72
      avgEngagement: 3.1
      sampleSize: 12
    "18:00-20:00":
      successRate: 0.91
      avgEngagement: 5.1
      sampleSize: 18
  contentTypes:
    post:
      successRate: 0.75
      avgEngagement: 3.5
      sampleSize: 25
    retweet:
      successRate: 0.65
      avgEngagement: 2.8
      sampleSize: 30
  topics:
    "NISA活用法":
      successRate: 0.91
      avgEngagement: 5.2
      sampleSize: 12
    "投資信託基礎":
      successRate: 0.88
      avgEngagement: 4.8
      sampleSize: 10`;
}

/**
 * successful-topics.yaml形式のモックデータ（文字列）
 */
export function createMockSuccessfulTopicsYaml(): string {
  return `successfulTopics:
  topics:
    - topic: "NISA活用法"
      successRate: 0.91
      avgEngagement: 5.2
      bestTimeSlots:
        - "07:00-10:00"
        - "18:00-20:00"
    - topic: "投資信託基礎"
      successRate: 0.88
      avgEngagement: 4.8
      bestTimeSlots:
        - "18:00-20:00"
    - topic: "リスク管理"
      successRate: 0.85
      avgEngagement: 4.5
      bestTimeSlots:
        - "07:00-10:00"
        - "20:00-22:00"`;
}

/**
 * 破損したYAMLファイル内容（パースエラーテスト用）
 */
export function createCorruptedYamlContent(): string {
  return `engagementPatterns:
  timeSlots:
    "07:00-10:00"
      successRate: 0.85  # Missing colon
      avgEngagement: invalid_number
    - invalid_structure: true
  contentTypes: null_value_test
  topics:
    "NISA活用法": [
      this_should_be_object: but_is_array
    ]
  # Incomplete YAML structure`;
}