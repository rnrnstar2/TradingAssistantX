# TASK-005: MVP原則準拠・YAML設定統合指示書

## 🎯 **ミッション概要**

**YAGNI原則違反修正**: 4つのYAMLファイルを1つの`edge-strategy.yaml`に統合し、MVPに必要な最小限の設定のみ残す。プロファイル切り替え機能を削除し、エッジ重視戦略一本に特化したシンプル設計に修正。

## 📋 **前提条件・制約**

### Worker権限制約
- **実装対象**: `data/config/`配下のファイル操作
- **削除対象**: 以下4ファイルを削除
  - `strategy-profile.yaml`
  - `content-parameters.yaml` 
  - `selection-weights.yaml`
  - `edge-strategies.yaml`
- **作成対象**: `edge-strategy.yaml` 1ファイルのみ
- **出力場所**: `data/config/`ディレクトリのみ

## 🚨 **MVP原則違反の修正**

### **現在の問題点**
1. **過剰設計**: 4つのYAMLファイルはMVPには複雑すぎる
2. **不要機能**: プロファイル切り替え機能は現在不要
3. **YAGNI違反**: 将来の拡張性を考慮しすぎた設計

### **MVP正解設計**
1. **1ファイル**: `edge-strategy.yaml`のみ
2. **エッジ重視**: プロファイル切り替え機能削除
3. **必要最小限**: 本当に使う設定のみ

## 📝 **新設計: edge-strategy.yaml**

### **統合後の単一ファイル構成**
```yaml
# ============================================================================
# TradingAssistantX エッジ戦略設定（MVP版）
# 「初心者向け当たり障りない」→「エッジの効いた価値ある」戦略専用設定
# ============================================================================

# 基本戦略方針（固定：エッジ重視のみ）
strategy_mode: "edge_focused"
description: "独自性・専門性・予測重視の差別化戦略"

# ============================================================================
# Claude AI選択基準の重み設定
# ============================================================================
selection_weights:
  retweet:
    uniqueness: 50      # 独自性（%）
    expertise: 30       # 専門性  
    prediction_value: 15 # 予測・警告価値
    relevance: 5        # 関連性
    
  like:
    expertise: 70       # 専門性
    uniqueness: 20      # 独自性
    relationship: 10    # 関係構築可能性
    
  follow:
    industry_influence: 50  # 業界影響力
    unique_info_source: 30  # 独自情報源
    expertise_match: 15     # 専門性適合
    mutual_potential: 5     # 相互関係可能性

# ============================================================================
# 8つの差別化戦略（有効/無効制御）
# ============================================================================
edge_strategies:
  realtime_interpretation: true    # リアルタイム独自解釈
  contrarian_views: true           # 逆張り・反常識視点
  data_driven_prediction: true     # データドリブン予測
  industry_insider: true           # 業界内幕・本音暴露
  risk_warnings: true              # 実践的リスク警告
  unique_frameworks: true          # 独自フレームワーク
  behavioral_science: true         # 感情論への科学的反論
  prediction_verification: true    # 予測とその検証

# ============================================================================
# コンテンツ生成方針（シンプル版）
# ============================================================================
content_tone: "専門的・挑戦的"
complexity_level: "高"
controversial_topics: true
industry_insights: true
market_predictions: true
risk_warnings: true

# ============================================================================
# 品質閾値（必要最小限）
# ============================================================================
quality_thresholds:
  minimum_score: 7.0           # 最低品質スコア
  uniqueness_threshold: 8.0    # 独自性閾値
```

## ✅ **具体的作業指示**

### **1. 既存4ファイル削除**
以下のファイルを削除：
- `data/config/strategy-profile.yaml`
- `data/config/content-parameters.yaml`
- `data/config/selection-weights.yaml`
- `data/config/edge-strategies.yaml`

### **2. 新規ファイル作成**
`data/config/edge-strategy.yaml`を上記設計で作成

### **3. 設計原則**
- **最小限**: 本当に必要な設定のみ
- **シンプル**: 1ファイル完結
- **エッジ重視**: プロファイル切り替え機能なし
- **明確**: 詳細コメント付き

## ✅ **作業完了基準**

### **必須達成項目**
1. ✅ 既存4ファイルが削除済み
2. ✅ `edge-strategy.yaml` 1ファイルが作成済み
3. ✅ MVPに必要な設定のみ含まれている
4. ✅ プロファイル切り替え機能が削除済み
5. ✅ エッジ戦略のみに特化した設計

### **品質確認**
- YAMLファイルの構文エラーなし
- コメント・説明が充実
- 過剰設計要素が完全に除去
- 必要最小限の設定のみ

## 📋 **報告書作成要件**

作業完了後、以下を含む報告書を作成：
- **修正概要**: 4ファイル→1ファイル統合の経緯
- **MVP準拠**: 過剰設計の削除・シンプル化
- **機能削除**: プロファイル切り替え機能の削除理由
- **今後の方針**: 必要に応じた段階的拡張方針

**報告書出力先**: `tasks/20250801-1239/reports/REPORT-005-mvp-yaml-simplification.md`

## 🔧 **YAGNI原則の徹底**

**削除機能**:
- プロファイル切り替え（現在不要）
- 複雑な重み調整システム（過剰）
- 時間帯別コンテンツ調整（複雑すぎ）
- プロファイル別戦略有効化（不要）

**残存機能**:
- エッジ戦略の基本制御
- Claude AI選択基準の重み
- 8つの差別化戦略の有効/無効
- 基本的な品質閾値

**MVP価値**: シンプルで理解しやすく、確実に動作する最小限の設定システム