# TASK-001-main-workflows-cooperation.md

## 🎯 タスク概要
main.ts と main-workflows の5つのファイルの連携を完璧にする。保守管理のしやすさ、コードの見やすさを最優先とし、ワークフロー間の統一性とエラーハンドリングを改善する。

## 📋 対象ファイル
1. `/src/main.ts` - システムエントリーポイント
2. `/src/main-workflows/execution-flow.ts` - メインループ実行
3. `/src/main-workflows/scheduler-manager.ts` - スケジューラー管理
4. `/src/main-workflows/status-controller.ts` - 状態制御
5. `/src/main-workflows/system-lifecycle.ts` - システムライフサイクル

## 🚨 現在の問題点分析

### 1. main.ts の初期化プロセス問題
```typescript
// 現在の問題コード（lines 49-53）
this.systemLifecycle = new SystemLifecycle(new ComponentContainer());
this.container = this.systemLifecycle.initializeComponents(config);
// SystemLifecycleに正しいコンテナを設定
this.systemLifecycle = new SystemLifecycle(this.container);
```
**問題**: SystemLifecycleを二重初期化している（非効率・混乱の原因）

### 2. ワークフロー間の統一性不足
- エラーハンドリング方法がクラス毎にバラバラ
- ログ出力フォーマットの不統一
- 状態管理の責任範囲が曖昧

### 3. 型安全性の課題
- `any` 型の多用（system-lifecycle.ts 等）
- ComponentContainer からの取得時の型キャスト
- interface の不整合

## 🎯 改善目標

### 1. **初期化プロセスの統一**
- SystemLifecycleの二重初期化を解消
- クリーンな単一初期化パターンの確立
- 依存関係注入の明確化

### 2. **ワークフロー間の連携統一**
- エラーハンドリング戦略の統一
- ログ出力フォーマットの統一
- 状態管理の責任範囲明確化

### 3. **型安全性の向上**
- `any` 型を適切な型に置換
- interface の統一と整理
- ComponentContainer 型安全性向上

### 4. **日本語コメントの改善**
- 各ワークフロークラスに詳細な日本語コメント追加
- メソッドの役割・処理フローを明確化
- 他クラスとの連携ポイントを明記

## 📚 必須読み込み資料
作業開始前に以下を必ず読み込むこと：
- `REQUIREMENTS.md` - システム全体仕様
- 現在の全5ファイルの内容理解

## 🛠️ 実装指示

### Phase 1: main.ts 初期化プロセス改善
1. **SystemLifecycle二重初期化の解消**
   ```typescript
   // 改善後の理想形
   constructor() {
     const config = getConfig();
     
     // 【シンプル初期化】一回の初期化で完結
     this.container = new ComponentContainer();
     this.systemLifecycle = new SystemLifecycle(this.container);
     this.systemLifecycle.initializeComponents(config);
     
     // 他のワークフロークラス初期化
     this.schedulerManager = new SchedulerManager(this.container);
     this.executionFlow = new ExecutionFlow(this.container);
     this.statusController = new StatusController(this.container);
   }
   ```

2. **エラーハンドリング統一**
   - 全クラスで共通のエラーハンドリングパターン採用
   - try-catch 処理の統一
   - エラーログフォーマットの統一

### Phase 2: ワークフロークラス改善

#### execution-flow.ts 改善
- `loadSystemContext()` の型安全性向上
- `any` 型の除去
- エラーハンドリング統一

#### scheduler-manager.ts 改善
- SchedulerManager とCoreScheduler の連携明確化
- 設定リロード処理の改善
- スケジューラー状態管理の強化

#### status-controller.ts 改善
- SystemStatus クラスの型定義改善
- 手動実行処理の安全性向上
- 設定リロード機能の統一

#### system-lifecycle.ts 改善
- 各統合クラス（SystemInitializer, HealthChecker等）の型安全性向上
- `any` 型の除去
- 初期化プロセスの最適化

### Phase 3: 日本語コメント充実
各ファイルに以下レベルの日本語コメントを追加：

1. **ファイルヘード**：役割・他ファイルとの関係性
2. **クラス**：責任範囲・主要メソッド概要
3. **メソッド**：処理フロー・パラメータ・戻り値・他クラス連携
4. **重要な処理ブロック**：処理意図・注意点

例：
```typescript
/**
 * ExecutionFlow - メインループ実行ワークフロー管理クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 30分毎の4ステップワークフロー実行制御
 * • データ読み込み → Claude判断 → アクション実行 → 結果記録
 * • ComponentContainerを通じた各コンポーネント連携
 * 
 * 🔗 主要連携:
 * • main.ts → startScheduler() でexecuteMainLoop()をコールバック登録
 * • SchedulerManager → 30分間隔でexecuteMainLoop()実行
 * • StatusController → 手動実行トリガー時にexecuteMainLoop()実行
 */
```

## 🚫 MVP制約・禁止事項

### 絶対禁止
- **モックデータ使用禁止** - REAL_DATA_MODE=true のみ
- **過剰な抽象化禁止** - シンプルで理解しやすい実装
- **新ディレクトリ作成禁止** - 既存構造内での改善のみ
- **パフォーマンス統計機能追加禁止** - MVP範囲外

### 設計制約
- **疎結合設計維持** - ComponentContainer を通じた依存注入維持
- **30分間隔実行維持** - システムの基本動作を変更禁止
- **既存API変更最小化** - 外部からの呼び出しインターフェース維持

## ✅ 完了基準

### 機能完了基準
- [ ] SystemLifecycle二重初期化の解消
- [ ] 全クラスのエラーハンドリング統一
- [ ] `any` 型の適切な型への置換
- [ ] 各ファイルの日本語コメント充実

### 品質基準
- [ ] TypeScript strict mode 通過
- [ ] lint エラー0件
- [ ] 既存テストの通過（もしあれば）
- [ ] システム起動・30分間隔実行の正常動作

### コード品質基準
- [ ] 各メソッドの役割が明確
- [ ] クラス間の責任分離が明確
- [ ] エラーメッセージの統一
- [ ] 日本語コメントが充実

## 📝 実装完了後の報告書
以下を含む報告書を作成：

### 改善内容
1. 初期化プロセス改善の詳細
2. ワークフロー間連携の改善点
3. 型安全性向上の具体策
4. 日本語コメント充実の範囲

### 動作確認
1. システム起動確認
2. 30分間隔実行確認
3. 手動実行機能確認
4. エラーハンドリング確認

## 📁 出力先
**報告書**: `tasks/20250724_152324/reports/REPORT-001-main-workflows-cooperation.md`

---

**重要**: このタスクは main.ts と main-workflows の連携を**完璧**にすることが目標です。保守管理のしやすさとコードの見やすさを最優先とし、将来の拡張・修正時に開発者が迷わない明確な構造を構築してください。