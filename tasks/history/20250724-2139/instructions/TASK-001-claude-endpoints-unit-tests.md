# TASK-001: Claude エンドポイント単体テスト実装

## 🎯 タスクの目的

src/claude ディレクトリの4つのエンドポイント（decision, content, analysis, search）に対する包括的な単体テストを実装し、システムの動作確実性を保証する。

## 📋 実装要件

### テストファイル構造
REQUIREMENTS.md「🧪 単体テスト仕様」セクションに従って以下のファイルを作成：

```
tests/
├── claude/
│   ├── endpoints/
│   │   ├── decision-endpoint.test.ts    # 判断エンドポイントテスト
│   │   ├── content-endpoint.test.ts     # コンテンツ生成エンドポイントテスト
│   │   ├── analysis-endpoint.test.ts    # 分析エンドポイントテスト
│   │   └── search-endpoint.test.ts      # 検索クエリエンドポイントテスト
│   ├── types.test.ts                    # 型定義テスト
│   └── index.test.ts                    # エクスポート統合テスト
├── test-utils/
│   ├── mock-data.ts                     # モックデータ生成
│   ├── test-helpers.ts                  # テストヘルパー関数
│   └── claude-mock.ts                   # Claude API モック
└── setup/
    ├── jest.config.js                   # Jest設定
    └── test-env.ts                      # テスト環境初期化
```

## 🧪 各エンドポイント単体テスト詳細仕様

### 1. decision-endpoint.test.ts
**対象**: `src/claude/endpoints/decision-endpoint.ts` の `makeDecision` 関数

**必須テストケース**:
- **正常系テスト**: 
  - 各アクション（post, retweet, quote_tweet, like, wait）の適切な判断結果検証
  - システムコンテキストに基づく適切なアクション選択の確認
- **入力検証テスト**:
  - `DecisionInput` 型の各フィールド組み合わせでの動作確認
  - `SystemContext` の必須フィールド不足時のエラーハンドリング
- **制約チェックテスト**:
  - 日次投稿制限（MAX_POSTS_PER_DAY）到達時の wait 判断
  - システムヘルスチェック失敗時の wait 判断
  - レート制限超過時の wait 判断
- **型安全性テスト**:
  - `ClaudeDecision` 型の返却値構造検証
  - confidence値の範囲（0-1）検証
- **エラーハンドリングテスト**:
  - Claude API失敗時の適切な wait 決定返却
  - 無効な応答形式時のフォールバック処理

### 2. content-endpoint.test.ts  
**対象**: `src/claude/endpoints/content-endpoint.ts` の主要関数

**必須テストケース**:
- **コンテンツ生成テスト**:
  - 各contentType（educational, market_analysis等）での適切なコンテンツ生成
  - targetAudience別の文体・レベル調整の検証
- **品質保証テスト**:
  - Twitter文字数制限（280文字）の遵守確認
  - qualityScore計算の精度検証
  - ハッシュタグ生成の妥当性確認
- **型安全性テスト**:
  - `GeneratedContent` 型の完全な返却値検証
  - metadata情報の正確性確認
- **エラーハンドリングテスト**:
  - 不適切な入力での適切なエラー処理
  - Claude API失敗時のフォールバック処理

### 3. analysis-endpoint.test.ts
**対象**: `src/claude/endpoints/analysis-endpoint.ts` の主要関数

**必須テストケース**:
- **分析機能テスト**:
  - 各analysisType（market, performance, trend）での分析結果検証
  - insights配列の内容品質確認
  - recommendations配列の実用性検証
- **計算精度テスト**:
  - confidence値の妥当性確認
  - データポイント数の正確性
- **型安全性テスト**:
  - `AnalysisResult` 型の完全な返却値検証
  - metadata情報の正確性確認
- **エラーハンドリングテスト**:
  - 不完全なデータでの適切なエラー処理
  - Claude API失敗時のフォールバック処理

### 4. search-endpoint.test.ts
**対象**: `src/claude/endpoints/search-endpoint.ts` の主要関数

**必須テストケース**:
- **検索クエリ生成テスト**:
  - 各purpose（retweet, like, trend_analysis, engagement）での適切なクエリ生成
  - topic別のクエリ最適化確認
- **フィルター条件テスト**:
  - minEngagement設定の反映確認
  - language設定の適用検証
  - verified設定の動作確認
- **型安全性テスト**:
  - `SearchQuery` 型の完全な返却値検証
  - filters オブジェクトの構造確認
- **エラーハンドリングテスト**:
  - 不適切なpurpose指定時のエラー処理
  - Claude API失敗時のフォールバック処理

### 5. types.test.ts
**対象**: `src/claude/types.ts` の型ガードと定数

