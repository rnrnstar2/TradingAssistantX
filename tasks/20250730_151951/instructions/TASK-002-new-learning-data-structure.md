# TASK-002: 新学習データ構造対応実装

## 🎯 タスク概要
src/shared/data-manager.ts を拡張し、深夜大規模分析システムで使用する新しい学習データ構造（daily-insights-YYYYMMDD.yaml, tomorrow-strategy.yaml等）に対応する。

## 📋 参照必須ドキュメント
実装前に以下のドキュメントを必ず読み込んでください：
- `docs/claude.md` - 🌙 深夜大規模分析システム：学習データ構造の進化
- `docs/directory-structure.md` - 🌙 深夜大規模分析システム（新設計）
- `docs/workflow.md` - Step 4深夜大規模分析の生成ファイル仕様

## 🎯 実装目標
従来の意味のない反復データ（decision-patterns.yaml）から、実用的な洞察データ（daily-insights, tomorrow-strategy）への移行を支援するデータ管理機能を実装する。

## 📊 実装内容詳細

### 1. 新インターフェース定義
以下のインターフェースをdata-manager.tsに追加：

```typescript
// 日次大規模分析結果
export interface DailyInsight {
  date: string; // YYYY-MM-DD
  performancePatterns: PerformancePattern[];
  marketOpportunities: MarketOpportunity[];
  optimizationInsights: OptimizationInsight[];
  generatedAt: string; // ISO timestamp
  analysisVersion: string; // "v1.0"
}

// 時間帯別パフォーマンスパターン
export interface PerformancePattern {
  timeSlot: string; // "07:00-10:00"
  successRate: number; // 0.85
  optimalTopics: string[]; // ["朝の投資情報", "市場開始前準備"]
  avgEngagementRate: number;
  sampleSize: number; // 分析対象データ数
}

// 市場機会情報
export interface MarketOpportunity {
  topic: string; // "NISA制度改正"
  relevance: number; // 0.9
  recommendedAction: 'educational_post' | 'engagement' | 'monitoring';
  expectedEngagement: number; // 4.2
  timeframeWindow: string; // "next_3_days"
  reasoning: string;
}

// 最適化洞察
export interface OptimizationInsight {
  pattern: string; // "quote_tweet_evening_high_success"
  implementation: string; // "夕方の引用ツイートを30%増加"
  expectedImpact: string; // "+15% engagement"
  confidence: number; // 0-1
  priority: 'high' | 'medium' | 'low';
}

// 翌日実行戦略
export interface TomorrowStrategy {
  targetDate: string; // YYYY-MM-DD
  priorityActions: PriorityAction[];
  avoidanceRules: AvoidanceRule[];
  expectedMetrics: ExpectedMetrics;
  generatedAt: string; // ISO timestamp
  validUntil: string; // ISO timestamp (翌日23:59まで)
}

// 優先アクション
export interface PriorityAction {
  timeSlot: string; // "07:00"
  action: 'post' | 'retweet' | 'quote_tweet' | 'like';
  topic: string;
  parameters?: {
    targetQuery?: string;
    hashtags?: string[];
    audience?: string;
  };
  expectedEngagement: number;
  reasoning: string;
  priority: number; // 1-10
}

// 回避ルール
export interface AvoidanceRule {
  condition: string; // "市場急落時"
  avoidAction: string; // "楽観的投稿"
  reason: string;
  severity: 'critical' | 'warning' | 'info';
}

// 期待メトリクス
export interface ExpectedMetrics {
  targetFollowerGrowth: number;
  targetEngagementRate: number;
  expectedActions: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceLevel: number; // 0-1
}

// 日次パフォーマンス集計
export interface PerformanceSummary {
  date: string; // YYYY-MM-DD
  totalActions: number;
  successfulActions: number;
  successRate: number;
  engagementMetrics: {
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    avgEngagementRate: number;
  };
  followerGrowth: number;
  topPerformingActions: Array<{
    action: string;
    topic: string;
    engagementRate: number;
  }>;
  insights: string[];
  generatedAt: string;
}
```

