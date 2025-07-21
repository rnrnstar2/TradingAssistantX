# X自動化システム命名規則統一ガイド

## 📋 概要

TradingAssistantX（X自動化システム）全体で統一された命名規則を定義し、一貫性を保つためのガイドラインです。

## 🗂️ ファイル・ディレクトリ命名規則

### 指示書・タスク関連
- **指示書**: `TASK-XXX-[feature-name].md`
- **報告書**: `REPORT-XXX-[feature-name].md`
- **出力ファイル**: `TASK-XXX-[name]-output.[ext]`
- **分析結果**: `TASK-XXX-[name]-analysis.[ext]`

### プロジェクト・ブランチ関連
- **メインブランチ**: `main`
- **開発ブランチ**: `dev`
- **機能ブランチ**: `feature-[feature-name]`
- **修正ブランチ**: `fix-[bug-description]`

### 出力管理
- **承認出力先**: `tasks/[TIMESTAMP]/outputs/`
- **分析結果**: `tasks/[TIMESTAMP]/analysis/`
- **報告書**: `tasks/[TIMESTAMP]/reports/`
- **一時ファイル**: `tasks/[TIMESTAMP]/temporary/`

## 🧩 コンポーネント・モジュール命名規則

### Node.js コンポーネント
- **モジュール**: `PascalCase` （例: `ContentGenerator`, `XApiManager`）
- **ファイル名**: `kebab-case.ts` （例: `content-generator.ts`, `x-api-manager.ts`）
- **型定義**: `[ModuleName]Config` （例: `ContentGeneratorConfig`）

### TypeScript
- **型定義**: `PascalCase` （例: `PostContent`, `AccountStrategy`）
- **インターフェース**: `I[Name]` （例: `IPostContent`, `IAccountStrategy`）
- **変数**: `camelCase` （例: `postingFrequency`, `contentTheme`）
- **関数**: `camelCase` （例: `generateContent`, `schedulePost`）
- **定数**: `UPPER_SNAKE_CASE` （例: `MAX_POSTS_PER_DAY`, `DEFAULT_POSTING_INTERVAL`）

### X API通信
- **API関数**: `camelCase` （例: `postTweet`, `getUserProfile`）
- **レスポンス型**: `PascalCase` （例: `TweetResponse`, `UserProfile`）
- **エラー型**: `PascalCase` （例: `XApiError`, `RateLimitError`）

## 🔧 API・通信関連

### X Platform API
- **エンドポイント**: `kebab-case` （例: `post-tweet`, `get-user-timeline`）
- **リクエスト型**: `PascalCase` （例: `PostTweetRequest`, `UserTimelineRequest`）
- **レスポンス型**: `PascalCase` （例: `PostTweetResponse`, `UserTimelineResponse`）

## 📊 データベース・設定関連

### YAML設定ファイル
**🚨 重要**: 全ての設定ファイルは `data/` ディレクトリ直下のみに配置

#### ファイル命名規則
- **設定ファイル**: `{機能名}-config.yaml` （例: `autonomous-config.yaml`, `account-config.yaml`）
- **戦略ファイル**: `{機能名}-strategy.yaml` （例: `content-strategy.yaml`, `growth-strategy.yaml`）
- **データファイル**: `{機能名}-data.yaml` （例: `posting-data.yaml`, `metrics-data.yaml`）
- **履歴ファイル**: `{機能名}-history.yaml` （例: `posting-history.yaml`, `performance-history.yaml`）

#### 配置ルール
- **✅ 配置場所**: `data/` ディレクトリ直下のみ
- **🚫 禁止場所**: `config/`, `settings/`, ルートディレクトリ等

#### 設定内容
- **設定キー**: `camelCase` （例: `postingFrequency`, `currentPhase`）
- **環境変数**: `UPPER_SNAKE_CASE` （例: `ANTHROPIC_API_KEY`, `X_API_SECRET`）

### ログ・出力
- **ログファイル**: `[service]-[date].log` （例: `x-automation-20250120.log`）
- **出力ファイル**: `[purpose]-[timestamp].[ext]` （例: `content-analysis-20250120-143000.json`）

## 🚀 スクリプト・コマンド関連

### npm scripts
- **開発**: `dev`, `start:dev`
- **本番**: `build`, `start`
- **テスト**: `test`, `test:unit`, `test:e2e`
- **リント**: `lint`, `lint:fix`
- **型チェック**: `type-check`, `check-types`

### X自動化システムコマンド
- **Manager起動**: `pnpm run manager`
- **Worker起動**: `pnpm run worker`
- **システム起動**: `pnpm run start:all`
- **緊急停止**: `pnpm run emergency:stop`

## 🏗️ プロジェクト構造

### X自動化システム構造
```
src/
├── core/            # 自律実行エンジン
├── lib/             # Claude連携・X API
├── types/           # 型定義
└── scripts/         # 実行スクリプト
data/
├── account-strategy.yaml    # アカウント戦略
├── content-patterns.yaml   # コンテンツパターン
├── growth-targets.yaml     # 成長目標
└── posting-history.yaml    # 投稿履歴
docs/
├── common/          # 共通設定・定数
├── guides/          # 実装ガイド
├── mvp-constraints/ # MVP 制約
└── roles/           # 役割定義
tasks/
└── outputs/         # 承認された出力場所
```

## 📝 コメント・ドキュメント

### コードコメント
- **関数**: JSDoc 形式
- **複雑なロジック**: 一行コメント
- **TODO**: `// TODO: [description]`
- **FIXME**: `// FIXME: [description]`

### ドキュメント
- **README**: `README.md`
- **ガイド**: `[topic]-guide.md`
- **分析**: `[topic]-analysis.md`
- **仕様**: `[topic]-specification.md`

## ⚠️ 禁止事項

### 避けるべき命名
- **日本語のローマ字**: `torihiki` → `trading`
- **省略語**: `usr` → `user`, `cfg` → `config`
- **数字のみ**: `data1`, `data2` → `accountData`, `priceData`
- **動詞の連続**: `getSetConfig` → `getConfig`, `setConfig`

### 推奨しない慣習
- **Hungarian notation**: `strName` → `name`
- **型接頭辞**: `typeUser` → `User`
- **無意味な接頭辞**: `myVariable` → `variable`

## 🔍 チェックリスト

### ファイル作成時
- [ ] 適切な命名規則に従っているか
- [ ] 既存のファイルと一貫性があるか
- [ ] 出力先が承認された場所か
- [ ] 拡張子が適切か

### コード作成時
- [ ] 変数・関数名が意図を明確に表現しているか
- [ ] 型定義が適切に命名されているか
- [ ] コメントが必要な箇所に適切に記載されているか
- [ ] 他の開発者が理解しやすい名前か

## 📋 参照先

- **システム定数**: [system-constants.md](system-constants.md)
- **ファイルパス**: [file-paths.md](file-paths.md)
- **出力管理**: [../guides/output-management-rules.md](../guides/output-management-rules.md)

---

**最終更新**: 2025-01-20  
**管理者**: TradingAssistantX Development Team