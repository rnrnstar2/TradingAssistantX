# URGENT-003: ハードコードプロンプト完全削除作業

## 🚨 緊急修正要件

前回の作業で**指示書の主要目的が未完了**です。**既存エンドポイントのハードコードプロンプト削除**に特化した作業を実行してください。

**⚠️ 重要**: 新機能追加は一切禁止。既存のハードコードプロンプト削除のみ実行してください。

## 🎯 削除対象の特定

### 🔴 analysis-endpoint.ts（2箇所）

#### 削除対象1: 572-584行目の市場分析プロンプト
```typescript
// 【削除対象】572-584行目
const prompt = `あなたは投資教育の専門家として、現在の市場状況を分析し、投資教育コンテンツの最適な戦略を提案してください。

市場コンテキスト:
${JSON.stringify(context, null, 2)}

市場センチメント、投稿タイミング、エンゲージメント機会、注意すべきリスクなどを総合的に考慮し、実践的な洞察と推奨事項を提供してください。

JSON形式で回答してください:
{
  "insights": ["洞察1", "洞察2", "洞察3"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "confidence": 0.8
}`;
```

#### 削除対象2: 638-650行目のパフォーマンス分析プロンプト
```typescript
// 【削除対象】638-650行目
const prompt = `あなたは投資教育の専門家として、X自動化システムのパフォーマンスデータを分析し、改善の提案をしてください。

パフォーマンスメトリクス:
${JSON.stringify(metrics, null, 2)}

成功率の傾向、各アクションの効果、改善が必要な領域を把握し、システムをより効果的にするための具体的な推奨事項を提供してください。

JSON形式で回答してください:
{
  "insights": ["洞察1", "洞察2", "洞察3"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "confidence": 0.8
}`;
```

### 🟡 search-endpoint.ts（1箇所）

#### 削除対象3: buildSearchQueryPrompt関数の使用（89行目）
```typescript
// 【修正対象】89行目
const prompt = buildSearchQueryPrompt(purpose, topic, constraints);
```

## 📋 具体的修正手順

### Step 1: analysis-endpoint.ts の修正

#### 1-1. ファイル先頭にインポート追加
```typescript
// 以下を既存インポートの後に追加
import { AnalysisBuilder } from '../prompts/builders/analysis-builder';
import type { AnalysisPromptParams } from '../prompts/builders/analysis-builder';
```

#### 1-2. executeClaudeMarketAnalysis関数の修正（572-584行）
```typescript
// 【修正前】572-584行目を削除
const prompt = `あなたは投資教育の専門家として...`;

// 【修正後】以下に置換
const builder = new AnalysisBuilder();
const prompt = builder.buildPrompt({
  action: 'market_analysis',
  result: context,
  context: getSystemContext(), // SystemContextを取得する関数
  metrics: extractMarketMetrics(context)
});
```

#### 1-3. executeClaudePerformanceAnalysis関数の修正（638-650行）
```typescript
// 【修正前】638-650行目を削除
const prompt = `あなたは投資教育の専門家として...`;

// 【修正後】以下に置換
const builder = new AnalysisBuilder();
const prompt = builder.buildPrompt({
  action: 'performance_analysis', 
  result: metrics,
  context: getSystemContext(), // SystemContextを取得する関数
  metrics: {
    likes: 0, // 実際のメトリクスがあれば設定
    retweets: 0,
    replies: 0,
    views: metrics.total_executions || 0
  }
});
```

#### 1-4. SystemContext取得関数の追加
```typescript
// analysis-endpoint.ts内に追加
function getSystemContext(): SystemContext {
  // 簡易的なSystemContextを生成
  return {
    account: {
      followerCount: 1000, // デフォルト値
      postsToday: 0,
      engagementRate: 2.5,
      lastPostTime: new Date().toISOString()
    },
    learningData: {
      recentTopics: [],
      avgEngagement: 2.5,
      totalPatterns: 0
    },
    market: {
      sentiment: 'neutral',
      volatility: 'medium', 
      trendingTopics: []
    }
  };
}

function extractMarketMetrics(context: any): any {
  return {
    dataPoints: Object.keys(context).length,
    timestamp: new Date().toISOString()
  };
}
```

### Step 2: search-endpoint.ts の修正

#### 2-1. ファイル先頭にインポート追加
```typescript
// 以下を既存インポートの後に追加
import { SearchBuilder } from '../prompts/builders/search-builder';
import type { SearchPromptParams } from '../prompts/builders/search-builder';
```

#### 2-2. generateSearchQuery関数の修正（89行目付近）
```typescript
// 【修正前】89行目
const prompt = buildSearchQueryPrompt(purpose, topic, constraints);

// 【修正後】以下に置換
const builder = new SearchBuilder();
const prompt = builder.buildPrompt({
  topic: topic,
  purpose: purpose,
  context: getSystemContextForSearch(),
  constraints: {
    maxResults: constraints?.maxResults || 10,
    language: constraints?.language || 'ja',
    excludeRetweets: constraints?.excludeRetweets !== false
  }
});
```

#### 2-3. SystemContext取得関数の追加
```typescript
// search-endpoint.ts内に追加
function getSystemContextForSearch(): SystemContext {
  // 簡易的なSystemContextを生成
  return {
    account: {
      followerCount: 1000,
      postsToday: 0,
      engagementRate: 2.5,
      lastPostTime: new Date().toISOString()
    },
    learningData: {
      recentTopics: [],
      avgEngagement: 2.5,
      totalPatterns: 0
    },
    market: {
      sentiment: 'neutral',
      volatility: 'medium',
      trendingTopics: []
    }
  };
}
```

## ⚠️ 重要な制約事項

### 絶対禁止事項
- ❌ **新ファイル作成禁止**: selection-endpoint.ts等の新ファイル作成は一切禁止
- ❌ **新機能追加禁止**: selectOptimalTweet等の新機能実装は禁止
- ❌ **docs修正禁止**: ドキュメントファイルの修正は禁止

### 必須作業のみ
- ✅ **ハードコードプロンプト削除**: 指定した3箇所のみ
- ✅ **ビルダー移行**: 削除したプロンプトをビルダーに置換
- ✅ **インポート追加**: 必要なインポート文の追加

## ✅ 完了条件

### 必須条件（全て必須）
- [ ] analysis-endpoint.ts の572-584行のハードコードプロンプトが削除されている
- [ ] analysis-endpoint.ts の638-650行のハードコードプロンプトが削除されている  
- [ ] search-endpoint.ts の89行目がビルダー使用に変更されている
- [ ] 必要なインポート文が追加されている
- [ ] TypeScript strict モードでコンパイルエラーがない
- [ ] 新ファイルが作成されていない
- [ ] docsファイルが変更されていない

### 検証方法
```bash
# コンパイルチェック
npx tsc --noEmit --strict src/claude/endpoints/analysis-endpoint.ts src/claude/endpoints/search-endpoint.ts

# ハードコードプロンプト残存チェック
grep -n "あなたは投資教育の専門家として" src/claude/endpoints/analysis-endpoint.ts
# → 結果が空であることを確認

grep -n "buildSearchQueryPrompt" src/claude/endpoints/search-endpoint.ts  
# → 結果が空であることを確認
```

## 📄 報告書作成

作業完了後、以下の報告書を**必ず作成**してください：
`tasks/20250730_125723_prompt_template_management/reports/URGENT-003-hardcode-prompt-removal.md`

報告書には以下を必ず含めてください：
- 削除したハードコードプロンプトの正確な行番号
- 追加したインポート文とビルダー呼び出しコード
- TypeScriptコンパイルチェック結果
- grep検証コマンド実行結果
- 作業時間と完了確認

## 🎯 作業の重要性

この作業は**プロンプトテンプレート管理システムの完成**に不可欠です。ハードコードプロンプトが残存する限り、システムの一貫性と保守性が損なわれます。

**指示書の内容のみを実行し、追加作業は一切行わないでください。**