### 2. 新学習データ管理メソッド実装
以下のメソッドをDataManagerクラスに追加：

```typescript
/**
 * 日次大規模分析結果の保存
 */
async saveDailyInsights(insights: DailyInsight): Promise<void> {
  const filename = `daily-insights-${insights.date.replace(/-/g, '')}.yaml`;
  const filepath = path.join(this.dataRoot, 'learning', filename);
  
  try {
    const yamlContent = yaml.dump(insights, { 
      flowLevel: 2,
      indent: 2,
      lineWidth: 120
    });
    
    await fs.writeFile(filepath, yamlContent, 'utf8');
    console.log(`✅ 日次分析結果保存完了: ${filename}`);
    
    // 古いファイルのクリーンアップ（30日以上古いファイル削除）
    await this.cleanupOldDailyInsights();
    
  } catch (error) {
    console.error(`❌ 日次分析結果保存エラー: ${filename}`, error);
    throw error;
  }
}

/**
 * 翌日戦略の保存
 */
async saveTomorrowStrategy(strategy: TomorrowStrategy): Promise<void> {
  const filepath = path.join(this.dataRoot, 'current', 'tomorrow-strategy.yaml');
  
  try {
    const yamlContent = yaml.dump(strategy, {
      flowLevel: 2,
      indent: 2,
      lineWidth: 120
    });
    
    await fs.writeFile(filepath, yamlContent, 'utf8');
    console.log('✅ 翌日戦略保存完了: tomorrow-strategy.yaml');
    
  } catch (error) {
    console.error('❌ 翌日戦略保存エラー:', error);
    throw error;
  }
}

/**
 * 日次パフォーマンス集計の保存
 */
async savePerformanceSummary(summary: PerformanceSummary): Promise<void> {
  const filename = `performance-summary-${summary.date.replace(/-/g, '')}.yaml`;
  const filepath = path.join(this.dataRoot, 'learning', filename);
  
  try {
    const yamlContent = yaml.dump(summary, {
      flowLevel: 2,
      indent: 2,
      lineWidth: 120
    });
    
    await fs.writeFile(filepath, yamlContent, 'utf8');
    console.log(`✅ パフォーマンス集計保存完了: ${filename}`);
    
  } catch (error) {
    console.error(`❌ パフォーマンス集計保存エラー: ${filename}`, error);
    throw error;
  }
}

/**
 * 翌日戦略の読み込み
 */
async loadTomorrowStrategy(): Promise<TomorrowStrategy | null> {
  const filepath = path.join(this.dataRoot, 'current', 'tomorrow-strategy.yaml');
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    const strategy = yaml.load(content) as TomorrowStrategy;
    
    // 有効期限チェック
    if (new Date() > new Date(strategy.validUntil)) {
      console.warn('⚠️ 翌日戦略の有効期限が切れています');
      return null;
    }
    
    console.log('✅ 翌日戦略読み込み完了');
    return strategy;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 翌日戦略ファイルが存在しません（初回実行）');
      return null;
    }
    console.error('❌ 翌日戦略読み込みエラー:', error);
    throw error;
  }
}

/**
 * 日次分析結果の読み込み（指定日または最新）
 */
async loadDailyInsights(date?: string): Promise<DailyInsight | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const filename = `daily-insights-${targetDate.replace(/-/g, '')}.yaml`;
  const filepath = path.join(this.dataRoot, 'learning', filename);
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    const insights = yaml.load(content) as DailyInsight;
    
    console.log(`✅ 日次分析結果読み込み完了: ${filename}`);
    return insights;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`📝 日次分析結果ファイルが存在しません: ${filename}`);
      return null;
    }
    console.error(`❌ 日次分析結果読み込みエラー: ${filename}`, error);
    throw error;
  }
}

/**
 * 最近N日間の日次分析結果を取得
 */
async loadRecentDailyInsights(days: number = 7): Promise<DailyInsight[]> {
  const insights: DailyInsight[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dailyInsight = await this.loadDailyInsights(dateStr);
    if (dailyInsight) {
      insights.push(dailyInsight);
    }
  }
  
  console.log(`✅ 最近${days}日間の分析結果読み込み完了: ${insights.length}件`);
  return insights;
}

/**
 * 古い日次分析ファイルのクリーンアップ（30日以上前）
 */
private async cleanupOldDailyInsights(): Promise<void> {
  const learningDir = path.join(this.dataRoot, 'learning');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  
  try {
    const files = await fs.readdir(learningDir);
    const insightFiles = files.filter(file => 
      file.startsWith('daily-insights-') && file.endsWith('.yaml')
    );
    
    for (const file of insightFiles) {
      // ファイル名から日付を抽出 (daily-insights-YYYYMMDD.yaml)
      const dateMatch = file.match(/daily-insights-(\d{8})\.yaml/);
      if (dateMatch) {
        const fileDateStr = dateMatch[1];
        const fileDate = new Date(
          `${fileDateStr.slice(0,4)}-${fileDateStr.slice(4,6)}-${fileDateStr.slice(6,8)}`
        );
        
        if (fileDate < thirtyDaysAgo) {
          const filepath = path.join(learningDir, file);
          await fs.unlink(filepath);
          console.log(`🗑️ 古い分析ファイルを削除: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ 古いファイルクリーンアップでエラー:', error);
    // クリーンアップエラーは致命的でない
  }
}
```

### 3. レガシーデータとの互換性維持
従来のdecision-patterns.yamlとの互換性を保ちつつ、段階的移行をサポート：

```typescript
/**
 * レガシー学習データの変換
 * decision-patterns.yaml → 新構造への変換支援
 */
