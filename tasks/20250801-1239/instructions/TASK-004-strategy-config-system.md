# TASK-004: 戦略設定管理システム構築指示書

## 🎯 **ミッション概要**

`data/config/`に戦略設定管理システムを構築し、将来の方向性転換（初心者向け⇔エッジ重視など）を設定ファイル変更のみで実現可能にする。コードを変更せずに戦略プロファイルを切り替え可能な設定管理基盤を構築。

## 📋 **前提条件・制約**

### 必須確認ドキュメント
- **REQUIREMENTS.md** - システム要件（連携参考）
- **docs/claude.md** - Claude SDK仕様（連携参考）
- **docs/workflow.md** - ワークフロー仕様（連携参考）
- **data/config/schedule.yaml** - 現在のスケジュール設定（参考）

### Worker権限制約
- **実装対象**: `data/config/`配下への新規YAMLファイル作成
- **出力場所**: `data/config/`ディレクトリのみ
- **禁止事項**: src/ディレクトリ変更、既存設定ファイル変更

## 🎯 **戦略設定管理の設計思想**

### **現在の課題**
1. **戦略変更の複雑性**: ドキュメント修正→コード修正→テストの長い手順
2. **設定分散**: 戦略に関する設定が複数ファイル・コードに分散
3. **切り替えの困難**: 「初心者向け」⇔「エッジ重視」の戦略切り替えが困難

### **設計目標**
1. **設定ファイル変更のみ**: コード変更なしで戦略転換実現
2. **中央集権管理**: 戦略関連設定を`data/config/`で一元管理
3. **プロファイル切り替え**: 複数の戦略プロファイルを容易に切り替え可能
4. **バージョン管理**: 戦略設定のGit管理による変更履歴追跡

## 🚀 **4つの戦略設定ファイル設計**

### 1. **strategy-profile.yaml** - 戦略プロファイル定義
```yaml
# 戦略の全体的方向性を定義
current_profile: "edge_focused"  # または "beginner_friendly"

profiles:
  edge_focused:
    name: "エッジの効いた高付加価値戦略"
    description: "独自性・専門性・予測重視の差別化戦略"
    target_audience: ["beginners", "intermediate", "advanced", "finance_professionals"]
    risk_tolerance: "high"
    uniqueness_priority: "maximum"
    
  beginner_friendly:
    name: "初心者向け教育重視戦略"
    description: "安全性・理解しやすさ重視の教育戦略"
    target_audience: ["beginners", "intermediate"]
    risk_tolerance: "low"
    uniqueness_priority: "moderate"
    
  hybrid:
    name: "ハイブリッド戦略"
    description: "エッジと安全性のバランス型戦略"
    target_audience: ["beginners", "intermediate", "advanced"]
    risk_tolerance: "medium"
    uniqueness_priority: "high"
```

### 2. **content-parameters.yaml** - コンテンツ生成パラメータ
```yaml
# プロファイル別コンテンツ生成設定
content_strategies:
  edge_focused:
    tone: "専門的・挑戦的"
    complexity_level: "高"
    controversial_topics: true
    industry_insights: true
    market_predictions: true
    risk_warnings: true
    contrarian_views: true
    data_driven_analysis: true
    
  beginner_friendly:
    tone: "親しみやすい・教育的"
    complexity_level: "低"
    controversial_topics: false
    industry_insights: false
    market_predictions: false
    risk_warnings: true
    contrarian_views: false
    data_driven_analysis: false

# 時間帯別コンテンツ調整
time_based_adjustments:
  morning: "market_outlook"      # 市場展望
  midday: "realtime_analysis"    # リアルタイム分析
  evening: "daily_summary"       # 日次総括
  night: "deep_analysis"         # 深い分析
```

### 3. **selection-weights.yaml** - AI選択基準の重み設定
```yaml
# プロファイル別AI選択基準
selection_criteria:
  edge_focused:
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
      
  beginner_friendly:
    retweet:
      educational_value: 40   # 教育的価値
      engagement: 30          # エンゲージメント
      trustworthiness: 20     # 信頼性
      relevance: 10           # 関連性
    like:
      relationship: 90        # 関係構築可能性
      engagement: 10          # エンゲージメント
    follow:
      expertise: 40           # 専門性
      mutual_potential: 30    # 相互関係可能性
      influence: 20           # 影響力
      content_affinity: 10    # コンテンツ親和性

# 品質閾値設定
quality_thresholds:
  edge_focused:
    minimum_score: 7.0      # 最低品質スコア
    uniqueness_threshold: 8.0 # 独自性閾値
  beginner_friendly:
    minimum_score: 6.0
    uniqueness_threshold: 5.0
```

