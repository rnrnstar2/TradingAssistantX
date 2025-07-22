# TASK-001: 自律探索エンジン実装

## 🎯 核心目的
FXサイトの**連鎖的リンク探索**を行う自律エンジンを実装。トップページから興味深いリンクを発見し、価値ある情報を深掘り収集する。

## 🔍 技術要件

### 実装対象ファイル
- `src/lib/autonomous-exploration-engine.ts` - メインエンジン
- `src/lib/exploration/link-evaluator.ts` - リンク評価器
- `src/lib/exploration/content-analyzer.ts` - コンテンツ分析器
- `src/types/exploration-types.ts` - 型定義

### 核心機能

#### 1. 探索エンジン本体
```typescript
class AutonomousExplorationEngine {
  // メイン探索実行
  async exploreFromSeed(seedUrl: string, maxDepth: number = 2): Promise<ExplorationResult>
  
  // リンク発見・評価
  private async discoverLinks(pageContent: string, currentUrl: string): Promise<EvaluatedLink[]>
  
  // 興味深いリンクのフィルタリング  
  private async selectInterestingLinks(links: EvaluatedLink[]): Promise<EvaluatedLink[]>
  
  // 再帰的探索実行
  private async exploreRecursively(link: EvaluatedLink, depth: number): Promise<ContentResult[]>
}
```

#### 2. リンク評価システム
```typescript
class LinkEvaluator {
  // FX関連度スコアリング（0-100）
  evaluateRelevance(linkText: string, linkUrl: string): number
  
  // 探索価値判定
  assessExplorationValue(link: ParsedLink): ExplorationScore
  
  // 優先度ランキング
  rankLinksByPriority(links: ParsedLink[]): RankedLink[]
}

interface ExplorationScore {
  relevanceScore: number;    // FX関連度
  noveltyScore: number;      // 新規性
  depthValue: number;        // 深掘り価値
  urgencyScore: number;      // 緊急度
}
```

#### 3. コンテンツ分析器
```typescript
class ContentAnalyzer {
  // ページからFX関連情報を抽出
  extractFXContent(html: string, url: string): FXContentResult
  
  // 記事の品質評価
  evaluateContentQuality(content: string): QualityMetrics
  
  // 投稿価値判定
  assessPostingValue(content: FXContentResult): PostingValueScore
}

interface FXContentResult {
  title: string;
  summary: string;
  keyPoints: string[];
  marketData?: MarketDataPoint[];
  economicIndicators?: EconomicEvent[];
  expertOpinions?: ExpertComment[];
  publishedAt?: Date;
  confidence: number;
}
```

## 🌐 探索対象サイト設定

### 高優先度探索サイト
```typescript
const EXPLORATION_SEEDS = {
  // みんかぶFX - 高価値記事多数
  minkabu: {
    url: "https://fx.minkabu.jp/news",
    depth: 3,
    interestKeywords: ["市場分析", "経済指標", "中央銀行", "要人発言"]
  },
  
  // ZAi FX - 専門解説豊富
  zai: {
    url: "https://zai.diamond.jp/fx/news", 
    depth: 2,
    interestKeywords: ["今日の為替", "市況レポート", "専門家コメント"]
  },
  
  // ロイター - 速報性重視
  reuters: {
    url: "https://jp.reuters.com/news/archive/jp-markets-news",
    depth: 2,
    interestKeywords: ["為替", "日銀", "FRB", "ECB", "市場見通し"]
  }
}
```

### リンク選択ロジック
```typescript
// 興味深いリンクの自律判定基準
const LINK_INTEREST_PATTERNS = {
  // 高価値キーワード
  highValue: [
    /今日の.*為替/,
    /市場.*見通し/,
    /経済指標.*結果/,
    /中央銀行.*発表/,
    /ドル円.*分析/,
    /FOMC.*決定/
  ],
  
  // 探索継続キーワード
  continueExploration: [
    /詳細.*記事/,
    /続き.*読む/,
    /分析.*レポート/,
    /専門家.*コメント/
  ],
  
  // 除外パターン
  exclude: [
    /広告/,
    /PR記事/,
    /口座開設/,
    /キャンペーン/
  ]
}
```

