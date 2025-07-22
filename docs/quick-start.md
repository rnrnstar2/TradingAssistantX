# TradingAssistantX クイックスタート

## ⚠️ 最重要原則：ディレクトリ・ファイル構造の絶対厳守

**ハルシネーション防止の根幹は、定義された構造の厳格な遵守にある。**

### 構造厳守の3原則
1. **要件定義に記載されたディレクトリ・ファイルのみ使用可能**
2. **新規ファイル・ディレクトリの作成は原則禁止**
3. **定期実行による構造の逸脱は integrity-checker.ts が自動検出・拒否**

この原則を破ることは、システム全体の信頼性を損なう最も重大な違反行為である。

## 1. 環境セットアップ

### 前提条件
- Node.js 18以上
- pnpm
- X（Twitter）アカウント

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/your-username/TradingAssistantX.git
cd TradingAssistantX

# 依存関係のインストール
pnpm install
```

## 2. X API認証設定

### OAuth 1.0a認証の設定

TradingAssistantXはOAuth 1.0aを使用してX APIに接続します。OAuth 1.0aは安定した認証プロトコルで、Xの投稿API（v1.1）に最適な認証方式です。

#### アプリケーション作成

1. [X Developer Portal](https://developer.x.com/en/portal/dashboard) にアクセス
2. 「Create Project」をクリック（プロジェクト > アプリの順で作成）
3. プロジェクト名を設定（例：TradingAssistantX-Project）
4. アプリケーション名を設定（例：TradingAssistantX）
5. アプリケーション用途を選択
6. 利用規約に同意してアプリを作成

#### Consumer Key/Secret取得

1. 作成したアプリの「Keys and Tokens」タブに移動
2. **Consumer Keys**セクションで以下を取得：
   - **API Key (Consumer Key)**: アプリケーションを識別
   - **API Key Secret (Consumer Secret)**: アプリケーション認証用シークレット

#### Access Token/Secret生成

1. 同じ「Keys and Tokens」タブの**Authentication Tokens**セクションで：
2. 「Generate」をクリックしてAccess Token/Secret を生成
3. 以下の情報を記録：
   - **Access Token**: ユーザー認証トークン
   - **Access Token Secret**: ユーザー認証シークレット

#### アプリ権限設定

1. 「Settings」タブに移動
2. 「App permissions」セクションで「Edit」をクリック  
3. **Read and Write**を選択（投稿機能に必要）
4. 必要に応じて**Direct Messages**も選択
5. 変更を保存

### 環境変数の設定

以下の環境変数を設定してください：

```bash
# X (Twitter) OAuth 1.0a Credentials
X_CONSUMER_KEY=your_consumer_key_here
X_CONSUMER_SECRET=your_consumer_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Optional: Test Mode
X_TEST_MODE=false
```

#### 設定方法

**方法1: .envファイル使用**
```bash
# プロジェクトルートに .env ファイルを作成
cp .env.example .env
# エディタで値を設定
nano .env
```

**方法2: 環境変数で直接設定**
```bash
export X_CONSUMER_KEY=your_consumer_key_here
export X_CONSUMER_SECRET=your_consumer_secret_here
export X_ACCESS_TOKEN=your_access_token_here
export X_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

### 認証設定のテスト

#### セットアップヘルパーの実行
```bash
# OAuth 1.0a設定ヘルパーを実行
npx tsx src/scripts/oauth1-setup-helper.ts
```

このスクリプトは以下を行います：
1. 環境変数の確認と検証
2. OAuth 1.0a署名の生成テスト  
3. X API への接続テスト
4. 認証情報の保存（オプション）

#### セットアップ出力例
```
🔧 OAuth 1.0a Setup Helper
📋 環境変数チェック中...
✅ Consumer Key: 設定済み
✅ Consumer Secret: 設定済み  
✅ Access Token: 設定済み
✅ Access Token Secret: 設定済み

🔐 OAuth 1.0a署名テスト...
✅ 署名生成: 成功

🌐 X API接続テスト...
✅ API接続: 成功
👤 認証ユーザー: @your_username

🎉 OAuth 1.0a設定完了！
```

#### 接続テストの実行
```bash
# OAuth 1.0a接続テスト
npx tsx src/scripts/oauth1-test-connection.ts
```

### トラブルシューティング

#### 401 Unauthorized
**症状**: 
```
Error: 401 Unauthorized - Invalid or expired token
```

