# TradingAssistantX プロジェクト構造（MVP版）

## 全体構造概要

```
TradingAssistantX/
├── 📁 src/                           # ソースコード
├── 🧪 tests/                         # テストファイル
├── 📚 docs/                          # ドキュメント
├── 📋 tasks/                         # プロジェクト管理・タスク履歴
├── 🗂️ data/                          # データ統合管理ディレクトリ（設定・実行データ・学習）
├── 📋 設定ファイル                    # プロジェクト設定
└── 🗂️ その他                         # バックアップ・一時ファイル
```

## 📁 /src ディレクトリ（新ワークフローアーキテクチャ版）✅ **Phase 2実装完了**
**シンプルな3ステップワークフロー + スケジュール実行機能**

### 🚀 実装完了状況（2025-07-29更新）
- ✅ **Phase 1（完了）**: workflows/ディレクトリ実装・エントリーポイント簡素化・基本的な3ステップワークフロー
- ✅ **Phase 2（完了）**: scheduler/ディレクトリ実装・YAML設定によるスケジュール実行・時刻制御機能
- ✅ **Claude エンドポイント**: 4エンドポイント完全実装・統合システム動作確認済み
- ✅ **KaitoAPI 2層認証**: 完全実装・実API接続確認済み（2025-07-29再確認）
- ✅ **データ管理システム**: current/history 2層アーキテクチャ完全動作

