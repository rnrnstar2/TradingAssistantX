# TASK-005: directory-structure.md ドキュメント更新

## 🎯 タスク概要
実装された新しいディレクトリ構造を反映して、docs/directory-structure.md を更新する

## 📋 実装内容

### 1. 現在の実際のディレクトリ構造を確認
以下のコマンドで現在の構造を確認：
```bash
tree src/ -I 'node_modules|*.js' --dirsfirst
```

### 2. directory-structure.md の更新内容

#### 削除する内容
- main-workflows/配下の削除されたファイルの記載
- 実装されなかった過剰な構造の記載

#### 追加する内容
```
src/
├── workflows/                 # ワークフロー中核機能（NEW）
│   ├── main-workflow.ts       # メインワークフロー実行クラス
│   ├── constants.ts           # ワークフロー定数定義
│   └── action-executor.ts     # アクション実行ロジック
│
├── scheduler/                 # スケジューラー機能（NEW）
│   ├── time-scheduler.ts      # 時刻ベーススケジューラー
│   ├── schedule-loader.ts     # YAML設定読込
│   └── types.ts              # スケジューラー型定義
│
├── main-workflows/           # （削除予定 - レガシー）
│   └── core/                 # 既存コア機能
│
├── dev.ts                    # 開発用エントリーポイント（単一実行）
├── main.ts                   # 本番用エントリーポイント（スケジュール実行）
└── index.ts                  # 共通エクスポート
```

#### データ構造の更新
```
data/
├── config/
│   ├── api-config.yaml       # API設定
│   ├── system-config.yaml    # システム設定
│   └── schedule.yaml         # スケジュール設定（NEW）
```

### 3. アーキテクチャ説明の更新

#### 新しいワークフローアーキテクチャ
- **workflows/**: シンプルな4ステップワークフロー実装
  - データ収集 → Claude判断 → アクション実行 → 結果保存
- **scheduler/**: 時刻ベースの自動実行機能
  - YAMLファイルからスケジュール読込
  - 1分間隔での時刻チェック

#### エントリーポイントの説明
- **dev.ts**: `pnpm dev` - 開発用単一実行
- **main.ts**: `pnpm start` - スケジュール実行モード

### 4. 実装状況の記載

#### Phase 1（完了）
- ✅ workflows/ ディレクトリ実装
- ✅ エントリーポイント簡素化
- ✅ 基本的な4ステップワークフロー

#### Phase 2（完了）
- ✅ scheduler/ ディレクトリ実装
- ✅ YAML設定によるスケジュール実行
- ✅ 時刻制御機能

#### 削除されたファイル
以下のファイルは過剰実装として削除：
- main-workflows/execution-flow.ts
- main-workflows/scheduler-manager.ts
- main-workflows/status-controller.ts
- main-workflows/system-lifecycle.ts
- main-workflows/core/scheduler-core.ts
- main-workflows/core/scheduler-maintenance.ts

### 5. 今後の計画セクション

#### 次期改善予定
- main-workflows/ ディレクトリの完全削除
- TypeScript型定義の整合性改善
- テストカバレッジの向上

## ⚠️ 注意事項
- 実際のファイル構造と一致させること
- 存在しないファイルは記載しない
- 新規実装と既存実装の区別を明確に

## 🔧 技術要件
- Markdownフォーマット
- ツリー構造の適切な表現
- 日本語での説明文

## 📂 成果物
- 更新: `docs/directory-structure.md`

## ✅ 完了条件
- [ ] 実際のディレクトリ構造と一致している
- [ ] 新規実装部分が明確に記載されている
- [ ] 削除されたファイルの記載がない
- [ ] Phase 1/2の実装状況が反映されている