**解決策**:
1. **環境変数の確認**:
   ```bash
   echo "Consumer Key: $X_CONSUMER_KEY"
   echo "Consumer Secret: $X_CONSUMER_SECRET"  
   echo "Access Token: $X_ACCESS_TOKEN"
   echo "Access Token Secret: $X_ACCESS_TOKEN_SECRET"
   ```

2. **認証情報の再生成**:
   - X Developer Portalで新しいAccess Token/Secretを生成
   - 古いトークンを無効化
   - 環境変数を更新

3. **アプリ権限の確認**:
   - 「Read and Write」権限が設定されているか確認
   - 権限変更後は新しいAccess Tokenが必要

#### 403 Forbidden
**症状**:
```
Error: 403 Forbidden - Read-only application cannot POST
```

**解決策**:
1. **権限設定の確認**:
   - アプリ設定で「Read and Write」が選択されているか確認
   - 権限変更後は**必ずAccess Token/Secretを再生成**

2. **新しいトークン生成**:
   ```bash
   # 権限変更後は必ずトークンを再生成
   # X Developer Portal > Keys and Tokens > Regenerate
   ```

#### 署名エラー (Invalid signature)
**症状**:
```
Error: Invalid signature - OAuth signature verification failed
```

**解決策**:
1. **システム時刻の確認**:
   ```bash
   # システム時刻が正確か確認
   date
   # 必要に応じて時刻同期
   sudo sntp -sS time.apple.com  # macOS
   ```

2. **認証情報の文字エンコーディング**:
   - 認証情報にスペース・改行が含まれていないか確認
   - 特殊文字が正しくエンコードされているか確認

3. **環境変数の再設定**:
   ```bash
   # 認証情報をクリーンに再設定
   unset X_CONSUMER_KEY X_CONSUMER_SECRET X_ACCESS_TOKEN X_ACCESS_TOKEN_SECRET
   # 再設定
   source .env
   ```

### セキュリティ対策

#### 認証情報の保護
- **絶対にコードに直接書き込まない**
- `.env` ファイルは `.gitignore` に追加済みか確認
- 本番環境では環境変数またはシークレット管理サービスを使用

#### アクセス制限
- 必要最小限の権限のみ設定
- 開発・テスト・本番環境で異なる認証情報を使用
- 定期的な認証情報のローテーション

#### 監視とログ
- API使用量の定期監視
- 異常なアクセスパターンの検知
- エラーログの適切な記録（認証情報は除く）

## 3. 初回実行

### 権限確認

実行前に必ず権限を確認してください：

```bash
echo "ROLE: $ROLE" && git branch --show-current
```

権限に応じて以下のドキュメントを参照：
- Manager権限: `docs/roles/manager-role.md`
- Worker権限: `docs/roles/worker-role.md`

### 実行コマンド

#### 開発実行（単一実行）
```bash
pnpm dev
```
- 1回だけ実行して終了
- 開発・デバッグ用
- すぐに結果を確認したい場合

#### 本番実行（ループ実行）
```bash
pnpm start
```
- 1日15回の定時実行
- 最適投稿時間に自動実行
- 継続的な運用向け

## 4. システム概念とアーキテクチャ

### 🚨 重要：実データ運用原則

**モックデータ・テストモード使用厳禁**
- ✅ 実データ収集のみ使用（REAL_DATA_MODE=true）
- 🚫 モック関数・テストモード禁止
- 📊 収集失敗時もモックは使わず、エラー処理で対応

### Claude Code SDK自律システム

TradingAssistantXは、Claude Code SDKが完全に自律的に意思決定を行うシステムです：

- **自律的テーマ決定**: Claude が市場分析して最適テーマを決定
- **自律的データ収集**: 必要データを自動収集・分析
- **自律的投稿作成**: Claude Code SDK が全意思決定を担当し最適投稿を生成
- **継続的最適化**: 実行結果から学習し品質向上

**革新的中心技術**: Claude Code SDK による意思決定の完全委託

### 🏗️ システム設計原則

**自律的意思決定と拡張性の両立**
- 🧠 **意思決定エンジン**: 状況に応じた動的戦略選択
- 🔗 **疎結合設計**: データソース独立性による高拡張性
- 📊 **統一インターフェース**: CollectionResult型でデータ統合
- 🎛️ **YAML駆動**: 設定変更のみでシステム動作制御

