# TASK-003: package.json dev script削除

## 🎯 実装目標

package.jsonから `"dev": "tsx src/dev.ts"` スクリプトを削除し、アクション選択必須化（TASK-001、TASK-002）と整合性を取る。

## 📋 現在の問題

### 🔧 現状のpackage.json scripts
```json
{
  "scripts": {
    "dev": "tsx src/dev.ts",               // ← 削除対象
    "dev:post": "tsx src/dev.ts --action post",
    "dev:retweet": "tsx src/dev.ts --action retweet",
    "dev:like": "tsx src/dev.ts --action like",
    "dev:quote": "tsx src/dev.ts --action quote_tweet",
    "dev:follow": "tsx src/dev.ts --action follow",
    "start": "tsx src/main.ts",
    // ... 他のスクリプト
  }
}
```

### ⚠️ 問題点
- **TASK-001・002との不整合**: dev.tsとworkflowでアクション必須化したのに、引数なしスクリプトが残存
- **混乱の原因**: `pnpm dev` が実行できてしまうため、ユーザーが混乱
- **非推奨機能の温存**: 廃止した機能へのアクセス経路が残る

## 🔧 修正内容

### Phase 1: devスクリプト削除

#### 📍 修正対象
`package.json` - 7行目の削除

#### 修正前
```json
{
  "scripts": {
    "dev": "tsx src/dev.ts",
    "dev:post": "tsx src/dev.ts --action post",
    "dev:retweet": "tsx src/dev.ts --action retweet",
    "dev:like": "tsx src/dev.ts --action like",
    "dev:quote": "tsx src/dev.ts --action quote_tweet",
    "dev:follow": "tsx src/dev.ts --action follow",
    "start": "tsx src/main.ts",
    // ...
  }
}
```

#### 修正後
```json
{
  "scripts": {
    "dev:post": "tsx src/dev.ts --action post",
    "dev:retweet": "tsx src/dev.ts --action retweet",
    "dev:like": "tsx src/dev.ts --action like",
    "dev:quote": "tsx src/dev.ts --action quote_tweet",
    "dev:follow": "tsx src/dev.ts --action follow",
    "start": "tsx src/main.ts",
    // ...
  }
}
```

### Phase 2: 動作確認

#### 🧪 テスト項目
```bash
# 期待される動作
pnpm dev            # → "Missing script: dev" エラー
pnpm dev:post       # → 正常実行
pnpm dev:retweet    # → 正常実行
pnpm dev:like       # → 正常実行
pnpm dev:quote      # → 正常実行
pnpm dev:follow     # → 正常実行
pnpm start          # → 正常実行（本番モード）
```

## 🎯 実装指針

### 品質要件
- **JSON形式維持**: 適切なJSON構文を保持
- **他スクリプト保護**: dev:xxx、start、test等は影響なし
- **整合性確保**: TASK-001、TASK-002との完全整合

### 依存関係
- **TASK-001・002後**: dev.ts、main-workflow.tsの修正完了後に実行
- **独立性**: 他のタスクに影響しない単純な削除作業

## 📁 影響するファイル

### 直接修正対象
- `package.json` - scriptsセクションの1行削除

### 動作確認対象
- 全dev:xxxスクリプト - 正常動作の確認
- npm/pnpm実行環境 - スクリプト認識の確認

## ⚠️ 重要な制約

### 保持すべきスクリプト
- ✅ `dev:post`, `dev:retweet`, `dev:like`, `dev:quote`, `dev:follow` - 必須保持
- ✅ `start` - 本番実行スクリプト
- ✅ `test`, `manager`, `worker` 等 - その他の機能スクリプト

### 削除対象
- ❌ `"dev": "tsx src/dev.ts"` のみ

## ✅ 完了基準

1. **devスクリプト削除完了**: package.jsonから該当行を完全削除
2. **JSON形式確認**: 有効なJSON構文を維持
3. **動作確認完了**: `pnpm dev` でエラー、dev:xxxで正常実行
4. **他スクリプト保護**: start、test等の正常動作確認
5. **整合性確認**: TASK-001・002との完全整合

## 🔧 実装順序

1. **Phase 1**: package.json修正（1行削除）
2. **Phase 2**: JSON構文確認
3. **Phase 3**: 動作テスト（pnpm dev → エラー確認）
4. **Phase 4**: 他スクリプト動作確認

## 📋 報告書作成要件

実装完了後、`tasks/20250730_202653/reports/REPORT-003-package-json-dev-script-removal.md`に以下内容で報告書を作成：

1. **削除サマリー**: 削除したスクリプト名・理由
2. **動作確認結果**: pnpm dev（エラー）、dev:xxx（正常）の確認結果
3. **整合性確認**: TASK-001・002との整合性確認結果
4. **保護確認**: 他の重要スクリプトへの影響なし確認
5. **今後の運用**: 新しいアクション追加時のpackage.json更新方法

---

**🚨 CRITICAL**: この削除により、非推奨機能への誤ったアクセスが完全に防止され、TASK-001・002で実装したアクション選択必須化が完全に機能する。システム一貫性の確保に必須の最終調整。