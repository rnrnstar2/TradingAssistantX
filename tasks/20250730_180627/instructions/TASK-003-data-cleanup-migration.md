# TASK-003: 既存データファイルのクリーンアップと移行

## 🎯 タスク概要

新しいディレクトリ構造に合わせて、既存データファイルの削除・移行を実行します。「1実行 = 1アクション」原則に基づく大幅な簡素化のため、複雑な旧構造のファイルを整理します。

## 📋 必須読込みドキュメント

実装前に以下のドキュメントを必ず読み込んでください：
- `docs/directory-structure.md` - 新しいディレクトリ構造仕様
- `REQUIREMENTS.md` - システム要件定義
- `docs/roles/worker-role.md` - Worker権限での作業範囲

## 🔧 実装要件

### 1. 削除対象ファイル・ディレクトリ

#### contextディレクトリ全体削除
```bash
# 削除対象
data/context/
├── session-memory.yaml
├── current-status.yaml
└── その他すべてのファイル
```

#### active-session.yaml削除
```bash
# 削除対象
data/current/active-session.yaml
```

#### 複雑な実行ディレクトリ構造の整理
各 `data/current/execution-YYYYMMDD-HHMM/` 内の以下を削除：
```bash
# 削除対象（各executionディレクトリ内）
├── claude-outputs/        # ディレクトリごと削除
├── kaito-responses/       # ディレクトリごと削除  
├── posts/                 # ディレクトリごと削除
└── execution-summary.yaml # ファイル削除
```

#### 保持対象（削除しない）
- `data/current/execution-YYYYMMDD-HHMM/` ディレクトリ自体は保持
- `data/config/` ディレクトリとその中身
- `data/learning/` ディレクトリとその中身
- `data/history/` ディレクトリとその中身

### 2. 実装手順

#### ステップ1: 安全確認
```bash
# 現在のディレクトリ構造確認
ls -la data/
ls -la data/current/
ls -la data/context/ 2>/dev/null || echo "context directory not found"
```

#### ステップ2: contextディレクトリ削除
```bash
if [ -d "data/context" ]; then
  echo "🗑️ Removing data/context/ directory..."
  rm -rf data/context/
  echo "✅ data/context/ removed"
else
  echo "📝 data/context/ not found"
fi
```

#### ステップ3: active-session.yaml削除
```bash
if [ -f "data/current/active-session.yaml" ]; then
  echo "🗑️ Removing active-session.yaml..."
  rm data/current/active-session.yaml
  echo "✅ active-session.yaml removed"
else
  echo "📝 active-session.yaml not found"
fi
```

#### ステップ4: 実行ディレクトリ内構造のクリーンアップ
```bash
echo "🧹 Cleaning up execution directories..."

for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "Processing: $exec_dir"
    
    # サブディレクトリ削除
    rm -rf "${exec_dir}claude-outputs/" 2>/dev/null
    rm -rf "${exec_dir}kaito-responses/" 2>/dev/null
    rm -rf "${exec_dir}posts/" 2>/dev/null
    
    # execution-summary.yaml削除
    rm -f "${exec_dir}execution-summary.yaml" 2>/dev/null
    
    echo "✅ Cleaned: $exec_dir"
  fi
done

echo "✅ Execution directories cleanup completed"
```

### 3. 検証手順

#### 削除確認
```bash
# 削除確認
echo "🔍 Verification:"
echo "Context directory exists: $([ -d 'data/context' ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
echo "Active session exists: $([ -f 'data/current/active-session.yaml' ] && echo 'YES (ERROR)' || echo 'NO (OK)')"
echo ""

# 実行ディレクトリ内容確認
echo "Execution directories contents:"
for exec_dir in data/current/execution-*/; do
  if [ -d "$exec_dir" ]; then
    echo "$exec_dir contents: $(ls -1 "$exec_dir" 2>/dev/null | wc -l) items"
    ls -la "$exec_dir" 2>/dev/null || echo "  (empty or inaccessible)"
  fi
done
```

## 🚨 重要な制約事項

### 安全性重視
- **段階的削除**: 一度に全削除せず、段階的に実行
- **確認付き削除**: 削除前に必ずファイル・ディレクトリの存在を確認
- **保持対象の保護**: 削除してはいけないディレクトリを絶対に触らない

### MVP制約遵守
- **シンプルさ優先**: 複雑なバックアップ機能は実装しない
- **最小限の操作**: 必要最小限のクリーンアップのみ
- **統計機能不要**: ファイル削除の統計情報収集は不要

## 📝 実装ガイドライン

### Bashスクリプトの実装
- **エラーハンドリング**: 各操作でエラー確認
- **ログ出力**: 削除処理の進行状況を明確に表示
- **条件確認**: ファイル・ディレクトリ存在確認を必ず実行

### 実行の安全性
- **非破壊的確認**: まず状況確認から開始
- **段階的実行**: 一つずつ削除して状況確認
- **復旧不要**: 削除対象は今後不要なファイルのみ

## ✅ 完了条件

- [ ] `data/context/` ディレクトリが完全に削除されている
- [ ] `data/current/active-session.yaml` が削除されている
- [ ] 全実行ディレクトリ内の以下が削除されている：
  - [ ] `claude-outputs/` ディレクトリ
  - [ ] `kaito-responses/` ディレクトリ
  - [ ] `posts/` ディレクトリ
  - [ ] `execution-summary.yaml` ファイル
- [ ] 削除してはいけないディレクトリ（config, learning, history）が保持されている
- [ ] 実行ディレクトリ自体は保持されている

## 📋 注意事項

### 削除対象の確認
- **二重確認**: 削除前に対象ファイルを必ず確認
- **パス間違い防止**: 削除パスを慎重に指定
- **権限エラー対応**: ファイル権限エラーの適切な処理

### 実行環境
- **作業ディレクトリ**: プロジェクトルートから実行
- **権限確認**: ファイル削除権限の確認
- **出力先制限**: tasks/20250730_180627/reports/REPORT-003-data-cleanup-migration.md にのみ報告書を出力

## 🎯 期待される効果

- ディレクトリ構造の大幅簡素化
- 不要ファイルの完全削除
- 新しいアーキテクチャへの移行準備完了
- データ管理の複雑性削減

## 🔧 検証項目

1. **削除確認**: 指定されたファイル・ディレクトリが削除されている
2. **保持確認**: 削除してはいけないものが保持されている  
3. **構造確認**: 新しいディレクトリ構造に適合している
4. **アクセス確認**: 残存ファイルに正常にアクセスできる