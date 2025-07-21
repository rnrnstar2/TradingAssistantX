# CLAUDE.md

## 🎯 TradingAssistantX - X自動化システム

**Claude主導のX（Twitter）コンテンツ自動化・投稿管理システム**

### 基本原則
1. **完全自動化** - Claude主導による自律的なコンテンツ生成・投稿
2. **データ駆動** - YAML形式による設定・コンテンツ管理
3. **品質重視** - 高品質なコンテンツによる価値創造
4. **シンプル設計** - 複雑さを排除した直感的なシステム

### 🌿 ブランチ戦略
- **main** - 全ての開発・運用を行うメインブランチ（単一ブランチ戦略）

## 🚨 起動時必須確認事項

**Claude Code起動直後、以下を順番に必ず実行**：

```bash
# 1. 環境変数確認（ROLE=manager/worker）
echo "ROLE: $ROLE"

# 2. 現在のブランチ確認（mainブランチであることを確認）
git branch --show-current

# 3. 役割宣言
# 「私はmainブランチの[Manager/Worker]です」
```

### 📄 **4. 権限別詳細ファイル読み込み（必須）**

ROLE環境変数に応じて、以下ファイルを **Read ツール** で必ず読み込む：

#### 📋 **権限別ファイル**
```
Manager権限: docs/roles/manager-role.md
Worker権限:  docs/roles/worker-role.md
```

**🚨 重要**: 該当ファイル読み込み完了まで作業開始禁止  
**💡 ポイント**: 自分の権限に関係ないファイルは読まない


## 🤖 シンプル開発システム

本プロジェクトでは**mainブランチ単一開発**を採用します：

- **🌿 mainブランチ**: 全ての開発・修正・機能追加を直接実行

### 📋 役割定義

**🎯 Manager** (`ROLE=manager`): セッション管理・指示書作成・git操作責任者  
**⚡ Worker** (`ROLE=worker`): 実装実行・品質チェック・報告書作成専門

**詳細**: 起動時ROLE判定で適切なファイルを読み込み

## 📊 技術スタック
- **Runtime**: Node.js + TypeScript
- **自動化エンジン**: Claude Code SDK + Anthropic API
- **ブラウザ自動化**: Playwright
- **データ管理**: YAML + JSON（ファイルベース）
- **X API**: Twitter API v2
- **Quality**: TypeScript strict mode, ESLint

## 🏗️ プロジェクト構成

