# イシュー駆動開発 トラブルシューティング

## 🔧 よくある問題と解決方法

イシュー駆動開発で遭遇する一般的な問題とその解決策をまとめています。

## 🚨 マージコンフリクト

### 問題: 複数のイシューブランチで同じファイルを編集

#### 症状
```bash
$ git merge main
Auto-merging packages/backend/src/config.ts
CONFLICT (content): Merge conflict in packages/backend/src/config.ts
Automatic merge failed; fix conflicts and then commit the result.
```

#### 解決策

1. **事前予防**
```bash
# 作業開始前に最新のmainを取り込む
git checkout issue-42-feature
git pull origin main
git merge main
```

2. **コンフリクト解決**
```bash
# 1. コンフリクトファイルを確認
git status

# 2. ファイルを編集してコンフリクトマーカーを解決
# <<<<<<< HEAD
# あなたの変更
# =======
# mainブランチの変更
# >>>>>>> main

# 3. 解決後にコミット
git add .
git commit -m "Merge main and resolve conflicts"
```

3. **Claude Code活用**
```bash
# Claude Codeに解決を依頼
# "packages/backend/src/config.tsのマージコンフリクトを解決してください"
```

## 🔄 依存関係の問題

### 問題: 親イシューがマージされていない

#### 症状
- ビルドエラー
- テスト失敗
- 機能が動作しない

#### 解決策

1. **依存関係の確認**
```bash
# イシューの依存関係を確認
gh issue view 42 --json body | jq -r '.body'
```

2. **一時的な回避策**
```typescript
// 開発中のモック実装
const userService = process.env.NODE_ENV === 'development' 
  ? mockUserService 
  : await import('./userService');
```

3. **ブランチの組み合わせテスト**
```bash
# 依存ブランチを含めてテスト
git checkout -b test-integration
git merge issue-40-database
git merge issue-42-user-api
npm test
```

## 🏷️ ブランチ管理の問題

### 問題: 間違ったブランチ名で作業開始

#### 症状
```bash
# 誤: feature/user-auth
# 正: issue-42-user-auth
```

#### 解決策

1. **ブランチ名の変更**
```bash
# ローカルブランチ名を変更
git branch -m feature/user-auth issue-42-user-auth

# リモートにプッシュ済みの場合
git push origin :feature/user-auth
git push -u origin issue-42-user-auth
```

2. **エイリアスの設定**
```bash
# ~/.gitconfig に追加
[alias]
  issue = "!f() { git checkout -b issue-$1-$2; }; f"

# 使用例
git issue 42 user-auth
```

## 📝 イシュー管理の問題

### 問題: イシューが大きすぎて並列作業が困難

#### 症状
- 複数人で作業できない
- 完了までに時間がかかりすぎる
- 依存関係が複雑

#### 解決策

1. **イシューの分割**
```markdown
# 元のイシュー
"ユーザー管理システムの実装"

# 分割後
- #42: ユーザー登録APIの実装
- #43: ログイン機能の実装
- #44: パスワードリセット機能
- #45: ユーザープロフィール機能
```

2. **エピックの活用**
```markdown
# GitHubのエピック機能やプロジェクトボードを使用
Epic: ユーザー管理システム
├── Issue #42: 登録API
├── Issue #43: ログイン
└── Issue #44: プロフィール
```

## 🔍 コード検索の問題

### 問題: 他のイシューブランチの変更を確認したい

#### 解決策

1. **ブランチ間の差分確認**
```bash
# 特定のブランチとの差分
git diff main..issue-43-login

# ファイル一覧のみ
git diff --name-only main..issue-43-login
```

2. **変更の取り込み**
```bash
# 特定のコミットのみ取り込む
git cherry-pick <commit-hash>

# 特定のファイルのみ取り込む
git checkout issue-43-login -- path/to/file
```

## 🚫 CI/CD の失敗

### 問題: プルリクエストでCI/CDが失敗

#### 症状
```
❌ Linting failed
❌ Type checking failed
❌ Tests failed
```

#### 解決策

1. **ローカルでの事前チェック**
```bash
# プッシュ前に必ず実行
npm run lint
npm run check-types
npm test
```

2. **自動修正の活用**
```bash
# Lintエラーの自動修正
npm run lint:fix

# フォーマッタの実行
npm run format
```

3. **pre-commitフックの設定**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run check-types"
    }
  }
}
```

## 💾 データ不整合

### 問題: ブランチ間でデータベーススキーマが異なる

#### 解決策

1. **マイグレーションの管理**
```bash
# ブランチごとのマイグレーション確認
npm run migration:status

# 必要に応じてロールバック
npm run migration:rollback
```

2. **開発用データベースの分離**
```env
# .env.local
DATABASE_URL=postgresql://localhost/myapp_issue_42
```

## 🔐 権限とアクセスの問題

### 問題: APIキーや環境変数の不足

#### 症状
```
Error: Missing API_KEY environment variable
```

#### 解決策

1. **環境変数テンプレート**
```bash
# .env.example を最新に保つ
cp .env.example .env.local
# 必要な値を設定
```

2. **チーム内での共有**
```markdown
## 開発に必要な環境変数
このイシューの実装には以下が必要です：
- API_KEY: 管理者に問い合わせ
- DATABASE_URL: ローカル設定
```

## 🎯 デバッグのコツ

### 1. ログの活用
```typescript
// 開発時のデバッグログ
if (process.env.NODE_ENV === 'development') {
  console.log('[Issue #42]', 'User registration:', userData);
}
```

### 2. ブランチ固有の設定
```typescript
// feature flag的な使い方
const FEATURES = {
  userRegistration: process.env.ISSUE_42_ENABLED === 'true',
};
```

### 3. 問題の切り分け
```bash
# 1. mainブランチで動作確認
git checkout main
npm test

# 2. 問題のあるブランチ
git checkout issue-42-feature
npm test

# 3. 差分の確認
git diff main..HEAD
```

## 🆘 緊急時の対応

### ブランチが壊れた場合

```bash
# バックアップを作成
git checkout issue-42-feature
git checkout -b issue-42-feature-backup

# mainから作り直し
git checkout main
git checkout -b issue-42-feature-new
git cherry-pick <必要なコミット>
```

### 大規模なリファクタリングとの競合

1. **一時停止**
   - 作業を一時停止
   - リファクタリング完了を待つ

2. **早期マージ**
   - 可能な部分だけ先にマージ
   - 残りは後続イシューで対応

## 📚 参考リンク

- [Git公式ドキュメント](https://git-scm.com/doc)
- [GitHub CLI](https://cli.github.com/)
- [マージコンフリクト解決ガイド](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts)

## 💡 最後のアドバイス

1. **予防が最良の対策** - 問題を事前に避ける
2. **早期発見・早期解決** - 小さいうちに対処
3. **チームで共有** - 同じ問題を繰り返さない
4. **ドキュメント化** - 解決策を記録する