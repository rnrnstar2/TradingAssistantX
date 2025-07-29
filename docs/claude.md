# Claude Code SDK 仕様書

## 概要

Claude Code SDKを使用したコンテンツ生成・分析・検索システム

> **📂 ディレクトリ構造**: 詳細な構造は [directory-structure.md](directory-structure.md) を参照

## アクション実行フロー

### YAMLベースのアクション管理
現在のシステムでは、アクションはYAMLファイルで事前に定義され、実行時の判断は不要になりました。

### アクション種別と実行フロー

#### 1. 投稿 (post)
- **フロー**: YAMLトピック取得→関連情報検索→内容生成→投稿実行
- **検索活用**: トピックに関連した最新の市場情報・トレンドを検索
- **内容生成**: 検索結果 + Claude + 学習データを統合して価値の高いコンテンツ生成
- **エンドポイント**: `generateSearchQuery()` → `generateContent()`を使用

#### 2. リツイート (retweet)  
- **フロー**: 検索クエリ生成→投稿検索→候補分析→RT実行
- **検索条件**: 投資教育関連、高エンゲージメント、信頼性
- **エンドポイント**: `generateSearchQuery()`を使用

#### 3. 引用リツイート (quote_tweet)
- **フロー**: 検索→候補選択→コメント生成→実行
- **コメント生成**: 独自視点・補足説明の追加
- **エンドポイント**: `generateQuoteComment()`を使用

#### 4. いいね (like)
- **フロー**: 対象検索→品質評価→いいね実行
- **対象基準**: 高品質投資教育コンテンツ、戦略合致
- **エンドポイント**: `generateSearchQuery()`を使用

#### 5. 待機 (wait)
- **条件**: スケジュールで定義されている場合
- **効果**: 処理をスキップして次の時刻まで待機

## エンドポイント別設計

### エンドポイント別設計の利点
- **🎯 明確な責任分離**: 各エンドポイント = 1つの役割（生成・分析・検索）
- **📊 型安全**: エンドポイントごとの専用入力/出力型で確実な連携
- **🔧 使いやすさ**: どのファイルがどの返却型かが明確、直感的な使用
- **🏗️ 一貫性**: kaito-apiと同様のendpoints/構造で統一感
- **🚀 拡張性**: 新機能 = 新エンドポイント追加のみ、既存に影響なし
- **📋 保守性**: プロンプト・変数・返却型が1ファイルで完結管理
- **🔄 明確なデータフロー**: Kaito API → 特定エンドポイント → 固定型返却 → 分岐

## main.tsでのエンドポイント別使用例

### dev実行時（3ステップ）

```typescript
// dev.ts - dev実行時のエンドポイント使用
import { generateContent, analyzePerformance, generateSearchQuery } from './claude';
import type { GeneratedContent, AnalysisResult } from './claude/types';
// 注意: makeDecisionはdev実行時も使用しない（YAMLから固定アクションを取得）

// dev実行メインワークフロー - makeDecisionスキップ版
async function executeWorkflow(fixedAction: FixedAction) {
  // 1. Kaito APIでデータ取得
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. アクション実行（事前決定済み）
  // makeDecisionエンドポイントは使用しない（YAMLから固定アクションを取得）
  
  // 事前決定されたアクションに基づく処理
  switch (fixedAction.action) {
    case 'post':
      // トピックに関連した情報を検索
      const searchQuery = await generateSearchQuery({
        purpose: 'trend_analysis',
        topic: fixedAction.topic,
        constraints: { maxResults: 5 }
      });
      const relatedInfo = await kaitoAPI.searchTweets(searchQuery.query);
      
      // 検索結果を含めてコンテンツ生成
      const content: GeneratedContent = await generateContent({
        request: {
          topic: fixedAction.topic,
          contentType: 'educational',
          targetAudience: 'intermediate'
        },
        context: { relatedTweets: relatedInfo, marketTrends: twitterData.trends }
      });
      await kaitoAPI.createPost(content.content);
      break;
      
    case 'retweet':
      const searchQuery = await generateSearchQuery({
        topic: fixedAction.topic,
        intent: 'find_educational_content'
      });
      const candidates = await kaitoAPI.searchTweets(searchQuery.query);
      await kaitoAPI.retweet(candidates[0].id);
      break;
      
    case 'like':
      await kaitoAPI.likeTweet(fixedAction.targetTweetId);
      break;
  }
  
  // 3. 結果保存・分析エンドポイント使用
  const analysis: AnalysisResult = await analyzePerformance({
    fixedAction, // decisionの代わりにfixedAction使用
    result,
    context: twitterData
  });
  
  await dataManager.saveResult({ fixedAction, result: analysis });
  return { success: true, duration: Date.now() - startTime };
}
```

### スケジュール実行時（3ステップ）

