# TASK-003: Claude CLI認証エラーと重複投稿問題の解決

## 📋 タスク概要
Claude Code CLI認証エラーが原因で発生する、コンテンツ生成失敗と重複投稿エラーの解決

## 🎯 現状の問題

### 問題1: Claude CLI認証エラー
- **エラー箇所**: `src/claude/endpoints/content-endpoint.ts:127`
- **エラー内容**: `_ProcessError: Claude Code CLI exited with code 1`
- **メッセージ**: "⚠️ Claude CLI認証が必要です。'claude login'を実行してください。"

### 問題2: 重複投稿エラー（副次的問題）
- **エラー内容**: TwitterAPI.io `"Status is a duplicate. (187)"`
- **根本原因**: Claude認証失敗→フォールバックコンテンツ使用→同一内容の重複投稿

## 📐 実装要件

### 1. Claude CLI認証状態の確認と修復

**docs/claude.md（295-298行目）に記載された短期対応**:
- Claude SDK の最新バージョン確認と更新
- ローカル認証状態の確認（`claude login`の再実行）
- エラーログの詳細分析

### 2. 認証修復手順

```bash
# Step 1: Claude CLIの最新インストール確認
npm list -g @anthropic-ai/claude-code

# Step 2: 必要に応じて最新版にアップデート
npm install -g @anthropic-ai/claude-code@latest

# Step 3: Claude CLI認証の再実行
claude login

# Step 4: 認証状態確認
claude auth status
```

### 3. 認証成功確認のテスト実行

```bash
# 認証修復後のテスト実行
pnpm dev:post
```

**期待される結果**:
- Claude CLI認証エラーが解消される
- 動的なコンテンツが正常生成される
- 重複投稿エラーが解消される

### 4. エラーハンドリング強化（オプション）

`src/claude/endpoints/content-endpoint.ts` の `checkClaudeAuthentication()` 関数で、より詳細なエラー情報を提供:

```typescript
async function checkClaudeAuthentication(): Promise<boolean> {
  try {
    const testResponse = await claude()
      .withModel('haiku')
      .withTimeout(5000)
      .query('Hello')
      .asText();
    
    console.log('✅ Claude CLI認証確認成功');
    return !!testResponse;
  } catch (error: any) {
    console.error('❌ Claude認証エラー:', error);
    
    // 詳細なエラー診断
    if (error?.exitCode === 1) {
      console.error('🔧 解決手順:');
      console.error('  1. claude login を実行してブラウザで認証');
      console.error('  2. 認証完了後、このコマンドを再実行');
      console.error('  3. 問題が続く場合: npm install -g @anthropic-ai/claude-code@latest');
    }
    
    return false;
  }
}
```

## ⚠️ 制約事項

### MVP制約
- **認証修復優先**: まず認証問題の解決に集中
- **シンプル実装**: 複雑なフォールバック機構は不要
- **ドキュメント準拠**: claude.mdの指示に従う

### 技術制約
- **実API使用必須**: CLAUDE.md規約により、モック使用は厳禁
- **Claude Code Max Plan**: 契約プランを最大限活用
- **ローカル認証**: `claude login`での認証が必要

## ✅ 完了条件

### 主要な成功条件
1. `claude login` 認証が成功する
2. `pnpm dev:post` が正常実行される
3. 動的コンテンツが生成される（固定コンテンツでない）
4. 重複投稿エラーが発生しない

### 動作確認テスト
```bash
# 各アクションの動作確認
pnpm dev:post    # 投稿アクション
pnpm dev:quote   # 引用ツイートアクション
pnpm dev:like    # いいねアクション
```

## 📝 報告書作成時の確認事項

### 認証修復プロセス
- 実行した認証コマンドと結果
- Claude CLI認証状態の変化
- エラーメッセージの改善状況

### 動作確認結果
- 各アクションの実行結果
- 生成されたコンテンツの品質
- 重複投稿エラーの解消確認
- 実行時間とパフォーマンス

### トラブルシューティング
- 発生した問題と解決方法
- 今後の予防策
- 追加で必要な改善点