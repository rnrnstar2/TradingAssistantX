# TASK-001: data/current/ ディレクトリ構造修正

## 🎯 実装目標

REQUIREMENTS.mdで定義された理想のdata/current/構造に向けて、現在の不整合を修正する。

## 📋 現状分析

### 現在の構造
```
data/current/
├── current-analysis.yaml    # アカウント分析データ
└── current-decisions.yaml   # 意思決定・投稿データ
```

### 理想の構造 (REQUIREMENTS.md定義)
```
data/current/
├── account-status.yaml      # アカウント状態
├── active-strategy.yaml     # アクティブな戦略  
└── today-posts.yaml         # 本日の投稿記録
```

## 🚀 実装タスク

### 1. account-status.yaml 作成
- **元ファイル**: `current-analysis.yaml`
- **変換内容**: 
  - ファイル名を `account-status.yaml` に変更
  - 構造は基本的に維持（フォロワー数、エンゲージメント、パフォーマンス、健康状態）
  - REQUIREMENTS.mdの仕様に合わせてキー名を調整

### 2. active-strategy.yaml 作成  
- **元ファイル**: `current-decisions.yaml`の戦略データ部分
- **抽出データ**:
  - `strategy`: claude_autonomous_strategies
  - `autonomousMode`: true
  - `context`情報
- **構造**: アクティブな戦略設定を明確に記述

### 3. today-posts.yaml 作成
- **元ファイル**: `current-decisions.yaml`の投稿データ部分  
- **抽出データ**:
  - `actionDecisions`の投稿内容
  - `actionBreakdown`の投稿統計
  - 本日の投稿実績・予定
- **構造**: 本日の投稿記録を明確に記述

### 4. 古いファイルの削除
- `current-analysis.yaml` 削除
- `current-decisions.yaml` 削除

## 📊 データ変換マッピング

### current-analysis.yaml → account-status.yaml
```yaml
# 基本構造維持、キー名をREQUIREMENTS仕様に合わせて調整
timestamp: (そのまま)
followers: (そのまま)
engagement: (そのまま) 
performance: (そのまま)
health: (そのまま)
```

### current-decisions.yaml → active-strategy.yaml
```yaml
strategy_name: claude_autonomous_strategies
autonomous_mode: true
account_health: 75
market_opportunities: 1
last_updated: (timestamp)
context:
  accountHealth: 75
  marketOpportunities: 1
  actionSuggestions: 1
```

### current-decisions.yaml → today-posts.yaml
```yaml
date: "2025-07-21"
posts:
  - id: posting-only-1753101866515-main
    type: original_post
    content: "投稿内容"
    hashtags: ["#投資", "#資産形成", "#長期投資"]
    time_of_day: 21
    status: planned
statistics:
  original_post: 1
  quote_tweet: 0
  retweet: 0
  reply: 0
  total: 1
```

## ✅ 完了基準

1. ✅ account-status.yaml が正しく作成されている
2. ✅ active-strategy.yaml に戦略データが正しく抽出されている  
3. ✅ today-posts.yaml に投稿データが正しく抽出されている
4. ✅ 古いファイル（current-analysis.yaml, current-decisions.yaml）が削除されている
5. ✅ 新しい構造がREQUIREMENTS.mdの仕様と一致している

## 🚫 制約事項

### MVP原則遵守
- **最小限実装**: 必要最小限の機能のみ実装
- **過剰実装禁止**: 統計・分析機能の追加は禁止
- **シンプル維持**: 複雑なロジックを避け、データ変換に集中

### 品質基準
- **YAML形式**: 正しいYAML構文で出力
- **データ整合性**: 変換時にデータロス・破損がないこと
- **構造一貫性**: REQUIREMENTS.mdの定義と一致すること

### 出力管理
- **出力場所**: `data/current/` のみ
- **一時ファイル禁止**: ルートディレクトリへの出力は絶対禁止
- **命名規則**: REQUIREMENTS.mdで定義された正確なファイル名

## 🔧 実装手順

1. **現在ファイル読み込み**: current-analysis.yaml, current-decisions.yaml
2. **データ解析**: 各ファイルの構造とデータ内容を理解
3. **変換実装**: マッピング定義に基づいてデータ変換
4. **新ファイル作成**: account-status.yaml, active-strategy.yaml, today-posts.yaml  
5. **古ファイル削除**: current-analysis.yaml, current-decisions.yaml
6. **検証**: 新構造がREQUIREMENTS仕様と一致することを確認

## 📋 報告書作成

実装完了後、以下の報告書を作成してください：
**報告書パス**: `tasks/20250722_205046/reports/REPORT-001-data-current-structure-fix.md`

### 報告書内容
- 実装内容の詳細
- 変換したデータの概要  
- 完了基準の達成状況
- 発生した問題と解決方法
- 今後の改善提案（あれば）

---
**実装者**: Worker
**優先度**: 高
**想定工数**: 30-45分
**依存関係**: なし（単独実行可能）