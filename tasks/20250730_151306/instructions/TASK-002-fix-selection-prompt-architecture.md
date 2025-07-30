# TASK-002: 選択プロンプトアーキテクチャ違反緊急修正

## 🚨 **緊急課題：アーキテクチャ違反の発生**

### 問題概要
`src/claude/endpoints/selection-endpoint.ts`において、プロンプトテンプレート管理システムを使用せず、エンドポイント内に直接プロンプトを埋め込む実装が行われました。

### 🔍 **違反内容**
1. **未作成ファイル**: `docs/directory-structure.md`に記載された`selection.template.ts`が存在しない
2. **未作成ビルダー**: `selection-builder.ts`ファイルが存在しない
3. **DRY原則違反**: プロンプトが`selection-endpoint.ts`内に分散している
4. **管理困難**: プロンプト変更時の一元管理ができない状況

## 🎯 **修正目的**

### プロンプトテンプレート管理システムの完全実装
- **一元管理**: 全プロンプトをtemplates/配下で統一管理
- **DRY原則遵守**: プロンプトの重複完全排除
- **保守性向上**: プロンプト変更の影響を局所化
- **アーキテクチャ統一**: 他エンドポイントとの構造一致

## 📂 **実装対象ファイル**

### 新規作成必須
1. **`src/claude/prompts/templates/selection.template.ts`** - ツイート選択プロンプトテンプレート
2. **`src/claude/prompts/builders/selection-builder.ts`** - ツイート選択ビルダー

### 修正対象
3. **`src/claude/endpoints/selection-endpoint.ts`** - テンプレートシステム統合

### 参考ファイル（実装パターン参照用）
- `src/claude/prompts/templates/content.template.ts`
- `src/claude/prompts/builders/content-builder.ts`
- `src/claude/prompts/builders/base-builder.ts`

## 🔧 **詳細実装要件**

### Step 1: selection.template.tsの作成

`src/claude/prompts/templates/selection.template.ts`を作成し、現在`selection-endpoint.ts:265-297`に埋め込まれているプロンプトを抽出：

```typescript
// 抽出対象：アクション別戦略的基準
export const likeSelectionTemplate = `
【いいね戦略的基準】
- 関係構築可能性: そのユーザーが投資教育アカウントに興味を持ちそうか（90%）
- ユーザーエンゲージメント: そのユーザーの平均エンゲージメント率
// ... (265-276行の内容)
`;

export const retweetSelectionTemplate = `
【リツイート戦略的基準】
- 教育的価値: フォロワーの投資知識向上への貢献度（40%）
// ... (278-286行の内容)
`;

export const quoteSelectionTemplate = `
【引用リツイート戦略的基準】
- 価値追加可能性: 自分の専門知識で補足・解説できるか（50%）
// ... (288-296行の内容)
`;

export const baseSelectionTemplate = `
【ツイート選択タスク】
目的: \${selectionPurpose}
トピック: \${topic}
品質閾値: \${qualityThreshold}/10
エンゲージメント重視度: \${engagementWeight}
関連性重視度: \${relevanceWeight}

【ユーザーコンテキスト】
・フォロワー数: \${followerCount}人
・今日の投稿数: \${postsToday}回
・平均エンゲージメント: \${engagementRate}%
・過去の高評価トピック: \${recentTopics}

【候補ツイート】(\${candidateCount}件)
\${candidateList}

【選択基準】
- 投資教育的価値: 高
- コンテンツ品質: \${qualityThreshold}/10以上
- エンゲージメント可能性: 重視度\${engagementWeight}%
- トピック関連性: 重視度\${relevanceWeight}%
- リスク考慮: 炎上・誤情報リスクの回避
\${actionSpecificCriteria}

最適なツイートを1つ選択し、以下JSON形式で回答してください:
{
  "tweetId": "選択したツイートID",
  "score": 選択スコア(0-10の数値),
  "reasoning": "選択理由（100文字以内）",
  "expectedImpact": "high|medium|low"
}
`;
```

### Step 2: selection-builder.tsの作成

`src/claude/prompts/builders/selection-builder.ts`を作成し、他のBuilderと統一したインターフェースを実装：

```typescript
import { BaseBuilder } from './base-builder';
import { SystemContext } from '../../../shared/types';
import { 
  baseSelectionTemplate, 
  likeSelectionTemplate, 
  retweetSelectionTemplate, 
  quoteSelectionTemplate 
} from '../templates/selection.template';

export interface SelectionPromptParams {
  selectionType: 'like' | 'retweet' | 'quote_tweet';
  topic: string;
  candidates: CompactTweetCandidate[];
  criteria: {
    qualityThreshold?: number;
    engagementWeight?: number;
    relevanceWeight?: number;
  };
  context: SystemContext;
}

export class SelectionBuilder extends BaseBuilder {
  buildPrompt(params: SelectionPromptParams): string {
    const template = baseSelectionTemplate;
    
    // 戦略的目的の設定
    const purposeMap = {
      like: '関係構築のために、投資教育に興味がありそうなユーザーの投稿を選択',
      retweet: 'フォロワーにとって価値がある投資教育コンテンツを選択',
      quote_tweet: '自分の専門知識で価値を追加できる投資教育投稿を選択'
    };
    
    // アクション別基準の選択
    const criteriaMap = {
      like: likeSelectionTemplate,
      retweet: retweetSelectionTemplate,
      quote_tweet: quoteSelectionTemplate
    };
    
    // 共通変数の注入（BaseBuilderのメソッドを使用）
    let prompt = this.injectCommonVariables(template, params.context);
    
    // 選択専用変数の注入
    prompt = prompt
      .replace(/\${selectionPurpose}/g, purposeMap[params.selectionType])
      .replace(/\${topic}/g, params.topic)
      .replace(/\${qualityThreshold}/g, (params.criteria.qualityThreshold || 7).toString())
      .replace(/\${engagementWeight}/g, ((params.criteria.engagementWeight || 0.5) * 100).toString())
      .replace(/\${relevanceWeight}/g, ((params.criteria.relevanceWeight || 0.5) * 100).toString())
      .replace(/\${candidateCount}/g, params.candidates.length.toString())
      .replace(/\${candidateList}/g, this.formatCandidateList(params.candidates))
      .replace(/\${actionSpecificCriteria}/g, criteriaMap[params.selectionType]);
    
    return prompt;
  }
  
  private formatCandidateList(candidates: CompactTweetCandidate[]): string {
    return candidates.map((tweet, i) => 
      `${i + 1}. ID: ${tweet.id}
   内容: ${tweet.text}
   作者: ${tweet.author}
   エンゲージメント: ❤️${tweet.metrics.likes} 🔄${tweet.metrics.retweets} 💬${tweet.metrics.replies}
   関連度: ${tweet.relevanceScore}/10`
    ).join('\n');
  }
}
```