### コアシステム (src/)
- **core/** - 自律実行エンジン、意思決定システム、並列管理
- **lib/** - Claude連携、X API、コンテンツ生成、実行管理
- **types/** - 型定義、システム全体のインターフェース
- **scripts/** - 実行スクリプト、自動化ランナー

### テストシステム (tests/)
**🚨 重要**: 全てのテストファイルはこのディレクトリに統一配置

- **unit/** - 単体テスト（*.test.ts形式）
- **integration/** - 統合テスト（*.test.ts形式）
- **テスト実行**: Vitestを使用（`pnpm test` / `pnpm test:watch`）

### データ管理 (data/)
**🚨 重要**: 全ての設定・データファイルはこのディレクトリに統一配置

- **システム設定**: autonomous-config.yaml
- **アカウント設定**: account-config.yaml, account-strategy.yaml
- **コンテンツ管理**: content-strategy.yaml, content-patterns.yaml
- **投稿データ**: posting-data.yaml, posting-history.yaml
- **成長管理**: growth-targets.yaml
- **コンテキスト**: context/ サブディレクトリ
- **履歴・メトリクス**: metrics-history/ サブディレクトリ

## 🏗️ アーキテクチャ原則

### YAML駆動開発
本プロジェクトは**YAML駆動**のアーキテクチャを採用しています：

- **全設定・データファイル**: 人間が読みやすいYAML形式で管理
- **Claude Code SDK連携**: YAML形式での動的操作最適化
- **自己文書化**: コメント機能による構造化データ
- **実装ガイド**: `docs/guides/yaml-driven-development.md` **必読**

### 📂 **設定ファイル配置ルール（厳格遵守）**

**🚨 CRITICAL: 全ての設定・データファイルはdata/ディレクトリ配下に統一配置**

#### **配置原則**
- **✅ 配置場所**: `data/` ディレクトリ直下のみ
- **✅ ファイル形式**: `.yaml` 拡張子必須
- **🚫 禁止場所**: `config/`, `settings/`, ルートディレクトリ等

#### **設定ファイル分類**
```yaml
# システム設定
data/autonomous-config.yaml    # 自律システム設定
data/account-config.yaml       # アカウント設定

# コンテンツ戦略
data/content-strategy.yaml     # コンテンツ戦略設定
data/posting-data.yaml        # 投稿データ管理

# 履歴・分析データ（削除済みファイルの参考）
data/account-strategy.yaml    # アカウント戦略
data/growth-targets.yaml      # 成長目標
data/posting-history.yaml     # 投稿履歴
```

#### **命名規則**
- **設定ファイル**: `{機能名}-config.yaml`
- **戦略ファイル**: `{機能名}-strategy.yaml`
- **データファイル**: `{機能名}-data.yaml`
- **履歴ファイル**: `{機能名}-history.yaml`

```yaml
# 設定ファイル例
version: "1.0.0"
currentPhase: growth  # growth, engagement, authority, maintenance
objectives:
  primary: 価値創造に集中した実用的開発
```

## 🎨 重要ルール
- **CSS編集時**: `docs/guides/tailwind-v4-guide.md` **必読・必須参照**
  - ⚠️ **Tailwind CSS v4の仕様変更に注意**（@apply使用不可、@themeブロック必須）
  - CSS修正前に必ずこのドキュメントを参照し、v4の正しい実装方法を確認
  - 特に動的CSS変数、@utility定義、カスタムプロパティの扱いに注意
- **スタイル設計時**: `docs/guides/global-style-system.md` **必読・必須参照**
  - グローバルスタイルシステムの設計原則とベストプラクティス
- **Backend/Amplify開発時**: `docs/guides/amplify-gen2-guide.md` **実装前必読・必須参照**
  - 🚨 **実装開始前に必ず公式ドキュメント確認** - 古いパターンでの実装を避ける
  - ⚠️ **client.models.*の正しい使用方法**（CRUD, subscriptions, TypeScript型）
  - 📋 **実装チェックリスト必須確認** - エラーハンドリング、型安全性、クリーンアップ
  - 🔄 **段階的実装アプローチ** - ドキュメント確認→実装→TypeScript確認→テスト
  - 🚫 **重要：バックエンド設定の削除厳禁** - スキーマ定義、enum値、認証設定は絶対に削除しない
- **📂 出力管理規則**: **強制・必須遵守** - `scripts/output-management/` **システム必須使用**
  - 🚨 **ROOT DIRECTORY POLLUTION PREVENTION** - ルートディレクトリへの出力は絶対禁止
  - ✅ **承認された出力場所のみ使用**: `tasks/outputs/`, `tasks/analysis-results/`, `tasks/{TIMESTAMP}/outputs/`
  - 🔍 **出力前チェック必須**: 任意のファイル作成前に出力先を確認
  - 📋 **命名規則遵守**: `TASK-XXX-{name}-output.{ext}` 形式を使用
  - 🧹 **クリーンアップ必須**: 作業完了後、不要な一時ファイルを削除
  - 🚫 **絶対禁止**: `*-analysis.md`, `*-report.md`, `*.tmp` 等のルートディレクトリ直下配置
  - 🔧 **検証システム**: `scripts/output-management/validate-output-compliance.sh` で事前チェック
  - ⚡ **自動修正**: `scripts/output-management/validate-output-compliance.sh --cleanup` で違反自動修正
  - 🛡️ **Pre-commit Hook**: Git commit時に自動検証、違反があれば commit をブロック
- **品質最優先**: 時間制限厳禁・妥協禁止
- **テスト方針**: 重要ロジックのみ（E2E除外）
- **セッション終了通知**: Claude Code終了時のみ通知（音付き）。途中の作業では通知しない
- **関数削除時**: `docs/guides/deletion-safety-rules.md` **必読・必須実行**
  - ⚠️ **3-Step Safety Rule必須**: 1)grep使用確認 2)TypeScriptチェック 3)1つずつ削除
  - 🚨 **hedge-system停止事故防止**: 削除前に `grep -r "関数名" apps/` で全アプリの使用状況を必ず確認
  - ✅ **実用性重視**: 複雑な自動化より確実な手動チェックを優先

## 🚀 システム起動

**起動コマンド**:
- **Manager**: `pnpm run manager`
- **Worker**: `pnpm run worker`

**詳細手順**: 起動時ROLE判定で読み込むファイルに記載

## 📚 参考資料

### 権限別詳細（起動時読み込み必須）
- **Manager**: `docs/roles/manager-role.md`
- **Worker**: `docs/roles/worker-role.md`

### 技術ガイド（必要時参照）
- `docs/guides/global-style-system.md` - グローバルスタイルシステム
- `docs/guides/tailwind-v4-guide.md` - Tailwind CSS v4実装
- `docs/guides/amplify-gen2-guide.md` - Amplify Gen2実装
- `tasks/outputs/README.md` - 出力管理システム詳細

---

**記憶すべきこと**: 私たちは制限のために働くのではなく、価値を創造するために働きます。

> **注**: 起動時チェック、品質管理、通知は.claude/hooks/で自動化済み