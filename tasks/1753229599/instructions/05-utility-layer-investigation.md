# ユーティリティ層実装状況調査指示書

## 調査対象
`src/utils/`ディレクトリ配下の以下のファイル：
- error-handler.ts（エラーハンドリング）
- monitoring/health-check.ts（システムヘルスチェック）
- integrity-checker.ts（構造検証・実装予定）
- その他のユーティリティファイル

※ yaml-manager.ts, yaml-utils.ts, context-compressor.ts, file-size-monitor.tsはデータ管理層調査でカバーされているため、ここではそれ以外を調査

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- ユーティリティの最適化状態（REQUIREMENTS.md 199-211行目）
- ハルシネーション防止機構（REQUIREMENTS.md 234-263行目）
- 実行前後の検証（REQUIREMENTS.md 252-258行目）

### 3. 詳細調査項目

#### error-handler.ts
- [ ] 包括的なエラーハンドリング機構
- [ ] エラーログ記録機能
- [ ] リトライロジック
- [ ] ロールバック機能
- [ ] エラー通知機構

#### monitoring/health-check.ts
- [ ] システム健全性チェック機能
- [ ] リソース使用状況の監視
- [ ] データ階層の状態監視
- [ ] 実行ログの記録
- [ ] 異常検出とアラート

#### integrity-checker.ts（実装予定）
- [ ] ファイルの存在有無
- [ ] 実装計画やTODOコメントの有無
- [ ] 構造検証の設計
- [ ] 要件定義との照合機能の計画

#### その他のユーティリティ
- [ ] 予想外のユーティリティファイルの存在
- [ ] 各ファイルの機能と必要性
- [ ] REQUIREMENTS.mdに記載のないファイルの有無

### 4. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/utility-layer-implementation-status.yaml`

```yaml
utility_layer_status:
  error_handler:
    exists: true/false
    completion_rate: 80  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
    requirements_compliance: 準拠/一部準拠/非準拠
    
  health_check:
    exists: true/false
    completion_rate: 70
    monitoring_capabilities:
      system_health: true/false
      resource_usage: true/false
      data_hierarchy: true/false
      execution_logs: true/false
    
  integrity_checker:
    exists: true/false
    planned: true/false
    design_notes: "設計メモやTODOの内容"
    expected_features:
      - 予定されている機能
    
  additional_utilities:
    - filename: ファイル名
      purpose: 目的
      completion_rate: 90
      requirements_listed: true/false
      
  overall_assessment:
    completion_rate: 65  # 全体の完成度
    optimization_status: 優/良/可/要改善
    hallucination_prevention_ready: true/false
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 5. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- integrity-checker.tsの実装状況を特に確認
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘
- utils/ディレクトリ全体をスキャンして予想外のファイルを発見