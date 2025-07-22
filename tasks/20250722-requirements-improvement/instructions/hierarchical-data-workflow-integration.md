# 階層型データ管理のワークフロー統合案

## 🎯 実装方針
最小限のファイル追加で階層型データ管理を実現する

## 📋 必要なファイル変更

### 1. 既存ファイルの拡張（新規ファイル追加なし）

#### data-optimizer.ts の機能拡張
```typescript
// 既存のdata-optimizer.tsに以下の機能を追加
class DataOptimizer {
  // 既存の最適化機能に加えて...
  
  async archivePost(post: Post): Promise<void> {
    // 投稿をarchives/posts/YYYY-MM/に保存
    const archivePath = `data/archives/posts/${format(new Date(), 'yyyy-MM')}`;
    const fileName = `${format(new Date(), 'yyyy-MM-dd-HHmmss')}.yaml`;
    await writeYaml(`${archivePath}/${fileName}`, post);
  }
  
  async extractInsights(posts: Post[]): Promise<PostInsights> {
    // 投稿から分析結果を抽出
    return {
      avgEngagement: calculateAverage(posts),
      bestTopic: findBestPerforming(posts),
      keyFindings: analyzePatterns(posts)
    };
  }
  
  async performHierarchicalMaintenance(): Promise<void> {
    // 階層間のデータ移動を実行
    await this.moveOldCurrentToLearning();
    await this.moveOldLearningToArchives();
    await this.enforceStorageLimits();
  }
}
```

### 2. 最小限の新規ファイル追加（3つのみ）

#### data/current/weekly-summary.yaml
```yaml
# 週次サマリー（自動生成）
summary:
  week_of: "2025-01-20"
  total_posts: 105
  avg_engagement: 3.2
  top_topics: ["投資基礎", "リスク管理"]
  key_insights:
    - "朝7時台の投稿が最も効果的"
    - "図解付き投稿のエンゲージメント2.3倍"
```

#### data/learning/post-insights.yaml
```yaml
# 分析済みインサイト（自動更新）
insights:
  - date: "2025-01-22"
    posts_analyzed: 15
    success_patterns:
      - time: "07:00-08:00"
        engagement_boost: 1.5
    learnings:
      - "初心者向けコンテンツの需要高"
```

#### data/learning/engagement-patterns.yaml
```yaml
# エンゲージメントパターン（自動学習）
patterns:
  high_performing:
    times: ["07:00", "21:00"]
    formats: ["Q&A", "図解"]
  low_performing:
    times: ["14:00-16:00"]
    formats: ["長文解説"]
```

## 🔄 ワークフローへの統合

### 1. 投稿実行フロー（x-poster.ts）
```typescript
async function postToX(content: PostContent) {
  // 1. 通常の投稿処理
  const result = await xApi.post(content);
  
  // 2. 生データを即座にアーカイブ
  await dataOptimizer.archivePost({
    ...content,
    result,
    timestamp: new Date()
  });
  
  // 3. today-posts.yamlを更新
  await updateTodayPosts(result);
}
```

### 2. 日次分析フロー（core-runner.ts）
```typescript
async function performDailyAnalysis() {
  // 実行の最後に分析を追加
  const todayPosts = await readYaml('data/current/today-posts.yaml');
  
  // インサイト抽出
  const insights = await dataOptimizer.extractInsights(todayPosts);
  
  // learning層に保存
  await appendToYaml('data/learning/post-insights.yaml', insights);
  
  // 週次サマリー更新（日曜日のみ）
  if (new Date().getDay() === 0) {
    await updateWeeklySummary();
  }
}
```

### 3. 意思決定への活用（decision-engine.ts）
```typescript
class DecisionEngine {
  async selectStrategy() {
    // 階層的にデータを参照
    
    // 1. まずホットデータ（高速）
    const weeklyData = await readYaml('data/current/weekly-summary.yaml');
    if (weeklyData.avg_engagement < 2) {
      return this.adjustStrategy(weeklyData);
    }
    
    // 2. 必要に応じてウォームデータ
    const patterns = await readYaml('data/learning/engagement-patterns.yaml');
    return this.optimizeWithPatterns(patterns);
    
    // 3. 深掘りが必要な場合のみコールドデータ
    // （通常の実行では使用しない）
  }
}
```

### 4. データメンテナンス（main.ts）
```typescript
// 日次実行の最後に追加
async function dailyMaintenance() {
  // 階層型データ管理のメンテナンス
  await dataOptimizer.performHierarchicalMaintenance();
  
  // 整合性チェック
  await integrityChecker.validateDataStructure();
}
```

## 📊 実装の利点

### ファイル数を最小限に抑制
- 新規ファイル: 3つのみ（weekly-summary, post-insights, engagement-patterns）
- 他は既存ファイルの拡張で対応

### 自動化による運用負荷ゼロ
- 投稿時に自動アーカイブ
- 日次で自動分析
- 週次/月次で自動データ移行

### パフォーマンスへの配慮
- 通常は軽量なcurrent/データのみ参照
- 必要時のみlearning/データを使用
- archives/は特別な分析時のみアクセス

## 🚨 実装時の注意点

1. **archives/posts/のディレクトリ作成**
   - 月別ディレクトリは自動作成する仕組みを追加

2. **ファイルサイズ監視**
   - integrity-checker.tsで各層のサイズを監視

3. **データ移行の安全性**
   - 移行前にバックアップ
   - 移行後に整合性確認

## 📅 段階的実装

### Phase 1（即実装可能）
- x-poster.tsでの自動アーカイブ
- data-optimizer.tsの基本拡張

### Phase 2（1週間後）
- 日次分析機能の追加
- weekly-summary.yamlの自動生成

### Phase 3（2週間後）
- engagement-patterns.yamlの学習機能
- decision-engineでの活用

この実装により、最小限のファイル追加で強力な階層型データ管理が実現できます。