**必須テストケース**:
- **型ガードテスト**:
  - `isClaudeDecision`, `isGeneratedContent`, `isAnalysisResult`, `isSearchQuery` の全パターンテスト
  - 正常データでの true 返却確認
  - 異常データでの false 返却確認
- **定数テスト**:
  - `VALID_ACTIONS`, `CONTENT_TYPES`, `TARGET_AUDIENCES` 等の定数値確認
  - `SYSTEM_LIMITS` の各値の妥当性確認
- **型互換性テスト**:
  - エンドポイント間での型の整合性確認

### 6. index.test.ts
**対象**: `src/claude/index.ts` のエクスポート統合

**必須テストケース**:
- **エクスポート確認テスト**:
  - 全エンドポイント関数の正常エクスポート確認
  - 全型定義の正常エクスポート確認
- **統合動作テスト**:
  - エンドポイント間の基本的な連携動作確認

## 🛠️ テストユーティリティ実装仕様

### mock-data.ts
```typescript
// 各エンドポイント用のモックデータ生成関数
export const createMockDecisionInput = (): DecisionInput => { ... }
export const createMockSystemContext = (): SystemContext => { ... }
export const createMockContentInput = (): ContentInput => { ... }
// 他のモックデータ生成関数...
```

### test-helpers.ts
```typescript
// テスト用ヘルパー関数
export const validateResponseStructure = (obj: any, expectedKeys: string[]) => { ... }
export const createTestTimeout = (ms: number) => { ... }
// 他のヘルパー関数...
```

### claude-mock.ts
```typescript
// Claude SDK の完全モック実装
export const mockClaude = {
  withModel: jest.fn().mockReturnThis(),
  withTimeout: jest.fn().mockReturnThis(), 
  query: jest.fn().mockReturnThis(),
  asText: jest.fn().mockResolvedValue('mock response')
};
```

## ⚙️ テスト環境設定

### jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/claude/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-env.ts']
};
```

### test-env.ts
```typescript
// テスト環境初期化
process.env.REAL_DATA_MODE = 'false';
process.env.NODE_ENV = 'test';
// Claude SDK モック設定
jest.mock('@instantlyeasy/claude-code-sdk-ts');
```

## 🔍 品質基準・制約事項

### 必須品質基準
- **型安全性**: 全テストでstrict TypeScript使用
- **カバレッジ**: 各エンドポイント90%以上（関数・行・分岐・ステートメント）
- **テスト独立性**: 各テストは他のテストに依存しない設計
- **実行速度**: 全テスト実行時間は30秒以内

### 制約事項
- **実データ禁止**: `REAL_DATA_MODE=false` 必須、全てモックデータ使用
- **Claude API モック**: 実際のClaude API呼び出しは完全禁止、全てモック化
- **並列実行対応**: Jest の並列実行で問題が発生しない設計
- **エラーテスト必須**: 正常系のみでなく、異常系・境界値テストも実装

### MVP制約遵守
- **シンプル実装**: 過度な抽象化や複雑なテストパターンは避ける
- **実用性重視**: 実際のバグ発見につながるテストケースを優先
- **保守性**: テスト追加・修正が容易な構造で実装

## 📝 成果物・完了基準

### 必須成果物
1. **11個のテストファイル**: 上記仕様通りの完全なテストスイート
2. **Jest設定**: 適切に設定されたテスト実行環境
3. **モック実装**: Claude API等の完全なモック化
4. **実行確認**: `npm test` でのテスト全件成功

### 完了基準チェックリスト
- [ ] 全エンドポイントで90%以上のテストカバレッジ達成
- [ ] 正常系・異常系・境界値テストの実装完了
- [ ] 型ガード・定数の完全テスト実装
- [ ] Claude APIモック化による実データ使用回避
- [ ] 並列実行でのテスト安定性確認
- [ ] lint・type-check完全通過
- [ ] 全テスト30秒以内での実行完了

## 🚀 実装アプローチ

### 推奨実装順序
1. **テスト環境構築**: Jest設定・モック実装・ユーティリティ作成
2. **型定義テスト**: types.test.ts から開始（基盤確立）
3. **エンドポイントテスト**: decision → content → analysis → search の順序
4. **統合テスト**: index.test.ts で全体確認
5. **品質確認**: カバレッジ・実行時間・並列実行の最終確認

### 技術ポイント
- **型ガード活用**: TypeScript型ガードを使った堅牢な型チェック
- **境界値重視**: confidence値の0-1範囲、文字数制限等の境界値テスト
- **モック戦略**: Claude SDK モックでの一貫した応答パターン
- **エラーシナリオ**: 実際に発生しうるエラーパターンを網羅

---

**📌 重要**: このタスクはシステムの動作確実性を保証する重要な基盤実装です。品質を最優先とし、妥協のない完全なテストスイートを構築してください。