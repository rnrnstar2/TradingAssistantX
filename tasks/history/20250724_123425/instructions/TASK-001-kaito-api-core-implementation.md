# TASK-001: KaitoAPI Core実装 - 実API統合とエンドポイント分離

## 🎯 **実装目標**
KaitoTwitterAPIクライアントのMock実装を実際のAPI統合に置換し、REQUIREMENTS.mdの疎結合アーキテクチャに準拠した完全動作システムを構築する。

## 📋 **必須要件確認**
- **ROLE**: Worker権限での実装作業
- **出力先**: `src/kaito-api/`配下のみ（REQUIREMENTS.md準拠）
- **アーキテクチャ**: 疎結合ライブラリアーキテクチャ採用必須
- **制約**: モックデータ使用禁止、実データ（REAL_DATA_MODE=true）のみ

## 🔧 **実装対象ファイル**

### 最優先実装
1. **`src/kaito-api/core/client.ts`** - 実API統合とHTTP通信実装
2. **`src/kaito-api/core/config.ts`** - API設定・エンドポイント管理実装

### 新規作成（REQUIREMENTS.md準拠）
3. **`src/kaito-api/endpoints/user-endpoints.ts`** - ユーザー関連API分離
4. **`src/kaito-api/endpoints/tweet-endpoints.ts`** - ツイート関連API分離
5. **`src/kaito-api/endpoints/engagement-endpoints.ts`** - エンゲージメント関連API分離

## 🚨 **緊急実装タスク**

### Phase 1: 実API統合（最優先）
```typescript
// src/kaito-api/core/client.ts の実装必須項目

// 🔥 現在のMock実装を実API実装に置換
- executeMockPost() → executeRealPost() - 実際のHTTP POST実装
- executeMockRetweet() → executeRealRetweet() - RT API実装
- executeMockLike() → executeRealLike() - いいねAPI実装
- switchToRealAPI() → 完全な実API統合システム実装

// 🔥 HTTP通信ライブラリ統合
- fetch() または axios を使用した実際のHTTP通信
- APIレスポンス形式の実装とパース処理
- 環境変数KAITO_API_TOKENの実際の認証処理
```

### Phase 2: エンドポイント分離（中優先）
REQUIREMENTS.mdの疎結合アーキテクチャに従い、エンドポイント別にファイル分離：

**`src/kaito-api/endpoints/user-endpoints.ts`**:
```typescript
export class UserEndpoints {
  // ユーザー情報取得、フォロー関係、ユーザー検索
  async getUserInfo(userId: string): Promise<UserInfo>
  async followUser(userId: string): Promise<FollowResult>  
  async unfollowUser(userId: string): Promise<UnfollowResult>
  async searchUsers(query: string): Promise<UserSearchResult>
}
```

**`src/kaito-api/endpoints/tweet-endpoints.ts`**:
```typescript
export class TweetEndpoints {
  // ツイート検索、詳細、リプライ、引用
  async createTweet(content: string): Promise<TweetResult>
  async retweetTweet(tweetId: string): Promise<RetweetResult>
  async quoteTweet(tweetId: string, comment: string): Promise<QuoteResult>
  async searchTweets(query: string): Promise<TweetSearchResult>
}
```

**`src/kaito-api/endpoints/engagement-endpoints.ts`**:
```typescript
export class EngagementEndpoints {
  // いいね、ブックマーク、エンゲージメント分析
  async likeTweet(tweetId: string): Promise<LikeResult>
  async unlikeTweet(tweetId: string): Promise<UnlikeResult>
  async bookmarkTweet(tweetId: string): Promise<BookmarkResult>
}
```

## 📊 **KaitoTwitterAPI統合仕様**

### 認証システム
```typescript
// 環境変数KAITO_API_TOKENを使用した実際の認証
interface AuthConfig {
  apiToken: string; // process.env.KAITO_API_TOKEN
  baseUrl: string;  // https://api.twitterapi.io
  timeout: number;  // 30000ms
}
```

