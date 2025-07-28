# TradingAssistantX プロジェクト構造（MVP版）

## 全体構造概要

```
TradingAssistantX/
├── 📁 src/                           # ソースコード
├── 🧪 tests/                         # テストファイル
├── 📚 docs/                          # ドキュメント
├── 📋 tasks/                         # プロジェクト管理・タスク履歴
├── ⚙️ 設定ファイル                    # プロジェクト設定
└── 🗂️ その他                         # バックアップ・一時ファイル
```

## 📁 /src ディレクトリ（エンドポイント別設計版）
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
├── kaito-api/                 # KaitoTwitterAPI 2層認証アーキテクチャ
│   ├── core/                  # 基盤機能（認証・設定・リクエスト管理）
│   │   ├── client.ts          # API認証・リクエスト管理・QPS制御
│   │   ├── config.ts          # 設定管理・バリデーション
│   │   └── error-handler.ts   # エラーハンドリング・レート制限対応
│   ├── endpoints/             # エンドポイント別分離（user/tweet/trend/action）
│   │   ├── user-endpoints.ts   # ユーザー管理・アカウント情報
│   │   ├── tweet-endpoints.ts  # 投稿・エンゲージメント（いいね、RT、引用）
│   │   ├── trend-endpoints.ts  # トレンド・検索機能
│   │   └── action-endpoints.ts # アクション実行・統合機能
│   ├── types.ts               # KaitoAPI型定義統合（Request/Response/Error型定義）
│   └── utils/                 # レスポンス処理・エラーハンドリング・ユーティリティ関数
│       ├── response-handler.ts    # API応答処理・型変換・エラー解析
│       ├── retry-handler.ts       # リトライ処理・指数バックオフ・失敗回復
│       └── validation-utils.ts    # 入力検証・データ正規化・サニタイズ
│
├── main-workflows/            # システム実行フロー管理 (9ファイル・Phase 2 分割完了)
│   ├── core/                  # 分割されたコア機能（Phase 2 リファクタリング済み）
│   │   ├── scheduler-core.ts        # スケジューラー基本機能（内蔵スケジューラー・実行制御）
│   │   ├── scheduler-maintenance.ts # メンテナンス機能（データ管理・定期クリーンアップ）
│   │   ├── context-loader.ts        # システムコンテキスト読み込み機能（118行）
│   │   ├── action-executor.ts       # アクション実行機能（247行）
│   │   └── execution-utils.ts       # エラーハンドリング・リトライ・最適化機能（548行）
│   ├── execution-flow.ts      # メイン実行フロー制御（統合クラス・321行 ※1136行から分割完了）
│   ├── scheduler-manager.ts   # 統合スケジューラー管理（分割リファクタリング済み・640行）
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

## 🧪 /tests ディレクトリ（単体テスト）
**各モジュールに対応する包括的なテスト構成**

```
tests/
├── claude/                           # Claude エンドポイント単体テスト
│   ├── endpoints/                    # エンドポイント別テスト (4ファイル)
│   │   ├── decision-endpoint.test.ts    # 判断エンドポイントテスト
│   │   ├── content-endpoint.test.ts     # コンテンツ生成エンドポイントテスト
│   │   ├── analysis-endpoint.test.ts    # 分析エンドポイントテスト
│   │   └── search-endpoint.test.ts      # 検索クエリエンドポイントテスト
│   ├── types.test.ts                    # 型定義テスト
│   └── index.test.ts                    # エクスポート統合テスト
├── kaito-api/                        # KaitoAPI 単体テスト
│   ├── core/                         # 基盤機能テスト (9ファイル)
│   │   ├── client.test.ts            # API認証・リクエスト管理テスト
│   │   ├── config.test.ts            # API設定管理テスト
│   │   ├── config-manager.test.ts    # 設定マネージャーテスト
│   │   ├── config-validation.test.ts # バリデーションテスト
│   │   ├── error-handler.test.ts     # エラーハンドリングテスト
│   │   ├── http-client.test.ts       # HTTPクライアントテスト
│   │   ├── integration.test.ts       # 統合テスト
│   │   ├── qps-controller.test.ts    # QPS制御テスト
│   │   └── simple.test.ts            # 基本機能テスト
│   ├── endpoints/                    # エンドポイント別テスト (8ファイル)
│   │   ├── action-endpoints.test.ts      # アクション実行エンドポイントテスト
│   │   ├── endpoints-integration.test.ts # エンドポイント統合テスト
│   │   ├── tweet-endpoints.test.ts       # ツイート関連エンドポイントテスト
│   │   ├── tweet-endpoints-integration.test.ts # ツイート統合テスト
│   │   ├── tweet-creation.test.ts        # ツイート作成テスト
│   │   ├── tweet-retweet.test.ts         # リツイートテスト
│   │   ├── tweet-validation.test.ts      # ツイートバリデーションテスト
│   │   └── user-endpoints.test.ts        # ユーザーエンドポイントテスト
│   ├── integration/                  # 統合テスト (6ファイル)
│   │   ├── core-integration.test.ts      # コア統合テスト
│   │   ├── endpoints-integration.test.ts # エンドポイント統合テスト
│   │   ├── error-recovery-integration.test.ts # エラー回復統合テスト
│   │   ├── full-stack-integration.test.ts # フルスタック統合テスト
│   │   ├── real-api-integration.test.ts  # 実API統合テスト
│   │   └── workflow-integration.test.ts  # ワークフロー統合テスト
│   ├── performance/                  # パフォーマンステスト (1ファイル)
│   │   └── performance.test.ts       # パフォーマンス検証テスト
│   ├── real-api/                     # 実APIテスト (1ファイル)
│   │   └── real-integration.test.ts  # 実API統合テスト
│   ├── scripts/                      # テストスクリプト (1ファイル)
│   │   └── integration-check.ts      # 統合テストチェックスクリプト
│   ├── types/                        # 型安全性テスト (1ファイル)
│   │   └── type-safety.test.ts       # 型安全性検証テスト
│   ├── run-integration-tests.ts     # 統合テスト実行スクリプト
│   ├── types.test.ts                 # KaitoAPI型定義テスト
│   ├── config-types.test.ts          # 設定型テスト
│   ├── core-types.test.ts            # コア型テスト
│   ├── tweet-types.test.ts           # ツイート型テスト
│   ├── user-types.test.ts            # ユーザー型テスト
│   └── type-compatibility.test.ts    # 型互換性テスト
├── test-utils/                       # テストユーティリティ
│   ├── mock-data.ts                  # モックデータ生成
│   ├── test-helpers.ts               # テストヘルパー関数
│   └── claude-mock.ts                # Claude API モック
└── setup/                            # テスト環境設定
    └── test-env.ts                   # テスト環境初期化
```

