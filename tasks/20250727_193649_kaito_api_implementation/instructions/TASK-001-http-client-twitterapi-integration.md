# TASK-001: TwitterAPI.io統合対応HTTPクライアント実装

## 🎯 実装目標

TwitterAPI.io（https://docs.twitterapi.io/introduction）の仕様に完全対応したHTTPクライアント実装を行い、実際のAPI統合を完璧に動作させる。

## 📋 必須事前読み込み

**REQUIREMENTS.md読み込み必須**：
```bash
cat REQUIREMENTS.md | head -50
```

**TwitterAPI.ioドキュメント確認**：
- 公式ドキュメント: https://docs.twitterapi.io/introduction
- エンドポイント一覧: https://docs.twitterapi.io/endpoints  
- 認証方式: API Key認証
- レスポンス形式: JSON形式
- 制限事項: 200 QPS、$0.15/1k tweets

## 🔧 実装対象ファイル

### 1. HTTPクライアントコア実装
**対象**: `src/kaito-api/core/client.ts`

**修正内容**:
```typescript
// 正しいTwitterAPI.ioのベースURL設定
private readonly API_BASE_URL = 'https://api.twitterapi.io';

// 実際のエンドポイント対応
const endpoints = {
  tweets: {
    create: '/v1/tweets',
    search: '/v1/tweets/search',
    get: '/v1/tweets/:id'
  },
  users: {
    info: '/v1/users/:username',
    search: '/v1/users/search'
  },
  actions: {
    like: '/v1/tweets/:id/like',
    retweet: '/v1/tweets/:id/retweet',
    quote: '/v1/tweets/quote'
  }
};
```

### 2. 認証システム実装
**対象**: `src/kaito-api/core/auth-manager.ts`

**実装機能**:
- API Key認証ヘッダー設定
- 認証状態管理
- トークン自動更新（必要に応じて）

### 3. HTTPリクエスト実装
**対象**: `src/kaito-api/core/client.ts`内のHttpClientクラス

**実装要件**:
```typescript
// 正しいAuthorizationヘッダー
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

// TwitterAPI.io形式のリクエスト
async post<T>(endpoint: string, data: any): Promise<T> {
  // TwitterAPI.io仕様に沿ったリクエスト実装
}
```

## 🌐 TwitterAPI.io対応仕様

### エンドポイント対応
1. **投稿作成**: `POST /v1/tweets`
2. **ツイート検索**: `GET /v1/tweets/search`
3. **ユーザー情報**: `GET /v1/users/:username`
4. **いいね**: `POST /v1/tweets/:id/like`
5. **リツイート**: `POST /v1/tweets/:id/retweet`

### レスポンス形式対応
```typescript
// TwitterAPI.ioの実際のレスポンス形式
interface TwitterAPIResponse<T> {
  data: T;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}
```

### エラーハンドリング強化
```typescript
// TwitterAPI.io固有のエラー形式対応
interface TwitterAPIError {
  error: {
    code: string;
    message: string;
    type: string;
  };
}
```

## ⚡ QPS制御とレート制限

### TwitterAPI.io制限対応
- **QPS制限**: 200リクエスト/秒
- **コスト管理**: $0.15/1k tweets
- **応答時間**: 平均700ms

```typescript
class QPSController {
  private readonly QPS_LIMIT = 200; // TwitterAPI.io仕様
  private readonly MIN_INTERVAL = 700; // 応答時間要件
  
  async enforceQPS(): Promise<void> {
    // TwitterAPI.io QPS制限実装
  }
}
```

## 🧪 動作確認要件

### 1. 接続テスト
```typescript
async testConnection(): Promise<boolean> {
  // 実際のTwitterAPI.ioへの接続確認
  const response = await this.httpClient.get('/health');
  return response.status === 'ok';
}
```

### 2. 認証テスト
```typescript
async testAuthentication(): Promise<boolean> {
  // API Key認証の動作確認
  const response = await this.httpClient.get('/v1/auth/verify');
  return response.authenticated === true;
}
```

### 3. エンドポイント動作テスト
```typescript
async testEndpoints(): Promise<boolean> {
  // 主要エンドポイントの動作確認
  // ただし実際のAPIコールは最小限に留める
}
```

## 📊 実装品質要件

### TypeScript strict対応
- 全ての型定義を正確に記載
- any型の使用禁止
- strict null checksに対応

### エラーハンドリング
- try-catch分の適切な実装
- エラー情報の詳細ログ出力
- リトライ機能の実装

### パフォーマンス
- 700ms応答時間要件の遵守
- QPS制限の厳密な管理
- メモリリーク防止

## 🚫 MVP制約事項

### 実装禁止事項
- 過度に複雑な抽象化
- 統計・分析機能
- 将来の拡張性を考慮した設計
- WebSocket/リアルタイム機能

### 実装必須事項
- 基本的なHTTP通信
- API Key認証
- 基本的なエラーハンドリング
- 必要最小限のログ出力

## 📝 完了基準

### 実装完了チェックリスト
- [ ] TwitterAPI.ioの正しいエンドポイント実装
- [ ] API Key認証の動作確認
- [ ] QPS制御の正常動作
- [ ] エラーハンドリングの動作確認
- [ ] TypeScript型安全性の確保
- [ ] 基本的な動作テストの実行

### 報告書作成
実装完了後、以下を含む報告書を作成：
- 実装した機能の一覧
- 動作確認結果
- 発見した問題と解決方法
- 次のタスクへの引き継ぎ事項

## 📋 出力先

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/REPORT-001-http-client-twitterapi-integration.md`