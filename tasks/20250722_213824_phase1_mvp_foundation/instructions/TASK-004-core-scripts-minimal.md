# TASK-004: Core Scripts最小実装

## 🎯 目標
REQUIREMENTS.mdのフェーズ1（MVP基盤）に向けて、基本的な実行スクリプトシステムを実装し、`pnpm dev`での単一実行を確立する。

## 📋 作業内容

### 1. core-runner.ts基本実装
- ファイルパス: `src/scripts/core-runner.ts`
- 共通の実行ロジック実装
- RSS収集 → 投稿作成 → X投稿の基本フロー

**実装フロー**:
```typescript
1. 設定ファイル読み込み (data/config/*)
2. RSS収集実行 (rss-collector.ts)
3. 基本的な投稿コンテンツ作成
4. X投稿実行 (x-poster.ts)
5. 実行結果記録 (data/current/today-posts.yaml)
```

### 2. dev.ts単一実行スクリプト
- ファイルパス: `src/scripts/dev.ts`
- core-runner.tsを1回だけ実行
- 開発・デバッグ用の実行環境
- エラーログ出力機能

### 3. main.tsループ実行準備
- ファイルパス: `src/scripts/main.ts`
- core-runner.tsの定期実行準備（フェーズ4で本格実装）
- 現時点では基本構造のみ実装

### 4. エラーハンドリング・ログ出力
**エラー管理**:
- 実行エラーの適切なキャッチ
- エラー情報のYAMLファイル出力
- `tasks/outputs/`への実行ログ保存

**ログ出力先**:
- 成功時: `tasks/outputs/dev-success-{timestamp}.yaml`
- エラー時: `tasks/outputs/dev-error-{timestamp}.yaml`

### 5. 最小限の実行制御
**制御機能**:
- 設定ファイル読み込み検証
- 必要サービスの存在確認
- 実行前の基本チェック
- 実行結果の簡易記録

## 🚫 MVP制約事項
- 複雑なスケジュール機能は含めない
- 詳細なパフォーマンス測定は避ける
- 高度な並列処理は実装しない
- 統計・分析機能は含めない

## 📁 関連ファイル
**実装対象**:
- `src/scripts/core-runner.ts`
- `src/scripts/dev.ts`
- `src/scripts/main.ts`（基本構造のみ）

**連携ファイル**:
- `src/collectors/rss-collector.ts`（TASK-001実装）
- `src/services/x-poster.ts`（TASK-003実装）
- `data/config/*`（TASK-002実装）

**出力先**:
- `tasks/outputs/`（実行ログ）
- `data/current/today-posts.yaml`（実行記録）

### 6. テスト実装
**必須テストケース**:
- dev.ts正常実行テスト
- 設定ファイル読み込みテスト
- エラーハンドリングテスト
- ログ出力テスト

## ✅ 完了判定基準
1. `pnpm dev`コマンドで正常実行
2. TypeScript型エラーなし
3. 基本フロー（RSS収集→投稿作成→X投稿）動作確認
4. エラーハンドリング実装確認
5. 実行ログ出力確認

## 📋 報告書作成要件
完了後、以下を含む報告書を作成：
- 実装した実行スクリプトの詳細
- 基本フローの動作確認結果
- エラーハンドリング実装状況
- `pnpm dev`実行テスト結果
- 発見した課題・改善点

**報告書パス**: `tasks/20250722_213824_phase1_mvp_foundation/reports/REPORT-004-core-scripts-minimal.md`

## 🔗 他タスクとの関係
- **依存関係**: TASK-001, TASK-002, TASK-003の成果物を統合利用
- **実行順序**: 他3タスク完了後に実行推奨（ただし基本構造は並列実装可能）
- **後続タスク**: フェーズ4でのループ実行システム本格実装の基盤