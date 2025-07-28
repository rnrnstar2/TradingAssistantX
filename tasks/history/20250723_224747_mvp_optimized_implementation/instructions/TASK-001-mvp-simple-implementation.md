# MVP最適化実装指示書

## 🎯 実装概要
MVP原則に基づき、過度に複雑な機能を排除し、Claude Code SDKとKaitoTwitterAPIの基本統合に集中したシンプルなシステムを実装します。

## 🚨 MVP原則厳守
以下の原則を絶対に守ってください：

### ✅ 実装すべき機能
- Claude Code SDKとの基本連携（JSON返却・switch分岐）
- KaitoTwitterAPI統合による基本データ収集・投稿
- 投稿・RT・いいね・返信の基本アクション
- 簡単な結果記録とログ出力

### 🚫 実装してはいけない過剰機能
- 複雑なモジュールシステム
- ExecutionContext、ModuleExecutor等の過度な抽象化
- プロンプト履歴管理システム
- 複雑なエラーリカバリー機能
- 詳細メトリクス収集・分析機能

## 📁 実装対象ディレクトリ構造（MVP簡素版）

```
src/
├── core/        # コアシステム
│   ├── claude-autonomous-agent.ts # Claude Code SDK統合（中心的存在）
│   ├── decision-engine.ts         # 基本的なアクション決定
│   └── loop-manager.ts            # ループ管理
├── services/    # ビジネスロジック
│   ├── content-creator.ts         # 投稿生成
│   ├── kaito-api-manager.ts       # KaitoTwitterAPI統合管理
│   ├── x-poster.ts                # X投稿実行（既存活用）
│   └── performance-analyzer.ts    # 基本分析・評価
├── types/       # 型定義（最小限）
│   ├── claude-types.ts     # Claude関連の型定義
│   ├── core-types.ts       # システム・アクション・エラー型
│   ├── kaito-api-types.ts  # KaitoTwitterAPI型定義
│   └── index.ts            # 統一エクスポート
├── utils/       # ユーティリティ（最小限）
│   ├── logger.ts           # ログ管理
│   └── type-guards.ts      # 型ガード関数
└── scripts/     # 実行スクリプト
    ├── dev.ts        # 単一実行（pnpm dev）
    └── main.ts       # ループ実行（pnpm start）
```

## 🔧 実装要件

### 1. Claude Code SDK基本連携（Week 1）

#### 1.1 claude-autonomous-agent.ts
```typescript
export interface ClaudeDecision {
  action: "collect_data" | "create_post" | "analyze" | "wait";
  reasoning: string;
  parameters: {
    topic?: string;
    content_type?: string;
    priority?: "high" | "medium" | "low";
  };
  confidence: number;
}

export class ClaudeAutonomousAgent {
  // Claude Code SDKへの判断依頼（シンプル版）
  async requestDecision(): Promise<ClaudeDecision>
  
  // アクション実行（switch文使用）
  async executeAction(decision: ClaudeDecision): Promise<ActionResult>
  
  // 基本結果記録
  async recordResult(result: ActionResult): Promise<void>
}
```

#### 1.2 decision-engine.ts
```typescript
export class DecisionEngine {
  // 基本的な条件分岐
  async analyzeCurrentState(): Promise<SystemState>
  
  // シンプルな判断ロジック
  determineNextAction(state: SystemState): ClaudeDecision
  
  // 基本的なエラーハンドリング
  handleExecutionError(error: Error): void
}
```

### 2. KaitoTwitterAPI統合（Week 2）

#### 2.1 kaito-api-manager.ts
```typescript
export class KaitoAPIManager {
  // 基本データ収集
  async collectBasicData(params: CollectionParams): Promise<CollectedData>
  
  // 投稿・エンゲージメント分析
  async analyzePerformance(metrics: BasicMetrics): Promise<PerformanceData>
  
  // 基本的なレート制限管理
  private manageBsicRateLimit(): void
}
```

