# TASK-002: 新アーキテクチャ対応テスト実装

## 🎯 **タスク概要**

**優先度**: 🔥 CRITICAL - 高優先度  
**実行モード**: 並列実行 - Worker 1と同時実行可能  
**推定時間**: 60-90分  

新しいアーキテクチャ（read-only/authenticated）に対応した包括的なテスト実装を行い、docs/kaito-api.mdのWebドキュメントリンクとの整合性を確保する。

## 📋 **必須事前読み込み**

1. **docs/kaito-api.md** - KaitoAPI仕様書（必須・最重要）
   - 各エンドポイントのWebドキュメントリンク確認
   - 認証方式（APIキー + V2ログイン）の詳細把握
   - レスポンス形式と制約事項の理解

2. **src/kaito-api/endpoints/read-only/** - 読み取り専用エンドポイント群
3. **src/kaito-api/endpoints/authenticated/** - 認証必須エンドポイント群  
4. **src/kaito-api/utils/types.ts** - 型定義の最新版確認

## 🏗️ **新アーキテクチャ理解**

### **2層認証アーキテクチャ**
```
read-only/          - APIキー認証のみ（読み取り専用）
├── user-info.ts    - ユーザー情報取得
├── tweet-search.ts - ツイート検索
├── trends.ts       - トレンド取得  
└── follower-info.ts - フォロワー情報

authenticated/      - V2ログイン認証必須（書き込み系）
├── tweet.ts        - 投稿管理（作成・削除）
├── engagement.ts   - エンゲージメント（いいね・RT）
└── follow.ts       - フォロー管理
```

### **docs/kaito-api.mdのWebドキュメントリンク**
以下の実装時に必ず参照すること：

**認証関連**:
- V2ログイン: https://twitterapi.io/api-reference/endpoint/user_login_v2
- ユーザー情報: https://twitterapi.io/api-reference/endpoint/user-info
- マイアカウント: https://twitterapi.io/api-reference/endpoint/my-account-info

**投稿・アクション系**:
- ツイート作成: https://twitterapi.io/api-reference/endpoint/create_tweet_v2
- いいね: https://twitterapi.io/api-reference/endpoint/like_tweet_v2
- リツイート: https://twitterapi.io/api-reference/endpoint/retweet_tweet_v2

**検索・データ取得**:
- 高度検索: https://twitterapi.io/api-reference/endpoint/tweet-advanced-search
- トレンド: https://twitterapi.io/api-reference/endpoint/trends

## 🔧 **実装タスク**

### **Phase 1**: read-only エンドポイントテスト強化

#### **A. tests/kaito-api/endpoints/read-only/tweet-search.test.ts**

**強化ポイント**:
- TwitterAPI.io高度検索APIの完全テスト
- docs/kaito-api.mdのWebドキュメントとの整合性確認
- TweetSearchEndpointクラスの全メソッドテスト

**実装内容**:
```typescript
describe('TweetSearchEndpoint - docs/kaito-api.md準拠テスト', () => {
  describe('searchTweets - 高度検索API', () => {
    it('should search tweets with basic query', async () => {
      // TwitterAPI.io tweet-advanced-search準拠テスト
    });
    
    it('should handle lang parameter correctly', async () => {
      // 多言語対応テスト
    });
    
    it('should validate search options as per docs', async () => {
      // docs/kaito-api.mdの制約チェック
    });
  });
});
```

#### **B. tests/kaito-api/endpoints/read-only/user-info.test.ts**

**強化ポイント**:
- user-info APIの完全テスト
- APIキー認証での制限事項テスト
- レスポンス形式のバリデーション

#### **C. tests/kaito-api/endpoints/read-only/trends.test.ts**

**強化ポイント**:
- trends APIの地域別トレンド取得テスト
- レート制限対応テスト

### **Phase 2**: authenticated エンドポイントテスト実装

#### **D. tests/kaito-api/endpoints/authenticated/tweet.test.ts**

**実装内容**:
- TweetManagementクラスの完全テスト
- V2ログイン認証必須の確認
- create_tweet_v2 APIとの整合性

**テストケース**:
```typescript
describe('TweetManagement - V2ログイン認証必須', () => {
  describe('createTweet', () => {
    it('should require V2 login authentication', async () => {
      // V2認証チェック
    });
    
    it('should create tweet via create_tweet_v2 endpoint', async () => {
      // docs/kaito-api.mdのWebドキュメント準拠
    });
  });
});
```

#### **E. tests/kaito-api/endpoints/authenticated/engagement.test.ts**

**実装内容**:
- EngagementManagementクラステスト
- いいね・リツイート・引用RTの包括的テスト
- V2認証セッション管理テスト

#### **F. tests/kaito-api/endpoints/authenticated/follow.test.ts**

**実装内容**:
- FollowManagementクラステスト
- フォロー・アンフォロー機能テスト

### **Phase 3**: エンドポイント統合テスト

#### **G. tests/kaito-api/endpoints/index.test.ts**

**実装内容**:
- read-only/authenticated統合エクスポートテスト
- 型定義整合性確認
- エンドポイント間連携テスト

### **Phase 4**: docs整合性検証

各テストファイルでWebドキュメントリンクとの整合性を検証：

```typescript
// 各テストファイルに追加
describe('docs/kaito-api.md整合性検証', () => {
  it('should match API parameters with documentation', () => {
    // パラメータ名・型の一致確認
  });
  
  it('should handle response format as documented', () => {
    // レスポンス形式の整合性確認  
  });
});
```

## ⚠️ **重要制約**

### **Webドキュメント必須参照**
- 各エンドポイント実装時に該当するTwitterAPI.ioドキュメントを必ず確認
- パラメータ名・レスポンス形式の完全一致
- エラーコード・制限事項の正確な実装

### **認証レベル分離**
- read-only: APIキー認証のみでテスト
- authenticated: V2ログイン認証必須でテスト
- 認証レベルの混在禁止

### **出力管理規則**
- **🚫 ルートディレクトリ出力禁止**
- **出力先**: `tasks/20250730_004359_kaito_test_implementation/outputs/`のみ
- **実装ログ**: `tasks/20250730_004359_kaito_test_implementation/outputs/TASK-002-実装ログ.md`

### **MVP制約**
- 基本機能テストに集中
- 高度な分析機能は実装しない
- パフォーマンステストは最小限

## ✅ **完了基準**

1. **全エンドポイントテスト**: read-only, authenticated全てでテスト通過
2. **docs整合性**: Webドキュメントリンクとの100%整合性確認
3. **認証分離**: APIキー/V2ログイン認証の正しい分離実装
4. **型安全性**: TypeScript strict完全対応

## 📊 **テストカバレッジ目標**

- **read-only endpoints**: 90%以上
- **authenticated endpoints**: 90%以上  
- **型定義**: 100%カバレッジ
- **エラーハンドリング**: 全エラーケースカバー

## 📝 **報告要件**

**報告書パス**: `tasks/20250730_004359_kaito_test_implementation/reports/REPORT-002-new-architecture-test-implementation.md`

**報告書内容**:
- 実装した全テストファイルの詳細
- docs/kaito-api.mdとの整合性検証結果
- Webドキュメントリンク確認状況
- テストカバレッジ実績
- 新アーキテクチャの評価とフィードバック

---
**🔥 Worker 1と並列実行し、完了後Worker 3に結果を引き継いでください**