# TASK-006: コンテンツ型定義の整合性確保

## 📋 タスク概要
TASK-003で追加した新機能と既存の型定義の整合性を確保する。

## 🎯 実装目標
1. ContentGenerationRequestの型定義を既存システムと整合
2. content-builder.tsの不足メソッド実装
3. 参考ツイートの型定義調整

## 📝 実装詳細

### 1. ContentGenerationRequestの再設計
**問題**: TASK-003で独自に拡張したが、既存の型と不整合

**修正方法**: 既存のContentRequestインターフェースを拡張せず、独立した型として定義

```typescript
// src/claude/types.ts に追加（既存のContentGenerationRequestを置き換え）
export interface EnhancedContentRequest {
  topic: string;
  contentType: 'educational' | 'market_analysis' | 'beginner_tips' | 'news_commentary';
  targetAudience: 'beginner' | 'intermediate' | 'general';
  maxLength?: number;
  realtimeContext?: boolean;
}

// generateContent関数のシグネチャも調整
export interface GenerateContentParams {
  request: EnhancedContentRequest;  // ContentGenerationRequest → EnhancedContentRequest
  context?: SystemContext;
}
```

### 2. content-builder.tsの不足メソッド実装
```typescript
// src/claude/prompts/builders/content-builder.ts に追加
private getTimeContextPrompt(context: SystemContext): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 9) {
    return '朝の時間帯なので、1日のスタートに役立つ前向きな投資情報を提供してください。';
  } else if (hour >= 9 && hour < 15) {
    return '市場時間中なので、リアルタイムの動向を踏まえた実践的な内容にしてください。';
  } else if (hour >= 12 && hour < 14) {
    return '昼休みの時間帯なので、サクッと読めて実践的な内容が好まれます。';
  } else if (hour >= 20 && hour < 22) {
    return '夜の時間帯なので、1日の振り返りと明日への準備に役立つ内容にしてください。';
  }
  
  return '読者の立場に立って、今この時間に価値を感じる情報を提供してください。';
}
```

### 3. content-endpoint.tsの修正
```typescript
// src/claude/endpoints/content-endpoint.ts の generateContent関数を修正
export async function generateContent(params: GenerateContentParams): Promise<GeneratedContent> {
  // EnhancedContentRequestを使用するように修正
  const { request, context } = params;
  
  // 既存のロジックはそのまま維持
  // ...
}
```

### 4. 呼び出し側の調整
```typescript
// src/workflows/main-workflow.ts の該当箇所を修正
import type { EnhancedContentRequest } from '../claude/types';

// コンテンツ生成部分
const content = await generateContent({
  request: {
    topic: decision.parameters?.topic || 'investment',
    contentType: 'educational',  // 'beginner_tips'などは使わない
    targetAudience: 'beginner',
    realtimeContext: true
  } as EnhancedContentRequest,
  context: {
    // ... 既存のcontext
  }
});
```

## 🚫 制約事項
- 既存のContentRequestインターフェースは変更しない
- 他のエンドポイントへの影響を最小限に
- 型の整合性を最優先

## ✅ 完了確認事項
1. 型定義の整合性確認
2. TypeScriptコンパイルエラーが解消されること
3. 既存機能の動作確認