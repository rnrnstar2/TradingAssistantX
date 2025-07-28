# Data最小化MVP実装指示書

## 🎯 実装概要
KaitoTwitterAPIで全データ取得が可能なため、**ローカルデータ管理を最小化**したMVPシステムを実装します。dataディレクトリは認証情報のみに簡素化し、完全API依存型の実装を目指します。

## 🚨 Data最小化原則

### ✅ 保持すべき唯一のローカルデータ
```
data/
└── config/
    └── api-config.yaml  # KaitoTwitterAPI認証情報のみ
```

### 🚫 不要なローカルデータ（API取得で代替）
- アカウント状況 → KaitoTwitterAPI取得
- 投稿履歴 → KaitoTwitterAPI取得  
- エンゲージメントデータ → KaitoTwitterAPI取得
- フォロワー情報 → KaitoTwitterAPI取得
- 競合分析データ → KaitoTwitterAPI取得
- 全ての学習・アーカイブデータ → API直接分析

## 📁 最小化されたディレクトリ構造

```
src/
├── core/        # コアシステム
│   ├── claude-autonomous-agent.ts # Claude Code SDK統合
│   ├── decision-engine.ts         # 基本的なアクション決定
│   └── loop-manager.ts            # ループ管理
├── services/    # ビジネスロジック
│   ├── content-creator.ts         # 投稿生成
│   ├── kaito-api-manager.ts       # KaitoTwitterAPI統合（中心的存在）
│   ├── x-poster.ts                # X投稿実行
│   └── performance-analyzer.ts    # リアルタイム分析
├── types/       # 型定義
│   ├── claude-types.ts     # Claude関連の型定義
│   ├── core-types.ts       # システム・アクション・エラー型
│   ├── kaito-api-types.ts  # KaitoTwitterAPI型定義
│   └── index.ts            # 統一エクスポート
├── utils/       # ユーティリティ
│   ├── logger.ts           # ログ管理
│   └── type-guards.ts      # 型ガード関数
└── scripts/     # 実行スクリプト
    ├── dev.ts        # 単一実行（pnpm dev）
    └── main.ts       # ループ実行（pnpm start）

data/
└── config/
    └── api-config.yaml  # 認証情報のみ
```

## 🔧 実装要件

### 1. API認証設定（Week 1）

#### 1.1 api-config.yaml（唯一のローカルファイル）
```yaml
# data/config/api-config.yaml
kaito_twitter_api:
  api_key: "${KAITO_API_KEY}"
  base_url: "https://api.twitterapi.io"
  rate_limit: 200  # QPS
  timeout: 30000   # 30秒

claude_sdk:
  model: "claude-3-sonnet"
  max_tokens: 4000
```

### 2. KaitoTwitterAPIマネージャー（Week 2）

#### 2.1 完全API依存データ管理
```typescript
// src/services/kaito-api-manager.ts
export class KaitoAPIManager {
  // リアルタイムアカウント状況取得
  async getCurrentAccountStatus(): Promise<AccountStatus>
  
  // リアルタイム投稿履歴取得
  async getRecentPosts(count: number = 50): Promise<Post[]>
  
  // リアルタイムエンゲージメント分析
  async analyzeEngagement(timeRange: string = "24h"): Promise<EngagementAnalysis>
  
  // リアルタイムフォロワー情報取得
  async getFollowerInfo(): Promise<FollowerInfo>
  
  // リアルタイム競合分析
  async analyzeCompetitors(accounts: string[]): Promise<CompetitorAnalysis>
  
  // メモリ内キャッシュ（セッション内のみ）
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
}
```

### 3. Claude Code SDK統合（Week 3）

#### 3.1 リアルタイムデータに基づく判断
```typescript
// src/core/claude-autonomous-agent.ts
export class ClaudeAutonomousAgent {
  // リアルタイムデータに基づく判断依頼
  async requestDecision(): Promise<ClaudeDecision> {
    // API取得データをプロンプトに統合
    const currentStatus = await this.kaitoManager.getCurrentAccountStatus();
    const recentEngagement = await this.kaitoManager.analyzeEngagement();
    
    const prompt = this.buildPrompt(currentStatus, recentEngagement);
    return await this.callClaude(prompt);
  }
  
  // プロンプト構築（APIデータ統合）
  private buildPrompt(status: AccountStatus, engagement: EngagementAnalysis): string {
    return `
