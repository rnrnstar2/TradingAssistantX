# TradingAssistantX 要件定義書

## 🎯 ビジョン

**KaitoTwitterAPI完全統合による多機能X最適化システム**
- 📝 **知識駆動型コンテンツ生成**: Claude Code SDKがX上のトレンド・エンゲージメント分析に基づいて最適化された投資教育コンテンツを生成
- 📊 **X完全データ統合**: KaitoTwitterAPIによるリアルタイム投稿・フォロワー・競合・トレンド情報の包括的分析
- 🔄 **多様なアクション戦略**: 投稿・リツイート・引用リツイート・いいね・返信を統合した戦略的エンゲージメント
- 📈 **包括的成長分析**: フォロワー増加率、エンゲージメント率、影響力指数の多角的分析
- 🎯 **インフルエンサー戦略**: 他アカウントとの戦略的エンゲージメントによる影響力拡大

**コア技術**: Claude Code SDK + KaitoTwitterAPI による完全自律的X成長戦略システム

## 💡 システムの現実的な目標

### X完全統合による価値提供の最大化
- **最適アクション頻度**: エンゲージメント分析による投稿・RT・いいね・返信の戦略的組み合わせ（1日10-20アクション）
- **影響力特化型アカウント**: 高エンゲージメント率 + フォロワー質維持によるアルゴリズム優位性の確保
- **X内完結型コンテンツ**: 他アカウント投稿分析 + リアルタイムトレンドによる関連性最大化コンテンツ生成
- **即座学習サイクル**: 全アクション効果の15分以内フィードバックによる戦略の高速進化

### KaitoTwitterAPI単独による完全X最適化システム
- **X内市場インテリジェンス**: 投資関連アカウントの投稿・議論から市場動向を自動抽出
- **多層エンゲージメント戦略**: 投稿・RT・引用RT・いいね・返信を統合した影響力最大化
- **フォロワー行動予測**: 詳細なフォロワー分析による最適アクションタイミング予測
- **競合インフルエンサー分析**: 同業界影響力アカウントとの差別化・協調戦略の自動策定

## 🏗️ システムアーキテクチャ

### KaitoTwitterAPI完全依存型の戦略実行システム
**X内完結型データフロー**

```
X内データ収集 (KaitoTwitterAPI): 投資関連投稿・トレンド・フォロワー・競合分析
     ↓ 
戦略的アクション決定 (Claude Code SDK): 投稿・RT・いいね・返信の最適組み合わせ決定
     ↓ 
多様なアクション実行 (KaitoTwitterAPI): 投稿・リツイート・引用・いいね・返信の統合実行
     ↓
即座効果分析 (KaitoTwitterAPI): エンゲージメント詳細分析と戦略調整
```

### KaitoTwitterAPI単独によるデータ管理
- **リアルタイムAPI取得**: 投稿・フォロワー・エンゲージメント・トレンド・競合アカウント情報
- **戦略学習データ**:
  - **設定ファイル** (data/config/): アクション戦略、タイミング最適化、API設定
  - **学習データ** (data/learning/): エンゲージメントパターン、成功アクション組み合わせ、フォロワー分析
  - **アーカイブ** (data/archives/): 全アクション履歴と効果測定データ

**完全API統合方針**: 
- 全データソースをX内から取得（外部RSS不要）
- 投稿・RT・いいね・返信を統合した戦略実行
- 200 QPS性能を活かした高速分析・実行サイクル

## 🧠 Claude Code SDK の高度アクション

### Claude Code SDK JSON処理・分岐システム
**アクション判断とモジュール選択の自動化**

