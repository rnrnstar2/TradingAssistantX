# 【Worker向け指示書】 TASK-007: 旧ドキュメントのクリーンアップ

## 🎯 タスク概要
新しいドキュメント構造への移行完了後、旧ドキュメントを適切に処理する。

## ⚠️ 実行条件
**重要**: このタスクはTASK-001〜006が全て完了し、新ドキュメントが正常に作成されていることを確認してから実行してください。

## 📋 実装要件

### 1. 削除対象ファイル
以下のファイルを削除してください：

```
docs/ESSENTIALS.md
docs/quick-guide.md  
docs/technical-docs.md
docs/guides/deletion-safety-rules.md
docs/guides/naming-conventions.md
docs/guides/output-management-rules.md
docs/guides/yaml-driven-development.md
docs/setup/x-api-authentication.md
```

### 2. ディレクトリ削除
空になったディレクトリも削除：
```
docs/guides/
docs/setup/
```

### 3. 削除前チェックリスト
各ファイルを削除する前に以下を確認：

- [ ] 新しいドキュメントに内容が統合されているか
- [ ] 重要な情報の漏れがないか
- [ ] 削除によって壊れるリンクがないか

### 4. 実行手順
1. まず削除対象ファイルの一覧を確認（ls -la）
2. 念のためバックアップを作成（任意）
3. 個別にファイルを削除
4. 空ディレクトリを削除
5. 最終的なディレクトリ構造を確認

### 5. 最終的なdocs/構造
```
docs/
├── README.md
├── roles/
│   ├── manager-role.md
│   └── worker-role.md
├── system-overview.md
├── quick-start.md
├── technical-guide.md
├── operation-guide.md
└── development-rules.md
```

## 📂 削除コマンド例
```bash
# ファイル削除
rm docs/ESSENTIALS.md
rm docs/quick-guide.md
rm docs/technical-docs.md
rm docs/guides/*.md
rm docs/setup/x-api-authentication.md

# ディレクトリ削除
rmdir docs/guides
rmdir docs/setup
```

## 🚨 注意事項
- 削除は慎重に実行する
- 不安な場合は削除前にManager（またはユーザー）に確認
- git管理下なので、誤削除してもgitで復元可能

## 完了条件
- 旧ドキュメントが全て削除されている
- docs/ディレクトリが新構造のみになっている
- エラーなく処理が完了している