現在のアカウント状況:
- フォロワー数: ${status.followers_count}
- 今日の投稿数: ${status.posts_today}
- 平均エンゲージメント率: ${engagement.average_rate}%

この状況で次にすべきアクションを以下形式で返してください:
{
  "action": "collect_data" | "create_post" | "analyze" | "wait",
  "reasoning": "判断理由",
  "parameters": { ... }
}
    `;
  }
}
```

### 4. 実行時メモリ処理（Week 4）

#### 4.1 永続化なしのメモリ内処理
```typescript
// src/services/performance-analyzer.ts
export class PerformanceAnalyzer {
  // セッション内データ処理（永続化なし）
  private sessionData: {
    startTime: Date;
    executedActions: ActionResult[];
    currentMetrics: Metrics;
  };
  
  // リアルタイム分析（API直接処理）
  async analyzeCurrentPerformance(): Promise<PerformanceReport> {
    const liveData = await this.kaitoManager.analyzeEngagement("1h");
    return this.processInMemory(liveData);
  }
  
  // 実行ログのみtasks/outputs/に出力
  async logExecutionResult(result: ActionResult): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: result.action,
      success: result.success,
      metrics: await this.kaitoManager.getCurrentAccountStatus()
    };
    
    await this.saveToOutputs(`execution-${Date.now()}.yaml`, logEntry);
  }
}
```

## 🚀 実装の利点

### パフォーマンス向上
- **ファイルI/O削除**: 全データAPI取得による高速化
- **メモリ内処理**: ディスク読み書きの完全排除
- **リアルタイム性**: 常に最新データでの判断

### 保守性向上  
- **ファイル管理排除**: YAMLファイル同期問題の解決
- **データ整合性**: API取得による単一データソース
- **デバッグ簡素化**: ローカルファイル状態確認不要

### 拡張性向上
- **API性能活用**: 200 QPS性能の最大活用
- **動的分析**: リアルタイムトレンド分析
- **スケーラビリティ**: ローカルストレージ制限の排除

## 📊 成功指標（Data最小化版）

### 技術指標
- [ ] ローカルファイル: 1個のみ（api-config.yaml）
- [ ] 全データAPI取得率: 100%
- [ ] メモリ内処理率: 100%
- [ ] ファイルI/O削減率: 95%以上

### 実用指標
- [ ] レスポンス時間: 従来比50%短縮
- [ ] データ最新性: 100%（リアルタイム）
- [ ] 保守工数: 70%削減
- [ ] システム安定性: 99%以上

## 🚨 重要な制約

### 認証情報管理
- api-config.yamlは環境変数参照のみ
- 実際のシークレットは環境変数に保存
- Git追跡対象外（.gitignoreに追加）

### セッション管理
- メモリ内データはセッション終了で消去
- 必要な永続化はtasks/outputs/のみ
- APIレート制限の適切な管理

### エラーハンドリング
- API接続失敗時のフォールバック
- ネットワーク一時的問題への対応
- 認証エラーの適切な処理

## 📋 完了条件

1. dataディレクトリの1ファイル化完了
2. 全データのAPI取得システム実装
3. メモリ内処理システムの動作確認
4. リアルタイムClaude Code SDK連携の実装
5. 実行ログのtasks/outputs/出力確認
6. API認証・エラーハンドリングの動作確認

実装完了後、報告書を作成してください：
📋 報告書: tasks/20250723_225150_data_minimized_implementation/reports/REPORT-001-data-minimized.md

## 💡 実装のコツ

### APIファースト設計
- 全機能をAPI取得データで実装
- ローカルキャッシュは最小限（メモリ内のみ）
- リアルタイム性を最優先

### エラー処理
- API障害時の適切なフォールバック
- ネットワーク問題への耐性
- 認証問題の早期発見

### パフォーマンス最適化
- API呼び出しの効率化
- 200 QPS制限内での最大活用
- 不要なAPI呼び出しの排除