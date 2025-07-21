# TASK-WF02: 自律アカウント分析システム実装

## 🎯 目的
ワークフロー序盤で並列実行される「自分のアカウント状況分析」機能を実装する。

## 📋 前提条件
**必須**: TASK-WF01の完了

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_123440_workflow/outputs/TASK-WF01-optimized-workflow-design.yaml`

## 🏗️ 実装内容

### 1. AccountAnalyzerクラス実装

#### 新ファイル作成
**場所**: `src/lib/account-analyzer.ts`

```typescript
interface AccountStatus {
  username: string;
  currentMetrics: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
    lastTweetTime: number;
  };
  performanceMetrics: {
    recentEngagementRate: number;
    averageLikesPerTweet: number;
    averageRetweetsPerTweet: number;
    growthRate: number;
  };
  healthScore: number; // 0-100
  recommendations: string[];
  timestamp: number;
}

class AccountAnalyzer {
  async analyzeCurrentStatus(): Promise<AccountStatus> {
    // 自分のアカウント情報を取得・分析
  }
  
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // 最近のパフォーマンス分析
  }
  
  async calculateHealthScore(): Promise<number> {
    // アカウント健康度計算
  }
}
```

### 2. X API統合

#### X Client拡張
**ファイル**: `src/lib/x-client.ts`

新メソッド追加：
```typescript
// 自分のアカウント詳細情報取得
async getMyAccountDetails(): Promise<UserResponse> {
  // Twitter API v2 users/me エンドポイント使用
}

// 自分の最近のツイート分析
async getMyRecentTweets(count: number = 10): Promise<Tweet[]> {
  // 自分の最近の投稿を取得
}

// エンゲージメント詳細分析
async getEngagementMetrics(tweetIds: string[]): Promise<EngagementMetrics[]> {
  // 各ツイートのエンゲージメント数値取得
}
```

### 3. パフォーマンス分析ロジック

#### 分析機能実装
```typescript
class PerformanceAnalyzer {
  // 最近7日間のエンゲージメント分析
  async analyzeRecentEngagement(): Promise<EngagementAnalysis> {
    const recentTweets = await this.xClient.getMyRecentTweets(20);
    // エンゲージメント率計算、トレンド分析
  }
  
  // フォロワー成長率分析
  async analyzeGrowthRate(): Promise<GrowthAnalysis> {
    // アカウント設定から過去データ取得
    // 成長率計算
  }
  
  // 投稿頻度最適化分析
  async analyzePostingPattern(): Promise<PostingPattern> {
    // 1日15投稿目標に対する現在の状況
    // 最適投稿タイミング分析
  }
}
```

### 4. AutonomousExecutor統合

#### 実行フロー更新
**ファイル**: `src/core/autonomous-executor.ts`

```typescript
async executeAutonomously(): Promise<void> {
  // 1. ヘルスチェック
  const isCritical = await this.healthChecker.isCritical();
  if (isCritical) return;

  // 2. 並列実行開始
  const [accountStatus, collectionResults] = await Promise.all([
    this.accountAnalyzer.analyzeCurrentStatus(), // ← 新機能
    this.startInformationCollection() // 既存機能を前倒し
  ]);

  // 3. 統合状況評価（簡素化されたニーズ分析）
  const needs = await this.assessSimplifiedNeeds(accountStatus, collectionResults);
  
  // ... 以下既存フロー
}
```

### 5. 簡素化されたニーズ分析

#### 複雑性削減実装
```typescript
async assessSimplifiedNeeds(
  accountStatus: AccountStatus,
  collectionResults: CollectionResult[]
): Promise<Need[]> {
  const needs: Need[] = [];
  
  // シンプルな判定ロジック
  const timeSinceLastPost = Date.now() - accountStatus.currentMetrics.lastTweetTime;
  const dailyTargetInterval = (24 * 60 * 60 * 1000) / 15; // 96分
  
  if (timeSinceLastPost > dailyTargetInterval) {
    needs.push({
      id: `need-${Date.now()}-content`,
      type: 'content',
      priority: 'high',
      description: 'Need to create content for posting schedule',
      context: { timeSinceLastPost, accountStatus },
      createdAt: new Date().toISOString()
    });
  }
  
  // 複雑な経過時間分析を削除
  // 96分間隔計算の複雑ロジックを削除
  
  return needs;
}
```

### 6. データ保存システム

#### アカウント状況保存
**ファイル更新**: `data/account-config.yaml`

```yaml
# 既存構造に追加
current_analysis:
  last_analysis: [timestamp]
  health_score: [number]
  performance_trend: "improving/stable/declining"
  recommendations: []
  
performance_history:
  # 直近10回の分析結果保持
  - timestamp: [number]
    health_score: [number]
    engagement_rate: [number]
```

## 📝 実装制約

### 実用性重視原則
- 実際に価値のある分析機能を実装
- パフォーマンス分析は必要な機能として含める
- アカウント成長に寄与する実用的な機能

### API制限対応
- Twitter API rate limitを考慮した設計
- 効率的なAPI呼び出し最適化
- エラーハンドリングの適切な実装

### データ品質
- 分析結果の正確性確保
- タイムスタンプ管理の一貫性
- 履歴データの適切な管理

## 📊 出力ファイル

### 実装レポート
**場所**: `tasks/20250721_123440_workflow/outputs/`
**ファイル名**: `TASK-WF02-account-analyzer-report.yaml`

### アカウント分析結果
**場所**: `data/`
**ファイル名**: `account-analysis-results.json`（実行時生成）

## ✅ 完了基準
1. AccountAnalyzerクラス実装完了
2. X API統合完了
3. パフォーマンス分析ロジック実装完了
4. AutonomousExecutorへの統合完了
5. 簡素化されたニーズ分析実装完了
6. データ保存システム実装完了
7. TypeScript型チェック通過
8. 動作確認完了

## 🔗 依存関係
**前提条件**: TASK-WF01完了必須
**並列実行**: TASK-WF03と同時実行可能
**後続**: TASK-WF04の入力データとして使用

---
**重要**: 自分のアカウント状況を正確に把握し、意思決定の質を向上させることが最重要目標。