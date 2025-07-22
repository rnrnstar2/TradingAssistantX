# 投稿アーカイブ・分析システム設計案

## 🎯 概要
過去の投稿を無制限に保存しつつ、効率的に活用するための階層型データ管理システム

## 📊 3層データ構造

### 1️⃣ ホットデータ層（data/current/）
- **容量**: 最大1MB
- **内容**: 直近7日間の投稿サマリー
- **用途**: 即座の意思決定

### 2️⃣ ウォームデータ層（data/learning/）
- **容量**: 最大10MB
- **内容**: 過去90日間の分析済みインサイト
- **用途**: 中期的な戦略立案

### 3️⃣ コールドデータ層（data/archives/posts/）
- **容量**: 無制限
- **内容**: 全投稿の生データ（永続保存）
- **用途**: 深掘り分析時のソース

## 🔄 データフロー

```
毎日の投稿
    ↓
1. 生データをarchives/posts/YYYY-MM/に保存
    ↓
2. 日次分析でインサイト抽出
    ↓
3. learning/post-insights.yamlに追記
    ↓
4. 週次でcurrent/weekly-summary.yaml更新
    ↓
5. 月次でlearning/の古いデータをarchives/insights/へ
```

## 📁 ディレクトリ構造（拡張案）

```yaml
data/
├── current/                      # ホットデータ（1MB制限）
│   ├── account-status.yaml
│   ├── active-strategy.yaml
│   ├── today-posts.yaml         
│   ├── weekly-summary.yaml      # 🆕 週次サマリー
│   └── execution-log.yaml
│
├── learning/                     # ウォームデータ（10MB制限）
│   ├── post-insights.yaml       # 🆕 投稿分析結果
│   ├── engagement-patterns.yaml # 🆕 エンゲージメントパターン
│   ├── topic-performance.yaml   # 🆕 トピック別パフォーマンス
│   └── growth-metrics.yaml      # 🆕 成長指標
│
└── archives/                     # コールドデータ（無制限）
    ├── posts/                   # 🆕 全投稿アーカイブ
    │   ├── 2025-01/
    │   │   ├── 2025-01-22-001.yaml
    │   │   ├── 2025-01-22-002.yaml
    │   │   └── ...
    │   └── 2025-02/
    │
    └── insights/                # 🆕 古いインサイト
        ├── 2024-Q4/
        └── 2025-Q1/
```

## 🧠 分析エンジン設計

### 日次分析（data-analyzer.ts）
```typescript
interface DailyAnalysis {
  analyzePost(post: Post): PostInsight;
  updateWeeklySummary(): void;
  extractKeyLearnings(): Learning[];
}
```

### 週次深掘り分析
```typescript
interface WeeklyDeepAnalysis {
  // archives/posts/から過去データ読み込み
  loadHistoricalPosts(days: number): Post[];
  // パターン分析
  findSuccessPatterns(): Pattern[];
  // インサイト更新
  updateLearningData(): void;
}
```

## 📈 インサイトデータ構造

### post-insights.yaml
```yaml
insights:
  - date: "2025-01-22"
    total_posts: 15
    avg_engagement_rate: 3.5
    best_performing_topic: "投資基礎"
    key_findings:
      - "午前7時台の投稿が最高エンゲージメント"
      - "図解付き投稿は通常の2.3倍の反応"
```

### engagement-patterns.yaml
```yaml
patterns:
  high_engagement:
    - time_slots: ["07:00-08:00", "21:00-22:00"]
    - content_types: ["図解", "クイズ形式"]
    - topics: ["初心者向け", "失敗談"]
  
  low_engagement:
    - time_slots: ["14:00-16:00"]
    - content_types: ["長文解説"]
```

## 🎯 意思決定への活用

### DecisionEngineの拡張
```typescript
class EnhancedDecisionEngine {
  // ホットデータで即座判断
  quickDecision(): Strategy {
    const weeklyData = readYaml('current/weekly-summary.yaml');
    return this.selectStrategy(weeklyData);
  }
  
  // ウォームデータで戦略調整
  adjustStrategy(): Strategy {
    const insights = readYaml('learning/post-insights.yaml');
    const patterns = readYaml('learning/engagement-patterns.yaml');
    return this.optimizeStrategy(insights, patterns);
  }
  
  // 必要時のみコールドデータ分析
  deepAnalysis(topic: string): DetailedInsight {
    const historicalPosts = this.loadFromArchives(topic);
    return this.analyzeInDepth(historicalPosts);
  }
}
```

## 💾 データ管理ポリシー

### 自動アーカイブ
- **日次**: 投稿をarchives/posts/へ
- **週次**: 7日前のcurrentデータをlearningへ
- **月次**: 90日前のlearningデータをarchives/insights/へ

### 容量管理
- current/: 1MBを超えたら古いデータを自動削除
- learning/: 10MBを超えたら古いデータをarchivesへ
- archives/: 無制限（ただし年次で圧縮検討）

## 🚀 実装優先順位

1. **Phase 1**: archives/posts/への投稿保存機能
2. **Phase 2**: 日次分析とpost-insights.yaml生成
3. **Phase 3**: 週次サマリー機能
4. **Phase 4**: DecisionEngineの分析機能統合
5. **Phase 5**: 深掘り分析ツール

## 📋 期待効果

- **無限の学習データ**: 全投稿が永続保存され、いつでも分析可能
- **高速な意思決定**: 階層型データで必要な情報に素早くアクセス
- **継続的な改善**: 過去の成功パターンを自動的に学習・適用
- **柔軟な分析**: 必要に応じて深掘り分析が可能