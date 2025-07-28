# データ管理層実装状況調査指示書

## 調査対象
### src/utils配下のデータ管理関連ファイル
- yaml-manager.ts（YAML高度操作）
- yaml-utils.ts（YAML基本操作）
- context-compressor.ts（コンテキスト圧縮）
- file-size-monitor.ts（ファイルサイズ監視）

### data/ディレクトリの構造と内容
- config/（システム設定）
- current/（ホットデータ）
- learning/（ウォームデータ）
- archives/（コールドデータ）

## 調査内容

### 1. 実装状況確認
各ファイル・ディレクトリについて以下を確認：
- ファイルの存在有無
- 実装の完成度（0-100%）
- 主要機能の実装状況
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- 階層型データ管理（3層構造）（REQUIREMENTS.md 45-50行目）
- YAML駆動開発（REQUIREMENTS.md 105-115行目）
- ディレクトリ・ファイル構造（REQUIREMENTS.md 212-232行目）
- ハルシネーション防止機構（REQUIREMENTS.md 234-263行目）

### 3. 詳細調査項目

#### データ階層構造の検証
- [ ] current/ディレクトリ：1MB・7日・20ファイル上限の遵守
- [ ] learning/ディレクトリ：10MB・90日上限の遵守
- [ ] archives/ディレクトリ：無制限・永続保存の実現
- [ ] 自動階層移動の実装状況

#### YAML管理機能
- [ ] yaml-manager.tsの高度操作機能
- [ ] yaml-utils.tsの基本操作機能
- [ ] 読み取り専用パス（data/config/）の制御
- [ ] 書き込み許可パスの制御

#### ファイル制限・監視
- [ ] file-size-monitor.tsのサイズ監視機能
- [ ] ファイル数制限の実装
- [ ] context-compressor.tsの圧縮機能

#### config/ディレクトリのYAMLファイル
- [ ] autonomous-config.yamlの存在と構造
- [ ] posting-times.yamlの存在と構造
- [ ] rss-sources.yamlの存在と構造
- [ ] brand-strategy.yamlの存在と構造

### 4. ハルシネーション防止の検証
- [ ] 許可された出力先の制御が実装されているか
- [ ] 読み取り専用パスの保護がされているか
- [ ] integrity-checker.tsの存在（実装予定）

### 5. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/data-management-implementation-status.yaml`

```yaml
data_management_status:
  yaml_management:
    yaml_manager_exists: true/false
    yaml_utils_exists: true/false
    completion_rate: 85  # パーセンテージ
    implemented_features:
      - 機能名: 実装状況説明
    missing_features:
      - 機能名: 理由
      
  data_hierarchy:
    current_compliance:
      size_limit: true/false  # 1MB
      duration_limit: true/false  # 7日
      file_count_limit: true/false  # 20ファイル
    learning_compliance:
      size_limit: true/false  # 10MB
      duration_limit: true/false  # 90日
    archives_compliance:
      unlimited: true/false
      persistent: true/false
    auto_migration_implemented: true/false
    
  file_monitoring:
    file_size_monitor_exists: true/false
    context_compressor_exists: true/false
    monitoring_effectiveness: 高/中/低
    
  config_files:
    autonomous_config: true/false
    posting_times: true/false
    rss_sources: true/false
    brand_strategy: true/false
    other_files:
      - ファイル名
      
  hallucination_prevention:
    path_control_implemented: true/false
    readonly_protection: true/false
    integrity_checker_planned: true/false
    
  overall_assessment:
    completion_rate: 75  # 全体の完成度
    requirements_compliance: 準拠/一部準拠/非準拠
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 6. 注意事項
- Worker権限で実行すること
- プロダクションコードの編集は禁止（読み取りのみ）
- データ階層の制限違反を特に重点的にチェック
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘
- 現在のファイル数やサイズを実際に確認