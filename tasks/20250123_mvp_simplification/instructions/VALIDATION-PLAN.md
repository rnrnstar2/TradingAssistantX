# 🧪 MVP簡略化検証計画書

**タスクID**: VALIDATION-PLAN  
**作成日**: 2025-01-23  
**対象**: Worker実行完了後の検証  
**承認**: Manager

## 🎯 検証目的

MVP簡略化作業の完了確認と、システム基本機能の正常動作確認を行う。

## 📋 段階別検証手順

### Phase 1: ファイル削除検証

以下のファイルが完全に削除されていることを確認：

```bash
# 削除確認コマンド
ls -la src/core/execution/execution-monitor.ts    # 存在しないはず
ls -la src/core/execution/execution-lock.ts       # 存在しないはず
ls -la src/core/execution/execution-recovery.ts   # 存在しないはず
ls -la src/services/performance-analyzer.ts       # 存在しないはず
ls -la src/services/record-manager.ts            # 削除または大幅簡素化
ls -la src/utils/file-size-monitor.ts            # 存在しないはず
ls -la src/utils/integrity-checker.ts            # 存在しないはず
ls -la src/utils/maintenance/data-maintenance.ts  # 存在しないはず
```

**期待結果**: 上記ファイルは「No such file or directory」エラーになるはず

### Phase 2: 構文チェック

```bash
# TypeScript構文エラーがないことを確認
npx tsc --noEmit

# 期待結果: エラーなしで完了
echo "構文チェック結果: $?"  # 0であれば成功
```

### Phase 3: Import文エラー検証

削除されたモジュールを参照するimport文が残っていないことを確認：

```bash
# 削除されたクラスへの参照がないか確認
grep -r "ExecutionMonitor" src/ || echo "✅ ExecutionMonitor参照なし"
grep -r "ExecutionLock" src/ || echo "✅ ExecutionLock参照なし" 
grep -r "ExecutionRecovery" src/ || echo "✅ ExecutionRecovery参照なし"
grep -r "PerformanceAnalyzer" src/ || echo "✅ PerformanceAnalyzer参照なし"
grep -r "FileSizeMonitor" src/ || echo "✅ FileSizeMonitor参照なし"
grep -r "IntegrityChecker" src/ || echo "✅ IntegrityChecker参照なし"
grep -r "DataMaintenance" src/ || echo "✅ DataMaintenance参照なし"
```

**期待結果**: 全て「参照なし」と表示されるはず

### Phase 4: 基本動作検証

```bash
# 開発モードでの単発実行テスト
export DEV_MODE=true
export TEST_MODE=true
pnpm dev

# 期待結果: 
# - エラーなしで実行完了
# - "✅ [Autonomous Execution] Completed successfully" メッセージ表示
# - tasks/outputs/ に実行ログが出力される
```

### Phase 5: ループ実行検証

```bash
# 短時間のループ実行テスト（30秒）
timeout 30s pnpm start

# 期待結果:
# - 30秒間エラーなしで実行
# - 複数回の実行が正常に完了
# - メモリリークなし
```

### Phase 6: core-runner.ts簡素化確認

```bash
# core-runner.tsの行数確認（簡素化されているはず）
wc -l src/core/execution/core-runner.ts

# 複雑な機能が削除されていることを確認
grep -c "performHealthCheck\|acquireExecutionLock\|executeWithRetry" src/core/execution/core-runner.ts

# 期待結果: 0 (これらの関数が存在しない)
```

### Phase 7: 出力ファイル検証  

```bash
# 基本的な実行ログが出力されることを確認
ls -la tasks/outputs/execution-log-*.yaml
ls -la data/current/today-posts.yaml

# 期待結果: ファイルが存在し、基本的な情報が記録されている
```

## ✅ 成功基準チェックリスト

### 必須条件 (全てクリア必要)
- [ ] 指定されたファイルが全て削除されている
- [ ] TypeScript構文エラーが発生しない  
- [ ] 削除されたクラスへのimport参照がない
- [ ] `pnpm dev` が正常実行される
- [ ] 基本的な投稿機能が動作する
- [ ] 実行ログが正常に出力される

### 推奨条件 (可能な限りクリア)
- [ ] core-runner.tsが500行以下に簡素化されている
- [ ] ループ実行が安定して動作する
- [ ] エラーハンドリングがシンプルになっている
- [ ] メモリ使用量が改善されている

## 🚨 失敗時の対処

### エラーが発生した場合
1. **構文エラー**: import文の修正が必要
2. **実行エラー**: 削除されたクラスの参照が残存
3. **動作異常**: 基本機能の実装不備

### 報告必須事項
- 実行したコマンドと結果
- エラーメッセージの全文
- 修正が必要な箇所の特定
- 追加作業の必要性判断

## 📊 検証完了報告フォーマット

```yaml
# tasks/outputs/mvp-simplification-validation-report.yaml

validation_date: "2025-01-23"
validator: "Worker"
overall_status: "success|partial|failed"

phase_results:
  file_deletion: "success|failed"
  syntax_check: "success|failed" 
  import_cleanup: "success|failed"
  basic_execution: "success|failed"
  loop_execution: "success|failed"
  simplification_check: "success|failed"
  output_validation: "success|failed"

metrics:
  core_runner_lines: 数値
  deleted_files_count: 数値
  execution_time_dev: "Xms"
  memory_usage_improvement: "X%"

errors_encountered: []
additional_work_needed: []
recommendations: []

manager_approval_required: true|false
```

## 🎯 最終確認

Worker実行完了後、この検証計画に従って全項目を確認し、結果を報告すること。

**Manager承認**: MVP簡略化は品質と安定性の向上であり、妥協は許されない。