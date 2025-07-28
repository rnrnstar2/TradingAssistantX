# TASK-002: アーカイブデータ分析と学習データ抽出

## 🎯 担当領域
`data/archives/` 内の既存データから学習価値のある情報を抽出

## 📝 実行手順

### 1. アーカイブデータ調査
- `data/archives/actions/` の投稿履歴分析
- `data/archives/analysis/` のアカウント分析データ確認
- `data/archives/decisions/` の意思決定パターン抽出

### 2. 成功パターン抽出
以下の観点でデータを分析:

#### 投稿パフォーマンス分析
```bash
# 分析対象ファイル例
data/archives/actions/daily-action-data-*.yaml
```

抽出項目:
- エンゲージメント率3%以上の投稿
- リツイート数・いいね数の高い投稿
- フォロワー増加に寄与した投稿

#### コンテンツパターン分析
- 成功した投稿の共通構造
- 効果的だったトピック
- 最適な投稿時間帯

### 3. データ変換・統合

#### success-patterns.yaml への統合
```yaml
patterns:
  content_structures:
    - type: "educational_format"
      pattern: "[抽出されたパターン]"
      success_rate: [計算値]
      sample_posts: 
        - post_id: "[ID]"
          engagement_rate: [%]
          content_summary: "[要約]"
```

#### high-engagement.yaml への統合
```yaml
high_performing_posts:
  posts:
    - post_id: "[ID]"
      engagement_rate: [%]
      likes: [数値]
      retweets: [数値]
      content_type: "[タイプ]"
      topic: "[トピック]"
      timestamp: "[投稿時刻]"
```

#### effective-topics.yaml への統合
```yaml
topic_categories:
  [カテゴリ]:
    effectiveness_score: [計算値]
    sample_count: [サンプル数]
    avg_engagement: [平均エンゲージメント]
```

### 4. データ品質確保
- 重複データの除去
- 無効・不正データの除外
- 統計的有意性の確認

## 🔍 分析基準

### エンゲージメント閾値
- 高エンゲージメント: 3%以上
- 中エンゲージメント: 1.5%以上
- 効果的投稿: 平均を20%以上上回る

### 抽出優先度
1. 定量データのある投稿
2. 明確な成功指標を持つパターン
3. 再現性の高い要素

## ✅ 完了確認
- [ ] アーカイブデータの網羅的分析完了
- [ ] 成功パターンの定量化完了
- [ ] 3つのYAMLファイルへの統合完了
- [ ] データ品質・整合性チェック完了

## 📊 出力成果物
- 分析レポート（学習データ抽出結果）
- 更新された learning/ 配下の3ファイル
- データ品質レポート