### レート制限対応
```typescript
// 実際のAPI制限に基づく制御
interface RealRateLimits {
  qpsLimit: 200;        // 200QPS上限（KaitoAPI仕様）
  postsPerHour: 300;    // 実際のレート制限
  retweetsPerHour: 300; // 実際のレート制限
  likesPerHour: 1000;   // 実際のレート制限
}
```

### コスト追跡
```typescript
// $0.15/1k tweets の実際のコスト追跡
interface RealCostTracking {
  tweetsProcessed: number;
  actualCost: number;      // USD（実際の請求額）
  creditUsage: number;     // API Credit消費量
  estimatedMonthlyCost: number;
}
```

## 🔥 **実装優先順位**

### P0 (即座実装必須)
1. **client.ts実API統合**: executeMock*メソッド群の実API実装
2. **HTTP通信実装**: fetch/axiosを使用した実際のAPI通信
3. **認証システム**: 環境変数認証とエラーハンドリング

### P1 (48時間以内)
4. **エンドポイント分離**: 疎結合アーキテクチャ準拠のファイル分離
5. **レート制限統合**: 実際のAPI制限との同期
6. **エラーハンドリング強化**: 実API固有のエラー処理

### P2 (1週間以内)
7. **パフォーマンス最適化**: メトリクス収集、キャッシュ最適化
8. **統合テスト**: 実API環境での動作確認

## ⚠️ **実装制約・注意事項**

### 🚫 絶対禁止事項
- モックデータの継続使用
- 要件定義にないファイル・ディレクトリの作成
- プロダクション環境への直接テスト実行
- APIキーのハードコード

### ✅ 実装原則
- 実データ（REAL_DATA_MODE=true）のみ使用
- TypeScript strict モード完全準拠
- 疎結合アーキテクチャ維持
- エラーハンドリング完備

## 📈 **品質基準**

### コード品質
- TypeScript型安全性: 100%
- ESLint準拠: 全ルール通過
- テストカバレッジ: 80%以上

### パフォーマンス
- API応答時間: 2秒以内
- QPS制御: 200QPS上限厳守
- メモリ使用量: 100MB以内

### 信頼性
- エラー処理: 全APIエンドポイント対応
- リトライ機能: 指数バックオフ実装
- フォールバック: グレースフルデグラデーション

## 🎯 **実装完了基準**

### 機能要件
- [ ] 実際のTwitter投稿が正常に実行される
- [ ] レート制限が実際のAPI制限と同期する
- [ ] コスト追跡が実際の課金と一致する
- [ ] エラーハンドリングが実API状況に対応する

### 技術要件
- [ ] Mock実装が完全に除去されている
- [ ] 疎結合アーキテクチャが実装されている
- [ ] TypeScript strict mode が通過する
- [ ] ESLint/Prettierが通過する

### 統合要件
- [ ] ActionExecutor との連携が正常動作する
- [ ] SearchEngine との連携が正常動作する
- [ ] 30分間隔スケジューラとの統合が完了する

## 🔄 **実装フロー**

1. **Phase 1 実装開始**: client.ts の実API統合
2. **テスト実行**: 基本機能の動作確認 
3. **Phase 2 実装**: エンドポイント分離アーキテクチャ
4. **統合テスト**: 全システム連携確認
5. **品質チェック**: lint/type-check実行
6. **実装完了報告**: REPORT-001-kaito-api-core-implementation.md作成

## 📋 **報告書作成要件**

実装完了後、以下内容を含む詳細な報告書を作成：
- 実装した機能の詳細
- 実API統合の検証結果
- エンドポイント分離の効果
- 発見された課題と対応策
- 次フェーズへの提言

## 🔗 **参考資料**
- REQUIREMENTS.md: システム全体仕様
- https://docs.twitterapi.io/: KaitoAPI公式ドキュメント
- src/kaito-api/client.ts: 現在のMock実装
- data/config/api-config.yaml: API設定情報

---

**最重要**: この実装により、TradingAssistantXの30分間隔自動投稿システムが実際のX(Twitter)と連携し、MVP要件を完全満たすシステムが完成します。