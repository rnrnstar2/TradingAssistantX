# TASK-002: プロンプトビルダー実装（Content, Search, Analysis）

## 🎯 実装目標
BaseBuilderを継承した3つの具体的なプロンプトビルダーを実装する。各ビルダーはエンドポイント固有の変数注入とプロンプト構築を担当する。

## 📋 実装対象ファイル

### 1. src/claude/prompts/builders/content-builder.ts
**目的**: コンテンツ生成エンドポイント用のプロンプトビルダー

```typescript
import { BaseBuilder } from './base-builder';
import { ContentGenerationParams, SystemContext } from '../../../shared/types';
import { contentTemplate } from '../templates/content.template';

export interface ContentPromptParams {
  topic: string;
  targetAudience: string;
  context: SystemContext;
  maxLength?: number;
  style?: string;
}

export class ContentBuilder extends BaseBuilder {
  buildPrompt(params: ContentPromptParams): string {
    const template = contentTemplate;
    
    // 共通変数の注入
    let prompt = this.injectCommonVariables(template, params.context);
    
    // コンテンツ専用変数の注入
    prompt = prompt
      .replace(/\${topic}/g, params.topic)
      .replace(/\${audienceDescription}/g, params.targetAudience)
      .replace(/\${maxLength}/g, (params.maxLength || 280).toString())
      .replace(/\${style}/g, params.style || 'educational');
    
    // 学習データ変数の注入
    if (params.context.learningData) {
      prompt = this.injectLearningVariables(prompt, params.context.learningData);
    }
    
    // 市場状況変数の注入
    if (params.context.market) {
      prompt = this.injectMarketVariables(prompt, params.context.market);
    }
    
    return prompt;
  }
}
```

### 2. src/claude/prompts/builders/search-builder.ts
**目的**: 検索クエリ生成エンドポイント用のプロンプトビルダー

```typescript
import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { searchTemplate } from '../templates/search.template';

export interface SearchPromptParams {
  topic: string;
  purpose: string;
  context: SystemContext;
  constraints?: {
    maxResults?: number;
    language?: string;
    excludeRetweets?: boolean;
  };
}

export class SearchBuilder extends BaseBuilder {
  buildPrompt(params: SearchPromptParams): string {
    const template = searchTemplate;
    
    // 共通変数の注入
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 検索専用変数の注入
    prompt = prompt
      .replace(/\${topic}/g, params.topic)
      .replace(/\${purpose}/g, params.purpose)
      .replace(/\${maxResults}/g, (params.constraints?.maxResults || 10).toString())
      .replace(/\${language}/g, params.constraints?.language || 'ja')
      .replace(/\${excludeRetweets}/g, (params.constraints?.excludeRetweets || true).toString());
    
    // 対象読者層の説明
    const audienceDesc = this.getAudienceDescription(params.context);
    prompt = prompt.replace(/\${audienceDesc}/g, audienceDesc);
    
    // 市場コンテキストのJSON化
    const marketContext = JSON.stringify(params.context.market || {});
    prompt = prompt.replace(/\${marketContext}/g, marketContext);
    
    return prompt;
  }
  
  private getAudienceDescription(context: SystemContext): string {
    // フォロワー数に基づいて対象読者層を判定
    const followerCount = context.account.followers_count;
    if (followerCount < 1000) return '投資初心者・学習中の個人投資家';
    if (followerCount < 5000) return '中級投資家・情報収集に積極的な層';
    return '上級投資家・プロフェッショナル層';
  }
}
```

### 3. src/claude/prompts/builders/analysis-builder.ts
**目的**: パフォーマンス分析エンドポイント用のプロンプトビルダー

```typescript
import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { analysisTemplate } from '../templates/analysis.template';

export interface AnalysisPromptParams {
  action: string;
  result: any;
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
    
    // メトリクスの注入
    if (params.metrics) {
      const metricsJson = JSON.stringify(params.metrics, null, 2);
      prompt = prompt.replace(/\${metrics}/g, metricsJson);
    } else {
      prompt = prompt.replace(/\${metrics}/g, '{}');
    }
    
    // コンテキストの注入
    const contextJson = JSON.stringify({
      timeOfDay: this.getTimeContext(),
      accountStatus: this.formatAccountStatus(params.context.account),
      market: params.context.market || {}
    }, null, 2);
    prompt = prompt.replace(/\${context}/g, contextJson);
    
    return prompt;
  }
}
```

### 4. src/claude/prompts/builders/index.ts
**目的**: ビルダーのエクスポート統合

```typescript
export { BaseBuilder } from './base-builder';
export { ContentBuilder } from './content-builder';
export { SearchBuilder } from './search-builder';
export { AnalysisBuilder } from './analysis-builder';

// 型のエクスポート
export type { TimeContext, AccountStatus } from './base-builder';
export type { ContentPromptParams } from './content-builder';
export type { SearchPromptParams } from './search-builder';
export type { AnalysisPromptParams } from './analysis-builder';
```

## 📌 実装要件

### 必須要件
1. **BaseBuilder継承**: すべてのビルダーはBaseBuilderを継承
2. **型安全性**: パラメータ型を明確に定義
3. **変数注入の完全性**: 各エンドポイント固有の変数をすべて処理
4. **JSONフォーマット**: 複雑なデータはJSON形式で注入
5. **デフォルト値**: オプションパラメータには適切なデフォルト値

### 品質基準
- TypeScript strict モードでエラーゼロ
- ESLint警告ゼロ
- 各ビルダーが独立してテスト可能
- 明確な責任分離

## 🚫 制約事項
- エンドポイントの既存インターフェースを変更しない
- 過剰な最適化は避ける
- MVPに必要な機能のみ実装

## 📁 ファイル作成
```bash
touch src/claude/prompts/builders/content-builder.ts
touch src/claude/prompts/builders/search-builder.ts
touch src/claude/prompts/builders/analysis-builder.ts
touch src/claude/prompts/builders/index.ts
```

## ✅ 完了条件
1. 3つのビルダークラスが実装されている
2. すべてのビルダーがBaseBuilderを正しく継承
3. TypeScript strict モードでコンパイルエラーがない
4. index.tsから適切にエクスポートされている

## 📄 報告書作成
実装完了後、以下の報告書を作成してください：
`tasks/20250730_125723_prompt_template_management/reports/REPORT-002-prompt-builders-implementation.md`

報告書には以下を含めてください：
- 実装した3つのビルダーの概要
- 各ビルダーの特徴的な処理
- TypeScript/ESLintチェック結果
- 統合テストの準備状況