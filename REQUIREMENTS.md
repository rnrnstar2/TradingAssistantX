# TradingAssistantX 要件定義書

## 🎯 システム概要

**投資教育コンテンツ自動投稿システム**

X（旧Twitter）上での投資教育コンテンツを自動投稿し、高品質なエンゲージメントを通じて投資初心者〜中級者への価値提供を実現するシステム。

### 核心価値
- **教育品質保証**: Claude AIによる教育的価値の担保
- **エンゲージメント最適化**: AI判断による最適コンテンツ選択
- **24時間運用**: スケジュール実行による継続的価値提供
- **学習進化**: 実行結果から翌日戦略を自動最適化

## 📋 基本機能要件

### 実行モード
- **開発実行**: `pnpm dev` - 単一実行（手動テスト用）
- **本番実行**: `pnpm start` - スケジュール実行（自動運用）

### コアアクション
- **投稿 (post)**: 投資教育コンテンツの作成・投稿
- **リツイート (retweet)**: 高品質コンテンツの拡散
- **引用リツイート (quote_tweet)**: 独自視点による価値追加
- **いいね (like)**: 関係構築・品質評価
- **フォロー (follow)**: 投資教育関連アカウントとのネットワーク構築
- **分析 (analyze)**: 深夜分析・翌日戦略生成（23:55限定）
- **待機 (wait)**: 最適タイミング調整

## 🏗️ システムアーキテクチャ

### ワークフロー（全アクション共通）
```
1. データ収集 → 2. アクション実行 → 3. 結果保存
```

**アクション実行詳細**:
- **通常アクション（post, retweet, like等）**: 通常の3ステップで完了
- **analyzeアクション（23:55のみ）**: 深夜分析を実行
  - **詳細仕様**: [docs/deep-night-analysis.md](docs/deep-night-analysis.md)

### 核心コンポーネント
- **Claude Code SDK**: AI判断・コンテンツ生成
- **KaitoTwitterAPI**: X（Twitter）連携・投稿管理
- **DataManager**: データ統合管理（current/history 2層構造）
- **TimeScheduler**: 時刻ベース自動実行

## 🤖 Claude Code SDK統合

**詳細仕様**: [docs/claude.md](docs/claude.md)

### エンドポイント別設計
- `generateContent`: 教育コンテンツ生成
- `selectOptimalTweet`: AI最適選択（投資教育価値・信頼性・エンゲージメント総合判断）
- `generateQuoteComment`: 価値追加コメント生成
- `analyzePerformance`: 実行結果分析・戦略最適化

### 深夜分析システム
- **実行時刻**: 毎日23:55
- **詳細仕様**: [docs/deep-night-analysis.md](docs/deep-night-analysis.md)

## 🌐 KaitoTwitterAPI連携

**詳細仕様**: [docs/kaito-api.md](docs/kaito-api.md)

### 2層認証アーキテクチャ
- **読み取り専用**: APIキー認証（検索・情報取得）
- **認証必須**: V2ログイン（投稿・エンゲージメント）

### API制限対応
- **レート制限**: 200 QPS
- **プロキシ管理**: 自動ローテーション
- **エラーハンドリング**: 自動リトライ・継続実行

## 📂 プロジェクト構造

**詳細構造**: [docs/directory-structure.md](docs/directory-structure.md)

### 主要ディレクトリ
```
src/                    # ソースコード
├── workflows/          # ワークフロー実行
├── claude/            # Claude SDK統合
├── kaito-api/         # TwitterAPI統合
└── shared/            # 共通機能

data/                   # データ統合管理
├── config/            # 設定（system.yaml, schedule.yaml）
├── current/           # 現在実行データ
├── history/           # 過去実行履歴
└── learning/          # 学習・分析データ

docs/                   # ドキュメント
tests/                  # テスト（Jest）
```

## 🕒 実行仕様

**詳細フロー**: [docs/workflow.md](docs/workflow.md)

### スケジュール例
- **07:00**: 朝の投資教育投稿
- **12:00**: 市場動向解説
- **20:00**: 引用RT（ニュース解説）
- **23:55**: **深夜分析**（翌日戦略生成）

### 実行制御
- **時刻精度**: 1分間隔チェック
- **エラー継続**: 個別失敗でもスケジュール継続
- **自動学習**: 実行結果から戦略最適化

## 🔧 環境設定

### 必須環境変数
```bash
# KaitoAPI認証
KAITO_API_TOKEN=your_twitterapi_io_token

# X（Twitter）認証（投稿機能用）
X_USERNAME=your_twitter_username
X_EMAIL=your_twitter_email
X_PASSWORD=your_twitter_password
X_TOTP_SECRET=your_twitter_totp_secret
```

### プロキシ設定
```yaml
# data/config/proxies.yaml
proxies:
  - host: proxy1.example.com
    port: 8080
  - host: proxy2.example.com
    port: 8080
```

## ⚙️ 開発・運用

### 開発コマンド
```bash
pnpm dev          # 単一実行（開発・テスト）
pnpm start        # スケジュール実行（本番運用）
pnpm test         # テスト実行
```

### 品質保証
- **TypeScript Strict**: 厳密な型チェック
- **ESLint**: コード品質管理
- **Jest**: 包括的テストカバレッジ
- **実API検証**: KaitoAPI実環境テスト

## 👥 開発体制

**詳細権限**: [docs/roles/](docs/roles/)

### Manager権限
- **責務**: 指示書作成・Worker統率・品質管理
- **制限**: 実装作業禁止（指示書作成のみ許可）

### Worker権限  
- **責務**: 実装・品質チェック・報告書作成
- **制限**: git操作禁止・出力場所制限

---

**📌 参照体系**: 本要件定義書は概要を提供し、詳細は各専門ドキュメントで管理します。