# TASK-003: 不要ファイル削除・インポート修正

## 🎯 タスク概要  
**責任範囲**: src/core/の不要ファイル完全削除と全プロジェクトのインポート修正

## 📋 実装要件

### 🗑️ 完全削除対象ファイル（7個）

#### src/core/ディレクトリ
1. **action-executor.ts** (18.7KB) - 機能はautonomous-executorに統合済み
2. **app-config-manager.ts** (4.1KB) - 設定管理は utils/ に移行
3. **cache-manager.ts** (3.1KB) - キャッシュ機能は不要
4. **context-manager.ts** (6.0KB) - コンテキスト管理は統合済み
5. **decision-processor.ts** (10.9KB) - 意思決定はdecision-engineに統合
6. **parallel-manager.ts** (25.4KB) - 並列処理機能は不要
7. **true-autonomous-workflow.ts** (27.3KB) - ワークフローは自律実行に統合

### 📊 削除効果
- **ファイル数**: 9個 → 3個 (67%削減)
- **コード量**: 125.1KB → 69.1KB (45%削減)
- **技術的負債**: 複雑な依存関係の完全解消

## 🔍 インポート修正タスク

### フェーズ1: 削除対象参照の特定
**プロジェクト全体での削除対象ファイルへの参照を特定**
```bash
# 検索コマンド例
grep -r "from './action-executor" src/
grep -r "from './app-config-manager" src/
grep -r "from './cache-manager" src/
grep -r "from './context-manager" src/
grep -r "from './decision-processor" src/
grep -r "from './parallel-manager" src/
grep -r "from './true-autonomous-workflow" src/
```

### フェーズ2: 参照ファイルの修正
**発見された参照に対する修正方針**
1. **削除または置換**: 不要な参照は削除
2. **代替実装**: 必要な機能は適切な場所で再実装
3. **インポート先変更**: utils/や services/ の適切なファイルに変更

### フェーズ3: TypeScript/ESLintエラー対応
**修正後の整合性確保**
- 型エラーの解消
- 未使用インポートの削除
- ESLintルール違反の修正

## 🎯 特別対応が必要なディレクトリ

### src/core/ 以外の要調査ディレクトリ
```typescript
// 以下ディレクトリは削除対象ファイルを参照している可能性
src/collectors/     // データ収集系
src/services/       // ビジネスロジック系  
src/utils/          // ユーティリティ系
src/types/          // 型定義系
```

### 削除の優先順位
1. **最優先**: src/core/ 内の削除対象7ファイル
2. **高優先**: core/ からの直接インポート修正
3. **中優先**: 他ディレクトリからの間接参照修正
4. **低優先**: テストファイルの整合性確保

## 🔒 技術制約

### 削除実行規則
- **段階的削除**: 1ファイルずつ削除し、その都度インポートエラー修正
- **バックアップ**: 削除前にgit commitでバックアップ
- **検証**: 各削除後にTypeScript/ESLintチェック実行

### 修正範囲制限
- **対象**: src/ディレクトリのみ
- **除外**: node_modules/, dist/, tests/ は対象外
- **保守**: package.jsonやtsconfig.jsonは修正しない

## 🧪 検証要件

### 必須チェック項目
1. **ファイル削除確認**: 7ファイルの完全削除
2. **TypeScript成功**: `pnpm run typecheck` エラー0
3. **ESLint成功**: `pnpm run lint` エラー0  
4. **ビルド成功**: `pnpm run build` 成功
5. **インポートエラー0**: 削除対象への参照が完全に0

### 動作確認
- **pnpm dev**: 開発用実行が正常に動作
- **基本機能**: 削除による機能破綻がないことを確認

## 📂 作業手順

### Step 1: 事前調査
1. **削除対象ファイルの詳細分析**: 各ファイルの機能・責任確認
2. **依存関係マッピング**: どこから参照されているかの完全把握
3. **影響範囲特定**: 削除による影響を受けるファイル一覧作成

### Step 2: 段階的削除
1. **最も依存の少ないファイルから削除開始**
2. **各削除後に即座にインポートエラー修正**
3. **TypeScript/ESLintチェックを毎回実行**

### Step 3: 統合検証
1. **全削除完了後の総合検証**
2. **機能テスト実行**  
3. **パフォーマンス確認**

## ⚠️ リスク管理

### 高リスク要素
- **autonomous-executor.ts**: Worker Aによる大幅修正と同期が必要
- **広範囲参照**: 削除対象ファイルへの予想以上の参照
- **型依存**: 削除対象ファイルで定義された型の他箇所での使用

### 対応戦略
- **Worker A完了待ち**: autonomous-executor.tsの修正完了を確認してから作業開始
- **段階的アプローチ**: 小さな変更を積み重ねて安全性確保
- **継続的検証**: 各ステップでの動作確認を徹底

## 📋 出力管理規則

### ✅ 許可された出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-003-cleanup-imports.md`

### 🚫 禁止事項
- ルートディレクトリへの分析ファイル出力
- 削除ファイルのバックアップをルートに作成

## 📋 報告書要件

### 必須記載事項
1. **削除実行詳細**: 各ファイルの削除順序と結果
2. **インポート修正一覧**: 修正したファイルと変更内容
3. **検証結果**: TypeScript/ESLint/ビルド結果の詳細
4. **課題・困難**: 遭遇した問題と解決策
5. **最終状態**: 削除完了後のcore/ディレクトリ構成

### 報告書出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-003-cleanup-imports.md`

## 🎯 成功基準
- src/core/に3ファイル（autonomous-executor.ts, decision-engine.ts, loop-manager.ts）のみ残存
- プロジェクト全体でTypeScript/ESLintエラー0
- 削除による機能破綻なし
- REQUIREMENTS.md理想構造の完全実現

## 🔄 Worker間連携

### 依存関係
- **Worker A完了後**: autonomous-executor.tsの依存関係解消確認後に削除実行
- **Worker B並行**: loop-manager.ts作成と並行して削除作業可能

### 同期ポイント  
- **autonomous-executor.ts**: Worker Aの修正完了確認が必須
- **その他6ファイル**: Worker B完了を待たずに削除可能

---

**完全性重視**: 7ファイルの完全削除とエラー0状態の達成を目指してください