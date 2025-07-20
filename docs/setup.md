# セットアップガイド

## 概要

X システムは、X プラットフォーム上でトレーディング教育コンテンツを自動投稿する統合システムです。このガイドでは、システムの初期セットアップから基本的な設定までを説明します。

## 🚀 クイックスタート

### 1. 環境変数設定

必要な環境変数を設定します：

```bash
# API認証（必須）
export ANTHROPIC_API_KEY="your_anthropic_api_key"
export X_API_KEY="your_x_api_key"
export X_API_SECRET="your_x_api_secret"

# 実行環境設定
export NODE_ENV="production"
export X_TEST_MODE="false"  # 本番環境は false、テスト環境は true

# オプション設定
export TZ="Asia/Tokyo"
export DEBUG="collector:*"
```

### 2. 基本セットアップ

```bash
# xディレクトリに移動
cd x

# 依存関係インストール
pnpm install

# 必要なディレクトリを作成
mkdir -p data logs

# 初期設定実行
pnpm run setup
```

## 📝 設定ファイル（YAML）

### 1. アカウント戦略設定

`data/account-strategy.yaml` を作成：

```yaml
version: "1.0.0"
currentPhase: growth
objectives:
  primary: トレーディング教育コンテンツで信頼性のあるアカウントを構築
  secondary: 質の高いフォロワーとのエンゲージメント構築

contentStrategy:
  themes:
    - リスク管理
    - 市場分析
    - 投資心理
    - 基礎知識
  postingFrequency: 15  # 1日15回投稿
  optimalTimes:
    - "06:00"
    - "07:30"
    - "09:00"
    - "10:30"
    - "12:00"
    - "13:30"
    - "15:00"
    - "16:30"
    - "18:00"
    - "19:30"
    - "21:00"
    - "22:30"
    - "23:30"
    - "01:00"
    - "02:30"
  toneOfVoice: 教育的で親しみやすい
  
targetAudience:
  demographics:
    - 20-40代
    - 投資初心者
    - 兼業トレーダー
  interests:
    - 投資
    - トレーディング
    - 資産運用
    - 副業

constraints:
  maxPostsPerDay: 15
  minQualityScore: 7.0
  brandSafety:
    - 投資勧誘禁止
    - 誇大表現禁止
    - 根拠のない情報禁止
  avoidTopics:
    - 確実に儲かる話
    - 投資勧誘
    - 誇大表現
```

### 2. 投稿テンプレート設定

投稿テンプレートは `data/account-strategy.yaml` の `contentTemplates` セクションで設定：

```yaml
templates:
  - type: educational
    category: リスク管理
    format: |
      【{topic}】
      {content}
      
      #トレーディング #投資教育 #リスク管理
    maxLength: 280
    
  - type: educational
    category: 市場分析
    format: |
      📊 {topic}
      {content}
      
      #市場分析 #トレーディング #投資
    maxLength: 280
    
  - type: educational
    category: 基礎知識
    format: |
      💡 {topic}
      {content}
      
      #投資初心者 #トレーディング基礎
    maxLength: 280
    
  - type: educational
    category: 投資心理
    format: |
      🧠 {topic}
      {content}
      
      #投資心理 #トレーディング #メンタル
    maxLength: 280
```

### 3. システム運用設定

システム運用設定は `data/account-strategy.yaml` の `systemConfig` セクションで設定：

```yaml
keywords:
  - FX
  - トレーディング
  - 投資
  - リスク管理
  - テクニカル分析
  - 市場分析
  - 資産運用
  - 投資心理

avoidKeywords:
  - 確実に儲かる
  - 必勝法
  - 絶対
  - 100%勝てる

qualityThreshold: 0.7
maxResultsPerKeyword: 10
collectionInterval: 3600000  # 1時間間隔（ミリ秒）

strategies:
  - name: trending
    enabled: true
    maxResults: 10
    updateInterval: 3600000
    
  - name: keywords
    enabled: true
    maxResults: 20
    qualityThreshold: 0.8
    
  - name: influencers
    enabled: true
    maxResults: 15
    qualityThreshold: 0.7
```

### 4. 成長目標設定

`data/growth-targets.yaml` を作成：

