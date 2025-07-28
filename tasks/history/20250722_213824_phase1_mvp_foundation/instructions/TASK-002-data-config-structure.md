# TASK-002: data/config構造完全実装

## 🎯 目標
REQUIREMENTS.mdで定義されたdata/config/構造を完全実装し、システム設定の中央管理体制を確立する。

## 📋 作業内容

### 1. data/config/ディレクトリ構造確認・最適化
**対象ファイル**:
- `data/config/autonomous-config.yaml`
- `data/config/posting-times.yaml`
- `data/config/rss-sources.yaml`
- `data/config/source-credentials.yaml.template`（テンプレートファイル）

### 2. autonomous-config.yaml実装
**設定内容**:
```yaml
system:
  name: "TradingAssistantX"
  version: "1.0.0"
  mode: "production"

execution:
  daily_posts_limit: 15
  retry_attempts: 3
  timeout_seconds: 30

data_management:
  auto_cleanup: true
  retention_days: 30
  archive_strategy: "monthly"

logging:
  level: "info"
  format: "yaml"
```

### 3. posting-times.yaml実装
**投稿時間設定**:
```yaml
# 1日15回の最適投稿時間
optimal_times:
  morning:
    - "07:00"
    - "07:30"
    - "08:00"
  midday:
    - "12:00"
    - "12:30"
  afternoon:
    - "15:00"
    - "15:30"
  evening:
    - "18:00"
    - "18:30"
    - "19:00"
  night:
    - "21:00"
    - "21:30"
    - "22:00"
    - "22:30"
    - "23:00"

timezone: "Asia/Tokyo"
auto_schedule: true
```

### 4. rss-sources.yaml完全実装
**RSSソース設定**:
```yaml
sources:
  financial_major:
    - name: "Bloomberg Japan"
      url: "https://feeds.bloomberg.com/markets/news.rss"
      priority: 1
      category: "market"
      enabled: true
      
    - name: "Yahoo Finance Japan"
      url: "https://finance.yahoo.co.jp/rss"
      priority: 2
      category: "general"
      enabled: true

  educational:
    - name: "Motley Fool Japan"
      url: "https://www.fool.co.jp/rss/"
      priority: 3
      category: "education"
      enabled: true

collection_settings:
  max_items_per_source: 10
  update_interval_minutes: 30
  timeout_seconds: 15
```

### 5. YAMLファイル検証・最適化
- YAML構文正確性チェック
- データ構造の一貫性確保
- コメント追加による可読性向上
- 将来の設定追加を考慮した拡張性

## 🚫 MVP制約事項
- 複雑な条件分岐設定は避ける
- 統計・分析関連の設定は含めない
- パフォーマンス測定設定は最小限
- 過度な設定項目の追加は禁止

## 📁 関連ファイル
**実装対象**:
- `data/config/autonomous-config.yaml`
- `data/config/posting-times.yaml`
- `data/config/rss-sources.yaml`
- `data/config/source-credentials.yaml.template`

**読み込み側実装**:
- `src/utils/yaml-manager.ts`
- `src/utils/config-manager.ts`

## ✅ 完了判定基準
1. 全YAMLファイルの構文正確性確認
2. REQUIREMENTS.mdの構造仕様完全準拠
3. yaml-manager.tsでの読み込みテスト成功
4. 設定値の妥当性検証完了
5. テンプレートファイルの適切な配置

## 📋 報告書作成要件
完了後、以下を含む報告書を作成：
- 実装した設定ファイルの詳細
- YAML構文検証結果
- 各設定項目の説明
- 拡張性確保のための設計判断

**報告書パス**: `tasks/20250722_213824_phase1_mvp_foundation/reports/REPORT-002-data-config-structure.md`

## 🔗 他タスクとの関係
- **並列実行可能**: TASK-001（RSS Collector）、TASK-003（X Poster）、TASK-004（Core Scripts）
- **前提条件**: なし（独立実装可能）
- **後続タスク**: 全タスクがこの設定ファイルを参照