```typescript
// Claude Code SDKからのJSON返却例
interface ClaudeDecision {
  action: "collect_x_intelligence" | "analyze_engagement_ecosystem" | 
          "strategic_action_planning" | "create_multi_format_content" |
          "execute_integrated_actions" | "real_time_interaction" |
          "influence_network_building" | "continuous_ecosystem_optimization";
  reasoning: string;
  parameters: {
    priority: "high" | "medium" | "low";
    target_accounts?: string[];
    content_type?: "educational" | "market_analysis" | "trend_commentary";
    engagement_threshold?: number;
    time_constraints?: string;
  };
  execution_context: ExecutionContext;
  confidence: number;
  expected_outcome: string;
}

// モジュール分岐処理システム
export class ModuleDispatcher {
  async dispatchAction(decision: ClaudeDecision): Promise<ModuleResult> {
    switch (decision.action) {
      case "collect_x_intelligence":
        return await this.modules.dataIntelligence.execute(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "analyze_engagement_ecosystem":
        return await this.modules.engagementAnalysis.execute(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "strategic_action_planning":
        return await this.modules.contentStrategy.execute(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "create_multi_format_content":
        return await this.modules.contentStrategy.generateContent(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "execute_integrated_actions":
        return await this.modules.actionExecution.execute(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "real_time_interaction":
        return await this.modules.actionExecution.handleInteraction(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "influence_network_building":
        return await this.modules.actionExecution.buildNetwork(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      case "continuous_ecosystem_optimization":
        return await this.modules.optimization.optimize(
          this.buildPrompt(decision), 
          decision.execution_context
        );
      
      default:
        throw new Error(`Unknown action: ${decision.action}`);
    }
  }
}
```

### プロンプト連携・実行履歴共有システム
**Claude Code SDK との完全な実行コンテキスト同期**

```typescript
// プロンプト構築・実行履歴管理
export class PromptContextManager {
  // Claude Code SDKへのプロンプト構築
  buildPromptWithContext(decision: ClaudeDecision, context: ExecutionContext): string {
    return `
## 実行指示
アクション: ${decision.action}
理由: ${decision.reasoning}
パラメータ: ${JSON.stringify(decision.parameters, null, 2)}
期待結果: ${decision.expected_outcome}

## 現在の実行コンテキスト
${this.serializeContext(context)}

## 過去の実行履歴（直近5件）
${this.formatExecutionHistory(context.recent_executions)}

## 現在のパフォーマンス指標
- エンゲージメント率: ${context.current_metrics.engagement_rate}%
- フォロワー増加率: ${context.current_metrics.follower_growth_rate}%
- 今日のアクション数: ${context.current_metrics.daily_actions}
- 競合優位度: ${context.current_metrics.competitive_advantage}

## 実行要求
上記コンテキストを考慮して、${decision.action}を実行し、以下形式でJSONレスポンスを返してください：
{
  "success": boolean,
  "action_executed": "${decision.action}",
  "results": { ... },
  "performance_impact": { ... },
  "next_suggestions": [ ... ],
  "execution_log": "詳細な実行ログ",
  "updated_context": { ... }
}
    `;
  }

  // 実行結果をコンテキストに統合
  integrateExecutionResult(
    previousContext: ExecutionContext, 
    result: ModuleResult
  ): ExecutionContext {
    return {
      ...previousContext,
      recent_executions: [
        ...previousContext.recent_executions.slice(-4), // 直近4件保持
        {
          action: result.action_executed,
          timestamp: new Date().toISOString(),
          success: result.success,
          summary: result.execution_log.substring(0, 200) + "...",
          performance_impact: result.performance_impact
        }
      ],
      current_metrics: this.updateMetrics(
        previousContext.current_metrics, 
        result.performance_impact
      ),
      last_execution: {
        action: result.action_executed,
        timestamp: new Date().toISOString(),
        success: result.success
      }
    };
  }
}

// 実行コンテキスト型定義
interface ExecutionContext {
  session_id: string;
  start_time: string;
  current_metrics: {
    engagement_rate: number;
    follower_growth_rate: number;
    daily_actions: number;
    competitive_advantage: number;
  };
  recent_executions: ExecutionRecord[];
  market_conditions: "stable" | "volatile" | "trending";
  account_status: AccountStatus;
  strategic_goals: string[];
  constraints: {
    daily_action_limit: number;
    content_themes: string[];
    restricted_times: string[];
  };
}

// 高度な戦略的実行フロー（プロンプト連携版）
[1] コンテキスト収集: 現在状況・履歴・指標をプロンプトに統合
[2] Claude判断: JSON形式でアクション決定・理由・パラメータを返却
[3] モジュール分岐: switch文による適切なモジュール選択・実行
[4] 結果統合: 実行結果をコンテキストに統合・次回プロンプトに反映
[5] 継続学習: 全実行履歴をClaude Code SDKと共有・戦略進化
```

