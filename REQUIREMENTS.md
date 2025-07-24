# TradingAssistantX MVP要件定義書

## 🎯 MVPビジョン

**シンプルなX投稿自動化システム**
- 🚀 **30分間隔自動実行**: KaitoAPIを使った定期投稿システム
- 🎓 **投資教育コンテンツ**: 投資・トレードに関する教育的な投稿
- 🤖 **Claude判断**: Claude SDKによる最適なアクション決定
- 📚 **学習機能**: 実行結果を学習データとして蓄積・活用

## 💡 MVPの基本目標

### シンプル実行フロー
```
30分毎の自動実行:
1. 【データ読み込み】
   - DataManager: 設定・学習データ読み込み
   - KaitoAPI: アカウント状況確認

2. 【Claude判断】
   - 現在状況の分析
   - 最適なアクション決定（投稿/RT/いいね/待機）

3. 【アクション実行】
   - 決定されたアクションの実行
   - 基本的なエラーハンドリング

4. 【結果記録】
   - 実行結果の記録
   - 学習データの更新
```

### 成功指標
- **🎯 継続実行**: 30分間隔での安定した自動実行
- **🤖 適切判断**: Claudeによる状況に応じた適切なアクション選択
- **📚 学習蓄積**: 実行結果の記録と次回実行への活用

## 🏗️ MVP システムアーキテクチャ

### シンプル設計
**動作確実性を最優先とした基本構成**

```
シンプル実装 > 複雑な設計
確実な動作 > 高度な機能
```

### 30分間隔実行システム
```
CoreScheduler (30分間隔)
     ↓
DataManager (設定・学習データ読み込み)
     ↓
ClaudeDecisionEngine (アクション決定)
     ↓
ActionExecutor (基本的なアクション実行)
     ↓
結果記録・学習データ更新
```

## 🤖 Claude Code SDK アクション決定

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
- **条件**: 適切なアクションがない場合、頻度制御
- **効果**: 次回30分後の実行継続

## 📁 ディレクトリ・ファイル構造（MVP版）

### /src ディレクトリ（エンドポイント別設計版）
**基本実装ファイル + 動的データファイル構成 - エンドポイント別設計（役割分離+使いやすさ）**

