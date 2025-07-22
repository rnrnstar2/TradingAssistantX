# TASK-002: システム設定とパス修正

## 🎯 実装目的
X投稿テスト実行のために、システムの設定ファイルパスとAPI設定を修正し、完全動作可能にする。

## 🚨 確認済み問題詳細

### 問題1: ファイルパス不整合
- **エラー**: `data/decisions/strategic-decisions.yaml` ファイルが見つからない
- **実態**: ファイルは `data/strategic-decisions.yaml` に存在する
- **原因**: ParallelManagerのパス設定が間違っている

### 問題2: X API設定問題
- **エラー**: "X API key not provided"
- **実態**: .envファイルにX_API_KEYは設定済み
- **原因**: 環境変数読み込みまたは参照問題

## 🔧 修正対象ファイル

### 1. ParallelManagerのパス修正
**ファイル**: `src/core/parallel-manager.ts`
**メソッド**: `executeDataCleanup()`

現在の問題コード（119行目周辺）:
```typescript
const cleanupTargets = [
  'context/execution-history.json',
  'decisions/strategic-decisions.yaml',  // ← 間違い
  'communication/claude-to-claude.json'
];
```

修正後:
```typescript
const cleanupTargets = [
  'context/execution-history.json',
  'strategic-decisions.yaml',  // ← 正しいパス
  'communication/claude-to-claude.json'
];
```

### 2. 環境変数読み込み確認
**確認対象**: 
- PostingManagerでのX_API_KEY読み込み
- dotenvの正常動作
- 環境変数の実際の参照方法

## 📋 具体的修正手順

### Step 1: ParallelManagerパス修正
```typescript
// 修正箇所: src/core/parallel-manager.ts 119行目周辺
const cleanupTargets = [
  'context/execution-history.json',
  'strategic-decisions.yaml',  // decisions/ を削除
  'communication/claude-to-claude.json'
];
```

### Step 2: 環境変数問題診断・修正
1. PostingManagerのコンストラクタ確認
2. dotenvの動作確認  
3. process.env.X_API_KEYの値確認
4. 必要に応じて環境変数参照方法修正

## 🛡️ MVP制約遵守事項
- **最小限修正**: パス修正と環境変数問題解決のみ
- **機能拡張禁止**: 新機能追加は行わない
- **シンプル実装**: 複雑なエラーハンドリング追加禁止

## ✅ 実装要件
1. **TypeScript strict mode 遵守**
2. **既存機能の完全保持**
3. **エラー解消の確認**

## 🧪 テスト手順
修正完了後、以下で動作確認：
```bash
pnpm run dev
```

確認ポイント:
- [ ] `data/decisions/strategic-decisions.yaml` エラー解消
- [ ] "X API key not provided" エラー解消  
- [ ] X投稿テストの正常実行
- [ ] システム全体の正常動作

## 📁 出力管理規則
- **出力先**: `tasks/20250721_005158/reports/REPORT-002-system-config-path-fix.md`
- **命名規則**: `REPORT-002-system-config-path-fix.md`
- **Root Directory Pollution Prevention**: ルートディレクトリへの出力は絶対禁止

## 📊 完了条件
- [ ] ParallelManagerのパス修正完了
- [ ] X API環境変数問題解決
- [ ] pnpm run dev でエラー無し動作
- [ ] X投稿テスト（TEST MODE）成功
- [ ] TypeScript型チェック通過
- [ ] 報告書作成完了

---
**記憶すべきこと**: この修正によりX投稿テストが完全に実行可能になります。