## 🔧 実装仕様

### データ収集方式の自律選択
```typescript
enum CollectionMethod {
  SIMPLE_HTTP = 'simple_http',      // axios + cheerio
  PLAYWRIGHT_LIGHT = 'playwright',  // 動的コンテンツ対応
  API_DIRECT = 'api_direct'         // 公式API利用
}

class MethodSelector {
  // サイト特性に応じた手法選択
  selectOptimalMethod(url: string, siteCharacteristics: SiteProfile): CollectionMethod
}
```

### エラーハンドリング・回復機能
```typescript
interface ExplorationConfig {
  maxRetries: 3;
  requestTimeout: 10000;
  respectRobotsTxt: true;
  delayBetweenRequests: 2000;
  maxConcurrentRequests: 3;
  userAgent: "TradingAssistantX/1.0 FX Information Collector";
}
```

### 出力フォーマット
```typescript
interface ExplorationResult {
  seedUrl: string;
  totalLinksDiscovered: number;
  exploredLinks: number;
  contentResults: ContentResult[];
  executionTime: number;
  explorationStats: ExplorationStats;
}

interface ContentResult {
  url: string;
  depth: number;
  content: FXContentResult;
  collectionMethod: CollectionMethod;
  explorationPath: string[];  // どのリンクを辿ったか
}
```

## 🚀 実装フロー

### Phase 1: 基盤構築
1. 型定義作成（exploration-types.ts）
2. 基本クラス骨格実装
3. 設定ファイル読み込み機能

### Phase 2: 探索ロジック実装
1. LinkEvaluatorの実装
2. ContentAnalyzerの実装  
3. 再帰探索アルゴリズムの実装

### Phase 3: 最適化・エラーハンドリング
1. パフォーマンス最適化
2. 堅牢なエラー処理
3. ログ出力・デバッグ機能

## ⚡ パフォーマンス制約

### リソース効率化
- **探索時間制限**: 最大30秒
- **最大探索depth**: 3階層まで
- **同時リクエスト**: 最大3個
- **メモリ使用量**: 50MB以下

### 品質保証
- **最低収集コンテンツ**: 5記事以上
- **関連度スコア**: 平均70点以上
- **重複排除**: 類似コンテンツの自動除去

## 📤 出力先

### ファイル出力
- **実装コード**: 上記指定パス
- **テスト結果**: `tasks/20250721_233822_autonomous_fx_collection_mvp/outputs/exploration-test-results.json`
- **探索ログ**: `tasks/20250721_233822_autonomous_fx_collection_mvp/outputs/exploration-logs.txt`

### レポート作成
実装完了後、以下を含む報告書を作成:
- 探索エンジンの動作確認結果
- パフォーマンステスト結果  
- 実際のサイト探索デモ実行
- 改善提案・課題点

## 🔍 動作確認手順

### 基本動作テスト
```bash
# 単体テスト実行
npm run test src/lib/autonomous-exploration-engine.test.ts

# 実際のサイト探索テスト（Dry-run）
npm run test:exploration -- --site=minkabu --depth=2 --dry-run

# パフォーマンステスト
npm run test:performance -- --target=exploration-engine
```

### 実探索デモ
みんかぶFXから2階層探索を実行し、発見されたコンテンツをログ出力して動作確認。

## ⚠️ 制約・注意事項

### 技術制約
- **TypeScript strict**: すべてのコードでstrict対応必須
- **ESModules**: import/export使用
- **エラー境界**: 個別サイトエラーでも全体継続
- **Rate Limiting**: 各サイトのrobot.txt遵守

### MVP制約遵守
- 過度な最適化禁止（シンプル実装を優先）
- 統計機能・分析機能は最小限
- 設定可能項目は必要最小限に絞る
- 将来拡張性よりも現在動作を重視

このエンジンにより、トップページから価値あるFX情報を自律発見し、効率的な深掘り収集を実現します。