### 📁 詳細ディレクトリ構造

#### /src ディレクトリ（最適化済み）
```
src/
├── core/        # コアシステム
│   ├── autonomous-executor.ts     # 自律実行エンジン
│   ├── decision-engine.ts        # 意思決定エンジン
│   ├── loop-manager.ts           # ループ管理
│   └── true-autonomous-workflow.ts # 真の自律ワークフロー
├── collectors/  # データ収集
│   ├── rss-collector.ts          # RSS収集（MVP）
│   ├── playwright-account.ts     # アカウント分析専用
│   └── base-collector.ts         # 基底クラス
├── services/    # ビジネスロジック
│   ├── content-creator.ts        # 投稿生成
│   ├── data-hierarchy-manager.ts # 階層データ管理
│   ├── performance-analyzer.ts   # 分析・評価
│   └── x-poster.ts              # X投稿
├── utils/       # ユーティリティ（最適化済み）
│   ├── yaml-manager.ts         # YAML高度操作
│   ├── yaml-utils.ts           # YAML基本操作
│   ├── context-compressor.ts   # コンテキスト圧縮
│   ├── error-handler.ts        # エラーハンドリング
│   ├── file-size-monitor.ts    # ファイルサイズ監視
│   └── monitoring/
│       └── health-check.ts     # システムヘルスチェック
├── lib/         # ライブラリ
│   └── daily-action-planner.ts # 日次アクション計画
└── scripts/     # 実行スクリプト
    ├── main.ts      # ループ実行（pnpm start）
    ├── dev.ts       # 単一実行（pnpm dev）
    └── core-runner.ts # 共通実行ロジック
```

### 🧠 Claude Code SDK意思決定カタログ

システムが自律的に選択可能な戦略一覧：

#### 1. データ収集戦略
- **RSS集中収集** (`collectors/rss-collector.ts`): 安定情報収集、API制限回避
- **アカウント分析** (`collectors/playwright-account.ts`): 自己状況把握、戦略調整
- **複合データ収集** (将来拡張): 多角的情報、独自性高コンテンツ

#### 2. コンテンツ生成戦略
- **教育重視型**: フォロワー初心者中心、信頼性向上
- **トレンド対応型**: 話題性重視、短期エンゲージメント向上
- **分析特化型**: 市場複雑時、権威性向上

#### 3. 投稿タイミング戦略
- **定時投稿**: 安定習慣形成、継続エンゲージメント
- **機会的投稿**: 重要ニュース時、注目度最大化
- **最適化投稿**: データ分析後、ROI最大化

#### アカウント成長段階別戦略
1. **集中特化段階**: 投資基礎教育特化（エンゲージメント低・テーマ分散時）
2. **段階的拡張段階**: 核テーマ60% + 関連テーマ40%（安定エンゲージメント時）
3. **多様化展開段階**: 動的戦略適用（高エンゲージメント・複数実績時）

### 🎯 3次元判断マトリクス

**優先順位**: 外部環境 > エンゲージメント状態 > 成長段階

```
[外部環境] 緊急対応 → 分析特化型 + 機会的投稿
[通常環境] → [エンゲージメント判断]
  ├── 低エンゲージメント → 集中特化段階強制 + トレンド対応強化
  ├── 安定エンゲージメント → 成長段階適用
  │   ├── 集中特化段階 → RSS集中 + 教育重視 + 定時投稿
  │   ├── 段階的拡張段階 → 複合収集 + バランス型 + 最適化投稿
  │   └── 多様化展開段階 → 戦略的収集 + 分析特化 + 機会的投稿
  └── 高エンゲージメント → 現在戦略維持 + 質的向上集中
```

### 🔄 自律実行フロー

```
[1] 現在状況分析 (account-status.yaml・active-strategy.yaml読み込み)
[2] アカウント成長段階判定 + 戦略選択
[3] データ収集実行 (選択されたCollector起動)
[4] コンテンツ生成 (選択された戦略でcontent-creator実行)
[5] 品質確認・投稿実行 (x-poster.ts)
[6] 結果記録・学習データ更新 (data/learning/)
```

### 🎨 ブランディング戦略設定

**成長段階別ブランディング**
- **初期段階（0-1000 フォロワー）**: 単一専門テーマに集中
  - 推奨：「投資初心者向け基礎教育」特化
  - 投稿の 80%を同一テーマカテゴリに統一