```
src/
├── claude/                           # Claude Code SDK - エンドポイント別設計 (6ファイル)
│   ├── endpoints/                     # 役割別エンドポイント (4ファイル)
│   │   ├── decision-endpoint.ts       # 判断: プロンプト+変数+ClaudeDecision返却
│   │   ├── content-endpoint.ts        # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   │   ├── analysis-endpoint.ts       # 分析: プロンプト+変数+AnalysisResult返却
│   │   └── search-endpoint.ts         # 検索クエリ: プロンプト+変数+SearchQuery返却
│   ├── types.ts                       # 各エンドポイントの返却型定義
│   └── index.ts                       # エクスポート統合
│
├── kaito-api/                 # KaitoTwitterAPI完全分離アーキテクチャ (12ファイル)
│   ├── core/                  # 基盤機能 (2ファイル)
│   │   ├── client.ts          # API認証・QPS制御・リクエスト管理
│   │   └── config.ts          # API設定・エンドポイント管理
│   ├── endpoints/             # エンドポイント別分離 (8ファイル)
│   │   ├── user-endpoints.ts      # ユーザー情報・フォロー関係・検索
│   │   ├── tweet-endpoints.ts     # ツイート検索・詳細・リプライ・引用
│   │   ├── community-endpoints.ts # コミュニティ情報・メンバー・投稿
│   │   ├── list-endpoints.ts      # リスト投稿・フォロワー・メンバー
│   │   ├── trend-endpoints.ts     # トレンド情報取得（WOEID対応）
│   │   ├── login-endpoints.ts     # 認証・ログイン・2FA対応
│   │   ├── action-endpoints.ts    # 投稿・いいね・RT・画像アップロード
│   │   └── webhook-endpoints.ts   # フィルタルール管理・リアルタイム処理
│   ├── types.ts               # KaitoAPI型定義統合 (1ファイル)
│   └── utils/                 # ユーティリティ (1ファイル)
│       └── response-handler.ts    # レスポンス処理・エラーハンドリング
│
├── scheduler/                 # スケジュール制御 (2ファイル)
│   ├── core-scheduler.ts      # 30分間隔制御
│   └── main-loop.ts           # メイン実行ループ統合
│
├── main-workflows/            # システム実行フロー管理 (4ファイル)
│   ├── execution-flow.ts      # メイン実行フロー制御
│   ├── scheduler-manager.ts   # スケジューラー管理
│   ├── status-controller.ts   # ステータス制御
│   └── system-lifecycle.ts    # システムライフサイクル管理
│
├── data/                      # データ管理統合 - MVP最小構成
│   ├── data-manager.ts        # データ管理クラス
│   ├── current/               # 🔄 現在実行サイクル（30分毎更新）【新規追加】
│   │   ├── execution-YYYYMMDD-HHMM/  # タイムスタンプ付き実行ディレクトリ
│   │   │   ├── claude-outputs/       # Claude各エンドポイント結果
│   │   │   │   ├── decision.yaml     # makeDecision()結果
│   │   │   │   ├── content.yaml      # generateContent()結果
│   │   │   │   ├── analysis.yaml     # analyzePerformance()結果
│   │   │   │   └── search-query.yaml # generateSearchQuery()結果
│   │   │   ├── kaito-responses/      # Kaito API応答（最新20件制限）
│   │   │   │   ├── account-info.yaml
│   │   │   │   ├── post-result.yaml
│   │   │   │   └── engagement-data.yaml
│   │   │   ├── posts/                # 投稿データ（1投稿1ファイル）
│   │   │   │   ├── post-TIMESTAMP.yaml
│   │   │   │   └── post-index.yaml   # 投稿一覧インデックス
│   │   │   └── execution-summary.yaml # 実行サマリー
│   │   └── active-session.yaml       # 現在セッション状況
│   ├── history/               # 📚 過去実行サイクル（アーカイブ）【新規追加】
│   │   └── YYYY-MM/                  # 月別フォルダ
│   │       └── DD-HHMM/              # 日時別実行履歴（currentと同構造）
│   ├── config/                # ⚙️ 設定（既存維持）
│   │   └── api-config.yaml           # KaitoTwitterAPI認証設定
│   └── context/               # 🔄 実行コンテキスト（既存維持）
│       ├── current-status.yaml       # 現在の実行状況（アカウント・システム・レート制限）
│       └── session-memory.yaml       # セッション間引き継ぎ（現在セッション・実行履歴）
│
├── shared/                    # 共通機能 (3ファイル)
│   ├── types.ts               # システム全体共通型定義（実行結果・エラーハンドリング等）
│   ├── config.ts              # 設定管理
│   └── logger.ts              # ログ管理
│
└── main.ts                    # システム起動スクリプト - エンドポイント別使用 (1ファイル)
```

**エンドポイント別設計の利点**:
- **🎯 明確な責任分離**: 各エンドポイント = 1つの役割（判断・生成・分析・検索）
- **📊 型安全**: エンドポイントごとの専用入力/出力型で確実な連携
- **🔧 使いやすさ**: どのファイルがどの返却型かが明確、直感的な使用
- **🏗️ 一貫性**: kaito-apiと同様のendpoints/構造で統一感
- **🚀 拡張性**: 新機能 = 新エンドポイント追加のみ、既存に影響なし
- **📋 保守性**: プロンプト・変数・返却型が1ファイルで完結管理
- **🔄 明確なデータフロー**: Kaito API → 特定エンドポイント → 固定型返却 → 分岐

