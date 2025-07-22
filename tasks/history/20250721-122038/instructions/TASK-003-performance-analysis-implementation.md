# TASK-003: X アカウント パフォーマンス分析システム実装

## 🎯 目的
X アカウント管理に必須のパフォーマンス分析機能を実装し、Claude Code による自律的な戦略最適化を実現する。

## 📊 ユーザー指定要件

### 実行方針
- **序盤並列実行**: 毎回の自律実行サイクルで並列実行
- **Playwright活用**: 自分のアカウント状況をリアルタイム取得
- **報告書システム**: 分析結果を次のClaude Codeが活用できる形で保存
- **最適判断支援**: 蓄積データに基づく戦略決定の高度化

## 🏗️ システム設計

### 1. アクション追加

#### Decision Engine マッピング
```typescript
// src/core/decision-engine.ts に追加
{
  'analyze_performance': 'performance_analysis',
  'check_engagement': 'engagement_analysis', 
  'review_growth': 'growth_analysis'
}
```

#### Parallel Manager 実装
```typescript
// src/core/parallel-manager.ts に追加
{
  'performance_analysis': () => this.executePerformanceAnalysis(action),
  'engagement_analysis': () => this.executeEngagementAnalysis(action),
  'growth_analysis': () => this.executeGrowthAnalysis(action)
}
```

### 2. 並列実行の優先実装

#### 常時並列実行パターン
```typescript
// Claude判断で常に以下が含まれるよう調整
[
  {
    "type": "content_generation", 
    "priority": "high"
  },
  {
    "type": "analyze_performance",
    "priority": "medium"  // 毎回並列で実行
  }
]
```

### 3. データ収集システム

#### Playwright X アカウント分析
**新ファイル**: `src/lib/x-performance-analyzer.ts`

```typescript
export class XPerformanceAnalyzer {
  // 自分のプロフィールページ分析
  async analyzeAccountMetrics(): Promise<AccountMetrics>
  
  // 最近の投稿パフォーマンス分析
  async analyzeRecentPosts(): Promise<PostMetrics[]>
  
  // フォロワー動向分析
  async analyzeFollowerTrends(): Promise<FollowerMetrics>
  
  // エンゲージメント率計算
  async calculateEngagementRate(): Promise<EngagementMetrics>
}
```

#### 収集データ構造
```typescript
interface AccountMetrics {
  followerCount: number;
  followingCount: number;
  totalTweets: number;
  accountAge: string;
  verificationStatus: boolean;
  lastUpdated: string;
}

interface PostMetrics {
  postId: string;
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  engagementRate: number;
}

interface EngagementMetrics {
  averageEngagementRate: number;
  bestPerformingPost: PostMetrics;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  optimalPostingTimes: string[];
}
```

### 4. 報告書生成システム

#### 自動報告書作成
**保存先**: `data/performance-reports/performance-{timestamp}.md`

#### 報告書テンプレート
```markdown
# X アカウント パフォーマンス分析報告書

## 📊 基本指標
- フォロワー数: {followerCount}
- エンゲージメント率: {engagementRate}%
- 今日の投稿数: {todayPosts}

## 📈 パフォーマンス分析
- 最高パフォーマンス投稿: {bestPost}
- トレンド: {trend}
- 推奨改善点: {recommendations}

## 🎯 次回戦略提案
{nextStrategy}
```

### 5. Claude Code 連携システム

#### コンテキスト読み込み強化
```typescript
// autonomous-executor.ts で現在状況読み込み時に追加
const performanceContext = await this.loadLatestPerformanceReport();
context.performance = performanceContext;
```

#### 決定支援データ
```typescript
// Claude に提供する追加コンテキスト
{
  "currentPerformance": {
    "engagementRate": 3.2,
    "followerGrowth": "+15 (24h)",
    "bestPostTime": "18:00-20:00",
    "contentPerformance": {
      "educational": 4.1,
      "market_analysis": 3.8,
      "tips": 3.5
    }
  }
}
```

## 🔄 実装ワークフロー

### Phase 1: 基本分析機能
1. **XPerformanceAnalyzer クラス作成**
2. **基本メトリクス収集（フォロワー、エンゲージメント）**
3. **ParallelManager への統合**

### Phase 2: 高度分析機能
1. **投稿パフォーマンス詳細分析**
2. **最適化提案生成**
3. **トレンド分析**

### Phase 3: 戦略最適化
1. **Claude判断への分析結果活用**
2. **自動戦略調整**
3. **継続的改善ループ**

## 📁 ファイル構成

```
src/lib/
├── x-performance-analyzer.ts     # メイン分析エンジン
├── performance-report-generator.ts # 報告書生成
└── metrics-collector.ts          # データ収集

data/
├── performance-reports/           # 分析報告書
├── metrics-history/              # 履歴データ
└── optimization-logs/            # 最適化ログ
```

## ✅ 品質要件

### 技術要件
- **TypeScript strict mode 遵守**
- **ESLint エラーなし**
- **Playwright安定動作**
- **データ整合性確保**

### パフォーマンス要件
- **分析実行時間**: 30秒以内
- **メモリ使用量**: 適切な範囲内
- **エラーハンドリング**: 分析失敗時の適切な処理

## 📋 報告書要件

### 作成ファイル
**報告書**: `tasks/20250721-122038/reports/REPORT-003-performance-analysis-implementation.md`

### 含めるべき内容
1. **実装した機能一覧**
2. **分析精度の確認結果**
3. **Claude Code連携の動作確認**
4. **サンプル分析報告書**

## 🎯 成功基準

1. **パフォーマンス分析の自動実行確認**
2. **報告書生成の動作確認**
3. **Claude Code による分析結果活用確認**
4. **並列実行での安定動作確認**

---

**重要**: この実装によりX アカウント管理が **データドリブン** になり、Claude Code による自律的な戦略最適化が実現されます。