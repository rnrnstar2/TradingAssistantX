# TASK-001: ワークフローファイル構造簡素化

## 🎯 タスク概要

現在1333行の`src/workflows/main-workflow.ts`をMVPとして適切な3ファイル構成に分割し、保守性を向上させる。

**MVP制約確認済み**: ✅ 機能追加なし ✅ 最小限分割 ✅ 過剰実装防止

## 📋 作業内容

### Phase 1: ファイル分割設計

現在の`main-workflow.ts`を以下の3ファイルに分割:

```
src/workflows/
├── constants.ts              # 既存（変更なし）
├── main-workflow.ts          # 300行程度（オーケストレーションのみ）
├── workflow-actions.ts       # 700行程度（全アクション実行ロジック）
└── workflow-helpers.ts       # 300行程度（共通ヘルパー関数）
```

### Phase 2: main-workflow.ts（オーケストレーション）

**残すメソッド**:
- `execute()` - メインフロー制御
- `executeAction()` - switch文でアクション振り分け
- `saveResults()` - 結果保存
- `initializeKaitoClient()` - クライアント初期化
- `loadScheduleData()` - スケジュールデータ読み込み

**移動するメソッド**: すべてのアクション実行メソッドとヘルパーメソッド

### Phase 3: workflow-actions.ts（アクション実行）

**移動するメソッド**:
- `executePostAction()` - 投稿アクション実行
- `executeRetweetAction()` - リツイートアクション実行
- `executeLikeAction()` - いいねアクション実行
- `executeQuoteTweetAction()` - 引用ツイートアクション実行
- `executeFollowAction()` - フォローアクション実行
- `executeAnalyzeAction()` - 分析アクション実行
- `executeDeepNightAnalysis()` - 深夜分析実行
- `saveAnalysisResults()` - 分析結果保存

### Phase 4: workflow-helpers.ts（ヘルパー関数）

**移動するメソッド**:
- `collectKaitoData()` - Kaitoデータ収集
- `searchAndFilterTweets()` - ツイート検索・フィルタリング
- `buildSystemContext()` - システムコンテキスト構築
- `convertAccountInfoToProfile()` - アカウント情報変換
- `calculateEngagementRate()` - エンゲージメント率計算
- `getCurrentTimeSlotPattern()` - 時間帯パターン取得
- `calculateCurrentEngagementExpectation()` - エンゲージメント期待値計算
- `getTimeSlotForHour()` - 時間帯スロット決定

## 🔧 実装仕様

### Import/Export設計

**main-workflow.ts**:
```typescript
import { executePostAction, executeRetweetAction, /* ... */ } from './workflow-actions';
import { collectKaitoData, buildSystemContext, /* ... */ } from './workflow-helpers';
```

**workflow-actions.ts**:
```typescript
import { buildSystemContext, collectKaitoData, /* ... */ } from './workflow-helpers';
export { executePostAction, executeRetweetAction, /* ... */ };
```

**workflow-helpers.ts**:
```typescript
export { collectKaitoData, buildSystemContext, /* ... */ };
```

### Static Method保持

- すべてのメソッドは現在の`static`修飾子を保持
- クラス構造は変更せず、メソッドの場所のみ移動
- 既存の型定義やインポートは最小限の変更

## 📋 品質要件

### 機能要件
- ✅ 既存の動作を完全に保持
- ✅ 全テストが引き続き通過
- ✅ エラーハンドリングロジック保持
- ✅ TypeScript型安全性維持

### 非機能要件
- ✅ ファイルサイズ: 各ファイル500行以下
- ✅ 循環依存: 発生させない
- ✅ パフォーマンス: 影響を与えない

## 🚫 MVP制約（重要）

### 絶対に追加してはいけないもの
- ❌ 新しいクラス・インターフェース
- ❌ 新しい機能・メソッド
- ❌ 新しい依存関係・パッケージ
- ❌ リファクタリング（変数名変更等）
- ❌ 最適化・パフォーマンス改善

### 許可される作業のみ
- ✅ メソッドの物理的な移動
- ✅ Import/Export文の追加・調整
- ✅ TypeScriptコンパイルエラーの修正

## 📁 参照すべきドキュメント

作業前に以下を必ず確認:
- `docs/directory-structure.md` - プロジェクト構造詳細
- `docs/workflow.md` - ワークフロー仕様
- `docs/kaito-api.md` - KaitoAPI仕様  
- `docs/claude.md` - Claude SDK仕様

## ✅ 完了確認項目

### Phase 1完了確認
- [ ] 3ファイルが正しく作成されている
- [ ] Import/Export関係が正しく設定されている
- [ ] TypeScriptコンパイルエラーがない

### Phase 2完了確認
- [ ] `pnpm dev` が正常に実行される
- [ ] `pnpm start` が正常に実行される
- [ ] 既存のテストがすべて通過する

### 最終完了確認
- [ ] ファイルサイズが適切（main-workflow.ts < 400行）
- [ ] 循環依存が発生していない
- [ ] 機能が完全に保持されている

## 🔧 実行コマンド

作業完了後、以下で動作確認:

```bash
# TypeScript コンパイル確認
pnpm run typecheck

# テスト実行
pnpm test

# 開発モード動作確認  
pnpm dev
```

## 📝 報告書要件

作業完了後、以下の情報を含む報告書を作成:

- 分割されたファイルの行数
- 移動したメソッド一覧  
- Import/Export関係図
- 動作確認結果
- 発生した問題と解決方法

---

**重要**: この作業は単純なファイル分割作業です。新機能追加・最適化・リファクタリングは一切行わないでください。