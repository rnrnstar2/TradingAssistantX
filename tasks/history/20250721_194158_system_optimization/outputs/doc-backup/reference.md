# コマンド・設定リファレンス

X システムの全コマンド、設定ファイル、環境変数、データ構造の完全リファレンスです。

## 🚀 基本コマンド

### システム制御
```bash
# 全システム起動・停止
pnpm run start:all                    # 全システム起動
pnpm run stop:all                     # 全システム停止
pnpm run emergency:stop               # 緊急停止

# 個別コンポーネント制御
pnpm run start:growth-system          # 成長システム起動
pnpm run start:collector              # 情報収集システム起動  
pnpm run start:posting                # 投稿システム起動
pnpm run start:claude                 # Claude統合起動

pnpm run stop:growth-system           # 成長システム停止
pnpm run stop:collector               # 情報収集システム停止
pnpm run stop:posting                 # 投稿システム停止
pnpm run stop:claude                  # Claude統合停止
```

### システム監視
```bash
# 状態確認
pnpm run status                       # 全体状態
pnpm run status:detailed              # 詳細状態
pnpm run status:growth                # 成長システム状態
pnpm run status:collector             # 情報収集システム状態
pnpm run status:posting               # 投稿システム状態
pnpm run status:claude                # Claude統合状態

# パフォーマンス監視
pnpm run metrics:key-indicators       # 主要指標確認
pnpm run dashboard:performance        # パフォーマンスダッシュボード
```

## 🔧 メンテナンス

### 定期メンテナンス
```bash
# メンテナンス実行
pnpm run maintenance:daily            # 日次メンテナンス
pnpm run maintenance:weekly           # 週次メンテナンス
pnpm run maintenance:monthly          # 月次メンテナンス

# データ管理
pnpm run backup:daily                 # 日次バックアップ
pnpm run backup:manual                # 手動バックアップ
pnpm run cleanup:old-data             # 古いデータ削除
pnpm run cleanup:logs                 # ログ削除
```

### 設定管理
```bash
# 設定確認・検証
pnpm run verify:config                # 設定確認
pnpm run validate:config              # 設定検証
pnpm run apply:config                 # 設定適用
```

## 🐛 診断・修復

### システム診断
```bash
# 診断実行
pnpm run diagnose:system              # システム診断
pnpm run diagnose:detailed            # 詳細診断
pnpm run check:errors                 # エラー確認

# 修復実行
pnpm run fix:common-errors            # 一般的エラー修復
pnpm run fix:auth-errors              # 認証エラー修復
pnpm run fix:posting-errors           # 投稿エラー修復
```

### 設定リセット
```bash
# リセット実行
pnpm run reset:config                 # 設定リセット
pnpm run restore:default-config       # デフォルト設定復元
```

## 📊 レポート生成

### 定期レポート
```bash
# レポート生成
pnpm run report:daily                 # 日次レポート
pnpm run report:weekly                # 週次レポート
pnpm run report:monthly               # 月次レポート
```

## 🌍 環境変数

### 必須環境変数
```bash
# API認証
ANTHROPIC_API_KEY="your_anthropic_key"    # Anthropic API キー
X_API_KEY="your_x_api_key"                # X API キー
X_API_SECRET="your_x_api_secret"          # X API シークレット

# 実行モード
NODE_ENV="production"                     # 本番環境設定
X_TEST_MODE="false"                       # テストモード無効
```

### オプション環境変数
```bash
# デバッグ・ログ
DEBUG="collector:*"                       # デバッグ出力設定
TZ="Asia/Tokyo"                          # タイムゾーン設定
```

## 📁 設定ファイル

### 設定ファイル構造
```
x/
└── data/                            # データファイル（統合版）
    ├── account-strategy.yaml        # 成長戦略
    ├── performance-insights.yaml    # パフォーマンス分析
    ├── growth-targets.yaml          # 成長目標
    ├── posting-history.yaml         # 投稿履歴
    └── generated-post.yaml          # 生成投稿
```

### 主要設定ファイル