### 多次元データドリブン判断基準
**AI統合アクション最適化条件**
- **統合エンゲージメント率**: 投稿・RT・いいね・返信全アクションの効果統合分析
- **影響力拡大速度**: フォロワー増加率 + リーチ拡大率による戦略動的調整
- **X内市場センチメント**: 投資関連アカウント投稿分析による市場動向把握とテーマ選択
- **競合インフルエンサー活動**: 同業界影響力アカウントとのエンゲージメント比較・差別化戦略
- **アクション組み合わせ最適化**: 投稿・RT・いいね・返信の最適な組み合わせとタイミングの学習

**KaitoTwitterAPI完全活用機能**:
- 200 QPS活用による即座の市場動向分析
- 投稿・RT・引用・いいね・返信の統合戦略自動実行
- フォロワー・競合・インフルエンサーの動的関係分析と戦略調整

## 🤖 Claude Code SDK 自律システム設計

### 単発実行可能モジュール構成
```typescript
// src/core/claude-autonomous-agent.ts - 中央制御
export interface ClaudeActionResponse {
  action: string;
  reasoning: string;
  parameters: Record<string, any>;
  confidence: number;
  next_steps?: string[];
  execution_context: ExecutionContext;
}

// 各モジュールの独立実行可能設計
src/modules/
├── data-intelligence/     # 単発実行: データ収集・分析
├── content-strategy/      # 単発実行: コンテンツ戦略決定
├── action-execution/      # 単発実行: X活動実行
├── engagement-analysis/   # 単発実行: エンゲージメント分析
└── optimization/          # 単発実行: 戦略最適化
```

### Claude Code SDK 自律判断フロー
```typescript
// 各モジュールの統一インターフェース
export interface ModuleExecutor {
  execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>;
  canExecute(action: string): boolean;
  getActionDescription(): ActionDescription;
}

// JSON形式の統一レスポンス
export interface ModuleResult {
  success: boolean;
  action_executed: string;
  results: any;
  next_suggestions: ClaudeActionResponse[];
  execution_log: string;
  updated_context: ExecutionContext;
}
```

### Claude連携プロンプトシステム
```json
{
  "action": "collect_x_intelligence",
  "reasoning": "市場動向の急激な変化を検知、追加情報収集が必要",
  "parameters": {
    "target_accounts": ["@finance_guru", "@market_analyst"],
    "analysis_depth": "detailed",
    "time_range": "24h"
  },
  "confidence": 0.95,
  "execution_context": {
    "previous_actions": ["analyze_engagement_patterns"],
    "current_metrics": {"engagement_rate": 3.2, "follower_growth": 8.5},
    "market_conditions": "volatile"
  },
  "next_steps": ["analyze_results", "adjust_posting_strategy"]
}
```

## 📋 MVPコア機能（実装優先）

### 基本フロー
**投稿内容でのアカウント構築が最重要課題**

1. **トピック決定**
   - Claudeが現在のアカウント状況と市場状況から最適な投稿テーマを選択
   - フォロワー数に基づく戦略調整（現在取得可能な唯一の指標）

2. **データ収集（必要時）**
   - 決定したトピックに応じてRSS等から関連情報を収集
   - 収集は必須ではなく、Claudeの判断に委ねる

3. **投稿文章作成**
   - 収集データや既存知識から投稿内容を生成
   - アカウント構築に効果的な内容を重視

4. **投稿実行**
   - 作成した文章をX（Twitter）に投稿
   - 結果を記録し、次回の学習に活用

### KaitoTwitterAPIによる革新的機能実現
- **完全エンゲージメント可視化**: いいね・RT・返信・インプレッション数の詳細追跡とパターン分析
- **フォロワー行動分析**: フォロワーの投稿反応時間・興味分野・エンゲージメントパターンの詳細把握
- **競合インテリジェンス**: 同業界アカウントの投稿戦略・効果・フォロワー動向の包括分析
- **リアルタイム市場連動**: 金融市場の動きとX上の議論トレンドの即座連携
- **自動戦略進化**: 投稿効果の機械学習による戦略パラメータの自動最適化

