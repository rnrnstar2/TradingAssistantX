# TASK-001: Claude SDK API的統合リファクタリング

## 🎯 タスク概要

現在の5ファイル分散実装を、REQUIREMENTS.mdに準拠した6ファイル・API的設計に統合リファクタリングします。

## 📋 現状分析

### 現在の問題点
- **ファイル構成不適合**: 5ファイル分散実装 vs 要求6ファイル構成
- **API的設計不足**: 直接結合設計 vs 要求疎結合設計  
- **型定義分散**: 各ファイルで個別定義 vs 統一型管理
- **統合エントリーポイント不在**: index.ts未実装

### 必要なリファクタリング
1. **src/claude/endpoints/** ディレクトリ作成
2. **4つのエンドポイント実装** (decision, content, analysis, search)
3. **types.ts** 統一型定義
4. **index.ts** エクスポート統合

## 🏗️ 実装要件

### ディレクトリ構造（REQUIREMENTS.md準拠）
```
src/claude/                           # Claude Code SDK - エンドポイント別設計 (6ファイル)
├── endpoints/                        # 役割別エンドポイント (4ファイル)
│   ├── decision-endpoint.ts          # 判断: プロンプト+変数+ClaudeDecision返却
│   ├── content-endpoint.ts           # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   ├── analysis-endpoint.ts          # 分析: プロンプト+変数+AnalysisResult返却
│   └── search-endpoint.ts            # 検索クエリ: プロンプト+変数+SearchQuery返却
├── types.ts                          # 各エンドポイントの返却型定義
└── index.ts                          # エクスポート統合
```

### API的設計原則
- **疎結合**: エンドポイント間の独立性確保
- **統一インターフェース**: 共通のAPI呼び出しパターン
- **型安全**: TypeScript strict準拠
- **エラーハンドリング**: 統一エラー処理

## 📝 詳細実装指示

### 1. decision-endpoint.ts 実装

**目的**: アクション判断のためのClaude呼び出し

**実装内容**:
```typescript
// 既存のClaudeDecisionEngineから判断ロジックを移行
// API的設計でプロンプト構築 + Claude呼び出し + 結果返却

export interface DecisionRequest {
  context: TwitterContext;
  learningData?: any;
  currentTime: Date;
}

export class DecisionEndpoint {
  async makeDecision(request: DecisionRequest): Promise<ClaudeDecision> {
    // プロンプト構築
    // Claude SDK呼び出し
    // 結果解析・検証
    // ClaudeDecision型で返却
  }
}
```

**移行元ファイル**: `decision-engine.ts`
**移行する機能**: makeDecision, executeClaudeDecision, parseClaudeResponse

### 2. content-endpoint.ts 実装

**目的**: 投稿コンテンツ生成のためのClaude呼び出し

**実装内容**:
```typescript
// 既存のContentGeneratorからコンテンツ生成ロジックを移行

export interface ContentRequest {
  topic: string;
  contentType: 'educational' | 'market_analysis' | 'trending';
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
  maxLength?: number;
}

export class ContentEndpoint {
  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    // プロンプト構築
    // Claude SDK呼び出し
    // 品質チェック
    // GeneratedContent型で返却
  }

  async generateQuoteComment(originalTweet: any): Promise<string> {
    // 引用コメント生成
  }
}
```

**移行元ファイル**: `content-generator.ts`
**移行する機能**: generatePost, generateQuoteComment, buildContentPrompt

### 3. analysis-endpoint.ts 実装

**目的**: 市場分析・パフォーマンス分析のためのClaude呼び出し

**実装内容**:
```typescript
// 既存のmarket-analyzer.ts, performance-tracker.tsから分析ロジックを移行

export interface AnalysisRequest {
  analysisType: 'market' | 'performance' | 'trend';
  data: any;
  timeframe?: string;
}

export interface AnalysisResult {
  insights: string[];
  recommendations: string[];
  confidence: number;
  metadata: any;
}

export class AnalysisEndpoint {
  async analyzeMarket(data: any): Promise<AnalysisResult> {
    // 市場分析プロンプト構築 + Claude呼び出し
  }

  async analyzePerformance(metrics: any): Promise<AnalysisResult> {
    // パフォーマンス分析プロンプト構築 + Claude呼び出し
  }
}
```

**移行元ファイル**: `market-analyzer.ts`, `performance-tracker.ts`

### 4. search-endpoint.ts 実装

**目的**: 検索クエリ生成のためのClaude呼び出し

**実装内容**:
```typescript
export interface SearchRequest {
  purpose: 'retweet' | 'like' | 'trend_analysis';
  topic: string;
  filters?: any;
}

export interface SearchQuery {
  query: string;
  filters: any;
  priority: number;
  expectedResults: number;
}

export class SearchEndpoint {
  async generateSearchQuery(request: SearchRequest): Promise<SearchQuery> {
    // 検索目的に最適化されたクエリ生成
  }
}
```

### 5. types.ts 実装

**目的**: 全エンドポイントの型定義統合

**実装内容**:
```typescript
// 既存の各ファイルから型定義を統合
export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: any;
  confidence: number;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  qualityScore: number;
  metadata: any;
}

export interface TwitterContext {
  account: any;
  trends: any[];
  timestamp: string;
}

// その他全ての型定義を統合
```

### 6. index.ts 実装

**目的**: 統一エクスポートとAPI的インターフェース提供

**実装内容**:
```typescript
// 統一API的インターフェース
export class ClaudeSDK {
  private decisionEndpoint: DecisionEndpoint;
  private contentEndpoint: ContentEndpoint;
  private analysisEndpoint: AnalysisEndpoint;
  private searchEndpoint: SearchEndpoint;

  constructor(config: ClaudeSDKConfig) {
    // エンドポイント初期化
  }

  // API的メソッド
  async makeDecision(context: TwitterContext): Promise<ClaudeDecision> {
    return this.decisionEndpoint.makeDecision({ context, currentTime: new Date() });
  }

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    return this.contentEndpoint.generateContent(request);
  }

  async analyzeMarket(data: any): Promise<AnalysisResult> {
    return this.analysisEndpoint.analyzeMarket(data);
  }

  async generateSearchQuery(request: SearchRequest): Promise<SearchQuery> {
    return this.searchEndpoint.generateSearchQuery(request);
  }
}

// 個別エクスポート
export * from './endpoints/decision-endpoint';
export * from './endpoints/content-endpoint';
export * from './endpoints/analysis-endpoint';
export * from './endpoints/search-endpoint';
export * from './types';
```

## 🔧 技術要件

### TypeScript設定
- **strict mode**: 有効
- **型安全**: 完全な型チェック
- **null安全**: 厳密なnull/undefined チェック

### エラーハンドリング
- **統一エラー処理**: 全エンドポイント共通
- **リトライ機能**: Claude API失敗時の自動リトライ
- **フォールバック**: 失敗時の代替動作

### パフォーマンス
- **タイムアウト**: 各API呼び出し15秒以内
- **並列処理**: 可能な場合の並列実行
- **キャッシュ**: 適切なレスポンスキャッシュ

## 📊 品質チェック項目

### コード品質
- [ ] TypeScript strict mode通過
- [ ] ESLint警告なし
- [ ] 全関数にJSDoc記載
- [ ] 適切なエラーハンドリング

### 機能確認
- [ ] 各エンドポイントが正常動作
- [ ] 型定義の一貫性確保
- [ ] API的インターフェースの動作確認

### 統合テスト
- [ ] main.tsからの呼び出し確認
- [ ] 既存機能の互換性確保

## 🚨 注意事項

### MVP制約遵守
- **過剰実装禁止**: 要求仕様のみ実装
- **シンプル設計**: 複雑な抽象化は避ける
- **実用性重視**: 動作確実性を最優先

### 既存コード活用
- **ロジック再利用**: 既存の動作ロジックは最大限活用
- **段階的移行**: 一度に全てを変更せず段階的に移行
- **互換性確保**: 既存のmain.tsとの連携を維持

## 📁 出力管理

### ファイル出力先
- **メインファイル**: `src/claude/` 配下に直接作成
- **バックアップ**: 既存ファイルは移動前にバックアップ
- **ログ出力**: 実装過程のログを `tasks/20250724_152100/logs/` に出力

### 完了報告
**報告書作成先**: `tasks/20250724_152100/reports/REPORT-001-claude-sdk-api-refactor.md`

**報告内容**:
- 実装完了したファイル一覧
- 移行した機能と元ファイルの対応
- 発見した問題点と解決方法
- 品質チェック結果
- 次段階への推奨事項

## ⏰ 実行優先度: 高（並列実行可能）

このタスクは他のタスクと並列実行可能です。完了後、main.ts統合改善タスクの前提条件となります。