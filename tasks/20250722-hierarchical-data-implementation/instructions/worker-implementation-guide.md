# Worker向け階層型データ管理実装指示書

## 🎯 実装目標
REQUIREMENTS.mdに定義された階層型データ管理システムを実装し、過去の投稿を無限に保存しながら効率的に活用できる仕組みを構築する。

## 📊 現状分析結果

### 未実装項目
1. **投稿アーカイブ機能**: x-poster.tsで投稿時にarchives/posts/へ保存する機能
2. **データ分析機能**: data-optimizer.tsにインサイト抽出機能の追加
3. **必須ファイル**: 以下のファイルが存在しない
   - `data/current/weekly-summary.yaml`
   - `data/current/execution-log.yaml`
   - `data/learning/post-insights.yaml`
   - `data/learning/engagement-patterns.yaml`
4. **ディレクトリ構造**: `data/archives/posts/`が存在しない

## 🔧 実装タスク

### 1. data-optimizer.tsの拡張

#### 1.1 投稿アーカイブ機能の追加
```typescript
// DataOptimizerクラスに以下のメソッドを追加

/**
 * 投稿データをアーカイブ
 */
async archivePost(post: {
  content: string;
  timestamp: Date;
  postId?: string;
  engagementMetrics?: any;
}): Promise<void> {
  const archivePath = `data/archives/posts/${format(new Date(), 'yyyy-MM')}`;
  const fileName = `${format(new Date(), 'yyyy-MM-dd-HHmmss')}.yaml`;
  
  // ディレクトリ作成
  await fs.mkdir(archivePath, { recursive: true });
  
  // 投稿データを保存
  await writeYamlAsync(`${archivePath}/${fileName}`, {
    ...post,
    archived_at: new Date().toISOString()
  });
}

/**
 * 投稿データからインサイトを抽出
 */
async extractPostInsights(posts: any[]): Promise<void> {
  const insights = {
    date: format(new Date(), 'yyyy-MM-dd'),
    total_posts: posts.length,
    avg_engagement_rate: this.calculateAvgEngagement(posts),
    best_performing_topic: this.findBestTopic(posts),
    key_findings: this.analyzePatterns(posts)
  };
  
  // post-insights.yamlに追記
  const insightsPath = 'data/learning/post-insights.yaml';
  const existing = await this.loadOrCreateYaml(insightsPath, { insights: [] });
  existing.insights.push(insights);
  
  // 90日以上古いデータは削除
  existing.insights = existing.insights.filter(i => 
    new Date(i.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );
  
  await writeYamlAsync(insightsPath, existing);
}

/**
 * 週次サマリーの更新
 */
async updateWeeklySummary(): Promise<void> {
  const weekStart = startOfWeek(new Date());
  const todayPosts = await loadYamlAsync('data/current/today-posts.yaml');
  
  const summary = {
    week_of: format(weekStart, 'yyyy-MM-dd'),
    total_posts: todayPosts?.posts?.length || 0,
    avg_engagement: this.calculateAvgEngagement(todayPosts?.posts || []),
    top_topics: this.extractTopTopics(todayPosts?.posts || []),
    key_insights: this.generateWeeklyInsights(todayPosts?.posts || [])
  };
  
  await writeYamlAsync('data/current/weekly-summary.yaml', { summary });
}

/**
 * エンゲージメントパターンの分析
 */
async analyzeEngagementPatterns(): Promise<void> {
  const postsData = await this.loadRecentPosts(30); // 過去30日分
  
  const patterns = {
    high_performing: {
      times: this.findHighEngagementTimes(postsData),
      formats: this.findHighEngagementFormats(postsData)
    },
    low_performing: {
      times: this.findLowEngagementTimes(postsData),
      formats: this.findLowEngagementFormats(postsData)
    },
    updated_at: new Date().toISOString()
  };
  
  await writeYamlAsync('data/learning/engagement-patterns.yaml', { patterns });
}
```

### 2. x-poster.tsの拡張

#### 2.1 投稿実行時のアーカイブ処理追加
```typescript
// postToX メソッドの成功時処理に追加

if (result.success) {
  // 既存の処理
  await this.trackPostResult(result.postId!, formattedContent, true);
  
  // 新規：DataOptimizerを使用してアーカイブ
  const dataOptimizer = new DataOptimizer();
  await dataOptimizer.archivePost({
    content: formattedContent,
    timestamp: new Date(),
    postId: result.postId,
    metadata: {
      hashtags: this.extractHashtags(formattedContent),
      contentLength: formattedContent.length
    }
  });
  
  // 今日の投稿データを更新してインサイト抽出
  const todayPosts = await this.loadTodayPosts();
  await dataOptimizer.extractPostInsights(todayPosts);
}
```

