# TASK-003: データ分析ワークフロー実装

## 🎯 タスク概要
KaitoAPIで収集したデータをClaude分析エンドポイントで前処理し、統合されたインサイトを生成するワークフローを実装する。

## 📋 実装要件

### 1. 新規ファイル作成
**ファイル**: `src/workflows/data-analysis.ts`

### 2. 実装すべき関数

#### メイン分析関数
```typescript
export async function executeDataAnalysis(params: {
  targetQuery?: string;
  referenceUsers?: string[];
  topic: string;
  context?: SystemContext;
}): Promise<CombinedAnalysisInsights>
```

**処理フロー**:
1. target_query分析とreference_users分析を並列実行
2. 各reference_userの分析も並列実行
3. 全分析結果を統合してCombinedAnalysisInsightsを生成

#### 内部ヘルパー関数

```typescript
// Target Query分析の実行
async function analyzeTargetQuery(
  query: string, 
  topic: string,
  context?: SystemContext
): Promise<TargetQueryInsights | null>

// Reference Users分析の並列実行
async function analyzeReferenceUsers(
  usernames: string[],
  context?: SystemContext
): Promise<ReferenceUserInsights[]>

// 分析結果の統合
function combineAnalysisResults(
  targetQueryInsights: TargetQueryInsights | null,
  referenceUserInsights: ReferenceUserInsights[]
): CombinedAnalysisInsights
```

### 3. 実装詳細

#### 並列処理の実装
```typescript
// 例：効率的な並列処理
const [targetAnalysis, userAnalyses] = await Promise.all([
  targetQuery ? analyzeTargetQuery(targetQuery, topic, context) : null,
  referenceUsers ? analyzeReferenceUsers(referenceUsers, context) : []
]);
```

#### エラーハンドリング
- 個別の分析失敗が全体を止めないよう設計
- 失敗した分析はログ出力し、nullまたは空配列で処理継続

#### KaitoAPIとの連携
```typescript
import { KaitoTwitterAPIClient } from '../kaito-api';
// searchTweetsとgetBatchUserLastTweetsを使用
```

### 4. パフォーマンス要件
- 並列実行による高速化（3-5秒以内を目標）
- 不要なAPI呼び出しを避ける（キャッシュ活用）

### 5. ログ出力
- 各分析の開始・完了をログ出力
- エラー時は詳細なエラー情報を出力

## 📁 関連ドキュメント
- `docs/workflow.md` - ワークフロー仕様
- `docs/kaito-api.md` - KaitoAPI仕様
- TASK-001, TASK-002の成果物に依存

## ✅ 完了条件
- TypeScript strict modeでエラーなし
- 並列処理が正しく動作
- エラー時もグレースフルに処理継続