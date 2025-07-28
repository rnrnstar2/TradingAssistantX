# TASK-002-focused-workflow-improvement.md

## 🎯 タスク概要
**main.ts と main-workflows の5つのファイル**のみに限定した連携改善。保守管理のしやすさ、コードの見やすさを最優先とする。

## ⚠️ 🚨 **厳格な制約事項** 🚨

### 絶対禁止事項
- ❌ **既存ファイル削除禁止** - いかなるファイルも削除してはならない
- ❌ **新規ファイル作成禁止** - src/ 配下への新ファイル作成禁止
- ❌ **kaito-api/ 変更禁止** - kaito-api ディレクトリは一切変更禁止
- ❌ **claude/ 変更禁止** - claude ディレクトリは一切変更禁止
- ❌ **shared/ 大幅変更禁止** - 最小限の型定義のみ許可
- ❌ **package.json 変更禁止** - 依存関係の変更禁止

### 編集許可ファイル（5つのみ）
1. `/src/main.ts` - システムエントリーポイント
2. `/src/main-workflows/execution-flow.ts` - メインループ実行
3. `/src/main-workflows/scheduler-manager.ts` - スケジューラー管理
4. `/src/main-workflows/status-controller.ts` - 状態制御
5. `/src/main-workflows/system-lifecycle.ts` - システムライフサイクル

## 📋 具体的改善内容

### 1. main.ts の初期化プロセス改善
**現在の問題**:
```typescript
// 簡素化されすぎて責任が不明確
this.container = new ComponentContainer();
this.systemLifecycle = new SystemLifecycle(this.container);
```

**改善方向**:
- 初期化フローの明確化
- エラーハンドリングの追加
- 日本語コメントの充実

### 2. エラーハンドリングの統一
**各ファイルで統一されたエラーハンドリングパターンを採用**:
```typescript
try {
  systemLogger.info('[処理名]開始');
  // メイン処理
  systemLogger.success('✅ [処理名]完了');
} catch (error) {
  systemLogger.error('❌ [処理名]エラー:', error);
  throw new Error(`[処理名] failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 3. 日本語コメント改善
**各ファイルに以下レベルのコメント追加**:
- ファイルヘッダー: 役割・他ファイルとの関係性
- クラス: 責任範囲・主要メソッド概要
- メソッド: 処理フロー・連携ポイント

### 4. 型安全性向上（最小限）
- 既存の型定義内での改善のみ
- any型の適切な型への置換（可能な範囲）
- 型キャストの安全化

### 5. ワークフロー間の連携明確化
- 各クラス間の呼び出し関係を明確化
- 責任範囲の明文化
- 状態の受け渡し方法の統一

## 🎯 完了基準

### 機能完了基準
- [ ] main.ts 初期化フローの明確化
- [ ] 5つのファイルすべてのエラーハンドリング統一
- [ ] 各ファイルの日本語コメント充実
- [ ] ワークフロー間連携の明確化

### 品質基準
- [ ] TypeScript strict mode 通過
- [ ] システム起動・正常動作確認
- [ ] 既存機能への影響なし

### 保守性基準
- [ ] 各クラスの責任範囲が明確
- [ ] メソッドの役割が日本語コメントで明確
- [ ] 他開発者が理解しやすい構造

## 📝 作業手順

### Step 1: ファイル理解
1. 現在の5つのファイルの内容を詳細に読み込み
2. 既存の連携方法を理解
3. 改善ポイントを特定

### Step 2: 改善実装
1. main.ts から順次改善
2. 各ファイルのエラーハンドリング統一
3. 日本語コメント追加

### Step 3: 検証
1. TypeScript型チェック
2. システム起動確認
3. 既存機能動作確認

## 📁 出力先
**報告書**: `tasks/20250724_160144/reports/REPORT-002-focused-workflow-improvement.md`

---

**重要**: この作業は**5つのファイルのみ**に限定し、他のファイルには一切変更を加えないでください。保守管理のしやすさとコードの見やすさを最優先とし、確実に動作する改善を行ってください。