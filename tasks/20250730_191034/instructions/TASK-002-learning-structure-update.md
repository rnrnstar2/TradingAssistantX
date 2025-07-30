# TASK-002: Learning構造2ファイル化実装

## 🎯 実装目標

引き継ぎ資料に基づき、学習データ管理を過剰に複雑だった4ファイル構成から「MVP最適化」の2ファイル構成に簡素化し、効率的な学習サイクルを構築する。

## 📋 現在の構造と変更内容

### 🔄 変更前（複雑構造・削除対象）
```
data/learning/
├── engagement-patterns.yaml
├── successful-topics.yaml
├── time-performance.yaml      # 🗑️ 削除対象
└── action-effectiveness.yaml  # 🗑️ 削除対象
```

### ✅ 変更後（MVP版・2ファイル構成）
```
data/learning/
├── engagement-patterns.yaml  # 時間帯・形式・パターン統合
└── successful-topics.yaml    # 投資教育特化トピック
```

### 🚨 削除理由
- **time-performance.yaml**: engagement-patterns.yaml内で時間帯分析をカバー（重複回避）
- **action-effectiveness.yaml**: MVPは投稿中心、複数アクション分析は将来機能

## 📊 新ファイル構造設計

### 1. engagement-patterns.yaml（統合版）

**統合する内容**:
- 時間帯別エンゲージメント（旧time-performance.yamlから）
- コンテンツ形式別パフォーマンス
- アクションパターン分析

```yaml
# 新構造
timeSlots:
  "07:00-10:00":
    successRate: 0.85
    avgEngagement: 4.2
    optimalTopics: ["朝の投資情報", "市場開始前準備"]
    sampleSize: 15
  "12:00-14:00":
    successRate: 0.72
    avgEngagement: 3.1
    optimalTopics: ["ランチタイム学習", "実践的テクニック"]
    sampleSize: 12
  "20:00-22:00":
    successRate: 0.91
    avgEngagement: 5.3
    optimalTopics: ["一日の振り返り", "明日への戦略"]
    sampleSize: 18

contentTypes:
  educational:
    successRate: 0.78
    avgEngagement: 2.8
    bestTimeSlots: ["07:00-10:00", "20:00-22:00"]
  market_commentary:
    successRate: 0.65
    avgEngagement: 2.1
    bestTimeSlots: ["12:00-14:00"]

actionPatterns:
  post:
    successRate: 0.82
    avgEngagement: 3.5
    optimalFrequency: "2-3 times per day"
  retweet:
    successRate: 0.71
    avgEngagement: 1.8
    optimalFrequency: "1-2 times per day"
  quote_tweet:
    successRate: 0.89
    avgEngagement: 4.7
    optimalFrequency: "1 time per day"

lastUpdated: "2025-07-30T19:10:34Z"
analysisVersion: "mvp_v1"
```

### 2. successful-topics.yaml（投資教育特化）

**内容**:
- 投資教育分野で成功したトピック
- エンゲージメント実績
- 最適な投稿時間帯

```yaml
# 新構造
topics:
  - topic: "NISA活用法"
    successRate: 0.91
    avgEngagement: 5.2
    bestTimeSlots: ["07:00-10:00", "20:00-22:00"]
    totalPosts: 8
    highEngagementPosts: 7
    keywords: ["NISA", "税制優遇", "長期投資"]
    lastSuccess: "2025-07-29T20:30:00Z"
  
  - topic: "投資信託選び方"
    successRate: 0.87
    avgEngagement: 4.8
    bestTimeSlots: ["12:00-14:00", "20:00-22:00"]
    totalPosts: 12
    highEngagementPosts: 10
    keywords: ["投資信託", "信託報酬", "分散投資"]
    lastSuccess: "2025-07-28T12:15:00Z"

  - topic: "リスク管理基礎"
    successRate: 0.83
    avgEngagement: 4.1
    bestTimeSlots: ["07:00-10:00"]
    totalPosts: 6
    highEngagementPosts: 5
    keywords: ["リスク管理", "ポートフォリオ", "資産配分"]
    lastSuccess: "2025-07-27T07:45:00Z"

metadata:
  totalTopics: 3
  averageSuccessRate: 0.87
  mostSuccessfulTimeSlot: "20:00-22:00"
  lastUpdated: "2025-07-30T19:10:34Z"
  analysisVersion: "mvp_v1"
```

## 🔧 実装作業内容

### Phase 1: 既存データ分析・マイグレーション

1. **既存4ファイルの内容確認**
   ```bash
   # 既存ファイルの構造確認
   ls -la data/learning/
   cat data/learning/*.yaml
   ```

