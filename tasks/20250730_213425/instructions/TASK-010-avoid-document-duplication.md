# ドキュメント重複回避・適切な内容分離指示書

## タスク概要
docs/deep-night-analysis.mdから他のドキュメントと重複する内容を削除し、深夜分析特有の内容のみに集約する。各ドキュメントの責任範囲を明確に分離する。

## 修正対象ファイル
- docs/deep-night-analysis.md

## 他ドキュメントとの役割分担

### docs/workflow.md（ワークフロー全般）
**記載内容**: 
- 基本的な3ステップワークフロー
- 全アクション共通の実行フロー
- dev実行 vs スケジュール実行
- analyzeアクションの基本説明

**deep-night-analysis.mdで削除すべき重複**:
- 基本3ステップの詳細説明（28-33行目）
- 実装コードの詳細（37-42行目）
- ワークフロー全般の説明

### docs/kaito-api.md（KaitoAPI仕様）
**記載内容**:
- `/twitter/tweets`エンドポイントの詳細仕様
- APIキー認証方法
- パラメータ仕様
- レート制限

**deep-night-analysis.mdで削除すべき重複**:
- KaitoAPIエンドポイントの詳細説明（47-50行目の詳細部分）
- 認証方法の説明
- APIの基本的な使用方法

### docs/claude.md（Claude SDK仕様）
**記載内容**:
- Claude SDKの基本設定
- プロンプト生成システム
- エンドポイント設計

**deep-night-analysis.mdで削除すべき重複**:
- Claude SDKの基本的な使用方法
- プロンプト生成の詳細

### docs/directory-structure.md（ディレクトリ構造）
**記載内容**:
- ファイル・ディレクトリ構造
- データ保存先の階層

**deep-night-analysis.mdで削除すべき重複**:
- ファイル構造の詳細説明
- 保存先ディレクトリの詳細

## deep-night-analysis.md固有内容（残すべき）

### 深夜分析特有の機能
- analyzeアクション固有の処理内容
- 投稿エンゲージメント分析の詳細
- 50件投稿メトリクス取得の特殊性
- strategy-analysis.yamlの構造と活用方法

### 削除対象の具体的内容

#### 1. 基本ワークフロー説明の削除（28-42行目）
**現在**:
```markdown
### 基本3ステップ
analayzeアクションは他のアクション同様に3ステップで実行：

1. **データ収集**: 最新50件の投稿メトリクス取得・更新
2. **アクション実行**: 投稿エンゲージメント分析（Claude分析）
3. **結果保存**: strategy-analysis.yamlと学習データ更新

### 実装コード
```typescript
// actionが'analyze'の場合
if (action === 'analyze') {
  await this.executeDeepNightAnalysis();
}
```
```

**修正後**:
```markdown
### 実行フロー概要
analyzeアクション実行時の特殊処理：最新50件の投稿メトリクス分析と戦略データ生成

詳細な実行フローは [workflow.md](workflow.md#analyzeアクション詳細) を参照
```

#### 2. KaitoAPI基本説明の削除（47-50行目）
**現在**:
```markdown
KaitoAPIの`/twitter/tweets`エンドポイントを使用して50件の投稿メトリクスを一括取得し、エンゲージメント率を計算して保存します。

**取得データ**: いいね、RT、リプライ、インプレッション数、投稿日時
```

**修正後**:
```markdown
最新50件の自分の投稿のエンゲージメントメトリクスを取得・分析

APIエンドポイント詳細は [kaito-api.md](kaito-api.md#ツイートID一括取得) を参照
```

#### 3. ファイル構造説明の削除（111-112行目）
**現在**:
```markdown
**参照元**: 実装時の統合先は`src/workflows/main-workflow.ts`と`src/shared/data-manager.ts`
```

**修正後**:
```markdown
実装ファイル構造は [directory-structure.md](directory-structure.md) を参照
```

## 修正後の理想的な構造

### 新しいセクション構成（100行程度）
```markdown
# 深夜分析システム仕様書

## 概要
- analyzeアクションの特殊性
- 投稿エンゲージメント分析の目的

## 投稿エンゲージメント分析
- 50件投稿メトリクス分析の詳細
- 分析アルゴリズム

## 戦略データ生成
- strategy-analysis.yamlの構造
- 学習データ累積更新

## プロンプト変数活用
- 通常ワークフローでの活用方法

## 実装要件（MVP版）
- 必須実装項目のみ
```

## 相互参照の追加

### 適切な参照リンク
- 基本ワークフロー → [workflow.md](workflow.md)
- KaitoAPI仕様 → [kaito-api.md](kaito-api.md)
- Claude SDK → [claude.md](claude.md)
- ファイル構造 → [directory-structure.md](directory-structure.md)

## 品質基準
- 深夜分析特有の内容のみ記載
- 他ドキュメントとの重複完全回避
- 必要な情報は適切なドキュメントへ参照
- 100行程度の簡潔なドキュメント
- 独立して読んでも理解できる構造