**分散型型定義アーキテクチャの利点**:
- **🎯 モジュール独立性**: 各モジュールが独自の型定義を持ち、依存関係が局所化
- **📋 保守容易性**: 型変更の影響範囲が明確、モジュール内で完結
- **🔍 型の発見性**: 関連する型が同じ場所にあり、開発効率が向上
- **⚡ ビルド効率**: 必要な型のみインポート、循環依存の回避
- **🔧 独立開発**: モジュール単位での型定義変更が他に影響しない

### main.tsでのエンドポイント別使用例
```typescript
// main.ts - エンドポイント別設計
import { makeDecision, generateContent, analyzePerformance, generateSearchQuery } from './claude';
import { kaitoAPI } from './kaito-api';
import { dataManager } from './data/data-manager';
import type { ClaudeDecision, GeneratedContent, AnalysisResult } from './claude/types';

// メインワークフロー - エンドポイント別使用
async function executeWorkflow() {
  // 1. Kaito APIでデータ取得
  const twitterData = await kaitoAPI.getCurrentContext();
  const learningData = await dataManager.loadLearningData();
  
  // 2. 判断エンドポイント使用
  const decision: ClaudeDecision = await makeDecision({
    twitterData,
    learningData,
    currentTime: new Date()
  });
  
  // 3. 固定型に基づく分岐処理 - 各エンドポイント使用
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
  
  await dataManager.saveResult({ decision, result, analysis });
}
```

### KaitoTwitterAPI基本仕様（MVP版）
**MVP必須機能のみ実装**:
- **認証・接続**: 基本的なAPI認証
- **投稿検索**: シンプルな投稿検索・トレンド取得
- **基本アクション**: 投稿・RT・いいね・アカウント情報取得

**実装機能**:
1. **client.ts**: API認証・基本リクエスト
2. **search-engine.ts**: 投稿検索・トレンド取得
3. **tweet-actions.ts**: 投稿・RT・いいね実行
4. **user-info.ts**: アカウント情報取得

### データ管理方針 - MVP最小構成
**必要最小限の構成で確実な動作を実現**

#### 新規追加（current/history）
1. **Current層（現在実行サイクル）**
   - **保持期間**: 30分（1実行サイクル）
   - **自動アーカイブ**: 実行完了後、historyに自動移動
   - **内容**: Claude出力、Kaito応答、投稿データ、実行サマリー
   - **目的**: 実行中のデータを構造化して保存

2. **History層（過去実行アーカイブ）**
   - **保持期間**: 無制限（月次整理）
   - **構造**: YYYY-MM/DD-HHMM形式で時系列管理
   - **用途**: 完全ログ保存、監査証跡、将来の分析用
   - **アクセス**: 通常のワークフローでは参照しない