### データドリブン成功指標（定量測定可能）
- **エンゲージメント率**: 目標3.5%以上（業界平均の2倍）
- **フォロワー増加率**: 月次10%成長の持続的達成
- **投稿効果指数**: いいね・RT・返信の統合スコアによる品質定量化
- **市場連動度**: RSS市場データと投稿タイミングの最適化効果測定
- **競合優位性**: 同業界アカウントとのエンゲージメント率比較での上位維持

## 🚨 MVP構成

### KaitoTwitterAPI統合実装
- **即時利用可能**: KaitoTwitterAPIによる高度な機能をMVPから活用
- **200 QPS対応**: 高速データ収集と分析
- **平均700msレスポンス**: リアルタイム性の高い処理

### KaitoTwitterAPI活用構成
- **RSS収集**: 投資関連情報の基礎データ取得
- **KaitoTwitterAPIデータ収集**:
  - ユーザープロフィール・フォロワー/フォロー分析
  - ツイート検索・詳細取得（リプライ、引用、RT）
  - トレンド・コミュニティ情報
- **投稿生成**: Claude Code SDKによる高品質コンテンツ作成
- **KaitoTwitterAPI投稿機能**:
  - ツイート投稿・返信・引用
  - 画像アップロード対応
  - いいね・リツイート機能
- **設定管理**: YAML設定による柔軟な制御

### データ収集の特徴
- **RSS**: 主要金融メディアからの基礎情報
- **KaitoTwitterAPI**: X上のリアルタイムデータと詳細分析

### KaitoTwitterAPIの主要機能
- **ユーザー管理**: プロフィール取得、フォロワー/フォロー分析
- **ツイート操作**: 投稿・返信・引用・画像アップロード
- **データ取得**: 高度な検索、エンゲージメント詳細
- **パフォーマンス**: $0.15/1k tweets のコスト効率

### 成長分析機能
- **フォロワー分析**: 詳細なフォロワー情報とフォロー関係
- **エンゲージメント分析**: いいね、RT、返信の詳細データ
- **投稿最適化**: データに基づく投稿戦略の自動調整

## 🚀 戦略的AI最適化ワークフロー

### 📊 Phase 1: X内完全インテリジェンス収集（8分）
1. **X内市場インテリジェンス**: 投資関連アカウント投稿・議論から市場動向を自動抽出・分析
2. **競合インフルエンサー分析**: 同業界影響力アカウントの全活動（投稿・RT・いいね・返信）パターン監視
3. **フォロワー生態系分析**: 自アカウントフォロワーのX内行動・エンゲージメントパターンの実時間更新

### 🧠 Phase 2: AI統合アクション戦略決定（5分）
4. **多次元エンゲージメント学習**: 全アクション（投稿・RT・いいね・返信）の統合効果分析
5. **戦略的アクション組み合わせ決定**: Claude Code SDKによる最適アクション組み合わせ・タイミング・対象の決定
6. **影響力拡大戦略**: 競合・インフルエンサーとの差別化・協調戦略の動的調整

### ✍️ Phase 3: 多形式コンテンツ・アクション準備（10分）
7. **統合コンテンツ生成**: X内データに基づく投稿・引用コメント・返信コンテンツの最適化作成
8. **アクション戦略設計**: RT対象選択・いいね戦略・返信タイミングの統合最適化
9. **影響力最大化準備**: ハッシュタグ・メンション・画像活用による拡散力強化設計

### 🎯 Phase 4: 統合アクション実行と即座最適化（20分）
10. **多様アクション実行**: 投稿・RT・引用RT・いいね・返信の戦略的組み合わせ実行
11. **リアルタイム相互作用**: フォロワー・インフルエンサーとの動的エンゲージメント・返信対応
12. **即座学習・調整**: 全アクション効果の15分以内分析と次回戦略の自動調整

