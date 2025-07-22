# TASK-001 不要ファイル・空ディレクトリ削除指示書

## 🎯 **実装目標**

**プロジェクト内の不要バックアップファイルと空ディレクトリを削除し、リポジトリの整理と保守性向上を実現**

## 🚨 **解決すべき問題**

### **1. 開発中バックアップファイルの残留**
```bash
src/core/autonomous-executor.ts.backup
src/core/decision-engine.ts.backup
src/core/decision-engine.ts.backup2
```
- Git管理下に不要なバックアップファイルが残存
- リポジトリサイズの無駄な増大
- 開発者の混乱を招く可能性

### **2. 空ディレクトリの残留**
```bash
data/contexts/          # 空ディレクトリ
data/status/            # 空ディレクトリ
data/communication/     # 空ディレクトリ
data/intermediate/      # 空ディレクトリ
```
- 過去のクリーンアップで削除されたファイルのディレクトリが残存
- `data/context/` と `data/contexts/` の混同リスク

## ✅ **実装内容**

### **Task A: バックアップファイル削除**

#### **A-1. バックアップファイル確認と削除**
```bash
# 1. 現在のバックアップファイル確認
ls -la src/core/*.backup*

# 2. ファイル内容確認（念のため重要な変更がないか確認）
# 注意: 削除前に現在のファイルとの差分チェック推奨

# 3. バックアップファイル削除
rm src/core/autonomous-executor.ts.backup
rm src/core/decision-engine.ts.backup
rm src/core/decision-engine.ts.backup2

# 4. 削除確認
ls -la src/core/*.backup* 2>/dev/null || echo "All backup files removed ✅"
```

#### **A-2. .gitignore更新 (念のため)**
```bash
# .gitignore に追加（将来のバックアップファイル防止）
echo "*.backup" >> .gitignore
echo "*.backup[0-9]*" >> .gitignore
```

### **Task B: 空ディレクトリ削除**

#### **B-1. 空ディレクトリ確認と削除**
```bash
# 1. 空ディレクトリの最終確認
find data/ -type d -empty

# 2. 各ディレクトリの削除実行
rmdir data/contexts/        # 空の場合のみ削除される
rmdir data/status/          # 空の場合のみ削除される  
rmdir data/communication/   # 空の場合のみ削除される
rmdir data/intermediate/    # 空の場合のみ削除される

# 3. 削除確認
find data/ -type d -empty   # 空リストになることを確認
```

#### **B-2. データディレクトリ構造確認**
```bash
# data/ディレクトリの最終的な構造確認
tree data/ || ls -la data/

# 期待される最終構造:
# data/
# ├── autonomous-config.yaml
# ├── account-config.yaml
# ├── content-strategy.yaml
# ├── posting-data.yaml
# ├── context/
# │   ├── current-situation.json
# │   └── execution-history.json
# └── metrics-history/
#     ├── account_test_user.json
#     ├── followers_test_user.json
#     └── posts_test_user.json
```

## 🔧 **技術制約**

### **安全性確保**
- `rmdir` コマンド使用（空ディレクトリのみ削除、安全）
- ファイル削除前の存在確認必須
- 重要ファイルの誤削除防止

### **Git管理**
- 削除ファイルの適切なGit管理
- .gitignoreの適切な更新

## 📋 **テスト要件**

### **削除確認項目**
1. **バックアップファイル**: `src/core/*.backup*` が存在しないこと
2. **空ディレクトリ**: 指定された4つの空ディレクトリが削除されていること
3. **必要ファイル**: 実際のデータファイルが保持されていること
4. **Git状態**: 削除が適切にGitで追跡されていること

### **確認コマンド**
```bash
# 1. バックアップファイル確認
ls -la src/core/*.backup* 2>/dev/null || echo "✅ No backup files"

# 2. 空ディレクトリ確認  
find data/ -type d -empty | wc -l    # 0になることを確認

# 3. 重要ファイル存在確認
ls -la data/autonomous-config.yaml data/account-config.yaml

# 4. Git状態確認
git status
```

## 📁 **作業対象ファイル・ディレクトリ**

### **削除対象**
```
src/core/autonomous-executor.ts.backup
src/core/decision-engine.ts.backup
src/core/decision-engine.ts.backup2
data/contexts/                      # 空ディレクトリ
data/status/                        # 空ディレクトリ
data/communication/                 # 空ディレクトリ
data/intermediate/                  # 空ディレクトリ
```

### **更新対象**
```
.gitignore                          # バックアップファイルパターン追加
```

### **Git操作**
```bash
git rm src/core/*.backup*
git add .gitignore
```

## ✅ **完了基準**

1. **バックアップファイル削除**: src/core/以下にbackupファイルが存在しない
2. **空ディレクトリ削除**: 指定4ディレクトリが削除済み
3. **データ保持**: 重要なデータファイルが保持されている
4. **Git管理**: 削除が適切にGit追跡されている
5. **gitignore更新**: 将来のバックアップファイル生成を防止

## 🚫 **実装禁止事項**

- 重要なデータファイルの削除
- 空でないディレクトリの強制削除（`rm -rf`禁止）
- .gitignoreへの過度なパターン追加

## 📋 **報告書作成要件**

完了後、以下を含む報告書を作成：

1. **削除実行ログ**: 全てのコマンドとその結果
2. **ファイル削除リスト**: 削除されたファイル・ディレクトリの一覧
3. **Git状態確認**: git statusの結果  
4. **最終構造確認**: data/ディレクトリの最終的な構造

---

**重要**: この削除作業により、リポジトリが整理され、開発者の混乱要因が除去され、保守性が向上します。