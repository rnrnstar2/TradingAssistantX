# TASK-002: DailyActionPlanner成功/失敗判定修正

## 🎯 タスク概要
DailyActionPlannerが失敗したアクション（401/403エラー）も成功としてカウントし、日次配分で「目標達成済み」と誤判定している問題を修正する。

## 📋 問題詳細
`data/daily-action-data.yaml` の状況：
- `totalActions: 15` + `targetReached: true`
- しかし全アクションが `success: false`
- 実際の成功投稿: **0件**

### 根本原因
`src/lib/daily-action-planner.ts` の `recordAction` メソッドで成功/失敗に関係なく全てのアクションをカウントしている。

## ✅ 修正要件

### 修正対象ファイル
- `src/lib/daily-action-planner.ts`

### 修正内容
1. **recordAction メソッドの修正** (line 339付近)：
   ```typescript
   // 修正前: 成功/失敗問わずカウント
   todaysLog.executedActions.push(actionResult);
   todaysLog.totalActions = todaysLog.executedActions.length;
   
   // 修正後: 成功したアクションのみカウント
   todaysLog.executedActions.push(actionResult);
   const successfulActions = todaysLog.executedActions.filter(action => action.success);
   todaysLog.totalActions = successfulActions.length;
   ```

2. **actionBreakdown の修正** (line 343付近)：
   ```typescript
   // 修正前: 全アクションをカウント
   if (validActionTypes.includes(actionResult.type as any)) {
     (todaysLog.actionBreakdown as any)[actionResult.type]++;
   }
   
   // 修正後: 成功したアクションのみカウント
   if (validActionTypes.includes(actionResult.type as any) && actionResult.success) {
     (todaysLog.actionBreakdown as any)[actionResult.type]++;
   }
   ```

3. **目標達成判定の修正** (line 349付近)：
   ```typescript
   // 修正前: 全アクション数で判定
   todaysLog.targetReached = todaysLog.totalActions >= this.DAILY_TARGET;
   
   // 修正後: 成功アクション数で判定
   const successCount = todaysLog.executedActions.filter(action => action.success).length;
   todaysLog.targetReached = successCount >= this.DAILY_TARGET;
   ```

4. **getTodaysActions メソッドの修正**: 成功したアクションのみを返すオプションを追加

## 🔧 実装方針
- **後方互換性**: 既存のexecutedActionsは全て保持（履歴として重要）
- **正確性**: 成功したアクションのみを有効カウントとする
- **一貫性**: 全ての関連メソッドで成功判定を統一

## 📂 データファイル修正
修正と同時に現在の不正確なデータをリセット：
- `data/daily-action-data.yaml` の今日の分を削除または修正
- 失敗アクションは履歴として保持、ただしカウントから除外

## 🧪 テスト確認
修正後、以下を確認：
1. 成功アクション（`success: true`）のみがカウントされること
2. 失敗アクション（`success: false`）が履歴に残るがカウントされないこと
3. `targetReached` が正確に判定されること
4. `planDailyDistribution()` が正しい残り回数を返すこと

## 📋 品質基準
- TypeScript strict mode準拠
- ESLint通過必須
- 既存のテストケースが通ること

## 📂 出力管理
- 報告書: `tasks/20250721_194608/reports/REPORT-002-dailyplanner-fix.md`
- ルートディレクトリへの出力は禁止

## ⚠️ 注意事項
- executedActionsの履歴は削除しない（重要なログ情報）
- 成功判定ロジックのみを追加する
- 既存のYAMLファイル構造は維持する

---
**実装完了後、報告書で修正箇所とテスト結果を報告してください。**