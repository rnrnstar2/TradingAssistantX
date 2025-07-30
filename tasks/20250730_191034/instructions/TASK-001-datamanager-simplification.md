# TASK-001: DataManager大幅簡素化実装

## 🎯 実装目標

引き継ぎ資料に基づき、DataManagerクラスを「1実行 = 1アクション = 1ファイル」原則に沿って大幅に簡素化し、新ディレクトリ構造（MVP版）に対応させる。

## 📋 具体的な修正内容

### 🚨 最優先タスク（必須修正）

#### 1. 複雑なインターフェース削除（14-105行目）
**削除対象**:
- `DailyInsight`, `PerformancePattern`, `MarketOpportunity`, `OptimizationInsight`
- `TomorrowStrategy`, `PriorityAction`, `AvoidanceRule`, `ExpectedMetrics`
- `PerformanceSummary`

**理由**: MVP簡素化により、深夜分析機能は将来実装となったため、これらの複雑な型定義は不要

#### 2. 深夜分析関連メソッド削除（355-537行目）
**削除対象メソッド**:
- `saveDailyInsights()`
- `saveTomorrowStrategy()`
- `savePerformanceSummary()`
- `loadTomorrowStrategy()`
- `loadDailyInsights()`
- `loadRecentDailyInsights()`
- `cleanupOldDailyInsights()`

**理由**: 深夜分析機能は将来実装のため現在不要

#### 3. 学習データ管理の2ファイル構成対応（241-350行目）
**修正対象メソッド**:
- `loadLearningData()`: 2ファイル構成（engagement-patterns.yaml, successful-topics.yaml）に対応
- `updateSuccessPatterns()`: successful-topics.yaml専用に変更
- `recordActionResult()`: engagement-patterns.yamlに統合

**新構造**:
```typescript
interface LearningData {
  engagementPatterns: {
    timeSlots: { [timeSlot: string]: EngagementMetrics };
    contentTypes: { [type: string]: EngagementMetrics };
    topics: { [topic: string]: EngagementMetrics };
  };
  successfulTopics: {
    topics: Array<{
      topic: string;
      successRate: number;
      avgEngagement: number;
      bestTimeSlots: string[];
    }>;
  };
}
```

#### 4. savePost()メソッドの新構造対応（570-607行目）
**現在の構造**: 複雑なオブジェクト
**新構造**: 全実行情報統合のpost.yaml形式

```typescript
interface PostData {
  executionId: string;
  actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
  timestamp: string;
  content?: string;
  targetTweetId?: string;
  result: {
    success: boolean;
    message: string;
    data: any;
  };
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  claudeSelection?: {
    score: number;
    reasoning: string;
    expectedImpact: string;
  };
}
```

### ✅ 既に簡素化済み（確認のみ）

#### レガシー簡素化メソッド（632-641行目）
- `saveClaudeOutput()`: 既に簡素化済み - ログ出力のみ
- `saveKaitoResponse()`: 既に簡素化済み - ログ出力のみ
- `updateAccountStatus()`: 既に簡素化済み - ログ出力のみ

### 🧹 コード整理

#### 不要メソッド削除
**削除対象**:
- `normalizeKaitoAccountInfo()` (832-871行目): 使用されていない
- `estimateTodayTweets()` (877-882行目): 使用されていない
- 複雑なヘルパーメソッド群（884-1076行目）

#### ファイル構造整理
**保持する機能**:
- ディレクトリ作成・管理
- 基本的なYAMLファイル読み書き
- 実行サイクル管理（current/execution-YYYYMMDD-HHMM/）
- アーカイブ機能（history/YYYY-MM/DD-HHMM/）

## 🎯 実装指針

### MVP制約遵守
- **過剰機能排除**: 将来使う可能性がある機能でも実装しない
- **シンプル第一**: 複雑なロジックより理解しやすいコード
- **1実行1ファイル**: execution-YYYYMMDD-HHMM/post.yaml に全実行情報統合

### TypeScript品質基準
- **strict mode**: すべての型チェックを通す
- **no-any**: anyタイプの使用は最小限に
- **明確な型定義**: 新しいインターフェースは必要最小限で明確に

### エラーハンドリング
- **グレースフルデグラデーション**: ファイル読み込み失敗時はデフォルト値使用
- **ログ出力**: エラー時は詳細なログを出力
- **例外再スロー**: 致命的エラーは適切に再スロー

## 📁 影響するファイル

### 直接修正対象
- `src/shared/data-manager.ts` - メインファイル（大幅簡素化）

### 動作確認が必要なファイル
- `src/workflows/main-workflow.ts` - DataManager呼び出し部分
- 学習データファイル（data/learning/以下）の新構造対応

## ⚠️ 重要な制約

### 後方互換性
- 既存のdata/current/execution-*/post.yamlファイルは正常に読み込める必要あり
- エラー時のグレースフルデグラデーション維持

### パフォーマンス
- ファイルI/O最小化
- 大きなファイルの分割読み込み不要（MVP簡素化により）

### セキュリティ
- ファイルパス検証
- YAML解析時の安全性確保

## ✅ 完了基準

1. **全インターフェース削除完了**: 14-105行目の複雑な型定義削除
2. **深夜分析メソッド削除完了**: 355-537行目の該当メソッド削除
3. **学習データ2ファイル構成対応完了**: engagement-patterns.yaml, successful-topics.yaml形式対応
4. **savePost()新構造対応完了**: post.yaml統合形式での保存
5. **不要メソッド削除完了**: 使用されていないヘルパーメソッド削除
6. **TypeScriptコンパイル成功**: strict modeでエラーなし
7. **基本動作確認**: 実行サイクル初期化→データ保存→アーカイブの流れが正常動作

## 🔧 実装順序

1. **Phase 1**: 複雑なインターフェース削除（14-105行目）
2. **Phase 2**: 深夜分析メソッド削除（355-537行目）
3. **Phase 3**: 学習データ2ファイル構成対応（241-350行目）
4. **Phase 4**: savePost()新構造対応（570-607行目）
5. **Phase 5**: 不要メソッド削除・コード整理
6. **Phase 6**: TypeScriptエラー修正・品質向上

## 📋 報告書作成要件

実装完了後、`tasks/20250730_191034/reports/REPORT-001-datamanager-simplification.md`に以下内容で報告書を作成：

1. **実装サマリー**: 削除した行数、簡素化した機能概要
2. **新構造対応状況**: 学習データ2ファイル構成、post.yaml統合形式の対応詳細
3. **品質確認結果**: TypeScriptコンパイル結果、基本動作確認結果
4. **今後の注意点**: メンテナンス時に注意すべきポイント

---

**🚨 CRITICAL**: この簡素化により、システムの保守性・理解容易性が大幅に向上し、MVP要件に最適化される。過剰な機能を削除することで、真に必要な機能に集中できる基盤を構築すること。