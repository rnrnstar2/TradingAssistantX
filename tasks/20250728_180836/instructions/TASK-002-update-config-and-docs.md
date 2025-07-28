# TASK-002: 設定ファイルとドキュメントの更新

## 概要
RUN_REAL_API_TESTS環境変数の削除に伴い、関連する設定ファイルとドキュメントを更新します。

## 背景
- RUN_REAL_API_TESTS環境変数を完全に削除
- テストは常に実APIを使用する方針に変更
- 関連するすべての設定とドキュメントを整合性のある状態に更新

## タスク詳細

### 1. package.jsonの更新
```json
// 変更前
"test:api": "RUN_REAL_API_TESTS=true vitest run",
"test:api:kaito": "RUN_REAL_API_TESTS=true vitest run tests/kaito-api",
"test:api:claude": "RUN_REAL_API_TESTS=true vitest run tests/claude"

// 変更後
"test:api": "vitest run",
"test:api:kaito": "vitest run tests/kaito-api",
"test:api:claude": "vitest run tests/claude"
```

### 2. tests/test-env.tsの更新
```typescript
// 以下のコメントを更新
// 実行時は以下の環境変数を設定:
// - RUN_REAL_API_TESTS=true : 実APIテストを有効化  ← この行を削除
// - KAITO_API_TOKEN=xxx : Kaito APIトークン
// - CLAUDE_API_KEY=xxx : Claude APIキー（必要な場合）

// 変更後
// 実行時は以下の環境変数を設定:
// - KAITO_API_TOKEN=xxx : Kaito APIトークン（設定時のみテスト実行）
// - CLAUDE_API_KEY=xxx : Claude APIキー（必要な場合）
```

### 3. tests/README.mdの更新
- RUN_REAL_API_TESTSに関するすべての記述を削除
- 実行例からRUN_REAL_API_TESTS=trueを削除
- 環境変数表からRUN_REAL_API_TESTSの行を削除

例：
```bash
# 変更前
RUN_REAL_API_TESTS=true KAITO_API_TOKEN=your-token pnpm test

# 変更後
KAITO_API_TOKEN=your-token pnpm test
```

### 4. docs/claude.mdの更新
```markdown
# 変更前
- **実APIテスト制御**: テストはRUN_REAL_API_TESTS=trueで明示的に実行

# 変更後
- **実APIテスト制御**: テストはAPIトークン設定時に実行
```

### 5. docs/kaito-api.mdの確認と更新
RUN_REAL_API_TESTSの記述があれば削除

## 実装要件

### 必須要件
1. **完全な削除**
   - RUN_REAL_API_TESTSのすべての記述を削除
   - 関連するコメント、例、説明をすべて更新

2. **一貫性の確保**
   - すべてのドキュメントで同じ説明を使用
   - APIトークンのみでテスト制御することを明記

3. **実行例の更新**
   - すべての実行例からRUN_REAL_API_TESTS=trueを削除
   - 新しい実行方法を明確に示す

### 品質基準
- ドキュメント間で矛盾がない
- 実行方法が明確で理解しやすい
- 不要な情報が残っていない

## ファイル一覧
- package.json
- tests/test-env.ts
- tests/README.md
- docs/claude.md
- docs/kaito-api.md
- その他RUN_REAL_API_TESTSに言及しているドキュメント

## 完了条件
1. すべての設定ファイルとドキュメントからRUN_REAL_API_TESTSが削除されている
2. 新しいテスト実行方法が明確に記載されている
3. ドキュメント間で一貫性が保たれている