## 🎯 MVPの目標

### 基本的な目標
- **継続的な投稿**: 定期実行による安定した投稿
- **投稿品質**: 投資教育に役立つ内容
- **フォロワー成長**: 基本的な成長確認

### 期待する効果
- 投資初心者向けの有益なコンテンツ提供
- 定期投稿による信頼感の構築
- 基本的なアカウント成長

## 🌟 将来の拡張計画

### 段階的な改善
- より多様な情報源の追加
- 投稿形式の改善実験
- より詳細な分析機能

### 長期的な展望
- エンゲージメント詳細分析
- 複数テーマの対応
- より高度な投稿戦略

## 📁 ディレクトリ・ファイル構造

### ⚠️ 構造厳守の絶対原則
**ハルシネーション防止の根幹**: 定義された構造の厳格遵守
1. 記載されたディレクトリ・ファイルのみ使用可能
2. 新規ファイル・ディレクトリ作成は原則禁止
3. integrity-checker.tsが自動検出・拒否

### ルートディレクトリ
```
TradingAssistantX/
├── src/         # ソースコード
├── data/        # YAML設定・データ
├── tests/       # テストコード
├── docs/        # ドキュメント
└── REQUIREMENTS.md
```

### /src ディレクトリ（Claude Code SDK自律設計）
```
src/
├── core/                    # Claude Code SDK中央制御
│   ├── claude-autonomous-agent.ts # 自律的判断・JSON返却システム
│   ├── module-dispatcher.ts       # アクション分岐・モジュール選択
│   ├── prompt-context-manager.ts  # プロンプト連携・実行履歴管理
│   └── execution-coordinator.ts   # 実行調整・結果統合
├── modules/                 # 単発実行可能モジュール群
│   ├── data-intelligence/         # データ収集・分析モジュール
│   │   ├── intelligence-executor.ts    # 単発実行: X内インテリジェンス収集
│   │   ├── market-analyzer.ts          # 単発実行: 市場動向分析
│   │   └── competitor-tracker.ts       # 単発実行: 競合分析
│   ├── content-strategy/           # コンテンツ戦略モジュール
│   │   ├── strategy-planner.ts         # 単発実行: 戦略計画策定
│   │   ├── content-generator.ts        # 単発実行: 多形式コンテンツ生成
│   │   └── timing-optimizer.ts         # 単発実行: 投稿タイミング最適化
│   ├── action-execution/           # X活動実行モジュール
│   │   ├── post-executor.ts            # 単発実行: 投稿実行
│   │   ├── engagement-executor.ts      # 単発実行: RT・いいね・返信実行
│   │   └── network-builder.ts          # 単発実行: フォロー・ネットワーク構築
│   ├── engagement-analysis/        # エンゲージメント分析モジュール
│   │   ├── performance-analyzer.ts     # 単発実行: 効果分析
│   │   ├── pattern-learner.ts          # 単発実行: パターン学習
│   │   └── influence-measurer.ts       # 単発実行: 影響力測定
│   └── optimization/               # 戦略最適化モジュール
│       ├── strategy-optimizer.ts       # 単発実行: 戦略パラメータ調整
│       ├── performance-tuner.ts        # 単発実行: 性能最適化
│       └── growth-accelerator.ts       # 単発実行: 成長加速化
├── interfaces/              # 統一インターフェース
│   ├── module-interface.ts        # ModuleExecutor統一インターフェース
│   ├── claude-response-types.ts   # JSON返却型定義
│   └── execution-context-types.ts # 実行コンテキスト型定義
├── adapters/                # 外部システム連携
│   ├── kaito-api-adapter.ts       # KaitoTwitterAPI統合アダプター
│   ├── data-persistence-adapter.ts # YAML保存アダプター
│   └── prompt-formatter.ts        # Claude連携プロンプト整形
├── utils/                   # ユーティリティ
│   ├── json-processor.ts          # JSON処理・バリデーション
│   ├── context-serializer.ts      # 実行コンテキスト直列化
│   ├── module-registry.ts         # モジュール登録・検索
│   └── execution-logger.ts        # 実行ログ・プロンプト履歴
└── scripts/                 # 実行スクリプト
    ├── dev.ts        # 単一実行（pnpm dev）
    └── main.ts       # ループ実行（pnpm start）
```

