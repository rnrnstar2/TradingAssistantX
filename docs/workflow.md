# ワークフロー仕様書

## 概要

TradingAssistantXのメインワークフローは、Kaito API、Claude SDK、データ管理システムを統合した実行フローです。スケジュール実行時は3ステップ、手動実行時は4ステップで動作し、YAMLファイルで定義されたスケジュールに従って時刻ベースで自動実行されます。

> **📂 実装構造**: 詳細なディレクトリ構造は [directory-structure.md](directory-structure.md) を参照
> **🤖 Claude SDK仕様**: [claude.md](claude.md) を参照
> **🔐 Kaito API仕様**: [kaito-api.md](kaito-api.md) を参照

## メインワークフロー

### 実行フロー概要

#### スケジュール実行時（3ステップ）
```
1. データ収集 → 2. アクション実行（事前決定） → 3. 結果保存
```

#### 手動実行時（4ステップ）
```
1. データ収集 → 2. アクション決定（Claude） → 3. アクション実行 → 4. 結果保存
```

### Step 1: データ収集
**目的**: 現在のコンテキストを取得し、判断材料を準備

```typescript
// 実行内容
const twitterData = await kaitoClient.getAccountInfo();  // アカウント情報
const learningData = await dataManager.loadLearningData(); // 学習データ
const currentTime = new Date(); // 現在時刻
```

**収集データ**:
- Twitterアカウント状態（フォロワー数、投稿履歴）
- 過去の学習データ（decision-patterns.yaml）
- 現在時刻と前回実行からの経過時間

### Step 2: アクション決定（手動実行時のみ）
**目的**: Claude SDKを使用して最適なアクションを決定

```typescript
// 手動実行時のみ
const decision = await makeDecision({
  twitterData,
  learningData,
  currentTime
});
```

**決定可能アクション**:
- `post`: 新規投稿（教育コンテンツ）
- `retweet`: 関連ツイートのリツイート
- `quote_tweet`: 引用リツイート
- `like`: いいね
- `wait`: 待機（何もしない）

**注意**: スケジュール実行時はアクションが事前決定されているため、このステップは実行されません。

### Step 3: アクション実行
**目的**: 決定されたアクションをKaito API経由で実行

```typescript
switch (decision.action) {
  case 'post':
    const content = await generateContent(decision.parameters);
    await kaitoClient.createPost(content.text);
    break;
  case 'retweet':
    await kaitoClient.retweet(targetTweetId);
    break;
  // ... 他のアクション
}
```

**実行詳細**:
- **post**: Claude SDKでコンテンツ生成 → 投稿
- **retweet**: 指定IDまたは検索結果からリツイート
- **quote_tweet**: 引用コメント生成 → 引用RT
- **like**: 指定ツイートにいいね
- **wait**: ログ出力のみ

### Step 4: 結果保存
**目的**: 実行結果を履歴として保存

```typescript
await dataManager.saveResult({
  timestamp: new Date(),
  decision,
  result: executionResult,
  performance: analysisResult
});
```

**保存先**: `data/history/YYYY-MM/DD-HHMM/`
- `decision.yaml`: アクション決定内容
- `result.yaml`: 実行結果
- `analysis.yaml`: パフォーマンス分析

## スケジュール実行システム

### 時刻ベース実行
YAMLファイルで定義された時刻に自動的にワークフローを実行します。

### スケジュール設定（schedule.yaml）

```yaml
daily_schedule:
  - time: "07:00"
    action: "post"
    topic: "朝の投資教育"
  - time: "08:00"
    action: "retweet"
    target_query: "投資初心者 lang:ja"
  - time: "12:00"
    action: "post"
    topic: "市場動向解説"
  - time: "12:30"
    action: "like"
    target_query: "投資教育 高品質"
  - time: "18:00"
    action: "quote_tweet"
    target_query: "投資ニュース"
    topic: "専門家視点の解説"
  - time: "21:00"
    action: "post"
    topic: "明日の注目ポイント"
```

### 設定項目説明

