# URGENT-001: プロンプトテンプレート管理システム統合修正

## 🚨 緊急修正要件
プロンプトテンプレート管理システムの統合が不完全な状態のため、緊急修正が必要です。

## 🎯 修正対象と優先度

### 🔴 最高優先度：統合エクスポートの修正

#### 問題の詳細
`src/claude/prompts/index.ts`にプレースホルダークラスが残存し、実際のビルダークラスが使用されていない状態。

#### 修正内容
```typescript
// src/claude/prompts/index.ts を以下の内容に完全置換

// テンプレートのエクスポート
export { contentTemplate } from './templates/content.template';
export { searchTemplate } from './templates/search.template';
export { analysisTemplate } from './templates/analysis.template';

// ビルダーのエクスポート（実装済みクラスを使用）
export {
  BaseBuilder,
  ContentBuilder,
  SearchBuilder,
  AnalysisBuilder,
  type TimeContext,
  type AccountStatus,
  type ContentPromptParams,
  type SearchPromptParams,
  type AnalysisPromptParams
} from './builders';

// ファクトリー関数（実装済みビルダーを使用）
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

### 🟡 高優先度：型安全性の改善

#### 問題の詳細
`src/claude/prompts/builders/analysis-builder.ts`でany型の使用によるESLint警告

#### 修正内容
```typescript
// analysis-builder.ts の修正箇所

export interface AnalysisPromptParams {
  action: string;
  result: unknown; // any → unknown に変更
  context: SystemContext;
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
}

export class AnalysisBuilder extends BaseBuilder {
  buildPrompt(params: AnalysisPromptParams): string {
    const template = analysisTemplate;
    
    // 共通変数の注入
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 分析専用変数の注入
    prompt = prompt
      .replace(/\${action}/g, params.action)
      .replace(/\${result}/g, JSON.stringify(params.result, null, 2));
    
    // 残りの実装...
    return prompt;
  }
}
```

### 🟢 中優先度：統合テストの実装

#### テストファイル作成
`src/claude/prompts/builders/integration.test.ts`を作成

```typescript
import { ContentBuilder, SearchBuilder, AnalysisBuilder } from './index';
import { createContentPrompt, createSearchPrompt, createAnalysisPrompt } from '../index';

describe('プロンプトビルダー統合テスト', () => {
  const mockSystemContext = {
    account: {
      followerCount: 1500,
      postsToday: 2,
      engagementRate: 3.2
    },
    learningData: {
      recentTopics: ['Bitcoin', 'DeFi'],
      avgEngagement: 2.8,
      totalPatterns: 150
    },
    market: {
      sentiment: 'bullish',
      volatility: 'medium',
      trendingTopics: ['NFT', 'Ethereum']
    }
  };

  test('ContentBuilder動作確認', () => {
    const builder = new ContentBuilder();
    const prompt = builder.buildPrompt({
      topic: '仮想通貨基礎',
      targetAudience: '投資初心者',
      context: mockSystemContext,
      maxLength: 280,
      style: 'educational'
    });
    
    expect(prompt).toContain('仮想通貨基礎');
    expect(prompt).toContain('投資初心者');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('ファクトリー関数動作確認', () => {
    expect(() => createContentPrompt({
      topic: 'test',
      targetAudience: 'test',
      context: mockSystemContext
    })).not.toThrow();
  });
});
```

## 📋 修正手順

### Step 1: 統合エクスポート修正（必須）
1. `src/claude/prompts/index.ts`を上記内容で完全置換
2. TypeScriptコンパイルチェック実行
3. インポートエラーがないことを確認

### Step 2: 型安全性改善（必須）
1. `analysis-builder.ts`のany型をunknown型に変更
2. ESLintチェック実行
3. 警告が解消されることを確認

### Step 3: 統合テスト実行（推奨）
1. テストファイル作成
2. `npm test` または `pnpm test`で動作確認
3. 各ビルダーが正常に動作することを確認

## ✅ 完了条件

### 必須条件
- [ ] `src/claude/prompts/index.ts`にプレースホルダークラスが存在しない
- [ ] TypeScript strict モードでコンパイルエラーがない
- [ ] ESLint警告が完全に解消されている
- [ ] ファクトリー関数が実際のビルダーを使用している

### 推奨条件
- [ ] 統合テストが実装されている
- [ ] 各ビルダーの動作が確認されている
- [ ] エンドポイントからの使用テストが完了している

## 🚨 重要な注意事項

1. **既存機能への影響**: 修正時は既存のエンドポイントファイルへの影響がないことを確認
2. **型の一貫性**: 修正後も型定義が一貫していることを確認
3. **後方互換性**: 既存のインポート文が機能することを確認

## 📄 報告書作成

修正完了後、以下の報告書を作成してください：
`tasks/20250730_125723_prompt_template_management/reports/URGENT-001-integration-fixes.md`

報告書には以下を含めてください：
- 修正した内容の詳細
- TypeScript/ESLintチェック結果
- 統合テスト結果
- 残存する課題（あれば）