### /data ディレクトリ（変更厳禁）
```
data/
├── config/      # X統合システム設定（読み取り専用）
│   ├── autonomous-config.yaml
│   ├── x-action-strategies.yaml    # 多様X活動戦略設定
│   ├── engagement-timing.yaml      # エンゲージメント最適タイミング
│   ├── influence-targets.yaml      # 影響力拡大ターゲット設定
│   └── kaito-api-config.yaml      # KaitoTwitterAPI完全統合設定
├── current/     # X活動ホットデータ（1MB・7日・20ファイル上限）
│   ├── account-status.yaml
│   ├── active-x-strategy.yaml      # アクティブX戦略
│   ├── today-actions.yaml          # 今日の全アクション（投稿・RT・いいね・返信）
│   ├── weekly-engagement.yaml      # 週次エンゲージメント統計
│   ├── api-cache.yaml             # KaitoTwitterAPIキャッシュ
│   └── influence-network.yaml      # 現在の影響力ネットワーク状況
├── learning/    # X戦略ウォームデータ（10MB・90日上限）
│   ├── action-insights.yaml        # 全アクション効果インサイト
│   ├── engagement-patterns.yaml    # エンゲージメントパターン学習
│   ├── influence-growth.yaml       # 影響力成長パターン
│   └── competitor-analysis.yaml    # 競合アカウント分析データ
└── archives/    # X活動コールドデータ（無制限・永続）
    ├── actions/YYYY-MM/            # 全アクション履歴
    ├── engagement/YYYY-Q/          # エンゲージメント詳細履歴
    └── influence/YYYY/             # 年次影響力成長記録
```

## 🔒 ハルシネーション防止機構

### 許可された出力先（厳格制限）
```yaml
# 書き込み許可
allowed_paths:
  - data/current/
  - data/learning/
  - data/archives/
  - tasks/outputs/

# 書き込み禁止（読み取り専用）
readonly_paths:
  - src/
  - data/config/
  - tests/
  - docs/
```

### 実行前後の検証
1. 構造検証：要件定義と完全一致確認
2. ファイル数・サイズ制限チェック
3. 命名規則：記載されたファイル名のみ使用可
4. 実行ログ記録：異常時は即座にロールバック

### 禁止事項
- 要件定義にないファイル・ディレクトリ作成
- srcディレクトリ内変更（Manager以外）
- ルートディレクトリへの直接ファイル作成

---

## 🚨 実装時の教訓・過剰実装防止原則

### MVP開発の絶対原則（2025-01-23更新）
- **要件定義外の機能は実装しない**: リソース制限、パフォーマンス監視などの「あったら良い」機能は避ける
- **設定ファイルは必要最小限に**: 戦略定義、タイミング、データソースなど、システムに必要な設定のみを保持
- **コード簡素化を優先**: ResourceManagement、performanceフィールドなど要件にない複雑な機能は削除

### 🚫 絶対に実装してはいけない過剰機能
- **実行監視機能**: ExecutionMonitor、HealthCheck、SystemResourceChecker
- **複雑なロック管理**: YAMLファイルベースのロック、PID追跡、プロセス監視
- **自動リカバリー機能**: 指数関数的バックオフ、システム自動修復、エラー分類
- **詳細メトリクス収集**: CPU/メモリ/ディスク監視、パフォーマンス分析
- **自動ファイル管理**: FileSizeMonitor、自動アーカイブ、データ階層移動
- **構造検証機能**: IntegrityChecker、命名規則検証、データ制限検証

### ✅ MVP適合する簡素化手法
- **排他制御**: 単純な`isExecuting`ブールフラグ
- **エラーハンドリング**: 基本的なtry-catch + コンソールログ
- **記録機能**: 成功/失敗の基本情報のみ
- **設定管理**: 最小限のYAML設定ファイル

---

**MVPの目標**: 継続的で質の高い投資教育コンテンツの自動投稿システムの実現