### 4. **edge-strategies.yaml** - エッジ戦略の具体的設定
```yaml
# 8つの差別化戦略の有効/無効と強度設定
edge_strategies:
  realtime_interpretation:
    enabled: true
    intensity: "high"        # high/medium/low
    topics: ["central_bank", "economic_indicators", "market_divergence"]
    
  contrarian_views:
    enabled: true
    intensity: "high"
    topics: ["media_skepticism", "consensus_questioning", "reverse_psychology"]
    
  data_driven_prediction:
    enabled: true
    intensity: "high"
    topics: ["statistical_analysis", "historical_comparison", "quantitative_forecast"]
    
  industry_insider:
    enabled: true
    intensity: "medium"
    topics: ["fund_manager_truth", "institutional_behavior", "industry_secrets"]
    
  risk_warnings:
    enabled: true
    intensity: "high"
    topics: ["scam_detection", "bubble_warning", "dangerous_investments"]
    
  unique_frameworks:
    enabled: true
    intensity: "medium"
    topics: ["original_analysis", "new_indicators", "custom_metrics"]
    
  behavioral_science:
    enabled: true
    intensity: "medium"
    topics: ["investment_psychology", "emotional_trading", "cognitive_bias"]
    
  prediction_verification:
    enabled: true
    intensity: "high"
    topics: ["forecast_accuracy", "failure_analysis", "learning_transparency"]

# プロファイル別戦略有効化
profile_strategies:
  edge_focused:
    active_strategies: ["all"]  # 全戦略有効
    
  beginner_friendly:
    active_strategies: ["risk_warnings", "behavioral_science"]  # 安全な戦略のみ
    
  hybrid:
    active_strategies: ["realtime_interpretation", "data_driven_prediction", "risk_warnings", "behavioral_science"]
```

## 📝 **具体的作業指示**

### **1. 4つの設定ファイル作成**
以下のファイルを`data/config/`に作成：
- `strategy-profile.yaml`
- `content-parameters.yaml`
- `selection-weights.yaml`
- `edge-strategies.yaml`

### **2. 各ファイルの詳細設計**

**strategy-profile.yaml**:
- 現在のプロファイル指定機能
- 3つのプロファイル定義（edge_focused, beginner_friendly, hybrid）
- 各プロファイルの基本パラメータ設定

**content-parameters.yaml**:
- プロファイル別コンテンツ生成方針
- 時間帯別調整設定
- トーン・複雑性レベル設定

**selection-weights.yaml**:
- アクション別選択基準の重み設定
- プロファイル別の判断基準変更
- 品質閾値の調整機能

**edge-strategies.yaml**:
- 8つの差別化戦略の個別制御
- 戦略強度設定（high/medium/low）
- プロファイル別戦略有効化設定

### **3. 設定例の充実**
各ファイルに以下を含める：
- 詳細なコメント・説明
- 複数のプロファイル設定例
- デフォルト値の明確化
- 将来の拡張性を考慮した構造

### **4. ドキュメント連携**
設定ファイルが以下のドキュメントと整合するよう設計：
- REQUIREMENTS.mdの戦略方針
- docs/claude.mdの判断基準
- docs/workflow.mdのアクション実行

## ✅ **作業完了基準**

### **必須達成項目**
1. ✅ 4つの戦略設定ファイルが`data/config/`に作成済み
2. ✅ 各ファイルが詳細なコメント・説明付きで完成
3. ✅ edge_focused/beginner_friendly/hybridの3プロファイル定義完了
4. ✅ 8つの差別化戦略の個別制御機能実装
5. ✅ アクション別選択基準の重み設定完了

### **品質確認**
- 設定ファイルの構造が論理的で拡張可能
- プロファイル切り替えが容易に実現可能
- 既存ドキュメント・システムとの整合性確保
- YAMLファイルの構文エラーなし

### **将来拡張性確保**
- 新しいプロファイル追加が容易
- 新しい戦略追加に対応可能
- パラメータ調整が直感的
- バージョン管理・ロールバック対応

## 📋 **報告書作成要件**

作業完了後、以下を含む報告書を作成：
- **設計概要**: 4つの設定ファイルの役割・連携
- **プロファイル説明**: 3つの戦略プロファイルの特徴・使い分け
- **拡張性**: 将来の戦略追加・修正の容易性
- **運用方法**: 戦略切り替えの具体的手順
- **課題・提案**: システム統合時の考慮事項

**報告書出力先**: `tasks/20250801-1239/reports/REPORT-004-strategy-config-system.md`

## 🔧 **システム統合への示唆**

この設定管理システムは将来的に以下のように統合される想定：
1. `src/shared/config.ts`で設定ファイル読み込み
2. Claude SDKが選択基準を動的に調整
3. ワークフローがプロファイルに応じて実行
4. 深夜分析で戦略効果測定・最適化

**注意**: 本タスクは設定ファイル作成のみ。システム統合は別途実装タスクで対応。