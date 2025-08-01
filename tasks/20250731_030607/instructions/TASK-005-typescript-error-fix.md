# TASK-005: TypeScriptエラー修正

## 🎯 タスク概要

深夜分析機能実装で発生したTypeScriptエラー2件を修正します。SystemContext型の不整合を解消し、コンパイルを通るようにします。

## 🚨 エラー内容

### エラー1: referenceTweetsプロパティ未定義
```
src/workflows/main-workflow.ts(467,23): error TS2339: Property 'referenceTweets' does not exist on type 'SystemContext'.
```

### エラー2: SystemContext型の不一致
```
src/workflows/main-workflow.ts(847,74): error TS2345: Argument of type 'import(".../workflows/constants").SystemContext' is not assignable to parameter of type 'import(".../claude/types").SystemContext'.
Types of property 'market' are incompatible.
```

## 🔧 修正仕様

### 1. workflows/constants.ts修正

#### SystemContext型にreferenceTweetsプロパティ追加
```typescript
export interface SystemContext {
  // 既存プロパティ...
  market?: {  // ← オプショナルに変更
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  // 新規追加
  referenceTweets?: {
    text: string;
    engagement: number;
    author: string;
  }[];
}
```

### 2. claude/types.ts修正（必要な場合）

#### SystemContext型のmarket確認
- marketプロパティがオプショナルでない場合は修正
- 両ファイルのSystemContext型を統一

### 3. 修正手順

1. **型定義確認**
   - `src/workflows/constants.ts`のSystemContext型確認
   - `src/claude/types.ts`のSystemContext型確認

2. **プロパティ追加**
   - constants.tsにreferenceTweetsプロパティ追加（オプショナル）
   - marketプロパティをオプショナルに変更

3. **整合性確認**
   - 両ファイルのSystemContext型が互換性を持つことを確認
   - 必要に応じて共通の型定義に統一

4. **コンパイル確認**
   ```bash
   npx tsc --noEmit
   ```

## 🎯 修正基準

### 最小限の変更
- 既存機能を破壊しない
- 必要最小限のプロパティ追加のみ
- 型の互換性を保持

### 型安全性
- any型の使用禁止
- 適切なオプショナルプロパティ設定
- 既存の型定義との整合性

## ✅ 完成基準

1. **TypeScriptコンパイル成功**: `npx tsc --noEmit`でエラーなし
2. **既存機能維持**: 通常のワークフロー実行に影響なし
3. **型整合性**: SystemContext型の一貫性確保

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-005-typescript-error-fix.md`に記載：

1. **修正内容**: 変更したプロパティと理由
2. **型定義詳細**: 修正後のSystemContext型構造
3. **コンパイル結果**: TypeScriptエラーの解消確認
4. **影響範囲**: 修正による既存コードへの影響

## 🚨 注意事項

- **破壊的変更禁止**: 既存の型定義を壊さない
- **MVP原則**: 必要最小限の修正のみ
- **コメント追加**: 修正理由をコメントで明記