# 設定・データ構造実装状況調査指示書

## 調査対象
### YAML設定ファイル群
`data/config/`ディレクトリ配下：
- autonomous-config.yaml
- posting-times.yaml
- rss-sources.yaml
- brand-strategy.yaml
- その他の設定ファイル

`data/current/`ディレクトリ配下：
- account-status.yaml
- active-strategy.yaml
- today-posts.yaml
- weekly-summary.yaml
- その他のデータファイル

`data/learning/`ディレクトリ配下：
- post-insights.yaml
- engagement-patterns.yaml
- その他の学習データ

### その他の構造ファイル
- package.json
- tsconfig.json
- .gitignore
- その他の設定ファイル

## 調査内容

### 1. 実装状況確認
各ファイルについて以下を確認：
- ファイルの存在有無
- データ構造の適切性
- 各設定項目の完全性
- REQUIREMENTS.mdとの整合性

### 2. 必須参照
**必ず`REQUIREMENTS.md`を読み込み、以下の要件との整合性を確認すること**：
- YAML駆動開発（REQUIREMENTS.md 105-115行目）
- /dataディレクトリ構造（REQUIREMENTS.md 212-232行目）
- 許可された出力先（REQUIREMENTS.md 237-251行目）
- ハルシネーション防止の禁止事項（REQUIREMENTS.md 259-263行目）

### 3. 詳細調査項目

#### config/ディレクトリの設定ファイル
##### autonomous-config.yaml
- [ ] 自律実行の設定項目
- [ ] 意思決定パラメータ
- [ ] 実行間隔やタイミング設定

##### posting-times.yaml
- [ ] 1日15回の投稿時刻設定
- [ ] タイムゾーン設定
- [ ] 最適化ルール

##### rss-sources.yaml
- [ ] RSSフィードURLのリスト
- [ ] Google News検索クエリ設定
- [ ] 優先度やカテゴリ設定

##### brand-strategy.yaml
- [ ] ブランド戦略設定
- [ ] 投稿スタイル設定
- [ ] ターゲット設定

#### current/ディレクトリの状態データ
- [ ] ファイル数が20ファイル以下か
- [ ] 合計サイズが1MB以下か
- [ ] 7日以上古いデータがないか
- [ ] 各ファイルのデータ構造

#### learning/ディレクトリの学習データ
- [ ] 合計サイズが10MB以下か
- [ ] 90日以上古いデータがないか
- [ ] インサイト抽出データの品質

#### プロジェクト設定ファイル
- [ ] package.jsonのスクリプト定義
- [ ] 依存パッケージの適切性
- [ ] tsconfig.jsonの設定
- [ ] .gitignoreの適切性

### 4. 出力形式
調査結果を以下の形式でYAMLファイルに出力：
`tasks/outputs/config-data-structure-implementation-status.yaml`

```yaml
config_data_structure_status:
  config_directory:
    autonomous_config:
      exists: true/false
      structure_valid: true/false
      key_settings:
        - 設定項目: 値/状態
    posting_times:
      exists: true/false
      daily_posts_count: 15  # 1日15回設定されているか
    rss_sources:
      exists: true/false
      sources_count: 10
      google_news_queries: true/false
    brand_strategy:
      exists: true/false
      strategy_defined: true/false
    additional_files:
      - ファイル名: 目的
      
  current_directory:
    file_count: 5  # 現在のファイル数
    total_size_mb: 0.5  # 合計サイズ
    oldest_file_days: 3  # 最も古いファイルの経過日数
    compliance:
      file_limit: true/false  # 20ファイル以下
      size_limit: true/false  # 1MB以下
      duration_limit: true/false  # 7日以内
    files:
      - filename: ファイル名
        size_kb: サイズ
        age_days: 経過日数
        
  learning_directory:
    total_size_mb: 2.5
    oldest_file_days: 45
    compliance:
      size_limit: true/false  # 10MB以下
      duration_limit: true/false  # 90日以内
      
  project_configuration:
    package_json:
      scripts_defined:
        start: true/false
        dev: true/false
        other: [スクリプト名]
    tsconfig_valid: true/false
    gitignore_appropriate: true/false
    
  overall_assessment:
    structure_compliance: 完全/部分的/不適合
    data_hierarchy_status: 適切/要改善
    hallucination_risks:
      - リスク項目
    critical_issues:
      - 重要な問題点
    recommendations:
      - 推奨事項
```

### 5. 注意事項
- Worker権限で実行すること
- data/config/は読み取り専用（編集禁止）
- データ階層の制限違反を特に重点的にチェック
- REQUIREMENTS.mdを必ず参照し、要件との乖離を明確に指摘
- ファイルサイズやファイル数を実際に計測
- REQUIREMENTS.mdに記載のないファイルを特定