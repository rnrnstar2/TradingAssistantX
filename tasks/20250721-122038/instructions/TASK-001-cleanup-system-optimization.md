# TASK-001: 自動クリーンアップシステム最適化

## 🚨 重要性: CRITICAL - システム設計の最適化

### 現状問題
システム全体に**複雑な自動クリーンアップ機能**が実装されており、Claude主導の設計思想と矛盾しています。

#### 発見された設計上の問題
1. **自動化の複雑性**: 毎回実行される複雑なクリーンアップ処理
2. **Claude判断の軽視**: 自動実行がClaude判断を上回る設計
3. **システムリソース消費**: 不要な処理による負荷

## 🎯 修正目標
- **自動クリーンアップ機能を削除**
- **Claude判断ベースのクリーンアップのみ残存**
- **シンプルで効率的なシステム設計**

## 📋 具体的修正作業

### 1. autonomous-executor.ts の修正
**ファイル**: `src/core/autonomous-executor.ts`

#### 削除対象
- `41行目`: 実行完了後クリーンアップのコメント
- `201-209行目`: `cleanupAfterExecution()` メソッド全体
- `214-223行目`: `emergencyCleanup()` メソッド全体
- 関連する import文とメソッド呼び出し

#### 保持対象
- Claudeが `clean_data` 決定を下した時の実行機能のみ

### 2. autonomous-runner.ts の修正
**ファイル**: `src/scripts/autonomous-runner.ts`

#### 削除対象
- `18行目`: cleanup スクリプト呼び出し
- `29行目`: システムクリーンアップ ログ
- `46-51行目`: 強制クリーンアップ実行
- `76-82行目`: データクリーンアップ自動実行

#### 修正後の動作
```typescript
// シンプルな実行ループのみ
while (true) {
  await executor.executeAutonomously();
  const waitTime = await executor.determineNextExecutionTime();
  await sleep(waitTime);
}
```

### 3. parallel-manager.ts の修正
**ファイル**: `src/core/parallel-manager.ts`

#### 保持対象
- `executeDataCleanup()` メソッド（Claude判断時のみ実行）
- マッピングテーブルの `'data_cleanup': () => this.executeDataCleanup(action)`

#### 動作確認
- Claudeが `clean_data` 決定を下した時のみ実行されることを確認

### 4. 関連ファイルの確認・調整

#### execution-orchestrator.ts
- 自動クリーンアップ呼び出しを削除
- 必要に応じてClaude判断ベースに変更

#### その他のファイル
- context-manager.ts, async-execution-manager.ts 等で不要な自動クリーンアップを削除

## 🎯 実装ガイドライン

### 設計原則
- **シンプル性の維持**: 適切な複雑さで必要機能を実装
- **Claude主導**: Claude判断をベースにした柔軟なシステム
- **実用性**: Xアカウント管理に必要な機能を優先

### 実装指針
- 必要なパフォーマンス分析機能の実装を歓迎
- Xアカウント管理に必要な機能の積極的実装
- Claude判断をサポートする知能的自動化の実装

## ✅ 修正後の期待動作

### Claude主導クリーンアップ
```typescript
// Claudeがニーズ分析で clean_data を決定
needs = [{
  "type": "maintenance",
  "description": "Clean up old data files"
}]

// 決定エンジンで data_cleanup アクションに変換
decisions = [{
  "type": "clean_data"
}]

// ParallelManagerで実行
action = "data_cleanup"
result = await executeDataCleanup(action)
```

### 自動実行の完全停止
- 毎回の自動クリーンアップ停止
- 実行完了後の自動クリーンアップ停止
- 緊急時の自動クリーンアップ停止

## 🔧 品質チェック項目

### 必須確認事項
1. **TypeScript コンパイル成功**
2. **ESLint エラーなし**
3. **自動クリーンアップの完全停止**
4. **Claudeクリーンアップ機能の動作確認**

### テスト方法
```bash
# コンパイル確認
pnpm run type-check

# Lint確認  
pnpm run lint

# 動作確認（自動クリーンアップが実行されないことを確認）
pnpm dev
```

## 📋 報告書要件

### 作成ファイル
**報告書**: `tasks/20250721-122038/reports/REPORT-001-cleanup-system-optimization.md`

### 含めるべき内容
1. **削除した機能リスト**（具体的なメソッド名・行数）
2. **システム設計改善確認**（Claude主導への変更点）
3. **動作確認結果**（コンパイル・lint・実行テスト）
4. **Claudeクリーンアップ機能の動作確認**

## ⚠️ 出力管理規則

### 禁止出力先
- ❌ ルートディレクトリ直下
- ❌ `*.md` ファイルの直接作成

### 承認済み出力先
- ✅ `tasks/20250721-122038/reports/`
- ✅ `tasks/20250721-122038/outputs/`（必要時）

## 🎯 成功基準

1. **全自動クリーンアップ機能の削除完了**
2. **Claude主導設計への適合**
3. **Claude判断ベースクリーンアップの動作確認**
4. **コンパイル・Lint・動作テストの全通過**

---

**重要**: シンプルで効率的なシステム設計を実現し、Claudeの判断に基づく柔軟なクリーンアップシステムを構築してください。