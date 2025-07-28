# MASTER指示書: フェーズ1 MVP基盤実装

## 🎯 全体目標
REQUIREMENTS.mdで定義されたフェーズ1「RSS Collector + 基本投稿システム」の完全実装により、TradingAssistantXの基盤システムを確立する。

## 📋 必須事前準備
**全Worker共通事項**:
1. **REQUIREMENTS.md必須読み込み**: 作業開始前に必ず `/Users/rnrnstar/github/TradingAssistantX/REQUIREMENTS.md` を読み込み、システム全体の理念と構造を理解すること
2. **フェーズ1理解**: 「RSS Collector中心の段階的実装」「疎結合設計の重要性」を把握
3. **MVP原則厳守**: 過剰実装を避け、必要最小限の機能で確実に動作するシステムを構築

## 🚀 実行戦略

### 並列実行タスク（同時実行推奨）
- **TASK-001**: RSS Collector完全実装
- **TASK-002**: data/config構造完全実装  
- **TASK-003**: X Poster基本実装

### 統合タスク（並列タスク完了後）
- **TASK-004**: Core Scripts最小実装（他3タスク成果物を統合）

## 📁 出力管理厳守事項
**🚨 CRITICAL: Root Directory Pollution Prevention 必須**
- ❌ ルートディレクトリへの直接出力禁止
- ✅ 承認出力先: `tasks/outputs/`, `tasks/20250722_213824_phase1_mvp_foundation/outputs/`
- 📋 全報告書: `tasks/20250722_213824_phase1_mvp_foundation/reports/`配下

## 🔒 技術制約事項
**TypeScript厳格運用**:
- strict mode必須
- 型エラーゼロ完了
- lint/type-check完全通過

**疎結合設計厳守**:
- 各コンポーネントは独立動作
- 統一インターフェース（CollectionResult型等）維持
- 設定ファイル駆動制御

## ✅ フェーズ1完了判定基準
1. `pnpm dev`コマンドでエラーなし完全実行
2. RSS収集 → 投稿作成 → X投稿の基本フロー動作
3. 全TypeScript型エラー解消
4. 設定ファイル（data/config/*）完全動作
5. 各コンポーネントの独立テスト通過

## 📊 成果物チェックリスト
### 実装ファイル
- [ ] `src/collectors/rss-collector.ts` (RSS収集完全実装)
- [ ] `src/services/x-poster.ts` (基本投稿機能)
- [ ] `src/scripts/core-runner.ts` (統合実行)
- [ ] `src/scripts/dev.ts` (開発実行)
- [ ] `data/config/*` (設定ファイル構造)

### 品質確認
- [ ] TypeScript型エラーゼロ
- [ ] 基本フロー実行成功
- [ ] 設定ファイル連携動作
- [ ] エラーハンドリング実装

### 報告書
- [ ] 4つの個別報告書完成
- [ ] 統合テスト結果記録
- [ ] 課題・改善点整理

## 🎯 Manager最終評価項目
1. **機能完全性**: フェーズ1要求機能の完全実装
2. **品質**: TypeScript厳格運用・エラーハンドリング
3. **疎結合設計**: 各コンポーネント独立性維持
4. **MVP原則**: 過剰実装回避・必要最小限実装
5. **拡張性**: フェーズ2以降への基盤確立

## 🔄 次フェーズ準備
フェーズ1完了により、以下が準備される：
- **フェーズ2**: Decision Engine + アカウント分析の基盤
- **フェーズ3**: Content Creator + 学習システムの基盤  
- **フェーズ4**: Autonomous Executor + ループ管理の基盤

---
**重要**: この指示書は各Workerの個別指示書（TASK-001〜004）と併用すること。個別指示書で詳細実装要求を確認し、このMaster指示書で全体方針を把握すること。