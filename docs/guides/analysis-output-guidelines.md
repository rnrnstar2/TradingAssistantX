# 分析出力ガイドライン

## 🎯 目的
プロジェクトルートディレクトリを汚さないよう、分析レポートやファイル出力の適切な場所を定義します。

## 📁 出力ディレクトリ構造

```
tasks/analysis-results/
├── reports/
│   └── analysis-[日付]/     # 特定日の分析結果
│       ├── dependency-fixes.md
│       ├── quality-report.json
│       └── type-analysis-result.json
├── recommended-tsconfig.base.json
└── current/                 # 最新の分析結果
    ├── quality-report.json
    └── type-usage-report.json
```

## 🚫 禁止事項

### ❌ ルートディレクトリへの直接出力
```bash
# 悪い例
pnpm list -r > dependencies-tree.txt
grep -r "any" > any-type-report.txt

# 良い例
mkdir -p tasks/analysis-results/reports/analysis-$(date +%Y%m%d)
pnpm list -r > tasks/analysis-results/reports/analysis-$(date +%Y%m%d)/dependencies-tree.txt
```

### ❌ 一時ファイルの作成
以下のファイルは `.gitignore` に追加済みです（`tasks/analysis-results/` ディレクトリ内に配置すべき）：
- `*-analysis.md`
- `*-report.txt`
- `*-tree.txt`
- `dependencies-tree.txt`
- `package-usage-report.txt`

## ✅ 推奨パターン

### スクリプトでの出力
```typescript
// TypeScript/JavaScript
const reportsDir = path.join(process.cwd(), 'tasks/analysis-results');
fs.mkdirSync(reportsDir, { recursive: true });
const outputPath = path.join(reportsDir, 'analysis-result.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
```

### Bashでの出力
```bash
# 出力ディレクトリを作成
mkdir -p tasks/analysis-results/reports/analysis-$(date +%Y%m%d)

# 出力先を指定
pnpm list -r > tasks/analysis-results/reports/analysis-$(date +%Y%m%d)/dependencies-tree.txt
```

### タスクでの出力
```bash
# タスクセッションディレクトリに出力
mkdir -p tasks/$(date +%Y%m%d-%H%M%S)/outputs
echo "分析結果" > tasks/$(date +%Y%m%d-%H%M%S)/outputs/analysis.txt
```

## 🧹 クリーンアップ

### 定期的な整理
```bash
# 30日以上古い分析結果を削除
find tasks/analysis-results/reports -name "analysis-*" -type d -mtime +30 -exec rm -rf {} \;
```

### 緊急時の整理
```bash
# ルートディレクトリの分析ファイルを tasks/analysis-results/ に移動
mkdir -p tasks/analysis-results/cleanup-$(date +%Y%m%d)
mv *-analysis.* *-report.* *-tree.* tasks/analysis-results/cleanup-$(date +%Y%m%d)/ 2>/dev/null || true
```

## 📋 チェックリスト

### 新しいスクリプト作成時
- [ ] 出力先が `tasks/analysis-results/` ディレクトリ配下
- [ ] `fs.mkdirSync(reportsDir, { recursive: true })` でディレクトリ作成
- [ ] 出力ファイル名に日付を含む（重複防止）

### タスク実行時
- [ ] 出力先を `tasks/[session-id]/outputs/` に指定
- [ ] 一時ファイルはセッション終了後に削除
- [ ] 重要な結果のみ保存

### レビュー時
- [ ] ルートディレクトリに不要なファイルが残っていない
- [ ] `.gitignore` に一時ファイルパターンが追加されている
- [ ] 分析結果が適切な場所に保存されている

---

**重要**: プロジェクトルートを清潔に保つことで、開発者体験の向上とプロジェクトの保守性を維持できます。