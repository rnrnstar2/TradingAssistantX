# 指示書: Kaito API 統合テスト整備

## タスク概要
dev.tsとmain.tsの実行フローに沿った統合テストを整備し、全体的なテスト実行を確認する。

## 実装要件

### 1. 統合テストシナリオ

#### シナリオ1: 投稿フロー
```typescript
describe('Integration - Post Flow', () => {
  it('should complete full post flow', async () => {
    // 1. 認証
    // 2. Claude決定（post）
    // 3. コンテンツ生成
    // 4. 投稿実行
    // 5. 結果記録
  });
});
```

#### シナリオ2: リツイートフロー
```typescript
describe('Integration - Retweet Flow', () => {
  it('should complete full retweet flow', async () => {
    // 1. 認証
    // 2. Claude決定（retweet）
    // 3. 検索クエリ生成
    // 4. ツイート検索
    // 5. リツイート実行
    // 6. 結果記録
  });
});
```

#### シナリオ3: いいねフロー
```typescript
describe('Integration - Like Flow', () => {
  it('should complete full like flow', async () => {
    // 1. 認証
    // 2. Claude決定（like）
    // 3. 対象ツイート特定
    // 4. いいね実行
    // 5. 結果記録
  });
});
```

### 2. エラーリカバリーテスト

```typescript
describe('Error Recovery', () => {
  it('should retry on temporary network failure')
  it('should handle rate limit and wait')
  it('should fallback on authentication failure')
  it('should continue execution after non-critical errors')
});
```

### 3. テスト実行スクリプト作成

`/tests/kaito-api/run-tests.ts`:
```typescript
import { execSync } from 'child_process';

async function runAllTests() {
  console.log('🧪 Kaito API テスト実行開始...\n');
  
  const testSuites = [
    { name: 'Core Client Tests', path: 'tests/kaito-api/core/client.test.ts' },
    { name: 'Tweet Endpoints Tests', path: 'tests/kaito-api/endpoints/tweet-endpoints.test.ts' },
    { name: 'Action Endpoints Tests', path: 'tests/kaito-api/endpoints/action-endpoints.test.ts' },
    { name: 'Integration Tests', path: 'tests/kaito-api/integration/*.test.ts' }
  ];
  
  for (const suite of testSuites) {
    console.log(`\n▶️  実行中: ${suite.name}`);
    try {
      execSync(`npm test -- ${suite.path}`, { stdio: 'inherit' });
      console.log(`✅ ${suite.name} 完了`);
    } catch (error) {
      console.error(`❌ ${suite.name} 失敗`);
      process.exit(1);
    }
  }
  
  console.log('\n✨ 全テスト完了！');
}
```

### 4. カバレッジレポート生成

```bash
# カバレッジ測定コマンド
npm test -- --coverage --coverageDirectory=tasks/outputs/coverage \
  --collectCoverageFrom="src/kaito-api/**/*.ts" \
  --coveragePathIgnorePatterns="types.ts,index.ts"
```

### 5. テスト結果サマリー作成

`tasks/outputs/test-summary.md`:
```markdown
# Kaito API テスト実行サマリー

## 実行日時
2024-01-28 18:00:00

## テスト結果

### 単体テスト
| テストスイート | 成功 | 失敗 | スキップ | カバレッジ |
|------------|-----|-----|---------|-----------|
| client.test.ts | XX | 0 | 0 | 95% |
| tweet-endpoints.test.ts | XX | 0 | 0 | 93% |
| action-endpoints.test.ts | XX | 0 | 0 | 94% |

### 統合テスト
| シナリオ | 結果 | 実行時間 |
|---------|-----|---------|
| 投稿フロー | ✅ | XXXms |
| リツイートフロー | ✅ | XXXms |
| いいねフロー | ✅ | XXXms |

### カバレッジサマリー
- 全体カバレッジ: XX%
- ステートメント: XX%
- ブランチ: XX%
- 関数: XX%
- 行: XX%

## 使用APIメソッド確認
✅ KaitoApiClient.post()
✅ KaitoApiClient.retweet()
✅ KaitoApiClient.like()
✅ TweetEndpoints.searchTweets()
✅ ActionEndpoints.post()
✅ ActionEndpoints.like()

## 推奨事項
[テスト結果に基づく改善提案]
```

### 6. package.jsonスクリプト追加確認

```json
{
  "scripts": {
    "test:kaito": "jest tests/kaito-api --verbose",
    "test:kaito:watch": "jest tests/kaito-api --watch",
    "test:kaito:coverage": "jest tests/kaito-api --coverage"
  }
}
```

## 技術的制約
- Jest設定の確認
- TypeScript設定の確認
- 環境変数REAL_DATA_MODE=false
- モック完全実装

## 品質基準
- 全テストスイート成功
- 総合カバレッジ90%以上
- 実行時間10秒以内
- メモリリーク無し

## 出力要件
- テスト実行スクリプト: `/tests/kaito-api/run-tests.ts`
- テストサマリー: `tasks/outputs/test-summary.md`
- カバレッジレポート: `tasks/outputs/coverage/`
- 最終レポート: `tasks/outputs/final-report.md`

## 完了条件
- 全テストファイル整備完了
- テスト実行成功
- カバレッジ基準達成
- dev/main.ts実行に必要な全APIテスト完了