# TASK-008: システム型アーキテクチャ統一

## 🎯 タスク概要
複数のSystemContext型定義による構造的問題を解決し、システム全体の型安全性を確保する。

## 🚨 問題の根本原因

### 複数SystemContext定義の存在
1. `src/shared/types.ts` - メイン定義（TASK-007で修正済み）
2. `src/claude/types.ts` - Claude専用定義
3. `src/workflows/constants.ts` - ワークフロー用定義

### 影響範囲
- workflow-actions.ts: 型不整合エラー
- プロンプトビルダー: undefinedチェックエラー
- 分析エンドポイント: 型キャストエラー

## 📋 統一方針

### 1. 単一真実源の確立
**マスター型定義**: `src/shared/types.ts`のSystemContextを唯一の定義とする

### 2. 段階的移行戦略
1. 重複定義の削除
2. インポート文の統一
3. 型互換性の確保

## 🔧 実装要件

### Phase 1: 重複定義削除
**ファイル**: `src/claude/types.ts`
```typescript
// 削除対象: SystemContext型定義
// 追加: src/shared/typesからのインポート
import { SystemContext } from '../shared/types';
```

**ファイル**: `src/workflows/constants.ts`
```typescript
// 削除対象: SystemContext型定義
// 追加: src/shared/typesからのインポート
import { SystemContext } from '../shared/types';
```

### Phase 2: オプション型の安全性確保
**ファイル**: `src/claude/prompts/builders/base-builder.ts`
```typescript
// null安全性の確保
if (context?.account) {
  // アカウント情報を使用
}
```

### Phase 3: 型互換性修正
**ファイル**: `src/workflows/workflow-actions.ts`
- SystemContext型の統一使用
- 型キャストの適切な処理
- analysisInsights フィールドの正しい型指定

## ✅ 成功条件
- TypeScriptエラー0件
- 全ての既存機能が正常動作
- 型定義の一元化完了

## 📁 関連ファイル
- `src/shared/types.ts` - マスター型定義
- `src/claude/types.ts` - 重複削除対象
- `src/workflows/constants.ts` - 重複削除対象
- `src/workflows/workflow-actions.ts` - 修正対象
- `src/claude/prompts/builders/*.ts` - null安全性修正対象