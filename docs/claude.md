# Claude Code SDK 仕様書

## 概要

Claude Code SDKを使用したアクション決定・コンテンツ生成・分析システム

> **📂 ディレクトリ構造**: 詳細な構造は [directory-structure.md](directory-structure.md) を参照

## アクション決定システム

### 判断形式
```typescript
interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;           // 判断理由
  parameters: {
    topic?: string;           // 投稿トピック
    searchQuery?: string;     // 検索クエリ
    content?: string;         // 生成内容
    targetTweetId?: string;   // 対象投稿
  };
  confidence: number;         // 確信度
}
```

### アクション種別

#### 1. 投稿 (post)
- **フロー**: トピック決定→内容生成→投稿実行
- **判断基準**: フォロワー状況、前回投稿からの時間、市場トレンド
- **内容生成**: Claude + 学習データ活用

#### 2. リツイート (retweet)  
- **フロー**: 検索クエリ生成→投稿検索→候補分析→RT実行
- **検索条件**: 投資教育関連、高エンゲージメント、信頼性
- **選択基準**: 教育価値、アカウント戦略適合性

#### 3. 引用リツイート (quote_tweet)
- **フロー**: 検索→Claude評価→引用価値判断→コメント生成→実行
- **評価観点**: 教育価値、追加価値、フォロワー有益性
- **コメント生成**: 独自視点・補足説明の追加

#### 4. いいね (like)
- **フロー**: 対象検索→品質評価→いいね実行
- **対象基準**: 高品質投資教育コンテンツ、戦略合致
- **頻度制御**: 適切な間隔でのいいね実行

#### 5. 待機 (wait)
- **条件**: 適切なアクションがない場合、実行完了
- **効果**: システムの正常終了

## エンドポイント別設計

### エンドポイント別設計の利点
- **🎯 明確な責任分離**: 各エンドポイント = 1つの役割（判断・生成・分析・検索）
- **📊 型安全**: エンドポイントごとの専用入力/出力型で確実な連携
- **🔧 使いやすさ**: どのファイルがどの返却型かが明確、直感的な使用
- **🏗️ 一貫性**: kaito-apiと同様のendpoints/構造で統一感
- **🚀 拡張性**: 新機能 = 新エンドポイント追加のみ、既存に影響なし
- **📋 保守性**: プロンプト・変数・返却型が1ファイルで完結管理
- **🔄 明確なデータフロー**: Kaito API → 特定エンドポイント → 固定型返却 → 分岐

## main.tsでのエンドポイント別使用例

### 手動実行時（4ステップ）

```typescript
// main.ts - 手動実行時のエンドポイント使用
import { makeDecision, generateContent, analyzePerformance, generateSearchQuery } from './claude';
import type { ClaudeDecision, GeneratedContent, AnalysisResult } from './claude/types';

// 手動実行メインワークフロー - 全エンドポイント使用
async function executeWorkflow() {
  // 1. Kaito APIでデータ取得
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. 判断エンドポイント使用（手動実行時のみ）
  const decision: ClaudeDecision = await makeDecision({
    twitterData,
    learningData,
    currentTime: new Date()
  });
  
  // 3. 固定型に基づく分岐処理 - 各エンドポイント使用（手動実行時）
  switch (decision.action) {
    case 'post':
      const content: GeneratedContent = await generateContent({
        topic: decision.parameters.topic,
        style: 'educational',
        targetAudience: 'investors'
      });
      await kaitoAPI.createPost(content.text);
      break;
      
    case 'retweet':
      const searchQuery = await generateSearchQuery({
        topic: decision.parameters.topic,
        intent: 'find_educational_content'
      });
      const candidates = await kaitoAPI.searchTweets(searchQuery.query);
      await kaitoAPI.retweet(candidates[0].id);
      break;
      
    case 'like':
      await kaitoAPI.likeTweet(decision.parameters.targetTweetId);
      break;
  }
  
  // 4. 分析エンドポイント使用
  const analysis: AnalysisResult = await analyzePerformance({
    decision,
    result,
    context: twitterData
  });
  
  await dataManager.saveResult({ decision, result: analysis });
  return { success: true, duration: Date.now() - startTime };
}
```

### スケジュール実行時（3ステップ）