### 3. core-runner.tsへの統合

#### 3.1 実行終了時の分析処理
```typescript
// runCore関数の最後に追加

// 階層型データ管理のメンテナンス
const dataOptimizer = new DataOptimizer();

// 日次分析
await dataOptimizer.extractPostInsights(todayPosts);

// 週次サマリー更新（日曜日のみ）
if (new Date().getDay() === 0) {
  await dataOptimizer.updateWeeklySummary();
}

// エンゲージメントパターン分析
await dataOptimizer.analyzeEngagementPatterns();

// データ階層の自動移行
await dataOptimizer.performHierarchicalMaintenance();
```

### 4. decision-engine.tsの修正

#### 4.1 階層型データの活用
```typescript
// selectStrategy メソッドの改修

async selectStrategy(): Promise<Strategy> {
  // 1. ホットデータから即座に判断
  const weeklyData = await readYaml('data/current/weekly-summary.yaml');
  if (weeklyData?.summary?.avg_engagement < 2) {
    return this.adjustStrategyBasedOnWeekly(weeklyData);
  }
  
  // 2. 必要に応じてウォームデータを参照
  const patterns = await readYaml('data/learning/engagement-patterns.yaml');
  const insights = await readYaml('data/learning/post-insights.yaml');
  
  return this.optimizeStrategyWithPatterns(patterns, insights);
  
  // 3. 深掘り分析は特別な場合のみ（通常フローでは使用しない）
}
```

### 5. 必須ファイルの初期作成

#### 5.1 初期化スクリプトの作成
```typescript
// src/scripts/init-hierarchical-data.ts

async function initializeHierarchicalData() {
  // 必須ディレクトリの作成
  await fs.mkdir('data/archives/posts', { recursive: true });
  await fs.mkdir('data/archives/insights', { recursive: true });
  
  // 必須ファイルの初期化
  const files = [
    {
      path: 'data/current/weekly-summary.yaml',
      content: {
        summary: {
          week_of: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
          total_posts: 0,
          avg_engagement: 0,
          top_topics: [],
          key_insights: []
        }
      }
    },
    {
      path: 'data/current/execution-log.yaml',
      content: {
        execution_log: []
      }
    },
    {
      path: 'data/learning/post-insights.yaml',
      content: {
        insights: []
      }
    },
    {
      path: 'data/learning/engagement-patterns.yaml',
      content: {
        patterns: {
          high_performing: { times: [], formats: [] },
          low_performing: { times: [], formats: [] }
        }
      }
    }
  ];
  
  for (const file of files) {
    if (!await fileExists(file.path)) {
      await writeYamlAsync(file.path, file.content);
      console.log(`Created: ${file.path}`);
    }
  }
}
```

## 📋 実装チェックリスト

- [ ] data-optimizer.tsに投稿アーカイブ機能追加
- [ ] data-optimizer.tsにインサイト抽出機能追加
- [ ] data-optimizer.tsに週次サマリー機能追加
- [ ] data-optimizer.tsにエンゲージメント分析機能追加
- [ ] x-poster.tsの投稿成功時にアーカイブ処理追加
- [ ] core-runner.tsに日次分析処理追加
- [ ] decision-engine.tsで階層型データを活用
- [ ] 初期化スクリプトで必須ファイル作成
- [ ] package.jsonに初期化スクリプト追加

## 🚨 実装時の注意点

1. **ファイルサイズ制限の遵守**
   - current/: 最大1MB
   - learning/: 最大10MB
   - archives/: 無制限（ただし適切に月別管理）

2. **既存機能への影響最小化**
   - 既存のデータフローを阻害しない
   - エラー時は処理を継続（アーカイブ失敗で投稿を止めない）

3. **パフォーマンスへの配慮**
   - archives/の読み込みは最小限に
   - 通常フローではcurrent/とlearning/のみ使用

4. **要件定義との整合性**
   - REQUIREMENTS.mdに記載された構造を厳守
   - 新規ファイルは定義されたもののみ作成

## 🎯 期待される成果

- 全投稿データの永続保存
- 高速な意思決定（階層的データ参照）
- 自動的な学習とパターン認識
- 容量管理の自動化

## 📅 実装順序

1. 初期化スクリプトの実行（必須ファイル作成）
2. data-optimizer.tsの拡張
3. x-poster.tsの修正
4. core-runner.tsへの統合
5. decision-engine.tsの最適化
6. 動作確認とテスト