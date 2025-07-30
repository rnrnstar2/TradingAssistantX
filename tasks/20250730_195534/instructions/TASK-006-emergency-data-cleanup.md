# TASK-006: 緊急データクリーンアップ完了 - 旧構造完全削除

## 🎯 タスク概要

Worker3で未完了だった緊急データクリーンアップを完了します。新しいディレクトリ構造に完全移行するため、旧構造ファイル・ディレクトリを完全削除します。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様（確認済み）
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 削除対象の確認（現在残存中）

#### 確認コマンド
```bash
echo "🔍 現在の残存状況確認："
echo "Context directory: $([ -d 'data/context' ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
echo "Active session: $([ -f 'data/current/active-session.yaml' ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
echo ""

echo "古い実行ディレクトリ構造:"
for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "  $exec_dir:"
    echo "    claude-outputs: $([ -d "${exec_dir}claude-outputs" ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
    echo "    kaito-responses: $([ -d "${exec_dir}kaito-responses" ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
    echo "    posts: $([ -d "${exec_dir}posts" ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
    echo "    execution-summary.yaml: $([ -f "${exec_dir}execution-summary.yaml" ] && echo 'EXISTS (要削除)' || echo 'DELETED (OK)')"
  fi
done
```

### 2. 段階的削除実行

#### ステップ1: contextディレクトリ完全削除
```bash
echo "🗑️ Step 1: contextディレクトリ削除..."

if [ -d "data/context" ]; then
  echo "  削除実行: data/context/"
  rm -rf data/context/
  echo "  ✅ data/context/ 削除完了"
else
  echo "  📝 data/context/ は既に存在しません"
fi
```

#### ステップ2: active-session.yaml削除
```bash
echo "🗑️ Step 2: active-session.yaml削除..."

if [ -f "data/current/active-session.yaml" ]; then
  echo "  削除実行: data/current/active-session.yaml"
  rm data/current/active-session.yaml
  echo "  ✅ active-session.yaml 削除完了"
else
  echo "  📝 active-session.yaml は既に存在しません"
fi
```

#### ステップ3: 実行ディレクトリ内旧構造削除
```bash
echo "🗑️ Step 3: 実行ディレクトリ内旧構造削除..."

for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "  処理中: $exec_dir"
    
    # post.yamlが存在する場合は保護
    if [ -f "${exec_dir}post.yaml" ]; then
      echo "    📋 post.yaml 保護: 新構造のため保持"
    fi
    
    # 旧構造の削除
    [ -d "${exec_dir}claude-outputs" ] && rm -rf "${exec_dir}claude-outputs" && echo "    ✅ claude-outputs/ 削除"
    [ -d "${exec_dir}kaito-responses" ] && rm -rf "${exec_dir}kaito-responses" && echo "    ✅ kaito-responses/ 削除"
    [ -d "${exec_dir}posts" ] && rm -rf "${exec_dir}posts" && echo "    ✅ posts/ 削除"
    [ -f "${exec_dir}execution-summary.yaml" ] && rm "${exec_dir}execution-summary.yaml" && echo "    ✅ execution-summary.yaml 削除"
    
    echo "    ✅ $exec_dir クリーンアップ完了"
  fi
done
```

### 3. 削除結果の検証

#### 検証スクリプト
```bash
echo "🔍 削除結果検証:"
echo ""

# 削除確認
deleted_correctly=true

if [ -d "data/context" ]; then
  echo "❌ ERROR: data/context/ がまだ存在します"
  deleted_correctly=false
else
  echo "✅ OK: data/context/ は削除されました"
fi

if [ -f "data/current/active-session.yaml" ]; then
  echo "❌ ERROR: data/current/active-session.yaml がまだ存在します"
  deleted_correctly=false
else
  echo "✅ OK: active-session.yaml は削除されました"
fi

# 実行ディレクトリ検証
echo ""
echo "実行ディレクトリ検証:"
for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "  $exec_dir:"
    
    if [ -d "${exec_dir}claude-outputs" ] || [ -d "${exec_dir}kaito-responses" ] || [ -d "${exec_dir}posts" ] || [ -f "${exec_dir}execution-summary.yaml" ]; then
      echo "    ❌ ERROR: 旧構造が残存しています"
      deleted_correctly=false
    else
      echo "    ✅ OK: 旧構造は削除されました"
    fi
    
    if [ -f "${exec_dir}post.yaml" ]; then
      echo "    ✅ OK: post.yaml は保持されています（新構造）"
    fi
  fi
done

echo ""
if [ "$deleted_correctly" = true ]; then
  echo "🎉 全削除処理が正常に完了しました"
else
  echo "⚠️  削除処理でエラーが発生しました。手動で確認してください。"
fi
```

## 🚨 重要な制約事項

### 安全性最優先
- **新構造保護**: `post.yaml`は絶対に削除しない
- **段階的削除**: 一度に全削除せず、段階的に実行
- **確認付き削除**: 削除前に必ずファイル・ディレクトリを確認

### MVP制約遵守
- **最小限の操作**: 必要最小限のクリーンアップのみ
- **復旧不要**: 削除対象は不要ファイルのみ
- **統計機能不要**: 削除統計の収集は不要

## 📝 実装手順

1. **現状確認**: 削除対象ファイル・ディレクトリの存在確認
2. **段階的削除**: Step 1-3の順次実行
3. **結果検証**: 削除完了の確認
4. **最終確認**: 新構造の完全性確認
5. **報告書作成**: 作業完了報告

## ✅ 完了条件

- [ ] `data/context/` ディレクトリが完全に削除されている
- [ ] `data/current/active-session.yaml` が削除されている  
- [ ] 全実行ディレクトリの旧構造が削除されている：
  - [ ] `claude-outputs/` ディレクトリ削除
  - [ ] `kaito-responses/` ディレクトリ削除
  - [ ] `posts/` ディレクトリ削除
  - [ ] `execution-summary.yaml` ファイル削除
- [ ] `post.yaml` ファイルが保持されている（新構造）
- [ ] 削除してはいけないディレクトリが保持されている（config, learning, history）

## 📋 注意事項

### 保護対象の確認
- **新構造ファイル**: `post.yaml` は絶対に削除しない
- **設定ファイル**: `data/config/` 配下は一切触らない
- **学習データ**: `data/learning/` 配下は一切触らない

### 実行環境
- **作業ディレクトリ**: プロジェクトルートから実行
- **権限確認**: ファイル削除権限があることを確認
- **バックアップ不要**: 削除対象は不要ファイルのため

### 出力制限
- **報告書のみ**: tasks/20250730_195534/reports/REPORT-006-emergency-data-cleanup.md にのみ報告書を出力
- **標準出力**: 削除処理の進行状況を標準出力に表示

## 🎯 期待される効果

- 新しいディレクトリ構造への完全移行
- 旧構造ファイルの完全削除
- データ管理の単純化・明確化
- Worker5統合テストの実行準備完了

## 🔧 緊急度

**HIGH PRIORITY**: 他のWorkerの統合テストがこの作業完了を待っています。最優先で実行してください。

## 📖 成功確認方法

最終的に以下の構造になることを確認：

```
data/
├── config/                  # 保持
├── current/                 # 保持
│   ├── execution-YYYYMMDD-HHMM/
│   │   └── post.yaml        # 新構造・保持
│   └── その他ファイル         # 保持（session.yamlなど）
├── history/                 # 保持
└── learning/                # 保持
    ├── engagement-patterns.yaml
    └── successful-topics.yaml
```

**削除確認**: contextディレクトリとactive-session.yamlが存在しないこと
**保持確認**: 新構造のpost.yamlが正常に存在すること