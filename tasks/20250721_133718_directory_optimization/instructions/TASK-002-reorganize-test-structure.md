# TASK-002 テストファイル再構成・空タスクディレクトリ整理指示書

## 🎯 **実装目標**

**テストファイルの適切な配置とタスクディレクトリの整理により、プロジェクト構造の一貫性と保守性を向上**

## 🚨 **解決すべき問題**

### **1. テストファイル配置の不統一**
```bash
test-parallel-execution.ts    # ルートディレクトリ（不適切）
tests/integration/           # 適切な配置先
```
- ルートディレクトリにテストファイルが散在
- テストファイルの統一的な管理ができていない

### **2. 空タスクディレクトリの残留**
```bash
tasks/20250721_114532/           # 完全に空
tasks/20250721_122418/           # 空のinstructions/のみ
tasks/20250721_123439_workflow/  # 空
tasks/20250721_005157/           # 空のinstructions/のみ
tasks/20250721_113657/           # 空のinstructions/, reports/のみ
```
- 不完全なタスクセッションディレクトリが残存
- プロジェクト構造の複雑化

## ✅ **実装内容**

### **Task A: テストファイル再構成**

#### **A-1. テストファイル移動**
```bash
# 1. 現在のテストファイル確認
ls -la test-parallel-execution.ts

# 2. tests/ディレクトリ構造確認
mkdir -p tests/unit tests/integration

# 3. テストファイル移動
mv test-parallel-execution.ts tests/unit/parallel-execution.test.ts

# 4. 移動確認
ls -la tests/unit/parallel-execution.test.ts
ls -la test-parallel-execution.ts 2>/dev/null || echo "✅ File moved successfully"
```

#### **A-2. テストファイル内容調整**
```typescript
// tests/unit/parallel-execution.test.ts の内容確認・調整
// 必要に応じてimportパスの修正
// 例: '../src/...' → '../../src/...'
```

#### **A-3. package.json テストスクリプト確認**
```bash
# package.jsonのテストスクリプトがtests/ディレクトリを参照していることを確認
grep -A 5 -B 5 "test" package.json
```

### **Task B: 空タスクディレクトリ整理**

#### **B-1. 空タスクディレクトリ特定と削除**
```bash
# 1. 削除対象ディレクトリの最終確認
echo "=== 完全に空のディレクトリ ==="
ls -la tasks/20250721_114532/
ls -la tasks/20250721_123439_workflow/

echo "=== 空のサブディレクトリのみのディレクトリ ==="  
ls -la tasks/20250721_122418/
ls -la tasks/20250721_005157/
ls -la tasks/20250721_113657/

# 2. 完全に空のディレクトリ削除
rmdir tasks/20250721_114532/ 2>/dev/null || echo "Directory not empty or already removed"
rmdir tasks/20250721_123439_workflow/ 2>/dev/null || echo "Directory not empty or already removed"

# 3. 空のサブディレクトリを含む親ディレクトリの削除
rm -rf tasks/20250721_122418/
rm -rf tasks/20250721_005157/
rm -rf tasks/20250721_113657/

# 4. 削除確認
echo "=== 削除後のtasks/ディレクトリ構造 ==="
ls -la tasks/ | grep "2025072[01]_"
```

#### **B-2. tasks/ディレクトリの最終構造確認**
```bash
# 残存すべきタスクディレクトリの確認
ls -la tasks/

# 期待される構造（実際にコンテンツがあるもののみ）:
# tasks/
# ├── 20250720-124300/              # 完了済みタスク
# ├── 20250720_193739/              # 完了済みタスク
# ├── 20250720_194351_{docs_cleanup}/
# ├── 20250720_232710/
# ├── 20250721-122038/              # outputs/, reports/ あり
# ├── 20250721_000325/              # reports/ あり
# ├── 20250721_001131/              # outputs/, reports/ あり
# ├── 20250721_005158/              # reports/ あり
# ├── 20250721_113406/              # reports/ あり
# ├── 20250721_113658/              # outputs/, reports/ あり
# ├── 20250721_114539/              # outputs/, reports/ あり
# ├── 20250721_115226_issue_driven_cleanup/
# ├── 20250721_123440_workflow/     # outputs/, reports/ あり
# ├── 20250721_131638_config_fix/   # instructions/, reports/ あり
# ├── 20250721_133718_directory_optimization/  # 現在のセッション
# └── 20250721_145259/              # reports/ あり
```

