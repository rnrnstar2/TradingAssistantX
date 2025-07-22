# TASK-003: 各データソース別リアルテスト関数実装

## 🎯 実装目標

各データソース（Yahoo Finance、Bloomberg、Reddit、CoinGecko、HackerNews）に特化した**リアル実行テスト関数**を実装する。実際のエラーを確実にキャッチし、Claude修正システムで活用可能な詳細情報を提供。

## 📋 必須実装項目

### 1. Yahoo Financeテスト関数
- **ファイル**: `tests/real-execution/yahoo-finance-real.ts`
- **機能**: 
  - 実際のYahoo Finance検索実行
  - Cookie同意処理テスト
  - タイムアウトエラー検出

### 2. Bloombergテスト関数  
- **ファイル**: `tests/real-execution/bloomberg-real.ts`
- **機能**:
  - サブスクリプション壁の検出
  - 複雑なCookie同意の処理テスト
  - 認証エラーの詳細記録

### 3. Redditテスト関数
- **ファイル**: `tests/real-execution/reddit-real.ts`
- **機能**:
  - Subreddit選択の最適化テスト
  - レート制限エラーの検出
  - コミュニティアクセス可否確認

### 4. CoinGecko APIテスト関数
- **ファイル**: `tests/real-execution/coingecko-real.ts`
- **機能**:
  - API制限の実際の測定
  - レスポンス形式の検証
  - エラーレスポンスの分類

### 5. HackerNews APIテスト関数
- **ファイル**: `tests/real-execution/hackernews-real.ts`
- **機能**:
  - Firebase API接続テスト
  - レスポンス時間変動の記録
  - データ構造変更の検出

## 🚨 制約・注意事項

### MVP制約遵守
- **シンプルテスト**: 基本的な接続・データ取得のみテスト
- **統計回避**: パフォーマンス分析は実装しない
- **現在動作重視**: 将来対応より確実な現在テスト

### 実行制約
- **個別タイムアウト**: 各テスト30秒以内
- **並列制限**: 最大2つまで同時実行
- **リトライ制限**: 各テスト最大2回まで

### エラー分類基準
```typescript
interface DataSourceError {
  category: 'network' | 'authentication' | 'rate_limit' | 'structure_change' | 'content_blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedFix: 'retry' | 'fallback' | 'disable' | 'update_code';
}
```

## 📝 実装詳細

### 共通テスト構造
```typescript
interface SourceTestResult {
  sourceName: string;
  testStartTime: string;
  testEndTime: string;
  success: boolean;
  error?: DataSourceError;
  collectedData?: {
    itemCount: number;
    sampleData: any[];
  };
  performanceMetrics: {
    responseTime: number;
    memoryUsed: number;
  };
}
```

### 各ソース固有テスト項目

#### Yahoo Finance
- 検索フォーム検出テスト
- 検索結果取得テスト
- Cookie同意処理テスト

#### Bloomberg  
- トップページアクセステスト
- 検索機能利用テスト
- サブスクリプション壁検出テスト

#### Reddit
- Subredditアクセステスト
- 検索機能テスト
- 投稿データ取得テスト

#### CoinGecko API
- トレンドAPI呼び出しテスト
- レート制限テスト
- データ形式検証テスト

#### HackerNews API
- トップストーリー取得テスト
- 個別記事取得テスト
- レスポンス時間測定テスト

## ✅ 完了条件

1. 5つのデータソースすべてでリアルテストが実行可能
2. 各ソースで実際にエラーが発生した場合、詳細な分類情報を出力
3. テスト結果がJSON形式で適切に記録される
4. 各テストが30秒以内に完了または適切にタイムアウト
5. エラー情報がClaude修正システムで利用可能な形式
6. TypeScript strict mode完全対応

## 🔗 関連ファイル

- 参考実装: `src/lib/action-specific-collector.ts` (各ソースの実装)
- テスト出力: `tasks/20250722_004919_real_error_learning_system/outputs/`
- 連携: TASK-001のRealTestFrameworkと統合

## 📊 期待される効果

各データソースの**実際の問題点**が明確に特定され、Claude修正システムが適切な修正判断を行えるようになる。モック環境では発見できない**本物のエラー**の検出・修正が可能。

---

**実装品質**: MVP制約準拠、各ソース特化
**実行時間**: 最大180分  
**並列実行**: 可能（TASK-001と並行）