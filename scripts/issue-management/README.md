# Issue Management Scripts

ローカル開発用のイシュー管理スクリプト集です。

## 使用方法

### 1. ローカルでのブランチ作成
```bash
# イシュー番号からブランチを作成
tsx scripts/issue-management/create-branch-from-issue.ts 123

# git worktreeで作業ディレクトリを作成
git worktree add ../ArbitrageAssistant-issue-123 issue-123-feature-name
```

### 2. 依存関係の確認
```bash
# 複数イシューの依存関係をチェック
tsx scripts/issue-management/check-dependencies.ts 123 124 125
```

### 3. マージ順序の計算
```bash
# 依存関係に基づくマージ順序を表示
tsx scripts/issue-management/merge-order-calculator.ts 123 124 125

# マージスクリプトも生成
tsx scripts/issue-management/merge-order-calculator.ts 123 124 125 --generate-script > merge-plan.sh
```

## GitHub Actions について

`.github/workflows/issue-branch-automation.yml` は以下のケースで有用です：

- **チーム開発時**: 他のメンバーがWebUIからイシューを作成する場合
- **CI/CD統合時**: 自動テストやデプロイと連携する場合
- **リモート作業時**: ローカル環境にアクセスできない場合

ローカルClaude Code開発では、スクリプトを直接実行する方が効率的です。