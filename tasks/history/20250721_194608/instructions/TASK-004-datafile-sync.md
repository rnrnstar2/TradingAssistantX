# TASK-004: データファイル不一致修正

## 🎯 タスク概要
投稿履歴管理において `daily-action-data.yaml` と `posting-history.yaml` の不一致を解決し、統一されたデータ管理システムを確立する。

## 📋 問題詳細

### 現状の問題
1. **重複管理**: 同じ投稿データが2つのファイルで管理されている
2. **データ不一致**: posting-history.yamlには失敗を含む全履歴、daily-action-data.yamlには成功データのみが理想
3. **管理複雑化**: どちらが正式な履歴なのかが不明確

### 現在のファイル状況
- `data/daily-action-data.yaml`: DailyActionPlanner管理、日次集計用
- `data/posting-history.yaml`: 投稿の全履歴記録

## ✅ 修正要件

### データファイル統合戦略
1. **posting-history.yaml**: 全投稿履歴（成功/失敗含む）の永続記録
2. **daily-action-data.yaml**: 日次統計と成功アクションの集計専用

### 修正対象
- データ同期システムの実装
- 重複除去と整合性確保
- 統一されたレコード管理

## 🔧 実装方針

### Phase 1: データ分析
1. 両ファイルの現状内容比較
2. 重複データの特定
3. 不一致箇所の洗い出し

### Phase 2: 統合ロジック実装
1. **PostingManager統合**:
   ```typescript
   // posting-history.yamlへの記録
   await this.postingManager.recordToHistory(actionResult);
   
   // daily-action-data.yamlへの集計反映  
   await this.dailyActionPlanner.recordAction(actionResult);
   ```

2. **データ同期メソッド追加**:
   ```typescript
   // 両ファイル間の整合性チェック
   async syncDataFiles(): Promise<void>
   
   // 不整合データの修復
   async repairDataInconsistency(): Promise<void>
   ```

### Phase 3: クリーンアップ
1. 現在の不正確なデータ削除
2. 正しいデータでの初期化
3. 今後の重複防止システム

## 📂 ファイル修正内容

### 1. posting-manager.ts の確認・修正
- `recordPosting` メソッドが適切に履歴を記録しているか
- エラーレスポンスも含めた完全な履歴管理

### 2. データ同期システム実装
- 両ファイル間の自動同期
- 整合性チェック機能
- 不整合時の自動修復

### 3. データファイル初期化
```yaml
# daily-action-data.yaml リセット
- date: '2025-07-21'
  totalActions: 0  # 成功分のみ
  actionBreakdown:
    original_post: 0
    quote_tweet: 0  
    retweet: 0
    reply: 0
  executedActions: []
  targetReached: false
```

## 🧪 テスト確認
修正後、以下を確認：
1. 投稿実行時に両ファイルが正しく更新されること
2. 成功アクションのみがdaily-action-data.yamlでカウントされること
3. 全履歴がposting-history.yamlに記録されること
4. 同期メソッドが正常に動作すること

## 📋 品質基準
- TypeScript strict mode準拠
- ESLint通過必須
- データ整合性の保証
- パフォーマンスの最適化

## 📂 出力管理
- 報告書: `tasks/20250721_194608/reports/REPORT-004-datafile-sync.md`
- ルートディレクトリへの出力は禁止

## ⚠️ 注意事項
- **データ損失防止**: 既存の有効な履歴データは保持
- **段階的移行**: 一度にすべて変更せず、段階的に修正
- **バックアップ**: 重要なデータファイルの修正前バックアップ
- **レガシー対応**: 既存システムとの互換性確保

## 🔄 データ移行手順
1. 現在のデータファイルをバックアップ
2. 不正確なエントリの特定・削除
3. 正しいデータでの初期化
4. 新しい同期システムの動作確認

---
**実装完了後、報告書でデータ整合性の確認結果と今後の管理方針を報告してください。**