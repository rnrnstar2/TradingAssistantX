# 命名規則統一ガイド

## 📋 概要

プロジェクト全体で統一された命名規則を定義し、一貫性を保つためのガイドラインです。

## 🗂️ ファイル・ディレクトリ命名規則

### 指示書・タスク関連
- **指示書**: `TASK-XXX-[feature-name].md`
- **報告書**: `REPORT-XXX-[feature-name].md`
- **出力ファイル**: `TASK-XXX-[name]-output.[ext]`
- **分析結果**: `TASK-XXX-[name]-analysis.[ext]`

### プロジェクト・ブランチ関連
- **メインブランチ**: `main`
- **開発ブランチ**: `dev`
- **機能ブランチ**: `issue-[issue-number]-[feature-name]`
- **修正ブランチ**: `fix-[issue-number]-[bug-description]`

### 出力管理
- **承認出力先**: `tasks/[TIMESTAMP]/outputs/`
- **分析結果**: `tasks/[TIMESTAMP]/analysis/`
- **報告書**: `tasks/[TIMESTAMP]/reports/`
- **一時ファイル**: `tasks/[TIMESTAMP]/temporary/`

## 🧩 コンポーネント・モジュール命名規則

### React コンポーネント
- **コンポーネント**: `PascalCase` （例: `TradingDashboard`）
- **ファイル名**: `PascalCase.tsx` （例: `TradingDashboard.tsx`）
- **Props 型定義**: `[ComponentName]Props` （例: `TradingDashboardProps`）

### TypeScript
- **型定義**: `PascalCase` （例: `UserAccount`, `TradePosition`）
- **インターフェース**: `I[Name]` （例: `IUserAccount`, `ITradePosition`）
- **変数**: `camelCase` （例: `currentPrice`, `tradeAmount`）
- **関数**: `camelCase` （例: `calculateProfit`, `executeOrder`）
- **定数**: `UPPER_SNAKE_CASE` （例: `MAX_CONNECTIONS`, `DEFAULT_TIMEOUT`）

### Tauri プラグイン
- **プラグイン名**: `tauri-plugin-[name]`
- **コマンド**: `snake_case` （例: `get_account_info`, `execute_order`）
- **イベント**: `PascalCase` （例: `PriceUpdate`, `OrderExecuted`）

## 🔧 API・通信関連

### GraphQL
- **Query**: `camelCase` （例: `getUserAccount`, `getTradeHistory`）
- **Mutation**: `camelCase` （例: `createOrder`, `updatePosition`）
- **Subscription**: `camelCase` （例: `priceUpdates`, `orderStatus`）
- **型定義**: `PascalCase` （例: `User`, `Position`, `Order`）

### Named Pipe
- **パイプ名**: `PascalCase` （例: `TauriMTBridge`）
- **メッセージ型**: `PascalCase` （例: `AccountInfo`, `PriceData`）
- **コマンド**: `UPPER_SNAKE_CASE` （例: `GET_ACCOUNT`, `SEND_ORDER`）

## 📊 データベース・設定関連

### 設定ファイル
- **設定ファイル**: `kebab-case.json` （例: `app-config.json`, `trading-settings.json`）
- **設定キー**: `camelCase` （例: `maxConnections`, `defaultTimeout`）
- **環境変数**: `UPPER_SNAKE_CASE` （例: `API_BASE_URL`, `DATABASE_URL`）

### ログ・出力
- **ログファイル**: `[service]-[date].log` （例: `trading-20250119.log`）
- **出力ファイル**: `[purpose]-[timestamp].[ext]` （例: `analysis-20250119-143000.json`）

## 🚀 スクリプト・コマンド関連

### npm scripts
- **開発**: `dev`, `start:dev`
- **本番**: `build`, `start`
- **テスト**: `test`, `test:unit`, `test:e2e`
- **リント**: `lint`, `lint:fix`
- **型チェック**: `type-check`, `check-types`

### 開発コマンド
- **Manager起動**: `npm run manager`
- **Worker起動**: `npm run worker`
- **システム起動**: `npm run go`

## 🏗️ プロジェクト構造

### ディレクトリ構造
```
apps/
├── admin/           # 管理者アプリ
├── hedge-system/    # 取引システム
packages/
├── shared-amplify/  # 共有 Amplify 
├── shared-backend/  # 共有バックエンド
├── shared-types/    # 共有型定義
├── ui/              # UI コンポーネント
docs/
├── common/          # 共通設定・定数
├── guides/          # 実装ガイド
├── mvp-constraints/ # MVP 制約
├── roles/           # 役割定義
└── tauri/           # Tauri 固有
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
- **Issue駆動開発**: [../guides/issue-driven-development/best-practices.md](../guides/issue-driven-development/best-practices.md)

---

**最終更新**: 2025-01-19  
**管理者**: ArbitrageAssistant Development Team