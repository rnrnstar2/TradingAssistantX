# TASK-001: ActionSpecificCollector コアシステム実装

## 🎯 実装目標

Claude主導による「自律的判断×目的特化収集」システムの核心機能を実装し、X自動化システムの情報収集能力を革新的に向上させる。

## 📋 実装概要

アクション種別（original_post, quote_tweet, retweet, reply）に特化した情報収集システムを構築し、既存のEnhancedInfoCollectorを基盤として、Claude判断による動的情報収集を実現する。

## 🔧 実装詳細

### 1. ActionSpecificCollectorクラス実装

**ファイルパス**: `src/lib/action-specific-collector.ts`

#### 基本クラス構造
```typescript
import { CollectionTarget, CollectionResult, ActionSuggestion, IntegratedContext } from '../types/autonomous-system';
import { Claude } from '@anthropic-ai/sdk';
import { PlaywrightBrowser } from './playwright-browser';

export class ActionSpecificCollector {
  private claude: Claude;
  private browser: PlaywrightBrowser;
  private config: ActionCollectionConfig;

  constructor(claude: Claude, browser: PlaywrightBrowser, config?: ActionCollectionConfig) {
    this.claude = claude;
    this.browser = browser;
    this.config = config || this.loadDefaultConfig();
  }

  // メイン収集メソッド
  async collectForAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    context: IntegratedContext,
    targetSufficiency: number = 85
  ): Promise<ActionSpecificResult>

  // Claude判断による動的収集継続
  private async evaluateCollectionSufficiency(
    actionType: string,
    currentResults: CollectionResult[],
    targetSufficiency: number
  ): Promise<SufficiencyEvaluation>

  // アクション特化型収集戦略生成
  private async generateCollectionStrategy(
    actionType: string,
    context: IntegratedContext
  ): Promise<CollectionStrategy>

  // 情報収集実行（Claude-Playwright連鎖）
  private async executeCollectionChain(
    strategy: CollectionStrategy,
    maxIterations: number = 3
  ): Promise<CollectionResult[]>

  // 品質・関連性評価
  private async evaluateCollectionQuality(
    results: CollectionResult[],
    actionType: string
  ): Promise<QualityEvaluation>
}
```

#### 必須インターフェース定義
```typescript
interface ActionCollectionConfig {
  strategies: {
    original_post: ActionCollectionStrategy;
    quote_tweet: ActionCollectionStrategy;
    retweet: ActionCollectionStrategy;
    reply: ActionCollectionStrategy;
  };
  sufficiencyThresholds: Record<string, number>;
  maxExecutionTime: number;
  qualityStandards: QualityStandards;
}

interface ActionCollectionStrategy {
  priority: number;
  focusAreas: string[];
  sources: SourceConfig[];
  collectMethods: CollectMethod[];
  sufficiencyTarget: number;
}

interface ActionSpecificResult {
  actionType: string;
  results: CollectionResult[];
  sufficiencyScore: number;
  executionTime: number;
  strategyUsed: CollectionStrategy;
  qualityMetrics: QualityEvaluation;
}

interface SufficiencyEvaluation {
  score: number;
  shouldContinue: boolean;
  reasoning: string;
  suggestedActions: string[];
}

interface CollectionStrategy {
  actionType: string;
  targets: CollectionTarget[];
  priority: 'high' | 'medium' | 'low';
  expectedDuration: number;
  searchTerms: string[];
  sources: string[];
}
```

### 2. YAML設定ファイル実装

**ファイルパス**: `data/action-collection-strategies.yaml`

