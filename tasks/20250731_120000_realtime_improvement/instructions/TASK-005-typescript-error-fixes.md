# TASK-005: TypeScriptエラー修正

## 📋 タスク概要
TypeScriptコンパイルエラーを修正し、型安全性を確保する。

## 🎯 修正対象エラー一覧

### 1. content-endpoint.ts (line 385)
**エラー**: `Property 'engagement' does not exist on type`
**原因**: 参考ツイートの型定義にengagementプロパティがない
**修正方法**: engagementを削除またはオプショナルに変更

### 2. content-builder.ts (line 54)
**エラー**: `Property 'buildBasePrompt' does not exist`
**原因**: 親クラスのメソッド名が違う
**修正方法**: `buildBasePrompt` → `buildPrompt` に修正

### 3. content-builder.ts (line 130, 140)
**エラー**: インデックスシグネチャエラー
**原因**: contentTypeとtargetAudienceの型が厳密すぎる
**修正方法**: 型アサーションを使用

### 4. types.ts (line 122)
**エラー**: ContentGenerationRequestの型不整合
**原因**: contentTypeの列挙値が異なる
**修正方法**: 基底インターフェースと同じ値を使用

### 5. main-workflow.ts (line 418, 444)
**エラー**: allTweetsの暗黙的any型
**原因**: 明示的な型定義がない
**修正方法**: `const allTweets: any[] = [];` に修正

### 6. main-workflow.ts (line 424)
**エラー**: sortOrderプロパティが存在しない
**原因**: KaitoAPI仕様にないプロパティ
**修正方法**: sortOrderを削除

## 📝 修正詳細

### 1. src/claude/endpoints/content-endpoint.ts
```typescript
// 385行目付近の修正
context.referenceTweets.map((tweet, index) => 
  `${index + 1}. ${tweet.text}`  // engagementを削除
).join('\n')}
```

### 2. src/claude/prompts/builders/content-builder.ts
```typescript
// 54行目の修正
const basePrompt = super.buildPrompt(context);  // buildBasePrompt → buildPrompt

// 130行目の修正
private getContentTypeDescription(contentType: string): string {
  const descriptions: Record<string, string> = {
    educational: '投資の基礎知識や初心者向けの教育的な内容',
    market_analysis: '現在の市場動向の分析と解説',
    beginner_tips: '投資初心者向けの実践的なアドバイス',
    news_commentary: 'ニュースに対する投資視点での解説'
  };
  return descriptions[contentType] || descriptions.educational;
}

// 140行目の修正
private getAudienceDescription(audience: string): string {
  const descriptions: Record<string, string> = {
    beginner: '投資を始めたばかりの初心者',
    intermediate: '基礎知識はあるが実践経験が少ない中級者',
    general: '幅広い投資家層'
  };
  return descriptions[audience] || descriptions.general;
}
```

### 3. src/claude/types.ts
```typescript
// ContentGenerationRequestの修正
export interface ContentGenerationRequest {
  topic: string;
  contentType?: 'educational' | 'market_analysis' | 'trending' | 'announcement' | 'reply';  // 基底型に合わせる
  targetAudience: 'beginner' | 'intermediate' | 'general';
  maxLength?: number;
  realtimeContext?: boolean;
}
```

### 4. src/workflows/main-workflow.ts
```typescript
// 418行目の修正
const allTweets: any[] = [];

// 424行目の修正（sortOrderを削除）
const result = await this.kaitoClient.searchTweets(query, {
  maxResults: 25,
  lang: 'ja'
  // sortOrder: 'recency' を削除
});
```

## 🚫 制約事項
- 既存の機能を壊さない
- 最小限の変更で修正
- 型安全性を維持

## ✅ 完了確認事項
1. `npx tsc --noEmit` でエラーがないこと
2. 既存の動作が維持されていること
3. 型定義の整合性が保たれていること