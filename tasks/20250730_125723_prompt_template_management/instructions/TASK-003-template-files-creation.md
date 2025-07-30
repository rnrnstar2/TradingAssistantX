# TASK-003: プロンプトテンプレートファイル作成

## 🎯 実装目標
各エンドポイント用のプロンプトテンプレートファイルを作成する。既存のエンドポイントファイルからプロンプト文字列を抽出し、変数プレースホルダーを含むテンプレートとして整理する。

## 📋 実装対象ファイル

### 1. src/claude/prompts/templates/content.template.ts
**目的**: コンテンツ生成用プロンプトテンプレート

```typescript
export const contentTemplate = `
あなたは投資教育コンテンツを作成するアシスタントです。

## 現在の状況
- 曜日: \${dayOfWeek}曜日
- 時間帯: \${timeContext} (\${hour}時)
- フォロワー数: \${context.account.followerCount}人
- 本日の投稿数: \${context.account.postsToday}件
- 平均エンゲージメント率: \${context.account.engagementRate}%
- 前回投稿からの経過時間: \${lastPostHours}時間

## 学習データ
- 最近高評価だったトピック: \${context.learningData.recentTopics}
- 平均エンゲージメント率: \${context.learningData.avgEngagement}%
- 学習済みパターン数: \${context.learningData.totalPatterns}件

## 市場状況
- センチメント: \${context.market.sentiment}
- ボラティリティ: \${context.market.volatility}
- 話題のトピック: \${context.market.trendingTopics}

## タスク
トピック「\${topic}」について、\${audienceDescription}向けの教育的な投稿を作成してください。

## 制約条件
- 最大文字数: \${maxLength}文字
- スタイル: \${style}
- 時間帯に適した内容にする
- 投資初心者にも理解しやすい表現を使う
- 実践的で具体的なアドバイスを含める

## 時間帯別ガイドライン
- 朝（〜10時）: 1日のスタートに役立つ情報、前向きなメッセージ
- 昼（12〜14時）: サクッと読めて実践的な内容
- 夜（20時〜）: 1日の振り返り、明日への準備
- 週末: じっくり学習できる内容、来週への準備

投稿内容のみを出力してください。説明や前置きは不要です。
`;
```

### 2. src/claude/prompts/templates/search.template.ts
**目的**: 検索クエリ生成用プロンプトテンプレート

```typescript
export const searchTemplate = `
投資教育に関連するツイートを検索するための最適なクエリを生成してください。

## 検索条件
- トピック: \${topic}
- 検索目的: \${purpose}
- 最大結果数: \${maxResults}件
- 言語: \${language}
- リツイート除外: \${excludeRetweets}

## 対象読者層
\${audienceDesc}

## 市場コンテキスト
\${marketContext}

## 要件
1. 高品質な投資教育コンテンツを見つけやすいクエリ
2. ノイズ（関係ない投稿）を除外する工夫
3. 信頼できる情報源を優先
4. 最新の情報を重視

## 出力形式
検索クエリ文字列のみを出力してください。
Twitter検索で使用できる演算子（AND, OR, -exclude, from:, min_retweets:等）を活用してください。
`;
```

### 3. src/claude/prompts/templates/analysis.template.ts
**目的**: パフォーマンス分析用プロンプトテンプレート

```typescript
export const analysisTemplate = `
実行されたアクションのパフォーマンスを分析してください。

## 実行アクション
\${action}

## 実行結果
\${result}

## パフォーマンスメトリクス
\${metrics}

## 実行コンテキスト
\${context}

## 分析項目
1. アクションの成功/失敗判定
2. エンゲージメント予測
3. タイミングの適切性評価
4. 改善提案

## 出力形式
以下のJSON形式で分析結果を出力してください：
{
  "success": boolean,
  "performanceScore": number (0-100),
  "engagementPrediction": {
    "likes": number,
    "retweets": number,
    "impressions": number
  },
  "timingEvaluation": string,
  "improvements": string[],
  "learningPoints": string[]
}
`;
```

### 4. src/claude/prompts/index.ts
**目的**: プロンプト管理モジュールのメインエクスポート

```typescript
// テンプレートのエクスポート
export { contentTemplate } from './templates/content.template';
export { searchTemplate } from './templates/search.template';
export { analysisTemplate } from './templates/analysis.template';

// ビルダーのエクスポート
export {
  ContentBuilder,
  SearchBuilder,
  AnalysisBuilder,
  type ContentPromptParams,
  type SearchPromptParams,
  type AnalysisPromptParams
} from './builders';

// ファクトリー関数
export function createContentPrompt(params: ContentPromptParams): string {
  const builder = new ContentBuilder();
  return builder.buildPrompt(params);
}

export function createSearchPrompt(params: SearchPromptParams): string {
  const builder = new SearchBuilder();
  return builder.buildPrompt(params);
}

export function createAnalysisPrompt(params: AnalysisPromptParams): string {
  const builder = new AnalysisBuilder();
  return builder.buildPrompt(params);
}
```

## 📌 実装要件

### 必須要件
1. **既存プロンプトの移行**: 現在のエンドポイントファイルからプロンプトを抽出
2. **変数プレースホルダー**: `\${変数名}`形式で統一
3. **可読性**: インデントと改行で構造を明確に
4. **完全性**: すべての変数を含める
5. **エクスポート**: 各テンプレートを適切にエクスポート

### 品質基準
- TypeScriptで型エラーなし
- プロンプトの意図が明確
- 変数名が一貫している
- テンプレートリテラルとして有効

## 🚫 制約事項
- プロンプトの意味を変えない
- 既存の変数名を維持
- 過度な最適化は避ける

## 📁 ディレクトリとファイル作成
```bash
mkdir -p src/claude/prompts/templates
touch src/claude/prompts/templates/content.template.ts
touch src/claude/prompts/templates/search.template.ts
touch src/claude/prompts/templates/analysis.template.ts
touch src/claude/prompts/index.ts
```

## 🔍 参照すべき既存ファイル
以下のファイルから現在のプロンプトを抽出してください：
- `src/claude/endpoints/content-endpoint.ts`
- `src/claude/endpoints/search-endpoint.ts`
- `src/claude/endpoints/analysis-endpoint.ts`

## ✅ 完了条件
1. 3つのテンプレートファイルが作成されている
2. すべての変数プレースホルダーが含まれている
3. index.tsから使いやすくエクスポートされている
4. TypeScriptエラーがない

## 📄 報告書作成
実装完了後、以下の報告書を作成してください：
`tasks/20250730_125723_prompt_template_management/reports/REPORT-003-template-files-creation.md`

報告書には以下を含めてください：
- 作成したテンプレートファイルの概要
- 既存エンドポイントからの移行状況
- 変数プレースホルダーの一覧
- 統合準備の状況