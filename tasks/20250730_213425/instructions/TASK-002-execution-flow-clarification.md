# 深夜分析実行フロー明確化指示書

## タスク概要
docs/deep-night-analysis.mdの実行フローセクションを大幅に改善し、通常ワークフローとの関係性、実装方法を明確に記述する。

## 修正対象ファイル
- docs/deep-night-analysis.md（実行フローセクション）

## 修正項目

### 1. 実行フロー全体像の再構成

#### 追加すべき内容

**通常ワークフロー（全時間帯共通）**
```
Step 1: データ収集
Step 2: アクション実行（post/retweet/like等）
Step 3: 結果保存
```

**23:55特別処理**
```
Step 1-3: 通常ワークフロー実行
追加ステップ: 深夜分析実行
```

### 2. 実装フローの詳細化

#### main-workflow.tsでの実装方法
```typescript
// 通常のワークフロー実行（全時間帯共通）
await this.collectData();
await this.executeAction();
await this.saveResults();

// 23:55のみ追加実行
if (timeString === '23:55') {
  console.log('🌙 深夜分析開始');
  await this.executeDeepNightAnalysis(executionId);
}
```

### 3. データフローの可視化

#### 修正内容
以下の流れを図解で表現：

```
23:55実行の全体フロー：

1. 通常ワークフロー（3ステップ）
   ├─ データ収集
   ├─ アクション実行（schedule.yamlで定義）
   └─ 結果保存

2. 深夜分析（追加ステップ）
   ├─ 分析データ収集
   │   ├─ 最新50件の投稿メトリクス更新
   │   └─ 1日分の実行データ集計
   ├─ Claude分析実行（3種類）
   │   ├─ performance分析
   │   ├─ market分析
   │   └─ strategy分析
   └─ 戦略ファイル生成
       ├─ strategy-analysis.yaml（当日分析）
       └─ learning/配下の累積更新
```

### 4. 実装メソッドの整理

#### 削除すべき内容
- executeAnalyzeAction()への言及（使用されない）

#### 明確化すべき内容
- executeDeepNightAnalysis()が通常ワークフロー完了後に呼ばれる
- updatePostEngagementMetrics()がKaitoAPIのgetTweetsByIdsを使用
- 3種類の分析がそれぞれ独立して実行される

### 5. エラーハンドリングの明確化

#### 修正内容
- 深夜分析のエラーは通常ワークフローに影響しない
- 分析失敗時もワークフロー自体は成功扱い
- フォールバック戦略の詳細記述

## 実装要件

### 図表の追加
- 実行フロー図（ASCII図）の追加
- データフロー図の追加
- タイミングチャートの追加

### コード例の追加
- main-workflow.tsでの実装例
- エラーハンドリング例
- ログ出力例

### 整合性確認
- docs/workflow.mdとの一致確認
- 実装状況（未実装）の明記
- MVP版としての現実的な仕様