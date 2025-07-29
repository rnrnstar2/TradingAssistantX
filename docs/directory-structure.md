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

## 📁 /src ディレクトリ（新ワークフローアーキテクチャ版）✅ **Phase 2実装完了**
**シンプルな4ステップワークフロー + スケジュール実行機能**

### 🚀 実装完了状況（2025-07-29更新）
- ✅ **Phase 1（完了）**: workflows/ディレクトリ実装・エントリーポイント簡素化・基本的な4ステップワークフロー
- ✅ **Phase 2（完了）**: scheduler/ディレクトリ実装・YAML設定によるスケジュール実行・時刻制御機能
- ✅ **Claude エンドポイント**: 4エンドポイント完全実装・統合システム動作確認済み
- ✅ **KaitoAPI 3層認証**: 完全実装・実API接続確認済み（2025-07-29再確認）
- ✅ **データ管理システム**: current/history 2層アーキテクチャ完全動作

```
src/
├── workflows/                        # ワークフロー中核機能
│   ├── main-workflow.ts              # メインワークフロー実行クラス
│   ├── constants.ts                  # ワークフロー定数定義
│   └── action-executor.ts            # アクション実行ロジック
│
├── scheduler/                        # スケジューラー機能
│   ├── time-scheduler.ts             # 時刻ベーススケジューラー
│   ├── schedule-loader.ts            # YAML設定読込
│   └── types.ts                      # スケジューラー型定義
│
├── claude/                           # Claude Code SDK - エンドポイント別設計 (6ファイル)
│   ├── endpoints/                     # 役割別エンドポイント (4ファイル)
│   │   ├── decision-endpoint.ts       # 判断: プロンプト+変数+ClaudeDecision返却
│   │   ├── content-endpoint.ts        # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   │   ├── analysis-endpoint.ts       # 分析: プロンプト+変数+AnalysisResult返却
│   │   └── search-endpoint.ts         # 検索クエリ: プロンプト+変数+SearchQuery返却
│   ├── types.ts                       # 各エンドポイントの返却型定義
│   └── index.ts                       # エクスポート統合
│
├── kaito-api/                 # KaitoTwitterAPI 統合認証システム（V2標準）
│   ├── core/                  # 認証システム（最小構成）
│   │   ├── auth-manager.ts          # 統合認証管理
│   │   ├── client.ts                # HTTPクライアント・API通信
│   │   ├── config.ts                # 設定管理・環境変数
│   │   ├── session.ts               # セッション・Cookie管理
│   │   └── index.ts                 # coreエクスポート
│   ├── endpoints/             # 機能別エンドポイント
│   │   ├── read-only/         # 📖 読み取り専用（APIキー認証のみ）
│   │   │   ├── user-info.ts         # ユーザー情報取得
│   │   │   ├── tweet-search.ts      # ツイート検索
│   │   │   ├── trends.ts            # トレンド取得
│   │   │   ├── follower-info.ts     # フォロワー情報
│   │   │   └── index.ts             # read-onlyエクスポート
│   │   ├── authenticated/     # 🔐 認証必須（V2ログイン必要）
│   │   │   ├── tweet.ts             # 投稿管理（作成・削除）
│   │   │   ├── engagement.ts        # エンゲージメント（いいね・RT・解除）
│   │   │   ├── follow.ts            # フォロー管理（フォロー・アンフォロー）
│   │   │   └── index.ts             # authenticatedエクスポート
│   │   └── index.ts           # 全エンドポイントエクスポート
│   ├── utils/                 # ユーティリティ
│   │   ├── types.ts                 # 全型定義
│   │   ├── constants.ts             # API URL・レート制限値等の定数
│   │   ├── errors.ts                # Twitter API特有のエラークラス
│   │   ├── response-handler.ts      # レスポンス処理・正規化
│   │   ├── validator.ts             # 入力検証
│   │   └── index.ts                 # utilsエクスポート
│   └── index.ts               # kaito-api全体エクスポート
│
├── data/                      # データ管理統合 - MVP最小構成
│   ├── data-manager.ts        # データ管理クラス
│   ├── current/               # 🔄 現在実行サイクル（実行毎更新）【新規追加】
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
├── shared/                    # 共通機能 (4ファイル)
│   ├── types.ts               # システム全体共通型定義（実行結果・エラーハンドリング等）
│   ├── config.ts              # 設定管理
│   ├── logger.ts              # ログ管理
│   └── component-container.ts # コンポーネント管理
│
├── utils/                     # ユーティリティ機能
│   └── troubleshooting.ts     # トラブルシューティングヘルパー
│
├── dev.ts                     # 開発用エントリーポイント（単一実行）
├── main.ts                    # 本番用エントリーポイント（スケジュール実行）
└── index.ts                   # 共通エクスポート
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
├── kaito-api/                        # KaitoAPI テスト
│   ├── core/                         # コア機能テスト
│   │   └── client.test.ts            # HTTPクライアントテスト
│   ├── endpoints/                    # エンドポイントテスト
│   │   ├── action-endpoints.test.ts  # アクションエンドポイントテスト
│   │   ├── tweet-endpoints.test.ts   # ツイートエンドポイントテスト
│   │   └── user-endpoints.test.ts    # ユーザーエンドポイントテスト
│   ├── integration/                  # 統合テスト
│   │   ├── real-api-integration.test.ts  # 実API統合テスト
│   │   └── workflow-integration.test.ts  # ワークフロー統合テスト
│   ├── real-api/                     # 実APIテスト
│   │   └── real-integration.test.ts  # 実環境統合テスト
│   └── run-integration-tests.ts      # 統合テストランナー
├── test-utils/                       # テストユーティリティ
│   └── claude-mock-data.ts           # Claude API モックデータ
├── test-env.ts                       # テスト環境設定
└── README.md                         # テスト概要ドキュメント
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

### ワークフローアーキテクチャ
- **workflows/**: 3ステップ（スケジュール）/4ステップ（手動）ワークフロー実装
  - スケジュール実行時: データ収集 → アクション実行（事前決定） → 結果保存
  - 手動実行時: データ収集 → Claude判断 → アクション実行 → 結果保存
- **scheduler/**: 時刻ベースの自動実行機能
  - YAMLファイルからスケジュール読込（フラット構造）
  - 1分間隔での時刻チェック

### エントリーポイントの説明
- **dev.ts**: `pnpm dev` - 開発用単一実行
- **main.ts**: `pnpm start` - スケジュール実行モード

### 基本設計原則
- **エンドポイント別設計**: Claude SDKとKaitoAPIで統一されたendpoints/構造
- **2層認証構造**: 読み取り専用（APIキー）と認証必須（V2ログイン）で明確な機能分離
- **シンプルアーキテクチャ**: workflows/での統合実行制御、main-workflows/レガシーコードは削除済み
- **型安全性**: モジュールごとの独立した型定義で依存関係を局所化

> **詳細設計**: [claude.md](./claude.md)、[kaito-api.md](./kaito-api.md) を参照


## データ管理構造

```
data/
├── config/
│   ├── api-config.yaml       # API設定
│   ├── system-config.yaml    # システム設定
│   └── schedule.yaml         # スケジュール設定（NEW）
├── context/
│   └── current-status.yaml   # 現在の実行状況
├── current/                  # 現在実行サイクル
├── history/                  # 過去実行アーカイブ
├── intelligence/
│   └── learning-data.yaml    # 学習データ
└── learning/                 # 学習用データ格納
```

- **Current層**: 現在実行サイクル（実行毎更新）、20ファイル上限、1MB制限
- **History層**: 過去実行アーカイブ（YYYY-MM/DD-HHMM形式）
- **Context層**: 実行状況・セッション情報（既存維持）
- **Learning層**: 学習用データ格納、10MB制限
- **Schedule設定**: YAML形式でのスケジュール定義（フラット構造）
- **データ制限**: QPS制御、レート制限監視、自動リトライ機能

## 今後の計画

### 次期改善予定
- TypeScript型定義の整合性改善
- テストカバレッジの向上

### 削除されたレガシーファイル
以下のレガシーファイルは削除されました：
- **main-workflows/ディレクトリ全体**（新ワークフロー統合により不要）
  - main-workflows/execution-flow.ts
  - main-workflows/scheduler-manager.ts  
  - main-workflows/status-controller.ts
  - main-workflows/system-lifecycle.ts
  - main-workflows/core/action-executor.ts
  - main-workflows/core/common-error-handler.ts
  - main-workflows/core/context-loader.ts
  - main-workflows/core/execution-utils.ts
  - main-workflows/core/scheduler-core.ts
  - main-workflows/core/scheduler-maintenance.ts
  - main-workflows/core/type-guards.ts
  - main-workflows/core/workflow-constants.ts
  - main-workflows/core/workflow-logger.ts