```yaml
version: "1.0.0"
lastUpdated: "2024-01-15T10:00:00Z"

followers:
  daily: 2      # 1日2人の新規フォロワー
  weekly: 14    # 週14人
  monthly: 60   # 月60人
  quarterly: 180 # 四半期180人

engagement:
  likesPerPost: 5       # 投稿あたり平均いいね数
  retweetsPerPost: 1    # 投稿あたり平均リツイート数
  repliesPerPost: 1     # 投稿あたり平均リプライ数
  engagementRate: 3.0   # エンゲージメント率（%）

posting:
  successRate: 95.0     # 投稿成功率（%）
  averageQuality: 7.5   # 平均品質スコア
  dailyPostCount: 15    # 1日の投稿数

monitoring:
  systemUptime: 99.0    # システム稼働率（%）
  apiResponseTime: 30   # API応答時間（秒）
  errorRate: 5.0        # エラー率（%）
```

## 🔐 認証設定

### 1. Claude Code SDK認証

Claude Code SDK を使用する場合：

```bash
# Claude Code にログイン
claude auth login

# 認証状態確認
claude auth status

# APIキー設定確認
claude config get api-key
```

### 2. X API認証

X API の認証設定：

1. X Developer Portal でアプリケーションを作成
2. API Key と API Secret を取得
3. 環境変数に設定：

```bash
export X_API_KEY="your_api_key"
export X_API_SECRET="your_api_secret"
```

### 3. Anthropic API認証

Anthropic API の認証設定：

1. Anthropic Console でAPIキーを作成
2. 環境変数に設定：

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

## 🛠️ 初期セットアップ手順

### 1. システム初期化

```bash
# 1. プロジェクトディレクトリに移動
cd x

# 2. 必要なディレクトリを作成
mkdir -p data config logs

# 3. 依存関係をインストール
pnpm install

# 4. 設定ファイルを作成（上記のYAML設定を参考に）
# data/account-strategy.yaml （統合版 - systemConfig, contentTemplates含む）
# data/growth-targets.yaml

# 5. 環境変数を設定
# .env ファイルを作成するか、直接export
```

### 2. 設定の検証

```bash
# 設定ファイルの構文チェック
pnpm run verify:config

# 設定内容の検証
pnpm run validate:config

# 認証設定の確認
pnpm run check:auth
```

### 3. テスト実行

```bash
# テストモードで実行
export X_TEST_MODE="true"

# システムの動作確認
pnpm run test:system

# 個別コンポーネントのテスト
pnpm run test:collector
pnpm run test:posting
pnpm run test:claude
```

## 📊 設定確認

### 1. 必須設定チェックリスト

- [ ] 環境変数設定完了
- [ ] `data/account-strategy.yaml` 作成
- [ ] `data/account-strategy.yaml` にcontentTemplates設定追加
- [ ] `data/account-strategy.yaml` にsystemConfig設定追加
- [ ] `data/growth-targets.yaml` 作成
- [ ] Claude Code SDK認証完了
- [ ] X API認証完了
- [ ] Anthropic API認証完了

### 2. 設定値の確認

```bash
# 現在の設定を確認
pnpm run config:show

# 投稿頻度の確認（15回/日であることを確認）
pnpm run config:check-posting-frequency

# 品質基準の確認
pnpm run config:check-quality-settings
```

## 🚀 システム起動

### 1. 全システム起動

```bash
# 全コンポーネントを起動
pnpm run start:all

# 起動状態の確認
pnpm run status
```

### 2. 個別システム起動

```bash
# 成長システム
pnpm run start:growth-system

# 情報収集システム
pnpm run start:collector

# 投稿システム
pnpm run start:posting

# Claude統合
pnpm run start:claude
```

### 3. 動作確認

```bash
# システム全体の状態確認
pnpm run status:detailed

# 主要指標の確認
pnpm run metrics:key-indicators

# 最初のテスト投稿実行
pnpm run test:first-post
```

## ⚠️ 重要な注意事項

### 1. 設定値の統一

- **投稿頻度**: 必ず15回/日に設定
- **データ形式**: 全設定ファイルはYAML形式で統一
- **品質基準**: 最低品質スコア7.0以上

### 2. セキュリティ

- APIキーは環境変数で管理
- 設定ファイルにAPIキーを直接記載しない
- テストモードと本番モードを適切に切り替え

### 3. 監視

- システム起動後は定期的な状態確認を実施
- エラーログの監視を行う
- パフォーマンス指標の定期チェック

## 📈 次のステップ

セットアップ完了後：

1. **運用開始**: `pnpm run start:all` でシステムを起動
2. **監視設定**: 定期的な状態確認とメンテナンス
3. **最適化**: パフォーマンスデータに基づく設定調整

セットアップに問題が発生した場合は、`pnpm run diagnose:system` コマンドで詳細診断を実行してください。

---

**注意**: このガイドは基本的なセットアップ手順を示しています。より詳細な設定や高度な機能については、各コンポーネントの個別ドキュメントを参照してください。