# TASK-003: Git管理正常化

## 🎯 目標
405ファイルのGit状態整理・影響評価実行（Critical Fix C完了）

## 📊 現状分析
- 405ファイルがunstaged状態
- 多数のstagedファイルが混在
- 変更影響の分類・評価未完了
- コミット戦略未実行

## 🔧 段階的Git整理戦略

### Phase 1: Core修正の優先staging
```bash
# 型修正（最優先）
git add src/core/autonomous-executor.ts

# 新メソッド（機能追加）
git add src/lib/action-specific-collector.ts

# テスト修正
git add src/utils/test-helper.ts
```

### Phase 2: 影響度分類
**High Impact（即座コミット必要）**:
- TypeScript型エラー修正
- 実行時間最適化修正
- クリティカル機能修正

**Medium Impact（別コミットに分離）**:
- 新機能追加
- テストファイル追加
- 設定ファイル更新

**Low Impact（アーカイブ候補）**:
- 実験的機能
- 一時的修正
- 重複ファイル

### Phase 3: 戦略的コミット実行
```bash
# Commit 1: Critical Fixes
git add [core-fixes] && git commit -m "fix: TypeScript型エラー・実行時間・クリティカル修正"

# Commit 2: New Features  
git add [new-features] && git commit -m "feat: 新機能・テスト・設定追加"

# Commit 3: Documentation & Cleanup
git add [docs-cleanup] && git commit -m "docs: ドキュメント更新・クリーンアップ"
```

## 📋 実装手順

### Step 1: 現状詳細分析
```bash
# 変更ファイル分析
git status --porcelain > git-status-analysis.txt

# 各ファイルの変更内容確認
git diff --name-status

# staged vs unstaged分析
git diff --cached --name-only > staged-files.txt
git diff --name-only > unstaged-files.txt
```

### Step 2: 影響度評価マトリックス作成
各ファイルを以下基準で分類：
- **Critical**: システム動作に直接影響
- **Feature**: 新機能・拡張
- **Test**: テスト関連
- **Config**: 設定・環境
- **Docs**: ドキュメント・コメント

### Step 3: 段階的staging実行
1. Critical修正のみstaging
2. 検証・テスト実行
3. 問題なしを確認後コミット
4. 次の影響度レベルに進行

## ✅ 検証要件
- 各段階でテスト実行
- コミット前の動作確認
- 既存機能への影響評価

## 📊 Success Metrics
- ✅ `git status`: 適切なstaging状態
- ✅ コミットメッセージの明確性
- ✅ 変更影響の完全分類

## 📝 出力要件

### 必須出力ファイル
1. **分析結果**: `tasks/20250721_220716/outputs/git-impact-analysis.yaml`
2. **コミット戦略**: `tasks/20250721_220716/outputs/commit-strategy.md`
3. **実行ログ**: `tasks/20250721_220716/outputs/git-normalization.log`

### 報告書
`/Users/rnrnstar/github/TradingAssistantX/tasks/20250721_220716/reports/REPORT-003-git-management-normalization.md`

## ⚠️ 制約事項
- 15分以内完了必須
- データ損失絶対禁止
- 各段階でのbackup作成
- 影響評価の完全性確保

## 🚨 安全ガード
- `git stash`でbackup作成
- 段階的実行（一気に実行禁止）
- 各コミット前の動作確認必須