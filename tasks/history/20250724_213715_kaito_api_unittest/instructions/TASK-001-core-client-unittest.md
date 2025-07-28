# TASK-001: src/kaito-api/core/client.ts 単体テスト作成

## 🎯 **タスク概要**

**対象ファイル**: `src/kaito-api/core/client.ts`
**出力先**: `tests/kaito-api/core/`
**優先度**: 最高（MVP核心機能）

KaitoTwitterAPIClientクラスの完全な単体テストを作成し、動作確実性を保証する。

## 📋 **実装対象**

### テスト対象クラス・機能
1. **HttpClient**
   - GET/POST/DELETEリクエスト実行
   - タイムアウト制御
   - エラーハンドリング

2. **QPSController**
   - QPS制限制御（200 QPS上限）
   - リクエスト間隔制御
   - 待機時間計算

3. **APIErrorHandler**
   - エラー分類・変換
   - リトライ機能（指数バックオフ）
   - 認証・レート制限・タイムアウト等の特殊エラー処理

4. **KaitoTwitterAPIClient**
   - 認証処理
   - 投稿・リツイート・引用ツイート・いいね機能
   - アカウント情報取得
   - レート制限管理
   - コスト追跡
   - 接続テスト

## 🧪 **テスト仕様**

### ファイル構成
```
tests/kaito-api/core/
├── client.test.ts           # メインテストファイル
├── http-client.test.ts      # HttpClient専用テスト
├── qps-controller.test.ts   # QPSController専用テスト
├── error-handler.test.ts    # APIErrorHandler専用テスト
└── integration.test.ts      # clientクラス統合テスト
```

### テストケース設計

#### HttpClient テスト
- **正常系**:
  - GET/POST/DELETEの成功レスポンス
  - パラメータ付きGETリクエスト
  - JSONデータ付きPOSTリクエスト
  - 適切なヘッダー設定

- **異常系**:
  - ネットワークエラー
  - HTTPステータスエラー（401, 404, 429, 500系）
  - タイムアウトエラー（AbortController動作確認）
  - 不正なJSON応答

#### QPSController テスト
- **正常系**:
  - QPS制限内のリクエスト処理
  - 現在QPS計算の正確性
  - 待機なしでの連続リクエスト

- **異常系**:
  - QPS制限超過時の待機動作
  - 待機時間計算の正確性
  - 大量リクエストでの安定性

#### APIErrorHandler テスト
- **エラー分類テスト**:
  - Rate limit error (429, "rate limit"文字列)
  - Authentication error (401, "auth"文字列)
  - Timeout error ("timeout"文字列)
  - Not found error (404)
  - Generic API error

- **リトライ機能テスト**:
  - 指数バックオフの動作確認
  - 最大リトライ回数の遵守
  - 成功までのリトライ継続
  - 最終失敗時のエラー処理

#### KaitoTwitterAPIClient テスト
- **初期化・認証テスト**:
  - 設定による初期化
  - API認証成功・失敗
  - APIキー未設定エラー
  - httpClient未初期化エラー

- **投稿機能テスト**:
  - 正常な投稿実行
  - バリデーションエラー（空文字、280文字超過、韓国語）
  - レート制限適用
  - QPS制御適用
  - コスト追跡更新

- **エンゲージメント機能テスト**:
  - リツイート実行
  - 引用ツイート実行
  - いいね実行
  - 各機能でのエラーハンドリング

- **ユーティリティ機能テスト**:
  - アカウント情報取得
  - 接続テスト
  - レート制限状態取得
  - コスト追跡情報取得

## 🔧 **技術要件**

### テストフレームワーク
- **Jest**: メインテストフレームワーク
- **@types/jest**: TypeScript対応
- **jest-fetch-mock**: fetchのモック化
- **MSW (Mock Service Worker)**: HTTPリクエストのモック（推奨）

### モック戦略
1. **fetch API**: jest-fetch-mockまたはMSWでモック化
2. **setTimeout/clearTimeout**: jest.useFakeTimers()使用
3. **Date.now()**: 時間制御のためモック化
4. **process.env**: 環境変数のモック化

### 型安全性
- **TypeScript strict mode**: 完全対応
- **型推論テスト**: 戻り値型の正確性確認
- **インターフェース適合**: 型定義との整合性確認

## 📊 **品質基準**

### カバレッジ要件
- **行カバレッジ**: 95%以上
- **分岐カバレッジ**: 90%以上
- **関数カバレッジ**: 100%

### パフォーマンス要件
- **テスト実行時間**: 全テスト30秒以内
- **並列実行**: テストケース間の独立性確保
- **メモリリーク**: なし（適切なクリーンアップ）

## 🚀 **実装手順**

### Phase 1: 基盤テスト実装
1. **HttpClient単体テスト**
   - 基本的なHTTPメソッドテスト
   - エラーケーステスト
   - タイムアウト動作テスト

2. **QPSController単体テスト**
   - QPS制限ロジックテスト
   - 待機時間計算テスト

3. **APIErrorHandler単体テスト**
   - エラー分類テスト
   - リトライロジックテスト

### Phase 2: メインクラステスト実装
4. **KaitoTwitterAPIClient基本機能テスト**
   - 初期化・認証テスト
   - 基本設定テスト

5. **API機能テスト**
   - 投稿・リツイート・いいね機能
   - エラーハンドリング
   - レート制限・QPS制御

### Phase 3: 統合・最適化
6. **統合テスト実装**
   - クラス間連携テスト
   - エンドツーエンドシナリオ

7. **パフォーマンス・信頼性テスト**
   - 負荷テスト
   - エラー復旧テスト

## ⚠️ **重要な制約**

### MVP制約遵守
- **過剰実装禁止**: テストに必要な最小限の機能のみ
- **統計機能禁止**: 詳細メトリクス・分析機能は作成しない
- **将来拡張考慮禁止**: 現在のコードをテストすることに専念

### 実データ使用
- **REAL_DATA_MODE=true**: モックデータ使用禁止
- **実際のAPI仕様準拠**: Kaito Twitter API仕様に従う
- **認証情報保護**: テストでも機密情報の適切な処理

### ファイル・ディレクトリ制約
- **出力先固定**: `tests/kaito-api/core/`のみ
- **命名規則**: `*.test.ts`形式
- **構造整合性**: REQUIREMENTS.mdの構造に準拠

## 📝 **成果物**

### 必須ファイル
1. `tests/kaito-api/core/client.test.ts` - メインテストスイート
2. `tests/kaito-api/core/http-client.test.ts` - HttpClientテスト
3. `tests/kaito-api/core/qps-controller.test.ts` - QPSControllerテスト  
4. `tests/kaito-api/core/error-handler.test.ts` - APIErrorHandlerテスト
5. `tests/kaito-api/core/integration.test.ts` - 統合テスト

### テスト実行確認
- `npm test` または `pnpm test` でのテスト実行成功
- 全テストケースが pass
- カバレッジ要件達成
- TypeScript コンパイルエラーなし
- eslint/prettier チェック通過

## 🎯 **完了判定基準**

- [ ] 全テストファイルが作成されている
- [ ] 全テストケースが成功する
- [ ] カバレッジが基準を満たす
- [ ] TypeScript strict mode でエラーなし
- [ ] 実際のclient.tsのすべての公開メソッドがテストされている
- [ ] エラーハンドリングが適切にテストされている
- [ ] モック設定が適切で、テストが独立している

**完了時は `tasks/20250724_213715_kaito_api_unittest/reports/REPORT-001-core-client-unittest.md` に報告書を作成してください。**