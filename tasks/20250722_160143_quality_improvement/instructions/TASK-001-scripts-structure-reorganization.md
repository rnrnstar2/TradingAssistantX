# TASK-001: Scripts構造再編成

## 🎯 目的
scripts/重複構造を解消し、明確な責任分離を実現する

## 🚨 現在の問題
```
❌ 混乱する重複構造:
/scripts/          # ツール・ユーティリティ
├── cleanup/
├── config-management/
└── quality-check.sh

/src/scripts/      # アプリケーションエントリポイント
├── autonomous-runner-single.ts  # package.json:7で使用
├── autonomous-runner.ts
└── oauth1-*.ts
```

**問題点**:
- 責任範囲が不明確
- 新規開発者が混乱
- 保守性の低下

## 🎯 目標構造
```
✅ 明確な責任分離:
/tools/            # 開発・保守ツール
├── cleanup/
├── config-management/
└── quality-check.sh

/src/
├── scripts/       # アプリケーションエントリポイント
│   ├── autonomous-runner-single.ts
│   ├── autonomous-runner.ts
│   └── oauth1-*.ts
└── ...
```

## 📋 実行手順

### Phase 1: ディレクトリ構造変更
1. **新ディレクトリ作成**
   ```bash
   mkdir -p tools/cleanup
   mkdir -p tools/config-management
   ```

2. **ファイル移動**
   ```bash
   # 全ファイルを/tools/に移動
   mv scripts/cleanup/* tools/cleanup/
   mv scripts/config-management/* tools/config-management/
   mv scripts/quality-check.sh tools/
   ```

3. **空ディレクトリ削除**
   ```bash
   rm -rf scripts/
   ```

### Phase 2: 参照パス更新

#### 2.1 設定ファイル更新
- **docs/roles/manager-role.md**
  ```diff
  - scripts/output-management/validate-output-compliance.sh
  + tools/output-management/validate-output-compliance.sh
  ```

- **docs/roles/worker-role.md**
  ```diff  
  - scripts/output-management/validate-output-compliance.sh
  + tools/output-management/validate-output-compliance.sh
  ```

#### 2.2 vitest.config.ts更新
- **vitest.config.ts:36**
  ```diff
  exclude: [
    'tests/',
    'dist/', 
    '**/*.d.ts',
    'tasks/',
  -  'scripts/'
  +  'tools/'
  ],
  ```

#### 2.3 その他参照の一括更新
- 全markdownファイルでscripts/パス参照を確認・更新
- タスク履歴内のscripts/参照を確認（必要に応じて更新）

### Phase 3: 文書更新

#### 3.1 README.md作成（/tools/README.md）
```markdown
# TradingAssistantX 開発・保守ツール

このディレクトリには開発・保守用のツールとスクリプトが含まれています。

## 📁 構成
- `cleanup/` - データクリーンアップツール
- `config-management/` - 設定管理ツール  
- `quality-check.sh` - 品質保証スクリプト

## 🚫 注意
アプリケーションのエントリポイントは`src/scripts/`にあります。
```

#### 3.2 CLAUDE.md更新
- **重要場所**セクションの更新を検討
- ツール使用に関するガイダンス追加

## ✅ 完了条件
1. `/scripts/`ディレクトリが完全に削除されている
2. `/tools/`ディレクトリにすべてのツールが移動済み
3. 全参照パスが正しく更新されている
4. 文書が適切に更新されている
5. ビルド・テストがエラーなく実行できる

## 🧪 検証手順
```bash
# 1. 構造確認
ls -la tools/
ls -la src/scripts/

# 2. ビルドテスト
pnpm run dev

# 3. 品質チェック
tools/quality-check.sh

# 4. 参照チェック
grep -r "scripts/" --include="*.md" docs/
```

## 🚨 重要事項
- package.jsonのscripts設定は変更しない（`src/scripts/`参照のため）
- 既存のgit履歴を保持するため`git mv`の使用を検討
- 作業前に必ずバックアップを取る

## 📊 期待効果
- ✅ 明確な責任分離
- ✅ 開発者体験の向上  
- ✅ 保守性の向上
- ✅ 新規参入者の理解促進