# 【Worker向け指示書】 TASK-001: system-overview.md作成

## 🎯 タスク概要
docs/system-overview.mdを新規作成し、システムの全体像を統合的に記述する。

## 📋 実装要件

### 1. 統合対象コンテンツ
以下の内容を適切に統合・整理してください：

1. **REQUIREMENTS.mdから**
   - ビジョンと理想像（セクション🎯 ビジョン、💡 システムの理想像）
   - システムアーキテクチャビジョン（セクション🏗️）
   - ブランディング戦略（セクション🎨）
   - Claude意思決定カタログ（セクション🧠）

2. **既存ドキュメントから**
   - docs/ESSENTIALS.mdの目標・原則部分
   - docs/technical-docs.mdのシステム構成・主要コンポーネント部分

### 2. ドキュメント構成
```markdown
# TradingAssistantX システム概要

## 1. ビジョンと理想像
（REQUIREMENTS.mdのビジョン、理想像を統合）

## 2. システムアーキテクチャ
（REQUIREMENTS.mdのアーキテクチャ + technical-docs.mdのシステム構成）

## 3. ブランディング戦略
（REQUIREMENTS.mdの成長段階別ブランディング）

## 4. Claude Code SDK 意思決定カタログ
（REQUIREMENTS.mdの意思決定カタログ全体）

## 5. 主要コンポーネント
（technical-docs.mdの主要コンポーネント説明）
```

### 3. 品質要件
- マークダウン形式で整形
- 図表・フローチャートはコードブロックで表現
- 冗長な説明を避け、簡潔で実用的な記述
- 技術者が読んで即座に理解できる内容

### 4. 制約事項
- 新規ファイル作成は`docs/system-overview.md`のみ
- 統合元ファイル（REQUIREMENTS.md、ESSENTIALS.md、technical-docs.md）は変更しない
- 文字数制限なし、品質を最優先

### 5. 完了条件
- docs/system-overview.mdが作成されている
- 上記の全セクションが適切に統合されている
- 単体で読んで理解可能な自己完結的な内容

## 📂 出力先
- **作成ファイル**: `docs/system-overview.md`

## 🚨 注意事項
- 既存ドキュメントは削除せず、内容の統合のみ行う
- 重複する内容は整理して1箇所にまとめる
- セクション間の論理的な流れを意識する