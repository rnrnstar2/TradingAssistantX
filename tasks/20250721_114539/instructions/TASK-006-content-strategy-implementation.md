# TASK-006: content-strategy.yaml実装

## 🎯 目的
巨大な`account-strategy.yaml`からコンテンツ関連部分を抽出し、`content-patterns.yaml`と統合して新しい`content-strategy.yaml`を作成する。

## 📋 前提条件
**必須**: TASK-004の完了

## 🔍 入力ファイル
設計書を必ず読み込んで実装に反映：
- `tasks/20250721_114539/outputs/TASK-004-new-structure-design.yaml`
- `tasks/20250721_114539/outputs/TASK-004-implementation-guide.md`

## 🏗️ 実装内容

### 1. バックアップ作成
既存ファイルの安全なバックアップ：

```bash
# 関連ファイルのバックアップ
cp data/account-strategy.yaml tasks/20250721_114539/outputs/backup/
cp data/content-patterns.yaml tasks/20250721_114539/outputs/backup/
```

### 2. コンテンツ関連セクション抽出
`account-strategy.yaml`（442行）からコンテンツ関連のみ抽出：

#### 抽出対象セクション
- `contentStrategy` (themes, toneOfVoice, postingFrequency, optimalTimes, avoidTopics等)
- `contentTemplates` (claude_templates, post_templates, posting_strategy)
- `targetAudience` (demographics, interests, painPoints等)
- `engagementTactics`関連

#### 除外セクション（他ファイルまたは削除）
- `objectives` → system-config.yamlまたは削除
- `systemConfig` → system-config.yaml
- `constraints.discoveryQuality` → 統計機能のため削除
- `growthTactics.testing` → 分析機能のため削除

### 3. content-strategy.yaml作成
設計書の仕様に従って新ファイル作成：

#### 基本構造
```yaml
# Content Strategy Configuration
# 統合: account-strategy.yaml(コンテンツ部分) + content-patterns.yaml
version: "1.0.0"
lastUpdated: [timestamp]

content_themes:
  # content-patterns.yamlとaccount-strategy.yamlのthemesを統合
  primary:
    - リスク管理
    - 市場分析
    - 投資心理
    - 基礎知識
  educational_patterns:
    - "リスク管理の基本原則"
    - "市場分析手法の解説"
  engagement_patterns:
    - "質問投げかけ型"
    - "経験共有型"

posting_strategy:
  # account-strategy.yamlから抽出・簡素化
  frequency: 15
  optimal_times: [...]  # 15個の時間帯
  tone_of_voice: "教育的で親しみやすい"
  avoid_topics: [...]  # 禁止トピック

content_templates:
  # account-strategy.yamlのpost_templatesから必要分のみ
  - type: "market-update"
    format: "..."
    priority: "high"
  - type: "quick-trade-tips"
    format: "..."
    priority: "high"
  # ... 重要度の高いテンプレートのみ（10個以下）

target_audience:
  # account-strategy.yamlから抽出
  demographics: [...]
  interests: [...]
  pain_points: [...]

engagement_tactics:
  # account-strategy.yamlから抽出・簡素化
  primary: [...]
  content_focus: [...]
```

### 4. MVP制約による簡素化
巨大ファイルから必要最小限のみ抽出：

- **投稿テンプレート**: 12個 → 8個以下に削減
- **詳細設定**: 複雑な時間帯設定を簡素化
- **分析機能**: 削除（discoveryParams等）
- **テスト機能**: 削除（testing関連）

### 5. データ整合性確認
```bash
# YAML構文チェック
python -c "import yaml; yaml.safe_load(open('data/content-strategy.yaml'))" || echo "YAML構文エラー"

# 型チェック実行
npm run type-check 2>&1 | grep -i "content" || echo "型エラーなし"
```

## 📝 実装制約

### MVP原則遵守
- 現在使用中の機能のみ抽出
- 分析・統計機能は完全削除
- 将来の拡張性は一切考慮しない

### ファイルサイズ制限
- 100行以下を目標
- 複雑なネスト構造を避ける
- コメントによる明確な説明

### データ品質
- 重複の完全排除
- 論理的なグループ化
- 明確な命名規則

## 📊 出力ファイル

### メインファイル
**場所**: `data/content-strategy.yaml`

### 実装レポート
**場所**: `tasks/20250721_114539/outputs/`
**ファイル名**: `TASK-006-content-strategy-report.yaml`

レポート内容：
```yaml
implementation_report:
  created_file: "data/content-strategy.yaml"
  source_files:
    - "data/account-strategy.yaml" # 442行から抽出
    - "data/content-patterns.yaml" # 14行から統合
  extracted_sections:
    - "contentStrategy"
    - "contentTemplates"
    - "targetAudience"
    - "engagementTactics"
  deleted_sections:  # MVP違反機能
    - "discoveryParams"
    - "growthTactics.testing"
    - "constraints.discoveryQuality"
  reduction_stats:
    original_size: "442行"
    new_size: "[行数]"
    reduction_rate: "[削減率]%"
  validation:
    yaml_syntax: "valid"
    mvp_compliance: "verified"
    data_integrity: "verified"
```

## ✅ 完了基準
1. content-strategy.yaml作成完了
2. 必要セクションの完全抽出
3. MVP違反機能の完全削除
4. 100行以下の達成
5. YAML構文エラーなし
6. 型定義との整合性確認
7. 実装レポート作成完了

## 🔗 依存関係
**前提条件**: TASK-004完了必須
**並列実行**: TASK-005, TASK-007と同時実行可能
**後続**: TASK-008の入力データとして使用

---
**重要**: 442行の巨大ファイルから必要最小限の抽出が最重要目標。