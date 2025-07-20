# ファイルパス設定統一ガイド

## 📁 概要

プロジェクト全体で使用するファイルパスとディレクトリ構造を統一管理します。

## 🏗️ 基本ディレクトリ構造

### プロジェクトルート
```
/Users/rnrnstar/github/ArbitrageAssistant/
├── apps/              # アプリケーション
├── packages/          # 共有パッケージ
├── docs/              # ドキュメント
├── tasks/             # タスク管理
├── x/                 # 実験的機能
└── worktrees/         # Git worktree
```

## 📋 出力管理パス

### 承認された出力場所
```bash
# タスク関連出力
tasks/{TIMESTAMP}/outputs/          # 専用出力ディレクトリ
tasks/{TIMESTAMP}/analysis/         # 分析結果
tasks/{TIMESTAMP}/reports/          # 報告書
tasks/{TIMESTAMP}/temporary/        # 一時ファイル

# 一般出力
tasks/outputs/                      # 一般出力
tasks/analysis-results/             # 分析結果集約
tasks/temporary/                    # 一時ファイル
```

### 絶対禁止の出力場所
```bash
# これらの場所への出力は絶対禁止
/Users/rnrnstar/github/ArbitrageAssistant/           # ルートディレクトリ
/Users/rnrnstar/github/ArbitrageAssistant/packages/  # パッケージディレクトリ
/Users/rnrnstar/github/ArbitrageAssistant/apps/      # アプリケーションディレクトリ
```

## 🔧 設定ファイルパス

### アプリケーション設定
```bash
# Hedge System
apps/hedge-system/src/config/
├── app-config.json
├── trading-settings.json
└── connection-settings.json

# Admin App
apps/admin/src/config/
├── admin-config.json
├── dashboard-settings.json
└── user-settings.json
```

### 共有設定
```bash
# 共有パッケージ
packages/shared-backend/config/
├── amplify-config.json
├── database-config.json
└── api-config.json

# 共通設定
docs/common/
├── system-constants.md
├── performance-standards.md
├── naming-conventions.md
└── file-paths.md
```

## 📊 ログ・出力パス

### アプリケーションログ
```bash
# Hedge System
apps/hedge-system/logs/
├── trading-{YYYYMMDD}.log
├── connection-{YYYYMMDD}.log
└── error-{YYYYMMDD}.log

# Admin App
apps/admin/logs/
├── admin-{YYYYMMDD}.log
├── user-activity-{YYYYMMDD}.log
└── system-{YYYYMMDD}.log
```

### 開発・分析ログ
```bash
# タスク関連
tasks/{TIMESTAMP}/logs/
├── implementation-{YYYYMMDD}-{HHMMSS}.log
├── analysis-{YYYYMMDD}-{HHMMSS}.log
└── debug-{YYYYMMDD}-{HHMMSS}.log

# 一般ログ
tasks/logs/
├── general-{YYYYMMDD}.log
├── performance-{YYYYMMDD}.log
└── error-{YYYYMMDD}.log
```

## 🚀 開発・作業パス

### タスク管理
```bash
# 開発セッション
tasks/{TIMESTAMP}/
├── instructions/          # 指示書
├── reports/              # 報告書
├── outputs/              # 出力ファイル
├── analysis/             # 分析結果
├── temporary/            # 一時ファイル
└── session-status.md     # セッション状態

# テンプレート
tasks/templates/
├── instruction-template.md
├── report-template.md
└── session-status-template.md
```

### Issue駆動開発
```bash
# Worktree
worktrees/
├── issue-001-user-auth/
├── issue-002-trading-ui/
└── issue-003-websocket-integration/

# Issue管理
docs/development/
├── issue-driven-development/
├── slash-commands/
└── examples/
```

## 📚 ドキュメントパス

### 技術ドキュメント
```bash
docs/
├── common/              # 共通設定・定数
├── guides/              # 実装ガイド
├── mvp-constraints/     # MVP制約
├── roles/               # 役割定義
├── tauri/               # Tauri固有
├── requirements/        # 要件定義
└── development/         # 開発プロセス
```

### 特定技術ドキュメント
```bash
# Tauri関連
docs/tauri/
├── analysis/           # 分析結果
├── guides/             # 実装ガイド
└── troubleshooting/    # トラブルシューティング

# MVP制約
docs/mvp-constraints/
├── mvp-principles.md
├── mvp-performance-criteria.md
└── forbidden-features.md
```

## 🔍 Named Pipe・通信パス

### Named Pipe
```bash
# Windows Named Pipe
\\.\pipe\TauriMTBridge    # メインパイプ
\\.\pipe\TauriMTBridge_1  # 予備パイプ
\\.\pipe\TauriMTBridge_2  # 予備パイプ
```

### 通信設定
```bash
# 設定ファイル
apps/hedge-system/src/config/connection-settings.json
apps/hedge-system/src/config/pipe-settings.json
```

## 🛡️ セキュリティ・権限

### 認証・設定
```bash
# 認証設定
packages/shared-amplify/config/
├── auth-config.json
├── permissions-config.json
└── security-settings.json

# セキュリティ設定
docs/tauri/analysis/
├── permissions-security.md
├── security-best-practices.md
└── vulnerability-assessment.md
```

## 💻 実行・スクリプトパス

### npm scripts
```bash
# パッケージ管理
package.json              # ルートレベル
apps/*/package.json      # アプリレベル
packages/*/package.json  # パッケージレベル
```

### 実行スクリプト
```bash
# 開発スクリプト
scripts/
├── manager.js
├── worker.js
├── go.js
└── output-management/
```

## 🔧 環境・設定変数

### 環境変数ファイル
```bash
# 環境設定
.env                      # 共通環境変数
.env.local               # ローカル環境
.env.development         # 開発環境
.env.production          # 本番環境

# アプリ固有
apps/hedge-system/.env
apps/admin/.env
```

### 設定管理
```bash
# 設定バックアップ
config/backup/
├── {YYYYMMDD}-system-config.json
├── {YYYYMMDD}-user-settings.json
└── {YYYYMMDD}-trading-settings.json
```

## ⚠️ 重要な注意事項

### 出力管理規則
1. **Root Directory Pollution Prevention** - ルートディレクトリへの出力禁止
2. **承認された出力場所のみ使用** - `tasks/outputs/` 等の指定場所のみ
3. **適切な命名規則遵守** - `TASK-XXX-{name}-output.{ext}` 形式
4. **一時ファイルの適切な管理** - 作業完了後の削除必須

### パス参照のベストプラクティス
- **絶対パス優先** - 相対パスは避ける
- **環境変数活用** - ハードコーディング回避
- **設定ファイル集約** - 散在する設定の統一
- **バックアップ管理** - 重要設定の定期バックアップ

## 🔍 検証・管理

### 自動検証
```bash
# 出力管理検証
scripts/output-management/validate-output-compliance.sh
scripts/output-management/validate-output-compliance.sh --cleanup
```

### 管理ツール
```bash
# パス管理
scripts/path-management/
├── validate-paths.sh
├── cleanup-temp-files.sh
└── backup-configs.sh
```

## 📋 参照先

- **システム定数**: [system-constants.md](system-constants.md)
- **命名規則**: [naming-conventions.md](naming-conventions.md)
- **出力管理**: [../guides/output-management-rules.md](../guides/output-management-rules.md)
- **設定ガイド**: [configuration-guide.md](configuration-guide.md)

---

**最終更新**: 2025-01-19  
**管理者**: ArbitrageAssistant Development Team