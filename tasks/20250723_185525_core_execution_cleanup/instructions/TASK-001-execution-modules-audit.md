# TASK-001: execution/サブディレクトリ実装状況監査

## 🎯 タスク概要

execution/サブディレクトリ内の各モジュール（execution-monitor.ts, execution-lock.ts, execution-recovery.ts）の実装状況を監査し、core-runner-ideal.tsで使用される形に調整する。

## 📋 必須事前確認

### 1. 権限・環境確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**Worker権限での実装作業のみ許可**

### 2. REQUIREMENTS.md確認
```bash
cat REQUIREMENTS.md | head -50
```
**要件定義書の必読確認**

## 🚨 MVP制約・過剰実装防止

### MVP適合性チェック
- ✅ **必要最小限**: core-runner-ideal.tsで使用される機能のみ実装
- ❌ **統計・分析機能**: パフォーマンス監視、詳細メトリクスは不要
- ❌ **複雑なインターフェース**: 過剰な抽象化・拡張性は避ける
- ❌ **将来の拡張性**: 今必要ない機能は実装しない

### 監査対象ファイル
```
src/core/execution/
├── execution-monitor.ts (19KB) - システム監視
├── execution-lock.ts (3KB) - ロック管理  
├── execution-recovery.ts (13KB) - リトライ機能
└── core-runner-ideal.ts (439行) - 理想実装（参考）
```

## 📝 実装要件

### 1. execution-monitor.ts 監査

**必要メソッド** (core-runner-ideal.tsで使用):
- `getAccountStatus()`: アカウント状況取得
- `performSystemHealthCheck()`: システムヘルスチェック
- `getMarketData()`: 市場データ取得

**実装確認事項**:
- ✅ 上記3メソッドが適切に実装されているか
- ✅ 戻り値の型がcore-runner-ideal.tsの期待値と一致するか
- ❌ 不要な統計・監視機能がないか
- ❌ 複雑なメトリクス収集機能がないか

### 2. execution-lock.ts 監査

**必要メソッド**:
- `createLock()`: ロック作成、boolean戻り値
- `removeLock()`: ロック削除、Promise<void>

**実装確認事項**:
- ✅ シンプルなファイルベースロック機能
- ✅ 例外処理が適切
- ❌ 複雑なロック管理・統計機能がないか

### 3. execution-recovery.ts 監査

**必要メソッド**:
- `executeWithRetry(fn, maxRetries, actionName)`: リトライ実行

**実装確認事項**:
- ✅ 基本的なリトライ機能のみ
- ✅ 例外処理が適切
- ❌ 複雑なリカバリー戦略・統計機能がないか

## 🔧 作業手順

### Phase 1: 実装状況確認
1. **各ファイルの読み込み**: 3つのファイルの実装内容を確認
2. **必要メソッド存在確認**: core-runner-ideal.tsで使用されるメソッドが実装されているか
3. **過剰実装特定**: MVP原則に反する不要な機能を特定

### Phase 2: 実装調整（必要に応じて）
1. **不足機能の実装**: 必要なメソッドが未実装の場合のみ追加
2. **過剰機能の削除**: 統計・監視・複雑な機能の削除
3. **型定義整合**: core-runner-ideal.tsとの型整合性確保

### Phase 3: 動作確認
1. **import確認**: core-runner-ideal.tsからの正常なimport
2. **メソッド呼び出し確認**: 必要なメソッドが正常に呼び出せるか
3. **TypeScript型チェック**: `pnpm typecheck`での型エラー解消

## 📤 出力要件

**必須出力先**: `tasks/20250723_185525_core_execution_cleanup/outputs/`

### 出力ファイル
1. **監査レポート**: `execution-modules-audit-report.yaml`
2. **修正ファイル**: 調整が必要な場合のみファイル編集
3. **動作確認ログ**: TypeScript型チェック結果

### 監査レポート形式
```yaml
audit_timestamp: "2025-07-23T18:55:25Z"
modules:
  execution-monitor:
    required_methods: ["getAccountStatus", "performSystemHealthCheck", "getMarketData"]
    implementation_status: "complete" | "incomplete" | "needs_adjustment"
    excess_features: [] # 削除すべき過剰機能のリスト
    adjustments_needed: [] # 必要な調整のリスト
  execution-lock:
    required_methods: ["createLock", "removeLock"]
    implementation_status: "complete" | "incomplete" | "needs_adjustment"
    excess_features: []
    adjustments_needed: []
  execution-recovery:
    required_methods: ["executeWithRetry"]
    implementation_status: "complete" | "incomplete" | "needs_adjustment"
    excess_features: []
    adjustments_needed: []
overall_assessment:
  ready_for_core_runner_replacement: true | false
  critical_issues: []
  recommendations: []
```

## 🚫 絶対禁止事項

### 実装禁止
- ❌ **統計・分析機能の追加**: パフォーマンス監視、詳細ログ等
- ❌ **複雑なインターフェースの作成**: 過剰な抽象化
- ❌ **将来の拡張性考慮**: 今必要ない機能
- ❌ **新しい依存関係の追加**: 必要最小限の依存のみ

### 出力禁止
- ❌ **ルートディレクトリへの出力**: 一切の分析・レポート直接出力禁止
- ❌ **要件定義外ファイルの作成**: REQUIREMENTS.mdにないファイル作成禁止

## ✅ 完了確認チェックリスト

- [ ] 3つのモジュールの実装内容確認完了
- [ ] 必要メソッドの存在・動作確認完了
- [ ] 過剰実装の特定・削除完了
- [ ] 監査レポート作成・出力完了
- [ ] TypeScript型チェック通過確認
- [ ] 報告書作成完了

## 📋 報告書作成

**報告書パス**: `tasks/20250723_185525_core_execution_cleanup/reports/REPORT-001-execution-modules-audit.md`

実装完了後、必ず報告書を作成してください。

---

**重要**: このタスクは並列実行可能です。TASK-002（core-runner置換）と同時進行できますが、TASK-003（レガシー削除）の前に完了する必要があります。