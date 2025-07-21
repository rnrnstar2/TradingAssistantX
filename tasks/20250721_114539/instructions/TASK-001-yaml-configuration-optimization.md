# TASK-001: YAMLファイル構成最適化

## 🎯 目的
dataディレクトリのYAMLファイル構成を最適化し、機能重複を排除してMVP原則に基づいたシンプルな設計に改善する。

## 📋 現状分析結果

### 現在のYAMLファイル構成（9ファイル）
1. **account-info.yaml** - アカウント基本情報とメトリクス履歴（新規作成、20行）
2. **account-strategy.yaml** - アカウント戦略、コンテンツ戦略、投稿テンプレート（442行、巨大）
3. **collection-results.yaml** - 情報収集結果（8行、ほぼ空）
4. **content-patterns.yaml** - コンテンツパターン定義（14行、基本内容）
5. **growth-targets.yaml** - 成長目標設定（28行）
6. **performance-insights.yaml** - パフォーマンス分析（4行、空）
7. **posting-history.yaml** - 投稿履歴データ（空配列）
8. **quality-assessments.yaml** - 品質評価（8行、評価基準のみ）
9. **strategic-decisions.yaml** - 戦略的決定（1行、空配列）

### 🚨 発見された問題点

#### 1. 機能重複
- `content-patterns.yaml`（14行）の内容が`account-strategy.yaml`のcontentTemplatesと重複
- `growth-targets.yaml`の一部機能が`account-strategy.yaml`のobjectivesと重複
- 新規作成`account-info.yaml`のcurrent_metricsが`growth-targets.yaml`のprogressと似た機能

#### 2. MVP違反：過剰実装
- **巨大ファイル**: `account-strategy.yaml`が442行で複数の責任を持つ
- **空ファイル多数**: 6つのファイルが空または最小限の内容
- **未来の準備**: 使用されていない構造を多数含む

#### 3. 設計の複雑性
- 9ファイルに分散した設定で管理が困難
- 明確な責任分離ができていない
- YAML駆動開発の利点を活かせていない

## 🎯 最適化方針（MVP原則適用）

### 統合原則
1. **今すぐ必要な機能のみ残す**
2. **3-4ファイルに統合**（9→3-4ファイル）
3. **明確な責任分離**
4. **重複完全排除**

### 提案する新構成（4ファイル）

#### 1. `account-config.yaml` 
**責任**: アカウント基本設定とメトリクス
- 現在の`account-info.yaml` + `growth-targets.yaml`の統合
- アカウント情報、目標設定、進捗データ

#### 2. `content-strategy.yaml`
**責任**: コンテンツ戦略と投稿設定
- `account-strategy.yaml`からコンテンツ関連部分のみ抽出
- `content-patterns.yaml`の内容統合
- 投稿頻度、テーマ、投稿時間設定

#### 3. `posting-data.yaml`
**責任**: 実行データと履歴
- `posting-history.yaml`の構造改善
- 実際の投稿データ、実行結果

#### 4. `system-config.yaml`（必要時のみ）
**責任**: システム設定
- `account-strategy.yaml`のsystemConfig部分
- Claude統合設定、並列処理設定

### 削除対象ファイル（5ファイル）
- `collection-results.yaml` - 使用実績なし
- `performance-insights.yaml` - 空
- `quality-assessments.yaml` - 使用実績なし  
- `strategic-decisions.yaml` - 空
- `account-strategy.yaml` - 新ファイルに分割統合

## 📝 実装指示

### Phase 1: 新構成ファイル作成
1. **`account-config.yaml`作成**
   - `account-info.yaml` + `growth-targets.yaml`統合
   - アカウント情報、メトリクス、目標を一箇所に統合

2. **`content-strategy.yaml`作成**
   - `account-strategy.yaml`からコンテンツ関連抽出
   - テーマ、投稿パターン、時間設定を統合
   - `content-patterns.yaml`の内容統合

3. **`posting-data.yaml`改善**
   - 既存`posting-history.yaml`の構造改善
   - 実用的なデータ形式に変更

### Phase 2: 整理と削除
1. **動作確認**
   - 新ファイルでの動作テスト
   - 型定義との整合性確認

2. **旧ファイル削除**
   - 使用されていないファイルの削除
   - バックアップ用のアーカイブ作成

### Phase 3: 型定義更新
1. **TypeScript型定義更新**
   - 新ファイル構造に対応した型定義
   - インポート文の修正

## 🚫 MVP制約遵守

### 絶対に追加しない機能
- 統計・分析システム
- 複雑なエラーハンドリング
- 将来の拡張性考慮
- パフォーマンス最適化

### 実装制限
- 各ファイル100行以下を目標
- シンプルな構造のみ
- 今すぐ必要な設定のみ

## 📋 完了基準
1. YAMLファイル数: 9個 → 3-4個
2. 機能重複: 完全排除
3. 巨大ファイル: なし（各100行以下）
4. 空ファイル: なし
5. TypeScriptエラー: なし
6. 既存機能: 動作確認済み

## 📄 出力管理
- **出力先**: `tasks/20250721_114539/outputs/`
- **バックアップ**: `tasks/20250721_114539/outputs/backup/`
- **命名規則**: `TASK-001-yaml-optimization-{name}.yaml`

## 🎯 品質保証
1. TypeScriptコンパイル成功
2. eslint通過
3. 既存機能の動作確認
4. 設定読み込み正常動作確認

---

**重要**: MVP原則に従い、今すぐ必要な機能のみ実装し、将来の拡張は一切考慮しない。