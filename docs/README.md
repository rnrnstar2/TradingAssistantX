# TradingAssistantX ドキュメント

## 📚 ドキュメント一覧

### 🏗️ アーキテクチャ・構造

- **[directory-structure.md](./directory-structure.md)** - プロジェクト全体構造（src/, tests/, docs/, tasks/の詳細）
- **[workflow.md](./workflow.md)** - メインワークフロー仕様書（3ステップ（スケジュール）/3ステップ（dev）実行、スケジュール設定）
- **[claude.md](./claude.md)** - Claude Code SDK仕様書（エンドポイント別設計、テスト仕様）
- **[kaito-api.md](./kaito-api.md)** - KaitoTwitterAPI仕様書（2層認証、データ制限対策）

### 👥 役割定義

- **[roles/manager-role.md](./roles/manager-role.md)** - Manager権限（指示書作成、Worker統率、実装作業禁止）
- **[roles/worker-role.md](./roles/worker-role.md)** - Worker権限（実装作業、品質チェック、出力管理規則）

## 📋 ドキュメント作成ガイドライン

### ドキュメント構成原則

1. **directory-structure.md**
   - **内容**: ディレクトリ構造とファイルの簡潔なコメントのみ
   - **制限**: 詳細な設計説明や実装詳細は含めない
   - **参照**: 詳細設計は各仕様書（claude.md、kaito-api.md）へ誘導

2. **claude.md**
   - **内容**: Claude Code SDK の設計詳細、エンドポイント仕様、テスト要件
   - **制限**: KaitoAPI関連の内容は含めない
   - **必須項目**: エンドポイント設計、型定義、使用例、テスト仕様

3. **kaito-api.md**
   - **内容**: KaitoTwitterAPI の詳細仕様、認証アーキテクチャ、実装教訓
   - **制限**: Claude SDK関連の内容は含めない
   - **必須項目**: 認証方式、エンドポイント構造、使用例、実API検証手順

### ドキュメント更新時の注意事項

- **責任分離**: 各ドキュメントの責任範囲を明確に保つ
- **重複回避**: 同じ内容を複数のドキュメントに記載しない
- **相互参照**: 詳細情報は適切なドキュメントへのリンクで対応
- **簡潔性**: directory-structure.mdは構造のみ、詳細は各仕様書で管理

### 環境変数・機密情報の取り扱い

- **禁止事項**: 実際のAPIキー、パスワード、秘密鍵の記載
- **推奨形式**: プレースホルダー使用
  - X (Twitter) 認証:
    - `X_USERNAME=your_twitter_username`
    - `X_PASSWORD=your_twitter_password`
    - `X_EMAIL=your_email_address`
    - `X_PROXY=your_proxy_url`
- **設定方法**: `.env`ファイルまたは環境変数として設定
