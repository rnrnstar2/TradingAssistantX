# TradingAssistantX ドキュメント

## 📚 ドキュメント一覧

### 🚀 はじめに
- [クイックガイド](./quick-guide.md) - セットアップから初回実行まで
- [ESSENTIALS](./ESSENTIALS.md) - システムの本質と重要な基本情報

### 👥 役割別ガイド
- [Manager Role](./roles/manager-role.md) - Manager権限の責務と制限
- [Worker Role](./roles/worker-role.md) - Worker権限の作業指針

### 📖 詳細ドキュメント
- [技術ガイド](./technical-docs.md) - ディレクトリ構造、データフロー、技術仕様
- [X API認証設定](./setup/x-api-authentication.md) - X（Twitter）API認証の設定方法

### 🛠️ 開発ガイド
- [命名規則](./guides/naming-conventions.md) - ファイル・変数・関数の命名ルール
- [出力管理ルール](./guides/output-management-rules.md) - ファイル出力の管理規則
- [削除安全ルール](./guides/deletion-safety-rules.md) - 安全な削除操作のガイドライン
- [YAML駆動開発](./guides/yaml-driven-development.md) - YAML設定ファイルによる開発手法

## 🎯 目的別ナビゲーション

### 初めて使う方
1. [ESSENTIALS](./ESSENTIALS.md)でシステムの本質を理解
2. [クイックガイド](./quick-guide.md)を読んでセットアップ
3. [X API認証設定](./setup/x-api-authentication.md)でAPI認証を完了

### 開発者の方
1. [技術ガイド](./technical-docs.md)でアーキテクチャを理解
2. [開発ガイド](#🛠️-開発ガイド)で開発ルールを確認
3. 役割に応じて[Manager](./roles/manager-role.md)または[Worker](./roles/worker-role.md)ガイドを参照

### 運用担当の方
1. [クイックガイド](./quick-guide.md)で日常運用手順を確認
2. [技術ガイド](./technical-docs.md)でシステム動作を理解
3. トラブル時は各ガイドのトラブルシューティングを参照

## 📋 ドキュメント管理ポリシー

### 更新ルール
- 新機能追加時は既存ドキュメントの適切なセクションに追記
- 新規ドキュメントの作成は原則禁止（REQUIREMENTS.mdで定義された構成のみ）

### 品質基準
- 各ドキュメントは単体で理解可能な自己完結性を保持
- 冗長な内容は避け、簡潔で実用的な記述