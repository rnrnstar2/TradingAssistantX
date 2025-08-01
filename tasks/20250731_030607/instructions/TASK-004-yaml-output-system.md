# TASK-004: YAML出力システム実装

## 🎯 タスク概要

深夜分析結果をYAMLファイルとして保存するシステム実装。`docs/deep-night-analysis.md`の仕様に基づき、3つの出力ファイル（strategy-analysis.yaml、engagement-patterns.yaml、successful-topics.yaml）を生成します。

## 📋 MVP制約確認

**✅ MVP適合性**:
- deep-night-analysis.md仕様準拠
- 必要最小限の3ファイル出力
- 既存data-manager.ts拡張
- プロンプト変数として活用可能な形式

**🚫 実装禁止項目**:
- 複雑なデータベース機能
- 高度な統計分析
- リアルタイム更新機能
- 詳細な履歴管理

## 🔧 実装仕様

### 修正対象ファイル
`src/shared/data-manager.ts` (既存ファイル拡張)

### 出力ファイル仕様

#### 1. strategy-analysis.yaml (毎日上書き)
**保存先**: `data/current/strategy-analysis.yaml`
**用途**: 通常ワークフロー実行時のプロンプト変数

```yaml
# 日次戦略分析結果
analysis_date: "2025-07-31"
generated_at: "2025-07-31T23:55:30Z"

# 時間帯別成功率とオプティマルトピック
time_slots:
  "07:00-10:00":
    success_rate: 0.85
    avg_engagement: 3.2
    optimal_topics: ["morning_investment", "daily_strategy"]
  "12:00-14:00":
    success_rate: 0.72
    avg_engagement: 2.8
    optimal_topics: ["market_update", "practical_tips"]
  "20:00-22:00":
    success_rate: 0.91
    avg_engagement: 4.1
    optimal_topics: ["evening_analysis", "tomorrow_focus"]

# 市場機会
market_opportunities:
  - topic: "crypto_education"
    relevance: 0.89
    recommended_action: "educational_post"
    expected_engagement: 3.5

# 最適化インサイト
optimization_insights:
  - pattern: "evening_posts_perform_best"
    implementation: "prioritize_20-22_timeframe"
    expected_effect: "+25% engagement"

# 翌日の優先アクション  
priority_actions:
  - time: "07:00"
    action: "post"
    strategy: "morning_motivation_investment"
    estimated_effect: "high"

# 回避ルール
avoidance_rules:
  - condition: "market_volatility_high"
    response: "avoid_speculative_content"
    reason: "risk_management"

# 投稿最適化
post_optimization:
  recommended_topics: ["investment_basics", "risk_management"]
  avoid_topics: ["complex_derivatives", "high_risk_strategies"]
```

#### 2. engagement-patterns.yaml (累積更新)
**保存先**: `data/learning/engagement-patterns.yaml`
**用途**: 時間帯・形式別パフォーマンス追跡

```yaml
# エンゲージメントパターン（累積30日分）
last_updated: "2025-07-31T23:55:30Z"
timeframe: "30_days"

# 時間帯別パフォーマンス
time_slots:
  "07:00-10:00":
    total_posts: 15
    avg_engagement: 3.2
    success_rate: 0.85
    best_format: "motivational_quote"
  "12:00-14:00": 
    total_posts: 12
    avg_engagement: 2.8
    success_rate: 0.72
    best_format: "quick_tip"
  "20:00-22:00":
    total_posts: 18
    avg_engagement: 4.1
    success_rate: 0.91
    best_format: "analysis_summary"

# 最適フォーマット
optimal_formats:
  - format: "numbered_list"
    avg_engagement: 3.8
    usage_count: 25
    success_rate: 0.88
  - format: "question_format"
    avg_engagement: 3.4
    usage_count: 15
    success_rate: 0.82

# エンゲージメントトレンド
engagement_trend:
  direction: "increasing"
  change_rate: 0.12
  confidence: 0.85
```

#### 3. successful-topics.yaml (累積更新)
**保存先**: `data/learning/successful-topics.yaml`
**用途**: トピック別パフォーマンス追跡

```yaml
# 成功トピック分析（累積データ）
last_updated: "2025-07-31T23:55:30Z"
timeframe: "30_days"

# トピック別パフォーマンス
topics:
  - topic: "investment_basics"
    avg_engagement: 4.2
    post_count: 12
    success_rate: 0.92
    trend: "increasing"
    optimal_time: "20:00-22:00"
  - topic: "risk_management"
    avg_engagement: 3.8
    post_count: 8
    success_rate: 0.89
    trend: "stable"
    optimal_time: "07:00-10:00"
  - topic: "market_analysis"
    avg_engagement: 3.5
    post_count: 15
    success_rate: 0.76
    trend: "stable"
    optimal_time: "12:00-14:00"

# 回避すべきトピック
avoid_topics:
  - topic: "complex_derivatives"
    reason: "low_engagement"
    avg_engagement: 1.2
    post_count: 3
  - topic: "day_trading_tips"
    reason: "controversial"
    avg_engagement: 2.1
    post_count: 5
```

### 実装メソッド