#### 2.2 x-poster.ts改修
既存のx-poster.tsを基盤として、以下の機能を追加：
```typescript
// 既存機能を維持しつつ、基本的な多様アクション対応
async executeRetweet(tweetId: string): Promise<ActionResult>
async executeLike(tweetId: string): Promise<ActionResult>  
async executeReply(tweetId: string, content: string): Promise<ActionResult>
```

### 3. 基本アクション実行システム（Week 3）

#### 3.1 基本switch分岐実装
```typescript
// claude-autonomous-agent.ts内
async executeAction(decision: ClaudeDecision): Promise<ActionResult> {
  switch (decision.action) {
    case "collect_data":
      return await this.kaitoManager.collectBasicData(decision.parameters);
    
    case "create_post":
      const content = await this.contentCreator.generateContent(decision.parameters);
      return await this.xPoster.post(content);
    
    case "analyze":
      return await this.performanceAnalyzer.analyzeBasic();
    
    case "wait":
      await this.wait(decision.parameters.duration || 60000);
      return { success: true, action: "wait" };
    
    default:
      throw new Error(`Unknown action: ${decision.action}`);
  }
}
```

### 4. 基本データ管理（Week 4）

#### 4.1 簡単な結果記録
```typescript
// performance-analyzer.ts
export class PerformanceAnalyzer {
  // 基本的な成功/失敗記録
  async recordBasicResult(result: ActionResult): Promise<void>
  
  // 簡単な統計計算
  async getBasicStats(): Promise<BasicStats>
  
  // YAML形式での基本保存
  async saveToYAML(data: any, filename: string): Promise<void>
}
```

## 🧪 テスト要件（シンプル版）

### 基本テスト
- Claude Code SDK連携の動作確認
- KaitoTwitterAPI基本機能テスト
- switch分岐の正常動作テスト
- 基本エラーハンドリングテスト

### 統合テスト
- エンドツーエンドの基本フロー確認
- JSON返却・解析の正常動作
- 基本データ保存・読み込み

## 📊 成功指標（MVP版）

### 技術指標
- [ ] Claude Code SDK基本連携100%動作
- [ ] KaitoTwitterAPI統合完了
- [ ] 4種類基本アクション実行可能
- [ ] JSON返却・switch分岐正常動作

### 実用指標
- [ ] 継続的な投稿実行（1日3-5回）
- [ ] 基本エンゲージメント分析
- [ ] エラー率5%以下
- [ ] システム稼働率95%以上

## 🚨 重要な制約

### コード簡素化原則
- 1ファイル200行以下を目標
- 複雑な抽象化は避ける
- 直接的で分かりやすいコード

### データ管理制約
- data/current/, data/learning/, data/archives/のみ使用
- tasks/outputs/への実行ログ出力
- 基本的なYAML形式のみ

### パフォーマンス要件
- アクション実行時間: 30秒以内
- JSON処理時間: 100ms以内
- KaitoTwitterAPI基本機能の安定使用

## 📋 完了条件

1. 簡素化されたディレクトリ構造の実装完了
2. Claude Code SDK基本連携システムの動作確認
3. KaitoTwitterAPI統合による基本機能実装
4. 4種類基本アクション（collect_data, create_post, analyze, wait）の実行確認
5. 基本的な結果記録・分析機能の動作確認
6. 継続実行（pnpm start）での安定動作確認

実装完了後、報告書を作成してください：
📋 報告書: tasks/20250723_224747_mvp_optimized_implementation/reports/REPORT-001-mvp-implementation.md

## 💡 実装のコツ

### 既存コード活用
- 現在のx-poster.tsは基盤として活用
- content-creator.tsも基本機能は維持
- 新規作成より既存改修を優先

### シンプル設計
- 「動くものを最短で作る」を優先
- 完璧よりも実用性を重視
- 段階的改善は後のフェーズで実施

### Claude Code SDK連携
- JSON返却の基本パターン確立
- エラー時のフォールバック準備
- 実行結果の適切なログ記録