#### 既存維持（config/context）
3. **既存ディレクトリは変更なし**
   - **config/**: API設定（既存のまま）
   - **context/**: 実行状況・セッション情報（既存のまま）
   - **理由**: 動作中のシステムへの影響を最小化

#### MVP後の追加予定
4. **Learning層（将来拡張）**
   - **decision-patterns.yaml**: 判断パターンの蓄積・分析
   - **success-strategies.yaml**: 成功戦略の記録・活用
   - **action-results.yaml**: アクション結果の履歴分析
   - **理由**: 実データ蓄積後に価値を発揮する機能

#### KaitoAPI制限対策
- **最新20件制限**: get_user_last_tweetsの制限に対応
- **差分取得戦略**: 直近投稿のみ取得し、履歴とマージ
- **料金最適化**: 1日1-2回のフル同期、他は差分のみ
- **キャッシュ活用**: history層から過去データを効率的に参照

#### データ整合性保証
- **1投稿1ファイル**: post-TIMESTAMP.yaml形式で管理
- **自動インデックス**: 投稿作成時に自動でインデックス更新
- **バックアップ**: 月次で自動バックアップ実行
- **検証機能**: データ構造の整合性を定期チェック

## 🚀 基本的なワークフロー（30分毎）

### メインループ実行順序
1. **スケジューラー起動**: 30分間隔でのシステム実行開始
2. **サイクル初期化**: 前回currentをhistoryにアーカイブ、新currentディレクトリ作成
3. **データ確認**: config・intelligence・直近historyから必要データ読み込み
4. **状況分析**: アカウント状況・市場動向・過去データの統合分析
5. **Claude判断**: 現在状況に基づく最適アクションの決定（decision.yaml保存）
6. **アクション実行**: 決定されたアクション（投稿・RT・いいね等）の実行
7. **結果記録**: 実行結果をcurrent/に記録、投稿データを個別ファイル保存
8. **インデックス更新**: 投稿インデックス・実行サマリー更新
9. **次回待機**: 30分後の次回実行まで待機

### エラーハンドリング
- **基本的なtry-catch実装**
- **エラー時は次回実行に継続**
- **基本的なエラーログ記録**

## 🎯 MVPの成功基準

### 基本機能要件
- [ ] **30分間隔自動実行**: 定期的な自動実行システム
- [ ] **Claude判断機能**: アクション決定システム
- [ ] **KaitoAPI連携**: 基本的なAPI操作機能
- [ ] **学習データ保存**: 実行結果の記録・活用

### 動作確認要件
- [ ] **継続実行**: 30分間隔での安定動作
- [ ] **アクション実行**: 投稿・RT・いいね・待機の正常実行
- [ ] **データ更新**: 実行結果の学習データ反映
- [ ] **エラー処理**: 基本的なエラー対応と継続実行

## 💡 実装戦略

### 実装ステップ
1. **基本構造作成**: current/historyディレクトリ構造作成（シンプル2層）
2. **環境変数設定**: .envファイルでAPI設定・レート制限管理
3. **データ管理実装**: 2層アーキテクチャ対応のDataManager拡張
4. **サイクル管理**: 実行サイクル毎のcurrent→historyアーカイブ機能
5. **投稿管理**: 1投稿1ファイル形式の保存・インデックス機能
6. **KaitoAPI最適化**: 最新20件制限対応・差分取得実装
7. **統合テスト**: 全体動作確認・データフロー検証

### 実装優先度（MVP版）
- **最優先**: 30分間隔実行・基本的なClaude判断・KaitoAPI基本連携
- **必須**: 実行データ保存（current/history）・基本エラーハンドリング
- **追加**: 基本ログ出力

### MVP後の段階的拡張
- **Learning層追加**: 判断パターン・成功戦略・アクション結果の蓄積と活用
- **Intelligence層追加**: 戦略分析・重要決定事項・定期レポート機能
- **高度な分析機能**: 週次・月次での深層分析とClaude提案
- **コンテンツ品質向上**: より洗練された投稿生成アルゴリズム
- **詳細な学習データ活用**: パターン認識と予測モデル
- **高度なパフォーマンス追跡**: ダッシュボードとリアルタイム監視

## 🔒 制約事項

### エンドポイント別設計制限
- **🚫 過剰複雑化禁止**: エンドポイント内での不要な抽象化は実装しない
- **✅ 役割明確化重視**: 1エンドポイント = 1つの明確な役割のみ
- **📏 適切な分離**: src/claude/endpoints 4ファイル、役割別に適切に分離
- **📊 型安全最優先**: エンドポイントごとの専用入力/出力型で確実な連携
- **🎯 使うコードのみ**: MVPで実際に使用するエンドポイントのみ実装
- **🔧 kaito-api一貫性**: 同様のendpoints/構造で設計統一

### エンドポイント別設計要件
- **30分間隔実行**: システムの基本動作
- **エンドポイント別Claude処理**: 役割ごとに特化したプロンプト+変数でClaude呼び出し
- **専用型返却**: 各エンドポイントの専用返却型での確実な結果返却
- **明確な責任分離**: 判断・生成・分析・検索の4エンドポイントで役割分離
- **データフロー重視**: Kaito API → 特定エンドポイント → 専用型返却 → 分岐処理
- **基本的なKaitoAPI操作**: 投稿・検索・RT・いいね