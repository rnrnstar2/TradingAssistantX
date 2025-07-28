# TASK-001: ディレクトリ・ファイル構造完全性チェック

## 🎯 タスク概要
REQUIREMENTS.mdに定義されたディレクトリ・ファイル構造の完全性を徹底的にチェックし、ハルシネーション防止機構の観点から構造の整合性を検証する。

## 📋 実行指示

### 1. ルートディレクトリ構造の検証
```
TradingAssistantX/
├── src/                    # ソースコード
├── data/                   # YAML設定・データ
├── tests/                  # テストコード
├── docs/                   # ドキュメント
├── .claude/                # Claude Code SDK設定
└── REQUIREMENTS.md         # 要件定義書
```

**実行内容**:
- 上記構造が完全に存在するかを確認
- 不足ディレクトリ・不正ディレクトリがないかチェック
- 各ディレクトリの目的と実際の使用状況を分析

### 2. /src ディレクトリ構造の詳細検証
```
src/
├── core/                   # コアシステム
│   ├── autonomous-executor.ts      # 自律実行エンジン
│   ├── decision-engine.ts          # 意思決定エンジン
│   └── loop-manager.ts            # ループ実行管理
├── collectors/             # データ収集
│   ├── rss-collector.ts          # RSS収集（MVP）
│   ├── playwright-account.ts     # アカウント分析専用
│   └── base-collector.ts         # 基底クラス（疎結合設計）
├── services/               # ビジネスロジック
│   ├── content-creator.ts        # 投稿コンテンツ生成
│   ├── data-optimizer.ts         # データ最適化・階層管理・分析
│   └── x-poster.ts              # X API投稿
├── utils/                  # ユーティリティ
│   ├── yaml-manager.ts          # YAML読み書き
│   ├── context-compressor.ts    # コンテキスト圧縮
│   ├── config-cache.ts          # 設定キャッシュ
│   ├── config-manager.ts        # 設定管理
│   ├── config-validator.ts      # 設定検証
│   ├── error-handler.ts         # エラーハンドリング
│   ├── file-size-monitor.ts     # ファイルサイズ監視
│   └── yaml-utils.ts            # YAMLユーティリティ
└── scripts/                # 実行スクリプト
    ├── main.ts                  # ループ実行（pnpm start）
    ├── dev.ts                   # 単一実行（pnpm dev）
    └── core-runner.ts           # 共通実行ロジック
```

**実行内容**:
- 各ファイルの存在確認
- ファイルの実装状況（空ファイル・実装済み・部分実装）の分類
- 命名規則の遵守状況確認
- 疎結合設計原則に沿った構造かの評価

### 3. /data ディレクトリ構造の検証
```
data/
├── config/                 # システム設定
│   ├── autonomous-config.yaml    # 自律実行設定
│   ├── posting-times.yaml       # 投稿時間設定
│   ├── rss-sources.yaml         # RSSフィード設定
│   └── brand-strategy.yaml      # ブランド戦略設定
├── current/                # ホットデータ層（最大1MB、直近7日）
│   ├── today-posts.yaml         # 本日の投稿記録
│   └── weekly-summary.yaml      # 週次サマリー
├── learning/               # ウォームデータ層（最大10MB、90日分）
│   ├── post-insights.yaml       # 投稿分析結果（必須）
│   └── engagement-patterns.yaml # エンゲージメントパターン（必須）
└── archives/               # コールドデータ層（無制限、永続保存）
    ├── posts/                   # 全投稿の生データ
    │   └── 2025-07/            # 月別ディレクトリ（YYYY-MM形式）
    └── insights/               # 古い分析結果
        └── 2025-3/             # 分析結果アーカイブ
```

**実行内容**:
- 階層型データ管理構造の完全性確認
- current/ディレクトリのファイル数制限（最大20ファイル）チェック
- 各YAML設定ファイルの存在と構造確認
- アーカイブディレクトリの年月構造確認

### 4. ハルシネーション防止機構の構造チェック
**実行内容**:
- integrity-checker.ts の存在・実装状況確認
- 許可された出力先（data/current/, data/learning/, data/archives/, tasks/outputs/）の確認
- 禁止パス（src/, data/config/, tests/, docs/, REQUIREMENTS.md）への書き込み防止機構確認

### 5. 不正ファイル・ディレクトリの検出
**実行内容**:
- REQUIREMENTS.mdに定義されていない追加ファイル・ディレクトリの検出
- ルートディレクトリへの不正出力の検出
- 命名規則に違反するファイルの検出

## 🎯 分析・出力要求

### 実行手順
1. **構造スキャン**: LSツールとGrepツールを使用して完全な構造をスキャン
2. **存在確認**: 要件定義の各項目と実際のファイル存在を照合
3. **実装状況分析**: 各ファイルの中身を簡単に確認（空/実装済み/部分実装の分類）
4. **不整合検出**: 要件定義と実態の差異を特定

### 出力形式
**📁 出力先**: `tasks/20250723_013109/reports/REPORT-001-directory-structure-check.md`

**レポート構成**:
```markdown
# ディレクトリ・ファイル構造完全性チェック報告書

## ✅ 完全準拠項目
- 存在し、要件定義に完全準拠している構造

## ⚠️ 部分準拠項目
- 存在するが、実装が不完全または部分的な項目

## ❌ 不適合項目
- 要件定義に対して不足・不正な項目

## 🔍 不正ファイル検出
- 要件定義にない追加ファイル・ディレクトリ

## 📊 実装進捗サマリー
- 全体実装進捗率
- カテゴリ別進捗状況

## 🚨 ハルシネーション防止機構評価
- 構造整合性の観点からの評価と推奨改善策
```

## 🔒 制約・注意事項

### MVP制約遵守
- 構造チェックのみに限定、新規実装提案は禁止
- 現状の把握と問題検出に専念
- 統計・分析機能の評価は最小限に留める

### 出力管理
- ✅ **許可**: `tasks/20250723_013109/reports/REPORT-001-directory-structure-check.md`
- 🚫 **禁止**: ルートディレクトリへの直接出力
- 🚫 **禁止**: src/, data/config/ 等の読み取り専用領域への出力

### 実行効率化
- LSツールとGrepツールを並列実行して効率化
- 大量のファイルスキャンを効率的に実施
- TypeScript型定義チェックは最小限に留める

## 🎯 成功基準
- 要件定義書の構造と実態の完全な照合完了
- 不適合項目の具体的な特定
- ハルシネーション防止の観点からの構造評価
- 他Workerが参照可能な詳細レポートの作成

この指示書に従い、TradingAssistantXの構造完全性を徹底的にチェックし、品質の高いレポートを作成してください。