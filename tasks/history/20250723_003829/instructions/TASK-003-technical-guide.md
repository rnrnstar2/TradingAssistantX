# 【Worker向け指示書】 TASK-003: technical-guide.md作成

## 🎯 タスク概要
docs/technical-guide.mdを新規作成し、技術仕様とアーキテクチャの詳細を統合的に記述する。

## 📋 実装要件

### 1. 統合対象コンテンツ
以下の内容を適切に統合・整理してください：

1. **REQUIREMENTS.mdから**
   - srcディレクトリ構造（詳細）
   - dataディレクトリ構造（最重要）
   - 疎結合設計の重要性
   - ハルシネーション防止機構

2. **既存ドキュメントから**
   - docs/technical-docs.mdの技術仕様部分
   - docs/guides/yaml-driven-development.mdのYAML仕様部分

### 2. ドキュメント構成
```markdown
# TradingAssistantX 技術ガイド

## 1. ディレクトリ構造
### /src ディレクトリ詳細
（REQUIREMENTS.mdのsrc構造 + 各ファイルの役割説明）

### /data ディレクトリ詳細（最重要）
（REQUIREMENTS.mdのdata構造 + YAML設定の詳細）

### /tasks ディレクトリ
（タスク管理とアウトプット構造）

## 2. データフロー設計
### 実行フロー
（自律実行開始から結果記録までのフロー図）

### データの流れ
（収集→意思決定→生成→投稿→学習のサイクル）

## 3. 疎結合Collector設計
### 設計原則
（REQUIREMENTS.mdの疎結合設計の重要性）

### Collectorインターフェース
- base-collector.ts の役割
- CollectionResult型の構造
- 新規Collector追加方法

## 4. YAML仕様
### 設定ファイル仕様
（yaml-driven-development.mdの内容）

### 各YAMLファイルの詳細
- autonomous-config.yaml
- posting-times.yaml
- rss-sources.yaml
- account-status.yaml
- 他重要ファイル

## 5. ハルシネーション防止機構
### 整合性検証システム
（REQUIREMENTS.mdのハルシネーション防止機構）

### integrity-checker.tsの役割
- 実行前検証
- 実行後検証
- ロールバック機能

## 6. 拡張ポイント
### 新機能追加時の考慮事項
### プラグイン的な設計思想
```

### 3. 品質要件
- 技術者向けの詳細な説明
- コード例を適切に含める
- 図表はASCIIアートやマークダウンのコードブロックで表現
- 実装時に参照しやすい構成

### 4. 制約事項
- 新規ファイル作成は`docs/technical-guide.md`のみ
- 統合元ファイルは変更しない
- 技術的な正確性を最優先

### 5. 完了条件
- docs/technical-guide.mdが作成されている
- ディレクトリ構造が完全に説明されている
- YAML仕様が詳細に記述されている
- 疎結合設計の利点が明確に説明されている

## 📂 出力先
- **作成ファイル**: `docs/technical-guide.md`

## 🚨 注意事項
- dataディレクトリの説明は特に詳細に
- 新規開発者が読んで実装できるレベルの詳細度
- 将来の拡張性を意識した記述