# 【Worker向け指示書】 TASK-005: development-rules.md作成

## 🎯 タスク概要
docs/development-rules.mdを新規作成し、開発規約と制約事項を統合的に記述する。

## 📋 実装要件

### 1. 統合対象コンテンツ
以下の内容を完全に統合してください：

1. **guidesディレクトリから全ファイル**
   - docs/guides/naming-conventions.mdの全内容
   - docs/guides/output-management-rules.mdの全内容
   - docs/guides/deletion-safety-rules.mdの全内容
   - docs/guides/yaml-driven-development.mdの配置ルール部分

2. **REQUIREMENTS.mdから**
   - 実装ルール（9項目）
   - 禁止事項

### 2. ドキュメント構成
```markdown
# TradingAssistantX 開発規約

## 1. 命名規則
### ファイル命名規則
（naming-conventions.mdのファイル命名部分）

### 変数・関数命名規則
（naming-conventions.mdの変数命名部分）

### 型定義命名規則
（naming-conventions.mdの型定義部分）

### YAML設定ファイル命名
（naming-conventions.mdのYAML部分）

## 2. 出力管理規則
### 許可された出力先
（output-management-rules.mdの許可リスト）

### 禁止された出力先
（output-management-rules.mdの禁止リスト）

### 出力ファイル命名規則
（output-management-rules.mdの命名規則）

### 違反時の対処
（output-management-rules.mdの検証・修正方法）

## 3. 削除安全規則
### 3ステップ削除プロセス
（deletion-safety-rules.mdの全内容）

### 削除前チェックリスト
### 段階的削除の手順
### ロールバック手順

## 4. YAML駆動開発原則
### YAML配置ルール
（yaml-driven-development.mdの配置ルール）

### YAML優先の設計思想
### 設定と実装の分離

## 5. 実装ルール（必須遵守）
（REQUIREMENTS.mdの実装ルール9項目を箇条書きで）
1. この構造から外れた実装は禁止
2. 新規ファイルは必ず適切なディレクトリに配置
3. data/current/は常に最小限のデータのみ保持
4. 古いデータは自動的にarchivesへ移動
5. コレクターは必ずbase-collectorを継承（疎結合維持）
6. main.tsとdev.tsは共通のcore-runner.tsを使用（DRY原則）
7. 実行前後でintegrity-checker.tsによる検証必須
8. 要件定義にないファイル作成は自動拒否
9. 実行ログは必ず記録し、異常時は即座にロールバック

## 6. 禁止事項
### 絶対禁止リスト
- ルートディレクトリへの出力
- Manager権限での実装作業
- 品質妥協・固定プロセス強制
- モックデータ使用
- その他（REQUIREMENTS.mdの禁止事項）

## 7. コーディング標準
### TypeScript設定
- strict: true必須
- 型安全性の確保

### エラーハンドリング
- try-catchの適切な使用
- エラーログの記録

### テスト要件
- 単体テストの作成
- 統合テストの考慮
```

### 3. 品質要件
- 開発者が迷わないための明確なルール
- 具体例を豊富に含める
- DOとDON'Tを明確に区別
- チェックリスト形式で確認しやすい構成

### 4. 制約事項
- 新規ファイル作成は`docs/development-rules.md`のみ
- 統合元ファイルの内容は省略せず完全に含める
- ルールの優先順位を明確にする

### 5. 完了条件
- docs/development-rules.mdが作成されている
- 4つのguideファイルの内容が完全に統合されている
- REQUIREMENTS.mdの実装ルールが含まれている
- 開発時のリファレンスとして機能する内容

## 📂 出力先
- **作成ファイル**: `docs/development-rules.md`

## 🚨 注意事項
- ルールの根拠や理由も併記する
- 実例を用いて理解しやすくする
- 新規開発者のオンボーディングに使える完成度