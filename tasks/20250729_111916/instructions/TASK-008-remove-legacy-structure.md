# TASK-008: レガシーディレクトリ構造の削除

## 🎯 タスク概要
main-workflows/ディレクトリとその配下のファイルを完全に削除し、クリーンな構造にする

## 📋 実装内容

### 1. 削除対象ディレクトリ・ファイル

#### 完全削除
```
src/main-workflows/              # ディレクトリごと削除
└── core/
    ├── action-executor.ts       # workflows/に移動済み
    ├── workflow-constants.ts    # workflows/constants.tsに移動済み
    └── その他のファイル
```

### 2. 削除コマンド
```bash
# main-workflows ディレクトリを完全削除
rm -rf src/main-workflows/
```

### 3. 削除後の確認事項

#### インポートパスの確認
削除前に、main-workflows/からのインポートがないことを確認：
```bash
# main-workflows からのインポートを検索
grep -r "from.*main-workflows" src/ tests/
grep -r "import.*main-workflows" src/ tests/
```

#### 残存参照の修正
もし参照が残っていた場合は、新しいパスに修正：
- `../main-workflows/core/action-executor` → `../workflows/action-executor`
- `../main-workflows/core/workflow-constants` → `../workflows/constants`

### 4. Git状態の確認
```bash
# 削除されたファイルの確認
git status

# 削除をステージング
git add -A
```

### 5. 削除後のディレクトリ構造確認
```bash
# src/配下の構造確認
ls -la src/

# 期待される結果
├── claude/
├── data/
├── kaito-api/
├── scheduler/
├── utils/
├── workflows/
├── dev.ts
├── index.ts
└── main.ts
```

## ⚠️ 注意事項
- 削除前に必要なコードが移行済みであることを確認
- バックアップが必要な場合はgitで管理されていることを確認
- 他のファイルからの参照がないことを確認

## 🔧 作業手順
1. インポートパスの確認
2. main-workflows/ディレクトリの削除
3. 残存参照の修正（必要な場合）
4. 動作確認（pnpm dev）

## 📂 成果物
- 削除: `src/main-workflows/` ディレクトリ全体

## ✅ 完了条件
- [ ] main-workflows/ディレクトリが存在しない
- [ ] 他のファイルからの参照エラーがない
- [ ] pnpm dev が正常に動作する
- [ ] git statusで削除が確認できる