#### 1. メイン保存メソッド
```typescript
async saveAnalysisResults(
  analysisResult: AnalysisResult,
  postMetrics: PostMetricsData
): Promise<void>
```

#### 2. 個別保存メソッド
```typescript
private async saveStrategyAnalysis(analysisResult: AnalysisResult, postMetrics: PostMetricsData): Promise<void>
private async updateEngagementPatterns(postMetrics: PostMetricsData): Promise<void>
private async updateSuccessfulTopics(postMetrics: PostMetricsData): Promise<void>
```

#### 3. データ構造化メソッド
```typescript
private buildStrategyAnalysisData(analysisResult: AnalysisResult, postMetrics: PostMetricsData): any
private buildEngagementPatternsData(postMetrics: PostMetricsData, existing?: any): any
private buildSuccessfulTopicsData(postMetrics: PostMetricsData, existing?: any): any
```

### データ処理ロジック

#### 時間帯別集計
```typescript
private aggregateByTimeSlot(posts: PostMetric[]): Record<string, TimeSlotMetrics> {
  const timeSlots = {
    '07:00-10:00': [],
    '12:00-14:00': [],
    '20:00-22:00': [],
    'other': []
  };
  
  posts.forEach(post => {
    const hour = new Date(post.timestamp).getHours();
    const slot = this.getTimeSlotForHour(hour);
    timeSlots[slot].push(post);
  });
  
  return this.calculateTimeSlotMetrics(timeSlots);
}
```

#### エンゲージメント率分析
```typescript
private analyzeEngagementPatterns(posts: PostMetric[]): EngagementPatterns {
  return {
    avgEngagement: posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length,
    successRate: posts.filter(p => p.performanceLevel === 'high').length / posts.length,
    trend: this.calculateTrend(posts)
  };
}
```

#### トピック抽出・分析
```typescript
private extractTopicsFromPosts(posts: PostMetric[]): TopicPerformance[] {
  // 簡易トピック抽出（キーワードベース）
  const topicKeywords = ['investment', 'crypto', 'risk', 'market', 'trading'];
  return this.analyzeTopicPerformance(posts, topicKeywords);
}
```

### ファイル操作

#### YAML書き込み
```typescript
import * as yaml from 'yaml';

private async writeYamlFile(filePath: string, data: any): Promise<void> {
  try {
    const yamlContent = yaml.stringify(data, { indent: 2 });
    await fs.writeFile(filePath, yamlContent, 'utf8');
    console.log(`✅ YAML保存完了: ${filePath}`);
  } catch (error) {
    console.error(`❌ YAML保存失敗: ${filePath}`, error);
    throw error;
  }
}
```

#### 既存ファイル読み込み（累積更新用）
```typescript
private async readExistingYaml(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return yaml.parse(content);
  } catch (error) {
    console.log(`📋 既存ファイルなし、新規作成: ${filePath}`);
    return null;
  }
}
```

## 🔗 依存関係

### TASK依存関係
- **TASK-001**: AnalysisResult型使用
- **TASK-002**: PostMetricsData型使用
- **TASK-003**: main-workflowからの呼び出し

### 実行順序制約
**直列実行必須** - TASK-001, TASK-002, TASK-003完了後

### 必須パッケージ
```typescript
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
```

## 🧪 品質要件

### ファイル安全性
- 既存ファイルのバックアップ
- 原子的書き込み操作
- ディスク容量チェック

### データ整合性
```typescript
// YAML構文検証
private validateYamlStructure(data: any): boolean {
  try {
    yaml.stringify(data);
    return true;
  } catch {
    return false;
  }
}
```

### エラー処理
```typescript
try {
  await this.saveStrategyAnalysis(analysisResult, postMetrics);
} catch (error) {
  console.error('❌ strategy-analysis.yaml保存失敗:', error);
  // 個別ファイルエラーでも他のファイル保存は継続
}
```

## ✅ 完成基準

1. **3ファイル出力**: strategy-analysis.yaml, engagement-patterns.yaml, successful-topics.yaml正常生成
2. **データ構造**: docs/deep-night-analysis.md仕様準拠
3. **累積更新**: learning/配下ファイルの適切な更新
4. **エラーハンドリング**: ファイル操作エラーの適切な処理
5. **プロンプト変数対応**: 生成されたYAMLがプロンプトで読み込み可能

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-004-yaml-output-system.md`に記載：

1. **実装サマリー**: YAML出力システムの概要
2. **ファイル仕様**: 3つの出力ファイルの詳細構造
3. **データ処理**: 時間帯別・トピック別分析ロジック
4. **品質確認**: YAML構文・データ整合性の確認
5. **出力テスト**: 実際の分析結果でのファイル生成確認
6. **プロンプト連携**: 生成されたYAMLのプロンプト変数活用確認

## 🚨 注意事項

- **仕様準拠**: docs/deep-night-analysis.mdの出力仕様を厳密に遵守
- **累積更新**: learning/配下は既存データとの統合が必須
- **ファイル権限**: data/ディレクトリへの書き込み権限確認
- **メモリ効率**: 大量データ処理時のメモリ効率性