async convertLegacyLearningData(): Promise<{
  converted: number;
  errors: number;
  insights: string[];
}> {
  try {
    const legacyData = await this.loadLearningData();
    const convertedInsights: string[] = [];
    let converted = 0;
    let errors = 0;
    
    // レガシーデータから有用な情報を抽出
    // ※ 既存のdecision-patterns.yamlは意味のないデータが多いため
    // 将来の実装では実際のデータから有用な情報を抽出
    
    console.log(`📊 レガシーデータ変換完了: 変換${converted}件, エラー${errors}件`);
    
    return {
      converted,
      errors,
      insights: convertedInsights
    };
    
  } catch (error) {
    console.error('❌ レガシーデータ変換エラー:', error);
    throw error;
  }
}

/**
 * データ移行状況の確認
 */
async checkMigrationStatus(): Promise<{
  hasLegacyData: boolean;
  hasNewStructure: boolean;
  migrationRecommended: boolean;
  details: string[];
}> {
  const details: string[] = [];
  
  // レガシーデータの存在確認
  const hasLegacyData = await this.checkFileExists(
    path.join(this.dataRoot, 'learning', 'decision-patterns.yaml')
  );
  
  // 新構造データの存在確認
  const recentInsights = await this.loadRecentDailyInsights(3);
  const hasNewStructure = recentInsights.length > 0;
  
  const migrationRecommended = hasLegacyData && !hasNewStructure;
  
  if (hasLegacyData) details.push('レガシー学習データ検出');
  if (hasNewStructure) details.push('新構造データ利用中');
  if (migrationRecommended) details.push('データ移行推奨');
  
  return {
    hasLegacyData,
    hasNewStructure,
    migrationRecommended,
    details
  };
}

/**
 * ファイル存在確認ヘルパー
 */
private async checkFileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}
```

### 4. データ整合性検証機能
新しい学習データの整合性を保証する機能：

```typescript
/**
 * 日次分析結果の検証
 */