- **成長段階（1000-5000 フォロワー）**: 関連テーマに段階的拡張
  - 核となるテーマ（60%）+ 関連テーマ（40%）
- **確立段階（5000+フォロワー）**: 多様なテーマ対応
  - 現在の意思決定フローを適用

### 🚀 MVP構成とYAML駆動開発

#### RSS Collector中心の段階的実装
- **Phase 1 (MVP)**: RSS Collectorのみで投資教育コンテンツを収集・生成
- **将来拡張**: API、Community、Webスクレイピングなど多様なデータソースを段階的に追加

#### 疎結合設計による拡張性
- **データソース独立性**: 各Collector完全独立動作、相互依存なし
- **統一インターフェース**: CollectionResult型で新規データソース追加が容易
- **設定駆動制御**: YAML変更のみでデータソースの有効/無効制御
- **影響最小化**: 新Collector追加時の既存コード影響を最小化

#### RSS Collectorの特徴
- 主要金融メディアのRSSフィードから効率収集
- 構造化データで安定した情報品質確保
- **動的クエリ対応**: Google News検索と連携、テーマに応じた柔軟な情報収集
  - 固定URLとクエリベースの両方式をサポート
  - YAMLで「query」フィールドを指定すると自動的に検索URLを生成
  - Claude Code SDKが自律的に最適な検索条件を選択可能

#### アカウント分析（Playwright限定利用）
- **専用用途**: 自アカウント分析（フォロワー数、エンゲージメント率）のみ
- **分離設計**: 情報収集（RSS）と完全独立
- **API制限回避**: X API制限を回避した確実なデータ取得

### 📊 階層型データ管理（3層構造）

```
data/
├── config/         # システム設定（読み取り専用）
├── current/        # ホットデータ（直近7日分、最大1MB、即座の意思決定用）
├── learning/       # ウォームデータ（90日分の分析済みインサイト、最大10MB）
└── archives/       # コールドデータ（全投稿の永続保存、容量無制限）
```

**自動階層移動**:
- 古いデータは自動的に下位層へ移動し、分析結果のみ保持
- 日次: 投稿生データを archives/posts/ へ
- 週次: 古い current データを learning へ
- 月次: 古い learning データを archives/insights/ へ

### 🔒 ハルシネーション防止機構

**許可された出力先（厳格制限）**
```yaml
# 書き込み許可ディレクトリ
allowed_write_paths:
  - data/current/    # 現在状態のみ
  - data/learning/   # 学習データ
  - data/archives/   # アーカイブ
  - tasks/outputs/   # 実行結果出力

# 書き込み禁止（読み取り専用）
readonly_paths:
  - src/             # ソースコード
  - data/config/     # 設定ファイル
  - tests/           # テストコード
  - docs/            # ドキュメント
```

**実行前後の検証フロー**:
1. **構造検証**: 要件定義のディレクトリ構造と完全一致確認
2. **ファイル数制限**: data/current/ は最大 10 ファイルまで
3. **階層別サイズ制限**: current/(1MB) / learning/(10MB) / archives/(無制限)
4. **命名規則**: 要件定義に記載されたファイル名のみ使用可

## 5. 動作確認

### 🔍 実行整合性チェック

システムは実行前後で自動的に整合性を検証します：

```bash
# 手動での整合性チェック実行
npx tsx src/utils/integrity-checker.ts
```

**検証内容**:
- ディレクトリ構造の要件定義との一致確認
- ファイル数・サイズ制限の検証
- 許可された出力先のみ使用されているか確認
- 命名規則の遵守確認

### 正常動作の確認方法

1. **初回実行の確認**
   ```bash
   # 開発モードで実行
   pnpm dev
   ```

2. **実行ログ確認（必須）**
   ```bash
   # 実行ログを確認（整合性監査用）
   cat data/current/execution-log.yaml
   ```

3. **投稿結果の確認**
   ```bash
   # 本日の投稿記録を確認
   cat data/current/today-posts.yaml
   ```

4. **アカウント状態の確認**
   ```bash
   # 現在のアカウント状態を確認
   cat data/current/account-status.yaml
   ```

5. **階層型データの確認**
   ```bash
   # 各層のデータ状態を確認
   ls -la data/current/    # ホットデータ（最新7日）
   ls -la data/learning/   # ウォームデータ（90日分分析結果）
   ls -la data/archives/   # コールドデータ（全履歴）
   ```