#### スケジュール構造
- **フラット形式**: 時間帯区分なし、時刻リストによる設定
- **アクション決定不要**: スケジュール実行時はアクションが事前決定されているため、Claude判断ステップをスキップ

#### アクション別パラメータ
| アクション | 必須パラメータ | 用途 |
|-----------|---------------|------|
| post | topic | 投稿トピック指定 |
| retweet | target_query | 検索クエリ |
| quote_tweet | target_query, topic | 検索クエリと引用コメントトピック |
| like | target_query | 検索クエリ |

### スケジューラー動作仕様

```typescript
// src/scheduler/time-scheduler.ts
class TimeScheduler {
  // 1分間隔で時刻チェック
  while (running) {
    const currentTime = getCurrentTime("HH:MM");
    const taskToRun = findScheduledTask(currentTime);
    
    if (taskToRun) {
      await MainWorkflow.execute({
        scheduledAction: taskToRun.action,
        scheduledTopic: taskToRun.topic,
        scheduledQuery: taskToRun.target_query
      });
    }
    
    await sleep(60000); // 1分待機
  }
}
```

**特徴**:
- 1分精度での時刻チェック
- 実行時刻になると即座にワークフロー起動
- エラー時も継続動作（個別タスクの失敗でスケジューラーは停止しない）

## エントリーポイント

### 開発用: pnpm dev
**ファイル**: `src/dev.ts`
**用途**: 単一実行、即座にワークフローを1回実行して終了

```bash
pnpm dev
# → MainWorkflow.execute() → 終了
```

### 本番用: pnpm start
**ファイル**: `src/main.ts`  
**用途**: スケジュール実行、YAMLファイルに従って継続実行

```bash
pnpm start
# → TimeScheduler.start() → 継続実行
# Ctrl+C で終了
```

## 実行フロー図

### 手動実行（pnpm dev）
```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│ dev.ts  │ --> │ MainWorkflow │ --> │ 4ステップ   │ --> 終了
└─────────┘     │   .execute() │     │ 実行        │
                └──────────────┘     └─────────────┘
                                     │ Claude判断あり │
```

### スケジュール実行（pnpm start）
```
┌─────────┐     ┌───────────────┐     ┌──────────────┐
│ main.ts │ --> │TimeScheduler  │ --> │schedule.yaml │
└─────────┘     │   .start()    │     │ 読み込み     │
                └───────┬───────┘     └──────────────┘
                        │ 
                        ↓ 1分ごとにチェック
                ┌───────────────┐     ┌─────────────┐
                │ 時刻到達？    │ Yes │MainWorkflow │
                │               │ --> │  .execute() │
                └───────────────┘     └─────────────┘
                        ↓ No         │ 3ステップ   │
                    次の1分待機        │ 事前決定   │
```

## エラーハンドリング

### ワークフロー実行エラー
- 個別のワークフロー実行エラーはログ出力
- スケジューラーは継続動作
- 次の実行時刻を待機

### スケジューラーエラー
- YAMLファイル読み込みエラー → 起動失敗
- 致命的エラー → プロセス終了（exit code 1）

## 設定ファイル

### 必要な設定ファイル
- `data/config/schedule.yaml`: スケジュール設定（必須）
- `data/config/api-config.yaml`: API設定
- `data/config/system-config.yaml`: システム設定

### 環境変数
```bash
CLAUDE_API_KEY=your_api_key      # Claude API認証（必須）
TWITTER_USERNAME=your_username    # Twitter認証
TWITTER_PASSWORD=your_password    # Twitter認証
```

## パフォーマンス考慮事項

### API制限対応
- Kaito API: 15分あたり15リクエスト制限
- Claude API: 分あたりのトークン制限
- 適切な間隔での実行スケジュール設定が重要

### メモリ効率
- 単一ループでの時刻チェック
- 大量のタイマー生成を回避
- 実行結果の適切な保存とクリーンアップ

## 今後の拡張予定

### Phase 3以降
- 複数スケジュールパターンのサポート
- 曜日別スケジュール
- 動的スケジュール調整
- Webhookトリガー対応