validateDailyInsights(insights: DailyInsight): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 基本的な型チェック
  if (!insights.date || !/^\d{4}-\d{2}-\d{2}$/.test(insights.date)) {
    errors.push('無効な日付形式');
  }
  
  if (!Array.isArray(insights.performancePatterns)) {
    errors.push('performancePatternsが配列ではない');
  }
  
  // パフォーマンスパターンの検証
  insights.performancePatterns?.forEach((pattern, index) => {
    if (pattern.successRate < 0 || pattern.successRate > 1) {
      errors.push(`パフォーマンスパターン[${index}]: 成功率が範囲外 (0-1)`);
    }
    if (pattern.sampleSize <= 0) {
      errors.push(`パフォーマンスパターン[${index}]: サンプルサイズが無効`);
    }
  });
  
  // 市場機会の検証
  insights.marketOpportunities?.forEach((opportunity, index) => {
    if (opportunity.relevance < 0 || opportunity.relevance > 1) {
      errors.push(`市場機会[${index}]: 関連度が範囲外 (0-1)`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 翌日戦略の検証
 */
validateTomorrowStrategy(strategy: TomorrowStrategy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 基本的な型チェック
  if (!strategy.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(strategy.targetDate)) {
    errors.push('無効な対象日付形式');
  }
  
  if (!Array.isArray(strategy.priorityActions)) {
    errors.push('優先アクションが配列ではない');
  }
  
  // アクションの検証
  strategy.priorityActions?.forEach((action, index) => {
    if (!['post', 'retweet', 'quote_tweet', 'like'].includes(action.action)) {
      errors.push(`優先アクション[${index}]: 無効なアクション種別`);
    }
    if (action.priority < 1 || action.priority > 10) {
      errors.push(`優先アクション[${index}]: 優先度が範囲外 (1-10)`);
    }
  });
  
  // 期待メトリクスの検証
  if (strategy.expectedMetrics.confidenceLevel < 0 || strategy.expectedMetrics.confidenceLevel > 1) {
    errors.push('信頼度レベルが範囲外 (0-1)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 🚨 重要な制約・注意事項

### MVP制約遵守
- ✅ **必要最小限の機能**: 深夜大規模分析に必要なデータ管理機能のみ
- 🚫 **データベース禁止**: YAMLファイルベースの管理を維持
- 🚫 **過剰な抽象化禁止**: シンプルなデータ管理機能に留める

### データ管理制約
- **ファイルサイズ制限**: learning/ ディレクトリは最大10MB
- **自動クリーンアップ**: 30日以上古いファイルは自動削除
- **アトミック操作**: データ書き込み時の整合性保証

### 型安全性
- **TypeScript strict mode**: すべてのインターフェースが厳格モード対応
- **バリデーション必須**: データ読み書き時の検証機能
- **後方互換性**: 既存のdata-manager機能を破壊しない

## 📂 出力管理
- ❌ **ルートディレクトリ出力禁止**: 一時ファイルも含めてルート出力禁止
- ✅ **data/learning/**: 日次分析結果・パフォーマンス集計
- ✅ **data/current/**: 翌日戦略ファイル
- ✅ **命名規則遵守**: ドキュメント指定の命名形式に従う

## 🧪 テスト要件
1. **データ保存テスト**: 各新メソッドの正常系・異常系テスト
2. **バリデーションテスト**: データ検証機能の動作確認
3. **クリーンアップテスト**: 古いファイル削除機能のテスト
4. **互換性テスト**: レガシーデータとの共存確認

## ✅ 完了基準
1. すべての新インターフェースが定義されている
2. 新学習データ管理メソッドが完全に実装されている
3. データ検証機能が正常に動作する
4. レガシーデータとの互換性が保たれている
5. npm run lint および npm run typecheck が通る
6. 単体テストがすべて通る

## 📋 実装後の報告書作成
実装完了後、以下の報告書を作成してください：
- 📄 **報告書パス**: `tasks/20250730_151951/reports/REPORT-002-new-learning-data-structure.md`
- 📊 **実装内容**: 新データ構造・メソッド詳細・互換性確認
- 🚨 **重要**: TypeScript型チェックとlintの通過確認を含める

## 🎯 最重要事項
この実装により、TradingAssistantXの学習データは「意味のない反復データ」から「実用的な戦略洞察」へ進化します。データの整合性と将来の拡張性を考慮した、堅牢で保守性の高い実装をお願いします。