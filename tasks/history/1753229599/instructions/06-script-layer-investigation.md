# スクリプト層実装状況調査指示書

## 調査対象
`src/scripts/`ディレクトリ配下の以下のファイル：
- main.ts（ループ実行・`pnpm start`）
- dev.ts（単一実行・`pnpm dev`）
- core-runner.ts（共通実行ロジック）
- その他のスクリプトファイル

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- 実行スクリプトの役割（REQUIREMENTS.md 207-211行目）
- 理想像の1日15回定時実行（REQUIREMENTS.md 16行目）
- 自律実行フロー（REQUIREMENTS.md 90-98行目）

### 3. 詳細調査項目

#### main.ts
- [ ] ループ実行機構の実装
- [ ] 1日15回の定時実行スケジューリング
- [ ] posting-times.yamlとの連携
- [ ] エラーハンドリングと再起動機構
- [ ] ログ出力と監視

#### dev.ts
- [ ] 単一実行機構の実装
- [ ] 開発用デバッグ機能
- [ ] テストモードの有無（実データのみ使用すべき）
- [ ] core-runner.tsとの連携

#### core-runner.ts
- [ ] 共通実行ロジックの実装
- [ ] autonomous-executor.tsとの連携
- [ ] データ収集から投稿までのフロー制御
- [ ] 結果記録・学習データ更新

#### コマンドラインインターフェース
- [ ] `pnpm start`の動作確認
- [ ] `pnpm dev`の動作確認
- [ ] package.jsonのスクリプト定義
- [ ] その他のコマンドの有無

### 4. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/script-layer-implementation-status.yaml`

```yaml
script_layer_status:
  main_ts:
    exists: true/false
    completion_rate: 85  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
    scheduled_execution_ready: true/false  # 1日15回実行対応
    
  dev_ts:
    exists: true/false
    completion_rate: 80
    debug_features:
      - 機能名
    test_mode_usage: true/false  # テストモード使用の有無
    
  core_runner:
    exists: true/false
    completion_rate: 90
    workflow_control:
      data_collection: true/false
      content_creation: true/false
      posting: true/false
      learning_update: true/false
    
  command_interface:
    pnpm_start_works: true/false
    pnpm_dev_works: true/false
    other_commands:
      - コマンド名: 目的
    
  overall_assessment:
    completion_rate: 75  # 全体の完成度
    autonomous_execution_ready: true/false
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 5. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- テストモードやモックデータの使用を特にチェック
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘
- 実際にコマンドを実行して動作を確認