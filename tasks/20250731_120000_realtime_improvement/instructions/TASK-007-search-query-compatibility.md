# TASK-007: TwitterAPI.io互換検索クエリへの修正

## 📋 タスク概要
TwitterAPI.ioでサポートされていない検索演算子を削除し、実際に動作する検索クエリに修正する。

## 🎯 問題分析

### 現在の問題
- `filter:news`, `filter:verified`, `filter:has_engagement` などのフィルターがサポートされていない
- `min_faves:`, `min_retweets:` などのエンゲージメントフィルターがサポートされていない
- `within_time:` の時間指定フィルターがサポートされていない

### TwitterAPI.ioの実際の仕様
TwitterAPI.ioの`/twitter/tweet/advanced_search`エンドポイントは、基本的なキーワード検索とOR演算子、言語指定のみをサポートしている模様。

## 📝 実装詳細

### 1. schedule.yamlの修正方針

#### 基本原則
- サポートされていない演算子をすべて削除
- キーワードとOR演算子のみで検索の精度を保つ
- 検索結果の品質はClaude AIの選択機能に委ねる

### 2. 具体的な修正例

```yaml
# 修正前
target_query: "日経平均 OR 円相場 OR 経済指標 within_time:12h min_retweets:10 filter:verified -filter:replies"

# 修正後（案1: シンプル版）
target_query: "日経平均 OR 円相場 OR 経済指標"

# 修正後（案2: 時事性を示すキーワード追加）
target_query: "日経平均 速報 OR 円相場 最新 OR 経済指標 発表"
```

### 3. schedule.yaml全体の修正内容

```yaml
# 朝の市場チェック（6:30）
target_query: "日経平均 OR 円相場 OR 経済指標 速報"

# 中央銀行ニュース（8:00）
target_query: "日銀 決定 OR FRB 発表 OR ECB 会合"

# 市場オープン（8:30）
target_query: "日経平均 寄り付き OR 先物 OR 為替"

# 経済指標（10:30）
target_query: "GDP 発表 OR CPI 発表 OR 雇用統計"

# 市場オープン（9:00）
target_query: "日経平均 OR ドル円 OR 米国株"

# 昼の投稿（12:00）
target_query: "投資 OR 株 OR 為替"

# ビジネストレンド（12:30）
target_query: "AI 投資 OR DX ビジネス OR ESG"

# 企業ニュース（13:30）
target_query: "決算発表 OR 業績予想 OR 企業"

# 市場まとめ（17:00）
target_query: "相場 まとめ OR 市場 総括"

# 投資ニュース（18:00）
target_query: "投資ニュース OR 市場分析"

# イベント情報（18:30）
target_query: "投資セミナー OR マネーセミナー"

# 市場ニュース（20:00）
target_query: "市場 まとめ OR 相場 総括 OR 投資"

# 明日の相場（20:30）
target_query: "明日の相場 OR 市場予想"

# 相場予想（21:00）
target_query: "相場 予想 OR 市場 展望"

# 投資振り返り（22:00）
target_query: "投資 振り返り OR 市場 反省"

# 米国市場（22:30）
target_query: "NYSE OR NASDAQ OR ダウ OR S&P500"
```

### 4. main-workflow.tsの検索戦略も修正

```typescript
// 複数の検索戦略を定義（修正版）
const searchStrategies = [
  // 最新の話題を広く取得（シンプルなキーワードのみ）
  `投資 OR 株 OR 為替`,
  
  // 市場関連の最新情報
  `日経平均 OR ドル円 OR 米国株`,
  
  // ニュース系キーワード
  `投資 速報 OR 市場 ニュース`,
  
  // 既存のtarget_queryも使用
  targetQuery
];
```

## 🚫 制約事項
- TwitterAPI.ioの仕様に準拠する
- 検索精度の低下は Claude AI選択で補う
- 基本的なキーワード検索のみ使用

## ✅ 実装確認事項
1. 各検索クエリで結果が取得できること
2. 検索結果が0件にならないこと
3. Claude AIが適切に選択できること

## 📊 代替案の検討
もしTwitterAPI.ioが実際により多くの演算子をサポートしている場合は、実際のAPIレスポンスを確認しながら段階的に演算子を追加することも検討。