#### account-strategy.yaml
```yaml
version: "1.0.0"
currentPhase: growth
objectives:
  primary: トレーディング教育コンテンツで信頼性のあるアカウントを構築
contentStrategy:
  themes:
    - リスク管理
    - 市場分析
    - 投資心理
    - 基礎知識
  postingFrequency: 15                # 1日15回投稿
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
```

#### account-strategy.yaml （統合版）
```yaml
# 既存の戦略設定に加えて：
systemConfig:
  autonomous_system:
    max_parallel_tasks: 3
    context_sharing_enabled: true
  claude_integration:
    sdk_enabled: true
    max_context_size: 100000

contentTemplates:
  claude_templates:
    educational:
      goal: "トレーディング教育に役立つ情報を収集"
  post_templates:
    - type: "market-update"
      format: "📊 市場アップデート\n\n{content}"
```

## 📊 データ構造

### 基本データ型

#### AccountStrategy
```typescript
interface AccountStrategy {
  version: string;
  currentPhase: 'growth' | 'engagement' | 'authority' | 'maintenance';
  objectives: {
    primary: string;
    secondary: string[];
    timeline: string;
  };
  contentStrategy: {
    themes: string[];
    postingFrequency: number;        // 固定値: 15
    optimalTimes: string[];
  };
}
```

#### PostHistory
```typescript
interface PostHistory {
  id: string;
  content: string;
  timestamp: number;
  success: boolean;
  error?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  themes?: string[];
}
```

#### GeneratedPost
```typescript
interface GeneratedPost {
  title: string;
  content: string;
  hashtags: string[];
  metadata: {
    quality: number;
    sources: string[];
    timestamp: number;
  };
}
```

#### CollectionResult
```typescript
interface CollectionResult {
  strategy: 'trending' | 'keywords' | 'influencers';
  objective: string;
  timestamp: number;
  results: {
    totalProcessed: number;
    qualityFiltered: number;
    trending?: TrendingTopic[];
    content?: Content[];
  };
}
```

### データファイル例

#### posting-history.yaml
```yaml
- id: "1705123456789"
  content: リスク管理の基本は、損失を限定することです。
  timestamp: 1705123456789
  success: true
  likes: 15
  retweets: 3
  replies: 2
  views: 250
  themes:
    - リスク管理
    - 基礎知識
```

#### collection-results.yaml
```yaml
strategy: trending
objective: リアルタイムトレンド把握
timestamp: 1705123456789
results:
  totalProcessed: 15
  qualityFiltered: 8
  trending:
    - topic: FX相場分析
      rank: 1
      description: 今日の相場動向
```

## 🔄 データ管理

### バックアップ
```bash
# バックアップ実行
pnpm run backup:daily                 # 日次バックアップ
pnpm run backup:manual                # 手動バックアップ
pnpm run backup:file -- --file=posting-history.yaml  # 特定ファイル
```

### クリーンアップ
```bash
# データクリーンアップ
pnpm run cleanup:old-data             # 古いデータ削除
pnpm run cleanup:data -- --older-than=30  # 30日以上前のデータ削除
pnpm run cleanup:logs -- --older-than=7   # 7日以上前のログ削除
```

### 容量管理
```bash
# 容量確認
pnpm run check:data-usage             # データ容量確認
pnpm run check:storage-limits         # 容量制限チェック
pnpm run optimize:storage             # 容量最適化
```

## 🛡️ データ整合性

### 整合性チェック
```bash
# 整合性確認
pnpm run verify:data-integrity        # データ整合性確認
pnpm run fix:data-inconsistencies     # 不整合修復
pnpm run report:data-integrity        # 整合性レポート
```

## 📋 重要な設定値

### 投稿設定
- **投稿頻度**: 15回/日（固定値）
- **最適投稿時間**: 15個の時間帯に分散
- **データ形式**: YAML形式で統一

### 品質基準
- **最低品質スコア**: 設定により調整可能
- **重複チェック**: 投稿前に自動実行
- **エラー処理**: 基本的なエラーハンドリングのみ

### 保持期間
- **投稿履歴**: 365日
- **パフォーマンス**: 90日  
- **収集結果**: 30日
- **ログ**: 7日
- **バックアップ**: 30日

---

**注意**: 設定変更後は必ずシステムの再起動が必要です。各コマンドの詳細オプションは `--help` フラグで確認できます。