# URGENT-002: エンドポイントファイルのプロンプトテンプレート移行

## 🚨 緊急修正要件
プロンプトテンプレート管理システムが完成したにもかかわらず、既存のエンドポイントファイルが古いハードコードされたプロンプトを使用し続けています。システム全体の一貫性のため、緊急移行が必要です。

## 🎯 移行対象ファイル

### 🔴 最高優先度：analysis-endpoint.ts
#### 問題
- **572-584行目**: 市場分析用プロンプトがハードコード
- **638-650行目**: パフォーマンス分析用プロンプトがハードコード

#### 修正内容
```typescript
// 修正前
const prompt = `あなたは投資教育の専門家として、現在の市場状況を分析し...`;

// 修正後
import { AnalysisBuilder } from '../prompts/builders/analysis-builder';

const builder = new AnalysisBuilder();
const prompt = builder.buildPrompt({
  action: 'market_analysis',
  result: context,
  context: systemContext,
  metrics: marketMetrics
});
```

### 🟡 高優先度：content-endpoint.ts
#### 問題
- `buildContentPrompt` 関数でプロンプト生成

#### 修正内容
```typescript
// 修正前（関数内でプロンプト構築）
function buildContentPrompt(...) { ... }

// 修正後
import { ContentBuilder } from '../prompts/builders/content-builder';

const builder = new ContentBuilder();
const prompt = builder.buildPrompt({
  topic: params.topic,
  targetAudience: params.targetAudience,
  context: systemContext,
  maxLength: 280,
  style: 'educational'
});
```

### 🟡 高優先度：search-endpoint.ts
#### 問題
- `buildSearchQueryPrompt` 関数でプロンプト生成

#### 修正内容
```typescript
// 修正前
function buildSearchQueryPrompt(...) { ... }

// 修正後  
import { SearchBuilder } from '../prompts/builders/search-builder';

const builder = new SearchBuilder();
const prompt = builder.buildPrompt({
  topic: params.topic,
  purpose: params.purpose,
  context: systemContext,
  constraints: params.constraints
});
```

## 📋 詳細修正手順

### Step 1: analysis-endpoint.ts の修正

#### 1-1. インポート追加
```typescript
// ファイル先頭に追加
import { AnalysisBuilder } from '../prompts/builders/analysis-builder';
import type { AnalysisPromptParams } from '../prompts/builders/analysis-builder';
```

#### 1-2. executeClaudeMarketAnalysis関数の修正
```typescript
// 修正前（572-584行目）
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

// 修正後
const builder = new AnalysisBuilder();
const prompt = builder.buildPrompt({
  action: 'market_analysis',
  result: context,
  context: systemContext, // 適切なSystemContextオブジェクトを渡す
  metrics: {
    // 市場メトリクスがあれば設定
  }
});
```

#### 1-3. executeClaudePerformanceAnalysis関数の修正
```typescript
// 修正前（638-650行目）
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

// 修正後
const builder = new AnalysisBuilder();
const prompt = builder.buildPrompt({
  action: 'performance_analysis',
  result: metrics,
  context: systemContext, // 適切なSystemContextオブジェクトを渡す
  metrics: {
    // パフォーマンスメトリクスを適切に設定
    views: metrics.total_executions,
    // その他のメトリクス
  }
});
```

### Step 2: content-endpoint.ts の修正

#### 2-1. インポート追加と既存プロンプト関数の置換
```typescript
// インポート追加
import { ContentBuilder } from '../prompts/builders/content-builder';

// buildContentPrompt関数を修正または置換
function buildContentPrompt(params: ContentGenerationParams): string {
  const builder = new ContentBuilder();
  return builder.buildPrompt({
    topic: params.request.topic,
    targetAudience: params.request.targetAudience,
    context: params.context,
    maxLength: 280,
    style: params.request.contentType || 'educational'
  });
}
```

### Step 3: search-endpoint.ts の修正

#### 3-1. インポート追加と既存プロンプト関数の置換
```typescript
// インポート追加
import { SearchBuilder } from '../prompts/builders/search-builder';

// buildSearchQueryPrompt関数を修正または置換
function buildSearchQueryPrompt(purpose: string, topic: string, constraints?: any): string {
  const builder = new SearchBuilder();
  return builder.buildPrompt({
    topic,
    purpose,
    context: systemContext, // 適切に取得する必要あり
    constraints
  });
}
```

## ⚠️ 重要な注意事項

### SystemContext の取得
各エンドポイントで `systemContext` が必要になりますが、現在の実装では直接利用できません。以下の方法で対応：

1. **パラメータとして渡す**: 呼び出し元から `SystemContext` を渡す
2. **デフォルト値を使用**: 簡易的な `SystemContext` オブジェクトを生成
3. **既存の context データを活用**: 既存のデータから `SystemContext` 形式に変換

### 後方互換性の維持
- 既存の関数インターフェースを変更しない
- 呼び出し元のコードへの影響を最小化
- 段階的な移行を可能にする

## ✅ 完了条件

### 必須条件
- [ ] analysis-endpoint.ts のハードコードプロンプトが削除されている
- [ ] content-endpoint.ts が新しいビルダーを使用している
- [ ] search-endpoint.ts が新しいビルダーを使用している
- [ ] TypeScript strict モードでコンパイルエラーがない
- [ ] 既存の機能が正常に動作する

### 品質条件
- [ ] ESLint警告がない
- [ ] 統合テストが成功する
- [ ] プロンプトの内容が適切に生成される

## 🧪 テスト要件

各エンドポイントの修正後、以下をテスト：

```typescript
// analysis-endpoint.ts テスト
const analysisResult = await analyzePerformance({
  analysisType: 'market',
  timeframe: '24h',
  data: mockData,
  context: mockContext
});

// content-endpoint.ts テスト
const content = await generateContent({
  request: {
    topic: 'テスト投稿',
    contentType: 'educational',
    targetAudience: 'beginner'
  },
  context: mockSystemContext
});

// search-endpoint.ts テスト
const searchQuery = await generateSearchQuery({
  purpose: 'retweet',
  topic: 'Bitcoin',
  constraints: { maxResults: 10 }
});
```

## 📄 報告書作成

修正完了後、以下の報告書を作成してください：
`tasks/20250730_125723_prompt_template_management/reports/URGENT-002-endpoint-migration.md`

報告書には以下を含めてください：
- 修正したファイルと変更内容
- 削除したハードコードプロンプトの行数
- TypeScript/ESLintチェック結果
- 機能テスト結果
- 残存する課題（あれば）

## 🎯 期待される効果

この移行により：
1. **プロンプト管理の一元化**: 全プロンプトがテンプレートシステムで管理
2. **保守性の向上**: プロンプト変更が1箇所で完結
3. **一貫性の確保**: 全エンドポイントで同じ変数形式
4. **品質向上**: DRY原則による重複コード削除