```typescript
// main.ts - スケジュール実行時のエンドポイント使用
import { generateContent, analyzePerformance, generateSearchQuery } from './claude';
import type { GeneratedContent, AnalysisResult } from './claude/types';
// 注意: makeDecisionはスケジュール実行時は使用しない

// スケジュール実行メインワークフロー - makeDecisionスキップ
async function executeScheduledWorkflow(scheduledAction: ScheduledAction) {
  // 1. Kaito APIでデータ取得
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. アクション決定スキップ（事前決定済み）
  // makeDecisionエンドポイントは使用しない
  
  // 3. 事前決定されたアクションに基づく処理
  switch (scheduledAction.action) {
    case 'post':
      const content: GeneratedContent = await generateContent({
        topic: scheduledAction.topic,
        style: 'educational',
        targetAudience: 'investors'
      });
      await kaitoAPI.createPost(content.text);
      break;
      
    case 'retweet':
      const searchQuery = await generateSearchQuery({
        topic: scheduledAction.topic,
        intent: 'find_educational_content'
      });
      const candidates = await kaitoAPI.searchTweets(searchQuery.query);
      await kaitoAPI.retweet(candidates[0].id);
      break;
      
    case 'like':
      await kaitoAPI.likeTweet(scheduledAction.targetTweetId);
      break;
  }
  
  // 4. 分析エンドポイント使用
  const analysis: AnalysisResult = await analyzePerformance({
    scheduledAction, // decisionの代わりにscheduledAction使用
    result,
    context: twitterData
  });
  
  await dataManager.saveResult({ scheduledAction, result: analysis });
  return { success: true, duration: Date.now() - startTime };
}
```

## エンドポイント別設計要件

- **コマンド実行**: システムの基本動作
- **エンドポイント別Claude処理**: 役割ごとに特化したプロンプト+変数でClaude呼び出し
- **専用型返却**: 各エンドポイントの専用返却型での確実な結果返却
- **明確な責任分離**: 判断・生成・分析・検索の4エンドポイントで役割分離
- **データフロー重視**: Kaito API → 特定エンドポイント → 専用型返却 → 分岐処理
- **実行モード対応**: スケジュール実行時はmakeDecisionエンドポイント使用せず、3ステップで動作

## 単体テスト仕様

### エンドポイント単体テスト要件

#### 1. decision-endpoint.test.ts
- **正常系テスト**: 各アクション（post, retweet, quote_tweet, like, wait）の判断結果検証
- **入力検証**: TwitterData, LearningData, 時刻データの組み合わせテスト
- **型安全性**: ClaudeDecision型の返却値検証
- **エラーハンドリング**: Claude API失敗時の適切なエラー処理テスト

#### 2. content-endpoint.test.ts
- **コンテンツ生成テスト**: トピック別の教育的コンテンツ生成検証
- **スタイル検証**: educational, professional等の文体制御テスト
- **文字数制限**: Twitter投稿文字数制限（280文字）遵守検証
- **型安全性**: GeneratedContent型の返却値検証

#### 3. analysis-endpoint.test.ts  
- **分析機能テスト**: 投稿パフォーマンス分析結果検証
- **メトリクス計算**: エンゲージメント率、フォロワー増減等の計算精度
- **トレンド分析**: 市場動向分析の妥当性検証
- **型安全性**: AnalysisResult型の返却値検証

#### 4. search-endpoint.test.ts
- **検索クエリ生成**: 投資教育関連クエリの品質検証
- **フィルター条件**: 高エンゲージメント、信頼性フィルター検証
- **クエリ最適化**: 検索効率とヒット率のバランステスト
- **型安全性**: SearchQuery型の返却値検証

### テスト実行要件
- **フレームワーク**: Jest + TypeScript
- **カバレッジ**: 各エンドポイント90%以上
- **モッキング**: Claude API呼び出しは完全モック化
- **実APIテスト制御**: テストはAPIトークン設定時に実行
- **並列実行**: テスト間の独立性保証で並列実行対応

### テスト品質基準
- **型安全性**: 全テストでstrict TypeScript使用
- **エラーカバレッジ**: 正常系・異常系両方のテストケース
- **境界値テスト**: 入力値の境界条件テスト
- **統合性**: エンドポイント間の連携動作検証

## 制約事項

### エンドポイント別設計制限
- **🚫 過剰複雑化禁止**: エンドポイント内での不要な抽象化は実装しない
- **✅ 役割明確化重視**: 1エンドポイント = 1つの明確な役割のみ
- **📏 適切な分離**: src/claude/endpoints 4ファイル、役割別に適切に分離
- **📊 型安全最優先**: エンドポイントごとの専用入力/出力型で確実な連携
- **🎯 使うコードのみ**: MVPで実際に使用するエンドポイントのみ実装
- **🔧 kaito-api一貫性**: 同様のendpoints/構造で設計統一