```
src/
├── workflows/                        # ワークフロー中核機能
│   ├── main-workflow.ts              # メインワークフロー実行クラス
│   └── constants.ts                  # ワークフロー定数定義
│
├── scheduler/                        # スケジューラー機能
│   ├── time-scheduler.ts             # 時刻ベーススケジューラー
│   ├── schedule-loader.ts            # YAML設定読込
│   └── types.ts                      # スケジューラー型定義
│
├── claude/                           # Claude Code SDK - エンドポイント別設計
│   ├── endpoints/                     # 役割別エンドポイント (3ファイル)
│   │   ├── content-endpoint.ts        # コンテンツ生成: プロンプト+変数+GeneratedContent返却
│   │   ├── selection-endpoint.ts      # 最適ツイート選択: プロンプト+変数+SelectedTweet返却
│   │   └── analysis-endpoint.ts       # 📊 深夜分析: プロンプト+変数+AnalysisResult返却（**※未実装**）
│   ├── prompts/                       # プロンプトテンプレート管理
│   │   ├── templates/                 # プロンプトテンプレート
│   │   │   ├── content.template.ts    # コンテンツ生成テンプレート
│   │   │   ├── selection.template.ts  # ツイート選択テンプレート
│   │   │   └── analysis.template.ts   # 📊 深夜分析テンプレート（**※未実装**）
│   │   ├── builders/                  # プロンプトビルダー
│   │   │   ├── base-builder.ts        # 共通ビルダー（時間帯・曜日等）
│   │   │   ├── content-builder.ts     # コンテンツ用ビルダー
│   │   │   ├── selection-builder.ts   # ツイート選択用ビルダー
│   │   │   └── analysis-builder.ts    # 📊 深夜分析用ビルダー（**※未実装**）
│   │   └── index.ts                   # プロンプトビルダーエクスポート
│   ├── types.ts                       # エンドポイント型定義
│   └── index.ts                       # エクスポート統合
│
├── kaito-api/                 # KaitoTwitterAPI 統合認証システム（V2標準）
│   ├── core/                  # 認証システム（最小構成）
│   │   ├── auth-manager.ts          # 統合認証管理
│   │   ├── client.ts                # HTTPクライアント・API通信
│   │   ├── config.ts                # 設定管理・環境変数
│   │   ├── proxy-manager.ts         # プロキシ管理・接続制御
│   │   ├── session.ts               # セッション・Cookie管理
│   │   ├── types.ts                 # 認証・設定型のみ
│   │   └── index.ts                 # coreエクスポート
│   ├── endpoints/             # 機能別エンドポイント
│   │   ├── read-only/         # 📖 読み取り専用（APIキー認証のみ）
│   │   │   ├── user-info.ts         # ユーザー情報取得
│   │   │   ├── tweet-search.ts      # ツイート検索
│   │   │   ├── trends.ts            # トレンド取得
│   │   │   ├── follower-info.ts     # フォロワー情報
│   │   │   ├── types.ts             # read-only専用型
│   │   │   └── index.ts             # read-onlyエクスポート
│   │   ├── authenticated/     # 🔐 認証必須（V2ログイン必要）
│   │   │   ├── tweet.ts             # 投稿管理（作成・削除）
│   │   │   ├── engagement.ts        # エンゲージメント（いいね・RT・解除）
│   │   │   ├── follow.ts            # フォロー管理（フォロー・アンフォロー）
│   │   │   ├── types.ts             # authenticated専用型
│   │   │   └── index.ts             # authenticatedエクスポート
│   │   └── index.ts           # 全エンドポイントエクスポート
│   ├── utils/                 # ユーティリティ
│   │   ├── types.ts                 # utils共通型（縮小版）
│   │   ├── constants.ts             # API URL・レート制限値等の定数
│   │   ├── errors.ts                # X API特有のエラークラス
│   │   ├── response-handler.ts      # レスポンス処理・正規化
│   │   ├── validator.ts             # 入力検証・型ガード
│   │   └── index.ts                 # utilsエクスポート
│   └── index.ts               # kaito-api全体エクスポート
│
├── shared/                    # 共通機能 (5ファイル)
│   ├── types.ts               # システム共通型定義
│   ├── config.ts              # 設定管理
│   ├── logger.ts              # ログ管理
│   ├── data-manager.ts        # データ管理クラス（ルートレベル/data/にアクセス）
│   └── component-container.ts # コンポーネント管理
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
│   ├── endpoints/                    # エンドポイント別テスト (3ファイル)
│   │   ├── content-endpoint.test.ts     # コンテンツ生成エンドポイントテスト
│   │   ├── selection-endpoint.test.ts   # ツイート選択エンドポイントテスト
│   │   └── analysis-endpoint.test.ts    # 📊 深夜分析エンドポイントテスト（**※未実装**）
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


### 🎯 **MVP設計方針**
- **データ統合管理**: ルートレベル/data/にすべてのデータを統合
- **コード・データ分離**: src/はコードのみ、data/はデータのみの明確な分離
- **最小限設定**: system.yaml + schedule.yaml のみ（api.yamlは必要時追加）
- **環境変数優先**: 環境別設定は環境変数で対応（KAITO_API_TOKEN等）

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
├── eslint.config.js                  # ESLint設定
└── .env                              # 環境変数設定（Git管理外）
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
- **workflows/**: 統一されたワークフロー実装（通常3ステップ、深夜4ステップ）
  - スケジュール実行時: データ収集 → アクション実行（時刻別YAML指定） → 結果保存 → [23:55のみ]深夜分析
  - dev実行時: データ収集 → アクション実行（固定YAML指定） → 結果保存
  - **注意**: 両モードともClaude判断ステップは不要、事前決定されたアクションを直接実行
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
- **Co-location原則**: 関連する機能と型定義を同一モジュール内に配置し、保守性を向上


## 🗂️ /data ディレクトリ（ルートレベル）
**すべてのデータを統合管理するルートレベルディレクトリ**

```
data/
├── config/                           # 設定ファイル（MVP最小構成）
│   ├── proxies.yaml                  # プロキシ一覧
│   ├── system.yaml                   # システム設定（実行間隔・タイムゾーン等）
│   ├── schedule.yaml                 # スケジュール設定（時刻別アクション）
│   └── twitter-session.yaml          # KaitoAPI認証セッション（24時間有効）
│
├── current/                          # 🔄 現在実行サイクル（実行毎更新）
│   ├── execution-YYYYMMDD-HHMM/      # タイムスタンプ付き実行ディレクトリ（post/quote_tweetアクションのみ）
│   │   ├── content-prompt.yaml       # コンテンツ生成プロンプト
│   │   └── post.yaml                 # 投稿データ（全実行情報統合）
│   └── strategy-analysis.yaml        # 🌙 戦略分析結果（深夜23:55分析で生成）
│
├── history/                          # 📚 過去実行サイクル（アーカイブ）
│   └── YYYY-MM/                      # 月別フォルダ
│       └── DD-HHMM/                  # 日時別実行履歴（currentと同構造）
│
└── learning/                         # 📊 学習用データ格納（累積更新・MVP版）
    ├── engagement-patterns.yaml      # エンゲージメント分析（時間帯・形式・パターン統合）
    └── successful-topics.yaml        # 成功したトピック集計（投資教育特化）
```