#### 設定ファイル構造
```yaml
version: "1.0.0"
system:
  maxExecutionTime: 90  # 90秒制限
  sufficiencyThreshold: 85  # 85%充足度目標
  qualityMinimum: 75  # 最低品質スコア

strategies:
  original_post:
    priority: 60  # 60%配分
    focusAreas:
      - "独自洞察発見"
      - "市場分析情報"
      - "教育的価値"
      - "投稿機会特定"
    sources:
      - name: "market_trends"
        url: "https://finance.yahoo.com"
        priority: "high"
        searchPatterns: ["crypto", "trading", "market"]
      - name: "educational_content"
        url: "https://www.investopedia.com"
        priority: "medium"
        searchPatterns: ["basics", "strategy", "analysis"]
    collectMethods:
      - "trend_analysis"
      - "educational_gap_identification"
      - "market_opportunity_scan"
    sufficiencyTarget: 90

  quote_tweet:
    priority: 25  # 25%配分
    focusAreas:
      - "候補ツイート検索"
      - "付加価値分析"
      - "エンゲージメント評価"
    sources:
      - name: "twitter_trends"
        url: "https://x.com/explore"
        priority: "high"
        searchPatterns: ["trending", "viral", "discussion"]
      - name: "influencer_content"
        url: "https://x.com/search"
        priority: "medium"
        searchPatterns: ["finance", "crypto", "trading"]
    collectMethods:
      - "candidate_tweet_search"
      - "engagement_analysis"
      - "value_addition_assessment"
    sufficiencyTarget: 85

  retweet:
    priority: 10  # 10%配分
    focusAreas:
      - "信頼性検証"
      - "価値評価"
      - "リスク分析"
    sources:
      - name: "verified_accounts"
        url: "https://x.com/search"
        priority: "high"
        filters: ["verified", "authority"]
      - name: "quality_content"
        url: "https://x.com/explore"
        priority: "medium"
        filters: ["engagement", "educational"]
    collectMethods:
      - "credibility_check"
      - "value_assessment"
      - "risk_evaluation"
    sufficiencyTarget: 80

  reply:
    priority: 5  # 5%配分
    focusAreas:
      - "エンゲージメント機会"
      - "コミュニティ参加"
      - "価値提供"
    sources:
      - name: "community_discussions"
        url: "https://x.com/search"
        priority: "high"
        filters: ["questions", "discussions"]
    collectMethods:
      - "engagement_opportunity_scan"
      - "community_value_assessment"
    sufficiencyTarget: 75

qualityStandards:
  relevanceScore: 80
  credibilityScore: 85
  uniquenessScore: 70
  timelinessScore: 90
```

### 3. 統合テスト実装

**ファイルパス**: `tests/unit/action-specific-collector.test.ts`

#### テストカバレッジ
```typescript
describe('ActionSpecificCollector', () => {
  describe('collectForAction', () => {
    test('original_post: 独自洞察発見に特化した情報収集', async () => {
      // テスト実装
    });
    
    test('quote_tweet: 候補ツイート検索と付加価値分析', async () => {
      // テスト実装
    });
    
    test('retweet: 信頼性検証と価値評価', async () => {
      // テスト実装
    });
    
    test('reply: エンゲージメント機会の特定', async () => {
      // テスト実装
    });
  });

  describe('evaluateCollectionSufficiency', () => {
    test('85%充足度に達するまでの継続判断', async () => {
      // テスト実装
    });
  });

  describe('executeCollectionChain', () => {
    test('Claude-Playwright連鎖サイクルの動作確認', async () => {
      // テスト実装
    });
  });
});
```

## 🚀 実装順序

1. **型定義拡張**: `src/types/autonomous-system.ts` に必要なインターフェース追加
2. **YAML設定**: `data/action-collection-strategies.yaml` 作成
3. **コアクラス**: `ActionSpecificCollector` 実装
4. **単体テスト**: 主要メソッドのテスト作成
5. **設定読み込み**: YAML設定ファイル読み込み機能
6. **品質検証**: TypeScript型チェック、lint通過確認

## 📊 品質基準

### TypeScript要件
- strict mode完全対応
- 全メソッドの型安全性確保
- interface定義の完全性

### 機能要件
- 4つのアクション種別への完全対応
- 85%充足度目標の確実な達成
- 90秒以内の実行時間制限遵守
- Claude判断による動的収集継続

### テスト要件
- 主要メソッドの単体テスト実装
- アクション種別ごとのテストケース
- エラーハンドリングのテスト

## 🔄 出力管理

**出力先**: `tasks/20250721-152119/outputs/`
**命名規則**: `TASK-001-action-specific-collector-{component}.{ext}`

**成果物**:
- `TASK-001-action-specific-collector-core.ts`
- `TASK-001-action-specific-collector-config.yaml`
- `TASK-001-action-specific-collector-tests.ts`
- `TASK-001-action-specific-collector-types.ts`

## ✅ 完了条件

1. ActionSpecificCollectorクラスの完全実装
2. YAML設定ファイルの作成と検証
3. 型定義の追加と型安全性確保
4. 単体テストの実装と通過
5. TypeScript型チェック・lint通過
6. 実装報告書の作成

## 📋 報告書作成

実装完了後、以下の報告書を作成してください：
**報告書パス**: `tasks/20250721-152119/reports/REPORT-001-action-specific-collector-core.md`

**報告書内容**:
- 実装内容の詳細
- テスト結果
- 既存システムとの統合ポイント
- 次ステップ（Worker2との連携）に向けた準備状況

---

**重要**: この実装は「Claude主導による自律的判断×目的特化収集」システムの核心です。品質を最優先とし、制限や妥協は一切行わないでください。