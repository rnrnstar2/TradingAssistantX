# TASK-001: リアルデータソース実行テストフレームワーク構築

## 🎯 実装目標

**Claudeによる対話的エラー修正システム**を構築する。モックではなく、実際のデータソース（Yahoo Finance、Bloomberg、Reddit等）にアクセスして発生する**本物のエラー**を検出し、Claudeが直接修正するテストシステム。

## 📋 必須実装項目

### 1. リアル実行テストクラス
- **ファイル**: `tests/real-execution/real-datasource-tests.ts`
- **機能**: 実際のウェブサイト・APIにアクセスして情報収集を実行
- **対象**: Yahoo Finance、Bloomberg、Reddit、CoinGecko API、HackerNews API

### 2. エラー検出・報告システム
- **クラス**: `RealErrorDetector`
- **機能**: 
  - 実際のエラーを詳細キャッチ
  - エラー内容の構造化記録
  - Claude用レポート生成

### 3. テスト実行制御
- **関数**: `executeRealTest(sourceName: string)`
- **機能**: 
  - タイムアウト設定（各ソース30秒）
  - エラー分類（一時的 vs 恒久的）
  - 結果のJSON出力

## 🚨 制約・注意事項

### MVP制約遵守
- **シンプル実装**: 複雑な分析機能は実装しない
- **統計機能最小限**: エラー数カウントのみ
- **現在動作最優先**: 将来拡張性より確実な動作

### 技術制約
- **実行時間制限**: 各テスト最大30秒
- **並列制限**: 最大3つのソースまで同時テスト
- **メモリ制限**: 50MB以下

### 出力管理
- **出力先**: `tasks/20250722_004919_real_error_learning_system/outputs/` のみ
- **ファイル命名**: `real-test-{sourceName}-{timestamp}.json`
- **ルートディレクトリ出力禁止**

## 📝 実装詳細

### 基本構造
```typescript
interface RealTestResult {
  sourceName: string;
  success: boolean;
  error?: {
    type: string;
    message: string;
    stack?: string;
    timestamp: string;
    isPermanent: boolean;
  };
  duration: number;
  dataCollected?: any[];
}
```

### 必須メソッド
1. `testYahooFinance()`: Yahoo Financeの実際のアクセステスト
2. `testBloomberg()`: Bloombergの実際のアクセステスト  
3. `testReddit()`: Redditの実際のアクセステスト
4. `testCoinGeckoAPI()`: CoinGecko APIの実際の呼び出しテスト
5. `testHackerNewsAPI()`: HackerNews APIの実際の呼び出しテスト

### エラー分類ロジック
- **一時的エラー**: タイムアウト、ネットワークエラー
- **恒久的エラー**: 認証エラー、サイト構造変更、API制限

## ✅ 完了条件

1. 5つのデータソースすべてで実際のテスト実行が可能
2. エラーが発生した場合、詳細な情報がJSON形式で出力される
3. Claudeが修正判断に必要な情報がすべて含まれている
4. TypeScript strict mode完全対応
5. lint/type-check完全通過

## 🔗 関連ファイル

- 参考: `tests/integration/browser-error-recovery.test.ts`
- 参考: `src/lib/action-specific-collector.ts`
- 出力: `tasks/20250722_004919_real_error_learning_system/outputs/`

## 📊 期待される効果

このフレームワークにより、**実際に発生するエラー**をClaudeが直接検出し、対話的に修正できるシステムが完成する。モック中心から**リアル修正中心**への転換を実現。

---

**実装品質**: MVP制約準拠、必要最小限の機能実装
**実行時間**: 最大90分
**並列実行**: 可能（他タスクと独立）