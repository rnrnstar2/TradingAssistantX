# TASK-003: Claude SDK エラーハンドリング強化とテストスタブ実装

## 📋 タスク概要
Claude SDKが正しく動作していない問題に対応するため、エラーハンドリングを強化し、テスト環境でのみ使用するスタブを実装する。

## 🎯 目的
- Claude SDK呼び出し部分のエラーハンドリングを強化
- テスト環境でのみ使用するスタブ実装
- 本番環境では実際のClaude SDKを使用（モック使用厳禁）

## 📁 対象ファイル
- `src/claude/endpoints/content-endpoint.ts`
- `src/claude/endpoints/analysis-endpoint.ts`
- `src/claude/endpoints/search-endpoint.ts`

## 🔧 実装詳細

### 1. エラーハンドリングの強化

#### 共通実装パターン
各エンドポイントのClaude SDK呼び出し部分に以下の要素を追加：

1. **try-catchブロック**で呼び出しをラップ
2. **詳細なエラーログ**を出力（エンドポイント名、パラメータ、タイムスタンプなど）
3. **エラーの再スロー**で適切なエラーメッセージを提供

#### content-endpoint.ts の修正内容：
- `generateWithClaudeQualityCheck`関数にエラーハンドリング追加
- エラーログに`endpoint: 'content'`、`topic`、`contentType`、`promptLength`、`timestamp`を含める
- エラーメッセージ: `Claude API呼び出しに失敗しました（content生成）: [詳細]`
- `generateQuoteComment`も同様に修正し、150文字制限のチェックも追加

#### analysis-endpoint.ts の修正内容：
- `callClaudeForAnalysis`関数にエラーハンドリング追加
- エラーログに`endpoint: 'analysis'`、`analysisType`を含める
- エラーメッセージ: `Claude API呼び出しに失敗しました（[analysisType]分析）: [詳細]`

#### search-endpoint.ts の修正内容：
- `callClaudeForSearch`関数にエラーハンドリング追加
- エラーログに`endpoint: 'search'`、`purpose`、`topic`を含める
- エラーメッセージ: `Claude API呼び出しに失敗しました（[purpose]検索）: [詳細]`

### 2. テスト環境でのスタブ実装

#### 各テストファイルでの実装
テストファイルの`beforeAll`フックで以下を実装：

1. `process.env.NODE_ENV === 'test'`の条件チェック
2. `vi.mock('@instantlyeasy/claude-code-sdk-ts')`でSDKをモック化
3. モック実装では、プロンプトの内容に基づいて適切なテストレスポンスを返す

#### テストレスポンスの例：
- 「投資教育」を含むプロンプト → 投資教育関連のサンプルテキスト
- 「引用コメント」を含むプロンプト → 短い引用コメントサンプル
- その他 → デフォルトのテストレスポンス

### 3. 共通テストヘルパーの作成

新規ファイル: `tests/test-utils/claude-sdk-mock.ts`

このファイルで提供する機能：
- `setupClaudeSDKMock()`関数：Claude SDKのモックセットアップ
- テスト環境チェック（非テスト環境での使用を防ぐ）
- プロンプト内容に基づく動的なレスポンス生成

## ✅ 完了条件
- [ ] 各エンドポイントでエラーハンドリングが強化されている
- [ ] エラーログに詳細情報が含まれている
- [ ] テストファイルでClaude SDKがモックされている
- [ ] 本番環境でモックが使用されないことが保証されている
- [ ] `pnpm test tests/claude/`でテストが正常に動作する

## 📝 注意事項
- **重要**: CLAUDE.mdの規約により、本番環境でのモック使用は厳禁
- テスト環境でのみvi.mockを使用
- エラーハンドリングでは詳細なログを残す
- エラーメッセージは開発者にとって有用な情報を含める

## 🚀 実行コマンド
```bash
# テスト実行
pnpm test tests/claude/

# 型チェック
pnpm typecheck

# lint実行
pnpm lint
```

## 💡 実装のヒント
- エラーオブジェクトの型チェックには`error instanceof Error`を使用
- タイムスタンプは`new Date().toISOString()`で生成
- エラーメッセージにはエンドポイント種別を含める（デバッグ時に有用）