### Step 3: selection-endpoint.tsの修正

`src/claude/endpoints/selection-endpoint.ts`の`buildSelectionPrompt`関数（252-307行）を修正し、テンプレートシステムを使用：

```typescript
// 修正前（削除対象）
function buildSelectionPrompt(
  params: TweetSelectionParams, 
  compactCandidates: CompactTweetCandidate[]
): string {
  // 265-297行の大量プロンプト埋め込みコード
}

// 修正後（テンプレートシステム使用）
import { SelectionBuilder } from '../prompts/builders/selection-builder';

function buildSelectionPrompt(
  params: TweetSelectionParams, 
  compactCandidates: CompactTweetCandidate[]
): string {
  const selectionBuilder = new SelectionBuilder();
  
  return selectionBuilder.buildPrompt({
    selectionType: params.selectionType,
    topic: params.criteria.topic,
    candidates: compactCandidates,
    criteria: {
      qualityThreshold: params.criteria.qualityThreshold,
      engagementWeight: params.criteria.engagementWeight,
      relevanceWeight: params.criteria.relevanceWeight
    },
    context: params.context
  });
}
```

### Step 4: indexファイルの更新

`src/claude/prompts/index.ts`と`src/claude/prompts/builders/index.ts`に新規作成ファイルを追加：

```typescript
// src/claude/prompts/builders/index.ts
export { SelectionBuilder } from './selection-builder';

// src/claude/prompts/index.ts  
export * from './templates/selection.template';
```

## ⚠️ **実装制約**

### MVP制約遵守
- 機能変更は最小限に留める
- 既存のselection-endpoint.tsのAPI仕様は完全維持
- 新機能追加は行わず、アーキテクチャ統一のみ実施

### 品質要件  
- TypeScript strict mode通過必須
- 既存テストとの互換性維持
- 他のbuilderファイルとの構造統一
- BaseBuilderの共通機能活用

### アーキテクチャ要件
- **DRY原則**: プロンプトの重複完全排除
- **責任分離**: template（データ）とbuilder（ロジック）の分離
- **統一性**: 既存の3つのbuilder（content, search, analysis）と同じパターン実装
- **可読性**: プロンプト管理の一元化による保守性向上

## 🔍 **検証要件**

### 1. ファイル構造検証
```bash
# 必須ファイルの存在確認
ls src/claude/prompts/templates/selection.template.ts
ls src/claude/prompts/builders/selection-builder.ts
```

### 2. TypeScript型チェック
```bash
npx tsc --noEmit src/claude/endpoints/selection-endpoint.ts
npx tsc --noEmit src/claude/prompts/builders/selection-builder.ts
```

### 3. プロンプト出力確認
- アクション別（like/retweet/quote_tweet）でプロンプト生成テスト
- 修正前後で同等のプロンプト出力確認
- テンプレート変数の正常な置換確認

### 4. 統合テスト
- selection-endpoint.tsの既存機能正常動作確認
- 他のエンドポイントへの影響がないことを確認

## 📋 **完了条件**

1. ✅ `selection.template.ts`ファイルが作成され、プロンプトテンプレートが定義されている
2. ✅ `selection-builder.ts`ファイルが作成され、BaseBuilderを継承している
3. ✅ `selection-endpoint.ts`からプロンプト埋め込みコードが削除されている
4. ✅ `selection-endpoint.ts`でテンプレートシステムが使用されている
5. ✅ TypeScript型チェック・動作確認が通過している
6. ✅ プロンプト出力が修正前と同等の品質を維持している
7. ✅ 他のbuilderファイルと統一された構造になっている

## 🎯 **期待される成果**

### アーキテクチャ統一
- プロンプトテンプレート管理システムの完全実装
- DRY原則の徹底による重複排除
- 一元管理による保守性の大幅向上

### 運用効率向上
- プロンプト変更の影響範囲局所化
- テンプレート修正による一括効果適用
- 新規アクション追加時の開発効率向上

## 📋 **報告書作成要件**

実装完了後、以下を含む報告書を作成：
- **修正概要**: アーキテクチャ違反の修正内容
- **ファイル一覧**: 新規作成・修正されたファイルの詳細
- **Before/After**: プロンプト管理方式の比較
- **検証結果**: TypeScript・動作確認・統合テスト結果
- **アーキテクチャ効果**: DRY原則・保守性向上の具体的効果

---

**出力先**: `tasks/20250730_151306/reports/REPORT-002-fix-selection-prompt-architecture.md`