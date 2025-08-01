# TASK-011: リアルタイム情報発信対応（schedule.yaml調整）

## 🎯 タスク概要

投資教育コンテンツに加えて、リアルタイム性のある役立つ情報も発信できるよう、既存システムを活用してschedule.yamlを調整します。大きなコード変更なしで実現します。

## 📋 実装方針

### MVP原則遵守
- **既存機能活用**: reference-tweet-analyzerはそのまま使用
- **最小限の変更**: schedule.yamlの調整のみ
- **段階的拡張**: まず少数の時間帯から試験導入

### リアルタイム情報の定義
- **経済ニュース**: 市場動向、経済指標、金融政策
- **ビジネストレンド**: 業界動向、企業ニュース、テクノロジー
- **実用的情報**: 投資家に役立つツール、サービス、イベント情報

## 🔧 実装仕様

### 1. schedule.yaml調整箇所

#### 朝の時間帯（6:00-9:00）に経済ニュース追加
```yaml
  - time: "06:30"
    action: "retweet"
    target_query: "日経平均 OR 円相場 OR 経済指標 min_retweets:10 -filter:replies"
    # 市場動向・経済ニュースのリツイート

  - time: "08:00"
    action: "quote_tweet"
    target_query: "(日銀 OR FRB OR ECB) (決定 OR 会合 OR 発表) min_faves:50"
    topic: "金融政策の投資への影響"
    # 中央銀行関連ニュースに投資視点でコメント
```

#### 昼の時間帯（12:00-14:00）にビジネストレンド追加
```yaml
  - time: "12:30"
    action: "retweet"
    target_query: "(AI OR DX OR ESG) (投資 OR ビジネス) lang:ja min_retweets:20"
    # テクノロジー・ビジネストレンドのリツイート

  - time: "13:30"
    action: "quote_tweet"
    target_query: "決算発表 OR 業績予想 filter:news"
    topic: "注目企業の動向と投資機会"
    # 企業ニュースに投資視点を追加
```

#### 夜の時間帯（18:00-21:00）に実用的情報追加
```yaml
  - time: "18:30"
    action: "retweet"
    target_query: "(投資セミナー OR マネーセミナー) (無料 OR オンライン) -RT"
    # 投資家向けイベント情報のシェア

  - time: "20:00"
    action: "post"
    topic: "今日の市場ニュースまとめと明日の注目点"
    target_query: "市場 (まとめ OR 総括) today filter:verified"
    # 検証済みアカウントの市場まとめを参考に
```

### 2. Twitter Advanced Search活用

#### 高度な検索演算子の使用
```yaml
# 品質フィルター
min_retweets:10    # 最小リツイート数
min_faves:50       # 最小いいね数
filter:news        # ニュースソースのみ
filter:verified    # 認証アカウントのみ

# 除外フィルター
-filter:replies    # リプライを除外
-RT               # リツイートを除外
-"PR" -"広告"     # 宣伝を除外

# 言語・期間指定
lang:ja           # 日本語のみ
since:2025-01-30  # 特定日以降
```

### 3. reference-tweet-analyzerとの連携

#### topicContext調整例
```yaml
# 投資教育コンテンツの場合
topic: "投資の基礎知識"
target_query: "投資 初心者"

# リアルタイム情報の場合
topic: "市場ニュース解説"  # analyzerが投資関連性を評価
target_query: "日経平均 速報 filter:news"
```

### 4. 実装手順

1. **既存設定のバックアップ**
   ```bash
   cp data/config/schedule.yaml data/config/schedule.yaml.backup
   ```

2. **段階的導入**
   - まず3-5箇所の時間帯で試験導入
   - 効果測定後、徐々に拡大

3. **時間帯の選定基準**
   - 朝（6-9時）: 市場ニュース、経済指標
   - 昼（12-14時）: ビジネストレンド、企業ニュース
   - 夜（18-21時）: まとめ情報、イベント告知

4. **品質担保**
   - reference-tweet-analyzerが投資との関連性を評価
   - 高品質なソースを優先（verified、min_retweets使用）

## 📊 期待効果

### 情報発信の多様化
- 投資教育（70%）+ リアルタイム情報（30%）のバランス
- フォロワーへの価値提供の拡大
- エンゲージメント向上

### 既存機能との相乗効果
- reference-tweet-analyzerが品質を担保
- 深夜分析で効果測定可能
- 投資視点でのニュース解説で差別化

## ✅ 完成基準

1. **schedule.yaml更新**: 5-10箇所にリアルタイム情報クエリ追加
2. **検索クエリ最適化**: Advanced Search構文の活用
3. **バランス確保**: 投資教育とリアルタイム情報の適切な配分
4. **動作確認**: 新しいクエリでの検索・選択動作確認

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-011-realtime-content-integration.md`に記載：

1. **変更内容**: 追加・修正したschedule.yaml項目一覧
2. **クエリ設計**: 使用したAdvanced Search構文の説明
3. **期待効果**: 各時間帯での情報発信の狙い
4. **動作確認**: 新クエリでの検索結果サンプル
5. **次ステップ**: 効果測定と拡張計画

## 🚨 注意事項

- **既存バランス維持**: 投資教育コンテンツが主軸であることを忘れない
- **品質優先**: 単なるニュースボットにならないよう注意
- **段階的導入**: 一度に大幅変更せず、効果を見ながら調整
- **フィルター活用**: スパムや低品質コンテンツを確実に除外