2. **データ統合スクリプト作成**
   - time-performance.yamlからtimeSlots部分を抽出
   - action-effectiveness.yamlからactionPatterns部分を抽出
   - 重複データの除去・正規化

### Phase 2: 新構造ファイル作成

1. **engagement-patterns.yaml**
   - 時間帯分析統合
   - コンテンツタイプ別統計
   - アクションパターン分析

2. **successful-topics.yaml**
   - 投資教育特化トピック
   - エンゲージメント実績
   - 最適投稿時間

### Phase 3: DataManager適合

**TASK-001との連携**:
- DataManagerの学習データ読み込みメソッドを2ファイル構成に対応
- 新構造での保存・更新メソッド実装

### Phase 4: 削除・クリーンアップ

1. **不要ファイル削除**
   ```bash
   rm data/learning/time-performance.yaml
   rm data/learning/action-effectiveness.yaml
   ```

2. **バックアップ作成**
   ```bash
   mkdir -p data/archives/learning-migration-backup/
   cp data/learning/*.yaml data/archives/learning-migration-backup/
   ```

## 🎯 実装指針

### MVP制約遵守
- **2ファイル限定**: これ以上ファイルを増やさず、必要な情報は統合
- **シンプル構造**: 深いネスト構造を避け、1-2階層に留める
- **投資教育特化**: 汎用的な分析ではなく、投資教育コンテンツに特化

### データ品質
- **型安全性**: TypeScript interfaceで構造を定義
- **バリデーション**: YAML読み込み時の構造検証
- **デフォルト値**: ファイル不存在時の適切なフォールバック

### パフォーマンス
- **軽量ファイル**: 各ファイル10KB以下を目標
- **効率的更新**: 全体書き換えではなく、差分更新可能な構造
- **キャッシュ対応**: 頻繁な読み込みに対応

## 📁 影響するファイル

### 作成・修正対象
- `data/learning/engagement-patterns.yaml` - 新構造で作成
- `data/learning/successful-topics.yaml` - 新構造で作成
- `src/shared/data-manager.ts` - TASK-001で学習データ読み込み部分を修正

### 削除対象
- `data/learning/time-performance.yaml`
- `data/learning/action-effectiveness.yaml`

### 動作確認対象
- `src/workflows/main-workflow.ts` - 学習データ使用部分
- 深夜分析機能（将来実装時の参照構造）

## ⚠️ 重要な制約

### データ保全
- 既存の学習データを可能な限り新構造に移行
- 移行不可能なデータは適切にログ出力
- バックアップ作成による復旧可能性確保

### 統合時の考慮事項
- **時間帯重複**: 複数ファイルに同一時間帯データがある場合の統合ルール
- **信頼性**: サンプルサイズが十分なデータを優先
- **最新性**: より新しいデータを優先

## ✅ 完了基準

1. **新構造ファイル作成完了**: engagement-patterns.yaml, successful-topics.yamlが新構造で作成
2. **データ移行完了**: 既存4ファイルから有用なデータを2ファイルに統合
3. **不要ファイル削除完了**: time-performance.yaml, action-effectiveness.yamlの削除
4. **構造検証完了**: TypeScript interfaceでの型定義・バリデーション
5. **動作確認完了**: データ読み込み・更新・保存の一連の流れが正常動作
6. **バックアップ確保**: 移行前データのバックアップ作成

## 🔧 実装順序

1. **Phase 1**: 既存データ構造分析・バックアップ作成
2. **Phase 2**: 新構造TypeScript interface定義
3. **Phase 3**: データ移行スクリプト実装・実行
4. **Phase 4**: 新構造ファイル作成・データ投入
5. **Phase 5**: 不要ファイル削除・クリーンアップ
6. **Phase 6**: 動作テスト・品質確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_191034/reports/REPORT-002-learning-structure-update.md`に以下内容で報告書を作成：

1. **移行サマリー**: 統合したデータ量、削除したファイル数
2. **新構造詳細**: engagement-patterns.yaml, successful-topics.yamlの構造説明
3. **データ品質**: 移行前後のデータ比較、欠損・重複処理結果
4. **パフォーマンス**: ファイルサイズ、読み込み速度の改善状況
5. **今後の運用**: 学習データ更新時の注意点・ベストプラクティス

---

**🚨 CRITICAL**: この2ファイル化により、学習データの管理・理解・更新が大幅に簡素化され、MVP要件に最適化される。投資教育コンテンツの品質向上に直結する重要な基盤整備。