## 📚 /docs ディレクトリ（ドキュメント）
**プロジェクトドキュメントと仕様書**

```
docs/
├── README.md                         # プロジェクト概要・導入ガイド
├── claude.md                         # Claude Code SDK仕様書（エンドポイント別設計・テスト仕様含む）
├── kaito-api.md                      # KaitoTwitterAPI仕様書（認証・エンドポイント・テスト仕様含む）
├── directory-structure.md            # このファイル - プロジェクト構造詳細
└── roles/                            # 役割別権限定義
    ├── manager-role.md               # Manager権限の役割定義・作業範囲・責任
    └── worker-role.md                # Worker権限の役割定義・実装範囲・制約
```

## ⚙️ 設定ファイル
**プロジェクト設定とビルド構成**

```
TradingAssistantX/
├── package.json                      # Node.js依存関係とスクリプト
├── pnpm-lock.yaml                    # pnpm ロックファイル
├── pnpm-workspace.yaml               # pnpm ワークスペース設定
├── tsconfig.json                     # TypeScript設定
├── vitest.config.ts                  # Vitest テスト設定
├── vitest.setup.ts                   # Vitest セットアップ
└── eslint.config.js                  # ESLint設定
```

## 🗂️ その他のファイル
**開発用ファイル**

```
TradingAssistantX/
├── CLAUDE.md                         # Claude Code SDK運用指示書
├── REQUIREMENTS.md                   # MVP要件定義書
├── memo.md                           # 開発メモ
└── dev.ts                            # 開発用スクリプト
```

## アーキテクチャ設計原則

### エンドポイント別設計（Claude SDK）
- **🎯 明確な責任分離**: 各エンドポイント = 1つの役割（判断・生成・分析・検索）
- **📊 型安全**: エンドポイントごとの専用入力/出力型で確実な連携
- **🔧 使いやすさ**: どのファイルがどの返却型かが明確、直感的な使用
- **🏗️ 一貫性**: kaito-apiと同様のendpoints/構造で統一感
- **🚀 拡張性**: 新機能 = 新エンドポイント追加のみ、既存に影響なし
- **📋 保守性**: プロンプト・変数・返却型が1ファイルで完結管理
- **🔄 明確なデータフロー**: Kaito API → 特定エンドポイント → 固定型返却 → 分岐

### 統合アーキテクチャ（Phase 2 リファクタリング済み）
- **🔧 重複解消**: scheduler/ディレクトリの冗長性を完全排除
- **📝 分割統合**: SchedulerManagerでコア機能を適切に分割・統合管理
- **🏗️ 保守性向上**: 1000行超ファイルを機能別に分割（単一責任原則）
- **🚀 依存関係簡素化**: main-workflows/core/での機能分離と疎結合設計
- **⚡ ファイル分割効果**: 
  - scheduler-manager.ts (1064行 → 640行 + core/2ファイル)
  - execution-flow.ts (1136行 → 321行 + core/3ファイル)
- **🎯 設計原則**: 単一責任・疎結合・高凝集を実現した分割アーキテクチャ

### 分散型型定義
- **🎯 モジュール独立性**: 各モジュールが独自の型定義を持ち、依存関係が局所化
- **📋 保守容易性**: 型変更の影響範囲が明確、モジュール内で完結
- **🔍 型の発見性**: 関連する型が同じ場所にあり、開発効率が向上

## データ管理方針

### 2層アーキテクチャ（current/history）
- **Current層**: 現在実行サイクル（30分毎更新）
- **History層**: 過去実行アーカイブ（YYYY-MM/DD-HHMM形式）
- **Context層**: 実行状況・セッション情報（既存維持）

### データ整合性
- **1投稿1ファイル**: post-TIMESTAMP.yaml形式で管理、投稿データの原子性保証
- **自動インデックス**: 投稿作成時に自動でインデックス更新、検索性能向上
- **KaitoAPI制限対策**: QPS制御（1秒間隔）・レート制限監視・自動リトライ・失敗時フォールバック
- **データ検証**: YAML構造検証・必須フィールドチェック・型安全性確保
- **バックアップ戦略**: 自動アーカイブ・履歴保持・データ復旧機能