### **Task C: ディレクトリ構造文書化**

#### **C-1. プロジェクト構造ドキュメント更新**
```bash
# CLAUDE.mdのプロジェクト構成セクションで、整理後の構造を反映
# - tests/ディレクトリの説明追加
# - tasks/ディレクトリの説明更新
```

## 🔧 **技術制約**

### **安全性確保**
- テストファイル移動時のimportパス確認
- タスクディレクトリ削除前の内容確認
- 重要なタスク履歴の保持

### **一貫性維持**
- テストファイル命名規則の遵守（*.test.ts）
- ディレクトリ構造の論理的整合性

## 📋 **テスト要件**

### **移動・削除確認項目**
1. **テストファイル移動**: `tests/unit/parallel-execution.test.ts` が存在
2. **ルートファイル削除**: `test-parallel-execution.ts` が存在しない
3. **空ディレクトリ削除**: 指定された5つのタスクディレクトリが削除
4. **importパス**: 移動後のテストファイルが正常に動作

### **確認コマンド**
```bash
# 1. テストファイル移動確認
ls -la tests/unit/parallel-execution.test.ts
ls -la test-parallel-execution.ts 2>/dev/null || echo "✅ Root test file removed"

# 2. 削除されたタスクディレクトリ確認
for dir in "20250721_114532" "20250721_122418" "20250721_005157" "20250721_113657" "20250721_123439_workflow"; do
  ls -la "tasks/$dir" 2>/dev/null || echo "✅ tasks/$dir removed"
done

# 3. テスト実行確認（可能であれば）
npm test 2>/dev/null || pnpm test 2>/dev/null || echo "Test execution skipped"

# 4. Git状態確認
git status
```

## 📁 **作業対象ファイル・ディレクトリ**

### **移動対象**
```
test-parallel-execution.ts → tests/unit/parallel-execution.test.ts
```

### **削除対象**
```
tasks/20250721_114532/           # 完全に空
tasks/20250721_122418/           # 空のサブディレクトリのみ
tasks/20250721_123439_workflow/  # 完全に空
tasks/20250721_005157/           # 空のサブディレクトリのみ
tasks/20250721_113657/           # 空のサブディレクトリのみ
```

### **更新対象**
```
CLAUDE.md                        # プロジェクト構成セクション
```

### **Git操作**
```bash
git add tests/unit/parallel-execution.test.ts
git rm test-parallel-execution.ts
git add CLAUDE.md
```

## ✅ **完了基準**

1. **テストファイル移動**: 適切なディレクトリに移動済み
2. **importパス調整**: テストファイルが正常に動作
3. **空ディレクトリ削除**: 指定5ディレクトリが削除済み
4. **構造文書化**: CLAUDE.mdが最新の構造を反映
5. **Git管理**: 移動・削除が適切にGit追跡されている

## 🚫 **実装禁止事項**

- 重要なタスク履歴を含むディレクトリの削除
- テストファイルの内容変更（移動とパス調整のみ）
- package.jsonのテスト設定の大幅変更

## 📋 **報告書作成要件**

完了後、以下を含む報告書を作成：

1. **移動実行ログ**: テストファイル移動の詳細
2. **削除実行ログ**: タスクディレクトリ削除の詳細
3. **最終構造確認**: tests/とtasks/ディレクトリの最終構造
4. **テスト動作確認**: 移動後のテストファイル実行結果
5. **Git状態確認**: git statusの結果

---

**重要**: この再構成により、テストファイルの管理が統一され、不要なタスクディレクトリが削除され、プロジェクト構造がより整理されます。