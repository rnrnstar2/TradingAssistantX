# 統合テスト環境整備とシステム動作確認

## 🎯 **重要度**: **HIGH - システム完全性確認**

**タスクID**: TASK-005  
**優先度**: 高  
**実行順序**: **直列実行** - 全修正完了後実行  
**推定時間**: 25-30分

## 📋 **実行前提条件**

**必須完了タスク**:
- TASK-001: 致命的初期化バグ修正 ✅必須
- TASK-002: DOM型定義修正 ✅必須  
- TASK-003: ESLint環境整備 ⚠️推奨
- TASK-004: TypeScript型安全性修復 ✅必須

**実行判断**: 上記必須タスク全完了後のみ開始

## 🎯 **テスト対象システム**

### 核心機能確認
- **Claude Code SDK統合動作**: API呼び出し・レスポンス処理
- **自律実行システム**: AutonomousExecutor起動・実行
- **データ収集システム**: ActionSpecificCollector動作
- **意思決定エンジン**: DecisionEngine処理フロー

### モジュール間統合確認
- ConfigManager ↔ AutonomousExecutor連携
- ContextManager ↔ DecisionProcessor統合
- ActionExecutor ↔ 外部API連携

## 🔍 **具体的テスト内容**

### 1. システム起動テスト

**テスト手順**:
```bash
# 基本起動確認
pnpm dev

# エラーなく起動することを確認
# 初期化順序が正常であることを確認
# Claude Code SDK接続確認
```

**期待結果**:
- 起動プロセスでエラー無し
- 全Manager初期化完了
- Claude SDK認証成功

### 2. TypeScript完全性チェック

**テスト手順**:
```bash
# 型チェック完全実行
npx tsc --noEmit

# strict mode確認
npx tsc --noEmit --strict

# 特定モジュールチェック
npx tsc --noEmit src/core/
```

**期待結果**:
- 型エラー0件
- strict mode通過
- 警告レベル問題のみ

### 3. ESLint品質チェック

**テスト手順**:
```bash
# ESLint実行
pnpm run lint

# 自動修正可能箇所確認
pnpm run lint:fix

# 重大問題なし確認
pnpm run lint:check
```

**期待結果**:
- 致命的エラー0件
- 警告は許容レベル
- コード品質基準クリア

### 4. 統合動作シミュレーション

**テスト手順**:
```bash
# テストモード起動
AUTONOMOUS_TEST_MODE=true pnpm dev

# データ収集テスト
# 意思決定処理テスト
# Claude SDK応答テスト
```

**テスト項目**:
- ActionSpecificCollector初期化
- ConfigManager設定読み込み
- ContextManager状況認識
- DecisionProcessor判断実行

### 5. メモリ・リソーステスト

**確認項目**:
- メモリリーク無し
- ブラウザリソース適切解放
- プロセス安定稼働
- エラーハンドリング動作

## 🔧 **テスト手順詳細**

### Step 1: 事前チェック
```bash
# 修正タスク完了確認
ls tasks/20250722_011347_legacy_code_phase1_cleanup/reports/
# REPORT-001, 002, 003, 004の存在確認

# 依存関係チェック
pnpm install
```

### Step 2: 段階的テスト実行
```bash
# 1. TypeScript検証
npx tsc --noEmit

# 2. ESLint検証  
pnpm run lint

# 3. ビルドテスト
pnpm run build

# 4. システム起動テスト
pnpm dev
```

### Step 3: 統合動作確認
```bash
# テストモードでの動作確認
AUTONOMOUS_TEST_MODE=true pnpm dev

# 各コンポーネント動作ログ確認
# エラーレベルログの有無確認
```

### Step 4: 品質指標収集
```bash
# パフォーマンス基礎測定（参考用）
time pnpm dev --test

# メモリ使用量確認（参考用）
ps aux | grep node
```

## ✅ **テスト完了判定基準**

### 必須成功基準
- [ ] `pnpm dev`でエラーなく起動
- [ ] TypeScript型チェック完全通過（エラー0件）
- [ ] ESLint致命的エラーなし
- [ ] 統合動作で例外・クラッシュなし

### 品質指標基準
- [ ] システム起動時間適切（30秒以内）
- [ ] メモリ使用量安定
- [ ] Claude SDK正常通信確認
- [ ] 各Manager正常初期化確認

### 回帰テスト基準
- [ ] 既存機能に悪影響なし
- [ ] データファイル読み込み正常
- [ ] 設定ファイル認識正常

## 📊 **出力要求**

### 統合テスト完了報告書
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/reports/REPORT-005-integration-test-environment-setup.md`

**必須内容**:
1. **全テスト項目結果サマリー**
2. **システム品質指標（起動時間、エラー数等）**
3. **発見された残存問題（あれば）**
4. **第二フェーズ推奨事項**

### システム健全性レポート
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/outputs/system-health-report.json`

**フォーマット**:
```json
{
  "テスト実行日時": "2025-07-22T01:45:00Z",
  "システム状況": {
    "起動成功": true,
    "TypeScript型エラー": 0,
    "ESLintエラー": 0,
    "統合動作": "正常"
  },
  "品質指標": {
    "起動時間": "12秒",
    "メモリ使用量": "245MB",
    "Claude SDK通信": "正常"
  },
  "第一フェーズ評価": "完了",
  "次フェーズ推奨": ["パフォーマンス最適化", "機能拡張"]
}
```

## ⚠️ **制約・注意事項**

### ⚠️ **実行前提条件確認必須**
- TASK-001~004の完了確認必須
- 他Worker作業完了待ち必須

### 🚫 **絶対禁止**
- 新機能実装・テスト追加禁止
- パフォーマンス向上目的の修正禁止
- 実プロダクション機能の実行禁止

### ✅ **テスト方針**
- **動作確認中心**: 機能動作の確認
- **品質測定**: 現状把握のみ
- **問題発見**: 次フェーズ課題特定

### 📋 **品質基準**
- システム正常起動確認
- 致命的エラー無し確認
- 基本統合動作確認

---

**🔥 実行条件**: 必須タスク（TASK-001,002,004）完了後のみ実行。他Worker作業完了待ち必須。

**最終目標**: 第一フェーズ完了確認とシステム健全性証明