```typescript
// main.ts - スケジュール実行時のエンドポイント使用
import { generateContent, analyzePerformance, generateSearchQuery } from './claude';
import type { GeneratedContent, AnalysisResult } from './claude/types';
// 注意: makeDecisionはスケジュール実行時は使用しない（YAMLから時刻別事前決定アクションを取得）

// スケジュール実行メインワークフロー - makeDecisionスキップ
async function executeScheduledWorkflow(scheduledAction: ScheduledAction) {
  // 1. Kaito APIでデータ収集
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. アクション実行（事前決定済み）
  // makeDecisionエンドポイントは使用しない（schedule.yamlから取得）
  
  // 事前決定されたアクションに基づく処理
  switch (scheduledAction.action) {
    case 'post':
      // トピックに関連した情報を検索
      const searchQuery = await generateSearchQuery({
        purpose: 'trend_analysis',
        topic: scheduledAction.topic,
        constraints: { maxResults: 5 }
      });
      const relatedInfo = await kaitoAPI.searchTweets(searchQuery.query);
      
      // 検索結果を含めてコンテンツ生成
      const content: GeneratedContent = await generateContent({
        topic: scheduledAction.topic,
        context: { relatedTweets: relatedInfo, marketTrends: twitterData.trends },
        style: 'educational',
        targetAudience: 'investors'
      });
      await kaitoAPI.createPost(content.content);
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
  
  // 3. 結果保存・分析エンドポイント使用
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
- **明確な責任分離**: 生成・分析・検索の3エンドポイントで役割分離
- **データフロー重視**: Kaito API → 特定エンドポイント → 専用型返却 → 分岐処理
- **実行モード対応**: 両実行モード（dev/スケジュール）でmakeDecisionエンドポイント使用せず、YAMLから事前決定アクションを取得して3ステップで動作

## 単体テスト仕様

### エンドポイント単体テスト要件

#### 1. content-endpoint.test.ts
- **コンテンツ生成テスト**: トピック別の教育的コンテンツ生成検証
- **スタイル検証**: educational, professional等の文体制御テスト
- **文字数制限**: Twitter投稿文字数制限（280文字）遵守検証
- **型安全性**: GeneratedContent型の返却値検証

#### 2. analysis-endpoint.test.ts  
- **分析機能テスト**: 投稿パフォーマンス分析結果検証
- **メトリクス計算**: エンゲージメント率、フォロワー増減等の計算精度
- **トレンド分析**: 市場動向分析の妥当性検証
- **型安全性**: AnalysisResult型の返却値検証

#### 3. search-endpoint.test.ts
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
- **📏 適切な分離**: src/claude/endpoints 3ファイル、役割別に適切に分離
- **📊 型安全最優先**: エンドポイントごとの専用入力/出力型で確実な連携
- **🎯 使うコードのみ**: MVPで実際に使用するエンドポイントのみ実装
- **🔧 kaito-api一貫性**: 同様のendpoints/構造で設計統一

## 認証・実装上の重要事項

### Claude Code SDK認証方式
- **使用SDK**: `@instantlyeasy/claude-code-sdk-ts`を使用（Claude Code Max Plan利用のため）
- **ローカル認証必須**: Claude CLIでのローカルログイン認証（`claude login`）を使用
- **CLAUDE_API_KEY不要**: 環境変数CLAUDE_API_KEYの設定は不要
- **認証手順**: 
  1. `npm install -g @anthropic-ai/claude-code`
  2. `claude login`でブラウザ認証
  3. Claude Code Max Planの機能をフル活用

**重要**: Claude Code Max Planの契約を最大限活用するため、必ず`@instantlyeasy/claude-code-sdk-ts`とローカル認証を使用すること。

### 🚨 重要：Claude SDK実装の問題と対応

**現在の問題**:
- `@instantlyeasy/claude-code-sdk-ts` パッケージが正しく動作していない
- `claude()` 関数の呼び出しでワークフローが停止する

**対応方針**:

#### 1. エラーハンドリングの強化（推奨）
Claude SDK呼び出し部分に適切なエラーハンドリングを実装：

```typescript
// src/claude/endpoints/content-endpoint.ts での実装例
async function generateWithClaudeQualityCheck(
  prompt: string, 
  topic: string, 
  qualityThreshold: number
): Promise<string> {
  try {
    // Claude SDK 呼び出し
    const response = await claude()
      .withModel('sonnet')
      .withTimeout(CLAUDE_TIMEOUT)
      .query(prompt)
      .asText();
      
    return response.trim();
  } catch (error) {
    console.error('Claude SDK呼び出しエラー:', error);
    // エラー詳細をログに記録
    console.error('エラー詳細:', {
      topic,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });
    
    // 適切なエラーを再スロー
    throw new Error(`Claude API呼び出しに失敗しました: ${error.message}`);
  }
}
```

#### 2. SDK問題の根本解決

1. **短期対応（高優先度）**:
   - Claude SDK の最新バージョン確認と更新
   - ローカル認証状態の確認（`claude login`の再実行）
   - エラーログの詳細分析

2. **中期対応**:
   - Claude公式ドキュメントの確認
   - 代替SDKパッケージの調査
   - コミュニティフォーラムでの問題報告

3. **長期対応**:
   - Claude API直接呼び出しの実装検討
   - カスタムAPIクライアントの開発
   - リトライ機構とフォールバック戦略の実装

#### 3. テスト環境での対応

テスト実行時のみ、実際のAPIをスキップする最小限の対応：

```typescript
// テストファイル内でのみ使用
if (process.env.NODE_ENV === 'test') {
  // テスト用のスタブを使用
  vi.mock('@instantlyeasy/claude-code-sdk-ts');
}
```

**重要**: 本番環境でのモック使用は厳禁。CLAUDE.mdの規約により、実際のClaude APIを使用することが必須。