### よくあるエラーと対処法

#### 🚨 構造違反エラー（重要）
```
Error: Directory structure validation failed
Error: Unauthorized file creation attempt
Error: File size limit exceeded
```
**対処法**: 
1. 要件定義書の構造と一致しているか確認
2. 許可された出力先のみ使用しているか確認
3. ファイル数・サイズ制限を確認
4. 整合性チェック実行: `npx tsx src/utils/integrity-checker.ts`

#### 🚫 モックデータエラー
```
Error: Mock data usage detected
Error: Test mode is not allowed
```
**対処法**: 
1. 実データ収集モードの確認: `REAL_DATA_MODE=true`
2. モック関数の使用を停止
3. テストモード設定を削除

#### API認証エラー
```
Error: X API authentication failed
```
**対処法**: 環境変数の設定を確認し、接続テストを再実行

#### データ収集エラー
```
Error: Failed to collect RSS data
```
**対処法**: インターネット接続を確認し、RSSソースの設定を確認

#### 投稿制限エラー
```
Error: Rate limit exceeded
```
**対処法**: しばらく待機後、再実行（15分程度）

#### YAMLパースエラー
```
Error: Failed to parse YAML file
```
**対処法**: YAMLファイルの構文を確認（インデント、コロンなど）

#### 階層型データエラー
```
Error: Data migration failed
Error: Layer size limit exceeded
```
**対処法**: 
1. 各層のサイズ制限確認
2. 自動データ移行の実行確認
3. アーカイブ処理の状態確認

### 診断ツールの使用

問題が解決しない場合は、診断ツールを使用：

```bash
# 構造整合性の診断
npx tsx src/utils/integrity-checker.ts

# 階層型データの診断
npx tsx src/services/data-optimizer.ts --diagnose

# API認証の詳細診断
DEBUG=oauth1a npx tsx src/scripts/oauth1-test-connection.ts

# 認証プロセスの詳細ログ
X_DEBUG=true npx tsx src/scripts/oauth1-setup-helper.ts

# データ収集の診断
npx tsx src/collectors/rss-collector.ts --test

# アカウント分析の診断
npx tsx src/collectors/playwright-account.ts --test
```

### サポート

設定に問題がある場合：

1. **診断スクリプトの実行**
2. **X API Status の確認**: [X API Status](https://api.twitterstat.us/)
3. **Developer Portal の確認**: アプリの設定と制限状況
4. **コミュニティサポート**: [X Developer Community](https://twittercommunity.com/)

---

## 📋 セットアップ完了チェックリスト

システムを開始する前に、以下の項目を確認してください：

### ✅ 基本セットアップ
- [ ] Node.js 18以上、pnpm がインストール済み
- [ ] 依存関係がインストール済み（`pnpm install` 完了）
- [ ] X API認証情報が正しく設定済み
- [ ] OAuth 1.0a接続テストが成功

### ✅ 重要原則の理解
- [ ] **構造厳守の3原則**を理解
- [ ] **モックデータ使用禁止**を理解
- [ ] **疎結合設計原則**を理解
- [ ] **階層型データ管理（3層構造）**を理解
- [ ] **ハルシネーション防止機構**を理解

### ✅ ディレクトリ構造の確認
- [ ] `data/config/` 配下の設定ファイルを確認済み
- [ ] `data/current/` が空または初期状態
- [ ] `data/learning/` と `data/archives/` の構造を理解
- [ ] 書き込み許可・禁止ディレクトリを理解

### ✅ 実行準備完了
- [ ] `pnpm dev` コマンドで単一実行テスト成功
- [ ] 実行ログ（`data/current/execution-log.yaml`）を確認
- [ ] 整合性チェックツールの実行方法を理解
- [ ] エラー発生時の対処法を理解

### 🚀 運用開始
すべてのチェック項目が完了したら：
```bash
# 継続運用の開始（1日15回の定時実行）
pnpm start
```

**重要事項の再確認**:
- **OAuth 1.0a認証情報は機密情報**：適切に管理し、第三者と共有しない
- **REAL_DATA_MODE=true** を常に維持（モックデータ厳禁）
- **要件定義にないファイル作成は自動拒否**される
- **構造違反は最も重大な違反行為**として扱われる